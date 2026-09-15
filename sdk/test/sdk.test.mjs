import test from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey } from '@solana/web3.js';
import { BASKET_PROGRAM_ID, BASKET_PROGRAM_SHA256, MAX_COMPONENTS, MAX_LAUNCH_COMPONENTS, NETWORK_GENESIS, SUPPLY, basketAddresses, fees, prepareBasketLaunch } from '../dist/index.js';

test('release constants and canonical addresses are stable', () => {
  assert.equal(BASKET_PROGRAM_ID.toBase58(), '149WKoc5878Sx5EWjHGhPBL4vsoogY9og7ffkzdu39LM');
  assert.equal(NETWORK_GENESIS, '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d');
  assert.equal(BASKET_PROGRAM_SHA256, 'b51fbeca0e8e0c23fd8125a27ee5d72d2e0362d7cc237396caf3d7707189becc');
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

test('the SDK rejects an eight-component launch before reading a route', async () => {
  assert.equal(MAX_COMPONENTS, 8);
  assert.equal(MAX_LAUNCH_COMPONENTS, 7);
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
  }), /at most 7 constituents/);
  assert.equal(routed, false);
});
