// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.6;
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IVault.sol";
import "./interfaces/ISwapRouter.sol";
import "./interfaces/ISwapPool.sol";
import "./interfaces/IPriceGetter.sol";
import "./interfaces/ICerosRouter.sol";
import "./interfaces/ICertToken.sol";
import "../MasterVault/interfaces/IMasterVault.sol";

contract CerosRouter is
ICerosRouter,
OwnableUpgradeable,
PausableUpgradeable,
ReentrancyGuardUpgradeable
{
    /**
     * Variables
     */
    IVault private _vault;
    ISwapRouter private _dex;
    // Tokens
    ICertToken private _certToken; // (default aMATICc)
    address private _wMaticAddress;
    IERC20 private _ceToken; // (default ceAMATICc)
    mapping(address => uint256) private _profits;
    IMasterVault private _masterVault;
    uint24 private _pairFee;
    ISwapPool private _pool;
    IPriceGetter private _priceGetter;
    /**
     * Modifiers
     */

    function initialize(
        address certToken,
        address wMaticToken,
        address ceToken,
        // address bondToken,
        address vault,
        address dexAddress,
        // address masterVault,
        // address pool,
        uint24 pairFee,
        address swapPool,
        address priceGetter
    ) public initializer {
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        _certToken = ICertToken(certToken);
        _wMaticAddress = wMaticToken;
        _ceToken = IERC20(ceToken);
        _vault = IVault(vault);
        _dex = ISwapRouter(dexAddress);
        _pairFee = pairFee;
        _pool = ISwapPool(swapPool);
        _priceGetter = IPriceGetter(priceGetter);
        IERC20(wMaticToken).approve(swapPool, type(uint256).max);
        IERC20(certToken).approve(swapPool, type(uint256).max);
        IERC20(wMaticToken).approve(dexAddress, type(uint256).max);
        IERC20(certToken).approve(dexAddress, type(uint256).max);
        IERC20(certToken).approve(vault, type(uint256).max);
    }
    /**
     * DEPOSIT
     */
    function deposit()
    external
    payable
    override
    nonReentrant
    returns (uint256 value)
    {
        uint256 amount = msg.value;
        return _deposit(amount);
    }

    function depositWMatic(uint256 amount) 
    external
    nonReentrant
    returns (uint256 value)
    {
        IERC20(_wMaticAddress).transferFrom(msg.sender, address(this), amount);
        return _deposit(amount);
    }

    function _deposit(uint256 amount) internal returns (uint256 value) {
        require(amount > 0, "invalid deposit amount");
        uint256 dexAmount = getAmountOut(_wMaticAddress, address(_certToken), amount);
        uint256 minAmount = (amount * _certToken.ratio()) / 1e18;
        uint256 realAmount;
        if(dexAmount > minAmount) {
            realAmount = swapV3(_wMaticAddress, address(_certToken), amount, minAmount - 100, address(this));
        } else {
            realAmount = _pool.swap(true, amount, address(this));
        }

        require(realAmount > minAmount, "price too low");

        require(
            _certToken.balanceOf(address(this)) >= realAmount,
            "insufficient amount of CerosRouter in cert token"
        );
        uint256 profit = realAmount - minAmount;
        // add profit
        _profits[msg.sender] += profit;

        value = _vault.depositFor(msg.sender, realAmount - profit);
        emit Deposit(msg.sender, _wMaticAddress, realAmount - profit, profit);
        return value;
    }

    /**
     * CLAIM
     */
    // claim yields in aMATICc
    function claim(address recipient)
    external
    override
    nonReentrant
    returns (uint256 yields)
    {
        yields = _vault.claimYieldsFor(msg.sender, recipient);
        emit Claim(recipient, address(_certToken), yields);
        return yields;
    }
    // claim profit in aMATICc
    function claimProfit(address recipient) external nonReentrant {
        uint256 profit = _profits[msg.sender];
        require(profit > 0, "has not got a profit");
        // let's check balance of CeRouter in aMATICc
        require(
            _certToken.balanceOf(address(this)) >= profit,
            "insufficient amount"
        );
        _certToken.transfer(recipient, profit);
        _profits[msg.sender] -= profit;
        emit Claim(recipient, address(_certToken), profit);
    }
    function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) public view returns (uint256 amountOut) {
        amountOut = IPriceGetter(_priceGetter).getPrice(
            tokenIn,
            tokenOut,
            amountIn,
            0,
            _pairFee
        );
    }

    // withdrawal in MATIC via DEX or Swap Pool
    function withdrawWithSlippage(
        address recipient,
        uint256 amount,
        uint256 outAmount
    ) external override nonReentrant returns (uint256 realAmount) {
        realAmount = _vault.withdrawFor(msg.sender, address(this), amount);
        uint256 dexAmount = getAmountOut(address(_certToken), _wMaticAddress, realAmount);
        uint256 amountOut;
        if(dexAmount > outAmount) {
            amountOut = swapV3(address(_certToken), _wMaticAddress, realAmount, outAmount, recipient);
        } else {
            amountOut = _pool.swap(false, realAmount, recipient);
        }
        // require(amountOut >= amount, "price too low");
        emit Withdrawal(msg.sender, recipient, _wMaticAddress, amountOut);
        return amountOut;
    }
    function swapV3(
        address tokenIn, 
        address tokenOut, 
        uint256 amountIn, 
        uint256 amountOutMin, 
        address recipient) private returns (uint256 amountOut) {
            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams(
            tokenIn,                // tokenIn
            tokenOut,               // tokenOut
            _pairFee,               // fee
            recipient,              // recipient
            block.timestamp + 300,  // deadline
            amountIn,               // amountIn
            amountOutMin,           // amountOutMinimum
            0                       // sqrtPriceLimitX96
        );
        amountOut = _dex.exactInputSingle(params);
    }
    function getProfitFor(address account) external view returns (uint256) {
        return _profits[account];
    }
    function getYieldFor(address account) external view returns(uint256) {
        return _vault.getYieldFor(account);
    } 
    function changeVault(address vault) external onlyOwner {
        // update allowances
        _certToken.approve(address(_vault), 0);
        _vault = IVault(vault);
        _certToken.approve(address(_vault), type(uint256).max);
        emit ChangeVault(vault);
    }
    function changeDex(address dex) external onlyOwner {
        IERC20(_wMaticAddress).approve(address(_dex), 0);
        _certToken.approve(address(_dex), 0);
        _dex = ISwapRouter(dex);
        // update allowances
        IERC20(_wMaticAddress).approve(address(_dex), type(uint256).max);
        _certToken.approve(address(_dex), type(uint256).max);
        emit ChangeDex(dex);
    }
    function changeSwapPool(address swapPool) external onlyOwner {
        IERC20(_wMaticAddress).approve(address(_pool), 0);
        _certToken.approve(address(_pool), 0);
        _pool = ISwapPool(swapPool);
        IERC20(_wMaticAddress).approve(swapPool, type(uint256).max);
        _certToken.approve(swapPool, type(uint256).max);
        emit ChangeSwapPool(swapPool);
    }
    function changeProvider(address masterVault) external onlyOwner {
        _masterVault = IMasterVault(masterVault);
        emit ChangeProvider(masterVault);
    }
    function changePairFee(uint24 fee) external onlyOwner {
        _pairFee = fee;
        emit ChangePairFee(fee);
    }
    function changePriceGetter(address priceGetter) external onlyOwner {
        _priceGetter = IPriceGetter(priceGetter);
    }
}
