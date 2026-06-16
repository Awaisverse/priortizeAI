import Joi from 'joi';
import type {
  Deal,
  Task,
  Meeting,
  Contact,
  EngagementRecord,
  UnifiedDataPackage,
  PrioritizedActivities,
  IntelligenceBlocks,
} from '../models';

// ─── Shared sub-schemas ───────────────────────────────────────────────────────

const isoString = Joi.string().isoDate();
const priorityLevel = Joi.string().valid('P0', 'P1', 'P2', 'P3', 'P4');

// ─── Entity schemas ───────────────────────────────────────────────────────────

const dealSchema = Joi.object({
  id: Joi.string().min(1).required(),
  hubspotId: Joi.string().min(1).required(),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().optional(),
  amount: Joi.number().min(0).required(),
  currency: Joi.string().optional(),
  status: Joi.string().valid('open', 'won', 'lost', 'stalled', 'needs_review').required(),
  stage: Joi.string().required(),
  closeProbability: Joi.number().min(0).max(100).optional(),
  closeDate: isoString.required(),
  createdAt: isoString.required(),
  updatedAt: isoString.required(),
  lastActivity: isoString.required(),
  ownerId: Joi.string().required(),
  accountId: Joi.string().optional(),
  contacts: Joi.array().items(Joi.string()).required(),
  buyerCommitment: Joi.string().optional(),
  competesWith: Joi.string().optional(),
  closingRisk: Joi.string().valid('low', 'medium', 'high').optional(),
  priority: priorityLevel.optional(),
  riskScore: Joi.number().min(0).max(100).optional(),
  engagementScore: Joi.number().min(0).max(100).optional(),
  source: Joi.string().valid('hubspot').required(),
  synced_at: isoString.required(),
});

const taskSchema = Joi.object({
  id: Joi.string().required(),
  hubspotId: Joi.string().required(),
  title: Joi.string().min(1).required(),
  description: Joi.string().optional(),
  taskType: Joi.string().valid('call', 'email', 'meeting', 'task', 'other').optional(),
  status: Joi.string()
    .valid('pending', 'in_progress', 'completed', 'overdue', 'cancelled')
    .required(),
  completedAt: isoString.optional(),
  dueDate: isoString.required(),
  createdAt: isoString.required(),
  updatedAt: isoString.required(),
  ownerId: Joi.string().required(),
  dealId: Joi.string().optional(),
  contactId: Joi.string().optional(),
  priority: priorityLevel.required(),
  isOverdue: Joi.boolean().optional(),
  daysOverdue: Joi.number().min(0).optional(),
  source: Joi.string().valid('hubspot').required(),
  synced_at: isoString.required(),
});

const meetingSchema = Joi.object({
  id: Joi.string().required(),
  calendarEventId: Joi.string().required(),
  title: Joi.string().required(),
  description: Joi.string().optional(),
  startTime: isoString.required(),
  endTime: isoString.required(),
  durationMinutes: Joi.number().min(0).required(),
  timezone: Joi.string().optional(),
  organizer: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email({ tlds: { allow: false } }).required(),
  }).required(),
  attendees: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().optional(),
        email: Joi.string().email({ tlds: { allow: false } }).required(),
        status: Joi.string()
          .valid('accepted', 'declined', 'tentative', 'needs_action')
          .required(),
      }),
    )
    .required(),
  location: Joi.string().optional(),
  meetingUrl: Joi.string().uri().optional(),
  recordingUrl: Joi.string().uri().optional(),
  dealId: Joi.string().optional(),
  contactIds: Joi.array().items(Joi.string()).required(),
  type: Joi.string()
    .valid('customer_call', 'internal', 'prospect_demo', 'closing_call', 'other')
    .optional(),
  isExternalMeeting: Joi.boolean().optional(),
  source: Joi.string().valid('google_calendar').required(),
  synced_at: isoString.required(),
});

const contactSchema = Joi.object({
  id: Joi.string().required(),
  hubspotId: Joi.string().required(),
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  name: Joi.string().min(1).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  phone: Joi.string().optional(),
  title: Joi.string().optional(),
  company: Joi.string().required(),
  industry: Joi.string().optional(),
  lastInteraction: isoString.required(),
  engagementScore: Joi.number().min(0).max(100).required(),
  engagementTrend: Joi.string().valid('increasing', 'stable', 'decreasing').optional(),
  dealIds: Joi.array().items(Joi.string()).required(),
  accountId: Joi.string().optional(),
  preferredChannels: Joi.array().items(Joi.string().valid('email', 'call', 'sms')).optional(),
  totalEmails: Joi.number().min(0).optional(),
  totalCalls: Joi.number().min(0).optional(),
  lastEmailDate: isoString.optional(),
  lastCallDate: isoString.optional(),
  source: Joi.string().valid('hubspot').required(),
  synced_at: isoString.required(),
});

