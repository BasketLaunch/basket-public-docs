import { Buffer } from 'buffer';
import { PublicKey, TransactionInstruction, type AccountInfo, type AccountMeta, type Connection } from '@solana/web3.js';
export declare const BASKET_PROGRAM_ID: PublicKey;
export declare function basketAddresses(mint: PublicKey, trader: PublicKey): {
    config: PublicKey;
    market: PublicKey;
    router: PublicKey;
    supplyVault: PublicKey;
    cashback: PublicKey;
};
export declare function basketReserveAddress(router: PublicKey, mint: PublicKey): PublicKey;
export declare const BASKET_COMPONENTS_ACCOUNT_SIZE = 337;
export declare function basketComponentsAddress(mint: PublicKey): PublicKey;
export declare function atomicBasketMint(creator: string | PublicKey, metadataHash: string | Uint8Array): PublicKey;
/** Decode only the pinned program's canonical market, preserving integer precision. */
export declare function decodeBasketMarket(address: PublicKey, account: AccountInfo<Buffer>, tokenProgram?: PublicKey, componentAccount?: AccountInfo<Buffer> | null): {
    address: PublicKey;
    mint: PublicKey;
    tokenProgram: PublicKey;
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
};
export type BasketState = ReturnType<typeof decodeBasketMarket>;
export declare function readBasketMarket(rpc: Pick<Connection, 'getGenesisHash' | 'getMultipleAccountsInfoAndContext'>, mint: PublicKey, minContextSlot?: number): Promise<{
    address: PublicKey;
    mint: PublicKey;
    tokenProgram: PublicKey;
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
}>;
/** Read the complete public reserve from one consistent RPC snapshot for indexers and trading terminals. */
export declare function readBasketReserve(rpc: Pick<Connection, 'getGenesisHash' | 'getMultipleAccountsInfoAndContext'>, mint: PublicKey, minContextSlot?: number): Promise<{
    address: PublicKey;
    mint: PublicKey;
    tokenProgram: PublicKey;
    creator: PublicKey;
    treasury: PublicKey;
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
    components: {
        mint: PublicKey;
        weightBps: number;
        vault: PublicKey;
        recipe: bigint;
        balance: bigint;
        tokenProgram: PublicKey;
    }[];
    slot: number;
    buysPaused: boolean;
}>;
export type BasketIdentityInput = {
    name: string;
    symbol: string;
    uri: string;
    jsonSha256: number[];
};
export declare function buildBasketActivation(input: {
    buyer: PublicKey;
    creator: PublicKey;
    mint: PublicKey;
    buyerTokens: PublicKey;
    weights: number[];
    minComponents: bigint[];
    grossSol: bigint;
    minTokens: bigint;
    creatorShareBps: number;
    identity: BasketIdentityInput;
    routes: AccountMeta[];
}): TransactionInstruction;
export declare function buildAtomicBasketActivation(input: {
    buyer: PublicKey;
    mint: PublicKey;
    weights: number[];
    minComponents: bigint[];
    grossSol: bigint;
    minTokens: bigint;
    creatorShareBps: number;
    identity: BasketIdentityInput;
    routes: AccountMeta[];
}): TransactionInstruction;
type TradeContext = {
    state: BasketState;
    trader: PublicKey;
    traderTokens: PublicKey;
    routes: AccountMeta[];
};
export declare function buildBasketBuy({ state, trader, traderTokens, routes, grossSol, composite, minTokens, componentBudgets }: TradeContext & {
    grossSol: bigint;
    composite: bigint;
    minTokens: bigint;
    componentBudgets: bigint[];
}): TransactionInstruction;
export declare function buildBasketSell({ state, trader, traderTokens, routes, tokens, minNetSol, componentMinimums }: TradeContext & {
    tokens: bigint;
    minNetSol: bigint;
    componentMinimums: bigint[];
}): TransactionInstruction;
export declare function buildBasketClaim(state: BasketState, owner: PublicKey, kind: 'creator' | 'platform' | 'cashback'): TransactionInstruction;
export declare function buildFinalizeMetadata(state: BasketState, cranker: PublicKey): TransactionInstruction;
/** Append to an atomic launch so metadata and authority revocation share its signature. */
export declare function buildFinalizeMetadataForMint(mint: PublicKey, cranker: PublicKey, metadataPayer?: PublicKey, tokenProgram?: PublicKey): TransactionInstruction;
export declare function buildPrepareQuote(mint: PublicKey, payer: PublicKey): TransactionInstruction;
export declare function readCashback(rpc: Pick<Connection, 'getGenesisHash' | 'getMultipleAccountsInfo'>, mint: PublicKey, owner: PublicKey): Promise<bigint>;
export {};
//# sourceMappingURL=basket-client.d.ts.map