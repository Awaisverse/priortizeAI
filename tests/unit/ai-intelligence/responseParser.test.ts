import { parseClaudeResponse } from '../../../src/ai-intelligence/responseParser';
import { validateIntelligenceBlocks } from '../../../src/utils/validators';
import { mockClaudeResponseJson } from '../../mocks/anthropicMocks';

const PKG_ID = 'pkg-test-001';
const MODEL = 'claude-sonnet-4-6';

describe('parseClaudeResponse', () => {
  it('parses a valid JSON response into IntelligenceBlocks', () => {
    const result = parseClaudeResponse(mockClaudeResponseJson, PKG_ID, MODEL);
    expect(result.executiveSummary.summary).toBeTruthy();
    expect(result.meetingInsights.length).toBeGreaterThan(0);
    expect(result.intentAnalysis.length).toBeGreaterThan(0);
    expect(result.riskAnalysis.length).toBeGreaterThan(0);
    expect(result.recommendedNextSteps.length).toBeGreaterThan(0);
    expect(result.insights.length).toBeGreaterThan(0);
  });

  it('output passes schema validation', () => {
    const result = parseClaudeResponse(mockClaudeResponseJson, PKG_ID, MODEL);
    const validation = validateIntelligenceBlocks(result);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('sets packageId and model correctly', () => {
    const result = parseClaudeResponse(mockClaudeResponseJson, PKG_ID, MODEL);
    expect(result.packageId).toBe(PKG_ID);
    expect(result.model).toBe(MODEL);
  });

  it('returns fallback structure on invalid JSON', () => {
    const result = parseClaudeResponse('NOT VALID JSON !!!', PKG_ID, MODEL);
    expect(result.executiveSummary.summary).toBe('No summary available.');
    expect(result.meetingInsights).toEqual([]);
    expect(result.intentAnalysis).toEqual([]);
  });

  it('strips markdown code fences before parsing', () => {
    const withFences = '```json\n' + mockClaudeResponseJson + '\n```';
    const result = parseClaudeResponse(withFences, PKG_ID, MODEL);
    expect(result.executiveSummary.summary).toBeTruthy();
  });

  it('clamps confidence to [0, 1]', () => {
    const data = {
      ...JSON.parse(mockClaudeResponseJson),
      intentAnalysis: [
        { contactId: 'c1', name: 'Test', intent: 'buying', confidence: 1.5, signals: [], recommendation: 'Act' },
      ],
    };
    const result = parseClaudeResponse(JSON.stringify(data), PKG_ID, MODEL);
    expect(result.intentAnalysis[0].confidence).toBeLessThanOrEqual(1);
  });

  it('defaults invalid intent to "unknown"', () => {
    const data = {
      ...JSON.parse(mockClaudeResponseJson),
      intentAnalysis: [
        { contactId: 'c1', name: 'Test', intent: 'invalid_intent', confidence: 0.5, signals: [], recommendation: 'Act' },
      ],
    };
    const result = parseClaudeResponse(JSON.stringify(data), PKG_ID, MODEL);
    expect(result.intentAnalysis[0].intent).toBe('unknown');
  });

  it('defaults invalid severity to "medium"', () => {
    const data = {
      ...JSON.parse(mockClaudeResponseJson),
      riskAnalysis: [
        { riskId: 'r1', severity: 'ultra_critical', description: 'Risk', mitigationSteps: [] },
      ],
    };
    const result = parseClaudeResponse(JSON.stringify(data), PKG_ID, MODEL);
    expect(result.riskAnalysis[0].severity).toBe('medium');
  });

  it('defaults invalid priority to "P3"', () => {
    const data = {
      ...JSON.parse(mockClaudeResponseJson),
      recommendedNextSteps: [
        { priority: 'URGENT', action: 'Do something', rationale: 'Because', expectedOutcome: 'Done', suggestedTiming: 'Now' },
      ],
    };
    const result = parseClaudeResponse(JSON.stringify(data), PKG_ID, MODEL);
    expect(result.recommendedNextSteps[0].priority).toBe('P3');
  });

  it('handles missing optional sections gracefully', () => {
    const minimal = JSON.stringify({ executiveSummary: { summary: 'Ok', keyMetrics: [], topPriorities: [] } });
    const result = parseClaudeResponse(minimal, PKG_ID, MODEL);
    expect(result.meetingInsights).toEqual([]);
    expect(result.riskAnalysis).toEqual([]);
    expect(result.insights).toEqual([]);
  });

  it('always has timestamp', () => {
    const result = parseClaudeResponse(mockClaudeResponseJson, PKG_ID, MODEL);
    expect(result.timestamp).toBeTruthy();
    expect(() => new Date(result.timestamp)).not.toThrow();
  });
});
