import { Pipeline } from '../../../src/orchestration/pipeline';
import { mockUnifiedDataPackage } from '../../mocks/unifiedDataMocks';
import { mockClaudeResponseJson } from '../../mocks/anthropicMocks';
import { parseClaudeResponse } from '../../../src/ai-intelligence/responseParser';
import { PrioritizationService } from '../../../src/prioritization/index';

const prioritizer = new PrioritizationService();
const pkg = mockUnifiedDataPackage();
const prioritized = prioritizer.prioritize(pkg);
const intelligence = parseClaudeResponse(mockClaudeResponseJson, 'pkg-001', 'claude-sonnet-4-6');

const makeMockReport = () => ({
  reportId: 'rpt-001',
  executionId: 'exec-001',
  aeId: 'ae-001',
  generatedAt: new Date().toISOString(),
  markdown: '# Daily Brief\nTest content',
  sections: {
    executiveSummary: true,
    p0Priorities: true,
    meetingPrep: true,
    riskAlerts: true,
    nextSteps: true,
    pipelineSummary: true,
  },
  wordCount: 100,
  deliveryStatus: 'pending' as const,
});

const makeServices = (overrides: Record<string, unknown> = {}) => ({
  dataCollection: {
    collect: jest.fn().mockResolvedValue(pkg),
    getCacheStats: jest.fn().mockReturnValue({ hits: 5, misses: 2, hitRate: 0.71 }),
  },
  prioritization: {
    prioritize: jest.fn().mockReturnValue(prioritized),
  },
  aiIntelligence: {
    analyze: jest.fn().mockResolvedValue(intelligence),
  },
  reporting: {
    generate: jest.fn().mockResolvedValue(makeMockReport()),
    deliver: jest.fn().mockResolvedValue(undefined),
  },
  ...overrides,
});

const makeConfig = (overrides = {}) => ({
  enableAI: true,
  enableSlack: true,
  retryAttempts: 1,
  environment: 'dev' as const,
  ...overrides,
});

describe('Pipeline', () => {
  it('runs all modules successfully', async () => {
    const services = makeServices();
    const pipeline = new Pipeline(services as never, makeConfig());
    const ctx = await pipeline.run('ae-001', 'manual');

    expect(ctx.status).toBe('success');
    expect(services.dataCollection.collect).toHaveBeenCalledWith('ae-001');
    expect(services.prioritization.prioritize).toHaveBeenCalledWith(pkg);
    expect(services.aiIntelligence.analyze).toHaveBeenCalledWith(pkg, prioritized);
    expect(services.reporting.generate).toHaveBeenCalled();
    expect(services.reporting.deliver).toHaveBeenCalled();
  });

  it('skips AI module when enableAI is false', async () => {
    const services = makeServices();
    const pipeline = new Pipeline(services as never, makeConfig({ enableAI: false }));
    const ctx = await pipeline.run('ae-001', 'manual');

    expect(services.aiIntelligence.analyze).not.toHaveBeenCalled();
    const aiModule = ctx.modules.find((m) => m.moduleName === 'AIIntelligence');
    expect(aiModule?.status).toBe('skipped');
    expect(ctx.status).toBe('success');
  });

  it('skips Slack delivery when enableSlack is false', async () => {
    const services = makeServices();
    const pipeline = new Pipeline(services as never, makeConfig({ enableSlack: false }));
    await pipeline.run('ae-001', 'manual');

    expect(services.reporting.deliver).not.toHaveBeenCalled();
  });

  it('marks partial when AI fails but continues to report generation', async () => {
    const services = makeServices({
      aiIntelligence: {
        analyze: jest.fn().mockRejectedValue(new Error('Claude API down')),
      },
    });
    const pipeline = new Pipeline(services as never, makeConfig());
    const ctx = await pipeline.run('ae-001', 'manual');

    expect(ctx.status).toBe('partial');
    expect(services.reporting.generate).toHaveBeenCalled();
    const aiModule = ctx.modules.find((m) => m.moduleName === 'AIIntelligence');
    expect(aiModule?.status).toBe('failed');
  });

  it('marks partial when Slack delivery fails', async () => {
    const services = makeServices({
      reporting: {
        generate: jest.fn().mockResolvedValue(makeMockReport()),
        deliver: jest.fn().mockRejectedValue(new Error('Slack error')),
      },
    });
    const pipeline = new Pipeline(services as never, makeConfig());
    const ctx = await pipeline.run('ae-001', 'manual');

    expect(ctx.status).toBe('partial');
  });

  it('marks failed when data collection throws', async () => {
    const services = makeServices({
      dataCollection: {
        collect: jest.fn().mockRejectedValue(new Error('HubSpot down')),
        getCacheStats: jest.fn(),
      },
    });
    const pipeline = new Pipeline(services as never, makeConfig({ retryAttempts: 1 }));
    const ctx = await pipeline.run('ae-001', 'manual');

    expect(ctx.status).toBe('failed');
  });

  it('records all module states', async () => {
    const services = makeServices();
    const pipeline = new Pipeline(services as never, makeConfig());
    const ctx = await pipeline.run('ae-001', 'manual');

    const moduleNames = ctx.modules.map((m) => m.moduleName);
    expect(moduleNames).toContain('DataCollection');
    expect(moduleNames).toContain('Prioritization');
    expect(moduleNames).toContain('AIIntelligence');
    expect(moduleNames).toContain('ReportGeneration');
    expect(moduleNames).toContain('SlackDelivery');
  });

  it('sets aeId on context', async () => {
    const services = makeServices();
    const pipeline = new Pipeline(services as never, makeConfig());
    const ctx = await pipeline.run('ae-test', 'manual');
    expect(ctx.aeId).toBe('ae-test');
  });
});
