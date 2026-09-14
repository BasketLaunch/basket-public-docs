import test from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey } from '@solana/web3.js';
import { BASKET_PROGRAM_ID, BASKET_PROGRAM_SHA256, NETWORK_GENESIS, SUPPLY, basketAddresses, fees } from '../dist/index.js';

test('release constants and canonical addresses are stable', () => {
  assert.equal(BASKET_PROGRAM_ID.toBase58(), '149WKoc5878Sx5EWjHGhPBL4vsoogY9og7ffkzdu39LM');
  assert.equal(NETWORK_GENESIS, '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d');
  assert.equal(BASKET_PROGRAM_SHA256, '33cbd1aafaaecef773485a9813303424a514d9c92ed3582384f175d6e505ef9c');
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
