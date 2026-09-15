# @basketlaunch/sdk

Official TypeScript integration SDK for the BASKET program on Solana. This branch is the Token-2022 + transaction-v1 candidate; keep the published mainnet release pinned until its matching program upgrade and release manifest are finalized.

The SDK verifies canonical program state and reserve accounts, preserves integer precision, quotes the BASKET curve and fee split, builds creation/buy/sell/claim instructions, discovers markets, and compiles and simulates one user-signed transaction-v1 message for new Token-2022 markets. Trading platforms provide a venue adapter for their existing Pump.fun, PumpSwap, Raydium CPMM/CLMM or LaunchLab routing code. The BASKET program validates the complete route again on chain and always enforces its configured fee destination.

The SDK contains no platform signing key and cannot debit BASKET infrastructure wallets. The creator or trader pays all account rent and network fees. Transaction v1 uses inline addresses and no lookup tables; a route requiring advance preparation is rejected so every accepted action opens exactly one wallet approval.

```bash
npm install @basketlaunch/sdk @solana/web3.js
```

## Pin the deployed release

```ts
import { Connection } from '@solana/web3.js';
import { verifyDeployment } from '@basketlaunch/sdk';

const connection = new Connection(process.env.SOLANA_RPC_URL!, 'confirmed');
const release = await verifyDeployment(connection);
console.log(release.sha256);
```

Run this at adapter startup and again after a BASKET release. The SDK is mainnet-only and rejects an RPC with the wrong genesis hash. Upgrade authority is retained, so a changed binary or authority stops verification.

## Read and display the backing

```ts
import { PublicKey } from '@solana/web3.js';
import { readBasketReserve } from '@basketlaunch/sdk';

const reserve = await readBasketReserve(connection, new PublicKey(basketMint));
const backing = reserve.components.map(component => ({
  mint: component.mint.toBase58(),
  initialWeightBps: component.weightBps,
  recipeBaseUnits: component.recipe.toString(),
  vault: component.vault.toBase58(),
  balanceBaseUnits: component.balance.toString(),
  tokenProgram: component.tokenProgram.toBase58(),
}));
```

The initial weight, fixed recipe quantity and current vault balance are different values. Display them separately. `readBasketReserve` also verifies the fixed one-billion-token supply and canonical vault ownership.

## Prepare an atomic launch

An integrating site can store artwork and metadata through its own IPFS provider. Pass the immutable URI and SHA-256 digest to the SDK; no private BASKET upload API is required.

```ts
import { prepareBasketLaunch } from '@basketlaunch/sdk';

const launch = await prepareBasketLaunch({
  connection,
  buyer: trader,
  identity: { name, symbol, uri: metadataUri, jsonSha256: [...metadataDigest] },
  components, // one to seven ordered { mint, weightBps } entries
  grossSol: 100_000_000n,
  creatorShareBps: 5_000,
  routeAdapter: terminalLaunchRoutes,
});

// Display launch.fee, rent and network cost, then pass
// launch.prepared.wireTransaction to a Wallet Standard signer that supports v1.
// No lookup table or platform payer exists.
```

The complete message is simulated before it is returned. Four Pump, six LaunchLab and seven homogeneous Raydium CPMM constituents are the currently verified venue maxima. Mixed and CLMM routes can cap earlier, so the exact simulation result is authoritative.

## Prepare an atomic buy

```ts
import { PublicKey } from '@solana/web3.js';
import { prepareBasketBuy } from '@basketlaunch/sdk';

const trader = new PublicKey(userWallet);
const prepared = await prepareBasketBuy({
  connection,
  mint: new PublicKey(basketMint),
  trader,
  grossSol: 100_000_000n,
  slippageBps: 100,
  routeAdapter: async ({ connection, state, side, minContextSlot }) => {
    // Reuse the terminal's verified Pump/Raydium route engine.
    // Return one ordered leg for every state.components entry.
    return terminalBasketRoutes({ connection, state, side, minContextSlot });
  },
});

const built = prepared.prepared;
if (!built) throw new Error('This example expects a Token-2022 BASKET market');

// Display prepared.quote, rent and the network fee before approval. A platform
// wallet adapter passes built.wireTransaction to Wallet Standard v1 signing.
const signedBytes = await platformWallet.signSolanaTransactionV1(built.wireTransaction);
const signature = await connection.sendRawTransaction(signedBytes, {
  maxRetries: 0,
  skipPreflight: false,
});
```

`prepareBasketSell` follows the same pattern and never blocks a supported exit because buys are paused. Each buy or sell is one atomic financial transaction. New Token-2022 markets use v1 with no lookup tables; legacy-token markets retain the v0 compatibility path. Platforms must reconcile an unknown signature before creating a replacement transaction.

## Venue adapter contract

The adapter returns one `VenueLeg` per constituent, in the immutable market order:

```ts
type VenueLeg = {
  mint: PublicKey;
  accounts: AccountMeta[];
  maxBuyTokens: bigint;
  buyCost(tokens: bigint): bigint;
  sellProceeds(tokens: bigint): bigint;
};
```

All reads must come from a nondecreasing confirmed slot. Each leg must include the canonical BASKET router, constituent mint and reserve vault, use no external signer, and follow the deployed adapter account order. The SDK checks the shared invariants; the on-chain program authenticates every venue-specific account and rejects a changed or malformed route atomically.

The SDK accepts at most seven launch constituents in this release and exact-simulates the complete message. The program state reserves eight slots for forward compatibility and independently validates 1–8 entries, canonical extension state, component order, weights, receipt deltas and fee routing. A caller that bypasses the SDK still cannot create partial state or spend platform SOL; an invalid transaction rolls back atomically and can consume only its payer's network fee.

## Discovery and indexing

`discoverBasketMints(connection)` scans the program discriminator. For high-volume indexing, subscribe to finalized BASKET program accounts and events, then call `readBasketMarket` before listing or trading a market. Deduplicate events by transaction signature and event position. Use actual SOL after refunds for volume.

Program: `149WKoc5878Sx5EWjHGhPBL4vsoogY9og7ffkzdu39LM`

- Full integration guide: https://basketlaunch.fun/docs
- Release manifest and IDL: https://github.com/BasketLaunch/basket-public-docs
- Compatibility review: https://x.com/BasketLaunch

This SDK is GPL-3.0 because supported venue integration relies on GPL-licensed Raydium interfaces. It does not publish the private BASKET Rust implementation. Deployed Solana bytecode is public and upgradeable. No independent audit has been published.
