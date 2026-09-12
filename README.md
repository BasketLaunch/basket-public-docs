# BASKET public protocol documentation

Official integration interface for BASKET, a Solana basket launchpad with up to four underlying coins.

**Mainnet is not deployed yet. Do not enable real-money trading using this candidate.**

- [Website documentation](https://basketlaunch.fun/docs)
- [Anchor IDL](idl/basket.json)
- [Instructions and accounts](docs/INSTRUCTIONS.md)
- [Lifecycle and integration](docs/INTEGRATION.md)
- [Release manifest](release.json)

This repository publishes interfaces and documentation, not the private Rust program implementation. Release hashes allow comparison against deployed bytes once deployment occurs. This is not a reproducible source build or an independent audit. On-chain bytecode remains public and cannot be made impossible to reverse engineer.

Third-party launch and trading interfaces can call the deployed BASKET instructions. Its configured platform fees remain enforced on chain. Transfers and unrelated external markets do not automatically pay BASKET fees.

Support: https://x.com/BasketLaunch
