import { PublicKey, TransactionInstruction, type Connection } from '@solana/web3.js';
export declare const V1_TRANSACTION_BYTE_LIMIT = 4096;
export declare const V1_TRANSACTION_ACCOUNT_LIMIT = 64;
export declare const V1_INSTRUCTION_TRACE_LIMIT = 64;
export declare const MAX_COMPUTE_UNIT_LIMIT = 1400000;
export declare const PRIORITY_FEE_LAMPORTS = 25000n;
export declare const COMPUTE_UNIT_MARGIN_BPS = 2000;
export declare const TX_V1_FEATURE: PublicKey;
export type BasketTransactionConfig = {
    /** Total priority fee in lamports. Integrators may supply their own dynamic fee. */
    priorityFeeLamports?: bigint;
    /** Headroom added to simulated compute usage. Defaults to 20%. */
    computeUnitMarginBps?: number;
};
export type BasketV1CompileConfig = BasketTransactionConfig & {
    computeUnitLimit?: number;
};
/** Compile the exact single-signature v1 message. Transaction v1 never uses lookup tables. */
export declare function compileBasketV1Transaction(payer: PublicKey, recentBlockhash: string, lastValidBlockHeight: number, instructions: TransactionInstruction[], config?: BasketV1CompileConfig): {
    version: 1;
    transaction: Readonly<import("@solana/kit").TransactionWithBlockhashLifetime & Readonly<{
        messageBytes: import("@solana/kit").TransactionMessageBytes;
        signatures: import("@solana/kit").SignaturesMap;
    }>>;
    wireTransaction: Uint8Array<ArrayBuffer>;
    messageBase58: string;
    bytes: number;
    accounts: number;
    computeUnitLimit: number;
    priorityFeeLamports: bigint;
};
/** Read-only exact-byte simulation. Call this before opening any wallet prompt. */
export declare function prepareBasketV1Transaction(connection: Pick<Connection, 'rpcEndpoint' | 'getGenesisHash' | 'getLatestBlockhashAndContext' | 'getAccountInfoAndContext'>, payer: PublicKey, instructions: TransactionInstruction[], quoteSlot: number, config?: BasketTransactionConfig): Promise<{
    version: 1;
    transaction: Readonly<import("@solana/kit").TransactionWithBlockhashLifetime & Readonly<{
        messageBytes: import("@solana/kit").TransactionMessageBytes;
        signatures: import("@solana/kit").SignaturesMap;
    }>>;
    wireTransaction: Uint8Array<ArrayBuffer>;
    messageBase58: string;
    bytes: number;
    accounts: number;
    computeUnitLimit: number;
    priorityFeeLamports: bigint;
    blockhash: string;
    lastValidBlockHeight: number;
    minContextSlot: number;
    computeUnits: number;
}>;
//# sourceMappingURL=transaction-v1.d.ts.map