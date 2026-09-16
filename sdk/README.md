# @basketlaunch/sdk

> **BASKET is permissionless infrastructure.**
>
> Launch and trade Baskets directly from your own app. Use your own RPC, routing engine, wallet integration and metadata hosting. No API key, BASKET account, hosted backend or BASKET frontend is required. Protocol fees are enforced entirely on-chain.

The SDK does not upload files or grant access to BASKET storage. Integrators publish their image and metadata JSON through their own supported IPFS, Arweave, or Irys provider, then pass the metadata URI and exact SHA-256 to the launch builder.

Metadata JSON follows the launchpad-compatible top-level shape: `name`, `symbol`, `description`, `image`, `showName`, `createdOn`, `twitter`, and `website`. BASKET-specific recipe and hash-verification fields may be included alongside it.

Official TypeScript integration SDK for the active BASKET program on Solana mainnet.

The SDK verifies canonical program state and reserve accounts, preserves integer precision, quotes the BASKET curve and fee split, builds creation/buy/sell/claim instructions, discovers markets, and compiles and simulates one user-signed transaction-v1 message for new Token-2022 markets. Trading platforms provide a venue adapter for their existing Pump.fun, PumpSwap, Raydium CPMM/CLMM or LaunchLab routing code. The BASKET program validates the complete route again on chain and always enforces its configured fee destination.

The SDK contains no platform signing key and cannot debit BASKET infrastructure wallets. The creator or trader pays all account rent and network fees. Transaction v1 uses inline addresses and no lookup tables; a route requiring advance preparation is rejected so every accepted action opens exactly one wallet approval.

```bash
npm install @basketlaunch/sdk@0.2.5 @solana/web3.js
```

## Connect and verify

```ts
import {Connection, PublicKey} from '@solana/web3.js';
import {parseSol, verifyDeployment} from '@basketlaunch/sdk';

const connection = new Connection(process.env.SOLANA_RPC_URL!, 'confirmed');
const trader = new PublicKey(userWalletAddress);
const grossSol = parseSol('0.1'); // bigint lamports; never use floating point

await verifyDeployment(connection);
```

All SDK amounts are atomic-unit `bigint` values. Call `verifyDeployment` when the adapter starts and after every announced protocol release.

## Publish and hash metadata

The SDK never sends metadata to BASKET. Upload the image and JSON through your own immutable provider, fetch the exact published JSON bytes, and hash those bytes:

```ts
const metadataBytes = new TextEncoder().encode(JSON.stringify({
  name: 'The Big Three', symbol: 'BIG3', description,
  image: immutableImageUrl, showName: true, createdOn: new Date().toISOString(),
  twitter, website,
}));
const jsonSha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', metadataBytes))];
const identity = {name: 'The Big Three', symbol: 'BIG3', uri: immutableJsonUrl, jsonSha256};
```

Verify that `immutableJsonUrl` serves exactly `metadataBytes` before asking the creator to sign.

## Pin the deployed release

```ts
import { Connection } from '@solana/web3.js';
import { verifyDeployment } from '@basketlaunch/sdk';

const connection = new Connection(process.env.SOLANA_RPC_URL!, 'confirmed');
const release = await verifyDeployment(connection);
console.log(release.sha256);
```

Run this at adapter startup and again after a BASKET release. The SDK is mainnet-only and rejects an RPC with the wrong genesis hash. Upgrade authority is retained, so a changed binary or authority stops verification.

## Discover and read markets

```ts
import {discoverBasketMints, readBasketMarket, readCashback} from '@basketlaunch/sdk';

for (const {mint} of await discoverBasketMints(connection)) {
  const market = await readBasketMarket(connection, mint);
  if (!market.metadataPending) console.log(mint.toBase58(), market.graduated, market.slot);
}

const claimableCashback = await readCashback(connection, basketMint, trader);
```

For production indexing, subscribe to finalized program accounts and events, deduplicate by transaction signature plus event position, and re-read canonical state before displaying or trading.

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
  components, // one to six ordered { mint, weightBps } entries
  grossSol: 100_000_000n,
  creatorShareBps: 5_000,
  routeAdapter: terminalLaunchRoutes,
  transactionConfig: {
    priorityFeeLamports: 150_000n,
  },
});

