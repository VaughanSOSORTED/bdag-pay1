# Improve & deploy BDAG Pay (guide for AI + humans)

This repo is a solid **starter kit** (Hardhat + `PaymentLinks` / `TipJar` + static dashboard). Use this doc to harden it for **BlockDAG community mainnet (chain 1404)** and a simple public demo — without putting private keys on a server.

**Status reminder:** example code, not audited. Do not put real funds at risk without a professional audit.

---

## Goals

1. Point all **mainnet** tooling at **community RPCs** (correct fork).
2. Make **mainnet deploy** safe (no mock `TestUSDC` on mainnet).
3. Persist deploy addresses and wire the **dashboard** + MetaMask to them.
4. Optionally host the dashboard as **static files** on a DigitalOcean droplet.

---

## Critical: community RPC vs bdagscan

### Never use for mainnet (chain 1404)

**Do not use `https://rpc.bdagscan.com` for deploys, Hardhat defaults, dashboard config, or MetaMask “BlockDAG mainnet”.**

It may still report chain ID `1404`, but it is a **diverged fork**. Contracts and balances there are not on the community/canonical cluster users should use.

### Known-good community RPCs (mainnet, chain 1404)

Use any healthy endpoint from this list:

| RPC |
|-----|
| `https://rpc.blockdag.engineering/` |
| `https://rpc.east.bdag-us.org/` |
| `https://rpc.west.bdag-us.org/` |
| `https://rpc.dvdmining.com` |
| `https://rpc.capedag.com/` |

| Setting | Value |
|---------|--------|
| Chain ID | `1404` (`0x57c`) |
| Explorer | `https://explorer.blockdag.engineering/` |

Optional community-side failover: `https://rpc.welshdag.trade/` — acceptable as a backup; prefer the table above as defaults in README / `.env.example` / Hardhat.

### Testnet (Awakening, chain 1043)

Testnet may use Awakening endpoints from BlockDAG docs (e.g. awakening explorers). Keep testnet and mainnet configs **clearly separated**. Never “test mainnet logic” by pointing chain `1404` at bdagscan.

### Verify fork before deploying

```bash
curl -s -X POST "$RPC_URL" -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
# expect "0x57c" for mainnet

# Prefer: same block hash on two community RPCs
```

---

## What to change in the repo (AI task list)

Work in PRs; keep each PR reviewable.

### 1. Align network config (do this first)

Update:

- `README.md` network table
- `.env.example`
- `hardhat.config.js` defaults for `bdagMainnet`

So mainnet defaults are a **community** RPC + `explorer.blockdag.engineering`, and README states explicitly: **never `rpc.bdagscan.com` for mainnet**.

Pasteable prompt:

```text
Update README, .env.example, and hardhat.config.js so BlockDAG mainnet (1404)
defaults to community RPCs:
  https://rpc.blockdag.engineering/ (primary example)
  also document: rpc.east.bdag-us.org, rpc.west.bdag-us.org,
  rpc.dvdmining.com, rpc.capedag.com
Explorer: https://explorer.blockdag.engineering/
Add a clear warning: never use https://rpc.bdagscan.com for mainnet (diverged fork).
Keep testnet (1043) separate. Do not remove welshdag as an optional failover note.
```

### 2. Split deploy scripts (local/test vs mainnet)

Today `scripts/deploy.js` always deploys `TestUSDC` and creates a demo link. That is fine for local/testnet demos; **wrong for mainnet**.

Implement something like:

| Script | Behavior |
|--------|----------|
| `deploy:local` / testnet demo | May deploy `TestUSDC`, `PaymentLinks`, `TipJar`, optional demo link |
| `deploy:mainnet` | Deploy **only** `PaymentLinks` and optionally `TipJar`. **No** `TestUSDC`. Print addresses; write `deployments/blockdag-1404.json` |

Also:

- Require funded `BDAG_MAINNET_PRIVATE_KEY` only in local `.env` (gitignored).
- Never commit private keys.
- On mainnet, ERC-20 links should use a **real** token address the merchant chooses at `createLink` time — not a mock.

Pasteable prompt:

