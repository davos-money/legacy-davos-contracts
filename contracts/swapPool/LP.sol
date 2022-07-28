// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LP is ERC20 {
  address public swapPool;

  modifier onlySwapPool() {
    require(msg.sender == swapPool, "only swap pool can call this function");
    _;
  }

  // solhint-disable-next-line no-empty-blocks
  constructor() ERC20("aMATICcLP", "aMATICcLP") {}

  function setSwapPool(address _swapPool) external {
    require(swapPool == address(0), "swap pool can be set only once");
    swapPool = _swapPool;
  }

  function mint(address _account, uint256 _amount) external onlySwapPool {
    _mint(_account, _amount);
  }

  function burn(address _account, uint256 _amount) external onlySwapPool {
    _burn(_account, _amount);
  }
}