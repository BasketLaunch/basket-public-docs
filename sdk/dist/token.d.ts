import { Buffer } from 'buffer';
import { PublicKey, TransactionInstruction, type AccountInfo } from '@solana/web3.js';
export declare const TOKEN_PROGRAM_ID: PublicKey;
export declare const TOKEN_2022_PROGRAM_ID: PublicKey;
export declare const ASSOCIATED_TOKEN_PROGRAM_ID: PublicKey;
export declare const NATIVE_MINT: PublicKey;
export declare function unpackMint(address: PublicKey, info: AccountInfo<Buffer>, programId: PublicKey): {
    address: PublicKey;
    mintAuthority: PublicKey | null;
    supply: bigint;
    decimals: number;
    isInitialized: boolean;
    freezeAuthority: PublicKey | null;
};
export declare function unpackAccount(address: PublicKey, info: AccountInfo<Buffer>, programId: PublicKey): {
    address: PublicKey;
    mint: PublicKey;
    owner: PublicKey;
    amount: bigint;
    delegate: PublicKey | null;
    isInitialized: boolean;
    isNative: boolean;
    closeAuthority: PublicKey | null;
};
export declare function getAssociatedTokenAddressSync(mint: PublicKey, owner: PublicKey, allowOwnerOffCurve?: boolean, programId?: PublicKey): PublicKey;
export declare function createAssociatedTokenAccountIdempotentInstruction(payer: PublicKey, associatedToken: PublicKey, owner: PublicKey, mint: PublicKey, programId?: PublicKey): TransactionInstruction;
//# sourceMappingURL=token.d.ts.map