```text
Split deployment:
- Keep current demo behavior for local/testnet (TestUSDC ok).
- Add scripts/deploy-mainnet.js (or flag) that deploys only PaymentLinks + TipJar,
  writes deployments/blockdag-1404.json, and refuses to deploy TestUSDC.
- Update package.json scripts. Document in README.
- Private keys stay in .env only; never log the key.
```

### 3. Commit deploy artifacts

After a successful mainnet deploy on a laptop:

- Commit `deployments/blockdag-1404.json` (addresses are public).
- Do **not** commit `.env`.

Suggested JSON shape:

```json
{
  "chainId": 1404,
  "rpc": "https://rpc.blockdag.engineering/",
  "explorer": "https://explorer.blockdag.engineering/",
  "PaymentLinks": "0x...",
  "TipJar": "0x...",
  "deployedAt": "ISO-8601"
}
```

### 4. Wire the dashboard to live contracts

`dashboard/index.html` currently runs largely in **simulation**. Improve it to:

1. Read a small config block (addresses + `chainId` + `rpcUrl` + explorer).
2. Connect MetaMask / injected wallet.
3. Ensure wallet is on chain `1404` with a **community** RPC (prompt user if wrong).
4. Call `createLink` / `pay` / `payToken` / `tip` against deployed addresses.
5. Show explorer links for txs using the community explorer.

Keep a “simulation mode” toggle for offline demos.

Pasteable prompt:

```text
Upgrade dashboard/index.html to support a live mode:
- Config: PaymentLinks, TipJar, chainId 1404, community RPC, explorer URL
- Wallet connect + switch/add chain using community RPC (not bdagscan)
- createLink / pay / payToken / tip against deployed contracts
- Link receipts to explorer.blockdag.engineering
Keep simulation mode for local demos without a wallet.
```

### 5. TipJar product note

`TipJar` sets `creator = msg.sender` in the constructor. One deploy ⇒ one creator. Document that clearly; optional later: a factory that deploys a TipJar per creator.

### 6. Tests

Keep `npx hardhat test` green. Add a test or script smoke that mainnet deploy path does not reference `TestUSDC` if easy.

### 7. Optional: static host on DigitalOcean

The dashboard is static HTML — easiest droplet path:

1. Deploy contracts from a **laptop** (Phase 2–3 above).
2. Build/copy `dashboard/` (and any config) to the server.
3. nginx serves the folder on 80/443 (certbot).
4. No Node API required for v1 if the browser talks to RPC + contracts directly.

Do **not** put `BDAG_MAINNET_PRIVATE_KEY` on the droplet.

Pasteable prompt:

```text
Add docs/digitalocean-static.md with steps to serve dashboard/ behind nginx
+ Let's Encrypt on a DigitalOcean droplet. No private keys on the server.
Contracts are deployed from a laptop; only addresses go in the dashboard config.
```

---

## Recommended order of PRs

1. **RPC/README/.env/Hardhat** — community mainnet endpoints + bdagscan ban  
2. **Mainnet deploy script + deployments JSON**  
3. **Live dashboard wiring**  
4. **Static droplet hosting doc** (optional)

---

## Security checklist

- [ ] No private keys in git, Docker, or droplet env
- [ ] Mainnet RPC is from the community list (not bdagscan)
- [ ] Wallet + app + Hardhat all on the **same** community fork
- [ ] No `TestUSDC` on mainnet
- [ ] README still says not audited / no real funds without audit
- [ ] Zero-custody invariants preserved (no withdraw / custody in contracts)

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Deployed but users don’t see payments | App or MetaMask on `rpc.bdagscan.com` (wrong fork) |
| `eth_chainId` is 1404 but block hashes differ across RPCs | Mixed community + diverged endpoints |
| Mainnet deploy spent gas on TestUSDC | Used demo `deploy.js` — switch to mainnet-only script |
| ERC-20 pay reverts | Missing `approve`, wrong token decimals/amount, or wrong token address |
| TipJar tips go to wrong person | TipJar creator is the deployer; redeploy from the creator wallet or use PaymentLinks |

---

## Out of scope (do not boil the ocean)

- Refunds, disputes, subscriptions, custody vaults  
- Full Next.js app (static dashboard is enough for v1)  
- Postgres / backend indexer (events on-chain are the receipt; indexer is a later nice-to-have)  
- Editing payment math to “support partial pays” without a new security design
