type CacheItem<T> = {
  data: T;
  timestamp: number;
};

const CACHE_KEY = "twitter_cache";
const CACHE_DURATION = 60000; // 1 minute

export const cache = {
  get<T>(): CacheItem<T> | null {
    if (typeof window === "undefined") return null;

    try {
      const item = localStorage.getItem(CACHE_KEY);
      if (!item) return null;

      const cached = JSON.parse(item) as CacheItem<T>;
      if (Date.now() - cached.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      return cached;
    } catch {
      return null;
    }
  },

  set<T>(data: T): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data, timestamp: Date.now() })
      );
    } catch {
      localStorage.removeItem(CACHE_KEY);
    }
  },
};
