type Key = string;

const buckets = new Map<Key, { count: number; resetAt: number }>();

export function assertRateLimit(key: Key, limit: number, windowMs: number): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count < limit) {
    bucket.count += 1;
    return { ok: true };
  }

  return { ok: false, retryAfter: Math.max(0, Math.ceil((bucket.resetAt - now) / 1000)) };
}
