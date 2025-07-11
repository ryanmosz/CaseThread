import { createChildLogger, Logger } from '../../utils/logger';
import { LegalPDFGenerator } from './LegalPDFGenerator';
import { DocumentFormatter } from './DocumentFormatter';
import { SignatureBlockParser } from './SignatureBlockParser';
import {
  LayoutBlock,
  LayoutConstraints,
  LayoutResult,
  LayoutPage,
  DocumentType,
  SignatureBlockData,
  SignatureParty
} from '../../types/pdf';

/**
 * PDF Layout Engine for advanced document layout management
 * Handles signature block positioning, page breaks, and orphan control
 */
export class PDFLayoutEngine {
  private logger: Logger;
  private generator: LegalPDFGenerator;
  private formatter: DocumentFormatter;
  private parser: SignatureBlockParser;

  constructor(
    generator: LegalPDFGenerator,
    formatter: DocumentFormatter,
    parser: SignatureBlockParser
  ) {
    this.logger = createChildLogger({ service: 'PDFLayoutEngine' });
    this.generator = generator;
    this.formatter = formatter;
    this.parser = parser;
  }

  /**
   * Layout document blocks into pages
   * @param blocks - Array of layout blocks to position
   * @param documentType - Type of document being laid out
   * @returns Layout result with pages
   */
  public layoutDocument(
    blocks: LayoutBlock[],
    documentType: DocumentType
  ): LayoutResult {
    const constraints = this.getLayoutConstraints(documentType);
    const pages: LayoutPage[] = [];
    let currentPage = this.createNewPage(1, documentType);
    
    let i = 0;
    while (i < blocks.length) {
      const block = blocks[i];
      
      // Check if this block has keepWithNext or is part of a signature group
      if (block.keepWithNext || (block.type === 'signature' && i < blocks.length - 1 && blocks[i + 1].type === 'signature')) {
        const groupHeight = this.calculateGroupHeight(blocks, i);
        
        // If group doesn't fit on current page
        if (groupHeight > currentPage.remainingHeight && currentPage.blocks.length > 0) {
          // Start new page
          pages.push(currentPage);
          currentPage = this.createNewPage(pages.length + 1, documentType);
        }
      }
      
      // Check if block fits on current page
      if (this.blockFitsOnPage(block, currentPage, constraints)) {
        // Block fits, add it
        this.addBlockToPage(block, currentPage);
        i++;
      } else {
        // Block doesn't fit on current page
        
        // Check if block is too large for any page
        const maxPageHeight = this.getMaxPageHeight(documentType);
        if (block.height > maxPageHeight) {
          this.logger.warn('Block too large for single page', {
            blockType: block.type,
            blockHeight: block.height,
            maxHeight: maxPageHeight
          });
          
          // Try to split if it's a text block
          if (this.canSplitTextBlock(block)) {
            // Push current page first
            if (currentPage.blocks.length > 0) {
              pages.push(currentPage);
              currentPage = this.createNewPage(pages.length + 1, documentType);
            }
            
            // Split the block
            const splitBlocks = this.splitTextBlock(block, currentPage.remainingHeight);
            
            // Process all split blocks
            for (const splitBlock of splitBlocks) {
              if (!this.blockFitsOnPage(splitBlock, currentPage, constraints)) {
                pages.push(currentPage);
                currentPage = this.createNewPage(pages.length + 1, documentType);
              }
              this.addBlockToPage(splitBlock, currentPage);
            }
            i++;
          } else {
            // Can't split, force add the oversized block
            if (currentPage.blocks.length > 0) {
              pages.push(currentPage);
              currentPage = this.createNewPage(pages.length + 1, documentType);
            }
            this.addBlockToPage(block, currentPage);
            i++;
          }
        } else {
          // Block fits on a page but not the current one
          // Always push current page (even if empty) to maintain page flow
          pages.push(currentPage);
          currentPage = this.createNewPage(pages.length + 1, documentType);
          
          // Add the block to the new page
          this.addBlockToPage(block, currentPage);
          i++;
        }
      }
    }
    
    // Add final page if it has blocks
    if (currentPage.blocks.length > 0) {
      pages.push(currentPage);
    }
    
    // Optimize layout to balance pages and avoid orphans/widows
    const optimizedPages = this.optimizeLayout(pages);
    
    return {
      pages: optimizedPages,
      totalPages: optimizedPages.length,
      hasOverflow: false
    };
  }

