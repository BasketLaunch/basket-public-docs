import { AddressLookupTableAccount, Connection, PublicKey, VersionedTransaction, type AccountMeta, type Commitment, type TransactionInstruction } from '@solana/web3.js';
import { type BasketState } from './basket-client.js';
export type VenueLeg = {
    mint: PublicKey;
    accounts: AccountMeta[];
    maxBuyTokens: bigint;
    buyCost(tokens: bigint): bigint;
    sellProceeds(tokens: bigint): bigint;
};
export type BasketRouteSnapshot = {
    state: BasketState;
    legs: VenueLeg[];
    slot: number;
};
export type BasketRouteAdapter = (input: {
    connection: Connection;
    state: BasketState;
    side: 'Buy' | 'Sell';
    minContextSlot: number;
}) => Promise<{
    legs: VenueLeg[];
    slot: number;
}>;
export type PrepareBuyInput = {
    connection: Connection;
    mint: PublicKey;
    trader: PublicKey;
    grossSol: bigint;
    routeAdapter: BasketRouteAdapter;
    slippageBps?: number;
    minContextSlot?: number;
};
export type PrepareSellInput = {
    connection: Connection;
    mint: PublicKey;
    trader: PublicKey;
    tokens: bigint;
    routeAdapter: BasketRouteAdapter;
    slippageBps?: number;
    minContextSlot?: number;
};
/** Apply the deployed curve, fixed recipe, venue costs, protocol fees and slippage using integer arithmetic. */
export declare function quoteBasketBuy(snapshot: BasketRouteSnapshot, grossSol: bigint, slippageBps?: number): {
    grossSol: bigint;
    composite: bigint;
    minTokens: bigint;
    expectedTokens: bigint;
    componentBudgets: bigint[];
    expectedCosts: bigint[];
    fee: {
        total: bigint;
        platform: bigint;
        creator: bigint;
        cashback: bigint;
        net: bigint;
    };
    estimatedRefund: bigint;
};
/** Apply the deployed curve, fixed recipe, venue proceeds, protocol fees and slippage using integer arithmetic. */
export declare function quoteBasketSell(snapshot: BasketRouteSnapshot, tokens: bigint, slippageBps?: number): {
    tokens: bigint;
    minNetSol: bigint;
    componentMinimums: bigint[];
    expectedProceeds: bigint[];
    expectedNetSol: bigint;
    fee: {
        total: bigint;
        platform: bigint;
        creator: bigint;
        cashback: bigint;
        net: bigint;
    };
};
/** Read canonical state, ask the platform's venue adapter for fresh routes and return one atomic buy instruction set. */
export declare function prepareBasketBuy(input: PrepareBuyInput): Promise<{
    state: {
        address: PublicKey;
        mint: PublicKey;
        creator: PublicKey;
        treasury: PublicKey;
        components: {
            mint: PublicKey;
            weightBps: number;
            vault: PublicKey;
            recipe: bigint;
        }[];
        economics: {
            virtualToken: bigint;
            virtualComposite: bigint;
            realToken: bigint;
            realComposite: bigint;
            recipeAmounts: bigint[];
            recipeNotional: bigint;
            creatorShareBps: number;
            complete: boolean;
        };
        graduated: boolean;
        metadataHash: string;
        metadataPending: boolean;
        metadataPayer: PublicKey;
        initialCashbackOwner: PublicKey;
        initialCashback: bigint;
        issuedTokens: bigint;
        volumeLamports: bigint;
        tradeCount: bigint;
        fees: {
            platform: bigint;
            creator: bigint;
            cashback: bigint;
        };
        supplyVault: PublicKey;
        unsoldTokens: bigint;
        slot: number;
        buysPaused: boolean;
    };
    quote: {
        grossSol: bigint;
        composite: bigint;
        minTokens: bigint;
        expectedTokens: bigint;
        componentBudgets: bigint[];
        expectedCosts: bigint[];
        fee: {
            total: bigint;
            platform: bigint;
            creator: bigint;
            cashback: bigint;
            net: bigint;
        };
        estimatedRefund: bigint;
    };
    instructions: TransactionInstruction[];
    lookupAddresses: PublicKey[];
    slot: number;
}>;
/** Read canonical state, ask the platform's venue adapter for fresh routes and return one atomic sell instruction set. */
export declare function prepareBasketSell(input: PrepareSellInput): Promise<{
    state: {
        address: PublicKey;
        mint: PublicKey;
        creator: PublicKey;
        treasury: PublicKey;
        components: {
            mint: PublicKey;
            weightBps: number;
            vault: PublicKey;
            recipe: bigint;
        }[];
        economics: {
            virtualToken: bigint;
            virtualComposite: bigint;
            realToken: bigint;
            realComposite: bigint;
            recipeAmounts: bigint[];
            recipeNotional: bigint;
            creatorShareBps: number;
            complete: boolean;
        };
        graduated: boolean;
        metadataHash: string;
        metadataPending: boolean;
        metadataPayer: PublicKey;
        initialCashbackOwner: PublicKey;
        initialCashback: bigint;
        issuedTokens: bigint;
        volumeLamports: bigint;
        tradeCount: bigint;
        fees: {
            platform: bigint;
            creator: bigint;
            cashback: bigint;
        };
        supplyVault: PublicKey;
        unsoldTokens: bigint;
        slot: number;
        buysPaused: boolean;
    };
    quote: {
        tokens: bigint;
        minNetSol: bigint;
        componentMinimums: bigint[];
        expectedProceeds: bigint[];
        expectedNetSol: bigint;
        fee: {
            total: bigint;
            platform: bigint;
            creator: bigint;
            cashback: bigint;
            net: bigint;
        };
    };
    instructions: TransactionInstruction[];
    lookupAddresses: PublicKey[];
    slot: number;
}>;
/** Compile prepared instructions into the single versioned transaction shown to the wallet. */
export declare function buildBasketTransaction(input: {
    connection: Connection;
    payer: PublicKey;
    instructions: TransactionInstruction[];
    lookupTables?: AddressLookupTableAccount[];
    commitment?: Commitment;
}): Promise<{
    blockhash: import("@solana/web3.js").Blockhash;
    lastValidBlockHeight: number;
    transaction: VersionedTransaction;
}>;
/** Scan program-owned markets. Call readBasketMarket before displaying or trading a result. */
export declare function discoverBasketMints(connection: Connection): Promise<{
    address: PublicKey;
    mint: PublicKey;
}[]>;
/** Pin the exact deployed bytecode before enabling an adapter in production. */
export declare function verifyDeployment(connection: Connection): Promise<{
    program: PublicKey;
    programData: PublicKey;
    deploymentSlot: bigint;
    upgradeAuthority: string;
    sha256: string;
}>;
//# sourceMappingURL=integration.d.ts.map