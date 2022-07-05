// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "../ceros/interfaces/ICerosRouter.sol";
import "../ceros/interfaces/ISikkaProvider.sol";
import "../ceros/interfaces/ICertToken.sol";
import "../ceros/interfaces/IDao.sol";
import "./ERC4626Upgradeable.sol";
import "./interfaces/IWETH.sol";
import "./interfaces/IMasterVault.sol";
import "./interfaces/IPriceGetter.sol";

contract MasterVault is
IMasterVault,
ERC4626Upgradeable,
OwnableUpgradeable,
PausableUpgradeable,
ReentrancyGuardUpgradeable
{

    /**
     * Variables
     */
    uint256 private _depositFee;
    uint256 private _maxDepositFee;
    uint256 private _withdrawalFee;
    uint256 private _maxWithdrawalFee;
    
    // Tokens
    ICertToken private _certToken;
    
    address private _provider;
    address private _priceGetter;
    ICerosRouter private _ceRouter;
    IDao private _dao;

    mapping(address => bool) private _manager;

    /**
     * Modifiers
     */
    modifier onlyProvider() {
        require(
            msg.sender == owner() || msg.sender == _provider,
            "Provider: not allowed"
        );
        _;
    }
    modifier onlyManager() {
        require(
            _manager[msg.sender],
            "Provider: not allowed"
        );
        _;
    }

    function initialize(
        string memory name,
        string memory symbol,
        address certToken,
        address ceRouter,
        address priceGetter,
        // address daoAddress,
        uint256 maxDepositFee,
        uint256 maxWithdrawalFee,
        IERC20MetadataUpgradeable asset
    ) public initializer {
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __ERC20_init(name, symbol);
        __ERC4626_init(asset);
        _manager[msg.sender] = true;
        _certToken = ICertToken(certToken);
        _ceRouter = ICerosRouter(ceRouter);
        _priceGetter = priceGetter;
        // _dao = IDao(daoAddress);
        _maxDepositFee = maxDepositFee;
        _maxWithdrawalFee = maxWithdrawalFee;
        // approve(daoAddress, type(uint256).max);
        approve(address(_ceRouter), type(uint256).max);
    }

    function depositETH() public 
    payable
    override
    nonReentrant
    whenNotPaused 
    onlyProvider 
    returns (uint256) {
        // maxAmount check
        uint256 amount = msg.value;
        uint256 shares = previewDeposit(amount);
        IWETH(asset()).deposit{value: amount}();
        _deposit(address(this), msg.sender, amount, shares);

        // for now deposit funds to ceros Router or just hold the wMatic in this contract
        // if (ifTradable(amount)) {
        //     IWETH(asset()).transfer(address(_ceRouter), amount);
        //     _ceRouter.depositWMatic(amount);
        // }
        return shares;
    }

    function withdrawETH(address account, uint256 amount) 
    external
    override
    nonReentrant 
    whenNotPaused
    onlyProvider 
    returns (uint256 shares) {

        // // _withdraw(address caller, address receiver, address owner, uint256 assets, uint256 shares)
        // _withdraw(msg.sender, address(this), msg.sender, amount, shares);
        
        // if(IERC20(asset()).balanceOf(address(this)) <= amount) {
        //     amount = _ceRouter.withdrawWithSlippage(address(this), amount, 0);
        //     IWETH(asset()).deposit{value: amount}();
        // }
        shares = previewWithdraw(amount);
        _burn(msg.sender, shares);
        IWETH(asset()).withdraw(shares);
        payable(account).transfer(amount);
        // maxAmount check

        // _ceRouter.withdrawWithSlippage(account, amount, 0);
    }

    // receive() external payable {
    //     if (msg.sender != address(token)) {
    //         depositETH();
    //     }
    // }

    function ifTradable(uint amountIn) public view returns (bool) {
        uint256 amountOut = IPriceGetter(_priceGetter).getPrice(
            asset(),
            address(_certToken),
            amountIn,
            0,
            3000
        );
        return amountOut > (amountIn * _certToken.ratio()) / 1e18;
    }

    function setDepositFee(uint256 newDepositFee) external onlyOwner {
        _depositFee = newDepositFee;
        emit DepositFeeChanged(newDepositFee);
    }

    function setMaxDepositFee(uint256 newMaxDepositFee) external onlyOwner {
        _maxDepositFee = newMaxDepositFee;
        emit MaxDepositFeeChanged(newMaxDepositFee);
    }

    function setWithdrawalFee(uint256 newWithdrawalFee) external onlyOwner {
        _withdrawalFee = newWithdrawalFee;
        emit WithdrawalFeeChanged(newWithdrawalFee);
    }

    function setMaxWithdrawalFee(uint256 newMaxWithdrawalFee) external onlyOwner {
        _maxWithdrawalFee = newMaxWithdrawalFee;
        emit MaxWithdrawalFeeChanged(newMaxWithdrawalFee);
    }

    function changeProvider(address provider) external onlyOwner {
        _provider = provider;
        emit ProviderChanged(provider);
    }

    function changeCeRouter(address router) external onlyOwner {
        _ceRouter = ICerosRouter(router);
        emit RouterChanged(router);
    }

    function changePriceGetter(address priceGetter) external onlyOwner {
        _priceGetter = priceGetter;
        // emit PriceGetterChanged(priceGetter);
    }

    receive() external payable {

    }
}