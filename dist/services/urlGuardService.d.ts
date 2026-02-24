export type LookupResult = {
    address: string;
    family: number;
};
export type LookupFn = (hostname: string, options: {
    all: true;
    verbatim: true;
}) => Promise<LookupResult[]>;
export declare function isPrivateOrReservedIPv4(address: string): boolean;
export declare function isPrivateOrReservedIPv6(address: string): boolean;
export declare function isPrivateOrReservedAddress(address: string): boolean;
declare const defaultDnsLookupFn: LookupFn;
export declare class UrlGuardService {
    private readonly maxUrlLength;
    private readonly dnsLookupFn;
    constructor(maxUrlLength: number, dnsLookupFn?: LookupFn);
    validateAndNormalizeUrl(inputUrl: string): URL;
    assertPublicDestination(url: URL): Promise<void>;
}
export { defaultDnsLookupFn };
