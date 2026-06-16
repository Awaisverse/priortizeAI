import type { UnifiedDataPackage } from '../models';
import type { GoogleOAuth2Client } from './google-calendar/auth';
import { createLogger } from '../utils/logger';
import { HubSpotClient } from './hubspot/client';
import { RateLimiter } from './hubspot/rateLimiter';
import { DealFetcher } from './hubspot/fetchers/deals';
import { TaskFetcher } from './hubspot/fetchers/tasks';
import { ContactFetcher } from './hubspot/fetchers/contacts';
import { EngagementFetcher } from './hubspot/fetchers/engagements';
import { GoogleCalendarClient } from './google-calendar/client';
import { EventFetcher } from './google-calendar/fetchers/events';
import { eventFilter } from './google-calendar/eventFilter';
import { CacheManager, type CacheStats } from './cache/cacheManager';
import { DataAggregator } from './aggregator';

const logger = createLogger('DataCollectionService');

export interface DataCollectionConfig {
  hubspotApiKey: string;
  calendarAuthClient: GoogleOAuth2Client;
  calendarId: string;
  userEmail: string;
}

export class DataCollectionService {
  private readonly dealFetcher: DealFetcher;
  private readonly taskFetcher: TaskFetcher;
  private readonly contactFetcher: ContactFetcher;
  private readonly engagementFetcher: EngagementFetcher;
  private readonly eventFetcher: EventFetcher;
  private readonly aggregator: DataAggregator;
  private readonly cache: CacheManager;
  private readonly collectionConfig: DataCollectionConfig;

  constructor(collectionConfig: DataCollectionConfig) {
    this.collectionConfig = collectionConfig;
    this.cache = new CacheManager();

    const rateLimiter = new RateLimiter();
    const hubspotClient = new HubSpotClient(collectionConfig.hubspotApiKey, rateLimiter);
    const calendarClient = new GoogleCalendarClient(collectionConfig.calendarAuthClient);

    this.dealFetcher = new DealFetcher(hubspotClient, this.cache);
    this.taskFetcher = new TaskFetcher(hubspotClient, this.cache);
    this.contactFetcher = new ContactFetcher(hubspotClient, this.cache);
    this.engagementFetcher = new EngagementFetcher(hubspotClient, this.cache);
    this.eventFetcher = new EventFetcher(calendarClient, eventFilter, this.cache);
    this.aggregator = new DataAggregator();
  }

  async collect(aeId: string): Promise<UnifiedDataPackage> {
    logger.info('Starting data collection', { aeId });

    try {
      // Fetch independent data sources in parallel
      const [deals, tasks, engagements, meetings] = await Promise.all([
        this.dealFetcher.fetchForAE(aeId),
        this.taskFetcher.fetchForAE(aeId),
        this.engagementFetcher.fetchForAE(aeId),
        this.eventFetcher.fetchForAE(
          aeId,
          this.collectionConfig.calendarId,
          this.collectionConfig.userEmail,
        ),
      ]);

      // Contacts depend on deal IDs — must use HubSpot IDs, not internal UUIDs
      const contacts = await this.contactFetcher.fetchForDeals(
        aeId,
        deals.map((d) => d.hubspotId),
      );

      const pkg = this.aggregator.aggregate({ aeId, deals, tasks, meetings, contacts, engagements });

      logger.info('Data collection complete', {
        aeId,
        deals: deals.length,
        tasks: tasks.length,
        meetings: meetings.length,
        contacts: contacts.length,
        engagements: engagements.length,
        qualityScore: pkg.metadata.dataQuality.score,
      });

      return pkg;
    } catch (error) {
      logger.error('Data collection failed', { aeId, error: (error as Error).message });
      throw error;
    }
  }

  getCacheStats(): CacheStats {
    return this.cache.getStats();
  }
}

export function createDataCollectionService(
  collectionConfig: DataCollectionConfig,
): DataCollectionService {
  return new DataCollectionService(collectionConfig);
}
