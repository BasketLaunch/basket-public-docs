import { Buffer } from 'buffer';
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
export const NATIVE_MINT = new PublicKey('So11111111111111111111111111111111111111112');
function optionalKey(data, optionOffset, keyOffset) {
    const option = data.readUInt32LE(optionOffset);
    if (option === 0)
        return null;
    if (option !== 1)
        throw new Error('Invalid token authority option');
    return new PublicKey(data.subarray(keyOffset, keyOffset + 32));
}
export function unpackMint(address, info, programId) {
    if (!info.owner.equals(programId) || info.executable || info.data.length < 82)
        throw new Error('Invalid token mint account');
    return {
        address,
        mintAuthority: optionalKey(info.data, 0, 4),
        supply: info.data.readBigUInt64LE(36),
        decimals: info.data[44],
        isInitialized: info.data[45] === 1,
        freezeAuthority: optionalKey(info.data, 46, 50),
    };
}
export function unpackAccount(address, info, programId) {
    if (!info.owner.equals(programId) || info.executable || info.data.length < 165)
        throw new Error('Invalid token account');
    const nativeOption = info.data.readUInt32LE(109);
    if (nativeOption !== 0 && nativeOption !== 1)
        throw new Error('Invalid native token option');
    return {
        address,
        mint: new PublicKey(info.data.subarray(0, 32)),
        owner: new PublicKey(info.data.subarray(32, 64)),
        amount: info.data.readBigUInt64LE(64),
        delegate: optionalKey(info.data, 72, 76),
        isInitialized: info.data[108] !== 0,
        isNative: nativeOption === 1,
        closeAuthority: optionalKey(info.data, 129, 133),
    };
}
export function getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve = false, programId = TOKEN_PROGRAM_ID) {
    if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBytes()))
        throw new Error('Token owner is off curve');
    return PublicKey.findProgramAddressSync([owner.toBuffer(), programId.toBuffer(), mint.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID)[0];
}
export function createAssociatedTokenAccountIdempotentInstruction(payer, associatedToken, owner, mint, programId = TOKEN_PROGRAM_ID) {
    return new TransactionInstruction({
        programId: ASSOCIATED_TOKEN_PROGRAM_ID,
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: associatedToken, isSigner: false, isWritable: true },
            { pubkey: owner, isSigner: false, isWritable: false },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from([1]),
    });
}
//# sourceMappingURL=token.js.map