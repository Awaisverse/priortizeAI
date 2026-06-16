# /send-brief — Send a Daily Brief Manually

Trigger a daily brief for one AE outside the scheduled run.

## Required Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
HUBSPOT_API_KEY=your_hubspot_private_app_token
ANTHROPIC_API_KEY=your_anthropic_api_key
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
AE_ID=ae-001
ENABLE_AI=true
ENABLE_SLACK_DELIVERY=true
```

## Run via CLI entry point

```bash
# Development (ts-node, watch mode)
npm run dev

# Production (compile first, then run)
npm run build
node dist/index.js
```

## Trigger programmatically

```typescript
import { OrchestratorService } from './src/orchestration';
import { DataCollectionService } from './src/data-collection';
import { PrioritizationService } from './src/prioritization';
import { AIIntelligenceService } from './src/ai-intelligence';
import { ReportingService } from './src/reporting';
import { getAuthenticatedClient } from './src/data-collection/google-calendar/auth';
import { config } from './src/config';

const authClient = await getAuthenticatedClient();

const orchestrator = new OrchestratorService(
  {
    dataCollection: new DataCollectionService({
      hubspotApiKey: config.hubspot.apiKey,
      calendarAuthClient: authClient,
      calendarId: 'ae@company.com',
      userEmail: 'ae@company.com',
    }),
    prioritization: new PrioritizationService(),
    aiIntelligence: new AIIntelligenceService({
      apiKey: config.anthropic.apiKey,
      model: config.anthropic.model,
    }),
    reporting: new ReportingService({
      slack: { botToken: config.slack.botToken },
      defaultTarget: { userId: 'USLACKID' },
    }),
  },
  {
    enableAI: config.features.aiEnabled,
    enableSlack: config.features.slackDeliveryEnabled,
    retryAttempts: 2,
    environment: 'dev',
  },
);

const ctx = await orchestrator.runForAE('ae-001', 'manual');
console.log('Status:', ctx.status, '| Duration:', ctx.duration, 'ms');
```

## Add a New AE

See `/add-ae` for onboarding guide.
