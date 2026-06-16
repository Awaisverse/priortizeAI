import { classifyDeal } from '../../../src/prioritization/ruleEngine/dealRules';
import type { EvaluationContext } from '../../../src/prioritization/ruleEngine/index';
import { mockDeal } from '../../mocks/unifiedDataMocks';

const ctx: EvaluationContext = { now: new Date(), aeId: 'ae-001' };

const addDays = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

describe('dealRules', () => {
  describe('P0', () => {
    it('classifies deal closing within 7 days as P0', () => {
      const deal = mockDeal({ closeDate: addDays(3), status: 'open' });
      const result = classifyDeal(deal, ctx);
      expect(result.priority).toBe('P0');
      expect(result.urgency).toBe('immediate');
      expect(result.category).toBe('critical_close');
      expect(result.risks.length).toBeGreaterThan(0);
    });

    it('classifies deal closing today as P0', () => {
      const deal = mockDeal({ closeDate: addDays(0), status: 'open' });
      const result = classifyDeal(deal, ctx);
      expect(result.priority).toBe('P0');
    });

    it('classifies high-value stalled deal (≥$50k, inactive 14d) as P0', () => {
      const lastActivity = new Date();
      lastActivity.setDate(lastActivity.getDate() - 15);
      const deal = mockDeal({
        status: 'stalled',
        amount: 60000,
        lastActivity: lastActivity.toISOString(),
        closeDate: addDays(30),
      });
      const result = classifyDeal(deal, ctx);
      expect(result.priority).toBe('P0');
    });

    it('does NOT classify stalled low-value deal as P0', () => {
      const lastActivity = new Date();
      lastActivity.setDate(lastActivity.getDate() - 15);
      const deal = mockDeal({
        status: 'stalled',
        amount: 10000,
        lastActivity: lastActivity.toISOString(),
        closeDate: addDays(30),
      });
      const result = classifyDeal(deal, ctx);
      expect(result.priority).not.toBe('P0');
    });
  });

  describe('P1', () => {
    it('classifies deal closing in 8-30 days with 30%+ probability as P1', () => {
      const deal = mockDeal({ closeDate: addDays(15), status: 'open', closeProbability: 50 });
      const result = classifyDeal(deal, ctx);
      expect(result.priority).toBe('P1');
      expect(result.category).toBe('near_close');
    });

    it('classifies needs_review deal as P1', () => {
      const deal = mockDeal({ status: 'needs_review' });
      const result = classifyDeal(deal, ctx);
      expect(result.priority).toBe('P1');
      expect(result.category).toBe('needs_review');
    });

    it('does NOT classify low-probability (< 30%) near-close deal as P1', () => {
      const deal = mockDeal({ closeDate: addDays(15), status: 'open', closeProbability: 20 });
      const result = classifyDeal(deal, ctx);
      expect(result.priority).not.toBe('P1');
    });

    it('includes high-risk flag in risks when closingRisk is high', () => {
      const deal = mockDeal({ closeDate: addDays(15), status: 'open', closingRisk: 'high' });
      const result = classifyDeal(deal, ctx);
      expect(result.risks.some((r) => r.toLowerCase().includes('risk'))).toBe(true);
    });
  });

  describe('P2', () => {
    it('classifies deal closing in 31-90 days as P2', () => {
      const deal = mockDeal({ closeDate: addDays(45), status: 'open' });
      const result = classifyDeal(deal, ctx);
      expect(result.priority).toBe('P2');
      expect(result.category).toBe('pipeline_active');
    });

    it('includes engagement gap risk when inactive ≥10 days', () => {
      const lastActivity = new Date();
      lastActivity.setDate(lastActivity.getDate() - 12);
      const deal = mockDeal({
        closeDate: addDays(45),
        status: 'open',
        lastActivity: lastActivity.toISOString(),
      });
      const result = classifyDeal(deal, ctx);
      expect(result.priority).toBe('P2');
      expect(result.risks.length).toBeGreaterThan(0);
    });
  });

  describe('P3', () => {
    it('classifies deal closing beyond 90 days as P3', () => {
      const deal = mockDeal({ closeDate: addDays(120), status: 'open' });
      const result = classifyDeal(deal, ctx);
      expect(result.priority).toBe('P3');
      expect(result.category).toBe('pipeline_future');
    });
  });

  describe('P4', () => {
    it('classifies won deal as P4', () => {
      const deal = mockDeal({ status: 'won' });
      const result = classifyDeal(deal, ctx);
      expect(result.priority).toBe('P4');
    });

    it('classifies lost deal as P4', () => {
      const deal = mockDeal({ status: 'lost' });
      const result = classifyDeal(deal, ctx);
      expect(result.priority).toBe('P4');
    });
  });

  describe('result structure', () => {
    it('always returns all required fields', () => {
      const deal = mockDeal();
      const result = classifyDeal(deal, ctx);
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
