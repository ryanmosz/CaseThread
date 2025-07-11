import { MarkdownParser } from '../../../src/services/pdf/MarkdownParser';

describe('MarkdownParser', () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  describe('isMarkdownHeading', () => {
    it('should detect H1 headings', () => {
      expect(parser.isMarkdownHeading('# Main Title')).toBe(true);
      expect(parser.isMarkdownHeading('#Main Title')).toBe(false); // No space
      expect(parser.isMarkdownHeading('# ')).toBe(false); // No text
    });

    it('should detect H2-H6 headings', () => {
      expect(parser.isMarkdownHeading('## Section')).toBe(true);
      expect(parser.isMarkdownHeading('### Subsection')).toBe(true);
      expect(parser.isMarkdownHeading('#### Sub-subsection')).toBe(true);
      expect(parser.isMarkdownHeading('##### Minor heading')).toBe(true);
      expect(parser.isMarkdownHeading('###### Smallest heading')).toBe(true);
    });

    it('should not detect H7+ (invalid)', () => {
      expect(parser.isMarkdownHeading('####### Too many hashes')).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(parser.isMarkdownHeading('  # Heading with leading space')).toBe(true);
      expect(parser.isMarkdownHeading('# Heading with trailing space  ')).toBe(true);
    });

    it('should not detect non-headings', () => {
      expect(parser.isMarkdownHeading('This is # not a heading')).toBe(false);
      expect(parser.isMarkdownHeading('Regular text')).toBe(false);
      expect(parser.isMarkdownHeading('')).toBe(false);
    });
  });

  describe('parseHeading', () => {
    it('should parse H1 heading', () => {
      const result = parser.parseHeading('# Patent License Agreement');
      expect(result).toEqual({
        level: 1,
        text: 'Patent License Agreement',
        originalLine: '# Patent License Agreement'
      });
    });

    it('should parse different heading levels', () => {
      expect(parser.parseHeading('## Section 1')?.level).toBe(2);
      expect(parser.parseHeading('### Subsection A')?.level).toBe(3);
      expect(parser.parseHeading('#### Part i')?.level).toBe(4);
      expect(parser.parseHeading('##### Detail 1')?.level).toBe(5);
      expect(parser.parseHeading('###### Note')?.level).toBe(6);
    });

    it('should trim heading text', () => {
      const result = parser.parseHeading('#   Heading with spaces   ');
      expect(result?.text).toBe('Heading with spaces');
    });

    it('should preserve internal spacing', () => {
      const result = parser.parseHeading('# This   has   multiple   spaces');
      expect(result?.text).toBe('This   has   multiple   spaces');
    });

    it('should return null for non-headings', () => {
      expect(parser.parseHeading('Not a heading')).toBeNull();
      expect(parser.parseHeading('This is # not a heading')).toBeNull();
      expect(parser.parseHeading('')).toBeNull();
    });
  });

  describe('stripHeadingSyntax', () => {
    it('should strip heading syntax', () => {
      expect(parser.stripHeadingSyntax('# Title')).toBe('Title');
      expect(parser.stripHeadingSyntax('## Section')).toBe('Section');
      expect(parser.stripHeadingSyntax('### Subsection')).toBe('Subsection');
    });

    it('should return original text for non-headings', () => {
      expect(parser.stripHeadingSyntax('Regular text')).toBe('Regular text');
      expect(parser.stripHeadingSyntax('This is # not a heading')).toBe('This is # not a heading');
    });
  });

  describe('getHeadingFontSize', () => {
    it('should return correct font sizes', () => {
      expect(parser.getHeadingFontSize(1)).toBe(16);
      expect(parser.getHeadingFontSize(2)).toBe(14);
      expect(parser.getHeadingFontSize(3)).toBe(12);
      expect(parser.getHeadingFontSize(4)).toBe(12);
      expect(parser.getHeadingFontSize(5)).toBe(12);
      expect(parser.getHeadingFontSize(6)).toBe(12);
    });
  });

  describe('isHeadingBold', () => {
    it('should return true for H1-H3', () => {
      expect(parser.isHeadingBold(1)).toBe(true);
      expect(parser.isHeadingBold(2)).toBe(true);
      expect(parser.isHeadingBold(3)).toBe(true);
    });

    it('should return false for H4-H6', () => {
      expect(parser.isHeadingBold(4)).toBe(false);
      expect(parser.isHeadingBold(5)).toBe(false);
      expect(parser.isHeadingBold(6)).toBe(false);
    });
  });

  describe('isHorizontalRule', () => {
    it('should detect horizontal rules with dashes', () => {
      expect(parser.isHorizontalRule('---')).toBe(true);
      expect(parser.isHorizontalRule('----')).toBe(true);
      expect(parser.isHorizontalRule('----------')).toBe(true);
    });

    it('should detect horizontal rules with underscores', () => {
      expect(parser.isHorizontalRule('___')).toBe(true);
      expect(parser.isHorizontalRule('____')).toBe(true);
      expect(parser.isHorizontalRule('__________')).toBe(true);
    });

    it('should detect horizontal rules with asterisks', () => {
      expect(parser.isHorizontalRule('***')).toBe(true);
      expect(parser.isHorizontalRule('****')).toBe(true);
      expect(parser.isHorizontalRule('**********')).toBe(true);
    });

    it('should handle whitespace', () => {
      expect(parser.isHorizontalRule('  ---  ')).toBe(true);
      expect(parser.isHorizontalRule('\t___\t')).toBe(true);
    });

    it('should not detect invalid horizontal rules', () => {
      expect(parser.isHorizontalRule('--')).toBe(false); // Too few
      expect(parser.isHorizontalRule('- - -')).toBe(false); // Spaces between
      expect(parser.isHorizontalRule('---text')).toBe(false); // Text after
      expect(parser.isHorizontalRule('text---')).toBe(false); // Text before
      expect(parser.isHorizontalRule('')).toBe(false);
    });
  });

  describe('parseInlineFormatting', () => {
    it('should parse bold text with **', () => {
      const segments = parser.parseInlineFormatting('This is **bold** text');
      expect(segments).toEqual([
        { text: 'This is ' },
        { text: 'bold', bold: true, italic: false },
        { text: ' text' }
      ]);
    });

    it('should parse bold text with __', () => {
      const segments = parser.parseInlineFormatting('This is __bold__ text');
      expect(segments).toEqual([
        { text: 'This is ' },
        { text: 'bold', bold: true, italic: false },
        { text: ' text' }
      ]);
    });

    it('should parse italic text with *', () => {
      const segments = parser.parseInlineFormatting('This is *italic* text');
      expect(segments).toEqual([
        { text: 'This is ' },
        { text: 'italic', bold: false, italic: true },
        { text: ' text' }
      ]);
    });

    it('should parse italic text with _', () => {
      const segments = parser.parseInlineFormatting('This is _italic_ text');
      expect(segments).toEqual([
        { text: 'This is ' },
        { text: 'italic', bold: false, italic: true },
        { text: ' text' }
      ]);
    });

    it('should parse bold italic text with ***', () => {
      const segments = parser.parseInlineFormatting('This is ***bold italic*** text');
      expect(segments).toEqual([
        { text: 'This is ' },
        { text: 'bold italic', bold: true, italic: true },
        { text: ' text' }
      ]);
    });

    it('should parse bold italic text with ___', () => {
      const segments = parser.parseInlineFormatting('This is ___bold italic___ text');
      expect(segments).toEqual([
        { text: 'This is ' },
        { text: 'bold italic', bold: true, italic: true },
        { text: ' text' }
      ]);
    });

    it('should handle multiple formatted segments', () => {
      const segments = parser.parseInlineFormatting('**Bold** and *italic* and ***both***');
      expect(segments).toEqual([
        { text: 'Bold', bold: true, italic: false },
        { text: ' and ' },
        { text: 'italic', bold: false, italic: true },
        { text: ' and ' },
        { text: 'both', bold: true, italic: true }
      ]);
    });

    it('should handle nested formatting', () => {
      const segments = parser.parseInlineFormatting('**Bold with *italic* inside**');
      // Note: Simple parser doesn't handle true nesting - the pattern doesn't match across * and _
      expect(segments).toEqual([
        { text: 'Bold with *italic* inside', bold: true, italic: false }
      ]);
    });

    it('should handle plain text', () => {
      const segments = parser.parseInlineFormatting('Just plain text');
      expect(segments).toEqual([
        { text: 'Just plain text' }
      ]);
    });

    it('should handle empty text', () => {
      const segments = parser.parseInlineFormatting('');
      expect(segments).toEqual([
        { text: '' }
      ]);
    });

    it('should handle unclosed formatting', () => {
      const segments = parser.parseInlineFormatting('This is **unclosed bold');
      expect(segments).toEqual([
        { text: 'This is **unclosed bold' }
      ]);
    });
  });

  describe('stripInlineFormatting', () => {
    it('should strip bold formatting', () => {
      expect(parser.stripInlineFormatting('**bold** text')).toBe('bold text');
      expect(parser.stripInlineFormatting('__bold__ text')).toBe('bold text');
    });

    it('should strip italic formatting', () => {
      expect(parser.stripInlineFormatting('*italic* text')).toBe('italic text');
      expect(parser.stripInlineFormatting('_italic_ text')).toBe('italic text');
    });

    it('should strip bold italic formatting', () => {
      expect(parser.stripInlineFormatting('***bold italic*** text')).toBe('bold italic text');
      expect(parser.stripInlineFormatting('___bold italic___ text')).toBe('bold italic text');
    });

    it('should strip multiple formatting', () => {
      expect(parser.stripInlineFormatting('**Bold**, *italic*, and ***both***')).toBe('Bold, italic, and both');
    });

    it('should handle plain text', () => {
      expect(parser.stripInlineFormatting('No formatting here')).toBe('No formatting here');
    });
  });

  describe('List parsing', () => {
    it('should detect unordered list items', () => {
      expect(parser.isUnorderedListItem('- Item')).toBe(true);
      expect(parser.isUnorderedListItem('* Item')).toBe(true);
      expect(parser.isUnorderedListItem('+ Item')).toBe(true);
      expect(parser.isUnorderedListItem('  - Nested item')).toBe(true);
    });

    it('should detect ordered list items', () => {
      expect(parser.isOrderedListItem('1. Item')).toBe(true);
      expect(parser.isOrderedListItem('2. Item')).toBe(true);
      expect(parser.isOrderedListItem('10. Item')).toBe(true);
      expect(parser.isOrderedListItem('  1. Nested item')).toBe(true);
    });

    it('should not detect non-list items', () => {
      expect(parser.isUnorderedListItem('Regular text')).toBe(false);
      expect(parser.isUnorderedListItem('-No space')).toBe(false);
      expect(parser.isOrderedListItem('1 No period')).toBe(false);
      expect(parser.isOrderedListItem('1.No space')).toBe(false);
    });

    it('should parse unordered list items', () => {
      expect(parser.parseListItem('- Item')).toEqual({
        type: 'unordered',
        level: 0,
        marker: '-',
        text: 'Item'
      });
      expect(parser.parseListItem('  * Nested item')).toEqual({
        type: 'unordered',
        level: 1,
        marker: '*',
        text: 'Nested item'
      });
    });

    it('should parse ordered list items', () => {
      expect(parser.parseListItem('1. First item')).toEqual({
        type: 'ordered',
        level: 0,
        marker: '1.',
        text: 'First item'
      });
      expect(parser.parseListItem('    2. Nested item')).toEqual({
        type: 'ordered',
        level: 2,
        marker: '2.',
        text: 'Nested item'
      });
    });
  });

  describe('Block quote parsing', () => {
    it('should detect block quotes', () => {
      expect(parser.isBlockQuote('> Quote')).toBe(true);
      expect(parser.isBlockQuote('>Quote')).toBe(true);
      expect(parser.isBlockQuote('> ')).toBe(true);
    });

    it('should not detect non-quotes', () => {
      expect(parser.isBlockQuote('Regular text')).toBe(false);
      expect(parser.isBlockQuote('Greater > than')).toBe(false);
    });

    it('should parse block quotes', () => {
      expect(parser.parseBlockQuote('> This is a quote')).toBe('This is a quote');
      expect(parser.parseBlockQuote('>No space quote')).toBe('No space quote');
      expect(parser.parseBlockQuote('> ')).toBe('');
    });
  });

  describe('Link parsing', () => {
    it('should extract link text', () => {
      expect(parser.extractLinkText('[Link text](http://example.com)')).toBe('Link text');
      expect(parser.extractLinkText('Text with [link](url) inside')).toBe('Text with link inside');
    });

    it('should handle multiple links', () => {
      expect(parser.extractLinkText('[First](url1) and [Second](url2)')).toBe('First and Second');
    });

    it('should handle text without links', () => {
      expect(parser.extractLinkText('No links here')).toBe('No links here');
    });
  });
}); 