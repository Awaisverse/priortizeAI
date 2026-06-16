import { config } from '../../config';
import { sleep } from '../../utils/helpers';
import { createLogger } from '../../utils/logger';

const logger = createLogger('RateLimiter');

export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly windowMs: number;
  private lastRefill: number;
  private totalRequests = 0;

  constructor() {
    this.maxTokens = config.hubspot.rateLimit.requestsPerWindow;
    this.windowMs = config.hubspot.rateLimit.windowMs;
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens > 0) {
      this.tokens--;
      this.totalRequests++;
      return;
    }

    const waitMs = this.windowMs - (Date.now() - this.lastRefill);
    logger.debug('Rate limit reached, waiting', { waitMs });
    await sleep(waitMs > 0 ? waitMs : 0);

    this.refill();
    this.tokens--;
    this.totalRequests++;
  }

  private refill(): void {
    const now = Date.now();
    if (now - this.lastRefill >= this.windowMs) {
      this.tokens = this.maxTokens;
      this.lastRefill = now;
    }
  }

  getTotalRequests(): number {
    return this.totalRequests;
  }
}
