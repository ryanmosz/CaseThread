# Task 2.3 Detailed: Implement Document Formatting Rules

**Part of Parent Task 2.0: Create Core PDF Generation Service with Legal Formatting**

## Overview

This subtask implements the `DocumentFormatter` class that defines and applies specific formatting rules for each of the 8 legal document types. Each document type has unique requirements for line spacing, margins, headers, and special formatting.

## Sub-tasks

### 2.3.1 Create DocumentFormatter class

**Description**: Create the base class structure for managing document-specific formatting rules.

**Implementation Steps**:

1. Create formatting types in `src/types/pdf.ts`:
```typescript
export type DocumentType = 
  | 'provisional-patent-application'
  | 'trademark-application'
  | 'office-action-response'
  | 'nda-ip-specific'
  | 'patent-assignment-agreement'
  | 'patent-license-agreement'
  | 'technology-transfer-agreement'
  | 'cease-and-desist-letter';

export interface DocumentFormattingRules {
  lineSpacing: 'single' | 'one-half' | 'double';
  fontSize: number;
  font: string;
  margins: Margins;
  pageNumberPosition: 'bottom-center' | 'bottom-right' | 'bottom-left';
  titleCase: boolean;
  sectionNumbering: boolean;
  paragraphIndent: number;
  paragraphSpacing: number;
  blockQuoteIndent: number;
  signatureLineSpacing: 'single' | 'double';
}

export interface LineSpacingConfig {
  single: number;
  oneHalf: number;
  double: number;
}
```

2. Create `src/services/pdf/DocumentFormatter.ts`:
```typescript
import { 
  DocumentType, 
  DocumentFormattingRules,
  LineSpacingConfig,
  Margins 
} from '../../types/pdf';
import { Logger } from '../../utils/logger';

export class DocumentFormatter {
  private logger: Logger;
  private formattingRules: Map<DocumentType, DocumentFormattingRules>;
  private lineSpacingConfig: LineSpacingConfig;

  constructor() {
    this.logger = new Logger('DocumentFormatter');
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
  }

  /**
   * Get default formatting rules
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
```

**Testing**: Verify class instantiation and default rules.

**Definition of Done**: DocumentFormatter class created with basic structure.

### 2.3.2 Define formatting rules by document type

**Description**: Implement specific formatting rules for each of the 8 document types based on legal standards.

**Implementation Steps**:

1. Update `initializeFormattingRules()` method:
```typescript
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
```

**Testing**: Verify each document type has correct rules.

**Definition of Done**: All 8 document types have specific formatting rules.

### 2.3.3 Implement line spacing logic

**Description**: Create methods to apply line spacing consistently across different text types.

**Implementation Steps**:

1. Add line spacing application methods:
```typescript
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
```

**Testing**: Verify line spacing calculations are correct.

**Definition of Done**: Line spacing logic implemented for all scenarios.

### 2.3.4 Handle special margin requirements

**Description**: Implement special margin handling for documents like office action responses.

**Implementation Steps**:

1. Add margin handling methods:
```typescript
  /**
   * Get margins for specific page number
   */
  public getMarginsForPage(
    documentType: DocumentType,
    pageNumber: number
  ): Margins {
    const rules = this.getFormattingRules(documentType);
    
    // Office action responses have larger top margin on first page
    if (documentType === 'office-action-response' && pageNumber === 1) {
      return {
        ...rules.margins,
        top: 108 // 1.5 inches for application header
      };
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
```

**Testing**: Verify margin calculations for different pages and document types.

**Definition of Done**: Special margin requirements handled correctly.

### 2.3.5 Create formatting configuration

**Description**: Create a configuration system for easy formatting customization.

**Implementation Steps**:

1. Create `src/config/pdf-formatting.ts`:
```typescript
import { DocumentFormattingRules, DocumentType } from '../types/pdf';

export interface FormattingConfig {
  overrides?: Partial<Record<DocumentType, Partial<DocumentFormattingRules>>>;
  defaults?: Partial<DocumentFormattingRules>;
}

export class FormattingConfiguration {
  private config: FormattingConfig;

  constructor(config: FormattingConfig = {}) {
    this.config = config;
  }

  /**
   * Apply configuration overrides to base rules
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
   * Get configuration for specific document type
   */
  public getConfig(): FormattingConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<FormattingConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }
}
```

