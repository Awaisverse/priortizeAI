# Data Models Specification

## Overview

This document specifies all canonical data models used throughout the AE Daily Briefs platform. All modules must conform to these interfaces.

---

## 1. Core Entities

### Deal

```typescript
/**
 * Represents a sales opportunity/deal
 * Source: HubSpot CRM
 */
interface Deal {
  // Unique identifiers
  id: string; // Internal unique ID
  hubspotId: string; // External HubSpot ID
  
  // Basic information
  name: string; // Deal name/title
  description?: string;
  
  // Financial information
  amount: number; // Deal amount in base currency
  currency?: string; // ISO 4217 code (default: USD)
  
  // Status information
  status: 'open' | 'won' | 'lost' | 'stalled' | 'needs_review';
  stage: string; // HubSpot deal stage name
  closeProbability?: number; // 0-100 percentage
  
  // Dates
  closeDate: ISO8601String; // Expected close date
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
  lastActivity: ISO8601String; // Last interaction timestamp
  
  // Relationships
  ownerId: string; // AE ID (owner)
  accountId?: string; // Associated account
  contacts: string[]; // Contact IDs
  
  // Custom fields
  buyerCommitment?: string; // Documented commitment
  competesWith?: string; // Competitor info
  closingRisk?: 'low' | 'medium' | 'high';
  
  // Priority (calculated by prioritization engine)
  priority?: PriorityLevel;
  riskScore?: number; // 0-100
  engagementScore?: number; // 0-100
  
  // Metadata
  source: 'hubspot'; // Data source
  synced_at: ISO8601String;
}

// Validation schema
const DealSchema = {
  type: 'object',
  required: ['id', 'hubspotId', 'name', 'amount', 'status', 'closeDate', 'ownerId', 'source'],
  properties: {
    id: { type: 'string', minLength: 1 },
    hubspotId: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1, maxLength: 255 },
    amount: { type: 'number', minimum: 0 },
    status: { enum: ['open', 'won', 'lost', 'stalled', 'needs_review'] },
    closeProbability: { type: 'number', minimum: 0, maximum: 100 },
    priority: { enum: ['P0', 'P1', 'P2', 'P3', 'P4'] },
    riskScore: { type: 'number', minimum: 0, maximum: 100 },
  },
};
```

### Task

```typescript
/**
 * Represents an action item or to-do
 * Source: HubSpot CRM
 */
interface Task {
  // Unique identifiers
  id: string;
  hubspotId: string;
  
  // Basic information
  title: string; // Task name
  description?: string;
  taskType?: 'call' | 'email' | 'meeting' | 'task' | 'other';
  
  // Status
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  completedAt?: ISO8601String;
  
  // Dates
  dueDate: ISO8601String;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
  
  // Relationships
  ownerId: string; // Who the task is assigned to
  dealId?: string; // Associated deal
  contactId?: string; // Associated contact
  
  // Priority
  priority: PriorityLevel;
  isOverdue?: boolean; // Calculated field
  daysOverdue?: number;
  
  // Metadata
  source: 'hubspot';
  synced_at: ISO8601String;
}

const TaskSchema = {
  type: 'object',
  required: ['id', 'hubspotId', 'title', 'status', 'dueDate', 'ownerId', 'priority', 'source'],
  properties: {
    id: { type: 'string' },
    status: { enum: ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'] },
    priority: { enum: ['P0', 'P1', 'P2', 'P3', 'P4'] },
    daysOverdue: { type: 'number', minimum: 0 },
  },
};
```

### Meeting

```typescript
/**
 * Represents a calendar event
 * Source: Google Calendar
 */
interface Meeting {
  // Unique identifiers
  id: string;
  calendarEventId: string; // Google Calendar event ID
  
  // Basic information
  title: string;
  description?: string;
  
  // Time information
  startTime: ISO8601String;
  endTime: ISO8601String;
  durationMinutes: number; // Calculated
  timezone?: string;
  
  // Attendee information
  organizer: {
    name: string;
    email: string;
  };
  attendees: {
    name?: string;
    email: string;
    status: 'accepted' | 'declined' | 'tentative' | 'needs_action';
  }[];
  
  // Meeting details
  location?: string;
  meetingUrl?: string; // Zoom, Teams, etc.
  recordingUrl?: string;
  
  // Relationships
  dealId?: string; // Associated deal
  contactIds: string[]; // Attending contacts
  
  // Meeting classification
  type?: 'customer_call' | 'internal' | 'prospect_demo' | 'closing_call' | 'other';
  isExternalMeeting?: boolean; // Has customers
  
  // Metadata
  source: 'google_calendar';
  synced_at: ISO8601String;
}

const MeetingSchema = {
  type: 'object',
  required: ['id', 'calendarEventId', 'title', 'startTime', 'endTime', 'organizer', 'attendees', 'source'],
  properties: {
    title: { type: 'string' },
    startTime: { type: 'string', format: 'date-time' },
    endTime: { type: 'string', format: 'date-time' },
    organizer: {
      type: 'object',
      required: ['email'],
    },
    type: { enum: ['customer_call', 'internal', 'prospect_demo', 'closing_call', 'other'] },
  },
};
```

