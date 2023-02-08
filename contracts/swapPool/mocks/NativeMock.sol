pragma solidity ^0.8.6;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

/**
 * @title Matic token contract
 * @notice This contract is an ECR20 like wrapper over native ether (matic token) transfers on the matic chain
 * @dev ERC20 methods have been made payable while keeping their method signature same as other ChildERC20s on Matic
 */
contract NativeMock is ERC20Upgradeable {
    address token;
    uint256 public currentSupply = 0;
    uint8 private constant DECIMALS = 18;
    bool isInitialized;

    // function initialize() public {
    //     // Todo: once BorValidator(@0x1000) contract added uncomment me
    //     // require(msg.sender == address(0x1000));
    //     require(!isInitialized, "The contract is already initialized");
    //     isInitialized = true;
    // }

    function setParent(address) public {
        revert("Disabled feature");
    }

    function withdraw(uint256 amount) public payable {
        address user = msg.sender;
        // input balance
        uint256 input = balanceOf(user);
        // check for amount
        require(amount > 0 && msg.value == amount, "Insufficient amount");

        // withdraw event
        //   emit Withdraw(token, user, amount, input, balanceOf(user));
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