// Display launch.fee, rent and network cost, then pass
// launch.prepared.wireTransaction to a Wallet Standard signer that supports v1.
// Metadata publication and authority revocation are included in the same
// creator-paid transaction. No lookup table or platform payer exists.
```

The complete message is simulated before it is returned. Four Pump constituents and up to six simple Raydium CPMM or LaunchLab constituents are the currently verified venue maxima. Mixed PumpSwap, CLMM and LaunchLab routes can cap earlier, so the exact simulation result is authoritative. BASKET does not prescribe transaction priority fees: integrators may pass their existing dynamic fee through `transactionConfig.priorityFeeLamports`; the backward-compatible fallback is 25,000 lamports. The SDK first simulates with the 1.4M CU ceiling, then compiles and verifies the final transaction with 20% compute headroom by default. `transactionConfig.computeUnitMarginBps` may override that margin.

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
  transactionConfig: {
    priorityFeeLamports: terminalPriorityFeeLamports,
  },
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

## Prepare an atomic sell

```ts
import {prepareBasketSell} from '@basketlaunch/sdk';

const prepared = await prepareBasketSell({
  connection,
  mint: new PublicKey(basketMint),
  trader,
  tokens: basketTokenBaseUnits,
  slippageBps: 100,
  routeAdapter: terminalBasketRoutes,
  transactionConfig: {priorityFeeLamports: terminalPriorityFeeLamports},
});

console.log({
  expectedNetSol: prepared.quote.expectedNetSol.toString(),
  minimumNetSol: prepared.quote.minNetSol.toString(),
  constituentMinimums: prepared.quote.componentMinimums.map(String),
});
if (!prepared.prepared) throw new Error('Use the legacy v0 path shown below');
await signAndSend(prepared.prepared.wireTransaction);
```

Keep sells and claims accessible while buys are paused. Never split constituent legs into independent transactions.

## Quote without opening a wallet

```ts
import {quoteBasketBuy, quoteBasketSell, validateBasketRouteSnapshot} from '@basketlaunch/sdk';

const state = await readBasketMarket(connection, mint);
const routed = await terminalBasketRoutes({
  connection, state, side: 'Buy', minContextSlot: state.slot,
});
const snapshot = validateBasketRouteSnapshot(state, routed, state.slot);

const buyQuote = quoteBasketBuy(snapshot, 100_000_000n, 100);
const sellQuote = quoteBasketSell(snapshot, 1_000_000n, 100);
```

Refresh the state and route before preparation. A display quote is not authorization to submit against an older slot.

## Claim creator, cashback or platform fees

```ts
import {buildBasketClaim, buildBasketTransaction, readBasketMarket} from '@basketlaunch/sdk';

const state = await readBasketMarket(connection, mint);
const claim = buildBasketClaim(state, trader, 'cashback'); // or 'creator' / 'platform'
const {transaction, blockhash, lastValidBlockHeight} = await buildBasketTransaction({
  connection, payer: trader, instructions: [claim],
});

const signed = await wallet.signTransaction(transaction);
const signature = await connection.sendRawTransaction(signed.serialize(), {
  maxRetries: 0, skipPreflight: false,
});
await connection.confirmTransaction({signature, blockhash, lastValidBlockHeight}, 'confirmed');
```

`buildBasketClaim` checks creator and platform entitlement locally; the on-chain program remains authoritative.

## Legacy v0 compatibility

`prepareBasketBuy` and `prepareBasketSell` return `prepared: null` for legacy-token Baskets. Compile their already-validated instruction list as v0:

```ts
import {buildBasketTransaction} from '@basketlaunch/sdk';