  /**
   * Create a new page with proper dimensions
   * @param pageNumber - Page number (1-based)
   * @param documentType - Type of document
   * @returns New page with calculated dimensions
   */
  private createNewPage(pageNumber: number, documentType: DocumentType): LayoutPage {
    const pageArea = this.formatter.getUsablePageArea(documentType, pageNumber);
    
    return {
      blocks: [],
      remainingHeight: pageArea.height,
      pageNumber
    };
  }

  /**
   * Get layout constraints for document type
   * @param documentType - Type of document
   * @returns Layout constraints
   */
  private getLayoutConstraints(_documentType: DocumentType): LayoutConstraints {
    // Default constraints
    return {
      maxHeight: 648, // 9 inches (11 - 1" top - 1" bottom)
      minOrphanLines: 2,
      minWidowLines: 2,
      preferredBreakPoints: []
    };
  }

  /**
   * Check if block fits on page
   * @param block - Block to check
   * @param page - Current page
   * @param constraints - Layout constraints
   * @returns True if block fits
   */
  private blockFitsOnPage(
    block: LayoutBlock,
    page: LayoutPage,
    _constraints: LayoutConstraints
  ): boolean {
    return block.height <= page.remainingHeight;
  }



  /**
   * Check if block should stay together
   * @param block - Block to check
   * @returns True if block should not be split
   */
  private shouldKeepTogether(block: LayoutBlock): boolean {
    // Signature blocks should never be split
    if (block.type === 'signature') {
      return true;
    }
    
    // Headings should stay with following content
    if (block.type === 'heading' && block.keepWithNext) {
      return true;
    }
    
    // Tables should try to stay together
    if (block.type === 'table' && !block.breakable) {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate total height of blocks that must stay together
   * @param blocks - All blocks
   * @param startIndex - Starting index
   * @returns Total height of group
   */
  private calculateGroupHeight(
    blocks: LayoutBlock[],
    startIndex: number
  ): number {
    let totalHeight = 0;
    let currentIndex = startIndex;
    const startBlock = blocks[startIndex];
    
    while (currentIndex < blocks.length) {
      const block = blocks[currentIndex];
      totalHeight += block.height;
      
      // Special case: consecutive signature blocks should stay together
      if (startBlock.type === 'signature' && 
          currentIndex < blocks.length - 1 && 
          blocks[currentIndex + 1].type === 'signature') {
        currentIndex++;
        continue;
      }
      
      // Check if next block must stay with this one
      if (!block.keepWithNext && currentIndex > startIndex) {
        break;
      }
      
      currentIndex++;
    }
    
    return totalHeight;
  }



  /**
   * Get maximum page height for document type
   * @param documentType - Type of document
   * @returns Maximum height in points
   */
  private getMaxPageHeight(documentType: DocumentType): number {
    // Get the usable area for a typical page
    const pageArea = this.formatter.getUsablePageArea(documentType, 2); // Not first page
    return pageArea.height;
  }

  /**
   * Add block to page and update remaining height
   * @param block - Block to add
   * @param page - Page to add to
   */
  private addBlockToPage(block: LayoutBlock, page: LayoutPage): void {
    page.blocks.push(block);
    page.remainingHeight -= block.height;
  }

  /**
   * Render signature block to PDF
   * @param blockData - Signature block data
   * @param startY - Y position to start rendering
   * @returns Y position after rendering
   */
  public renderSignatureBlock(
    blockData: SignatureBlockData,
    startY: number
  ): number {
    this.logger.debug('Rendering signature block', {
      type: blockData.marker.type,
      layout: blockData.layout,
      parties: blockData.parties.length,
      notary: blockData.notaryRequired
    });

    const layout = this.parser.analyzeLayout(blockData);
    const currentX = this.generator.getCurrentX();
    let currentY = startY;
    
    if (layout.columns === 2) {
      currentY = this.renderSideBySideSignatures(blockData, currentX, currentY, layout);
    } else {
      currentY = this.renderSingleSignature(blockData, currentX, currentY, layout);
    }
    
    // Add notary section if required
    if (blockData.notaryRequired) {
      currentY = this.renderNotarySection(currentY);
    }
    
    this.logger.debug('Signature block rendered', {
      startY,
      endY: currentY,
      height: currentY - startY
    });

    return currentY;
  }

  /**
   * Render single column signature
   * @param blockData - Signature block data
   * @param x - X position
   * @param y - Y position
   * @param layout - Layout information
   * @returns Y position after rendering
   */
  private renderSingleSignature(
    blockData: SignatureBlockData,
    x: number,
    y: number,
    layout: ReturnType<SignatureBlockParser['analyzeLayout']>
  ): number {
    let currentY = y;
    
    for (const party of blockData.parties) {
      // Party role
      if (party.role) {
        this.generator.moveTo({ x, y: currentY });
        this.generator.writeText(`${party.role}:`, { fontSize: 12 });
        currentY += 20;
      }
      
      // Signature line
      currentY = this.drawSignatureLine(x, currentY, layout.columnWidth);
      
      // Name line
      if (party.name) {
        this.generator.moveTo({ x, y: currentY });
        this.generator.writeText(`Name: ${party.name}`, { fontSize: 10 });
        currentY += 15;
      }
      
      // Title line
      if (party.title) {
        this.generator.moveTo({ x, y: currentY });
        this.generator.writeText(`Title: ${party.title}`, { fontSize: 10 });
        currentY += 15;
      }
      
      // Add spacing between parties
      currentY += 20;
    }
    
    return currentY;
  }

  /**
   * Render side-by-side signatures
   * @param blockData - Signature block data
   * @param x - X position
   * @param y - Y position
   * @param layout - Layout information
   * @returns Y position after rendering
   */
  private renderSideBySideSignatures(
    blockData: SignatureBlockData,
    x: number,
    y: number,
    layout: ReturnType<SignatureBlockParser['analyzeLayout']>
  ): number {
    let currentY = y;
    const leftX = x;
    const rightX = x + layout.columnWidth + layout.spacing;
    
    // Ensure we have at least two parties for side-by-side
    if (blockData.parties.length < 2) {
      this.logger.warn('Side-by-side layout requested but fewer than 2 parties', {
        partyCount: blockData.parties.length
      });
      return this.renderSingleSignature(blockData, x, y, layout);
    }
    
    const leftParty = blockData.parties[0];
    const rightParty = blockData.parties[1];
    
    // Render role headers
    if (leftParty?.role || rightParty?.role) {
      currentY = this.renderSideBySideContent(
        leftParty?.role ? `${leftParty.role}:` : '',
        rightParty?.role ? `${rightParty.role}:` : '',
        currentY,
        layout.columnWidth,
        layout.spacing
      );
      currentY += 5; // Extra spacing after role
    }
    
    // Signature lines
    this.drawSignatureLine(leftX, currentY, layout.columnWidth);
    this.drawSignatureLine(rightX, currentY, layout.columnWidth);
    currentY += 20;
    
    // Name lines if either party has a name
    if (leftParty?.name || rightParty?.name) {
      this.generator.moveTo({ x: leftX, y: currentY });
      if (leftParty?.name) {
        this.generator.writeText(`Name: ${leftParty.name}`, { fontSize: 10 });
      }
      
      this.generator.moveTo({ x: rightX, y: currentY });
      if (rightParty?.name) {
        this.generator.writeText(`Name: ${rightParty.name}`, { fontSize: 10 });
      }
      currentY += 15;
    }
    
    // Title lines if either party has a title
    if (leftParty?.title || rightParty?.title) {
      this.generator.moveTo({ x: leftX, y: currentY });
      if (leftParty?.title) {
        this.generator.writeText(`Title: ${leftParty.title}`, { fontSize: 10 });
      }
      
      this.generator.moveTo({ x: rightX, y: currentY });
      if (rightParty?.title) {
        this.generator.writeText(`Title: ${rightParty.title}`, { fontSize: 10 });
      }
      currentY += 15;
    }
    
    // Add bottom spacing
    currentY += 20;
    
    // Handle additional parties if more than 2
    if (blockData.parties.length > 2) {
      this.logger.info('More than 2 parties in side-by-side layout', {
        totalParties: blockData.parties.length
      });
      
      // Render additional parties in single column format
      for (let i = 2; i < blockData.parties.length; i++) {
        const party = blockData.parties[i];
        if (party.role) {
          this.generator.moveTo({ x, y: currentY });
          this.generator.writeText(`${party.role}:`, { fontSize: 12 });
          currentY += 20;
        }
        
        currentY = this.drawSignatureLine(x, currentY, layout.columnWidth * 2 + layout.spacing);
        
        if (party.name) {
          this.generator.moveTo({ x, y: currentY });
          this.generator.writeText(`Name: ${party.name}`, { fontSize: 10 });
          currentY += 15;
        }
        
        if (party.title) {
          this.generator.moveTo({ x, y: currentY });
          this.generator.writeText(`Title: ${party.title}`, { fontSize: 10 });
          currentY += 15;
        }
        
        currentY += 20;
      }
    }
    
    return currentY;
  }

  /**
   * Draw a signature line
   * @param x - X position
   * @param y - Y position  
   * @param width - Line width
   * @returns Y position after line
   */
  private drawSignatureLine(x: number, y: number, width: number): number {
    const doc = this.generator.getDocument();
    
    doc.moveTo(x, y)
       .lineTo(x + width, y)
       .stroke();
    
    return y + 20;
  }

  /**
   * Render notary section
   * @param startY - Y position to start
   * @returns Y position after rendering
   */
  private renderNotarySection(startY: number): number {
    let currentY = startY + 20;
    
    this.generator.writeText('STATE OF _____________', { fontSize: 10 });
    currentY += 15;
    
    this.generator.writeText('COUNTY OF ___________', { fontSize: 10 });
    currentY += 20;
    
    this.generator.writeText('Subscribed and sworn to before me this ____ day of _________, 20__', { fontSize: 10 });
    currentY += 20;
    
    currentY = this.drawSignatureLine(
      this.generator.getCurrentX(), 
      currentY, 
      200
    );
    
    this.generator.writeText('Notary Public', { fontSize: 10 });
    currentY += 15;
    
    this.generator.writeText('My Commission Expires: __________', { fontSize: 10 });
    currentY += 20;
    
    return currentY;
  }

  /**
   * Prepare side-by-side layout blocks
   * @param leftContent - Content for left column
   * @param rightContent - Content for right column
   * @param blockType - Type of blocks to create
   * @returns Array of layout blocks
   */
  public prepareSideBySideLayout(
    leftContent: string[],
    rightContent: string[],
    blockType: LayoutBlock['type'] = 'text'
  ): LayoutBlock[] {
    const blocks: LayoutBlock[] = [];
    const lineHeight = 15;
    const maxLines = Math.max(leftContent.length, rightContent.length);
    
    for (let i = 0; i < maxLines; i++) {
      const left = leftContent[i] || '';
      const right = rightContent[i] || '';
      
      blocks.push({
        type: blockType,
        content: `${left}\t${right}`, // Tab-separated for rendering
        height: lineHeight,
        breakable: true,
        keepWithNext: i < maxLines - 1
      });
    }
    
    return blocks;
  }

  /**
   * Render side-by-side content
   * @param leftContent - Left column text
   * @param rightContent - Right column text
   * @param y - Y position
   * @param columnWidth - Width of each column
   * @param spacing - Space between columns
   * @returns Y position after rendering
   */
  public renderSideBySideContent(
    leftContent: string,
    rightContent: string,
    y: number,
    columnWidth: number,
    spacing: number
  ): number {
    const leftX = this.generator.getCurrentX();
    const rightX = leftX + columnWidth + spacing;
    
    // Render left content
    if (leftContent) {
      this.generator.moveTo({ x: leftX, y });
      this.generator.writeText(leftContent, { 
        fontSize: 12,
        align: 'left'
      });
    }
    
    // Render right content
    if (rightContent) {
      this.generator.moveTo({ x: rightX, y });
      this.generator.writeText(rightContent, {
        fontSize: 12,
        align: 'left'
      });
    }
    
    return y + 15;
  }

  /**
   * Calculate side-by-side block height
   * @param leftContent - Left column content
   * @param rightContent - Right column content
   * @param lineHeight - Height per line
   * @returns Total height needed
   */
  public calculateSideBySideHeight(
    leftContent: string[],
    rightContent: string[],
    lineHeight: number = 15
  ): number {
    const maxLines = Math.max(leftContent.length, rightContent.length);
    return maxLines * lineHeight;
  }

  /**
   * Create layout blocks for side-by-side signature
   * @param signatureData - Signature block data
   * @returns Array of layout blocks
   */
  public createSideBySideSignatureBlocks(
    signatureData: SignatureBlockData
  ): LayoutBlock[] {
    const blocks: LayoutBlock[] = [];
    const layout = this.parser.analyzeLayout(signatureData);
    
    if (layout.columns !== 2 || signatureData.parties.length < 2) {
      // Fall back to single column if not suitable for side-by-side
      return this.createSingleColumnSignatureBlocks(signatureData);
    }
    
    const leftParty = signatureData.parties[0];
    const rightParty = signatureData.parties[1];
    
    // Create a single block for the entire side-by-side signature
    const height = this.calculateSideBySideSignatureHeight(leftParty, rightParty);
    
    blocks.push({
      type: 'signature',
      content: signatureData,
      height,
      breakable: false,
      keepWithNext: signatureData.notaryRequired
    });
    
    // Add notary block if required
    if (signatureData.notaryRequired) {
      blocks.push({
        type: 'signature',
        content: { ...signatureData, isNotarySection: true } as any,
        height: 120, // Standard notary section height
        breakable: false
      });
    }
    
    return blocks;
  }

  /**
   * Create layout blocks for single column signature
   * @param signatureData - Signature block data
   * @returns Array of layout blocks
   */
  private createSingleColumnSignatureBlocks(
    signatureData: SignatureBlockData
  ): LayoutBlock[] {
    const blocks: LayoutBlock[] = [];
    
    // Calculate height based on parties and fields
    let totalHeight = 0;
    for (const party of signatureData.parties) {
      totalHeight += 20; // Role line
      totalHeight += 20; // Signature line
      if (party.name) totalHeight += 15; // Name line
      if (party.title) totalHeight += 15; // Title line
      totalHeight += 20; // Spacing between parties
    }
    
    blocks.push({
      type: 'signature',
      content: signatureData,
      height: totalHeight,
      breakable: false,
      keepWithNext: signatureData.notaryRequired
    });
    
    // Add notary block if required
    if (signatureData.notaryRequired) {
      blocks.push({
        type: 'signature',
        content: { ...signatureData, isNotarySection: true } as any,
        height: 120, // Standard notary section height
        breakable: false
      });
    }
    
    return blocks;
  }

  /**
   * Calculate height for side-by-side signature
   * @param leftParty - Left party info
   * @param rightParty - Right party info
   * @returns Total height needed
   */
  private calculateSideBySideSignatureHeight(
    leftParty: SignatureParty,
    rightParty: SignatureParty
  ): number {
    let height = 20; // Role line
    height += 20; // Signature line
    
    // Check if either party has name
    if (leftParty.name || rightParty.name) {
      height += 15; // Name line
    }
    
    // Check if either party has title
    if (leftParty.title || rightParty.title) {
      height += 15; // Title line
    }
    
    height += 20; // Bottom spacing
    
    return height;
  }

  /**
   * Split content into columns for side-by-side rendering
   * @param content - Content to split
   * @returns Split content for left and right columns
   */
  public splitContentForColumns(
    content: string[]
  ): { left: string[]; right: string[] } {
    const midPoint = Math.ceil(content.length / 2);
    
    return {
      left: content.slice(0, midPoint),
      right: content.slice(midPoint)
    };
  }

  /**
   * Check for orphan/widow violations
   * @param blocks - All blocks
   * @param pageBreakIndex - Index where page break would occur
   * @param constraints - Layout constraints
   * @returns Object indicating orphan/widow violations
   */
  private checkOrphanWidow(
    blocks: LayoutBlock[],
    pageBreakIndex: number,
    constraints: LayoutConstraints
  ): { hasOrphan: boolean; hasWidow: boolean } {
    let hasOrphan = false;
    let hasWidow = false;
    
    // Count consecutive text blocks before the break (for orphan check)
    let textBlocksBefore = 0;
    for (let i = pageBreakIndex - 1; i >= 0 && blocks[i]?.type === 'text'; i--) {
      textBlocksBefore++;
    }
    
    // Count consecutive text blocks after the break (for widow check)
    let textBlocksAfter = 0;
    for (let i = pageBreakIndex; i < blocks.length && blocks[i]?.type === 'text'; i++) {
      textBlocksAfter++;
    }
    
    // Orphan: too few text lines at end of page
    if (textBlocksBefore > 0 && textBlocksBefore < constraints.minOrphanLines) {
      hasOrphan = true;
    }
    
    // Widow: too few text lines at start of page
    if (textBlocksAfter > 0 && textBlocksAfter < constraints.minWidowLines) {
      // Special case: if the small text group is immediately followed by a non-text element
      // (like a heading), it's not considered a widow - it's just a short text section
      const lastTextIndex = pageBreakIndex + textBlocksAfter - 1;
      const isFollowedByNonText = lastTextIndex < blocks.length - 1 && 
                                   blocks[lastTextIndex + 1]?.type !== 'text';
      
      if (!isFollowedByNonText) {
        hasWidow = true;
      }
    }
    
    return { hasOrphan, hasWidow };
  }



  /**
   * Adjust page break to avoid orphans/widows
   * @param blocks - All blocks
   * @param proposedBreak - Proposed break index
   * @param constraints - Layout constraints
   * @returns Adjusted break index
   * @internal Used by tests only
   */
  // @ts-ignore - Used by tests
  private adjustBreakForOrphanWidow(
    blocks: LayoutBlock[],
    proposedBreak: number,
    constraints: LayoutConstraints
  ): number {
    const check = this.checkOrphanWidow(blocks, proposedBreak, constraints);
    
    if (check.hasOrphan) {
      // Move break earlier to include orphaned lines
      return Math.max(0, proposedBreak - constraints.minOrphanLines);
    }
    
    if (check.hasWidow) {
      // Move break later to avoid widows
      return Math.min(blocks.length, proposedBreak + constraints.minWidowLines);
    }
    
    return proposedBreak;
  }

  /**
   * Apply smart paragraph breaking
   * @param text - Text to break
   * @param maxHeight - Maximum height available
   * @param lineHeight - Height per line
   * @returns First and second parts of text
   */
  private smartParagraphBreak(
    text: string,
    maxHeight: number,
    lineHeight: number
  ): { firstPart: string; secondPart: string } {
    const words = text.split(' ');
    const maxLines = Math.floor(maxHeight / lineHeight);
    
    // If we can't fit at least 2 lines, don't split
    if (maxLines < 2 || words.length < 10) {
      return { firstPart: '', secondPart: text };
    }
    
    // Calculate approximate words per line (assuming ~10-12 words per line)
    const wordsPerLine = 10;
    const targetWords = maxLines * wordsPerLine;
    
    // Find a good break point
    let breakIndex = Math.min(targetWords, words.length - 5); // Leave at least 5 words
    
    // Look for sentence boundaries near the break point
    let bestBreak = breakIndex;
    for (let i = breakIndex - 5; i <= breakIndex + 5 && i < words.length; i++) {
      if (i > 0 && words[i - 1].match(/[.!?]$/)) {
        bestBreak = i;
        break;
      }
    }
    
    // Ensure we don't create tiny fragments
    if (bestBreak < 5 || words.length - bestBreak < 5) {
      return { firstPart: '', secondPart: text };
    }
    
    return {
      firstPart: words.slice(0, bestBreak).join(' '),
      secondPart: words.slice(bestBreak).join(' ')
    };
  }

  /**
   * Final layout optimization pass
   * @param pages - Array of pages to optimize
   * @returns Optimized pages
   */
  public optimizeLayout(pages: LayoutPage[]): LayoutPage[] {
    // Clone pages to avoid mutation
    const optimizedPages = pages.map(page => ({
      ...page,
      blocks: [...page.blocks]
    }));
    
    // Look for opportunities to balance pages
    for (let i = 0; i < optimizedPages.length - 1; i++) {
      const currentPage = optimizedPages[i];
      const nextPage = optimizedPages[i + 1];
      
      // Don't optimize if it would leave a page empty
      if (currentPage.blocks.length <= 1) {
        continue;
      }
      
      // If current page is very full and next is very empty
      if (currentPage.remainingHeight < 50 && nextPage.blocks.length < 5) {
        // Try to move last block from current to next
        const lastBlock = currentPage.blocks[currentPage.blocks.length - 1];
        
        if (lastBlock && lastBlock.breakable && !this.shouldKeepTogether(lastBlock)) {
          currentPage.blocks.pop();
          nextPage.blocks.unshift(lastBlock);
          
          // Recalculate heights
          currentPage.remainingHeight += lastBlock.height;
          nextPage.remainingHeight -= lastBlock.height;
        }
      }
    }
    
    return optimizedPages;
  }

  /**
   * Check if text block could be split
   * @param block - Block to check
   * @returns Whether block can be split
   */
  private canSplitTextBlock(block: LayoutBlock): boolean {
    return block.type === 'text' && 
           block.breakable !== false && // Default to breakable if not specified
           typeof block.content === 'string' &&
           block.content.split(' ').length > 10; // At least 10 words
  }

  /**
   * Split a text block at appropriate point
   * @param block - Block to split
   * @param availableHeight - Height available on current page
   * @returns Array of split blocks
   */
  private splitTextBlock(
    block: LayoutBlock,
    availableHeight: number
  ): LayoutBlock[] {
    if (!this.canSplitTextBlock(block) || typeof block.content !== 'string') {
      return [block];
    }
    
    const lineHeight = 15; // Standard line height
    const { firstPart, secondPart } = this.smartParagraphBreak(
      block.content,
      availableHeight,
      lineHeight
    );
    
    if (!firstPart || !secondPart) {
      return [block]; // Can't split effectively
    }
    
    // Calculate height based on word count (assuming ~10 words per line)
    const wordsPerLine = 10;
    const firstWords = firstPart.split(' ').length;
    const secondWords = secondPart.split(' ').length;
    const firstLines = Math.ceil(firstWords / wordsPerLine);
    const secondLines = Math.ceil(secondWords / wordsPerLine);
    
    return [
      {
        ...block,
        content: firstPart,
        height: firstLines * lineHeight
      },
      {
        ...block,
        content: secondPart,
        height: secondLines * lineHeight
      }
    ];
  }
} 