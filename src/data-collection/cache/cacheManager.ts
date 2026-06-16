import NodeCache from 'node-cache';
import { config } from '../../config';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CacheManager');

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  keys: number;
}

export class CacheManager {
  private readonly cache: NodeCache;
  private hits = 0;
  private misses = 0;
  private readonly enabled: boolean;

  constructor(ttlSeconds?: number, checkPeriodSeconds?: number) {
    this.enabled = config.cache.enabled;
    this.cache = new NodeCache({
      stdTTL: ttlSeconds ?? config.cache.ttlSeconds,
      checkperiod: checkPeriodSeconds ?? config.cache.checkPeriodSeconds,
      useClones: false,
    });
  }

  get<T>(key: string): T | null {
    if (!this.enabled) return null;
    const value = this.cache.get<T>(key);
    if (value === undefined) {
      this.misses++;
      return null;
    }
    this.hits++;
    return value;
  }

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    if (!this.enabled) return;
    if (ttlSeconds !== undefined) {
      this.cache.set(key, value, ttlSeconds);
    } else {
      this.cache.set(key, value);
    }
  }

  del(key: string): void {
    this.cache.del(key);
  }

  flush(): void {
    this.cache.flushAll();
    this.hits = 0;
    this.misses = 0;
    logger.debug('Cache flushed');
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
      keys: this.cache.keys().length,
    };
  }
}
