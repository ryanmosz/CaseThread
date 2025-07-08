/**
 * Embeddings Service - Generate embeddings for vector similarity search
 * Uses OpenAI's text-embedding-3-small model for efficient embeddings
 */

import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retry';

export interface EmbeddingsConfig {
  model?: string;
  apiKey?: string;
  maxRetries?: number;
  enableLogging?: boolean;
}

class EmbeddingsService {
  private openai: OpenAI;
  private config: Required<EmbeddingsConfig>;

  constructor(config: EmbeddingsConfig = {}) {
    this.config = {
      model: config.model || 'text-embedding-3-small',
      apiKey: config.apiKey || process.env.OPENAI_API_KEY || '',
      maxRetries: config.maxRetries || 3,
      enableLogging: config.enableLogging ?? true
    };

    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required for embeddings generation');
    }

    this.openai = new OpenAI({
      apiKey: this.config.apiKey
    });

    if (this.config.enableLogging) {
      logger.info('EmbeddingsService initialized', {
        model: this.config.model,
        maxRetries: this.config.maxRetries
      });
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty for embedding generation');
    }

    try {
      const result = await withRetry(
        async () => {
          const response = await this.openai.embeddings.create({
            model: this.config.model,
            input: text.trim()
          });

          if (!response.data || response.data.length === 0) {
            throw new Error('No embedding data received from OpenAI');
          }

          return response.data[0].embedding;
        },
        {
          maxAttempts: this.config.maxRetries,
          delayMs: 1000,
          backoffMultiplier: 2,
          maxDelayMs: 10000
        }
      );

      if (this.config.enableLogging) {
        logger.debug('Embedding generated successfully', {
          textLength: text.length,
          embeddingDimension: result.length
        });
      }

      return result;
    } catch (error) {
      logger.error('Failed to generate embedding', { 
        textLength: text.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    // Filter out empty texts
    const validTexts = texts.filter(text => text && text.trim().length > 0);
    
    if (validTexts.length === 0) {
      throw new Error('No valid texts provided for embedding generation');
    }

    try {
      const result = await withRetry(
        async () => {
          const response = await this.openai.embeddings.create({
            model: this.config.model,
            input: validTexts.map(text => text.trim())
          });

          if (!response.data || response.data.length !== validTexts.length) {
            throw new Error('Embedding response does not match input count');
          }

          return response.data.map(item => item.embedding);
        },
        {
          maxAttempts: this.config.maxRetries,
          delayMs: 1000,
          backoffMultiplier: 2,
          maxDelayMs: 10000
        }
      );

      if (this.config.enableLogging) {
        logger.debug('Batch embeddings generated successfully', {
          count: validTexts.length,
          embeddingDimension: result[0]?.length || 0
        });
      }

      return result;
    } catch (error) {
      logger.error('Failed to generate batch embeddings', { 
        count: validTexts.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return similarity;
  }

  /**
   * Get the embedding model being used
   */
  getModel(): string {
    return this.config.model;
  }

  /**
   * Get embedding dimension for the current model
   */
  getEmbeddingDimension(): number {
    // Known dimensions for OpenAI models
    const modelDimensions: Record<string, number> = {
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072,
      'text-embedding-ada-002': 1536
    };

    return modelDimensions[this.config.model] || 1536;
  }

  /**
   * Estimate token count for embedding (rough approximation)
   */
  estimateTokenCount(text: string): number {
    // Very rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}

// Lazy singleton instance
let embeddingsService: EmbeddingsService | null = null;

function getEmbeddingsService(): EmbeddingsService {
  if (!embeddingsService) {
    embeddingsService = new EmbeddingsService();
  }
  return embeddingsService;
}

// Export both the service and a convenience function
export { EmbeddingsService };
export const generateEmbedding = (text: string): Promise<number[]> => 
  getEmbeddingsService().generateEmbedding(text);

export const generateEmbeddings = (texts: string[]): Promise<number[][]> => 
  getEmbeddingsService().generateEmbeddings(texts); 