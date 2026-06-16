/**
 * Integration test: Phase 1 output → Phase 2 input
 * Uses real Phase 1 mock data (no external APIs) and validates the full
 * Phase 1 → Phase 2 pipeline boundary.
 */
import { DataAggregator } from '../../src/data-collection/aggregator';
import { PrioritizationService } from '../../src/prioritization/index';
import { validateUnifiedDataPackage, validatePrioritizedActivities } from '../../src/utils/validators';
import { mockDeal, mockTask, mockMeeting, mockContact, mockEngagement } from '../mocks/unifiedDataMocks';

const addDays = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

describe('Phase 1 → Phase 2 integration', () => {
  let aggregator: DataAggregator;
  let prioritizer: PrioritizationService;

  beforeAll(() => {
    aggregator = new DataAggregator();
    prioritizer = new PrioritizationService();
  });

  it('Phase 1 output passes schema validation before entering Phase 2', () => {
    const pkg = aggregator.aggregate({
      aeId: 'ae-001',
      deals: [mockDeal()],
      tasks: [mockTask()],
      meetings: [mockMeeting()],
      contacts: [mockContact()],
      engagements: [mockEngagement()],
    });
    const validation = validateUnifiedDataPackage(pkg);
    expect(validation.valid).toBe(true);
  });

  it('Phase 2 output passes schema validation', () => {
    const pkg = aggregator.aggregate({
      aeId: 'ae-001',
      deals: [mockDeal()],
      tasks: [mockTask()],
      meetings: [mockMeeting()],
      contacts: [mockContact()],
      engagements: [mockEngagement()],
    });
    const prioritized = prioritizer.prioritize(pkg);
    const validation = validatePrioritizedActivities(prioritized);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('critical scenarios correctly surface as P0', () => {
    const pkg = aggregator.aggregate({
      aeId: 'ae-001',
      deals: [mockDeal({ closeDate: addDays(1), status: 'open', amount: 100000 })],
      tasks: [mockTask({ dueDate: addDays(-2), status: 'pending' })],
      meetings: [],
      contacts: [mockContact()],
      engagements: [],
    });
    const prioritized = prioritizer.prioritize(pkg);
    expect(prioritized.summary.byPriority.P0).toBeGreaterThan(0);
  });

  it('aeId propagates from Phase 1 through Phase 2', () => {
    const aeId = 'ae-integration-test';
    const pkg = aggregator.aggregate({
      aeId,
      deals: [mockDeal()],
      tasks: [],
      meetings: [],
      contacts: [],
      engagements: [],
    });
    expect(pkg.aeId).toBe(aeId);
    const prioritized = prioritizer.prioritize(pkg);
    expect(prioritized.classified.length).toBeGreaterThan(0);
  });

  it('full realistic AE scenario produces valid, non-empty output', () => {
    const lastActivity = new Date();
    lastActivity.setDate(lastActivity.getDate() - 10);

    const pkg = aggregator.aggregate({
      aeId: 'ae-001',
      deals: [
        mockDeal({ id: 'd1', closeDate: addDays(3), status: 'open', amount: 120000 }),
        mockDeal({ id: 'd2', hubspotId: 'hs2', closeDate: addDays(20), status: 'open', amount: 50000 }),
        mockDeal({ id: 'd3', hubspotId: 'hs3', closeDate: addDays(60), status: 'open', amount: 30000 }),
        mockDeal({ id: 'd4', hubspotId: 'hs4', closeDate: addDays(-5), status: 'stalled', amount: 80000, lastActivity: lastActivity.toISOString() }),
      ],
      tasks: [
        mockTask({ id: 't1', dueDate: addDays(-1), status: 'pending' }),
        mockTask({ id: 't2', hubspotId: 'hs-t2', dueDate: addDays(1), status: 'pending' }),
      ],
      meetings: [mockMeeting()],
      contacts: [
        mockContact({ id: 'c1', dealIds: ['d1'] }),
        mockContact({ id: 'c2', hubspotId: 'hs-c2', email: 'c2@acme.com', dealIds: ['d2'], engagementScore: 25, engagementTrend: 'decreasing' }),
      ],
      engagements: [mockEngagement()],
    });

    const result = prioritizer.prioritize(pkg);

    expect(result.classified.length).toBeGreaterThan(0);
    expect(result.summary.totalActivities).toBe(result.classified.length);
    expect(result.summary.byPriority.P0).toBeGreaterThan(0);
    expect(validatePrioritizedActivities(result).valid).toBe(true);
  });
});
