// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

import { ILP } from "./interfaces/ILP.sol";

contract LP is ILP, ERC20Upgradeable {
  address public swapPool;

  modifier onlySwapPool() {
    require(msg.sender == swapPool, "only swap pool can call this function");
    _;
  }

  // constructor() ERC20("aMATICcLP", "aMATICcLP") {}
  function initialize(string calldata _name, string calldata _symbol)
    external
    initializer
  {
    __ERC20_init_unchained(_name, _symbol);
  }

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