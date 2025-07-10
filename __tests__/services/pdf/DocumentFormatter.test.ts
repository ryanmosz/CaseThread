import { DocumentFormatter } from '../../../src/services/pdf/DocumentFormatter';
import { DocumentType } from '../../../src/types/pdf';

describe('DocumentFormatter', () => {
  let formatter: DocumentFormatter;

  beforeEach(() => {
    formatter = new DocumentFormatter();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(formatter).toBeInstanceOf(DocumentFormatter);
    });
  });

  describe('getFormattingRules', () => {
    it('should return default rules for unknown document type', () => {
      const rules = formatter.getFormattingRules('unknown-type' as DocumentType);
      expect(rules).toMatchObject({
        lineSpacing: 'double',
        fontSize: 12,
        font: 'Times-Roman',
        margins: {
          top: 72,
          bottom: 72,
          left: 72,
          right: 72
        }
      });
    });

    // USPTO Filings Tests
    describe('USPTO Filings', () => {
      it('should return correct rules for provisional patent application', () => {
        const rules = formatter.getFormattingRules('provisional-patent-application');
        expect(rules).toMatchObject({
          lineSpacing: 'double',
          fontSize: 12,
          font: 'Times-Roman',
          margins: { top: 72, bottom: 72, left: 72, right: 72 },
          pageNumberPosition: 'bottom-center',
          titleCase: true,
          sectionNumbering: true,
          paragraphIndent: 36,
          paragraphSpacing: 12,
          blockQuoteIndent: 72,
          signatureLineSpacing: 'single'
        });
      });

      it('should return correct rules for office action response', () => {
        const rules = formatter.getFormattingRules('office-action-response');
        expect(rules).toMatchObject({
          lineSpacing: 'double',
          fontSize: 12,
          font: 'Times-Roman',
          margins: { top: 108, bottom: 72, left: 72, right: 72 }, // 1.5" top margin
          pageNumberPosition: 'bottom-right',
          titleCase: true,
          sectionNumbering: true,
          paragraphIndent: 0, // No indent
          paragraphSpacing: 12,
          blockQuoteIndent: 72,
          signatureLineSpacing: 'single'
        });
      });

      it('should return correct rules for trademark application', () => {
        const rules = formatter.getFormattingRules('trademark-application');
        expect(rules).toMatchObject({
          lineSpacing: 'single', // Forms are single-spaced
          fontSize: 12,
          font: 'Times-Roman',
          margins: { top: 72, bottom: 72, left: 72, right: 72 },
          pageNumberPosition: 'bottom-center',
          titleCase: false,
          sectionNumbering: false,
          paragraphIndent: 0,
          paragraphSpacing: 12,
          blockQuoteIndent: 36,
          signatureLineSpacing: 'single'
        });
      });
    });

    // Legal Agreements Tests
    describe('Legal Agreements', () => {
      it('should return correct rules for patent assignment agreement', () => {
        const rules = formatter.getFormattingRules('patent-assignment-agreement');
        expect(rules).toMatchObject({
          lineSpacing: 'one-half', // 1.5 spacing for recording
          fontSize: 12,
          font: 'Times-Roman',
          margins: { top: 72, bottom: 72, left: 72, right: 72 },
          pageNumberPosition: 'bottom-center',
          titleCase: true,
          sectionNumbering: true,
          paragraphIndent: 36,
          paragraphSpacing: 12,
          blockQuoteIndent: 72,
          signatureLineSpacing: 'single'
        });
      });

      it('should return correct rules for NDA IP-specific', () => {
        const rules = formatter.getFormattingRules('nda-ip-specific');
        expect(rules).toMatchObject({
          lineSpacing: 'single',
          fontSize: 12,
          font: 'Times-Roman',
          margins: { top: 72, bottom: 72, left: 72, right: 72 },
          pageNumberPosition: 'bottom-right',
          titleCase: true,
          sectionNumbering: true,
          paragraphIndent: 36,
          paragraphSpacing: 12,
          blockQuoteIndent: 72,
          signatureLineSpacing: 'single'
        });
      });

      it('should return correct rules for patent license agreement', () => {
        const rules = formatter.getFormattingRules('patent-license-agreement');
        expect(rules).toMatchObject({
          lineSpacing: 'single',
          fontSize: 12,
          font: 'Times-Roman',
          margins: { top: 72, bottom: 72, left: 72, right: 72 },
          pageNumberPosition: 'bottom-right',
          titleCase: true,
          sectionNumbering: true,
          paragraphIndent: 36,
          paragraphSpacing: 12,
          blockQuoteIndent: 72,
          signatureLineSpacing: 'single'
        });
      });

      it('should return correct rules for technology transfer agreement', () => {
        const rules = formatter.getFormattingRules('technology-transfer-agreement');
        expect(rules).toMatchObject({
          lineSpacing: 'single',
          fontSize: 12,
          font: 'Times-Roman',
          margins: { top: 72, bottom: 72, left: 72, right: 72 },
          pageNumberPosition: 'bottom-right',
          titleCase: true,
          sectionNumbering: true,
          paragraphIndent: 36,
          paragraphSpacing: 12,
          blockQuoteIndent: 72,
          signatureLineSpacing: 'single'
        });
      });
    });

    // Professional Correspondence Tests
    describe('Professional Correspondence', () => {
      it('should return correct rules for cease and desist letter', () => {
        const rules = formatter.getFormattingRules('cease-and-desist-letter');
        expect(rules).toMatchObject({
          lineSpacing: 'single',
          fontSize: 12,
          font: 'Times-Roman',
          margins: { top: 72, bottom: 72, left: 72, right: 72 },
          pageNumberPosition: 'bottom-center',
          titleCase: false,
          sectionNumbering: false,
          paragraphIndent: 0, // Business letter format
          paragraphSpacing: 12,
          blockQuoteIndent: 72,
          signatureLineSpacing: 'single'
        });
      });
    });
  });

  describe('getLineSpacing', () => {
    it('should return correct line spacing values', () => {
      expect(formatter.getLineSpacing('single')).toBe(0);
      expect(formatter.getLineSpacing('one-half')).toBe(6);
      expect(formatter.getLineSpacing('double')).toBe(12);
    });
  });

  describe('Document Type Categorization', () => {
    it('should have double-spacing for USPTO filings (except trademark forms)', () => {
      const usptoFilings: DocumentType[] = [
        'provisional-patent-application',
        'office-action-response'
      ];

      usptoFilings.forEach(docType => {
        const rules = formatter.getFormattingRules(docType);
        expect(rules.lineSpacing).toBe('double');
      });
    });

    it('should have single-spacing for trademark applications (forms)', () => {
      const rules = formatter.getFormattingRules('trademark-application');
      expect(rules.lineSpacing).toBe('single');
    });

    it('should have appropriate spacing for legal agreements', () => {
      // Patent assignment uses 1.5 spacing for recording
      const assignmentRules = formatter.getFormattingRules('patent-assignment-agreement');
      expect(assignmentRules.lineSpacing).toBe('one-half');

      // Other agreements use single spacing
      const agreementTypes: DocumentType[] = [
        'nda-ip-specific',
        'patent-license-agreement',
        'technology-transfer-agreement'
      ];

      agreementTypes.forEach(docType => {
        const rules = formatter.getFormattingRules(docType);
        expect(rules.lineSpacing).toBe('single');
      });
    });

    it('should have single-spacing for professional correspondence', () => {
      const rules = formatter.getFormattingRules('cease-and-desist-letter');
      expect(rules.lineSpacing).toBe('single');
    });
  });
}); 