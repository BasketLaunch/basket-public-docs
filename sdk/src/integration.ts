import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  type AccountMeta,
  type Commitment,
  type TransactionInstruction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { BASKET_PROGRAM_ID, buildBasketBuy, buildBasketSell, decodeBasketMarket, readBasketMarket, type BasketState } from './basket-client.js';
import { amount, BPS, buyQuote, ceilDiv, componentAmounts, completionComposite, fees, isGraduated, sellQuote } from './protocol.js';
import { BASKET_PROGRAM_BYTES, BASKET_PROGRAM_DATA_ADDRESS, BASKET_PROGRAM_SHA256, BASKET_UPGRADE_AUTHORITY, NETWORK_GENESIS } from './network.js';

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
}) => Promise<{ legs: VenueLeg[]; slot: number }>;

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

function slippage(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 5_000) throw new Error('Slippage must be between 0 and 50%');
  return BigInt(value);
}

function checkedSnapshot(state: BasketState, result: { legs: VenueLeg[]; slot: number }, minimumSlot: number): BasketRouteSnapshot {
  if (!Number.isSafeInteger(result.slot) || result.slot < minimumSlot) throw new Error('Route adapter returned a stale slot');
  if (result.legs.length !== state.components.length) throw new Error('Route adapter did not return one leg per constituent');
  result.legs.forEach((leg, index) => {
    if (!leg.mint.equals(state.components[index].mint)) throw new Error('Route leg order does not match the basket recipe');
    if (leg.accounts.some(account => account.isSigner)) throw new Error('A route cannot introduce another signer');
    const addresses = new Set(leg.accounts.map(account => account.pubkey.toBase58()));
    if (!addresses.has(leg.mint.toBase58()) || !addresses.has(state.components[index].vault.toBase58())) throw new Error('Route leg is missing its constituent mint or reserve vault');
    amount(leg.maxBuyTokens, 'maxBuyTokens');
  });
  return { state, legs: result.legs, slot: result.slot };
}

/** Apply the deployed curve, fixed recipe, venue costs, protocol fees and slippage using integer arithmetic. */
export function quoteBasketBuy(snapshot: BasketRouteSnapshot, grossSol: bigint, slippageBps = 100) {
  const bps = slippage(slippageBps), market = snapshot.state.economics, fee = fees(grossSol, market.creatorShareBps);
  if (fee.net === 0n) throw new Error('Buy amount must be positive');
  let upper = (1n << 64n) - 1n - market.virtualComposite;
  if (!isGraduated(market)) {
    const remaining = completionComposite(market);
    if (remaining < upper) upper = remaining;
  }
  snapshot.legs.forEach((leg, index) => {
    const max = leg.maxBuyTokens * market.recipeNotional / market.recipeAmounts[index];
    if (max < upper) upper = max;
  });
  const budgets = (composite: bigint) => componentAmounts(market, composite, 'buy').map((tokens, index) => ceilDiv(snapshot.legs[index].buyCost(tokens) * (BPS + bps), BPS));
  let lower = 0n;
  while (lower < upper) {
    const middle = (lower + upper + 1n) / 2n;
    if (budgets(middle).reduce((sum, value) => sum + value, 0n) > fee.net) upper = middle - 1n;
    else lower = middle;
  }
  if (lower === 0n) throw new Error('Buy is too small or constituent liquidity is unavailable');
  const output = buyQuote(market, lower), componentBudgets = budgets(lower);
  const minTokens = output.tokens * (BPS - bps) / BPS;
  if (minTokens === 0n || componentBudgets.some(value => value === 0n)) throw new Error('Buy is below token or SOL precision');
  const expectedCosts = componentAmounts(market, lower, 'buy').map((tokens, index) => snapshot.legs[index].buyCost(tokens));
  return { grossSol, composite: lower, minTokens, expectedTokens: output.tokens, componentBudgets, expectedCosts, fee, estimatedRefund: fee.net - expectedCosts.reduce((sum, value) => sum + value, 0n) };
}

/** Apply the deployed curve, fixed recipe, venue proceeds, protocol fees and slippage using integer arithmetic. */
export function quoteBasketSell(snapshot: BasketRouteSnapshot, tokens: bigint, slippageBps = 100) {
  const bps = slippage(slippageBps), market = snapshot.state.economics, curve = sellQuote(market, tokens);
  const quantities = componentAmounts(market, curve.composite, 'sell');
  if (quantities.some(value => value === 0n)) throw new Error('Sale is below constituent token precision');
  const expectedProceeds = quantities.map((value, index) => snapshot.legs[index].sellProceeds(value));
  const componentMinimums = expectedProceeds.map(value => value * (BPS - bps) / BPS);
  const fee = fees(expectedProceeds.reduce((sum, value) => sum + value, 0n), market.creatorShareBps);
  const minNetSol = fees(componentMinimums.reduce((sum, value) => sum + value, 0n), market.creatorShareBps).net;
  if (minNetSol === 0n || componentMinimums.some(value => value === 0n)) throw new Error('Sale is below minimum SOL precision');
  return { tokens, minNetSol, componentMinimums, expectedProceeds, expectedNetSol: fee.net, fee };
}

function lookupAddresses(instructions: TransactionInstruction[]) {
  const addresses = new Map<string, PublicKey>();
  for (const instruction of instructions) {
    addresses.set(instruction.programId.toBase58(), instruction.programId);
    for (const account of instruction.keys) addresses.set(account.pubkey.toBase58(), account.pubkey);
  }
  return [...addresses.values()];
}

