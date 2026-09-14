import { z } from 'zod';
// Fixed content identifiers only: no mutable names, queries, credentials or paths.
// CIDv1 base32, sha2-256, dag-pb or raw; uploads request CIDv1.
export const ipfsCid = z.string().regex(/^baf(?:ybei|krei)[a-z2-7]{51}[aeimquy4]$/);
export const metadataUri = z.string().refine(uri => /^https:\/\/(?:arweave\.net|gateway\.irys\.xyz)\/[A-Za-z0-9_-]{43}$/.test(uri) || uri.startsWith('https://ipfs.io/ipfs/') && ipfsCid.safeParse(uri.slice('https://ipfs.io/ipfs/'.length)).success, 'Use a supported immutable metadata URI');
export function metadataDisplayUri(uri) {
    return uri.startsWith('https://ipfs.io/ipfs/') && metadataUri.safeParse(uri).success ? '/api/backend/storage/content/' + uri.slice('https://ipfs.io/ipfs/'.length) : uri;
}
//# sourceMappingURL=metadata-uri.js.map