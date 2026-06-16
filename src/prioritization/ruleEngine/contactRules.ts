import type { Contact, Deal } from '../../models';
import { daysSince } from '../../utils/helpers';
import { buildResult, defaultRuleResult, type EvaluationContext, type RuleResult } from './index';

export function classifyContact(
  contact: Contact,
  deals: Deal[],
  _ctx: EvaluationContext,
): RuleResult {
  const contactDeals = deals.filter((d) => d.contacts.includes(contact.id));
  const openDeals = contactDeals.filter((d) => d.status === 'open' || d.status === 'needs_review');
  const criticalDeals = openDeals.filter((d) => {
    const days = (new Date(d.closeDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 30;
  });
  const daysSinceInteraction = daysSince(contact.lastInteraction);
  const score = contact.engagementScore;

  // P0 — key contact on a critical/closing deal going silent
  if (criticalDeals.length > 0 && daysSinceInteraction >= 7) {
    return buildResult('P0', {
      urgencyScore: 95,
      riskScore: 85,
      category: 'critical_contact_silent',
      rationale: `${contact.name} (${contact.company}): no contact in ${daysSinceInteraction}d, has ${criticalDeals.length} deal(s) closing soon`,
      risks: [
        `${daysSinceInteraction} days since last interaction — deal at risk`,
        criticalDeals.map((d) => `"${d.name}" closes soon`).join('; '),
      ],
      opportunities: ['Immediate outreach can revive interest and secure close'],
    });
  }

  // P1 — active deal contact with dropping engagement
  if (
    openDeals.length > 0 &&
    (score < 40 || contact.engagementTrend === 'decreasing' || daysSinceInteraction >= 5)
  ) {
    return buildResult('P1', {
      urgencyScore: 80,
      riskScore: 55,
      category: 'at_risk_contact',
      rationale: `${contact.name}: engagement score ${score}, last contact ${daysSinceInteraction}d ago`,
      risks: [
        contact.engagementTrend === 'decreasing'
          ? 'Engagement trending downward — needs re-engagement'
          : `No contact in ${daysSinceInteraction} days`,
      ],
      opportunities: ['Re-engaging this contact can unlock stuck deals'],
    });
  }

  // P1 — high-value contact on active deals
  if (openDeals.length > 0 && score >= 70 && contact.engagementTrend !== 'decreasing') {
    return buildResult('P1', {
      urgencyScore: 70,
      riskScore: 20,
      category: 'champion_contact',
      rationale: `${contact.name}: strong champion, score ${score}, ${openDeals.length} open deal(s)`,
      risks: [],
      opportunities: [
        'Leverage high engagement to expand deal scope or accelerate close',
        'Consider requesting referral or additional stakeholder introductions',
      ],
    });
  }

  // P2 — active deal contact, normal engagement
  if (openDeals.length > 0) {
    return buildResult('P2', {
      urgencyScore: 60,
      riskScore: 20,
      category: 'active_deal_contact',
      rationale: `${contact.name}: ${openDeals.length} open deal(s), score ${score}`,
      risks: [],
      opportunities: ['Maintain regular cadence to keep deal progressing'],
    });
  }

  // P3 — no active deals but recently engaged
  if (daysSinceInteraction <= 30 && score >= 30) {
    return buildResult('P3', {
      urgencyScore: 35,
      riskScore: 10,
      category: 'warm_contact',
      rationale: `${contact.name}: no active deals, last contact ${daysSinceInteraction}d ago`,
      risks: [],
      opportunities: ['Warm contact — good time to introduce new opportunities'],
    });
  }

  // P4 — cold or no-deal contact
  return defaultRuleResult('cold_contact');
}
