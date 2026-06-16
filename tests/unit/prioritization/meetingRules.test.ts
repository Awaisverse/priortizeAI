import { classifyMeeting } from '../../../src/prioritization/ruleEngine/meetingRules';
import type { EvaluationContext } from '../../../src/prioritization/ruleEngine/index';
import { mockMeeting } from '../../mocks/unifiedDataMocks';

const baseNow = new Date('2026-06-17T10:00:00.000Z');
const ctx: EvaluationContext = { now: baseNow, aeId: 'ae-001' };

const hoursFromNow = (h: number): string => {
  const d = new Date(baseNow);
  d.setTime(d.getTime() + h * 60 * 60 * 1000);
  return d.toISOString();
};

const endAfter = (startIso: string, durationMinutes = 60): string => {
  const d = new Date(startIso);
  d.setTime(d.getTime() + durationMinutes * 60 * 1000);
  return d.toISOString();
};

describe('meetingRules', () => {
  describe('P0', () => {
    it('classifies external closing call within 4 hours as P0', () => {
      const start = hoursFromNow(2);
      const meeting = mockMeeting({
        startTime: start,
        endTime: endAfter(start),
        type: 'closing_call',
        isExternalMeeting: true,
      });
      const result = classifyMeeting(meeting, ctx);
      expect(result.priority).toBe('P0');
      expect(result.category).toBe('closing_call_imminent');
    });

    it('classifies external meeting within 4 hours as P0', () => {
      const start = hoursFromNow(3);
      const meeting = mockMeeting({
        startTime: start,
        endTime: endAfter(start),
        type: 'prospect_demo',
        isExternalMeeting: true,
      });
      const result = classifyMeeting(meeting, ctx);
      expect(result.priority).toBe('P0');
    });

    it('classifies high-value meeting type within 8 hours as P0', () => {
      const start = hoursFromNow(6);
      const meeting = mockMeeting({
        startTime: start,
        endTime: endAfter(start),
        type: 'closing_call',
        isExternalMeeting: true,
      });
      const result = classifyMeeting(meeting, ctx);
      expect(result.priority).toBe('P0');
    });
  });

  describe('P1', () => {
    it('classifies external meeting within 24 hours as P1', () => {
      const start = hoursFromNow(12);
      const meeting = mockMeeting({
        startTime: start,
        endTime: endAfter(start),
        type: 'customer_call',
        isExternalMeeting: true,
      });
      const result = classifyMeeting(meeting, ctx);
      expect(result.priority).toBe('P1');
      expect(result.category).toBe('external_meeting_tomorrow');
    });

    it('classifies high-value meeting type within 48 hours as P1', () => {
      const start = hoursFromNow(36);
      const meeting = mockMeeting({
        startTime: start,
        endTime: endAfter(start),
        type: 'prospect_demo',
        isExternalMeeting: true,
      });
      const result = classifyMeeting(meeting, ctx);
      expect(result.priority).toBe('P1');
    });
  });

  describe('P2', () => {
    it('classifies external meeting this week as P2', () => {
      const start = hoursFromNow(72);
      const meeting = mockMeeting({
        startTime: start,
        endTime: endAfter(start),
        type: 'customer_call',
        isExternalMeeting: true,
      });
      const result = classifyMeeting(meeting, ctx);
      expect(result.priority).toBe('P2');
      expect(result.category).toBe('external_meeting_this_week');
    });
  });

  describe('P3', () => {
    it('classifies internal meeting as P3', () => {
      const start = hoursFromNow(5);
      const meeting = mockMeeting({
        startTime: start,
        endTime: endAfter(start),
        type: 'internal',
        isExternalMeeting: false,
        attendees: [{ name: 'Colleague', email: 'col@company.com', status: 'accepted' }],
      });
      const result = classifyMeeting(meeting, ctx);
      expect(result.priority).toBe('P3');
      expect(result.category).toBe('internal_meeting');
    });
  });

  describe('P4', () => {
    it('archives past meetings as P4', () => {
      const start = hoursFromNow(-5);
      const meeting = mockMeeting({
        startTime: start,
        endTime: endAfter(start),
        isExternalMeeting: true,
      });
      const result = classifyMeeting(meeting, ctx);
      expect(result.priority).toBe('P4');
      expect(result.category).toBe('past_meeting');
    });

    it('classifies far-future external meeting as P4', () => {
      const start = hoursFromNow(240);
      const meeting = mockMeeting({
        startTime: start,
        endTime: endAfter(start),
        isExternalMeeting: false,
        type: 'other',
        attendees: [{ name: 'Colleague', email: 'col@company.com', status: 'accepted' }],
      });
      const result = classifyMeeting(meeting, ctx);
      expect(result.priority).toBe('P4');
    });
  });

  describe('result structure', () => {
    it('always returns all required fields', () => {
      const result = classifyMeeting(mockMeeting(), ctx);
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('urgencyScore');
      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('rationale');
      expect(Array.isArray(result.risks)).toBe(true);
      expect(Array.isArray(result.opportunities)).toBe(true);
    });
  });
});
