import * as fs from 'fs/promises';
import { createChildLogger, Logger } from '../utils/logger';
import { LegalPDFGenerator } from './pdf/LegalPDFGenerator';
import { DocumentFormatter } from './pdf/DocumentFormatter';
import { SignatureBlockParser } from './pdf/SignatureBlockParser';
import { PDFLayoutEngine } from './pdf/PDFLayoutEngine';
import { MarkdownParser } from './pdf/MarkdownParser';
import { BufferOutput } from './pdf/outputs';
import { 
  DocumentType, 
  DocumentFormattingRules, 
  Margins,
  SignatureBlockData,
  SignatureParty,
  LayoutBlock,
  LayoutPage,
  PDFGenerationOptions,
  ListItemData,
  LayoutResult,
  BlockMeasurement,
  PageMeasurements,
  PDFExportResult
} from '../types/pdf';
import { ProgressReporter } from '../types/progress';
import { NullProgressReporter } from '../utils/progress';
import { 
  IPDFExportService, 
  IDocumentFormatter, 
  ISignatureParser, 
  IMarkdownParser,
  LayoutEngineFactory,
  PDFGeneratorFactory
} from '../types/services';
import { FileOutput } from './pdf/outputs';

/**
 * Options for PDF export with overrides
 */
export interface PDFExportOptions {
  pageNumbers?: boolean;
  margins?: Margins;
  lineSpacing?: 'single' | 'one-half' | 'double';
  fontSize?: number;
  paperSize?: 'letter' | 'legal' | 'a4';
  header?: string;
  watermark?: string;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
  };
  onProgress?: (step: string, detail?: string) => void;
  parseMarkdown?: boolean; // Enable/disable Markdown parsing (default: true)
}

/**
 * Service that orchestrates PDF generation using all components
 */
export class PDFExportService implements IPDFExportService {
  private logger: Logger;
  
  // Injected dependencies with backward compatibility defaults
  private documentFormatter: IDocumentFormatter;
  private signatureParser: ISignatureParser;
  private markdownParser: IMarkdownParser;
  private layoutEngineFactory: LayoutEngineFactory;
  private pdfGeneratorFactory: PDFGeneratorFactory;
  private progressReporter: ProgressReporter;
  
  constructor(
    documentFormatter?: IDocumentFormatter,
    signatureParser?: ISignatureParser,
    markdownParser?: IMarkdownParser,
    layoutEngineFactory?: LayoutEngineFactory,
    pdfGeneratorFactory?: PDFGeneratorFactory,
    progressReporter: ProgressReporter = new NullProgressReporter(),
    logger?: Logger
  ) {
    // Use provided dependencies or create defaults for backward compatibility
    this.documentFormatter = documentFormatter || new DocumentFormatter();
    this.signatureParser = signatureParser || new SignatureBlockParser();
    this.markdownParser = markdownParser || new MarkdownParser();
    
    // Default factories if not provided
    this.layoutEngineFactory = layoutEngineFactory || ((generator, formatter, parser) => 
      new PDFLayoutEngine(generator as LegalPDFGenerator, formatter as DocumentFormatter, parser as SignatureBlockParser)
    );
    
    this.pdfGeneratorFactory = pdfGeneratorFactory || ((output, options) => 
      new LegalPDFGenerator(output, options)
    );
    
    this.progressReporter = progressReporter;
    this.logger = logger || createChildLogger({ service: 'PDFExportService' });
  }

