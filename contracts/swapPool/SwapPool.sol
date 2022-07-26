// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import { EnumerableSet } from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import { ILP } from "./interfaces/ILP.sol";
import { IRatioToken } from "./interfaces/IRatioToken.sol";
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
  uint128 stkTokenFee;
}

// solhint-disable max-states-count
contract SwapPool is Ownable, ReentrancyGuard {
  using EnumerableSet for EnumerableSet.AddressSet;

  event UserTypeChanged(address indexed user, UserType indexed utype, bool indexed added);
  event FeeChanged(FeeType indexed utype, uint24 oldFee, uint24 newFee);
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

  uint24 public constant FEE_MAX = 100000;

  EnumerableSet.AddressSet private managers_;
  EnumerableSet.AddressSet private integrators_;
  EnumerableSet.AddressSet private liquidityProviders_;

  INativeERC20 public nativeToken;
  IRatioToken public cerosToken;
  ILP public lpToken;

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

  mapping(address => FeeAmounts) public managerRewardDebt;

  mapping(address => bool) public excludedFromFee;

  modifier onlyOwnerOrManager() {
    require(
      msg.sender == owner() || managers_.contains(msg.sender),
      "Only owner or manager can call this function"
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

  constructor(
    address _nativeToken,
    address _cerosToken,
    address _lpToken,
    bool _integratorLockEnabled,
    bool _providerLockEnabled
  ) {
    nativeToken = INativeERC20(_nativeToken);
    cerosToken = IRatioToken(_cerosToken);
    lpToken = ILP(_lpToken);
    integratorLockEnabled = _integratorLockEnabled;
    providerLockEnabled = _providerLockEnabled;
  }

  function addLiquidity(uint256 amount0, uint256 amount1) external onlyProvider nonReentrant {
    uint256 ratio = cerosToken.ratio();
    uint256 value = (amount0 * ratio) / 1e18;
    if (amount1 < value) {
      amount0 = (amount1 * 1e18) / ratio;
    } else {
      amount1 = value;
    }
    nativeToken.transferFrom(msg.sender, address(this), amount0);
    cerosToken.transferFrom(msg.sender, address(this), amount1);
    if (nativeTokenAmount == 0 && cerosTokenAmount == 0) {
      require(amount0 > 1e18, "cannot add first time less than 1 token");
      nativeTokenAmount = amount0;
      cerosTokenAmount = amount1;

      lpToken.mint(msg.sender, (2 * amount0) / 10**8);
    } else {
      uint256 allInNative = nativeTokenAmount + (cerosTokenAmount * 1e18) / ratio;
      uint256 mintAmount = (2 * amount0 * lpToken.totalSupply()) / allInNative;
      nativeTokenAmount += amount0;
      cerosTokenAmount += amount1;

      lpToken.mint(msg.sender, mintAmount);
    }
    emit LiquidityChange(msg.sender, amount0, amount1, nativeTokenAmount, cerosTokenAmount, true);
  }

  function removeLiquidity(uint256 lpAmount) external nonReentrant {
    uint256 balance = lpToken.balanceOf(msg.sender);
    if (lpAmount == type(uint256).max) {
      lpAmount = balance;
    } else {
      require(lpAmount <= balance, "you want to remove more than your lp balance");
    }
    uint256 totalSupply = lpToken.totalSupply();
    lpToken.burn(msg.sender, lpAmount);
    uint256 amount0Removed = (lpAmount * nativeTokenAmount) / totalSupply;
    uint256 amount1Removed = (lpAmount * cerosTokenAmount) / totalSupply;

    nativeTokenAmount -= amount0Removed;
    cerosTokenAmount -= amount1Removed;

    nativeToken.transfer(msg.sender, amount0Removed);
    cerosToken.transfer(msg.sender, amount1Removed);
    emit LiquidityChange(
      msg.sender,
      amount0Removed,
      amount1Removed,
      nativeTokenAmount,
      cerosTokenAmount,
      false
    );
  }

  function removeLiquidityPercent(uint256 percent) external nonReentrant {
    require(percent <= 1e18, "percnet should be less than 1e18"); // max percnet(100%) is -> 10 ** 18
    uint256 balance = lpToken.balanceOf(msg.sender);
    uint256 totalSupply = lpToken.totalSupply();
    uint256 removedLp = (balance * percent) / 1e18;
    lpToken.burn(msg.sender, removedLp);
    uint256 amount0Removed = (removedLp * nativeTokenAmount) / totalSupply;
    uint256 amount1Removed = (removedLp * cerosTokenAmount) / totalSupply;

    nativeTokenAmount -= amount0Removed;
    cerosTokenAmount -= amount1Removed;

    nativeToken.transfer(msg.sender, amount0Removed);
    cerosToken.transfer(msg.sender, amount1Removed);
    emit LiquidityChange(
      msg.sender,
      amount0Removed,
      amount1Removed,
      nativeTokenAmount,
      cerosTokenAmount,
      false
    );
  }

  function swap(
    bool nativeToCeros,
    uint256 amountIn,
    address receiver
  ) external onlyIntegrator nonReentrant returns (uint256 amountOut) {
    uint256 ratio = cerosToken.ratio();
    if (nativeToCeros) {
      nativeToken.transferFrom(msg.sender, address(this), amountIn);
      if (!excludedFromFee[msg.sender]) {
        uint256 stakeFeeAmt = (amountIn * stakeFee) / FEE_MAX;
        amountIn -= stakeFeeAmt;
        uint256 managerFeeAmt = (stakeFeeAmt * managerFee) / FEE_MAX;
        uint256 ownerFeeAmt = (stakeFeeAmt * ownerFee) / FEE_MAX;
        uint256 integratorFeeAmt;
        if (integratorLockEnabled) {
          integratorFeeAmt = (stakeFeeAmt * integratorFee) / FEE_MAX;
          if (integratorFeeAmt > 0) {
            nativeToken.transfer(msg.sender, integratorFeeAmt);
          }
        }
        nativeTokenAmount +=
          amountIn +
          (stakeFeeAmt - managerFeeAmt - ownerFeeAmt - integratorFeeAmt);

        ownerFeeCollected.nativeFee += uint128(ownerFeeAmt);
        managerFeeCollected.nativeFee += uint128(managerFeeAmt);
      }
      amountOut = (amountIn * ratio) / 1e18;
      require(cerosTokenAmount >= amountOut, "Not enough liquidity");
      cerosTokenAmount -= amountOut;
      cerosToken.transfer(receiver, amountOut);
      emit Swap(msg.sender, receiver, nativeToCeros, amountIn, amountOut);
    } else {
      cerosToken.transferFrom(msg.sender, address(this), amountIn);
      if (!excludedFromFee[msg.sender]) {
        uint256 unstakeFeeAmt = (amountIn * unstakeFee) / FEE_MAX;
        amountIn -= unstakeFeeAmt;
        uint256 managerFeeAmt = (unstakeFeeAmt * managerFee) / FEE_MAX;
        uint256 ownerFeeAmt = (unstakeFeeAmt * ownerFee) / FEE_MAX;
        uint256 integratorFeeAmt;
        if (integratorLockEnabled) {
          integratorFeeAmt = (unstakeFeeAmt * integratorFee) / FEE_MAX;
          if (integratorFeeAmt > 0) {
            cerosToken.transfer(msg.sender, integratorFeeAmt);
          }
        }
        cerosTokenAmount +=
          amountIn +
          (unstakeFeeAmt - managerFeeAmt - ownerFeeAmt - integratorFeeAmt);

        ownerFeeCollected.stkTokenFee += uint128(ownerFeeAmt);
        managerFeeCollected.stkTokenFee += uint128(managerFeeAmt);
      }
      amountOut = (amountIn * 1e18) / ratio;
      require(nativeTokenAmount >= amountOut, "Not enough liquidity");
      nativeTokenAmount -= amountOut;
      nativeToken.transfer(receiver, amountOut);
      emit Swap(msg.sender, receiver, nativeToCeros, amountIn, amountOut);
    }
  }

  function getAmountOut(
    bool nativeToCeros,
    uint256 amountIn,
    bool isExcludedFromFee
  ) external view returns (uint256 amountOut, bool enoughLiquidity) {
    uint256 ratio = cerosToken.ratio();
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

  function _sendValue(address value, uint256 amount) private {
    // solhint-disable-next-line avoid-low-level-calls
    (bool success, ) = payable(value).call{ value: amount }("");
    require(success, "unable to send value, recipient may have reverted");
  }

  function withdrawOwnerFeeEth(uint128 amount0, uint128 amount1) external onlyOwner {
    if (amount0 > 0) {
      ownerFeeCollected.nativeFee -= amount0;
      nativeToken.withdraw(amount0);
      _sendValue(msg.sender, amount0);
    }
    if (amount1 > 0) {
      ownerFeeCollected.stkTokenFee -= amount1;
      cerosToken.transfer(msg.sender, amount1);
    }
  }

  function withdrawOwnerFee(uint128 amount0, uint128 amount1) external onlyOwner {
    if (amount0 > 0) {
      ownerFeeCollected.nativeFee -= amount0;
      nativeToken.transfer(msg.sender, amount0);
    }
    if (amount1 > 0) {
      ownerFeeCollected.stkTokenFee -= amount1;
      cerosToken.transfer(msg.sender, amount1);
    }
  }

  function withdrawManagerFee() external onlyManager {
    _withdrawManagerFee(msg.sender, false);
  }

  function withdrawManagerFeeEth() external onlyManager {
    _withdrawManagerFee(msg.sender, true);
  }

  function _withdrawManagerFee(address managerAddress, bool useNative) internal {
    FeeAmounts memory feeRewards;
    uint256 managersLength = managers_.length();
    require(managersLength > 0, "No managers");
    FeeAmounts storage currentManagerRewardDebt = managerRewardDebt[managerAddress];
    feeRewards.nativeFee =
      managerFeeCollected.nativeFee /
      uint128(managersLength) -
      currentManagerRewardDebt.nativeFee;
    feeRewards.stkTokenFee =
      managerFeeCollected.stkTokenFee /
      uint128(managersLength) -
      currentManagerRewardDebt.stkTokenFee;
    if (feeRewards.nativeFee > 0) {
      currentManagerRewardDebt.nativeFee += feeRewards.nativeFee;
      if (useNative) {
        nativeToken.withdraw(feeRewards.nativeFee);
        _sendValue(managerAddress, feeRewards.nativeFee);
      } else {
        nativeToken.transfer(managerAddress, feeRewards.nativeFee);
      }
    }
    if (feeRewards.stkTokenFee > 0) {
      currentManagerRewardDebt.stkTokenFee += feeRewards.stkTokenFee;
      cerosToken.transfer(managerAddress, feeRewards.stkTokenFee);
    }
  }

  function setFee(uint24 newFee, FeeType feeType) external onlyOwnerOrManager {
    require(newFee < FEE_MAX, "Unsuported size of fee!");
    if (feeType == FeeType.OWNER) {
      require(msg.sender == owner(), "only owner can call this function");
      emit FeeChanged(feeType, ownerFee, newFee);
      ownerFee = newFee;
    } else if (feeType == FeeType.MANAGER) {
      emit FeeChanged(feeType, managerFee, newFee);
      managerFee = newFee;
    } else if (feeType == FeeType.INTEGRATOR) {
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

  function enableIntegratorLock(bool enable) external onlyOwnerOrManager {
    integratorLockEnabled = enable;
  }

  function enableProviderLock(bool enable) external onlyOwnerOrManager {
    providerLockEnabled = enable;
  }

  function excludeFromFee(address value, bool exclude) external onlyOwnerOrManager {
    excludedFromFee[value] = exclude;
  }

  function add(address value, UserType utype) public returns (bool) {
    bool success = false;
    if (utype == UserType.MANAGER) {
      require(msg.sender == owner(), "Only owner can add manager");
      if (!managers_.contains(value)) {
        uint256 managersLength = managers_.length();
        if (managersLength != 0) {
          managerRewardDebt[value].nativeFee =
            managerFeeCollected.nativeFee /
            uint128(managersLength);
          managerRewardDebt[value].stkTokenFee =
            managerFeeCollected.stkTokenFee /
            uint128(managersLength);
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

  function remove(address value, UserType utype) public returns (bool) {
    bool success = false;
    if (utype == UserType.MANAGER) {
      require(msg.sender == owner(), "Only owner can remove manager");
      if (managers_.contains(value)) {
        _withdrawManagerFee(value, true);
        delete managerRewardDebt[value];
        success = managers_.remove(value);
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

  function contains(address value, UserType utype) external view returns (bool) {
    if (utype == UserType.MANAGER) {
      return managers_.contains(value);
    } else if (utype == UserType.LIQUIDITY_PROVIDER) {
      return liquidityProviders_.contains(value);
    } else {
      return integrators_.contains(value);
    }
  }

  function length(UserType utype) external view returns (uint256) {
    if (utype == UserType.MANAGER) {
      return managers_.length();
    } else if (utype == UserType.LIQUIDITY_PROVIDER) {
      return liquidityProviders_.length();
    } else {
      return integrators_.length();
    }
  }

  function at(uint256 index, UserType utype) external view returns (address) {
    if (utype == UserType.MANAGER) {
      return managers_.at(index);
    } else if (utype == UserType.LIQUIDITY_PROVIDER) {
      return liquidityProviders_.at(index);
    } else {
      return integrators_.at(index);
    }
  }
}
