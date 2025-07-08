/**
 * Tests for OpenAI service
 */

import { OpenAIService } from '../../src/services/openai';
import { OpenAIError } from '../../src/types/openai';
import { Template, YamlData } from '../../src/types';
import * as retry from '../../src/utils/retry';

// Mock the OpenAI module
jest.mock('openai');

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('OpenAIService', () => {
  const mockConfig = {
    apiKey: 'test-key',
    model: 'o3',
    temperature: 0.2,
    maxTokens: 4000,
    timeout: 60000
  };

  const mockTemplate: Template = {
    id: 'test-template',
    name: 'Test Template',
    type: 'test',
    version: '1.0',
    description: 'A test template',
    complexity: 'low',
    estimatedTime: '10 minutes',
    metadata: {
      category: 'general',
      jurisdiction: 'federal',
      lastUpdated: '2024-01-01',
      author: 'Test Author'
    },
    requiredFields: [
      {
        id: 'field1',
        name: 'Field 1',
        type: 'text',
        description: 'Test field',
        required: true
      }
    ],
    sections: [
      {
        id: 'section1',
        title: 'Section 1',
        order: 1,
        required: true,
        content: 'This is section 1 with {{field1}}',
        firmCustomizable: false
      }
    ]
  };

  const mockYamlData: YamlData = {
    client: 'Test Client',
    attorney: 'Test Attorney',
    document_type: 'test-doc',
    template: 'test-template',
    field1: 'value1'
  };

  const mockExplanation = 'This template is used for testing purposes.';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with valid config', () => {
      const service = new OpenAIService(mockConfig);
      expect(service).toBeDefined();
    });

    it('should throw error for missing API key', () => {
      const invalidConfig = { ...mockConfig, apiKey: '' };
      expect(() => new OpenAIService(invalidConfig))
        .toThrow(new OpenAIError('OpenAI API key is required'));
    });

    it('should throw error for missing model', () => {
      const invalidConfig = { ...mockConfig, model: '' };
      expect(() => new OpenAIService(invalidConfig))
        .toThrow(new OpenAIError('OpenAI model is required'));
    });

    it('should throw error for missing temperature', () => {
      const invalidConfig = { ...mockConfig };
      delete (invalidConfig as any).temperature;
      expect(() => new OpenAIService(invalidConfig))
        .toThrow(new OpenAIError('Temperature setting is required'));
    });
  });

  describe('buildPrompt', () => {
    it('should build a complete prompt from inputs', () => {
      const service = new OpenAIService(mockConfig);
      const prompt = (service as any).buildPrompt(mockTemplate, mockExplanation, mockYamlData);

      expect(prompt).toContain('TEMPLATE STRUCTURE:');
      expect(prompt).toContain('TEMPLATE EXPLANATION AND GUIDELINES:');
      expect(prompt).toContain('CLIENT DATA:');
      expect(prompt).toContain(mockTemplate.name);
      expect(prompt).toContain(mockExplanation);
      expect(prompt).toContain(mockYamlData.client);
      expect(prompt).toContain('professional legal document generator');
    });

    it('should format template sections correctly', () => {
      const service = new OpenAIService(mockConfig);
      const prompt = (service as any).buildPrompt(mockTemplate, mockExplanation, mockYamlData);

      expect(prompt).toContain('Section 1: Section 1');
      expect(prompt).toContain('Required: true');
      expect(prompt).toContain('This is section 1 with {{field1}}');
    });

    it('should format YAML data correctly', () => {
      const service = new OpenAIService(mockConfig);
      const complexYamlData = {
        ...mockYamlData,
        nested: {
          key1: 'value1',
          key2: 'value2'
        }
      };
      
      const prompt = (service as any).buildPrompt(mockTemplate, mockExplanation, complexYamlData);
      
      expect(prompt).toContain('client: Test Client');
      expect(prompt).toContain('nested:');
      expect(prompt).toContain('  "key1": "value1"');
    });

    it('should include required fields in prompt', () => {
      const service = new OpenAIService(mockConfig);
      const prompt = (service as any).buildPrompt(mockTemplate, mockExplanation, mockYamlData);

      expect(prompt).toContain('REQUIRED FIELDS:');
      expect(prompt).toContain('- Field 1 (text): Test field');
    });
  });

  describe('generateDocument', () => {
    let service: OpenAIService;
    let mockOpenAIClient: any;

    beforeEach(() => {
      // Create mock OpenAI client
      mockOpenAIClient = {
        chat: {
          completions: {
            create: jest.fn()
          }
        }
      };

      // Mock the OpenAI constructor
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => mockOpenAIClient);

      service = new OpenAIService(mockConfig);
    });

    it('should generate document successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '# Legal Document\n\nThis is the generated content with sufficient length to pass validation.'
          }
        }],
        usage: {
          prompt_tokens: 500,
          completion_tokens: 1000,
          total_tokens: 1500
        }
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.generateDocument(
        mockTemplate,
        mockExplanation,
        mockYamlData
      );

      expect(result.content).toBe('# Legal Document\n\nThis is the generated content with sufficient length to pass validation.');
      expect(result.usage).toEqual({
        promptTokens: 500,
        completionTokens: 1000,
        totalTokens: 1500,
        estimatedCost: expect.any(Number)
      });
      expect(result.metadata).toEqual({
        model: 'o3',
        temperature: 0.2,
        generatedAt: expect.any(Date)
      });
    });

    it('should handle empty response from OpenAI', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: null } }]
      });

      await expect(service.generateDocument(mockTemplate, mockExplanation, mockYamlData))
        .rejects.toThrow(new OpenAIError('No content generated from OpenAI'));
    });

    it('should handle API errors with specific status codes', async () => {
      const OpenAI = require('openai').default;
      const apiError = new OpenAI.APIError('Unauthorized', undefined, { status: 401 }, undefined);
      apiError.status = 401;
      mockOpenAIClient.chat.completions.create.mockRejectedValue(apiError);

      await expect(service.generateDocument(mockTemplate, mockExplanation, mockYamlData))
        .rejects.toThrow(new OpenAIError('Invalid API key. Please check your OpenAI API key.'));
    });

    it('should handle rate limit errors', async () => {
      const OpenAI = require('openai').default;
      const apiError = new OpenAI.APIError('Rate limit', undefined, { status: 429 }, undefined);
      apiError.status = 429;
      mockOpenAIClient.chat.completions.create.mockRejectedValue(apiError);

      await expect(service.generateDocument(mockTemplate, mockExplanation, mockYamlData))
        .rejects.toThrow(new OpenAIError('Rate limit exceeded. Please try again later.'));
    });

    it('should handle service unavailable errors', async () => {
      const OpenAI = require('openai').default;
      const apiError = new OpenAI.APIError('Service unavailable', undefined, { status: 503 }, undefined);
      apiError.status = 503;
      mockOpenAIClient.chat.completions.create.mockRejectedValue(apiError);

      await expect(service.generateDocument(mockTemplate, mockExplanation, mockYamlData))
        .rejects.toThrow(new OpenAIError('OpenAI service is currently unavailable. Please try again later.'));
    });

    it('should handle network errors', async () => {
      const networkError = new Error('connect ECONNREFUSED');
      mockOpenAIClient.chat.completions.create.mockRejectedValue(networkError);

      await expect(service.generateDocument(mockTemplate, mockExplanation, mockYamlData))
        .rejects.toThrow(new OpenAIError('Cannot connect to OpenAI. Please check your internet connection.'));
    });

    it('should retry on transient failures', async () => {
      const mockResponse = {
        choices: [{
          message: { content: '# Success\n\nThis document has been successfully generated with enough content.' }
        }],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
      };

      mockOpenAIClient.chat.completions.create
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(mockResponse);

      const result = await service.generateDocument(
        mockTemplate,
        mockExplanation,
        mockYamlData
      );

      expect(result.content).toBe('# Success\n\nThis document has been successfully generated with enough content.');
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateResponse', () => {
    let service: OpenAIService;

    beforeEach(() => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: jest.fn() } }
      }));
      service = new OpenAIService(mockConfig);
    });

    it('should accept valid markdown document', () => {
      const content = '# Patent Assignment Agreement\n\nThis is a valid document with sufficient content.';
      
      expect(() => 
        (service as any).validateResponse(content, mockTemplate)
      ).not.toThrow();
    });

    it('should reject empty content', () => {
      expect(() => 
        (service as any).validateResponse('', mockTemplate)
      ).toThrow(new OpenAIError('Generated document is empty'));
    });

    it('should reject content that is too short', () => {
      const shortContent = 'Too short';
      
      expect(() => 
        (service as any).validateResponse(shortContent, mockTemplate)
      ).toThrow(new OpenAIError('Generated document is too short to be valid'));
    });

    it('should reject content that is too long', () => {
      const longContent = 'x'.repeat(61000); // Over 20 pages
      
      expect(() => 
        (service as any).validateResponse(longContent, mockTemplate)
      ).toThrow(new OpenAIError('Generated document exceeds maximum expected length'));
    });

    it('should warn about missing required sections', () => {
      const { logger } = require('../../src/utils/logger');
      const content = '# Document\n\nSome content without the required section.';
      
      (service as any).validateResponse(content, mockTemplate);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Required section may be missing',
        expect.objectContaining({
          section: 'Section 1',
          templateId: 'test-template'
        })
      );
    });

    it('should warn about unfilled placeholders', () => {
      const { logger } = require('../../src/utils/logger');
      const content = '# Document\n\nThis has {{unfilled}} placeholders and [incomplete] sections.';
      
      (service as any).validateResponse(content, mockTemplate);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Document may contain unfilled placeholders',
        expect.objectContaining({
          count: 2,
          examples: expect.arrayContaining(['{{unfilled}}', '[incomplete]'])
        })
      );
    });
  });

  describe('calculateCost', () => {
    let service: OpenAIService;

    beforeEach(() => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: jest.fn() } }
      }));
      service = new OpenAIService(mockConfig);
    });

    it('should calculate cost correctly for o3 model', () => {
      const usage = {
        prompt_tokens: 1000,
        completion_tokens: 2000,
        total_tokens: 3000
      };

      const cost = (service as any).calculateCost(usage);
      
      // o3: 0.03 per 1k prompt + 0.06 per 1k completion = 0.03 + 0.12 = 0.15
      expect(cost).toBe(0.15);
    });

    it('should calculate cost for different models', () => {
      const usage = {
        prompt_tokens: 1000,
        completion_tokens: 1000,
        total_tokens: 2000
      };

      // Test with gpt-3.5-turbo
      const cheapService = new OpenAIService({
        ...mockConfig,
        model: 'gpt-3.5-turbo'
      });

      const cost = (cheapService as any).calculateCost(usage);
      
      // gpt-3.5-turbo: 0.0005 + 0.0015 = 0.002
      expect(cost).toBe(0.002);
    });

    it('should log warning for high-cost requests', () => {
      const { logger } = require('../../src/utils/logger');
      const usage = {
        prompt_tokens: 20000,
        completion_tokens: 20000,
        total_tokens: 40000
      };

      (service as any).logCostEstimate(usage, 'test-template');

      expect(logger.warn).toHaveBeenCalledWith(
        'High cost document generation',
        expect.objectContaining({
          cost: expect.stringMatching(/^\$\d+\.\d{2}$/),
          templateId: 'test-template'
        })
      );
    });
  });

  describe('timeout handling', () => {
    it('should timeout long-running requests', async () => {
      // Mock withTimeout to simulate timeout
      jest.spyOn(retry, 'withTimeout').mockRejectedValue(
        new OpenAIError('Request timed out after 60 seconds. The document generation is taking too long.')
      );

      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: jest.fn() } }
      }));

      const service = new OpenAIService({ ...mockConfig, timeout: 100 });

      await expect(service.generateDocument(mockTemplate, mockExplanation, mockYamlData))
        .rejects.toThrow('Request timed out after 60 seconds');
    });
  });
}); 