/**
 * Module-level client cache.
 * Persists as long as the JS bundle stays in memory (same tab session).
 * Navigating back to a page that was fetched within `ttl` ms shows data instantly.
 */

interface CacheEntry {
  data: unknown;
  ts: number;
}

const store: Record<string, CacheEntry> = {};
const DEFAULT_TTL = 30_000; // 30 seconds

export function getCached<T>(key: string, ttl = DEFAULT_TTL): T | null {
  const entry = store[key];
  if (entry && Date.now() - entry.ts < ttl) return entry.data as T;
  return null;
}

export function setCached(key: string, data: unknown) {
  store[key] = { data, ts: Date.now() };
}

export function bustCache(key: string) {
  delete store[key];
}

export function bustCachePrefix(prefix: string) {
  for (const k of Object.keys(store)) {
    if (k.startsWith(prefix)) delete store[k];
  }
}

/**
 * Drop-in fetch wrapper: returns cached data immediately if fresh,
 * always re-fetches in background and updates the cache.
 * Pass an `onUpdate` callback to reflect background refresh in UI.
 */
export async function cachedFetch<T>(
  url: string,
  options?: { ttl?: number; onUpdate?: (data: T) => void }
): Promise<T> {
  const { ttl = DEFAULT_TTL, onUpdate } = options ?? {};
  const cached = getCached<T>(url, ttl);

  if (cached !== null) {
    // Return stale immediately, refresh in background
    fetch(url)
      .then((r) => r.json())
      .then((fresh: T) => {
        setCached(url, fresh);
        onUpdate?.(fresh);
      })
      .catch(() => {/* silently ignore background errors */});
    return cached;
  }

  // No cache — fetch and wait
  const res = await fetch(url);
  const data: T = await res.json();
  setCached(url, data);
  return data;
}