  /**
   * Export text document to PDF with legal formatting
   */
  async export(
    text: string, 
    outputPath: string, 
    documentType: string, 
    options: PDFExportOptions = {}
  ): Promise<void> {
    this.logger.info('Starting PDF export', { 
      outputPath, 
      documentType,
      optionsProvided: Object.keys(options).length > 0 
    });

    const reportProgress = (step: string, detail?: string) => {
      // Use injected reporter
      this.progressReporter.report(step, detail);
      
      // Keep backward compatibility with options.onProgress
      if (options.onProgress) {
        options.onProgress(step, detail);
      }
      
      this.logger.debug(`Progress: ${step}`, { detail });
    };

    try {
      // Step 1: Initialize components
      reportProgress('Initializing PDF components');
      const generatorOptions: PDFGenerationOptions = {
        documentType,
        title: options.metadata?.title || `${documentType} Document`,
        author: options.metadata?.author || 'CaseThread CLI',
        subject: options.metadata?.subject || `Legal Document - ${documentType}`,
        keywords: options.metadata?.keywords || [documentType, 'legal', 'document']
      };
      
      // Create output and generator using injected factory
      const fileOutput = new FileOutput(outputPath);
      const generator = this.pdfGeneratorFactory(fileOutput, generatorOptions);
      
      // Use injected formatter
      const formatter = this.documentFormatter;
      
      // Use injected parser
      const parser = this.signatureParser;
      
      // Create layout engine using injected factory
      const layoutEngine = this.layoutEngineFactory(generator as LegalPDFGenerator, formatter, parser);

      // Step 2: Apply formatting overrides if provided
      if (options.lineSpacing || options.fontSize || options.margins) {
        reportProgress('Applying custom formatting');
        const overrides: Partial<DocumentFormattingRules> = {};
        if (options.lineSpacing) overrides.lineSpacing = options.lineSpacing;
        if (options.fontSize) overrides.fontSize = options.fontSize;
        if (options.margins) overrides.margins = options.margins;
        
        // Update formatter configuration with overrides
        if (formatter instanceof DocumentFormatter) {
          formatter.updateConfiguration({
            overrides: {
              [documentType]: overrides
            }
          });
        }
        this.logger.debug('Applied formatting overrides', { documentType, overrides });
      }

      // Step 3: Get document-specific formatting rules
      reportProgress('Loading document formatting rules', documentType);
      const rules = formatter.getFormattingRules(documentType as DocumentType);
      this.logger.debug('Using formatting rules', { documentType, rules });

      // Step 4: Parse document for signature blocks
      reportProgress('Parsing signature blocks');
      const parsedDoc = parser.parseDocument(text);
      this.logger.info('Document parsed', {
        lineCount: parsedDoc.content.length,
        signatureBlockCount: parsedDoc.signatureBlocks.length,
        hasSignatures: parsedDoc.hasSignatures
      });
      if (parsedDoc.hasSignatures) {
        reportProgress('Found signature blocks', `${parsedDoc.signatureBlocks.length} blocks`);
      }

      // Step 5: Prepare layout blocks
      reportProgress('Preparing document layout');
      const layoutBlocks = this.prepareLayoutBlocks(parsedDoc, rules, options.parseMarkdown !== false);
      this.logger.debug('Layout blocks prepared', { 
        blockCount: layoutBlocks.length,
        markdownParsing: options.parseMarkdown !== false
      });

      // Step 6: Calculate layout with page breaks
      reportProgress('Calculating page breaks');
      const layoutResult = layoutEngine.layoutDocument(
        layoutBlocks, 
        documentType as DocumentType
      );
      this.logger.info('Layout calculated', {
        totalPages: layoutResult.totalPages,
        hasOverflow: layoutResult.hasOverflow
      });
      reportProgress('Layout complete', `${layoutResult.totalPages} pages`);

      // Step 7: Start PDF generation
      reportProgress('Starting PDF generation');
      await generator.start();

      // Step 8: Set document-wide formatting (already handled in constructor)

      // Step 9: Two-pass rendering
      // First pass: Measure all content to get accurate page breaks
      reportProgress('Measuring content for accurate pagination');
      const pageBreaks = await this.measureContentForPageBreaks(
        generator as LegalPDFGenerator,
        formatter as DocumentFormatter,
        layoutResult,
        documentType as DocumentType,
        rules,
        options.parseMarkdown !== false
      );
      
      // Step 10: Render with known page breaks
      for (let i = 0; i < layoutResult.pages.length; i++) {
        const page = layoutResult.pages[i];
        reportProgress('Rendering page', `${i + 1} of ${layoutResult.totalPages}`);
        
        // Add new page if not first page
        if (i > 0) {
          generator.newPage();
        }

        // Apply page-specific margins (e.g., office action first page)
        const pageMargins = formatter.getMarginsForPage(documentType as DocumentType, i + 1);
        if (pageMargins.top !== rules.margins.top) {
          // Note: Page-specific margins would need special handling
          this.logger.debug('Page has special margins', { pageNumber: i + 1, margins: pageMargins });
        }

        // Render blocks on this page with known breaks
        await this.renderPageWithMeasurements(
          generator as LegalPDFGenerator, 
          formatter as DocumentFormatter, 
          page, 
          documentType as DocumentType, 
          rules, 
          options.parseMarkdown !== false,
          pageBreaks[i]
        );
      }

      // Step 11: Finalize PDF
      reportProgress('Finalizing PDF document');
      await generator.finalize();
      
      // Log final page statistics
      const finalPageCount = generator.getCurrentPage();
      const contentPages = Array.from(generator.getPagesWithContent());
      this.logger.info('Final page statistics', {
        layoutEnginePages: layoutResult.totalPages,
        actualPagesCreated: finalPageCount,
        pagesWithContent: contentPages,
        blankPages: finalPageCount - contentPages.length
      });
      
      reportProgress('PDF export completed');
      this.logger.info('PDF export completed successfully', { 
        outputPath,
        pageCount: finalPageCount,
        fileSize: await this.getFileSize(outputPath)
      });

    } catch (error) {
      this.logger.error('PDF export failed', error);
      throw new Error(`PDF export failed: ${(error as Error).message}`);
    }
  }

