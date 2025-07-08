/**
 * YAML service for CaseThread CLI POC
 * 
 * Handles parsing and validation of YAML input files containing
 * scenario data for document generation.
 */

import { promises as fs } from 'fs';
import * as yaml from 'js-yaml';
import path from 'path';
import { YamlData, YamlParseError, isYamlData, ValidationError } from '../types';
import { logger } from '../utils/logger';

/**
 * Parses a YAML string into a JavaScript object
 * 
 * @param yamlContent - The YAML string to parse
 * @param filePath - Optional file path for error reporting
 * @returns Parsed JavaScript object
 * @throws YamlParseError if parsing fails
 */
export function parseYamlContent(yamlContent: string, filePath?: string): any {
  try {
    const result = yaml.load(yamlContent);
    
    // Ensure we got an object (not null, undefined, primitive, or array)
    if (typeof result !== 'object' || result === null || Array.isArray(result)) {
      throw new YamlParseError(
        'YAML content must be an object',
        filePath
      );
    }
    
    return result;
  } catch (error) {
    if (error instanceof yaml.YAMLException) {
      // Extract line and column information from yaml error
      const mark = (error as any).mark;
      throw new YamlParseError(
        `YAML parsing error: ${error.message}`,
        filePath,
        mark?.line + 1, // js-yaml uses 0-based line numbers
        mark?.column + 1
      );
    }
    
    if (error instanceof YamlParseError) {
      throw error;
    }
    
    throw new YamlParseError(
      `Failed to parse YAML: ${(error as Error).message}`,
      filePath
    );
  }
}

/**
 * Validates that parsed YAML data contains required base fields
 * 
 * @param data - The parsed data to validate
 * @returns Validated YamlData object
 * @throws ValidationError if validation fails
 */
