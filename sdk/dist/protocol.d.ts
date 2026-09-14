/** Reference economics. All token amounts are atomic units; all SOL amounts are lamports. */
export declare const MAX_COMPONENTS = 4;
export declare const BPS = 10000n;
export declare const SCALE = 1000000000n;
export declare const TOKEN_SCALE = 1000000n;
export declare const SUPPLY: bigint;
export declare const MIN_INITIAL_BUY = 100000000n;
export declare function amount(value: bigint, name?: string): bigint;
export declare function ceilDiv(n: bigint, d: bigint): bigint;
export declare function parseSol(value: string): bigint;
export declare function fees(gross: bigint, creatorShareBps: number): {
    total: bigint;
    platform: bigint;
    creator: bigint;
    cashback: bigint;
    net: bigint;
};
export type Component = {
    mint: string;
    weightBps: number;
};
export declare function validateComponents(components: Component[]): void;
export type Market = {
    virtualToken: bigint;
    virtualComposite: bigint;
    realToken: bigint;
    realComposite: bigint;
    recipeAmounts: bigint[];
    recipeNotional: bigint;
    vaults: bigint[];
    creatorShareBps: number;
    complete: boolean;
};
export declare const INITIAL_TOKEN: bigint;
export declare const INITIAL_COMPOSITE: bigint;
export declare const INITIAL_REAL_TOKEN: bigint;
export declare function isGraduated(market: Pick<Market, 'virtualToken' | 'realToken'>): boolean;
export declare function completionComposite(market: Pick<Market, 'virtualToken' | 'virtualComposite' | 'realToken'>): bigint;
export declare function buyQuote(market: Pick<Market, 'complete' | 'virtualToken' | 'virtualComposite' | 'realToken'>, composite: bigint): {
    tokens: bigint;
    virtualToken: bigint;
    virtualComposite: bigint;
};
export declare function sellQuote(market: Pick<Market, 'complete' | 'virtualToken' | 'virtualComposite' | 'realToken' | 'realComposite'>, tokens: bigint): {
    composite: bigint;
    virtualToken: bigint;
    virtualComposite: bigint;
};
/** Recipe is kept as an exact rational: activation token receipts / activation net SOL. */
export declare function componentAmounts(market: Pick<Market, 'recipeAmounts' | 'recipeNotional'>, composite: bigint, direction: 'buy' | 'sell'): bigint[];
export declare function applyBuy(market: Market, composite: bigint, actualReceipts: bigint[], minTokens: bigint): {
    market: Market;
    tokens: bigint;
};
export declare function applySell(market: Market, tokens: bigint): {
    market: Market;
    released: bigint[];
    composite: bigint;
};
export declare function activate(components: Component[], receipts: bigint[], gross: bigint, creatorShareBps: number): {
    market: Market;
    tokens: bigint;
    fees: {
        total: bigint;
        platform: bigint;
        creator: bigint;
        cashback: bigint;
        net: bigint;
    };
};
export declare function assertReserve(market: Market): void;
//# sourceMappingURL=protocol.d.ts.map