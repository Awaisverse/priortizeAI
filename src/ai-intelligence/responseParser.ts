import { generateId, nowISO } from '../utils/helpers';
import { createLogger } from '../utils/logger';
import type { IntelligenceBlocks } from '../models';

const logger = createLogger('ResponseParser');

interface RawIntelligenceResponse {
  executiveSummary?: {
    summary?: string;
    keyMetrics?: { metric: string; value: string }[];
    topPriorities?: string[];
  };
  meetingInsights?: {
    meetingId?: string;
    title?: string;
    prepNotes?: string;
    keyPointsToDiscuss?: string[];
    questionsToAsk?: string[];
    potentialOutcomes?: string[];
  }[];
  intentAnalysis?: {
    contactId?: string;
    name?: string;
    intent?: string;
    confidence?: number;
    signals?: string[];
    recommendation?: string;
  }[];
  riskAnalysis?: {
    riskId?: string;
    severity?: string;
    description?: string;
    affectedDeal?: string;
    mitigationSteps?: string[];
  }[];
  recommendedNextSteps?: {
    priority?: string;
    action?: string;
    rationale?: string;
    expectedOutcome?: string;
    suggestedTiming?: string;
  }[];
  insights?: { type?: string; text?: string }[];
}

function safeString(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((i): i is string => typeof i === 'string');
}

function safeNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && isFinite(v) ? v : fallback;
}

export function parseClaudeResponse(
  raw: string,
  packageId: string,
  model: string,
): IntelligenceBlocks {
  let parsed: RawIntelligenceResponse = {};

  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    parsed = JSON.parse(cleaned) as RawIntelligenceResponse;
  } catch (err) {
    logger.warn('Failed to parse Claude JSON response — using empty fallback', {
      error: (err as Error).message,
      rawSnippet: raw.slice(0, 200),
    });
  }

  const validIntents = new Set(['buying', 'exploring', 'passive', 'at_risk', 'unknown']);
  const validSeverities = new Set(['critical', 'high', 'medium', 'low']);
  const validPriorities = new Set(['P0', 'P1', 'P2', 'P3', 'P4']);
  const validInsightTypes = new Set(['opportunity', 'risk', 'trend', 'insight']);

  return {
    executiveSummary: {
      summary: safeString(parsed.executiveSummary?.summary, 'No summary available.'),
      keyMetrics: Array.isArray(parsed.executiveSummary?.keyMetrics)
        ? parsed.executiveSummary!.keyMetrics.map((m) => ({
            metric: safeString(m.metric, 'Unknown'),
            value: safeString(m.value, 'N/A'),
          }))
        : [],
      topPriorities: safeStringArray(parsed.executiveSummary?.topPriorities),
    },
    meetingInsights: Array.isArray(parsed.meetingInsights)
      ? parsed.meetingInsights.map((m) => ({
          meetingId: safeString(m.meetingId, generateId()),
          title: safeString(m.title, 'Unnamed meeting'),
          prepNotes: safeString(m.prepNotes, 'No prep notes available.'),
          keyPointsToDiscuss: safeStringArray(m.keyPointsToDiscuss),
          questionsToAsk: safeStringArray(m.questionsToAsk),
          potentialOutcomes: safeStringArray(m.potentialOutcomes),
        }))
      : [],
    intentAnalysis: Array.isArray(parsed.intentAnalysis)
      ? parsed.intentAnalysis.map((a) => ({
          contactId: safeString(a.contactId, generateId()),
          name: safeString(a.name, 'Unknown Contact'),
          intent: validIntents.has(a.intent ?? '')
            ? (a.intent as IntelligenceBlocks['intentAnalysis'][0]['intent'])
            : 'unknown',
          confidence: Math.min(1, Math.max(0, safeNumber(a.confidence, 0.5))),
          signals: safeStringArray(a.signals),
          recommendation: safeString(a.recommendation, 'Monitor and re-engage.'),
        }))
      : [],
    riskAnalysis: Array.isArray(parsed.riskAnalysis)
      ? parsed.riskAnalysis.map((r) => ({
          riskId: safeString(r.riskId, generateId()),
          severity: validSeverities.has(r.severity ?? '')
            ? (r.severity as IntelligenceBlocks['riskAnalysis'][0]['severity'])
            : 'medium',
          description: safeString(r.description, 'Risk identified.'),
          affectedDeal: r.affectedDeal ? safeString(r.affectedDeal) : undefined,
          mitigationSteps: safeStringArray(r.mitigationSteps),
        }))
      : [],
    recommendedNextSteps: Array.isArray(parsed.recommendedNextSteps)
      ? parsed.recommendedNextSteps.map((s) => ({
          priority: validPriorities.has(s.priority ?? '')
            ? (s.priority as IntelligenceBlocks['recommendedNextSteps'][0]['priority'])
            : 'P3',
          action: safeString(s.action, 'Review and follow up.'),
          rationale: safeString(s.rationale, ''),
          expectedOutcome: safeString(s.expectedOutcome, ''),
          suggestedTiming: safeString(s.suggestedTiming, 'This week'),
        }))
      : [],
    insights: Array.isArray(parsed.insights)
      ? parsed.insights.map((i) => ({
          type: validInsightTypes.has(i.type ?? '')
            ? (i.type as IntelligenceBlocks['insights'][0]['type'])
            : 'insight',
          text: safeString(i.text, ''),
        }))
      : [],
    timestamp: nowISO(),
    packageId,
    model,
  };
}
