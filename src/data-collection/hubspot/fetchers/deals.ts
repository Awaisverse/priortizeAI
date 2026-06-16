import type { Deal } from '../../../models';
import { createLogger } from '../../../utils/logger';
import { HubSpotClient } from '../client';
import { CacheManager } from '../../cache/cacheManager';
import { dealCacheKey, todayDateKey } from '../../cache/strategies';
import {
  hubspotTransformer,
  type HubSpotRawDeal,
  type HubSpotSearchResponse,
} from '../../normalizers/hubspotTransformer';
import { config } from '../../../config';

const logger = createLogger('DealFetcher');

interface DealSearchBody {
  filterGroups: { filters: { propertyName: string; operator: string; value: string }[] }[];
  properties: string[];
  limit: number;
  after?: string;
}

export class DealFetcher {
  constructor(
    private readonly client: HubSpotClient,
    private readonly cache: CacheManager,
  ) {}

  async fetchForAE(aeId: string): Promise<Deal[]> {
    const cacheKey = dealCacheKey(aeId, todayDateKey());
    const cached = this.cache.get<Deal[]>(cacheKey);
    if (cached !== null) {
      logger.debug('Cache hit', { aeId, count: cached.length });
      return cached;
    }

    const deals: Deal[] = [];
    let after: string | undefined;

    do {
      const body: DealSearchBody = {
        filterGroups: [
          {
            filters: [
              { propertyName: 'hubspot_owner_id', operator: 'EQ', value: aeId },
              { propertyName: 'hs_is_closed', operator: 'EQ', value: 'false' },
            ],
          },
        ],
        properties: [
          'dealname',
          'amount',
          'closedate',
          'pipeline',
          'dealstage',
          'hubspot_owner_id',
          'hs_deal_stage_probability',
          'notes_last_contacted',
          'description',
          'createdate',
          'hs_lastmodifieddate',
          'hs_closed_won_date',
        ],
        limit: config.hubspot.pageSize,
      };
      if (after) body.after = after;

      const response = await this.client.post<HubSpotSearchResponse<HubSpotRawDeal>>(
        '/crm/v3/objects/deals/search',
        body,
      );

      for (const raw of response.results) {
        deals.push(hubspotTransformer.transformDeal(raw));
      }

      after = response.paging?.next?.after;
    } while (after);

    this.cache.set(cacheKey, deals);
    logger.info('Fetched deals', { aeId, count: deals.length });
    return deals;
  }
}
