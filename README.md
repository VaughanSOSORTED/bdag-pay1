# BDAG Pay — Payment Links & Merchant Checkout for BlockDAG

Venmo/Stripe-style payments for the BlockDAG network (EVM-compatible): a merchant
creates a payment link, shares it (or a QR code), gets paid in BDAG or a stablecoin,
and the chain itself holds the receipt.

**Status: example code for testing and iteration — not audited. Do not use with real
funds on mainnet without a professional audit.**

## Why this

New chains lack the boring infrastructure, and payments are the most basic demand.
This kit ships the two lightest variants:

| Contract | What it does | Analogy |
|---|---|---|
| `PaymentLinks` | Single-use links for a fixed amount, native BDAG or any ERC20/stablecoin. `Paid` event = onchain receipt. | Venmo request / Stripe checkout link |
| `TipJar` | One-click tips to a creator with a public message. | Ko-fi / Twitch tips |

Design choices that keep it safe and simple:

- **Zero custody.** Funds transfer straight from payer to merchant in the same
  transaction. No withdraw function, no treasury to drain.
- **Single-use, exact-amount links.** No partial payments, no refunds, no
  reentrancy surface worth attacking.
- **Receipts as events.** `LinkCreated` / `Paid` are enough for the payer's wallet,
  the merchant's dashboard and the block explorer to reconstruct everything.

## BlockDAG network details

Verify against the official docs before deploying: https://docs.blockdagnetwork.io

| Network | Chain ID | RPC | Explorer | Symbol |
|---|---|---|---|---|
| Mainnet | 1404 | https://rpc.welshdag.trade (community) | https://explorer.welshdag.co.uk (community) | BDAG |
| Testnet (Awakening) | 1043 | confirm via docs/chainlist | https://awakening.bdagscan.com | BDAG |

Add testnet to MetaMask: Custom RPC, Chain ID `1043`, symbol `BDAG`. Since BlockDAG
is EVM-compatible, MetaMask, Truffle, Hardhat, Foundry and Remix all work as-is.

## Quick start

```bash
npm install
npx hardhat compile
npx hardhat test          # 6 tests: links, native + ERC20 checkout, tips
npm run deploy:local      # local network, mints a mock tUSDC and creates a demo link
```

## Deploy to BlockDAG testnet

```bash
cp .env.example .env      # add your testnet RPC URL and a throwaway private key
npm run deploy:testnet
```

Use a fresh key with testnet funds only. Record the printed addresses.

## Payment flow

```
Merchant                     Payer
   |                           |
   | createLink(10 BDAG,       |
   |  "Invoice #1042")        |
   |--> link id 1 ----> share link / QR
   |                           |
   |                           |  pay(1) with 10 BDAG
   |<---------- BDAG ----------|
   |      Paid(...) event = receipt
```

For a stablecoin link, create with the token address instead of `address(0)` and
the payer calls `payToken(id)` after a normal ERC20 approve.

## Checkout dashboard

`dashboard/index.html` is a standalone demo of the merchant + payer experience:
create links, see the QR/checkout view, and get a receipt. Open it directly in a
browser — it runs the same contract logic in simulation mode, and its config
block lets you point it at deployed addresses when you wire up a real frontend
(ethers.js + MetaMask connect).

## What this is not

- Not an audited product. Treat it as a starting point.
- No refunds/disputes, partial payments, subscriptions or recurring billing yet —
  all natural next steps, each adding custody or trust decisions.
- Gasless onboarding (EIP-4337 account abstraction) is on BlockDAG's roadmap;
  when it ships, the payer side can become a sponsored smart-wallet flow.

## License

MIT
