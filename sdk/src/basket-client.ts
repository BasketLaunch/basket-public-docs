import { metadataUri } from './metadata-uri.js';
import { Buffer } from 'buffer';
import { BorshCoder, type Idl } from '@coral-xyz/anchor';
import BN from 'bn.js';
import { PublicKey, SystemProgram, TransactionInstruction, type AccountInfo, type AccountMeta, type Connection } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, NATIVE_MINT, getAssociatedTokenAddressSync, unpackAccount, unpackMint } from '@solana/spl-token';
import idl from './idl.js';
import { amount, buyQuote, componentAmounts, fees, INITIAL_REAL_TOKEN, INITIAL_TOKEN, INITIAL_COMPOSITE, isGraduated, MAX_COMPONENTS, sellQuote, SUPPLY, validateComponents } from './protocol.js';
import { NETWORK_GENESIS } from './network.js';

export const BASKET_PROGRAM_ID = new PublicKey(idl.address);
const coder = new BorshCoder(idl as unknown as Idl);
const pda = (...seeds: (string | PublicKey)[]) => PublicKey.findProgramAddressSync(seeds.map(s => typeof s === 'string' ? Buffer.from(s) : s.toBuffer()), BASKET_PROGRAM_ID);
export function basketAddresses(mint: PublicKey, trader: PublicKey) {
  return { config: pda('config')[0], market: pda('market', mint)[0], router: pda('router', mint)[0], supplyVault: pda('supply', mint)[0], cashback: pda('cashback', mint, trader)[0] };
}
export function atomicBasketMint(creator: string | PublicKey, metadataHash: string | Uint8Array) {
  const hash = typeof metadataHash === 'string' ? Buffer.from(metadataHash, 'hex') : Buffer.from(metadataHash);
  if (hash.length !== 32 || hash.every(byte => byte === 0)) throw new Error('Invalid basket metadata hash');
  return pda('mint', new PublicKey(creator), new PublicKey(hash))[0];
}

/** Decode only the pinned program's canonical market, preserving integer precision. */
export function decodeBasketMarket(address: PublicKey, account: AccountInfo<Buffer>) {
  if (!account.owner.equals(BASKET_PROGRAM_ID) || account.executable) throw new Error('Invalid basket market owner');
  const state = coder.accounts.decode('BasketMarket', account.data);
  const mint = new PublicKey(state.mint);
  const [canonical, bump] = pda('market', mint), [, routerBump] = pda('router', mint);
  if (!address.equals(canonical) || state.bump !== bump || state.router_bump !== routerBump) throw new Error('Noncanonical basket market');
  const count = state.component_count as number;
  if (!Number.isInteger(count) || count < 1 || count > MAX_COMPONENTS) throw new Error('Unsupported basket composition');
  const components = Array.from({ length: count }, (_, i) => ({ mint: new PublicKey(state.mints[i]), weightBps: state.weights[i] as number, vault: new PublicKey(state.vaults[i]), recipe: amount(BigInt(state.recipe[i].toString())) }));
  validateComponents(components.map(c => ({ mint: c.mint.toBase58(), weightBps: c.weightBps })));
  const economics = {
    virtualToken: amount(BigInt(state.virtual_token.toString())), virtualComposite: amount(BigInt(state.virtual_composite.toString())),
    realToken: amount(BigInt(state.real_token.toString())), realComposite: amount(BigInt(state.real_composite.toString())),
    recipeAmounts: components.map(c => c.recipe), recipeNotional: amount(BigInt(state.recipe_notional.toString())),
    creatorShareBps: state.creator_share_bps as number,
    // Completion transitions atomically to physical pool reserves; trading continues.
    complete: false,
  };
  const graduated = isGraduated(economics);
  const validReserves = graduated
    ? economics.virtualComposite === economics.realComposite && economics.realToken < SUPPLY
    : economics.realToken <= INITIAL_REAL_TOKEN && economics.virtualToken - economics.realToken === INITIAL_TOKEN - INITIAL_REAL_TOKEN && economics.virtualComposite - economics.realComposite === INITIAL_COMPOSITE;
  if (!validReserves || economics.virtualToken === 0n || economics.virtualComposite === 0n || economics.recipeNotional === 0n || components.some(c => c.recipe === 0n)) throw new Error('Invalid basket curve state');
  fees(0n, economics.creatorShareBps);
  return { address, mint, creator: new PublicKey(state.creator), treasury: new PublicKey(state.treasury), components, economics, graduated,
    metadataHash: Buffer.from(state.metadata_hash).toString('hex'),
    metadataPending: BigInt(state.metadata_reserve.toString()) > 0n, metadataPayer:new PublicKey(state.metadata_payer),
    initialCashbackOwner:new PublicKey(state.initial_cashback_owner), initialCashback:amount(BigInt(state.initial_cashback.toString())), issuedTokens:amount(BigInt(state.issued_tokens.toString())),
    volumeLamports: BigInt(state.volume_sol.toString()), tradeCount: amount(BigInt(state.trade_count.toString())),
    fees: { platform: amount(BigInt(state.fees.platform.toString())), creator: amount(BigInt(state.fees.creator.toString())), cashback: amount(BigInt(state.fees.cashback.toString())) },
  };
}
export type BasketState = ReturnType<typeof decodeBasketMarket>;

