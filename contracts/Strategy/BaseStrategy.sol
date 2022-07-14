//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "../MasterVault/interfaces/IWETH.sol";

contract BaseStrategy is
OwnableUpgradeable,
PausableUpgradeable,
ReentrancyGuardUpgradeable {

    address private _strategist;
    address private _destination;
    address private _feeRecipient;

    uint256 public performanceFee;
    uint256 MAX_BPS;

    IWETH public underlying;

    bool public depositPaused;

    event UpdatedStrategist(address strategist);
    event UpdatedFeeRecipient(address feeRecipient);
    event UpdatedPerformanceFee(uint256 performanceFee);

    function __BaseStrategy_init(
        address destination,
        address feeRecipient,
        address underlyingToken,
        uint256 performanceFees
    ) internal initializer {
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        _strategist = msg.sender;
        _destination = destination;
        _feeRecipient = feeRecipient;
        underlying = IWETH(underlyingToken);
        performanceFee = performanceFees;
        MAX_BPS = 10000;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyStrategist() {
        require(msg.sender == _strategist);
        _;
    }

    function balanceOfWant() public view returns(uint256) {
        return underlying.balanceOf(address(this));
    }

    function balanceOfPool() public view returns(uint256) {
        return underlying.balanceOf(address(_destination));
    }

    function balanceOf() public view returns(uint256) {
        return underlying.balanceOf(address(this)) + underlying.balanceOf(address(_destination));
    }

    function pause() external onlyStrategist {
        depositPaused = true;
    }

    function unpause() external onlyStrategist {
        depositPaused = false;
    }

    function setStrategist(address newStrategist) external onlyOwner {
        require(newStrategist != address(0));
        _strategist = newStrategist;
        emit UpdatedStrategist(newStrategist);
    }
    
    function setFeeRecipient(address newFeeRecipient) external onlyOwner {
        require(newFeeRecipient != address(0));
        _feeRecipient = newFeeRecipient;
        emit UpdatedFeeRecipient(newFeeRecipient);
    }

    function setPerformanceFee(uint256 newPerformanceFee) external onlyOwner {
        require(newPerformanceFee < MAX_BPS);
        performanceFee = newPerformanceFee;
        emit UpdatedPerformanceFee(newPerformanceFee);
    }
}