/** Read canonical state, ask the platform's venue adapter for fresh routes and return one atomic buy instruction set. */
export async function prepareBasketBuy(input: PrepareBuyInput) {
  const state = await readBasketMarket(input.connection, input.mint, input.minContextSlot);
  if (state.buysPaused) throw new Error('BASKET buys are currently paused');
  const snapshot = checkedSnapshot(state, await input.routeAdapter({ connection: input.connection, state, side: 'Buy', minContextSlot: state.slot }), state.slot);
  const quote = quoteBasketBuy(snapshot, input.grossSol, input.slippageBps);
  const traderTokens = getAssociatedTokenAddressSync(input.mint, input.trader, false, TOKEN_PROGRAM_ID);
  const routes = snapshot.legs.flatMap(leg => leg.accounts);
  const instructions = [
    createAssociatedTokenAccountIdempotentInstruction(input.trader, traderTokens, input.trader, input.mint, TOKEN_PROGRAM_ID),
    buildBasketBuy({ state, trader: input.trader, traderTokens, routes, grossSol: quote.grossSol, composite: quote.composite, minTokens: quote.minTokens, componentBudgets: quote.componentBudgets }),
  ];
  return { state, quote, instructions, lookupAddresses: lookupAddresses(instructions), slot: snapshot.slot };
}

/** Read canonical state, ask the platform's venue adapter for fresh routes and return one atomic sell instruction set. */
export async function prepareBasketSell(input: PrepareSellInput) {
  const state = await readBasketMarket(input.connection, input.mint, input.minContextSlot);
  const snapshot = checkedSnapshot(state, await input.routeAdapter({ connection: input.connection, state, side: 'Sell', minContextSlot: state.slot }), state.slot);
  const quote = quoteBasketSell(snapshot, input.tokens, input.slippageBps);
  const traderTokens = getAssociatedTokenAddressSync(input.mint, input.trader, false, TOKEN_PROGRAM_ID);
  const routes = snapshot.legs.flatMap(leg => leg.accounts);
  const instructions = [buildBasketSell({ state, trader: input.trader, traderTokens, routes, tokens: quote.tokens, minNetSol: quote.minNetSol, componentMinimums: quote.componentMinimums })];
  return { state, quote, instructions, lookupAddresses: lookupAddresses(instructions), slot: snapshot.slot };
}

/** Compile prepared instructions into the single versioned transaction shown to the wallet. */
export async function buildBasketTransaction(input: {
  connection: Connection;
  payer: PublicKey;
  instructions: TransactionInstruction[];
  lookupTables?: AddressLookupTableAccount[];
  commitment?: Commitment;
}) {
  if (!input.instructions.length) throw new Error('At least one instruction is required');
  if (await input.connection.getGenesisHash() !== NETWORK_GENESIS) throw new Error('RPC is not Solana mainnet');
  const blockhash = await input.connection.getLatestBlockhash(input.commitment ?? 'confirmed');
  const message = new TransactionMessage({ payerKey: input.payer, recentBlockhash: blockhash.blockhash, instructions: input.instructions }).compileToV0Message(input.lookupTables ?? []);
  return { transaction: new VersionedTransaction(message), ...blockhash };
}

/** Scan program-owned markets. Call readBasketMarket before displaying or trading a result. */
export async function discoverBasketMints(connection: Connection) {
  if (await connection.getGenesisHash() !== NETWORK_GENESIS) throw new Error('RPC is not Solana mainnet');
  const discriminator = bs58.encode(Uint8Array.from([59, 94, 108, 97, 53, 216, 244, 245]));
  const accounts = await connection.getProgramAccounts(BASKET_PROGRAM_ID, { commitment: 'confirmed', filters: [{ memcmp: { offset: 0, bytes: discriminator } }] });
  return accounts.map(({ pubkey, account }) => ({ address: pubkey, mint: decodeBasketMarket(pubkey, account).mint }));
}

/** Pin the exact deployed bytecode before enabling an adapter in production. */
export async function verifyDeployment(connection: Connection) {
  if (await connection.getGenesisHash() !== NETWORK_GENESIS) throw new Error('RPC is not Solana mainnet');
  const loader = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
  const [program, programData] = await connection.getMultipleAccountsInfo([BASKET_PROGRAM_ID, new PublicKey(BASKET_PROGRAM_DATA_ADDRESS)], 'finalized');
  if (!program || !program.executable || !program.owner.equals(loader) || program.data.length !== 36 || program.data.readUInt32LE(0) !== 2) throw new Error('BASKET program account does not match the upgradeable loader');
  if (!new PublicKey(program.data.subarray(4)).equals(new PublicKey(BASKET_PROGRAM_DATA_ADDRESS))) throw new Error('Unexpected BASKET ProgramData address');
  if (!programData || programData.executable || !programData.owner.equals(loader) || programData.data.readUInt32LE(0) !== 3 || programData.data.length !== 45 + BASKET_PROGRAM_BYTES) throw new Error('Invalid BASKET ProgramData account');
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(programData.data.subarray(45))));
  const sha256 = [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (sha256 !== BASKET_PROGRAM_SHA256) throw new Error('Deployed BASKET bytecode does not match this SDK release');
  const authority = programData.data[12] === 1 ? new PublicKey(programData.data.subarray(13, 45)).toBase58() : null;
  if (authority !== BASKET_UPGRADE_AUTHORITY) throw new Error('BASKET upgrade authority changed; review the release before trading');
  return { program: BASKET_PROGRAM_ID, programData: new PublicKey(BASKET_PROGRAM_DATA_ADDRESS), deploymentSlot: programData.data.readBigUInt64LE(4), upgradeAuthority: authority, sha256 };
}
