// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { INativeERC20 } from "../interfaces/INativeERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WNative is INativeERC20, ERC20 {
  // solhint-disable-next-line no-empty-blocks
  constructor() ERC20("Wrapped Native", "WNative") {}

  receive() external payable {
    _mint(msg.sender, msg.value);
  }

  function deposit() external payable {
    _mint(msg.sender, msg.value);
  }

  function withdraw(uint256 amount) external {
    _burn(msg.sender, amount);
    // solhint-disable-next-line avoid-low-level-calls
    (bool success, ) = payable(msg.sender).call{ value: amount }("");
    require(success, "Unable to send value, recipient may have reverted");
  }
}
