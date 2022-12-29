//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "./IBaseStrategy.sol";

abstract contract BaseStrategy is
IBaseStrategy,
OwnableUpgradeable,
PausableUpgradeable,
ReentrancyGuardUpgradeable {

    using SafeERC20Upgradeable for IERC20Upgradeable;

    address public strategist;
    address public destination;
    address public feeRecipient;

    IERC20Upgradeable public underlying;

    bool public depositPaused;

    event UpdatedStrategist(address strategist);
    event UpdatedFeeRecipient(address feeRecipient);
    event UpdatedPerformanceFee(uint256 performanceFee);

    function __BaseStrategy_init(
        address destinationAddr,
        address feeRecipientAddr,
        address underlyingToken
    ) internal onlyInitializing {
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        strategist = msg.sender;
        destination = destinationAddr;
        feeRecipient = feeRecipientAddr;
        underlying = IERC20Upgradeable(underlyingToken);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyStrategist() {
        require(msg.sender == strategist);
        _;
    }

    function _beforeDeposit(uint256 amount) internal virtual returns (bool) {
    }

    function balanceOfWant() public view returns(uint256) {
        return underlying.balanceOf(address(this));
    }

    function balanceOfPool() public view returns(uint256) {
        return underlying.balanceOf(address(destination));
    }

    function balanceOf() public view returns(uint256) {
        return underlying.balanceOf(address(this)) + underlying.balanceOf(address(destination));
    }

    function pause() external onlyStrategist {
        depositPaused = true;
    }

    function unpause() external onlyStrategist {
        depositPaused = false;
    }

    function setStrategist(address newStrategist) external onlyOwner {
        require(newStrategist != address(0));
        strategist = newStrategist;
        emit UpdatedStrategist(newStrategist);
    }
    
    function setFeeRecipient(address newFeeRecipient) external onlyOwner {
        require(newFeeRecipient != address(0));
        feeRecipient = newFeeRecipient;
        emit UpdatedFeeRecipient(newFeeRecipient);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[45] private __gap;

}
