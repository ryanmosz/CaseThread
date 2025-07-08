/**
 * Validator utility for CaseThread CLI POC
 * 
 * Provides validation functions for document types, YAML data,
 * and template fields to ensure data integrity throughout the application.
 */

import { YamlData, TemplateField, ValidationError } from '../types';

/**
 * Array of supported document types matching the templates in templates/core/
 * @constant
 */
export const SUPPORTED_TYPES = [
  'cease-and-desist-letter',
  'nda-ip-specific',
  'office-action-response',
  'patent-assignment-agreement',
  'patent-license-agreement',
  'provisional-patent-application',
  'technology-transfer-agreement',
  'trademark-application'
] as const;

/**
 * Type representing a supported document type
 */
export type SupportedDocumentType = typeof SUPPORTED_TYPES[number];

/**
 * Checks if a given string is a valid document type
 * 
 * @param type - The document type to validate
 * @returns True if the type is supported, false otherwise
 * 
 * @example
 * ```typescript
 * isValidDocumentType('patent-assignment-agreement'); // true
 * isValidDocumentType('invalid-type'); // false
 * ```
 */
export function isValidDocumentType(type: string): type is SupportedDocumentType {
  return SUPPORTED_TYPES.includes(type as SupportedDocumentType);
}

/**
 * Validates that required fields are present in YAML data
 * 
 * @param yamlData - The YAML data to validate
 * @param requiredFields - Array of required field definitions
 * @returns Array of validation errors (empty if valid)
 * 
 * @example
 * ```typescript
 * const errors = validateYamlFields(data, template.requiredFields);
 * if (errors.length > 0) {
 *   console.error('Validation failed:', errors);
 * }
 * ```
 */
export function validateYamlFields(
  yamlData: YamlData,
  requiredFields: TemplateField[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check each required field
  for (const field of requiredFields) {
    if (!field.required) continue;

    const value = yamlData[field.id];

    // Check if required field is missing
    if (value === undefined || value === null || value === '') {
      errors.push(
        new ValidationError(
          `Required field '${field.name}' (${field.id}) is missing`,
          field.id,
          value
        )
      );
      continue;
    }

    // Type-specific validation
    switch (field.type) {
      case 'text':
      case 'textarea':
        if (typeof value !== 'string') {
          errors.push(
            new ValidationError(
              `Field '${field.name}' must be a string`,
              field.id,
              value
            )
          );
        } else if (field.validation) {
          // Check length constraints
          if (field.validation.minLength && value.length < field.validation.minLength) {
            errors.push(
              new ValidationError(
                `Field '${field.name}' must be at least ${field.validation.minLength} characters`,
                field.id,
                value
              )
            );
          }
          if (field.validation.maxLength && value.length > field.validation.maxLength) {
            errors.push(
              new ValidationError(
                `Field '${field.name}' must not exceed ${field.validation.maxLength} characters`,
                field.id,
                value
              )
            );
          }
          // Check pattern
          if (field.validation.pattern) {
            const regex = new RegExp(field.validation.pattern);
            if (!regex.test(value)) {
              errors.push(
                new ValidationError(
                  `Field '${field.name}' does not match required pattern`,
                  field.id,
                  value
                )
              );
            }
          }
        }
        break;

      case 'number':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          errors.push(
            new ValidationError(
              `Field '${field.name}' must be a valid number`,
              field.id,
              value
            )
          );
        } else if (field.validation) {
          if (field.validation.min !== undefined && numValue < field.validation.min) {
            errors.push(
              new ValidationError(
                `Field '${field.name}' must be at least ${field.validation.min}`,
                field.id,
                value
              )
            );
          }
          if (field.validation.max !== undefined && numValue > field.validation.max) {
            errors.push(
              new ValidationError(
                `Field '${field.name}' must not exceed ${field.validation.max}`,
                field.id,
                value
              )
            );
          }
        }
        break;

      case 'date':
        // Simple date validation - could be enhanced
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          errors.push(
            new ValidationError(
              `Field '${field.name}' must be a valid date`,
              field.id,
              value
            )
          );
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(
            new ValidationError(
              `Field '${field.name}' must be a boolean (true/false)`,
              field.id,
              value
            )
          );
        }
        break;

      case 'select':
        if (field.options && !field.options.includes(value)) {
          errors.push(
            new ValidationError(
              `Field '${field.name}' must be one of: ${field.options.join(', ')}`,
              field.id,
              value
            )
          );
        }
        break;

      case 'multiselect':
        if (!Array.isArray(value)) {
          errors.push(
            new ValidationError(
              `Field '${field.name}' must be an array`,
              field.id,
              value
            )
          );
        } else if (field.options) {
          const invalidOptions = value.filter(v => !field.options!.includes(v));
          if (invalidOptions.length > 0) {
            errors.push(
              new ValidationError(
                `Field '${field.name}' contains invalid options: ${invalidOptions.join(', ')}`,
                field.id,
                value
              )
            );
          }
        }
        break;
    }
  }

  return errors;
}

/**
 * Formats validation errors into a user-friendly message
 * 
 * @param errors - Array of validation errors
 * @returns Formatted error message
 * 
 * @example
 * ```typescript
 * const message = formatValidationErrors(errors);
 * console.error(message);
 * ```
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';

  const header = `Validation failed with ${errors.length} error${errors.length > 1 ? 's' : ''}:\n`;
  const errorList = errors
    .map((error, index) => `  ${index + 1}. ${error.message}`)
    .join('\n');

  return header + errorList;
}

/**
 * Gets a user-friendly display name for a document type
 * 
 * @param type - The document type identifier
 * @returns Human-readable document type name
 * 
 * @example
 * ```typescript
 * getDocumentTypeName('patent-assignment-agreement'); // 'Patent Assignment Agreement'
 * ```
 */
export function getDocumentTypeName(type: string): string {
  return type
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Lists all supported document types with their display names
 * 
 * @returns Array of objects with type ID and display name
 * 
 * @example
 * ```typescript
 * const types = listSupportedTypes();
 * types.forEach(({ id, name }) => {
 *   console.log(`${id}: ${name}`);
 * });
 * ```
 */
export function listSupportedTypes(): Array<{ id: string; name: string }> {
  return SUPPORTED_TYPES.map(type => ({
    id: type,
    name: getDocumentTypeName(type)
  }));
} 