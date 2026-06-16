// Canonical TypeScript interfaces for the AE Daily Briefs platform.
// All modules import from here — never duplicate these definitions.

// ─── Primitives ───────────────────────────────────────────────────────────────

export type ISO8601String = string;
export type PriorityLevel = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';
export type Sentiment = 'positive' | 'neutral' | 'negative' | 'unknown';
export type DealStatus = 'open' | 'won' | 'lost' | 'stalled' | 'needs_review';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'partial';

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface Deal {
  id: string;
  hubspotId: string;
  name: string;
  description?: string;
  amount: number;
  currency?: string;
  status: DealStatus;
  stage: string;
  closeProbability?: number;
  closeDate: ISO8601String;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
  lastActivity: ISO8601String;
  ownerId: string;
  accountId?: string;
  contacts: string[];
  buyerCommitment?: string;
  competesWith?: string;
  closingRisk?: 'low' | 'medium' | 'high';
  priority?: PriorityLevel;
  riskScore?: number;
  engagementScore?: number;
  source: 'hubspot';
  synced_at: ISO8601String;
}

export interface Task {
  id: string;
  hubspotId: string;
  title: string;
  description?: string;
  taskType?: 'call' | 'email' | 'meeting' | 'task' | 'other';
  status: TaskStatus;
  completedAt?: ISO8601String;
  dueDate: ISO8601String;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
  ownerId: string;
  dealId?: string;
  contactId?: string;
  priority: PriorityLevel;
  isOverdue?: boolean;
  daysOverdue?: number;
  source: 'hubspot';
  synced_at: ISO8601String;
}

export interface Attendee {
  name?: string;
  email: string;
  status: 'accepted' | 'declined' | 'tentative' | 'needs_action';
}

export interface Meeting {
  id: string;
  calendarEventId: string;
  title: string;
  description?: string;
  startTime: ISO8601String;
  endTime: ISO8601String;
  durationMinutes: number;
  timezone?: string;
  organizer: { name: string; email: string };
  attendees: Attendee[];
  location?: string;
  meetingUrl?: string;
  recordingUrl?: string;
  dealId?: string;
  contactIds: string[];
  type?: 'customer_call' | 'internal' | 'prospect_demo' | 'closing_call' | 'other';
  isExternalMeeting?: boolean;
  source: 'google_calendar';
  synced_at: ISO8601String;
}

export interface Contact {
  id: string;
  hubspotId: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email: string;
  phone?: string;
  title?: string;
  company: string;
  industry?: string;
  lastInteraction: ISO8601String;
  engagementScore: number;
  engagementTrend?: 'increasing' | 'stable' | 'decreasing';
  dealIds: string[];
  accountId?: string;
  preferredChannels?: ('email' | 'call' | 'sms')[];
  totalEmails?: number;
  totalCalls?: number;
  lastEmailDate?: ISO8601String;
  lastCallDate?: ISO8601String;
  source: 'hubspot';
  synced_at: ISO8601String;
}

export interface EngagementRecord {
  id: string;
  hubspotId?: string;
  type: 'call' | 'email' | 'meeting' | 'task_completed' | 'note' | 'other';
  timestamp: ISO8601String;
  subject?: string;
  body?: string;
  duration?: number;
  sentiment?: Sentiment;
  sentimentScore?: number;
  contactId: string;
  dealId?: string;
  ownerId: string;
  nextSteps?: string;
  followUpRequired?: boolean;
  source: 'hubspot' | 'email_integration' | 'calendar' | 'manual_entry';
  synced_at: ISO8601String;
}

// ─── Phase 1 Output ───────────────────────────────────────────────────────────

export interface UnifiedDataPackage {
  deals: Deal[];
  tasks: Task[];
  meetings: Meeting[];
  contacts: Contact[];
  engagementHistory: EngagementRecord[];
  timestamp: ISO8601String;
  aggregatedId: string;
  aeId: string;
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
      score: number;
      issues: string[];
    };
  };
}

// ─── Phase 2 Output ───────────────────────────────────────────────────────────

export interface Action {
  id: string;
  title: string;
  description: string;
  actionType: 'call' | 'email' | 'meeting' | 'task' | 'internal_action';
  suggestedTiming?: 'immediate' | 'today' | 'within_24h' | 'this_week';
  expectedOutcome?: string;
  owner?: string;
}

