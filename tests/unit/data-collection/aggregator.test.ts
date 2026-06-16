import { DataAggregator } from '../../../src/data-collection/aggregator';
import { validateUnifiedDataPackage } from '../../../src/utils/validators';
import {
  makeDeal,
  makeTask,
  makeContact,
  makeEngagementRecord,
  makeMeeting,
} from '../../../src/utils/mockDataGenerator';

describe('DataAggregator', () => {
  let aggregator: DataAggregator;

  beforeEach(() => {
    aggregator = new DataAggregator();
  });

  const makeInput = (overrides = {}) => ({
    aeId: 'ae-001',
    deals: [],
    tasks: [],
    meetings: [],
    contacts: [],
    engagements: [],
    ...overrides,
  });

  describe('aggregate()', () => {
    it('returns a valid UnifiedDataPackage with empty arrays', () => {
      const pkg = aggregator.aggregate(makeInput());
      const validation = validateUnifiedDataPackage(pkg);
      expect(validation.valid).toBe(true);
      expect(pkg.deals).toEqual([]);
      expect(pkg.tasks).toEqual([]);
      expect(pkg.meetings).toEqual([]);
    });

    it('sets aeId correctly', () => {
      const pkg = aggregator.aggregate(makeInput({ aeId: 'ae-test-123' }));
      expect(pkg.aeId).toBe('ae-test-123');
    });

    it('generates a unique aggregatedId', () => {
      const pkg1 = aggregator.aggregate(makeInput());
      const pkg2 = aggregator.aggregate(makeInput());
      expect(pkg1.aggregatedId).not.toBe(pkg2.aggregatedId);
    });

    it('sets metadata.sources to hubspot and google_calendar', () => {
      const pkg = aggregator.aggregate(makeInput());
      expect(pkg.metadata.sources).toContain('hubspot');
      expect(pkg.metadata.sources).toContain('google_calendar');
    });

    it('sets accurate record counts in metadata', () => {
      const deals = [makeDeal(), makeDeal()];
      const tasks = [makeTask()];
      const meetings = [makeMeeting()];
      const contacts = [makeContact(), makeContact()];
      const engagements = [makeEngagementRecord()];

      const pkg = aggregator.aggregate(makeInput({ deals, tasks, meetings, contacts, engagements }));

      expect(pkg.metadata.recordCount.deals).toBe(2);
      expect(pkg.metadata.recordCount.tasks).toBe(1);
      expect(pkg.metadata.recordCount.meetings).toBe(1);
      expect(pkg.metadata.recordCount.contacts).toBe(2);
      expect(pkg.metadata.recordCount.engagements).toBe(1);
    });

    it('passes validation with realistic data', () => {
      const deal = makeDeal({ ownerId: 'ae-001' });
      const contact = makeContact({ dealIds: [] });
      const task = makeTask({ ownerId: 'ae-001', dealId: deal.id });
      const engagement = makeEngagementRecord({
        contactId: contact.id,
        dealId: deal.id,
        ownerId: 'ae-001',
      });
      const meeting = makeMeeting({
        attendees: [{ email: contact.email, status: 'accepted' }],
      });

      const pkg = aggregator.aggregate(
        makeInput({ deals: [deal], tasks: [task], meetings: [meeting], contacts: [contact], engagements: [engagement] }),
      );

      const validation = validateUnifiedDataPackage(pkg);
      expect(validation.valid).toBe(true);
    });

    it('cross-references meetings to contacts by email', () => {
      const contact = makeContact({ email: 'customer@acme.com' });
      const meeting = makeMeeting({
        attendees: [
          { email: 'customer@acme.com', status: 'accepted' },
          { email: 'ae@company.com', status: 'accepted' },
        ],
        contactIds: [],
      });

      const pkg = aggregator.aggregate(makeInput({ contacts: [contact], meetings: [meeting] }));

      const resultMeeting = pkg.meetings[0];
      expect(resultMeeting).toBeDefined();
      expect(resultMeeting!.contactIds).toContain(contact.id);
    });

    it('does not duplicate contact in meeting contactIds', () => {
      const contact = makeContact({ email: 'customer@acme.com' });
      const meeting = makeMeeting({
        attendees: [{ email: 'customer@acme.com', status: 'accepted' }],
        contactIds: [],
      });

      const pkg = aggregator.aggregate(makeInput({ contacts: [contact], meetings: [meeting] }));

      const resultMeeting = pkg.meetings[0];
      expect(resultMeeting!.contactIds.filter((id) => id === contact.id)).toHaveLength(1);
    });
  });

  describe('data quality scoring', () => {
    it('returns 100 score for clean data', () => {
      const deal = makeDeal({ amount: 50_000 });
      const contact = makeContact();
      const pkg = aggregator.aggregate(makeInput({ deals: [deal], contacts: [contact] }));
      expect(pkg.metadata.dataQuality.score).toBe(100);
    });

    it('reduces score when deals have no contacts', () => {
      const deals = [makeDeal(), makeDeal()];
      const pkg = aggregator.aggregate(makeInput({ deals, contacts: [] }));
      expect(pkg.metadata.dataQuality.score).toBeLessThan(100);
      expect(pkg.metadata.dataQuality.issues.length).toBeGreaterThan(0);
    });

    it('reduces score for zero-amount deals', () => {
      const zeroDeal = makeDeal({ amount: 0 });
      const contact = makeContact();
      const pkg = aggregator.aggregate(makeInput({ deals: [zeroDeal], contacts: [contact] }));
      expect(pkg.metadata.dataQuality.score).toBeLessThan(100);
    });

    it('score is never below 0', () => {
      // Worst case: many zero-amount deals, no contacts, no close dates
      const deals = Array.from({ length: 10 }, () => makeDeal({ amount: 0 }));
      const pkg = aggregator.aggregate(makeInput({ deals, contacts: [] }));
      expect(pkg.metadata.dataQuality.score).toBeGreaterThanOrEqual(0);
    });
  });
});
