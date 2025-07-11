import * as fs from 'fs/promises';
import { createChildLogger, Logger } from '../utils/logger';
import { LegalPDFGenerator } from './pdf/LegalPDFGenerator';
import { DocumentFormatter } from './pdf/DocumentFormatter';
import { SignatureBlockParser } from './pdf/SignatureBlockParser';
import { PDFLayoutEngine } from './pdf/PDFLayoutEngine';
import { FormattingConfiguration } from '../config/pdf-formatting';
import { 
  DocumentType, 
  DocumentFormattingRules, 
  Margins,
  SignatureBlockData,
  SignatureParty,
  LayoutBlock,
  LayoutPage,
  PDFGenerationOptions
} from '../types/pdf';

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
}

/**
 * Service that orchestrates PDF generation using all components
 */
export class PDFExportService {
  private logger: Logger;
  
  constructor() {
    this.logger = createChildLogger({ service: 'PDFExportService' });
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

    try {
      // Step 1: Initialize components
      const generatorOptions: PDFGenerationOptions = {
        documentType,
        title: options.metadata?.title || `${documentType} Document`,
        author: options.metadata?.author || 'CaseThread CLI',
        subject: options.metadata?.subject || `Legal Document - ${documentType}`,
        keywords: options.metadata?.keywords || [documentType, 'legal', 'document']
      };
      const generator = new LegalPDFGenerator(outputPath, generatorOptions);
      const config = new FormattingConfiguration();
      const formatter = new DocumentFormatter(config.getConfig());
      const parser = new SignatureBlockParser();
      const layoutEngine = new PDFLayoutEngine(generator, formatter, parser);

      // Step 2: Apply formatting overrides if provided
      if (options.lineSpacing || options.fontSize || options.margins) {
        const overrides: Partial<DocumentFormattingRules> = {};
        if (options.lineSpacing) overrides.lineSpacing = options.lineSpacing;
        if (options.fontSize) overrides.fontSize = options.fontSize;
        if (options.margins) overrides.margins = options.margins;
        
        // Update config with overrides for this document type
        config.updateConfig({
          overrides: {
            [documentType]: overrides
          }
        });
        this.logger.debug('Applied formatting overrides', { documentType, overrides });
      }

      // Step 3: Get document-specific formatting rules
      const rules = formatter.getFormattingRules(documentType as DocumentType);
      this.logger.debug('Using formatting rules', { documentType, rules });

      // Step 4: Parse document for signature blocks
      const parsedDoc = parser.parseDocument(text);
      this.logger.info('Document parsed', {
        lineCount: parsedDoc.content.length,
        signatureBlockCount: parsedDoc.signatureBlocks.length,
        hasSignatures: parsedDoc.hasSignatures
      });

      // Step 5: Prepare layout blocks
      const layoutBlocks = this.prepareLayoutBlocks(parsedDoc, rules);
      this.logger.debug('Layout blocks prepared', { blockCount: layoutBlocks.length });

      // Step 6: Calculate layout with page breaks
      const layoutResult = layoutEngine.layoutDocument(
        layoutBlocks, 
        documentType as DocumentType
      );
      this.logger.info('Layout calculated', {
        totalPages: layoutResult.totalPages,
        hasOverflow: layoutResult.hasOverflow
      });

      // Step 7: Start PDF generation
      await generator.start();

      // Step 8: Set document-wide formatting (already handled in constructor)

      // Step 9: Render each page
      for (let i = 0; i < layoutResult.pages.length; i++) {
        const page = layoutResult.pages[i];
        
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

        // Render blocks on this page
        await this.renderPage(generator, formatter, page, documentType as DocumentType, rules);

        // Add page number if enabled
        if (options.pageNumbers !== false) {
          generator.addPageNumberToCurrentPage();
        }
      }

      // Step 10: Finalize PDF
      await generator.finalize();
      
      this.logger.info('PDF export completed successfully', { 
        outputPath,
        pageCount: layoutResult.totalPages,
        fileSize: await this.getFileSize(outputPath)
      });

    } catch (error) {
      this.logger.error('PDF export failed', error);
      throw new Error(`PDF export failed: ${(error as Error).message}`);
    }
  }

  /**
   * Prepare layout blocks from parsed document
   */
  private prepareLayoutBlocks(
    parsedDoc: { content: string[]; signatureBlocks: SignatureBlockData[] },
    rules: DocumentFormattingRules
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

      // Detect heading
      if (this.isHeading(line)) {
        blocks.push({
          type: 'heading',
          content: line,
          height: this.calculateTextHeight(line, rules.fontSize * 1.2),
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
             parsedDoc.content[i].trim() !== '') {
        paragraph.push(parsedDoc.content[i]);
        i++;
      }

      if (paragraph.length > 0) {
        blocks.push({
          type: 'text',
          content: paragraph.join('\n'),
          height: this.calculateTextHeight(
            paragraph.join('\n'), 
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
   * Render a page of content
   */
  private async renderPage(
    generator: LegalPDFGenerator,
    formatter: DocumentFormatter,
    page: LayoutPage,
    documentType: DocumentType,
    rules: DocumentFormattingRules
  ): Promise<void> {
    for (const block of page.blocks) {
      switch (block.type) {
        case 'heading':
          generator.writeHeading(block.content as string, 1);
          break;
          
        case 'text':
          const lineGap = formatter.applyLineSpacing(documentType, false);
          generator.writeParagraph(block.content as string, { lineGap });
          break;
          
        case 'signature':
          await this.renderSignatureBlock(
            generator, 
            block.content as SignatureBlockData,
            rules
          );
          break;
          
        default:
          this.logger.warn('Unknown block type', { type: block.type });
      }
    }
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
    const lines = text.split('\n').length;
    const lineHeight = fontSize * 1.2; // Standard line height multiplier
    const lineGap = lineSpacing === 'double' ? 12 : lineSpacing === 'one-half' ? 6 : 0;
    return lines * (lineHeight + lineGap);
  }

  /**
   * Check if a line is a heading
   */
  private isHeading(line: string): boolean {
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