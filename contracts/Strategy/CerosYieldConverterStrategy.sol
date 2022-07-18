//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../MasterVault/interfaces/IMasterVault.sol";
import "../MasterVault/interfaces/IPriceGetter.sol";
import "../MasterVault/interfaces/IWETH.sol";
import "../ceros/interfaces/ICertToken.sol";
import "../ceros/interfaces/ICerosRouter.sol";
import "./BaseStrategy.sol";

contract CerosYieldConverterStrategy is BaseStrategy {

    ICerosRouter private _ceRouter;
    ICertToken private _certToken;
    IMasterVault public vault;

    address private _priceGetter;
    address private _rewardsPool;

    event PriceGetterChanged(address priceGetter);
    event CeRouterChanged(address ceRouter);

    function initialize(
        address destination,
        address feeRecipient,
        address underlyingToken,
        address ceRouter,
        address certToekn,
        address masterVault,
        address rewardsPool,
        address priceGetter,
        uint256 performanceFees
    ) public initializer {
        __BaseStrategy_init(destination, feeRecipient, underlyingToken, performanceFees);
        _ceRouter = ICerosRouter(ceRouter);
        _certToken = ICertToken(certToekn);
        _priceGetter = priceGetter;
        _rewardsPool = rewardsPool;
        vault = IMasterVault(masterVault);
        underlying.approve(address(_ceRouter), type(uint256).max);
        underlying.approve(address(vault), type(uint256).max);
    }

    /**
     * Modifiers
     */
    modifier onlyVault() {
        require(msg.sender == address(vault), "!vault");
        _;
    }

    function beforeDeposit(uint256 amount) internal {
    }

    function deposit(uint256 amount) external returns(uint256 value) {
        require(amount <= underlying.balanceOf(address(this)), "insufficient balance");
        return _deposit(amount);
    }

    function depositAll() external returns(uint256 value) {
        uint256 amount = underlying.balanceOf(address(this));
        return _deposit(amount);
    }

    function _deposit(uint256 amount) internal returns (uint256 value) {
        require(!depositPaused, "deposits are paused");
        require(amount > 0, "invalid amount");
        // for now deposit funds to ceros Router or just hold the wMatic in this contract
        beforeDeposit(amount);
        uint256 amountOut = getAmountOut(address(underlying), address(_certToken), amount);
        if (amountOut >= (amount * _certToken.ratio()) / 1e18) {
            return _ceRouter.depositWMatic(amount);
        }
    }

    function withdraw(uint256 amount) external returns(uint256 value) {
        return _withdraw(amount);
    }

    function panic() external onlyStrategist returns (uint256 value) {
        //TODO maintain and withdraw the total amount deposited to ceros
        return _withdraw(balanceOfPool());
    }

    function _withdraw(uint256 amount) internal returns (uint256 value) {
        require(amount > 0, "invalid amount");
        uint256 wethBalance = underlying.balanceOf(address(this));
        if(amount < wethBalance) {
            underlying.transferFrom(address(this), address(vault), amount);
            return amount;
        }
        
        uint256 amountOut = getAmountOut(address(_certToken), address(underlying), (amount * _certToken.ratio()) / 1e18); // (amount * ratio) / 1e18
        if (amountOut >= amount &&        // (amount * 1e18) / _certToken.ratio() && 
            (amountOut + wethBalance) >= amount
        ) {
            value = _ceRouter.withdrawWithSlippage(address(this), amount - wethBalance, amountOut);
            underlying.deposit{value: value}();
            amount = wethBalance + value;
            underlying.transferFrom(address(this), address(vault), amount);
            return amount;
        }

        // if( wethBalance < amount) {
        //     value = _ceRouter.withdrawWithSlippage(address(this), amount - wethBalance, 0);
        //     underlying.deposit{value: value}();
        //     amount = wethBalance + value;
        // }
        // underlying.transferFrom(address(this), address(vault), amount);
        // return value;
    }

    receive() external payable {

    }

    function retireStrat() external onlyOwner {
        _withdraw(balanceOfPool());
        uint256 underlyingBal = underlying.balanceOf(address(this));
        if(underlyingBal > 0) {
            underlying.transferFrom(address(this), address(vault), underlyingBal);
        }
    }

    function harvest() external {
        uint256 yeild = _ceRouter.claim(address(this));
        _certToken.transfer(_rewardsPool, yeild);
    }

    function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) public view returns (uint256 amountOut) {
        amountOut = IPriceGetter(_priceGetter).getPrice(
            tokenIn,
            tokenOut,
            amountIn,
            0,
            3000
        );
        // return amountOut > (amountIn * _certToken.ratio()) / 1e18;
    }

    function changePriceGetter(address priceGetter) external onlyOwner {
        require(priceGetter != address(0));
        _priceGetter = priceGetter;
        emit PriceGetterChanged(priceGetter);
    }

    function changeCeRouter(address ceRouter) external onlyOwner {
        require(ceRouter != address(0));
        underlying.approve(address(_ceRouter), 0);
        _ceRouter = ICerosRouter(ceRouter);
        underlying.approve(address(_ceRouter), type(uint256).max);
        emit CeRouterChanged(ceRouter);
    }
}