// SPDX-License-Identifier: GPL-3.0-only
pragma solidity >=0.8.2;

interface IColanderRewards {
    function reflect(address _depositor, uint256 _exitAmount) external;
    function replenish(uint256 _amount) external;
    function cage() external;
}