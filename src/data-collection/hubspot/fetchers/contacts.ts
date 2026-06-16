import type { Contact } from '../../../models';
import { createLogger } from '../../../utils/logger';
import { HubSpotClient } from '../client';
import { CacheManager } from '../../cache/cacheManager';
import { contactCacheKey, todayDateKey } from '../../cache/strategies';
import {
  hubspotTransformer,
  type HubSpotRawContact,
  type HubSpotSearchResponse,
} from '../../normalizers/hubspotTransformer';
import { config } from '../../../config';
import { chunkArray } from '../../../utils/helpers';

const logger = createLogger('ContactFetcher');

const CONTACT_PROPERTIES = [
  'firstname',
  'lastname',
  'email',
  'phone',
  'jobtitle',
  'company',
  'hubspot_owner_id',
  'notes_last_contacted',
  'num_contacted_notes',
  'hs_email_last_send_date',
  'createdate',
  'hs_lastmodifieddate',
];

export class ContactFetcher {
  constructor(
    private readonly client: HubSpotClient,
    private readonly cache: CacheManager,
  ) {}

  async fetchForDeals(aeId: string, dealIds: string[]): Promise<Contact[]> {
    if (dealIds.length === 0) return [];

    const cacheKey = contactCacheKey(aeId, todayDateKey());
    const cached = this.cache.get<Contact[]>(cacheKey);
    if (cached !== null) {
      logger.debug('Cache hit', { aeId, count: cached.length });
      return cached;
    }

    // HubSpot limits filter values to 100 items; chunk deal IDs
    const chunks = chunkArray(dealIds, 100);
    const contactMap = new Map<string, Contact>();

    for (const chunk of chunks) {
      let after: string | undefined;

      do {
        const body: Record<string, unknown> = {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'associations.deal',
                  operator: 'IN',
                  values: chunk,
                },
              ],
            },
          ],
          properties: CONTACT_PROPERTIES,
          limit: config.hubspot.pageSize,
        };
        if (after) body['after'] = after;

        const response = await this.client.post<HubSpotSearchResponse<HubSpotRawContact>>(
          '/crm/v3/objects/contacts/search',
          body,
        );

        for (const raw of response.results) {
          if (!contactMap.has(raw.id)) {
            contactMap.set(raw.id, hubspotTransformer.transformContact(raw));
          }
        }

        after = response.paging?.next?.after;
      } while (after);
    }

    const contacts = Array.from(contactMap.values());
    this.cache.set(cacheKey, contacts);
    logger.info('Fetched contacts', { aeId, count: contacts.length });
    return contacts;
  }
}
