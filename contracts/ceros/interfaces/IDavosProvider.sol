// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;

interface IDavosProvider {
    /**
     * Events
     */

    event Deposit(address indexed account, uint256 amount);

    event Claim(address indexed recipient, uint256 amount);

    event Withdrawal(
        address indexed owner,
        address indexed recipient,
        uint256 amount
    );

    event ChangeDao(address dao);

    event ChangeCeToken(address ceToken);

    event ChangeCollateralToken(address collateralToken);

    event ChangeProxy(address auctionProxy);

    /**
     * Deposit
     */

    // in MATIC
    function provide(uint256 _amount) external payable returns (uint256);

    // in aMATICc
    // function provideInAMATICc(uint256 amount) external returns (uint256);

    /**
     * Claim
     */

    // claim in aMATICc
    // function claimInAMATICc(address recipient) external returns (uint256);

    /**
     * Withdrawal
     */

    // MATIC
    function release(address recipient, uint256 amount)
    external
    returns (uint256);

    // aMATICc
    // function releaseInAMATICc(address recipient, uint256 amount)
    // external
    // returns (uint256);

    /**
     * DAO FUNCTIONALITY
     */

    function liquidation(address recipient, uint256 amount) external;

    function daoBurn(address account, uint256 value) external;

    function daoMint(address account, uint256 value) external;
}