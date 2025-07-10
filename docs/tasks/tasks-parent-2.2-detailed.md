# Task 2.2 Detailed: Create Base PDF Generator Class

**Part of Parent Task 2.0: Create Core PDF Generation Service with Legal Formatting**

## Overview

This subtask creates the foundational `LegalPDFGenerator` class that handles core PDF document creation, text writing, and page management. This class will serve as the base for all legal document PDF generation in CaseThread.

## Sub-tasks

### 2.2.1 Create LegalPDFGenerator class structure

**Description**: Set up the basic class structure with TypeScript interfaces and initialization.

**Implementation Steps**:

1. Create the directory structure:
```bash
mkdir -p src/services/pdf
```

2. Create TypeScript types file `src/types/pdf.ts`:
```typescript
import PDFDocument from 'pdfkit';

export interface PDFGenerationOptions {
  documentType: string;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
}

export interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface PageConfig {
  size: 'LETTER' | 'LEGAL' | 'A4';
  margins: Margins;
  pageNumbers: boolean;
  pageNumberPosition: 'bottom-center' | 'bottom-right' | 'bottom-left';
}

export interface PDFPosition {
  x: number;
  y: number;
}

export interface TextOptions {
  fontSize?: number;
  font?: string;
  lineGap?: number;
  align?: 'left' | 'center' | 'right' | 'justify';
  continued?: boolean;
}
```

3. Create the base class `src/services/pdf/LegalPDFGenerator.ts`:
```typescript
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { 
  PDFGenerationOptions, 
  PageConfig, 
  TextOptions,
  PDFPosition 
} from '../../types/pdf';
import { Logger } from '../../utils/logger';

export class LegalPDFGenerator {
  private doc: PDFDocument;
  private logger: Logger;
  private pageConfig: PageConfig;
  private currentPage: number;
  private outputPath: string;

  constructor(
    outputPath: string,
    options: PDFGenerationOptions,
    pageConfig?: Partial<PageConfig>
  ) {
    this.logger = new Logger('LegalPDFGenerator');
    this.outputPath = outputPath;
    this.currentPage = 1;
    
    // Default page configuration for legal documents
    this.pageConfig = {
      size: 'LETTER',
      margins: {
        top: 72,    // 1 inch
        bottom: 72,
        left: 72,
        right: 72
      },
      pageNumbers: true,
      pageNumberPosition: 'bottom-center',
      ...pageConfig
    };

    // Initialize PDFKit document
    this.doc = new PDFDocument({
      size: this.pageConfig.size,
      margins: this.pageConfig.margins,
      info: {
        Title: options.title || 'Legal Document',
        Author: options.author || 'CaseThread',
        Subject: options.subject || options.documentType,
        Keywords: options.keywords?.join(', ') || options.documentType
      }
    });

    this.logger.debug('PDF document initialized', {
      outputPath,
      pageConfig: this.pageConfig,
      documentType: options.documentType
    });
  }

  /**
   * Get the current PDFKit document instance
   */
  public getDocument(): PDFDocument {
    return this.doc;
  }

  /**
   * Get current page number
   */
  public getCurrentPage(): number {
    return this.currentPage;
  }

  /**
   * Get page configuration
   */
  public getPageConfig(): PageConfig {
    return this.pageConfig;
  }
}
```

**Testing**: Create a test file to verify class instantiation.

**Definition of Done**: Class structure created with proper TypeScript types.

### 2.2.2 Implement basic document creation

**Description**: Add methods to start document generation and handle file streaming.

**Implementation Steps**:

1. Add document creation methods to `LegalPDFGenerator.ts`:
```typescript
  /**
   * Start document generation - must be called before writing content
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create write stream
        const stream = fs.createWriteStream(this.outputPath);
        
        // Handle stream errors
        stream.on('error', (error) => {
          this.logger.error('Stream error', error);
          reject(error);
        });
        
        // Pipe document to file
        this.doc.pipe(stream);
        
        // Set default font
        this.doc.font('Times-Roman');
        this.doc.fontSize(12);
        
        this.logger.debug('Document stream started');
        resolve();
      } catch (error) {
        this.logger.error('Failed to start document', error);
        reject(error);
      }
    });
  }

  /**
   * Finalize and close the document
   */
  public async finalize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Add page numbers if enabled
        if (this.pageConfig.pageNumbers) {
          this.addPageNumbers();
        }
        
        // Finalize the document
        this.doc.end();
        
        // Wait for stream to finish
        this.doc.on('end', () => {
          this.logger.info('PDF document created successfully', {
            path: this.outputPath,
            pages: this.currentPage
          });
          resolve();
        });
      } catch (error) {
        this.logger.error('Failed to finalize document', error);
        reject(error);
      }
    });
  }

  /**
   * Add page numbers to all pages
   */
  private addPageNumbers(): void {
    // This is a placeholder - PDFKit doesn't support going back to previous pages
    // We'll implement page numbering differently in the full implementation
    this.logger.debug('Page numbering will be implemented with buffering');
  }
```

