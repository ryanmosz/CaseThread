/**
 * Field Mapper Service - Maps complex YAML structures to template field names
 */

import { logger } from '../utils/logger';

export interface FieldMapping {
  templateField: string;
  yamlPath: string;
  transform?: (value: any) => any;
  defaultValue?: any;
}

export interface DocumentTypeMapping {
  documentType: string;
  mappings: FieldMapping[];
}

/**
 * Field mappings for different document types
 */
const DOCUMENT_FIELD_MAPPINGS: DocumentTypeMapping[] = [
  {
    documentType: 'patent-assignment-agreement',
    mappings: [
      {
        templateField: 'assignor_name',
        yamlPath: 'assignors[0].name',
        transform: (assignors: any[]) => {
          if (!assignors || !Array.isArray(assignors) || assignors.length === 0) {
            return 'Unknown Assignor';
          }
          return assignors.map(a => a.name).join(', ');
        }
      },
      {
        templateField: 'assignee_name',
        yamlPath: 'assignee.name',
        transform: (assignee: any) => {
          if (!assignee || typeof assignee !== 'object') {
            return 'Unknown Assignee';
          }
          return assignee.name || 'Unknown Assignee';
        }
      },
      {
        templateField: 'effective_date',
        yamlPath: 'effective_date'
      },
      {
        templateField: 'assignment_type',
        yamlPath: 'assignment_type',
        defaultValue: 'founder'
      },
      {
        templateField: 'patent_list',
        yamlPath: 'patents',
        transform: (patents: any[]) => {
          if (!patents || !Array.isArray(patents)) {
            return 'No patents specified';
          }
          return patents.map(p => {
            if (p.provisional_number) {
              return `Provisional Patent Application No. ${p.provisional_number} - "${p.title}" (Filed: ${p.filing_date})`;
            } else if (p.invention_disclosure) {
              return `Invention Disclosure ${p.invention_disclosure} - "${p.title}"`;
            } else {
              return `"${p.title}"`;
            }
          }).join('\n');
        }
      },
      {
        templateField: 'include_applications',
        yamlPath: 'include_applications',
        defaultValue: true
      },
      {
        templateField: 'include_future',
        yamlPath: 'include_future',
        defaultValue: true
      },
      {
        templateField: 'consideration_type',
        yamlPath: 'consideration_type',
        defaultValue: 'employment'
      },
      {
        templateField: 'cash_amount',
        yamlPath: 'assignors[0].consideration',
        transform: (assignors: any[]) => {
          if (!assignors || !Array.isArray(assignors) || assignors.length === 0) {
            return 1000;
          }
          return parseInt(assignors[0].consideration) || 1000;
        }
      },
      {
        templateField: 'warranty_level',
        yamlPath: 'warranty_level',
        defaultValue: 'limited'
      },
      {
        templateField: 'governing_state',
        yamlPath: 'governing_law',
        transform: (law: string) => {
          if (!law || typeof law !== 'string') {
            return 'Delaware';
          }
          return law.charAt(0).toUpperCase() + law.slice(1);
        }
      }
    ]
  }
  // Add more document types here as needed
];

export class FieldMapperService {
  /**
   * Map YAML data to template fields for a specific document type
   */
  mapFields(yamlData: any, documentType: string): Record<string, any> {
    const mapping = DOCUMENT_FIELD_MAPPINGS.find(m => m.documentType === documentType);
    
    if (!mapping) {
      logger.warn(`No field mapping found for document type: ${documentType}`);
      return yamlData; // Return original data if no mapping found
    }

    const mappedData: Record<string, any> = {};

    logger.debug(`Mapping fields for document type: ${documentType}`, {
      mappingCount: mapping.mappings.length,
      originalKeys: Object.keys(yamlData)
    });

    for (const fieldMapping of mapping.mappings) {
      try {
        const value = this.extractValue(yamlData, fieldMapping);
        mappedData[fieldMapping.templateField] = value;
        
        logger.debug(`Mapped field: ${fieldMapping.templateField}`, {
          yamlPath: fieldMapping.yamlPath,
          value: typeof value === 'string' && value.length > 100 ? 
            value.substring(0, 100) + '...' : value
        });
      } catch (error) {
        logger.error(`Failed to map field: ${fieldMapping.templateField}`, {
          yamlPath: fieldMapping.yamlPath,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Use default value if available
        if (fieldMapping.defaultValue !== undefined) {
          mappedData[fieldMapping.templateField] = fieldMapping.defaultValue;
        }
      }
    }

    // Copy over any additional fields that don't need mapping
    for (const [key, value] of Object.entries(yamlData)) {
      if (!mappedData.hasOwnProperty(key)) {
        mappedData[key] = value;
      }
    }

    logger.info(`Field mapping completed for ${documentType}`, {
      originalFieldCount: Object.keys(yamlData).length,
      mappedFieldCount: Object.keys(mappedData).length,
      mappedFields: Object.keys(mappedData)
    });

    return mappedData;
  }

  /**
   * Extract value from YAML data using path and optional transform
   */
  private extractValue(yamlData: any, fieldMapping: FieldMapping): any {
    let value;

    // Handle array access patterns like 'assignors[0].name'
    if (fieldMapping.yamlPath.includes('[') && fieldMapping.yamlPath.includes(']')) {
      const pathParts = fieldMapping.yamlPath.split('.');
      const arrayPart = pathParts[0];
      const arrayMatch = arrayPart.match(/^(\w+)\[(\d+)\]$/);
      
      if (arrayMatch) {
        const [, arrayName, indexStr] = arrayMatch;
        const index = parseInt(indexStr);
        const array = yamlData[arrayName];
        
        if (Array.isArray(array) && array.length > index) {
          value = array[index];
          
          // Continue with remaining path parts
          for (let i = 1; i < pathParts.length; i++) {
            if (value && typeof value === 'object') {
              value = value[pathParts[i]];
            } else {
              value = undefined;
              break;
            }
          }
        }
      }
    } else {
      // Simple path access like 'assignee.name'
      const pathParts = fieldMapping.yamlPath.split('.');
      value = yamlData;
      
      for (const part of pathParts) {
        if (value && typeof value === 'object') {
          value = value[part];
        } else {
          value = undefined;
          break;
        }
      }
    }

    // Apply transform if provided
    if (fieldMapping.transform) {
      // For transforms, pass the root object or array
      const rootPath = fieldMapping.yamlPath.split('[')[0].split('.')[0];
      const rootValue = yamlData[rootPath];
      value = fieldMapping.transform(rootValue);
    }

    // Use default value if value is undefined
    if (value === undefined && fieldMapping.defaultValue !== undefined) {
      value = fieldMapping.defaultValue;
    }

    return value;
  }

  /**
   * Get available document types with mappings
   */
  getAvailableDocumentTypes(): string[] {
    return DOCUMENT_FIELD_MAPPINGS.map(m => m.documentType);
  }

  /**
   * Check if a document type has field mappings
   */
  hasMapping(documentType: string): boolean {
    return DOCUMENT_FIELD_MAPPINGS.some(m => m.documentType === documentType);
  }
}

// Export singleton instance
export const fieldMapper = new FieldMapperService(); 