const result = await prepareBasketBuy(input);
if (result.prepared) {
  await signAndSend(result.prepared.wireTransaction);
} else {
  const {transaction, blockhash, lastValidBlockHeight} = await buildBasketTransaction({
    connection, payer: trader, instructions: result.instructions,
    lookupTables: terminalLookupTables,
  });
  const signed = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize(), {maxRetries: 0, skipPreflight: false});
  await connection.confirmTransaction({signature, blockhash, lastValidBlockHeight}, 'confirmed');
}
```

## Submission and reconciliation

```ts
async function signAndSend(wireTransaction: Uint8Array) {
  // Adapter-specific: the wallet must sign the exact v1 bytes returned by the SDK.
  const signedBytes = await platformWallet.signSolanaTransactionV1(wireTransaction);
  const signature = await connection.sendRawTransaction(signedBytes, {
    maxRetries: 0,
    skipPreflight: false,
  });
  // Persist signature + exact message before submission in production. On an
  // unknown response, reconcile status and finalized expiry before replacement.
  return signature;
}
```

Do not rebuild, mutate or silently retry a prepared transaction after the user reviews it.

## Release numbering

Protocol and SDK versions are independent. Protocol release `v0.3.2-compact-metadata` identifies the deployed on-chain binary and matching IDL. SDK `v0.2.5` identifies this client package and adds integration behavior without redeploying or changing the program ID. Pin both values from `release.json`.

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

A minimal adapter shape is:

```ts
const terminalBasketRoutes: BasketRouteAdapter = async ({connection, state, side, minContextSlot}) => {
  const snapshot = await terminalRouter.quoteAll({
    connection,
    side,
    mints: state.components.map(component => component.mint),
    minContextSlot,
  });
  return {
    slot: snapshot.slot,
    legs: state.components.map((component, index) => ({
      mint: component.mint,
      accounts: snapshot.routes[index].orderedAccountMetas,
      maxBuyTokens: snapshot.routes[index].maxBuyTokens,
      buyCost: tokens => snapshot.routes[index].buyCost(tokens),
      sellProceeds: tokens => snapshot.routes[index].sellProceeds(tokens),
    })),
  };
};
```

`orderedAccountMetas` must be the exact deployed venue account order and must include the constituent mint and canonical BASKET reserve vault. The adapter may support Pump.fun, PumpSwap, Raydium CPMM/CLMM and LaunchLab, but the SDK deliberately does not bundle or prescribe a router.

All reads must come from a nondecreasing confirmed slot. Each leg must include the canonical BASKET router, constituent mint and reserve vault, use no external signer, and follow the deployed adapter account order. The SDK checks the shared invariants; the on-chain program authenticates every venue-specific account and rejects a changed or malformed route atomically.

The SDK accepts at most six launch constituents in this release and exact-simulates the complete message. The program state reserves eight slots for forward compatibility and independently validates 1–8 entries, canonical extension state, component order, weights, receipt deltas and fee routing. A caller that bypasses the SDK still cannot create partial state or spend platform SOL; an invalid transaction rolls back atomically and can consume only its payer's network fee.

## Discovery and indexing

`discoverBasketMints(connection)` scans the program discriminator. For high-volume indexing, subscribe to finalized BASKET program accounts and events, then call `readBasketMarket` before listing or trading a market. Deduplicate events by transaction signature and event position. Use actual SOL after refunds for volume.

Program: `149WKoc5878Sx5EWjHGhPBL4vsoogY9og7ffkzdu39LM`

## Integration checklist

1. Pin SDK `0.2.5`, protocol release `v0.3.2-compact-metadata`, program ID and bytecode hash.
2. Use a mainnet RPC you operate or trust; the SDK has no hosted RPC dependency.
3. Publish immutable metadata and verify the exact SHA-256 bytes.
4. Return fresh ordered route legs at or after the requested slot.
5. Display gross input, expected output, minimum output, protocol/venue/network fees and rent.
6. Sign and submit exactly the prepared bytes once; reconcile unknown results before replacement.
7. Re-read reserve, token authorities and finalized state after confirmation.
8. Keep supported sell and claim paths available during a buy pause.

- Full integration guide: https://basketlaunch.fun/docs
- Release manifest and IDL: https://github.com/BasketLaunch/basket-public-docs
- Verified mainnet transaction: https://solscan.io/tx/3VQ7xJcZKeedsH8XRHnKAG3q6x688Fw6cn3h6gNm1QiPQK3up8xhR4aNNWk42tdHFrKqq7wkF43D5NDXqBcdu8rz
- Compatibility review: https://x.com/BasketLaunch

This SDK is MIT-licensed and contains no Raydium SDK implementation or dependency; integrators supply their own venue adapter. The separate downloadable frontend/router reference archive remains GPL-3.0. This package does not publish the private BASKET Rust implementation. Deployed Solana bytecode is public and upgradeable. No independent audit has been published.
