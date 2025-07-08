/**
 * Tests for IntakeGuard
 */

import { IntakeGuard } from '../../src/guards/IntakeGuard';
import { Template, YamlData } from '../../src/types';
import { logger } from '../../src/utils/logger';

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

describe('IntakeGuard', () => {
  let guard: IntakeGuard;
  let mockTemplate: Template;
  let mockYamlData: YamlData;

  beforeEach(() => {
    guard = new IntakeGuard();
    
    // Mock template
    mockTemplate = {
      id: 'test-template',
      name: 'Test Template',
      description: 'Test template description',
      version: '1.0.0',
      category: 'test',
      jurisdiction: 'federal',
      requiredFields: [
        {
          id: 'client',
          name: 'Client',
          type: 'text',
          description: 'Client name',
          required: true
        },
        {
          id: 'agreement_type',
          name: 'Agreement Type',
          type: 'select',
          description: 'Type of agreement',
          required: true,
          options: ['mutual', 'unilateral']
        },
        {
          id: 'term_years',
          name: 'Term Years',
          type: 'number',
          description: 'Number of years',
          required: true
        },
        {
          id: 'effective_date',
          name: 'Effective Date',
          type: 'date',
          description: 'When agreement becomes effective',
          required: true
        },
        {
          id: 'include_provisions',
          name: 'Include Provisions',
          type: 'boolean',
          description: 'Include additional provisions',
          required: true
        },
        {
          id: 'optional_field',
          name: 'Optional Field',
          type: 'text',
          description: 'Optional field',
          required: false
        }
      ],
      sections: [],
      metadata: {
        author: 'Test Author',
        lastUpdated: '2024-01-01',
        tags: ['test']
      }
    };

    // Mock valid YAML data
    mockYamlData = {
      client: 'Test Client',
      document_type: 'test-template',
      agreement_type: 'mutual',
      term_years: 3,
      effective_date: '2024-01-15',
      include_provisions: true
    };

    // Clear mock calls
    jest.clearAllMocks();
  });

  describe('Basic Validation', () => {
    it('should validate correct YAML data successfully', async () => {
      const result = await guard.validate({
        yamlData: mockYamlData,
        template: mockTemplate
      });

      expect(result.passed).toBe(true);
      expect(result.message).toBe('YAML validation successful');
      expect(result.severity).toBe('info');
    });

    it('should handle null yamlData', async () => {
      const result = await guard.validate({
        yamlData: null as any,
        template: mockTemplate
      });

      expect(result.passed).toBe(false);
      expect(result.message).toBe('YAML data must be an object');
      expect(result.severity).toBe('error');
    });

    it('should handle non-object yamlData', async () => {
      const result = await guard.validate({
        yamlData: 'not an object' as any,
        template: mockTemplate
      });

      expect(result.passed).toBe(false);
      expect(result.message).toBe('YAML data must be an object');
      expect(result.severity).toBe('error');
    });
  });

  describe('JSON Schema Validation', () => {
    it('should fail if client is missing', async () => {
      const invalidYaml = { ...mockYamlData };
      invalidYaml.client = undefined as any;

      const result = await guard.validate({
        yamlData: invalidYaml,
        template: mockTemplate
      });

      expect(result.passed).toBe(false);
      expect(result.message).toBe('Missing required metadata fields: client');
      expect(result.severity).toBe('error');
      expect(result.details).toEqual({ missingFields: ['client'] });
    });

    it('should fail if document_type is missing', async () => {
      const invalidYaml = { ...mockYamlData };
      invalidYaml.document_type = undefined as any;

      const result = await guard.validate({
        yamlData: invalidYaml,
        template: mockTemplate
      });

      expect(result.passed).toBe(false);
      expect(result.message).toBe('Missing required metadata fields: document_type');
      expect(result.severity).toBe('error');
    });

    it('should fail if both client and document_type are missing', async () => {
      const invalidYaml = { ...mockYamlData };
      invalidYaml.client = undefined as any;
      invalidYaml.document_type = undefined as any;

      const result = await guard.validate({
        yamlData: invalidYaml,
        template: mockTemplate
      });

      expect(result.passed).toBe(false);
      expect(result.message).toBe('Missing required metadata fields: client, document_type');
      expect(result.severity).toBe('error');
    });
  });

  describe('Required Fields Validation', () => {
    it('should pass when all required fields are present', async () => {
      const result = await guard.validate({
        yamlData: mockYamlData,
        template: mockTemplate
      });

      expect(result.passed).toBe(true);
    });

    it('should fail when required fields are missing', async () => {
      const invalidYaml = { ...mockYamlData };
      delete invalidYaml.agreement_type;
      delete invalidYaml.term_years;

      const result = await guard.validate({
        yamlData: invalidYaml,
        template: mockTemplate
      });

      expect(result.passed).toBe(false);
      expect(result.message).toBe('Missing required fields: agreement_type, term_years');
      expect(result.severity).toBe('error');
      expect(result.details).toEqual({
        missingFields: ['agreement_type', 'term_years'],
        emptyFields: []
      });
    });

    it('should fail when required fields are empty strings', async () => {
      const invalidYaml = { ...mockYamlData };
      invalidYaml.client = '';
      invalidYaml.agreement_type = '   '; // whitespace only

      const result = await guard.validate({
        yamlData: invalidYaml,
        template: mockTemplate
      });

      expect(result.passed).toBe(false);
      expect(result.message).toBe('Empty required fields: client, agreement_type');
      expect(result.severity).toBe('error');
    });

    it('should fail when required fields are null', async () => {
      const invalidYaml = { ...mockYamlData };
      invalidYaml.client = null as any;

      const result = await guard.validate({
        yamlData: invalidYaml,
        template: mockTemplate
      });

      expect(result.passed).toBe(false);
      expect(result.message).toBe('Missing required metadata fields: client');
      expect(result.severity).toBe('error');
    });

    it('should pass when template has no required fields', async () => {
      const templateWithoutRequiredFields = {
        ...mockTemplate,
        requiredFields: []
      };

      const result = await guard.validate({
        yamlData: mockYamlData,
        template: templateWithoutRequiredFields
      });

      expect(result.passed).toBe(true);
    });

    it('should pass when template has undefined required fields', async () => {
      const templateWithoutRequiredFields = {
        ...mockTemplate,
        requiredFields: undefined as any
      };

      const result = await guard.validate({
        yamlData: mockYamlData,
        template: templateWithoutRequiredFields
      });

      expect(result.passed).toBe(true);
    });
  });

  describe('Field Type Validation', () => {
    it('should validate text fields correctly', async () => {
      const result = await guard.validate({
        yamlData: mockYamlData,
        template: mockTemplate
      });

      expect(result.passed).toBe(true);
    });

    it('should fail for invalid text field type', async () => {
      const invalidYaml = { ...mockYamlData };
      invalidYaml.client = 123 as any;

      const result = await guard.validate({
        yamlData: invalidYaml,
        template: mockTemplate
      });

      expect(result.passed).toBe(false);
      expect(result.message).toContain('Field type validation failed');
      expect(result.message).toContain('client\' expected text but got number');
    });

    it('should fail for invalid number field type', async () => {
      const invalidYaml = { ...mockYamlData };
      invalidYaml.term_years = 'not a number' as any;

      const result = await guard.validate({
        yamlData: invalidYaml,
        template: mockTemplate
      });

      expect(result.passed).toBe(false);
      expect(result.message).toContain('term_years\' expected number but got string');
    });

    it('should fail for invalid boolean field type', async () => {
      const invalidYaml = { ...mockYamlData };
      invalidYaml.include_provisions = 'not a boolean' as any;

      const result = await guard.validate({
        yamlData: invalidYaml,
        template: mockTemplate
      });

      expect(result.passed).toBe(false);
      expect(result.message).toContain('include_provisions\' expected boolean but got string');
    });

    it('should fail for invalid date field type', async () => {
      const invalidYaml = { ...mockYamlData };
      invalidYaml.effective_date = 'not a date';

      const result = await guard.validate({
        yamlData: invalidYaml,
        template: mockTemplate
      });

      expect(result.passed).toBe(false);
      expect(result.message).toContain('effective_date\' expected date but got string');
    });

    it('should accept valid date formats', async () => {
      const validDates = [
        '2024-01-15',
        '2024-01-15T10:30:00Z',
        'January 15, 2024',
        '01/15/2024'
      ];

      for (const date of validDates) {
        const yamlWithDate = { ...mockYamlData };
        yamlWithDate.effective_date = date;

        const result = await guard.validate({
          yamlData: yamlWithDate,
          template: mockTemplate
        });

        expect(result.passed).toBe(true);
      }
    });

    it('should accept NaN numbers as invalid', async () => {
      const invalidYaml = { ...mockYamlData };
      invalidYaml.term_years = NaN;

      const result = await guard.validate({
        yamlData: invalidYaml,
        template: mockTemplate
      });

      expect(result.passed).toBe(false);
      expect(result.message).toContain('term_years\' expected number but got number');
    });
  });

  describe('Edge Cases', () => {
    it('should handle validation errors gracefully', async () => {
      // Mock the validateJsonSchema method to throw an error
      const originalValidateJsonSchema = (guard as any).validateJsonSchema;
      (guard as any).validateJsonSchema = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      // This should trigger the catch block
      const result = await guard.validate({
        yamlData: mockYamlData,
        template: mockTemplate
      });

      // Should handle the error gracefully
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('error');
      expect(result.message).toContain('Validation error');

      // Restore the original method
      (guard as any).validateJsonSchema = originalValidateJsonSchema;
    });

    it('should ignore optional fields in validation', async () => {
      const yamlWithOptional = {
        ...mockYamlData,
        optional_field: 'some value'
      };

      const result = await guard.validate({
        yamlData: yamlWithOptional,
        template: mockTemplate
      });

      expect(result.passed).toBe(true);
    });

    it('should handle unknown field types as valid', async () => {
      const templateWithUnknownType = {
        ...mockTemplate,
        requiredFields: [
          {
            id: 'unknown_field',
            name: 'Unknown Field',
            type: 'unknown_type' as any,
            description: 'Field with unknown type',
            required: true
          }
        ]
      };

      const yamlWithUnknownType = {
        ...mockYamlData,
        unknown_field: 'any value'
      };

      const result = await guard.validate({
        yamlData: yamlWithUnknownType,
        template: templateWithUnknownType
      });

      expect(result.passed).toBe(true);
    });
  });

  describe('Multiselect Field Validation', () => {
    it('should accept array values for multiselect', async () => {
      const templateWithMultiselect = {
        ...mockTemplate,
        requiredFields: [
          {
            id: 'multi_field',
            name: 'Multi Field',
            type: 'multiselect' as any,
            description: 'Field with multiple values',
            required: true
          }
        ]
      };

      const yamlWithMultiselect = {
        ...mockYamlData,
        multi_field: ['value1', 'value2']
      };

      const result = await guard.validate({
        yamlData: yamlWithMultiselect,
        template: templateWithMultiselect
      });

      expect(result.passed).toBe(true);
    });

    it('should accept string values for multiselect', async () => {
      const templateWithMultiselect = {
        ...mockTemplate,
        requiredFields: [
          {
            id: 'multi_field',
            name: 'Multi Field',
            type: 'multiselect' as any,
            description: 'Field with multiple values',
            required: true
          }
        ]
      };

      const yamlWithMultiselect = {
        ...mockYamlData,
        multi_field: 'single_value'
      };

      const result = await guard.validate({
        yamlData: yamlWithMultiselect,
        template: templateWithMultiselect
      });

      expect(result.passed).toBe(true);
    });
  });

  describe('Logging', () => {
    it('should log debug information on successful validation', async () => {
      await guard.validate({
        yamlData: mockYamlData,
        template: mockTemplate
      });

      expect(logger.debug).toHaveBeenCalledWith('IntakeGuard validation passed', {
        requiredFields: mockTemplate.requiredFields.length,
        providedFields: Object.keys(mockYamlData).length
      });
    });

    it('should log error information on validation failure', async () => {
      // Mock the validateJsonSchema method to throw an error
      const originalValidateJsonSchema = (guard as any).validateJsonSchema;
      (guard as any).validateJsonSchema = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      await guard.validate({
        yamlData: mockYamlData,
        template: mockTemplate
      });

      expect(logger.error).toHaveBeenCalledWith('IntakeGuard validation error', {
        error: expect.any(Error)
      });

      // Restore the original method
      (guard as any).validateJsonSchema = originalValidateJsonSchema;
    });
  });
}); 