// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TipJar
 * @notice Tipping / creator payments - the lightweight sibling of PaymentLinks.
 * The deployed creator is the sole recipient. No custody, no splits, no refunds.
 */
contract TipJar {
    using SafeERC20 for IERC20;

    address public immutable creator;

    event Tip(address indexed from, address indexed creator, uint256 amount, address token, string message);

    constructor() {
        creator = msg.sender;
    }

    /// @notice Send a native BDAG tip with an optional public message.
    function tip(string calldata message) external payable {
        require(msg.value > 0, "tip must be > 0");
        (bool ok, ) = creator.call{value: msg.value}("");
        require(ok, "BDAG transfer failed");
        emit Tip(msg.sender, creator, msg.value, address(0), message);
    }

    /// @notice Send an ERC20 / stablecoin tip. Tipper must pre-approve this contract.
    function tipToken(address token, uint256 amount, string calldata message) external {
        require(amount > 0, "tip must be > 0");
        IERC20(token).safeTransferFrom(msg.sender, creator, amount);
        emit Tip(msg.sender, creator, amount, token, message);
    }
}