### Contact

```typescript
/**
 * Represents a person in the CRM
 * Source: HubSpot CRM
 */
interface Contact {
  // Unique identifiers
  id: string;
  hubspotId: string;
  
  // Personal information
  firstName?: string;
  lastName?: string;
  name: string; // Full name
  email: string;
  phone?: string;
  title?: string; // Job title
  
  // Organization
  company: string;
  industry?: string;
  
  // Engagement
  lastInteraction: ISO8601String;
  engagementScore: number; // 0-100 based on activity
  engagementTrend?: 'increasing' | 'stable' | 'decreasing';
  
  // Relationship
  dealIds: string[]; // Associated deals
  accountId?: string;
  
  // Contact preferences
  preferredChannels?: ('email' | 'call' | 'sms')[];
  
  // Activity summary
  totalEmails?: number;
  totalCalls?: number;
  lastEmailDate?: ISO8601String;
  lastCallDate?: ISO8601String;
  
  // Metadata
  source: 'hubspot';
  synced_at: ISO8601String;
}

const ContactSchema = {
  type: 'object',
  required: ['id', 'hubspotId', 'name', 'email', 'company', 'lastInteraction', 'source'],
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' },
    engagementScore: { type: 'number', minimum: 0, maximum: 100 },
    engagementTrend: { enum: ['increasing', 'stable', 'decreasing'] },
  },
};
```

### EngagementRecord

```typescript
/**
 * Represents a single interaction (call, email, meeting, etc.)
 * Source: HubSpot activities
 */
interface EngagementRecord {
  // Unique identifiers
  id: string;
  hubspotId?: string;
  
  // Activity information
  type: 'call' | 'email' | 'meeting' | 'task_completed' | 'note' | 'other';
  timestamp: ISO8601String;
  
  // Content
  subject?: string;
  body?: string; // Email body, call notes, etc.
  duration?: number; // Seconds for calls
  
  // Sentiment analysis
  sentiment?: 'positive' | 'neutral' | 'negative' | 'unknown';
  sentimentScore?: number; // -1 to 1
  
  // Relationships
  contactId: string;
  dealId?: string;
  ownerId: string; // Who performed the engagement
  
  // Outcomes
  nextSteps?: string;
  followUpRequired?: boolean;
  
  // Metadata
  source: 'hubspot' | 'email_integration' | 'calendar' | 'manual_entry';
  synced_at: ISO8601String;
}

const EngagementRecordSchema = {
  type: 'object',
  required: ['id', 'type', 'timestamp', 'contactId', 'ownerId', 'source'],
  properties: {
    type: { enum: ['call', 'email', 'meeting', 'task_completed', 'note', 'other'] },
    timestamp: { type: 'string', format: 'date-time' },
    sentiment: { enum: ['positive', 'neutral', 'negative', 'unknown'] },
    sentimentScore: { type: 'number', minimum: -1, maximum: 1 },
  },
};
```

---

## 2. Composite Structures

### UnifiedDataPackage

