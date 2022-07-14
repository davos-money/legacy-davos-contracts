// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.6;
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IVault.sol";
import "./interfaces/IDex.sol";
import "./interfaces/IDao.sol";
import "./interfaces/ICerosRouter.sol";
import "./interfaces/ISikkaProvider.sol";
import "./interfaces/ICertToken.sol";
import "../MasterVault/interfaces/IMasterVault.sol";

contract SikkaProvider is
ISikkaProvider,
OwnableUpgradeable,
PausableUpgradeable,
ReentrancyGuardUpgradeable
{
    /**
     * Variables
     */
    address private _operator;
    // Tokens
    // address private _certToken;
    address private _ceToken;
    ICertToken private _collateralToken; // (default sMATIC)
    IMasterVault private _masterVault;
    IDao private _dao;
    address private _proxy;
    /**
     * Modifiers
     */
    modifier onlyOperator() {
        require(
            msg.sender == owner() || msg.sender == _operator,
            "Operator: not allowed"
        );
        _;
    }
    modifier onlyProxy() {
        require(
            msg.sender == owner() || msg.sender == _proxy,
            "AuctionProxy: not allowed"
        );
        _;
    }
    function initialize(
        address collateralToken,
        // address certToken,
        address masterVault,
        address daoAddress
    ) public initializer {
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        _operator = msg.sender;
        _collateralToken = ICertToken(collateralToken);
        // _certToken = certToken;
        _ceToken = masterVault;
        _masterVault = IMasterVault(masterVault);
        _dao = IDao(daoAddress);
        // _pool = IMaticPool(pool);
        IERC20(masterVault).approve(masterVault, type(uint256).max);
        IERC20(_ceToken).approve(daoAddress, type(uint256).max);
    }
    /**
     * DEPOSIT
     */
    function provide()
    external
    payable
    override
    whenNotPaused
    nonReentrant
    returns (uint256 value)
    {
        value = _masterVault.depositETH{value: msg.value}();
        // deposit ceToken as collateral
        _provideCollateral(msg.sender, value);
        emit Deposit(msg.sender, value);
        return value;
    }
    // function provideInAMATICc(uint256 amount)
    // external
    // override
    // nonReentrant
    // returns (uint256 value)
    // {
    //     value = _masterVault.depositAMATICcFrom(msg.sender, amount);
    //     // deposit ceToken as collateral
    //     _provideCollateral(msg.sender, value);
    //     emit Deposit(msg.sender, value);
    //     return value;
    // }
    /**
     * CLAIM
     */
    // claim in aMATICc
    // function claimInAMATICc(address recipient)
    // external
    // override
    // nonReentrant
    // onlyOperator
    // returns (uint256 yields)
    // {
    //     yields = _masterVault.claim(recipient);
    //     emit Claim(recipient, yields);
    //     return yields;
    // }
    /**
     * RELEASE
     */
    // withdrawal in MATIC via staking pool
    function release(address recipient, uint256 amount)
    external
    override
    whenNotPaused
    nonReentrant
    returns (uint256 realAmount)
    {
        _withdrawCollateral(msg.sender, amount);
        realAmount = _masterVault.withdrawETH(recipient, amount);
        emit Withdrawal(msg.sender, recipient, amount);
        return realAmount;
    }
    // function releaseInAMATICc(address recipient, uint256 amount)
    // external
    // override
    // nonReentrant
    // returns (uint256 value)
    // {
    //     _withdrawCollateral(msg.sender, amount);
    //     value = _masterVault.withdrawAMATICc(recipient, amount);
    //     emit Withdrawal(msg.sender, recipient, value);
    //     return value;
    // }
    /**
     * DAO FUNCTIONALITY
     */
    function liquidation(address recipient, uint256 amount)
    external
    override
    onlyProxy
    nonReentrant
    {
        _masterVault.withdrawETH(recipient, amount);
    }
    function daoBurn(address account, uint256 value)
    external
    override
    onlyProxy
    nonReentrant
    {
        _collateralToken.burn(account, value);
    }
    function daoMint(address account, uint256 value)
    external
    override
    onlyProxy
    nonReentrant
    {
        _collateralToken.mint(account, value);
    }
    function _provideCollateral(address account, uint256 amount) internal {
        _dao.deposit(account, address(_ceToken), amount);
        _collateralToken.mint(account, amount);
    }
    function _withdrawCollateral(address account, uint256 amount) internal {
        _dao.withdraw(account, address(_ceToken), amount);
        _collateralToken.burn(account, amount);
    }
    /**
     * PAUSABLE FUNCTIONALITY
     */
    function pause() external onlyOwner {
        _pause();
    }
    function unPause() external onlyOwner {
        _unpause();
    }
    /**
     * UPDATING FUNCTIONALITY
     */
    function changeDao(address dao) external onlyOwner {
        IERC20(_ceToken).approve(address(_dao), 0);
        _dao = IDao(dao);
        IERC20(_ceToken).approve(address(_dao), type(uint256).max);
        emit ChangeDao(dao);
    }
    function changeCeToken(address ceToken) external onlyOwner {
        IERC20(_ceToken).approve(address(_dao), 0);
        _ceToken = ceToken;
        IERC20(_ceToken).approve(address(_dao), type(uint256).max);
        emit ChangeCeToken(ceToken);
    }
    function changeProxy(address auctionProxy) external onlyOwner {
        _proxy = auctionProxy;
        emit ChangeProxy(auctionProxy);
    }
    function changeCollateralToken(address collateralToken) external onlyOwner {
        _collateralToken = ICertToken(collateralToken);
        emit ChangeCollateralToken(collateralToken);
    }
}