function verifyBasketSupply(state: BasketState, mintAccount: AccountInfo<Buffer>, supplyAddress: PublicKey, supplyAccount: AccountInfo<Buffer>) {
  const token = unpackMint(state.mint, mintAccount, TOKEN_PROGRAM_ID);
  const expectedAuthority = state.metadataPending ? state.address : null;
  if (!token.isInitialized || token.supply !== SUPPLY || token.decimals !== 6 || token.freezeAuthority || (expectedAuthority ? !token.mintAuthority?.equals(expectedAuthority) : token.mintAuthority !== null)) throw new Error('Basket token supply or authority does not match the protocol');
  if (!supplyAddress.equals(basketAddresses(state.mint, state.mint).supplyVault) || !supplyAccount.owner.equals(TOKEN_PROGRAM_ID)) throw new Error('Invalid basket supply vault');
  const supply = unpackAccount(supplyAddress, supplyAccount, TOKEN_PROGRAM_ID);
  if (!supply.isInitialized || !supply.mint.equals(state.mint) || !supply.owner.equals(state.address) || supply.delegate || supply.closeAuthority || supply.isNative || supply.amount + state.issuedTokens !== SUPPLY) throw new Error('Basket circulating supply does not match its fixed inventory');
  return supply.amount;
}

export async function readBasketMarket(rpc: Pick<Connection, 'getGenesisHash' | 'getMultipleAccountsInfoAndContext'>, mint: PublicKey, minContextSlot = 0) {
  if (!Number.isSafeInteger(minContextSlot) || minContextSlot < 0) throw new Error('Invalid market slot');
  if (await rpc.getGenesisHash() !== NETWORK_GENESIS) throw new Error('RPC network does not match this BASKET build');
  const addresses = basketAddresses(mint, mint);
  const result = await rpc.getMultipleAccountsInfoAndContext([addresses.market, mint, addresses.config, addresses.supplyVault], { commitment: 'confirmed', minContextSlot });
  const [market, mintAccount, config, supply] = result.value;
  if (!market || !mintAccount || !config || !supply) throw new Error('Basket is not active on the configured network');
  const state = decodeBasketMarket(addresses.market, market);
  if (!state.mint.equals(mint)) throw new Error('Basket mint mismatch');
  const unsoldTokens = verifyBasketSupply(state, mintAccount, addresses.supplyVault, supply);
  if (!config.owner.equals(BASKET_PROGRAM_ID) || config.executable) throw new Error('Invalid basket configuration owner');
  const settings = coder.accounts.decode('Config', config.data);
  return { ...state, supplyVault: addresses.supplyVault, unsoldTokens, slot: result.context.slot, buysPaused: settings.buys_paused as boolean };
}

