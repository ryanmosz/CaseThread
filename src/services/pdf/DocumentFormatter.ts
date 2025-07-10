import { 
  DocumentType, 
  DocumentFormattingRules,
  LineSpacingConfig,
  Margins
} from '../../types/pdf';
import { createChildLogger, Logger } from '../../utils/logger';
import { FormattingConfig, FormattingConfiguration } from '../../config/pdf-formatting';

/**
 * Manages document-specific formatting rules for PDF generation
 */
export class DocumentFormatter {
  private logger: Logger;
  private formattingRules: Map<DocumentType, DocumentFormattingRules>;
  private lineSpacingConfig: LineSpacingConfig;
  private configuration: FormattingConfiguration;

  constructor(config?: FormattingConfig) {
    this.logger = createChildLogger({ service: 'DocumentFormatter' });
    this.formattingRules = new Map();
    this.configuration = new FormattingConfiguration(config);
    
    // Define line spacing in points (12pt font base)
    this.lineSpacingConfig = {
      single: 0,      // Default line height
      oneHalf: 6,     // Add 6 points
      double: 12      // Add 12 points
    };
    
    this.initializeFormattingRules();
    this.logger.debug('DocumentFormatter initialized', {
      documentTypes: Array.from(this.formattingRules.keys()),
      hasConfig: !!config
    });
  }

  /**
   * Get formatting rules for a specific document type
   * @param documentType - The type of legal document
   * @returns Document formatting rules with any configuration overrides applied
   */
  public getFormattingRules(documentType: DocumentType): DocumentFormattingRules {
    const baseRules = this.formattingRules.get(documentType) || this.getDefaultRules();
    
    // Apply configuration overrides if present
    return this.configuration.applyOverrides(documentType, baseRules);
  }

  /**
   * Get the configuration object
   * @returns Current formatting configuration
   */
  public getConfiguration(): FormattingConfiguration {
    return this.configuration;
  }

  /**
   * Update formatting configuration
   * @param newConfig - New configuration to apply
   */
  public updateConfiguration(newConfig: Partial<FormattingConfig>): void {
    this.configuration.updateConfig(newConfig);
    this.logger.debug('Configuration updated', { newConfig });
  }

  /**
   * Get line spacing value in points
   * @param spacing - Line spacing configuration
   * @returns Line spacing in points
   */
  public getLineSpacing(spacing: 'single' | 'one-half' | 'double'): number {
    switch (spacing) {
      case 'single':
        return this.lineSpacingConfig.single;
      case 'one-half':
        return this.lineSpacingConfig.oneHalf;
      case 'double':
        return this.lineSpacingConfig.double;
      default:
        return this.lineSpacingConfig.single;
    }
  }

  /**
   * Initialize formatting rules for all document types
   */
  private initializeFormattingRules(): void {
    // USPTO Filings - Generally require double-spacing
    this.formattingRules.set('provisional-patent-application', {
      lineSpacing: 'double',
      fontSize: 12,
      font: 'Times-Roman',
      margins: {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72
      },
      pageNumberPosition: 'bottom-center',
      titleCase: true,
      sectionNumbering: true,
      paragraphIndent: 36,
      paragraphSpacing: 12,
      blockQuoteIndent: 72,
      signatureLineSpacing: 'single'
    });

    this.formattingRules.set('office-action-response', {
      lineSpacing: 'double',
      fontSize: 12,
      font: 'Times-Roman',
      margins: {
        top: 108, // 1.5 inches for header
        bottom: 72,
        left: 72,
        right: 72
      },
      pageNumberPosition: 'bottom-right',
      titleCase: true,
      sectionNumbering: true,
      paragraphIndent: 0, // No indent for office actions
      paragraphSpacing: 12,
      blockQuoteIndent: 72,
      signatureLineSpacing: 'single'
    });

    this.formattingRules.set('trademark-application', {
      lineSpacing: 'single', // Forms are typically single-spaced
      fontSize: 12,
      font: 'Times-Roman',
      margins: {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72
      },
      pageNumberPosition: 'bottom-center',
      titleCase: false,
      sectionNumbering: false,
      paragraphIndent: 0,
      paragraphSpacing: 12,
      blockQuoteIndent: 36,
      signatureLineSpacing: 'single'
    });

    // Legal Agreements - Mixed spacing requirements
    this.formattingRules.set('patent-assignment-agreement', {
      lineSpacing: 'one-half', // 1.5 spacing for recording
      fontSize: 12,
      font: 'Times-Roman',
      margins: {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72
      },
      pageNumberPosition: 'bottom-center',
      titleCase: true,
      sectionNumbering: true,
      paragraphIndent: 36,
      paragraphSpacing: 12,
      blockQuoteIndent: 72,
      signatureLineSpacing: 'single'
    });

    this.formattingRules.set('nda-ip-specific', {
      lineSpacing: 'single',
      fontSize: 12,
      font: 'Times-Roman',
      margins: {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72
      },
      pageNumberPosition: 'bottom-right',
      titleCase: true,
      sectionNumbering: true,
      paragraphIndent: 36,
      paragraphSpacing: 12,
      blockQuoteIndent: 72,
      signatureLineSpacing: 'single'
    });

    this.formattingRules.set('patent-license-agreement', {
      lineSpacing: 'single',
      fontSize: 12,
      font: 'Times-Roman',
      margins: {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72
      },
      pageNumberPosition: 'bottom-right',
      titleCase: true,
      sectionNumbering: true,
      paragraphIndent: 36,
      paragraphSpacing: 12,
      blockQuoteIndent: 72,
      signatureLineSpacing: 'single'
    });

    this.formattingRules.set('technology-transfer-agreement', {
      lineSpacing: 'single',
      fontSize: 12,
      font: 'Times-Roman',
      margins: {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72
      },
      pageNumberPosition: 'bottom-right',
      titleCase: true,
      sectionNumbering: true,
      paragraphIndent: 36,
      paragraphSpacing: 12,
      blockQuoteIndent: 72,
      signatureLineSpacing: 'single'
    });

    // Professional Correspondence
    this.formattingRules.set('cease-and-desist-letter', {
      lineSpacing: 'single',
      fontSize: 12,
      font: 'Times-Roman',
      margins: {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72
      },
      pageNumberPosition: 'bottom-center',
      titleCase: false,
      sectionNumbering: false,
      paragraphIndent: 0, // Business letter format
      paragraphSpacing: 12,
      blockQuoteIndent: 72,
      signatureLineSpacing: 'single'
    });

    this.logger.debug('Formatting rules initialized for all document types');
  }

