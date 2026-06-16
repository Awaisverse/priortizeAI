# Project Structure & Quick Start Guide

## Directory Structure

```
project4/
├── docs/
│   ├── SYSTEM_ARCHITECTURE.md          # System design & module architecture
│   ├── IMPLEMENTATION_PLAN.md          # 4-phase implementation plan
│   ├── INTEGRATION_STRATEGY.md         # Integration patterns & error handling
│   ├── DATA_MODELS.md                  # Canonical data models
│   ├── RISK_MITIGATION_DEPLOYMENT.md  # Risk management & deployment
│   ├── API.md                          # API documentation (generated)
│   ├── TROUBLESHOOTING.md              # Common issues & solutions
│   └── RUNBOOK.md                      # Operations runbook
│
├── src/
│   ├── config/
│   │   └── index.ts                    # Configuration management
│   │
│   ├── models/
│   │   ├── index.ts                    # Type definitions
│   │   ├── deal.ts
│   │   ├── task.ts
│   │   ├── meeting.ts
│   │   ├── contact.ts
│   │   └── engagement.ts
│   │
│   ├── utils/
│   │   ├── logger.ts                   # Logging utility
│   │   ├── validators.ts               # Schema validation
│   │   ├── mockDataGenerator.ts        # Test data generation
│   │   └── helpers.ts                  # Common utilities
│   │
│   ├── data-collection/
│   │   ├── index.ts
│   │   ├── aggregator.ts               # Main aggregation logic
│   │   ├── cache/
│   │   │   ├── cacheManager.ts
│   │   │   └── strategies.ts
│   │   ├── hubspot/
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── rateLimiter.ts
│   │   │   └── fetchers/
│   │   │       ├── deals.ts
│   │   │       ├── tasks.ts
│   │   │       ├── contacts.ts
│   │   │       └── engagements.ts
│   │   ├── google-calendar/
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── eventFilter.ts
│   │   │   └── fetchers/
│   │   │       └── events.ts
│   │   └── normalizers/
│   │       ├── hubspotTransformer.ts
│   │       └── googleTransformer.ts
│   │
│   ├── prioritization/
│   │   ├── index.ts
│   │   ├── orchestrator.ts
│   │   ├── ruleEngine/
│   │   │   ├── index.ts
│   │   │   ├── ruleRegistry.ts
│   │   │   └── evaluator.ts
│   │   ├── scorer/
│   │   │   ├── index.ts
│   │   │   └── rules/
│   │   │       ├── p0Rules.ts
│   │   │       ├── p1Rules.ts
│   │   │       ├── p2Rules.ts
│   │   │       └── p3Rules.ts
│   │   ├── contextAnalyzer/
│   │   │   ├── trendAnalyzer.ts
│   │   │   └── patternRecognizer.ts
│   │   ├── riskDetector/
│   │   │   ├── overdueDetector.ts
│   │   │   ├── stalledDetector.ts
│   │   │   ├── closingRiskDetector.ts
│   │   │   └── inboundHotDetector.ts
│   │   └── actionGenerator/
│   │       ├── index.ts
│   │       └── templates.ts
│   │
│   ├── ai-intelligence/
│   │   ├── index.ts
│   │   ├── orchestrator.ts
│   │   ├── claude/
│   │   │   ├── client.ts
│   │   │   ├── tokenCounter.ts
│   │   │   └── costTracker.ts
│   │   ├── prompts/
│   │   │   ├── index.ts
│   │   │   ├── executiveSummary.ts
│   │   │   ├── meetingPrep.ts
│   │   │   ├── intentClassification.ts
│   │   │   ├── riskAnalysis.ts
│   │   │   ├── nextSteps.ts
│   │   │   └── contextInjector.ts
│   │   ├── generators/
│   │   │   ├── executiveSummaryGenerator.ts
│   │   │   ├── meetingPrepGenerator.ts
│   │   │   ├── intentClassifier.ts
│   │   │   ├── riskAnalyzer.ts
│   │   │   └── nextStepsGenerator.ts
│   │   ├── parsing/
│   │   │   ├── jsonParser.ts
│   │   │   └── markdownParser.ts
│   │   └── tokenOptimization/
│   │       ├── index.ts
│   │       └── contextWindow.ts
│   │
│   ├── orchestration/
│   │   ├── index.ts
│   │   ├── container.ts                # Dependency injection
│   │   ├── setupServices.ts
│   │   ├── scheduler/
│   │   │   ├── cronScheduler.ts
│   │   │   ├── eventBus.ts
│   │   │   └── executionQueue.ts
│   │   ├── workflow/
│   │   │   ├── pipelineCoordinator.ts
│   │   │   ├── stateManager.ts
│   │   │   └── errorHandler.ts
│   │   ├── users/
│   │   │   ├── userManager.ts
│   │   │   ├── preferences.ts
│   │   │   └── auth.ts
│   │   └── mcp/
│   │       ├── server.ts
│   │       ├── toolRegistry.ts
│   │       └── router.ts
│   │
│   ├── reporting/
│   │   ├── index.ts
│   │   ├── builders/
│   │   │   ├── markdownBuilder.ts
│   │   │   └── sectionBuilders.ts
│   │   ├── validators/
│   │   │   ├── schemaValidator.ts
│   │   │   └── qualityChecker.ts
│   │   └── delivery/
│   │       └── slack/
│   │           ├── client.ts
│   │           ├── auth.ts
│   │           ├── dmSender.ts
│   │           └── threadManager.ts
│   │
│   ├── resilience/
│   │   ├── circuitBreaker.ts
│   │   ├── retryStrategies.ts
│   │   └── fallbacks.ts
│   │
│   ├── logging/
│   │   ├── index.ts
│   │   ├── executionLogger.ts
│   │   └── metricsCollector.ts
│   │
│   ├── monitoring/
│   │   └── dashboard.ts
│   │
│   └── health/
│       └── healthCheck.ts
│
├── tests/
│   ├── unit/
│   │   ├── data-collection/
│   │   │   ├── hubspot.test.ts
│   │   │   ├── googleCalendar.test.ts
│   │   │   └── aggregator.test.ts
│   │   ├── prioritization/
│   │   │   ├── scorer.test.ts
│   │   │   └── riskDetector.test.ts
│   │   └── ai-intelligence/
│   │       ├── promptGeneration.test.ts
│   │       └── parsing.test.ts
│   │
│   ├── integration/
│   │   ├── phase1-phase2.test.ts
│   │   ├── phase2-phase3.test.ts
│   │   ├── phase3-phase4.test.ts
│   │   └── fullPipeline.test.ts
│   │
│   ├── e2e/
│   │   ├── fullPipeline.test.ts
│   │   ├── reportGeneration.test.ts
│   │   └── slackDelivery.test.ts
│   │
│   ├── performance/
│   │   └── executionTime.test.ts
│   │
│   ├── mocks/
│   │   ├── hubspotMocks.ts
│   │   ├── googleCalendarMocks.ts
│   │   ├── claudeMocks.ts
│   │   └── slackMocks.ts
│   │
│   └── fixtures/
│       ├── dealData.ts
│       ├── taskData.ts
│       └── meetingData.ts
│
├── scripts/
│   ├── deploy.sh
│   ├── test.sh
│   └── setup.sh
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── .env.example                        # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- TypeScript knowledge
- Git

### Setup (Day 1)

```bash
# 1. Clone and navigate to project
cd /Users/awaisakram/Documents/Awais_Akram/project4

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys:
# - HUBSPOT_API_KEY
# - GOOGLE_CREDENTIALS (JSON)
# - CLAUDE_API_KEY
# - SLACK_BOT_TOKEN

