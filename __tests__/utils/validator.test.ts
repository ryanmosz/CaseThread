/**
 * Unit tests for the validator utility
 */

import {
  SUPPORTED_TYPES,
  isValidDocumentType,
  validateYamlFields,
  formatValidationErrors,
  getDocumentTypeName,
  listSupportedTypes
} from '../../src/utils/validator';
import { TemplateField, ValidationError } from '../../src/types';

describe('Validator Utility', () => {
  describe('SUPPORTED_TYPES', () => {
    it('should contain 8 document types', () => {
      expect(SUPPORTED_TYPES).toHaveLength(8);
    });

    it('should contain all expected document types', () => {
      const expectedTypes = [
        'cease-and-desist-letter',
        'nda-ip-specific',
        'office-action-response',
        'patent-assignment-agreement',
        'patent-license-agreement',
        'provisional-patent-application',
        'technology-transfer-agreement',
        'trademark-application'
      ];
      
      expectedTypes.forEach(type => {
        expect(SUPPORTED_TYPES).toContain(type);
      });
    });
  });

  describe('isValidDocumentType', () => {
    it('should return true for valid document types', () => {
      SUPPORTED_TYPES.forEach(type => {
        expect(isValidDocumentType(type)).toBe(true);
      });
    });

    it('should return false for invalid document types', () => {
      expect(isValidDocumentType('invalid-type')).toBe(false);
      expect(isValidDocumentType('')).toBe(false);
      expect(isValidDocumentType('patent')).toBe(false);
      expect(isValidDocumentType('PATENT-ASSIGNMENT-AGREEMENT')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isValidDocumentType('Patent-Assignment-Agreement')).toBe(false);
      expect(isValidDocumentType('patent-assignment-agreement')).toBe(true);
    });
  });

  describe('validateYamlFields', () => {
    const createTextField = (id: string, required = true, validation?: any): TemplateField => ({
      id,
      name: `Test ${id}`,
      type: 'text',
      description: 'Test field',
      required,
      validation
    });

    const createNumberField = (id: string, required = true, validation?: any): TemplateField => ({
      id,
      name: `Test ${id}`,
      type: 'number',
      description: 'Test number field',
      required,
      validation
    });

    it('should return empty array for valid data', () => {
      const yamlData = {
        client: 'Test Client',
        attorney: 'Test Attorney',
        document_type: 'patent-assignment',
        template: 'patent-assignment.json',
        field1: 'value1',
        field2: 'value2'
      };

      const fields: TemplateField[] = [
        createTextField('field1'),
        createTextField('field2')
      ];

      const errors = validateYamlFields(yamlData, fields);
      expect(errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const yamlData = {
        client: 'Test Client',
        attorney: 'Test Attorney',
        document_type: 'patent-assignment',
        template: 'patent-assignment.json',
        field1: 'value1'
      };

      const fields: TemplateField[] = [
        createTextField('field1'),
        createTextField('field2'),
        createTextField('field3')
      ];

      const errors = validateYamlFields(yamlData, fields);
      expect(errors).toHaveLength(2);
      expect(errors[0]).toBeInstanceOf(ValidationError);
      expect(errors[0].field).toBe('field2');
      expect(errors[1].field).toBe('field3');
    });

    it('should skip non-required fields', () => {
      const yamlData = {
        client: 'Test Client',
        attorney: 'Test Attorney',
        document_type: 'patent-assignment',
        template: 'patent-assignment.json',
        field1: 'value1'
      };

      const fields: TemplateField[] = [
        createTextField('field1'),
        createTextField('field2', false),
        createTextField('field3', false)
      ];

      const errors = validateYamlFields(yamlData, fields);
      expect(errors).toHaveLength(0);
    });

    describe('text field validation', () => {
      it('should validate minimum length', () => {
        const yamlData = {
          client: 'Test',
          attorney: 'Test',
          document_type: 'test',
          template: 'test.json',
          field1: 'ab'
        };

        const fields: TemplateField[] = [
          createTextField('field1', true, { minLength: 3 })
        ];

        const errors = validateYamlFields(yamlData, fields);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('at least 3 characters');
      });

      it('should validate maximum length', () => {
        const yamlData = {
          client: 'Test',
          attorney: 'Test',
          document_type: 'test',
          template: 'test.json',
          field1: 'abcdef'
        };

        const fields: TemplateField[] = [
          createTextField('field1', true, { maxLength: 5 })
        ];

        const errors = validateYamlFields(yamlData, fields);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('not exceed 5 characters');
      });

      it('should validate pattern', () => {
        const yamlData = {
          client: 'Test',
          attorney: 'Test',
          document_type: 'test',
          template: 'test.json',
          field1: 'abc123'
        };

        const fields: TemplateField[] = [
          createTextField('field1', true, { pattern: '^[a-z]+$' })
        ];

        const errors = validateYamlFields(yamlData, fields);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('does not match required pattern');
      });
    });

    describe('number field validation', () => {
      it('should validate numeric values', () => {
        const yamlData = {
          client: 'Test',
          attorney: 'Test',
          document_type: 'test',
          template: 'test.json',
          field1: 'not-a-number'
        };

        const fields: TemplateField[] = [
          createNumberField('field1')
        ];

        const errors = validateYamlFields(yamlData, fields);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('must be a valid number');
      });

      it('should validate minimum value', () => {
        const yamlData = {
          client: 'Test',
          attorney: 'Test',
          document_type: 'test',
          template: 'test.json',
          field1: 5
        };

        const fields: TemplateField[] = [
          createNumberField('field1', true, { min: 10 })
        ];

        const errors = validateYamlFields(yamlData, fields);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('must be at least 10');
      });

      it('should validate maximum value', () => {
        const yamlData = {
          client: 'Test',
          attorney: 'Test',
          document_type: 'test',
          template: 'test.json',
          field1: 15
        };

        const fields: TemplateField[] = [
          createNumberField('field1', true, { max: 10 })
        ];

        const errors = validateYamlFields(yamlData, fields);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('must not exceed 10');
      });
    });

    describe('other field types', () => {
      it('should validate date fields', () => {
        const yamlData = {
          client: 'Test',
          attorney: 'Test',
          document_type: 'test',
          template: 'test.json',
          dateField: 'not-a-date'
        };

        const fields: TemplateField[] = [{
          id: 'dateField',
          name: 'Date Field',
          type: 'date',
          description: 'Test date',
          required: true
        }];

        const errors = validateYamlFields(yamlData, fields);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('must be a valid date');
      });

      it('should validate boolean fields', () => {
        const yamlData = {
          client: 'Test',
          attorney: 'Test',
          document_type: 'test',
          template: 'test.json',
          boolField: 'yes'
        };

        const fields: TemplateField[] = [{
          id: 'boolField',
          name: 'Bool Field',
          type: 'boolean',
          description: 'Test boolean',
          required: true
        }];

        const errors = validateYamlFields(yamlData, fields);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('must be a boolean');
      });

      it('should validate select fields', () => {
        const yamlData = {
          client: 'Test',
          attorney: 'Test',
          document_type: 'test',
          template: 'test.json',
          selectField: 'invalid-option'
        };

        const fields: TemplateField[] = [{
          id: 'selectField',
          name: 'Select Field',
          type: 'select',
          description: 'Test select',
          required: true,
          options: ['option1', 'option2', 'option3']
        }];

        const errors = validateYamlFields(yamlData, fields);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('must be one of: option1, option2, option3');
      });

      it('should validate multiselect fields', () => {
        const yamlData = {
          client: 'Test',
          attorney: 'Test',
          document_type: 'test',
          template: 'test.json',
          multiField: ['option1', 'invalid-option']
        };

        const fields: TemplateField[] = [{
          id: 'multiField',
          name: 'Multi Field',
          type: 'multiselect',
          description: 'Test multiselect',
          required: true,
          options: ['option1', 'option2', 'option3']
        }];

        const errors = validateYamlFields(yamlData, fields);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('contains invalid options: invalid-option');
      });
    });
  });

  describe('formatValidationErrors', () => {
    it('should return empty string for no errors', () => {
      expect(formatValidationErrors([])).toBe('');
    });

    it('should format single error', () => {
      const errors = [
        new ValidationError('Field is required', 'field1')
      ];

      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain('Validation failed with 1 error:');
      expect(formatted).toContain('1. Field is required');
    });

    it('should format multiple errors', () => {
      const errors = [
        new ValidationError('Field is required', 'field1'),
        new ValidationError('Invalid format', 'field2'),
        new ValidationError('Value too long', 'field3')
      ];

      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain('Validation failed with 3 errors:');
      expect(formatted).toContain('1. Field is required');
      expect(formatted).toContain('2. Invalid format');
      expect(formatted).toContain('3. Value too long');
    });
  });

  describe('getDocumentTypeName', () => {
    it('should convert kebab-case to Title Case', () => {
      expect(getDocumentTypeName('patent-assignment-agreement'))
        .toBe('Patent Assignment Agreement');
      expect(getDocumentTypeName('nda-ip-specific'))
        .toBe('Nda Ip Specific');
      expect(getDocumentTypeName('cease-and-desist-letter'))
        .toBe('Cease And Desist Letter');
    });

    it('should handle single word types', () => {
      expect(getDocumentTypeName('patent')).toBe('Patent');
      expect(getDocumentTypeName('nda')).toBe('Nda');
    });

    it('should handle empty string', () => {
      expect(getDocumentTypeName('')).toBe('');
    });
  });

  describe('listSupportedTypes', () => {
    it('should return all supported types with display names', () => {
      const types = listSupportedTypes();
      
      expect(types).toHaveLength(8);
      expect(types[0]).toHaveProperty('id');
      expect(types[0]).toHaveProperty('name');
    });

    it('should have correct mappings', () => {
      const types = listSupportedTypes();
      const patentAssignment = types.find(t => t.id === 'patent-assignment-agreement');
      
      expect(patentAssignment).toBeDefined();
      expect(patentAssignment?.name).toBe('Patent Assignment Agreement');
    });
  });
}); 