import { StateManager } from '../../../src/orchestration/stateManager';

describe('StateManager', () => {
  let sm: StateManager;

  beforeEach(() => {
    sm = new StateManager('ae-001', 'manual', 'dev');
  });

  it('initialises with pending status', () => {
    expect(sm.getContext().status).toBe('pending');
  });

  it('generates a unique executionId', () => {
    const sm2 = new StateManager('ae-002', 'manual', 'dev');
    expect(sm.executionId).not.toBe(sm2.executionId);
  });

  it('transitions to running', () => {
    sm.markRunning();
    expect(sm.getContext().status).toBe('running');
  });

  it('transitions to success and sets endTime + duration', () => {
    sm.markRunning();
    sm.markSuccess();
    const ctx = sm.getContext();
    expect(ctx.status).toBe('success');
    expect(ctx.endTime).toBeTruthy();
    expect(ctx.duration).toBeGreaterThanOrEqual(0);
  });

  it('transitions to failed', () => {
    sm.markRunning();
    sm.markFailed();
    expect(sm.getContext().status).toBe('failed');
  });

  it('transitions to partial', () => {
    sm.markRunning();
    sm.markPartial();
    expect(sm.getContext().status).toBe('partial');
  });

  it('tracks module lifecycle: start → complete', () => {
    sm.startModule('DataCollection');
    sm.completeModule('DataCollection', 1024);
    const ctx = sm.getContext();
    const mod = ctx.modules.find((m) => m.moduleName === 'DataCollection');
    expect(mod?.status).toBe('success');
    expect(mod?.outputSize).toBe(1024);
    expect(mod?.duration).toBeGreaterThanOrEqual(0);
  });

  it('tracks module failure', () => {
    sm.startModule('Prioritization');
    sm.failModule('Prioritization', new Error('oops'));
    const ctx = sm.getContext();
    const mod = ctx.modules.find((m) => m.moduleName === 'Prioritization');
    expect(mod?.status).toBe('failed');
    expect(mod?.errorMessage).toBe('oops');
    expect(ctx.errors.length).toBe(1);
    expect(ctx.errors[0].module).toBe('Prioritization');
  });

  it('skips module with reason', () => {
    sm.skipModule('AIIntelligence', 'AI disabled');
    const ctx = sm.getContext();
    const mod = ctx.modules.find((m) => m.moduleName === 'AIIntelligence');
    expect(mod?.status).toBe('skipped');
    expect(mod?.errorMessage).toBe('AI disabled');
  });

  it('separates errors from warnings', () => {
    sm.addError('Mod', 'error', 'hard failure');
    sm.addError('Mod', 'warning', 'soft issue');
    const ctx = sm.getContext();
    expect(ctx.errors).toHaveLength(1);
    expect(ctx.warnings).toHaveLength(1);
  });

  it('setResults merges without overwriting unrelated keys', () => {
    const pkg = { aeId: 'ae-001' } as never;
    sm.setResults({ dataPackage: pkg });
    sm.setResults({ prioritizedActivities: { packageId: 'p1' } as never });
    const ctx = sm.getContext();
    expect(ctx.results.dataPackage).toBeDefined();
    expect(ctx.results.prioritizedActivities).toBeDefined();
  });

  it('updates DataCollection metric from completeModule', () => {
    sm.startModule('DataCollection');
    sm.completeModule('DataCollection');
    const ctx = sm.getContext();
    expect(ctx.metrics.dataCollectionTime).toBeGreaterThanOrEqual(0);
  });

  it('getContext returns a copy (not mutable reference)', () => {
    sm.markRunning();
    const ctx1 = sm.getContext();
    sm.markSuccess();
    const ctx2 = sm.getContext();
    expect(ctx1.status).toBe('running');
    expect(ctx2.status).toBe('success');
  });
});
