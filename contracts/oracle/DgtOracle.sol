// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "../interfaces/PipLike.sol";

contract DgtOracle is PipLike, OwnableUpgradeable  {

    event PriceChanged(uint256 newPrice);

    address private _owner;
    uint256 private price;

    // --- Init ---
    function initialize(uint256 initialPrice) public initializer {
        __Ownable_init();

        price = initialPrice;
    }

    /**
     * Returns the latest price
     */
    function peek() public view returns (bytes32, bool) {
        return (bytes32(price), true);
    }

    function changePriceToken(uint256 price_) external {
        require(msg.sender == _owner, "DgtOracle/forbidden");
        price = price_;
        emit PriceChanged(price);
    }
}