  /**
   * Export text document to PDF buffer for GUI integration
   */
  async exportToBuffer(
    text: string,
    documentType: string,
    options: PDFExportOptions = {}
  ): Promise<PDFExportResult> {
    const startTime = Date.now();
    
    this.logger.info('Starting PDF export to buffer', { 
      documentType,
      optionsProvided: Object.keys(options).length > 0 
    });

    const reportProgress = (step: string, detail?: string) => {
      // Use injected reporter
      this.progressReporter.report(step, detail);
      
      // Keep backward compatibility with options.onProgress
      if (options.onProgress) {
        options.onProgress(step, detail);
      }
      
      this.logger.debug(`Progress: ${step}`, { detail });
    };

    try {
      // Step 1: Initialize components with buffer output
      reportProgress('Initializing PDF components');
      const bufferOutput = new BufferOutput();
      const generatorOptions: PDFGenerationOptions = {
        documentType,
        title: options.metadata?.title || `${documentType} Document`,
        author: options.metadata?.author || 'CaseThread',
        subject: options.metadata?.subject || `Legal Document - ${documentType}`,
        keywords: options.metadata?.keywords || [documentType, 'legal', 'document']
      };
      
      // Create generator using injected factory
      const generator = this.pdfGeneratorFactory(bufferOutput, generatorOptions);
      
      // Use injected services
      const formatter = this.documentFormatter;
      const parser = this.signatureParser;
      
      // Create layout engine using injected factory
      const layoutEngine = this.layoutEngineFactory(generator as LegalPDFGenerator, formatter, parser);

      // Step 2: Apply formatting overrides if provided
      if (options.lineSpacing || options.fontSize || options.margins) {
        reportProgress('Applying custom formatting');
        const overrides: Partial<DocumentFormattingRules> = {};
        if (options.lineSpacing) overrides.lineSpacing = options.lineSpacing;
        if (options.fontSize) overrides.fontSize = options.fontSize;
        if (options.margins) overrides.margins = options.margins;
        
        // Update formatter configuration with overrides
        if (formatter instanceof DocumentFormatter) {
          formatter.updateConfiguration({
            overrides: {
              [documentType]: overrides
            }
          });
        }
        this.logger.debug('Applied formatting overrides', { documentType, overrides });
      }

      // Step 3: Get document-specific formatting rules
      reportProgress('Loading document formatting rules', documentType);
      const rules = formatter.getFormattingRules(documentType as DocumentType);
      this.logger.debug('Using formatting rules', { documentType, rules });

      // Step 4: Parse document for signature blocks
      reportProgress('Parsing signature blocks');
      const parsedDoc = parser.parseDocument(text);
      this.logger.info('Document parsed', {
        lineCount: parsedDoc.content.length,
        signatureBlockCount: parsedDoc.signatureBlocks.length,
        hasSignatures: parsedDoc.hasSignatures
      });

      // Step 5: Prepare layout blocks
      reportProgress('Preparing document layout');
      const layoutBlocks = this.prepareLayoutBlocks(parsedDoc, rules, options.parseMarkdown !== false);

      // Step 6: Calculate layout with page breaks
      reportProgress('Calculating page breaks');
      const layoutResult = layoutEngine.layoutDocument(
        layoutBlocks, 
        documentType as DocumentType
      );
      reportProgress('Layout complete', `${layoutResult.totalPages} pages`);

      // Step 7: Start PDF generation
      reportProgress('Starting PDF generation');
      await generator.start();

      // Step 8: Two-pass rendering
      reportProgress('Measuring content for accurate pagination');
      const pageBreaks = await this.measureContentForPageBreaks(
        generator as LegalPDFGenerator,
        formatter as DocumentFormatter,
        layoutResult,
        documentType as DocumentType,
        rules,
        options.parseMarkdown !== false
      );
      
      // Step 9: Render pages
      for (let i = 0; i < layoutResult.pages.length; i++) {
        const page = layoutResult.pages[i];
        reportProgress('Rendering page', `${i + 1} of ${layoutResult.totalPages}`);
        
        if (i > 0) {
          generator.newPage();
        }

        await this.renderPageWithMeasurements(
          generator as LegalPDFGenerator, 
          formatter as DocumentFormatter, 
          page, 
          documentType as DocumentType, 
          rules, 
          options.parseMarkdown !== false,
          pageBreaks[i]
        );
      }

      // Step 10: Finalize PDF
      reportProgress('Finalizing PDF document');
      await generator.finalize();
      
      // Step 11: Get buffer from output
      // The buffer is finalized when the generator ends
      const pdfBuffer = await bufferOutput.end() as Buffer;
      const finalPageCount = generator.getCurrentPage();
      
      reportProgress('PDF export completed');
      this.logger.info('PDF export to buffer completed successfully', { 
        documentType,
        pageCount: finalPageCount,
        bufferSize: pdfBuffer.length
      });

      // Calculate content stats
      const wordCount = parsedDoc.content.join(' ').split(/\s+/).filter(w => w.length > 0).length;
      const estimatedReadingTime = Math.ceil(wordCount / 200); // 200 words per minute

      // Return structured result
      return {
        buffer: pdfBuffer,
        pageCount: finalPageCount,
        metadata: {
          documentType,
          generatedAt: new Date(),
          fileSize: pdfBuffer.length,
          exportType: 'buffer',
          generator: 'CaseThread PDF Generator',
          formatVersion: '1.0'
        },
        processingTime: Date.now() - startTime,
        signatureBlockCount: parsedDoc.signatureBlocks.length,
        hasTableOfContents: false, // TODO: Add TOC support in future
        estimatedReadingTime
      };

    } catch (error) {
      this.logger.error('PDF export to buffer failed', error);
      throw new Error(`PDF export to buffer failed: ${(error as Error).message}`);
    }
  }