# 4. Run setup script
npm run setup

# 5. Run tests to verify setup
npm test
```

### Development Workflow

```bash
# Watch mode for development
npm run dev

# Run tests
npm test

# Run specific test suite
npm test -- tests/data-collection/hubspot.test.ts

# Build
npm run build

# Type check
npm run type-check

# Lint
npm run lint

# Format
npm run format
```

### Phase Execution Checklist

#### Phase 1: Data Collection (Weeks 1-3)

```bash
# 1. Setup project foundation
npm run setup:phase1

# 2. Implement HubSpot integration
npm run dev  # Watch mode
# Implement: src/data-collection/hubspot/

# 3. Implement Google Calendar integration
# Implement: src/data-collection/google-calendar/

# 4. Implement data normalizers
# Implement: src/data-collection/normalizers/

# 5. Implement cache layer
# Implement: src/data-collection/cache/

# 6. Run tests
npm test -- tests/data-collection/

# 7. Gate review
npm run phase1:gate-review
```

#### Phase 2: Prioritization Engine (Weeks 4-6)

```bash
# 1. Setup Phase 2
npm run setup:phase2

# 2. Create mock for Phase 1 output
# Create: tests/mocks/unifiedDataMocks.ts

# 3. Implement rule engine
# Implement: src/prioritization/ruleEngine/

# 4. Implement scorer
# Implement: src/prioritization/scorer/

# 5. Implement risk detector
# Implement: src/prioritization/riskDetector/

# 6. Run tests
npm test -- tests/prioritization/

# 7. Integration test Phase 1 + Phase 2
npm test -- tests/integration/phase1-phase2.test.ts

# 8. Gate review
npm run phase2:gate-review
```

#### Phase 3: AI Intelligence (Weeks 7-10)

```bash
# 1. Setup Phase 3
npm run setup:phase3

# 2. Implement Claude client
# Implement: src/ai-intelligence/claude/