const engagementSchema = Joi.object({
  id: Joi.string().required(),
  hubspotId: Joi.string().optional(),
  type: Joi.string()
    .valid('call', 'email', 'meeting', 'task_completed', 'note', 'other')
    .required(),
  timestamp: isoString.required(),
  subject: Joi.string().optional(),
  body: Joi.string().optional(),
  duration: Joi.number().min(0).optional(),
  sentiment: Joi.string().valid('positive', 'neutral', 'negative', 'unknown').optional(),
  sentimentScore: Joi.number().min(-1).max(1).optional(),
  contactId: Joi.string().required(),
  dealId: Joi.string().optional(),
  ownerId: Joi.string().required(),
  nextSteps: Joi.string().optional(),
  followUpRequired: Joi.boolean().optional(),
  source: Joi.string()
    .valid('hubspot', 'email_integration', 'calendar', 'manual_entry')
    .required(),
  synced_at: isoString.required(),
});

const unifiedDataPackageSchema = Joi.object({
  deals: Joi.array().items(dealSchema).required(),
  tasks: Joi.array().items(taskSchema).required(),
  meetings: Joi.array().items(meetingSchema).required(),
  contacts: Joi.array().items(contactSchema).required(),
  engagementHistory: Joi.array().items(engagementSchema).required(),
  timestamp: isoString.required(),
  aggregatedId: Joi.string().required(),
  aeId: Joi.string().required(),
  metadata: Joi.object({
    fetchedAt: isoString.required(),
    sources: Joi.array().items(Joi.string().valid('hubspot', 'google_calendar')).required(),
    recordCount: Joi.object({
      deals: Joi.number().min(0).required(),
      tasks: Joi.number().min(0).required(),
      meetings: Joi.number().min(0).required(),
      contacts: Joi.number().min(0).required(),
      engagements: Joi.number().min(0).required(),
    }).required(),
    dataQuality: Joi.object({
      score: Joi.number().min(0).max(100).required(),
      issues: Joi.array().items(Joi.string()).required(),
    }).required(),
  }).required(),
});

// ─── Validation functions ─────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validate(schema: Joi.Schema, data: unknown): ValidationResult {
  const { error } = schema.validate(data, { abortEarly: false, allowUnknown: false });
  if (!error) return { valid: true, errors: [] };
  return {
    valid: false,
    errors: error.details.map((d) => d.message),
  };
}

export function validateDeal(data: unknown): ValidationResult {
  return validate(dealSchema, data);
}

export function validateTask(data: unknown): ValidationResult {
  return validate(taskSchema, data);
}

export function validateMeeting(data: unknown): ValidationResult {
  return validate(meetingSchema, data);
}

export function validateContact(data: unknown): ValidationResult {
  return validate(contactSchema, data);
}

export function validateEngagementRecord(data: unknown): ValidationResult {
  return validate(engagementSchema, data);
}

export function validateUnifiedDataPackage(data: unknown): ValidationResult {
  return validate(unifiedDataPackageSchema, data);
}

const actionSchema = Joi.object({
  id: Joi.string().required(),
  title: Joi.string().required(),
  description: Joi.string().required(),
  actionType: Joi.string().valid('call', 'email', 'meeting', 'task', 'internal_action').required(),
  suggestedTiming: Joi.string()
    .valid('immediate', 'today', 'within_24h', 'this_week')
    .optional(),
  expectedOutcome: Joi.string().optional(),
  owner: Joi.string().optional(),
});

const classifiedActivitySchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().valid('deal', 'task', 'meeting', 'contact').required(),
  sourceId: Joi.string().required(),
  priority: priorityLevel.required(),
  urgency: Joi.string().valid('immediate', 'today', 'this_week', 'later').required(),
  category: Joi.string().required(),
  rationale: Joi.string().required(),
  risks: Joi.array().items(Joi.string()).required(),
  opportunities: Joi.array().items(Joi.string()).required(),
  recommendedActions: Joi.array().items(actionSchema).required(),
  scores: Joi.object({
    priorityScore: Joi.number().min(0).max(100).required(),
    urgencyScore: Joi.number().min(0).max(100).required(),
    riskScore: Joi.number().min(0).max(100).required(),
  }).required(),
  classified_at: isoString.required(),
});

