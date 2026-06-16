import { classifyActivities } from '../../../src/prioritization/classifier';
import { mockUnifiedDataPackage, mockDeal } from '../../mocks/unifiedDataMocks';

const addDays = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

describe('classifyActivities', () => {
  it('returns a ClassifiedActivity for every entity in the package', () => {
    const pkg = mockUnifiedDataPackage();
    const classified = classifyActivities(pkg);
    // 1 deal + 1 task + 1 meeting + 1 contact = 4
    expect(classified.length).toBe(4);
  });

  it('returns empty array for empty package', () => {
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
    const classified = classifyActivities(pkg);
    expect(classified.length).toBe(0);
  });

  it('sorts results by priorityScore descending', () => {
    const pkg = mockUnifiedDataPackage({
      deals: [
        mockDeal({ closeDate: addDays(120), status: 'open' }),  // P3
        mockDeal({ id: 'deal-002', hubspotId: 'hs-002', closeDate: addDays(3), status: 'open' }), // P0
      ],
      tasks: [],
      meetings: [],
      contacts: [],
      engagementHistory: [],
      metadata: {
        fetchedAt: new Date().toISOString(),
        sources: ['hubspot'],
        recordCount: { deals: 2, tasks: 0, meetings: 0, contacts: 0, engagements: 0 },
        dataQuality: { score: 100, issues: [] },
      },
    });
    const classified = classifyActivities(pkg);
    expect(classified[0].scores.priorityScore).toBeGreaterThanOrEqual(classified[1].scores.priorityScore);
  });

  it('assigns correct type labels to each entity', () => {
    const pkg = mockUnifiedDataPackage();
    const classified = classifyActivities(pkg);
    const types = classified.map((c) => c.type);
    expect(types).toContain('deal');
    expect(types).toContain('task');
    expect(types).toContain('meeting');
    expect(types).toContain('contact');
  });

  it('every classified item has a sourceId matching an entity id', () => {
    const pkg = mockUnifiedDataPackage();
    const classified = classifyActivities(pkg);
    const allIds = new Set([
      ...pkg.deals.map((d) => d.id),
      ...pkg.tasks.map((t) => t.id),
      ...pkg.meetings.map((m) => m.id),
      ...pkg.contacts.map((c) => c.id),
    ]);
    for (const item of classified) {
      expect(allIds.has(item.sourceId)).toBe(true);
    }
  });

  it('all classified items have valid scores in [0, 100]', () => {
    const pkg = mockUnifiedDataPackage();
    const classified = classifyActivities(pkg);
    for (const item of classified) {
      expect(item.scores.priorityScore).toBeGreaterThanOrEqual(0);
      expect(item.scores.priorityScore).toBeLessThanOrEqual(100);
      expect(item.scores.urgencyScore).toBeGreaterThanOrEqual(0);
      expect(item.scores.urgencyScore).toBeLessThanOrEqual(100);
      expect(item.scores.riskScore).toBeGreaterThanOrEqual(0);
      expect(item.scores.riskScore).toBeLessThanOrEqual(100);
    }
  });

  it('P0 deals have immediate urgency', () => {
    const pkg = mockUnifiedDataPackage({
      deals: [mockDeal({ closeDate: addDays(2), status: 'open' })],
      tasks: [],
      meetings: [],
      contacts: [],
      engagementHistory: [],
      metadata: {
        fetchedAt: new Date().toISOString(),
        sources: ['hubspot'],
        recordCount: { deals: 1, tasks: 0, meetings: 0, contacts: 0, engagements: 0 },
        dataQuality: { score: 100, issues: [] },
      },
    });
    const classified = classifyActivities(pkg);
    const dealItem = classified.find((c) => c.type === 'deal');
    expect(dealItem?.priority).toBe('P0');
    expect(dealItem?.urgency).toBe('immediate');
  });
});
