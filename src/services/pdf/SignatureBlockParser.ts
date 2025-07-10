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
    const processedLines = new Set<number>();
    
    for (let i = 0; i < lines.length; i++) {
      // Skip if this line was already processed as part of a block
      if (processedLines.has(i)) {
        continue;
      }
      
      const line = lines[i];
      
      // Find all markers in the current line
      const markersInLine = this.findAllMarkers(line);
      
      if (markersInLine.length > 0) {
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
          const blockContent = this.extractBlockContent(lines, i);
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
          
          // Mark consumed lines as processed
          processedLines.add(i); // Mark the marker line
          for (let j = 1; j <= blockContent.linesConsumed; j++) {
            processedLines.add(i + j);
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
      const isSignatureContent = 
        trimmed === '' || // Empty lines within blocks
        /^[A-Z]+[A-Z\s]*:?$/.test(trimmed) || // Role headers
        /^_{3,}/.test(trimmed) || // Signature lines
        /^[A-Z][A-Z\s]*?:\s*_{3,}$/.test(trimmed) || // Initial blocks: "PARTY: ____"
        /^(Name|Title|Company):\s*/i.test(trimmed) || // Field labels
        /^(State of|County of)/i.test(trimmed); // Notary content
        
      // If we have content and this line doesn't look like signature content,
      // and we haven't found any signature content yet, don't consume it
      if (blockLines.length > 0 && !isSignatureContent) {
        const hasSignatureContent = blockLines.some(l => {
          const t = l.trim();
          return t !== '' && (
            /^[A-Z]+[A-Z\s]*:?$/.test(t) ||
            /^_{3,}/.test(t) ||
            /^[A-Z][A-Z\s]*?:\s*_{3,}$/.test(t) ||
            /^(Name|Title|Company):\s*/i.test(t)
          );
        });
        
        if (!hasSignatureContent) {
          break;
        }
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
      
      const isLikelyPartyRole = commonPartyRoles.some(role => 
        trimmed.replace(':', '').toUpperCase() === role
      );
      
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
   * @param lines - Block content lines
   * @returns Array of party information
   */
  private extractSingleParties(lines: string[]): SignatureParty[] {
    const parties: SignatureParty[] = [];
    let currentParty: Partial<SignatureParty> = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Handle initial blocks format: "PARTY: ______"
      const initialMatch = trimmed.match(/^([A-Z][A-Z\s]*?):\s*(_{3,})$/);
      if (initialMatch) {
        parties.push({
          role: initialMatch[1].trim(),
          lineType: 'initial'
        } as SignatureParty);
        continue;
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
      else if (/^_{10,}/.test(trimmed)) {
        currentParty.lineType = 'signature';
      }
      // Name pattern (follows signature line)
      else if (/^Name:\s*(.+)/i.test(trimmed)) {
        const match = trimmed.match(/^Name:\s*(.+)/i);
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
  private extractSideBySideParties(lines: string[]): SignatureParty[] {
    const leftParty: Partial<SignatureParty> = {};
    const rightParty: Partial<SignatureParty> = {};
    
    for (const line of lines) {
      // Split line at significant whitespace
      const parts = line.split(/\s{5,}|\t/);
      
      if (parts.length >= 2) {
        const left = parts[0].trim();
        const right = parts[parts.length - 1].trim(); // Use last part in case of multiple splits
        
        // Process left side
        this.parsePartyInfo(left, leftParty);
        
        // Process right side
        this.parsePartyInfo(right, rightParty);
      } else if (parts.length === 1) {
        // Single column content in side-by-side layout (may happen with headers)
        this.parsePartyInfo(parts[0].trim(), leftParty);
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
   * Parse individual party information
   * @param text - Text to parse
   * @param party - Party object to update
   */
  private parsePartyInfo(text: string, party: Partial<SignatureParty>): void {
    if (!text) return;
    
    // Initial block format: "PARTY: ____"
    const initialMatch = text.match(/^([A-Z][A-Z\s]*?):\s*(_{3,})$/);
    if (initialMatch) {
      party.role = initialMatch[1].trim();
      party.lineType = 'initial';
      return;
    }
    
    // Role pattern
    if (/^[A-Z]+[A-Z\s]*:?$/.test(text) && text.length > 2) {
      party.role = text.replace(':', '');
    } 
    // Signature line
    else if (/^_{10,}/.test(text)) {
      party.lineType = 'signature';
    } 
    // Name field
    else if (text.match(/^Name:\s*(.+)/i)) {
      const match = text.match(/^Name:\s*(.+)/i);
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
  }
} 