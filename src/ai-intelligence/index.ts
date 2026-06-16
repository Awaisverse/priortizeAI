import type { UnifiedDataPackage, PrioritizedActivities, IntelligenceBlocks } from '../models';
import { generateId } from '../utils/helpers';
import { createLogger } from '../utils/logger';
import { validateIntelligenceBlocks } from '../utils/validators';
import { GeminiClient, createGeminiClient } from './geminiClient';
import { buildSystemPrompt, buildAnalysisPrompt } from './promptTemplates';
import { parseClaudeResponse } from './responseParser';

const logger = createLogger('AIIntelligenceService');

const TOKEN_BUDGET = 80000; // ~$0.10 ceiling at sonnet pricing

export interface AIIntelligenceConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  timeoutMs?: number;
}

export class AIIntelligenceService {
  private readonly client: GeminiClient;
  private readonly model: string;

  constructor(config: AIIntelligenceConfig) {
    this.model = config.model;
    this.client = createGeminiClient(config.apiKey, config.model, {
      maxTokens: config.maxTokens ?? 4096,
      timeoutMs: config.timeoutMs ?? 30000,
    });
  }

  async analyze(
    pkg: UnifiedDataPackage,
    prioritized: PrioritizedActivities,
  ): Promise<IntelligenceBlocks> {
    logger.info('Starting AI analysis', { aeId: pkg.aeId, model: this.model });

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildAnalysisPrompt(pkg, prioritized);

    // Pre-flight token check to stay within budget
    try {
      const tokenCount = await this.client.countTokens(systemPrompt, userPrompt);
      logger.info('Token count', { tokenCount, budget: TOKEN_BUDGET, aeId: pkg.aeId });

      if (tokenCount > TOKEN_BUDGET) {
        logger.warn('Token count exceeds budget — analysis may incur higher cost', {
          tokenCount,
          budget: TOKEN_BUDGET,
        });
      }
    } catch (err) {
      logger.warn('Token count check failed — proceeding anyway', {
        error: (err as Error).message,
      });
    }

    try {
      const response = await this.client.complete(systemPrompt, userPrompt);
      const packageId = generateId();

      const blocks = parseClaudeResponse(response.content, packageId, response.model);

      const validation = validateIntelligenceBlocks(blocks);
      if (!validation.valid) {
        logger.warn('Intelligence blocks validation warnings', {
          aeId: pkg.aeId,
          errors: validation.errors,
        });
      }

      logger.info('AI analysis complete', {
        aeId: pkg.aeId,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        durationMs: response.durationMs,
        packageId,
      });

      return blocks;
    } catch (error) {
      logger.error('AI analysis failed', { aeId: pkg.aeId, error: (error as Error).message });
      throw error;
    }
  }
}

export function createAIIntelligenceService(config: AIIntelligenceConfig): AIIntelligenceService {
  return new AIIntelligenceService(config);
}
