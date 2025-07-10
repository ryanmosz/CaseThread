import { 
  DocumentType, 
  DocumentFormattingRules,
  LineSpacingConfig
} from '../../types/pdf';
import { createChildLogger, Logger } from '../../utils/logger';

/**
 * Manages document-specific formatting rules for PDF generation
 */
export class DocumentFormatter {
  private logger: Logger;
  private formattingRules: Map<DocumentType, DocumentFormattingRules>;
  private lineSpacingConfig: LineSpacingConfig;

  /**
   * Initialize DocumentFormatter with formatting rules
   */
  constructor() {
    this.logger = createChildLogger({ service: 'DocumentFormatter' });
    this.formattingRules = new Map();
    
    // Define line spacing in points (12pt font base)
    this.lineSpacingConfig = {
      single: 0,      // Default line height
      oneHalf: 6,     // Add 6 points
      double: 12      // Add 12 points
    };
    
    this.initializeFormattingRules();
  }

  /**
   * Get formatting rules for a specific document type
   * @param documentType - The type of legal document
   * @returns Formatting rules for the document type
   */
  public getFormattingRules(documentType: DocumentType): DocumentFormattingRules {
    const rules = this.formattingRules.get(documentType);
    
    if (!rules) {
      this.logger.warn(`No formatting rules found for ${documentType}, using defaults`);
      return this.getDefaultRules();
    }
    
    return rules;
  }

  /**
   * Get line spacing value in points
   * @param spacing - The line spacing type
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
   * Initialize formatting rules (placeholder)
   */
  private initializeFormattingRules(): void {
    // Will be implemented in next subtask
    this.logger.debug('Formatting rules initialization pending');
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