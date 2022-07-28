// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { ICerosToken } from "../interfaces/ICerosToken.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CerosToken is ICerosToken, ERC20 {
  uint256 public ratio;

  // solhint-disable-next-line no-empty-blocks
  constructor() ERC20("Wrapped Native", "WNative") {}

  function mint(address account, uint256 amount) external {
    _mint(account, amount);
  }

  function mintMe(uint256 amount) external {
    _mint(msg.sender, amount);
  }

  function burn(address account, uint256 amount) external {
    _burn(account, amount);
  }

  function burnMe(uint256 amount) external {
    _burn(msg.sender, amount);
  }

  function setRatio(uint256 newRatio) external {
    ratio = newRatio;
  }
}