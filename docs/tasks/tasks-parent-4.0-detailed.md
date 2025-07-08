# Task 4.0 Detailed Implementation - OpenAI Integration

## Task Overview

Parent Task 4.0 implements the OpenAI integration layer that connects the CaseThread CLI's template and YAML services with OpenAI's o3 model. This integration is the core engine that transforms structured legal templates and client data into professionally formatted legal documents.

### Architecture Context

The OpenAI service sits between the data preparation layer (templates + YAML) and the document output layer:

```
CLI Command → Template Service → 
                                 → OpenAI Service → Generated Document
              YAML Service     →
```

### Dependencies on Other Tasks
- **Task 3.0** (COMPLETE): Provides template loading, YAML parsing, and validation services
- **Task 2.0** (COMPLETE): TypeScript project setup with all dependencies installed

### What This Enables
After completing Task 4.0:
- Full document generation pipeline will be functional (minus CLI interface)
- Can programmatically generate legal documents from templates and data
- Testing framework will be in place for AI-powered generation
- Foundation ready for Task 5.0 (CLI interface)

## Technical Design

### Component Architecture

```typescript
// Service Interface
interface IOpenAIService {
  generateDocument(
    template: Template,
    explanation: string,
    yamlData: YamlData
  ): Promise<GenerationResult>;
}

// Result Structure
interface GenerationResult {
  content: string;        // Generated markdown
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  metadata: {
    model: string;
    temperature: number;
    generatedAt: Date;
  };
}
```

### Key Design Decisions

1. **Stateless Service**: Each instance is independent, configuration via constructor
2. **Structured Responses**: Return objects include metadata for logging/tracking
3. **Interface-Based**: Allows easy swapping between real and mock implementations
4. **Retry Logic**: Built-in resilience for transient failures
5. **Timeout Handling**: Prevents hanging on long requests

## Implementation Sequence

The subtasks are ordered to build functionality incrementally:
1. **4.1**: Establish OpenAI connection (foundation)
2. **4.2**: Build prompt engineering (core logic)
3. **4.3**: Add generation with retry (main functionality)
4. **4.4**: Add timeout protection (reliability)
5. **4.5**: Add response validation (quality assurance)
6. **4.6**: Add cost tracking (monitoring)
7. **4.7**: Create mock service (testing)

Critical path: 4.1 → 4.2 → 4.3 (minimum viable functionality)
Parallel opportunities: 4.4, 4.5, 4.6 can be developed simultaneously after 4.3

## Detailed Subtask Breakdown

### 4.1 Create src/services/openai.ts with OpenAI client initialization

**Description**: Set up the OpenAI service class with proper initialization and configuration.

**Implementation Steps**:

1. Create OpenAI-specific types in `src/types/openai.ts`:
```typescript
export interface OpenAIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens?: number;
  timeout?: number;
}

export interface GenerationResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  metadata: {
    model: string;
    temperature: number;
    generatedAt: Date;
  };
}

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
```

2. Create `.env.example` with required variables:
```
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=o3
OPENAI_TEMPERATURE=0.2
OPENAI_MAX_TOKENS=4000
OPENAI_TIMEOUT=60000
```

3. Implement the OpenAI service class:
```typescript
import OpenAI from 'openai';
import { OpenAIConfig, GenerationResult, OpenAIError } from '../types/openai';
import { logger } from '../utils/logger';
import { Template, YamlData } from '../types';

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

  // Placeholder for other methods
  async generateDocument(
    template: Template,
    explanation: string,
    yamlData: YamlData
  ): Promise<GenerationResult> {
    // To be implemented in 4.3
    throw new Error('Not implemented');
  }
}
```

**File Changes**:
- Create `src/types/openai.ts`
- Create `src/services/openai.ts`
- Create `.env.example` in project root

**Testing Approach**:
```typescript
// __tests__/services/openai.test.ts
describe('OpenAIService', () => {
  describe('constructor', () => {
    it('should initialize with valid config', () => {
      const config = {
        apiKey: 'test-key',
        model: 'o3',
        temperature: 0.2
      };
      const service = new OpenAIService(config);
      expect(service).toBeDefined();
    });

    it('should throw error for missing API key', () => {
      const config = { model: 'o3', temperature: 0.2 };
      expect(() => new OpenAIService(config as any))
        .toThrow('OpenAI API key is required');
    });
  });
});
```

