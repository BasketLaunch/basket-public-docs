# Integrating BASKET

Use the public website docs for the complete explanation: https://basketlaunch.fun/docs

## Launch

Publish image and metadata JSON to durable storage. Prepare required accounts, compose `activate_and_buy` with the entitled signers, or `activate_from_manifest` with the exact creator-signed canonical manifest. A positive first buy establishes the immutable recipe and fixed creator/cashback split. Website account rules and catalog indexing are separate from the protocol ABI.

## Trade

Read fresh pool, vault and market accounts. Verify their owners and identities. Pass ordered venue accounts for eligible Pump, PumpSwap, Raydium CPMM/CLMM or LaunchLab SOL pairs. Supply explicit slippage and spending limits, simulate the complete versioned transaction, then obtain the user's signature. Preserve the transaction's exact bytes and reconcile unknown confirmations before replacement.

The IDL provides named accounts and type layouts; adapter remaining-account ordering is additionally required. Do not guess account order from account count. Request an integration review before production use.

## Fees

Basket buys and sells charge 1% in SOL, nominally 0.70% platform and 0.30% divided between creator and the trading user's cashback. All amounts use integer rounding. The platform treasury comes from protocol configuration, not a partner-selected parameter. Standalone coin trades using `direct_buy`/`direct_sell` charge 1% platform fees. Network costs, account rent and underlying venue fees are separate.

## Graduation

The final launch purchase switches to the BASKET permanent pool, preserving the composite reserve recipe and underlying holdings. It does not create a PumpSwap listing. Existing liquidity can still constrain exits, and an underlying venue migration is a separate event requiring route refresh.

## Release checks

Check genesis hash, program executable status and ProgramData owner, configured authority/treasury, release hash and pause state. Mainnet chain is `solana:mainnet`; devnet authorization is not reusable. The interface is currently pre-release and no independent audit is published.

Index finalized events using the exact IDL. Deduplicate by signature and event index, and subtract actual refunds from reported volume. Do not imply that unrelated external pools enforce BASKET fees.

## Reference transaction builders

The separately licensed [corresponding frontend source](https://basketlaunch.fun/source/frontend.tar.gz) contains the TypeScript reference builders: `lib/basket-client.ts` (named protocol instructions and PDAs), `lib/basket-manifest.ts` (canonical activation authorization), `lib/basket-routes.ts`, `lib/raydium.ts` and `lib/raydium-routes.ts` (venue route ordering), `lib/basket-setup.ts` (account setup), and `lib/wallet-transaction.ts` (signing and reconciliation). That archive is GPL-3.0 and includes its notices; the documentation repository's license does not replace it. It does not contain the private Rust program implementation.
