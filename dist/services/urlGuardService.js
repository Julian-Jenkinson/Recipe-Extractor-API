import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { RecipeExtractionError } from "../domain/errors.js";
export function isPrivateOrReservedIPv4(address) {
    const octets = address.split(".").map(Number);
    if (octets.length !== 4 || octets.some((value) => Number.isNaN(value))) {
        return true;
    }
    const [a, b] = octets;
    if (a === 10)
        return true;
    if (a === 127)
        return true;
    if (a === 0)
        return true;
    if (a === 169 && b === 254)
        return true;
    if (a === 172 && b >= 16 && b <= 31)
        return true;
    if (a === 192 && b === 168)
        return true;
    if (a === 100 && b >= 64 && b <= 127)
        return true;
    if (a === 198 && (b === 18 || b === 19))
        return true;
    if (a >= 224)
        return true;
    return false;
}
export function isPrivateOrReservedIPv6(address) {
    const normalized = address.toLowerCase();
    return (normalized === "::1" ||
        normalized === "::" ||
        normalized.startsWith("fc") ||
        normalized.startsWith("fd") ||
        normalized.startsWith("fe8") ||
        normalized.startsWith("fe9") ||
        normalized.startsWith("fea") ||
        normalized.startsWith("feb") ||
        normalized.startsWith("::ffff:10.") ||
        normalized.startsWith("::ffff:127.") ||
        normalized.startsWith("::ffff:169.254.") ||
        normalized.startsWith("::ffff:172.16.") ||
        normalized.startsWith("::ffff:172.17.") ||
        normalized.startsWith("::ffff:172.18.") ||
        normalized.startsWith("::ffff:172.19.") ||
        normalized.startsWith("::ffff:172.2") ||
        normalized.startsWith("::ffff:172.30.") ||
        normalized.startsWith("::ffff:172.31.") ||
        normalized.startsWith("::ffff:192.168."));
}
export function isPrivateOrReservedAddress(address) {
    const version = isIP(address);
    if (version === 4)
        return isPrivateOrReservedIPv4(address);
    if (version === 6)
        return isPrivateOrReservedIPv6(address);
    return true;
}
const defaultDnsLookupFn = async (hostname, options) => {
    const result = await lookup(hostname, options);
    return result;
};
export class UrlGuardService {
    constructor(maxUrlLength, dnsLookupFn = defaultDnsLookupFn) {
        this.maxUrlLength = maxUrlLength;
        this.dnsLookupFn = dnsLookupFn;
    }
    validateAndNormalizeUrl(inputUrl) {
        if (typeof inputUrl !== "string") {
            throw new RecipeExtractionError(400, "URL must be a string");
        }
        const trimmed = inputUrl.trim();
        if (!trimmed) {
            throw new RecipeExtractionError(400, "Missing URL parameter");
        }
        if (trimmed.length > this.maxUrlLength) {
            throw new RecipeExtractionError(400, "URL is too long");
        }
        let parsed;
        try {
            parsed = new URL(trimmed);
        }
        catch {
            throw new RecipeExtractionError(400, "Invalid URL format");
        }
        if (!["http:", "https:"].includes(parsed.protocol)) {
            throw new RecipeExtractionError(400, "Only HTTP(S) URLs are allowed");
        }
        if (!parsed.hostname) {
            throw new RecipeExtractionError(400, "Invalid URL host");
        }
        if (parsed.username || parsed.password) {
            throw new RecipeExtractionError(400, "Credentials in URL are not allowed");
        }
        if (parsed.port && !["80", "443"].includes(parsed.port)) {
            throw new RecipeExtractionError(400, "Only standard web ports are allowed");
        }
        const hostname = parsed.hostname.toLowerCase();
        if (hostname === "localhost" ||
            hostname.endsWith(".localhost") ||
            hostname.endsWith(".local") ||
            hostname.endsWith(".internal")) {
            throw new RecipeExtractionError(400, "Local/private hosts are not allowed");
        }
        return parsed;
    }
    async assertPublicDestination(url) {
        const host = url.hostname;
        const literalIpVersion = isIP(host);
        if (literalIpVersion && isPrivateOrReservedAddress(host)) {
            throw new RecipeExtractionError(400, "Private network targets are not allowed");
        }
        let addresses;
        try {
            addresses = await this.dnsLookupFn(host, { all: true, verbatim: true });
        }
        catch {
            throw new RecipeExtractionError(422, "Unable to resolve target URL host");
        }
        if (!addresses.length) {
            throw new RecipeExtractionError(422, "Unable to resolve target URL host");
        }
        for (const { address } of addresses) {
            if (isPrivateOrReservedAddress(address)) {
                throw new RecipeExtractionError(400, "Private network targets are not allowed");
            }
        }
    }
}
export { defaultDnsLookupFn };
//# sourceMappingURL=urlGuardService.js.map