**Testing**: Verify document creation and finalization work correctly.

**Definition of Done**: Documents can be created and saved to disk.

### 2.2.3 Add text writing methods

**Description**: Implement methods for writing text with legal document formatting.

**Implementation Steps**:

1. Add text writing methods:
```typescript
  /**
   * Write text to the document with specified options
   */
  public writeText(
    text: string, 
    options?: TextOptions
  ): this {
    const defaultOptions: TextOptions = {
      fontSize: 12,
      font: 'Times-Roman',
      lineGap: 12, // Default for double-spacing
      align: 'left'
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    // Apply text options
    if (finalOptions.font) {
      this.doc.font(finalOptions.font);
    }
    if (finalOptions.fontSize) {
      this.doc.fontSize(finalOptions.fontSize);
    }
    
    // Write text with options
    this.doc.text(text, {
      align: finalOptions.align,
      lineGap: finalOptions.lineGap,
      continued: finalOptions.continued
    });
    
    return this;
  }

  /**
   * Write a paragraph with proper spacing
   */
  public writeParagraph(
    text: string,
    options?: TextOptions
  ): this {
    this.writeText(text, options);
    this.doc.moveDown(1); // Add paragraph spacing
    return this;
  }

  /**
   * Write a centered title
   */
  public writeTitle(
    title: string,
    options?: TextOptions
  ): this {
    const titleOptions: TextOptions = {
      fontSize: 14,
      align: 'center',
      ...options
    };
    
    this.writeText(title.toUpperCase(), titleOptions);
    this.doc.moveDown(1);
    return this;
  }

  /**
   * Write a section heading
   */
  public writeHeading(
    heading: string,
    level: 1 | 2 | 3 = 1,
    options?: TextOptions
  ): this {
    const sizes = { 1: 14, 2: 13, 3: 12 };
    const headingOptions: TextOptions = {
      fontSize: sizes[level],
      ...options
    };
    
    this.writeText(heading, headingOptions);
    this.doc.moveDown(0.5);
    return this;
  }

  /**
   * Add vertical space
   */
  public addSpace(lines: number = 1): this {
    this.doc.moveDown(lines);
    return this;
  }
```

**Testing**: Write tests to verify text output formatting.

**Definition of Done**: Text can be written with various formatting options.

### 2.2.4 Implement page management

**Description**: Add methods to handle page breaks and track page numbers.

**Implementation Steps**:

1. Add page management methods:
```typescript
  /**
   * Add a new page to the document
   */
  public addPage(): this {
    this.doc.addPage();
    this.currentPage++;
    
    // Reset to default font and size for new page
    this.doc.font('Times-Roman');
    this.doc.fontSize(12);
    
    this.logger.debug('Added new page', { pageNumber: this.currentPage });
    return this;
  }

  /**
   * Get current Y position on page
   */
  public getCurrentY(): number {
    return this.doc.y;
  }

  /**
   * Get current X position on page
   */
  public getCurrentX(): number {
    return this.doc.x;
  }

  /**
   * Move to specific position on page
   */
  public moveTo(position: PDFPosition): this {
    this.doc.moveTo(position.x, position.y);
    return this;
  }

  /**
   * Check if there's enough space on current page
   */
  public hasSpace(requiredSpace: number): boolean {
    const pageHeight = this.doc.page.height;
    const bottomMargin = this.pageConfig.margins.bottom;
    const currentY = this.getCurrentY();
    
    return (currentY + requiredSpace) < (pageHeight - bottomMargin);
  }

  /**
   * Add page if not enough space
   */
  public ensureSpace(requiredSpace: number): this {
    if (!this.hasSpace(requiredSpace)) {
      this.addPage();
    }
    return this;
  }

  /**
   * Get remaining space on current page
   */
  public getRemainingSpace(): number {
    const pageHeight = this.doc.page.height;
    const bottomMargin = this.pageConfig.margins.bottom;
    const currentY = this.getCurrentY();
    
    return Math.max(0, pageHeight - bottomMargin - currentY);
  }
```

**Testing**: Verify page management functions work correctly.

**Definition of Done**: Pages can be added and space can be managed.

### 2.2.5 Add page numbering

**Description**: Implement page numbering at the bottom of each page.

**Implementation Steps**:

