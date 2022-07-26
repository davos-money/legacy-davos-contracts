// SPDX-License-Identifier: MIT

import "./IERC20.sol";

pragma solidity ^0.8.0;

interface IWETH is IERC20 {
    function deposit() external payable;

    function withdraw(uint256 wad) external;
}