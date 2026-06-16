import type { Meeting } from '../../src/models';
import { makeMeeting } from '../../src/utils/mockDataGenerator';

function daysFromNowISO(days: number, hour = 14): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const testMeetings: Meeting[] = [
  makeMeeting({
    title: 'Demo Call — Acme Corp',
    type: 'prospect_demo',
    isExternalMeeting: true,
    startTime: daysFromNowISO(1),
    endTime: daysFromNowISO(1, 15),
    durationMinutes: 60,
    attendees: [
      { email: 'jane@acme.com', status: 'accepted' },
      { email: 'ae@company.com', status: 'accepted' },
    ],
  }),
  makeMeeting({
    title: 'Closing Call — BigCo',
    type: 'closing_call',
    isExternalMeeting: true,
    startTime: daysFromNowISO(2),
    endTime: daysFromNowISO(2, 15),
    durationMinutes: 60,
    attendees: [
      { email: 'cto@bigco.com', status: 'accepted' },
      { email: 'ae@company.com', status: 'accepted' },
    ],
  }),
  makeMeeting({
    title: 'Weekly Team Sync',
    type: 'internal',
    isExternalMeeting: false,
    startTime: daysFromNowISO(3),
    endTime: daysFromNowISO(3, 15),
    durationMinutes: 30,
    attendees: [
      { email: 'manager@company.com', status: 'accepted' },
      { email: 'ae@company.com', status: 'accepted' },
    ],
  }),
];

export const customerCallMeeting = makeMeeting({
  title: 'Discovery Call — TechStartup',
  type: 'customer_call',
  isExternalMeeting: true,
  durationMinutes: 45,
  attendees: [
    { email: 'founder@techstartup.io', status: 'accepted' },
    { email: 'ae@company.com', status: 'accepted' },
  ],
});

export const internalMeeting = makeMeeting({
  title: 'Sales Planning Session',
  type: 'internal',
  isExternalMeeting: false,
  durationMinutes: 60,
  attendees: [
    { email: 'manager@company.com', status: 'accepted' },
    { email: 'ae@company.com', status: 'accepted' },
  ],
});
