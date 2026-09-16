import test from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
  BASKET_PROGRAM_ID, BASKET_PROGRAM_SHA256, INITIAL_COMPOSITE, INITIAL_REAL_TOKEN,
  INITIAL_TOKEN, MAX_COMPONENTS, MAX_LAUNCH_COMPONENTS, NETWORK_GENESIS, SUPPLY,
  TX_V1_FEATURE, activate, applyBuy, applySell, assertReserve, basketAddresses,
  atomicBasketMint, buildAtomicBasketActivation, buildFinalizeMetadataForMint,
  buildPrepareQuote, compileBasketV1Transaction, completionComposite, componentAmounts, fees,
  isGraduated, prepareBasketLaunch, prepareBasketV1Transaction,
  validateBasketRouteSnapshot,
} from '../dist/index.js';
import {TOKEN_2022_PROGRAM_ID,createAssociatedTokenAccountIdempotentInstruction,getAssociatedTokenAddressSync,unpackAccount,unpackMint} from '../dist/token.js';

const key = value => new PublicKey(Uint8Array.from({ length: 32 }, () => value));

test('release constants and canonical addresses are stable', () => {
  assert.equal(BASKET_PROGRAM_ID.toBase58(), '149WKoc5878Sx5EWjHGhPBL4vsoogY9og7ffkzdu39LM');
  assert.equal(NETWORK_GENESIS, '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d');
  assert.equal(BASKET_PROGRAM_SHA256, '804252a084a794eecc200db6a99c70461fb6b46dd17416afb27a92501950c016');
  assert.equal(SUPPLY, 1_000_000_000_000_000n);
  const mint = new PublicKey('BaKsojZCi8W7Po2kCTo1uaNRvJ6iynxAjuhow5jJRqKL');
  assert.equal(basketAddresses(mint, mint).market.toBase58(), '3fsLRtbesaxbk4nz8ccF99Joko9ZcBgRK4W4BaBPR4uZ');
});

test('protocol fee routing preserves every lamport', () => {
  const result = fees(1_000_000_000n, 6_000);
  assert.deepEqual(result, {
    total: 10_000_000n,
    platform: 7_000_000n,
    creator: 1_800_000n,
    cashback: 1_200_000n,
    net: 990_000_000n,
  });
});

test('fee arithmetic properties hold across amounts and creator shares', () => {
  let seed = 0x12345678;
  for (let index = 0; index < 500; index++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const gross = BigInt(seed) * 1_000_003n + BigInt(index);
    const share = seed % 10_001;
    const result = fees(gross, share);
    assert.equal(result.total, gross / 100n);
    assert.equal(result.platform, gross * 70n / 10_000n);
    assert.equal(result.platform + result.creator + result.cashback, result.total);
    assert.equal(result.net + result.total, gross);
    assert.ok(result.creator >= 0n && result.cashback >= 0n);
  }
});

test('component rounding never weakens buy or sell reserve bounds', () => {
  const market = { recipeAmounts: [3n, 7n, 11n], recipeNotional: 13n };
  for (let composite = 1n; composite <= 10_000n; composite += 37n) {
    const buys = componentAmounts(market, composite, 'buy');
    const sells = componentAmounts(market, composite, 'sell');
    market.recipeAmounts.forEach((recipe, index) => {
      assert.ok(buys[index] * market.recipeNotional >= composite * recipe);
      assert.ok(sells[index] * market.recipeNotional <= composite * recipe);
      assert.ok(buys[index] - sells[index] <= 1n);
    });
  }
});

test('a full holder unwind preserves reserves with only integer dust', () => {
  const launched = activate([
    { mint: key(1).toBase58(), weightBps: 5_000 },
    { mint: key(2).toBase58(), weightBps: 5_000 },
  ], [49_500_000n, 99_000_000n], 100_000_000n, 5_000);
  const sold = applySell(launched.market, launched.tokens);
  assert.deepEqual(sold.market.vaults, [1n, 1n]);
  assert.equal(sold.market.realComposite, 1n);
  assertReserve(sold.market);
});

test('a failed constituent leg leaves the caller state unchanged', () => {
  const launched = activate([
    { mint: key(3).toBase58(), weightBps: 5_000 },
    { mint: key(4).toBase58(), weightBps: 5_000 },
  ], [50n, 100n], 100_000_000n, 0);
  const before = structuredClone(launched.market);
  assert.throws(() => applyBuy(launched.market, 10n, [5n, 9n], 1n), /balance delta mismatch/);
  assert.deepEqual(launched.market, before);
});

