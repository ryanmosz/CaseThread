# Task 2.4 Detailed: Build Signature Block Parser

**Part of Parent Task 2.0: Create Core PDF Generation Service with Legal Formatting**

## Overview

This subtask implements the `SignatureBlockParser` class that identifies and extracts signature block markers from generated text documents. It parses markers like `[SIGNATURE_BLOCK:*]`, `[INITIALS_BLOCK:*]`, and `[NOTARY_BLOCK:*]` that were added in Task 6.0.

## Sub-tasks

### 2.4.1 Create SignatureBlockParser class

**Description**: Set up the base class structure for parsing signature markers.

**Implementation Steps**:

1. Add signature types to `src/types/pdf.ts`:
```typescript
export interface SignatureMarker {
  type: 'signature' | 'initial' | 'notary';
  id: string;
  fullMarker: string;
  startIndex: number;
  endIndex: number;
}

export interface SignatureBlockData {
  marker: SignatureMarker;
  layout: 'single' | 'side-by-side';
  parties: SignatureParty[];
  notaryRequired: boolean;
}

export interface SignatureParty {
  role: string;
  name?: string;
  title?: string;
  company?: string;
  lineType: 'signature' | 'initial';
}

export interface ParsedDocument {
  content: string[];
  signatureBlocks: SignatureBlockData[];
  hasSignatures: boolean;
}
```

2. Create `src/services/pdf/SignatureBlockParser.ts`:
```typescript
import { 
  SignatureMarker, 
  SignatureBlockData, 
  ParsedDocument,
  SignatureParty
} from '../../types/pdf';
import { Logger } from '../../utils/logger';

export class SignatureBlockParser {
  private logger: Logger;
  
  // Regex patterns for different marker types
  private readonly patterns = {
    signature: /\[SIGNATURE_BLOCK:([^\]]+)\]/g,
    initial: /\[INITIALS_BLOCK:([^\]]+)\]/g,
    notary: /\[NOTARY_BLOCK:([^\]]+)\]/g
  };

  constructor() {
    this.logger = new Logger('SignatureBlockParser');
  }

  /**
   * Parse document text and extract signature blocks
   */
  public parseDocument(text: string): ParsedDocument {
    const lines = text.split('\n');
    const signatureBlocks: SignatureBlockData[] = [];
    const cleanedLines: string[] = [];
    
    let currentBlockData: Partial<SignatureBlockData> | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const marker = this.findMarker(line);
      
      if (marker) {
        // Start collecting block data
        currentBlockData = {
          marker,
          parties: [],
          notaryRequired: marker.type === 'notary'
        };
        
        // Process following lines for block content
        const blockContent = this.extractBlockContent(lines, i);
        currentBlockData = {
          ...currentBlockData,
          ...blockContent
        };
        
        if (currentBlockData.marker) {
          signatureBlocks.push(currentBlockData as SignatureBlockData);
        }
        
        // Skip processed lines
        i += blockContent.linesConsumed || 0;
      } else {
        // Add non-marker lines to cleaned content
        cleanedLines.push(line);
      }
    }
    
    return {
      content: cleanedLines,
      signatureBlocks,
      hasSignatures: signatureBlocks.length > 0
    };
  }

  /**
   * Find signature marker in a line
   */
  private findMarker(line: string): SignatureMarker | null {
    // Check each pattern type
    for (const [type, pattern] of Object.entries(this.patterns)) {
      const regex = new RegExp(pattern);
      const match = regex.exec(line);
      
      if (match) {
        return {
          type: type as 'signature' | 'initial' | 'notary',
          id: match[1],
          fullMarker: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length
        };
      }
    }
    
    return null;
  }

  /**
   * Extract block content (placeholder - will be implemented next)
   */
  private extractBlockContent(
    lines: string[], 
    startIndex: number
  ): { layout?: 'single' | 'side-by-side'; linesConsumed: number } {
    // Placeholder implementation
    return { layout: 'single', linesConsumed: 0 };
  }
}
```

**Testing**: Verify class instantiation and basic marker detection.

**Definition of Done**: Parser class created with marker detection logic.

### 2.4.2 Implement marker detection regex

**Description**: Create robust regex patterns to identify all signature marker types.

**Implementation Steps**:

