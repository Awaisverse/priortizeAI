import { SlackDelivery } from '../../../src/reporting/slackDelivery';
import type { Report } from '../../../src/models';

// ── Mock @slack/web-api ──────────────────────────────────────────────────────

const mockPostMessage = jest.fn();

jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    chat: { postMessage: mockPostMessage },
  })),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    reportId: 'report-001',
    executionId: 'exec-001',
    aeId: 'ae-001',
    generatedAt: new Date().toISOString(),
    markdown: '## Executive Summary\n\nThree P0 items require immediate action today.\n\n## P0 Priorities\n\n- Close GlobalTech deal\n- Follow up FinServ\n',
    sections: {
      executiveSummary: true,
      p0Priorities: true,
      meetingPrep: false,
      riskAlerts: false,
      nextSteps: false,
      pipelineSummary: false,
    },
    wordCount: 15,
    deliveryStatus: 'pending',
    ...overrides,
  };
}

const LONG_MARKDOWN = Array.from({ length: 60 }, (_, i) =>
  `## Section ${i}\n\nContent for section ${i} with enough text to make it long.`,
).join('\n\n');

// ── Suite ────────────────────────────────────────────────────────────────────

describe('SlackDelivery', () => {
  let delivery: SlackDelivery;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPostMessage.mockResolvedValue({ ok: true, ts: 'ts-001' });
    delivery = new SlackDelivery({ botToken: 'xoxb-test', defaultChannelId: 'C123' });
  });

  describe('send — basic behavior', () => {
    it('sends a message using the default channel when no target provided', async () => {
      await delivery.send(makeReport());
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'C123' }),
      );
    });

    it('uses the target userId when provided', async () => {
      await delivery.send(makeReport(), { userId: 'U456' });
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'U456' }),
      );
    });

    it('uses target channelId over default channel', async () => {
      await delivery.send(makeReport(), { channelId: 'C789' });
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'C789' }),
      );
    });

    it('throws when no channel is configured and no target provided', async () => {
      const noChannelDelivery = new SlackDelivery({ botToken: 'xoxb-test' });
      await expect(noChannelDelivery.send(makeReport())).rejects.toThrow(
        /No Slack target provided/,
      );
    });

    it('sends a postMessage with mrkdwn blocks', async () => {
      await delivery.send(makeReport());
      const call = mockPostMessage.mock.calls[0][0];
      expect(call.blocks).toBeDefined();
      expect(call.blocks[0].type).toBe('section');
      expect(call.blocks[0].text.type).toBe('mrkdwn');
    });
  });

  describe('send — short content (single message)', () => {
    it('sends exactly 1 message for short markdown (≤3000 chars)', async () => {
      await delivery.send(makeReport());
      expect(mockPostMessage).toHaveBeenCalledTimes(1);
    });

    it('does not send threaded replies for short content', async () => {
      await delivery.send(makeReport());
      const calls = mockPostMessage.mock.calls;
      // None of the calls should have thread_ts
      for (const [args] of calls) {
        expect(args).not.toHaveProperty('thread_ts');
      }
    });
  });

  describe('send — long content (chunked into thread)', () => {
    it('sends multiple messages for markdown exceeding 3000 chars', async () => {
      await delivery.send(makeReport({ markdown: LONG_MARKDOWN }));
      expect(mockPostMessage.mock.calls.length).toBeGreaterThan(1);
    });

    it('sends threaded replies using the ts from the first message', async () => {
      await delivery.send(makeReport({ markdown: LONG_MARKDOWN }));
      const calls = mockPostMessage.mock.calls;
      expect(calls.length).toBeGreaterThan(1);
      for (const [args] of calls.slice(1)) {
        expect(args.thread_ts).toBe('ts-001');
      }
    });

    it('first message has no thread_ts', async () => {
      await delivery.send(makeReport({ markdown: LONG_MARKDOWN }));
      const firstCall = mockPostMessage.mock.calls[0][0];
      expect(firstCall).not.toHaveProperty('thread_ts');
    });
  });

  describe('send — error handling', () => {
    it('throws on Slack API error', async () => {
      mockPostMessage.mockRejectedValue(new Error('Slack API unavailable'));
      await expect(delivery.send(makeReport())).rejects.toThrow('Slack API unavailable');
    });
  });
});