2. Update DocumentFormatter to use configuration:
```typescript
export class DocumentFormatter {
  private configuration: FormattingConfiguration;

  constructor(config?: FormattingConfig) {
    this.logger = new Logger('DocumentFormatter');
    this.formattingRules = new Map();
    this.configuration = new FormattingConfiguration(config);
    
    // ... rest of constructor
  }

  public getFormattingRules(documentType: DocumentType): DocumentFormattingRules {
    const baseRules = this.formattingRules.get(documentType) || this.getDefaultRules();
    return this.configuration.applyOverrides(documentType, baseRules);
  }
}
```

**Testing**: Verify configuration overrides work correctly.

**Definition of Done**: Formatting can be customized via configuration.

## Test Implementation

Create `__tests__/services/pdf/DocumentFormatter.test.ts`:
```typescript
import { DocumentFormatter } from '../../../src/services/pdf/DocumentFormatter';
import { DocumentType } from '../../../src/types/pdf';

describe('DocumentFormatter', () => {
  let formatter: DocumentFormatter;

  beforeEach(() => {
    formatter = new DocumentFormatter();
  });

  it('should return correct formatting rules for each document type', () => {
    const provisionalRules = formatter.getFormattingRules('provisional-patent-application');
    expect(provisionalRules.lineSpacing).toBe('double');
    expect(provisionalRules.margins.top).toBe(72);

    const officeActionRules = formatter.getFormattingRules('office-action-response');
    expect(officeActionRules.lineSpacing).toBe('double');
    expect(officeActionRules.margins.top).toBe(108);

    const ndaRules = formatter.getFormattingRules('nda-ip-specific');
    expect(ndaRules.lineSpacing).toBe('single');
  });

  it('should calculate line spacing correctly', () => {
    expect(formatter.getLineSpacing('single')).toBe(0);
    expect(formatter.getLineSpacing('one-half')).toBe(6);
    expect(formatter.getLineSpacing('double')).toBe(12);
  });

  it('should handle special margins for office actions', () => {
    const firstPageMargins = formatter.getMarginsForPage('office-action-response', 1);
    expect(firstPageMargins.top).toBe(108);

    const secondPageMargins = formatter.getMarginsForPage('office-action-response', 2);
    expect(secondPageMargins.top).toBe(72);
  });

  it('should apply configuration overrides', () => {
    const customFormatter = new DocumentFormatter({
      overrides: {
        'nda-ip-specific': {
          lineSpacing: 'double'
        }
      }
    });

    const rules = customFormatter.getFormattingRules('nda-ip-specific');
    expect(rules.lineSpacing).toBe('double');
  });
});
```

## Common Pitfalls

1. **Inconsistent Units**: Always use points (72 points = 1 inch)
2. **Line Spacing Confusion**: Line gap vs total line height
3. **First Page Special Cases**: Remember office actions have different first page
4. **Signature Block Spacing**: Always single-spaced regardless of document
5. **Page Number Placement**: Different documents use different positions

## File Changes

- **Created**:
  - `src/services/pdf/DocumentFormatter.ts` - Formatting rules engine
  - `src/config/pdf-formatting.ts` - Configuration system
  - `__tests__/services/pdf/DocumentFormatter.test.ts` - Unit tests
  
- **Modified**:
  - `src/types/pdf.ts` - Added formatting types

## Next Steps

1. Continue to Task 2.4: Build Signature Block Parser
2. Consider creating a visual test page showing all formatting variations
3. Document formatting rules in user-facing documentation

## Success Criteria

- [ ] DocumentFormatter class created
- [ ] All 8 document types have specific rules
- [ ] Line spacing calculations work correctly
- [ ] Special margins handled properly
- [ ] Configuration system functional
- [ ] All tests pass 