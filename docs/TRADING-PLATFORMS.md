# Trading-platform integration: an Axiom-style terminal

This describes how a third-party terminal could integrate BASKET. It does not claim an Axiom partnership, listing, or existing support. Integrators call the Solana program directly; BASKET website sessions and private backend endpoints are not a public partner API.

## Pin and verify the deployed release

Use `release.json`, the matching IDL and `python3 scripts/verify-deployment.py`. Mainnet program: `149WKoc5878Sx5EWjHGhPBL4vsoogY9og7ffkzdu39LM`. Compare it with the complete `program` value in the release manifest. Verify genesis, executable loader, ProgramData hash, upgrade authority and current config. Read the current pause flag before presenting a buy. Authority is retained, so upgrades must trigger revalidation and adapter compatibility checks. The verifier proves bytecode identity, not source reproducibility or safety.

## Discovery, identity and charting

Index program-owned market accounts and finalized events using the IDL discriminators. Verify mint ownership, a fixed 1 billion token supply, permanently absent mint/freeze authorities after metadata finalization, the canonical supply vault, recorded circulating supply, recipe ordering, constituent mints, canonical reserve vaults and Metaplex metadata. The public `readBasketReserve` helper returns the verified supply vault and a component array with `mint`, `weightBps`, `recipe`, `vault`, `tokenProgram` and live `balance`, all represented with public keys or integer-safe values. Require `unsoldTokens + issuedTokens == 1_000_000_000_000_000` base units. Use that response to display exactly what backs the basket and link every vault to an explorer. Do not identify a basket by ticker or logo alone. Exclude unpublished manifests, markets awaiting metadata and failed transactions from active listings. Cache metadata separately from financial state.

```ts
const reserve = await readBasketReserve(connection, new PublicKey(basketMint));
const backing = reserve.components.map(component => ({
  mint: component.mint.toBase58(),
  initialBps: component.weightBps,
  recipe: component.recipe.toString(),
  vault: component.vault.toBase58(),
  tokenProgram: component.tokenProgram.toBase58(),
  balance: component.balance.toString(),
}));
```

`weightBps` records the initial target allocation. `recipe` records the acquired base-unit quantity that defines proportional basket trades. `balance` is the current base-unit vault holding. Show all three as distinct values; a current balance is not a price or percentage weight.

The public basket catalog also includes each verified market's recorded `vault` and integer-string `recipe` fields for convenient discovery. Treat the chain read as authoritative and refresh vault balances over RPC; the catalog is not an execution quote or a hosted routing SLA.

Build candles from finalized successful BASKET executions. Deduplicate by transaction signature and event position. Use actual executed SOL after refunds for volume; exclude setup rent and unrelated direct-coin trades. Backfill missed slots, preserve checkpoints and reconcile reorgs before finalizing UI history. Surface liquidity and quote age, not only a last-trade price.

## Quote and transaction adapter

1. Fetch a consistent market snapshot and fresh accounts for each of up to four constituent mints. Refresh the selected venue after migration; a temporarily unavailable route must show an actionable error, not an invented quote.
2. Reproduce BASKET integer math, fixed recipe, launch curve or graduated pool state. A basket is not a conventional SPL token/SOL AMM pair. Compute constituent quantities, native-SOL funding, maximum spend/minimum proceeds, venue fees, platform fees and rounding.
3. Prepare canonical trader token and settlement accounts only when missing. Inline a missing trader basket-token account in the buy so the user pays its rent and signs only the complete trade. A warmed lookup table or permissionless venue account may be prepared before the wallet opens; reimburse that verified cost once inside the same transaction. Successful buys transfer basket tokens from the canonical supply vault; successful sells return them. The mint supply never changes after activation. Use the reference builders for exact named and remaining-account ordering; the IDL alone does not encode the complete external swap route.
4. Build `buy` or `sell`, with strict slippage limits. Resolve address lookup tables, count all accounts, check serialized size and compute limits, and simulate the complete atomic transaction. Never execute constituent legs as independent wallet transactions.
5. Show amounts, fees, rent and slippage before asking the user to sign once. Creation, buy and sell each have one user-signed atomic financial transaction. Verify the returned message and required signatures. Save the signature before submission. On timeout, reconcile historical status and finalized expiry before replacing it.
6. Refresh holdings and fee claims after confirmation. Keep supported sell and claim paths accessible when new buys are paused. Preserve backing and route refresh across graduation.

## Launching from another interface

Use `activate_atomic` for the standard launch. Derive the mint from `basket_mint`, the buyer public key and the immutable metadata JSON hash; derive the buyer token account as the canonical associated token account. The program creates both, leaving the buyer as the only required signer. Enforce the on-chain minimum first buy of 0.10 SOL and preserve the exact identity hash, weights, creator/cashback split and slippage constraints. The older `activate_and_buy` and `activate_from_manifest` paths remain available for compatible integrations. Publish durable metadata before submission. Prepare only permissionless empty venue accounts and an address lookup table in the background when the final message needs them; the preparation authority does not sign or control the launch. A successful prepared launch reimburses its exact confirmed preparation debit and a disclosed cleanup/retry allowance in the same atomic transaction; a failed launch transfers neither. Activation creates every financial account, acquires every constituent, mints the fixed 1 billion inventory once and transfers the first buyer's tokens atomically.

After activation, any caller can submit `finalize_metadata`. The creator-funded router reserve pays Metaplex rent and the crank fee, then returns excess to the recorded metadata payer. This is an automatic follow-up transaction with no creator signature and no basket-asset movement. Reconcile uncertain activation and finalization signatures before retrying. A successful on-chain launch does not automatically grant access to private website APIs or catalog inclusion.

## Fees and claims

Basket buys/sells enforce 1% total, nominally 0.70% platform and 0.30% creator/trader-cashback allocation, with on-chain integer rounding. The treasury is read from protocol config; partners cannot substitute their own. Creator share and cashback follow the immutable basket setting. Use `claim_creator_fee`, `claim_cashback` and `claim_platform_fee` only with the entitled signer and canonical accounts.

Standalone underlying-coin trades using `direct_buy`/`direct_sell` charge the program's 1% platform fee. Underlying swaps inside a basket trade do not incur that separate direct-trade fee. Network and venue fees remain additional. Transfers and unrelated external pools do not automatically pay BASKET fees. There is no implied referral/revenue-sharing contract for the integrating terminal.

## Reference implementation and license

Download https://basketlaunch.fun/source/frontend.tar.gz. Follow `lib/basket-client.ts`, `lib/basket-manifest.ts`, `lib/basket-routes.ts`, `lib/raydium.ts`, `lib/raydium-routes.ts`, `lib/basket-setup.ts`, `lib/transactions.ts` and `lib/wallet-transaction.ts`. The archive's GPL-3.0 terms apply to that code; this repository's documentation license does not replace them. No supported npm SDK package or hosted quote SLA is implied.

Before exposing customers, test create/buy/sell/claim, slippage failure, stale quotes, insufficient liquidity, pause/exit, graduation, underlying-venue migration, missing accounts and uncertain confirmation. Current controlled devnet coverage does not establish every production venue transition. No independent audit is published. Coordinate a pinned-release integration review through https://x.com/BasketLaunch.
