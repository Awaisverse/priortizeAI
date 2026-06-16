import type { Task } from '../../models';
import { daysFromNow } from '../../utils/helpers';
import { buildResult, defaultRuleResult, type EvaluationContext, type RuleResult } from './index';

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function classifyTask(task: Task, _ctx: EvaluationContext): RuleResult {
  if (task.status === 'completed' || task.status === 'cancelled') {
    return defaultRuleResult('completed_or_cancelled');
  }

  const dueDate = new Date(task.dueDate);
  const now = new Date();
  const daysUntilDue = daysFromNow(task.dueDate);
  const isOverdue = dueDate < now && !isSameCalendarDay(dueDate, now);
  const isDueToday = isSameCalendarDay(dueDate, now);
  const daysOverdue = isOverdue ? Math.abs(daysUntilDue) : 0;

  // P0 — overdue or due today
  if (isOverdue || isDueToday) {
    return buildResult('P0', {
      urgencyScore: 100,
      riskScore: isOverdue ? Math.min(90, 60 + daysOverdue * 5) : 70,
      category: isOverdue ? 'overdue_task' : 'due_today',
      rationale: isOverdue
        ? `"${task.title}" is ${daysOverdue} day(s) overdue`
        : `"${task.title}" is due today`,
      risks: [
        isOverdue
          ? `Task overdue by ${daysOverdue} day(s) — contact relationship at risk`
          : 'Task due today — must act before EOD',
      ],
      opportunities: ['Completing this task today keeps the deal moving forward'],
    });
  }

  // P1 — due tomorrow
  if (daysUntilDue === 1) {
    return buildResult('P1', {
      urgencyScore: 80,
      riskScore: 40,
      category: 'due_tomorrow',
      rationale: `"${task.title}" is due tomorrow`,
      risks: ['Missing this deadline risks deal momentum'],
      opportunities: ['Completing early shows reliability to stakeholders'],
    });
  }

  // P1 — call/email type due in 2 days (high-touch)
  if (daysUntilDue <= 2 && (task.taskType === 'call' || task.taskType === 'email')) {
    return buildResult('P1', {
      urgencyScore: 75,
      riskScore: 35,
      category: 'high_touch_soon',
      rationale: `"${task.title}" (${task.taskType}) due in ${daysUntilDue} day(s)`,
      risks: ['High-touch outreach delayed risks losing contact engagement'],
      opportunities: ['Early outreach can accelerate deal progression'],
    });
  }

  // P2 — due within 3–7 days
  if (daysUntilDue <= 7) {
    return buildResult('P2', {
      urgencyScore: 60,
      riskScore: 20,
      category: 'due_this_week',
      rationale: `"${task.title}" due in ${daysUntilDue} day(s)`,
      risks: [],
      opportunities: ['Completing ahead of schedule builds trust with contacts'],
    });
  }

  // P3 — due within 8–30 days
  if (daysUntilDue <= 30) {
    return buildResult('P3', {
      urgencyScore: 40,
      riskScore: 10,
      category: 'due_this_month',
      rationale: `"${task.title}" due in ${daysUntilDue} day(s)`,
      risks: [],
      opportunities: [],
    });
  }

  // P4 — due beyond 30 days
  return buildResult('P4', {
    urgencyScore: 20,
    riskScore: 5,
    category: 'future_task',
    rationale: `"${task.title}" due in ${daysUntilDue} day(s) — low urgency`,
    risks: [],
    opportunities: [],
  });
}