**Definition of Done**:
- Service class initializes successfully with valid config
- Throws appropriate errors for invalid configuration
- Unit tests pass for all initialization scenarios
- Logger records initialization

### 4.2 Implement buildPrompt function

**Description**: Create the prompt engineering logic that combines template, explanation, and YAML data.

**Implementation Steps**:

1. Add the buildPrompt method to OpenAIService:
```typescript
export class OpenAIService {
  // ... existing code ...

  protected buildPrompt(
    template: Template,
    explanation: string,
    yamlData: YamlData
  ): string {
    // Format the template for clarity
    const templateStructure = this.formatTemplateStructure(template);
    
    // Format YAML data for readability
    const formattedData = this.formatYamlData(yamlData);

    // Build the complete prompt
    const prompt = `You are a professional legal document generator. Your task is to create a complete, professionally formatted legal document based on the provided template, explanation, and client data.

INSTRUCTIONS:
1. Generate a complete legal document in Markdown format
2. Follow the exact structure defined in the template
3. Use professional legal language appropriate for the document type
4. Fill in all placeholders with the provided data
5. Ensure all sections are complete and properly formatted
6. Include appropriate legal disclaimers and standard clauses
7. Return ONLY the final document without any additional commentary

TEMPLATE STRUCTURE:
${templateStructure}

TEMPLATE EXPLANATION AND GUIDELINES:
${explanation}

CLIENT DATA:
${formattedData}

IMPORTANT:
- Generate the complete document ready for use
- Ensure all variable placeholders are replaced with actual data
- Maintain professional formatting throughout
- Use proper markdown syntax for headers, lists, and emphasis

Generate the complete legal document now:`;

    logger.debug('Built prompt for document generation', {
      templateId: template.id,
      promptLength: prompt.length
    });

    return prompt;
  }

  private formatTemplateStructure(template: Template): string {
    const sections = template.sections
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
}
```

**Testing Approach**:
```typescript
describe('buildPrompt', () => {
  it('should build a complete prompt from inputs', () => {
    const template = mockTemplate();
    const explanation = 'This template is for...';
    const yamlData = mockYamlData();
    
    const service = new OpenAIService(mockConfig());
    const prompt = (service as any).buildPrompt(template, explanation, yamlData);
    
    expect(prompt).toContain('TEMPLATE STRUCTURE:');
    expect(prompt).toContain(template.name);
    expect(prompt).toContain(explanation);
    expect(prompt).toContain(yamlData.client);
  });

  it('should format nested YAML data correctly', () => {
    // Test with complex nested data
  });
});
```

**Definition of Done**:
- Prompt includes all required sections
- Template structure is clearly formatted
- YAML data is properly formatted
- Explanation is included verbatim
- Unit tests verify prompt structure

### 4.3 Create generateDocument function with error handling and retry logic

**Description**: Implement the main document generation function with robust error handling.

**Implementation Steps**:

1. First, create a retry utility in `src/utils/retry.ts`:
```typescript
export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === options.maxAttempts) {
        throw lastError;
      }
      
      if (onRetry) {
        onRetry(attempt, lastError);
      }
      
      const delay = Math.min(
        options.delayMs * Math.pow(options.backoffMultiplier, attempt - 1),
        options.maxDelayMs
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

2. Implement the generateDocument method:
```typescript
export class OpenAIService {
  // ... existing code ...

  async generateDocument(
    template: Template,
    explanation: string,
    yamlData: YamlData
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      // Build the prompt
      const prompt = this.buildPrompt(template, explanation, yamlData);
      
      // Log generation start
      logger.info('Starting document generation', {
        templateId: template.id,
        documentType: yamlData.document_type,
        client: yamlData.client
      });

      // Call OpenAI with retry logic
      const completion = await withRetry(
        async () => {
          return await this.client.chat.completions.create({
            model: this.config.model,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens || 4000,
          });
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

      // Calculate usage and cost
      const usage = completion.usage ? {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
        estimatedCost: this.calculateCost(completion.usage)
      } : undefined;

      // Log success
      const duration = Date.now() - startTime;
      logger.info('Document generation completed', {
        templateId: template.id,
        duration,
        totalTokens: usage?.totalTokens
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
        
        throw new OpenAIError(`OpenAI API error: ${error.message}`, error.code, error.status);
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

  private calculateCost(usage: any): number {
    // Placeholder cost calculation - actual costs depend on model
    // This is a rough estimate for demonstration
    const costPer1kTokens = 0.03; // $0.03 per 1k tokens (example)
    return (usage.total_tokens / 1000) * costPer1kTokens;
  }
}
```

**Testing Approach**:
```typescript
describe('generateDocument', () => {
  it('should generate document successfully', async () => {
    const mockClient = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: '# Legal Document\n\nContent...' } }],
            usage: {
              prompt_tokens: 500,
              completion_tokens: 1000,
              total_tokens: 1500
            }
          })
        }
      }
    };

