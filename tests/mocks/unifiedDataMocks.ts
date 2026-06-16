import type {
  UnifiedDataPackage,
  Deal,
  Task,
  Meeting,
  Contact,
  EngagementRecord,
} from '../../src/models';

const now = new Date();
const iso = (d: Date) => d.toISOString();
const addDays = (n: number) => { const d = new Date(now); d.setDate(d.getDate() + n); return d; };
const subDays = (n: number) => addDays(-n);

export const mockDeal = (overrides: Partial<Deal> = {}): Deal => ({
  id: 'deal-001',
  hubspotId: 'hs-deal-001',
  name: 'Acme Corp Enterprise',
  amount: 75000,
  currency: 'USD',
  status: 'open',
  stage: 'proposal',
  closeProbability: 70,
  closeDate: iso(addDays(5)),
  createdAt: iso(subDays(60)),
  updatedAt: iso(subDays(1)),
  lastActivity: iso(subDays(2)),
  ownerId: 'ae-001',
  contacts: ['contact-001'],
  source: 'hubspot',
  synced_at: iso(now),
  ...overrides,
});

export const mockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-001',
  hubspotId: 'hs-task-001',
  title: 'Follow up on proposal',
  taskType: 'email',
  status: 'pending',
  dueDate: iso(now),
  createdAt: iso(subDays(5)),
  updatedAt: iso(subDays(1)),
  ownerId: 'ae-001',
  dealId: 'deal-001',
  priority: 'P2',
  isOverdue: false,
  daysOverdue: 0,
  source: 'hubspot',
  synced_at: iso(now),
  ...overrides,
});

export const mockMeeting = (overrides: Partial<Meeting> = {}): Meeting => {
  const start = new Date(now);
  start.setHours(start.getHours() + 2);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return {
    id: 'meeting-001',
    calendarEventId: 'cal-001',
    title: 'Demo Call with Acme',
    startTime: iso(start),
    endTime: iso(end),
    durationMinutes: 60,
    organizer: { name: 'AE User', email: 'ae@company.com' },
    attendees: [
      { name: 'John Buyer', email: 'john@acme.com', status: 'accepted' },
      { name: 'AE User', email: 'ae@company.com', status: 'accepted' },
    ],
    contactIds: ['contact-001'],
    type: 'prospect_demo',
    isExternalMeeting: true,
    source: 'google_calendar',
    synced_at: iso(now),
    ...overrides,
  };
};

export const mockContact = (overrides: Partial<Contact> = {}): Contact => ({
  id: 'contact-001',
  hubspotId: 'hs-contact-001',
  name: 'John Buyer',
  email: 'john@acme.com',
  company: 'Acme Corp',
  lastInteraction: iso(subDays(8)),
  engagementScore: 65,
  engagementTrend: 'stable',
  dealIds: ['deal-001'],
  source: 'hubspot',
  synced_at: iso(now),
  ...overrides,
});

export const mockEngagement = (overrides: Partial<EngagementRecord> = {}): EngagementRecord => ({
  id: 'eng-001',
  type: 'email',
  timestamp: iso(subDays(3)),
  contactId: 'contact-001',
  dealId: 'deal-001',
  ownerId: 'ae-001',
  source: 'hubspot',
  synced_at: iso(now),
  ...overrides,
});

export const mockUnifiedDataPackage = (overrides: Partial<UnifiedDataPackage> = {}): UnifiedDataPackage => ({
  deals: [mockDeal()],
  tasks: [mockTask()],
  meetings: [mockMeeting()],
  contacts: [mockContact()],
  engagementHistory: [mockEngagement()],
  timestamp: iso(now),
  aggregatedId: 'agg-001',
  aeId: 'ae-001',
  metadata: {
    fetchedAt: iso(now),
    sources: ['hubspot', 'google_calendar'],
    recordCount: { deals: 1, tasks: 1, meetings: 1, contacts: 1, engagements: 1 },
    dataQuality: { score: 95, issues: [] },
  },
  ...overrides,
});
