/**
 * Mock OpenAI service for testing document generation without API calls
 */

import { OpenAIConfig, GenerationResult } from '../types/openai';
import { Template, YamlData } from '../types';
import { logger } from '../utils/logger';

export class MockOpenAIService {
  private config: OpenAIConfig;
  private callCount = 0;
  private failureMode: 'timeout' | 'error' | 'unavailable' | null = null;
  private customResponse: string | null = null;

  constructor(config: OpenAIConfig) {
    this.config = config;
    logger.info('Mock OpenAI service initialized');
  }

  /**
   * Set failure mode for testing error handling
   */
  setFailureMode(mode: 'timeout' | 'error' | 'unavailable' | null): void {
    this.failureMode = mode;
  }

  /**
   * Set custom response for testing specific content
   */
  setCustomResponse(response: string): void {
    this.customResponse = response;
  }

  /**
   * Reset mock service state
   */
  reset(): void {
    this.callCount = 0;
    this.failureMode = null;
    this.customResponse = null;
  }

  /**
   * Mock document generation
   */
  async generateDocument(
    template: Template,
    _explanation: string,
    yamlData: YamlData
  ): Promise<GenerationResult> {
    this.callCount++;
    
    // Simulate API delay
    await this.simulateDelay();

    // Simulate failures if configured
    if (this.failureMode) {
      await this.simulateFailure();
    }

    // Generate mock content
    const content = this.customResponse || this.generateMockContent(template, yamlData);
    
    // Calculate mock usage
    const usage = {
      promptTokens: 500 + Math.floor(Math.random() * 500),
      completionTokens: 1000 + Math.floor(Math.random() * 1000),
      totalTokens: 0,
      estimatedCost: 0
    };
    usage.totalTokens = usage.promptTokens + usage.completionTokens;
    usage.estimatedCost = usage.totalTokens * 0.00003; // Mock pricing

    logger.info('Mock document generated', {
      templateId: template.id,
      callCount: this.callCount
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
  }

  /**
   * Simulate realistic API response time
   */
  private async simulateDelay(): Promise<void> {
    const delay = 500 + Math.random() * 1500; // 0.5-2 seconds
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Simulate various failure modes
   */
  private async simulateFailure(): Promise<never> {
    switch (this.failureMode) {
      case 'timeout':
        // Don't actually wait 65 seconds in tests
        throw new Error('Request timeout');
      
      case 'error':
        throw new Error('Mock API error');
      
      case 'unavailable':
        const error: any = new Error('Service temporarily unavailable');
        error.status = 503;
        error.code = 'service_unavailable';
        throw error;
      
      default:
        throw new Error('Unknown failure mode');
    }
  }

  /**
   * Generate realistic mock content based on template
   */
  private generateMockContent(template: Template, yamlData: YamlData): string {
    const sections = template.sections
      .sort((a, b) => a.order - b.order)
      .map(section => {
        const content = this.fillTemplate(section.content, yamlData);
        return `## ${section.title}\n\n${content}`;
      })
      .join('\n\n');

    return `# ${template.name}

**Date**: ${new Date().toLocaleDateString()}
**Client**: ${yamlData.client}
**Attorney**: ${yamlData.attorney}

${sections}

## Signatures

By signing below, all parties acknowledge that they have read, understood, and agree to be bound by the terms and conditions set forth in this document.

**[${yamlData.client || 'Client Name'}]**

Signature: _________________________
Date: _________________________

**[${yamlData.attorney || 'Attorney Name'}]**

Signature: _________________________
Date: _________________________

---

*This is a mock-generated document for testing purposes.*
*Template: ${template.id} v${template.version}*`;
  }

  /**
   * Simple template variable replacement
   */
  private fillTemplate(template: string, data: YamlData): string {
    let filled = template;
    
    // Replace {{variable}} patterns
    filled = filled.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
      return data[key] || `[${key}]`;
    });

    // Add some mock legal language if content is short
    if (filled.length < 200) {
      filled += '\n\nPursuant to the terms and conditions set forth herein, the parties agree to the foregoing. This agreement shall be binding upon and inure to the benefit of the parties and their respective successors and assigns.';
    }

    // Ensure proper markdown formatting
    filled = filled.replace(/\n{3,}/g, '\n\n'); // Remove excessive newlines

    return filled;
  }

  /**
   * Get call count for testing
   */
  getCallCount(): number {
    return this.callCount;
  }

  /**
   * Build prompt (exposed for testing)
   */
  protected buildPrompt(
    template: Template,
    _explanation: string,
    _yamlData: YamlData
  ): string {
    // Mock implementation - just return a simple string
    return `Mock prompt for ${template.name}`;
  }
} 