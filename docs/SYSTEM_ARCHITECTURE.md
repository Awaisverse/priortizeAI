# AE Daily Briefs System Architecture

## 1. System Overview

The AE Daily Briefs system is a modular, event-driven platform that aggregates data from multiple sources, applies intelligent prioritization, leverages AI analysis, and delivers actionable insights to Sales Account Executives via automated daily reports.

### Architecture Pattern
- **Modular Design**: Each component is independently deployable and testable
- **Event-Driven**: Modules communicate through defined interfaces and events
- **Data Flow**: Data Collection → Prioritization → AI Intelligence → Orchestration → Reporting → Delivery

## 2. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AE DAILY BRIEFS PLATFORM                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐                                           │
│  │  Data Sources    │                                           │
│  ├──────────────────┤                                           │
│  │ • HubSpot        │                                           │
│  │ • Google Calend. │                                           │
│  │ • CRM Webhooks   │                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌────────────────────────────────────────────────┐             │
│  │     LAYER 1: DATA COLLECTION SERVICE           │             │
│  │  (Standardized Data Models & Aggregation)      │             │
│  └────────┬─────────────────────────────────────┘             │
│           │                                                      │
│           ▼ [Unified Data Package]                             │
│  ┌────────────────────────────────────────────────┐             │
│  │   LAYER 2: PRIORITIZATION ENGINE               │             │
│  │  (P0-P4 Classification & Business Rules)       │             │
│  └────────┬─────────────────────────────────────┘             │
│           │                                                      │
│           ▼ [Priority Scores & Actions]                        │
│  ┌────────────────────────────────────────────────┐             │
│  │   LAYER 3: AI INTELLIGENCE LAYER               │             │
│  │  (Claude-Powered Insights & Analysis)          │             │
│  └────────┬─────────────────────────────────────┘             │
│           │                                                      │
│           ▼ [Intelligence Blocks]                              │
│  ┌────────────────────────────────────────────────┐             │
│  │  LAYER 4: ORCHESTRATION LAYER                  │             │
│  │  (Scheduler, Workflow, User Mgmt, MCP Server)  │             │
│  └────────┬─────────────────────────────────────┘             │
│           │                                                      │
│           ▼ [Orchestrated Execution]                           │
│  ┌────────────────────────────────────────────────┐             │
│  │   LAYER 5: REPORTING & DELIVERY                │             │
│  │  (Markdown Reports, Slack Delivery, Logging)   │             │
│  └────────┬─────────────────────────────────────┘             │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────────────────────────────────┐               │
│  │     END USERS: AE SLACK DM DELIVERY          │               │
│  └──────────────────────────────────────────────┘               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Detailed Module Architecture

### Layer 1: Data Collection Service
**Responsibility**: Aggregate and standardize data from external sources

**Components**:
- `HubSpotConnector`: Authentication, pagination, rate limiting
- `GoogleCalendarConnector`: Event extraction, timezone handling
- `DataNormalizer`: Transform to standard models
- `CacheManager`: Reduce API calls with intelligent caching

**Output Interfaces**:
```typescript
interface UnifiedDataPackage {
  deals: Deal[];
  tasks: Task[];
  meetings: Meeting[];
  contacts: Contact[];
  engagementHistory: EngagementRecord[];
  timestamp: ISO8601String;
  aggregatedId: string;
}
```

### Layer 2: Prioritization Engine
**Responsibility**: Classify activities into P0-P4 with business logic

**Components**:
- `RuleEngine`: Business rules evaluation
- `ScoringCalculator`: Priority score computation
- `ContextAnalyzer`: Trend analysis, pattern recognition

**Rules Implemented**:
- **P0**: Closing risks, buyer commitments at risk, immediate action needed
- **P1**: Stalled deals, overdue critical tasks, hot inbound
- **P2**: Active opportunities, standard follow-ups
- **P3**: Informational, low-urgency items
- **P4**: Completed/archived items

**Output Interface**:
```typescript
interface PrioritizedActivities {
  classified: ClassifiedActivity[];
  executiveSummary: {
    p0Count: number;
    criticalRisks: string[];
  };
  recommendedActions: Action[];
  timestamp: ISO8601String;
}
```

### Layer 3: AI Intelligence Layer
**Responsibility**: Generate insights using Claude API

**Components**:
- `PromptBuilder`: Construct context-aware prompts
- `ClaudeConnector`: API integration with retry logic
- `InsightProcessor`: Structure AI responses
- `ContextWindow`: Manage token optimization

**Insight Types**:
- Executive summaries (key priorities, risks)
- Meeting preparation insights
- Intent classification
- Risk analysis
- Recommended next steps

**Output Interface**:
```typescript
interface IntelligenceBlocks {
  executiveSummary: string;
  meetingPrep: MeetingInsight[];
  intentClassification: IntentAnalysis[];
  riskAnalysis: RiskAlert[];
  recommendedNextSteps: NextStep[];
  timestamp: ISO8601String;
}
```

### Layer 4: Orchestration Layer
**Responsibility**: Coordinate execution, scheduling, and system management

**Components**:
- `Scheduler`: Cron jobs, timing control
- `WorkflowExecutor`: Pipeline orchestration
- `StateManager`: Session and data state management
- `UserManager`: AE configuration, preferences
- `MCPServer` (Optional): Unified tool access