export interface ClassifiedActivity {
  id: string;
  type: 'deal' | 'task' | 'meeting' | 'contact';
  sourceId: string;
  priority: PriorityLevel;
  urgency: 'immediate' | 'today' | 'this_week' | 'later';
  category: string;
  rationale: string;
  risks: string[];
  opportunities: string[];
  recommendedActions: Action[];
  scores: {
    priorityScore: number;
    urgencyScore: number;
    riskScore: number;
  };
  classified_at: ISO8601String;
}

export interface PrioritizedActivities {
  classified: ClassifiedActivity[];
  summary: {
    totalActivities: number;
    byPriority: { P0: number; P1: number; P2: number; P3: number; P4: number };
  };
  executiveSummary: {
    topRisks: string[];
    topOpportunities: string[];
    criticalActions: string[];
    statusByDeal: { dealId: string; status: string; risk: string; action: string }[];
  };
  recommendedActions: Action[];
  timestamp: ISO8601String;
  packageId: string;
}

// ─── Phase 3 Output ───────────────────────────────────────────────────────────

export interface IntelligenceBlocks {
  executiveSummary: {
    summary: string;
    keyMetrics: { metric: string; value: string }[];
    topPriorities: string[];
  };
  meetingInsights: {
    meetingId: string;
    title: string;
    prepNotes: string;
    keyPointsToDiscuss: string[];
    questionsToAsk: string[];
    potentialOutcomes: string[];
  }[];
  intentAnalysis: {
    contactId: string;
    name: string;
    intent: 'buying' | 'exploring' | 'passive' | 'at_risk' | 'unknown';
    confidence: number;
    signals: string[];
    recommendation: string;
  }[];
  riskAnalysis: {
    riskId: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    affectedDeal?: string;
    mitigationSteps: string[];
  }[];
  recommendedNextSteps: {
    priority: PriorityLevel;
    action: string;
    rationale: string;
    expectedOutcome: string;
    suggestedTiming: string;
  }[];
  insights: { type: 'opportunity' | 'risk' | 'trend' | 'insight'; text: string }[];
  timestamp: ISO8601String;
  packageId: string;
  model: string;
}

// ─── Phase 4/5 Models ─────────────────────────────────────────────────────────

export interface ModuleExecutionState {
  moduleName: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startTime: ISO8601String;
  endTime?: ISO8601String;
  duration?: number;
  outputSize?: number;
  errorMessage?: string;
}

export interface ErrorRecord {
  timestamp: ISO8601String;
  module: string;
  severity: 'error' | 'warning';
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface PerformanceMetrics {
  dataCollectionTime: number;
  prioritizationTime: number;
  aiIntelligenceTime: number;
  reportGenerationTime: number;
  totalTime: number;
  cacheHitRate: number;
  apiCallCount: number;
  tokenUsage?: { prompt: number; completion: number; total: number };
}

export interface ExecutionContext {
  executionId: string;
  aeId: string;
  startTime: ISO8601String;
  endTime?: ISO8601String;
  duration?: number;
  status: ExecutionStatus;
  modules: ModuleExecutionState[];
  results: {
    dataPackage?: UnifiedDataPackage;
    prioritizedActivities?: PrioritizedActivities;
    intelligence?: IntelligenceBlocks;
  };
  errors: ErrorRecord[];
  warnings: ErrorRecord[];
  metrics: PerformanceMetrics;
  trigger: 'scheduled' | 'manual' | 'webhook';
  environment: 'dev' | 'staging' | 'production';
}

export interface Report {
  reportId: string;
  executionId: string;
  aeId: string;
  generatedAt: ISO8601String;
  markdown: string;
  sections: {
    executiveSummary: boolean;
    p0Priorities: boolean;
    meetingPrep: boolean;
    riskAlerts: boolean;
    nextSteps: boolean;
    pipelineSummary: boolean;
  };
  wordCount: number;
  deliveredAt?: ISO8601String;
  deliveryStatus: 'pending' | 'delivered' | 'failed';
}

// ─── User Management ──────────────────────────────────────────────────────────

export interface AEUser {
  aeId: string;
  name: string;
  email: string;
  slackUserId: string;
  timezone: string;
  scheduleTime: string;
  hubspotOwnerId: string;
  googleCalendarId: string;
  isActive: boolean;
  preferences: {
    includeP3: boolean;
    includeP4: boolean;
    maxReportLength: number;
    enableAI: boolean;
  };
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}
