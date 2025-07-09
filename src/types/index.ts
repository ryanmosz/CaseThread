/**
 * Type definitions for CaseThread CLI POC
 */

// Template types
export interface Template {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  subcategory?: string;
  jurisdiction: string;
  requiredFields: RequiredField[];
  sections: Section[];
  metadata: TemplateMetadata;
}

export interface RequiredField {
  id: string;
  name: string;
  type: 'text' | 'date' | 'number' | 'select' | 'multiselect' | 'boolean';
  description: string;
  required: boolean;
  validation?: FieldValidation;
  options?: string[]; // For select/multiselect
  defaultValue?: any;
}

// Used by both RequiredField and TemplateField
export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
}

// Keep TemplateField for backward compatibility
export interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'date' | 'number' | 'select' | 'multiselect' | 'boolean' | 'textarea';
  description: string;
  required: boolean;
  validation?: FieldValidation;
  options?: string[];
  default?: any;
}

export interface Section {
  id: string;
  title: string;
  content: string;
  order: number;
  required: boolean;
  conditions?: SectionCondition[];
  conditionalOn?: SectionCondition; // For backward compatibility
  variables?: string[];
  helpText?: string;
}

export interface SectionCondition {
  field: string;
  operator?: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
  value: any;
}

export interface TemplateMetadata {
  author: string;
  lastUpdated: string;
  tags: string[];
  estimatedTime?: string;
  difficulty?: 'simple' | 'moderate' | 'complex';
  notes?: string;
  relatedTemplates?: string[];
  category?: string;
  jurisdiction?: string;
  [key: string]: any;
}

// YAML Data types
export interface YamlData {
  document_type: string;
  client: string;
  attorney?: string;
  template?: string;
  [key: string]: any;
}

// Spinner message type for type safety
export interface SpinnerMessages {
  INIT: string;
  VALIDATE_TYPE: string;
  CREATE_OUTPUT_DIR: string;
  CHECK_PERMISSIONS: string;
  LOAD_TEMPLATE: string;
  LOAD_EXPLANATION: string;
  PARSE_YAML: string;
  VALIDATE_YAML: string;
  PREPARE_PROMPT: string;
  CONNECT_OPENAI: string;
  GENERATE_DOC: string;
  SAVE_DOC: string;
  SUCCESS: string;
}

// Document generation types
export interface GeneratedDocument {
  content: string;
  metadata: DocumentMetadata;
}

export interface DocumentMetadata {
  templateId: string;
  generatedAt: Date;
  client: string;
  yamlPath: string;
  outputPath?: string;
}

// Custom error types
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

// Type guards
export function isYamlData(value: any): value is YamlData {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.client === 'string' &&
    typeof value.document_type === 'string'
  );
}

export function isTemplate(value: any): value is Template {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.version === 'string' &&
    Array.isArray(value.requiredFields) &&
    Array.isArray(value.sections) &&
    typeof value.metadata === 'object'
  );
}

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

// Export a type-safe version of supported document types
export const DOCUMENT_TYPES = {
  CEASE_AND_DESIST: 'cease-and-desist-letter',
  NDA_IP: 'nda-ip-specific',
  OFFICE_ACTION: 'office-action-response',
  PATENT_ASSIGNMENT: 'patent-assignment-agreement',
  PATENT_LICENSE: 'patent-license-agreement',
  PROVISIONAL_PATENT: 'provisional-patent-application',
  TECH_TRANSFER: 'technology-transfer-agreement',
  TRADEMARK: 'trademark-application'
} as const;

export type DocumentType = typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES];

// Signature Block types for PDF generation
export interface FieldDefinition {
  required: boolean;
  label: string;
  defaultValue?: string;
  maxLength?: number;
}

export interface SignatureBlock {
  id: string;                              // Unique identifier
  type: 'single' | 'multiple';            // Block type
  placement: {
    location: string;                      // e.g., "after-section-5", "document-end"
    marker: string;                        // e.g., "[SIGNATURE_BLOCK:assignor-signature]"
  };
  layout?: {
    position: 'standalone' | 'side-by-side';
    groupWith?: string;                    // ID of block to group with
    preventPageBreak?: boolean;            // Keep together on same page
  };
  party: {
    role: string;                          // e.g., "assignor", "licensee"
    label: string;                         // Display label, e.g., "ASSIGNOR"
    fields: {
      name: FieldDefinition;
      title?: FieldDefinition;
      company?: FieldDefinition;
      date?: FieldDefinition;
      registrationNumber?: FieldDefinition; // For attorneys
      email?: FieldDefinition;              // For electronic signatures
      [key: string]: FieldDefinition | undefined;
    };
  };
  witnessRequired?: boolean;               // If witness signature needed
  notaryRequired?: boolean;                // If notary acknowledgment needed
}

export interface InitialBlock {
  id: string;                              // Unique identifier
  placement: {
    locations: string[];                   // e.g., ["each-page-footer", "after-section-3.2"]
    marker: string;                        // e.g., "[INITIALS_BLOCK:assignor-initials]"
  };
  party: {
    role: string;                          // Links to signature block party role
    label: string;                         // e.g., "Initials"
  };
  customText?: string;                     // Optional text like "Initial here to acknowledge"
}

export interface WitnessBlock {
  id: string;
  forSignatureId: string;                  // Which signature this witnesses
  placement: {
    location: string;                      // Relative to main signature
    marker: string;                        // e.g., "[WITNESS_BLOCK:assignor-witness]"
  };
  fields: {
    name: FieldDefinition;
    date: FieldDefinition;
  };
}

export interface NotaryBlock {
  id: string;
  forSignatureId: string;                  // Which signature this notarizes
  placement: {
    location: string;
    marker: string;                        // e.g., "[NOTARY_BLOCK]"
  };
  state?: string;                          // State of notarization
}

// Enhanced Template interface with signature blocks
export interface TemplateWithSignatures extends Template {
  signatureBlocks?: SignatureBlock[];
  initialBlocks?: InitialBlock[];
  witnessBlocks?: WitnessBlock[];
  notaryBlocks?: NotaryBlock[];
} 