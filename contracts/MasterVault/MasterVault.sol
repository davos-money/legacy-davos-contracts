// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "../ceros/interfaces/ICerosRouter.sol";
import "../ceros/interfaces/ISikkaProvider.sol";
import "../ceros/interfaces/ICertToken.sol";
import "../ceros/interfaces/IDao.sol";
import "./ERC4626Upgradeable.sol";
import "./interfaces/IWETH.sol";
import "./interfaces/IMasterVault.sol";
import "./interfaces/IPriceGetter.sol";
import "../Strategy/IBaseStrategy.sol";

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
    uint256 private _depositFee;
    uint256 private _maxDepositFee;
    uint256 private _withdrawalFee;
    uint256 private _maxWithdrawalFee;

    // Tokens
    ICertToken private _certToken;
    
    address private _provider;
    address private _priceGetter;
    ICerosRouter private _ceRouter;
    IDao private _dao;

    mapping(address => bool) private _manager;

    struct StrategyParams {
        uint256 performanceFee;
        bool active;
        uint256 allocation;
        uint256 debt;
    }

    mapping (address => StrategyParams) private _strategies;
    address[] public strategies;
    address public cerosStrategy;
    address payable public feeReceiver;

    uint256 public MAX_STRATEGIES;
    uint256 public totalDebt;          // Amount of tokens that all strategies have borrowed

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
            _manager[msg.sender],
            "Manager: not allowed"
        );
        _;
    }

    function initialize(
        string memory name,
        string memory symbol,
        uint256 maxDepositFee,
        uint256 maxWithdrawalFee,
        IERC20MetadataUpgradeable asset,
        uint8 maxStrategies
    ) public initializer {
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __ERC20_init(name, symbol);
        __ERC4626_init(asset);
        _manager[msg.sender] = true;
        _maxDepositFee = maxDepositFee;
        _maxWithdrawalFee = maxWithdrawalFee;
        MAX_STRATEGIES = maxStrategies;
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
        shares = _assessFee(amount, _depositFee);
        IWETH(asset()).deposit{value: shares}();
        // _deposit(address(this), msg.sender, shares, shares);
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
        uint256 wethBalance = IERC20(asset()).balanceOf(address(this));
        if(wethBalance < amount) {
            shares = _withdrawFromStrategy(cerosStrategy, amount - wethBalance);
            shares += wethBalance;
        }
        IWETH(asset()).withdraw(shares);
        shares = _assessFee(shares, _withdrawalFee);
        payable(account).transfer(shares);
        
        emit Withdraw(src, src, src, amount, shares);
    }

    function _depositToStrategy(address strategy, uint256 amount) internal {
        require(amount > 0, "invalid deposit amount");
        IWETH weth = IWETH(asset());
        require(weth.balanceOf(address(this)) >= amount, "insufficient balance");
        totalDebt += amount;
        _strategies[strategy].debt += amount;
        weth.transfer(strategy, amount);
    }

    function depositAllToStrategy(address strategy) public onlyManager {
        uint256 amount = IWETH(asset()).balanceOf(address(this));
        _depositToStrategy(strategy, amount);
        IBaseStrategy(cerosStrategy).deposit(amount);
    }

    function depositToStrategy(address strategy, uint256 amount) public onlyManager {
        _depositToStrategy(strategy, amount);
        IBaseStrategy(cerosStrategy).deposit(amount);
    }

    function withdrawFromStrategy(address strategy, uint256 amount) public onlyManager {
        _withdrawFromStrategy(strategy, amount);
    }

    // function withdrawAllFromStrategy(address strategy) external onlyManager {
    //     return IBaseStrategy(strategy).withdrawAll(amount);
    // }

    function _withdrawFromStrategy(address strategy, uint256 amount) internal returns(uint256) {
        require(amount > 0, "invalid withdrwala amount");
        uint256 value = IBaseStrategy(strategy).withdraw(amount);
        totalDebt -= value;
        _strategies[strategy].debt -= value;
        return value;
    }

    function setStrategy(
        address strategy,
        uint256 performanceFee,
        uint256 allocation
        )
        external onlyOwner {
        require(strategy != address(0));
        //TODO check maxStrategies
        StrategyParams memory params = StrategyParams({
            performanceFee: performanceFee,
            active: true,
            allocation: allocation,
            debt: 0
        });
        
        _strategies[strategy] = params;
        strategies.push(strategy);
        approve(strategy, type(uint256).max);
    }

    function allocate() external onlyManager {
        // TODO manage list of strategies
        // allocate to all active strategies based on respective allocation
        for(uint8 i = 0; i < strategies.length; i++) {
            if(_strategies[strategies[i]].active) {
                StrategyParams memory strategy =  _strategies[strategies[i]];
                uint256 allocation = strategy.allocation;
                if(allocation > 0) {
                    uint256 totalAssets = IWETH(asset()).balanceOf(address(this)) + totalDebt;
                    uint256 strategyRatio = (strategy.debt / totalAssets) * 1e6;
                    if(strategyRatio < allocation) {
                        _depositToStrategy(strategies[i], ((totalAssets * allocation) / 1e6) - strategy.debt);
                        // depositToStrategy(strategy, amount);
                    } else {
                        _withdrawFromStrategy(strategies[i], strategy.debt - (totalAssets * allocation) / 1e6);
                    }
                }
            }
        }
    }

    function availableToWithdraw() public view returns(uint256) {

    }

    function _assessFee(uint256 amount, uint256 fees) internal returns(uint256 value) {
        if(fees > 0) {
            uint256 fee = (amount * fees) / 1e6;
            value = amount - fee;
            feeReceiver.transfer(fee);
        } else {
            return amount;
        }
    }

    receive() external payable {

    }

    function setDepositFee(uint256 newDepositFee) external onlyOwner {
        //TODO check maxDepositFee
        _depositFee = newDepositFee;    // 1% = 10000ppm
        emit DepositFeeChanged(newDepositFee);
    }

    function setMaxDepositFee(uint256 newMaxDepositFee) external onlyOwner {
        _maxDepositFee = newMaxDepositFee;
        emit MaxDepositFeeChanged(newMaxDepositFee);
    }

    function setWithdrawalFee(uint256 newWithdrawalFee) external onlyOwner {
        _withdrawalFee = newWithdrawalFee;
        emit WithdrawalFeeChanged(newWithdrawalFee);
    }

    function setMaxWithdrawalFee(uint256 newMaxWithdrawalFee) external onlyOwner {
        _maxWithdrawalFee = newMaxWithdrawalFee;
        emit MaxWithdrawalFeeChanged(newMaxWithdrawalFee);
    }

    function addManager(address newManager) external onlyOwner {
        _manager[newManager] = true;
        emit ManagerAdded(newManager);
    }

    function removeManager(address manager) external onlyOwner {
        require(_manager[manager]);
        _manager[manager] = false;
        emit ManagerRemoved(manager);
    } 

    function changeProvider(address provider) external onlyOwner {
        require(provider != address(0));
        _provider = provider;
        emit ProviderChanged(provider);
    }

    function setStrategyAddress(address _strategy) external onlyOwner {
        cerosStrategy = _strategy;
        approve(cerosStrategy, type(uint256).max);
    }
}
