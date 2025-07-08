/**
 * Tests for mock OpenAI service
 */

import { MockOpenAIService } from '../../src/services/mock-openai';
import { Template, YamlData } from '../../src/types';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('MockOpenAIService', () => {
  const mockConfig = {
    apiKey: 'test-key',
    model: 'o3',
    temperature: 0.2,
    maxTokens: 4000,
    timeout: 60000
  };

  const mockTemplate: Template = {
    id: 'test-template',
    name: 'Test Legal Document',
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
        title: 'Introduction',
        order: 1,
        required: true,
        content: 'This agreement is between {{client}} and {{attorney}}.',
        firmCustomizable: false
      },
      {
        id: 'section2',
        title: 'Terms',
        order: 2,
        required: true,
        content: 'The terms of this agreement are as follows: {{field1}}',
        firmCustomizable: false
      }
    ]
  };

  const mockYamlData: YamlData = {
    client: 'Acme Corp',
    attorney: 'John Doe, Esq.',
    document_type: 'test-doc',
    template: 'test-template',
    field1: 'specific terms here'
  };

  const mockExplanation = 'This template is used for testing purposes.';

  let service: MockOpenAIService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MockOpenAIService(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize mock service', () => {
      expect(service).toBeDefined();
      expect(service.getCallCount()).toBe(0);
    });
  });

  describe('generateDocument', () => {
    it('should generate deterministic mock content', async () => {
      const result = await service.generateDocument(
        mockTemplate,
        mockExplanation,
        mockYamlData
      );

      expect(result.content).toContain('# Test Legal Document');
      expect(result.content).toContain('Acme Corp');
      expect(result.content).toContain('John Doe, Esq.');
      expect(result.content).toContain('## Introduction');
      expect(result.content).toContain('## Terms');
      expect(result.content).toContain('specific terms here');
      expect(result.content).toContain('mock-generated document');
    });

    it('should return usage statistics', async () => {
      const result = await service.generateDocument(
        mockTemplate,
        mockExplanation,
        mockYamlData
      );

      expect(result.usage).toBeDefined();
      expect(result.usage!.promptTokens).toBeGreaterThanOrEqual(500);
      expect(result.usage!.promptTokens).toBeLessThanOrEqual(1000);
      expect(result.usage!.completionTokens).toBeGreaterThanOrEqual(1000);
      expect(result.usage!.completionTokens).toBeLessThanOrEqual(2000);
      expect(result.usage!.totalTokens).toBe(
        result.usage!.promptTokens + result.usage!.completionTokens
      );
      expect(result.usage!.estimatedCost).toBeGreaterThan(0);
    });

    it('should return metadata', async () => {
      const before = new Date();
      const result = await service.generateDocument(
        mockTemplate,
        mockExplanation,
        mockYamlData
      );
      const after = new Date();

      expect(result.metadata).toEqual({
        model: 'o3',
        temperature: 0.2,
        generatedAt: expect.any(Date)
      });
      expect(result.metadata.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.metadata.generatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should increment call count', async () => {
      expect(service.getCallCount()).toBe(0);

      await service.generateDocument(mockTemplate, mockExplanation, mockYamlData);
      expect(service.getCallCount()).toBe(1);

      await service.generateDocument(mockTemplate, mockExplanation, mockYamlData);
      expect(service.getCallCount()).toBe(2);
    });

    it('should simulate realistic delay', async () => {
      const start = Date.now();
      await service.generateDocument(mockTemplate, mockExplanation, mockYamlData);
      const duration = Date.now() - start;

      // Should take between 500-2000ms
      expect(duration).toBeGreaterThanOrEqual(450); // Allow slight variance
      expect(duration).toBeLessThanOrEqual(2100);
    });

    it('should use custom response when set', async () => {
      const customContent = '# Custom Document\n\nThis is custom content for testing.';
      service.setCustomResponse(customContent);

      const result = await service.generateDocument(
        mockTemplate,
        mockExplanation,
        mockYamlData
      );

      expect(result.content).toBe(customContent);
    });

    it('should fill template variables', async () => {
      const result = await service.generateDocument(
        mockTemplate,
        mockExplanation,
        mockYamlData
      );

      // Check that {{client}} was replaced with actual value
      expect(result.content).not.toContain('{{client}}');
      expect(result.content).toContain('Acme Corp');

      // Check that {{attorney}} was replaced
      expect(result.content).not.toContain('{{attorney}}');
      expect(result.content).toContain('John Doe, Esq.');
    });

    it('should add legal language to short sections', async () => {
      const shortTemplate: Template = {
        ...mockTemplate,
        sections: [{
          id: 'short',
          title: 'Short Section',
          order: 1,
          required: true,
          content: 'Brief content.',
          firmCustomizable: false
        }]
      };

      const result = await service.generateDocument(
        shortTemplate,
        mockExplanation,
        mockYamlData
      );

      expect(result.content).toContain('Pursuant to the terms and conditions');
    });
  });

  describe('failure simulation', () => {
    it('should simulate timeout when configured', async () => {
      service.setFailureMode('timeout');

      await expect(
        service.generateDocument(mockTemplate, mockExplanation, mockYamlData)
      ).rejects.toThrow('Request timeout');
    });

    it('should simulate generic error when configured', async () => {
      service.setFailureMode('error');

      await expect(
        service.generateDocument(mockTemplate, mockExplanation, mockYamlData)
      ).rejects.toThrow('Mock API error');
    });

    it('should simulate service unavailable when configured', async () => {
      service.setFailureMode('unavailable');

      try {
        await service.generateDocument(mockTemplate, mockExplanation, mockYamlData);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Service temporarily unavailable');
        expect(error.status).toBe(503);
        expect(error.code).toBe('service_unavailable');
      }
    });

    it('should reset failure mode', async () => {
      service.setFailureMode('error');
      service.reset();

      // Should succeed after reset
      const result = await service.generateDocument(
        mockTemplate,
        mockExplanation,
        mockYamlData
      );

      expect(result.content).toContain('# Test Legal Document');
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      // Set up some state
      service.setCustomResponse('Custom');
      service.setFailureMode('error');
      await service.generateDocument(mockTemplate, mockExplanation, mockYamlData).catch(() => {});

      // Reset
      service.reset();

      // Verify state is cleared
      expect(service.getCallCount()).toBe(0);
      
      // Should generate normal content (not custom)
      const result = await service.generateDocument(
        mockTemplate,
        mockExplanation,
        mockYamlData
      );
      expect(result.content).not.toBe('Custom');
      expect(result.content).toContain('# Test Legal Document');
    });
  });

  describe('buildPrompt', () => {
    it('should provide mock buildPrompt method', () => {
      const prompt = (service as any).buildPrompt(
        mockTemplate,
        mockExplanation,
        mockYamlData
      );

      expect(prompt).toBe('Mock prompt for Test Legal Document');
    });
  });

  describe('edge cases', () => {
    it('should handle missing YAML data gracefully', async () => {
      const incompleteData: YamlData = {
        client: '',
        attorney: '',
        document_type: 'test',
        template: 'test'
      };

      const result = await service.generateDocument(
        mockTemplate,
        mockExplanation,
        incompleteData
      );

      expect(result.content).toContain('[client]'); // Placeholder for missing data
      expect(result.content).toContain('[attorney]');
    });

    it('should handle templates with no sections', async () => {
      const emptyTemplate: Template = {
        ...mockTemplate,
        sections: []
      };

      const result = await service.generateDocument(
        emptyTemplate,
        mockExplanation,
        mockYamlData
      );

      expect(result.content).toContain('# Test Legal Document');
      expect(result.content).toContain('## Signatures');
    });

    it('should sort sections by order', async () => {
      const unorderedTemplate: Template = {
        ...mockTemplate,
        sections: [
          { ...mockTemplate.sections[1], order: 2 },
          { ...mockTemplate.sections[0], order: 1 }
        ]
      };

      const result = await service.generateDocument(
        unorderedTemplate,
        mockExplanation,
        mockYamlData
      );

      const introIndex = result.content.indexOf('## Introduction');
      const termsIndex = result.content.indexOf('## Terms');
      
      expect(introIndex).toBeLessThan(termsIndex);
    });
  });
}); 