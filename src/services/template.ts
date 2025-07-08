/**
 * Template service for CaseThread CLI POC
 * 
 * Handles loading and validation of JSON templates and markdown explanations
 * from the templates directory structure.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { Template } from '../types';
import { logger } from '../utils/logger';

/**
 * Base path for template files
 */
const TEMPLATES_BASE_PATH = path.join(process.cwd(), 'templates');

/**
 * Gets the full path to a template file
 * 
 * @param documentType - The document type identifier
 * @returns Full path to the template JSON file
 */
export function getTemplatePath(documentType: string): string {
  return path.join(TEMPLATES_BASE_PATH, 'core', `${documentType}.json`);
}

/**
 * Gets the full path to an explanation file
 * 
 * @param documentType - The document type identifier
 * @returns Full path to the explanation markdown file
 */
export function getExplanationPath(documentType: string): string {
  // Map document type to explanation file number and name
  const explanationMap: Record<string, string> = {
    'provisional-patent-application': '01-provisional-patent-explanation',
    'nda-ip-specific': '02-nda-ip-specific-explanation',
    'patent-license-agreement': '03-patent-license-explanation',
    'trademark-application': '04-trademark-application-explanation',
    'patent-assignment-agreement': '05-patent-assignment-explanation',
    'office-action-response': '06-office-action-response-explanation',
    'cease-and-desist-letter': '07-cease-desist-explanation',
    'technology-transfer-agreement': '08-technology-transfer-explanation'
  };

  const explanationFile = explanationMap[documentType];
  if (!explanationFile) {
    throw new Error(
      `No explanation mapping found for document type: ${documentType}`
    );
  }

  return path.join(TEMPLATES_BASE_PATH, 'explanations', `${explanationFile}.md`);
}

/**
 * Loads a template JSON file and validates its structure
 * 
 * @param documentType - The document type to load
 * @returns Parsed and validated template object
 * @throws TemplateLoadError if file cannot be loaded or parsed
 * 
 * @example
 * ```typescript
 * const template = await loadTemplate('patent-assignment-agreement');
 * console.log(`Loaded template: ${template.name}`);
 * ```
 */
export async function loadTemplate(documentType: string): Promise<Template> {
  logger.debug(`loadTemplate called with type: ${documentType}`);
  const templatePath = path.join('templates', 'core', `${documentType}.json`);
  logger.debug(`Attempting to read template from: ${templatePath}`);
  
  try {
    const content = await fs.readFile(templatePath, 'utf-8');
    logger.debug(`Template file read successfully, size: ${content.length} bytes`);
    const template = JSON.parse(content);
    logger.debug(`Template parsed successfully, sections: ${template.sections?.length || 0}`);
    return template;
  } catch (error: any) {
    logger.debug(`Failed to load template: ${error.message}`);
    throw error;
  }
}

/**
 * Loads an explanation markdown file
 * 
 * @param documentType - The document type to load explanation for
 * @returns Content of the explanation file
 * @throws TemplateLoadError if file cannot be loaded
 * 
 * @example
 * ```typescript
 * const explanation = await loadExplanation('patent-assignment-agreement');
 * console.log(`Explanation length: ${explanation.length} characters`);
 * ```
 */
export async function loadExplanation(documentType: string): Promise<string> {
  logger.debug(`loadExplanation called with type: ${documentType}`);
  
  try {
    const explanationPath = getExplanationPath(documentType);
    logger.debug(`Attempting to read explanation from: ${explanationPath}`);
    const content = await fs.readFile(explanationPath, 'utf-8');
    logger.debug(`Explanation file read successfully, size: ${content.length} bytes`);
    return content;
  } catch (error) {
    logger.debug(`Failed to load explanation: ${(error as Error).message}`);
    throw new Error(`Explanation file not found for document type: ${documentType}`);
  }
}

/**
 * Validates that a template's sections are properly ordered
 * 
 * @param template - The template to validate
 * @returns True if sections are properly ordered
 */
export function validateSectionOrder(template: Template): boolean {
  const orders = template.sections.map(s => s.order).sort((a, b) => a - b);
  
  // Check for duplicates
  for (let i = 1; i < orders.length; i++) {
    if (orders[i] === orders[i - 1]) {
      return false;
    }
  }
  
  // Check that orders start from 1 and are sequential
  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i + 1) {
      return false;
    }
  }
  
  return true;
}

/**
 * Gets a list of all required field IDs from a template
 * 
 * @param template - The template to extract fields from
 * @returns Array of required field IDs
 */
export function getRequiredFieldIds(template: Template): string[] {
  return template.requiredFields
    .filter(field => field.required)
    .map(field => field.id);
}

/**
 * Checks if a template section should be included based on conditions
 * 
 * @param section - The section to check
 * @param data - The data to check conditions against
 * @returns True if section should be included
 */
export function shouldIncludeSection(
  section: Template['sections'][0],
  data: Record<string, any>
): boolean {
  if (!section.conditionalOn) {
    return true;
  }

  const { field, value, operator = 'equals' } = section.conditionalOn;
  const fieldValue = data[field];

  switch (operator) {
    case 'equals':
      return fieldValue === value;
    case 'notEquals':
      return fieldValue !== value;
    case 'contains':
      return String(fieldValue).includes(String(value));
    case 'greaterThan':
      return Number(fieldValue) > Number(value);
    case 'lessThan':
      return Number(fieldValue) < Number(value);
    default:
      return true;
  }
} 