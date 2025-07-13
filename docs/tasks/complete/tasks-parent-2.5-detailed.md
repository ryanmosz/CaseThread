# Task 2.5 Detailed: Implement PDF Layout Engine

**Part of Parent Task 2.0: Create Core PDF Generation Service with Legal Formatting**

## Overview

This subtask implements the `PDFLayoutEngine` class that handles advanced layout functionality including signature block positioning, page break prevention, side-by-side layouts, and orphan control. This engine ensures professional document layout that meets legal standards.

## Sub-tasks

### 2.5.1 Create PDFLayoutEngine class

**Description**: Set up the base class structure for managing PDF layout operations.

**Implementation Steps**:

1. Add layout types to `src/types/pdf.ts`:
```typescript
export interface LayoutBlock {
  type: 'text' | 'signature' | 'heading' | 'list' | 'table';
  content: string | SignatureBlockData;
  height: number;
  breakable: boolean;
  keepWithNext?: boolean;
}

export interface LayoutConstraints {
  maxHeight: number;
  minOrphanLines: number;
  minWidowLines: number;
  preferredBreakPoints: number[];
}

export interface LayoutResult {
  pages: LayoutPage[];
  totalPages: number;
  hasOverflow: boolean;
}

export interface LayoutPage {
  blocks: LayoutBlock[];
  remainingHeight: number;
  pageNumber: number;
}
```

2. Create `src/services/pdf/PDFLayoutEngine.ts`:
```typescript
import { 
  LayoutBlock, 
  LayoutConstraints, 
  LayoutResult,
  LayoutPage,
  SignatureBlockData,
  DocumentType
} from '../../types/pdf';
import { LegalPDFGenerator } from './LegalPDFGenerator';
import { DocumentFormatter } from './DocumentFormatter';
import { SignatureBlockParser } from './SignatureBlockParser';
import { Logger } from '../../utils/logger';

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
    this.logger = new Logger('PDFLayoutEngine');
    this.generator = generator;
    this.formatter = formatter;
    this.parser = parser;
  }

  /**
   * Layout document content with proper page breaks
   */
  public layoutDocument(
    blocks: LayoutBlock[],
    documentType: DocumentType
  ): LayoutResult {
    const constraints = this.getLayoutConstraints(documentType);
    const pages: LayoutPage[] = [];
    let currentPage = this.createNewPage(1, documentType);
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      
      // Check if block fits on current page
      if (!this.blockFitsOnPage(block, currentPage, constraints)) {
        // Try to find a good break point
        const breakPoint = this.findBreakPoint(blocks, i, currentPage, constraints);
        
        if (breakPoint < i) {
          // Move some blocks to next page
          const movedBlocks = currentPage.blocks.splice(breakPoint);
          pages.push(currentPage);
          currentPage = this.createNewPage(pages.length + 1, documentType);
          currentPage.blocks = movedBlocks;
        } else {
          // Just move to next page
          pages.push(currentPage);
          currentPage = this.createNewPage(pages.length + 1, documentType);
        }
      }
      
      // Add block to current page
      this.addBlockToPage(block, currentPage);
    }
    
    // Add final page
    if (currentPage.blocks.length > 0) {
      pages.push(currentPage);
    }
    
    return {
      pages,
      totalPages: pages.length,
      hasOverflow: false
    };
  }

  /**
   * Create a new page with proper dimensions
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
   */
  private getLayoutConstraints(documentType: DocumentType): LayoutConstraints {
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
   */
  private blockFitsOnPage(
    block: LayoutBlock,
    page: LayoutPage,
    constraints: LayoutConstraints
  ): boolean {
    return block.height <= page.remainingHeight;
  }

  /**
   * Find optimal break point
   */
  private findBreakPoint(
    blocks: LayoutBlock[],
    currentIndex: number,
    page: LayoutPage,
    constraints: LayoutConstraints
  ): number {
    // Placeholder - will be implemented next
    return currentIndex;
  }

  /**
   * Add block to page and update remaining height
   */
  private addBlockToPage(block: LayoutBlock, page: LayoutPage): void {
    page.blocks.push(block);
    page.remainingHeight -= block.height;
  }
}
```

**Testing**: Verify class instantiation and basic page creation.

**Definition of Done**: Layout engine class created with basic structure.

### 2.5.2 Implement signature block positioning

**Description**: Add logic to position signature blocks correctly on pages.

**Implementation Steps**:

1. Add signature block rendering methods:
```typescript
  /**
   * Render signature block to PDF
   */
  public renderSignatureBlock(
    blockData: SignatureBlockData,
    startY: number
  ): number {
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
    
    return currentY;
  }

  /**
   * Render single column signature
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
```

**Testing**: Verify signature blocks render correctly.

**Definition of Done**: Signature blocks positioned accurately on pages.

### 2.5.3 Add page break prevention logic

