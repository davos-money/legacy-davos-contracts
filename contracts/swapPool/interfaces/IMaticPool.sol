// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

interface IMaticPool {
  function stake(bool isRebasing) external payable;

  function unstake(uint256 amount, bool isRebasing) external payable;

  function stakeCommision() external view returns (uint256);

  function unstakeCommision() external view returns (uint256);
}