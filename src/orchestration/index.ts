import type { ExecutionContext, AEUser } from '../models';
import { createLogger } from '../utils/logger';
import { Pipeline, type PipelineConfig, type PipelineServices } from './pipeline';

export { Pipeline, type PipelineConfig, type PipelineServices };

const logger = createLogger('OrchestratorService');

export interface OrchestratorConfig extends PipelineConfig {
  maxConcurrentAEs?: number;
}

export class OrchestratorService {
  private readonly pipeline: Pipeline;
  private readonly maxConcurrent: number;

  constructor(services: PipelineServices, config: OrchestratorConfig) {
    this.pipeline = new Pipeline(services, config);
    this.maxConcurrent = config.maxConcurrentAEs ?? 3;
  }

  async runForAE(aeId: string, trigger: ExecutionContext['trigger'] = 'manual'): Promise<ExecutionContext> {
    logger.info('Running pipeline for single AE', { aeId, trigger });
    return this.pipeline.run(aeId, trigger);
  }

  async runForAllAEs(
    users: AEUser[],
    trigger: ExecutionContext['trigger'] = 'scheduled',
  ): Promise<ExecutionContext[]> {
    const activeUsers = users.filter((u) => u.isActive);
    logger.info('Running pipeline for all AEs', { count: activeUsers.length, trigger });

    const results: ExecutionContext[] = [];

    // Process in batches to limit concurrency
    for (let i = 0; i < activeUsers.length; i += this.maxConcurrent) {
      const batch = activeUsers.slice(i, i + this.maxConcurrent);
      const batchResults = await Promise.allSettled(
        batch.map((user) => this.pipeline.run(user.aeId, trigger)),
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error('AE pipeline failed in batch', { error: result.reason });
        }
      }
    }

    const succeeded = results.filter((r) => r.status === 'success' || r.status === 'partial').length;
    logger.info('Batch pipeline complete', {
      total: activeUsers.length,
      succeeded,
      failed: results.length - succeeded,
    });

    return results;
  }
}

export function createOrchestratorService(
  services: PipelineServices,
  config: OrchestratorConfig,
): OrchestratorService {
  return new OrchestratorService(services, config);
}
