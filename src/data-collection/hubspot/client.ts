import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { config } from '../../config';
import { createLogger } from '../../utils/logger';
import { sleep, retry } from '../../utils/helpers';
import { RateLimiter } from './rateLimiter';

const logger = createLogger('HubSpotClient');

export class HubSpotClient {
  private readonly http: AxiosInstance;
  private readonly rateLimiter: RateLimiter;

  constructor(apiKey: string, rateLimiter: RateLimiter) {
    this.rateLimiter = rateLimiter;
    this.http = axios.create({
      baseURL: config.hubspot.apiEndpoint,
      timeout: config.api.timeoutMs,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    await this.rateLimiter.acquire();
    return this.request<T>(() => this.http.get<T>(path, { params }));
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    await this.rateLimiter.acquire();
    return this.request<T>(() => this.http.post<T>(path, body));
  }

  private async request<T>(fn: () => Promise<AxiosResponse<T>>): Promise<T> {
    return retry(
      async () => {
        try {
          const response = await fn();
          return response.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;

            if (status === 401) {
              throw new Error('HubSpot authentication failed — check HUBSPOT_API_KEY');
            }

            if (status === 429) {
              const retryAfter = parseInt(
                (error.response?.headers as Record<string, string>)['retry-after'] ?? '10',
                10,
              );
              logger.warn('HubSpot rate limit hit, backing off', { retryAfterSeconds: retryAfter });
              await sleep(retryAfter * 1000);
              throw error;
            }

            if (status !== undefined && status >= 500) {
              logger.warn('HubSpot server error, will retry', { status });
              throw error;
            }
          }
          throw error;
        }
      },
      config.api.retryAttempts,
      config.api.retryBaseDelayMs,
    );
  }
}
