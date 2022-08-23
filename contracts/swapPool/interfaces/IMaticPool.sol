// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

interface IMaticPool {
  function stake(bool isRebasing) external payable;

  function unstake(uint256 amount, bool isRebasing) external payable;

  function stakeCommission() external view returns (uint256);

  function unstakeCommission() external view returns (uint256);
}