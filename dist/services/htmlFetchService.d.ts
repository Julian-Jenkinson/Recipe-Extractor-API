import type { HtmlResponse, HttpGetter } from "../domain/contracts.js";
import type { UrlGuardService } from "./urlGuardService.js";
declare function isTransientAxiosError(error: unknown): boolean;
export declare class HtmlFetchService {
    private readonly httpGetter;
    private readonly urlGuard;
    private readonly fallbackHttpGetter?;
    constructor(httpGetter: HttpGetter, urlGuard: UrlGuardService, fallbackHttpGetter?: HttpGetter | undefined);
    fetchHtmlWithRetry(url: URL): Promise<HtmlResponse>;
    fetchHtmlWithRetryDetailed(url: URL): Promise<{
        response: HtmlResponse;
        fetchProfile: "primary" | "fallback";
    }>;
    fetchHtmlSafely(initialUrl: URL): Promise<{
        html: string;
        finalUrl: URL;
        fetchProfile: "primary" | "fallback";
    }>;
}
export { isTransientAxiosError };
