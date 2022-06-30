// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IERC4626Upgradeable.sol";

interface IMasterVault is IERC4626Upgradeable {
    event DepositFeeChanged(uint256 newDepositFee);
    event MaxDepositFeeChanged(uint256 newMaxDepositFee);
    event WithdrawalFeeChanged(uint256 newWithdrawalFee);
    event MaxWithdrawalFeeChanged(uint256 newMaxWithdrawalFee);
    event ProviderChanged(address provider);
    event RouterChanged(address ceRouter);

    function withdrawETH(address account, uint256 amount) external  returns (uint256);
    function depositETH() external payable returns (uint256);
}