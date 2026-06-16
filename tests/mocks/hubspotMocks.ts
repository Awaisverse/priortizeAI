import type {
  HubSpotRawDeal,
  HubSpotRawTask,
  HubSpotRawContact,
  HubSpotRawEngagement,
  HubSpotSearchResponse,
} from '../../src/data-collection/normalizers/hubspotTransformer';

export const mockAEId = 'ae-test-001';
export const mockHubSpotOwnerId = 'hs-owner-123';

// ─── Deals ────────────────────────────────────────────────────────────────────

export function mockRawDeal(overrides: Partial<HubSpotRawDeal> = {}): HubSpotRawDeal {
  const now = new Date().toISOString();
  const closeDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: `hs-deal-${Math.random().toString(36).slice(2, 9)}`,
    properties: {
      dealname: 'Acme Corp Enterprise',
      amount: '75000',
      closedate: closeDate,
      pipeline: 'default',
      dealstage: 'proposal',
      hubspot_owner_id: mockHubSpotOwnerId,
      hs_deal_stage_probability: '60',
      notes_last_contacted: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Enterprise deal for Q4',
      createdate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      hs_lastmodifieddate: now,
      hs_closed_won_date: null,
      ...((overrides.properties as Record<string, string | null>) ?? {}),
    },
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: now,
    ...overrides,
  };
}

export function mockRawDealHighRisk(): HubSpotRawDeal {
  return mockRawDeal({
    properties: {
      dealname: 'High Risk Deal',
      amount: '200000',
      closedate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
      pipeline: 'default',
      dealstage: 'closingcall',
      hubspot_owner_id: mockHubSpotOwnerId,
      hs_deal_stage_probability: '80',
      notes_last_contacted: null,
      description: null,
      createdate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      hs_lastmodifieddate: new Date().toISOString(),
      hs_closed_won_date: null,
    },
  });
}

export function mockDealsSearchResponse(
  deals?: HubSpotRawDeal[],
): HubSpotSearchResponse<HubSpotRawDeal> {
  return {
    total: deals?.length ?? 2,
    results: deals ?? [mockRawDeal(), mockRawDealHighRisk()],
  };
}

export function mockPaginatedDealsResponse(
  page1: HubSpotRawDeal[],
  page2: HubSpotRawDeal[],
): { first: HubSpotSearchResponse<HubSpotRawDeal>; second: HubSpotSearchResponse<HubSpotRawDeal> } {
  return {
    first: { total: page1.length + page2.length, results: page1, paging: { next: { after: 'cursor-abc' } } },
    second: { total: page1.length + page2.length, results: page2 },
  };
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export function mockRawTask(overrides: Partial<HubSpotRawTask> = {}): HubSpotRawTask {
  const now = new Date().toISOString();
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return {
    id: `hs-task-${Math.random().toString(36).slice(2, 9)}`,
    properties: {
      hs_task_subject: 'Follow up on proposal',
      hs_task_body: 'Send updated pricing deck',
      hs_timestamp: dueDate,
      hubspot_owner_id: mockHubSpotOwnerId,
      hs_task_status: 'NOT_STARTED',
      hs_task_type: 'EMAIL',
      hs_task_priority: 'HIGH',
      hs_due_date: dueDate,
      createdate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      hs_lastmodifieddate: now,
      hs_contact_id: 'hs-contact-001',
      hs_deal_id: 'hs-deal-001',
      ...((overrides.properties as Record<string, string | null>) ?? {}),
    },
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: now,
    ...overrides,
  };
}

export function mockRawOverdueTask(): HubSpotRawTask {
  const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  return mockRawTask({
    properties: {
      hs_task_subject: 'Overdue: Call prospect',
      hs_task_body: null,
      hs_timestamp: pastDate,
      hubspot_owner_id: mockHubSpotOwnerId,
      hs_task_status: 'NOT_STARTED',
      hs_task_type: 'CALL',
      hs_task_priority: 'HIGH',
      hs_due_date: pastDate,
      createdate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      hs_lastmodifieddate: new Date().toISOString(),
      hs_contact_id: null,
      hs_deal_id: null,
    },
  });
}

export function mockTasksSearchResponse(
  tasks?: HubSpotRawTask[],
): HubSpotSearchResponse<HubSpotRawTask> {
  return {
    total: tasks?.length ?? 2,
    results: tasks ?? [mockRawTask(), mockRawOverdueTask()],
  };
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export function mockRawContact(overrides: Partial<HubSpotRawContact> = {}): HubSpotRawContact {
  const now = new Date().toISOString();
  return {
    id: `hs-contact-${Math.random().toString(36).slice(2, 9)}`,
    properties: {
      firstname: 'Jane',
      lastname: 'Doe',
      email: 'jane.doe@acme.com',
      phone: '+1-555-0100',
      jobtitle: 'VP of Engineering',
      company: 'Acme Corp',
      hubspot_owner_id: mockHubSpotOwnerId,
      notes_last_contacted: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      num_contacted_notes: '12',
      hs_email_last_send_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      hs_email_first_send_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      createdate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      hs_lastmodifieddate: now,
      ...((overrides.properties as Record<string, string | null>) ?? {}),
    },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: now,
    ...overrides,
  };
}

export function mockContactsSearchResponse(
  contacts?: HubSpotRawContact[],
): HubSpotSearchResponse<HubSpotRawContact> {
  return {
    total: contacts?.length ?? 1,
    results: contacts ?? [mockRawContact()],
  };
}

// ─── Engagements ──────────────────────────────────────────────────────────────

export function mockRawEngagement(
  overrides: Partial<HubSpotRawEngagement> = {},
): HubSpotRawEngagement {
  return {
    id: `hs-eng-${Math.random().toString(36).slice(2, 9)}`,
    properties: {
      hs_engagement_type: 'EMAIL',
      hs_timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      hs_body_preview: 'Following up on our last conversation...',
      hs_email_subject: 'Re: Proposal for Q4',
      hs_call_duration: null,
      hs_meeting_outcome: null,
      hubspot_owner_id: mockHubSpotOwnerId,
      hs_contact_id: 'hs-contact-001',
      hs_deal_id: 'hs-deal-001',
      ...((overrides.properties as Record<string, string | null>) ?? {}),
    },
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

export function mockEngagementsSearchResponse(
  engagements?: HubSpotRawEngagement[],
): HubSpotSearchResponse<HubSpotRawEngagement> {
  return {
    total: engagements?.length ?? 1,
    results: engagements ?? [mockRawEngagement()],
  };
}
