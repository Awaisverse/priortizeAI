import { PrioritizationService } from '../../../src/prioritization/index';
import { validatePrioritizedActivities } from '../../../src/utils/validators';
import { mockUnifiedDataPackage, mockDeal, mockTask } from '../../mocks/unifiedDataMocks';

const addDays = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

describe('PrioritizationService', () => {
  let service: PrioritizationService;

  beforeEach(() => {
    service = new PrioritizationService();
  });

  it('produces output that passes schema validation', () => {
    const pkg = mockUnifiedDataPackage();
    const result = service.prioritize(pkg);
    const validation = validatePrioritizedActivities(result);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('summary counts match classified array', () => {
    const pkg = mockUnifiedDataPackage();
    const result = service.prioritize(pkg);
    const total = Object.values(result.summary.byPriority).reduce((a, b) => a + b, 0);
    expect(total).toBe(result.summary.totalActivities);
    expect(result.classified.length).toBe(result.summary.totalActivities);
  });

  it('byPriority counts match actual classified items', () => {
    const pkg = mockUnifiedDataPackage();
    const result = service.prioritize(pkg);
    for (const level of ['P0', 'P1', 'P2', 'P3', 'P4'] as const) {
      const count = result.classified.filter((c) => c.priority === level).length;
      expect(result.summary.byPriority[level]).toBe(count);
    }
  });

  it('returns a unique packageId each call', () => {
    const pkg = mockUnifiedDataPackage();
    const r1 = service.prioritize(pkg);
    const r2 = service.prioritize(pkg);
    expect(r1.packageId).not.toBe(r2.packageId);
  });

  it('P0 items appear in recommendedActions', () => {
    const pkg = mockUnifiedDataPackage({
      deals: [mockDeal({ closeDate: addDays(2), status: 'open' })],
      tasks: [mockTask({ dueDate: addDays(-1), status: 'pending' })],
    });
    const result = service.prioritize(pkg);
    expect(result.recommendedActions.length).toBeGreaterThan(0);
  });

  it('executiveSummary topRisks pulled from P0/P1 items', () => {
    const pkg = mockUnifiedDataPackage({
      deals: [mockDeal({ closeDate: addDays(2), status: 'open' })],
    });
    const result = service.prioritize(pkg);
    // P0 deal has risks — they should surface in topRisks
    expect(result.executiveSummary.topRisks.length).toBeGreaterThan(0);
  });

  it('handles empty data package without throwing', () => {
    const pkg = mockUnifiedDataPackage({
      deals: [],
      tasks: [],
      meetings: [],
      contacts: [],
      engagementHistory: [],
      metadata: {
        fetchedAt: new Date().toISOString(),
        sources: ['hubspot', 'google_calendar'],
        recordCount: { deals: 0, tasks: 0, meetings: 0, contacts: 0, engagements: 0 },
        dataQuality: { score: 100, issues: [] },
      },
    });
    const result = service.prioritize(pkg);
    expect(result.summary.totalActivities).toBe(0);
    expect(result.classified).toHaveLength(0);
    const validation = validatePrioritizedActivities(result);
    expect(validation.valid).toBe(true);
  });

  it('throws and re-throws errors (does not swallow them)', () => {
    // Pass null to trigger a runtime error
    expect(() => service.prioritize(null as never)).toThrow();
  });
});
