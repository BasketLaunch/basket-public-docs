import { z } from 'zod';
const ipfsCid = z.string().regex(/^baf(?:ybei|krei)[a-z2-7]{51}[aeimquy4]$/);
const basketContentKey = z.string().regex(/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/);
const basketContentPrefix = 'https://basketlaunch.fun/m/';
/** Storage is supplied by the integrating launcher. This SDK never uploads to BASKET. */
export const metadataUri = z.string().refine(uri => /^https:\/\/(?:arweave\.net|gateway\.irys\.xyz)\/[A-Za-z0-9_-]{43}$/.test(uri)
    || uri.startsWith('https://ipfs.io/ipfs/') && ipfsCid.safeParse(uri.slice('https://ipfs.io/ipfs/'.length)).success
    || uri.startsWith(basketContentPrefix) && basketContentKey.safeParse(uri.slice(basketContentPrefix.length)).success, 'Use a supported immutable metadata URI');
//# sourceMappingURL=metadata-uri.js.map