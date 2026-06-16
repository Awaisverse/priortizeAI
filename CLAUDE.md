# AE Daily Briefs — Claude Development Guide

## Project

AI-powered Sales Account Executive Daily Brief platform. Fetches HubSpot CRM + Google Calendar data, applies P0-P4 prioritization, generates Claude-powered insights, and delivers via Slack DM.

**Stack**: TypeScript 5 · Node.js 18+ · Jest · @google/generative-ai · HubSpot REST API · Google Calendar API · Slack Web API

## 5-Phase Architecture

```
[Phase 1]           [Phase 2]            [Phase 3]          [Phase 4]          [Phase 5]
Data Collection  →  Prioritization  →  AI Intelligence  →  Orchestration  →  Reporting & Delivery
HubSpot+Calendar    P0-P4 Rules         Gemini API          Scheduler          Slack DM
      ↓                   ↓                  ↓                   ↓                   ↓
UnifiedDataPkg  → PrioritizedActivities → IntelligenceBlocks → ExecutionContext → Report → Slack
```

## Phase Status

| Phase | Module | Status | Gate Criteria |
|-------|--------|--------|---------------|
| 1 | Foundation & Data Collection | ✅ Complete | UnifiedDataPackage validates · 60%+ cache hit · 80%+ coverage |
| 2 | Prioritization Engine | ✅ Complete | PrioritizedActivities validates · 90%+ coverage · Phase1→2 integration passes |
| 3 | AI Intelligence | ✅ Complete | IntelligenceBlocks validates · <$0.10/execution · 80%+ coverage |
| 4 | Orchestration | ✅ Complete | Full pipeline orchestrated · error recovery tested |
| 5 | Reporting & Delivery | ✅ Complete | E2E <90s · Slack delivery · production entry point ready |

## Critical Rules

### Contract-First Development
Never implement a module before its TypeScript interface is finalized. ALL interfaces live in `src/models/index.ts`. Validate data at every phase boundary using `src/utils/validators.ts`.

### Error Pattern (always re-throw after logging)
```typescript
try {
  return await someExternalCall(params);
} catch (error) {
  logger.error('Descriptive message', { executionId, aeId, error: (error as Error).message });
  throw error;
}
```

### Logging Pattern
```typescript
const logger = createLogger('ModuleName');
logger.info('Action started', { executionId, aeId });
logger.error('Action failed', { executionId, aeId, error: err.message, stack: err.stack });
```

### External API Calls
Wrap every external API call with `executeWithTimeout()` from `src/utils/helpers.ts`. Set module-specific timeouts: HubSpot=30s, Google=20s, Claude=30s.

### TypeScript Strict Mode
- `noUnusedLocals` and `noUnusedParameters` are enabled — export or use everything you declare
- `strictNullChecks` — handle undefined/null explicitly
- `noImplicitReturns` — every code path must return

### Testing Rules
- Unit tests: always mock external APIs (never hit real APIs)
- Mocks live in `tests/mocks/`, static fixtures in `tests/fixtures/`
- Integration tests in `tests/integration/` may use real Phase N-1 output
- Target: 80%+ unit coverage for phases 1, 3; 90%+ for phase 2

## File Structure

