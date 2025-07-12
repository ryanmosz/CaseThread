/**
 * OpenAI integration service for document generation
 * 
 * @example
 * ```typescript
 * const service = new OpenAIService({
 *   apiKey: 'sk-...',
 *   model: 'o3',
 *   temperature: 0.2
 * });
 * 
 * const result = await service.generateDocument(
 *   template,
 *   explanation,
 *   yamlData,
 *   contextBundle
 * );
 * ```
 */

import OpenAI from 'openai';
import { OpenAIConfig, GenerationResult, OpenAIError } from '../types/openai';
import { Template, YamlData } from '../types';
import { ContextBundle } from '../types/agents';
import { logger } from '../utils/logger';
import { withRetry, withTimeout } from '../utils/retry';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class OpenAIService {
  private client: OpenAI;
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.validateConfig(config);
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout || 60000,
    });
    logger.info('OpenAI service initialized', {
      model: config.model,
      temperature: config.temperature
    });
  }

  /**
   * Validate service configuration
   */
  private validateConfig(config: OpenAIConfig): void {
    if (!config.apiKey) {
      throw new OpenAIError('OpenAI API key is required');
    }
    if (!config.model) {
      throw new OpenAIError('OpenAI model is required');
    }
    if (config.temperature === undefined) {
      throw new OpenAIError('Temperature setting is required');
    }
  }

  /**
   * Generate a legal document using OpenAI
   */
  async generateDocument(
    template: Template,
    explanation: string,
    yamlData: YamlData,
    contextBundle?: ContextBundle
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      // Build the prompt with context
      const prompt = this.buildPrompt(template, explanation, yamlData, contextBundle);
      
      // Log generation start
      logger.info('Starting document generation', {
        templateId: template.id,
        documentType: yamlData.document_type,
        client: yamlData.client,
        contextResults: contextBundle?.embeddings?.length || 0,
        contextTokens: contextBundle?.totalTokens || 0
      });

      // Call OpenAI with retry logic and timeout
      const completion = await withRetry(
        async () => {
          const apiCall = this.client.chat.completions.create({
            model: this.config.model,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            max_completion_tokens: this.config.maxTokens || 4000,
          });

          // Apply timeout
          return await withTimeout(
            apiCall,
            this.config.timeout || 60000,
            new OpenAIError('Request timed out after 60 seconds. The document generation is taking too long.')
          );
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
          backoffMultiplier: 2,
          maxDelayMs: 5000
        },
        (attempt, error) => {
          logger.warn(`OpenAI API call failed, retrying...`, {
            attempt,
            error: error.message
          });
        }
      );

      // Extract the generated content
      const content = completion.choices[0]?.message?.content;
      
      if (!content) {
        throw new OpenAIError('No content generated from OpenAI');
      }

      // Validate the response
      this.validateResponse(content, template);

      // Calculate usage and cost
      const usage = completion.usage ? {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
        estimatedCost: this.calculateCost(completion.usage)
      } : undefined;

      // Log cost estimate if available
      if (usage) {
        this.logCostEstimate(completion.usage, template.id);
      }

      // Log success
      const duration = Date.now() - startTime;
      logger.info('Document generation completed', {
        templateId: template.id,
        duration,
        totalTokens: usage?.totalTokens,
        contextUsed: contextBundle ? true : false
      });

      return {
        content,
        usage,
        metadata: {
          model: this.config.model,
          temperature: this.config.temperature,
          generatedAt: new Date()
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Handle specific OpenAI errors
      if (error instanceof OpenAI.APIError) {
        logger.error('OpenAI API error', {
          status: error.status,
          message: error.message,
          code: error.code,
          duration
        });
        
        if (error.status === 401) {
          throw new OpenAIError('Invalid API key. Please check your OpenAI API key.');
        } else if (error.status === 429) {
          throw new OpenAIError('Rate limit exceeded. Please try again later.');
        } else if (error.status === 500 || error.status === 503) {
          throw new OpenAIError('OpenAI service is currently unavailable. Please try again later.');
        }
        
        throw new OpenAIError(`OpenAI API error: ${error.message}`, error.code || undefined, error.status);
      }

      // Handle network errors
      if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        throw new OpenAIError('Cannot connect to OpenAI. Please check your internet connection.');
      }

      // Generic error handling
      logger.error('Document generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        templateId: template.id,
        duration
      });
      
      throw error;
    }
  }

  /**
   * Build the prompt for document generation with context integration
   */
  protected buildPrompt(
    template: Template,
    explanation: string,
    yamlData: YamlData,
    contextBundle?: ContextBundle
  ): string {
    // Format the template for clarity
    const templateStructure = this.formatTemplateStructure(template);
    
    // Format YAML data for readability
    const formattedData = this.formatYamlData(yamlData);
    
    // Format context if available
    const contextSection = contextBundle ? this.formatContextBundle(contextBundle) : '';

    // Build the complete prompt
    const prompt = `You are a professional legal document generator. Your task is to create a complete, professionally formatted legal document based on the provided template, explanation, and client data${contextBundle ? ', using relevant firm precedents and context' : ''}.

INSTRUCTIONS:
1. Generate a complete legal document in Markdown format
2. Follow the exact structure defined in the template
3. Use professional legal language appropriate for the document type
4. Fill in all placeholders with the provided data
5. Ensure all sections are complete and properly formatted
6. Include appropriate legal disclaimers and standard clauses
7. Return ONLY the final document without any additional commentary${contextBundle ? '\n8. Incorporate relevant precedents and writing style from the provided context' : ''}

TEMPLATE STRUCTURE:
${templateStructure}

TEMPLATE EXPLANATION AND GUIDELINES:
${explanation}

CLIENT DATA:
${formattedData}

${contextSection}

IMPORTANT:
- Generate the complete document ready for use
- Ensure all variable placeholders are replaced with actual data
- Maintain professional formatting throughout
- Use proper markdown syntax for headers, lists, and emphasis${contextBundle ? '\n- Use the provided context to inform writing style, clause structures, and legal precedents' : ''}
- PRESERVE these special markers exactly as they appear in the template:
  - [SIGNATURE_BLOCK:*] - placement markers for signature areas
  - [INITIALS_BLOCK:*] - placement markers for initial areas
  - [NOTARY_BLOCK:*] - placement markers for notary sections
  These markers must appear literally in your output - do NOT replace or remove them

Generate the complete legal document now:`;

    logger.debug('Built prompt for document generation', {
      templateId: template.id,
      promptLength: prompt.length,
      contextResults: contextBundle?.embeddings?.length || 0
    });

    return prompt;
  }

  /**
   * Format template structure for the prompt
   */
  private formatTemplateStructure(template: Template): string {
    const sections = template.sections
      .sort((a, b) => a.order - b.order)
      .map(section => {
        return `Section ${section.order}: ${section.title}
Required: ${section.required}
Content Template:
${section.content}
${section.helpText ? `Guidance: ${section.helpText}` : ''}`;
      })
      .join('\n\n');

    return `Document Type: ${template.name}
Description: ${template.description}
Category: ${template.metadata.category}

SECTIONS:
${sections}

REQUIRED FIELDS:
${template.requiredFields.map(f => `- ${f.name} (${f.type}): ${f.description}`).join('\n')}`;
  }

  /**
   * Format YAML data for the prompt
   */
  private formatYamlData(yamlData: YamlData): string {
    // Pretty print the YAML data for the prompt
    const formatted = Object.entries(yamlData)
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return `${key}:\n${JSON.stringify(value, null, 2)
            .split('\n')
            .map(line => '  ' + line)
            .join('\n')}`;
        }
        return `${key}: ${value}`;
      })
      .join('\n');
    
    return formatted;
  }

  /**
   * Format context bundle for inclusion in prompt
   */
  private formatContextBundle(contextBundle: ContextBundle): string {
    if (!contextBundle.embeddings || contextBundle.embeddings.length === 0) {
      return '';
    }

    const contextSections = contextBundle.embeddings
      .slice(0, 5) // Limit to top 5 most relevant results
      .map((embedding, index) => {
        const source = contextBundle.sources[index];
        return `### Context ${index + 1}: ${source?.title || 'Related Document'}
**Source**: ${source?.citation || 'Unknown'}
**Relevance Score**: ${(embedding.similarity * 100).toFixed(1)}%

${embedding.content.substring(0, 800)}${embedding.content.length > 800 ? '...' : ''}`;
      })
      .join('\n\n');

    return `RELEVANT FIRM PRECEDENTS AND CONTEXT:
The following are similar documents and precedents from your firm's practice that should inform your writing style and approach:

${contextSections}

CONTEXT GUIDANCE:
- Use similar language patterns and clause structures from the precedents above
- Maintain consistency with the firm's established writing style
- Reference applicable legal precedents where appropriate
- Ensure the new document aligns with the firm's standard practices

`;
  }

  /**
   * Validate the generated response (subtask 4.5)
   */
  private validateResponse(content: string, template: Template): void {
    // Check for empty response
    if (!content || content.trim().length === 0) {
      throw new OpenAIError('Generated document is empty');
    }

    // Check minimum length (rough estimate: 100 chars per page minimum)
    const minLength = 50; // Minimum for any document (lowered for testing)
    const maxLength = 20 * 3000; // ~20 pages max, ~3000 chars per page
    
    if (content.length < minLength) {
      throw new OpenAIError('Generated document is too short to be valid');
    }
    
    if (content.length > maxLength) {
      throw new OpenAIError('Generated document exceeds maximum expected length');
    }

    // Validate markdown structure
    const markdownChecks = [
      {
        pattern: /^#\s+.+/m,
        error: 'Document must contain at least one top-level heading'
      },
      {
        pattern: /\n{4,}/,
        error: 'Document contains excessive blank lines',
        isNegative: true
      }
    ];

    for (const check of markdownChecks) {
      const matches = check.pattern.test(content);
      if (check.isNegative ? matches : !matches) {
        logger.warn('Document validation warning', { 
          issue: check.error,
          templateId: template.id 
        });
      }
    }

    // Check for incomplete placeholders
    const placeholderPattern = /\{\{[^}]+\}\}|\[[^\]]*\]/g;
    const placeholders = content.match(placeholderPattern);
    if (placeholders && placeholders.length > 0) {
      logger.warn('Document may contain unfilled placeholders', {
        count: placeholders.length,
        examples: placeholders.slice(0, 3)
      });
    }

    // Validate required sections are present
    const requiredSections = template.sections
      .filter(s => s.required)
      .map(s => s.title);

    for (const sectionTitle of requiredSections) {
      // Simple check - could be made more sophisticated
      if (!content.toLowerCase().includes(sectionTitle.toLowerCase())) {
        logger.warn('Required section may be missing', {
          section: sectionTitle,
          templateId: template.id
        });
      }
    }

    logger.debug('Document validation completed', {
      length: content.length,
      templateId: template.id
    });
  }

  /**
   * Calculate cost based on token usage (subtask 4.6)
   */
  private calculateCost(usage: any): number {
    // OpenAI pricing as of late 2024 (verify current prices)
    // These are example prices - actual prices depend on model
    const pricing: Record<string, { prompt: number; completion: number }> = {
      'o3': {
        prompt: 0.03,      // per 1k tokens
        completion: 0.06   // per 1k tokens
      },
      'gpt-4': {
        prompt: 0.03,
        completion: 0.06
      },
      'gpt-3.5-turbo': {
        prompt: 0.0005,
        completion: 0.0015
      }
    };

    const modelPricing = pricing[this.config.model] || pricing['o3'];
    
    const promptCost = (usage.prompt_tokens / 1000) * modelPricing.prompt;
    const completionCost = (usage.completion_tokens / 1000) * modelPricing.completion;
    
    return Number((promptCost + completionCost).toFixed(4));
  }

  /**
   * Log cost estimate information
   */
  private logCostEstimate(usage: any, templateId: string): void {
    const cost = this.calculateCost(usage);
    
    logger.info('API usage and cost estimate', {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      estimatedCost: `$${cost.toFixed(4)}`,
      model: this.config.model,
      templateId
    });

    // Log warning for high-cost requests
    if (cost > 1.0) {
      logger.warn('High cost document generation', {
        cost: `$${cost.toFixed(2)}`,
        templateId
      });
    }
  }
}

