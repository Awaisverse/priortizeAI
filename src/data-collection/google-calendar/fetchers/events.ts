import type { Meeting } from '../../../models';
import { createLogger } from '../../../utils/logger';
import { config } from '../../../config';
import { GoogleCalendarClient } from '../client';
import { eventFilter, type CalendarEvent } from '../eventFilter';
import { googleTransformer } from '../../normalizers/googleTransformer';
import { CacheManager } from '../../cache/cacheManager';
import { eventCacheKey, todayDateKey } from '../../cache/strategies';

const logger = createLogger('EventFetcher');

export class EventFetcher {
  constructor(
    private readonly client: GoogleCalendarClient,
    private readonly filter: typeof eventFilter,
    private readonly cache: CacheManager,
  ) {}

  async fetchForAE(aeId: string, calendarId: string, userEmail: string): Promise<Meeting[]> {
    const cacheKey = eventCacheKey(aeId, todayDateKey());
    const cached = this.cache.get<Meeting[]>(cacheKey);
    if (cached !== null) {
      logger.debug('Cache hit', { aeId, count: cached.length });
      return cached;
    }

    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const timeMax = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + config.google.calendarFetchDays,
    ).toISOString();

    const meetings: Meeting[] = [];
    let pageToken: string | undefined;

    do {
      const result = await this.client.listEvents({
        calendarId,
        timeMin,
        timeMax,
        maxResults: 250,
        pageToken,
      });

      const validEvents = result.events.filter((event: CalendarEvent) =>
        this.filter.shouldIncludeEvent(event, userEmail),
      );

      for (const event of validEvents) {
        meetings.push(googleTransformer.transformEvent(event, userEmail));
      }

      pageToken = result.nextPageToken;
    } while (pageToken);

    this.cache.set(cacheKey, meetings);
    logger.info('Fetched calendar events', { aeId, calendarId, count: meetings.length });
    return meetings;
  }
}
