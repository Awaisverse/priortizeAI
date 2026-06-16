import { classifyTask } from '../../../src/prioritization/ruleEngine/taskRules';
import type { EvaluationContext } from '../../../src/prioritization/ruleEngine/index';
import { mockTask } from '../../mocks/unifiedDataMocks';

const ctx: EvaluationContext = { now: new Date(), aeId: 'ae-001' };

const addDays = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

describe('taskRules', () => {
  describe('P0', () => {
    it('classifies overdue task as P0', () => {
      const task = mockTask({ dueDate: addDays(-3), status: 'pending' });
      const result = classifyTask(task, ctx);
      expect(result.priority).toBe('P0');
      expect(result.category).toBe('overdue_task');
      expect(result.risks.length).toBeGreaterThan(0);
    });

    it('classifies task due today as P0', () => {
      const today = new Date();
      today.setHours(23, 59, 0, 0);
      const task = mockTask({ dueDate: today.toISOString(), status: 'pending' });
      const result = classifyTask(task, ctx);
      expect(result.priority).toBe('P0');
      expect(result.category).toBe('due_today');
    });

    it('risk score increases with days overdue', () => {
      const task1 = mockTask({ dueDate: addDays(-1), status: 'pending' });
      const task5 = mockTask({ dueDate: addDays(-5), status: 'pending' });
      const r1 = classifyTask(task1, ctx);
      const r5 = classifyTask(task5, ctx);
      expect(r5.riskScore).toBeGreaterThan(r1.riskScore);
    });
  });

  describe('P1', () => {
    it('classifies task due tomorrow as P1', () => {
      const task = mockTask({ dueDate: addDays(1), status: 'pending' });
      const result = classifyTask(task, ctx);
      expect(result.priority).toBe('P1');
      expect(result.category).toBe('due_tomorrow');
    });

    it('classifies email task due in 2 days as P1', () => {
      const task = mockTask({ dueDate: addDays(2), status: 'pending', taskType: 'email' });
      const result = classifyTask(task, ctx);
      expect(result.priority).toBe('P1');
      expect(result.category).toBe('high_touch_soon');
    });

    it('classifies call task due in 2 days as P1', () => {
      const task = mockTask({ dueDate: addDays(2), status: 'pending', taskType: 'call' });
      const result = classifyTask(task, ctx);
      expect(result.priority).toBe('P1');
    });
  });

  describe('P2', () => {
    it('classifies task due in 3-7 days as P2', () => {
      const task = mockTask({ dueDate: addDays(5), status: 'pending' });
      const result = classifyTask(task, ctx);
      expect(result.priority).toBe('P2');
      expect(result.category).toBe('due_this_week');
    });
  });

  describe('P3', () => {
    it('classifies task due in 8-30 days as P3', () => {
      const task = mockTask({ dueDate: addDays(15), status: 'pending' });
      const result = classifyTask(task, ctx);
      expect(result.priority).toBe('P3');
      expect(result.category).toBe('due_this_month');
    });
  });

  describe('P4', () => {
    it('classifies task due beyond 30 days as P4', () => {
      const task = mockTask({ dueDate: addDays(45), status: 'pending' });
      const result = classifyTask(task, ctx);
      expect(result.priority).toBe('P4');
      expect(result.category).toBe('future_task');
    });

    it('classifies completed task as P4', () => {
      const task = mockTask({ status: 'completed' });
      const result = classifyTask(task, ctx);
      expect(result.priority).toBe('P4');
      expect(result.category).toBe('completed_or_cancelled');
    });

    it('classifies cancelled task as P4', () => {
      const task = mockTask({ status: 'cancelled' });
      const result = classifyTask(task, ctx);
      expect(result.priority).toBe('P4');
    });
  });

  describe('result structure', () => {
    it('always returns all required fields', () => {
      const result = classifyTask(mockTask(), ctx);
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('priorityScore');
      expect(result).toHaveProperty('urgencyScore');
      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('urgency');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('rationale');
      expect(Array.isArray(result.risks)).toBe(true);
      expect(Array.isArray(result.opportunities)).toBe(true);
    });
  });
});