  /**
   * Prepare layout blocks from parsed document
   */
  private prepareLayoutBlocks(
    parsedDoc: { content: string[]; signatureBlocks: SignatureBlockData[] },
    rules: DocumentFormattingRules,
    parseMarkdown: boolean = true
  ): LayoutBlock[] {
    const blocks: LayoutBlock[] = [];
    const signatureIndices = new Map<number, SignatureBlockData>();

    // Map signature blocks to their line indices
    parsedDoc.signatureBlocks.forEach(block => {
      const markerLine = parsedDoc.content.findIndex(line => 
        line.includes(block.marker.fullMarker)
      );
      if (markerLine >= 0) {
        signatureIndices.set(markerLine, block);
      }
    });

    // Process each line
    let i = 0;
    while (i < parsedDoc.content.length) {
      const line = parsedDoc.content[i];

      // Check if this line has a signature block
      if (signatureIndices.has(i)) {
        const sigBlock = signatureIndices.get(i)!;
        blocks.push({
          type: 'signature',
          content: sigBlock,
          height: this.calculateSignatureBlockHeight(sigBlock),
          breakable: false,
          keepWithNext: false
        });
        i++;
        continue;
      }

      // Detect horizontal rule (only if markdown parsing enabled)
      if (parseMarkdown && this.markdownParser.isHorizontalRule(line)) {
        blocks.push({
          type: 'horizontal-rule',
          content: '',
          height: 20, // Fixed height for horizontal rules
          breakable: false,
          keepWithNext: false
        });
        i++;
        continue;
      }

      // Detect heading
      if (this.isHeading(line)) {
        // Check if it's a Markdown heading (only if markdown parsing enabled)
        const parsedHeading = parseMarkdown ? this.markdownParser.parseHeading(line) : null;
        
        if (parsedHeading) {
          // Markdown heading - use parsed text and level
          const fontSize = this.markdownParser.getHeadingFontSize(parsedHeading.level);
          blocks.push({
            type: 'heading',
            content: parsedHeading.text, // Stripped of # symbols
            height: this.calculateTextHeight(parsedHeading.text, fontSize),
            breakable: false,
            keepWithNext: true,
            headingLevel: parsedHeading.level
          });
        } else {
          // Traditional heading (all caps, numbered, etc.)
          blocks.push({
            type: 'heading',
            content: line,
            height: this.calculateTextHeight(line, rules.fontSize * 1.2),
            breakable: false,
            keepWithNext: true,
            headingLevel: 1 // Default to H1 for traditional headings
          });
        }
        i++;
        continue;
      }

      // Check if it's a list item (only if markdown parsing enabled)
      const listItem = parseMarkdown ? this.markdownParser.parseListItem(line) : null;
      if (listItem) {
        blocks.push({
          type: 'list-item',
          content: listItem,
          height: this.calculateTextHeight(listItem.text, rules.fontSize),
          breakable: false,
          keepWithNext: true,
          listData: listItem
        });
        i++;
        continue;
      }

      // Check if it's a block quote (only if markdown parsing enabled)
      if (parseMarkdown && this.markdownParser.isBlockQuote(line)) {
        const content = this.markdownParser.parseBlockQuote(line) || '';
        blocks.push({
          type: 'blockquote',
          content: content,
          height: this.calculateTextHeight(content, rules.fontSize),
          breakable: true,
          keepWithNext: false
        });
        i++;
        continue;
      }

      // Skip table separator rows (only if markdown parsing enabled)
      if (parseMarkdown && this.markdownParser.isTableSeparator(line)) {
        i++;
        continue;
      }

      // Check if it's a table row (only if markdown parsing enabled)
      if (parseMarkdown && this.markdownParser.isTableRow(line)) {
        // For simple legal document formatting, convert table to aligned text
        const cells = this.markdownParser.parseTableRow(line);
        const formattedRow = this.formatTableRowAsText(cells);
        blocks.push({
          type: 'text',
          content: formattedRow,
          height: this.calculateTextHeight(formattedRow, rules.fontSize),
          breakable: false,
          keepWithNext: true
        });
        i++;
        continue;
      }

      // Group consecutive text lines into paragraphs
      const paragraph: string[] = [];
      while (i < parsedDoc.content.length && 
             !signatureIndices.has(i) && 
             !this.isHeading(parsedDoc.content[i]) &&
             (!parseMarkdown || !this.markdownParser.isHorizontalRule(parsedDoc.content[i])) &&
             (!parseMarkdown || !this.markdownParser.parseListItem(parsedDoc.content[i])) &&
             (!parseMarkdown || !this.markdownParser.isBlockQuote(parsedDoc.content[i])) &&
             (!parseMarkdown || !this.markdownParser.isTableRow(parsedDoc.content[i])) &&
             parsedDoc.content[i].trim() !== '') {
        paragraph.push(parsedDoc.content[i]);
        i++;
      }

      if (paragraph.length > 0) {
        // Extract link text from paragraphs (only if markdown parsing enabled)
        const processedParagraph = parseMarkdown 
          ? paragraph.map(line => this.markdownParser.extractLinkText(line))
          : paragraph;
        
        blocks.push({
          type: 'text',
          content: processedParagraph.join('\n'),
          height: this.calculateTextHeight(
            processedParagraph.join('\n'), 
            rules.fontSize,
            rules.lineSpacing
          ),
          breakable: true,
          keepWithNext: false
        });
      }

      // Skip empty lines
      if (i < parsedDoc.content.length && parsedDoc.content[i].trim() === '') {
        i++;
      }
    }

    return blocks;
  }



