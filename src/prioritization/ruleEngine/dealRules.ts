import type { Deal } from '../../models';
import { daysFromNow, daysSince } from '../../utils/helpers';
import { buildResult, defaultRuleResult, type EvaluationContext, type RuleResult } from './index';

export function classifyDeal(deal: Deal, _ctx: EvaluationContext): RuleResult {
  const daysToClose = daysFromNow(deal.closeDate);
  const daysSinceActivity = daysSince(deal.lastActivity);
  const prob = deal.closeProbability ?? 50;

  // P0 — closes within 7 days OR critical stall on high-value deal
  if (
    (daysToClose >= 0 && daysToClose <= 7 && deal.status === 'open') ||
    (deal.status === 'stalled' && deal.amount >= 50000 && daysSinceActivity >= 14)
  ) {
    const risks: string[] = [];
    const opportunities: string[] = [];

    if (daysToClose >= 0 && daysToClose <= 7) {
      risks.push(`Deal closes in ${daysToClose} day(s) — requires immediate action`);
      opportunities.push('Final push to close can win the deal this week');
    }
    if (deal.status === 'stalled') {
      risks.push(`Deal stalled for ${daysSinceActivity} days — at risk of going cold`);
      opportunities.push('Re-engagement now can recover a high-value stalled deal');
    }
    if (deal.closingRisk === 'high') risks.push('High closing risk flagged in CRM');

    return buildResult('P0', {
      urgencyScore: 100,
      riskScore: 90,
      category: 'critical_close',
      rationale: `${deal.name}: closes in ${daysToClose}d, amount $${deal.amount.toLocaleString()}`,
      risks,
      opportunities,
    });
  }

  // P1 — closes within 8–30 days with decent probability
  if (daysToClose > 7 && daysToClose <= 30 && deal.status === 'open' && prob >= 30) {
    return buildResult('P1', {
      urgencyScore: 80,
      riskScore: deal.closingRisk === 'high' ? 70 : 40,
      category: 'near_close',
      rationale: `${deal.name}: closes in ${daysToClose}d (${prob}% prob), $${deal.amount.toLocaleString()}`,
      risks:
        deal.closingRisk === 'high'
          ? ['High closing risk — competitor or champion risk']
          : daysSinceActivity > 7
            ? [`No activity for ${daysSinceActivity} days`]
            : [],
      opportunities: ['Advance deal to next stage before month-end'],
    });
  }

  // P1 — needs_review status (CRM flagged for attention)
  if (deal.status === 'needs_review') {
    return buildResult('P1', {
      urgencyScore: 75,
      riskScore: 60,
      category: 'needs_review',
      rationale: `${deal.name}: flagged for review in CRM`,
      risks: ['CRM marked this deal as needing review'],
      opportunities: ['Resolving the flag can unblock the deal from the pipeline'],
    });
  }

  // P2 — closes in 31–90 days with engagement gaps
  if (daysToClose > 30 && daysToClose <= 90 && deal.status === 'open') {
    const hasGap = daysSinceActivity >= 10;
    return buildResult('P2', {
      urgencyScore: 60,
      riskScore: hasGap ? 50 : 20,
      category: 'pipeline_active',
      rationale: `${deal.name}: closes in ${daysToClose}d, $${deal.amount.toLocaleString()}`,
      risks: hasGap ? [`No activity in ${daysSinceActivity} days — risk of going cold`] : [],
      opportunities: ['Proactive outreach can accelerate deal progression'],
    });
  }

  // P3 — closes beyond 90 days OR low-probability open deal
  if (deal.status === 'open') {
    return buildResult('P3', {
      urgencyScore: 40,
      riskScore: 15,
      category: 'pipeline_future',
      rationale: `${deal.name}: closes in ${daysToClose}d — low urgency`,
      risks: [],
      opportunities: ['Early relationship building strengthens future close chances'],
    });
  }

  // P4 — won/lost/stalled low-value
  return defaultRuleResult('closed_or_inactive');
}
