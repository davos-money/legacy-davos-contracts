// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.6;
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IVault.sol";
import "./interfaces/ISwapRouter.sol";
import "./interfaces/ICerosRouter.sol";
// import "./interfaces/IMaticPool.sol";
import "./interfaces/ICertToken.sol";

contract CerosRouter is
ICerosRouter,
OwnableUpgradeable,
PausableUpgradeable,
ReentrancyGuardUpgradeable
{
    /**
     * Variables
     */
    IVault private _vault;
    ISwapRouter private _dex;
    // IMaticPool private _pool; // default (BinancePool)
    // Tokens
    ICertToken private _certToken; // (default aMATICc)
    address private _wMaticAddress;
    IERC20 private _ceToken; // (default ceAMATICc)
    mapping(address => uint256) private _profits;
    address private _provider;
    uint24 private _pairFee;
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
    function initialize(
        address certToken,
        address wMaticToken,
        address ceToken,
        // address bondToken,
        address vault,
        address dexAddress,
        // address pool,
        uint24 pairFee
    ) public initializer {
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        _certToken = ICertToken(certToken);
        _wMaticAddress = wMaticToken;
        _ceToken = IERC20(ceToken);
        _vault = IVault(vault);
        _dex = ISwapRouter(dexAddress);
        _pairFee = pairFee;
        // _pool = IMaticPool(pool);
        IERC20(wMaticToken).approve(dexAddress, type(uint256).max);
        IERC20(certToken).approve(dexAddress, type(uint256).max);
        // IERC20(certToken).approve(bondToken, type(uint256).max);
        // IERC20(certToken).approve(pool, type(uint256).max);
        IERC20(certToken).approve(vault, type(uint256).max);
    }
    /**
     * DEPOSIT
     */
    function deposit()
    external
    payable
    override
    nonReentrant
    returns (uint256 value)
    {
        uint256 amount = msg.value;
        uint256 realAmount = swapETHForTokens(amount, 0);
        uint256 minAmount = (amount * _certToken.ratio()) / 1e18;
        
        require(realAmount > minAmount, "price too small");

        require(
            _certToken.balanceOf(address(this)) >= realAmount,
            "insufficient amount of CerosRouter in cert token"
        );
        uint256 profit = realAmount - minAmount;
        // add profit
        _profits[msg.sender] += profit;

        value = _vault.depositFor(msg.sender, realAmount - profit);
        emit Deposit(msg.sender, _wMaticAddress, realAmount - profit, profit);
        return value;
    }
    function depositAMATICcFrom(address owner, uint256 amount)
    external
    override
    onlyProvider
    nonReentrant
    returns (uint256 value)
    {
        _certToken.transferFrom(owner, address(this), amount);
        value = _vault.depositFor(msg.sender, amount);
        emit Deposit(msg.sender, address(_certToken), amount, 0);
        return value;
    }
    function depositAMATICc(uint256 amount)
    external
    override
    nonReentrant
    returns (uint256 value)
    {
        _certToken.transferFrom(msg.sender, address(this), amount);
        value = _vault.depositFor(msg.sender, amount);
        emit Deposit(msg.sender, address(_certToken), amount, 0);
        return value;
    }
    /**
     * CLAIM
     */
    // claim yields in aMATICc
    function claim(address recipient)
    external
    override
    nonReentrant
    returns (uint256 yields)
    {
        yields = _vault.claimYieldsFor(msg.sender, recipient);
        emit Claim(recipient, address(_certToken), yields);
        return yields;
    }
    // claim profit in aMATICc
    function claimProfit(address recipient) external nonReentrant {
        uint256 profit = _profits[msg.sender];
        require(profit > 0, "has not got a profit");
        // let's check balance of CeRouter in aMATICc
        require(
            _certToken.balanceOf(address(this)) >= profit,
            "insufficient amount"
        );
        _certToken.transfer(recipient, profit);
        _profits[msg.sender] -= profit;
        emit Claim(recipient, address(_certToken), profit);
    }
    // /**
    //  * WITHDRAWAL
    //  */
    // // withdrawal in MATIC via staking pool
    // /// @param recipient address to receive withdrawan MATIC
    // /// @param amount in MATIC to withdraw from vault
    // function withdraw(address recipient, uint256 amount)
    // external
    // override
    // nonReentrant
    // returns (uint256 realAmount)
    // {
    //     require(
    //         amount >= _pool.getMinimumStake(),
    //         "value must be greater than min unstake amount"
    //     );
    //     realAmount = _vault.withdrawFor(msg.sender, address(this), amount);
    //     _pool.unstakeCertsFor(recipient, realAmount);
    //     emit Withdrawal(msg.sender, recipient, _wMaticAddress, amount);
    //     return realAmount;
    // }
    // withdrawal aMATICc
    /// @param recipient address to receive withdrawan aMATICc
    /// @param amount in MATIC
    function withdrawAMATICc(address recipient, uint256 amount)
    external
    override
    nonReentrant
    returns (uint256 realAmount)
    {
        realAmount = _vault.withdrawFor(msg.sender, recipient, amount);
        emit Withdrawal(msg.sender, recipient, address(_certToken), realAmount);
        return realAmount;
    }
    // function withdrawFor(address recipient, uint256 amount)
    // external
    // override
    // nonReentrant
    // onlyProvider
    // returns (uint256 realAmount)
    // {
    //     realAmount = _vault.withdrawFor(msg.sender, address(this), amount);
    //     // _pool.unstakeCertsFor(recipient, realAmount); // realAmount -> MATIC
    //     emit Withdrawal(msg.sender, recipient, _wMaticAddress, realAmount);
    //     return realAmount;
    // }
    // withdrawal in MATIC via DEX
    function withdrawWithSlippage(
        address recipient,
        uint256 amount,
        uint256 outAmount
    ) external override nonReentrant returns (uint256 realAmount) {
        realAmount = _vault.withdrawFor(msg.sender, address(this), amount);
        uint amountOut = swapExactTokensForETH(recipient, realAmount, outAmount);
        require(amountOut > (amount * 1e18 / _certToken.ratio()), "price too small");
        emit Withdrawal(msg.sender, recipient, _wMaticAddress, amountOut);
        return amountOut;
    }
    function swapETHForTokens(uint256 amountIn, uint256 amountOutMinimum) private returns (uint256 amountOut) {
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams(
             _wMaticAddress,                    // tokenIn
            address(_certToken),                // tokenOut
            _pairFee,                           // fee
            address(this),                      // recipient
            block.timestamp + 300,              // deadline
            amountIn,                           // amountIn
            amountOutMinimum,                   // amountOutMinimum
            0                                   // sqrtPriceLimitX96
        );
        amountOut = _dex.exactInputSingle{ value: amountIn }(params);
    }
    function swapExactTokensForETH(
        address recipient,
        uint256 realAmount,
        uint256 outAmount
    ) private returns(uint256 amountOut) {
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams(
            address(_certToken),                // tokenIn
            _wMaticAddress,                     // tokenOut
            _pairFee,                           // fee
            address(0),                         // recipient
            block.timestamp + 300,              // deadline
            realAmount,                         // amountIn
            outAmount,                          // amountOutMinimum
            0                                   // sqrtPriceLimitX96
        );
        amountOut = _dex.exactInputSingle(params);
        _dex.unwrapWETH9(outAmount, recipient);
    }
    function getProfitFor(address account) external view returns (uint256) {
        return _profits[account];
    }
    // function getPendingWithdrawalOf(address account)
    // external
    // view
    // returns (uint256)
    // {
    //     return _pool.pendingUnstakesOf(account);
    // }
    function changeVault(address vault) external onlyOwner {
        // update allowances
        _certToken.approve(address(_vault), 0);
        _vault = IVault(vault);
        _certToken.approve(address(_vault), type(uint256).max);
        emit ChangeVault(vault);
    }
    function changeDex(address dex) external onlyOwner {
        IERC20(_wMaticAddress).approve(address(_dex), 0);
        _certToken.approve(address(_dex), 0);
        _dex = ISwapRouter(dex);
        // update allowances
        IERC20(_wMaticAddress).approve(address(_dex), type(uint256).max);
        _certToken.approve(address(_dex), type(uint256).max);
        emit ChangeDex(dex);
    }
    // function changePool(address pool) external onlyOwner {
    //     // update allowances
    //     _certToken.approve(address(_pool), 0);
    //     _pool = IMaticPool(pool);
    //     _certToken.approve(address(_pool), type(uint256).max);
    //     emit ChangePool(pool);
    // }
    function changeProvider(address provider) external onlyOwner {
        _provider = provider;
        emit ChangeProvider(provider);
    }
    function changePairFee(uint24 fee) external onlyOwner {
        _pairFee = fee;
        emit ChangePairFee(fee);
    }
}
