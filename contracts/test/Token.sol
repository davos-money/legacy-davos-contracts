// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
  uint256 private _ratio;

  constructor(string memory name, string memory symbol) ERC20(name, symbol) {
    _ratio = 1e18;
  }

  function mint(address _account, uint256 _amount) external {
    _mint(_account, _amount);
  }

  function burn(address _account, uint256 _amount) external {
    _burn(_account, _amount);
  }

  function ratio() external view returns (uint256) {
    return _ratio;
  }

  function setRatio(uint256 ratio_) external {
    _ratio = ratio_;
  }
}