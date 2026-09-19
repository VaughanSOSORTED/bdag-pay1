// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PaymentLinks
 * @notice Venmo / Stripe-style payment links for BlockDAG (EVM-compatible).
 *
 * Flow:
 *   1. Merchant calls createLink(...) and gets an id. The id becomes the
 *      checkout link / QR code (e.g. https://pay.example/checkout/3).
 *   2. Payer opens the link, wallet shows the amount + memo, calls pay(id)
 *      with native BDAG, or payToken(id) for a stablecoin link.
 *   3. Funds go straight to the merchant (no custody), and the Paid event
 *      is the onchain receipt.
 *
 * A link is single-use and expects an exact amount. Zero custody keeps the
 * regulatory and security footprint minimal.
 */
contract PaymentLinks {
    using SafeERC20 for IERC20;

    struct Link {
        address payee;   // merchant / creator receiving funds
        uint256 amount;  // exact amount expected (native = 18 decimals)
        address token;   // ERC20 token; address(0) means native BDAG
        string memo;    // shown at checkout and on the receipt
        bool paid;
        address payer;
        uint256 paidAt;
    }

    uint256 public nextId = 1;
    mapping(uint256 => Link) public links;

    event LinkCreated(uint256 indexed id, address indexed payee, uint256 amount, address token, string memo);
    event Paid(uint256 indexed id, address indexed payer, address indexed payee, uint256 amount, address token, string memo, uint256 paidAt);

    /**
     * @notice Create a payment link. Use token = address(0) for native BDAG.
     */
    function createLink(uint256 amount, address token, string calldata memo) external returns (uint256 id) {
        require(amount > 0, "amount must be > 0");
        id = nextId++;
        links[id] = Link({
            payee: msg.sender,
            amount: amount,
            token: token,
            memo: memo,
            paid: false,
            payer: address(0),
            paidAt: 0
        });
        emit LinkCreated(id, msg.sender, amount, token, memo);
    }

    /**
     * @notice Pay a native-BDAG link with the exact amount.
     */
    function pay(uint256 id) external payable {
        Link storage l = links[id];
        require(l.payee != address(0), "link does not exist");
        require(!l.paid, "link already paid");
        require(l.token == address(0), "link is ERC20, use payToken");
        require(msg.value == l.amount, "wrong amount");

        l.paid = true;
        l.payer = msg.sender;
        l.paidAt = block.timestamp;

        (bool ok, ) = l.payee.call{value: msg.value}("");
        require(ok, "BDAG transfer failed");

        emit Paid(id, msg.sender, l.payee, l.amount, address(0), l.memo, l.paidAt);
    }

    /**
     * @notice Pay a stablecoin / ERC20 link. Payer must pre-approve this contract.
     */
    function payToken(uint256 id) external {
        Link storage l = links[id];
        require(l.payee != address(0), "link does not exist");
        require(!l.paid, "link already paid");
        require(l.token != address(0), "link is native BDAG, use pay");

        l.paid = true;
        l.payer = msg.sender;
        l.paidAt = block.timestamp;

        IERC20(l.token).safeTransferFrom(msg.sender, l.payee, l.amount);

        emit Paid(id, msg.sender, l.payee, l.amount, l.token, l.memo, l.paidAt);
    }

    function getLink(uint256 id) external view returns (Link memory) {
        return links[id];
    }
}
