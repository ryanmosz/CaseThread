import { createChildLogger, Logger } from '../../utils/logger';

/**
 * Represents a parsed heading with its level and text
 */
export interface ParsedHeading {
  level: number;
  text: string;
  originalLine: string;
}

/**
 * Represents a text segment with formatting information
 */
export interface TextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

/**
 * Parser for converting Markdown syntax to structured format for PDF rendering
 */
export class MarkdownParser {
  private logger: Logger;
  
  // Regex patterns for Markdown elements
  private readonly headingPattern = /^(#{1,6})\s+(.+)$/;
  private readonly horizontalRulePattern = /^(-{3,}|_{3,}|\*{3,})$/;
  
  // Inline formatting patterns
  private readonly boldItalicPattern = /(\*\*\*|___)(.+?)\1/g;
  private readonly boldPattern = /(\*\*|__)(.+?)\1/g;
  private readonly italicPattern = /(\*|_)(.+?)\1/g;
  
  // List patterns
  private readonly unorderedListPattern = /^(\s*)([-*+])\s+(.+)$/;
  private readonly orderedListPattern = /^(\s*)(\d+)\.\s+(.+)$/;
  
  // Block quote pattern
  private readonly blockQuotePattern = /^>\s*(.*)$/;
  
  // Link pattern
  private readonly linkPattern = /\[([^\]]+)\]\([^)]+\)/g;
  
  // Simple table pattern (detects table separator rows)
  private readonly tableRowPattern = /^\s*\|?(.+\|.+)\|?\s*$/;
  private readonly tableSeparatorPattern = /^\s*\|?[\s-]+\|[\s-]+\|?\s*$/;
  
  constructor() {
    this.logger = createChildLogger({ service: 'MarkdownParser' });
  }
  
  /**
   * Check if a line is a Markdown heading
   */
  isMarkdownHeading(line: string): boolean {
    return this.headingPattern.test(line.trim());
  }
  
  /**
   * Parse a Markdown heading line
   * @returns ParsedHeading or null if not a heading
   */
  parseHeading(line: string): ParsedHeading | null {
    const trimmed = line.trim();
    const match = trimmed.match(this.headingPattern);
    
    if (!match) {
      return null;
    }
    
    const level = match[1].length; // Number of # characters
    const text = match[2].trim();
    
    this.logger.debug('Parsed heading', { level, text });
    
    return {
      level,
      text,
      originalLine: line
    };
  }
  
  /**
   * Check if a line is a horizontal rule
   */
  isHorizontalRule(line: string): boolean {
    return this.horizontalRulePattern.test(line.trim());
  }
  
  /**
   * Strip Markdown heading syntax from a line
   */
  stripHeadingSyntax(line: string): string {
    const heading = this.parseHeading(line);
    return heading ? heading.text : line;
  }
  
  /**
   * Get the appropriate font size for a heading level
   * @param level Heading level (1-6)
   * @returns Font size in points
   */
  getHeadingFontSize(level: number): number {
    switch (level) {
      case 1:
        return 16;
      case 2:
        return 14;
      case 3:
        return 12;
      default:
        return 12; // H4, H5, H6 all use 12pt
    }
  }
  
  /**
   * Check if heading should be bold
   * @param level Heading level (1-6)
   * @returns true for H1, H2, H3; false for H4+
   */
  isHeadingBold(level: number): boolean {
    return level <= 3;
  }
  
  /**
   * Parse inline formatting in a text string
   * @param text Text that may contain Markdown formatting
   * @returns Array of text segments with formatting information
   */
  parseInlineFormatting(text: string): TextSegment[] {
    // Handle empty text
    if (text.length === 0) {
      return [{ text: '' }];
    }
    
    // First, handle bold+italic (***text*** or ___text___)
    const parts = this.splitByPattern(text, this.boldItalicPattern, (_match, _delimiter, content) => ({
      text: content,
      bold: true,
      italic: true
    }));
    
    // Then handle bold (**text** or __text__) in each part
    const partsWithBold: Array<TextSegment | string> = [];
    for (const part of parts) {
      if (typeof part === 'string') {
        partsWithBold.push(...this.splitByPattern(part, this.boldPattern, (_match, _delimiter, content) => ({
          text: content,
          bold: true,
          italic: false
        })));
      } else {
        partsWithBold.push(part);
      }
    }
    
    // Finally handle italic (*text* or _text_) in remaining strings
    const finalParts: Array<TextSegment | string> = [];
    for (const part of partsWithBold) {
      if (typeof part === 'string') {
        const italicParts = this.splitByPattern(part, this.italicPattern, (_match, _delimiter, content) => ({
          text: content,
          bold: false,
          italic: true
        }));
        finalParts.push(...italicParts);
      } else {
        finalParts.push(part);
      }
    }
    
    // Convert any remaining strings to plain text segments
    return finalParts.map(segment => 
      typeof segment === 'string' 
        ? { text: segment } 
        : segment
    );
  }
  
  /**
   * Split text by a pattern and process matches
   * @private
   */
  private splitByPattern(
    text: string, 
    pattern: RegExp, 
    processMatch: (match: string, delimiter: string, content: string) => TextSegment
  ): Array<TextSegment | string> {
    const result: Array<TextSegment | string> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    
    // Create a new regex with global flag to ensure we get all matches
    const regex = new RegExp(pattern.source, 'g');
    
    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        result.push(text.slice(lastIndex, match.index));
      }
      
      // Add the formatted segment
      const [fullMatch, delimiter, content] = match;
      result.push(processMatch(fullMatch, delimiter, content));
      
      lastIndex = regex.lastIndex;
    }
    
    // Add any remaining text
    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex));
    }
    
    return result;
  }
  
  /**
   * Strip all inline Markdown formatting from text
   * @param text Text with potential Markdown formatting
   * @returns Plain text without formatting symbols
   */
  stripInlineFormatting(text: string): string {
    const segments = this.parseInlineFormatting(text);
    return segments.map(segment => segment.text).join('');
  }
  
  /**
   * Check if a line is an unordered list item
   */
  isUnorderedListItem(line: string): boolean {
    return this.unorderedListPattern.test(line);
  }
  
  /**
   * Check if a line is an ordered list item
   */
  isOrderedListItem(line: string): boolean {
    return this.orderedListPattern.test(line);
  }
  
  /**
   * Parse a list item (ordered or unordered)
   * @returns Object with indent level, marker, and content
   */
  parseListItem(line: string): { 
    type: 'ordered' | 'unordered'; 
    level: number; 
    marker: string; 
    text: string 
  } | null {
    const unorderedMatch = line.match(this.unorderedListPattern);
    if (unorderedMatch) {
      const [, indent, marker, content] = unorderedMatch;
      return {
        type: 'unordered',
        level: Math.floor(indent.length / 2), // 2 spaces per level
        marker,
        text: content.trim()
      };
    }
    
    const orderedMatch = line.match(this.orderedListPattern);
    if (orderedMatch) {
      const [, indent, number, content] = orderedMatch;
      return {
        type: 'ordered',
        level: Math.floor(indent.length / 2),
        marker: `${number}.`,
        text: content.trim()
      };
    }
    
    return null;
  }
  
  /**
   * Check if a line is a block quote
   */
  isBlockQuote(line: string): boolean {
    return this.blockQuotePattern.test(line);
  }
  
  /**
   * Parse a block quote line
   * @returns The content without the > prefix
   */
  parseBlockQuote(line: string): string | null {
    const match = line.match(this.blockQuotePattern);
    return match ? match[1] : null;
  }
  
  /**
   * Extract link text from Markdown links
   * @param text Text containing potential links
   * @returns Text with link URLs removed, keeping only link text
   */
  extractLinkText(text: string): string {
    return text.replace(this.linkPattern, '$1');
  }
  
  /**
   * Check if a line looks like a table row
   */
  isTableRow(line: string): boolean {
    return this.tableRowPattern.test(line) && !this.tableSeparatorPattern.test(line);
  }
  
  /**
   * Check if a line is a table separator
   */
  isTableSeparator(line: string): boolean {
    return this.tableSeparatorPattern.test(line);
  }
  
  /**
   * Parse a table row into cells
   * @param line Table row line
   * @returns Array of cell contents
   */
  parseTableRow(line: string): string[] {
    // Remove leading/trailing pipes and whitespace
    const cleaned = line.trim().replace(/^\||\|$/g, '');
    // Split by pipes and trim each cell
    return cleaned.split('|').map(cell => cell.trim());
  }
  
  /**
   * Strip all Markdown syntax from text
   * This is a comprehensive method that removes all syntax while preserving content
   */
  stripAllMarkdownSyntax(text: string): string {
    let result = text;
    
    // Strip inline formatting
    result = this.stripInlineFormatting(result);
    
    // Extract link text
    result = this.extractLinkText(result);
    
    // Remove heading syntax
    if (this.isMarkdownHeading(result)) {
      const heading = this.parseHeading(result);
      result = heading ? heading.text : result;
    }
    
    // Remove list markers
    const listItem = this.parseListItem(result);
    if (listItem) {
      result = listItem.text;
    }
    
    // Remove blockquote markers
    if (this.isBlockQuote(result)) {
      result = this.parseBlockQuote(result) || result;
    }
    
    // Remove horizontal rule (replace with empty string as it's a visual element)
    if (this.isHorizontalRule(result)) {
      result = '';
    }
    
    return result;
  }
} 