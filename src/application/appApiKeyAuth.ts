export type AppApiKeyMode = "off" | "warn" | "on";

export interface AppApiKeyConfigInput {
  appApiKey?: string;
  appApiKeyMode?: string;
}

export interface ResolvedAppApiKeyConfig {
  mode: AppApiKeyMode;
  key: string;
}

export interface AppApiKeyEvaluation {
  allow: boolean;
  shouldWarn: boolean;
}

export function normalizeAppApiKeyMode(mode: string | undefined, hasKey: boolean): AppApiKeyMode {
  if (typeof mode !== "string" || !mode.trim()) {
    return hasKey ? "on" : "off";
  }

  const normalized = mode.trim().toLowerCase();
  if (normalized === "off" || normalized === "warn" || normalized === "on") {
    return normalized;
  }

  return hasKey ? "on" : "off";
}

export function resolveAppApiKeyConfig({
  appApiKey = "",
  appApiKeyMode = "",
}: AppApiKeyConfigInput = {}): ResolvedAppApiKeyConfig {
  const key = typeof appApiKey === "string" ? appApiKey.trim() : "";
  return {
    mode: normalizeAppApiKeyMode(appApiKeyMode, key.length > 0),
    key,
  };
}

export function evaluateAppApiKey(
  config: ResolvedAppApiKeyConfig,
  candidate: string | undefined
): AppApiKeyEvaluation {
  if (!config.key || config.mode === "off") {
    return {
      allow: true,
      shouldWarn: false,
    };
  }

  if (typeof candidate === "string" && candidate.trim() === config.key) {
    return {
      allow: true,
      shouldWarn: false,
    };
  }

  if (config.mode === "warn") {
    return {
      allow: true,
      shouldWarn: true,
    };
  }

  return {
    allow: false,
    shouldWarn: false,
  };
}
