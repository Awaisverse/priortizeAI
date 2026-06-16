import type {
  UnifiedDataPackage,
  ClassifiedActivity,
  Action,
  PriorityLevel,
} from '../models';
import { generateId, nowISO } from '../utils/helpers';
import { classifyDeal } from './ruleEngine/dealRules';
import { classifyTask } from './ruleEngine/taskRules';
import { classifyMeeting } from './ruleEngine/meetingRules';
import { classifyContact } from './ruleEngine/contactRules';
import type { EvaluationContext } from './ruleEngine/index';

function buildActions(
  type: ClassifiedActivity['type'],
  _sourceId: string,
  priority: PriorityLevel,
  risks: string[],
  opportunities: string[],
): Action[] {
  const actions: Action[] = [];

  if (priority === 'P0' || priority === 'P1') {
    if (type === 'deal') {
      actions.push({
        id: generateId(),
        title: 'Review deal status and prepare outreach',
        description: 'Check CRM notes, review last interactions, and prepare targeted message',
        actionType: 'internal_action',
        suggestedTiming: priority === 'P0' ? 'immediate' : 'today',
        expectedOutcome: 'Clear next step defined and stakeholder contacted',
      });
    }
    if (type === 'task') {
      actions.push({
        id: generateId(),
        title: 'Complete or escalate task',
        description: risks[0] ?? 'Task requires immediate attention',
        actionType: 'task',
        suggestedTiming: priority === 'P0' ? 'immediate' : 'today',
        expectedOutcome: 'Task resolved and recorded in CRM',
      });
    }
    if (type === 'meeting') {
      actions.push({
        id: generateId(),
        title: 'Prepare for meeting',
        description: 'Review deal context, prepare agenda and key talking points',
        actionType: 'internal_action',
        suggestedTiming: priority === 'P0' ? 'immediate' : 'today',
        expectedOutcome: 'Confident entry into meeting with clear objectives',
      });
    }
    if (type === 'contact') {
      actions.push({
        id: generateId(),
        title: 'Reach out to contact',
        description: risks[0] ?? 'Re-engage contact to maintain deal momentum',
        actionType: 'email',
        suggestedTiming: priority === 'P0' ? 'immediate' : 'today',
        expectedOutcome: 'Contact re-engaged and deal unblocked',
      });
    }
  }

  if (opportunities.length > 0 && (priority === 'P1' || priority === 'P2')) {
    actions.push({
      id: generateId(),
      title: 'Capitalize on opportunity',
      description: opportunities[0],
      actionType: 'internal_action',
      suggestedTiming: priority === 'P1' ? 'within_24h' : 'this_week',
      expectedOutcome: 'Opportunity captured and progressed',
    });
  }

  return actions;
}

export function classifyActivities(pkg: UnifiedDataPackage): ClassifiedActivity[] {
  const ctx: EvaluationContext = { now: new Date(), aeId: pkg.aeId };
  const classified: ClassifiedActivity[] = [];

  for (const deal of pkg.deals) {
    const result = classifyDeal(deal, ctx);
    classified.push({
      id: generateId(),
      type: 'deal',
      sourceId: deal.id,
      priority: result.priority,
      urgency: result.urgency,
      category: result.category,
      rationale: result.rationale,
      risks: result.risks,
      opportunities: result.opportunities,
      recommendedActions: buildActions(
        'deal',
        deal.id,
        result.priority,
        result.risks,
        result.opportunities,
      ),
      scores: {
        priorityScore: result.priorityScore,
        urgencyScore: result.urgencyScore,
        riskScore: result.riskScore,
      },
      classified_at: nowISO(),
    });
  }

  for (const task of pkg.tasks) {
    const result = classifyTask(task, ctx);
    classified.push({
      id: generateId(),
      type: 'task',
      sourceId: task.id,
      priority: result.priority,
      urgency: result.urgency,
      category: result.category,
      rationale: result.rationale,
      risks: result.risks,
      opportunities: result.opportunities,
      recommendedActions: buildActions(
        'task',
        task.id,
        result.priority,
        result.risks,
        result.opportunities,
      ),
      scores: {
        priorityScore: result.priorityScore,
        urgencyScore: result.urgencyScore,
        riskScore: result.riskScore,
      },
      classified_at: nowISO(),
    });
  }

  for (const meeting of pkg.meetings) {
    const result = classifyMeeting(meeting, ctx);
    classified.push({
      id: generateId(),
      type: 'meeting',
      sourceId: meeting.id,
      priority: result.priority,
      urgency: result.urgency,
      category: result.category,
      rationale: result.rationale,
      risks: result.risks,
      opportunities: result.opportunities,
      recommendedActions: buildActions(
        'meeting',
        meeting.id,
        result.priority,
        result.risks,
        result.opportunities,
      ),
      scores: {
        priorityScore: result.priorityScore,
        urgencyScore: result.urgencyScore,
        riskScore: result.riskScore,
      },
      classified_at: nowISO(),
    });
  }

  for (const contact of pkg.contacts) {
    const result = classifyContact(contact, pkg.deals, ctx);
    classified.push({
      id: generateId(),
      type: 'contact',
      sourceId: contact.id,
      priority: result.priority,
      urgency: result.urgency,
      category: result.category,
      rationale: result.rationale,
      risks: result.risks,
      opportunities: result.opportunities,
      recommendedActions: buildActions(
        'contact',
        contact.id,
        result.priority,
        result.risks,
        result.opportunities,
      ),
      scores: {
        priorityScore: result.priorityScore,
        urgencyScore: result.urgencyScore,
        riskScore: result.riskScore,
      },
      classified_at: nowISO(),
    });
  }

  // Sort by priorityScore desc, then urgencyScore desc
  return classified.sort((a, b) => {
    const scoreDiff = b.scores.priorityScore - a.scores.priorityScore;
    return scoreDiff !== 0 ? scoreDiff : b.scores.urgencyScore - a.scores.urgencyScore;
  });
}