  /**
   * Render a signature block
   */
  private async renderSignatureBlock(
    generator: LegalPDFGenerator,
    sigBlock: SignatureBlockData,
    rules: DocumentFormattingRules
  ): Promise<void> {
    const isSideBySide = sigBlock.layout === 'side-by-side';
    
    if (isSideBySide && sigBlock.parties.length >= 2) {
      // Render side-by-side signatures
      const columnWidth = (generator.getPageDimensions().width - 
                          rules.margins.left - 
                          rules.margins.right) / 2;
      
      // Save current position
      const startY = generator.getCurrentY();
      
      // Render left column
      const leftParty = sigBlock.parties[0];
      generator.moveTo(rules.margins.left, startY);
      this.renderSignatureParty(generator, leftParty);
      
      // Render right column
      const rightParty = sigBlock.parties[1];
      generator.moveTo(rules.margins.left + columnWidth, startY);
      this.renderSignatureParty(generator, rightParty);
      
      // Move to bottom of both columns
      generator.moveTo(rules.margins.left, startY + this.calculatePartyHeight(sigBlock.parties[0]));
      
    } else {
      // Render signatures vertically
      for (const party of sigBlock.parties) {
        this.renderSignatureParty(generator, party);
        generator.addSpace(24); // Space between parties
      }
    }
  }

