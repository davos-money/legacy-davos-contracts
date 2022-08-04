// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import "../ceros/interfaces/ICerosRouter.sol";
import "../ceros/interfaces/ISikkaProvider.sol";
import "../ceros/interfaces/ICertToken.sol";
import "../ceros/interfaces/IDao.sol";
import "../ceros/interfaces/IPriceGetter.sol";
import "./interfaces/IWETH.sol";
import "./interfaces/IMasterVault.sol";
import "./interfaces/IWaitingPool.sol";
import "../Strategy/IBaseStrategy.sol";
import "../ceros/interfaces/ISwapPool.sol";
contract MasterVault is
IMasterVault,
ERC4626Upgradeable,
OwnableUpgradeable,
PausableUpgradeable,
ReentrancyGuardUpgradeable
{
    /**
     * Variables
     */
    uint256 public depositFee;
    uint256 public maxDepositFee;
    uint256 public withdrawalFee;
    uint256 public maxWithdrawalFee;
    // Tokens
    ICertToken private _certToken;
    
    address private _provider;
    address private _priceGetter;
    ICerosRouter private _ceRouter;
    IDao private _dao;
    mapping(address => bool) public manager;
    struct StrategyParams {
        bool active;
        uint256 allocation;
        uint256 debt;
    }
    mapping (address => StrategyParams) public strategyParams;
    address[] public strategies;
    address public cerosStrategy;
    address payable public feeReceiver;
    uint256 public MAX_STRATEGIES;
    uint256 public totalDebt;          // Amount of tokens that all strategies have borrowed
    IWaitingPool public waitingPool;
    ISwapPool public swapPool;
    uint256 public feeEarned;
    /**
     * Modifiers
     */
    modifier onlyProvider() {
        require(
            msg.sender == owner() || msg.sender == _provider,
            "Provider: not allowed"
        );
        _;
    }
    modifier onlyManager() {
        require(
            manager[msg.sender],
            "Manager: not allowed"
        );
        _;
    }
    function initialize(
        string memory name,
        string memory symbol,
        uint256 maxDepositFees,
        uint256 maxWithdrawalFees,
        IERC20MetadataUpgradeable asset,
        uint8 maxStrategies,
        address swapPoolAddr
    ) public initializer {
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __ERC20_init(name, symbol);
        __ERC4626_init(asset);
        manager[msg.sender] = true;
        maxDepositFee = maxDepositFees;
        maxWithdrawalFee = maxWithdrawalFees;
        MAX_STRATEGIES = maxStrategies;
        feeReceiver = payable(msg.sender);
        swapPool = ISwapPool(swapPoolAddr);
    }
    function depositETH() public 
    payable
    override
    nonReentrant
    whenNotPaused 
    onlyProvider 
    returns (uint256 shares) {
        address src = msg.sender;
        uint256 amount = msg.value;
        require(amount > 0, "invalid amount");
        shares = _assessFee(amount, depositFee);
        uint256 waitingPoolDebt = waitingPool.totalDebt();
        uint256 waitingPoolBalance = address(waitingPool).balance;
        if(waitingPoolDebt > 0 && waitingPoolBalance < waitingPoolDebt) {
            uint256 poolAmount = (waitingPoolDebt < shares) ? waitingPoolDebt - waitingPoolBalance : shares;
            payable(address(waitingPool)).transfer(poolAmount);
            IWETH(asset()).deposit{value: amount - poolAmount}();
        } else {
            IWETH(asset()).deposit{value: amount}();
        }
        _mint(src, shares);
        emit Deposit(src, src, amount, shares);
    }
    function withdrawETH(address account, uint256 amount) 
    external
    override
    nonReentrant 
    whenNotPaused
    onlyProvider 
    returns (uint256 shares) {
        address src = msg.sender;
        shares = amount;
        _burn(src, shares);
        uint256 wethBalance = totalAssetInVault();
        if(wethBalance < amount) {
            shares = withdrawFromActiveStrategies(amount - wethBalance);
            if(shares == 0) {
                // submit to waiting pool
                waitingPool.addToQueue(account, amount);
                if(wethBalance > 0) {
                    IWETH(asset()).withdraw(wethBalance);
                    shares = _assessSwapFee(amount);
                    payable(address(waitingPool)).transfer(wethBalance);
                }
                emit Withdraw(src, src, src, amount, amount);
                return amount;
            }
            shares += _assessSwapFee(wethBalance);
        } else {
            shares = _assessSwapFee(amount);
        }
        shares = _assessFee(shares, withdrawalFee);
        IWETH(asset()).withdraw(shares);
        payable(account).transfer(shares);
        
        emit Withdraw(src, src, src, amount, shares);
    }
    function payDebt() public {
        waitingPool.tryRemove();
    }
    function withdrawFromActiveStrategies(uint256 amount) private returns(uint256 withdrawn) {
        for(uint8 i = 0; i < strategies.length; i++) {
           if(strategyParams[strategies[i]].active && 
              strategyParams[strategies[i]].debt >= amount) {
                return _withdrawFromStrategy(strategies[i], amount);
           }
        }
    }
    function _depositToStrategy(address strategy, uint256 amount) private {
        require(amount > 0, "invalid deposit amount");
        IWETH weth = IWETH(asset());
        require(totalAssetInVault() >= amount, "insufficient balance");
        totalDebt += amount;
        strategyParams[strategy].debt += amount;
        weth.transfer(strategy, amount);
    }
    function depositAllToStrategy(address strategy) public onlyManager {
        uint256 amount = totalAssetInVault();
        _depositToStrategy(strategy, amount);
        IBaseStrategy(strategy).deposit(amount);
        emit DepositedToStrategy(strategy, amount);
    }
    function depositToStrategy(address strategy, uint256 amount) public onlyManager {
        _depositToStrategy(strategy, amount);
        IBaseStrategy(strategy).deposit(amount);
        emit DepositedToStrategy(strategy, amount);
    }
    function withdrawFromStrategy(address strategy, uint256 amount) public onlyManager {
        _withdrawFromStrategy(strategy, amount);
    }
    function withdrawAllFromStrategy(address strategy) external onlyManager {
        _withdrawFromStrategy(strategy, strategyParams[strategy].debt - 10);
    }
    function _withdrawFromStrategy(address strategy, uint256 amount) private returns(uint256) {
        require(amount > 0, "invalid withdrawal amount");
        require(strategyParams[strategy].debt >= amount, "insufficient assets in strategy");
        uint256 value = IBaseStrategy(strategy).withdraw(amount);
        if(value > 0) {
            totalDebt -= amount;
            strategyParams[strategy].debt -= amount;
            emit WithdrawnFromStrategy(strategy, amount);
        }
        return value;
    }
    function setStrategy(
        address strategy,
        uint256 allocation   // 1% = 10000
        )
        external onlyOwner {
        require(strategy != address(0));
        require(strategies.length < MAX_STRATEGIES, "max strategies exceeded");
        StrategyParams memory params = StrategyParams({
            active: true,
            allocation: allocation,
            debt: 0
        });
        
        strategyParams[strategy] = params;
        strategies.push(strategy);
        approve(strategy, type(uint256).max);
        emit StrategyAdded(strategy, allocation);
    }
    function retireStrat(address strategy) external onlyManager {
        // require(strategyParams[strategy].active, "strategy is not active");
        _withdrawFromStrategy(strategy, strategyParams[strategy].debt - 10);
        if (strategyParams[strategy].debt <= 10) {
            strategyParams[strategy].active = false;
            strategyParams[strategy].debt = 0;
        }
    }
    function allocate() external onlyManager {
        // allocate to all active strategies based on respective allocation
        for(uint8 i = 0; i < strategies.length; i++) {
            if(strategyParams[strategies[i]].active) {
                StrategyParams memory strategy =  strategyParams[strategies[i]];
                uint256 allocation = strategy.allocation;
                if(allocation > 0) {
                    uint256 totalAssets = totalAssetInVault() + totalDebt;
                    uint256 strategyRatio = (strategy.debt / totalAssets) * 1e6;     // TODO check
                    if(strategyRatio < allocation) {
                        uint256 depositAmount = ((totalAssets * allocation) / 1e6) - strategy.debt;
                        if(totalAssetInVault() > depositAmount) {
                            _depositToStrategy(strategies[i], depositAmount);
                            IBaseStrategy(strategies[i]).depositAll();
                        }
                    } else {
                        _withdrawFromStrategy(strategies[i], strategy.debt - (totalAssets * allocation) / 1e6);
                    }
                }
            }
        }
    }
    function availableToWithdraw() public view returns(uint256 available) {
        for(uint8 i = 0; i < strategies.length; i++) {
            available += IWETH(asset()).balanceOf(strategies[i]);   // excluding the amount that is deposited to strategies
        }
        available += totalAssetInVault();
    }
    function totalAssetInVault() public view returns(uint256 balance) {
        return (totalAssets() > feeEarned) ? totalAssets() - feeEarned : 0;
    }
    function migrateStrategy(address oldStrategy, address newStrategy, uint256 newAllocation) external onlyManager {
        require(oldStrategy != address(0));
        require(newStrategy != address(0));
        
        uint256 oldStrategyDebt = strategyParams[oldStrategy].debt;
        
        if(oldStrategyDebt > 0) {
            _withdrawFromStrategy(oldStrategy, strategyParams[oldStrategy].debt - 10);
        }
        StrategyParams memory params = StrategyParams({
            active: true,
            allocation: newAllocation,
            debt: 0
        });
        for(uint256 i = 0; i < strategies.length; i++) {
            if(strategies[i] == oldStrategy) {
                strategies[i] = newStrategy;
                strategyParams[newStrategy] = params;
            } else {
                revert("invalid oldStrategy address");
            }
        }
        approve(oldStrategy, 0);
        approve(newStrategy, type(uint256).max);
        emit StrategyMigrated(oldStrategy, newStrategy, newAllocation);
    }
    function _assessFee(uint256 amount, uint256 fees) private returns(uint256 value) {
        if(fees > 0) {
            uint256 fee = (amount * fees) / 1e6;
            value = amount - fee;
            feeEarned += fee;
        } else {
            return amount;
        }
    }
    function _assessSwapFee(uint256 amount) private returns(uint256 value) {
        if(swapPool.unstakeFee() > 0 && amount > 0) {
            uint256 swapFee =  (amount * swapPool.unstakeFee()) / swapPool.FEE_MAX();
            feeEarned += swapFee;
            return (amount - swapFee);
        } else {
            return amount;
        }
    }
    receive() external payable {
    }
    function withdrawFee() external onlyOwner{
        if(feeEarned > 0) {
            IWETH(asset()).withdraw(feeEarned);
            feeEarned = 0;
            feeReceiver.transfer(feeEarned);
        }
    } 
    function setDepositFee(uint256 newDepositFee) external onlyOwner {
        require(maxDepositFee > newDepositFee,"more than maxDepositFee");
        depositFee = newDepositFee;    // 1% = 10000ppm
        emit DepositFeeChanged(newDepositFee);
    }
    function setWithdrawalFee(uint256 newWithdrawalFee) external onlyOwner {
        require(maxWithdrawalFee > newWithdrawalFee,"more than maxWithdrawalFee");
        withdrawalFee = newWithdrawalFee;
        emit WithdrawalFeeChanged(newWithdrawalFee);
    }
    function setWaitingPool(address _waitingPool) external onlyOwner {
        require(_waitingPool != address(0));
        waitingPool = IWaitingPool(_waitingPool);
        emit WaitingPoolChanged(_waitingPool);
    }
    function setWaitingPoolCap(uint256 _cap) external onlyOwner {
        waitingPool.setCapLimit(_cap);
        emit WaitingPoolCapChanged(_cap);
    }
    function addManager(address newManager) external onlyOwner {
        require(newManager != address(0));
        manager[newManager] = true;
        emit ManagerAdded(newManager);
    }
    function removeManager(address _manager) external onlyOwner {
        require(manager[_manager]);
        manager[_manager] = false;
        emit ManagerRemoved(_manager);
    } 
    function changeProvider(address provider) external onlyOwner {
        require(provider != address(0));
        _provider = provider;
        emit ProviderChanged(provider);
    }
    function changeFeeReceiver(address payable _feeReceiver) external onlyOwner {
        require(_feeReceiver != address(0));
        feeReceiver = _feeReceiver;
        emit FeeReceiverChanged(_feeReceiver);
    }
    function changeSwapPool(address _swapPool) external onlyOwner {
        require(_swapPool != address(0));
        swapPool = ISwapPool(_swapPool);
        emit SwapPoolChanged(_swapPool);
    }
    function changeStrategyAllocation(address strategy, uint256 allocation) external onlyOwner {
        require(strategy != address(0));        
        strategyParams[strategy].allocation = allocation;
        emit StrategyAllocationChanged(strategy, allocation);
    }
    function deposit(uint256 assets, address receiver) public override returns (uint256) {
        // Kept only for the sake of ERC4626 standard
    }
    function mint(uint256 shares, address receiver) public override returns (uint256) {
        // Kept only for the sake of ERC4626 standard
    }
    function withdraw(uint256 assets, address receiver, address owner) public override returns (uint256) {
        // Kept only for the sake of ERC4626 standard
    }
    function redeem(uint256 shares, address receiver, address owner) public override returns (uint256) {
        // Kept only for the sake of ERC4626 standard
    }
}