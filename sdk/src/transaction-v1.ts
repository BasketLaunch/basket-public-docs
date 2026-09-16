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
export const MAX_COMPUTE_UNIT_LIMIT=1_400_000;
export const PRIORITY_FEE_LAMPORTS=25_000n;
export const COMPUTE_UNIT_MARGIN_BPS=2_000;
export const TX_V1_FEATURE=new PublicKey('txv1aq4pp281K9um3tnPgkfX8UqtFT6wcVW3hNezGLL');

export type BasketTransactionConfig={
  /** Total priority fee in lamports. Integrators may supply their own dynamic fee. */
  priorityFeeLamports?:bigint;
  /** Headroom added to simulated compute usage. Defaults to 20%. */
  computeUnitMarginBps?:number;
};

export type BasketV1CompileConfig=BasketTransactionConfig&{computeUnitLimit?:number};

function transactionConfig(config:BasketV1CompileConfig={}){
  const priorityFeeLamports=config.priorityFeeLamports??PRIORITY_FEE_LAMPORTS;
  const computeUnitMarginBps=config.computeUnitMarginBps??COMPUTE_UNIT_MARGIN_BPS;
  const computeUnitLimit=config.computeUnitLimit??MAX_COMPUTE_UNIT_LIMIT;
  if(priorityFeeLamports<0n||priorityFeeLamports>(1n<<64n)-1n)throw new Error('Priority fee is outside u64');
  if(!Number.isInteger(computeUnitMarginBps)||computeUnitMarginBps<0||computeUnitMarginBps>10_000)throw new Error('Compute unit margin must be between 0% and 100%');
  if(!Number.isSafeInteger(computeUnitLimit)||computeUnitLimit<1||computeUnitLimit>MAX_COMPUTE_UNIT_LIMIT)throw new Error('Invalid compute unit limit');
  return{priorityFeeLamports,computeUnitMarginBps,computeUnitLimit};
}

function toKitInstruction(ix:TransactionInstruction):Instruction{
  return{programAddress:address(ix.programId.toBase58()),accounts:ix.keys.map(key=>({address:address(key.pubkey.toBase58()),role:key.isSigner?(key.isWritable?AccountRole.WRITABLE_SIGNER:AccountRole.READONLY_SIGNER):(key.isWritable?AccountRole.WRITABLE:AccountRole.READONLY)})),data:Uint8Array.from(ix.data)};
}

/** Compile the exact single-signature v1 message. Transaction v1 never uses lookup tables. */
export function compileBasketV1Transaction(payer:PublicKey,recentBlockhash:string,lastValidBlockHeight:number,instructions:TransactionInstruction[],config:BasketV1CompileConfig={}){
  if(!instructions.length)throw new Error('No transaction instructions');
  if(bs58.decode(recentBlockhash).length!==32)throw new Error('Invalid transaction blockhash');
  if(!Number.isSafeInteger(lastValidBlockHeight)||lastValidBlockHeight<1)throw new Error('Invalid transaction expiry');
  const accounts=new Set([payer.toBase58(),...instructions.flatMap(ix=>[ix.programId.toBase58(),...ix.keys.map(key=>key.pubkey.toBase58())])]);
  if(accounts.size>V1_TRANSACTION_ACCOUNT_LIMIT)throw new Error(`This transaction needs ${accounts.size} accounts; transaction v1 allows ${V1_TRANSACTION_ACCOUNT_LIMIT}.`);
  const{priorityFeeLamports,computeUnitLimit}=transactionConfig(config);
  const message=pipe(createTransactionMessage({version:1}),value=>setTransactionMessageFeePayer(address(payer.toBase58()),value),value=>setTransactionMessageLifetimeUsingBlockhash({blockhash:kitBlockhash(recentBlockhash),lastValidBlockHeight:BigInt(lastValidBlockHeight)},value),value=>appendTransactionMessageInstructions(instructions.map(toKitInstruction),value),value=>setTransactionMessageConfig({computeUnitLimit,loadedAccountsDataSizeLimit:64*1024*1024,priorityFeeLamports},value));
  const transaction=compileKitTransaction(message),wireTransaction=Uint8Array.from(getTransactionEncoder().encode(transaction));
  if(wireTransaction[0]!==0x81)throw new Error('Invalid transaction v1 encoding');
  if(wireTransaction.length>V1_TRANSACTION_BYTE_LIMIT)throw new Error(`This transaction is ${wireTransaction.length} bytes; transaction v1 allows ${V1_TRANSACTION_BYTE_LIMIT}.`);
  return{version:1 as const,transaction,wireTransaction,messageBase58:bs58.encode(Uint8Array.from(transaction.messageBytes)),bytes:wireTransaction.length,accounts:accounts.size,computeUnitLimit,priorityFeeLamports};
}