test('the exact completion purchase graduates into the permanent pool', () => {
  const market = {
    virtualToken: INITIAL_TOKEN, virtualComposite: INITIAL_COMPOSITE,
    realToken: INITIAL_REAL_TOKEN, realComposite: 0n,
    recipeAmounts: [1_000n], recipeNotional: 1_000n, vaults: [0n],
    creatorShareBps: 0, complete: false,
  };
  const composite = completionComposite(market);
  const graduated = applyBuy(market, composite, [composite], 1n).market;
  assert.equal(isGraduated(graduated), true);
  assert.equal(graduated.virtualComposite, graduated.realComposite);
  assertReserve(graduated);
});

test('route snapshots reject stale, reordered, signing, and incomplete venue legs', () => {
  const mint = key(5), vault = key(6), state = { components: [{ mint, vault }] };
  const base = { mint, maxBuyTokens: 10n, buyCost: value => value, sellProceeds: value => value };
  const venueAccounts = name => [{ pubkey: mint, isSigner: false, isWritable: false }, { pubkey: vault, isSigner: false, isWritable: true }, { pubkey: key(name.length + 20), isSigner: false, isWritable: false }];
  for (const venue of ['Pump.fun', 'PumpSwap', 'Raydium CPMM', 'Raydium CLMM', 'LaunchLab']) {
    const snapshot = validateBasketRouteSnapshot(state, { slot: 101, legs: [{ ...base, accounts: venueAccounts(venue) }] }, 100);
    assert.equal(snapshot.slot, 101);
  }
  assert.throws(() => validateBasketRouteSnapshot(state, { slot: 99, legs: [{ ...base, accounts: venueAccounts('stale') }] }, 100), /stale slot/);
  assert.throws(() => validateBasketRouteSnapshot(state, { slot: 100, legs: [{ ...base, mint: key(7), accounts: venueAccounts('changed') }] }, 100), /order/);
  assert.throws(() => validateBasketRouteSnapshot(state, { slot: 100, legs: [{ ...base, accounts: [{ pubkey: mint, isSigner: true, isWritable: true }] }] }, 100), /signer/);
  assert.throws(() => validateBasketRouteSnapshot(state, { slot: 100, legs: [{ ...base, accounts: [{ pubkey: mint, isSigner: false, isWritable: false }] }] }, 100), /missing/);
});

test('transaction-v1 enforces the 64-account limit', () => {
  const payer = key(8), programId = key(9), blockhash = '11111111111111111111111111111111';
  const instruction = count => new TransactionInstruction({ programId, keys: Array.from({ length: count }, (_, index) => ({ pubkey: key(index + 20), isSigner: false, isWritable: false })) });
  assert.equal(compileBasketV1Transaction(payer, blockhash, 1, [instruction(62)]).accounts, 64);
  assert.throws(() => compileBasketV1Transaction(payer, blockhash, 1, [instruction(63)]), /allows 64/);
});

test('native token helpers preserve canonical Token-2022 addresses and layouts', () => {
  const mint = new PublicKey('463Vy9G6oNaN7yVh4hyzo26Pm1ABcmhn5EMUPyFAoo9c');
  const owner = new PublicKey('3ccaGRyZ9fHTRzzH479rzMnmAeME9fWajjuTEvXmCYVc');
  const ata = getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID);
  assert.equal(ata.toBase58(), 'HiW2XagPjALgYqJforWhM5U4u18oDuQpo35qyQqnSQya');
  const instruction = createAssociatedTokenAccountIdempotentInstruction(owner, ata, owner, mint, TOKEN_2022_PROGRAM_ID);
  assert.equal(instruction.programId.toBase58(), 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
  assert.deepEqual([...instruction.data], [1]);
  assert.deepEqual(instruction.keys.map(key => [key.pubkey.toBase58(), key.isSigner, key.isWritable]), [
    [owner.toBase58(), true, true], [ata.toBase58(), false, true], [owner.toBase58(), false, false],
    [mint.toBase58(), false, false], ['11111111111111111111111111111111', false, false],
    [TOKEN_2022_PROGRAM_ID.toBase58(), false, false],
  ]);

  const mintData = Buffer.alloc(82);
  mintData.writeUInt32LE(1, 0); owner.toBuffer().copy(mintData, 4);
  mintData.writeBigUInt64LE(123n, 36); mintData[44] = 6; mintData[45] = 1;
  const decodedMint = unpackMint(mint, { data: mintData, owner: TOKEN_2022_PROGRAM_ID, executable: false }, TOKEN_2022_PROGRAM_ID);
  assert.equal(decodedMint.supply, 123n);
  assert.equal(decodedMint.mintAuthority.toBase58(), owner.toBase58());
  assert.equal(decodedMint.freezeAuthority, null);

  const accountData = Buffer.alloc(165);
  mint.toBuffer().copy(accountData, 0); owner.toBuffer().copy(accountData, 32);
  accountData.writeBigUInt64LE(456n, 64); accountData[108] = 1;
  const decodedAccount = unpackAccount(ata, { data: accountData, owner: TOKEN_2022_PROGRAM_ID, executable: false }, TOKEN_2022_PROGRAM_ID);
  assert.equal(decodedAccount.amount, 456n);
  assert.equal(decodedAccount.owner.toBase58(), owner.toBase58());
  assert.equal(decodedAccount.delegate, null);
  assert.equal(decodedAccount.isNative, false);
});

