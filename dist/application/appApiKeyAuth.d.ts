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
export declare function normalizeAppApiKeyMode(mode: string | undefined, hasKey: boolean): AppApiKeyMode;
export declare function resolveAppApiKeyConfig({ appApiKey, appApiKeyMode, }?: AppApiKeyConfigInput): ResolvedAppApiKeyConfig;
export declare function evaluateAppApiKey(config: ResolvedAppApiKeyConfig, candidate: string | undefined): AppApiKeyEvaluation;
