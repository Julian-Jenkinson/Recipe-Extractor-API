export function normalizeAppApiKeyMode(mode, hasKey) {
    if (typeof mode !== "string" || !mode.trim()) {
        return hasKey ? "on" : "off";
    }
    const normalized = mode.trim().toLowerCase();
    if (normalized === "off" || normalized === "warn" || normalized === "on") {
        return normalized;
    }
    return hasKey ? "on" : "off";
}
export function resolveAppApiKeyConfig({ appApiKey = "", appApiKeyMode = "", } = {}) {
    const key = typeof appApiKey === "string" ? appApiKey.trim() : "";
    return {
        mode: normalizeAppApiKeyMode(appApiKeyMode, key.length > 0),
        key,
    };
}
export function evaluateAppApiKey(config, candidate) {
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
//# sourceMappingURL=appApiKeyAuth.js.map