interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T> {
  private readonly storage = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number, private readonly maxEntries: number) {}

  get(key: string): T | null {
    const entry = this.storage.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.storage.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.ttlMs <= 0 || this.maxEntries <= 0) return;
    this.prune();
    this.storage.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.storage.clear();
  }

  prune(): void {
    if (this.storage.size < this.maxEntries) return;

    const now = Date.now();
    for (const [key, entry] of this.storage.entries()) {
      if (entry.expiresAt <= now) {
        this.storage.delete(key);
      }
    }

    if (this.storage.size < this.maxEntries) return;

    const oldestKey = this.storage.keys().next().value;
    if (oldestKey) {
      this.storage.delete(oldestKey);
    }
  }
}
