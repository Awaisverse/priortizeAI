import type { CalendarEvent } from '../../src/data-collection/google-calendar/eventFilter';

export const mockUserEmail = 'ae@company.com';
export const mockCalendarId = 'primary';

function futureISO(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

export function mockExternalMeeting(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  const start = futureISO(24);
  const end = futureISO(25);
  return {
    id: `cal-ext-${Math.random().toString(36).slice(2, 9)}`,
    summary: 'Discovery Call — Acme Corp',
    description: 'Initial discovery with the Acme team',
    status: 'confirmed',
    start: { dateTime: start, timeZone: 'America/New_York' },
    end: { dateTime: end },
    organizer: { email: mockUserEmail, displayName: 'AE User' },
    attendees: [
      { email: mockUserEmail, displayName: 'AE User', responseStatus: 'accepted', self: true },
      { email: 'jane@acme.com', displayName: 'Jane Doe', responseStatus: 'accepted' },
      { email: 'bob@acme.com', displayName: 'Bob Smith', responseStatus: 'tentative' },
    ],
    hangoutLink: 'https://meet.google.com/abc-def-ghi',
    ...overrides,
  };
}

export function mockInternalMeeting(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  const start = futureISO(2);
  const end = futureISO(3);
  return {
    id: `cal-int-${Math.random().toString(36).slice(2, 9)}`,
    summary: 'Weekly Team Sync',
    status: 'confirmed',
    start: { dateTime: start, timeZone: 'UTC' },
    end: { dateTime: end },
    organizer: { email: 'manager@company.com', displayName: 'Manager' },
    attendees: [
      { email: mockUserEmail, displayName: 'AE User', responseStatus: 'accepted', self: true },
      { email: 'colleague@company.com', displayName: 'Colleague', responseStatus: 'accepted' },
    ],
    ...overrides,
  };
}

export function mockCancelledEvent(): CalendarEvent {
  return {
    id: 'cal-cancelled-001',
    summary: 'Cancelled Meeting',
    status: 'cancelled',
    start: { dateTime: futureISO(48) },
    end: { dateTime: futureISO(49) },
    organizer: { email: mockUserEmail },
    attendees: [
      { email: mockUserEmail, responseStatus: 'declined', self: true },
      { email: 'someone@external.com', responseStatus: 'declined' },
    ],
  };
}

export function mockAllDayEvent(): CalendarEvent {
  return {
    id: 'cal-allday-001',
    summary: 'Conference Day',
    status: 'confirmed',
    start: { date: new Date().toISOString().slice(0, 10) }, // date, no dateTime
    end: { date: new Date().toISOString().slice(0, 10) },
    organizer: { email: mockUserEmail },
    attendees: [],
  };
}

export function mockSoloEvent(): CalendarEvent {
  return {
    id: 'cal-solo-001',
    summary: 'Focus Time',
    status: 'confirmed',
    start: { dateTime: futureISO(1) },
    end: { dateTime: futureISO(2) },
    organizer: { email: mockUserEmail },
    attendees: [{ email: mockUserEmail, responseStatus: 'accepted', self: true }],
  };
}

export interface MockCalendarListResponse {
  events: CalendarEvent[];
  nextPageToken?: string;
}

export function mockCalendarListResponse(
  events?: CalendarEvent[],
  nextPageToken?: string,
): MockCalendarListResponse {
  return {
    events: events ?? [mockExternalMeeting(), mockInternalMeeting()],
    nextPageToken,
  };
}
