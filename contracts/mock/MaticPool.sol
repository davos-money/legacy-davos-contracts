// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.6;

import { IERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import "../swapPool/interfaces/IMaticPool.sol";
import "../swapPool/mocks/NativeMock.sol";
import "../swapPool/interfaces/ICerosToken.sol";

contract MaticPoolMock is IMaticPool
{
  uint256 private _ON_DISTRIBUTE_GAS_LIMIT;
  address private _operator;

  uint256 private _minimumStake;
  uint256 public stakeCommission;
  uint256 public unstakeCommission;
  uint256 private _totalCommission;

  NativeMock private _maticToken;

  address private _bondToken;
  address private _certToken;

  function initialize(
    address maticAddress,
    address certToken,
    uint256 minimumStake
  ) external {
    _maticToken = NativeMock(maticAddress);
    _minimumStake = minimumStake;
    _certToken = certToken;
    _ON_DISTRIBUTE_GAS_LIMIT = 300000;
  }

  function stake(bool isRebasing) external payable override {
    uint256 realAmount = msg.value - stakeCommission;
    address staker = msg.sender;
    require(
      realAmount >= _minimumStake,
      "value must be greater than min stake amount"
    );
    _totalCommission += stakeCommission;
    // send matic across into Ethereum chain via MATIC POS
    _maticToken.withdraw{value: realAmount}(realAmount);
  }

  function unstake(uint256 amount, bool isRebasing)
  external
  payable
  override
  {
    require(msg.value >= unstakeCommission, "wrong commission");
    require(isRebasing == false, "bonds not supported in mock");
    _totalCommission += msg.value;
    address claimer = msg.sender;
    address fromToken = _certToken;
    uint256 ratio = ICerosToken(fromToken).ratio();
    uint256 amountOut = transferFromAmount(amount, ratio);
    uint256 realAmount = sharesToBonds(amountOut, ratio);

    require(
      IERC20Upgradeable(fromToken).balanceOf(claimer) >= amount,
      "can not claim more than have on address"
    );
    // transfer tokens from claimer
    IERC20Upgradeable(fromToken).transferFrom(
      claimer,
      address(this),
      amount
    );
  }

  function changeStakeCommission(uint256 commission) external {
    stakeCommission = commission;
  }

  function changeUnstakeCommission(uint256 commission) external {
    unstakeCommission = commission;
  }

  function transferFromAmount(uint256 amount, uint256 ratio)
  internal
  pure
  returns (uint256)
  {
    return
    multiplyAndDivideCeil(
      multiplyAndDivideFloor(amount, ratio, 1e18),
      1e18,
      ratio
    );
  }

  function sharesToBonds(uint256 amount, uint256 ratio)
  internal
  pure
  returns (uint256)
  {
    return multiplyAndDivideFloor(amount, 1e18, ratio);
  }

  function bondsToShares(uint256 amount, uint256 ratio)
  internal
  pure
  returns (uint256)
  {
    return multiplyAndDivideFloor(amount, ratio, 1e18);
  }

  function saturatingMultiply(uint256 a, uint256 b)
  internal
  pure
  returns (uint256)
  {
  unchecked {
    if (a == 0) return 0;
    uint256 c = a * b;
    if (c / a != b) return type(uint256).max;
    return c;
  }
  }

  function saturatingAdd(uint256 a, uint256 b)
  internal
  pure
  returns (uint256)
  {
  unchecked {
    uint256 c = a + b;
    if (c < a) return type(uint256).max;
    return c;
  }
  }

  // Preconditions:
  //  1. a may be arbitrary (up to 2 ** 256 - 1)
  //  2. b * c < 2 ** 256
  // Returned value: min(floor((a * b) / c), 2 ** 256 - 1)
  function multiplyAndDivideFloor(
    uint256 a,
    uint256 b,
    uint256 c
  ) internal pure returns (uint256) {
    return
    saturatingAdd(
      saturatingMultiply(a / c, b),
      ((a % c) * b) / c // can't fail because of assumption 2.
    );
  }

  // Preconditions:
  //  1. a may be arbitrary (up to 2 ** 256 - 1)
  //  2. b * c < 2 ** 256
  // Returned value: min(ceil((a * b) / c), 2 ** 256 - 1)
  function multiplyAndDivideCeil(
    uint256 a,
    uint256 b,
    uint256 c
  ) internal pure returns (uint256) {
    return
    saturatingAdd(
      saturatingMultiply(a / c, b),
      ((a % c) * b + (c - 1)) / c // can't fail because of assumption 2.
    );
  }
}