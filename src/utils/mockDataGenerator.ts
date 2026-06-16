import { randomUUID } from 'crypto';
import type {
  Deal,
  Task,
  Meeting,
  Contact,
  EngagementRecord,
  UnifiedDataPackage,
  Attendee,
} from '../models';

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function makeDeal(overrides: Partial<Deal> = {}): Deal {
  const id = randomUUID();
  return {
    id,
    hubspotId: `hs-deal-${id.slice(0, 8)}`,
    name: 'Acme Corp Enterprise Deal',
    amount: 75_000,
    status: 'open',
    stage: 'proposal',
    closeDate: isoOffset(14),
    createdAt: isoOffset(-30),
    updatedAt: isoOffset(-1),
    lastActivity: isoOffset(-2),
    ownerId: 'ae-001',
    contacts: [],
    source: 'hubspot',
    synced_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  const id = randomUUID();
  return {
    id,
    hubspotId: `hs-task-${id.slice(0, 8)}`,
    title: 'Follow up on proposal',
    status: 'pending',
    dueDate: isoOffset(1),
    createdAt: isoOffset(-7),
    updatedAt: isoOffset(-1),
    ownerId: 'ae-001',
    priority: 'P2',
    source: 'hubspot',
    synced_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeMeeting(overrides: Partial<Meeting> = {}): Meeting {
  const id = randomUUID();
  const start = isoOffset(1);
  const end = new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();
  const attendees: Attendee[] = [
    { email: 'customer@acme.com', status: 'accepted' },
    { email: 'ae@company.com', status: 'accepted' },
  ];
  return {
    id,
    calendarEventId: `cal-${id.slice(0, 8)}`,
    title: 'Discovery Call — Acme Corp',
    startTime: start,
    endTime: end,
    durationMinutes: 60,
    organizer: { name: 'AE User', email: 'ae@company.com' },
    attendees,
    contactIds: [],
    source: 'google_calendar',
    synced_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeContact(overrides: Partial<Contact> = {}): Contact {
  const id = randomUUID();
  return {
    id,
    hubspotId: `hs-contact-${id.slice(0, 8)}`,
    name: 'Jane Doe',
    email: `jane.doe.${id.slice(0, 4)}@acme.com`,
    company: 'Acme Corp',
    lastInteraction: isoOffset(-3),
    engagementScore: 72,
    dealIds: [],
    source: 'hubspot',
    synced_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeEngagementRecord(overrides: Partial<EngagementRecord> = {}): EngagementRecord {
  const id = randomUUID();
  return {
    id,
    type: 'email',
    timestamp: isoOffset(-5),
    contactId: 'contact-001',
    ownerId: 'ae-001',
    source: 'hubspot',
    synced_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeUnifiedDataPackage(
  aeId = 'ae-001',
  overrides: Partial<UnifiedDataPackage> = {},
): UnifiedDataPackage {
  const deal = makeDeal({ ownerId: aeId });
  const task = makeTask({ ownerId: aeId, dealId: deal.id });
  const contact = makeContact({ dealIds: [deal.id] });
  const meeting = makeMeeting({ dealId: deal.id, contactIds: [contact.id] });
  const engagement = makeEngagementRecord({ contactId: contact.id, dealId: deal.id, ownerId: aeId });

  return {
    deals: [deal],
    tasks: [task],
    meetings: [meeting],
    contacts: [contact],
    engagementHistory: [engagement],
    timestamp: new Date().toISOString(),
    aggregatedId: randomUUID(),
    aeId,
    metadata: {
      fetchedAt: new Date().toISOString(),
      sources: ['hubspot', 'google_calendar'],
      recordCount: { deals: 1, tasks: 1, meetings: 1, contacts: 1, engagements: 1 },
      dataQuality: { score: 95, issues: [] },
    },
    ...overrides,
  };
}
