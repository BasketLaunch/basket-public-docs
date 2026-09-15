import { PublicKey, TransactionInstruction, type Connection } from '@solana/web3.js';
export declare const V1_TRANSACTION_BYTE_LIMIT = 4096;
export declare const V1_TRANSACTION_ACCOUNT_LIMIT = 64;
export declare const V1_INSTRUCTION_TRACE_LIMIT = 64;
export declare const TX_V1_FEATURE: PublicKey;
/** Compile the exact single-signature v1 message. Transaction v1 never uses lookup tables. */
export declare function compileBasketV1Transaction(payer: PublicKey, recentBlockhash: string, lastValidBlockHeight: number, instructions: TransactionInstruction[]): {
    version: 1;
    transaction: Readonly<import("@solana/kit").TransactionWithBlockhashLifetime & Readonly<{
        messageBytes: import("@solana/kit").TransactionMessageBytes;
        signatures: import("@solana/kit").SignaturesMap;
    }>>;
    wireTransaction: Uint8Array<ArrayBuffer>;
    messageBase58: string;
    bytes: number;
    accounts: number;
};
/** Read-only exact-byte simulation. Call this before opening any wallet prompt. */
export declare function prepareBasketV1Transaction(connection: Pick<Connection, 'rpcEndpoint' | 'getGenesisHash' | 'getLatestBlockhashAndContext' | 'getAccountInfoAndContext'>, payer: PublicKey, instructions: TransactionInstruction[], quoteSlot: number): Promise<{
    version: 1;
    transaction: Readonly<import("@solana/kit").TransactionWithBlockhashLifetime & Readonly<{
        messageBytes: import("@solana/kit").TransactionMessageBytes;
        signatures: import("@solana/kit").SignaturesMap;
    }>>;
    wireTransaction: Uint8Array<ArrayBuffer>;
    messageBase58: string;
    bytes: number;
    accounts: number;
    blockhash: string;
    lastValidBlockHeight: number;
    minContextSlot: number;
    computeUnits: number;
}>;
//# sourceMappingURL=transaction-v1.d.ts.map