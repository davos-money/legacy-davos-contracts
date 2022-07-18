// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./interfaces/IMasterVault.sol";

contract WaitingPool is Initializable {

    IMasterVault public masterVault;

    struct Person {
        address _address;
        uint256 _debt;
    }

    Person[] public people;
    uint256 public index;
    uint256 public totalDebt;

    modifier onlyMasterVault() {
        require(msg.sender == address(masterVault));
        _;
    }

    function initialize(address _masterVault) external {
        masterVault = IMasterVault(_masterVault);
    }

    function addToQueue(address _person, uint256 _debt) external onlyMasterVault {
        if(_debt != 0) {
            Person memory p = Person({
                _address: _person, 
                _debt: _debt
            });
            totalDebt += _debt;
            people.push(p);
        }
    }

    function tryRemove() external onlyMasterVault {
        uint256 balance;
        for(uint256 i = index; i < people.length; i++) {
            balance = address(this).balance;
            if(balance >= people[index]._debt && people[index]._debt != 0) {
                uint256 amount = _assessFee(people[index]._debt, masterVault.withdrawalFee());
                totalDebt -= people[index]._debt;
                // we can get stuck if caller is a contract that doesn't accept matic
                payable(people[index]._address).transfer(amount);
                index++;
            }
        }
    }
    
    receive() external payable {

    }

    function _assessFee(uint256 amount, uint256 fees) internal returns(uint256 value) {
        if(fees > 0) {
            uint256 fee = (amount * fees) / 1e6;
            value = amount - fee;
            payable(masterVault.feeReceiver()).transfer(fee);
        } else {
            return amount;
        }
    }

    function getPoolBalance() public view returns(uint256) {
        return address(this).balance;
    }
}