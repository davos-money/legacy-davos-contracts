// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ILP is IERC20 {
  function mint(address, uint256) external;

  function burn(address, uint256) external;
}