/**
 * Core TypeScript type definitions for CaseThread CLI POC
 * 
 * These types define the structure of data flowing through the application,
 * from template loading to YAML parsing and document generation.
 */

/**
 * Represents a supported document type in the system
 */
export interface DocumentType {
  /** Unique identifier matching the template file name */
  id: string;
  /** Human-readable name for display */
  name: string;
  /** Path to the JSON template file */
  templateFile: string;
  /** Path to the markdown explanation file */
  explanationFile: string;
}

/**
 * Base structure for YAML input data
 * All YAML files must contain these fields at minimum
 */
export interface YamlData {
  /** Client name or identifier */
  client: string;
  /** Attorney handling the matter */
  attorney: string;
  /** Type of document to generate */
  document_type: string;
  /** Template file to use */
  template: string;
  /** Additional fields specific to each document type */
  [key: string]: any;
}

/**
 * Field validation rules for template fields
 */
export interface FieldValidation {
  /** Regex pattern for validation */
  pattern?: string;
  /** Minimum length for text fields */
  minLength?: number;
  /** Maximum length for text fields */
  maxLength?: number;
  /** Minimum value for numeric fields */
  min?: number;
  /** Maximum value for numeric fields */
  max?: number;
}

/**
 * Represents a single field in a template
 */
export interface TemplateField {
  /** Unique field identifier */
  id: string;
  /** Display name for the field */
  name: string;
  /** Field data type */
  type: 'text' | 'textarea' | 'date' | 'number' | 'select' | 'multiselect' | 'boolean';
  /** Help text describing the field */
  description: string;
  /** Whether the field is required */
  required: boolean;
  /** Validation rules for the field */
  validation?: FieldValidation;
  /** Available options for select/multiselect fields */
  options?: string[];
  /** Default value if not provided */
  default?: any;
}

/**
 * Conditional logic for template sections
 */
export interface SectionCondition {
  /** Field ID to check */
  field: string;
  /** Expected value for the condition to be true */
  value: any;
  /** Operator for comparison (defaults to equals) */
  operator?: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
}

/**
 * Represents a section within a template
 */
export interface TemplateSection {
  /** Unique section identifier */
  id: string;
  /** Section title for display */
  title: string;
  /** Display order (1-based) */
  order: number;
  /** Whether the section is required */
  required: boolean;
  /** Template content with variable placeholders */
  content: string;
  /** Conditional display logic */
  conditionalOn?: SectionCondition;
  /** Whether law firms can customize this section */
  firmCustomizable?: boolean;
  /** Guidance text for filling out this section */
  helpText?: string;
}

/**
 * Template metadata information
 */
export interface TemplateMetadata {
  /** Document category */
  category: 'patent' | 'trademark' | 'licensing' | 'general';
  /** Jurisdiction scope */
  jurisdiction: 'federal' | 'state' | 'international';
  /** Last update date */
  lastUpdated: string;
  /** Template author */
  author: string;
}

/**
 * Variable transformation options
 */
export interface TemplateVariable {
  /** Source field ID */
  source: string;
  /** Text transformation to apply */
  transform?: 'uppercase' | 'lowercase' | 'titlecase' | 'none';
  /** Default value if source is empty */
  default?: string;
}

/**
 * AI prompt configuration for dynamic sections
 */
export interface TemplatePrompt {
  /** System prompt for AI context */
  system: string;
  /** User prompt template */
  user: string;
  /** Temperature setting for generation */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
}

/**
 * Complete template structure
 */
export interface Template {
  /** Unique template identifier */
  id: string;
  /** Display name */
  name: string;
  /** Template type/category */
  type: string;
  /** Template version */
  version: string;
  /** Brief description of the template */
  description: string;
  /** Complexity level */
  complexity: 'low' | 'medium' | 'high';
  /** Estimated time to complete */
  estimatedTime: string;
  /** Template metadata */
  metadata: TemplateMetadata;
  /** Required input fields */
  requiredFields: TemplateField[];
  /** Document sections */
  sections: TemplateSection[];
  /** Variable definitions */
  variables?: Record<string, TemplateVariable>;
  /** AI prompt configurations */
  prompts?: Record<string, TemplatePrompt>;
}

/**
 * Custom error types for better error handling
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class TemplateLoadError extends Error {
  constructor(
    message: string,
    public templateId?: string,
    public filePath?: string
  ) {
    super(message);
    this.name = 'TemplateLoadError';
  }
}

export class YamlParseError extends Error {
  constructor(
    message: string,
    public filePath?: string,
    public line?: number,
    public column?: number
  ) {
    super(message);
    this.name = 'YamlParseError';
  }
}

/**
 * Type guard to check if a value is a valid YamlData object
 */
export function isYamlData(value: any): value is YamlData {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.client === 'string' &&
    typeof value.attorney === 'string' &&
    typeof value.document_type === 'string' &&
    typeof value.template === 'string'
  );
}

/**
 * Type guard to check if a value is a valid Template object
 */
export function isTemplate(value: any): value is Template {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.type === 'string' &&
    typeof value.version === 'string' &&
    Array.isArray(value.requiredFields) &&
    Array.isArray(value.sections) &&
    typeof value.metadata === 'object'
  );
}

/**
 * Type guard to check if a value is a valid TemplateField
 */
export function isTemplateField(value: any): value is TemplateField {
  const validTypes = ['text', 'textarea', 'date', 'number', 'select', 'multiselect', 'boolean'];
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    validTypes.includes(value.type) &&
    typeof value.description === 'string' &&
    typeof value.required === 'boolean'
  );
} 