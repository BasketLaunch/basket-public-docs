# Integrating BASKET

> Candidate SDK branch: Token-2022 + transaction v1. The published mainnet release remains authoritative until the matching program upgrade is finalized and `release.json` is updated.

Use the public website docs for the complete explanation: https://basketlaunch.fun/docs

## Launch

The integrating site may pin the image and metadata JSON with its own IPFS or storage provider before quoting; it does not need BASKET storage or a private BASKET API. The standard launch path uses `activate_atomic`. The basket mint is the deterministic `basket_mint` PDA derived from the buyer and metadata JSON hash, and the buyer token account is its canonical associated token account. The program creates both accounts, so the buyer is the only signer. The same transaction creates the market, router and fixed-supply vault; buys every constituent; records fees; mints exactly 1 billion basket tokens once; and transfers the purchased amount from the program-controlled supply vault. A first buy of at least 0.10 SOL is enforced on chain, and a failure in any leg rolls the whole launch back. The older `activate_and_buy` and `activate_from_manifest` interfaces remain published for compatible integrations.

Call `prepareBasketLaunch` with the creator public key, immutable identity, one to seven constituents and your venue adapter. It builds and simulates the complete transaction-v1 message. Missing canonical accounts are created inside that transaction and paid by the creator. Transaction v1 uses inline addresses and no address lookup tables. A combination that exceeds the byte, account, compute or instruction-trace limit is rejected before the wallet opens, so an abandoned launch spends no platform or creator SOL. The SDK has no platform signer or funded relay.

Metaplex metadata is finalized after the financial transaction by permissionless `finalize_metadata`. Activation stores the immutable identity and reserves its rent in the router, so this step needs no second creator signature. Do not list a new market until its finalized state, mint authority, supply, reserve vaults and metadata all verify.

## Trade

Install the supported TypeScript interface with `npm install @basketlaunch/sdk`. It exposes deployed-release verification, canonical market and reserve reads, exact basket curve and fee quotes, buy/sell/claim instruction builders, market discovery and one-transaction v1 preparation for new Token-2022 markets. Supply a `BasketRouteAdapter` backed by the integrating terminal's fresh Pump/Raydium router; the BASKET program authenticates the complete remaining-account route again on chain.

Read fresh pool, vault and market accounts. The market stores the first four constituent entries and, when present, its canonical `components` PDA stores entries five through eight. The current SDK launch cap is seven; every exact combination must pass simulation. The reference `readBasketReserve` helper verifies those accounts and returns the canonical supply vault plus each constituent vault's live balance and token program from one RPC snapshot. Verify their owners and identities. Pass ordered venue accounts for eligible Pump, PumpSwap, Raydium CPMM/CLMM or LaunchLab SOL pairs. Supply explicit slippage and spending limits, simulate the complete versioned transaction, then obtain the user's signature. Buys transfer tokens from the supply vault and sells return them. Require the immutable SPL supply to remain 1 billion tokens and supply-vault inventory plus recorded circulation to equal that total. Preserve the transaction's exact bytes and reconcile unknown confirmations before replacement.

Every accepted creation, buy and sell uses one user-signed atomic transaction. A first buy can create the trader token account inside that transaction, with rent paid by the trader. `prepareBasketV1Transaction` compiles and simulates the exact no-ALT message before approval. Routes requiring an earlier setup transaction are rejected. A third party can bypass the SDK, but the program still authenticates component order, canonical PDAs, token programs, venue accounts, balance deltas and fee routing; Solana rolls any account, byte, compute or CPI-trace failure back atomically. Such a caller can spend only its own transaction fee and cannot debit BASKET infrastructure.

The IDL provides named accounts and type layouts; adapter remaining-account ordering is additionally required. Do not guess account order from account count. Request an integration review before production use.

## Fees

Basket buys and sells charge 1% in SOL, nominally 0.70% platform and 0.30% divided between creator and the trading user's cashback. All amounts use integer rounding. The platform treasury comes from protocol configuration, not a partner-selected parameter. Standalone coin trades using `direct_buy`/`direct_sell` charge 1% platform fees. Network costs, account rent and underlying venue fees are separate.

## Graduation

The final launch purchase switches to the BASKET permanent pool, preserving the composite reserve recipe and underlying holdings. It does not create a PumpSwap listing. Existing liquidity can still constrain exits, and an underlying venue migration is a separate event requiring route refresh.

## Release checks

Check genesis hash, program executable status and ProgramData owner, configured authority/treasury, release hash and pause state. Mainnet chain is `solana:mainnet`; devnet authorization is not reusable. Do not enable the candidate SDK against mainnet until its bytecode hash matches an updated mainnet `release.json`. The exact candidate binary has been upgraded and byte-verified on devnet; a finalized five-component v1 launch verified all five reserves, fixed supply and fee liabilities. No independent audit is published.

Index finalized events using the exact IDL. Deduplicate by signature and event index, and subtract actual refunds from reported volume. Do not imply that unrelated external pools enforce BASKET fees.

## Reference transaction builders

The separately licensed [corresponding frontend source](https://basketlaunch.fun/source/frontend.tar.gz) contains the TypeScript reference builders: `lib/basket-client.ts` (named protocol instructions and PDAs), `lib/basket-manifest.ts` (canonical activation authorization), `lib/basket-routes.ts`, `lib/raydium.ts` and `lib/raydium-routes.ts` (venue route ordering), `lib/basket-setup.ts` (account setup), and `lib/wallet-transaction.ts` (signing and reconciliation). That archive is GPL-3.0 and includes its notices; the documentation repository's license does not replace it. It does not contain the private Rust program implementation.
