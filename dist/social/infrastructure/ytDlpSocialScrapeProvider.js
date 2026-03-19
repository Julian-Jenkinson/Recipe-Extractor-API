import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { RecipeExtractionError } from "../../domain/errors.js";
import { SOCIAL_YT_DLP_TIMEOUT_MS } from "../application/config.js";
const execFileAsync = promisify(execFile);
function firstString(value) {
    return typeof value === "string" ? value.trim() : "";
}
export class YtDlpSocialScrapeProvider {
    constructor(command = "yt-dlp", timeoutMs = SOCIAL_YT_DLP_TIMEOUT_MS) {
        this.command = command;
        this.timeoutMs = timeoutMs;
    }
    async scrape(input) {
        try {
            const { stdout } = await execFileAsync(this.command, ["--dump-single-json", "--no-download", input.url.toString()], {
                maxBuffer: 1024 * 1024,
                timeout: this.timeoutMs,
            });
            const payload = JSON.parse(stdout);
            const canonicalUrl = firstString(payload.webpage_url) || input.url.toString();
            const caption = firstString(payload.description);
            const authorHandle = firstString(payload.uploader_id) || firstString(payload.uploader);
            const titleHint = firstString(payload.fulltitle) || firstString(payload.title) || caption;
            return {
                platform: input.platform,
                url: input.url.toString(),
                canonicalUrl,
                caption,
                comments: [],
                authorHandle,
                titleHint,
                mediaType: "video",
                metadata: {
                    thumbnailUrl: firstString(payload.thumbnail),
                },
            };
        }
        catch (error) {
            if (error?.code === "ENOENT") {
                throw new RecipeExtractionError(503, "yt-dlp is not installed on this server", {
                    provider: "yt-dlp",
                    failurePhase: "scrape",
                });
            }
            if (error?.killed || error?.signal === "SIGTERM") {
                throw new RecipeExtractionError(504, "yt-dlp timed out while extracting social metadata", {
                    provider: "yt-dlp",
                    platform: input.platform,
                    failurePhase: "scrape",
                    upstreamTimeoutMs: this.timeoutMs,
                });
            }
            const stderr = typeof error?.stderr === "string" ? error.stderr.trim() : "";
            throw new RecipeExtractionError(502, "yt-dlp failed to extract social metadata", {
                provider: "yt-dlp",
                platform: input.platform,
                failurePhase: "scrape",
                upstreamBody: stderr.slice(0, 1000),
            });
        }
    }
}
//# sourceMappingURL=ytDlpSocialScrapeProvider.js.map