import { 
  SignatureMarker, 
  SignatureBlockData, 
  ParsedDocument,
  SignatureParty
} from '../../types/pdf';
import { createChildLogger, Logger } from '../../utils/logger';

/**
 * Parses signature block markers from generated legal documents
 */
export class SignatureBlockParser {
  private logger: Logger;

  constructor() {
    this.logger = createChildLogger({ service: 'SignatureBlockParser' });
  }

  /**
   * Parse document text and extract signature blocks
   * @param text - The complete document text to parse
   * @returns Parsed document with content and signature blocks separated
   */
  public parseDocument(text: string): ParsedDocument {
    const lines = text.split('\n');
    const signatureBlocks: SignatureBlockData[] = [];
    const cleanedLines: string[] = [];
    const signatureBlockLines = new Set<number>(); // Track only actual signature content lines
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Find all markers in the current line
      const markersInLine = this.findAllMarkers(line);
      
      if (markersInLine.length > 0) {
        // Mark this marker line as signature content
        signatureBlockLines.add(i);
        
        // Process each marker found in the line
        for (const marker of markersInLine) {
          // Get context information from marker ID
          const context = this.getMarkerContext(marker.id);
          
          // Create block data
          const blockData: Partial<SignatureBlockData> = {
            marker,
            parties: [],
            notaryRequired: marker.type === 'notary'
          };
          
          // Process following lines for block content
          const blockContent = this.extractBlockContent(lines, i, marker.type);
          blockData.layout = blockContent.layout;
          blockData.parties = blockContent.parties;
          
          // Add context information to logger for debugging
          this.logger.debug('Found marker', { 
            type: marker.type, 
            id: marker.id,
            context,
            line: i,
            partiesFound: blockContent.parties.length,
            linesConsumed: blockContent.linesConsumed
          });
          
          signatureBlocks.push(blockData as SignatureBlockData);
          
          // Mark only the actual signature content lines (not all processed lines)
          for (let j = 1; j <= blockContent.linesConsumed; j++) {
            signatureBlockLines.add(i + j);
          }
        }
        
        // Remove marker from line for cleaned content
        let cleanedLine = line;
        for (const marker of markersInLine) {
          cleanedLine = cleanedLine.replace(marker.fullMarker, '');
        }
        
        // Only add the line if it has content after removing markers
        if (cleanedLine.trim()) {
          cleanedLines.push(cleanedLine);
        }
      } else if (!signatureBlockLines.has(i)) {
        // Add non-signature-block lines to cleaned content
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
   * Enhanced marker detection with validation
   * @param text - Text to search for markers
   * @returns Array of all found markers
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
      
      // Validate marker ID format
      if (this.validateMarkerId(markerId)) {
        markers.push({
          type,
          id: markerId,
          fullMarker: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      } else {
        this.logger.warn(`Invalid marker ID format: ${markerId}`);
      }
    }
    
    return markers;
  }

  /**
   * Validate marker ID format
   * @param id - Marker ID to validate
   * @returns True if valid kebab-case format
   */
  private validateMarkerId(id: string): boolean {
    // IDs should be kebab-case identifiers
    // Allow lowercase letters and numbers, separated by hyphens
    // Must start with a letter, not a number
    const validIdPattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
    return validIdPattern.test(id);
  }

  /**
   * Get marker context information
   * @param id - Marker ID to parse
   * @returns Context information extracted from ID
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

  /**
   * Extract position number from ID if present
   * @param id - Marker ID
   * @returns Position number or 0
   */
  private getPositionFromId(id: string): number {
    // Extract position for ordering multiple signatures
    const posMatch = id.match(/-(\d+)$/);
    return posMatch ? parseInt(posMatch[1], 10) : 0;
  }

  /**
   * Extract complete signature block content
   * @param lines - All document lines
   * @param startIndex - Index where marker was found
   * @returns Block layout information, parties, and lines consumed
   */
  private extractBlockContent(
    lines: string[], 
    startIndex: number,
    blockType: 'signature' | 'initial' | 'notary'
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
      
      // Stop at next marker
      if (this.findAllMarkers(line).length > 0) {
        break;
      }
      
      // Stop if we've determined this is the end of the block
      if (this.isEndOfBlock(blockLines, line)) {
        break;
      }
      
      // Check if this line looks like signature block content
      const trimmed = line.trim();
      
      // Type-specific content detection
      const isSignatureContent = this.isBlockContent(trimmed, blockType === 'signature' ? 'SIGNATURE_BLOCK' : blockType === 'initial' ? 'INITIALS_BLOCK' : 'NOTARY_BLOCK');
      
      // Only break on non-signature content if we have collected enough
      if (!isSignatureContent && blockLines.length > 0) {
        const hasMinimalContent = blockLines.some(l => {
          const t = l.trim();
          return t !== '' && (
            /^[A-Z]+[A-Z\s]*:?$/.test(t) ||
            /^_{3,}/.test(t) ||
            /^[A-Z][A-Z\s]*?:\s*_{3,}$/.test(t) ||
            /^(Name|Title|Company):\s*/i.test(t)
          );
        });
        
        // If we have at least a role or signature line, we can stop at non-signature content
        if (hasMinimalContent) {
          break;
        }
      }
      
      blockLines.push(line);
      currentIndex++;
    }
    
    // Analyze block structure
    layout = this.detectLayout(blockLines);
    const parties = this.extractParties(blockLines, layout, blockType);
    
    // If we found no actual signature content, don't consume any lines
    const hasActualContent = blockLines.some(line => {
      const t = line.trim();
      return t !== '' && (
        /^[A-Z]+[A-Z\s]*:?$/.test(t) ||
        /^_{3,}/.test(t) ||
        /^[A-Z][A-Z\s]*?:\s*_{3,}$/.test(t) ||
        /^(Name|Title|Company|Date):\s*/i.test(t)
      );
    });
    
    return {
      layout,
      parties,
      linesConsumed: hasActualContent ? currentIndex - startIndex - 1 : 0
    };
  }

  /**
   * Detect if content is side-by-side layout
   * @param lines - Lines to analyze
   * @returns Layout type
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
   * Check if line is valid content for the specific block type
   * @param line - Line content to check
   * @param blockType - Type of block being parsed
   * @returns True if line is valid block content
   */
  private isBlockContent(line: string, blockType?: string): boolean {
    // Common patterns for all block types
    if (line === '' || /^[A-Z]+[A-Z\s]*:?$/.test(line)) {
      return true;
    }
    
    switch (blockType) {
      case 'SIGNATURE_BLOCK':
        return (
          /^_{10,}$/.test(line) || // Full signature lines
          /^(Name|Title|Company|Date):\s*/i.test(line) || // Standard fields
          /^(By|Print Name|Printed Name):\s*/i.test(line) || // Alternative labels
          /^(State of|County of)/i.test(line) // Allow state/county but don't parse as notary
        );
        
      case 'INITIALS_BLOCK':
        return (
          /^[A-Z][A-Z\s]*?:\s*_{3,}$/.test(line) || // "PARTY: ____"
          /^_{3,8}$/.test(line) || // Short initial lines
          /^(Initials?|Initial Here):\s*/i.test(line) // Initial labels
        );
        
      case 'NOTARY_BLOCK':
        return (
          /^_{10,}$/.test(line) || // Signature lines
          /^(State of|County of|Commonwealth of)/i.test(line) || // Jurisdiction
          /^(Before me|Personally appeared|On this)/i.test(line) || // Notary language
          /^(Notary Public|My commission expires|Commission #)/i.test(line) || // Notary info
          /^(SEAL|Notary Seal|Place Seal Here)/i.test(line) || // Seal indication
          /^(Subscribed and sworn|acknowledged)/i.test(line) || // Legal phrases
          /^(Name|Date|Title):\s*/i.test(line) // Standard fields
        );
        
      default:
        // Fallback for untyped blocks
        return (
          /^_{3,}$/.test(line) ||
          /^[A-Z][A-Z\s]*?:\s*_{3,}$/.test(line) ||
          /^(Name|Title|Company|Date):\s*/i.test(line)
        );
    }
  }

  /**
   * Check if we've reached end of signature block
   * @param collectedLines - Lines collected so far
   * @param currentLine - Current line being evaluated
   * @returns True if end of block reached
   */
  private isEndOfBlock(collectedLines: string[], currentLine: string): boolean {
    // Multiple consecutive empty lines indicate end
    if (currentLine.trim() === '') {
      if (collectedLines.length === 0) {
        return false; // Don't end on first empty line
      }
      
      // Check if the last line was also empty
      const lastLine = collectedLines[collectedLines.length - 1];
      if (lastLine && lastLine.trim() === '') {
        return true; // Two consecutive empty lines = end of block
      }
      
      // Single empty line is allowed within blocks
      return false;
    }
    
    // Section headers indicate new content
    // Look for lines that are all caps with optional colons and spaces
    const trimmed = currentLine.trim();
    if (trimmed.length > 0) {
      // Check for common section header patterns
      const sectionPatterns = [
        /^[A-Z][A-Z\s]+:$/,              // "TERMS AND CONDITIONS:"
        /^[A-Z][A-Z\s]+$/,               // "TERMS AND CONDITIONS"
        /^\d+\.\s+[A-Z]/,                // "1. DEFINITIONS"
        /^ARTICLE\s+[IVX\d]+/i,          // "ARTICLE I"
        /^SECTION\s+\d+/i,               // "SECTION 1"
      ];
      
      // But make sure it's not a signature party role
      // Party roles are typically single words or short phrases
      const commonPartyRoles = [
        'ASSIGNOR', 'ASSIGNEE', 'LICENSOR', 'LICENSEE', 
        'DISCLOSING PARTY', 'RECEIVING PARTY', 'PARTY',
        'INVENTOR', 'APPLICANT', 'COMPANY', 'WITNESS'
      ];
      
      // Check if it's a party role or party with identifier (e.g., "PARTY A:", "PARTY B:")
      const isLikelyPartyRole = commonPartyRoles.some(role => 
        trimmed.replace(':', '').toUpperCase() === role
      ) || /^PARTY\s+[A-Z](:)?$/i.test(trimmed);  // Handle "PARTY A", "PARTY B", etc.
      
      if (!isLikelyPartyRole && sectionPatterns.some(pattern => pattern.test(trimmed))) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Extract party information from block content
   * @param lines - Block content lines
   * @param layout - Layout type
   * @returns Array of party information
   */
  private extractParties(
    lines: string[], 
    layout: 'single' | 'side-by-side',
    blockType: 'signature' | 'initial' | 'notary'
  ): SignatureParty[] {
    if (layout === 'side-by-side') {
      return this.extractSideBySideParties(lines, blockType);
    } else {
      return this.extractSingleParties(lines, blockType);
    }
  }

  /**
   * Extract parties from single-column layout
   * @param lines - Block content lines
   * @param blockType - Type of block being parsed
   * @returns Array of party information
   */
  private extractSingleParties(lines: string[], blockType: 'signature' | 'initial' | 'notary'): SignatureParty[] {
    const parties: SignatureParty[] = [];
    let currentParty: Partial<SignatureParty> = {};
    
    // Special handling for notary blocks
    if (blockType === 'notary') {
      return this.extractNotaryParties(lines);
    }
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Handle initial blocks format: "PARTY: ______"
      if (blockType === 'initial') {
        const initialMatch = trimmed.match(/^([A-Z][A-Z\s]*?):\s*(_{3,})$/);
        if (initialMatch) {
          parties.push({
            role: initialMatch[1].trim(),
            lineType: 'initial'
          } as SignatureParty);
          continue;
        }
        // Short initial lines without role
        if (/^_{3,8}$/.test(trimmed)) {
          parties.push({
            lineType: 'initial'
          } as SignatureParty);
          continue;
        }
      }
      
      // Role pattern (e.g., "ASSIGNOR:", "LICENSEE:")
      if (/^[A-Z]+[A-Z\s]*:?$/.test(trimmed) && trimmed.length > 2) {
        if (currentParty.role) {
          parties.push(currentParty as SignatureParty);
          currentParty = {};
        }
        currentParty.role = trimmed.replace(':', '');
      }
      // Signature line pattern
      else if (/^_{10,}$/.test(trimmed)) {
        currentParty.lineType = blockType === 'initial' ? 'initial' : 'signature';
      }
      // Name pattern (follows signature line)
      else if (/^(Name|Print(?:ed)? Name|By):\s*(.+)/i.test(trimmed)) {
        const match = trimmed.match(/^(?:Name|Print(?:ed)? Name|By):\s*(.+)/i);
        if (match) {
          currentParty.name = match[1];
        }
      }
      // Title pattern
      else if (/^Title:\s*(.+)/i.test(trimmed)) {
        const match = trimmed.match(/^Title:\s*(.+)/i);
        if (match) currentParty.title = match[1];
      }
      // Company pattern
      else if (/^Company:\s*(.+)/i.test(trimmed)) {
        const match = trimmed.match(/^Company:\s*(.+)/i);
        if (match) currentParty.company = match[1];
      }
      // Date pattern (common in signature blocks)
      else if (/^Date:\s*(.+)/i.test(trimmed)) {
        const match = trimmed.match(/^Date:\s*(.+)/i);
        if (match && !currentParty.date) {
          currentParty.date = match[1];
        }
      }
    }
    
    // Add last party
    if (currentParty.role || currentParty.lineType) {
      parties.push(currentParty as SignatureParty);
    }
    
    return parties;
  }

  /**
   * Extract parties from side-by-side layout
   * @param lines - Block content lines
   * @returns Array of party information
   */
  private extractSideBySideParties(lines: string[], blockType: 'signature' | 'initial' | 'notary'): SignatureParty[] {
    const leftParty: Partial<SignatureParty> = {};
    const rightParty: Partial<SignatureParty> = {};
    
    for (const line of lines) {
      // Split line at significant whitespace
      const parts = line.split(/\s{5,}|\t/);
      
      if (parts.length >= 2) {
        const left = parts[0].trim();
        const right = parts[parts.length - 1].trim(); // Use last part in case of multiple splits
        
        // Process left side
        this.parsePartyInfo(left, leftParty, blockType);
        
        // Process right side
        this.parsePartyInfo(right, rightParty, blockType);
      } else if (parts.length === 1) {
        // Single column content in side-by-side layout (may happen with headers)
        this.parsePartyInfo(parts[0].trim(), leftParty, blockType);
      }
    }
    
    const parties: SignatureParty[] = [];
    if (leftParty.role || leftParty.lineType) {
      parties.push(leftParty as SignatureParty);
    }
    if (rightParty.role || rightParty.lineType) {
      parties.push(rightParty as SignatureParty);
    }
    
    return parties;
  }

  /**
   * Extract notary information from notary block
   * @param lines - Block content lines
   * @returns Array with notary party information
   */
  private extractNotaryParties(lines: string[]): SignatureParty[] {
    const notary: Partial<SignatureParty> = {
      role: 'NOTARY PUBLIC',
      lineType: 'signature'
    };
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // State/County patterns
      const stateMatch = trimmed.match(/^(?:State|Commonwealth) of\s+(.+?)(?:\s*\)|$)/i);
      if (stateMatch) {
        notary.notaryState = stateMatch[1].trim();
        continue;
      }
      
      const countyMatch = trimmed.match(/^County of\s+(.+?)(?:\s*\)|$)/i);
      if (countyMatch) {
        notary.notaryCounty = countyMatch[1].trim();
        continue;
      }
      
      // Notary signature line
      if (/^_{10,}$/.test(trimmed)) {
        notary.lineType = 'signature';
      }
      // Notary name
      else if (/^(?:Notary Public|Name):\s*(.+)/i.test(trimmed)) {
        const match = trimmed.match(/^(?:Notary Public|Name):\s*(.+)/i);
        if (match) notary.name = match[1];
      }
      // Commission expiration
      else if (/^(?:My commission expires|Commission Expires?):\s*(.+)/i.test(trimmed)) {
        const match = trimmed.match(/^(?:My commission expires|Commission Expires?):\s*(.+)/i);
        if (match) notary.commissionExpires = match[1];
      }
      // Commission number
      else if (/^(?:Commission #|Commission Number):\s*(.+)/i.test(trimmed)) {
        const match = trimmed.match(/^(?:Commission #|Commission Number):\s*(.+)/i);
        if (match) notary.commissionNumber = match[1];
      }
      // Date
      else if (/^Date:\s*(.+)/i.test(trimmed)) {
        const match = trimmed.match(/^Date:\s*(.+)/i);
        if (match) notary.date = match[1];
      }
      // SEAL indication (just note it exists, don't store)
      else if (/^(?:\[?SEAL\]?|Notary Seal|Place Seal Here)/i.test(trimmed)) {
        // Acknowledge seal placement area
        this.logger.debug('Notary seal placeholder found');
      }
    }
    
    return [notary as SignatureParty];
  }

  /**
   * Parse individual party information
   * @param text - Text to parse
   * @param party - Party object to update
   * @param blockType - Type of block being parsed
   */
  private parsePartyInfo(text: string, party: Partial<SignatureParty>, blockType: 'signature' | 'initial' | 'notary'): void {
    if (!text) return;
    
    // Initial block format: "PARTY: ____"
    if (blockType === 'initial') {
      const initialMatch = text.match(/^([A-Z][A-Z\s]*?):\s*(_{3,})$/);
      if (initialMatch) {
        party.role = initialMatch[1].trim();
        party.lineType = 'initial';
        return;
      }
      // Short initial line
      if (/^_{3,8}$/.test(text)) {
        party.lineType = 'initial';
        return;
      }
    }
    
    // Role pattern
    if (/^[A-Z]+[A-Z\s]*:?$/.test(text) && text.length > 2) {
      party.role = text.replace(':', '');
    } 
    // Signature/initial line
    else if (/^_{3,}$/.test(text)) {
      party.lineType = blockType === 'initial' ? 'initial' : 'signature';
    } 
    // Name field (with variations)
    else if (text.match(/^(Name|Print(?:ed)? Name|By):\s*(.+)/i)) {
      const match = text.match(/^(?:Name|Print(?:ed)? Name|By):\s*(.+)/i);
      if (match) party.name = match[1];
    } 
    // Title field
    else if (text.match(/^Title:\s*(.+)/i)) {
      const match = text.match(/^Title:\s*(.+)/i);
      if (match) party.title = match[1];
    }
    // Company field
    else if (text.match(/^Company:\s*(.+)/i)) {
      const match = text.match(/^Company:\s*(.+)/i);
      if (match) party.company = match[1];
    }
    // Date field
    else if (text.match(/^Date:\s*(.+)/i)) {
      const match = text.match(/^Date:\s*(.+)/i);
      if (match) party.date = match[1];
    }
  }

  /**
   * Analyze and enhance layout information
   * @param blockData - Signature block data to analyze
   * @returns Layout configuration for PDF rendering
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
   * @param blockData - Signature block data
   * @returns Estimated height in points
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
      if (party.date) height += lineHeight; // Date line
      height += padding * 2; // Padding above and below
    }
    
    // Add extra space for notary blocks
    if (blockData.notaryRequired) {
      height += lineHeight * 4; // Notary acknowledgment text
      height += signatureLine; // Notary signature
      height += lineHeight * 2; // Commission info
      height += lineHeight; // SEAL space
    }
    
    return height;
  }

  /**
   * Group related signature blocks
   * @param blocks - All signature blocks from document
   * @returns Grouped blocks for rendering together
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

  /**
   * Check if two blocks are related (should be rendered together)
   * @param block1 - First block
   * @param block2 - Second block
   * @returns True if blocks are related
   */
  private areBlocksRelated(block1: SignatureBlockData, block2: SignatureBlockData): boolean {
    // Blocks are related if they share the same party identifier
    const id1 = block1.marker.id.split('-')[0];
    const id2 = block2.marker.id.split('-')[0];
    return id1 === id2;
  }

  /**
   * Calculate total height for a group of related blocks
   * @param group - Group of related blocks
   * @returns Total height needed for the group
   */
  public calculateGroupHeight(group: SignatureBlockData[]): number {
    let totalHeight = 0;
    const blockSpacing = 30; // Space between blocks in a group
    
    group.forEach((block, index) => {
      totalHeight += this.calculateBlockHeight(block);
      if (index < group.length - 1) {
        totalHeight += blockSpacing;
      }
    });
    
    return totalHeight;
  }

  /**
   * Determine optimal placement strategy for blocks
   * @param blockData - Signature block data
   * @returns Placement recommendations
   */
  public getPlacementStrategy(blockData: SignatureBlockData): {
    preventBreak: boolean;
    minSpaceRequired: number;
    preferNewPage: boolean;
  } {
    const height = this.calculateBlockHeight(blockData);
    
    return {
      preventBreak: true, // Never split signature blocks
      minSpaceRequired: height + 50, // Include some buffer
      preferNewPage: blockData.notaryRequired || height > 200 // Large blocks or notary blocks
    };
  }
} 