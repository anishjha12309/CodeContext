/**
 * Rate Limiter for Gemini API Free Tier
 * 
 * Implements token bucket algorithm with separate limits for different model types:
 * - Generation models (gemini-2.5-flash-lite): 15 RPM
 * - Embedding models (text-embedding-004): 1500 RPM
 */

export type ModelType = 'generation' | 'embedding';

interface RateLimitConfig {
  requestsPerMinute: number;
  name: string;
}

const RATE_LIMITS: Record<ModelType, RateLimitConfig> = {
  generation: {
    requestsPerMinute: 15,
    name: 'Gemini Generation',
  },
  embedding: {
    requestsPerMinute: 1500,
    name: 'Gemini Embedding',
  },
};

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond

  constructor(requestsPerMinute: number) {
    this.maxTokens = requestsPerMinute;
    this.tokens = requestsPerMinute;
    this.lastRefill = Date.now();
    this.refillRate = requestsPerMinute / 60000; // per millisecond
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  async acquire(count: number = 1): Promise<void> {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return;
    }

    // Calculate wait time
    const tokensNeeded = count - this.tokens;
    const waitTime = Math.ceil(tokensNeeded / this.refillRate);
    
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    this.refill();
    this.tokens -= count;
  }

  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  getWaitTimeMs(count: number = 1): number {
    this.refill();
    if (this.tokens >= count) return 0;
    const tokensNeeded = count - this.tokens;
    return Math.ceil(tokensNeeded / this.refillRate);
  }
}

class RateLimiter {
  private static instance: RateLimiter;
  private buckets: Map<ModelType, TokenBucket> = new Map();

  private constructor() {
    // Initialize buckets for each model type
    for (const [type, config] of Object.entries(RATE_LIMITS)) {
      this.buckets.set(type as ModelType, new TokenBucket(config.requestsPerMinute));
    }
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Acquire permission to make API calls
   * Will wait if rate limit would be exceeded
   */
  async acquire(modelType: ModelType, count: number = 1): Promise<void> {
    const bucket = this.buckets.get(modelType);
    if (!bucket) {
      throw new Error(`Unknown model type: ${modelType}`);
    }

    const waitTime = bucket.getWaitTimeMs(count);
    if (waitTime > 0) {
      console.log(`⏳ Rate limit: waiting ${Math.ceil(waitTime / 1000)}s for ${RATE_LIMITS[modelType].name}...`);
    }

    await bucket.acquire(count);
  }

  /**
   * Get optimal batch size for current rate
   */
  getOptimalBatchSize(modelType: ModelType): number {
    const bucket = this.buckets.get(modelType);
    if (!bucket) return 1;

    // For embedding model, we can batch aggressively (up to 25 per second)
    if (modelType === 'embedding') {
      return Math.min(25, bucket.getAvailableTokens());
    }

    // For generation model, process 1 at a time to be safe
    return 1;
  }

  /**
   * Get minimum delay between calls in milliseconds
   */
  getMinDelayMs(modelType: ModelType): number {
    const config = RATE_LIMITS[modelType];
    // Add 10% buffer for safety
    return Math.ceil((60000 / config.requestsPerMinute) * 1.1);
  }

  /**
   * Get available capacity
   */
  getAvailableCapacity(modelType: ModelType): number {
    const bucket = this.buckets.get(modelType);
    return bucket?.getAvailableTokens() ?? 0;
  }
}

// Export singleton instance
export const rateLimiter = RateLimiter.getInstance();

// Export helper functions for convenience
export const acquireGenerationSlot = () => rateLimiter.acquire('generation');
export const acquireEmbeddingSlots = (count: number) => rateLimiter.acquire('embedding', count);
export const getGenerationDelay = () => rateLimiter.getMinDelayMs('generation');
export const getEmbeddingBatchSize = () => rateLimiter.getOptimalBatchSize('embedding');
