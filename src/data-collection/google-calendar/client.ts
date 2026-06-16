import { google, calendar_v3 } from 'googleapis';
import type { GoogleOAuth2Client } from './auth';
import { createLogger } from '../../utils/logger';
import type { CalendarEvent } from './eventFilter';

const logger = createLogger('GoogleCalendarClient');

export interface ListEventsParams {
  calendarId: string;
  timeMin: string;
  timeMax: string;
  maxResults?: number;
  pageToken?: string;
}

export interface ListEventsResult {
  events: CalendarEvent[];
  nextPageToken?: string;
}

function mapSchemaEvent(item: calendar_v3.Schema$Event): CalendarEvent {
  return {
    id: item.id,
    summary: item.summary,
    description: item.description,
    status: item.status,
    start: item.start
      ? { dateTime: item.start.dateTime, date: item.start.date, timeZone: item.start.timeZone }
      : undefined,
    end: item.end ? { dateTime: item.end.dateTime, date: item.end.date } : undefined,
    attendees: (item.attendees ?? []).map((a: calendar_v3.Schema$EventAttendee) => ({
      email: a.email,
      displayName: a.displayName,
      responseStatus: a.responseStatus,
      self: a.self,
      organizer: a.organizer,
    })),
    organizer: item.organizer
      ? { email: item.organizer.email, displayName: item.organizer.displayName }
      : undefined,
    location: item.location,
    hangoutLink: item.hangoutLink,
    conferenceData: item.conferenceData
      ? {
          entryPoints: (item.conferenceData.entryPoints ?? []).map(
            (ep: calendar_v3.Schema$EntryPoint) => ({
              uri: ep.uri,
              entryPointType: ep.entryPointType,
            }),
          ),
        }
      : undefined,
  };
}

export class GoogleCalendarClient {
  private readonly authClient: GoogleOAuth2Client;

  constructor(authClient: GoogleOAuth2Client) {
    this.authClient = authClient;
  }

  async listEvents(params: ListEventsParams): Promise<ListEventsResult> {
    // Pass auth via the googleapis google instance — avoids dual-package type conflict
    const calendar = google.calendar({ version: 'v3', auth: this.authClient as never });

    try {
      const response = await calendar.events.list({
        calendarId: params.calendarId,
        timeMin: params.timeMin,
        timeMax: params.timeMax,
        maxResults: params.maxResults ?? 250,
        pageToken: params.pageToken,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const items = (response.data.items ?? []).map(mapSchemaEvent);

      logger.debug('Listed calendar events', {
        calendarId: params.calendarId,
        count: items.length,
      });

      return {
        events: items,
        nextPageToken: response.data.nextPageToken ?? undefined,
      };
    } catch (error) {
      logger.error('Failed to list calendar events', {
        calendarId: params.calendarId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
