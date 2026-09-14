# BASKET instruction reference

IDL version: 0.1.0

Program: `149WKoc5878Sx5EWjHGhPBL4vsoogY9og7ffkzdu39LM`

This file is generated from the published Anchor IDL. External venue remaining accounts are route-specific and must follow the reference builders; named accounts alone are not a complete swap adapter.

## Instructions

### `initialize_config`

| Account | Writable | Signer |
|---|---:|---:|
| `authority` | yes | yes |
| `program_data` | no | no |
| `config` | yes | no |
| `system_program` | no | no |

Arguments:

- `treasury`: `"pubkey"`

### `prepare_quote`

Permissionless empty settlement-account preparation; no basket assets move.

| Account | Writable | Signer |
|---|---:|---:|
| `payer` | yes | yes |
| `router` | yes | no |
| `quote_mint` | no | no |
| `quote` | yes | no |
| `token_program` | no | no |
| `system_program` | no | no |

Arguments:

- `_basket_mint`: `"pubkey"`

### `prepare_direct_quote`

| Account | Writable | Signer |
|---|---:|---:|
| `payer` | yes | yes |
| `router` | yes | no |
| `quote_mint` | no | no |
| `quote` | yes | no |
| `token_program` | no | no |
| `system_program` | no | no |

Arguments:

- `_trader`: `"pubkey"`
- `_mint`: `"pubkey"`

### `direct_buy`

| Account | Writable | Signer |
|---|---:|---:|
| `trader` | yes | yes |
| `config` | no | no |
| `treasury` | yes | no |
| `mint` | no | no |
| `router` | yes | no |
| `trader_tokens` | yes | no |
| `token_program` | no | no |
| `system_program` | no | no |

Arguments:

- `gross_sol`: `"u64"`
- `min_tokens`: `"u64"`

### `direct_sell`

| Account | Writable | Signer |
|---|---:|---:|
| `trader` | yes | yes |
| `config` | no | no |
| `treasury` | yes | no |
| `mint` | no | no |
| `router` | yes | no |
| `trader_tokens` | yes | no |
| `token_program` | no | no |
| `system_program` | no | no |

Arguments:

- `tokens`: `"u64"`
- `min_net_sol`: `"u64"`
- `min_gross_sol`: `"u64"`

### `set_buys_paused`

Pausing blocks new exposure, while existing holders retain the implemented sell path.

| Account | Writable | Signer |
|---|---:|---:|
| `authority` | no | yes |
| `config` | yes | no |

Arguments:

- `paused`: `"bool"`

### `activate_and_buy`

All constituent acquisitions, recipe creation, fees and fixed-supply initialization roll back together. Creator co-signs the immutable terms in this transaction.

| Account | Writable | Signer |
|---|---:|---:|
| `buyer` | yes | yes |
| `creator` | no | yes |
| `config` | no | no |
| `mint` | yes | yes |
| `market` | yes | no |
| `router` | yes | no |
| `supply_vault` | yes | no |
| `buyer_tokens` | yes | yes |
| `token_program` | no | no |
| `system_program` | no | no |

Arguments:

- `weights`: `{"vec":"u16"}`
- `min_components`: `{"vec":"u64"}`
- `gross_sol`: `"u64"`
- `min_tokens`: `"u64"`
- `creator_share_bps`: `"u16"`
- `identity`: `{"defined":{"name":"BasketIdentity"}}`

### `activate_atomic`

Preferred one-wallet creation path. The program creates the deterministic mint and canonical buyer token account; the buyer is the only required signer. All constituent acquisitions, recipe creation, fees and fixed-supply initialization roll back together. The on-chain first-buy minimum is 0.10 SOL.

| Account | Writable | Signer |
|---|---:|---:|
| `buyer` | yes | yes |
| `config` | no | no |
| `mint` | yes | no |
| `market` | yes | no |
| `router` | yes | no |
| `supply_vault` | yes | no |
| `buyer_tokens` | yes | no |
| `token_program` | no | no |
| `associated_token_program` | no | no |
| `system_program` | no | no |

Arguments:

