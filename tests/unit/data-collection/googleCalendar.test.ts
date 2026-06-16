import { shouldIncludeEvent, isExternalMeeting } from '../../../src/data-collection/google-calendar/eventFilter';
import { googleTransformer } from '../../../src/data-collection/normalizers/googleTransformer';
import {
  mockExternalMeeting,
  mockInternalMeeting,
  mockCancelledEvent,
  mockAllDayEvent,
  mockSoloEvent,
  mockUserEmail,
} from '../../mocks/googleCalendarMocks';

describe('eventFilter', () => {
  describe('shouldIncludeEvent', () => {
    it('excludes cancelled events', () => {
      expect(shouldIncludeEvent(mockCancelledEvent(), mockUserEmail)).toBe(false);
    });

    it('excludes all-day events without dateTime', () => {
      expect(shouldIncludeEvent(mockAllDayEvent(), mockUserEmail)).toBe(false);
    });

    it('excludes solo events with only the user', () => {
      expect(shouldIncludeEvent(mockSoloEvent(), mockUserEmail)).toBe(false);
    });

    it('includes external meetings with external attendees', () => {
      expect(shouldIncludeEvent(mockExternalMeeting(), mockUserEmail)).toBe(true);
    });

    it('includes internal meetings with multiple attendees', () => {
      expect(shouldIncludeEvent(mockInternalMeeting(), mockUserEmail)).toBe(true);
    });
  });

  describe('isExternalMeeting', () => {
    it('returns true when any attendee is from a different domain', () => {
      expect(isExternalMeeting(mockExternalMeeting(), mockUserEmail)).toBe(true);
    });

    it('returns false when all attendees are from the same domain', () => {
      expect(isExternalMeeting(mockInternalMeeting(), mockUserEmail)).toBe(false);
    });

    it('returns false when there are no attendees', () => {
      const event = { ...mockExternalMeeting(), attendees: [] };
      expect(isExternalMeeting(event, mockUserEmail)).toBe(false);
    });
  });
});

describe('googleTransformer', () => {
  describe('transformEvent', () => {
    it('maps basic fields correctly', () => {
      const event = mockExternalMeeting();
      const meeting = googleTransformer.transformEvent(event, mockUserEmail);

      expect(meeting.title).toBe(event.summary);
      expect(meeting.calendarEventId).toBe(event.id);
      expect(meeting.source).toBe('google_calendar');
      expect(meeting.organizer.email).toBe(event.organizer?.email);
    });

    it('calculates durationMinutes correctly', () => {
      const start = new Date('2024-06-16T10:00:00Z').toISOString();
      const end = new Date('2024-06-16T11:30:00Z').toISOString();
      const event = mockExternalMeeting({
        start: { dateTime: start },
        end: { dateTime: end },
      });
      const meeting = googleTransformer.transformEvent(event, mockUserEmail);
      expect(meeting.durationMinutes).toBe(90);
    });

    it('marks external meetings correctly', () => {
      const meeting = googleTransformer.transformEvent(mockExternalMeeting(), mockUserEmail);
      expect(meeting.isExternalMeeting).toBe(true);
    });

    it('marks internal meetings correctly', () => {
      const meeting = googleTransformer.transformEvent(mockInternalMeeting(), mockUserEmail);
      expect(meeting.isExternalMeeting).toBe(false);
      expect(meeting.type).toBe('internal');
    });

    it('maps attendees with correct response status', () => {
      const meeting = googleTransformer.transformEvent(mockExternalMeeting(), mockUserEmail);
      const accepted = meeting.attendees.find((a) => a.status === 'accepted');
      expect(accepted).toBeDefined();
    });

    it('maps unknown response status to needs_action', () => {
      const event = mockExternalMeeting({
        attendees: [{ email: 'unknown@acme.com', responseStatus: 'unknown_status' }],
      });
      const meeting = googleTransformer.transformEvent(event, mockUserEmail);
      expect(meeting.attendees[0]?.status).toBe('needs_action');
    });

    it('initializes contactIds as empty array', () => {
      const meeting = googleTransformer.transformEvent(mockExternalMeeting(), mockUserEmail);
      expect(meeting.contactIds).toEqual([]);
    });

    it('extracts hangoutLink as meetingUrl', () => {
      const event = mockExternalMeeting({
        hangoutLink: 'https://meet.google.com/test-link',
      });
      const meeting = googleTransformer.transformEvent(event, mockUserEmail);
      expect(meeting.meetingUrl).toBe('https://meet.google.com/test-link');
    });

    it('defaults title to "Untitled Meeting" when summary is null', () => {
      const event = mockExternalMeeting({ summary: null });
      const meeting = googleTransformer.transformEvent(event, mockUserEmail);
      expect(meeting.title).toBe('Untitled Meeting');
    });

    it('classifies demo meetings correctly', () => {
      const event = mockExternalMeeting({ summary: 'Product Demo — Acme' });
      const meeting = googleTransformer.transformEvent(event, mockUserEmail);
      expect(meeting.type).toBe('prospect_demo');
    });

    it('classifies closing call meetings correctly', () => {
      const event = mockExternalMeeting({ summary: 'Closing Call — BigCo' });
      const meeting = googleTransformer.transformEvent(event, mockUserEmail);
      expect(meeting.type).toBe('closing_call');
    });
  });
});
