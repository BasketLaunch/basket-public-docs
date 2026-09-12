# Instruction reference

Generated from the candidate Anchor IDL. Account order and signer/writable flags are part of the ABI. Remaining venue accounts must be appended separately.

## initialize_config

Discriminator: `d07f1501c2bec446`

| Account | Signer | Writable |
|---|---|---|
| authority | true | true |
| program_data | false | false |
| config | false | true |
| system_program | false | false |

Arguments: `[{"name": "treasury", "type": "pubkey"}]`

## prepare_quote

Discriminator: `300bcc379de5e674`

| Account | Signer | Writable |
|---|---|---|
| payer | true | true |
| router | false | true |
| quote_mint | false | false |
| quote | false | true |
| token_program | false | false |
| system_program | false | false |

Arguments: `[{"name": "_basket_mint", "type": "pubkey"}]`

## prepare_direct_quote

Discriminator: `e77c7e295f1097a9`

| Account | Signer | Writable |
|---|---|---|
| payer | true | true |
| router | false | true |
| quote_mint | false | false |
| quote | false | true |
| token_program | false | false |
| system_program | false | false |

Arguments: `[{"name": "_trader", "type": "pubkey"}, {"name": "_mint", "type": "pubkey"}]`

## direct_buy

Discriminator: `ab03ff99fda74f42`

| Account | Signer | Writable |
|---|---|---|
| trader | true | true |
| config | false | false |
| treasury | false | true |
| mint | false | false |
| router | false | true |
| trader_tokens | false | true |
| token_program | false | false |
| system_program | false | false |

Arguments: `[{"name": "gross_sol", "type": "u64"}, {"name": "min_tokens", "type": "u64"}]`

## direct_sell

Discriminator: `deaee2f35a95562f`

| Account | Signer | Writable |
|---|---|---|
| trader | true | true |
| config | false | false |
| treasury | false | true |
| mint | false | false |
| router | false | true |
| trader_tokens | false | true |
| token_program | false | false |
| system_program | false | false |

Arguments: `[{"name": "tokens", "type": "u64"}, {"name": "min_net_sol", "type": "u64"}, {"name": "min_gross_sol", "type": "u64"}]`

## set_buys_paused

Discriminator: `c6d8b250f239d928`

| Account | Signer | Writable |
|---|---|---|
| authority | true | false |
| config | false | true |

Arguments: `[{"name": "paused", "type": "bool"}]`

## activate_and_buy

Discriminator: `f289a73247f0ff6f`

| Account | Signer | Writable |
|---|---|---|
| buyer | true | true |
| creator | true | false |
| config | false | false |
| mint | true | true |
| market | false | true |
| router | false | true |
| supply_vault | false | true |
| buyer_tokens | true | true |
| cashback | false | true |
| metadata | false | true |
| metadata_program | false | false |
| token_program | false | false |
| system_program | false | false |

Arguments: `[{"name": "weights", "type": {"vec": "u16"}}, {"name": "min_components", "type": {"vec": "u64"}}, {"name": "gross_sol", "type": "u64"}, {"name": "min_tokens", "type": "u64"}, {"name": "creator_share_bps", "type": "u16"}, {"name": "identity", "type": {"defined": {"name": "BasketIdentity"}}}]`

## activate_from_manifest

Discriminator: `5b68df98c44f8bd5`

| Account | Signer | Writable |
|---|---|---|
| buyer | true | true |
| config | false | false |
| mint | false | true |
| market | false | true |
| router | false | true |
| supply_vault | false | true |
| buyer_tokens | true | true |
| cashback | false | true |
| metadata | false | true |
| metadata_program | false | false |
| token_program | false | false |
| system_program | false | false |
| instructions | false | false |

Arguments: `[{"name": "authorization", "type": {"defined": {"name": "ManifestAuthorization"}}}, {"name": "weights", "type": {"vec": "u16"}}, {"name": "min_components", "type": {"vec": "u64"}}, {"name": "gross_sol", "type": "u64"}, {"name": "min_tokens", "type": "u64"}, {"name": "creator_share_bps", "type": "u16"}, {"name": "identity", "type": {"defined": {"name": "BasketIdentity"}}}]`

## buy

Discriminator: `66063d1201daebea`

| Account | Signer | Writable |
|---|---|---|
| trader | true | true |
| config | false | false |
| market | false | true |
| router | false | true |
| supply_vault | false | true |
| trader_tokens | false | true |
| cashback | false | true |
| token_program | false | false |
| system_program | false | false |

Arguments: `[{"name": "gross_sol", "type": "u64"}, {"name": "composite", "type": "u64"}, {"name": "min_tokens", "type": "u64"}, {"name": "max_sol_per_component", "type": {"vec": "u64"}}]`

## sell

Discriminator: `33e685a4017f83ad`

| Account | Signer | Writable |
|---|---|---|
| trader | true | true |
| config | false | false |
| market | false | true |
| router | false | true |
| supply_vault | false | true |
| trader_tokens | false | true |
| cashback | false | true |
| token_program | false | false |
| system_program | false | false |

Arguments: `[{"name": "tokens", "type": "u64"}, {"name": "min_net_sol", "type": "u64"}, {"name": "min_sol_per_component", "type": {"vec": "u64"}}]`

## claim_creator_fee

Discriminator: `1a618acb84ab8dfc`

| Account | Signer | Writable |
|---|---|---|
| owner | true | true |
| market | false | true |

Arguments: `[]`

## claim_platform_fee

Discriminator: `9c27d0874ced3d48`

| Account | Signer | Writable |
|---|---|---|
| owner | true | true |
| market | false | true |

Arguments: `[]`

## claim_cashback

Discriminator: `253a237ebe35e4c5`

| Account | Signer | Writable |
|---|---|---|
| owner | true | true |
| market | false | true |
| cashback | false | true |

Arguments: `[]`

