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
}); 