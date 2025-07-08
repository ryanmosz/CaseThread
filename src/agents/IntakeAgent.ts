/**
 * Intake Agent - Validates YAML/JSON input and normalizes data types
 */

import { BaseAgent } from './BaseAgent';
import { 
  IntakeAgentInput, 
  IntakeAgentOutput, 
  MatterContext, 
  ValidationResult,
  CheckpointResult 
} from '../types/agents';
import { parseYaml } from '../services/yaml';
import { loadTemplate } from '../services/template';
import { isValidDocumentType } from '../utils/validator';
import { logger } from '../utils/logger';
import { fieldMapper } from '../services/field-mapper';

export class IntakeAgent extends BaseAgent {
  readonly name = 'IntakeAgent';
  readonly description = 'Validates YAML/JSON input and normalizes data types';

  protected async execute(input: IntakeAgentInput): Promise<IntakeAgentOutput> {
    logger.debug(`IntakeAgent processing: ${input.documentType} from ${input.yamlFilePath}`);

    // Parse YAML file
    const yamlData = await parseYaml(input.yamlFilePath);
    
    // Load template for validation
    const template = await loadTemplate(input.documentType);
    
    // Map fields from YAML structure to template field names
    const mappedData = fieldMapper.mapFields(yamlData, input.documentType);
    
    // Validate the mapped data
    const validationResults = await this.validateYamlData(mappedData, template);
    const validationErrors = validationResults.filter(r => !r.isValid);
    
    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    // Normalize the data
    const normalizedData = this.normalizeData(mappedData, template);

    // Create matter context
    const matterContext: MatterContext = {
      documentType: input.documentType,
      client: yamlData.client,
      attorney: yamlData.attorney,
      template: template.id,
      yamlData: {
        document_type: input.documentType,
        client: yamlData.client,
        attorney: yamlData.attorney,
        ...normalizedData // Merge normalized/mapped data
      },
      validationResults,
      normalizedData
    };

    return {
      matterContext,
      validationErrors: []
    };
  }

  protected validateInput(input: IntakeAgentInput): void {
    super.validateInput(input);
    
    if (!input.yamlFilePath) {
      throw new Error('YAML file path is required');
    }
    
    if (!input.documentType) {
      throw new Error('Document type is required');
    }
    
    if (!isValidDocumentType(input.documentType)) {
      throw new Error(`Invalid document type: ${input.documentType}`);
    }
  }

  protected async runPreCheckpoints(input: IntakeAgentInput): Promise<CheckpointResult[]> {
    const checkpoints: CheckpointResult[] = [];

    // Checkpoint: Document type validation
    checkpoints.push(this.createCheckpoint(
      'document_type_validation',
      isValidDocumentType(input.documentType),
      isValidDocumentType(input.documentType) ? 
        'Document type is valid' : 
        `Invalid document type: ${input.documentType}`
    ));

    return checkpoints;
  }

  protected async runPostCheckpoints(output: IntakeAgentOutput): Promise<CheckpointResult[]> {
    const checkpoints: CheckpointResult[] = [];

    // Checkpoint: YAML matches JSON-Schema
    const schemaValid = output.validationErrors.length === 0;
    checkpoints.push(this.createCheckpoint(
      'yaml_schema_validation',
      schemaValid,
      schemaValid ? 
        'YAML matches JSON schema' : 
        `Schema validation failed: ${output.validationErrors.length} errors`
    ));

    // Checkpoint: All required fields present
    const requiredFieldsPresent = output.matterContext.validationResults
      .filter(r => r.field.includes('required'))
      .every(r => r.isValid);
    
    checkpoints.push(this.createCheckpoint(
      'required_fields_present',
      requiredFieldsPresent,
      requiredFieldsPresent ? 
        'All required fields are present' : 
        'Missing required fields detected'
    ));

    return checkpoints;
  }

  private async validateYamlData(yamlData: any, template: any): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Validate required fields
    if (template.requiredFields) {
      for (const field of template.requiredFields) {
        if (field.required) {
          const isPresent = yamlData[field.id] !== undefined && yamlData[field.id] !== null;
          results.push({
            field: field.id,
            isValid: isPresent,
            message: isPresent ? `Field ${field.id} is present` : `Required field ${field.id} is missing`,
            value: yamlData[field.id]
          });
        }
      }
    }

    // Validate field types
    for (const [key, value] of Object.entries(yamlData)) {
      if (template.requiredFields) {
        const fieldDef = template.requiredFields.find((f: any) => f.id === key);
        if (fieldDef) {
          const isValidType = this.validateFieldType(value, fieldDef.type);
          results.push({
            field: key,
            isValid: isValidType,
            message: isValidType ? `Field ${key} has valid type` : `Field ${key} has invalid type`,
            value
          });
        }
      }
    }

    return results;
  }

  private validateFieldType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'text':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return typeof value === 'string' && !isNaN(Date.parse(value));
      case 'select':
      case 'multiselect':
        return Array.isArray(value) || typeof value === 'string';
      default:
        return true; // Unknown types are considered valid
    }
  }

  private normalizeData(yamlData: any, template: any): Record<string, any> {
    const normalized: Record<string, any> = {};

    for (const [key, value] of Object.entries(yamlData)) {
      if (template.requiredFields) {
        const fieldDef = template.requiredFields.find((f: any) => f.id === key);
        if (fieldDef) {
          normalized[key] = this.normalizeFieldValue(value, fieldDef.type);
        } else {
          normalized[key] = value;
        }
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  private normalizeFieldValue(value: any, fieldType: string): any {
    switch (fieldType) {
      case 'text':
        return String(value || '');
      case 'number':
        return Number(value) || 0;
      case 'boolean':
        return Boolean(value);
      case 'date':
        return new Date(value).toISOString().split('T')[0];
      case 'multiselect':
        return Array.isArray(value) ? value : [value];
      default:
        return value;
    }
  }
} 