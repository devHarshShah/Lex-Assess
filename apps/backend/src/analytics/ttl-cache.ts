// Tiny in-process cache so refreshing a dashboard doesn't rescan every user each time.
// Per-instance and short-lived on purpose: numbers can lag by up to `ttlMs`.
const store = new Map<string, { at: number; value: Promise<unknown> }>();

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  if (store.size >= 100) store.delete(store.keys().next().value as string); // custom date ranges must not grow this forever
  const value = load();
  store.set(key, { at: Date.now(), value });
  value.catch(() => store.delete(key)); // never cache a failure
  return value;
}

export const clearCache = () => store.clear();
