import type { Task } from '../../../models';
import { createLogger } from '../../../utils/logger';
import { HubSpotClient } from '../client';
import { CacheManager } from '../../cache/cacheManager';
import { taskCacheKey, todayDateKey } from '../../cache/strategies';
import {
  hubspotTransformer,
  type HubSpotRawTask,
  type HubSpotSearchResponse,
} from '../../normalizers/hubspotTransformer';
import { config } from '../../../config';

const logger = createLogger('TaskFetcher');

interface TaskSearchBody {
  filterGroups: { filters: { propertyName: string; operator: string; value?: string; values?: string[] }[] }[];
  properties: string[];
  limit: number;
  sorts?: { propertyName: string; direction: string }[];
  after?: string;
}

export class TaskFetcher {
  constructor(
    private readonly client: HubSpotClient,
    private readonly cache: CacheManager,
  ) {}

  async fetchForAE(aeId: string): Promise<Task[]> {
    const cacheKey = taskCacheKey(aeId, todayDateKey());
    const cached = this.cache.get<Task[]>(cacheKey);
    if (cached !== null) {
      logger.debug('Cache hit', { aeId, count: cached.length });
      return cached;
    }

    const tasks: Task[] = [];
    let after: string | undefined;

    do {
      const body: TaskSearchBody = {
        filterGroups: [
          {
            filters: [
              { propertyName: 'hubspot_owner_id', operator: 'EQ', value: aeId },
              {
                propertyName: 'hs_task_status',
                operator: 'NOT_IN',
                values: ['COMPLETED', 'CANCELLED'],
              },
            ],
          },
        ],
        properties: [
          'hs_task_subject',
          'hs_task_body',
          'hs_timestamp',
          'hubspot_owner_id',
          'hs_task_status',
          'hs_task_type',
          'hs_task_priority',
          'hs_due_date',
          'createdate',
          'hs_lastmodifieddate',
          'hs_contact_id',
          'hs_deal_id',
        ],
        sorts: [{ propertyName: 'hs_due_date', direction: 'ASCENDING' }],
        limit: config.hubspot.pageSize,
      };
      if (after) body.after = after;

      const response = await this.client.post<HubSpotSearchResponse<HubSpotRawTask>>(
        '/crm/v3/objects/tasks/search',
        body,
      );

      for (const raw of response.results) {
        tasks.push(hubspotTransformer.transformTask(raw));
      }

      after = response.paging?.next?.after;
    } while (after);

    this.cache.set(cacheKey, tasks);
    logger.info('Fetched tasks', { aeId, count: tasks.length });
    return tasks;
  }
}
