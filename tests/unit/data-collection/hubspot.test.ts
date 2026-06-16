import { hubspotTransformer } from '../../../src/data-collection/normalizers/hubspotTransformer';
import { mockRawDeal, mockRawTask, mockRawContact, mockRawEngagement } from '../../mocks/hubspotMocks';

describe('hubspotTransformer', () => {
  describe('transformDeal', () => {
    it('maps basic fields correctly', () => {
      const raw = mockRawDeal();
      const deal = hubspotTransformer.transformDeal(raw);

      expect(deal.hubspotId).toBe(raw.id);
      expect(deal.name).toBe(raw.properties.dealname);
      expect(deal.amount).toBe(75_000);
      expect(deal.stage).toBe(raw.properties.dealstage);
      expect(deal.source).toBe('hubspot');
      expect(deal.contacts).toEqual([]);
    });

    it('defaults name to "Unnamed Deal" when dealname is null', () => {
      const raw = mockRawDeal({ properties: { ...mockRawDeal().properties, dealname: null } });
      expect(hubspotTransformer.transformDeal(raw).name).toBe('Unnamed Deal');
    });

    it('defaults amount to 0 when null', () => {
      const raw = mockRawDeal({ properties: { ...mockRawDeal().properties, amount: null } });
      expect(hubspotTransformer.transformDeal(raw).amount).toBe(0);
    });

    it('parses closeProbability as float', () => {
      const raw = mockRawDeal({
        properties: { ...mockRawDeal().properties, hs_deal_stage_probability: '75.5' },
      });
      expect(hubspotTransformer.transformDeal(raw).closeProbability).toBe(75.5);
    });

    it('marks closing risk as high when close date is within 7 days', () => {
      const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const raw = mockRawDeal({ properties: { ...mockRawDeal().properties, closedate: soon } });
      expect(hubspotTransformer.transformDeal(raw).closingRisk).toBe('high');
    });

    it('marks closing risk as medium when close date is 8-14 days away', () => {
      const medium = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const raw = mockRawDeal({ properties: { ...mockRawDeal().properties, closedate: medium } });
      expect(hubspotTransformer.transformDeal(raw).closingRisk).toBe('medium');
    });

    it('marks closing risk as low when close date is >14 days away', () => {
      const far = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const raw = mockRawDeal({ properties: { ...mockRawDeal().properties, closedate: far } });
      expect(hubspotTransformer.transformDeal(raw).closingRisk).toBe('low');
    });

    it('marks deal as stalled when last activity was >14 days ago', () => {
      const oldActivity = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
      const raw = mockRawDeal({
        properties: { ...mockRawDeal().properties, notes_last_contacted: oldActivity },
      });
      expect(hubspotTransformer.transformDeal(raw).status).toBe('stalled');
    });

    it('assigns owner from hubspot_owner_id', () => {
      const raw = mockRawDeal();
      expect(hubspotTransformer.transformDeal(raw).ownerId).toBe(raw.properties.hubspot_owner_id);
    });

    it('handles hs_closed_won_date → status won', () => {
      const wonDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const raw = mockRawDeal({
        properties: { ...mockRawDeal().properties, hs_closed_won_date: wonDate },
      });
      expect(hubspotTransformer.transformDeal(raw).status).toBe('won');
    });
  });

  describe('transformTask', () => {
    it('maps basic fields correctly', () => {
      const raw = mockRawTask();
      const task = hubspotTransformer.transformTask(raw);

      expect(task.hubspotId).toBe(raw.id);
      expect(task.title).toBe(raw.properties.hs_task_subject);
      expect(task.source).toBe('hubspot');
    });

    it('maps HIGH priority to P1', () => {
      const raw = mockRawTask({
        properties: { ...mockRawTask().properties, hs_task_priority: 'HIGH' },
      });
      expect(hubspotTransformer.transformTask(raw).priority).toBe('P1');
    });

    it('maps MEDIUM priority to P2', () => {
      const raw = mockRawTask({
        properties: { ...mockRawTask().properties, hs_task_priority: 'MEDIUM' },
      });
      expect(hubspotTransformer.transformTask(raw).priority).toBe('P2');
    });

    it('maps LOW priority to P3', () => {
      const raw = mockRawTask({
        properties: { ...mockRawTask().properties, hs_task_priority: 'LOW' },
      });
      expect(hubspotTransformer.transformTask(raw).priority).toBe('P3');
    });

    it('detects overdue task when due date is in the past', () => {
      const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const raw = mockRawTask({
        properties: { ...mockRawTask().properties, hs_due_date: pastDate, hs_task_status: 'NOT_STARTED' },
      });
      const task = hubspotTransformer.transformTask(raw);
      expect(task.status).toBe('overdue');
      expect(task.isOverdue).toBe(true);
      expect(task.daysOverdue).toBeGreaterThan(0);
    });

    it('maps COMPLETED status correctly', () => {
      const raw = mockRawTask({
        properties: { ...mockRawTask().properties, hs_task_status: 'COMPLETED' },
      });
      expect(hubspotTransformer.transformTask(raw).status).toBe('completed');
    });

    it('defaults title when subject is null', () => {
      const raw = mockRawTask({
        properties: { ...mockRawTask().properties, hs_task_subject: null },
      });
      expect(hubspotTransformer.transformTask(raw).title).toBe('Untitled Task');
    });
  });

  describe('transformContact', () => {
    it('assembles full name from firstName and lastName', () => {
      const raw = mockRawContact({
        properties: { ...mockRawContact().properties, firstname: 'John', lastname: 'Smith' },
      });
      expect(hubspotTransformer.transformContact(raw).name).toBe('John Smith');
    });

    it('falls back to email when name parts are null', () => {
      const raw = mockRawContact({
        properties: {
          ...mockRawContact().properties,
          firstname: null,
          lastname: null,
          email: 'user@test.com',
        },
      });
      expect(hubspotTransformer.transformContact(raw).name).toBe('user@test.com');
    });

    it('initializes dealIds as empty array', () => {
      const contact = hubspotTransformer.transformContact(mockRawContact());
      expect(contact.dealIds).toEqual([]);
    });

    it('computes engagementScore from num_contacted_notes', () => {
      const raw = mockRawContact({
        properties: { ...mockRawContact().properties, num_contacted_notes: '10' },
      });
      expect(hubspotTransformer.transformContact(raw).engagementScore).toBe(50);
    });

    it('caps engagementScore at 100', () => {
      const raw = mockRawContact({
        properties: { ...mockRawContact().properties, num_contacted_notes: '30' },
      });
      expect(hubspotTransformer.transformContact(raw).engagementScore).toBe(100);
    });
  });

  describe('transformEngagement', () => {
    it('maps EMAIL type correctly', () => {
      const raw = mockRawEngagement({
        properties: { ...mockRawEngagement().properties, hs_engagement_type: 'EMAIL' },
      });
      expect(hubspotTransformer.transformEngagement(raw).type).toBe('email');
    });

    it('maps CALL type correctly', () => {
      const raw = mockRawEngagement({
        properties: { ...mockRawEngagement().properties, hs_engagement_type: 'CALL', hs_call_duration: '300' },
      });
      const eng = hubspotTransformer.transformEngagement(raw);
      expect(eng.type).toBe('call');
      expect(eng.duration).toBe(300);
    });

    it('maps NOTE type correctly', () => {
      const raw = mockRawEngagement({
        properties: { ...mockRawEngagement().properties, hs_engagement_type: 'NOTE' },
      });
      expect(hubspotTransformer.transformEngagement(raw).type).toBe('note');
    });

    it('maps unknown type to "other"', () => {
      const raw = mockRawEngagement({
        properties: { ...mockRawEngagement().properties, hs_engagement_type: 'CUSTOM' },
      });
      expect(hubspotTransformer.transformEngagement(raw).type).toBe('other');
    });
  });
});
