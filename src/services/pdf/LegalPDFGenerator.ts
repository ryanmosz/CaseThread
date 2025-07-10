import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { 
  PDFGenerationOptions, 
  PageConfig,
  TextOptions
} from '../../types/pdf';
import { createChildLogger, Logger } from '../../utils/logger';

/**
 * Generates PDF documents with legal formatting standards
 */
export class LegalPDFGenerator {
  private doc: PDFKit.PDFDocument;
  private logger: Logger;
  private pageConfig: PageConfig;
  private currentPage: number;
  private outputPath: string;

  /**
   * Initialize a new PDF generator
   * @param outputPath - Path where the PDF will be saved
   * @param options - Document generation options
   * @param pageConfig - Optional page configuration overrides
   */
  constructor(
    outputPath: string,
    options: PDFGenerationOptions,
    pageConfig?: Partial<PageConfig>
  ) {
    this.logger = createChildLogger({ service: 'LegalPDFGenerator' });
    this.outputPath = outputPath;
    this.currentPage = 1;
    
    // Default page configuration for legal documents
    this.pageConfig = {
      size: 'LETTER',
      margins: {
        top: 72,    // 1 inch = 72 points
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

    // Track page changes
    this.doc.on('pageAdded', () => {
      this.currentPage++;
      this.logger.debug('New page added', { pageNumber: this.currentPage });
    });

    this.logger.debug('PDF document initialized', {
      outputPath,
      pageConfig: this.pageConfig,
      documentType: options.documentType
    });
  }

  /**
   * Get the current PDFKit document instance
   * @returns The PDFKit document
   */
  public getDocument(): PDFKit.PDFDocument {
    return this.doc;
  }

  /**
   * Get current page number
   * @returns Current page number (1-based)
   */
  public getCurrentPage(): number {
    return this.currentPage;
  }

  /**
   * Get page configuration
   * @returns Current page configuration
   */
  public getPageConfig(): PageConfig {
    return this.pageConfig;
  }

  /**
   * Get output path
   * @returns Output file path
   */
  public getOutputPath(): string {
    return this.outputPath;
  }

  private stream: fs.WriteStream | null = null;

  /**
   * Start document generation - must be called before writing content
   * @returns Promise that resolves when stream is ready
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create write stream
        this.stream = fs.createWriteStream(this.outputPath);
        
        // Handle stream errors
        this.stream.on('error', (error) => {
          this.logger.error('Stream error', { error: error.message });
          reject(error);
        });
        
        // Pipe document to file
        this.doc.pipe(this.stream);
        
        // Set default font
        this.doc.font('Times-Roman');
        this.doc.fontSize(12);
        
        this.logger.debug('Document stream started', { outputPath: this.outputPath });
        resolve();
      } catch (error) {
        this.logger.error('Failed to start document', { error: (error as Error).message });
        reject(error);
      }
    });
  }

  /**
   * Finalize and close the document
   * @returns Promise that resolves when document is completely written
   */
  public async finalize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Add page numbers if enabled
        if (this.pageConfig.pageNumbers) {
          this.addPageNumbers();
        }
        
        // Wait for stream to finish
        if (this.stream) {
          this.stream.on('finish', () => {
            this.logger.info('PDF document created successfully', {
              path: this.outputPath,
              pages: this.currentPage
            });
            resolve();
          });
          
          // Finalize the document
          this.doc.end();
        } else {
          // No stream to wait for
          this.logger.warn('Finalize called without start');
          resolve();
        }
      } catch (error) {
        this.logger.error('Failed to finalize document', { error: (error as Error).message });
        reject(error);
      }
    });
  }

  /**
   * Add page numbers to all pages
   * Note: PDFKit doesn't support editing previous pages, so this is a placeholder
   * for future implementation with buffering or two-pass generation
   */
  private addPageNumbers(): void {
    // This is a placeholder - PDFKit doesn't support going back to previous pages
    // We'll implement page numbering differently in the full implementation
    this.logger.debug('Page numbering will be implemented with buffering in Task 2.5');
  }

  /**
   * Write text to the document with specified options
   * @param text - Text to write
   * @param options - Text formatting options
   * @returns This instance for method chaining
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
   * @param text - Paragraph text
   * @param options - Text formatting options
   * @returns This instance for method chaining
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
   * @param title - Title text
   * @param options - Additional formatting options
   * @returns This instance for method chaining
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
   * @param heading - Heading text
   * @param level - Heading level (1-3)
   * @param options - Additional formatting options
   * @returns This instance for method chaining
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
   * @param lines - Number of lines to move down
   * @returns This instance for method chaining
   */
  public addSpace(lines: number = 1): this {
    this.doc.moveDown(lines);
    return this;
  }

  /**
   * Add a new page to the document
   * @returns This instance for method chaining
   */
  public newPage(): this {
    this.doc.addPage();
    return this;
  }

  /**
   * Get current vertical position on the page
   * @returns Current Y position in points
   */
  public getCurrentY(): number {
    return this.doc.y;
  }

  /**
   * Get remaining space on current page
   * @returns Remaining vertical space in points
   */
  public getRemainingSpace(): number {
    const pageHeight = this.doc.page.height;
    const bottomMargin = this.pageConfig.margins.bottom;
    const currentY = this.doc.y;
    
    return pageHeight - bottomMargin - currentY;
  }

  /**
   * Check if there's enough space for content
   * @param requiredSpace - Space needed in points
   * @returns True if space is available on current page
   */
  public hasSpaceFor(requiredSpace: number): boolean {
    return this.getRemainingSpace() >= requiredSpace;
  }

  /**
   * Add new page if not enough space
   * @param requiredSpace - Space needed in points
   * @returns This instance for method chaining
   */
  public ensureSpace(requiredSpace: number): this {
    if (!this.hasSpaceFor(requiredSpace)) {
      this.newPage();
    }
    return this;
  }

  /**
   * Get current page dimensions
   * @returns Object with width and height in points
   */
  public getPageDimensions(): { width: number; height: number } {
    return {
      width: this.doc.page.width,
      height: this.doc.page.height
    };
  }

  /**
   * Move to specific vertical position
   * @param y - Y position in points
   * @returns This instance for method chaining
   */
  public moveTo(y: number): this {
    this.doc.y = y;
    return this;
  }
} 