/** Read the complete public reserve from one consistent RPC snapshot for indexers and trading terminals. */
export async function readBasketReserve(rpc: Pick<Connection, 'getGenesisHash' | 'getMultipleAccountsInfoAndContext'>, mint: PublicKey, minContextSlot = 0) {
  const discovered = await readBasketMarket(rpc, mint, minContextSlot);
  const addresses = basketAddresses(mint, mint);
  const result = await rpc.getMultipleAccountsInfoAndContext([addresses.market, mint, addresses.config, addresses.supplyVault, ...discovered.components.map(component => component.vault)], { commitment: 'confirmed', minContextSlot: discovered.slot });
  const [market, mintAccount, config, supply, ...vaults] = result.value;
  if (!market || !mintAccount || !config || !supply || vaults.some(vault => !vault)) throw new Error('Basket reserve is incomplete');
  const state = decodeBasketMarket(addresses.market, market);
  const unsoldTokens = verifyBasketSupply(state, mintAccount, addresses.supplyVault, supply);
  if (!config.owner.equals(BASKET_PROGRAM_ID) || config.executable) throw new Error('Invalid basket configuration owner');
  const settings = coder.accounts.decode('Config', config.data);
  if (state.components.length !== discovered.components.length || state.components.some((component, index) => !component.vault.equals(discovered.components[index].vault))) throw new Error('Basket reserve changed while reading');
  const router = addresses.router;
  const components = state.components.map((component, index) => {
    const info = vaults[index]!;
    const tokenProgram = info.owner;
    if (![TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID].some(program => program.equals(tokenProgram))) throw new Error('Invalid constituent vault program');
    if (!component.vault.equals(getAssociatedTokenAddressSync(component.mint, router, true, tokenProgram))) throw new Error('Noncanonical constituent vault');
    const vault = unpackAccount(component.vault, info, tokenProgram);
    if (!vault.isInitialized || !vault.owner.equals(router) || !vault.mint.equals(component.mint) || vault.delegate || vault.closeAuthority || vault.isNative) throw new Error('Invalid constituent vault');
    return { ...component, balance: amount(vault.amount), tokenProgram };
  });
  return { ...state, supplyVault: addresses.supplyVault, unsoldTokens, components, slot: result.context.slot, buysPaused: settings.buys_paused as boolean };
}

