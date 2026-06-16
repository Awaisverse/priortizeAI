import type {
  UnifiedDataPackage,
  PrioritizedActivities,
  Action,
  ClassifiedActivity,
} from '../models';
import { generateId, nowISO } from '../utils/helpers';
import { createLogger } from '../utils/logger';
import { classifyActivities } from './classifier';

const logger = createLogger('PrioritizationService');

function buildExecutiveSummary(classified: ClassifiedActivity[]): PrioritizedActivities['executiveSummary'] {
  const p0Items = classified.filter((c) => c.priority === 'P0');
  const p1Items = classified.filter((c) => c.priority === 'P1');

  const topRisks = [
    ...p0Items.flatMap((c) => c.risks),
    ...p1Items.flatMap((c) => c.risks),
  ].filter(Boolean).slice(0, 5);

  const topOpportunities = [
    ...p0Items.flatMap((c) => c.opportunities),
    ...p1Items.flatMap((c) => c.opportunities),
  ].filter(Boolean).slice(0, 5);

  const criticalActions = [
    ...p0Items.flatMap((c) => c.recommendedActions.map((a) => a.title)),
    ...p1Items.flatMap((c) => c.recommendedActions.map((a) => a.title)),
  ].filter(Boolean).slice(0, 5);

  const dealItems = classified.filter((c) => c.type === 'deal');
  const statusByDeal = dealItems.slice(0, 10).map((c) => ({
    dealId: c.sourceId,
    status: c.category,
    risk: c.risks[0] ?? 'No active risk',
    action: c.recommendedActions[0]?.title ?? 'Monitor',
  }));

  return { topRisks, topOpportunities, criticalActions, statusByDeal };
}

function collectRecommendedActions(classified: ClassifiedActivity[]): Action[] {
  const seen = new Set<string>();
  const actions: Action[] = [];

  for (const item of classified) {
    if (item.priority === 'P0' || item.priority === 'P1') {
      for (const action of item.recommendedActions) {
        if (!seen.has(action.title)) {
          seen.add(action.title);
          actions.push(action);
        }
      }
    }
    if (actions.length >= 10) break;
  }

  return actions;
}

export class PrioritizationService {
  prioritize(pkg: UnifiedDataPackage): PrioritizedActivities {
    logger.info('Starting prioritization', { aeId: pkg.aeId, aggregatedId: pkg.aggregatedId });

    try {
      const classified = classifyActivities(pkg);

      const byPriority = { P0: 0, P1: 0, P2: 0, P3: 0, P4: 0 };
      for (const item of classified) {
        byPriority[item.priority]++;
      }

      const result: PrioritizedActivities = {
        classified,
        summary: {
          totalActivities: classified.length,
          byPriority,
        },
        executiveSummary: buildExecutiveSummary(classified),
        recommendedActions: collectRecommendedActions(classified),
        timestamp: nowISO(),
        packageId: generateId(),
      };

      logger.info('Prioritization complete', {
        aeId: pkg.aeId,
        total: classified.length,
        P0: byPriority.P0,
        P1: byPriority.P1,
        P2: byPriority.P2,
      });

      return result;
    } catch (error) {
      logger.error('Prioritization failed', { aeId: pkg.aeId, error: (error as Error).message });
      throw error;
    }
  }
}

export function createPrioritizationService(): PrioritizationService {
  return new PrioritizationService();
}