```
src/
├── models/index.ts           ← ALL TypeScript interfaces (canonical source of truth)
├── config/index.ts           ← Typed env config (reads process.env)
├── utils/
│   ├── logger.ts             ← Winston structured logger (createLogger factory)
│   ├── helpers.ts            ← generateId, executeWithTimeout, retry, sleep, nowISO
│   ├── validators.ts         ← Joi-based schema validation per model
│   └── mockDataGenerator.ts  ← Generates valid test data objects
├── data-collection/          ← Phase 1
│   ├── index.ts              ← DataCollectionService (main export)
│   ├── aggregator.ts         ← Assembles UnifiedDataPackage from fetcher outputs
│   ├── cache/
│   │   ├── cacheManager.ts   ← NodeCache wrapper with TTL and stats
│   │   └── strategies.ts     ← Cache key builders per entity type
│   ├── hubspot/
│   │   ├── client.ts         ← Axios HubSpot client with auth + retry
│   │   ├── rateLimiter.ts    ← Token bucket: 100 req/10s
│   │   └── fetchers/
│   │       ├── deals.ts      ← Fetch open deals for an AE
│   │       ├── tasks.ts      ← Fetch pending/overdue tasks
│   │       ├── contacts.ts   ← Fetch contacts associated with deals
│   │       └── engagements.ts← Fetch recent engagement records
│   ├── google-calendar/
│   │   ├── client.ts         ← Google Calendar API client
│   │   ├── auth.ts           ← OAuth2 token management
│   │   ├── eventFilter.ts    ← Filter out personal/cancelled events
│   │   └── fetchers/
│   │       └── events.ts     ← Fetch events for date range
│   └── normalizers/
│       ├── hubspotTransformer.ts  ← HubSpot API response → canonical models
│       └── googleTransformer.ts   ← Calendar event → Meeting model
├── prioritization/           ← Phase 2: rule engine, classifier, PrioritizationService
│   ├── ruleEngine/           ← dealRules, taskRules, meetingRules, contactRules
│   ├── classifier.ts         ← classifyActivities()
│   └── index.ts              ← PrioritizationService (main export)
├── ai-intelligence/          ← Phase 3: Claude API integration
│   ├── claudeClient.ts       ← Anthropic SDK wrapper with prompt caching
│   ├── promptTemplates.ts    ← buildSystemPrompt(), buildAnalysisPrompt()
│   ├── responseParser.ts     ← parseClaudeResponse() with safe fallbacks
│   └── index.ts              ← AIIntelligenceService (main export)
├── orchestration/            ← Phase 4: pipeline + state management
│   ├── pipeline.ts           ← Pipeline.run() — phases 1→2→3→5
│   ├── stateManager.ts       ← StateManager tracks module timing + errors
│   └── index.ts              ← OrchestratorService with batch concurrency
└── reporting/                ← Phase 5: report generation + Slack delivery
    ├── reportBuilder.ts      ← ReportBuilder.build() → Markdown report
    ├── slackDelivery.ts      ← SlackDelivery.send() → chunked thread DMs
    └── index.ts              ← ReportingService (main export)
```

## Key Commands

```bash
npm run type-check                       # TypeScript check — must be 0 errors
npm test -- --runInBand                  # All tests (--runInBand required — see note)
npm run test:unit -- --runInBand         # Unit tests only
npm run test:integration -- --runInBand  # Integration tests
npm run test:coverage -- --runInBand     # Coverage report (target: 80%+)
npm run lint                             # ESLint
npm run build                            # Compile TypeScript → dist/
npm run dev                              # Watch mode via ts-node
```

> **`--runInBand` is required** on this project. Jest's default parallel workers exhaust heap on
> low-memory machines. Always pass `--runInBand` to run suites sequentially.
>
> **macOS / Linux:** Works as-is with Node.js ≥ 18 in PATH.
>
> **Windows (this machine):** Node.js is not automatically in PowerShell PATH. Prefix once per session:
> ```powershell
> $env:PATH = "C:\Program Files\nodejs;$env:PATH"
> ```

## Slash Commands

| Command | Action |
|---------|--------|
| `/gate` | Full gate review — type check + all tests + coverage |
| `/run-tests` | Run test suite with correct flags |
| `/add-ae` | Onboard a new Account Executive |
| `/send-brief` | Trigger a brief manually for one AE |

## Data Flow Contracts

| Boundary | Interface | Validator |
|----------|-----------|-----------|
| Phase 1 output | `UnifiedDataPackage` | `validateUnifiedDataPackage()` |
| Phase 2 output | `PrioritizedActivities` | `validatePrioritizedActivities()` |
| Phase 3 output | `IntelligenceBlocks` | `validateIntelligenceBlocks()` |
| Phase 4 output | `ExecutionContext` | `validateExecutionContext()` |

## HubSpot API Notes

- Rate limit: 100 requests / 10 seconds — enforced by `src/data-collection/hubspot/rateLimiter.ts`
- Use CRM v3 API: `https://api.hubapi.com/crm/v3/`
- Deal properties: `dealname,amount,closedate,pipeline,dealstage,hubspot_owner_id,hs_deal_stage_probability,notes_last_contacted,description`
- Pagination: use `after` cursor, page size 100
- Auth: `Authorization: Bearer {HUBSPOT_API_KEY}` header

## Google Calendar Notes

- Use OAuth2 (user flow for dev, service account for prod)
- Fetch events today + 7 days forward
- Filter: exclude `status === 'cancelled'` and all-day events with no attendees
- `googleapis` package includes its own TypeScript types

## Gemini API Notes (Phase 3)