test('protocol-specific codec preserves the published instruction bytes', () => {
  const basketMint = new PublicKey('463Vy9G6oNaN7yVh4hyzo26Pm1ABcmhn5EMUPyFAoo9c');
  const wallet = new PublicKey('3ccaGRyZ9fHTRzzH479rzMnmAeME9fWajjuTEvXmCYVc');
  assert.equal(buildPrepareQuote(basketMint, wallet).data.toString('hex'), '300bcc379de5e6742dddca7c4b464c7cf6e91134e2953e306c1e87695f57c96b2559fd32b50f21eb');
  assert.equal(buildFinalizeMetadataForMint(basketMint, wallet).data.toString('hex'), 'ce5c579250ab266f');

  const identity = { name: 'Test Basket', symbol: 'TEST', uri: `https://arweave.net/${'a'.repeat(43)}`, jsonSha256: Array(32).fill(7) };
  const mint = atomicBasketMint(wallet, Uint8Array.from(identity.jsonSha256));
  const activation = buildAtomicBasketActivation({ buyer: wallet, mint, weights: [10_000], minComponents: [123n], grossSol: 100_000_000n, minTokens: 456n, creatorShareBps: 5_000, identity, routes: [] });
  assert.equal(activation.data.toString('hex'), '0b5640c45b356e3d010000001027010000007b0000000000000000e1f50500000000c80100000000000088130b00000054657374204261736b657404000000544553543f00000068747470733a2f2f617277656176652e6e65742f616161616161616161616161616161616161616161616161616161616161616161616161616161616161610707070707070707070707070707070707070707070707070707070707070707');
});

test('transaction preparation applies an integrator fee and simulated compute headroom', async () => {
  const originalFetch = globalThis.fetch;
  let simulations = 0;
  globalThis.fetch = async () => {
    simulations++;
    return new Response(JSON.stringify({ result: { context: { slot: 50 }, value: { err: null, unitsConsumed: 100_001 } } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const connection = {
      rpcEndpoint: 'https://rpc.invalid',
      getGenesisHash: async () => NETWORK_GENESIS,
      getAccountInfoAndContext: async address => {
        assert.equal(address.toBase58(), TX_V1_FEATURE.toBase58());
        return { context: { slot: 41 }, value: { data: Uint8Array.from([1, 0, 0, 0, 0, 0, 0, 0, 0]) } };
      },
      getLatestBlockhashAndContext: async () => ({ context: { slot: 42 }, value: { blockhash: '11111111111111111111111111111111', lastValidBlockHeight: 99 } }),
    };
    const prepared = await prepareBasketV1Transaction(connection, key(10), [new TransactionInstruction({ programId: key(11), keys: [] })], 40, { priorityFeeLamports: 125_000n });
    assert.equal(prepared.priorityFeeLamports, 125_000n);
    assert.equal(prepared.computeUnitLimit, 120_002);
    assert.equal(prepared.computeUnits, 100_001);
    assert.equal(simulations, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('the SDK rejects an eight-component launch before reading a route', async () => {
  assert.equal(MAX_COMPONENTS, 8);
  assert.equal(MAX_LAUNCH_COMPONENTS, 6);
  let routed = false;
  const components = Array.from({ length: 8 }, (_, index) => ({
    mint: new PublicKey(Uint8Array.from({ length: 32 }, () => index + 1)).toBase58(),
    weightBps: 1_250,
  }));
  await assert.rejects(prepareBasketLaunch({
    connection: {}, buyer: new PublicKey(Uint8Array.from({ length: 32 }, () => 9)),
    identity: { name: 'Capacity check', symbol: 'CAP', uri: `https://arweave.net/${'a'.repeat(43)}`, jsonSha256: Array(32).fill(7) },
    components, grossSol: 100_000_000n, creatorShareBps: 5_000,
    routeAdapter: async () => { routed = true; throw new Error('unreachable'); },
  }), /at most 6 constituents/);
  assert.equal(routed, false);
});
