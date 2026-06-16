import type { PriorityLevel } from '../../models';

export interface EvaluationContext {
  now: Date;
  aeId: string;
}

export interface RuleResult {
  priority: PriorityLevel;
  priorityScore: number;
  urgencyScore: number;
  riskScore: number;
  urgency: 'immediate' | 'today' | 'this_week' | 'later';
  category: string;
  rationale: string;
  risks: string[];
  opportunities: string[];
}

export const PRIORITY_SCORES: Record<PriorityLevel, number> = {
  P0: 100,
  P1: 80,
  P2: 60,
  P3: 40,
  P4: 20,
};

export const URGENCY_MAP: Record<PriorityLevel, RuleResult['urgency']> = {
  P0: 'immediate',
  P1: 'today',
  P2: 'this_week',
  P3: 'later',
  P4: 'later',
};

export function defaultRuleResult(category = 'archived'): RuleResult {
  return {
    priority: 'P4',
    priorityScore: PRIORITY_SCORES.P4,
    urgencyScore: 10,
    riskScore: 0,
    urgency: 'later',
    category,
    rationale: 'No active priority rules matched — item is archived or complete',
    risks: [],
    opportunities: [],
  };
}

export function buildResult(
  priority: PriorityLevel,
  opts: Omit<RuleResult, 'priority' | 'priorityScore' | 'urgency'>,
): RuleResult {
  return {
    priority,
    priorityScore: PRIORITY_SCORES[priority],
    urgency: URGENCY_MAP[priority],
    ...opts,
  };
}
