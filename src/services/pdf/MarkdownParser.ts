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
} 