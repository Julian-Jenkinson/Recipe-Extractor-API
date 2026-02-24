import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import http from "node:http";
import https from "node:https";
import type { HtmlResponse, HttpGetter } from "../domain/contracts.js";
import { FETCH_TIMEOUT_MS, MAX_HTML_BYTES, USER_AGENT } from "../application/config.js";

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 100, maxFreeSockets: 20 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 100, maxFreeSockets: 20 });

export class AxiosHttpClient implements HttpGetter {
  constructor(private readonly client: AxiosInstance) {}

  async get(url: string): Promise<HtmlResponse> {
    const response: AxiosResponse<string> = await this.client.get(url);
    return {
      status: response.status,
      headers: response.headers as Record<string, unknown>,
      data: response.data,
    };
  }
}

export function createDefaultAxiosHttpClient(): AxiosHttpClient {
  const client = axios.create({
    timeout: FETCH_TIMEOUT_MS,
    maxRedirects: 0,
    maxContentLength: MAX_HTML_BYTES,
    maxBodyLength: MAX_HTML_BYTES,
    responseType: "text",
    decompress: true,
    httpAgent,
    httpsAgent,
    validateStatus: (status) => status >= 200 && status < 400,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
    },
  });

  return new AxiosHttpClient(client);
}

export function createFallbackAxiosHttpClient(): AxiosHttpClient {
  const client = axios.create({
    timeout: FETCH_TIMEOUT_MS + 2_000,
    maxRedirects: 0,
    maxContentLength: MAX_HTML_BYTES,
    maxBodyLength: MAX_HTML_BYTES,
    responseType: "text",
    decompress: true,
    httpAgent,
    httpsAgent,
    validateStatus: (status) => status >= 200 && status < 400,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      DNT: "1",
      Referer: "https://www.google.com/",
    },
  });

  return new AxiosHttpClient(client);
}
