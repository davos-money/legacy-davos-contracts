// SPDX-License-Identifier: GPL-3.0-only
pragma solidity >=0.8.2;
interface IStabilityPool {
    
    // --- Errors ---
    error Unauthorized(address _caller);
    error NotLive(address _contract);
    error InFlashDelay();
    error InsufficientSurplus(uint256 _surplus);
    error InvalidAuction();
    error BufZone();
    error AbsurdPrice();
    error SinZone();
    error AbsurdThreshold();
    error InactiveZone();
    error InvalidPrice();
    error ZeroSpread();
    // --- Events ---
    event Initialize(address indexed _initializer);
    event ProfitRange(address indexed _caller, uint256 _value);
    event PriceImpact(address indexed _caller, uint256 _value);
    event Rewards(address _contract);
    event Join(address indexed _depositor, uint256 indexed _oldBalance, uint256 indexed _newBalance);
    event Exit(address indexed _depositor, uint256 indexed _oldBalance, uint256 indexed _newBalance);
    event FlashDelay(uint _flashDelay);
    event Surge(uint256 indexed _collateralAmount, uint256 indexed _expectedStableCoins, uint256 indexed _receivedStableCoins);
    event Distribute(address indexed _caller, uint256 indexed _amount);
    event Cage();
    // --- Functions ---
    function totalSupply() external view returns(uint256);
    function balanceOf(address _depositor) external view returns(uint256);
}