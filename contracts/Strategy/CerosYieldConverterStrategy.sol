//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../MasterVault/interfaces/IMasterVault.sol";
import "../ceros/interfaces/ISwapPool.sol";
import "../MasterVault/interfaces/IWETH.sol";
import "../ceros/interfaces/ICertToken.sol";
import "../ceros/interfaces/ICerosRouter.sol";
import "./BaseStrategy.sol";

contract CerosYieldConverterStrategy is BaseStrategy {

    ICerosRouter private _ceRouter;
    ICertToken private _certToken;
    IMasterVault public vault;

    address private _swapPool;
    address public _rewardsPool;

    event SwapPoolChanged(address swapPool);
    event CeRouterChanged(address ceRouter);

    function initialize(
        address destination,
        address feeRecipient,
        address underlyingToken,
        address ceRouter,
        address certToekn,
        address masterVault,
        address rewardsPool,
        address swapPool
    ) public initializer {
        __BaseStrategy_init(destination, feeRecipient, underlyingToken);
        _ceRouter = ICerosRouter(ceRouter);
        _certToken = ICertToken(certToekn);
        _swapPool = swapPool;
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

    function deposit(uint256 amount) external onlyVault returns(uint256 value) {
        require(amount <= underlying.balanceOf(address(this)), "insufficient balance");
        return _deposit(amount);
    }

    function depositAll() external onlyVault returns(uint256 value) {
        uint256 amount = underlying.balanceOf(address(this));
        return _deposit(amount);
    }

    function _deposit(uint256 amount) internal returns (uint256 value) {
        require(!depositPaused, "deposits are paused");
        require(amount > 0, "invalid amount");
        beforeDeposit(amount);
        (, bool enoughLiquidity) = ISwapPool(_swapPool).getAmountOut(true, amount, false); // (amount * ratio) / 1e18
        if (enoughLiquidity) {
            return _ceRouter.depositWMatic(amount);
        }
    }

    function withdraw(uint256 amount) onlyVault external returns(uint256 value) {
        return _withdraw(amount);
    }

    function panic() external onlyVault returns (uint256 value) {
        (,, uint256 debt) = vault.strategyParams(address(this));
        return _withdraw(debt);
    }

    function _withdraw(uint256 amount) internal returns (uint256 value) {
        require(amount > 0, "invalid amount");
        uint256 wethBalance = underlying.balanceOf(address(this));
        if(amount < wethBalance) {
            underlying.transfer(address(vault), amount);
            return amount;
        }
        
        (uint256 amountOut, bool enoughLiquidity) = ISwapPool(_swapPool).getAmountOut(false, ((amount - wethBalance) * _certToken.ratio()) / 1e18, false); // (amount * ratio) / 1e18
        if (enoughLiquidity) {
            value = _ceRouter.withdrawWithSlippage(address(this), amount - wethBalance, amountOut);
            amount = wethBalance + value;
            underlying.transfer(address(vault), amount);
            return amount;
        }
    }

    receive() external payable {

    }

    function harvest() external onlyStrategist {
        _harvestTo(_rewardsPool);
    }

    function harvestAndSwap() external onlyStrategist {
        uint256 yeild = _harvestTo(address(this));
        (uint256 amountOut, bool enoughLiquidity) = ISwapPool(_swapPool).getAmountOut(false, yeild, true);
        if (enoughLiquidity && amountOut > 0) {
            ISwapPool(_swapPool).swap(false, yeild, address(this));
        }
    }

    function _harvestTo(address to) private returns(uint256 yeild) {
        yeild = _ceRouter.claim(to);
        uint256 profit = _ceRouter.getProfitFor(address(this));
        if(profit > 0) {
            yeild += profit;
            _ceRouter.claimProfit(to);
        }
    }

    function changeSwapPool(address swapPool) external onlyOwner {
        require(swapPool != address(0));
        _swapPool = swapPool;
        emit SwapPoolChanged(swapPool);
    }

    function changeCeRouter(address ceRouter) external onlyOwner {
        require(ceRouter != address(0));
        underlying.approve(address(_ceRouter), 0);
        _ceRouter = ICerosRouter(ceRouter);
        underlying.approve(address(_ceRouter), type(uint256).max);
        emit CeRouterChanged(ceRouter);
    }
}