  /**
   * Render a single signature party
   */
  private renderSignatureParty(
    generator: LegalPDFGenerator,
    party: SignatureParty
  ): void {
    // Signature line
    generator.writeText('_________________________________', { fontSize: 10 });
    
    // Name and title
    if (party.name || party.role) {
      generator.writeText(party.name || party.role || '', { fontSize: 10 });
    }
    if (party.title) {
      generator.writeText(`Title: ${party.title}`, { fontSize: 10 });
    }
    if (party.company) {
      generator.writeText(party.company, { fontSize: 10 });
    }
    
    // Date line if present
    if (party.date !== undefined) {
      generator.addSpace(12);
      generator.writeText('Date: _______________________', { fontSize: 10 });
    }
  }



  /**
   * Calculate height of a signature block
   */
  private calculateSignatureBlockHeight(sigBlock: SignatureBlockData): number {
    const partyHeight = Math.max(...sigBlock.parties.map(p => this.calculatePartyHeight(p)));
    return sigBlock.layout === 'side-by-side' ? partyHeight : partyHeight * sigBlock.parties.length;
  }

  /**
   * Calculate height of a single party in signature block
   */
  private calculatePartyHeight(party: SignatureParty): number {
    let height = 40; // Signature line
    if (party.name || party.role) height += 15;
    if (party.title) height += 15;
    if (party.company) height += 15;
    if (party.date !== undefined) height += 30;
    return height;
  }

  /**
   * Calculate height of text with given formatting
   */
  private calculateTextHeight(
    text: string, 
    fontSize: number, 
    lineSpacing: 'single' | 'one-half' | 'double' = 'single'
  ): number {
    // Use a more accurate calculation that accounts for word wrapping
    const lines = text.split('\n');
    let totalLines = 0;
    
    // Estimate wrapped lines based on typical page width
    // Letter size (8.5") with 1" margins = 6.5" = 468pt
    const textWidth = 468;
    const avgCharsPerLine = textWidth / (fontSize * 0.5); // Rough estimate
    
    for (const line of lines) {
      if (line.length === 0) {
        totalLines += 1; // Empty line
      } else {
        // Add extra lines for wrapping
        totalLines += Math.ceil(line.length / avgCharsPerLine);
      }
    }
    
    const lineHeight = fontSize * 1.2; // Standard line height multiplier
    const lineGap = lineSpacing === 'double' ? 12 : lineSpacing === 'one-half' ? 6 : 0;
    
    // Add 20% buffer for safety
    return totalLines * (lineHeight + lineGap) * 1.2;
  }

  /**
   * Check if a line is a heading
   */
  private isHeading(line: string): boolean {
    // Check for Markdown headings first
    if (this.markdownParser.isMarkdownHeading(line)) {
      return true;
    }
    
    // Simple heuristic: all caps, or numbered sections, or short lines
    const trimmed = line.trim();
    return (
      trimmed.length > 0 &&
      trimmed.length < 100 &&
      (trimmed === trimmed.toUpperCase() ||
       /^\d+\./.test(trimmed) ||
       /^[IVX]+\./.test(trimmed))
    );
  }

