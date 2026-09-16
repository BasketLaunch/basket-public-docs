# BASKET public protocol documentation

> **BASKET is permissionless infrastructure.**
>
> Launch and trade Baskets directly from your own app. Use your own RPC, routing engine, wallet integration and metadata hosting. No API key, BASKET account, hosted backend or BASKET frontend is required. Protocol fees are enforced entirely on-chain.

Official integration interface for BASKET on Solana.

> This repository describes the active Token-2022 + transaction-v1 mainnet release. It supports up to six underlying coins when the exact complete route passes simulation. Pin `release.json` and verify the deployed bytecode before enabling an integration.

**The currently published single-wallet mainnet release is deployed and buys are enabled. Its standard `activate_atomic` path creates the deterministic mint and buyer token account, acquires every constituent, publishes immutable Metaplex metadata and revokes mint authority inside one user-signed financial transaction. Basket tokens use a fixed 1 billion supply and the creator/trader pays disclosed rent. Always read the current on-chain pause flag before submitting a buy. A finalized customer-driven mainnet launch is linked below; deployment is not an independent audit. Upgrade authority is retained on the owner’s Ledger.**

- [Website documentation](https://basketlaunch.fun/docs)
- [Anchor IDL](idl/basket.json)
- [Instructions and accounts](docs/INSTRUCTIONS.md)
- [Lifecycle and integration](docs/INTEGRATION.md)
- [Trading-platform integration guide](docs/TRADING-PLATFORMS.md)
- [Official TypeScript SDK](sdk/README.md) — `npm install @basketlaunch/sdk`
- [Release manifest](release.json)
- [Verified mainnet example: The Big Three](https://solscan.io/tx/3VQ7xJcZKeedsH8XRHnKAG3q6x688Fw6cn3h6gNm1QiPQK3up8xhR4aNNWk42tdHFrKqq7wkF43D5NDXqBcdu8rz)
- [Read-only deployment verifier](scripts/verify-deployment.py) — run `python3 scripts/verify-deployment.py`; compares finalized on-chain bytecode against the published release.

## Integration quick start

```bash
npm install @basketlaunch/sdk@0.2.5 @solana/web3.js
```

```ts
import {Connection, PublicKey} from '@solana/web3.js';
import {
  discoverBasketMints, prepareBasketBuy, prepareBasketLaunch,
  prepareBasketSell, readBasketReserve, verifyDeployment,
} from '@basketlaunch/sdk';

const connection = new Connection(process.env.SOLANA_RPC_URL!, 'confirmed');
await verifyDeployment(connection); // fail closed if the pinned program changed

const markets = await discoverBasketMints(connection);
const mint = markets[0].mint;
const reserve = await readBasketReserve(connection, mint);
console.table(reserve.components.map(component => ({
  mint: component.mint.toBase58(),
  weightBps: component.weightBps,
  recipe: component.recipe.toString(),
  vault: component.vault.toBase58(),
  balance: component.balance.toString(),
})));
```

Launch, buy and sell use the same terminal-owned routing engine:

```ts
const transactionConfig = {priorityFeeLamports: await terminalPriorityFee()};

const launch = await prepareBasketLaunch({
  connection, buyer: wallet, identity, components, grossSol: 100_000_000n,
  creatorShareBps: 5_000, routeAdapter: terminalLaunchRoutes, transactionConfig,
});

const buy = await prepareBasketBuy({
  connection, mint, trader: wallet, grossSol: 100_000_000n,
  slippageBps: 100, routeAdapter: terminalBasketRoutes, transactionConfig,
});

const sell = await prepareBasketSell({
  connection, mint, trader: wallet, tokens: 1_000_000n,
  slippageBps: 100, routeAdapter: terminalBasketRoutes, transactionConfig,
});

// Sign exactly one returned v1 wire transaction with the user's wallet.
await signAndSend(launch.prepared.wireTransaction);
await signAndSend(buy.prepared!.wireTransaction);
await signAndSend(sell.prepared!.wireTransaction);
```

See the [complete SDK cookbook](sdk/README.md) for metadata hashing, adapter contracts, quotes, launches, buys, sells, fee claims, discovery, indexing, legacy v0 markets, dynamic fees, compute sizing and submission safety.

This repository publishes interfaces and documentation, not the private Rust program implementation. Release hashes allow comparison against deployed bytes once deployment occurs. This is not a reproducible source build or an independent audit. On-chain bytecode remains public and cannot be made impossible to reverse engineer. Repository documentation and the public SDK are MIT-licensed. The downloadable frontend/router reference archive remains GPL-3.0.

Third-party launch and trading interfaces can call the deployed BASKET instructions. The official SDK verifies state and backing, applies the exact curve and fee math, and builds the atomic instruction around an integrator's existing venue router. Its configured platform fees remain enforced on chain. Transfers and unrelated external markets do not automatically pay BASKET fees.

Support: https://x.com/BasketLaunch
