/**
 * Full pipeline E2E integration test (no external APIs).
 * Exercises Phase 1 → 2 → 3 → 4 → 5 with mocked external services.
 */
import { Pipeline } from '../../src/orchestration/pipeline';
import { DataAggregator } from '../../src/data-collection/aggregator';
import { PrioritizationService } from '../../src/prioritization/index';
import { parseClaudeResponse } from '../../src/ai-intelligence/responseParser';
import { ReportingService } from '../../src/reporting/index';
import { validatePrioritizedActivities, validateIntelligenceBlocks } from '../../src/utils/validators';
import { mockDeal, mockTask, mockMeeting, mockContact, mockEngagement } from '../mocks/unifiedDataMocks';
import { mockClaudeResponseJson } from '../mocks/anthropicMocks';

const addDays = (n: number): string => {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString();
};

const aggregator = new DataAggregator();
const prioritizer = new PrioritizationService();
const intelligence = parseClaudeResponse(mockClaudeResponseJson, 'pkg-e2e', 'claude-sonnet-4-6');
const reporting = new ReportingService();

function makeDataPackage() {
  return aggregator.aggregate({
    aeId: 'ae-e2e',
    deals: [
      mockDeal({ id: 'd1', closeDate: addDays(2), status: 'open', amount: 120000 }),
      mockDeal({ id: 'd2', hubspotId: 'hs2', closeDate: addDays(20), status: 'open', amount: 50000 }),
    ],
    tasks: [
      mockTask({ id: 't1', dueDate: addDays(-1), status: 'pending' }),
      mockTask({ id: 't2', hubspotId: 'hs-t2', dueDate: addDays(3), status: 'pending' }),
    ],
    meetings: [mockMeeting()],
    contacts: [mockContact()],
    engagements: [mockEngagement()],
  });
}

describe('Full pipeline integration (Phase 1 → 5)', () => {
  it('produces a valid report from realistic AE data', async () => {
    const pkg = makeDataPackage();
    const prioritized = prioritizer.prioritize(pkg);

    expect(validatePrioritizedActivities(prioritized).valid).toBe(true);
    expect(validateIntelligenceBlocks(intelligence).valid).toBe(true);

    const report = await reporting.generate('ae-e2e', 'exec-e2e', pkg, prioritized, intelligence);

    expect(report.reportId).toBeTruthy();
    expect(report.markdown.length).toBeGreaterThan(100);
    expect(report.wordCount).toBeGreaterThan(50);
    expect(report.deliveryStatus).toBe('pending');
  });

  it('full Pipeline.run() succeeds with mocked services', async () => {
    const pkg = makeDataPackage();
    const prioritized = prioritizer.prioritize(pkg);

    const mockReport = await reporting.generate('ae-e2e', 'exec-001', pkg, prioritized, intelligence);

    const services = {
      dataCollection: {
        collect: jest.fn().mockResolvedValue(pkg),
        getCacheStats: jest.fn().mockReturnValue({ hits: 0, misses: 5, hitRate: 0 }),
      },
      prioritization: { prioritize: jest.fn().mockReturnValue(prioritized) },
      aiIntelligence: { analyze: jest.fn().mockResolvedValue(intelligence) },
      reporting: {
        generate: jest.fn().mockResolvedValue(mockReport),
        deliver: jest.fn().mockResolvedValue(undefined),
      },
    };

    const pipeline = new Pipeline(services as never, {
      enableAI: true,
      enableSlack: true,
      retryAttempts: 1,
      environment: 'dev',
    });

    const ctx = await pipeline.run('ae-e2e', 'manual');

    expect(ctx.status).toBe('success');
    expect(ctx.aeId).toBe('ae-e2e');
    expect(ctx.modules.some((m) => m.moduleName === 'DataCollection' && m.status === 'success')).toBe(true);
    expect(ctx.modules.some((m) => m.moduleName === 'Prioritization' && m.status === 'success')).toBe(true);
    expect(ctx.modules.some((m) => m.moduleName === 'AIIntelligence' && m.status === 'success')).toBe(true);
    expect(ctx.modules.some((m) => m.moduleName === 'ReportGeneration' && m.status === 'success')).toBe(true);
    expect(ctx.modules.some((m) => m.moduleName === 'SlackDelivery' && m.status === 'success')).toBe(true);
    expect(ctx.errors).toHaveLength(0);
  });

  it('pipeline completes within 5 seconds (performance check)', async () => {
    const pkg = makeDataPackage();
    const prioritized = prioritizer.prioritize(pkg);
    const mockReport = await reporting.generate('ae-e2e', 'exec-001', pkg, prioritized);

    const services = {
      dataCollection: { collect: jest.fn().mockResolvedValue(pkg), getCacheStats: jest.fn() },
      prioritization: { prioritize: jest.fn().mockReturnValue(prioritized) },
      reporting: {
        generate: jest.fn().mockResolvedValue(mockReport),
        deliver: jest.fn().mockResolvedValue(undefined),
      },
    };

    const pipeline = new Pipeline(services as never, {
      enableAI: false,
      enableSlack: false,
      retryAttempts: 1,
      environment: 'dev',
    });

    const start = Date.now();
    const ctx = await pipeline.run('ae-e2e', 'manual');
    const elapsed = Date.now() - start;

    expect(ctx.status).toBe('success');
    expect(elapsed).toBeLessThan(5000);
  });

  it('gracefully degrades when AI fails — report still generated', async () => {
    const pkg = makeDataPackage();
    const prioritized = prioritizer.prioritize(pkg);
    const mockReport = await reporting.generate('ae-e2e', 'exec-001', pkg, prioritized);

    const services = {
      dataCollection: { collect: jest.fn().mockResolvedValue(pkg), getCacheStats: jest.fn() },
      prioritization: { prioritize: jest.fn().mockReturnValue(prioritized) },
      aiIntelligence: { analyze: jest.fn().mockRejectedValue(new Error('Claude timeout')) },
      reporting: {
        generate: jest.fn().mockResolvedValue(mockReport),
        deliver: jest.fn().mockResolvedValue(undefined),
      },
    };

    const pipeline = new Pipeline(services as never, {
      enableAI: true,
      enableSlack: false,
      retryAttempts: 1,
      environment: 'dev',
    });

    const ctx = await pipeline.run('ae-e2e', 'manual');

    expect(ctx.status).toBe('partial');
    expect(services.reporting.generate).toHaveBeenCalled();
    const aiModule = ctx.modules.find((m) => m.moduleName === 'AIIntelligence');
    expect(aiModule?.status).toBe('failed');
  });
});