**Description**: Implement logic to prevent signature blocks from splitting across pages.

**Implementation Steps**:

1. Add break prevention methods:
```typescript
  /**
   * Check if signature block should stay together
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
      if (!block.keepWithNext) {
        break;
      }
      
      currentIndex++;
    }
    
    return totalHeight;
  }

  /**
   * Find optimal page break point
   */
  private findBreakPoint(
    blocks: LayoutBlock[],
    currentIndex: number,
    page: LayoutPage,
    constraints: LayoutConstraints
  ): number {
    // Start from current position and work backwards
    for (let i = currentIndex; i >= 0; i--) {
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
   * Check if position is a good break point
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
    
    // Prefer breaking after paragraphs
    if (blocks[index].type === 'text') {
      return true;
    }
    
    return true;
  }

  /**
   * Handle page overflow for unbreakable content
   */
  private handleOverflow(
    block: LayoutBlock,
    page: LayoutPage
  ): LayoutPage {
    // If block is too tall for any page, we have a problem
    const maxPageHeight = this.getMaxPageHeight();
    
    if (block.height > maxPageHeight) {
      this.logger.warn('Block too tall for single page', {
        blockType: block.type,
        blockHeight: block.height,
        maxHeight: maxPageHeight
      });
      
      // Force break the block if possible
      if (block.breakable) {
        // Split the block (implementation depends on block type)
        return this.splitBlock(block, page);
      }
    }
    
    // Otherwise, just move to next page
    return this.createNewPage(page.pageNumber + 1, 'provisional-patent-application');
  }

  private getMaxPageHeight(): number {
    // Letter size minus minimum margins
    return 792 - 144; // 11" - 2" margins
  }

  private splitBlock(block: LayoutBlock, page: LayoutPage): LayoutPage {
    // Implementation would depend on block type
    // For now, just log warning
    this.logger.warn('Block splitting not implemented', { blockType: block.type });
    return page;
  }
```

**Testing**: Verify blocks don't split inappropriately across pages.

**Definition of Done**: Page break prevention working correctly.

### 2.5.4 Handle side-by-side layouts

**Description**: Implement proper handling of side-by-side signature layouts.

**Implementation Steps**:

1. Add side-by-side layout helpers:
```typescript
  /**
   * Prepare side-by-side layout blocks
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
        align: 'left',
        width: columnWidth
      });
    }
    
    // Render right content
    if (rightContent) {
      this.generator.moveTo({ x: rightX, y });
      this.generator.writeText(rightContent, {
        fontSize: 12,
        align: 'left',
        width: columnWidth
      });
    }
    
    return y + 15;
  }

  /**
   * Calculate side-by-side block height
   */
  public calculateSideBySideHeight(
    leftContent: string[],
    rightContent: string[],
    lineHeight: number = 15
  ): number {
    const maxLines = Math.max(leftContent.length, rightContent.length);
    return maxLines * lineHeight;
  }
```

**Testing**: Verify side-by-side content renders correctly.

**Definition of Done**: Side-by-side layouts working properly.

### 2.5.5 Implement orphan control

**Description**: Add logic to prevent orphaned lines and maintain professional layout.

**Implementation Steps**:

1. Add orphan and widow control:
```typescript
  /**
   * Check for orphan/widow violations
   */
  private checkOrphanWidow(
    blocks: LayoutBlock[],
    pageBreakIndex: number,
    constraints: LayoutConstraints
  ): { hasOrphan: boolean; hasWidow: boolean } {
    let hasOrphan = false;
    let hasWidow = false;
    
    // Count text lines before break (potential orphans)
    let linesBefore = 0;
    for (let i = pageBreakIndex - 1; i >= 0; i--) {
      if (blocks[i].type !== 'text') break;
      linesBefore++;
    }
    
    // Count text lines after break (potential widows)
    let linesAfter = 0;
    for (let i = pageBreakIndex; i < blocks.length; i++) {
      if (blocks[i].type !== 'text') break;
      linesAfter++;
    }
    
    hasOrphan = linesBefore > 0 && linesBefore < constraints.minOrphanLines;
    hasWidow = linesAfter > 0 && linesAfter < constraints.minWidowLines;
    
    return { hasOrphan, hasWidow };
  }

  /**
   * Adjust page break to avoid orphans/widows
   */
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
   */
  private smartParagraphBreak(
    text: string,
    maxHeight: number,
    lineHeight: number
  ): { firstPart: string; secondPart: string } {
    const words = text.split(' ');
    const maxLines = Math.floor(maxHeight / lineHeight);
    let currentLine = '';
    let lines: string[] = [];
    
    // Build lines word by word
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      // Approximate line width (assuming ~80 chars per line)
      if (testLine.length > 80) {
        lines.push(currentLine);
        currentLine = word;
        
        if (lines.length >= maxLines - 1) {
          break;
        }
      } else {
        currentLine = testLine;
      }
    }
    
    // Don't break if it would create a widow
    if (lines.length < 2) {
      return { firstPart: '', secondPart: text };
    }
    
    const breakIndex = words.indexOf(currentLine.split(' ')[0]);
    return {
      firstPart: words.slice(0, breakIndex).join(' '),
      secondPart: words.slice(breakIndex).join(' ')
    };
  }

  /**
   * Final layout optimization pass
   */
  public optimizeLayout(pages: LayoutPage[]): LayoutPage[] {
    // Look for opportunities to balance pages
    for (let i = 0; i < pages.length - 1; i++) {
      const currentPage = pages[i];
      const nextPage = pages[i + 1];
      
      // If current page is very full and next is very empty
      if (currentPage.remainingHeight < 50 && nextPage.blocks.length < 5) {
        // Try to move last block from current to next
        const lastBlock = currentPage.blocks[currentPage.blocks.length - 1];
        
        if (lastBlock.breakable && !this.shouldKeepTogether(lastBlock)) {
          currentPage.blocks.pop();
          nextPage.blocks.unshift(lastBlock);
          
          // Recalculate heights
          currentPage.remainingHeight += lastBlock.height;
          nextPage.remainingHeight -= lastBlock.height;
        }
      }
    }
    
    return pages;
  }
```

