import type { Deal, Task, Contact, EngagementRecord, DealStatus, TaskStatus, PriorityLevel } from '../../models';
import { generateId, nowISO, daysSince, isOverdue } from '../../utils/helpers';

// ─── Raw HubSpot API shapes ───────────────────────────────────────────────────

export interface HubSpotRawDeal {
  id: string;
  properties: {
    dealname: string | null;
    amount: string | null;
    closedate: string | null;
    pipeline: string | null;
    dealstage: string | null;
    hubspot_owner_id: string | null;
    hs_deal_stage_probability: string | null;
    notes_last_contacted: string | null;
    description: string | null;
    createdate: string | null;
    hs_lastmodifieddate: string | null;
    hs_closed_won_date: string | null;
    [key: string]: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface HubSpotRawTask {
  id: string;
  properties: {
    hs_task_subject: string | null;
    hs_task_body: string | null;
    hs_timestamp: string | null;
    hubspot_owner_id: string | null;
    hs_task_status: string | null;
    hs_task_type: string | null;
    hs_task_priority: string | null;
    hs_due_date: string | null;
    createdate: string | null;
    hs_lastmodifieddate: string | null;
    hs_contact_id: string | null;
    hs_deal_id: string | null;
    [key: string]: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface HubSpotRawContact {
  id: string;
  properties: {
    firstname: string | null;
    lastname: string | null;
    email: string | null;
    phone: string | null;
    jobtitle: string | null;
    company: string | null;
    hubspot_owner_id: string | null;
    notes_last_contacted: string | null;
    num_contacted_notes: string | null;
    hs_email_last_send_date: string | null;
    hs_email_first_send_date: string | null;
    createdate: string | null;
    hs_lastmodifieddate: string | null;
    [key: string]: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface HubSpotRawEngagement {
  id: string;
  properties: {
    hs_engagement_type: string | null;
    hs_timestamp: string | null;
    hs_body_preview: string | null;
    hs_email_subject: string | null;
    hs_call_duration: string | null;
    hs_meeting_outcome: string | null;
    hubspot_owner_id: string | null;
    hs_contact_id: string | null;
    hs_deal_id: string | null;
    [key: string]: string | null;
  };
  createdAt: string;
}

// ─── Search response wrapper ──────────────────────────────────────────────────

export interface HubSpotSearchResponse<T> {
  total: number;
  results: T[];
  paging?: { next?: { after: string } };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDealStatus(stage: string | null, wonDate: string | null): DealStatus {
  if (wonDate) return 'won';
  const s = (stage ?? '').toLowerCase();
  if (s.includes('closedwon') || s.includes('closed_won')) return 'won';
  if (s.includes('closedlost') || s.includes('closed_lost')) return 'lost';
  return 'open';
}

function detectClosingRisk(
  closeDate: string | null,
  status: DealStatus,
): 'low' | 'medium' | 'high' | undefined {
  if (status !== 'open' || !closeDate) return undefined;
  const daysUntilClose = -daysSince(closeDate);
  if (daysUntilClose <= 0) return 'high'; // already past
  if (daysUntilClose <= 7) return 'high';
  if (daysUntilClose <= 14) return 'medium';
  return 'low';
}

function mapTaskStatus(hubspotStatus: string | null, dueDate: string | null): TaskStatus {
  switch ((hubspotStatus ?? '').toUpperCase()) {
    case 'COMPLETED':
      return 'completed';
    case 'IN_PROGRESS':
      return 'in_progress';
    case 'CANCELLED':
      return 'cancelled';
    default: {
      if (dueDate && isOverdue(dueDate)) return 'overdue';
      return 'pending';
    }
  }
}

function mapTaskPriority(hubspotPriority: string | null): PriorityLevel {
  switch ((hubspotPriority ?? '').toUpperCase()) {
    case 'HIGH':
      return 'P1';
    case 'MEDIUM':
      return 'P2';
    case 'LOW':
      return 'P3';
    default:
      return 'P2';
  }
}

function mapEngagementType(
  engType: string | null,
): 'call' | 'email' | 'meeting' | 'task_completed' | 'note' | 'other' {
  switch ((engType ?? '').toUpperCase()) {
    case 'EMAIL':
      return 'email';
    case 'CALL':
      return 'call';
    case 'MEETING':
      return 'meeting';
    case 'TASK':
      return 'task_completed';
    case 'NOTE':
      return 'note';
    default:
      return 'other';
  }
}

// ─── Transformer ──────────────────────────────────────────────────────────────

export const hubspotTransformer = {
  transformDeal(raw: HubSpotRawDeal): Deal {
    const p = raw.properties;
    const closeDate = p.closedate ?? raw.createdAt;
    const status = parseDealStatus(p.dealstage, p.hs_closed_won_date);
    const lastActivity = p.notes_last_contacted ?? raw.updatedAt;
    const stalledThreshold = 14;

    return {
      id: generateId(),
      hubspotId: raw.id,
      name: p.dealname ?? 'Unnamed Deal',
      description: p.description ?? undefined,
      amount: parseFloat(p.amount ?? '0') || 0,
      status:
        status === 'open' && daysSince(lastActivity) > stalledThreshold ? 'stalled' : status,
      stage: p.dealstage ?? '',
      closeProbability: parseFloat(p.hs_deal_stage_probability ?? '0') || 0,
      closeDate,
      createdAt: p.createdate ?? raw.createdAt,
      updatedAt: p.hs_lastmodifieddate ?? raw.updatedAt,
      lastActivity,
      ownerId: p.hubspot_owner_id ?? 'unknown',
      contacts: [],
      closingRisk: detectClosingRisk(closeDate, status),
      source: 'hubspot',
      synced_at: nowISO(),
    };
  },

  transformTask(raw: HubSpotRawTask): Task {
    const p = raw.properties;
    const dueDate = p.hs_due_date ?? p.hs_timestamp ?? raw.createdAt;
    const status = mapTaskStatus(p.hs_task_status, dueDate);
    const overdue = status === 'overdue';

    return {
      id: generateId(),
      hubspotId: raw.id,
      title: p.hs_task_subject ?? 'Untitled Task',
      description: p.hs_task_body ?? undefined,
      taskType: mapTaskType(p.hs_task_type),
      status,
      dueDate,
      createdAt: p.createdate ?? raw.createdAt,
      updatedAt: p.hs_lastmodifieddate ?? raw.updatedAt,
      ownerId: p.hubspot_owner_id ?? 'unknown',
      dealId: p.hs_deal_id ?? undefined,
      contactId: p.hs_contact_id ?? undefined,
      priority: mapTaskPriority(p.hs_task_priority),
      isOverdue: overdue,
      daysOverdue: overdue ? Math.floor(daysSince(dueDate)) : undefined,
      source: 'hubspot',
      synced_at: nowISO(),
    };
  },

  transformContact(raw: HubSpotRawContact): Contact {
    const p = raw.properties;
    const firstName = p.firstname ?? '';
    const lastName = p.lastname ?? '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || p.email || 'Unknown';
    const contactCount = parseInt(p.num_contacted_notes ?? '0', 10) || 0;

    return {
      id: generateId(),
      hubspotId: raw.id,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      name: fullName,
      email: p.email ?? '',
      phone: p.phone ?? undefined,
      title: p.jobtitle ?? undefined,
      company: p.company ?? 'Unknown',
      lastInteraction: p.notes_last_contacted ?? raw.createdAt,
      engagementScore: Math.min(100, contactCount * 5),
      dealIds: [],
      totalEmails: undefined,
      totalCalls: undefined,
      lastEmailDate: p.hs_email_last_send_date ?? undefined,
      source: 'hubspot',
      synced_at: nowISO(),
    };
  },

  transformEngagement(raw: HubSpotRawEngagement): EngagementRecord {
    const p = raw.properties;
    const duration = p.hs_call_duration ? parseInt(p.hs_call_duration, 10) : undefined;

    return {
      id: generateId(),
      hubspotId: raw.id,
      type: mapEngagementType(p.hs_engagement_type),
      timestamp: p.hs_timestamp ?? raw.createdAt,
      subject: p.hs_email_subject ?? undefined,
      body: p.hs_body_preview ?? undefined,
      duration: duration && !isNaN(duration) ? duration : undefined,
      contactId: p.hs_contact_id ?? 'unknown',
      dealId: p.hs_deal_id ?? undefined,
      ownerId: p.hubspot_owner_id ?? 'unknown',
      source: 'hubspot',
      synced_at: nowISO(),
    };
  },
};

function mapTaskType(
  hubspotType: string | null,
): 'call' | 'email' | 'meeting' | 'task' | 'other' | undefined {
  switch ((hubspotType ?? '').toUpperCase()) {
    case 'CALL':
      return 'call';
    case 'EMAIL':
      return 'email';
    case 'MEETING':
      return 'meeting';
    case 'TASK':
      return 'task';
    default:
      return undefined;
  }
}