```typescript
/**
 * Output of Phase 1: Data Collection
 * Contains all aggregated data for a single AE
 */
interface UnifiedDataPackage {
  // Data collections
  deals: Deal[];
  tasks: Task[];
  meetings: Meeting[];
  contacts: Contact[];
  engagementHistory: EngagementRecord[];
  
  // Package metadata
  timestamp: ISO8601String; // When data was collected
  aggregatedId: string; // Unique ID for this package
  aeId: string; // Account Executive ID
  
  // Collection metadata
  metadata: {
    fetchedAt: ISO8601String;
    sources: ('hubspot' | 'google_calendar')[];
    recordCount: {
      deals: number;
      tasks: number;
      meetings: number;
      contacts: number;
      engagements: number;
    };
    dataQuality: {
      score: number; // 0-100
      issues: string[];
    };
  };
}

const UnifiedDataPackageSchema = {
  type: 'object',
  required: ['deals', 'tasks', 'meetings', 'contacts', 'engagementHistory', 'timestamp', 'aggregatedId', 'aeId', 'metadata'],
  properties: {
    deals: { type: 'array', items: { $ref: '#/definitions/Deal' } },
    tasks: { type: 'array', items: { $ref: '#/definitions/Task' } },
    meetings: { type: 'array', items: { $ref: '#/definitions/Meeting' } },
    contacts: { type: 'array', items: { $ref: '#/definitions/Contact' } },
    engagementHistory: { type: 'array', items: { $ref: '#/definitions/EngagementRecord' } },
    timestamp: { type: 'string', format: 'date-time' },
    aggregatedId: { type: 'string' },
    aeId: { type: 'string' },
  },
};
```

### ClassifiedActivity

```typescript
/**
 * An activity that has been classified with priority and actions
 */
interface ClassifiedActivity {
  // Source information
  id: string;
  type: 'deal' | 'task' | 'meeting' | 'contact';
  sourceId: string; // ID of the original entity
  
  // Classification
  priority: PriorityLevel;
  urgency: 'immediate' | 'today' | 'this_week' | 'later';
  category: string; // Custom category
  
  // Analysis
  rationale: string; // Why this priority
  risks: string[];
  opportunities: string[];
  
  // Recommended actions
  recommendedActions: Action[];
  
  // Score breakdown
  scores: {
    priorityScore: number; // 0-100
    urgencyScore: number;
    riskScore: number;
  };
  
  // Metadata
  classified_at: ISO8601String;
}

interface Action {
  id: string;
  title: string;
  description: string;
  actionType: 'call' | 'email' | 'meeting' | 'task' | 'internal_action';
  suggestedTiming?: 'immediate' | 'today' | 'within_24h' | 'this_week';
  expectedOutcome?: string;
  owner?: string;
}

type PriorityLevel = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
```

### PrioritizedActivities

```typescript
/**
 * Output of Phase 2: Prioritization Engine
 * All activities classified and prioritized
 */
interface PrioritizedActivities {
  // Classified activities by priority
  classified: ClassifiedActivity[];
  
  // Summary statistics
  summary: {
    totalActivities: number;
    byPriority: {
      P0: number;
      P1: number;
      P2: number;
      P3: number;
      P4: number;
    };
  };
  
  // Executive view
  executiveSummary: {
    topRisks: string[]; // Top 3-5 risks
    topOpportunities: string[];
    criticalActions: string[]; // What needs to happen today
    statusByDeal: {
      dealId: string;
      status: string;
      risk: string;
      action: string;
    }[];
  };
  
  // Recommended actions
  recommendedActions: Action[];
  
  // Metadata
  timestamp: ISO8601String;
  packageId: string; // Reference to UnifiedDataPackage
}
```

### IntelligenceBlocks

```typescript
/**
 * Output of Phase 3: AI Intelligence Layer
 * AI-generated insights and recommendations
 */
interface IntelligenceBlocks {
  // Core insights
  executiveSummary: {
    summary: string; // 2-3 sentences
    keyMetrics: {
      metric: string;
      value: string;
    }[];
    topPriorities: string[]; // 3-5 items
  };
  
  // Meeting-specific insights
  meetingInsights: {
    meetingId: string;
    title: string;
    prepNotes: string;
    keyPointsToDiscuss: string[];
    questionsToAsk: string[];
    potentialOutcomes: string[];
  }[];
  
  // Intent analysis
  intentAnalysis: {
    contactId: string;
    name: string;
    intent: 'buying' | 'exploring' | 'passive' | 'at_risk' | 'unknown';
    confidence: number; // 0-1
    signals: string[];
    recommendation: string;
  }[];
  
  // Risk analysis
  riskAnalysis: {
    riskId: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    affectedDeal?: string;
    mitigationSteps: string[];
  }[];
  
  // Recommended next steps
  recommendedNextSteps: {
    priority: PriorityLevel;
    action: string;
    rationale: string;
    expectedOutcome: string;
    suggestedTiming: string;
  }[];
  
  // General insights
  insights: {
    type: 'opportunity' | 'risk' | 'trend' | 'insight';
    text: string;
  }[];
  
  // Metadata
  timestamp: ISO8601String;
  packageId: string; // Reference to UnifiedDataPackage
  model: string; // Claude version used
}
```