1. Enhance marker detection with more detailed parsing:
```typescript
  /**
   * Enhanced marker detection with validation
   */
  private findAllMarkers(text: string): SignatureMarker[] {
    const markers: SignatureMarker[] = [];
    
    // Combined pattern to find all marker types
    const combinedPattern = /\[(SIGNATURE_BLOCK|INITIALS_BLOCK|NOTARY_BLOCK):([^\]]+)\]/g;
    let match;
    
    while ((match = combinedPattern.exec(text)) !== null) {
      const markerType = match[1];
      const markerId = match[2];
      
      let type: 'signature' | 'initial' | 'notary';
      switch (markerType) {
        case 'SIGNATURE_BLOCK':
          type = 'signature';
          break;
        case 'INITIALS_BLOCK':
          type = 'initial';
          break;
        case 'NOTARY_BLOCK':
          type = 'notary';
          break;
        default:
          continue;
      }
      
      markers.push({
        type,
        id: markerId,
        fullMarker: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
    
    return markers;
  }

  /**
   * Validate marker ID format
   */
  private validateMarkerId(id: string): boolean {
    // IDs should be kebab-case identifiers
    const validIdPattern = /^[a-z]+(-[a-z]+)*$/;
    return validIdPattern.test(id);
  }

  /**
   * Get marker context information
   */
  private getMarkerContext(id: string): { 
    party?: string; 
    role?: string; 
    position?: number;
  } {
    // Parse ID to extract context
    // Examples: "assignor-signature", "licensee-initial", "assignor-notary"
    const parts = id.split('-');
    
    if (parts.length >= 2) {
      return {
        party: parts[0],
        role: parts.slice(0, -1).join('-'),
        position: this.getPositionFromId(id)
      };
    }
    
    return {};
  }

  private getPositionFromId(id: string): number {
    // Extract position for ordering multiple signatures
    const posMatch = id.match(/-(\d+)$/);
    return posMatch ? parseInt(posMatch[1], 10) : 0;
  }
```

**Testing**: Test regex patterns with various marker formats.

**Definition of Done**: All marker types detected accurately.

### 2.4.3 Parse signature block content

**Description**: Extract the actual signature block content following markers.

**Implementation Steps**:

1. Implement content extraction logic:
```typescript
  /**
   * Extract complete signature block content
   */
  private extractBlockContent(
    lines: string[], 
    startIndex: number
  ): {
    layout: 'single' | 'side-by-side';
    parties: SignatureParty[];
    linesConsumed: number;
  } {
    const blockLines: string[] = [];
    let currentIndex = startIndex + 1; // Skip marker line
    let layout: 'single' | 'side-by-side' = 'single';
    
    // Collect lines until we hit another marker or empty section
    while (currentIndex < lines.length) {
      const line = lines[currentIndex];
      
      // Stop at next marker or after significant empty space
      if (this.findMarker(line) || this.isEndOfBlock(blockLines, line)) {
        break;
      }
      
      blockLines.push(line);
      currentIndex++;
    }
    
    // Analyze block structure
    layout = this.detectLayout(blockLines);
    const parties = this.extractParties(blockLines, layout);
    
    return {
      layout,
      parties,
      linesConsumed: currentIndex - startIndex - 1
    };
  }

  /**
   * Detect if content is side-by-side layout
   */
  private detectLayout(lines: string[]): 'single' | 'side-by-side' {
    // Look for patterns indicating side-by-side layout
    for (const line of lines) {
      // Check for multiple underscores on same line (signature lines)
      const underscoreGroups = line.match(/_{3,}/g);
      if (underscoreGroups && underscoreGroups.length >= 2) {
        return 'side-by-side';
      }
      
      // Check for tab or significant spacing between content
      if (line.includes('\t') || /\s{10,}/.test(line)) {
        return 'side-by-side';
      }
    }
    
    return 'single';
  }

  /**
   * Check if we've reached end of signature block
   */
  private isEndOfBlock(collectedLines: string[], currentLine: string): boolean {
    // Empty line after content indicates end
    if (collectedLines.length > 0 && currentLine.trim() === '') {
      const lastNonEmpty = collectedLines.filter(l => l.trim()).pop();
      return lastNonEmpty !== undefined;
    }
    
    // Section headers indicate new content
    const sectionPattern = /^[A-Z][A-Z\s]+:?$/;
    return sectionPattern.test(currentLine.trim());
  }
```

**Testing**: Verify content extraction for different block formats.

**Definition of Done**: Block content extracted accurately.

### 2.4.4 Handle different block types

**Description**: Implement specific handling for signature, initial, and notary blocks.

**Implementation Steps**:

