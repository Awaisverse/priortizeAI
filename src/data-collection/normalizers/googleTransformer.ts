import type { Meeting, Attendee } from '../../models';
import { generateId, nowISO } from '../../utils/helpers';
import type { CalendarEvent } from '../google-calendar/eventFilter';
import { isExternalMeeting } from '../google-calendar/eventFilter';

function getMeetingUrl(event: CalendarEvent): string | undefined {
  if (event.hangoutLink) return event.hangoutLink;
  const videoEntry = (event.conferenceData?.entryPoints ?? []).find(
    (ep) => ep.entryPointType === 'video',
  );
  return videoEntry?.uri ?? undefined;
}

function mapResponseStatus(
  status: string | null | undefined,
): 'accepted' | 'declined' | 'tentative' | 'needs_action' {
  switch (status) {
    case 'accepted':
      return 'accepted';
    case 'declined':
      return 'declined';
    case 'tentative':
      return 'tentative';
    default:
      return 'needs_action';
  }
}

function classifyMeetingType(
  isExternal: boolean,
  title: string,
): 'customer_call' | 'internal' | 'prospect_demo' | 'closing_call' | 'other' {
  if (!isExternal) return 'internal';
  const lower = title.toLowerCase();
  if (lower.includes('demo')) return 'prospect_demo';
  if (lower.includes('closing') || lower.includes('close') || lower.includes('sign'))
    return 'closing_call';
  return 'customer_call';
}

export const googleTransformer = {
  transformEvent(event: CalendarEvent, userEmail: string): Meeting {
    const startTime = event.start?.dateTime ?? event.start?.date ?? nowISO();
    const endTime = event.end?.dateTime ?? event.end?.date ?? nowISO();
    const durationMinutes = Math.round(
      (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000,
    );

    const attendees: Attendee[] = (event.attendees ?? []).map((a) => ({
      name: a.displayName ?? undefined,
      email: a.email ?? '',
      status: mapResponseStatus(a.responseStatus),
    }));

    const external = isExternalMeeting(event, userEmail);
    const title = event.summary ?? 'Untitled Meeting';

    return {
      id: generateId(),
      calendarEventId: event.id ?? generateId(),
      title,
      description: event.description ?? undefined,
      startTime,
      endTime,
      durationMinutes: Math.max(0, durationMinutes),
      timezone: event.start?.timeZone ?? 'UTC',
      organizer: {
        name: event.organizer?.displayName ?? '',
        email: event.organizer?.email ?? '',
      },
      attendees,
      location: event.location ?? undefined,
      meetingUrl: getMeetingUrl(event),
      contactIds: [],
      type: classifyMeetingType(external, title),
      isExternalMeeting: external,
      source: 'google_calendar',
      synced_at: nowISO(),
    };
  },
};
