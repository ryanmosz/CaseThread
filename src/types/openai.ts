/**
 * OpenAI-specific type definitions for document generation
 */

/**
 * Configuration options for OpenAI service
 */
export interface OpenAIConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Model to use (e.g., 'o3', 'gpt-4') */
  model: string;
  /** Temperature for generation (0-2) */
  temperature: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Result of document generation
 */
export interface GenerationResult {
  /** Generated document content in markdown */
  content: string;
  /** Token usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  /** Generation metadata */
  metadata: {
    model: string;
    temperature: number;
    generatedAt: Date;
  };
}

/**
 * Custom error class for OpenAI-related errors
 */
export class OpenAIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
} 