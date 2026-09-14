# Integrating BASKET

Use the public website docs for the complete explanation: https://basketlaunch.fun/docs

## Launch

Pin the image and metadata JSON before quoting. The standard launch path uses `activate_atomic`. The basket mint is the deterministic `basket_mint` PDA derived from the buyer and metadata JSON hash, and the buyer token account is its canonical associated token account. The program creates both accounts, so the buyer is the only signer. The same transaction creates the market, router and fixed-supply vault; buys every constituent; records fees; mints exactly 1 billion basket tokens once; and transfers the purchased amount from the program-controlled supply vault. A first buy of at least 0.10 SOL is enforced on chain, and a failure in any leg rolls the whole launch back. The older `activate_and_buy` and `activate_from_manifest` interfaces remain published for compatible integrations.

The BASKET website accepts only launches whose complete creation fits one Solana transaction. Missing accounts are created inside that transaction and paid by the creator. A combination requiring advance lookup-table or venue preparation is rejected before the wallet opens, so an abandoned website draft spends no platform or creator SOL. Integrators that implement a larger multi-transaction setup flow must supply their own payer and lookup authority; the SDK has no access to a BASKET-funded relay.

Metaplex metadata is finalized after the financial transaction by permissionless `finalize_metadata`. Activation stores the immutable identity and reserves its rent in the router, so this step needs no second creator signature. Do not list a new market until its finalized state, mint authority, supply, reserve vaults and metadata all verify.

## Trade

Install the supported TypeScript interface with `npm install @basketlaunch/sdk`. It exposes deployed-release verification, canonical market and reserve reads, exact basket curve and fee quotes, buy/sell/claim instruction builders, market discovery and one-transaction v0 compilation. Supply a `BasketRouteAdapter` backed by the integrating terminal's fresh Pump/Raydium router; the BASKET program authenticates the complete remaining-account route again on chain.

Read fresh pool, vault and market accounts. The market stores up to four constituent mints, initial weights, fixed recipe quantities and reserve vault addresses. The reference `readBasketReserve` helper verifies those accounts and returns the canonical supply vault plus each constituent vault's live balance and token program from one RPC snapshot. Verify their owners and identities. Pass ordered venue accounts for eligible Pump, PumpSwap, Raydium CPMM/CLMM or LaunchLab SOL pairs. Supply explicit slippage and spending limits, simulate the complete versioned transaction, then obtain the user's signature. Buys transfer tokens from the supply vault and sells return them. Require the immutable SPL supply to remain 1 billion tokens and supply-vault inventory plus recorded circulation to equal that total. Preserve the transaction's exact bytes and reconcile unknown confirmations before replacement.

Every creation, buy and sell accepted by the website uses one user-signed atomic transaction. A first buy can create the trader token account inside the buy transaction; the trader pays that account's rent. Routes requiring an earlier setup transaction are rejected before signing. Third-party interfaces may prepare their own capacity, but BASKET does not fund or reimburse it and the preparation authority must never sign the financial trade or hold user assets.

The IDL provides named accounts and type layouts; adapter remaining-account ordering is additionally required. Do not guess account order from account count. Request an integration review before production use.

## Fees

Basket buys and sells charge 1% in SOL, nominally 0.70% platform and 0.30% divided between creator and the trading user's cashback. All amounts use integer rounding. The platform treasury comes from protocol configuration, not a partner-selected parameter. Standalone coin trades using `direct_buy`/`direct_sell` charge 1% platform fees. Network costs, account rent and underlying venue fees are separate.

## Graduation

The final launch purchase switches to the BASKET permanent pool, preserving the composite reserve recipe and underlying holdings. It does not create a PumpSwap listing. Existing liquidity can still constrain exits, and an underlying venue migration is a separate event requiring route refresh.

## Release checks

Check genesis hash, program executable status and ProgramData owner, configured authority/treasury, release hash and pause state. Mainnet chain is `solana:mainnet`; devnet authorization is not reusable. The published release is active on mainnet and no independent audit is published.

Index finalized events using the exact IDL. Deduplicate by signature and event index, and subtract actual refunds from reported volume. Do not imply that unrelated external pools enforce BASKET fees.

## Reference transaction builders

The separately licensed [corresponding frontend source](https://basketlaunch.fun/source/frontend.tar.gz) contains the TypeScript reference builders: `lib/basket-client.ts` (named protocol instructions and PDAs), `lib/basket-manifest.ts` (canonical activation authorization), `lib/basket-routes.ts`, `lib/raydium.ts` and `lib/raydium-routes.ts` (venue route ordering), `lib/basket-setup.ts` (account setup), and `lib/wallet-transaction.ts` (signing and reconciliation). That archive is GPL-3.0 and includes its notices; the documentation repository's license does not replace it. It does not contain the private Rust program implementation.
