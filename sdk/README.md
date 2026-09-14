# @basketlaunch/sdk

Official TypeScript integration SDK for the deployed BASKET program on Solana mainnet.

The SDK verifies canonical program state and reserve accounts, preserves integer precision, quotes the BASKET curve and fee split, builds buy/sell/claim instructions, discovers markets, and compiles one user-signed v0 transaction. Trading platforms provide a venue adapter for their existing Pump.fun, PumpSwap, Raydium CPMM/CLMM or LaunchLab routing code. The BASKET program validates the complete route again on chain and always enforces its configured fee destination.

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

## Prepare a one-signature buy

```ts
import { PublicKey } from '@solana/web3.js';
import { buildBasketTransaction, prepareBasketBuy } from '@basketlaunch/sdk';

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

const built = await buildBasketTransaction({
  connection,
  payer: trader,
  instructions: prepared.instructions,
  lookupTables: await terminalLookupTables(prepared.lookupAddresses),
});

const simulation = await connection.simulateTransaction(built.transaction, {
  sigVerify: false,
  replaceRecentBlockhash: true,
});
if (simulation.value.err) throw new Error('BASKET simulation failed');

// Display prepared.quote, rent and the network fee before this single approval.
const signed = await wallet.signTransaction(built.transaction);
const signature = await connection.sendRawTransaction(signed.serialize(), {
  maxRetries: 0,
  skipPreflight: false,
});
```

`prepareBasketSell` follows the same pattern and never blocks a supported exit because buys are paused. Platforms must reconcile an unknown signature before creating a replacement transaction.

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

## Discovery and indexing

`discoverBasketMints(connection)` scans the program discriminator. For high-volume indexing, subscribe to finalized BASKET program accounts and events, then call `readBasketMarket` before listing or trading a market. Deduplicate events by transaction signature and event position. Use actual SOL after refunds for volume.

Program: `149WKoc5878Sx5EWjHGhPBL4vsoogY9og7ffkzdu39LM`

- Full integration guide: https://basketlaunch.fun/docs
- Release manifest and IDL: https://github.com/BasketLaunch/basket-public-docs
- Compatibility review: https://x.com/BasketLaunch

This SDK is GPL-3.0 because supported venue integration relies on GPL-licensed Raydium interfaces. It does not publish the private BASKET Rust implementation. Deployed Solana bytecode is public and upgradeable. No independent audit has been published.