export function validateYamlData(data: any): YamlData {
  // Check if it matches the YamlData interface
  if (!isYamlData(data)) {
    const missingFields: string[] = [];
    
    if (!data.client) missingFields.push('client');
    if (!data.attorney) missingFields.push('attorney');
    if (!data.document_type) missingFields.push('document_type');
    if (!data.template) missingFields.push('template');
    
    if (missingFields.length > 0) {
      throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // If all fields exist but aren't strings, check which one is invalid
    if (typeof data.client !== 'string') {
      throw new ValidationError('Field "client" must be a non-empty string', 'client', data.client);
    }
    if (typeof data.attorney !== 'string') {
      throw new ValidationError('Field "attorney" must be a non-empty string', 'attorney', data.attorney);
    }
    if (typeof data.document_type !== 'string') {
      throw new ValidationError('Field "document_type" must be a non-empty string', 'document_type', data.document_type);
    }
    if (typeof data.template !== 'string') {
      throw new ValidationError('Field "template" must be a non-empty string', 'template', data.template);
    }
    
    throw new ValidationError('Invalid YAML data structure');
  }
  
  // Additional validation for field types
  if (typeof data.client !== 'string' || data.client.trim() === '') {
    throw new ValidationError('Field "client" must be a non-empty string', 'client', data.client);
  }
  
  if (typeof data.attorney !== 'string' || data.attorney.trim() === '') {
    throw new ValidationError('Field "attorney" must be a non-empty string', 'attorney', data.attorney);
  }
  
  if (typeof data.document_type !== 'string' || data.document_type.trim() === '') {
    throw new ValidationError('Field "document_type" must be a non-empty string', 'document_type', data.document_type);
  }
  
  if (typeof data.template !== 'string' || data.template.trim() === '') {
    throw new ValidationError('Field "template" must be a non-empty string', 'template', data.template);
  }
  
  // Validate that template matches expected format (ends with .json)
  if (!data.template.endsWith('.json')) {
    throw new ValidationError(
      'Field "template" must reference a JSON file (e.g., "patent-assignment-agreement.json")',
      'template',
      data.template
    );
  }
  
  return data as YamlData;
}

/**
 * Parses a YAML file and validates its contents
 * 
 * @param filePath - Path to the YAML file
 * @returns Parsed and validated YamlData object
 * @throws YamlParseError or ValidationError if parsing/validation fails
 * 
 * @example
 * ```typescript
 * const data = await parseYaml('./scenario.yaml');
 * console.log(`Processing for client: ${data.client}`);
 * ```
 */
export async function parseYaml(filePath: string): Promise<YamlData> {
  const absolutePath = path.isAbsolute(filePath) 
    ? filePath 
    : path.join(process.cwd(), filePath);
    
  logger.debug(`Parsing YAML file: ${absolutePath}`);
  
  try {
    // Load the file
    logger.debug(`Reading YAML file: ${absolutePath}`);
    let yamlContent: string;
    try {
      yamlContent = await fs.readFile(absolutePath, 'utf-8');
      logger.debug(`YAML file read successfully, size: ${yamlContent.length} bytes`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new YamlParseError(
          `YAML file not found: ${absolutePath}`,
          absolutePath
        );
      }
      throw error;
    }
    
    // Check if file is empty
    if (!yamlContent || yamlContent.trim() === '') {
      throw new YamlParseError(
        'YAML file is empty',
        absolutePath
      );
    }
    
    // Parse YAML content
    logger.debug('Parsing YAML content...');
    const parsedData = parseYamlContent(yamlContent, absolutePath);
    logger.debug(`YAML parsed successfully, keys: ${Object.keys(parsedData).join(', ')}`);
    
    // Validate the data
    logger.debug('Validating YAML data...');
    const validatedData = validateYamlData(parsedData);
    
    logger.debug('YAML parsed and validated successfully', {
      filePath: absolutePath,
      client: validatedData.client,
      documentType: validatedData.document_type,
      fieldCount: Object.keys(validatedData).length
    });
    
    return validatedData;
  } catch (error) {
    if (error instanceof YamlParseError || error instanceof ValidationError) {
      logger.error('YAML parsing/validation error:', error);
      throw error;
    }
    
    const wrappedError = new YamlParseError(
      `Failed to parse YAML file: ${(error as Error).message}`,
      absolutePath
    );
    logger.error('Unexpected YAML parsing error:', error as Error);
    throw wrappedError;
  }
}

/**
 * Extracts document type from template filename
 * 
 * @param templateFilename - The template filename (e.g., "patent-assignment-agreement.json")
 * @returns The document type (e.g., "patent-assignment-agreement")
 */
export function extractDocumentType(templateFilename: string): string {
  // Remove .json extension if present
  return templateFilename.replace(/\.json$/, '');
}

/**
 * Formats YAML parsing errors for user display
 * 
 * @param error - The error to format
 * @returns Formatted error message
 * 
 * @example
 * ```typescript
 * try {
 *   await parseYaml(file);
 * } catch (error) {
 *   console.error(formatYamlError(error));
 * }
 * ```
 */
export function formatYamlError(error: Error): string {
  if (error instanceof YamlParseError) {
    let message = error.message;
    
    if (error.filePath) {
      message = `Error in ${error.filePath}: ${message}`;
    }
    
    if (error.line && error.column) {
      message += ` (line ${error.line}, column ${error.column})`;
    }
    
    return message;
  }
  
  if (error instanceof ValidationError) {
    let message = `Validation error: ${error.message}`;
    
    if (error.field) {
      message += ` (field: ${error.field})`;
    }
    
    return message;
  }
  
  return `Error: ${error.message}`;
}

/**
 * Validates YAML data has all fields required by a template
 * 
 * @param yamlData - The YAML data to check
 * @param requiredFieldIds - Array of required field IDs from template
 * @returns Array of missing field IDs
 * 
 * @example
 * ```typescript
 * const missing = checkMissingFields(data, ['assignor_name', 'assignee_name']);
 * if (missing.length > 0) {
 *   console.error(`Missing fields: ${missing.join(', ')}`);
 * }
 * ```
 */
export function checkMissingFields(
  yamlData: YamlData,
  requiredFieldIds: string[]
): string[] {
  const missingFields: string[] = [];
  
  for (const fieldId of requiredFieldIds) {
    const value = yamlData[fieldId];
    
    // Check if field is missing or empty
    if (value === undefined || value === null || 
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0)) {
      missingFields.push(fieldId);
    }
  }
  
  return missingFields;
}

/**
 * Merges YAML data with template defaults
 * 
 * @param yamlData - The YAML data
 * @param defaults - Default values from template
 * @returns Merged data object
 */
export function mergeWithDefaults(
  yamlData: YamlData,
  defaults: Record<string, any>
): YamlData {
  const merged = { ...yamlData };
  
  // Only add defaults for fields that don't exist in YAML
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (merged[key] === undefined) {
      merged[key] = defaultValue;
    }
  }
  
  return merged;
} 