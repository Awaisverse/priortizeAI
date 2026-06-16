import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger } from '../utils/logger';
import { executeWithTimeout } from '../utils/helpers';

const logger = createLogger('GeminiClient');

export interface GeminiClientConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  timeoutMs: number;
}

export interface AIResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  durationMs: number;
}

export class GeminiClient {
  private readonly genAI: GoogleGenerativeAI;
  private readonly config: GeminiClientConfig;

  constructor(config: GeminiClientConfig) {
    this.config = config;
    this.genAI = new GoogleGenerativeAI(config.apiKey);
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<AIResponse> {
    logger.info('Sending request to Gemini', { model: this.config.model });

    const model = this.genAI.getGenerativeModel({
      model: this.config.model,
      systemInstruction: systemPrompt,
      generationConfig: { maxOutputTokens: this.config.maxTokens },
    });

    const { output: result, duration: durationMs } = await executeWithTimeout(
      () => model.generateContent(userPrompt),
      this.config.timeoutMs,
      'GeminiClient',
    );

    const content = result.response.text();
    const usage = result.response.usageMetadata;
    const inputTokens = usage?.promptTokenCount ?? 0;
    const outputTokens = usage?.candidatesTokenCount ?? 0;

    logger.info('Gemini response received', {
      inputTokens,
      outputTokens,
      durationMs,
      model: this.config.model,
    });

    return { content, inputTokens, outputTokens, model: this.config.model, durationMs };
  }

  async countTokens(systemPrompt: string, userPrompt: string): Promise<number> {
    const model = this.genAI.getGenerativeModel({ model: this.config.model });
    const result = await model.countTokens(`${systemPrompt}\n\n${userPrompt}`);
    return result.totalTokens;
  }
}

export function createGeminiClient(
  apiKey: string,
  model: string,
  opts: { maxTokens?: number; timeoutMs?: number } = {},
): GeminiClient {
  return new GeminiClient({
    apiKey,
    model,
    maxTokens: opts.maxTokens ?? 4096,
    timeoutMs: opts.timeoutMs ?? 30000,
  });
}