  /**
   * Render a list item with proper indentation and markers
   */
  private renderListItem(
    generator: LegalPDFGenerator,
    listData: ListItemData,
    rules: DocumentFormattingRules
  ): void {
    // Calculate indentation based on list level
    const indentPerLevel = 36; // 0.5 inch per level
    const baseIndent = rules.margins.left;
    const totalIndent = baseIndent + (listData.level * indentPerLevel);
    
    // Save current position
    const currentY = generator.getCurrentY();
    
    // Move to indented position
    generator.moveTo(totalIndent, currentY);
    
    // Render marker
    const markerWidth = 20; // Space for marker
    const marker = listData.type === 'unordered' ? '•' : listData.marker;
    generator.writeText(marker, { fontSize: rules.fontSize });
    
    // Render content with hanging indent
    generator.moveTo(totalIndent + markerWidth, currentY);
    
    // Parse inline formatting in the list item text
    const segments = this.markdownParser.parseInlineFormatting(listData.text);
    const hasFormatting = segments.some(s => s.bold || s.italic);
    
    if (hasFormatting) {
      generator.writeFormattedText(segments, { fontSize: rules.fontSize });
    } else {
      generator.writeText(listData.text, { fontSize: rules.fontSize });
    }
    
    // Add spacing after list item
    generator.addSpace(0.5);
  }

  /**
   * Render a block quote with indentation and italic formatting
   */
  private renderBlockQuote(
    generator: LegalPDFGenerator,
    text: string,
    rules: DocumentFormattingRules
  ): void {
    // Apply block quote indentation
    const quoteIndent = rules.blockQuoteIndent || 72; // 1 inch default
    generator.moveTo(rules.margins.left + quoteIndent, generator.getCurrentY());
    
    // Parse inline formatting in the quote text
    const segments = this.markdownParser.parseInlineFormatting(text);
    
    // Add italic to all segments for block quote style
    const italicSegments = segments.map(segment => ({
      ...segment,
      italic: true
    }));
    
    // Render with italic formatting
    generator.writeFormattedText(italicSegments, { 
      fontSize: rules.fontSize,
      lineGap: rules.lineSpacing === 'double' ? 12 : rules.lineSpacing === 'one-half' ? 6 : 0
    });
    
    // Restore position and add spacing
    generator.moveTo(rules.margins.left, generator.getCurrentY());
    generator.addSpace(1);
  }

  /**
   * Measure content for accurate page breaks (first pass)
   */
  private async measureContentForPageBreaks(
    generator: LegalPDFGenerator,
    formatter: DocumentFormatter,
    layoutResult: LayoutResult,
    documentType: DocumentType,
    rules: DocumentFormattingRules,
    parseMarkdown: boolean = true
  ): Promise<PageMeasurements[]> {
    const measurements: PageMeasurements[] = [];
    
    for (const page of layoutResult.pages) {
      const pageMeasurements: PageMeasurements = {
        blocks: [],
        totalHeight: 0,
        hasSignatureBlock: false
      };
      
      for (const block of page.blocks) {
        // Measure each block accurately
        const blockMeasurement = await this.measureBlock(
          generator,
          formatter,
          block,
          documentType,
          rules,
          parseMarkdown
        );
        
        pageMeasurements.blocks.push(blockMeasurement);
        pageMeasurements.totalHeight += blockMeasurement.actualHeight;
        
        if (block.type === 'signature') {
          pageMeasurements.hasSignatureBlock = true;
        }
      }
      
      measurements.push(pageMeasurements);
    }
    
    return measurements;
  }

  /**
   * Measure a single block's actual height
   */
  private async measureBlock(
    generator: LegalPDFGenerator,
    formatter: DocumentFormatter,
    block: LayoutBlock,
    documentType: DocumentType,
    rules: DocumentFormattingRules,
    _parseMarkdown: boolean = true
  ): Promise<BlockMeasurement> {
    let actualHeight = 0;
    
    switch (block.type) {
      case 'heading':
        const level = (block.headingLevel || 1) as 1 | 2 | 3 | 4 | 5 | 6;
        const headingSize = this.markdownParser.getHeadingFontSize(level);
        actualHeight = generator.measureTextHeight(block.content as string, {
          fontSize: headingSize,
          font: level <= 3 ? 'Times-Bold' : 'Times-Roman'
        });
        actualHeight += 6; // Spacing after heading
        break;
        
      case 'text':
        const lineGap = formatter.applyLineSpacing(documentType, false);
        actualHeight = generator.measureTextHeight(block.content as string, {
          fontSize: rules.fontSize,
          lineGap
        });
        actualHeight += 12; // Paragraph spacing
        break;
        
      case 'signature':
        // Use calculated height for signature blocks
        actualHeight = block.height;
        break;
        
      case 'horizontal-rule':
        actualHeight = 20;
        break;
        
      case 'list-item':
        actualHeight = generator.measureTextHeight(
          (block.content as ListItemData).text,
          { fontSize: rules.fontSize }
        );
        actualHeight += 6; // List item spacing
        break;
        
      case 'blockquote':
        actualHeight = generator.measureTextHeight(block.content as string, {
          fontSize: rules.fontSize,
          font: 'Times-Italic'
        });
        actualHeight += 12; // Quote spacing
        break;
    }
    
    return {
      type: block.type,
      estimatedHeight: block.height,
      actualHeight,
      canSplit: block.breakable && block.type === 'text' && actualHeight > 100
    };
  }

