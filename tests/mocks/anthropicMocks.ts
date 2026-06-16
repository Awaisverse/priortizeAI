import type { IntelligenceBlocks } from '../../src/models';

export const mockIntelligenceBlocksResponse: Omit<IntelligenceBlocks, 'timestamp' | 'packageId' | 'model'> = {
  executiveSummary: {
    summary: 'Three deals require immediate attention today. Acme Corp closes in 2 days and needs a final proposal review.',
    keyMetrics: [
      { metric: 'Open Deals', value: '4' },
      { metric: 'Total Pipeline', value: '$275,000' },
      { metric: 'P0 Items', value: '2' },
    ],
    topPriorities: [
      'Close Acme Corp deal before Friday',
      'Follow up with John Buyer — silent for 8 days',
      'Prepare demo for tomorrow\'s prospect call',
    ],
  },
  meetingInsights: [
    {
      meetingId: 'meeting-001',
      title: 'Demo Call with Acme',
      prepNotes: 'Acme has been evaluating for 3 weeks. Focus on ROI and integration story.',
      keyPointsToDiscuss: ['ROI calculation', 'Implementation timeline', 'Security compliance'],
      questionsToAsk: ['What is your decision timeline?', 'Who else is involved in the decision?'],
      potentialOutcomes: ['Move to contract stage', 'Request for additional demo'],
    },
  ],
  intentAnalysis: [
    {
      contactId: 'contact-001',
      name: 'John Buyer',
      intent: 'buying',
      confidence: 0.78,
      signals: ['Attended 3 demos', 'Requested pricing twice', 'Introduced legal team'],
      recommendation: 'Send final proposal with implementation timeline and ROI calculator.',
    },
  ],
  riskAnalysis: [
    {
      riskId: 'risk-001',
      severity: 'critical',
      description: 'Acme Corp deal closes in 2 days with no response to last email.',
      affectedDeal: 'Acme Corp Enterprise',
      mitigationSteps: ['Call John Buyer directly today', 'Offer expedited onboarding', 'Loop in executive sponsor'],
    },
  ],
  recommendedNextSteps: [
    {
      priority: 'P0',
      action: 'Call John Buyer at Acme Corp',
      rationale: 'Deal closes in 2 days and email has gone unanswered for 3 days',
      expectedOutcome: 'Re-engage buyer and confirm closing timeline',
      suggestedTiming: 'Before 11am today',
    },
  ],
  insights: [
    { type: 'risk', text: 'Two deals going dark within close window — proactive outreach needed.' },
    { type: 'opportunity', text: 'Beta Corp is showing high engagement — potential upsell opportunity.' },
  ],
};

export const mockClaudeResponseJson = JSON.stringify(mockIntelligenceBlocksResponse);
