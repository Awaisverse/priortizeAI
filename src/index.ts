import 'dotenv/config';
import { createLogger } from './utils/logger';
import { config } from './config/index';
import { createDataCollectionService } from './data-collection/index';
import { createPrioritizationService } from './prioritization/index';
import { createAIIntelligenceService } from './ai-intelligence/index';
import { createReportingService } from './reporting/index';
import { createOrchestratorService } from './orchestration/index';
import { getAuthenticatedClient } from './data-collection/google-calendar/auth';

const logger = createLogger('App');

async function main(): Promise<void> {
  logger.info('AE Daily Briefs starting', {
    environment: config.env,
    enableAI: config.features.aiEnabled,
    enableSlack: config.features.slackDelivery,
  });

  const calendarAuth = await getAuthenticatedClient();

  const dataCollection = createDataCollectionService({
    hubspotApiKey: config.hubspot.apiKey,
    calendarAuthClient: calendarAuth,
    calendarId: process.env['GOOGLE_CALENDAR_ID'] ?? 'primary',
    userEmail: process.env['AE_EMAIL'] ?? '',
  });

  const prioritization = createPrioritizationService();

  const aiIntelligence = config.features.aiEnabled
    ? createAIIntelligenceService({
        apiKey: config.gemini.apiKey,
        model: config.gemini.model,
        maxTokens: config.gemini.maxTokens,
        timeoutMs: config.api.timeoutMs,
      })
    : undefined;

  const slackUserId = process.env['SLACK_USER_ID'];
  const slackChannelId = process.env['SLACK_CHANNEL_ID'];
  const reporting = createReportingService(
    config.features.slackDelivery
      ? {
          slack: { botToken: config.slack.botToken },
          defaultTarget: slackUserId
            ? { userId: slackUserId }
            : slackChannelId
              ? { channelId: slackChannelId }
              : undefined,
        }
      : {},
  );

  const environment: 'production' | 'staging' | 'dev' =
    config.env === 'production' ? 'production' : config.env === 'staging' ? 'staging' : 'dev';

  const orchestrator = createOrchestratorService(
    { dataCollection, prioritization, aiIntelligence, reporting },
    {
      enableAI: config.features.aiEnabled,
      enableSlack: config.features.slackDelivery,
      retryAttempts: config.api.retryAttempts,
      environment,
    },
  );

  const aeId = process.env['AE_ID'] ?? 'default-ae';
  const ctx = await orchestrator.runForAE(aeId, 'manual');

  logger.info('Pipeline complete', {
    status: ctx.status,
    duration: ctx.duration,
    errors: ctx.errors.length,
  });

  if (ctx.status === 'failed') {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  logger.error('Fatal error', { error: (err as Error).message, stack: (err as Error).stack });
  process.exitCode = 1;
});
