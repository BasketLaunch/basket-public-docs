import { z } from 'zod';
function publicHttpsUri(uri) {
    if (new TextEncoder().encode(uri).length > 200 || uri.includes('?') || uri.includes('#'))
        return false;
    const authority = uri.startsWith('https://') ? uri.slice(8).split('/', 1)[0] : '';
    if (!authority || authority.includes('@') || authority.includes(':'))
        return false;
    let parsed;
    try {
        parsed = new URL(uri);
    }
    catch {
        return false;
    }
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.port
        && parsed.pathname.length > 1 && host.includes('.') && host !== 'localhost' && !host.endsWith('.local')
        && !/^\d+(?:\.\d+){3}$/.test(host);
}
/** Storage is supplied by the integrating launcher. This SDK never uploads to BASKET. */
export const metadataUri = z.string().min(12).max(200).refine(publicHttpsUri, 'Use a public HTTPS metadata URI');
//# sourceMappingURL=metadata-uri.js.map