import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { 
  PDFGenerationOptions, 
  PageConfig,
  TextOptions,
  PageNumberFormat
} from '../../types/pdf';
import { createChildLogger, Logger } from '../../utils/logger';
import { TextSegment } from './MarkdownParser';

/**
 * Generates PDF documents with legal formatting standards
 */
export class LegalPDFGenerator {
  private doc: PDFKit.PDFDocument;
  private logger: Logger;
  private pageConfig: PageConfig;
  private currentPage: number;
  private outputPath: string;
  private pagesWithContent: Set<number> = new Set();
  private pagesWithPageNumbers: Set<number> = new Set();

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
   * Check if a specific page has content
   * @param pageNumber - Page number to check (1-based)
   * @returns True if page has content
   */
  public hasContentOnPage(pageNumber: number): boolean {
    return this.pagesWithContent.has(pageNumber);
  }

  /**
   * Get all pages with content
   * @returns Set of page numbers that have content
   */
  public getPagesWithContent(): Set<number> {
    return new Set(this.pagesWithContent);
  }

  /**
   * Check if a page needs a page number and add it
   * Called when content is first written to a page
   */
  private addPageNumberIfNeeded(): void {
    if (!this.pageConfig.pageNumbers) {
      return;
    }
    
    // Check if this page already has a page number
    if (this.pagesWithPageNumbers.has(this.currentPage)) {
      return;
    }
    
    // Check if this page has content
    if (!this.pagesWithContent.has(this.currentPage)) {
      return;
    }
    
    // Save current position and state
    const savedY = this.doc.y;
    const savedX = this.doc.x;
    
    // Add page number
    this.addPageNumberToCurrentPage();
    this.pagesWithPageNumbers.add(this.currentPage);
    
    // Restore position (font will be restored by addPageNumberToCurrentPage)
    this.doc.x = savedX;
    this.doc.y = savedY;
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
        // Page numbers are now handled per-page in pdf-export.ts
        // Removed the call to addPageNumbers() here to prevent duplicate numbering
        
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
   * Add page number to the current page only
   * This is what will be called during page creation in the buffered implementation
   */
  public addPageNumberToCurrentPage(): void {
    if (!this.pageConfig.pageNumbers) {
      return;
    }

    const format = this.pageConfig.pageNumberFormat || {
      format: 'numeric',
      prefix: 'Page ',
      fontSize: 10,
      font: 'Times-Roman'
    };

    // Save current state
    const currentY = this.doc.y;
    const currentX = this.doc.x;

    // Format page number
    const pageNumberText = this.formatPageNumber(this.currentPage, format);

    // Set page number font
    this.doc.font(format.font || 'Times-Roman');
    this.doc.fontSize(format.fontSize || 10);

    // Calculate position based on configuration
    const pageWidth = this.doc.page.width;
    const pageHeight = this.doc.page.height;
    const margin = 36; // 0.5 inch from bottom
    const y = pageHeight - margin;

    let x: number;
    switch (this.pageConfig.pageNumberPosition) {
      case 'bottom-left':
        x = this.pageConfig.margins.left;
        break;
      case 'bottom-right':
        x = pageWidth - this.pageConfig.margins.right - this.doc.widthOfString(pageNumberText);
        break;
      case 'bottom-center':
      default:
        x = (pageWidth - this.doc.widthOfString(pageNumberText)) / 2;
        break;
    }

    // Draw page number WITHOUT triggering auto-pagination
    // Use save/restore to prevent position changes
    this.doc.save();
    this.doc.text(pageNumberText, x, y, {
      lineBreak: false
    });
    this.doc.restore();

    // Ensure we're back at the original position
    this.doc.x = currentX;
    this.doc.y = currentY;
    this.doc.font('Times-Roman'); // Restore default font
    this.doc.fontSize(12); // Restore default size
  }

  /**
   * Format a page number according to the specified format
   * @param pageNum - The page number to format
   * @param format - The formatting options
   * @returns Formatted page number string
   */
  private formatPageNumber(pageNum: number, format: PageNumberFormat): string {
    let formatted: string;

    switch (format.format) {
      case 'roman':
        formatted = this.toRoman(pageNum);
        break;
      case 'alpha':
        formatted = this.toAlpha(pageNum);
        break;
      case 'numeric':
      default:
        formatted = pageNum.toString();
        break;
    }

    // Apply prefix and suffix
    const prefix = format.prefix || '';
    const suffix = format.suffix || '';
    
    return `${prefix}${formatted}${suffix}`;
  }

  /**
   * Convert number to lowercase roman numerals
   */
  private toRoman(num: number): string {
    const romanNumerals: [number, string][] = [
      [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'],
      [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'],
      [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']
    ];
    
    let result = '';
    for (const [value, numeral] of romanNumerals) {
      while (num >= value) {
        result += numeral;
        num -= value;
      }
    }
    return result;
  }

  /**
   * Convert number to lowercase letters (a, b, c, ..., z, aa, ab, ...)
   */
  private toAlpha(num: number): string {
    let result = '';
    num--; // Make it 0-based
    
    while (num >= 0) {
      result = String.fromCharCode(97 + (num % 26)) + result;
      num = Math.floor(num / 26) - 1;
    }
    
    return result;
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
    // Track this page as having content
    if (text.trim().length > 0) {
      const wasFirstContent = !this.pagesWithContent.has(this.currentPage);
      this.pagesWithContent.add(this.currentPage);
      
      // Add page number if this is the first content on the page
      if (wasFirstContent) {
        this.addPageNumberIfNeeded();
      }
    }
    
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
    
    // Check if we need to prevent automatic pagination
    const preventAutoPagination = !finalOptions.continued;
    if (preventAutoPagination && text.trim().length > 0) {
      // Calculate text height to check if it fits
      const textHeight = this.calculateTextHeight(text, finalOptions);
      const remainingSpace = this.getRemainingSpace();
      
      this.logger.debug('Space check before writing text', {
        textLength: text.length,
        textHeight,
        remainingSpace,
        willFit: textHeight <= remainingSpace,
        currentPage: this.currentPage,
        currentY: this.doc.y
      });
      
      if (textHeight > remainingSpace && remainingSpace > 50) {
        // Text won't fit on current page, manually add new page
        // Only if we have more than 50 points remaining (to avoid edge cases)
        this.logger.info('Manual page break to prevent auto-pagination', {
          textHeight,
          remainingSpace,
          currentPage: this.currentPage
        });
        this.newPage();
      }
    }
    
    // Calculate available height to prevent auto-pagination
    const availableHeight = this.getRemainingSpace();
    const pageBeforeWrite = this.currentPage;
    const yBeforeWrite = this.doc.y;
    
    // Write text with options, limiting height to prevent auto-pagination
    this.doc.text(text, {
      align: finalOptions.align,
      lineGap: finalOptions.lineGap,
      continued: finalOptions.continued,
      height: availableHeight > 0 ? availableHeight : undefined
    });
    
    // Check if PDFKit added pages automatically
    if (this.currentPage !== pageBeforeWrite) {
      this.logger.warn('PDFKit auto-paginated!', {
        pagesBefore: pageBeforeWrite,
        pagesAfter: this.currentPage,
        pagesAdded: this.currentPage - pageBeforeWrite,
        textLength: text.length,
        availableHeight,
        yBefore: yBeforeWrite,
        yAfter: this.doc.y
      });
    }
    
    return this;
  }

  /**
   * Write formatted text with bold and italic segments
   * @param segments - Array of text segments with formatting
   * @param options - Base text formatting options
   * @returns This instance for method chaining
   */
  public writeFormattedText(
    segments: TextSegment[],
    options?: TextOptions
  ): this {
    // Track this page as having content if any segment has text
    if (segments.some(s => s.text.trim().length > 0)) {
      const wasFirstContent = !this.pagesWithContent.has(this.currentPage);
      this.pagesWithContent.add(this.currentPage);
      
      // Add page number if this is the first content on the page
      if (wasFirstContent) {
        this.addPageNumberIfNeeded();
      }
    }
    
    const baseOptions = {
      fontSize: 12,
      font: 'Times-Roman',
      ...options
    };
    
    // Check if the entire formatted text will fit on the page
    const fullText = segments.map(s => s.text).join('');
    const textHeight = this.calculateTextHeight(fullText, baseOptions);
    const remainingSpace = this.getRemainingSpace();
    
    if (textHeight > remainingSpace && remainingSpace > 0) {
      // Text won't fit, add new page before writing
      this.logger.debug('Manual page break for formatted text', {
        textHeight,
        remainingSpace,
        currentPage: this.currentPage
      });
      this.newPage();
    }
    
    segments.forEach((segment, index) => {
      // Determine font based on formatting
      let font = baseOptions.font;
      if (segment.bold && segment.italic) {
        font = 'Times-BoldItalic';
      } else if (segment.bold) {
        font = 'Times-Bold';
      } else if (segment.italic) {
        font = 'Times-Italic';
      }
      
      // Apply formatting for this segment
      this.doc.font(font);
      this.doc.fontSize(baseOptions.fontSize || 12);
      
      // Write the segment text (continued unless it's the last segment)
      this.doc.text(segment.text, {
        continued: index < segments.length - 1,
        lineGap: options?.lineGap,
        align: options?.align
      });
    });
    
    // Restore default font
    this.doc.font('Times-Roman');
    
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
   * @param level - Heading level (1-6)
   * @param options - Additional formatting options
   * @returns This instance for method chaining
   */
  public writeHeading(
    heading: string,
    level: 1 | 2 | 3 | 4 | 5 | 6 = 1,
    options?: TextOptions
  ): this {
    // Markdown heading sizes: H1=16pt, H2=14pt, H3=12pt, H4-6=12pt
    const sizes = { 1: 16, 2: 14, 3: 12, 4: 12, 5: 12, 6: 12 };
    
    // Bold for H1, H2, H3; regular for H4-6
    const isBold = level <= 3;
    const font = isBold ? 'Times-Bold' : 'Times-Roman';
    
    const headingOptions: TextOptions = {
      fontSize: sizes[level],
      font: font,
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
    // Note: currentPage is already incremented by the pageAdded event handler
    this.logger.debug('Manual new page added', { 
      currentPage: this.currentPage,
      calledFrom: new Error().stack?.split('\n')[2] 
    });
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
   * Get current horizontal position on the page
   * @returns Current X position in points
   */
  public getCurrentX(): number {
    return this.doc.x;
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
   * Move to specific position
   * @param yOrOptions - Y position or options object
   * @param y - Y position when first parameter is X
   * @returns This instance for method chaining
   */
  public moveTo(yOrOptions: number | { x: number; y: number }, y?: number): this {
    if (typeof yOrOptions === 'object') {
      // Object with x,y coordinates
      this.doc.x = yOrOptions.x;
      this.doc.y = yOrOptions.y;
    } else if (y !== undefined) {
      // Two number parameters: x, y
      this.doc.x = yOrOptions;
      this.doc.y = y;
    } else {
      // Single number parameter: y only
      this.doc.y = yOrOptions;
    }
    return this;
  }

  /**
   * Measure text height using PDFKit's measurement APIs (public for two-pass rendering)
   * @param text - Text to measure
   * @param options - Text formatting options
   * @returns Height in points
   */
  public measureTextHeight(text: string, options: TextOptions): number {
    return this.calculateTextHeight(text, options);
  }

  /**
   * Calculate the height that text will occupy
   * @param text - Text to measure
   * @param options - Text formatting options
   * @returns Height in points
   */
  private calculateTextHeight(text: string, options: TextOptions): number {
    // Apply options temporarily for measurement
    const originalFont = 'Times-Roman'; // Default font
    const originalSize = 12; // Default size
    
    if (options.font) {
      this.doc.font(options.font);
    }
    if (options.fontSize) {
      this.doc.fontSize(options.fontSize);
    }
    
    // Calculate dimensions
    const width = this.doc.page.width - this.pageConfig.margins.left - this.pageConfig.margins.right;
    const lineGap = options.lineGap || 0;
    
    // Use PDFKit's heightOfString method to get accurate height
    const height = this.doc.heightOfString(text, {
      width: width,
      lineGap: lineGap,
      align: options.align || 'left'
    });
    
    // Restore default font state
    this.doc.font(originalFont);
    this.doc.fontSize(originalSize);
    
    return height;
  }

  /**
   * Draw a horizontal line across the page
   * @param options - Line drawing options
   * @returns This instance for method chaining
   */
  public drawHorizontalLine(options?: {
    width?: number;
    color?: string;
    opacity?: number;
    marginLeft?: number;
    marginRight?: number;
  }): this {
    // Track this page as having content
    const wasFirstContent = !this.pagesWithContent.has(this.currentPage);
    this.pagesWithContent.add(this.currentPage);
    
    // Add page number if this is the first content on the page
    if (wasFirstContent) {
      this.addPageNumberIfNeeded();
    }
    
    const pageWidth = this.doc.page.width;
    const leftMargin = options?.marginLeft ?? this.pageConfig.margins.left;
    const rightMargin = options?.marginRight ?? this.pageConfig.margins.right;
    const lineWidth = options?.width ?? 0.5;
    const lineColor = options?.color ?? '#000000';
    const opacity = options?.opacity ?? 1;
    
    // Save current state
    const currentY = this.doc.y;
    
    // Calculate line position and length
    const startX = leftMargin;
    const endX = pageWidth - rightMargin;
    const lineY = currentY + 10; // Add some spacing above the line
    
    // Set line properties
    this.doc
      .strokeColor(lineColor)
      .strokeOpacity(opacity)
      .lineWidth(lineWidth);
    
    // Draw the line
    this.doc
      .moveTo(startX, lineY)
      .lineTo(endX, lineY)
      .stroke();
    
    // Move cursor below the line
    this.doc.y = lineY + 10; // Add spacing below the line
    
    // Restore default stroke properties
    this.doc
      .strokeColor('#000000')
      .strokeOpacity(1)
      .lineWidth(1);
    
    return this;
  }
} 