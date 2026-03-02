import { config } from './config';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<number, Bucket>();

export const rateLimiter = {
  check(userId: number): boolean {
    const now = Date.now();
    const bucket = buckets.get(userId);

    if (!bucket || now >= bucket.resetAt) {
      buckets.set(userId, { count: 1, resetAt: now + config.rateLimitWindowMs });
      return true;
    }

    if (bucket.count >= config.rateLimitMax) {
      return false;
    }

    bucket.count++;
    return true;
  },
};

// Prune expired buckets every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [id, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(id);
  }
}, 5 * 60 * 1000).unref();
