export declare class TtlCache<T> {
    private readonly ttlMs;
    private readonly maxEntries;
    private readonly storage;
    constructor(ttlMs: number, maxEntries: number);
    get(key: string): T | null;
    set(key: string, value: T): void;
    clear(): void;
    prune(): void;
}
