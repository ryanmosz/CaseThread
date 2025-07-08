/**
 * Unit tests for the YAML service
 */

// Mock logger before importing yaml service
jest.mock('../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  logDebug: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
  logInfo: jest.fn()
}));

import {
  parseYamlContent,
  validateYamlData,
  parseYaml,
  extractDocumentType,
  formatYamlError,
  checkMissingFields,
  mergeWithDefaults
} from '../../src/services/yaml';
import { YamlData, YamlParseError, ValidationError } from '../../src/types';
import { promises as fs } from 'fs';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));

describe('YAML Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseYamlContent', () => {
    it('should parse valid YAML content', () => {
      const yamlContent = `
client: Test Client
attorney: Test Attorney
document_type: patent-assignment
template: patent-assignment.json
field1: value1
field2: 123
`;
      
      const result = parseYamlContent(yamlContent);
      expect(result).toEqual({
        client: 'Test Client',
        attorney: 'Test Attorney',
        document_type: 'patent-assignment',
        template: 'patent-assignment.json',
        field1: 'value1',
        field2: 123
      });
    });

    it('should throw error for invalid YAML syntax', () => {
      // This is properly malformed YAML that js-yaml will reject
      const invalidYaml = `
client: Test Client
  bad: indentation
  without: proper structure
attorney: Test Attorney
`;
      
      expect(() => parseYamlContent(invalidYaml, 'test.yaml')).toThrow(YamlParseError);
      expect(() => parseYamlContent(invalidYaml, 'test.yaml')).toThrow('YAML parsing error');
    });

    it('should throw error for non-object content', () => {
      const scalarYaml = '"just a string"';
      
      expect(() => parseYamlContent(scalarYaml, 'test.yaml')).toThrow(YamlParseError);
      expect(() => parseYamlContent(scalarYaml, 'test.yaml')).toThrow('YAML content must be an object');
    });

    it('should throw error for null content', () => {
      const nullYaml = 'null';
      
      expect(() => parseYamlContent(nullYaml, 'test.yaml')).toThrow(YamlParseError);
      expect(() => parseYamlContent(nullYaml, 'test.yaml')).toThrow('YAML content must be an object');
    });

    it('should handle arrays properly (throw error)', () => {
      const arrayYaml = '- item1\n- item2';
      
      expect(() => parseYamlContent(arrayYaml)).toThrow(YamlParseError);
      expect(() => parseYamlContent(arrayYaml)).toThrow('YAML content must be an object');
    });

    it('should preserve line and column information in errors', () => {
      const invalidYaml = `
client: Test
  bad: indentation
`;
      
      try {
        parseYamlContent(invalidYaml, 'test.yaml');
      } catch (error) {
        expect(error).toBeInstanceOf(YamlParseError);
        expect((error as YamlParseError).line).toBeDefined();
        expect((error as YamlParseError).column).toBeDefined();
      }
    });
  });

  describe('validateYamlData', () => {
    it('should validate correct YAML data', () => {
      const data = {
        client: 'Test Client',
        attorney: 'Test Attorney',
        document_type: 'patent-assignment',
        template: 'patent-assignment.json'
      };
      
      const result = validateYamlData(data);
      expect(result).toEqual(data);
    });

    it('should throw error for missing required fields', () => {
      const data = {
        client: 'Test Client',
        attorney: 'Test Attorney'
        // Missing document_type and template
      };
      
      expect(() => validateYamlData(data)).toThrow(ValidationError);
      expect(() => validateYamlData(data)).toThrow('Missing required fields: document_type, template');
    });

    it('should throw error for empty string fields', () => {
      const data = {
        client: '',
        attorney: 'Test Attorney',
        document_type: 'patent-assignment',
        template: 'patent-assignment.json'
      };
      
      expect(() => validateYamlData(data)).toThrow(ValidationError);
      expect(() => validateYamlData(data)).toThrow('Field "client" must be a non-empty string');
    });

    it('should throw error for whitespace-only fields', () => {
      const data = {
        client: 'Test Client',
        attorney: '   ',
        document_type: 'patent-assignment',
        template: 'patent-assignment.json'
      };
      
      expect(() => validateYamlData(data)).toThrow(ValidationError);
      expect(() => validateYamlData(data)).toThrow('Field "attorney" must be a non-empty string');
    });

    it('should throw error for template without .json extension', () => {
      const data = {
        client: 'Test Client',
        attorney: 'Test Attorney',
        document_type: 'patent-assignment',
        template: 'patent-assignment'
      };
      
      expect(() => validateYamlData(data)).toThrow(ValidationError);
      expect(() => validateYamlData(data)).toThrow('Field "template" must reference a JSON file');
    });

    it('should allow additional fields beyond required ones', () => {
      const data = {
        client: 'Test Client',
        attorney: 'Test Attorney',
        document_type: 'patent-assignment',
        template: 'patent-assignment.json',
        assignor: 'John Doe',
        assignee: 'Company Inc',
        extra_field: 'extra value'
      };
      
      const result = validateYamlData(data);
      expect(result).toEqual(data);
    });

    it('should throw error for non-string required fields', () => {
      const data = {
        client: 123,
        attorney: 'Test Attorney',
        document_type: 'patent-assignment',
        template: 'patent-assignment.json'
      };
      
      expect(() => validateYamlData(data)).toThrow(ValidationError);
      expect(() => validateYamlData(data)).toThrow('Field "client" must be a non-empty string');
    });
  });

  describe('parseYaml', () => {
    it('should load and parse YAML file successfully', async () => {
      const yamlContent = `
client: Test Client
attorney: Test Attorney
document_type: patent-assignment
template: patent-assignment-agreement.json
assignor: John Doe
`;
      
      (fs.readFile as jest.Mock).mockResolvedValue(yamlContent);
      
      const result = await parseYaml('test.yaml');
      
      expect(result).toEqual({
        client: 'Test Client',
        attorney: 'Test Attorney',
        document_type: 'patent-assignment',
        template: 'patent-assignment-agreement.json',
        assignor: 'John Doe'
      });
    });

    it('should handle absolute paths', async () => {
      const yamlContent = `
client: Test Client
attorney: Test Attorney
document_type: test
template: test.json
`;
      
      (fs.readFile as jest.Mock).mockResolvedValue(yamlContent);
      
      await parseYaml('/absolute/path/test.yaml');
      
      expect(fs.readFile).toHaveBeenCalledWith('/absolute/path/test.yaml', 'utf-8');
    });

    it('should handle relative paths', async () => {
      const yamlContent = `
client: Test Client
attorney: Test Attorney
document_type: test
template: test.json
`;
      
      (fs.readFile as jest.Mock).mockResolvedValue(yamlContent);
      
      await parseYaml('./relative/test.yaml');
      
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('relative/test.yaml'),
        'utf-8'
      );
    });

    it('should throw error for non-existent file', async () => {
      const error = new Error('ENOENT');
      (error as any).code = 'ENOENT';
      (fs.readFile as jest.Mock).mockRejectedValue(error);
      
      await expect(parseYaml('missing.yaml')).rejects.toThrow(YamlParseError);
      await expect(parseYaml('missing.yaml')).rejects.toThrow('YAML file not found');
    });

    it('should throw error for empty file', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('');
      
      await expect(parseYaml('empty.yaml')).rejects.toThrow(YamlParseError);
      await expect(parseYaml('empty.yaml')).rejects.toThrow('YAML file is empty');
    });

    it('should throw error for whitespace-only file', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('   \n\n\t   ');
      
      await expect(parseYaml('whitespace.yaml')).rejects.toThrow(YamlParseError);
      await expect(parseYaml('whitespace.yaml')).rejects.toThrow('YAML file is empty');
    });

    it('should handle parsing errors', async () => {
      const invalidYaml = `
client: Test
  bad: indentation
`;
      
      (fs.readFile as jest.Mock).mockResolvedValue(invalidYaml);
      
      await expect(parseYaml('invalid.yaml')).rejects.toThrow(YamlParseError);
    });

    it('should handle validation errors', async () => {
      const invalidData = `
client: Test Client
# Missing other required fields
`;
      
      (fs.readFile as jest.Mock).mockResolvedValue(invalidData);
      
      await expect(parseYaml('incomplete.yaml')).rejects.toThrow(ValidationError);
    });

    it('should handle unexpected errors', async () => {
      const error = new Error('Unexpected error');
      (fs.readFile as jest.Mock).mockRejectedValue(error);
      
      await expect(parseYaml('error.yaml')).rejects.toThrow(YamlParseError);
      await expect(parseYaml('error.yaml')).rejects.toThrow('Failed to parse YAML file: Unexpected error');
    });
  });

  describe('extractDocumentType', () => {
    it('should extract document type from filename with extension', () => {
      expect(extractDocumentType('patent-assignment-agreement.json')).toBe('patent-assignment-agreement');
      expect(extractDocumentType('nda-ip-specific.json')).toBe('nda-ip-specific');
      expect(extractDocumentType('cease-and-desist-letter.json')).toBe('cease-and-desist-letter');
    });

    it('should return filename unchanged if no .json extension', () => {
      expect(extractDocumentType('patent-assignment')).toBe('patent-assignment');
      expect(extractDocumentType('some-document.txt')).toBe('some-document.txt');
    });

    it('should handle edge cases', () => {
      expect(extractDocumentType('')).toBe('');
      expect(extractDocumentType('.json')).toBe('');
      expect(extractDocumentType('file.json.json')).toBe('file.json');
    });
  });

  describe('formatYamlError', () => {
    it('should format YamlParseError with file and location', () => {
      const error = new YamlParseError('Parse failed', 'test.yaml', 5, 10);
      
      const formatted = formatYamlError(error);
      expect(formatted).toBe('Error in test.yaml: Parse failed (line 5, column 10)');
    });

    it('should format YamlParseError without location', () => {
      const error = new YamlParseError('Parse failed', 'test.yaml');
      
      const formatted = formatYamlError(error);
      expect(formatted).toBe('Error in test.yaml: Parse failed');
    });

    it('should format YamlParseError without file', () => {
      const error = new YamlParseError('Parse failed');
      
      const formatted = formatYamlError(error);
      expect(formatted).toBe('Parse failed');
    });

    it('should format ValidationError with field', () => {
      const error = new ValidationError('Invalid value', 'client', 'bad value');
      
      const formatted = formatYamlError(error);
      expect(formatted).toBe('Validation error: Invalid value (field: client)');
    });

    it('should format ValidationError without field', () => {
      const error = new ValidationError('Missing required fields');
      
      const formatted = formatYamlError(error);
      expect(formatted).toBe('Validation error: Missing required fields');
    });

    it('should format generic Error', () => {
      const error = new Error('Something went wrong');
      
      const formatted = formatYamlError(error);
      expect(formatted).toBe('Error: Something went wrong');
    });
  });

  describe('checkMissingFields', () => {
    const yamlData: YamlData = {
      client: 'Test Client',
      attorney: 'Test Attorney',
      document_type: 'patent-assignment',
      template: 'patent-assignment.json',
      field1: 'value1',
      field2: '',
      field3: null,
      field4: [],
      field5: 'has value'
    };

    it('should return empty array when all fields are present', () => {
      const requiredFields = ['field1', 'field5'];
      
      const result = checkMissingFields(yamlData, requiredFields);
      expect(result).toEqual([]);
    });

    it('should detect missing fields', () => {
      const requiredFields = ['field1', 'field6', 'field7'];
      
      const result = checkMissingFields(yamlData, requiredFields);
      expect(result).toEqual(['field6', 'field7']);
    });

    it('should treat empty string as missing', () => {
      const requiredFields = ['field2'];
      
      const result = checkMissingFields(yamlData, requiredFields);
      expect(result).toEqual(['field2']);
    });

    it('should treat null as missing', () => {
      const requiredFields = ['field3'];
      
      const result = checkMissingFields(yamlData, requiredFields);
      expect(result).toEqual(['field3']);
    });

    it('should treat empty array as missing', () => {
      const requiredFields = ['field4'];
      
      const result = checkMissingFields(yamlData, requiredFields);
      expect(result).toEqual(['field4']);
    });

    it('should handle whitespace-only strings as missing', () => {
      const data: YamlData = {
        ...yamlData,
        whitespaceField: '   '
      };
      
      const result = checkMissingFields(data, ['whitespaceField']);
      expect(result).toEqual(['whitespaceField']);
    });

    it('should handle undefined fields', () => {
      const requiredFields = ['undefinedField'];
      
      const result = checkMissingFields(yamlData, requiredFields);
      expect(result).toEqual(['undefinedField']);
    });
  });

  describe('mergeWithDefaults', () => {
    it('should merge defaults for missing fields', () => {
      const yamlData: YamlData = {
        client: 'Test Client',
        attorney: 'Test Attorney',
        document_type: 'patent',
        template: 'patent.json',
        field1: 'user value'
      };
      
      const defaults = {
        field1: 'default value 1',
        field2: 'default value 2',
        field3: true,
        field4: 100
      };
      
      const result = mergeWithDefaults(yamlData, defaults);
      
      expect(result).toEqual({
        client: 'Test Client',
        attorney: 'Test Attorney',
        document_type: 'patent',
        template: 'patent.json',
        field1: 'user value', // User value preserved
        field2: 'default value 2',
        field3: true,
        field4: 100
      });
    });

    it('should not override existing values', () => {
      const yamlData: YamlData = {
        client: 'Test Client',
        attorney: 'Test Attorney',
        document_type: 'patent',
        template: 'patent.json',
        status: 'active'
      };
      
      const defaults = {
        status: 'pending'
      };
      
      const result = mergeWithDefaults(yamlData, defaults);
      
      expect(result.status).toBe('active');
    });

    it('should handle empty defaults', () => {
      const yamlData: YamlData = {
        client: 'Test Client',
        attorney: 'Test Attorney',
        document_type: 'patent',
        template: 'patent.json'
      };
      
      const result = mergeWithDefaults(yamlData, {});
      
      expect(result).toEqual(yamlData);
    });

    it('should create new object, not mutate original', () => {
      const yamlData: YamlData = {
        client: 'Test Client',
        attorney: 'Test Attorney',
        document_type: 'patent',
        template: 'patent.json'
      };
      
      const defaults = {
        newField: 'new value'
      };
      
      const result = mergeWithDefaults(yamlData, defaults);
      
      expect(result).not.toBe(yamlData);
      expect(yamlData).not.toHaveProperty('newField');
      expect(result).toHaveProperty('newField', 'new value');
    });
  });
}); 