import type { UnifiedDataPackage, Deal, Task, Meeting, Contact, EngagementRecord } from '../models';
import { validateUnifiedDataPackage } from '../utils/validators';
import { generateId, nowISO } from '../utils/helpers';
import { createLogger } from '../utils/logger';

const logger = createLogger('DataAggregator');

export interface AggregatorInput {
  aeId: string;
  deals: Deal[];
  tasks: Task[];
  meetings: Meeting[];
  contacts: Contact[];
  engagements: EngagementRecord[];
}

interface DataQuality {
  score: number;
  issues: string[];
}

export class DataAggregator {
  aggregate(input: AggregatorInput): UnifiedDataPackage {
    const { aeId, engagements } = input;

    // Mutable copies for cross-referencing
    const deals = input.deals.map((d) => ({ ...d, contacts: [...d.contacts] }));
    const contacts = input.contacts.map((c) => ({ ...c, dealIds: [...c.dealIds] }));
    const meetings = input.meetings.map((m) => ({ ...m, contactIds: [...m.contactIds] }));

    // Build lookup maps
    const contactByHubspotId = new Map<string, Contact>();
    const contactByEmail = new Map<string, Contact>();
    for (const contact of contacts) {
      contactByHubspotId.set(contact.hubspotId, contact);
      if (contact.email) contactByEmail.set(contact.email.toLowerCase(), contact);
    }

    // Cross-reference: link contacts to their deals via shared engagement records.
    // EngagementRecord.dealId and .contactId come from HubSpot (hs_deal_id / hs_contact_id),
    // so compare against hubspotId — not the internal UUID.
    for (const deal of deals) {
      for (const contact of contacts) {
        if (!contact.dealIds.includes(deal.id)) {
          const dealEngagements = engagements.filter((e) => e.dealId === deal.hubspotId);
          if (dealEngagements.some((e) => e.contactId === contact.hubspotId)) {
            contact.dealIds.push(deal.id);
            if (!deal.contacts.includes(contact.id)) {
              deal.contacts.push(contact.id);
            }
          }
        }
      }
    }

    // Cross-reference: link meetings to contacts by email
    for (const meeting of meetings) {
      for (const attendee of meeting.attendees) {
        const contact = contactByEmail.get(attendee.email.toLowerCase());
        if (contact && !meeting.contactIds.includes(contact.id)) {
          meeting.contactIds.push(contact.id);
        }
      }
    }

    const quality = this.calculateDataQuality(deals, contacts, input.tasks);

    const pkg: UnifiedDataPackage = {
      deals,
      tasks: input.tasks,
      meetings,
      contacts,
      engagementHistory: engagements,
      timestamp: nowISO(),
      aggregatedId: generateId(),
      aeId,
      metadata: {
        fetchedAt: nowISO(),
        sources: ['hubspot', 'google_calendar'],
        recordCount: {
          deals: deals.length,
          tasks: input.tasks.length,
          meetings: meetings.length,
          contacts: contacts.length,
          engagements: engagements.length,
        },
        dataQuality: quality,
      },
    };

    const validation = validateUnifiedDataPackage(pkg);
    if (!validation.valid) {
      logger.warn('Data package validation warnings', { aeId, errors: validation.errors });
    }

    return pkg;
  }

  private calculateDataQuality(deals: Deal[], contacts: Contact[], tasks: Task[]): DataQuality {
    let score = 100;
    const issues: string[] = [];

    const dealsWithNoCloseDate = deals.filter((d) => !d.closeDate);
    if (dealsWithNoCloseDate.length > 0) {
      score -= 10;
      issues.push(`${dealsWithNoCloseDate.length} deal(s) missing close date`);
    }

    if (contacts.length === 0 && deals.length > 0) {
      score -= 10;
      issues.push('No contacts found for AE');
    }

    const zeroAmountDeals = deals.filter((d) => d.amount === 0);
    if (zeroAmountDeals.length > 0) {
      score -= Math.min(20, zeroAmountDeals.length * 5);
      issues.push(`${zeroAmountDeals.length} deal(s) have $0 amount`);
    }

    const overdueTasks = tasks.filter((t) => t.status === 'overdue');
    if (overdueTasks.length > 5) {
      score -= 5;
      issues.push(`${overdueTasks.length} overdue tasks require attention`);
    }

    return { score: Math.max(0, score), issues };
  }
}
