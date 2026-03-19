import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { RecipeExtractionError } from "../../domain/errors.js";
const execFileAsync = promisify(execFile);
function firstString(value) {
    return typeof value === "string" ? value.trim() : "";
}
export class YtDlpTikTokScrapeProvider {
    constructor(command = "yt-dlp") {
        this.command = command;
    }
    async scrape(input) {
        if (input.platform !== "tiktok") {
            throw new RecipeExtractionError(400, "yt-dlp scrape provider only supports TikTok URLs", {
                provider: "yt-dlp",
                platform: input.platform,
            });
        }
        if (input.scraper === "apify") {
            throw new RecipeExtractionError(501, "Apify is disabled for TikTok extraction", {
                provider: "yt-dlp",
                platform: input.platform,
            });
        }
        try {
            const { stdout } = await execFileAsync(this.command, ["--dump-single-json", "--no-download", input.url.toString()], {
                maxBuffer: 1024 * 1024,
            });
            const payload = JSON.parse(stdout);
            const canonicalUrl = firstString(payload.webpage_url) || input.url.toString();
            const caption = firstString(payload.description);
            const authorHandle = firstString(payload.uploader_id) || firstString(payload.uploader);
            const titleHint = firstString(payload.fulltitle) || caption;
            return {
                platform: "tiktok",
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
            const stderr = typeof error?.stderr === "string" ? error.stderr.trim() : "";
            throw new RecipeExtractionError(502, "yt-dlp failed to extract TikTok metadata", {
                provider: "yt-dlp",
                failurePhase: "scrape",
                upstreamBody: stderr.slice(0, 1000),
            });
        }
    }
}
//# sourceMappingURL=ytDlpTikTokScrapeProvider.js.map