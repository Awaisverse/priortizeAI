export interface CalendarEvent {
  id?: string | null;
  summary?: string | null;
  description?: string | null;
  status?: string | null;
  start?: { dateTime?: string | null; date?: string | null; timeZone?: string | null };
  end?: { dateTime?: string | null; date?: string | null };
  attendees?: {
    email?: string | null;
    displayName?: string | null;
    responseStatus?: string | null;
    self?: boolean | null;
    organizer?: boolean | null;
  }[];
  organizer?: { email?: string | null; displayName?: string | null };
  location?: string | null;
  hangoutLink?: string | null;
  conferenceData?: { entryPoints?: { uri?: string | null; entryPointType?: string | null }[] };
}

function getDomain(email: string): string {
  const parts = email.split('@');
  return parts[1]?.toLowerCase() ?? '';
}

export function isExternalMeeting(event: CalendarEvent, userEmail: string): boolean {
  const userDomain = getDomain(userEmail);
  const attendees = event.attendees ?? [];
  return attendees.some((a) => {
    const email = a.email ?? '';
    if (!email || a.self) return false;
    return getDomain(email) !== userDomain;
  });
}

export function shouldIncludeEvent(event: CalendarEvent, userEmail: string): boolean {
  if (event.status === 'cancelled') return false;

  // Exclude all-day events (they have `date` but not `dateTime`)
  if (!event.start?.dateTime) return false;

  const attendees = event.attendees ?? [];

  // Exclude solo events (only the user, no one else)
  const others = attendees.filter((a) => !a.self);
  if (others.length === 0 && attendees.length <= 1) return false;

  // Include if there's at least one external attendee
  if (isExternalMeeting(event, userEmail)) return true;

  // Include internal meetings with multiple attendees
  return attendees.length > 1;
}

export const eventFilter = {
  shouldIncludeEvent,
  isExternalMeeting,
};
