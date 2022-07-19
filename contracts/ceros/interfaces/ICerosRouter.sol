// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;

interface ICerosRouter {
    /**
     * Events
     */

    event Deposit(
        address indexed account,
        address indexed token,
        uint256 amount,
        uint256 profit
    );

    event Claim(
        address indexed recipient,
        address indexed token,
        uint256 amount
    );

    event Withdrawal(
        address indexed owner,
        address indexed recipient,
        address indexed token,
        uint256 amount
    );

    event ChangeVault(address vault);

    event ChangeDex(address dex);

    event ChangeDexFactory(address factory);

    // event ChangePool(address pool);

    event ChangeDao(address dao);

    event ChangeCeToken(address ceToken);

    event ChangeCeTokenJoin(address ceTokenJoin);

    event ChangeCertToken(address certToken);

    event ChangeCollateralToken(address collateralToken);

    event ChangeProvider(address provider);

    event ChangePairFee(uint24 fee);

    /**
     * Methods
     */

    /**
     * Deposit
     */

    // in MATIC
    function deposit() external payable returns (uint256);

    function depositWMatic(uint256 amount) external returns (uint256);

    // in aMATICc
    function depositAMATICcFrom(address owner, uint256 amount)
    external
    returns (uint256);

    function depositAMATICc(uint256 amount) external returns (uint256);

    /**
     * Claim
     */

    // claim in aMATICc
    function claim(address recipient) external returns (uint256);

    function claimProfit(address recipient) external;

    function getProfitFor(address account) external view returns (uint256);

    /**
     * Withdrawal
     */

    // // MATIC
    // function withdraw(address recipient, uint256 amount)
    // external
    // returns (uint256);

    // MATIC
    // function withdrawFor(address recipient, uint256 amount)
    // external
    // returns (uint256);

    // MATIC
    function withdrawWithSlippage(
        address recipient,
        uint256 amount,
        uint256 slippage
    ) external returns (uint256);

    // aMATICc
    function withdrawAMATICc(address recipient, uint256 amount)
    external
    returns (uint256);
}