  /**
   * Apply line spacing to text options
   */
  public applyLineSpacing(
    documentType: DocumentType,
    isSignatureBlock: boolean = false
  ): number {
    const rules = this.getFormattingRules(documentType);
    
    // Signature blocks always use single spacing
    if (isSignatureBlock) {
      return this.getLineSpacing(rules.signatureLineSpacing);
    }
    
    return this.getLineSpacing(rules.lineSpacing);
  }

  /**
   * Calculate actual line height including font size
   */
  public calculateLineHeight(
    fontSize: number,
    lineSpacing: 'single' | 'one-half' | 'double'
  ): number {
    const baseHeight = fontSize * 1.2; // Standard line height multiplier
    const additionalSpacing = this.getLineSpacing(lineSpacing);
    
    return baseHeight + additionalSpacing;
  }

  /**
   * Get spacing for specific text elements
   */
  public getElementSpacing(
    documentType: DocumentType,
    element: 'paragraph' | 'section' | 'title' | 'list'
  ): number {
    const rules = this.getFormattingRules(documentType);
    
    switch (element) {
      case 'paragraph':
        return rules.paragraphSpacing;
      case 'section':
        return rules.paragraphSpacing * 1.5;
      case 'title':
        return rules.paragraphSpacing * 2;
      case 'list':
        return rules.paragraphSpacing * 0.5;
      default:
        return rules.paragraphSpacing;
    }
  }

  /**
   * Check if document requires double spacing
   */
  public requiresDoubleSpacing(documentType: DocumentType): boolean {
    const rules = this.getFormattingRules(documentType);
    return rules.lineSpacing === 'double';
  }

  /**
   * Get margins for specific page number
   */
  public getMarginsForPage(
    documentType: DocumentType,
    pageNumber: number
  ): Margins {
    const rules = this.getFormattingRules(documentType);
    
    // Office action responses have larger top margin on first page only
    if (documentType === 'office-action-response') {
      if (pageNumber === 1) {
        return {
          ...rules.margins,
          top: 108 // 1.5 inches for application header
        };
      } else {
        // Subsequent pages use standard 1" margin
        return {
          ...rules.margins,
          top: 72 // Standard 1 inch for pages 2+
        };
      }
    }
    
    return rules.margins;
  }

  /**
   * Calculate usable page area
   */
  public getUsablePageArea(
    documentType: DocumentType,
    pageNumber: number = 1
  ): { width: number; height: number } {
    const margins = this.getMarginsForPage(documentType, pageNumber);
    const pageWidth = 612; // Letter width in points
    const pageHeight = 792; // Letter height in points
    
    return {
      width: pageWidth - margins.left - margins.right,
      height: pageHeight - margins.top - margins.bottom
    };
  }

  /**
   * Check if document needs special header space
   */
  public needsHeaderSpace(
    documentType: DocumentType,
    pageNumber: number
  ): boolean {
    return documentType === 'office-action-response' && pageNumber === 1;
  }

  /**
   * Get header content for special documents
   */
  public getHeaderContent(
    documentType: DocumentType,
    metadata?: { applicationNumber?: string; responseDate?: string }
  ): string[] | null {
    if (documentType !== 'office-action-response') {
      return null;
    }
    
    const lines: string[] = [];
    
    if (metadata?.applicationNumber) {
      lines.push(`Application No.: ${metadata.applicationNumber}`);
    }
    if (metadata?.responseDate) {
      lines.push(`Response Date: ${metadata.responseDate}`);
    }
    
    return lines.length > 0 ? lines : null;
  }

  /**
   * Get default formatting rules
   * @returns Default formatting rules for legal documents
   */
  private getDefaultRules(): DocumentFormattingRules {
    return {
      lineSpacing: 'double',
      fontSize: 12,
      font: 'Times-Roman',
      margins: {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72
      },
      pageNumberPosition: 'bottom-center',
      titleCase: true,
      sectionNumbering: false,
      paragraphIndent: 36, // 0.5 inch
      paragraphSpacing: 12,
      blockQuoteIndent: 72,
      signatureLineSpacing: 'single'
    };
  }
} 