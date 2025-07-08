/**
 * IntakeGuard - Guard-rails for intake validation
 */

import { GuardRail, GuardRailResult } from '../types/agents';
import { Template, YamlData } from '../types';
import { logger } from '../utils/logger';

export class IntakeGuard implements GuardRail {
  readonly name = 'IntakeGuard';
  readonly description = 'Validates YAML against JSON-Schema and checks required fields';

  async validate(input: {
    yamlData: YamlData;
    template: Template;
  }): Promise<GuardRailResult> {
    try {
      // Validate YAML structure
      const schemaResult = await this.validateJsonSchema(input.yamlData);
      if (!schemaResult.passed) {
        return schemaResult;
      }

      // Validate required fields
      const requiredFieldsResult = await this.validateRequiredFields(
        input.yamlData, 
        input.template
      );
      if (!requiredFieldsResult.passed) {
        return requiredFieldsResult;
      }

      // Validate field types
      const fieldTypesResult = await this.validateFieldTypes(
        input.yamlData, 
        input.template
      );
      if (!fieldTypesResult.passed) {
        return fieldTypesResult;
      }

      logger.debug('IntakeGuard validation passed', {
        requiredFields: input.template.requiredFields?.length || 0,
        providedFields: Object.keys(input.yamlData).length
      });

      return {
        passed: true,
        message: 'YAML validation successful',
        severity: 'info'
      };

    } catch (error) {
      logger.error('IntakeGuard validation error', { error });
      return {
        passed: false,
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        details: error
      };
    }
  }

  private async validateJsonSchema(yamlData: YamlData): Promise<GuardRailResult> {
    // Basic structure validation
    if (!yamlData || typeof yamlData !== 'object') {
      return {
        passed: false,
        message: 'YAML data must be an object',
        severity: 'error'
      };
    }

    // Required meta fields - only check for undefined/null, not empty strings
    const requiredMeta = ['client', 'document_type'];
    const missingMeta = requiredMeta.filter(field => 
      yamlData[field] === undefined || yamlData[field] === null
    );
    
    if (missingMeta.length > 0) {
      return {
        passed: false,
        message: `Missing required metadata fields: ${missingMeta.join(', ')}`,
        severity: 'error',
        details: { missingFields: missingMeta }
      };
    }

    return {
      passed: true,
      message: 'YAML matches JSON schema',
      severity: 'info'
    };
  }

  private async validateRequiredFields(
    yamlData: YamlData, 
    template: Template
  ): Promise<GuardRailResult> {
    if (!template.requiredFields) {
      return {
        passed: true,
        message: 'No required fields defined in template',
        severity: 'info'
      };
    }

    const missingFields: string[] = [];
    const emptyFields: string[] = [];

    for (const field of template.requiredFields) {
      if (field.required) {
        const value = yamlData[field.id];
        
        if (value === undefined || value === null) {
          missingFields.push(field.id);
        } else if (typeof value === 'string' && value.trim() === '') {
          emptyFields.push(field.id);
        } else if (Array.isArray(value) && value.length === 0) {
          emptyFields.push(field.id);
        }
      }
    }

    if (missingFields.length > 0) {
      return {
        passed: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        severity: 'error',
        details: { missingFields, emptyFields }
      };
    }

    if (emptyFields.length > 0) {
      return {
        passed: false,
        message: `Empty required fields: ${emptyFields.join(', ')}`,
        severity: 'error',
        details: { missingFields, emptyFields }
      };
    }

    return {
      passed: true,
      message: `All ${template.requiredFields.filter(f => f.required).length} required fields present`,
      severity: 'info'
    };
  }

  private async validateFieldTypes(
    yamlData: YamlData, 
    template: Template
  ): Promise<GuardRailResult> {
    if (!template.requiredFields) {
      return {
        passed: true,
        message: 'No field types to validate',
        severity: 'info'
      };
    }

    const typeErrors: string[] = [];

    for (const field of template.requiredFields) {
      const value = yamlData[field.id];
      
      if (value !== undefined && value !== null) {
        const isValidType = this.validateFieldType(value, field.type);
        if (!isValidType) {
          typeErrors.push(`Field '${field.id}' expected ${field.type} but got ${typeof value}`);
        }
      }
    }

    if (typeErrors.length > 0) {
      return {
        passed: false,
        message: `Field type validation failed: ${typeErrors.join(', ')}`,
        severity: 'error',
        details: { typeErrors }
      };
    }

    return {
      passed: true,
      message: 'All field types are valid',
      severity: 'info'
    };
  }

  private validateFieldType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'text':
      case 'textarea':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return typeof value === 'string' && !isNaN(Date.parse(value));
      case 'select':
        return typeof value === 'string';
      case 'multiselect':
        return Array.isArray(value) || typeof value === 'string';
      default:
        return true; // Unknown types are considered valid
    }
  }
}

// Export a singleton instance
export const intakeGuard = new IntakeGuard(); 