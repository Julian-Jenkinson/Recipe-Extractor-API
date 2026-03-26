import type { UrlGuard } from "../../domain/contracts.js";
import type { SocialPlatform } from "../domain/types.js";
export declare class SocialUrlService {
    private readonly urlGuard;
    constructor(urlGuard: UrlGuard);
    validateAndNormalize(inputUrl: string): {
        url: URL;
        platform: SocialPlatform;
        cacheKey: string;
    };
    private detectPlatform;
    private validatePlatformPath;
    private stripNonCanonicalParams;
}
