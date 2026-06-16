import type {
  UnifiedDataPackage,
  PrioritizedActivities,
  IntelligenceBlocks,
  Report,
} from '../models';
import { createLogger } from '../utils/logger';
import { ReportBuilder } from './reportBuilder';
import { SlackDelivery, type SlackDeliveryConfig, type SlackTarget } from './slackDelivery';

export { ReportBuilder } from './reportBuilder';
export { SlackDelivery, type SlackDeliveryConfig, type SlackTarget } from './slackDelivery';

const logger = createLogger('ReportingService');

export interface ReportingServiceConfig {
  slack?: SlackDeliveryConfig;
  defaultTarget?: SlackTarget;
}

export class ReportingService {
  private readonly builder: ReportBuilder;
  private readonly slack?: SlackDelivery;
  private readonly defaultTarget?: SlackTarget;

  constructor(config: ReportingServiceConfig = {}) {
    this.builder = new ReportBuilder();
    if (config.slack) {
      this.slack = new SlackDelivery(config.slack);
    }
    this.defaultTarget = config.defaultTarget;
  }

  async generate(
    aeId: string,
    executionId: string,
    pkg: UnifiedDataPackage,
    prioritized: PrioritizedActivities,
    intelligence?: IntelligenceBlocks,
  ): Promise<Report> {
    logger.info('Generating report', { aeId, executionId });
    try {
      const report = this.builder.build(aeId, executionId, pkg, prioritized, intelligence);
      return report;
    } catch (error) {
      logger.error('Report generation failed', { aeId, error: (error as Error).message });
      throw error;
    }
  }

  async deliver(report: Report, target?: SlackTarget): Promise<void> {
    if (!this.slack) {
      throw new Error('Slack delivery not configured — provide slack config to ReportingService');
    }

    logger.info('Delivering report via Slack', { aeId: report.aeId, reportId: report.reportId });

    try {
      await this.slack.send(report, target ?? this.defaultTarget);
      report.deliveredAt = new Date().toISOString();
      report.deliveryStatus = 'delivered';
    } catch (error) {
      report.deliveryStatus = 'failed';
      logger.error('Report delivery failed', {
        aeId: report.aeId,
        reportId: report.reportId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export function createReportingService(config: ReportingServiceConfig = {}): ReportingService {
  return new ReportingService(config);
}
