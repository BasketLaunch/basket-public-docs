# Integrating BASKET

Use the public website docs for the complete explanation: https://basketlaunch.fun/docs

## Launch

Pin the image and metadata JSON before quoting. A launch then uses one user-signed financial transaction: `activate_and_buy` when creator and buyer are the same signing wallet, or `activate_from_manifest` when the creator authorized immutable terms off-chain. That transaction creates the mint, market, router, fixed-supply and buyer accounts; buys every constituent; records fees; mints exactly 1 billion basket tokens once; and transfers the purchased amount from the program-controlled supply vault. A failure in any leg rolls the whole launch back.

Transactions that exceed Solana's legacy message or instruction-trace limits may use permissionless empty venue accounts and a confirmed address lookup table prepared in the background. The preparation signer cannot change the recipe, buy assets, move the user's assets or sign the launch. A successful prepared launch reimburses its exact confirmed setup debit plus a separately displayed 25,000-lamport cleanup/retry allowance. The transfer is in the atomic launch transaction, so a failed launch pays nothing. Used and abandoned tables are later deactivated and closed so their rent returns to the preparation wallet; Solana transaction fees remain nonrefundable. Small launches can fit without preparation.

Metaplex metadata is finalized after the financial transaction by permissionless `finalize_metadata`. Activation stores the immutable identity and reserves its rent in the router, so this step needs no second creator signature. Do not list a new market until its finalized state, mint authority, supply, reserve vaults and metadata all verify.

## Trade

Read fresh pool, vault and market accounts. The market stores up to four constituent mints, initial weights, fixed recipe quantities and reserve vault addresses. The reference `readBasketReserve` helper verifies those accounts and returns the canonical supply vault plus each constituent vault's live balance and token program from one RPC snapshot. Verify their owners and identities. Pass ordered venue accounts for eligible Pump, PumpSwap, Raydium CPMM/CLMM or LaunchLab SOL pairs. Supply explicit slippage and spending limits, simulate the complete versioned transaction, then obtain the user's signature. Buys transfer tokens from the supply vault and sells return them. Require the immutable SPL supply to remain 1 billion tokens and supply-vault inventory plus recorded circulation to equal that total. Preserve the transaction's exact bytes and reconcile unknown confirmations before replacement.

Creation, buy and sell each use one user-signed transaction. A first buy can create the trader token account inside the buy transaction; the trader pays that account's rent. If the complete message requires a warmed lookup table or permissionless venue preparation, prepare it before opening the wallet and reimburse the verified preparation cost once inside the same atomic financial transaction. The preparation authority must never sign the trade or hold user assets.

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