1. Add type-specific parsing:
```typescript
  /**
   * Extract party information from block content
   */
  private extractParties(
    lines: string[], 
    layout: 'single' | 'side-by-side'
  ): SignatureParty[] {
    if (layout === 'side-by-side') {
      return this.extractSideBySideParties(lines);
    } else {
      return this.extractSingleParties(lines);
    }
  }

  /**
   * Extract parties from single-column layout
   */
  private extractSingleParties(lines: string[]): SignatureParty[] {
    const parties: SignatureParty[] = [];
    let currentParty: Partial<SignatureParty> = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Signature line pattern
      if (/^_{10,}/.test(trimmed)) {
        currentParty.lineType = 'signature';
      }
      // Name pattern (follows signature line)
      else if (/^Name:\s*(.+)/.test(trimmed)) {
        const match = trimmed.match(/^Name:\s*(.+)/);
        if (match) currentParty.name = match[1];
      }
      // Title pattern
      else if (/^Title:\s*(.+)/.test(trimmed)) {
        const match = trimmed.match(/^Title:\s*(.+)/);
        if (match) currentParty.title = match[1];
      }
      // Role pattern (e.g., "ASSIGNOR:", "LICENSEE:")
      else if (/^[A-Z]+:?$/.test(trimmed)) {
        if (currentParty.role) {
          parties.push(currentParty as SignatureParty);
          currentParty = {};
        }
        currentParty.role = trimmed.replace(':', '');
      }
    }
    
    // Add last party
    if (currentParty.role) {
      parties.push(currentParty as SignatureParty);
    }
    
    return parties;
  }

  /**
   * Extract parties from side-by-side layout
   */
  private extractSideBySideParties(lines: string[]): SignatureParty[] {
    const leftParty: Partial<SignatureParty> = {};
    const rightParty: Partial<SignatureParty> = {};
    
    for (const line of lines) {
      // Split line at significant whitespace
      const parts = line.split(/\s{5,}|\t/);
      
      if (parts.length >= 2) {
        const left = parts[0].trim();
        const right = parts[1].trim();
        
        // Process left side
        this.parsePartyInfo(left, leftParty);
        
        // Process right side
        this.parsePartyInfo(right, rightParty);
      }
    }
    
    const parties: SignatureParty[] = [];
    if (leftParty.role) parties.push(leftParty as SignatureParty);
    if (rightParty.role) parties.push(rightParty as SignatureParty);
    
    return parties;
  }

  /**
   * Parse individual party information
   */
  private parsePartyInfo(text: string, party: Partial<SignatureParty>): void {
    if (/^[A-Z]+:?$/.test(text)) {
      party.role = text.replace(':', '');
    } else if (/^_{10,}/.test(text)) {
      party.lineType = 'signature';
    } else if (text.startsWith('Name:')) {
      party.name = text.replace('Name:', '').trim();
    } else if (text.startsWith('Title:')) {
      party.title = text.replace('Title:', '').trim();
    }
  }
```

**Testing**: Test parsing of different signature block formats.

**Definition of Done**: All block types parsed correctly.

### 2.4.5 Extract layout information

**Description**: Determine and store layout information for proper PDF rendering.

**Implementation Steps**:

1. Add layout analysis methods:
```typescript
  /**
   * Analyze and enhance layout information
   */
  public analyzeLayout(blockData: SignatureBlockData): {
    columns: number;
    columnWidth: number;
    spacing: number;
    alignment: 'left' | 'center' | 'right';
  } {
    const pageWidth = 612; // Letter size in points
    const margins = 72; // 1 inch margins
    const usableWidth = pageWidth - (margins * 2);
    
    if (blockData.layout === 'side-by-side') {
      return {
        columns: 2,
        columnWidth: (usableWidth - 50) / 2, // 50pt spacing between columns
        spacing: 50,
        alignment: 'left'
      };
    } else {
      return {
        columns: 1,
        columnWidth: usableWidth,
        spacing: 0,
        alignment: 'left'
      };
    }
  }

  /**
   * Calculate space requirements for signature block
   */
  public calculateBlockHeight(blockData: SignatureBlockData): number {
    const lineHeight = 20; // Approximate height per line
    const signatureLine = 30; // Space for signature line
    const padding = 10; // Padding between elements
    
    let height = 0;
    
    for (const party of blockData.parties) {
      height += signatureLine; // Signature line
      height += lineHeight; // Name line
      if (party.title) height += lineHeight; // Title line
      if (party.company) height += lineHeight; // Company line
      height += padding * 2; // Padding above and below
    }
    
    // Add extra space for notary blocks
    if (blockData.notaryRequired) {
      height += lineHeight * 4; // Notary acknowledgment text
      height += signatureLine; // Notary signature
      height += lineHeight * 2; // Commission info
    }
    
    return height;
  }

  /**
   * Group related signature blocks
   */
  public groupRelatedBlocks(blocks: SignatureBlockData[]): SignatureBlockData[][] {
    const groups: SignatureBlockData[][] = [];
    const processed = new Set<number>();
    
    blocks.forEach((block, index) => {
      if (processed.has(index)) return;
      
      const group = [block];
      processed.add(index);
      
      // Find related blocks (e.g., signature + notary)
      blocks.forEach((other, otherIndex) => {
        if (otherIndex !== index && !processed.has(otherIndex)) {
          if (this.areBlocksRelated(block, other)) {
            group.push(other);
            processed.add(otherIndex);
          }
        }
      });
      
      groups.push(group);
    });
    
    return groups;
  }

  private areBlocksRelated(block1: SignatureBlockData, block2: SignatureBlockData): boolean {
    // Blocks are related if they share the same party identifier
    const id1 = block1.marker.id.split('-')[0];
    const id2 = block2.marker.id.split('-')[0];
    return id1 === id2;
  }
```

