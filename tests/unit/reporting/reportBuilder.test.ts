import { ReportBuilder } from '../../../src/reporting/reportBuilder';
import { PrioritizationService } from '../../../src/prioritization/index';
import { parseClaudeResponse } from '../../../src/ai-intelligence/responseParser';
import { DataAggregator } from '../../../src/data-collection/aggregator';
import { mockClaudeResponseJson } from '../../mocks/anthropicMocks';
import { mockDeal, mockTask, mockMeeting, mockContact, mockEngagement } from '../../mocks/unifiedDataMocks';

const addDays = (n: number): string => {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString();
};

const aggregator = new DataAggregator();
const prioritizer = new PrioritizationService();
const builder = new ReportBuilder();
const intelligence = parseClaudeResponse(mockClaudeResponseJson, 'pkg-001', 'claude-sonnet-4-6');

function makePackage() {
  return aggregator.aggregate({
    aeId: 'ae-001',
    deals: [mockDeal({ closeDate: addDays(3), status: 'open', amount: 100000 })],
    tasks: [mockTask({ dueDate: addDays(-1), status: 'pending' })],
    meetings: [mockMeeting()],
    contacts: [mockContact()],
    engagements: [mockEngagement()],
  });
}

describe('ReportBuilder', () => {
  it('builds a report with all required fields', () => {
    const pkg = makePackage();
    const prioritized = prioritizer.prioritize(pkg);
    const report = builder.build('ae-001', 'exec-001', pkg, prioritized, intelligence);

    expect(report.reportId).toBeTruthy();
    expect(report.aeId).toBe('ae-001');
    expect(report.executionId).toBe('exec-001');
    expect(report.markdown).toBeTruthy();
    expect(report.wordCount).toBeGreaterThan(0);
    expect(report.deliveryStatus).toBe('pending');
  });

  it('markdown contains report header', () => {
    const pkg = makePackage();
    const prioritized = prioritizer.prioritize(pkg);
    const report = builder.build('ae-001', 'exec-001', pkg, prioritized);
    expect(report.markdown).toContain('AE Daily Brief');
  });

  it('includes executive summary section', () => {
    const pkg = makePackage();
    const prioritized = prioritizer.prioritize(pkg);
    const report = builder.build('ae-001', 'exec-001', pkg, prioritized);
    expect(report.sections.executiveSummary).toBe(true);
    expect(report.markdown).toContain('Executive Summary');
  });

  it('includes P0 section when there are P0 items', () => {
    const pkg = makePackage();
    const prioritized = prioritizer.prioritize(pkg);
    const report = builder.build('ae-001', 'exec-001', pkg, prioritized);
    if (prioritized.summary.byPriority.P0 > 0) {
      expect(report.sections.p0Priorities).toBe(true);
      expect(report.markdown).toContain('Critical Actions');
    }
  });

  it('includes pipeline summary table with deal names', () => {
    const pkg = makePackage();
    const prioritized = prioritizer.prioritize(pkg);
    const report = builder.build('ae-001', 'exec-001', pkg, prioritized);
    expect(report.sections.pipelineSummary).toBe(true);
    expect(report.markdown).toContain('Pipeline Summary');
    expect(report.markdown).toContain('Acme Corp');
  });

  it('includes AI insights when intelligence provided', () => {
    const pkg = makePackage();
    const prioritized = prioritizer.prioritize(pkg);
    const report = builder.build('ae-001', 'exec-001', pkg, prioritized, intelligence);
    expect(report.markdown).toContain(intelligence.executiveSummary.summary.slice(0, 30));
  });

  it('builds report without AI intelligence gracefully', () => {
    const pkg = makePackage();
    const prioritized = prioritizer.prioritize(pkg);
    const report = builder.build('ae-001', 'exec-001', pkg, prioritized);
    expect(report.markdown).toBeTruthy();
    expect(report.wordCount).toBeGreaterThan(0);
  });

  it('sections.riskAlerts is true when intelligence has risks', () => {
    const pkg = makePackage();
    const prioritized = prioritizer.prioritize(pkg);
    const report = builder.build('ae-001', 'exec-001', pkg, prioritized, intelligence);
    expect(report.sections.riskAlerts).toBe(true);
  });

  it('each build produces a unique reportId', () => {
    const pkg = makePackage();
    const prioritized = prioritizer.prioritize(pkg);
    const r1 = builder.build('ae-001', 'exec-001', pkg, prioritized);
    const r2 = builder.build('ae-001', 'exec-001', pkg, prioritized);
    expect(r1.reportId).not.toBe(r2.reportId);
  });

  it('generatedAt is a valid ISO date', () => {
    const pkg = makePackage();
    const prioritized = prioritizer.prioritize(pkg);
    const report = builder.build('ae-001', 'exec-001', pkg, prioritized);
    expect(() => new Date(report.generatedAt)).not.toThrow();
  });

  it('handles empty package without throwing', () => {
    const pkg = aggregator.aggregate({
      aeId: 'ae-empty',
      deals: [],
      tasks: [],
      meetings: [],
      contacts: [],
      engagements: [],
    });
    const prioritized = prioritizer.prioritize(pkg);
    const report = builder.build('ae-empty', 'exec-001', pkg, prioritized);
    expect(report.markdown).toContain('AE Daily Brief');
    expect(report.sections.pipelineSummary).toBe(false);
  });
});
