import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Token bucket fallback for development/environments without Upstash
class TokenBucket {
  private tokens: Map<string, { count: number; lastRefill: number }> = new Map();
  private capacity: number;
  private refillRate: number;
  private refillInterval: number;

  constructor(capacity: number, refillRate: number, refillInterval: number = 60000) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.refillInterval = refillInterval;
  }

  async limit(identifier: string): Promise<{ success: boolean; remaining: number }> {
    const now = Date.now();
    let bucket = this.tokens.get(identifier);

    if (!bucket) {
      bucket = { count: this.capacity, lastRefill: now };
      this.tokens.set(identifier, bucket);
    }

    // Refill tokens based on time passed
    const timePassed = now - bucket.lastRefill;
    const refills = Math.floor(timePassed / this.refillInterval);
    if (refills > 0) {
      bucket.count = Math.min(this.capacity, bucket.count + refills * this.refillRate);
      bucket.lastRefill = now;
    }

    if (bucket.count > 0) {
      bucket.count--;
      return { success: true, remaining: bucket.count };
    }

    return { success: false, remaining: 0 };
  }
}

// Initialize rate limiter
let rateLimiter: Ratelimit | TokenBucket;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  // Production: Use Upstash Redis
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  rateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
    analytics: true,
  });
} else {
  // Development/Fallback: Use in-memory token bucket
  // TODO: Move to Upstash in production
  console.warn("⚠️  Using in-memory rate limiter. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for production.");
  rateLimiter = new TokenBucket(10, 10, 60000); // 10 tokens, refill 10 per minute
}

export async function checkRateLimit(identifier: string): Promise<{ success: boolean; remaining?: number }> {
  try {
    const result = await rateLimiter.limit(identifier);
    return result;
  } catch (error) {
    console.error("Rate limiter error:", error);
    // Fail open in case of rate limiter errors
    return { success: true };
  }
}
