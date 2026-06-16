import type { ExecutionContext } from '../models';
import { createLogger } from '../utils/logger';
import { retry } from '../utils/helpers';
import { StateManager } from './stateManager';
import type { DataCollectionService } from '../data-collection/index';
import type { PrioritizationService } from '../prioritization/index';
import type { AIIntelligenceService } from '../ai-intelligence/index';
import type { ReportingService } from '../reporting/index';

const logger = createLogger('Pipeline');

export interface PipelineConfig {
  enableAI: boolean;
  enableSlack: boolean;
  retryAttempts: number;
  environment: ExecutionContext['environment'];
}

export interface PipelineServices {
  dataCollection: DataCollectionService;
  prioritization: PrioritizationService;
  aiIntelligence?: AIIntelligenceService;
  reporting: ReportingService;
}

export class Pipeline {
  constructor(
    private readonly services: PipelineServices,
    private readonly config: PipelineConfig,
  ) {}

  async run(
    aeId: string,
    trigger: ExecutionContext['trigger'] = 'manual',
  ): Promise<ExecutionContext> {
    const state = new StateManager(aeId, trigger, this.config.environment);
    state.markRunning();

    logger.info('Pipeline started', {
      executionId: state.executionId,
      aeId,
      trigger,
      environment: this.config.environment,
    });

    try {
      // ── Phase 1: Data Collection ───────────────────────────────────────────
      state.startModule('DataCollection');
      const dataPackage = await retry(
        () => this.services.dataCollection.collect(aeId),
        this.config.retryAttempts,
        1000,
      );
      state.completeModule('DataCollection', JSON.stringify(dataPackage).length);
      state.setResults({ dataPackage });

      // ── Phase 2: Prioritization ────────────────────────────────────────────
      state.startModule('Prioritization');
      const prioritizedActivities = this.services.prioritization.prioritize(dataPackage);
      state.completeModule('Prioritization', JSON.stringify(prioritizedActivities).length);
      state.setResults({ prioritizedActivities });

      // ── Phase 3: AI Intelligence (optional) ───────────────────────────────
      let intelligence = undefined;
      if (this.config.enableAI && this.services.aiIntelligence) {
        state.startModule('AIIntelligence');
        try {
          intelligence = await retry(
            () => this.services.aiIntelligence!.analyze(dataPackage, prioritizedActivities),
            this.config.retryAttempts,
            2000,
          );
          state.completeModule('AIIntelligence', JSON.stringify(intelligence).length);
          state.setResults({ intelligence });
        } catch (aiError) {
          state.failModule('AIIntelligence', aiError as Error);
          logger.warn('AI Intelligence failed — continuing without AI insights', {
            aeId,
            error: (aiError as Error).message,
          });
          // Non-fatal: continue to reporting with prioritized data only
        }
      } else {
        state.skipModule('AIIntelligence', 'AI disabled or service not configured');
      }

      // ── Phase 5: Report Generation & Delivery ─────────────────────────────
      state.startModule('ReportGeneration');
      const report = await this.services.reporting.generate(
        aeId,
        state.executionId,
        dataPackage,
        prioritizedActivities,
        intelligence,
      );
      state.completeModule('ReportGeneration', report.markdown.length);

      // ── Phase 5b: Slack Delivery (optional) ───────────────────────────────
      if (this.config.enableSlack) {
        state.startModule('SlackDelivery');
        try {
          await this.services.reporting.deliver(report);
          state.completeModule('SlackDelivery');
        } catch (slackError) {
          state.failModule('SlackDelivery', slackError as Error);
          logger.warn('Slack delivery failed', {
            aeId,
            error: (slackError as Error).message,
          });
        }
      } else {
        state.skipModule('SlackDelivery', 'Slack delivery disabled');
      }

      const hasErrors = state.getContext().errors.length > 0;
      if (hasErrors) {
        state.markPartial();
      } else {
        state.markSuccess();
      }

      const ctx = state.getContext();
      logger.info('Pipeline complete', {
        executionId: ctx.executionId,
        aeId,
        status: ctx.status,
        duration: ctx.duration,
        modules: ctx.modules.map((m) => `${m.moduleName}:${m.status}`).join(', '),
      });

      return ctx;
    } catch (error) {
      state.failModule('Pipeline', error as Error);
      state.markFailed();

      logger.error('Pipeline failed', {
        executionId: state.executionId,
        aeId,
        error: (error as Error).message,
      });

      return state.getContext();
    }
  }
}