- `weights`: `{"vec":"u16"}`
- `min_components`: `{"vec":"u64"}`
- `gross_sol`: `"u64"`
- `min_tokens`: `"u64"`
- `creator_share_bps`: `"u16"`
- `identity`: `{"defined":{"name":"BasketIdentity"}}`

### `activate_from_manifest`

A zero-dev-buy creator authorizes fixed terms off-chain; the first buyer pays atomically.

| Account | Writable | Signer |
|---|---:|---:|
| `buyer` | yes | yes |
| `config` | no | no |
| `mint` | yes | no |
| `market` | yes | no |
| `router` | yes | no |
| `supply_vault` | yes | no |
| `buyer_tokens` | yes | yes |
| `token_program` | no | no |
| `system_program` | no | no |
| `instructions` | no | no |

Arguments:

- `authorization`: `{"defined":{"name":"ManifestAuthorization"}}`
- `weights`: `{"vec":"u16"}`
- `min_components`: `{"vec":"u64"}`
- `gross_sol`: `"u64"`
- `min_tokens`: `"u64"`
- `creator_share_bps`: `"u16"`
- `identity`: `{"defined":{"name":"BasketIdentity"}}`

### `buy`

| Account | Writable | Signer |
|---|---:|---:|
| `trader` | yes | yes |
| `config` | no | no |
| `market` | yes | no |
| `router` | yes | no |
| `mint` | yes | no |
| `supply_vault` | yes | no |
| `trader_tokens` | yes | no |
| `cashback` | yes | no |
| `token_program` | no | no |
| `system_program` | no | no |

Arguments:

- `gross_sol`: `"u64"`
- `composite`: `"u64"`
- `min_tokens`: `"u64"`
- `max_sol_per_component`: `{"vec":"u64"}`

### `sell`

| Account | Writable | Signer |
|---|---:|---:|
| `trader` | yes | yes |
| `config` | no | no |
| `market` | yes | no |
| `router` | yes | no |
| `mint` | yes | no |
| `supply_vault` | yes | no |
| `trader_tokens` | yes | no |
| `cashback` | yes | no |
| `token_program` | no | no |
| `system_program` | no | no |

Arguments:

- `tokens`: `"u64"`
- `min_net_sol`: `"u64"`
- `min_sol_per_component`: `{"vec":"u64"}`

### `finalize_metadata`

Publish immutable Metaplex metadata after the financially atomic launch. The creator-funded reserve repays the permissionless cranker and returns excess.

| Account | Writable | Signer |
|---|---:|---:|
| `cranker` | yes | yes |
| `market` | yes | no |
| `router` | yes | no |
| `mint` | yes | no |
| `metadata_payer` | yes | no |
| `metadata` | yes | no |
| `metadata_program` | no | no |
| `token_program` | no | no |
| `system_program` | no | no |

Arguments:

- None

### `claim_creator_fee`

| Account | Writable | Signer |
|---|---:|---:|
| `owner` | yes | yes |
| `market` | yes | no |
| `router` | yes | no |
| `system_program` | no | no |

Arguments:

- None

### `claim_platform_fee`

| Account | Writable | Signer |
|---|---:|---:|
| `owner` | yes | yes |
| `market` | yes | no |
| `router` | yes | no |
| `system_program` | no | no |

Arguments:

- None

### `claim_cashback`

| Account | Writable | Signer |
|---|---:|---:|
| `owner` | yes | yes |
| `market` | yes | no |
| `cashback` | yes | no |
| `router` | yes | no |
| `system_program` | no | no |

Arguments:

- None

## Program accounts

| Account | Discriminator |
|---|---|
| `BasketMarket` | `59,94,108,97,53,216,244,245` |
| `Config` | `155,12,170,224,30,250,204,130` |
| `Cashback` | `230,139,9,221,63,157,62,30` |

## Events

Decode events with the matching release IDL and deduplicate by transaction signature plus event position. Treat failed transactions as having emitted no durable event.

- `BuysPaused`
- `MarketGraduated`
- `FeeClaimed`
- `TradeExecuted`
- `DirectTradeExecuted`
- `MarketActivated`

## Errors

Error codes and messages are published verbatim in `idl/basket.json`. Do not retry an unchanged transaction after a deterministic program error.
