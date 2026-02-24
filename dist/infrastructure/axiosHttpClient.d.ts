import { type AxiosInstance } from "axios";
import type { HtmlResponse, HttpGetter } from "../domain/contracts.js";
export declare class AxiosHttpClient implements HttpGetter {
    private readonly client;
    constructor(client: AxiosInstance);
    get(url: string): Promise<HtmlResponse>;
}
export declare function createDefaultAxiosHttpClient(): AxiosHttpClient;
export declare function createFallbackAxiosHttpClient(): AxiosHttpClient;