function instruction(name: string, accounts: Record<string, PublicKey>, data: Record<string, unknown>, remaining: AccountMeta[] = []) {
  const definition = idl.instructions.find(ix => ix.name === name);
  if (!definition) throw new Error('Unknown BASKET instruction');
  const keys = definition.accounts.map(a => {
    const pubkey = accounts[a.name];
    if (!pubkey) throw new Error(`Missing ${a.name}`);
    return { pubkey, isSigner: 'signer' in a && a.signer === true, isWritable: 'writable' in a && a.writable === true };
  });
  return new TransactionInstruction({ programId: BASKET_PROGRAM_ID, keys: [...keys, ...remaining], data: coder.instruction.encode(name, data) });
}
const integer = (v: bigint) => new BN(amount(v).toString());
export type BasketIdentityInput = { name: string; symbol: string; uri: string; jsonSha256: number[] };
export function buildBasketActivation(input: { buyer: PublicKey; creator: PublicKey; mint: PublicKey; buyerTokens: PublicKey; weights: number[]; minComponents: bigint[]; grossSol: bigint; minTokens: bigint; creatorShareBps: number; identity: BasketIdentityInput; routes: AccountMeta[] }) {
  const { buyer, creator, mint, buyerTokens, identity, weights, minComponents, routes } = input;
  if (weights.length < 1 || weights.length > MAX_COMPONENTS || weights.some(w => !Number.isInteger(w) || w <= 0) || weights.reduce((sum, w) => sum + w, 0) !== 10000 || minComponents.length !== weights.length || minComponents.some(n => amount(n) === 0n) || amount(input.minTokens) === 0n || amount(input.grossSol) === 0n) throw new Error('Invalid activation terms');
  fees(input.grossSol, input.creatorShareBps);
  if (Buffer.byteLength(identity.name) < 2 || Buffer.byteLength(identity.name) > 32 || !/^[A-Z0-9]{2,10}$/.test(identity.symbol) || !metadataUri.safeParse(identity.uri).success || identity.jsonSha256.length !== 32 || identity.jsonSha256.some(n => !Number.isInteger(n) || n < 0 || n > 255) || identity.jsonSha256.every(n => n === 0)) throw new Error('Invalid immutable basket identity');
  if (routes.some(k => k.isSigner)) throw new Error('Unexpected route signer');
  const a = basketAddresses(mint, buyer);
  return instruction('activate_and_buy', { buyer, creator, mint, config: a.config, market: a.market, router: a.router, supply_vault: a.supplyVault, buyer_tokens: buyerTokens, token_program: TOKEN_PROGRAM_ID, system_program: SystemProgram.programId }, {
    weights, min_components: minComponents.map(integer), gross_sol: integer(input.grossSol), min_tokens: integer(input.minTokens), creator_share_bps: input.creatorShareBps,
    identity: { name: identity.name, symbol: identity.symbol, uri: identity.uri, json_sha256: identity.jsonSha256 },
  }, routes);
}
export function buildAtomicBasketActivation(input: { buyer: PublicKey; mint: PublicKey; weights: number[]; minComponents: bigint[]; grossSol: bigint; minTokens: bigint; creatorShareBps: number; identity: BasketIdentityInput; routes: AccountMeta[] }) {
  const buyerTokens = getAssociatedTokenAddressSync(input.mint, input.buyer);
  if (!atomicBasketMint(input.buyer, Uint8Array.from(input.identity.jsonSha256)).equals(input.mint)) throw new Error('Atomic basket mint does not match its creator and metadata');
  const base = buildBasketActivation({ ...input, creator: input.buyer, buyerTokens });
  const data = coder.instruction.decode(base.data)?.data as Record<string, unknown> | undefined;
  if (!data) throw new Error('Invalid atomic activation data');
  const a = basketAddresses(input.mint, input.buyer);
  return instruction('activate_atomic', {
    buyer: input.buyer, config: a.config, mint: input.mint, market: a.market, router: a.router,
    supply_vault: a.supplyVault, buyer_tokens: buyerTokens, token_program: TOKEN_PROGRAM_ID,
    associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID, system_program: SystemProgram.programId,
  }, data, input.routes);
}
function tradeAccounts(mint: PublicKey, trader: PublicKey, traderTokens: PublicKey) {
  const a = basketAddresses(mint, trader);
  return { trader, config: a.config, market: a.market, router: a.router, mint, supply_vault: a.supplyVault, trader_tokens: traderTokens, cashback: a.cashback, token_program: TOKEN_PROGRAM_ID, system_program: SystemProgram.programId };
}
function checkRoutes(state: BasketState, routes: AccountMeta[]) {
  if (!routes.length || routes.some(account => account.isSigner)) throw new Error('Routes must contain accounts without external signers');
  const keys = new Set(routes.map(account => account.pubkey.toBase58()));
  const router = basketAddresses(state.mint, state.mint).router.toBase58();
  if (!keys.has(router)) throw new Error('Routes do not use the canonical basket router');
  for (const component of state.components) {
    if (!keys.has(component.mint.toBase58()) || !keys.has(component.vault.toBase58())) throw new Error('Routes do not cover the complete basket recipe');
  }
}
type TradeContext = { state: BasketState; trader: PublicKey; traderTokens: PublicKey; routes: AccountMeta[] };

