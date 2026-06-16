import type { UnifiedDataPackage, PrioritizedActivities } from '../models';

export function buildSystemPrompt(): string {
  return `You are an expert Sales Intelligence AI assistant for Account Executives (AEs).
Your role is to analyze CRM data, calendar events, and engagement history to generate concise, actionable daily briefs.

Guidelines:
- Be specific and data-driven. Reference deal names, amounts, and dates.
- Prioritize urgency. Surface the most time-sensitive items first.
- Be concise. AEs read briefs in under 5 minutes.
- Use professional but direct language — no filler phrases.
- Always recommend concrete next steps with clear expected outcomes.`;
}

export function buildAnalysisPrompt(
  pkg: UnifiedDataPackage,
  prioritized: PrioritizedActivities,
): string {
  const p0Items = prioritized.classified.filter((c) => c.priority === 'P0');
  const p1Items = prioritized.classified.filter((c) => c.priority === 'P1');
  const openDeals = pkg.deals.filter((d) => d.status === 'open' || d.status === 'needs_review');
  const todayMeetings = pkg.meetings.filter((m) => {
    const start = new Date(m.startTime);
    const now = new Date();
    return (
      start.getFullYear() === now.getFullYear() &&
      start.getMonth() === now.getMonth() &&
      start.getDate() === now.getDate()
    );
  });

  const dealsJson = openDeals.slice(0, 10).map((d) => ({
    name: d.name,
    amount: d.amount,
    stage: d.stage,
    closeDate: d.closeDate,
    status: d.status,
    probability: d.closeProbability,
    daysSinceActivity: Math.floor(
      (Date.now() - new Date(d.lastActivity).getTime()) / (1000 * 60 * 60 * 24),
    ),
    closingRisk: d.closingRisk,
  }));

  const meetingsJson = todayMeetings.map((m) => ({
    title: m.title,
    startTime: m.startTime,
    type: m.type,
    attendees: m.attendees.map((a) => a.name ?? a.email),
    dealId: m.dealId,
  }));

  const p0Summary = p0Items.slice(0, 5).map((i) => ({
    type: i.type,
    rationale: i.rationale,
    risks: i.risks,
    category: i.category,
  }));

  const p1Summary = p1Items.slice(0, 5).map((i) => ({
    type: i.type,
    rationale: i.rationale,
    category: i.category,
  }));

  const contacts = pkg.contacts.slice(0, 8).map((c) => ({
    name: c.name,
    company: c.company,
    engagementScore: c.engagementScore,
    engagementTrend: c.engagementTrend,
    daysSinceInteraction: Math.floor(
      (Date.now() - new Date(c.lastInteraction).getTime()) / (1000 * 60 * 60 * 24),
    ),
    dealCount: c.dealIds.length,
  }));

  return `Analyze the following AE (Account Executive) data and generate a comprehensive daily intelligence brief.

## Context
- AE ID: ${pkg.aeId}
- Date: ${new Date().toDateString()}
- Total open deals: ${openDeals.length}
- Today's meetings: ${todayMeetings.length}
- P0 critical items: ${p0Items.length}
- P1 high-priority items: ${p1Items.length}

## Critical Items (P0)
${JSON.stringify(p0Summary, null, 2)}

## High Priority Items (P1)
${JSON.stringify(p1Summary, null, 2)}

## Open Deals
${JSON.stringify(dealsJson, null, 2)}

## Today's Meetings
${JSON.stringify(meetingsJson, null, 2)}

## Key Contacts
${JSON.stringify(contacts, null, 2)}

## Overdue Tasks
${JSON.stringify(
  pkg.tasks
    .filter((t) => t.isOverdue || new Date(t.dueDate) < new Date())
    .slice(0, 5)
    .map((t) => ({ title: t.title, dueDate: t.dueDate, type: t.taskType })),
  null,
  2,
)}

## Required Output
Respond with a valid JSON object (no markdown, no code block) matching this exact structure:
{
  "executiveSummary": {
    "summary": "<2-3 sentence overview of today's priorities>",
    "keyMetrics": [
      { "metric": "<metric name>", "value": "<value>" }
    ],
    "topPriorities": ["<priority 1>", "<priority 2>", "<priority 3>"]
  },
  "meetingInsights": [
    {
      "meetingId": "<id or title>",
      "title": "<meeting title>",
      "prepNotes": "<key prep notes>",
      "keyPointsToDiscuss": ["<point 1>"],
      "questionsToAsk": ["<question 1>"],
      "potentialOutcomes": ["<outcome 1>"]
    }
  ],
  "intentAnalysis": [
    {
      "contactId": "<contact id>",
      "name": "<name>",
      "intent": "<buying|exploring|passive|at_risk|unknown>",
      "confidence": <0.0-1.0>,
      "signals": ["<signal 1>"],
      "recommendation": "<what AE should do>"
    }
  ],
  "riskAnalysis": [
    {
      "riskId": "<unique id>",
      "severity": "<critical|high|medium|low>",
      "description": "<risk description>",
      "affectedDeal": "<deal name or omit>",
      "mitigationSteps": ["<step 1>"]
    }
  ],
  "recommendedNextSteps": [
    {
      "priority": "<P0|P1|P2|P3|P4>",
      "action": "<specific action>",
      "rationale": "<why>",
      "expectedOutcome": "<outcome>",
      "suggestedTiming": "<timing>"
    }
  ],
  "insights": [
    { "type": "<opportunity|risk|trend|insight>", "text": "<insight text>" }
  ]
}`;
}
