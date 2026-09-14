declare const idl: {
    readonly address: "149WKoc5878Sx5EWjHGhPBL4vsoogY9og7ffkzdu39LM";
    readonly metadata: {
        readonly name: "basket";
        readonly version: "0.1.0";
        readonly spec: "0.1.0";
    };
    readonly docs: readonly ["Development contract. Website execution stays disabled until the complete release gates pass."];
    readonly instructions: readonly [{
        readonly name: "initialize_config";
        readonly discriminator: readonly [208, 127, 21, 1, 194, 190, 196, 70];
        readonly accounts: readonly [{
            readonly name: "authority";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "program_data";
        }, {
            readonly name: "config";
            readonly writable: true;
        }, {
            readonly name: "system_program";
        }];
        readonly args: readonly [{
            readonly name: "treasury";
            readonly type: "pubkey";
        }];
    }, {
        readonly name: "prepare_quote";
        readonly docs: readonly ["Permissionless empty settlement-account preparation; no basket assets move."];
        readonly discriminator: readonly [48, 11, 204, 55, 157, 229, 230, 116];
        readonly accounts: readonly [{
            readonly name: "payer";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "router";
            readonly writable: true;
        }, {
            readonly name: "quote_mint";
        }, {
            readonly name: "quote";
            readonly writable: true;
        }, {
            readonly name: "token_program";
        }, {
            readonly name: "system_program";
        }];
        readonly args: readonly [{
            readonly name: "_basket_mint";
            readonly type: "pubkey";
        }];
    }, {
        readonly name: "prepare_direct_quote";
        readonly discriminator: readonly [231, 124, 126, 41, 95, 16, 151, 169];
        readonly accounts: readonly [{
            readonly name: "payer";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "router";
            readonly writable: true;
        }, {
            readonly name: "quote_mint";
        }, {
            readonly name: "quote";
            readonly writable: true;
        }, {
            readonly name: "token_program";
        }, {
            readonly name: "system_program";
        }];
        readonly args: readonly [{
            readonly name: "_trader";
            readonly type: "pubkey";
        }, {
            readonly name: "_mint";
            readonly type: "pubkey";
        }];
    }, {
        readonly name: "direct_buy";
        readonly discriminator: readonly [171, 3, 255, 153, 253, 167, 79, 66];
        readonly accounts: readonly [{
            readonly name: "trader";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "config";
        }, {
            readonly name: "treasury";
            readonly writable: true;
        }, {
            readonly name: "mint";
        }, {
            readonly name: "router";
            readonly writable: true;
        }, {
            readonly name: "trader_tokens";
            readonly writable: true;
        }, {
            readonly name: "token_program";
        }, {
            readonly name: "system_program";
        }];
        readonly args: readonly [{
            readonly name: "gross_sol";
            readonly type: "u64";
        }, {
            readonly name: "min_tokens";
            readonly type: "u64";
        }];
    }, {
        readonly name: "direct_sell";
        readonly discriminator: readonly [222, 174, 226, 243, 90, 149, 86, 47];
        readonly accounts: readonly [{
            readonly name: "trader";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "config";
        }, {
            readonly name: "treasury";
            readonly writable: true;
        }, {
            readonly name: "mint";
        }, {
            readonly name: "router";
            readonly writable: true;
        }, {
            readonly name: "trader_tokens";
            readonly writable: true;
        }, {
            readonly name: "token_program";
        }, {
            readonly name: "system_program";
        }];
        readonly args: readonly [{
            readonly name: "tokens";
            readonly type: "u64";
        }, {
            readonly name: "min_net_sol";
            readonly type: "u64";
        }, {
            readonly name: "min_gross_sol";
            readonly type: "u64";
        }];
    }, {
        readonly name: "set_buys_paused";
        readonly docs: readonly ["Pausing blocks new exposure, while existing holders retain the implemented sell path."];
        readonly discriminator: readonly [198, 216, 178, 80, 242, 57, 217, 40];
        readonly accounts: readonly [{
            readonly name: "authority";
            readonly signer: true;
        }, {
            readonly name: "config";
            readonly writable: true;
        }];
        readonly args: readonly [{
            readonly name: "paused";
            readonly type: "bool";
        }];
    }, {
        readonly name: "activate_and_buy";
        readonly docs: readonly ["All constituent acquisitions, recipe creation, fees and issuance roll back together.", "Creator co-signs the immutable terms in this transaction."];
        readonly discriminator: readonly [242, 137, 167, 50, 71, 240, 255, 111];
        readonly accounts: readonly [{
            readonly name: "buyer";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "creator";
            readonly signer: true;
        }, {
            readonly name: "config";
        }, {
            readonly name: "mint";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly writable: true;
        }, {
            readonly name: "router";
            readonly writable: true;
        }, {
            readonly name: "supply_vault";
            readonly writable: true;
        }, {
            readonly name: "buyer_tokens";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "token_program";
        }, {
            readonly name: "system_program";
        }];
        readonly args: readonly [{
            readonly name: "weights";
            readonly type: {
                readonly vec: "u16";
            };
        }, {
            readonly name: "min_components";
            readonly type: {
                readonly vec: "u64";
            };
        }, {
            readonly name: "gross_sol";
            readonly type: "u64";
        }, {
            readonly name: "min_tokens";
            readonly type: "u64";
        }, {
            readonly name: "creator_share_bps";
            readonly type: "u16";
        }, {
            readonly name: "identity";
            readonly type: {
                readonly defined: {
                    readonly name: "BasketIdentity";
                };
            };
        }];
    }, {
        readonly name: "activate_atomic";
        readonly docs: readonly ["Single-wallet creation. The mint and buyer token account are deterministic", "accounts created by the program, so the buyer is the only required signer."];
        readonly discriminator: readonly [11, 86, 64, 196, 91, 53, 110, 61];
        readonly accounts: readonly [{
            readonly name: "buyer";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "config";
        }, {
            readonly name: "mint";
            readonly writable: true;
        }, {
            readonly name: "market";
            readonly writable: true;
        }, {
            readonly name: "router";
            readonly writable: true;
        }, {
            readonly name: "supply_vault";
            readonly writable: true;
        }, {
            readonly name: "buyer_tokens";
            readonly writable: true;
        }, {
            readonly name: "token_program";
        }, {
            readonly name: "associated_token_program";
        }, {
            readonly name: "system_program";
        }];
        readonly args: readonly [{
            readonly name: "weights";
            readonly type: {
                readonly vec: "u16";
            };
        }, {
            readonly name: "min_components";
            readonly type: {
                readonly vec: "u64";
            };
        }, {
            readonly name: "gross_sol";
            readonly type: "u64";
        }, {
            readonly name: "min_tokens";
            readonly type: "u64";
        }, {
            readonly name: "creator_share_bps";
            readonly type: "u16";
        }, {
            readonly name: "identity";
            readonly type: {
                readonly defined: {
                    readonly name: "BasketIdentity";
                };
            };
        }];
    }, {
        readonly name: "activate_from_manifest";
        readonly docs: readonly ["A zero-dev-buy creator authorizes fixed terms off-chain; the first buyer pays atomically."];
        readonly discriminator: readonly [91, 104, 223, 152, 196, 79, 139, 213];
        readonly accounts: readonly [{
            readonly name: "buyer";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "config";
        }, {
            readonly name: "mint";
            readonly writable: true;
        }, {
            readonly name: "market";
            readonly writable: true;
        }, {
            readonly name: "router";
            readonly writable: true;
        }, {
            readonly name: "supply_vault";
            readonly writable: true;
        }, {
            readonly name: "buyer_tokens";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "token_program";
        }, {
            readonly name: "system_program";
        }, {
            readonly name: "instructions";
        }];
        readonly args: readonly [{
            readonly name: "authorization";
            readonly type: {
                readonly defined: {
                    readonly name: "ManifestAuthorization";
                };
            };
        }, {
            readonly name: "weights";
            readonly type: {
                readonly vec: "u16";
            };
        }, {
            readonly name: "min_components";
            readonly type: {
                readonly vec: "u64";
            };
        }, {
            readonly name: "gross_sol";
            readonly type: "u64";
        }, {
            readonly name: "min_tokens";
            readonly type: "u64";
        }, {
            readonly name: "creator_share_bps";
            readonly type: "u16";
        }, {
            readonly name: "identity";
            readonly type: {
                readonly defined: {
                    readonly name: "BasketIdentity";
                };
            };
        }];
    }, {
        readonly name: "buy";
        readonly discriminator: readonly [102, 6, 61, 18, 1, 218, 235, 234];
        readonly accounts: readonly [{
            readonly name: "trader";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "config";
        }, {
            readonly name: "market";
            readonly writable: true;
        }, {
            readonly name: "router";
            readonly writable: true;
        }, {
            readonly name: "mint";
            readonly writable: true;
        }, {
            readonly name: "supply_vault";
            readonly writable: true;
        }, {
            readonly name: "trader_tokens";
            readonly writable: true;
        }, {
            readonly name: "cashback";
            readonly writable: true;
        }, {
            readonly name: "token_program";
        }, {
            readonly name: "system_program";
        }];
        readonly args: readonly [{
            readonly name: "gross_sol";
            readonly type: "u64";
        }, {
            readonly name: "composite";
            readonly type: "u64";
        }, {
            readonly name: "min_tokens";
            readonly type: "u64";
        }, {
            readonly name: "max_sol_per_component";
            readonly type: {
                readonly vec: "u64";
            };
        }];
    }, {
        readonly name: "sell";
        readonly discriminator: readonly [51, 230, 133, 164, 1, 127, 131, 173];
        readonly accounts: readonly [{
            readonly name: "trader";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "config";
        }, {
            readonly name: "market";
            readonly writable: true;
        }, {
            readonly name: "router";
            readonly writable: true;
        }, {
            readonly name: "mint";
            readonly writable: true;
        }, {
            readonly name: "supply_vault";
            readonly writable: true;
        }, {
            readonly name: "trader_tokens";
            readonly writable: true;
        }, {
            readonly name: "cashback";
            readonly writable: true;
        }, {
            readonly name: "token_program";
        }, {
            readonly name: "system_program";
        }];
        readonly args: readonly [{
            readonly name: "tokens";
            readonly type: "u64";
        }, {
            readonly name: "min_net_sol";
            readonly type: "u64";
        }, {
            readonly name: "min_sol_per_component";
            readonly type: {
                readonly vec: "u64";
            };
        }];
    }, {
        readonly name: "finalize_metadata";
        readonly docs: readonly ["Publish immutable Metaplex metadata after the financially atomic launch.", "The creator-funded reserve repays the permissionless cranker and returns excess."];
        readonly discriminator: readonly [206, 92, 87, 146, 80, 171, 38, 111];
        readonly accounts: readonly [{
            readonly name: "cranker";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly writable: true;
        }, {
            readonly name: "router";
            readonly writable: true;
        }, {
            readonly name: "mint";
            readonly writable: true;
        }, {
            readonly name: "metadata_payer";
            readonly writable: true;
        }, {
            readonly name: "metadata";
            readonly writable: true;
        }, {
            readonly name: "metadata_program";
        }, {
            readonly name: "token_program";
        }, {
            readonly name: "system_program";
        }];
        readonly args: readonly [];
    }, {
        readonly name: "claim_creator_fee";
        readonly discriminator: readonly [26, 97, 138, 203, 132, 171, 141, 252];
        readonly accounts: readonly [{
            readonly name: "owner";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly writable: true;
        }, {
            readonly name: "router";
            readonly writable: true;
        }, {
            readonly name: "system_program";
        }];
        readonly args: readonly [];
    }, {
        readonly name: "claim_platform_fee";
        readonly discriminator: readonly [156, 39, 208, 135, 76, 237, 61, 72];
        readonly accounts: readonly [{
            readonly name: "owner";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly writable: true;
        }, {
            readonly name: "router";
            readonly writable: true;
        }, {
            readonly name: "system_program";
        }];
        readonly args: readonly [];
    }, {
        readonly name: "claim_cashback";
        readonly discriminator: readonly [37, 58, 35, 126, 190, 53, 228, 197];
        readonly accounts: readonly [{
            readonly name: "owner";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly writable: true;
        }, {
            readonly name: "cashback";
            readonly writable: true;
        }, {
            readonly name: "router";
            readonly writable: true;
        }, {
            readonly name: "system_program";
        }];
        readonly args: readonly [];
    }];
    readonly accounts: readonly [{
        readonly name: "BasketMarket";
        readonly discriminator: readonly [59, 94, 108, 97, 53, 216, 244, 245];
    }, {
        readonly name: "Config";
        readonly discriminator: readonly [155, 12, 170, 224, 30, 250, 204, 130];
    }, {
        readonly name: "Cashback";
        readonly discriminator: readonly [230, 139, 9, 221, 63, 157, 62, 30];
    }];
    readonly types: readonly [{
        readonly name: "BasketMarket";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "fees";
                readonly type: {
                    readonly defined: {
                        readonly name: "FeeLedger";
                    };
                };
            }, {
                readonly name: "creator";
                readonly type: "pubkey";
            }, {
                readonly name: "treasury";
                readonly type: "pubkey";
            }, {
                readonly name: "mint";
                readonly type: "pubkey";
            }, {
                readonly name: "mints";
                readonly type: {
                    readonly array: readonly ["pubkey", 4];
                };
            }, {
                readonly name: "vaults";
                readonly type: {
                    readonly array: readonly ["pubkey", 4];
                };
            }, {
                readonly name: "weights";
                readonly type: {
                    readonly array: readonly ["u16", 4];
                };
            }, {
                readonly name: "recipe";
                readonly type: {
                    readonly array: readonly ["u64", 4];
                };
            }, {
                readonly name: "recipe_notional";
                readonly type: "u64";
            }, {
                readonly name: "metadata_hash";
                readonly type: {
                    readonly array: readonly ["u8", 32];
                };
            }, {
                readonly name: "name";
                readonly type: "string";
            }, {
                readonly name: "symbol";
                readonly type: "string";
            }, {
                readonly name: "uri";
                readonly type: "string";
            }, {
                readonly name: "metadata_payer";
                readonly type: "pubkey";
            }, {
                readonly name: "metadata_reserve";
                readonly type: "u64";
            }, {
                readonly name: "initial_cashback_owner";
                readonly type: "pubkey";
            }, {
                readonly name: "initial_cashback";
                readonly type: "u64";
            }, {
                readonly name: "issued_tokens";
                readonly type: "u64";
            }, {
                readonly name: "virtual_token";
                readonly type: "u64";
            }, {
                readonly name: "virtual_composite";
                readonly type: "u64";
            }, {
                readonly name: "real_token";
                readonly type: "u64";
            }, {
                readonly name: "real_composite";
                readonly type: "u64";
            }, {
                readonly name: "volume_sol";
                readonly type: "u128";
            }, {
                readonly name: "trade_count";
                readonly type: "u64";
            }, {
                readonly name: "creator_share_bps";
                readonly type: "u16";
            }, {
                readonly name: "component_count";
                readonly type: "u8";
            }, {
                readonly name: "bump";
                readonly type: "u8";
            }, {
                readonly name: "router_bump";
                readonly type: "u8";
            }];
        };
    }, {
        readonly name: "Config";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "authority";
                readonly type: "pubkey";
            }, {
                readonly name: "treasury";
                readonly type: "pubkey";
            }, {
                readonly name: "buys_paused";
                readonly type: "bool";
            }];
        };
    }, {
        readonly name: "Cashback";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "claimable";
                readonly type: "u64";
            }];
        };
    }, {
        readonly name: "FeeLedger";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "platform";
                readonly type: "u64";
            }, {
                readonly name: "creator";
                readonly type: "u64";
            }, {
                readonly name: "cashback";
                readonly type: "u64";
            }];
        };
    }, {
        readonly name: "BasketIdentity";
        readonly docs: readonly ["These fields are co-signed by the creator and written to Metaplex during activation."];
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "name";
                readonly type: "string";
            }, {
                readonly name: "symbol";
                readonly type: "string";
            }, {
                readonly name: "uri";
                readonly type: "string";
            }, {
                readonly name: "json_sha256";
                readonly docs: readonly ["SHA-256 of the permanent JSON bytes. Clients must verify the content before signing."];
                readonly type: {
                    readonly array: readonly ["u8", 32];
                };
            }];
        };
    }, {
        readonly name: "ManifestAuthorization";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "creator";
                readonly type: "pubkey";
            }, {
                readonly name: "basket_id";
                readonly type: {
                    readonly array: readonly ["u8", 16];
                };
            }, {
                readonly name: "nonce";
                readonly type: {
                    readonly array: readonly ["u8", 16];
                };
            }, {
                readonly name: "expires_at";
                readonly type: "i64";
            }];
        };
    }, {
        readonly name: "DirectTradeExecuted";
        readonly type: {
            readonly fields: readonly [{
                readonly name: "trader";
                readonly type: "pubkey";
            }, {
                readonly name: "mint";
                readonly type: "pubkey";
            }, {
                readonly name: "buy";
                readonly type: "bool";
            }, {
                readonly name: "tokens";
                readonly type: "u64";
            }, {
                readonly name: "gross_sol";
                readonly type: "u64";
            }, {
                readonly name: "venue_sol";
                readonly type: "u64";
            }, {
                readonly name: "fee_sol";
                readonly type: "u64";
            }, {
                readonly name: "refund_sol";
                readonly type: "u64";
            }];
            readonly kind: "struct";
        };
    }, {
        readonly name: "TradeExecuted";
        readonly type: {
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "trader";
                readonly type: "pubkey";
            }, {
                readonly name: "sequence";
                readonly type: "u64";
            }, {
                readonly name: "buy";
                readonly type: "bool";
            }, {
                readonly name: "tokens";
                readonly type: "u64";
            }, {
                readonly name: "composite";
                readonly type: "u64";
            }, {
                readonly name: "gross_sol";
                readonly type: "u64";
            }, {
                readonly name: "refund_sol";
                readonly type: "u64";
            }, {
                readonly name: "platform_fee";
                readonly type: "u64";
            }, {
                readonly name: "creator_fee";
                readonly type: "u64";
            }, {
                readonly name: "cashback";
                readonly type: "u64";
            }];
            readonly kind: "struct";
        };
    }, {
        readonly name: "BuysPaused";
        readonly type: {
            readonly fields: readonly [{
                readonly name: "paused";
                readonly type: "bool";
            }];
            readonly kind: "struct";
        };
    }, {
        readonly name: "FeeClaimed";
        readonly type: {
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "owner";
                readonly type: "pubkey";
            }, {
                readonly name: "kind";
                readonly type: "u8";
            }, {
                readonly name: "lamports";
                readonly type: "u64";
            }];
            readonly kind: "struct";
        };
    }, {
        readonly name: "MarketGraduated";
        readonly type: {
            readonly fields: readonly [{
                readonly name: "mint";
                readonly type: "pubkey";
            }, {
                readonly name: "pool_tokens";
                readonly type: "u64";
            }, {
                readonly name: "composite";
                readonly type: "u64";
            }, {
                readonly name: "locked_tokens";
                readonly type: "u64";
            }];
            readonly kind: "struct";
        };
    }, {
        readonly name: "MarketActivated";
        readonly type: {
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "creator";
                readonly type: "pubkey";
            }, {
                readonly name: "mint";
                readonly type: "pubkey";
            }, {
                readonly name: "mints";
                readonly type: {
                    readonly array: readonly ["pubkey", 4];
                };
            }, {
                readonly name: "weights";
                readonly type: {
                    readonly array: readonly ["u16", 4];
                };
            }, {
                readonly name: "recipe";
                readonly type: {
                    readonly array: readonly ["u64", 4];
                };
            }, {
                readonly name: "recipe_notional";
                readonly type: "u64";
            }, {
                readonly name: "metadata_hash";
                readonly type: {
                    readonly array: readonly ["u8", 32];
                };
            }, {
                readonly name: "creator_share_bps";
                readonly type: "u16";
            }];
            readonly kind: "struct";
        };
    }];
    readonly events: readonly [{
        readonly discriminator: readonly [82, 149, 149, 104, 213, 77, 80, 58];
        readonly name: "DirectTradeExecuted";
    }, {
        readonly discriminator: readonly [41, 110, 64, 129, 60, 79, 179, 80];
        readonly name: "TradeExecuted";
    }, {
        readonly discriminator: readonly [81, 41, 138, 93, 20, 219, 184, 33];
        readonly name: "BuysPaused";
    }, {
        readonly discriminator: readonly [202, 108, 15, 80, 101, 18, 217, 158];
        readonly name: "FeeClaimed";
    }, {
        readonly discriminator: readonly [66, 242, 94, 146, 88, 76, 225, 23];
        readonly name: "MarketGraduated";
    }, {
        readonly discriminator: readonly [196, 73, 78, 48, 187, 132, 107, 11];
        readonly name: "MarketActivated";
    }];
    readonly errors: readonly [{
        readonly code: 6000;
        readonly name: "Identity";
        readonly msg: "Invalid basket name, symbol or permanent metadata reference";
    }, {
        readonly code: 6001;
        readonly name: "Components";
        readonly msg: "Choose 1–4 distinct components";
    }, {
        readonly code: 6002;
        readonly name: "Weights";
        readonly msg: "Weights must total 10,000 basis points";
    }, {
        readonly code: 6003;
        readonly name: "Amount";
        readonly msg: "Invalid or dust amount";
    }, {
        readonly code: 6004;
        readonly name: "Math";
        readonly msg: "Arithmetic overflow";
    }, {
        readonly code: 6005;
        readonly name: "Origin";
        readonly msg: "Unproven official Pump origin";
    }, {
        readonly code: 6006;
        readonly name: "Vault";
        readonly msg: "Invalid reserve or token account";
    }, {
        readonly code: 6007;
        readonly name: "Delta";
        readonly msg: "Actual balance delta mismatch";
    }, {
        readonly code: 6008;
        readonly name: "Slippage";
        readonly msg: "Slippage or liquidity limit exceeded";
    }, {
        readonly code: 6009;
        readonly name: "Supply";
        readonly msg: "Curve supply limit exceeded";
    }, {
        readonly code: 6010;
        readonly name: "Authority";
        readonly msg: "Unauthorized signer";
    }, {
        readonly code: 6011;
        readonly name: "Paused";
        readonly msg: "New buys are paused";
    }, {
        readonly code: 6012;
        readonly name: "FeeBalance";
        readonly msg: "Fee liabilities exceed SOL backing";
    }, {
        readonly code: 6013;
        readonly name: "Route";
        readonly msg: "Invalid supported-venue route account";
    }, {
        readonly code: 6014;
        readonly name: "UnsupportedRoute";
        readonly msg: "This venue, market state or quote currency is not supported";
    }, {
        readonly code: 6015;
        readonly name: "UnsupportedToken";
        readonly msg: "Unsupported token authority or extension";
    }, {
        readonly code: 6016;
        readonly name: "Reserve";
        readonly msg: "Insufficient constituent backing";
    }, {
        readonly code: 6017;
        readonly name: "Manifest";
        readonly msg: "Invalid or expired creator manifest";
    }, {
        readonly code: 6018;
        readonly name: "Metadata";
        readonly msg: "Metadata reserve or finalization is invalid";
    }];
};
export default idl;
//# sourceMappingURL=idl.d.ts.map