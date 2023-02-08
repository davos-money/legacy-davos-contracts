// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { IERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import { SafeERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import { EnumerableSetUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import { PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import { ILP } from "./interfaces/ILP.sol";
import { ISwapPool } from "../ceros/interfaces/ISwapPool.sol";
import { IMaticPool } from "./interfaces/IMaticPool.sol";
import { ICerosToken } from "./interfaces/ICerosToken.sol";
import { INativeERC20 } from "./interfaces/INativeERC20.sol";

enum UserType {
  MANAGER,
  LIQUIDITY_PROVIDER,
  INTEGRATOR
}

enum FeeType {
  OWNER,
  MANAGER,
  INTEGRATOR,
  STAKE,
  UNSTAKE
}

struct FeeAmounts {
  uint128 nativeFee;
  uint128 cerosFee;
}

// solhint-disable max-states-count
contract SwapPool is
  ISwapPool,
  OwnableUpgradeable,
  PausableUpgradeable,
  ReentrancyGuardUpgradeable
{
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
  using SafeERC20Upgradeable for IERC20Upgradeable;

  event UserTypeChanged(address indexed user, UserType indexed utype, bool indexed added);
  event FeeChanged(FeeType indexed utype, uint24 oldFee, uint24 newFee);
  event IntegratorLockEnabled(bool indexed enabled);
  event ProviderLockEnabled(bool indexed enabled);
  event ExcludedFromFee(address indexed user, bool indexed excluded);
  event LiquidityChange(
    address indexed user,
    uint256 nativeAmount,
    uint256 stakingAmount,
    uint256 nativeReserve,
    uint256 stakingReserve,
    bool indexed added
  );
  event Swap(
    address indexed sender,
    address indexed receiver,
    bool indexed nativeToCeros,
    uint256 amountIn,
    uint256 amountOut
  );
  event ThresholdChanged(uint256 newThreshold);
  event MaticPoolChanged(address newMaticPool);

  uint24 public constant FEE_MAX = 100000;

  EnumerableSetUpgradeable.AddressSet internal managers_;
  EnumerableSetUpgradeable.AddressSet internal integrators_;
  EnumerableSetUpgradeable.AddressSet internal liquidityProviders_;

  address public nativeToken;
  address public cerosToken;
  address public lpToken;

  uint256 public nativeTokenAmount;
  uint256 public cerosTokenAmount;

  uint24 public ownerFee;
  uint24 public managerFee;
  uint24 public integratorFee;
  uint24 public stakeFee;
  uint24 public unstakeFee;
  uint24 public threshold;

  bool public integratorLockEnabled;
  bool public providerLockEnabled;

  FeeAmounts public ownerFeeCollected;

  FeeAmounts public managerFeeCollected;
  FeeAmounts internal _accFeePerManager;
  FeeAmounts internal _alreadyUpdatedFees;
  FeeAmounts internal _claimedManagerFees;

  mapping(address => FeeAmounts) public managerRewardDebt;
  mapping(address => bool) public excludedFromFee;

  IMaticPool public maticPool;

  modifier onlyOwnerOrManager() {
    require(
      msg.sender == owner() || managers_.contains(msg.sender),
      "only owner or manager can call this function"
    );
    _;
  }

  modifier onlyManager() {
    require(managers_.contains(msg.sender), "only manager can call this function");
    _;
  }

  modifier onlyIntegrator() {
    if (integratorLockEnabled) {
      require(integrators_.contains(msg.sender), "only integrators can call this function");
    }
    _;
  }

  modifier onlyProvider() {
    if (providerLockEnabled) {
      require(
        liquidityProviders_.contains(msg.sender),
        "only liquidity providers can call this function"
      );
    }
    _;
  }

  function initialize(
    address _nativeToken,
    address _cerosToken,
    address _lpToken,
    bool _integratorLockEnabled,
    bool _providerLockEnabled
  ) public initializer {
    __Ownable_init();
    __Pausable_init();
    __ReentrancyGuard_init();
    nativeToken = _nativeToken;
    cerosToken = _cerosToken;
    lpToken = _lpToken;
    integratorLockEnabled = _integratorLockEnabled;
    providerLockEnabled = _providerLockEnabled;
  }

  /**
   * @notice adds liquidity to the pool with native coin. See - {_addLiquidity}
   */
  function addLiquidityEth(uint256 amount1) external payable virtual onlyProvider nonReentrant {
    _addLiquidity(msg.value, amount1, true);
  }

  /**
   * @notice adds liquidity to the pool. See - {_addLiquidity}
   */
  function addLiquidity(uint256 amount0, uint256 amount1)
    external
    virtual
    onlyProvider
    nonReentrant
  {
    _addLiquidity(amount0, amount1, false);
  }

  /**
   * @notice adds liquidity of nativeToken and cerosToken by 50/50
   * @param amount0 - the amount of nativeToken
   * @param amount1 - the amount of cerosToken
   * @param useEth - if 'true', then it will get nativeToken as native else it will get ERC20 wrapped token
   */
  function _addLiquidity(
    uint256 amount0,
    uint256 amount1,
    bool useEth
  ) internal virtual {
    uint256 ratio = ICerosToken(cerosToken).ratio();
    uint256 value = (amount0 * ratio) / 1e18;
    if (amount1 < value) {
      amount0 = (amount1 * 1e18) / ratio;
    } else {
      amount1 = value;
    }
    if (useEth) {
      INativeERC20(nativeToken).deposit{ value: amount0 }();
      uint256 diff = msg.value - amount0;
      if (diff != 0) {
        _sendValue(msg.sender, diff);
      }
    } else {
      IERC20Upgradeable(nativeToken).safeTransferFrom(msg.sender, address(this), amount0);
    }
    IERC20Upgradeable(cerosToken).safeTransferFrom(msg.sender, address(this), amount1);
    if (nativeTokenAmount == 0 && cerosTokenAmount == 0) {
      require(amount0 > 1e18, "cannot add first time less than 1 token");
      nativeTokenAmount = amount0;
      cerosTokenAmount = amount1;

      ILP(lpToken).mint(msg.sender, (2 * amount0) / 10**8);
    } else {
      uint256 allInNative = nativeTokenAmount + (cerosTokenAmount * 1e18) / ratio;
      uint256 mintAmount = (2 * amount0 * ILP(lpToken).totalSupply()) / allInNative;
      nativeTokenAmount += amount0;
      cerosTokenAmount += amount1;

      ILP(lpToken).mint(msg.sender, mintAmount);
    }
    emit LiquidityChange(msg.sender, amount0, amount1, nativeTokenAmount, cerosTokenAmount, true);
  }

  /**
   * @notice removes liquidity from pool by lp amount. See - {_removeliquidityLp}
   */
  function removeLiquidity(uint256 lpAmount) external virtual nonReentrant {
    _removeLiquidityLp(lpAmount, false);
  }

  /**
   * @notice removes liquidity from pool by lp amount. See - {_removeliquidityLp}
   */
  function removeLiquidityEth(uint256 lpAmount) external virtual nonReentrant {
    _removeLiquidityLp(lpAmount, true);
  }

  /**
   * @notice removes liquidity from pool by percent. See - {_removeliquidityPercent}
   */
  function removeLiquidityPercent(uint256 percent) external virtual nonReentrant {
    _removeLiquidityPercent(percent, false);
  }

  /**
   * @notice removes liquidity from pool by percent. See - {_removeliquidityPercent}
   */
  function removeLiquidityPercentEth(uint256 percent) external virtual nonReentrant {
    _removeLiquidityPercent(percent, true);
  }

  /**
   * @notice removes liquidity from pool by percent.
   * @param percent - the percent of your provided liquidity that you want to remove
   * @param useEth - if 'true' then transfer native token amount by native coin else by wrapped
   */
  function _removeLiquidityPercent(uint256 percent, bool useEth) internal virtual {
    require(percent > 0 && percent <= 1e18, "percent should be more than 0 and less than 1e18"); // max percnet(100%) is -> 10 ** 18
    uint256 balance = ILP(lpToken).balanceOf(msg.sender);
    uint256 removedLp = (balance * percent) / 1e18;
    _removeLiquidity(removedLp, useEth);
  }

  /**
   * @notice removes liquidity from pool by lp amount.
   * @param removedLp - the amount of your lp tokens that you want to remove.
   * @param useEth - if 'true' then transfer native token amount by native coin else by wrapped
   */
  function _removeLiquidityLp(uint256 removedLp, bool useEth) internal virtual {
    uint256 balance = ILP(lpToken).balanceOf(msg.sender);
    if (removedLp == type(uint256).max) {
      removedLp = balance;
    } else {
      require(removedLp <= balance, "you want to remove more than your lp balance");
    }
    require(removedLp > 0, "lp amount should be more than 0");
    _removeLiquidity(removedLp, useEth);
  }

  /**
   * @notice removes liquidity from pool by lp amount.
   * @param removedLp - the amount of your lp tokens that you want to remove.
   * @param useEth - if 'true' then transfer native token amount by native coin else by wrapped
   */
  function _removeLiquidity(uint256 removedLp, bool useEth) internal virtual {
    uint256 totalSupply = ILP(lpToken).totalSupply();
    ILP(lpToken).burn(msg.sender, removedLp);
    uint256 amount0Removed = (removedLp * nativeTokenAmount) / totalSupply;
    uint256 amount1Removed = (removedLp * cerosTokenAmount) / totalSupply;

    nativeTokenAmount -= amount0Removed;
    cerosTokenAmount -= amount1Removed;

    if (useEth) {
      INativeERC20(nativeToken).withdraw(amount0Removed);
      _sendValue(msg.sender, amount0Removed);
    } else {
      IERC20Upgradeable(nativeToken).safeTransfer(msg.sender, amount0Removed);
    }
    IERC20Upgradeable(cerosToken).safeTransfer(msg.sender, amount1Removed);
    emit LiquidityChange(
      msg.sender,
      amount0Removed,
      amount1Removed,
      nativeTokenAmount,
      cerosTokenAmount,
      false
    );
  }

  /**
   * @notice swaps the native coin to ceros or vise versa. See - {_swap}
   */
  function swapEth(
    bool nativeToCeros,
    uint256 amountIn,
    address receiver
  ) external payable virtual onlyIntegrator nonReentrant returns (uint256 amountOut) {
    if (nativeToCeros) {
      require(msg.value == amountIn, "You should send the amountIn coin to the cointract");
    } else {
      require(msg.value == 0, "no need to send value if swapping ceros to Native");
    }
    return _swap(nativeToCeros, amountIn, receiver, true);
  }

  /**
   * @notice swaps the native wrapped token to ceros or vise versa. See - {_swap}
   */
  function swap(
    bool nativeToCeros,
    uint256 amountIn,
    address receiver
  ) external virtual onlyIntegrator nonReentrant returns (uint256 amountOut) {
    return _swap(nativeToCeros, amountIn, receiver, false);
  }

  /**
   * @notice swaps native token to ceros or ceros token to native.
   * @param nativeToCeros - if 'true' then will swap native token to ceros, else ceros-native
   * @param amountIn - the amount of tokens that you want to swap
   * @param receiver - the address of swap receiver
   * @param useEth - if 'true' then transfer native token amount by native coin else by wrapped
   */
  function _swap(
    bool nativeToCeros,
    uint256 amountIn,
    address receiver,
    bool useEth
  ) internal virtual returns (uint256 amountOut) {
    require(receiver != address(0), "invaid receiver address");
    uint256 ratio = ICerosToken(cerosToken).ratio();
    if (nativeToCeros) {
      if (useEth) {
        INativeERC20(nativeToken).deposit{ value: amountIn }();
      } else {
        IERC20Upgradeable(nativeToken).safeTransferFrom(msg.sender, address(this), amountIn);
      }
      if (!excludedFromFee[msg.sender]) {
        uint256 stakeFeeAmt = (amountIn * stakeFee) / FEE_MAX;
        amountIn -= stakeFeeAmt;
        uint256 managerFeeAmt = (stakeFeeAmt * managerFee) / FEE_MAX;
        uint256 ownerFeeAmt = (stakeFeeAmt * ownerFee) / FEE_MAX;
        uint256 integratorFeeAmt;
        if (integratorLockEnabled) {
          integratorFeeAmt = (stakeFeeAmt * integratorFee) / FEE_MAX;
          if (integratorFeeAmt > 0) {
            IERC20Upgradeable(nativeToken).safeTransfer(msg.sender, integratorFeeAmt);
          }
        }
        nativeTokenAmount +=
          amountIn +
          (stakeFeeAmt - managerFeeAmt - ownerFeeAmt - integratorFeeAmt);

        ownerFeeCollected.nativeFee += uint128(ownerFeeAmt);
        managerFeeCollected.nativeFee += uint128(managerFeeAmt);
      } else {
        nativeTokenAmount += amountIn;
      }
      amountOut = (amountIn * ratio) / 1e18;
      require(cerosTokenAmount >= amountOut, "Not enough liquidity");
      cerosTokenAmount -= amountOut;
      IERC20Upgradeable(cerosToken).safeTransfer(receiver, amountOut);
      emit Swap(msg.sender, receiver, nativeToCeros, amountIn, amountOut);
    } else {
      IERC20Upgradeable(cerosToken).safeTransferFrom(msg.sender, address(this), amountIn);
      if (!excludedFromFee[msg.sender]) {
        uint256 unstakeFeeAmt = (amountIn * unstakeFee) / FEE_MAX;
        amountIn -= unstakeFeeAmt;
        uint256 managerFeeAmt = (unstakeFeeAmt * managerFee) / FEE_MAX;
        uint256 ownerFeeAmt = (unstakeFeeAmt * ownerFee) / FEE_MAX;
        uint256 integratorFeeAmt;
        if (integratorLockEnabled) {
          integratorFeeAmt = (unstakeFeeAmt * integratorFee) / FEE_MAX;
          if (integratorFeeAmt > 0) {
            IERC20Upgradeable(cerosToken).safeTransfer(msg.sender, integratorFeeAmt);
          }
        }
        cerosTokenAmount +=
          amountIn +
          (unstakeFeeAmt - managerFeeAmt - ownerFeeAmt - integratorFeeAmt);

        ownerFeeCollected.cerosFee += uint128(ownerFeeAmt);
        managerFeeCollected.cerosFee += uint128(managerFeeAmt);
      } else {
        cerosTokenAmount += amountIn;
      }
      amountOut = (amountIn * 1e18) / ratio;
      require(nativeTokenAmount >= amountOut, "Not enough liquidity");
      nativeTokenAmount -= amountOut;
      if (useEth) {
        INativeERC20(nativeToken).withdraw(amountOut);
        _sendValue(receiver, amountOut);
      } else {
        IERC20Upgradeable(nativeToken).safeTransfer(receiver, amountOut);
      }
      emit Swap(msg.sender, receiver, nativeToCeros, amountIn, amountOut);
    }
  }

  /**
   * @notice view function which retruns amount out by amount in
   * @param nativeToCeros - if 'true' then will show native token to ceros, else ceros-native
   * @param amountIn - the amount of tokens that you want to swap
   * @param isExcludedFromFee - if 'true' will calculate amount out without fees
   */
  function getAmountOut(
    bool nativeToCeros,
    uint256 amountIn,
    bool isExcludedFromFee
  ) external view virtual returns (uint256 amountOut, bool enoughLiquidity) {
    uint256 ratio = ICerosToken(cerosToken).ratio();
    if (nativeToCeros) {
      if (!isExcludedFromFee) {
        uint256 stakeFeeAmt = (amountIn * stakeFee) / FEE_MAX;
        amountIn -= stakeFeeAmt;
      }
      amountOut = (amountIn * ratio) / 1e18;
      enoughLiquidity = cerosTokenAmount >= amountOut;
    } else {
      if (!isExcludedFromFee) {
        uint256 unstakeFeeAmt = (amountIn * unstakeFee) / FEE_MAX;
        amountIn -= unstakeFeeAmt;
      }
      amountOut = (amountIn * 1e18) / ratio;
      enoughLiquidity = nativeTokenAmount >= amountOut;
    }
  }

  /// sends the amount to the receiver address
  function _sendValue(address receiver, uint256 amount) internal virtual {
    payable(receiver).transfer(amount);
  }

  /**
   * @notice See - {_withdrawOwnerFee}
   */
  function withdrawOwnerFeeEth(uint256 amount0, uint256 amount1)
    external
    virtual
    onlyOwner
    nonReentrant
  {
    _withdrawOwnerFee(amount0, amount1, true);
  }

  /**
   * @notice See - {_withdrawOwnerFee}
   */
  function withdrawOwnerFee(uint256 amount0, uint256 amount1)
    external
    virtual
    onlyOwner
    nonReentrant
  {
    _withdrawOwnerFee(amount0, amount1, false);
  }

  /**
   * @notice withdraws fees for owner
   * @param amount0Raw - amount of native to receve. use MAX_UINT256 to get all available amount.
   * @param amount1Raw - amount of ceros token to receve. use MAX_UINT256 to get all available amount.
   * @param useEth - if 'true' then transfer native token amount by native coin else by wrapped
   */
  function _withdrawOwnerFee(
    uint256 amount0Raw,
    uint256 amount1Raw,
    bool useEth
  ) internal virtual {
    uint128 amount0;
    uint128 amount1;
    if (amount0Raw == type(uint256).max) {
      amount0 = ownerFeeCollected.nativeFee;
    } else {
      require(amount0Raw <= type(uint128).max, "unsafe typecasting");
      amount0 = uint128(amount0Raw);
    }
    if (amount1Raw == type(uint256).max) {
      amount1 = ownerFeeCollected.cerosFee;
    } else {
      require(amount1Raw <= type(uint128).max, "unsafe typecasting");
      amount1 = uint128(amount1Raw);
    }
    if (amount0 > 0) {
      ownerFeeCollected.nativeFee -= amount0;
      if (useEth) {
        INativeERC20(nativeToken).withdraw(amount0);
        _sendValue(msg.sender, amount0);
      } else {
        IERC20Upgradeable(nativeToken).safeTransfer(msg.sender, amount0);
      }
    }
    if (amount1 > 0) {
      ownerFeeCollected.cerosFee -= amount1;
      IERC20Upgradeable(cerosToken).safeTransfer(msg.sender, amount1);
    }
  }

  function getRemainingManagerFee(address managerAddress)
    external
    view
    virtual
    returns (FeeAmounts memory feeRewards)
  {
    if (managers_.contains(managerAddress)) {
      uint256 managersLength = managers_.length();
      FeeAmounts memory currentManagerRewardDebt = managerRewardDebt[managerAddress];
      FeeAmounts memory accFee;
      accFee.nativeFee =
        _accFeePerManager.nativeFee +
        (managerFeeCollected.nativeFee - _alreadyUpdatedFees.nativeFee) /
        uint128(managersLength);
      accFee.cerosFee =
        _accFeePerManager.cerosFee +
        (managerFeeCollected.cerosFee - _alreadyUpdatedFees.cerosFee) /
        uint128(managersLength);
      feeRewards.nativeFee = accFee.nativeFee - currentManagerRewardDebt.nativeFee;
      feeRewards.cerosFee = accFee.cerosFee - currentManagerRewardDebt.cerosFee;
    }
  }

  /**
   * @notice See - {_withdrawManagerFee}
   */
  function withdrawManagerFee() external virtual onlyManager nonReentrant {
    _withdrawManagerFee(msg.sender, false);
  }

  /**
   * @notice See - {_withdrawManagerFee}
   */
  function withdrawManagerFeeEth() external virtual onlyManager nonReentrant {
    _withdrawManagerFee(msg.sender, true);
  }

  /**
   * @notice withdraws fees for manager
   * @param managerAddress - manager address to transfer the whole fees
   * @param useNative - if 'true' then transfer native token amount by native coin else by wrapped
   */
  function _withdrawManagerFee(address managerAddress, bool useNative) internal virtual {
    FeeAmounts memory feeRewards;
    FeeAmounts storage currentManagerRewardDebt = managerRewardDebt[managerAddress];
    _updateManagerFees();
    feeRewards.nativeFee = _accFeePerManager.nativeFee - currentManagerRewardDebt.nativeFee;
    feeRewards.cerosFee = _accFeePerManager.cerosFee - currentManagerRewardDebt.cerosFee;
    if (feeRewards.nativeFee > 0) {
      currentManagerRewardDebt.nativeFee += feeRewards.nativeFee;
      _claimedManagerFees.nativeFee += feeRewards.nativeFee;
      if (useNative) {
        INativeERC20(nativeToken).withdraw(feeRewards.nativeFee);
        _sendValue(managerAddress, feeRewards.nativeFee);
      } else {
        IERC20Upgradeable(nativeToken).safeTransfer(managerAddress, feeRewards.nativeFee);
      }
    }
    if (feeRewards.cerosFee > 0) {
      currentManagerRewardDebt.cerosFee += feeRewards.cerosFee;
      _claimedManagerFees.cerosFee += feeRewards.cerosFee;
      IERC20Upgradeable(cerosToken).safeTransfer(managerAddress, feeRewards.cerosFee);
    }
  }

  function _updateManagerFees() internal virtual {
    uint256 managersLength = managers_.length();
    _accFeePerManager.nativeFee +=
      (managerFeeCollected.nativeFee - _alreadyUpdatedFees.nativeFee) /
      uint128(managersLength);
    _accFeePerManager.cerosFee +=
      (managerFeeCollected.cerosFee - _alreadyUpdatedFees.cerosFee) /
      uint128(managersLength);
    _alreadyUpdatedFees.nativeFee = managerFeeCollected.nativeFee;
    _alreadyUpdatedFees.cerosFee = managerFeeCollected.cerosFee;
  }

  function add(address value, UserType utype) public virtual returns (bool) {
    require(value != address(0), "cannot add address(0)");
    bool success = false;
    if (utype == UserType.MANAGER) {
      require(msg.sender == owner(), "Only owner can add manager");
      if (!managers_.contains(value)) {
        uint256 managersLength = managers_.length();
        if (managersLength != 0) {
          _updateManagerFees();
          managerRewardDebt[value].nativeFee = _accFeePerManager.nativeFee;
          managerRewardDebt[value].cerosFee = _accFeePerManager.cerosFee;
        }
        success = managers_.add(value);
      }
    } else if (utype == UserType.LIQUIDITY_PROVIDER) {
      require(managers_.contains(msg.sender), "Only manager can add liquidity provider");
      success = liquidityProviders_.add(value);
    } else {
      require(managers_.contains(msg.sender), "Only manager can add integrator");
      success = integrators_.add(value);
    }
    if (success) {
      emit UserTypeChanged(value, utype, true);
    }
    return success;
  }

  function setFee(uint24 newFee, FeeType feeType) external virtual onlyOwnerOrManager {
    require(newFee < FEE_MAX, "Unsupported size of fee!");
    if (feeType == FeeType.OWNER) {
      require(msg.sender == owner(), "only owner can call this function");
      require(newFee + managerFee + integratorFee < FEE_MAX, "fee sum is more than 100%");
      emit FeeChanged(feeType, ownerFee, newFee);
      ownerFee = newFee;
    } else if (feeType == FeeType.MANAGER) {
      require(newFee + ownerFee + integratorFee < FEE_MAX, "fee sum is more than 100%");
      emit FeeChanged(feeType, managerFee, newFee);
      managerFee = newFee;
    } else if (feeType == FeeType.INTEGRATOR) {
      require(newFee + ownerFee + managerFee < FEE_MAX, "fee sum is more than 100%");
      emit FeeChanged(feeType, integratorFee, newFee);
      integratorFee = newFee;
    } else if (feeType == FeeType.STAKE) {
      emit FeeChanged(feeType, stakeFee, newFee);
      stakeFee = newFee;
    } else {
      emit FeeChanged(feeType, unstakeFee, newFee);
      unstakeFee = newFee;
    }
  }

  function setThreshold(uint24 newThreshold) external virtual onlyManager {
    require(newThreshold < FEE_MAX / 2, "threshold shuold be less than 50%");
    threshold = newThreshold;
    emit ThresholdChanged(newThreshold);
  }

  function setMaticPool(address newMaticPool) external virtual onlyOwner {
    maticPool = IMaticPool(newMaticPool);
    emit MaticPoolChanged(newMaticPool);
  }

  function enableIntegratorLock(bool enable) external virtual onlyOwnerOrManager {
    integratorLockEnabled = enable;
    emit IntegratorLockEnabled(enable);
  }

  function enableProviderLock(bool enable) external virtual onlyOwnerOrManager {
    providerLockEnabled = enable;
    emit ProviderLockEnabled(enable);
  }

  function excludeFromFee(address value, bool exclude) external virtual onlyOwnerOrManager {
    excludedFromFee[value] = exclude;
    emit ExcludedFromFee(value, exclude);
  }

  /**
   * @notice triggers the rebalance and stakes/unstakes the amounts of tokens to balance the pool(50/50)
   */
  function triggerRebalanceAnkr() external virtual nonReentrant onlyManager {
    skim();
    uint256 ratio = ICerosToken(cerosToken).ratio();
    uint256 amountAInNative = nativeTokenAmount;
    uint256 amountBInNative = (cerosTokenAmount * 1e18) / ratio;
    uint256 wholeAmount = amountAInNative + amountBInNative;
    bool isStake = amountAInNative > amountBInNative;
    if (!isStake) {
      uint256 temp = amountAInNative;
      amountAInNative = amountBInNative;
      amountBInNative = temp;
    }
    require(
      (amountBInNative * FEE_MAX) / wholeAmount < threshold,
      "the proportions are not less than threshold"
    );
    uint256 amount = (amountAInNative - amountBInNative) / 2;
    if (isStake) {
      nativeTokenAmount -= amount;
      INativeERC20(nativeToken).withdraw(amount);
      maticPool.stake{ value: amount }(false);
    } else {
      uint256 cerosAmt = (amount * ratio) / 1e18;
      uint256 commission = maticPool.unstakeCommission();
      cerosTokenAmount -= cerosAmt;
      nativeTokenAmount -= commission;
      INativeERC20(nativeToken).withdraw(commission);
      maticPool.unstake{ value: commission }(cerosAmt, false);
    }
  }

  /**
   * @notice triggers the rebalance and stakes/unstakes the amounts of tokens to balance the pool MATIC balance with given percent
   * @dev ignore threshold
   */
  function triggerRebalanceAnkrWithPercent(uint16 percent) external virtual nonReentrant onlyManager {
    require(percent >= 0 && percent <= 10000, "percent should be in range 0-100.00");

    skim();
    uint256 ratio = ICerosToken(cerosToken).ratio();

    // MATIC balance of pool
    uint256 amountAInNative = nativeTokenAmount;
    // ankrMATIC balance of pool in MATIC
    uint256 amountBInNative = (cerosTokenAmount * 1e18) / ratio;
    // total pool balance
    uint256 wholeAmount = amountAInNative + amountBInNative;

    uint256 expectedNative = wholeAmount * percent / 10000;

    uint256 amount;
    if (expectedNative < amountAInNative) {
      // we need stake to decrease MATIC amount
      amount = amountAInNative - expectedNative;

      require(nativeTokenAmount >= amount, "not enough MATIC to stake");
      nativeTokenAmount -= amount;
      INativeERC20(nativeToken).withdraw(amount);
      maticPool.stake{ value: amount }(false);
    } else if (expectedNative > amountAInNative) {
      // we need unstake to increase MATIC amount
      // set diff as amount to unstake
      amount = expectedNative - amountAInNative;

      uint256 cerosAmt = (amount * ratio) / 1e18;
      uint256 commission = maticPool.unstakeCommission();

      require(cerosTokenAmount >= cerosAmt, "not enough to pay ankrMATIC commission");
      require(nativeTokenAmount >= commission, "not enough to pay MATIC commission");

      cerosTokenAmount -= cerosAmt;
      nativeTokenAmount -= commission;

      INativeERC20(nativeToken).withdraw(commission);
      maticPool.unstake{ value: commission }(cerosAmt, false);
    } else {
      revert("already balanced");
    }
  }

  function approveToMaticPool() external virtual {
    IERC20Upgradeable(cerosToken).safeApprove(address(maticPool), type(uint256).max);
  }

  /**
   * @notice adds the not registered tokens to the liquidity pool
   */
  function skim() public virtual {
    uint256 contractBal = address(this).balance;
    uint256 contractWNativeBal = INativeERC20(nativeToken).balanceOf(address(this)) -
      ownerFeeCollected.nativeFee -
      (managerFeeCollected.nativeFee - _claimedManagerFees.nativeFee);
    uint256 contractCerosBal = ICerosToken(cerosToken).balanceOf(address(this)) -
      ownerFeeCollected.cerosFee -
      (managerFeeCollected.cerosFee - _claimedManagerFees.cerosFee);

    if (contractWNativeBal > nativeTokenAmount) {
      nativeTokenAmount = contractWNativeBal;
    }
    if (contractCerosBal > cerosTokenAmount) {
      cerosTokenAmount = contractCerosBal;
    }

    if (contractBal > nativeTokenAmount) {
      INativeERC20(nativeToken).deposit{ value: contractBal }();
      nativeTokenAmount += contractBal;
    }
  }

  function remove(address value, UserType utype) public virtual nonReentrant returns (bool) {
    require(value != address(0), "cannot remove address(0)");
    bool success = false;
    if (utype == UserType.MANAGER) {
      require(msg.sender == owner(), "Only owner can remove manager");
      if (managers_.contains(value)) {
        _withdrawManagerFee(value, false);
        success = managers_.remove(value);
        require(success, "cannot remove manager");
        delete managerRewardDebt[value];
      }
    } else if (utype == UserType.LIQUIDITY_PROVIDER) {
      require(managers_.contains(msg.sender), "Only manager can remove liquidity provider");
      success = liquidityProviders_.remove(value);
    } else {
      require(managers_.contains(msg.sender), "Only manager can remove integrator");
      success = integrators_.remove(value);
    }
    if (success) {
      emit UserTypeChanged(value, utype, false);
    }
    return success;
  }

  function contains(address value, UserType utype) external view virtual returns (bool) {
    if (utype == UserType.MANAGER) {
      return managers_.contains(value);
    } else if (utype == UserType.LIQUIDITY_PROVIDER) {
      return liquidityProviders_.contains(value);
    } else {
      return integrators_.contains(value);
    }
  }

  function length(UserType utype) external view virtual returns (uint256) {
    if (utype == UserType.MANAGER) {
      return managers_.length();
    } else if (utype == UserType.LIQUIDITY_PROVIDER) {
      return liquidityProviders_.length();
    } else {
      return integrators_.length();
    }
  }

  function at(uint256 index, UserType utype) external view virtual returns (address) {
    if (utype == UserType.MANAGER) {
      return managers_.at(index);
    } else if (utype == UserType.LIQUIDITY_PROVIDER) {
      return liquidityProviders_.at(index);
    } else {
      return integrators_.at(index);
    }
  }

  // solhint-disable-next-line no-empty-blocks
  receive() external payable virtual {}
}