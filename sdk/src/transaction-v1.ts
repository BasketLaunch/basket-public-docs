import {Buffer} from 'buffer';
import bs58 from 'bs58';
import {PublicKey,TransactionInstruction,type Connection} from '@solana/web3.js';
import {
  AccountRole,address,appendTransactionMessageInstructions,blockhash as kitBlockhash,
  compileTransaction as compileKitTransaction,createTransactionMessage,getTransactionEncoder,pipe,
  setTransactionMessageConfig,setTransactionMessageFeePayer,setTransactionMessageLifetimeUsingBlockhash,
  type Instruction,
} from '@solana/kit';
import {NETWORK_GENESIS} from './network.js';

export const V1_TRANSACTION_BYTE_LIMIT=4096;
export const V1_TRANSACTION_ACCOUNT_LIMIT=64;
export const V1_INSTRUCTION_TRACE_LIMIT=64;
export const TX_V1_FEATURE=new PublicKey('txv1aq4pp281K9um3tnPgkfX8UqtFT6wcVW3hNezGLL');

function toKitInstruction(ix:TransactionInstruction):Instruction{
  return{programAddress:address(ix.programId.toBase58()),accounts:ix.keys.map(key=>({address:address(key.pubkey.toBase58()),role:key.isSigner?(key.isWritable?AccountRole.WRITABLE_SIGNER:AccountRole.READONLY_SIGNER):(key.isWritable?AccountRole.WRITABLE:AccountRole.READONLY)})),data:Uint8Array.from(ix.data)};
}

/** Compile the exact single-signature v1 message. Transaction v1 never uses lookup tables. */
export function compileBasketV1Transaction(payer:PublicKey,recentBlockhash:string,lastValidBlockHeight:number,instructions:TransactionInstruction[]){
  if(!instructions.length)throw new Error('No transaction instructions');
  if(bs58.decode(recentBlockhash).length!==32)throw new Error('Invalid transaction blockhash');
  if(!Number.isSafeInteger(lastValidBlockHeight)||lastValidBlockHeight<1)throw new Error('Invalid transaction expiry');
  const accounts=new Set([payer.toBase58(),...instructions.flatMap(ix=>[ix.programId.toBase58(),...ix.keys.map(key=>key.pubkey.toBase58())])]);
  if(accounts.size>V1_TRANSACTION_ACCOUNT_LIMIT)throw new Error(`This transaction needs ${accounts.size} accounts; transaction v1 allows ${V1_TRANSACTION_ACCOUNT_LIMIT}.`);
  const message=pipe(createTransactionMessage({version:1}),value=>setTransactionMessageFeePayer(address(payer.toBase58()),value),value=>setTransactionMessageLifetimeUsingBlockhash({blockhash:kitBlockhash(recentBlockhash),lastValidBlockHeight:BigInt(lastValidBlockHeight)},value),value=>appendTransactionMessageInstructions(instructions.map(toKitInstruction),value),value=>setTransactionMessageConfig({computeUnitLimit:1_400_000,loadedAccountsDataSizeLimit:64*1024*1024,priorityFeeLamports:0n},value));
  const transaction=compileKitTransaction(message),wireTransaction=Uint8Array.from(getTransactionEncoder().encode(transaction));
  if(wireTransaction[0]!==0x81)throw new Error('Invalid transaction v1 encoding');
  if(wireTransaction.length>V1_TRANSACTION_BYTE_LIMIT)throw new Error(`This transaction is ${wireTransaction.length} bytes; transaction v1 allows ${V1_TRANSACTION_BYTE_LIMIT}.`);
  return{version:1 as const,transaction,wireTransaction,messageBase58:bs58.encode(Uint8Array.from(transaction.messageBytes)),bytes:wireTransaction.length,accounts:accounts.size};
}

/** Read-only exact-byte simulation. Call this before opening any wallet prompt. */
export async function prepareBasketV1Transaction(connection:Pick<Connection,'rpcEndpoint'|'getGenesisHash'|'getLatestBlockhashAndContext'|'getAccountInfoAndContext'>,payer:PublicKey,instructions:TransactionInstruction[],quoteSlot:number){
  if(!Number.isSafeInteger(quoteSlot)||quoteSlot<0)throw new Error('Invalid quote slot');
  if(await connection.getGenesisHash()!==NETWORK_GENESIS)throw new Error('RPC network does not match this SDK release');
  const feature=await connection.getAccountInfoAndContext(TX_V1_FEATURE,{commitment:'confirmed',minContextSlot:quoteSlot});
  if(!feature.value||feature.value.data.length<9||feature.value.data[0]!==1)throw new Error('Solana transaction v1 is not active on this network yet');
  const latest=await connection.getLatestBlockhashAndContext({commitment:'confirmed',minContextSlot:Math.max(quoteSlot,feature.context.slot)});
  const prepared=compileBasketV1Transaction(payer,latest.value.blockhash,latest.value.lastValidBlockHeight,instructions.map(ix=>new TransactionInstruction({programId:ix.programId,keys:ix.keys.map(key=>({...key})),data:Buffer.from(ix.data)})));
  const response=await fetch(connection.rpcEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'simulateTransaction',params:[Buffer.from(prepared.wireTransaction).toString('base64'),{encoding:'base64',commitment:'confirmed',minContextSlot:latest.context.slot,sigVerify:false,replaceRecentBlockhash:false}]}),signal:AbortSignal.timeout(15_000)});
  if(!response.ok)throw new Error('Transaction-v1 simulation service is unavailable');
  const payload=await response.json() as {error?:{message?:string};result?:{context?:{slot?:number};value?:{err?:unknown;unitsConsumed?:number}}};
  const slot=payload.result?.context?.slot,units=payload.result?.value?.unitsConsumed;
  if(payload.error||!Number.isSafeInteger(slot)||slot!<latest.context.slot||payload.result?.value?.err!=null)throw new Error(`Transaction-v1 simulation failed: ${JSON.stringify(payload.error||payload.result?.value?.err)}.`);
  if(!Number.isSafeInteger(units)||units!<=0||units!>1_400_000)throw new Error('Transaction compute usage could not be verified');
  return{...prepared,blockhash:latest.value.blockhash,lastValidBlockHeight:latest.value.lastValidBlockHeight,minContextSlot:slot!,computeUnits:units!};
}
