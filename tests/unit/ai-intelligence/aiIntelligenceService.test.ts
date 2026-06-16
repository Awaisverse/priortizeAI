import { AIIntelligenceService } from '../../../src/ai-intelligence/index';
import { validateIntelligenceBlocks } from '../../../src/utils/validators';
import { mockUnifiedDataPackage } from '../../mocks/unifiedDataMocks';
import { mockClaudeResponseJson } from '../../mocks/anthropicMocks';

// Mock the Gemini SDK — no real API calls
jest.mock('@google/generative-ai', () => {
  const mockGenerateContent = jest.fn();
  const mockCountTokens = jest.fn();
  const mockGetGenerativeModel = jest.fn().mockReturnValue({
    generateContent: mockGenerateContent,
    countTokens: mockCountTokens,
  });
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
    _mockGenerateContent: mockGenerateContent,
    _mockCountTokens: mockCountTokens,
    _mockGetGenerativeModel: mockGetGenerativeModel,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { _mockGenerateContent, _mockCountTokens, _mockGetGenerativeModel } = require('@google/generative-ai');

import { PrioritizationService } from '../../../src/prioritization/index';

const makeService = () =>
  new AIIntelligenceService({
    apiKey: 'test-gemini-key',
    model: 'gemini-2.0-flash',
    maxTokens: 4096,
    timeoutMs: 30000,
  });

const prioritizer = new PrioritizationService();

const geminiResponse = {
  response: {
    text: () => mockClaudeResponseJson,
    usageMetadata: {
      promptTokenCount: 5000,
      candidatesTokenCount: 800,
      totalTokenCount: 5800,
    },
  },
};

describe('AIIntelligenceService (Gemini)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _mockCountTokens.mockResolvedValue({ totalTokens: 5000 });
    _mockGenerateContent.mockResolvedValue(geminiResponse);
  });

  it('calls Gemini API and returns valid IntelligenceBlocks', async () => {
    const pkg = mockUnifiedDataPackage();
    const prioritized = prioritizer.prioritize(pkg);
    const service = makeService();

    const result = await service.analyze(pkg, prioritized);

    expect(_mockGenerateContent).toHaveBeenCalledTimes(1);
    const validation = validateIntelligenceBlocks(result);
    expect(validation.valid).toBe(true);
  });

  it('passes systemInstruction to getGenerativeModel', async () => {
    const pkg = mockUnifiedDataPackage();
    const prioritized = prioritizer.prioritize(pkg);
    const service = makeService();

    await service.analyze(pkg, prioritized);

    const callArgs = _mockGetGenerativeModel.mock.calls[0][0];
    expect(callArgs.systemInstruction).toBeTruthy();
    expect(typeof callArgs.systemInstruction).toBe('string');
  });

  it('sets packageId and model on result', async () => {
    const pkg = mockUnifiedDataPackage();
    const prioritized = prioritizer.prioritize(pkg);
    const service = makeService();

    const result = await service.analyze(pkg, prioritized);

    expect(result.model).toBe('gemini-2.0-flash');
    expect(result.packageId).toBeTruthy();
  });

  it('still returns result when token count check fails', async () => {
    _mockCountTokens.mockRejectedValue(new Error('token count API error'));
    const pkg = mockUnifiedDataPackage();
    const prioritized = prioritizer.prioritize(pkg);
    const service = makeService();

    const result = await service.analyze(pkg, prioritized);
    expect(result.executiveSummary.summary).toBeTruthy();
  });

  it('throws when Gemini API call fails', async () => {
    _mockGenerateContent.mockRejectedValue(new Error('Gemini API rate limit exceeded'));
    const pkg = mockUnifiedDataPackage();
    const prioritized = prioritizer.prioritize(pkg);
    const service = makeService();

    await expect(service.analyze(pkg, prioritized)).rejects.toThrow('Gemini API rate limit exceeded');
  });

  it('handles malformed JSON response gracefully', async () => {
    _mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Not valid JSON at all!',
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20 },
      },
    });
    const pkg = mockUnifiedDataPackage();
    const prioritized = prioritizer.prioritize(pkg);
    const service = makeService();

    const result = await service.analyze(pkg, prioritized);
    expect(result.executiveSummary.summary).toBe('No summary available.');
    expect(result.meetingInsights).toEqual([]);
  });
});
