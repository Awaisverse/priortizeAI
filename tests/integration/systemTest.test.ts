/**
 * System Integration Test — full pipeline Phase 1 → 2 → 3 → 4 → 5
 *
 * Feeds realistic HubSpot + Google Calendar fixture data through the entire
 * pipeline using mocked external APIs (no real network calls).
 * Writes a temp report to tests/tmp/ and auto-deletes it in afterAll.
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Module mocks (Jest hoists these above all imports) ──────────────────────

jest.mock('axios', () => {
  const post = jest.fn();
  const get = jest.fn();
  const instance = { post, get };
  const m = {
    __esModule: true,
    create: jest.fn().mockReturnValue(instance),
    isAxiosError: jest.fn().mockReturnValue(false),
    _instance: instance,
  };
  return { ...m, default: m };
});

jest.mock('googleapis', () => {
  const listFn = jest.fn();
  return {
    google: {
      calendar: jest.fn().mockReturnValue({ events: { list: listFn } }),
      auth: { OAuth2: jest.fn() },
    },
    calendar_v3: {},
    _listFn: listFn,
  };
});

jest.mock('@google/generative-ai', () => {
  const generateContent = jest.fn();
  const countTokens = jest.fn();
  const getGenerativeModel = jest.fn().mockReturnValue({ generateContent, countTokens });
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({ getGenerativeModel })),
    _generateContent: generateContent,
    _countTokens: countTokens,
  };
});

jest.mock('@slack/web-api', () => {
  const postMessage = jest.fn();
  return {
    WebClient: jest.fn().mockImplementation(() => ({ chat: { postMessage } })),
    _postMessage: postMessage,
  };
});

// ── Imports ──────────────────────────────────────────────────────────────────

import { DataCollectionService } from '../../src/data-collection/index';
import { PrioritizationService } from '../../src/prioritization/index';
import { AIIntelligenceService } from '../../src/ai-intelligence/index';
import { ReportingService } from '../../src/reporting/index';
import { OrchestratorService } from '../../src/orchestration/index';
import { mockClaudeResponseJson } from '../mocks/anthropicMocks';

// ── Fixture loading ──────────────────────────────────────────────────────────

const FX = path.join(__dirname, '../fixtures');
const dealsFixture = JSON.parse(fs.readFileSync(path.join(FX, 'hubspot-api/deals.json'), 'utf8'));
const tasksFixture = JSON.parse(fs.readFileSync(path.join(FX, 'hubspot-api/tasks.json'), 'utf8'));
const contactsFixture = JSON.parse(fs.readFileSync(path.join(FX, 'hubspot-api/contacts.json'), 'utf8'));
const engagementsFixture = JSON.parse(fs.readFileSync(path.join(FX, 'hubspot-api/engagements.json'), 'utf8'));
const eventsFixture = JSON.parse(fs.readFileSync(path.join(FX, 'google-calendar-api/events.json'), 'utf8'));

// ── Temp file tracking ───────────────────────────────────────────────────────

const TMP_DIR = path.join(__dirname, '../tmp');
const TMP_REPORT = path.join(TMP_DIR, 'system-test-report.md');
const tmpFiles: string[] = [];

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDataCollection(): DataCollectionService {
  return new DataCollectionService({
    hubspotApiKey: 'test-key',
    calendarAuthClient: {} as never,
    calendarId: 'ae-001@company.com',
    userEmail: 'ae-001@company.com',
  });
}

// ── Suite ────────────────────────────────────────────────────────────────────

describe('System Integration — Full Pipeline', () => {
  let mockAxiosPost: jest.Mock;
  let mockGCalList: jest.Mock;
  let mockGeminiGenerate: jest.Mock;
  let mockGeminiCount: jest.Mock;
  let mockSlackPost: jest.Mock;
  let orchestrator: OrchestratorService;

  beforeAll(() => {
    // Grab references to inner mock fns
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mockAxiosPost = require('axios')._instance.post as jest.Mock;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mockGCalList = require('googleapis')._listFn as jest.Mock;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mockGeminiGenerate = require('@google/generative-ai')._generateContent as jest.Mock;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mockGeminiCount = require('@google/generative-ai')._countTokens as jest.Mock;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mockSlackPost = require('@slack/web-api')._postMessage as jest.Mock;

    // HubSpot: route by URL segment
    mockAxiosPost.mockImplementation((url: string) => {
      if (url.includes('/deals/')) return Promise.resolve({ data: dealsFixture });
      if (url.includes('/tasks/')) return Promise.resolve({ data: tasksFixture });
      if (url.includes('/contacts/')) return Promise.resolve({ data: contactsFixture });
      if (url.includes('/engagements/')) return Promise.resolve({ data: engagementsFixture });
      return Promise.reject(new Error(`Unhandled HubSpot URL: ${url}`));
    });

    // Google Calendar
    mockGCalList.mockResolvedValue({ data: { items: eventsFixture.items, nextPageToken: null } });

    // Gemini
    mockGeminiCount.mockResolvedValue({ totalTokens: 1000 });
    mockGeminiGenerate.mockResolvedValue({
      response: {
        text: () => mockClaudeResponseJson,
        usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 500 },
      },
    });

    // Slack
    mockSlackPost.mockResolvedValue({ ok: true, ts: '1000000000.000001' });

    // Ensure tmp dir exists
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }

    // Build a shared orchestrator for pipeline tests
    orchestrator = new OrchestratorService(
      {
        dataCollection: makeDataCollection(),
        prioritization: new PrioritizationService(),
        aiIntelligence: new AIIntelligenceService({ apiKey: 'test-key', model: 'gemini-2.0-flash' }),
        reporting: new ReportingService({
          slack: { botToken: 'xoxb-test', defaultChannelId: 'C0TEST' },
        }),
      },
      { enableAI: true, enableSlack: true, retryAttempts: 1, environment: 'dev' },
    );
  });

  afterAll(() => {
    for (const f of tmpFiles) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {
        // Best-effort cleanup
      }
    }
  });

  // ── Phase 1: Data Collection ───────────────────────────────────────────────

  describe('Phase 1 — Data Collection', () => {
    it('transforms HubSpot deals fixture into 5 canonical Deal objects', async () => {
      const pkg = await makeDataCollection().collect('ae-001');
      expect(pkg.deals).toHaveLength(5);
      expect(pkg.deals[0].source).toBe('hubspot');
      expect(pkg.deals[0].amount).toBeGreaterThan(0);
    });

    it('transforms HubSpot tasks fixture into 4 canonical Task objects', async () => {
      const pkg = await makeDataCollection().collect('ae-001');
      expect(pkg.tasks).toHaveLength(4);
      expect(pkg.tasks.every((t) => t.source === 'hubspot')).toBe(true);
    });

    it('transforms HubSpot contacts fixture into 4 canonical Contact objects', async () => {
      const pkg = await makeDataCollection().collect('ae-001');
      expect(pkg.contacts).toHaveLength(4);
    });

    it('transforms HubSpot engagements fixture into 6 EngagementRecord objects', async () => {
      const pkg = await makeDataCollection().collect('ae-001');
      expect(pkg.engagementHistory).toHaveLength(6);
    });

    it('filters out cancelled calendar events', async () => {
      const pkg = await makeDataCollection().collect('ae-001');
      const totalEvents = eventsFixture.items.length; // 5
      const cancelledCount = eventsFixture.items.filter((e: { status: string }) => e.status === 'cancelled').length; // 1
      expect(pkg.meetings.length).toBeLessThanOrEqual(totalEvents - cancelledCount);
      expect(pkg.meetings.every((m) => m.source === 'google_calendar')).toBe(true);
    });

    it('assembles a UnifiedDataPackage with correct metadata', async () => {
      const pkg = await makeDataCollection().collect('ae-001');
      expect(pkg.aeId).toBe('ae-001');
      expect(pkg.metadata.sources).toContain('hubspot');
      expect(pkg.metadata.recordCount.deals).toBe(5);
      expect(pkg.metadata.dataQuality.score).toBeGreaterThan(0);
    });
  });

  // ── Phase 2: Prioritization ────────────────────────────────────────────────

  describe('Phase 2 — Prioritization', () => {
    it('produces classified activities for every entity', async () => {
      const pkg = await makeDataCollection().collect('ae-001');
      const prioritized = new PrioritizationService().prioritize(pkg);
      const total = pkg.deals.length + pkg.tasks.length + pkg.meetings.length + pkg.contacts.length;
      expect(prioritized.classified).toHaveLength(total);
    });

    it('marks the GlobalTech deal (closes in ≤7 days) as P0', async () => {
      const pkg = await makeDataCollection().collect('ae-001');
      const prioritized = new PrioritizationService().prioritize(pkg);
      // GlobalTech close date is Jun 20 — within 7 days of Jun 17
      const p0Deals = prioritized.classified.filter((c) => c.type === 'deal' && c.priority === 'P0');
      expect(p0Deals.length).toBeGreaterThan(0);
    });

    it('marks the overdue task (due Jun 16) as P0', async () => {
      const pkg = await makeDataCollection().collect('ae-001');
      const prioritized = new PrioritizationService().prioritize(pkg);
      const p0Tasks = prioritized.classified.filter((c) => c.type === 'task' && c.priority === 'P0');
      expect(p0Tasks.length).toBeGreaterThan(0);
    });

    it('produces an executive summary with top risks', async () => {
      const pkg = await makeDataCollection().collect('ae-001');
      const prioritized = new PrioritizationService().prioritize(pkg);
      expect(prioritized.executiveSummary.topRisks.length).toBeGreaterThan(0);
      expect(prioritized.summary.byPriority.P0).toBeGreaterThan(0);
    });

    it('activities are sorted P0 first', async () => {
      const pkg = await makeDataCollection().collect('ae-001');
      const prioritized = new PrioritizationService().prioritize(pkg);
      const scores = prioritized.classified.map((c) => c.scores.priorityScore);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
      }
    });
  });

  // ── Phase 3: AI Intelligence ───────────────────────────────────────────────

  describe('Phase 3 — AI Intelligence', () => {
    it('calls Gemini API and returns parsed IntelligenceBlocks', async () => {
      const pkg = await makeDataCollection().collect('ae-001');
      const prioritized = new PrioritizationService().prioritize(pkg);
      const ai = new AIIntelligenceService({ apiKey: 'test-key', model: 'gemini-2.0-flash' });
      const blocks = await ai.analyze(pkg, prioritized);

      expect(blocks.executiveSummary).toBeDefined();
      expect(blocks.executiveSummary.topPriorities.length).toBeGreaterThan(0);
      expect(blocks.recommendedNextSteps.length).toBeGreaterThan(0);
      expect(blocks.riskAnalysis.length).toBeGreaterThan(0);
      expect(mockGeminiGenerate).toHaveBeenCalled();
    });

    it('performs a token count check before analysis', async () => {
      mockGeminiCount.mockClear();
      const pkg = await makeDataCollection().collect('ae-001');
      const prioritized = new PrioritizationService().prioritize(pkg);
      const ai = new AIIntelligenceService({ apiKey: 'test-key', model: 'gemini-2.0-flash' });
      await ai.analyze(pkg, prioritized);
      expect(mockGeminiCount).toHaveBeenCalledTimes(1);
    });
  });

  // ── Phase 4+5: Orchestration + Reporting ──────────────────────────────────

  describe('Phase 4+5 — Orchestration and Reporting', () => {
    it('full pipeline returns success or partial status', async () => {
      const ctx = await orchestrator.runForAE('ae-001', 'manual');
      expect(['success', 'partial']).toContain(ctx.status);
      expect(ctx.aeId).toBe('ae-001');
      expect(ctx.results.dataPackage).toBeDefined();
      expect(ctx.results.prioritizedActivities).toBeDefined();
    });

    it('pipeline populates module execution states', async () => {
      const ctx = await orchestrator.runForAE('ae-001', 'manual');
      const moduleNames = ctx.modules.map((m) => m.moduleName);
      expect(moduleNames).toContain('DataCollection');
      expect(moduleNames).toContain('Prioritization');
    });

    it('Slack delivery is called once for the report', async () => {
      mockSlackPost.mockClear();
      await orchestrator.runForAE('ae-001', 'manual');
      expect(mockSlackPost).toHaveBeenCalledTimes(1);
    });

    it('generates a non-empty markdown report', async () => {
      const pkg = await makeDataCollection().collect('ae-001');
      const prioritized = new PrioritizationService().prioritize(pkg);
      const reporting = new ReportingService();
      const report = await reporting.generate('ae-001', 'exec-sys-001', pkg, prioritized);

      expect(report.markdown).toBeTruthy();
      expect(report.markdown.length).toBeGreaterThan(200);
      expect(report.aeId).toBe('ae-001');
      expect(report.deliveryStatus).toBe('pending');
    });

    it('writes temp report file to tests/tmp/ and cleans up in afterAll', async () => {
      const pkg = await makeDataCollection().collect('ae-001');
      const prioritized = new PrioritizationService().prioritize(pkg);
      const reporting = new ReportingService();
      const report = await reporting.generate('ae-001', 'exec-sys-001', pkg, prioritized);

      fs.writeFileSync(TMP_REPORT, report.markdown, 'utf8');
      tmpFiles.push(TMP_REPORT);

      expect(fs.existsSync(TMP_REPORT)).toBe(true);
      // afterAll cleans up
    });

    it('completes full pipeline in under 10 seconds (mocked APIs)', async () => {
      const t0 = Date.now();
      await orchestrator.runForAE('ae-001', 'manual');
      expect(Date.now() - t0).toBeLessThan(10000);
    });
  });
});