const prioritizedActivitiesSchema = Joi.object({
  classified: Joi.array().items(classifiedActivitySchema).required(),
  summary: Joi.object({
    totalActivities: Joi.number().min(0).required(),
    byPriority: Joi.object({
      P0: Joi.number().min(0).required(),
      P1: Joi.number().min(0).required(),
      P2: Joi.number().min(0).required(),
      P3: Joi.number().min(0).required(),
      P4: Joi.number().min(0).required(),
    }).required(),
  }).required(),
  executiveSummary: Joi.object({
    topRisks: Joi.array().items(Joi.string()).required(),
    topOpportunities: Joi.array().items(Joi.string()).required(),
    criticalActions: Joi.array().items(Joi.string()).required(),
    statusByDeal: Joi.array()
      .items(
        Joi.object({
          dealId: Joi.string().required(),
          status: Joi.string().required(),
          risk: Joi.string().required(),
          action: Joi.string().required(),
        }),
      )
      .required(),
  }).required(),
  recommendedActions: Joi.array().items(actionSchema).required(),
  timestamp: isoString.required(),
  packageId: Joi.string().required(),
});

const intelligenceBlocksSchema = Joi.object({
  executiveSummary: Joi.object({
    summary: Joi.string().required(),
    keyMetrics: Joi.array()
      .items(Joi.object({ metric: Joi.string().required(), value: Joi.string().required() }))
      .required(),
    topPriorities: Joi.array().items(Joi.string()).required(),
  }).required(),
  meetingInsights: Joi.array()
    .items(
      Joi.object({
        meetingId: Joi.string().required(),
        title: Joi.string().required(),
        prepNotes: Joi.string().required(),
        keyPointsToDiscuss: Joi.array().items(Joi.string()).required(),
        questionsToAsk: Joi.array().items(Joi.string()).required(),
        potentialOutcomes: Joi.array().items(Joi.string()).required(),
      }),
    )
    .required(),
  intentAnalysis: Joi.array()
    .items(
      Joi.object({
        contactId: Joi.string().required(),
        name: Joi.string().required(),
        intent: Joi.string()
          .valid('buying', 'exploring', 'passive', 'at_risk', 'unknown')
          .required(),
        confidence: Joi.number().min(0).max(1).required(),
        signals: Joi.array().items(Joi.string()).required(),
        recommendation: Joi.string().required(),
      }),
    )
    .required(),
  riskAnalysis: Joi.array()
    .items(
      Joi.object({
        riskId: Joi.string().required(),
        severity: Joi.string().valid('critical', 'high', 'medium', 'low').required(),
        description: Joi.string().required(),
        affectedDeal: Joi.string().optional(),
        mitigationSteps: Joi.array().items(Joi.string()).required(),
      }),
    )
    .required(),
  recommendedNextSteps: Joi.array()
    .items(
      Joi.object({
        priority: priorityLevel.required(),
        action: Joi.string().required(),
        rationale: Joi.string().required(),
        expectedOutcome: Joi.string().required(),
        suggestedTiming: Joi.string().required(),
      }),
    )
    .required(),
  insights: Joi.array()
    .items(
      Joi.object({
        type: Joi.string().valid('opportunity', 'risk', 'trend', 'insight').required(),
        text: Joi.string().required(),
      }),
    )
    .required(),
  timestamp: isoString.required(),
  packageId: Joi.string().required(),
  model: Joi.string().required(),
});

export function validatePrioritizedActivities(data: unknown): ValidationResult {
  return validate(prioritizedActivitiesSchema, data);
}

export function validateIntelligenceBlocks(data: unknown): ValidationResult {
  return validate(intelligenceBlocksSchema, data);
}

// Type guard exports
export function isDeal(data: unknown): data is Deal {
  return validateDeal(data).valid;
}

export function isTask(data: unknown): data is Task {
  return validateTask(data).valid;
}

export function isMeeting(data: unknown): data is Meeting {
  return validateMeeting(data).valid;
}

export function isContact(data: unknown): data is Contact {
  return validateContact(data).valid;
}

export function isEngagementRecord(data: unknown): data is EngagementRecord {
  return validateEngagementRecord(data).valid;
}

export function isUnifiedDataPackage(data: unknown): data is UnifiedDataPackage {
  return validateUnifiedDataPackage(data).valid;
}

export type {
  Deal,
  Task,
  Meeting,
  Contact,
  EngagementRecord,
  UnifiedDataPackage,
  PrioritizedActivities,
  IntelligenceBlocks,
};