**Testing**: Verify orphan and widow control works correctly.

**Definition of Done**: Professional layout with no orphans or widows.

## Test Implementation

Create `__tests__/services/pdf/PDFLayoutEngine.test.ts`:
```typescript
import { PDFLayoutEngine } from '../../../src/services/pdf/PDFLayoutEngine';
import { LegalPDFGenerator } from '../../../src/services/pdf/LegalPDFGenerator';
import { DocumentFormatter } from '../../../src/services/pdf/DocumentFormatter';
import { SignatureBlockParser } from '../../../src/services/pdf/SignatureBlockParser';

describe('PDFLayoutEngine', () => {
  let engine: PDFLayoutEngine;
  let generator: LegalPDFGenerator;
  let formatter: DocumentFormatter;
  let parser: SignatureBlockParser;

  beforeEach(() => {
    generator = new LegalPDFGenerator('test.pdf', { documentType: 'test' });
    formatter = new DocumentFormatter();
    parser = new SignatureBlockParser();
    engine = new PDFLayoutEngine(generator, formatter, parser);
  });

  it('should layout simple document', () => {
    const blocks = [
      { type: 'heading' as const, content: 'Title', height: 20, breakable: false },
      { type: 'text' as const, content: 'Paragraph 1', height: 60, breakable: true },
      { type: 'text' as const, content: 'Paragraph 2', height: 60, breakable: true }
    ];

    const result = engine.layoutDocument(blocks, 'nda-ip-specific');
    expect(result.totalPages).toBeGreaterThanOrEqual(1);
    expect(result.pages[0].blocks).toHaveLength(3);
  });

  it('should prevent signature block from splitting', () => {
    const blocks = [
      { type: 'text' as const, content: 'Content', height: 600, breakable: true },
      { 
        type: 'signature' as const, 
        content: {} as any, 
        height: 200, 
        breakable: false 
      }
    ];

    const result = engine.layoutDocument(blocks, 'nda-ip-specific');
    expect(result.totalPages).toBe(2);
    expect(result.pages[1].blocks[0].type).toBe('signature');
  });

  it('should handle side-by-side layout', () => {
    const leftContent = ['Left 1', 'Left 2'];
    const rightContent = ['Right 1', 'Right 2'];
    
    const blocks = engine.prepareSideBySideLayout(leftContent, rightContent);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].content).toContain('Left 1\tRight 1');
  });
});
```

## Common Pitfalls

1. **Height Calculations**: Always account for line spacing and margins
2. **Block Dependencies**: Consider keepWithNext relationships
3. **Signature Positioning**: Ensure adequate space for all elements
4. **Side-by-Side Alignment**: Handle uneven content gracefully
5. **Page Number Updates**: Recalculate after any layout changes

## File Changes

- **Created**:
  - `src/services/pdf/PDFLayoutEngine.ts` - Layout engine implementation
  - `__tests__/services/pdf/PDFLayoutEngine.test.ts` - Unit tests
  
- **Modified**:
  - `src/types/pdf.ts` - Added layout types

## Next Steps

1. Continue to Task 2.6: Create CLI Export Command
2. Test with real document examples to refine layout rules
3. Consider adding layout templates for common document structures

## Success Criteria

- [ ] Layout engine class created and functional
- [ ] Signature blocks positioned correctly
- [ ] Page breaks handled intelligently
- [ ] Side-by-side layouts working
- [ ] Orphan/widow control implemented
- [ ] All tests pass 