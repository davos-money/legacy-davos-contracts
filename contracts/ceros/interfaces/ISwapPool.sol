// SPDX-License-Identifier: Unliscensed
pragma solidity ^0.8.0;

interface ISwapPool {
    function swap(
        bool nativeToCeros,
        uint256 amountIn,
        address receiver
    ) external returns (uint256 amountOut);
    
    function getAmountOut(
        bool nativeToCeros,
        uint amountIn,
        bool isExcludedFromFee) 
        external view returns(uint amountOut, bool enoughLiquidity);

    function getAmountIn(
        bool nativeToCeros,
        uint amountOut,
        bool isExcludedFromFee)
        external view returns(uint amountIn, bool enoughLiquidity);
    
    function unstakeFee() external view returns (uint24 unstakeFee);
    function stakeFee() external view returns (uint24 stakeFee);

    function FEE_MAX() external view returns (uint24 feeMax);

    function cerosTokenAmount() external view returns(uint256);

    function nativeTokenAmount() external view returns(uint256);
}
