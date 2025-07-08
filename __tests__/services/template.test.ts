/**
 * Unit tests for the template service
 */

// Mock logger before imports
jest.mock('../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

import {
  getTemplatePath,
  getExplanationPath,
  loadTemplate,
  loadExplanation,
  validateSectionOrder,
  getRequiredFieldIds,
  shouldIncludeSection
} from '../../src/services/template';
import { Template, TemplateLoadError } from '../../src/types';
import { promises as fs } from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));


describe('Template Service', () => {
  const mockTemplate: Template = {
    id: 'test-template',
    name: 'Test Template',
    description: 'Test description',
    version: '1.0.0',
    category: 'general',
    jurisdiction: 'federal',
    requiredFields: [
      {
        id: 'field1',
        name: 'Field 1',
        type: 'text',
        description: 'Test field 1',
        required: true
      },
      {
        id: 'field2',
        name: 'Field 2',
        type: 'number',
        description: 'Test field 2',
        required: false
      }
    ],
    sections: [
      {
        id: 'section1',
        title: 'Section 1',
        order: 1,
        required: true,
        content: 'Test content'
      },
      {
        id: 'section2',
        title: 'Section 2',
        order: 2,
        required: false,
        content: 'Test content 2'
      }
    ],
    metadata: {
      category: 'general',
      jurisdiction: 'federal',
      lastUpdated: '2024-01-01',
      author: 'Test',
      tags: []
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTemplatePath', () => {
    it('should return correct template path', () => {
      const documentType = 'patent-assignment-agreement';
      const expectedPath = path.join(process.cwd(), 'templates', 'core', 'patent-assignment-agreement.json');
      
      expect(getTemplatePath(documentType)).toBe(expectedPath);
    });

    it('should handle different document types', () => {
      const types = ['cease-and-desist-letter', 'nda-ip-specific', 'trademark-application'];
      
      types.forEach(type => {
        const result = getTemplatePath(type);
        expect(result).toContain('templates/core');
        expect(result).toContain(`${type}.json`);
      });
    });
  });

  describe('getExplanationPath', () => {
    it('should return correct explanation path for known types', () => {
      const mappings = [
        ['provisional-patent-application', '01-provisional-patent-explanation'],
        ['nda-ip-specific', '02-nda-ip-specific-explanation'],
        ['patent-license-agreement', '03-patent-license-explanation'],
        ['trademark-application', '04-trademark-application-explanation'],
        ['patent-assignment-agreement', '05-patent-assignment-explanation'],
        ['office-action-response', '06-office-action-response-explanation'],
        ['cease-and-desist-letter', '07-cease-desist-explanation'],
        ['technology-transfer-agreement', '08-technology-transfer-explanation']
      ];

      mappings.forEach(([docType, expectedFile]) => {
        const result = getExplanationPath(docType);
        expect(result).toContain('templates/explanations');
        expect(result).toContain(`${expectedFile}.md`);
      });
    });

    it('should throw error for unknown document type', () => {
      expect(() => getExplanationPath('unknown-type')).toThrow(Error);
      expect(() => getExplanationPath('unknown-type')).toThrow(
        'No explanation mapping found for document type: unknown-type'
      );
    });
  });

  describe('loadTemplate', () => {
    it('should load and validate template successfully', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockTemplate));
      
      const result = await loadTemplate('test-template');
      
      expect(result).toEqual(mockTemplate);
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('test-template.json'),
        'utf-8'
      );
    });

    it('should throw error if file not found', async () => {
      const error = new Error('ENOENT');
      (error as any).code = 'ENOENT';
      (fs.readFile as jest.Mock).mockRejectedValue(error);
      
      await expect(loadTemplate('missing-template')).rejects.toThrow(TemplateLoadError);
      await expect(loadTemplate('missing-template')).rejects.toThrow(
        'Template file not found'
      );
    });

    it('should throw error for invalid JSON', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('{ invalid json');
      
      await expect(loadTemplate('bad-json')).rejects.toThrow(TemplateLoadError);
      await expect(loadTemplate('bad-json')).rejects.toThrow(
        'Invalid JSON in template file'
      );
    });

    it('should throw error for missing required fields', async () => {
      const invalidTemplate = {
        id: 'test',
        // Missing other required fields
      };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(invalidTemplate));
      
      await expect(loadTemplate('invalid-template')).rejects.toThrow(TemplateLoadError);
      await expect(loadTemplate('invalid-template')).rejects.toThrow(
        'Template file does not match expected schema'
      );
    });

    it('should throw error if no required fields', async () => {
      const templateNoFields = { ...mockTemplate, requiredFields: [] };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(templateNoFields));
      
      await expect(loadTemplate('no-fields')).rejects.toThrow(TemplateLoadError);
      await expect(loadTemplate('no-fields')).rejects.toThrow(
        'Template must have at least one required field'
      );
    });

    it('should throw error if no sections', async () => {
      const templateNoSections = { ...mockTemplate, sections: [] };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(templateNoSections));
      
      await expect(loadTemplate('no-sections')).rejects.toThrow(TemplateLoadError);
      await expect(loadTemplate('no-sections')).rejects.toThrow(
        'Template must have at least one section'
      );
    });

    it('should handle unexpected errors', async () => {
      const error = new Error('Unexpected error');
      (fs.readFile as jest.Mock).mockRejectedValue(error);
      
      await expect(loadTemplate('error-template')).rejects.toThrow(TemplateLoadError);
      await expect(loadTemplate('error-template')).rejects.toThrow(
        'Failed to load template: Unexpected error'
      );
    });
  });

  describe('loadExplanation', () => {
    it('should load explanation successfully', async () => {
      const explanationContent = '# Patent Assignment Explanation\n\nThis document...';
      (fs.readFile as jest.Mock).mockResolvedValue(explanationContent);
      
      const result = await loadExplanation('patent-assignment-agreement');
      
      expect(result).toBe(explanationContent);
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('05-patent-assignment-explanation.md'),
        'utf-8'
      );
    });

    it('should throw error if file not found', async () => {
      const error = new Error('ENOENT');
      (error as any).code = 'ENOENT';
      (fs.readFile as jest.Mock).mockRejectedValue(error);
      
      await expect(loadExplanation('patent-assignment-agreement')).rejects.toThrow(TemplateLoadError);
      await expect(loadExplanation('patent-assignment-agreement')).rejects.toThrow(
        'Explanation file not found'
      );
    });

    it('should throw error for empty file', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('');
      
      await expect(loadExplanation('patent-assignment-agreement')).rejects.toThrow(TemplateLoadError);
      await expect(loadExplanation('patent-assignment-agreement')).rejects.toThrow(
        'Explanation file is empty'
      );
    });

    it('should throw error for whitespace-only content', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('   \n\n   \t   ');
      
      await expect(loadExplanation('patent-assignment-agreement')).rejects.toThrow(TemplateLoadError);
      await expect(loadExplanation('patent-assignment-agreement')).rejects.toThrow(
        'Explanation file is empty'
      );
    });

    it('should handle unexpected errors', async () => {
      const error = new Error('Read error');
      (fs.readFile as jest.Mock).mockRejectedValue(error);
      
      await expect(loadExplanation('patent-assignment-agreement')).rejects.toThrow(TemplateLoadError);
      await expect(loadExplanation('patent-assignment-agreement')).rejects.toThrow(
        'Failed to load explanation: Read error'
      );
    });
  });

  describe('validateSectionOrder', () => {
    it('should return true for valid sequential order', () => {
      const template: Template = {
        ...mockTemplate,
        sections: [
          { id: 's1', title: 'S1', order: 1, required: true, content: '' },
          { id: 's2', title: 'S2', order: 2, required: true, content: '' },
          { id: 's3', title: 'S3', order: 3, required: true, content: '' }
        ]
      };
      
      expect(validateSectionOrder(template)).toBe(true);
    });

    it('should return false for duplicate orders', () => {
      const template: Template = {
        ...mockTemplate,
        sections: [
          { id: 's1', title: 'S1', order: 1, required: true, content: '' },
          { id: 's2', title: 'S2', order: 2, required: true, content: '' },
          { id: 's3', title: 'S3', order: 2, required: true, content: '' }
        ]
      };
      
      expect(validateSectionOrder(template)).toBe(false);
    });

    it('should return false for non-sequential orders', () => {
      const template: Template = {
        ...mockTemplate,
        sections: [
          { id: 's1', title: 'S1', order: 1, required: true, content: '' },
          { id: 's2', title: 'S2', order: 3, required: true, content: '' },
          { id: 's3', title: 'S3', order: 5, required: true, content: '' }
        ]
      };
      
      expect(validateSectionOrder(template)).toBe(false);
    });

    it('should return false if order does not start at 1', () => {
      const template: Template = {
        ...mockTemplate,
        sections: [
          { id: 's1', title: 'S1', order: 2, required: true, content: '' },
          { id: 's2', title: 'S2', order: 3, required: true, content: '' }
        ]
      };
      
      expect(validateSectionOrder(template)).toBe(false);
    });

    it('should handle single section', () => {
      const template: Template = {
        ...mockTemplate,
        sections: [
          { id: 's1', title: 'S1', order: 1, required: true, content: '' }
        ]
      };
      
      expect(validateSectionOrder(template)).toBe(true);
    });
  });

  describe('getRequiredFieldIds', () => {
    it('should return only required field IDs', () => {
      const template: Template = {
        ...mockTemplate,
        requiredFields: [
          { id: 'req1', name: 'Required 1', type: 'text', description: '', required: true },
          { id: 'opt1', name: 'Optional 1', type: 'text', description: '', required: false },
          { id: 'req2', name: 'Required 2', type: 'text', description: '', required: true },
          { id: 'opt2', name: 'Optional 2', type: 'text', description: '', required: false }
        ]
      };
      
      const result = getRequiredFieldIds(template);
      expect(result).toEqual(['req1', 'req2']);
    });

    it('should return empty array if no required fields', () => {
      const template: Template = {
        ...mockTemplate,
        requiredFields: [
          { id: 'opt1', name: 'Optional 1', type: 'text', description: '', required: false },
          { id: 'opt2', name: 'Optional 2', type: 'text', description: '', required: false }
        ]
      };
      
      const result = getRequiredFieldIds(template);
      expect(result).toEqual([]);
    });

    it('should handle empty requiredFields array', () => {
      const template: Template = {
        ...mockTemplate,
        requiredFields: []
      };
      
      const result = getRequiredFieldIds(template);
      expect(result).toEqual([]);
    });
  });

  describe('shouldIncludeSection', () => {
    const section = {
      id: 'test-section',
      title: 'Test Section',
      order: 1,
      required: true,
      content: 'Test content'
    };

    it('should return true if no conditions', () => {
      expect(shouldIncludeSection(section, {})).toBe(true);
    });

    describe('equals operator', () => {
      it('should return true when values match', () => {
        const sectionWithCondition = {
          ...section,
          conditionalOn: { field: 'status', value: 'active' }
        };
        
        expect(shouldIncludeSection(sectionWithCondition, { status: 'active' })).toBe(true);
      });

      it('should return false when values do not match', () => {
        const sectionWithCondition = {
          ...section,
          conditionalOn: { field: 'status', value: 'active' }
        };
        
        expect(shouldIncludeSection(sectionWithCondition, { status: 'inactive' })).toBe(false);
      });
    });

    describe('notEquals operator', () => {
      it('should return true when values do not match', () => {
        const sectionWithCondition = {
          ...section,
          conditionalOn: { field: 'status', value: 'active', operator: 'notEquals' as const }
        };
        
        expect(shouldIncludeSection(sectionWithCondition, { status: 'inactive' })).toBe(true);
      });

      it('should return false when values match', () => {
        const sectionWithCondition = {
          ...section,
          conditionalOn: { field: 'status', value: 'active', operator: 'notEquals' as const }
        };
        
        expect(shouldIncludeSection(sectionWithCondition, { status: 'active' })).toBe(false);
      });
    });

    describe('contains operator', () => {
      it('should return true when field contains value', () => {
        const sectionWithCondition = {
          ...section,
          conditionalOn: { field: 'description', value: 'patent', operator: 'contains' as const }
        };
        
        expect(shouldIncludeSection(sectionWithCondition, { description: 'This is a patent application' })).toBe(true);
      });

      it('should return false when field does not contain value', () => {
        const sectionWithCondition = {
          ...section,
          conditionalOn: { field: 'description', value: 'patent', operator: 'contains' as const }
        };
        
        expect(shouldIncludeSection(sectionWithCondition, { description: 'This is a trademark application' })).toBe(false);
      });
    });

    describe('greaterThan operator', () => {
      it('should return true when field is greater than value', () => {
        const sectionWithCondition = {
          ...section,
          conditionalOn: { field: 'amount', value: 100, operator: 'greaterThan' as const }
        };
        
        expect(shouldIncludeSection(sectionWithCondition, { amount: 150 })).toBe(true);
      });

      it('should return false when field is not greater than value', () => {
        const sectionWithCondition = {
          ...section,
          conditionalOn: { field: 'amount', value: 100, operator: 'greaterThan' as const }
        };
        
        expect(shouldIncludeSection(sectionWithCondition, { amount: 50 })).toBe(false);
      });
    });

    describe('lessThan operator', () => {
      it('should return true when field is less than value', () => {
        const sectionWithCondition = {
          ...section,
          conditionalOn: { field: 'amount', value: 100, operator: 'lessThan' as const }
        };
        
        expect(shouldIncludeSection(sectionWithCondition, { amount: 50 })).toBe(true);
      });

      it('should return false when field is not less than value', () => {
        const sectionWithCondition = {
          ...section,
          conditionalOn: { field: 'amount', value: 100, operator: 'lessThan' as const }
        };
        
        expect(shouldIncludeSection(sectionWithCondition, { amount: 150 })).toBe(false);
      });
    });

    it('should return true for unknown operator', () => {
      const sectionWithCondition = {
        ...section,
        conditionalOn: { field: 'status', value: 'active', operator: 'unknown' as any }
      };
      
      expect(shouldIncludeSection(sectionWithCondition, { status: 'inactive' })).toBe(true);
    });
  });
}); 