export function buildBasketBuy({ state, trader, traderTokens, routes, grossSol, composite, minTokens, componentBudgets }: TradeContext & { grossSol: bigint; composite: bigint; minTokens: bigint; componentBudgets: bigint[] }) {
  checkRoutes(state, routes);
  if (amount(grossSol) === 0n || amount(minTokens) === 0n || componentBudgets.length !== state.components.length || componentBudgets.some(v => amount(v) === 0n)) throw new Error('Invalid buy amounts');
  if (componentBudgets.reduce((sum, v) => sum + v, 0n) > fees(grossSol, state.economics.creatorShareBps).net) throw new Error('Constituent budgets exceed the SOL available after fees');
  const quote = buyQuote(state.economics, composite);
  if (quote.tokens < minTokens) throw new Error('Basket quote is below minimum output');
  componentAmounts(state.economics, composite, 'buy');
  return instruction('buy', tradeAccounts(state.mint, trader, traderTokens), { gross_sol: integer(grossSol), composite: integer(composite), min_tokens: integer(minTokens), max_sol_per_component: componentBudgets.map(integer) }, routes);
}

export function buildBasketSell({ state, trader, traderTokens, routes, tokens, minNetSol, componentMinimums }: TradeContext & { tokens: bigint; minNetSol: bigint; componentMinimums: bigint[] }) {
  checkRoutes(state, routes);
  if (amount(minNetSol) === 0n || componentMinimums.length !== state.components.length || componentMinimums.some(v => amount(v) === 0n)) throw new Error('Invalid sell minimums');
  const quote = sellQuote(state.economics, tokens);
  if (componentAmounts(state.economics, quote.composite, 'sell').some(v => v === 0n)) throw new Error('Sale is below constituent token precision');
  return instruction('sell', tradeAccounts(state.mint, trader, traderTokens), { tokens: integer(tokens), min_net_sol: integer(minNetSol), min_sol_per_component: componentMinimums.map(integer) }, routes);
}

export function buildBasketClaim(state: BasketState, owner: PublicKey, kind: 'creator' | 'platform' | 'cashback') {
  if (kind === 'creator' && !owner.equals(state.creator) || kind === 'platform' && !owner.equals(state.treasury)) throw new Error('This wallet is not entitled to these fees');
  const a = basketAddresses(state.mint, owner);
  return instruction(kind === 'creator' ? 'claim_creator_fee' : kind === 'platform' ? 'claim_platform_fee' : 'claim_cashback', { owner, market: a.market, cashback: a.cashback, router:a.router, system_program:SystemProgram.programId }, {});
}

export function buildFinalizeMetadata(state:BasketState,cranker:PublicKey){
 const a=basketAddresses(state.mint,cranker),metadataProgram=new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
 const metadata=PublicKey.findProgramAddressSync([Buffer.from('metadata'),metadataProgram.toBuffer(),state.mint.toBuffer()],metadataProgram)[0];
 return instruction('finalize_metadata',{cranker,market:a.market,router:a.router,mint:state.mint,metadata_payer:state.metadataPayer,metadata,metadata_program:metadataProgram,token_program:TOKEN_PROGRAM_ID,system_program:SystemProgram.programId},{});
}

export function buildPrepareQuote(mint: PublicKey, payer: PublicKey) {
  const a = basketAddresses(mint, payer), quote = pda('quote', a.router)[0];
  return instruction('prepare_quote', { payer, router: a.router, quote_mint: NATIVE_MINT, quote, token_program: TOKEN_PROGRAM_ID, system_program: SystemProgram.programId }, { _basket_mint: mint });
}

export async function readCashback(rpc:Pick<Connection,'getGenesisHash'|'getMultipleAccountsInfo'>,mint:PublicKey,owner:PublicKey){
 if(await rpc.getGenesisHash()!==NETWORK_GENESIS)throw new Error('RPC network does not match this BASKET build');
 const a=basketAddresses(mint,owner),[marketInfo,info]=await rpc.getMultipleAccountsInfo([a.market,a.cashback],{commitment:'confirmed'});
 if(!marketInfo)throw new Error('Basket market is unavailable');
 const market=decodeBasketMarket(a.market,marketInfo);
 let claimable=market.initialCashbackOwner?.equals(owner)?market.initialCashback:0n;
 if(!info)return claimable;
 if(!info.owner.equals(BASKET_PROGRAM_ID)||info.executable)throw new Error('Invalid cashback account');
 return claimable+amount(BigInt(coder.accounts.decode('Cashback',info.data).claimable.toString()));
}