async function simulate(connection:Pick<Connection,'rpcEndpoint'>,wireTransaction:Uint8Array,minContextSlot:number){
  const response=await fetch(connection.rpcEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'simulateTransaction',params:[Buffer.from(wireTransaction).toString('base64'),{encoding:'base64',commitment:'confirmed',minContextSlot,sigVerify:false,replaceRecentBlockhash:false}]}),signal:AbortSignal.timeout(15_000)});
  const payload=await response.json().catch(()=>({})) as {error?:{message?:string};result?:{context?:{slot?:number};value?:{err?:unknown;unitsConsumed?:number}}};
  if(!response.ok)throw new Error(payload.error?.message||'Transaction-v1 simulation service is unavailable');
  const slot=payload.result?.context?.slot,units=payload.result?.value?.unitsConsumed;
  if(payload.error||!Number.isSafeInteger(slot)||slot!<minContextSlot||payload.result?.value?.err!=null){const detail=JSON.stringify(payload.error||payload.result?.value?.err);if(detail.includes('MaxInstructionTraceLengthExceeded'))throw new Error('This route invokes too many venue instructions for one atomic transaction. Replace a complex PumpSwap, CLMM, or LaunchLab coin, or use fewer coins. Nothing was submitted.');throw new Error(`Transaction-v1 simulation failed: ${detail}.`);}
  if(!Number.isSafeInteger(units)||units!<=0||units!>MAX_COMPUTE_UNIT_LIMIT)throw new Error('Transaction compute usage could not be verified');
  return{slot:slot!,units:units!};
}

/** Read-only exact-byte simulation. Call this before opening any wallet prompt. */
export async function prepareBasketV1Transaction(connection:Pick<Connection,'rpcEndpoint'|'getGenesisHash'|'getLatestBlockhashAndContext'|'getAccountInfoAndContext'>,payer:PublicKey,instructions:TransactionInstruction[],quoteSlot:number,config:BasketTransactionConfig={}){
  if(!Number.isSafeInteger(quoteSlot)||quoteSlot<0)throw new Error('Invalid quote slot');
  if(await connection.getGenesisHash()!==NETWORK_GENESIS)throw new Error('RPC network does not match this SDK release');
  const feature=await connection.getAccountInfoAndContext(TX_V1_FEATURE,{commitment:'confirmed',minContextSlot:quoteSlot});
  if(!feature.value||feature.value.data.length<9||feature.value.data[0]!==1)throw new Error('Solana transaction v1 is not active on this network yet');
  const latest=await connection.getLatestBlockhashAndContext({commitment:'confirmed',minContextSlot:Math.max(quoteSlot,feature.context.slot)});
  const copied=instructions.map(ix=>new TransactionInstruction({programId:ix.programId,keys:ix.keys.map(key=>({...key})),data:Buffer.from(ix.data)}));
  const normalized=transactionConfig(config);
  const ceiling=compileBasketV1Transaction(payer,latest.value.blockhash,latest.value.lastValidBlockHeight,copied,{...normalized,computeUnitLimit:MAX_COMPUTE_UNIT_LIMIT});
  const measured=await simulate(connection,ceiling.wireTransaction,latest.context.slot);
  const computeUnitLimit=Math.min(MAX_COMPUTE_UNIT_LIMIT,Math.ceil(measured.units*(10_000+normalized.computeUnitMarginBps)/10_000));
  const prepared=computeUnitLimit===MAX_COMPUTE_UNIT_LIMIT?ceiling:compileBasketV1Transaction(payer,latest.value.blockhash,latest.value.lastValidBlockHeight,copied,{...normalized,computeUnitLimit});
  const verified=prepared===ceiling?measured:await simulate(connection,prepared.wireTransaction,latest.context.slot);
  return{...prepared,blockhash:latest.value.blockhash,lastValidBlockHeight:latest.value.lastValidBlockHeight,minContextSlot:verified.slot,computeUnits:verified.units};
}
