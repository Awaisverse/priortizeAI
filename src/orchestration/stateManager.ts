import type { ExecutionContext, ModuleExecutionState, ErrorRecord, PerformanceMetrics } from '../models';
import { generateId, nowISO } from '../utils/helpers';
import { createLogger } from '../utils/logger';

const logger = createLogger('StateManager');

const EMPTY_METRICS: PerformanceMetrics = {
  dataCollectionTime: 0,
  prioritizationTime: 0,
  aiIntelligenceTime: 0,
  reportGenerationTime: 0,
  totalTime: 0,
  cacheHitRate: 0,
  apiCallCount: 0,
};

export class StateManager {
  private ctx: ExecutionContext;

  constructor(aeId: string, trigger: ExecutionContext['trigger'], environment: ExecutionContext['environment']) {
    this.ctx = {
      executionId: generateId(),
      aeId,
      startTime: nowISO(),
      status: 'pending',
      modules: [],
      results: {},
      errors: [],
      warnings: [],
      metrics: { ...EMPTY_METRICS },
      trigger,
      environment,
    };
    logger.info('Execution context created', { executionId: this.ctx.executionId, aeId });
  }

  get executionId(): string {
    return this.ctx.executionId;
  }

  getContext(): ExecutionContext {
    return { ...this.ctx };
  }

  markRunning(): void {
    this.ctx.status = 'running';
  }

  markSuccess(): void {
    this.ctx.status = 'success';
    this.ctx.endTime = nowISO();
    this.ctx.duration = this.ctx.endTime
      ? Date.now() - new Date(this.ctx.startTime).getTime()
      : undefined;
    this.ctx.metrics.totalTime = this.ctx.duration ?? 0;
  }

  markFailed(): void {
    this.ctx.status = 'failed';
    this.ctx.endTime = nowISO();
    this.ctx.duration = Date.now() - new Date(this.ctx.startTime).getTime();
    this.ctx.metrics.totalTime = this.ctx.duration;
  }

  markPartial(): void {
    this.ctx.status = 'partial';
    this.ctx.endTime = nowISO();
    this.ctx.duration = Date.now() - new Date(this.ctx.startTime).getTime();
    this.ctx.metrics.totalTime = this.ctx.duration;
  }

  startModule(moduleName: string): void {
    const state: ModuleExecutionState = {
      moduleName,
      status: 'running',
      startTime: nowISO(),
    };
    this.ctx.modules.push(state);
  }

  completeModule(moduleName: string, outputSize?: number): void {
    const mod = this.findModule(moduleName);
    if (mod) {
      mod.status = 'success';
      mod.endTime = nowISO();
      mod.duration = Date.now() - new Date(mod.startTime).getTime();
      mod.outputSize = outputSize;
      this.updateMetric(moduleName, mod.duration);
    }
  }

  failModule(moduleName: string, error: Error): void {
    const mod = this.findModule(moduleName);
    if (mod) {
      mod.status = 'failed';
      mod.endTime = nowISO();
      mod.duration = Date.now() - new Date(mod.startTime).getTime();
      mod.errorMessage = error.message;
    }
    this.addError(moduleName, 'error', error.message);
  }

  skipModule(moduleName: string, reason: string): void {
    this.ctx.modules.push({
      moduleName,
      status: 'skipped',
      startTime: nowISO(),
      endTime: nowISO(),
      errorMessage: reason,
    });
  }

  addError(module: string, severity: ErrorRecord['severity'], message: string, details?: Record<string, unknown>): void {
    const record: ErrorRecord = {
      timestamp: nowISO(),
      module,
      severity,
      message,
      details,
    };
    if (severity === 'error') {
      this.ctx.errors.push(record);
    } else {
      this.ctx.warnings.push(record);
    }
  }

  setResults(results: Partial<ExecutionContext['results']>): void {
    this.ctx.results = { ...this.ctx.results, ...results };
  }

  updateMetrics(updates: Partial<PerformanceMetrics>): void {
    this.ctx.metrics = { ...this.ctx.metrics, ...updates };
  }

  private findModule(name: string): ModuleExecutionState | undefined {
    return [...this.ctx.modules].reverse().find((m) => m.moduleName === name);
  }

  private updateMetric(moduleName: string, durationMs: number): void {
    switch (moduleName) {
      case 'DataCollection':
        this.ctx.metrics.dataCollectionTime = durationMs;
        break;
      case 'Prioritization':
        this.ctx.metrics.prioritizationTime = durationMs;
        break;
      case 'AIIntelligence':
        this.ctx.metrics.aiIntelligenceTime = durationMs;
        break;
      case 'ReportGeneration':
        this.ctx.metrics.reportGenerationTime = durationMs;
        break;
    }
  }
}
