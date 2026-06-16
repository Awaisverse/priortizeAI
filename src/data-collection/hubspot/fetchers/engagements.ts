import type { EngagementRecord } from '../../../models';
import { createLogger } from '../../../utils/logger';
import { HubSpotClient } from '../client';
import { CacheManager } from '../../cache/cacheManager';
import { engagementCacheKey, todayDateKey } from '../../cache/strategies';
import {
  hubspotTransformer,
  type HubSpotRawEngagement,
  type HubSpotSearchResponse,
} from '../../normalizers/hubspotTransformer';

const logger = createLogger('EngagementFetcher');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class EngagementFetcher {
  constructor(
    private readonly client: HubSpotClient,
    private readonly cache: CacheManager,
  ) {}

  async fetchForAE(aeId: string): Promise<EngagementRecord[]> {
    const cacheKey = engagementCacheKey(aeId, todayDateKey());
    const cached = this.cache.get<EngagementRecord[]>(cacheKey);
    if (cached !== null) {
      logger.debug('Cache hit', { aeId, count: cached.length });
      return cached;
    }

    const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
    const engagements: EngagementRecord[] = [];
    let after: string | undefined;

    do {
      const body: Record<string, unknown> = {
        filterGroups: [
          {
            filters: [
              { propertyName: 'hubspot_owner_id', operator: 'EQ', value: aeId },
              { propertyName: 'hs_timestamp', operator: 'GTE', value: thirtyDaysAgo },
            ],
          },
        ],
        properties: [
          'hs_engagement_type',
          'hs_timestamp',
          'hs_body_preview',
          'hs_email_subject',
          'hs_call_duration',
          'hs_meeting_outcome',
          'hubspot_owner_id',
          'hs_contact_id',
          'hs_deal_id',
        ],
        sorts: [{ propertyName: 'hs_timestamp', direction: 'DESCENDING' }],
        limit: 100,
      };
      if (after) body['after'] = after;

      const response = await this.client.post<HubSpotSearchResponse<HubSpotRawEngagement>>(
        '/crm/v3/objects/engagements/search',
        body,
      );

      for (const raw of response.results) {
        engagements.push(hubspotTransformer.transformEngagement(raw));
      }

      after = response.paging?.next?.after;

      // Cap at 200 most recent engagements
      if (engagements.length >= 200) break;
    } while (after);

    this.cache.set(cacheKey, engagements);
    logger.info('Fetched engagements', { aeId, count: engagements.length });
    return engagements;
  }
}