  /**
   * Render page with pre-measured content
   */
  private async renderPageWithMeasurements(
    generator: LegalPDFGenerator,
    formatter: DocumentFormatter,
    page: LayoutPage,
    documentType: DocumentType,
    rules: DocumentFormattingRules,
    parseMarkdown: boolean = true,
    measurements: PageMeasurements
  ): Promise<void> {
    let blockIndex = 0;
    
    for (const block of page.blocks) {
      const measurement = measurements.blocks[blockIndex];
      const remainingSpace = generator.getRemainingSpace();
      
      // Check if we need to handle signature block specially
      if (block.type === 'signature' && measurement.actualHeight > remainingSpace - 20) {
        // Not enough space for signature block, force new page
        this.logger.info('Moving signature block to next page', {
          required: measurement.actualHeight,
          available: remainingSpace
        });
        generator.newPage();
      }
      
      // Render the block normally
      await this.renderBlock(
        generator,
        formatter,
        block,
        documentType,
        rules,
        parseMarkdown
      );
      
      blockIndex++;
    }
  }

  /**
   * Render a single block
   */
  private async renderBlock(
    generator: LegalPDFGenerator,
    formatter: DocumentFormatter,
    block: LayoutBlock,
    documentType: DocumentType,
    rules: DocumentFormattingRules,
    parseMarkdown: boolean = true
  ): Promise<void> {
    switch (block.type) {
      case 'heading':
        const level = (block.headingLevel || 1) as 1 | 2 | 3 | 4 | 5 | 6;
        generator.writeHeading(block.content as string, level);
        break;
        
      case 'text':
        const lineGap = formatter.applyLineSpacing(documentType, false);
        const textContent = block.content as string;
        
        // Parse for inline formatting (only if markdown parsing enabled)
        const segments = parseMarkdown 
          ? this.markdownParser.parseInlineFormatting(textContent)
          : [{ text: textContent }];
        
        // Check if there's any formatting
        const hasFormatting = segments.some(s => s.bold || s.italic);
        
        if (hasFormatting) {
          // Use formatted text method
          generator.writeFormattedText(segments, { lineGap });
          generator.addSpace(1); // Add paragraph spacing
        } else {
          // Use regular paragraph method
          generator.writeParagraph(textContent, { lineGap });
        }
        break;
        
      case 'signature':
        await this.renderSignatureBlock(
          generator, 
          block.content as SignatureBlockData,
          rules
        );
        break;
        
      case 'horizontal-rule':
        generator.drawHorizontalLine();
        break;
        
      case 'list-item':
        const listData = block.content as ListItemData;
        this.renderListItem(generator, listData, rules);
        break;
        
      case 'blockquote':
        const quoteText = block.content as string;
        this.renderBlockQuote(generator, quoteText, rules);
        break;
        
      default:
        this.logger.warn('Unknown block type', { type: block.type });
    }
  }

  /**
   * Format table row cells as aligned text
   * For legal documents, we use simple text alignment rather than drawing table borders
   */
  private formatTableRowAsText(cells: string[]): string {
    if (cells.length === 0) return '';
    
    // For 2-column tables (common in legal docs), use specific alignment
    if (cells.length === 2) {
      // Left-align first column, right-align second column with dots
      const leftCol = cells[0].padEnd(20, ' ');
      const rightCol = cells[1].padStart(20, ' ');
      return `${leftCol}  ${rightCol}`;
    }
    
    // For other tables, use tab-like spacing
    return cells.join('    ');
  }

  /**
   * Get file size for logging
   */
  private async getFileSize(filePath: string): Promise<string> {
    try {
      const stats = await fs.stat(filePath);
      return `${(stats.size / 1024).toFixed(2)} KB`;
    } catch {
      return 'unknown';
    }
  }
} 