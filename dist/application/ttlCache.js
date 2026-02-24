export class TtlCache {
    constructor(ttlMs, maxEntries) {
        this.ttlMs = ttlMs;
        this.maxEntries = maxEntries;
        this.storage = new Map();
    }
    get(key) {
        const entry = this.storage.get(key);
        if (!entry)
            return null;
        if (entry.expiresAt <= Date.now()) {
            this.storage.delete(key);
            return null;
        }
        return entry.value;
    }
    set(key, value) {
        if (this.ttlMs <= 0 || this.maxEntries <= 0)
            return;
        this.prune();
        this.storage.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    }
    clear() {
        this.storage.clear();
    }
    prune() {
        if (this.storage.size < this.maxEntries)
            return;
        const now = Date.now();
        for (const [key, entry] of this.storage.entries()) {
            if (entry.expiresAt <= now) {
                this.storage.delete(key);
            }
        }
        if (this.storage.size < this.maxEntries)
            return;
        const oldestKey = this.storage.keys().next().value;
        if (oldestKey) {
            this.storage.delete(oldestKey);
        }
    }
}
//# sourceMappingURL=ttlCache.js.map