- Use `@google/generative-ai`
- Default model: `gemini-2.0-flash` (env: `GEMINI_MODEL`)
- Cost target: <$0.10 per AE per execution
- `getGenerativeModel({ model, systemInstruction })` — system prompt passed at model creation
- `model.generateContent(userPrompt)` — response via `result.response.text()`
- `model.countTokens(text)` — returns `{ totalTokens }` (pre-flight budget check)

## Environment Variables

```bash
# Required for Phase 1
HUBSPOT_API_KEY=          # HubSpot private app token
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Required for Phase 3
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash

# Required for Phase 5
SLACK_BOT_TOKEN=
SLACK_WORKSPACE_ID=

# Optional
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_CACHE=true
ENABLE_AI=true
ENABLE_SLACK_DELIVERY=false
```

---

## Project Status: ALL PHASES COMPLETE ✅

**196 tests · 17 test suites · 0 failures**

### Implementation Summary

**Core Utilities** (`src/utils/`, `src/models/`, `src/config/`):
All canonical interfaces finalized in `src/models/index.ts`. Joi validators, Winston logger, helpers, and mock data generator complete.

**Phase 1 — Data Collection** (`src/data-collection/`):
HubSpot client (axios + rate limiter), 4 fetchers (deals, tasks, contacts, engagements), Google Calendar OAuth2 + event fetcher, HubSpot→canonical and Calendar→canonical transformers, DataAggregator, DataCollectionService.

**Phase 2 — Prioritization** (`src/prioritization/`):
Rule engine for deals/tasks/meetings/contacts (P0–P4), classifier, PrioritizationService. Key rule: task "due today" uses `isSameCalendarDay()` helper (not `daysFromNow === 0`) to avoid `Math.ceil` edge cases.

**Phase 3 — AI Intelligence** (`src/ai-intelligence/`):
ClaudeClient with prompt caching (`cache_control: ephemeral`), token budget guard (80k tokens), AIIntelligenceService.analyze(), responseParser with safe fallbacks.

**Phase 4 — Orchestration** (`src/orchestration/`):
Pipeline (Phase 1→2→3→5), StateManager, OrchestratorService with `maxConcurrentAEs` batching. AI and Slack failures are non-fatal (→ partial status).

**Phase 5 — Reporting & Delivery** (`src/reporting/`):
ReportBuilder (Markdown with P0→P4 sections), SlackDelivery (chunked thread delivery, max 3000 chars/block), ReportingService.

### Test Suite Structure (196 tests)
```
tests/
├── fixtures/
│   ├── hubspot-api/         ← deals.json, tasks.json, contacts.json, engagements.json
│   └── google-calendar-api/ ← events.json
├── mocks/
│   ├── unifiedDataMocks.ts
│   └── anthropicMocks.ts
├── unit/
│   ├── data-collection/     ← hubspot transformer (20), google filter+transformer (14), aggregator (13)
│   ├── prioritization/      ← dealRules (12), taskRules (12), meetingRules (12), classifier (7), service (8)
│   ├── ai-intelligence/     ← responseParser (10), aiService (6)
│   ├── orchestration/       ← stateManager (13), pipeline (8)
│   └── reporting/           ← reportBuilder (11), slackDelivery (11)
├── integration/
│   ├── phase1-phase2.test.ts
│   ├── fullPipeline.test.ts
│   └── systemTest.test.ts   ← full Phase 1→2→3→4→5 with fixture data (16 tests)
└── tmp/                     ← auto-cleaned after each system test run (.gitignore'd)
```

### Running Tests

```bash
# macOS / Linux
npm test -- --runInBand
npm run type-check
```

```powershell
# Windows (Node.js not in PS PATH on this machine — fix once per session)
$env:PATH = "C:\Program Files\nodejs;$env:PATH"
npm test -- --runInBand
npm run type-check
```

### Key Context for Future Sessions
- No database needed — HubSpot CRM is the source of truth, NodeCache is in-memory only
- Slack delivery is outbound only (report → Slack DM). Inbound slash-command trigger is out of scope.
- `environment` field in PipelineConfig/ExecutionContext must be `'dev' | 'staging' | 'production'` (not `'test'`)
- `PrioritizedActivities` has no `aeId` field — use `pkg.aeId` from the UnifiedDataPackage instead
- The fixture files in `tests/fixtures/` match the exact HubSpot CRM v3 API response shape