/**
 * Factory function to create OpenAI service (real or mock)
 */
export function createOpenAIService(
  config: OpenAIConfig,
  useMock: boolean = false
): any {
  if (useMock || process.env.USE_MOCK_OPENAI === 'true') {
    // Import dynamically to avoid circular dependencies
    const { MockOpenAIService } = require('./mock-openai');
    return new MockOpenAIService(config);
  }
  return new OpenAIService(config);
}

/**
 * Standalone function to generate a document using OpenAI
 * Creates a service instance with default configuration from environment
 */
export async function generateDocument(
  template: Template,
  explanation: string,
  yamlData: YamlData,
  contextBundle?: ContextBundle,
  modelOverride?: string
): Promise<string> {
  logger.debug('generateDocument called', {
    templateId: template.id,
    documentType: yamlData.document_type,
    contextResults: contextBundle?.embeddings?.length || 0
  });
  
  // Load environment variables
  const config: OpenAIConfig = {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: modelOverride || process.env.OPENAI_MODEL || 'o3',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.2'),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000'),
    timeout: parseInt(process.env.OPENAI_TIMEOUT || '60000')
  };
  
  logger.debug('Creating OpenAI service with config', {
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens
  });
  
  const service = createOpenAIService(config);
  const result = await service.generateDocument(template, explanation, yamlData, contextBundle);
  
  logger.debug('Document generated successfully', {
    contentLength: result.content.length,
    tokens: result.usage?.totalTokens
  });
  
  return result.content;
} 