---

## 3. Execution & State Models

### ExecutionContext

```typescript
/**
 * Tracks execution state across the full pipeline
 */
interface ExecutionContext {
  // Execution identification
  executionId: string;
  aeId: string;
  
  // Timing
  startTime: ISO8601String;
  endTime?: ISO8601String;
  duration?: number; // milliseconds
  
  // Status
  status: 'pending' | 'running' | 'success' | 'failed' | 'partial';
  
  // Module execution states
  modules: ModuleExecutionState[];
  
  // Results
  results: {
    dataPackage?: UnifiedDataPackage;
    prioritizedActivities?: PrioritizedActivities;
    intelligence?: IntelligenceBlocks;
    report?: Report;
  };
  
  // Error tracking
  errors: ErrorRecord[];
  warnings: WarningRecord[];
  
  // Performance metrics
  metrics: PerformanceMetrics;
  
  // Metadata
  trigger: 'scheduled' | 'manual' | 'webhook';
  environment: 'dev' | 'staging' | 'production';
}

interface ModuleExecutionState {
  moduleName: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startTime: ISO8601String;
  endTime?: ISO8601String;
  duration?: number;
  outputSize?: number; // bytes
  errorMessage?: string;
}

interface ErrorRecord {
  timestamp: ISO8601String;
  module: string;
  severity: 'error' | 'warning';
  message: string;
  code?: string;
  details?: Record<string, any>;
}

interface WarningRecord extends ErrorRecord {}

interface PerformanceMetrics {
  dataCollectionTime: number;
  prioritizationTime: number;
  aiIntelligenceTime: number;
  reportGenerationTime: number;
  totalTime: number;
  cacheHitRate: number; // 0-1
  apiCallCount: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}
```

---

## 4. Type Definitions

```typescript
// Timestamps in ISO 8601 format
type ISO8601String = string; // e.g., "2024-06-16T10:30:00Z"

// Priority levels (P0 = highest, P4 = lowest)
type PriorityLevel = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

// Risk levels
type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';

// Sentiment analysis
type Sentiment = 'positive' | 'neutral' | 'negative' | 'unknown';

// Status enumerations
type DealStatus = 'open' | 'won' | 'lost' | 'stalled' | 'needs_review';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'partial';
```

---

## 5. Validation Rules

### Data Integrity Rules

1. **Referential Integrity**
   - All foreign keys must reference existing entities
   - Contact IDs in deals must exist in contacts collection
   - Deal IDs must be valid

2. **Temporal Integrity**
   - `createdAt` <= `updatedAt` <= `synced_at`
   - `lastActivity` <= current time
   - Meeting `startTime` < `endTime`

3. **Value Constraints**
   - Amounts >= 0
   - Scores 0-100
   - Percentages 0-100

4. **Required Fields**
   - All entities must have `id` and `source`
   - All entities must have timestamp fields

### Business Logic Validation

1. **Priority Rules**
   - P0 activities must have actionable risk
   - P1+ activities must have owner assigned
   - P0-P2 must be reviewed at least weekly

2. **Deal Rules**
   - Won deals cannot have future close dates
   - Lost deals should have completion date
   - Open deals with past close date are "at risk"

3. **Task Rules**
   - Completed tasks must have `completedAt` date
   - Overdue tasks must have `daysOverdue` > 0
   - Task owner must be valid AE

---

## Testing Data

### Minimal Valid Objects

```typescript
const minimalDeal: Deal = {
  id: 'deal-1',
  hubspotId: 'hubspot-123',
  name: 'Acme Corp Deal',
  amount: 50000,
  status: 'open',
  closeDate: '2024-12-31T23:59:59Z',
  ownerId: 'ae-1',
  source: 'hubspot',
  synced_at: new Date().toISOString(),
};

const minimalTask: Task = {
  id: 'task-1',
  hubspotId: 'hubspot-456',
  title: 'Follow up call',
  status: 'pending',
  dueDate: '2024-06-20T09:00:00Z',
  ownerId: 'ae-1',
  priority: 'P1',
  source: 'hubspot',
  synced_at: new Date().toISOString(),
};

// Continue for other entities...
```

---

## Migration & Versioning

### Version History

- **v1.0** (Current): Initial release with 5 core entities
- **v1.1**: Add optional fields for enhanced analytics
- **v2.0**: (Planned) Restructure for multi-account support

### Backward Compatibility

All new fields must be optional (?) to maintain backward compatibility with existing code.

