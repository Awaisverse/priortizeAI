import type { Meeting } from '../../models';
import { buildResult, defaultRuleResult, type EvaluationContext, type RuleResult } from './index';

export function classifyMeeting(meeting: Meeting, ctx: EvaluationContext): RuleResult {
  const start = new Date(meeting.startTime);
  const now = ctx.now;
  const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Past meetings — archive
  if (hoursUntilStart < -1) {
    return defaultRuleResult('past_meeting');
  }

  const isExternal = meeting.isExternalMeeting ?? meeting.attendees.length > 1;
  const type = meeting.type ?? 'other';
  const isHighValueType =
    type === 'closing_call' || type === 'prospect_demo' || type === 'customer_call';

  // P0 — closing call or high-stakes meeting within 4 hours
  if (hoursUntilStart <= 4 && (type === 'closing_call' || isExternal)) {
    return buildResult('P0', {
      urgencyScore: 100,
      riskScore: type === 'closing_call' ? 90 : 60,
      category: type === 'closing_call' ? 'closing_call_imminent' : 'external_meeting_imminent',
      rationale: `"${meeting.title}" starts in ${Math.round(hoursUntilStart * 60)}min`,
      risks: [
        type === 'closing_call'
          ? 'Closing call — must be prepared to close or handle objections'
          : `External meeting in ${Math.round(hoursUntilStart * 60)}min — prep required`,
      ],
      opportunities: [
        type === 'closing_call'
          ? 'Opportunity to close the deal — review proposal and objection handling'
          : 'Build relationship and advance deal during this meeting',
      ],
    });
  }

  // P0 — any external meeting happening today (within 8h) that is high-value type
  if (hoursUntilStart <= 8 && isHighValueType) {
    return buildResult('P0', {
      urgencyScore: 90,
      riskScore: 50,
      category: 'high_value_meeting_today',
      rationale: `"${meeting.title}" (${type}) starts in ${Math.round(hoursUntilStart)}h`,
      risks: ['Insufficient prep could hurt deal outcome'],
      opportunities: ['Well-prepared demos and discovery calls advance deals significantly'],
    });
  }

  // P1 — external meetings within 24 hours
  if (hoursUntilStart <= 24 && isExternal) {
    return buildResult('P1', {
      urgencyScore: 80,
      riskScore: 30,
      category: 'external_meeting_tomorrow',
      rationale: `"${meeting.title}" in ~${Math.round(hoursUntilStart)}h`,
      risks: ['Limited time for meeting prep'],
      opportunities: ['Prepare agenda and key talking points tonight'],
    });
  }

  // P1 — high-value meeting type within 48 hours
  if (hoursUntilStart <= 48 && isHighValueType) {
    return buildResult('P1', {
      urgencyScore: 75,
      riskScore: 25,
      category: 'high_value_meeting_soon',
      rationale: `"${meeting.title}" (${type}) in ~${Math.round(hoursUntilStart)}h`,
      risks: [],
      opportunities: ['Research attendees and prepare compelling talk track'],
    });
  }

  // P2 — any external meeting this week
  if (hoursUntilStart <= 168 && isExternal) {
    return buildResult('P2', {
      urgencyScore: 60,
      riskScore: 15,
      category: 'external_meeting_this_week',
      rationale: `"${meeting.title}" in ~${Math.round(hoursUntilStart / 24)}d`,
      risks: [],
      opportunities: ['Time to research attendees and set a clear agenda'],
    });
  }

  // P3 — internal meetings within a week
  if (!isExternal && hoursUntilStart <= 168) {
    return buildResult('P3', {
      urgencyScore: 30,
      riskScore: 0,
      category: 'internal_meeting',
      rationale: `"${meeting.title}" — internal, ${Math.round(hoursUntilStart / 24)}d away`,
      risks: [],
      opportunities: [],
    });
  }

  // P4 — internal meetings beyond a week, or distant future external meetings
  return buildResult('P4', {
    urgencyScore: 20,
    riskScore: 0,
    category: hoursUntilStart > 168 && !isExternal ? 'future_internal_meeting' : 'future_meeting',
    rationale: `"${meeting.title}" is ${Math.round(hoursUntilStart / 24)}d away`,
    risks: [],
    opportunities: [],
  });
}
