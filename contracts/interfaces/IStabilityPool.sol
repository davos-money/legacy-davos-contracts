// SPDX-License-Identifier: GPL-3.0-only
pragma solidity >=0.8.2;

interface IStabilityPool {
    
    error Unauthorized(address _caller);
    error NotLive(address _contract);
    error InsufficientSurplus(uint256 _surplus);
    error InvalidAuction();
    error BufZone();
    error AbsurdPrice();
    error SinZone();
    error AbsurdThreshold();
    error InactiveZone();
    error InvalidPrice();
    error ZeroSpread();

    function totalSupply() external view returns(uint256);
    function balanceOf(address _depositor) external view returns(uint256);
}