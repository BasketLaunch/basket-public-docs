/** Reference economics. All token amounts are atomic units; all SOL amounts are lamports. */
export const MAX_COMPONENTS = 4;
export const BPS = 10000n;
export const SCALE = 1000000000n;
export const TOKEN_SCALE = 1000000n;
export const SUPPLY = 1000000000n * TOKEN_SCALE;
export const MIN_INITIAL_BUY = 100000000n;
const U64 = (1n << 64n) - 1n;
export function amount(value, name = 'amount') {
    if (value < 0n || value > U64)
        throw new Error(`${name} is outside u64`);
    return value;
}
export function ceilDiv(n, d) {
    if (n < 0n || d <= 0n)
        throw new Error('Invalid division');
    return (n + d - 1n) / d;
}
export function parseSol(value) {
    if (!/^\d+(\.\d{1,9})?$/.test(value))
        throw new Error('Enter SOL with at most 9 decimals');
    const [whole, fraction = ''] = value.split('.');
    return amount(BigInt(whole) * SCALE + BigInt(fraction.padEnd(9, '0')));
}
export function fees(gross, creatorShareBps) {
    amount(gross);
    if (!Number.isInteger(creatorShareBps) || creatorShareBps < 0 || creatorShareBps > 10_000)
        throw new Error('Invalid creator share');
    // Round total fee down to one lamport; allocate all remaining fee dust to the bucket.
    const total = gross * 100n / BPS;
    const platform = gross * 70n / BPS;
    const bucket = total - platform;
    const creator = bucket * BigInt(creatorShareBps) / BPS;
    return { total, platform, creator, cashback: bucket - creator, net: gross - total };
}
export function validateComponents(components) {
    if (components.length < 1 || components.length > MAX_COMPONENTS)
        throw new Error('Choose 1–4 constituents');
    if (new Set(components.map(c => c.mint)).size !== components.length)
        throw new Error('Duplicate constituent');
    if (components.some(c => !c.mint || !Number.isInteger(c.weightBps) || c.weightBps <= 0 || c.weightBps > 10_000))
        throw new Error('Invalid constituent weight');
    if (components.reduce((sum, c) => sum + c.weightBps, 0) !== 10_000)
        throw new Error('Weights must total 100%');
}
export const INITIAL_TOKEN = 1073000000n * TOKEN_SCALE;
export const INITIAL_COMPOSITE = 30n * SCALE;
export const INITIAL_REAL_TOKEN = 793100000n * TOKEN_SCALE;
export function isGraduated(market) {
    return market.virtualToken === market.realToken;
}
export function completionComposite(market) {
    if (isGraduated(market) || market.realToken <= 0n)
        throw new Error('No remaining launch curve');
    return amount(ceilDiv(market.realToken * market.virtualComposite, market.virtualToken - market.realToken));
}
export function buyQuote(market, composite) {
    if (market.complete)
        throw new Error('Curve complete');
    if (amount(composite) === 0n)
        throw new Error('Buy amount must be positive');
    const newY = amount(market.virtualComposite + composite);
    if (!isGraduated(market) && composite > completionComposite(market))
        throw new Error('Purchase exceeds remaining curve supply');
    let tokens = market.virtualToken - ceilDiv(market.virtualToken * market.virtualComposite, newY);
    if (!isGraduated(market) && tokens > market.realToken)
        tokens = market.realToken;
    const newX = market.virtualToken - tokens;
    if (tokens <= 0n)
        throw new Error('Buy is below minimum token precision');
    if (tokens > market.realToken)
        throw new Error('Purchase exceeds remaining curve supply');
    return { tokens, virtualToken: newX, virtualComposite: newY };
}
export function sellQuote(market, tokens) {
    if (market.complete)
        throw new Error('Curve complete');
    if (amount(tokens) === 0n)
        throw new Error('Sell amount must be positive');
    if (tokens > (isGraduated(market) ? SUPPLY : INITIAL_REAL_TOKEN) - market.realToken)
        throw new Error('Sell exceeds circulating supply');
    const newX = amount(market.virtualToken + tokens);
    const newY = ceilDiv(market.virtualToken * market.virtualComposite, newX);
    const composite = market.virtualComposite - newY;
    if (composite <= 0n || composite > market.realComposite)
        throw new Error('Insufficient real composite reserves');
    return { composite, virtualToken: newX, virtualComposite: newY };
}
/** Recipe is kept as an exact rational: activation token receipts / activation net SOL. */
export function componentAmounts(market, composite, direction) {
    return market.recipeAmounts.map(q => amount(direction === 'buy'
        ? ceilDiv(composite * q, market.recipeNotional)
        : composite * q / market.recipeNotional));
}
export function applyBuy(market, composite, actualReceipts, minTokens) {
    const quote = buyQuote(market, composite);
    const required = componentAmounts(market, composite, 'buy');
    if (actualReceipts.length !== required.length || actualReceipts.some((n, i) => amount(n) !== required[i]))
        throw new Error('Constituent balance delta mismatch');
    if (quote.tokens < amount(minTokens))
        throw new Error('Slippage limit exceeded');
    const next = { ...market, virtualToken: quote.virtualToken, virtualComposite: quote.virtualComposite,
        realToken: market.realToken - quote.tokens, realComposite: amount(market.realComposite + composite),
        vaults: market.vaults.map((n, i) => amount(n + actualReceipts[i])), complete: false };
    if (next.realToken === 0n) {
        const poolTokens = ceilDiv(next.realComposite * next.virtualToken, next.virtualComposite);
        if (poolTokens <= 0n || poolTokens > SUPPLY - INITIAL_REAL_TOKEN)
            throw new Error('Insufficient graduation token inventory');
        next.realToken = poolTokens;
        next.virtualToken = poolTokens;
        next.virtualComposite = next.realComposite;
    }
    assertReserve(next);
    return { market: next, tokens: quote.tokens };
}
export function applySell(market, tokens) {
    const quote = sellQuote(market, tokens);
    const released = componentAmounts(market, quote.composite, 'sell');
    if (released.some((n, i) => n > market.vaults[i]))
        throw new Error('Insufficient physical reserve');
    const next = { ...market, virtualToken: quote.virtualToken, virtualComposite: quote.virtualComposite,
        realToken: amount(market.realToken + tokens), realComposite: market.realComposite - quote.composite,
        vaults: market.vaults.map((n, i) => n - released[i]) };
    assertReserve(next);
    return { market: next, released, composite: quote.composite };
}
export function activate(components, receipts, gross, creatorShareBps) {
    validateComponents(components);
    if (gross < MIN_INITIAL_BUY)
        throw new Error('The first buy must be at least 0.10 SOL');
    const split = fees(gross, creatorShareBps);
    if (split.net === 0n || receipts.length !== components.length || receipts.some(n => amount(n) === 0n))
        throw new Error('Every constituent must be acquired');
    const empty = { virtualToken: INITIAL_TOKEN, virtualComposite: INITIAL_COMPOSITE,
        realToken: INITIAL_REAL_TOKEN, realComposite: 0n, recipeAmounts: [...receipts], recipeNotional: split.net,
        vaults: receipts.map(() => 0n), creatorShareBps, complete: false };
    return { ...applyBuy(empty, split.net, receipts, 1n), fees: split };
}
export function assertReserve(market) {
    if (market.vaults.length !== market.recipeAmounts.length)
        throw new Error('Invalid vault count');
    market.vaults.forEach((balance, i) => {
        if (balance * market.recipeNotional < market.realComposite * market.recipeAmounts[i])
            throw new Error('Reserve is undercollateralized');
    });
}
//# sourceMappingURL=protocol.js.map