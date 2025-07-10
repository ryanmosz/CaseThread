import { DocumentFormattingRules, DocumentType } from '../types/pdf';

/**
 * Configuration options for PDF formatting
 */
export interface FormattingConfig {
  overrides?: Partial<Record<DocumentType, Partial<DocumentFormattingRules>>>;
  defaults?: Partial<DocumentFormattingRules>;
}

/**
 * Manages formatting configuration and overrides for PDF generation
 */
export class FormattingConfiguration {
  private config: FormattingConfig;

  constructor(config: FormattingConfig = {}) {
    this.config = config;
  }

  /**
   * Apply configuration overrides to base rules
   * @param documentType - The document type
   * @param baseRules - The base formatting rules
   * @returns Merged formatting rules with overrides applied
   */
  public applyOverrides(
    documentType: DocumentType,
    baseRules: DocumentFormattingRules
  ): DocumentFormattingRules {
    const overrides = this.config.overrides?.[documentType];
    
    if (!overrides) {
      return baseRules;
    }
    
    return {
      ...baseRules,
      ...overrides,
      margins: overrides.margins ? 
        { ...baseRules.margins, ...overrides.margins } : 
        baseRules.margins
    };
  }

  /**
   * Get current configuration
   * @returns The current formatting configuration
   */
  public getConfig(): FormattingConfig {
    return this.config;
  }

  /**
   * Update configuration
   * @param newConfig - New configuration to merge with existing
   */
  public updateConfig(newConfig: Partial<FormattingConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      overrides: newConfig.overrides ? {
        ...this.config.overrides,
        ...newConfig.overrides
      } : this.config.overrides
    };
  }

  /**
   * Apply default overrides to base rules
   * @param baseRules - The base formatting rules
   * @returns Formatting rules with defaults applied
   */
  public applyDefaults(baseRules: DocumentFormattingRules): DocumentFormattingRules {
    if (!this.config.defaults) {
      return baseRules;
    }

    return {
      ...baseRules,
      ...this.config.defaults,
      margins: this.config.defaults.margins ? 
        { ...baseRules.margins, ...this.config.defaults.margins } : 
        baseRules.margins
    };
  }

  /**
   * Clear all overrides for a specific document type
   * @param documentType - The document type to clear overrides for
   */
  public clearOverrides(documentType: DocumentType): void {
    if (this.config.overrides) {
      delete this.config.overrides[documentType];
    }
  }

  /**
   * Check if configuration has overrides for a document type
   * @param documentType - The document type to check
   * @returns True if overrides exist
   */
  public hasOverrides(documentType: DocumentType): boolean {
    return !!(this.config.overrides?.[documentType]);
  }
} 