import { RecipeExtractionError } from "../../domain/errors.js";
import { SOCIAL_APIFY_INSTAGRAM_ACTOR_ID, SOCIAL_APIFY_INSTAGRAM_REEL_ACTOR_ID, SOCIAL_APIFY_TIKTOK_ACTOR_ID, SOCIAL_APIFY_TIMEOUT_SECS, } from "../application/config.js";
function getRecord(value) {
    return value && typeof value === "object" ? value : null;
}
function firstString(value, fallback = "") {
    return typeof value === "string" ? value.trim() : fallback;
}
function stringList(value, limit = 0) {
    if (!Array.isArray(value))
        return [];
    const normalized = value
        .map((entry) => {
        if (typeof entry === "string")
            return entry.trim();
        if (entry && typeof entry === "object" && "text" in entry && typeof entry.text === "string") {
            return entry.text.trim();
        }
        return "";
    })
        .filter(Boolean);
    return limit > 0 ? normalized.slice(0, limit) : normalized;
}
function actorIdForPlatform(platform) {
    const configuredActorId = platform === "instagram" ? SOCIAL_APIFY_INSTAGRAM_ACTOR_ID : SOCIAL_APIFY_TIKTOK_ACTOR_ID;
    if (platform === "instagram" &&
        (configuredActorId === "apify/instagram-post-scraper" || configuredActorId === "apify/instagram-scraper")) {
        return "apify/instagram-api-scraper";
    }
    return configuredActorId;
}
function isInstagramReelUrl(url) {
    return /^\/reel\//.test(url.pathname);
}
function actorIdForRequest(input) {
    if (input.platform === "instagram" && isInstagramReelUrl(input.url)) {
        return SOCIAL_APIFY_INSTAGRAM_REEL_ACTOR_ID;
    }
    return actorIdForPlatform(input.platform);
}
function actorIdForApiPath(actorId) {
    return actorId.replace("/", "~");
}
function buildActorInput(input, actorId) {
    if (input.platform === "instagram") {
        if (actorId === SOCIAL_APIFY_INSTAGRAM_REEL_ACTOR_ID) {
            return {
                reel_urls: [input.url.toString()],
                resultsLimit: 1,
                commentsCount: 0,
            };
        }
        return {
            directUrls: [input.url.toString()],
            resultsLimit: 1,
            resultsType: "posts",
            commentsCount: 0,
        };
    }
    return {
        postURLs: [input.url.toString()],
        resultsPerPage: 1,
        commentsPerPost: 0,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        shouldDownloadSubtitles: false,
    };
}
function normalizeInstagramEvidence(item, url) {
    const canonicalUrl = firstString(item.url) || firstString(item.inputUrl) || firstString(item.shortCodeUrl) || url.toString();
    return {
        platform: "instagram",
        url: url.toString(),
        canonicalUrl,
        caption: firstString(item.caption) || firstString(item.text),
        comments: [],
        authorHandle: firstString(item.ownerUsername) || firstString(item.owner_username) || firstString(item.username) || "",
        titleHint: firstString(item.alt) || firstString(item.typeName),
        mediaType: firstString(item.type) || firstString(item.productType) || "post",
        metadata: {
            thumbnailUrl: firstString(item.displayUrl) || firstString(item.thumbnailUrl),
        },
    };
}
function normalizeInstagramReelEvidence(item, url) {
    const canonicalUrl = firstString(item.url) || firstString(item.reelUrl) || firstString(item.inputUrl) || url.toString();
    return {
        platform: "instagram",
        url: url.toString(),
        canonicalUrl,
        caption: firstString(item.caption) || firstString(item.text),
        comments: [],
        authorHandle: firstString(item.ownerUsername) || firstString(item.owner_username) || firstString(item.username) || "",
        titleHint: firstString(item.title) || firstString(item.alt) || "Instagram reel",
        mediaType: "reel",
        metadata: {
            thumbnailUrl: firstString(item.thumbnailUrl) || firstString(item.displayUrl),
        },
    };
}
function normalizeTikTokEvidence(item, url) {
    const authorMeta = getRecord(item.authorMeta);
    const covers = getRecord(item.covers);
    const videoMeta = getRecord(item.videoMeta);
    const canonicalUrl = firstString(item.webVideoUrl) || firstString(item.url) || url.toString();
    return {
        platform: "tiktok",
        url: url.toString(),
        canonicalUrl,
        caption: firstString(item.text) || firstString(item.desc) || firstString(item.caption),
        comments: [],
        authorHandle: firstString(authorMeta?.name) || firstString(authorMeta?.nickName) || firstString(item.author),
        titleHint: firstString(item.text) || firstString(item.desc),
        mediaType: "video",
        metadata: {
            thumbnailUrl: firstString(covers?.default) || firstString(item.coverUrl) || firstString(videoMeta?.coverUrl),
        },
    };
}
export class ApifySocialScrapeProvider {
    constructor(apiToken, fetchImpl = fetch) {
        this.apiToken = apiToken;
        this.fetchImpl = fetchImpl;
    }
    async scrape(input) {
        const actorId = actorIdForRequest(input);
        const actorInput = buildActorInput(input, actorId);
        const endpoint = `https://api.apify.com/v2/acts/${encodeURIComponent(actorIdForApiPath(actorId))}/run-sync-get-dataset-items?token=${encodeURIComponent(this.apiToken)}&timeout=${SOCIAL_APIFY_TIMEOUT_SECS}&clean=true`;
        const itemsResponse = await this.fetchImpl(endpoint, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(actorInput),
        });
        if (!itemsResponse.ok) {
            const responseText = await itemsResponse.text().catch(() => "");
            throw new RecipeExtractionError(502, "Apify scrape request failed", {
                provider: "apify",
                actorId,
                upstreamStatus: itemsResponse.status,
                platform: input.platform,
                upstreamBody: responseText.slice(0, 1000),
            });
        }
        const items = (await itemsResponse.json());
        const firstItem = Array.isArray(items) ? items[0] : undefined;
        if (!firstItem) {
            throw new RecipeExtractionError(422, "No social post data was returned for this URL", {
                provider: "apify",
                actorId,
                platform: input.platform,
                itemCount: Array.isArray(items) ? items.length : 0,
            });
        }
        if (input.platform === "instagram") {
            return actorId === SOCIAL_APIFY_INSTAGRAM_REEL_ACTOR_ID
                ? normalizeInstagramReelEvidence(firstItem, input.url)
                : normalizeInstagramEvidence(firstItem, input.url);
        }
        return normalizeTikTokEvidence(firstItem, input.url);
    }
}
//# sourceMappingURL=apifySocialScrapeProvider.js.map