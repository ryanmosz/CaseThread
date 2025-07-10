import { DocumentFormatter } from '../../../src/services/pdf/DocumentFormatter';
import { DocumentType } from '../../../src/types/pdf';

describe('DocumentFormatter', () => {
  let formatter: DocumentFormatter;

  beforeEach(() => {
    formatter = new DocumentFormatter();
  });

  describe('Class Instantiation', () => {
    it('should create an instance of DocumentFormatter', () => {
      expect(formatter).toBeInstanceOf(DocumentFormatter);
    });
  });

  describe('Default Rules', () => {
    it('should return default rules for unknown document type', () => {
      // Use an invalid document type to trigger default rules
      const rules = formatter.getFormattingRules('unknown-type' as DocumentType);
      
      expect(rules).toEqual({
        lineSpacing: 'double',
        fontSize: 12,
        font: 'Times-Roman',
        margins: {
          top: 72,
          bottom: 72,
          left: 72,
          right: 72
        },
        pageNumberPosition: 'bottom-center',
        titleCase: true,
        sectionNumbering: false,
        paragraphIndent: 36,
        paragraphSpacing: 12,
        blockQuoteIndent: 72,
        signatureLineSpacing: 'single'
      });
    });
  });

  describe('Line Spacing', () => {
    it('should return correct line spacing values', () => {
      expect(formatter.getLineSpacing('single')).toBe(0);
      expect(formatter.getLineSpacing('one-half')).toBe(6);
      expect(formatter.getLineSpacing('double')).toBe(12);
    });

    it('should default to single spacing for invalid values', () => {
      expect(formatter.getLineSpacing('invalid' as any)).toBe(0);
    });
  });
}); 