    const service = new OpenAIService(mockConfig());
    (service as any).client = mockClient;

    const result = await service.generateDocument(
      mockTemplate(),
      'Explanation text',
      mockYamlData()
    );

    expect(result.content).toContain('# Legal Document');
    expect(result.usage?.totalTokens).toBe(1500);
  });

  it('should retry on transient failures', async () => {
    // Test retry logic
  });

  it('should handle API unavailability gracefully', async () => {
    // Test 503 errors
  });
});
```

**Definition of Done**:
- Successfully generates documents via OpenAI API
- Implements retry logic with exponential backoff
- Handles all error scenarios gracefully
- Returns structured response with metadata
- All unit tests pass

### 4.4 Add timeout handling for long-running API calls

**Description**: Implement timeout protection to prevent hanging requests.

**Implementation Steps**:

1. Update the retry utility to support timeout:
```typescript
// In src/utils/retry.ts, add:
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: Error
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(timeoutError), timeoutMs);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}
```

2. Update generateDocument to use timeout:
```typescript
// In generateDocument method, wrap the OpenAI call:
const completion = await withRetry(
  async () => {
    const apiCall = this.client.chat.completions.create({
      model: this.config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens || 4000,
    });

    // Apply timeout
    return await withTimeout(
      apiCall,
      this.config.timeout || 60000,
      new OpenAIError('Request timed out after 60 seconds. The document generation is taking too long.')
    );
  },
  // ... retry options ...
);
```

**Testing Approach**:
```typescript
it('should timeout after 60 seconds', async () => {
  const mockClient = {
    chat: {
      completions: {
        create: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 70000))
        )
      }
    }
  };

  const service = new OpenAIService({ ...mockConfig(), timeout: 1000 });
  (service as any).client = mockClient;

  await expect(service.generateDocument(mockTemplate(), 'test', mockYamlData()))
    .rejects.toThrow('Request timed out');
});
```

**Definition of Done**:
- Requests timeout after 60 seconds by default
- Timeout is configurable via environment variable
- Timeout errors provide clear user message
- Tests verify timeout behavior

### 4.5 Implement response validation

**Description**: Validate that generated documents meet quality standards.

**Implementation Steps**:

1. Create validation utility in OpenAIService:
```typescript
private validateResponse(content: string, template: Template): void {
  // Check for empty response
  if (!content || content.trim().length === 0) {
    throw new OpenAIError('Generated document is empty');
  }

  // Check minimum length (rough estimate: 100 chars per page minimum)
  const minLength = 100; // Minimum for any document
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
```

2. Add validation to generateDocument:
```typescript
// After getting the content, before returning:
if (!content) {
  throw new OpenAIError('No content generated from OpenAI');
}

// Validate the response
this.validateResponse(content, template);
```

**Testing Approach**:
```typescript
describe('validateResponse', () => {
  it('should accept valid markdown document', () => {
    const content = `# Patent Assignment Agreement\n\nThis agreement...`;
    const service = new OpenAIService(mockConfig());
    
    expect(() => 
      (service as any).validateResponse(content, mockTemplate())
    ).not.toThrow();
  });

  it('should reject empty content', () => {
    const service = new OpenAIService(mockConfig());
    
    expect(() => 
      (service as any).validateResponse('', mockTemplate())
    ).toThrow('Generated document is empty');
  });

  it('should warn about missing placeholders', () => {
    // Test with content containing {{placeholder}}
  });
});
```

**Definition of Done**:
- Validates markdown syntax basics
- Checks for reasonable document length
- Warns about potential issues
- Doesn't reject documents too aggressively
- Tests cover validation scenarios

### 4.6 Add cost estimation based on token count

**Description**: Track and log API usage costs for monitoring.

**Implementation Steps**:

1. Create cost calculation with accurate pricing:
```typescript
private calculateCost(usage: any): number {
  // OpenAI pricing as of late 2024 (verify current prices)
  // These are example prices - actual prices depend on model
  const pricing = {
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
```

2. Update generateDocument to include cost logging:
```typescript
// After successful generation:
if (usage) {
  this.logCostEstimate(completion.usage, template.id);
}
```

**Testing Approach**:
```typescript
describe('cost estimation', () => {
  it('should calculate cost correctly for o3 model', () => {
    const usage = {
      prompt_tokens: 1000,
      completion_tokens: 2000,
      total_tokens: 3000
    };
    
    const service = new OpenAIService({ ...mockConfig(), model: 'o3' });
    const cost = (service as any).calculateCost(usage);
    
    expect(cost).toBeCloseTo(0.15, 2); // 0.03 + 0.12
  });

  it('should log warning for high-cost requests', () => {
    const logSpy = jest.spyOn(logger, 'warn');
    // Test with high token usage
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('High cost'),
      expect.any(Object)
    );
  });
});
```

**Definition of Done**:
- Accurate cost calculation based on token usage
- Cost logged with each generation
- Warning for unusually expensive generations
- Cost included in response metadata
- Unit tests verify calculations

### 4.7 Create mock OpenAI service for testing

**Description**: Implement a mock service that mimics OpenAI behavior for testing.

**Implementation Steps**:

1. Create `src/services/mock-openai.ts`:
```typescript
import { OpenAIConfig, GenerationResult } from '../types/openai';
import { Template, YamlData } from '../types';
import { logger } from '../utils/logger';

export class MockOpenAIService {
  private config: OpenAIConfig;
  private callCount = 0;
  private shouldFail = false;
  private failureMode: 'timeout' | 'error' | 'unavailable' | null = null;
  private customResponse: string | null = null;

  constructor(config: OpenAIConfig) {
    this.config = config;
    logger.info('Mock OpenAI service initialized');
  }

  // Control methods for testing
  setFailureMode(mode: 'timeout' | 'error' | 'unavailable' | null): void {
    this.failureMode = mode;
  }

  setCustomResponse(response: string): void {
    this.customResponse = response;
  }

  reset(): void {
    this.callCount = 0;
    this.failureMode = null;
    this.customResponse = null;
  }

  async generateDocument(
    template: Template,
    explanation: string,
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

  private async simulateDelay(): Promise<void> {
    // Simulate realistic API response time
    const delay = 500 + Math.random() * 1500; // 0.5-2 seconds
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private async simulateFailure(): Promise<never> {
    switch (this.failureMode) {
      case 'timeout':
        await new Promise(resolve => setTimeout(resolve, 65000));
        throw new Error('Request timeout');
      
      case 'error':
        throw new Error('Mock API error');
      
      case 'unavailable':
        const error: any = new Error('Service temporarily unavailable');
        error.status = 503;
        throw error;
      
      default:
        throw new Error('Unknown failure mode');
    }
  }

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

---

*This is a mock-generated document for testing purposes.*
*Template: ${template.id} v${template.version}*`;
  }

  private fillTemplate(template: string, data: YamlData): string {
    // Simple variable replacement for mock
    let filled = template;
    
    // Replace {{variable}} patterns
    filled = filled.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || `[${key}]`;
    });

    // Add some mock legal language
    if (filled.length < 200) {
      filled += '\n\nPursuant to the terms and conditions set forth herein, the parties agree to the foregoing.';
    }

    return filled;
  }

  // Test helper methods
  getCallCount(): number {
    return this.callCount;
  }
}
```

2. Create factory function for easy swapping:
```typescript
// In src/services/openai.ts, add:
export function createOpenAIService(
  config: OpenAIConfig,
  useMock: boolean = false
): OpenAIService | MockOpenAIService {
  if (useMock || process.env.USE_MOCK_OPENAI === 'true') {
    return new MockOpenAIService(config);
  }
  return new OpenAIService(config);
}
```

**Testing Approach**:
```typescript
// __tests__/services/mock-openai.test.ts
describe('MockOpenAIService', () => {
  it('should generate deterministic content', async () => {
    const service = new MockOpenAIService(mockConfig());
    const result = await service.generateDocument(
      mockTemplate(),
      'test explanation',
      mockYamlData()
    );

    expect(result.content).toContain(mockTemplate().name);
    expect(result.content).toContain(mockYamlData().client);
  });

  it('should simulate timeout when configured', async () => {
    const service = new MockOpenAIService(mockConfig());
    service.setFailureMode('timeout');

    await expect(
      service.generateDocument(mockTemplate(), 'test', mockYamlData())
    ).rejects.toThrow('timeout');
  });

  it('should use custom responses when set', async () => {
    const service = new MockOpenAIService(mockConfig());
    const customContent = '# Custom Document\n\nCustom content here.';
    service.setCustomResponse(customContent);

    const result = await service.generateDocument(
      mockTemplate(),
      'test',
      mockYamlData()
    );

    expect(result.content).toBe(customContent);
  });
});
```

**Definition of Done**:
- Mock service implements same interface as real service
- Can simulate various failure modes
- Generates reasonable mock content
- Provides test control methods
- All mock service tests pass

## Testing Strategy

### Unit Test Coverage
Each subtask requires comprehensive unit tests:

1. **OpenAI Service Tests** (`__tests__/services/openai.test.ts`)
   - Configuration validation
   - Prompt building with various inputs
   - Error handling for all failure modes
   - Retry logic verification
   - Timeout behavior
   - Response validation
   - Cost calculation accuracy

2. **Mock Service Tests** (`__tests__/services/mock-openai.test.ts`)
   - Content generation
   - Failure simulation
   - Custom response handling
   - Call counting

3. **Integration Tests**
   - Full flow from template + YAML to generated document
   - Error propagation through the stack
   - Mock service integration with other components

### Manual Testing Procedures
After implementation:
1. Set up `.env` with actual OpenAI API key
2. Run generation with each template type
3. Verify markdown output format
4. Test with missing API key
5. Test with invalid model name
6. Monitor logs for cost tracking

## Integration Plan

### With Existing Services
```typescript
// Example integration in future CLI command:
import { TemplateService } from '../services/template';
import { YamlService } from '../services/yaml';
import { createOpenAIService } from '../services/openai';

const templateService = new TemplateService();
const yamlService = new YamlService();
const openAIService = createOpenAIService({
  apiKey: process.env.OPENAI_API_KEY!,
  model: process.env.OPENAI_MODEL || 'o3',
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.2')
});

// Load inputs
const template = await templateService.loadTemplate(documentType);
const explanation = await templateService.loadExplanation(documentType);
const yamlData = await yamlService.parseYaml(inputPath);

// Generate document
const result = await openAIService.generateDocument(
  template,
  explanation,
  yamlData
);
```

### Configuration Requirements
Environment variables needed:
- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (default: 'o3')
- `OPENAI_TEMPERATURE` (default: 0.2)
- `OPENAI_MAX_TOKENS` (default: 4000)
- `OPENAI_TIMEOUT` (default: 60000)
- `USE_MOCK_OPENAI` (for testing)

## Documentation Requirements

### Code Documentation
```typescript
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
 *   yamlData
 * );
 * ```
 */
```

### README Updates
Add to project README:
- OpenAI integration overview
- Environment variable setup
- Cost considerations
- Mock service usage for testing

## Common Pitfalls

1. **API Key Management**
   - Never commit `.env` file
   - Always check for API key presence
   - Use mock service in CI/CD

2. **Token Limits**
   - Monitor prompt size
   - Consider token limits in prompt design
   - Handle truncated responses

3. **Error Handling**
   - Don't expose API keys in errors
   - Provide actionable error messages
   - Log full errors for debugging

4. **Testing**
   - Never call real API in unit tests
   - Use mock service for all tests
   - Test error scenarios thoroughly

5. **Cost Management**
   - Monitor token usage
   - Log cost estimates
   - Consider implementing spending limits

## Success Metrics

### Functional Success
- ✅ All 8 template types generate successfully
- ✅ API unavailability handled gracefully  
- ✅ Cost estimates logged accurately
- ✅ 100% test coverage achieved

### Performance Metrics
- Response time < 60 seconds for all documents
- Retry logic prevents 90%+ of transient failures
- Mock service responds in < 2 seconds

### Quality Metrics
- Generated documents pass markdown validation
- All required sections present in output
- No unfilled placeholders in generated content

## Next Steps

After completing Task 4.0:

1. **Task 5.0 - CLI Interface**
   - Wire OpenAI service into Commander.js commands
   - Add progress indicators during generation
   - Implement output file handling

2. **Task 6.0 - Comprehensive Testing**
   - End-to-end integration tests
   - Performance benchmarking
   - Error scenario validation

3. **Future Enhancements**
   - Add streaming when o3 supports it
   - Implement caching layer
   - Add batch processing capabilities
   - Create web interface 