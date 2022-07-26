// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface INativeERC20 is IERC20 {
  function deposit() external payable;

  function withdraw(uint256) external;
}
