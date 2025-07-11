import { 
  LayoutBlock, 
  LayoutConstraints, 
  LayoutResult,
  LayoutPage,
  DocumentType,
  SignatureBlockData
} from '../../types/pdf';
import { LegalPDFGenerator } from './LegalPDFGenerator';
import { DocumentFormatter } from './DocumentFormatter';
import { SignatureBlockParser } from './SignatureBlockParser';
import { createChildLogger, Logger } from '../../utils/logger';

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
      const maxPageHeight = this.getMaxPageHeight(documentType);
      
      // Check if this block should stay together with others
      if (this.shouldKeepTogether(block)) {
        const groupHeight = this.calculateGroupHeight(blocks, i);
        
        // If group doesn't fit on current page
        if (groupHeight > currentPage.remainingHeight) {
          // Start new page if current page has content
          if (currentPage.blocks.length > 0) {
            pages.push(currentPage);
            currentPage = this.createNewPage(pages.length + 1, documentType);
          }
        }
      }
      
      // Check if block fits on current page
      if (this.blockFitsOnPage(block, currentPage, constraints)) {
        // Block fits, add it
        this.addBlockToPage(block, currentPage);
        i++;
      } else {
        // Block doesn't fit
        
        // First check if block is too large for any page
        if (block.height > maxPageHeight) {
          this.logger.warn('Block exceeds maximum page height', {
            blockType: block.type,
            blockHeight: block.height,
            maxHeight: maxPageHeight
          });
          
          // If current page is empty, add the oversized block anyway
          if (currentPage.blocks.length === 0) {
            this.addBlockToPage(block, currentPage);
            i++;
            continue;
          }
          
          // Otherwise move to new page and add it there
          pages.push(currentPage);
          currentPage = this.createNewPage(pages.length + 1, documentType);
          this.addBlockToPage(block, currentPage);
          i++;
          continue;
        }
        
        // Block fits on a page but not the current one
        // Try to find a good break point
        const breakPoint = this.findBreakPoint(blocks, i, currentPage, constraints);
        
        if (breakPoint < i && breakPoint > 0 && currentPage.blocks.length > breakPoint) {
          // We can move some blocks to the next page
          const blocksToMove = currentPage.blocks.splice(breakPoint);
          
          // Recalculate remaining height
          let movedHeight = 0;
          for (const movedBlock of blocksToMove) {
            movedHeight += movedBlock.height;
          }
          currentPage.remainingHeight += movedHeight;
          
          // Push current page and create new one
          pages.push(currentPage);
          currentPage = this.createNewPage(pages.length + 1, documentType);
          
          // Add moved blocks to new page
          for (const movedBlock of blocksToMove) {
            this.addBlockToPage(movedBlock, currentPage);
          }
          
          // Continue to process the current block again
          continue;
        }
        
        // No good break point or current page is empty/small
        if (currentPage.blocks.length > 0) {
          // Move to next page
          pages.push(currentPage);
          currentPage = this.createNewPage(pages.length + 1, documentType);
        } else {
          // Current page is empty but block still doesn't fit
          // This should only happen if constraints are misconfigured
          this.logger.error('Empty page but block does not fit', {
            blockType: block.type,
            blockHeight: block.height,
            remainingHeight: currentPage.remainingHeight,
            maxHeight: maxPageHeight
          });
          // Force add it anyway to avoid infinite loop
          this.addBlockToPage(block, currentPage);
          i++;
        }
      }
    }
    
    // Add final page if it has content
    if (currentPage.blocks.length > 0) {
      pages.push(currentPage);
    }
    
    return {
      pages,
      totalPages: pages.length,
      hasOverflow: pages.some(p => p.remainingHeight < 0)
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
   * Find optimal break point
   * @param blocks - All blocks
   * @param currentIndex - Current block index
   * @param page - Current page
   * @param constraints - Layout constraints
   * @returns Index to break at
   */
  private findBreakPoint(
    blocks: LayoutBlock[],
    currentIndex: number,
    page: LayoutPage,
    constraints: LayoutConstraints
  ): number {
    // Check if current block should stay together
    if (this.shouldKeepTogether(blocks[currentIndex])) {
      // Check if the entire group fits
      const groupHeight = this.calculateGroupHeight(blocks, currentIndex);
      if (groupHeight <= page.remainingHeight) {
        // Group fits, break after it
        return currentIndex + 1;
      }
    }

    // Start from current position and work backwards
    for (let i = currentIndex - 1; i >= 0; i--) {
      const block = blocks[i];
      
      // Never break inside a signature block
      if (block.type === 'signature') {
        continue;
      }
      
      // Check if this is a good break point
      if (this.isGoodBreakPoint(blocks, i, constraints)) {
        return i;
      }
    }
    
    // If no good break point found, break at current position
    return currentIndex;
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
    
    while (currentIndex < blocks.length) {
      const block = blocks[currentIndex];
      totalHeight += block.height;
      
      // Check if next block must stay with this one
      if (!block.keepWithNext && currentIndex > startIndex) {
        break;
      }
      
      currentIndex++;
    }
    
    return totalHeight;
  }

  /**
   * Check if position is a good break point
   * @param blocks - All blocks
   * @param index - Index to check
   * @param constraints - Layout constraints
   * @returns True if this is a good place to break
   */
  private isGoodBreakPoint(
    blocks: LayoutBlock[],
    index: number,
    constraints: LayoutConstraints
  ): boolean {
    // Don't break if it would leave orphans
    if (index < constraints.minOrphanLines) {
      return false;
    }
    
    // Don't break if it would create widows
    const remainingBlocks = blocks.length - index;
    if (remainingBlocks < constraints.minWidowLines) {
      return false;
    }
    
    // Don't break between heading and content
    if (index > 0 && blocks[index - 1].type === 'heading') {
      return false;
    }

    // Don't break if previous block has keepWithNext
    if (index > 0 && blocks[index - 1].keepWithNext) {
      return false;
    }
    
    // Prefer breaking after paragraphs
    if (index > 0 && blocks[index - 1].type === 'text') {
      return true;
    }
    
    return true;
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
    
    // Assume two parties for side-by-side
    const leftParty = blockData.parties[0];
    const rightParty = blockData.parties[1];
    
    // Render headers
    if (leftParty?.role) {
      this.generator.moveTo({ x: leftX, y: currentY });
      this.generator.writeText(`${leftParty.role}:`, { fontSize: 12 });
    }
    
    if (rightParty?.role) {
      this.generator.moveTo({ x: rightX, y: currentY });
      this.generator.writeText(`${rightParty.role}:`, { fontSize: 12 });
    }
    
    currentY += 20;
    
    // Signature lines
    this.drawSignatureLine(leftX, currentY, layout.columnWidth);
    this.drawSignatureLine(rightX, currentY, layout.columnWidth);
    currentY += 20;
    
    // Name lines
    if (leftParty?.name) {
      this.generator.moveTo({ x: leftX, y: currentY });
      this.generator.writeText(`Name: ${leftParty.name}`, { fontSize: 10 });
    }
    
    if (rightParty?.name) {
      this.generator.moveTo({ x: rightX, y: currentY });
      this.generator.writeText(`Name: ${rightParty.name}`, { fontSize: 10 });
    }
    
    currentY += 15;
    
    // Title lines
    if (leftParty?.title) {
      this.generator.moveTo({ x: leftX, y: currentY });
      this.generator.writeText(`Title: ${leftParty.title}`, { fontSize: 10 });
    }
    
    if (rightParty?.title) {
      this.generator.moveTo({ x: rightX, y: currentY });
      this.generator.writeText(`Title: ${rightParty.title}`, { fontSize: 10 });
    }
    
    currentY += 35; // Extra spacing after signature block
    
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
} 