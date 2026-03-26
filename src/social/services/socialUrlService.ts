import { RecipeExtractionError } from "../../domain/errors.js";
import type { UrlGuard } from "../../domain/contracts.js";
import type { SocialPlatform } from "../domain/types.js";

const PLATFORM_HOSTS: Record<SocialPlatform, string[]> = {
  instagram: ["instagram.com"],
  tiktok: ["tiktok.com", "tiktokv.com"],
  youtube: ["youtube.com", "youtu.be"],
};

export class SocialUrlService {
  constructor(private readonly urlGuard: UrlGuard) {}

  validateAndNormalize(inputUrl: string): { url: URL; platform: SocialPlatform; cacheKey: string } {
    const url = this.urlGuard.validateAndNormalizeUrl(inputUrl);
    const hostname = url.hostname.toLowerCase();
    const platform = this.detectPlatform(hostname);

    if (!platform) {
      throw new RecipeExtractionError(400, "Only Instagram, TikTok, and YouTube URLs are supported for social extraction");
    }

    url.hash = "";

    this.validatePlatformPath(url, platform);
    this.stripNonCanonicalParams(url, platform);

    return {
      url,
      platform,
      cacheKey: `${platform}:${url.toString()}`,
    };
  }

  private detectPlatform(hostname: string): SocialPlatform | null {
    for (const [platform, allowedHosts] of Object.entries(PLATFORM_HOSTS) as [SocialPlatform, string[]][]) {
      if (allowedHosts.some((baseHost) => hostname === baseHost || hostname.endsWith(`.${baseHost}`))) {
        return platform;
      }
    }

    return null;
  }

  private validatePlatformPath(url: URL, platform: SocialPlatform): void {
    if (platform === "instagram") {
      if (!/^\/(reel|p)\/[^/]+/.test(url.pathname)) {
        throw new RecipeExtractionError(400, "Instagram extraction requires a direct post or reel URL", {
          platform,
          failurePhase: "validate",
        });
      }
      return;
    }

    if (platform === "tiktok" && !/^\/@[^/]+\/video\/[^/]+/.test(url.pathname)) {
      throw new RecipeExtractionError(400, "TikTok extraction requires a direct video URL", {
        platform,
        failurePhase: "validate",
      });
    }

    if (platform === "youtube") {
      if (url.hostname.endsWith("youtu.be")) {
        if (!/^\/[^/]+/.test(url.pathname)) {
          throw new RecipeExtractionError(400, "YouTube extraction requires a direct video or Shorts URL", {
            platform,
            failurePhase: "validate",
          });
        }
        return;
      }

      const isShorts = /^\/shorts\/[^/]+/.test(url.pathname);
      const isWatch = url.pathname === "/watch" && !!url.searchParams.get("v");
      if (!isShorts && !isWatch) {
        throw new RecipeExtractionError(400, "YouTube extraction requires a direct video or Shorts URL", {
          platform,
          failurePhase: "validate",
        });
      }
    }
  }

  private stripNonCanonicalParams(url: URL, platform: SocialPlatform): void {
    if (platform === "youtube" && url.pathname === "/watch") {
      const videoId = url.searchParams.get("v");
      url.search = "";
      if (videoId) {
        url.searchParams.set("v", videoId);
      }
      return;
    }

    // Shared links often include tracking params that are not useful for caching.
    url.search = "";
  }
}