1. Since PDFKit doesn't support editing previous pages, we'll implement a buffering approach:
```typescript
  private pageContents: Array<() => void> = [];
  private isBuffering = false;

  /**
   * Enable buffering mode for page numbering
   */
  public enableBuffering(): this {
    this.isBuffering = true;
    return this;
  }

  /**
   * Override writeText to support buffering
   */
  public writeText(text: string, options?: TextOptions): this {
    if (this.isBuffering) {
      const currentPageIndex = this.currentPage - 1;
      if (!this.pageContents[currentPageIndex]) {
        this.pageContents[currentPageIndex] = () => {};
      }
      
      const existingContent = this.pageContents[currentPageIndex];
      this.pageContents[currentPageIndex] = () => {
        existingContent();
        super.writeText(text, options);
      };
    } else {
      // Original implementation
      super.writeText(text, options);
    }
    return this;
  }

  /**
   * Render all pages with page numbers
   */
  private async renderWithPageNumbers(): Promise<void> {
    // This is a simplified version - full implementation would require
    // rebuilding the document with page numbers
    const totalPages = this.currentPage;
    
    // Add page numbers to current implementation
    const addPageNumber = (pageNum: number) => {
      const y = this.doc.page.height - 50; // 50 points from bottom
      const x = this.getPageNumberX();
      
      this.doc.save();
      this.doc.fontSize(10);
      this.doc.text(`Page ${pageNum} of ${totalPages}`, x, y, {
        align: this.getPageNumberAlign()
      });
      this.doc.restore();
    };

    // For now, just add to current page
    addPageNumber(this.currentPage);
  }

  private getPageNumberX(): number {
    const position = this.pageConfig.pageNumberPosition;
    const pageWidth = this.doc.page.width;
    const margins = this.pageConfig.margins;
    
    switch (position) {
      case 'bottom-left':
        return margins.left;
      case 'bottom-right':
        return pageWidth - margins.right - 100; // Approximate text width
      case 'bottom-center':
      default:
        return pageWidth / 2 - 50; // Center with offset
    }
  }

  private getPageNumberAlign(): 'left' | 'center' | 'right' {
    const position = this.pageConfig.pageNumberPosition;
    
    switch (position) {
      case 'bottom-left':
        return 'left';
      case 'bottom-right':
        return 'right';
      case 'bottom-center':
      default:
        return 'center';
    }
  }
```

**Testing**: Verify page numbers appear correctly.

**Definition of Done**: Page numbers display at the bottom of pages.

## Test Implementation

Create `__tests__/services/pdf/LegalPDFGenerator.test.ts`:
```typescript
import { LegalPDFGenerator } from '../../../src/services/pdf/LegalPDFGenerator';
import * as fs from 'fs';
import * as path from 'path';

describe('LegalPDFGenerator', () => {
  const testOutputDir = path.join(__dirname, '../../../test-output');
  const testFile = path.join(testOutputDir, 'test-generator.pdf');

  beforeAll(() => {
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  it('should create a PDF with basic text', async () => {
    const generator = new LegalPDFGenerator(testFile, {
      documentType: 'test-document',
      title: 'Test Document'
    });

    await generator.start();
    generator.writeTitle('TEST DOCUMENT');
    generator.writeParagraph('This is a test paragraph.');
    await generator.finalize();

    expect(fs.existsSync(testFile)).toBe(true);
  });

  it('should handle page management', async () => {
    const generator = new LegalPDFGenerator(testFile, {
      documentType: 'test-document'
    });

    await generator.start();
    
    // Check space management
    const hasSpace = generator.hasSpace(100);
    expect(hasSpace).toBe(true);
    
    // Add new page
    generator.addPage();
    expect(generator.getCurrentPage()).toBe(2);
    
    await generator.finalize();
  });
});
```

## Common Pitfalls

1. **Stream Management**: Always wait for the 'end' event before considering the PDF complete
2. **Font Selection**: Stick to built-in fonts to avoid cross-platform issues
3. **Memory Usage**: For large documents, consider streaming content
4. **Coordinate System**: PDFKit uses points (72 points = 1 inch)
5. **Page Numbering**: PDFKit can't edit previous pages, plan accordingly

## File Changes

- **Created**:
  - `src/types/pdf.ts` - PDF-specific TypeScript types
  - `src/services/pdf/LegalPDFGenerator.ts` - Main generator class
  - `__tests__/services/pdf/LegalPDFGenerator.test.ts` - Unit tests

## Next Steps

1. Continue to Task 2.3: Implement Document Formatting Rules
2. The page numbering implementation will be refined when we implement the full layout engine
3. Consider adding more text formatting methods as needed

## Success Criteria

- [ ] Class instantiates without errors
- [ ] Can create and save PDF files
- [ ] Text writing methods work correctly
- [ ] Page management functions properly
- [ ] Basic page numbering implemented
- [ ] All tests pass 