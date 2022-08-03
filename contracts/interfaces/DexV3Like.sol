// SPDX-License-Identifier: GPL-3.0-only
pragma solidity >=0.8.2;

interface DexV3Like {
    
    struct ExactInputSingleParams {
    address tokenIn;
    address tokenOut;
    uint24 fee;
    address recipient;
    uint256 deadline;
    uint256 amountIn;
    uint256 amountOutMinimum;
    uint160 sqrtPriceLimitX96;
}
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}