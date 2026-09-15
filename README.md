# BASKET public protocol documentation

Official integration interface for BASKET on Solana.

> This branch is the validated Token-2022 + transaction-v1 candidate. It supports up to seven underlying coins when the exact complete route passes simulation. The `main` branch and `release.json` remain the authoritative deployed mainnet release until the matching program upgrade is finalized.

**The currently published single-wallet mainnet release is deployed and buys are enabled. Its standard `activate_atomic` path creates the deterministic mint and buyer token account inside one user-signed financial transaction. Basket tokens use a fixed 1 billion supply and the creator/trader pays disclosed rent. Always read the current on-chain pause flag before submitting a buy. The first customer-driven mainnet lifecycle test is pending; deployment is not an independent audit. Upgrade authority is retained on the owner’s Ledger.**

- [Website documentation](https://basketlaunch.fun/docs)
- [Anchor IDL](idl/basket.json)
- [Instructions and accounts](docs/INSTRUCTIONS.md)
- [Lifecycle and integration](docs/INTEGRATION.md)
- [Trading-platform integration guide](docs/TRADING-PLATFORMS.md)
- [Official TypeScript SDK](sdk/README.md) — `npm install @basketlaunch/sdk`
- [Release manifest](release.json)
- [Read-only deployment verifier](scripts/verify-deployment.py) — run `python3 scripts/verify-deployment.py`; compares finalized on-chain bytecode against the published release.

This repository publishes interfaces and documentation, not the private Rust program implementation. Release hashes allow comparison against deployed bytes once deployment occurs. This is not a reproducible source build or an independent audit. On-chain bytecode remains public and cannot be made impossible to reverse engineer. Repository documentation is MIT-licensed; the SDK has its own GPL-3.0 license in `sdk/LICENSE`.

Third-party launch and trading interfaces can call the deployed BASKET instructions. The official SDK verifies state and backing, applies the exact curve and fee math, and builds the atomic instruction around an integrator's existing venue router. Its configured platform fees remain enforced on chain. Transfers and unrelated external markets do not automatically pay BASKET fees.

Support: https://x.com/BasketLaunch