# 3. Implement prompts
# Implement: src/ai-intelligence/prompts/

# 4. Implement insight generators
# Implement: src/ai-intelligence/generators/

# 5. Run tests
npm test -- tests/ai-intelligence/

# 6. Integration test Phases 1-3
npm test -- tests/integration/fullPipeline.test.ts

# 7. Gate review
npm run phase3:gate-review
```

#### Phase 4: Orchestration & Reporting (Weeks 11-16)

```bash
# 1. Setup Phase 4
npm run setup:phase4

# 2. Implement scheduler
# Implement: src/orchestration/scheduler/

# 3. Implement workflow orchestrator
# Implement: src/orchestration/workflow/

# 4. Implement user management
# Implement: src/orchestration/users/

# 5. Implement reporting
# Implement: src/reporting/

# 6. Implement Slack integration
# Implement: src/reporting/delivery/slack/

# 7. E2E tests
npm test -- tests/e2e/

# 8. Deployment
npm run build
npm run deploy:staging
npm run deploy:production --canary
```

---

## Key Commands

```bash
# Development
npm run dev              # Watch mode
npm run build            # Build TypeScript
npm run type-check       # Type checking
npm run lint             # ESLint
npm run format           # Prettier

# Testing
npm test                 # All tests
npm test -- --watch     # Watch mode
npm test -- --coverage  # Coverage report
npm run test:ci         # CI mode
npm run test:integration # Integration tests only
npm run test:e2e        # E2E tests only
npm run test:perf       # Performance tests

# Quality
npm run lint:fix        # Fix lint issues
npm run format:fix      # Fix formatting
npm run security:scan   # Security audit

# Operations
npm run health:check    # System health
npm run monitor:live    # Real-time monitoring
npm run debug:errors    # View recent errors
npm run metrics:show    # Show metrics

# Deployment
npm run deploy:staging
npm run deploy:production
npm run rollback:production
npm run verify:deployment
```

---

## Environment Variables

```bash
# HubSpot Configuration
HUBSPOT_API_KEY=your_api_key
HUBSPOT_API_ENDPOINT=https://api.hubapi.com

# Google Calendar
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/callback

# Claude API
CLAUDE_API_KEY=your_api_key
CLAUDE_API_ENDPOINT=https://api.anthropic.com
CLAUDE_MODEL=claude-3-sonnet-20240229

# Slack
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_WORKSPACE_ID=your_workspace_id

# Application
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000
```

---

## Integration Touchpoints

### Phase 1 → Phase 2
**Interface**: `UnifiedDataPackage` → `PrioritizedActivities`
- Data Collection produces complete normalized data
- Prioritization Engine consumes and classifies
- [Integration Test](tests/integration/phase1-phase2.test.ts)

### Phase 2 → Phase 3
**Interface**: `PrioritizedActivities` → `IntelligenceBlocks`
- Prioritization produces classified activities
- AI Layer generates insights from priorities
- [Integration Test](tests/integration/phase2-phase3.test.ts)

### Phase 3 → Phase 4
**Interface**: `IntelligenceBlocks` → `Report`
- All previous outputs feed into reporting
- Orchestrator coordinates full pipeline
- [Integration Test](tests/integration/fullPipeline.test.ts)

---

## Monitoring & Debugging

### Check System Health
```bash
npm run health:check
# Output: 
# HubSpot API: ✓ Healthy
# Google Calendar API: ✓ Healthy
# Claude API: ✓ Healthy
# Slack API: ✓ Healthy
# Cache: ✓ 68% hit rate
```

### View Recent Errors
```bash
npm run errors:recent --limit=10
# Shows last 10 errors with full stack traces
```

### Debug Specific Execution
```bash
npm run debug:execution --executionId=abc123
# Shows full trace of execution with timings
```

### Monitor Performance
```bash
npm run metrics:current
# Shows current performance metrics
```

---

## Important Notes

1. **Contract-First Development**: Always finalize interfaces before implementation
2. **Mock First**: Create mocks before implementing real services
3. **Test Driven**: Write tests before implementation
4. **Validate at Boundaries**: Schema validation at all module boundaries
5. **Log Everything**: Structured logging for debugging
6. **Handle Errors**: Comprehensive error handling at all layers
7. **Monitor Continuously**: Track performance and errors in production

---

## Support & Troubleshooting

- See [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for common issues
- See [RUNBOOK.md](docs/RUNBOOK.md) for operations procedures
- See [INTEGRATION_STRATEGY.md](docs/INTEGRATION_STRATEGY.md) for integration issues

---

## Next Steps

1. Review [SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) for system design
2. Start Phase 1: Data Collection
3. Follow the 4-phase plan in [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
4. Use [INTEGRATION_STRATEGY.md](docs/INTEGRATION_STRATEGY.md) for smooth integrations