**Workflow Steps**:
1. Trigger (scheduled/manual)
2. Data collection execution
3. Prioritization evaluation
4. AI intelligence generation
5. Report assembly
6. Delivery orchestration

**Output Interface**:
```typescript
interface ExecutionContext {
  executionId: string;
  startTime: ISO8601String;
  status: 'pending' | 'running' | 'success' | 'failed';
  modules: ModuleExecutionState[];
  errorLog: ErrorRecord[];
  metrics: PerformanceMetrics;
}
```

### Layer 5: Reporting & Delivery
**Responsibility**: Generate and distribute daily briefs

**Components**:
- `MarkdownBuilder`: Format AE Daily Brief markdown
- `SlackClient`: DM delivery integration
- `ValidationEngine`: Quality checks before delivery
- `LoggingService`: Execution tracking and debugging
- `TestOrchestrator`: E2E testing

**Report Structure**:
- Executive Summary
- P0 Priorities with Actions
- Meeting Preparation
- Risk Alerts
- Recommended Next Steps
- Engagement History Summary

## 4. Data Models (Canonical Forms)

### Deal Model
```typescript
interface Deal {
  id: string;
  hubspotId: string;
  name: string;
  amount: number;
  closeDate: ISO8601String;
  status: 'open' | 'won' | 'lost' | 'stalled';
  priority: PriorityLevel;
  risk: RiskLevel;
  buyerCommitment?: string;
  lastActivity: ISO8601String;
}
```

### Task Model
```typescript
interface Task {
  id: string;
  hubspotId: string;
  title: string;
  description: string;
  dueDate: ISO8601String;
  status: 'pending' | 'completed' | 'overdue';
  priority: PriorityLevel;
  owner: string;
  relatedDeal?: string;
  relatedContact?: string;
}
```

### Meeting Model
```typescript
interface Meeting {
  id: string;
  calendarId: string;
  title: string;
  startTime: ISO8601String;
  endTime: ISO8601String;
  attendees: Attendee[];
  description?: string;
  relatedDeal?: string;
  meetingType?: string;
}
```

### Contact Model
```typescript
interface Contact {
  id: string;
  hubspotId: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  title: string;
  lastInteraction: ISO8601String;
  engagementScore: number;
}
```

### EngagementRecord Model
```typescript
interface EngagementRecord {
  id: string;
  timestamp: ISO8601String;
  type: 'call' | 'email' | 'meeting' | 'task_completed';
  contactId: string;
  dealId?: string;
  summary: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}
```

## 5. Integration Points & Data Flow

### Inter-Module Communication

```
Data Collection
    ├─ Input: API credentials, date range
    ├─ Processing: Fetch, normalize, aggregate
    └─ Output: UnifiedDataPackage

    ▼

Prioritization Engine
    ├─ Input: UnifiedDataPackage
    ├─ Processing: Apply rules, calculate scores
    └─ Output: PrioritizedActivities

    ▼

AI Intelligence Layer
    ├─ Input: PrioritizedActivities, UnifiedDataPackage context
    ├─ Processing: Build prompts, call Claude, parse responses
    └─ Output: IntelligenceBlocks

    ▼

Orchestration Layer
    ├─ Input: All previous outputs
    ├─ Processing: Coordinate, validate, manage state
    └─ Output: ExecutionContext

    ▼

Reporting & Delivery
    ├─ Input: All outputs from previous layers
    ├─ Processing: Format, validate, deliver
    └─ Output: Sent to Slack, logged
```

## 6. Error Handling & Resilience Strategy

### Retry Logic
- **Transient Failures**: Exponential backoff (100ms, 200ms, 400ms, 800ms, 1600ms)
- **API Rate Limits**: Adaptive throttling
- **Timeout Handling**: Layer-specific timeout configurations

### Data Validation
- **Schema Validation**: JSON Schema at each layer boundary
- **Data Quality Checks**: Null checks, consistency validation
- **Fallback Mechanisms**: Default values for optional fields

### Logging Strategy
- **Structured Logging**: JSON format with execution context
- **Error Tracking**: Capture full error stack with context
- **Performance Metrics**: Track execution time per module

### Circuit Breaker Pattern
- Prevent cascading failures
- Graceful degradation (e.g., skip AI if Claude is unavailable)
- Fallback to cached results when applicable

## 7. State Management

### Execution State
- Tracked per execution cycle
- Persisted for debugging and audit trails
- Cleanup after successful delivery (configurable retention)

### User State
- AE preferences, timezone, Slack workspace
- Cached in-memory with periodic persistence
- Invalidation on manual updates

## 8. Security Considerations

- **API Keys**: Stored securely, rotated regularly
- **Data Privacy**: No PII logging, sanitized error messages
- **Access Control**: AE-specific data filtering
- **Rate Limiting**: Respect API quotas and implement backoff

## 9. Performance Targets

- **Data Collection**: < 30 seconds (with caching)
- **Prioritization**: < 10 seconds
- **AI Intelligence**: < 20 seconds (depends on Claude API)
- **Report Generation**: < 5 seconds
- **Total Pipeline**: < 90 seconds per AE
- **Memory Usage**: < 500MB per execution

## 10. Scalability Considerations

- **Horizontal Scaling**: Process multiple AEs in parallel
- **Caching Layer**: Reduce API calls by 60-70%
- **Batch Processing**: Handle bulk operations efficiently
- **Queue Management**: For high-volume scenarios

---

**Next**: Refer to [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the 4-phase rollout strategy.