**Testing**: Verify layout calculations for different scenarios.

**Definition of Done**: Layout information extracted and calculated correctly.

## Test Implementation

Create `__tests__/services/pdf/SignatureBlockParser.test.ts`:
```typescript
import { SignatureBlockParser } from '../../../src/services/pdf/SignatureBlockParser';

describe('SignatureBlockParser', () => {
  let parser: SignatureBlockParser;

  beforeEach(() => {
    parser = new SignatureBlockParser();
  });

  it('should detect signature markers', () => {
    const text = `
Some document content here.

[SIGNATURE_BLOCK:assignor-signature]
ASSIGNOR:
_______________________
Name: John Doe
Title: CEO
    `;

    const result = parser.parseDocument(text);
    expect(result.hasSignatures).toBe(true);
    expect(result.signatureBlocks).toHaveLength(1);
    expect(result.signatureBlocks[0].marker.type).toBe('signature');
    expect(result.signatureBlocks[0].marker.id).toBe('assignor-signature');
  });

  it('should detect side-by-side layout', () => {
    const text = `
[SIGNATURE_BLOCK:mutual-signature]
DISCLOSING PARTY:                    RECEIVING PARTY:

_______________________             _______________________
Name: Alice Smith                   Name: Bob Johnson
Title: VP                          Title: Director
    `;

    const result = parser.parseDocument(text);
    expect(result.signatureBlocks[0].layout).toBe('side-by-side');
    expect(result.signatureBlocks[0].parties).toHaveLength(2);
  });

  it('should handle notary blocks', () => {
    const text = `
[NOTARY_BLOCK:assignor-notary]
State of California
County of ____________

Notary Public Signature: _______________________
Commission Expires: _______________________
    `;

    const result = parser.parseDocument(text);
    expect(result.signatureBlocks[0].marker.type).toBe('notary');
    expect(result.signatureBlocks[0].notaryRequired).toBe(true);
  });

  it('should calculate block height', () => {
    const blockData = {
      marker: { type: 'signature' as const, id: 'test', fullMarker: '[SIGNATURE_BLOCK:test]', startIndex: 0, endIndex: 0 },
      layout: 'single' as const,
      parties: [
        { role: 'ASSIGNOR', name: 'John Doe', title: 'CEO', lineType: 'signature' as const }
      ],
      notaryRequired: false
    };

    const height = parser.calculateBlockHeight(blockData);
    expect(height).toBeGreaterThan(0);
  });
});
```

## Common Pitfalls

1. **Regex Greedy Matching**: Use non-greedy patterns for marker content
2. **Line Break Handling**: Handle both \n and \r\n line endings
3. **Whitespace Variations**: Account for tabs and multiple spaces
4. **Block Boundary Detection**: Don't assume fixed number of lines
5. **Layout Detection**: Side-by-side may use tabs or spaces

## File Changes

- **Created**:
  - `src/services/pdf/SignatureBlockParser.ts` - Parser implementation
  - `__tests__/services/pdf/SignatureBlockParser.test.ts` - Unit tests
  
- **Modified**:
  - `src/types/pdf.ts` - Added signature block types

## Next Steps

1. Continue to Task 2.5: Implement PDF Layout Engine
2. Consider creating test fixtures with various signature block formats
3. Add support for custom signature block templates

## Success Criteria

- [ ] Parser class created and functional
- [ ] All marker types detected correctly
- [ ] Block content extracted accurately
- [ ] Layout detection works for both single and side-by-side
- [ ] Height calculations accurate
- [ ] All tests pass 