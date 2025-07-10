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

  describe('Line Spacing Logic', () => {
    describe('applyLineSpacing', () => {
      it('should return correct line spacing for document types', () => {
        // Double-spaced document
        expect(formatter.applyLineSpacing('provisional-patent-application')).toBe(12);
        
        // Single-spaced document
        expect(formatter.applyLineSpacing('nda-ip-specific')).toBe(0);
        
        // 1.5 spaced document
        expect(formatter.applyLineSpacing('patent-assignment-agreement')).toBe(6);
      });

      it('should always use single spacing for signature blocks', () => {
        // Even for double-spaced documents
        expect(formatter.applyLineSpacing('provisional-patent-application', true)).toBe(0);
        expect(formatter.applyLineSpacing('office-action-response', true)).toBe(0);
        
        // And single-spaced documents
        expect(formatter.applyLineSpacing('nda-ip-specific', true)).toBe(0);
      });
    });

    describe('calculateLineHeight', () => {
      it('should calculate line height correctly', () => {
        // 12pt font with single spacing: 12 * 1.2 + 0 = 14.4
        expect(formatter.calculateLineHeight(12, 'single')).toBeCloseTo(14.4);
        
        // 12pt font with 1.5 spacing: 12 * 1.2 + 6 = 20.4
        expect(formatter.calculateLineHeight(12, 'one-half')).toBeCloseTo(20.4);
        
        // 12pt font with double spacing: 12 * 1.2 + 12 = 26.4
        expect(formatter.calculateLineHeight(12, 'double')).toBeCloseTo(26.4);
      });

      it('should work with different font sizes', () => {
        // 10pt font
        expect(formatter.calculateLineHeight(10, 'single')).toBeCloseTo(12);
        expect(formatter.calculateLineHeight(10, 'double')).toBeCloseTo(24);
        
        // 14pt font
        expect(formatter.calculateLineHeight(14, 'single')).toBeCloseTo(16.8);
        expect(formatter.calculateLineHeight(14, 'double')).toBeCloseTo(28.8);
      });
    });

    describe('getElementSpacing', () => {
      it('should return correct spacing for different elements', () => {
        const docType = 'provisional-patent-application';
        
        // Base paragraph spacing is 12
        expect(formatter.getElementSpacing(docType, 'paragraph')).toBe(12);
        
        // Section spacing is 1.5x = 18
        expect(formatter.getElementSpacing(docType, 'section')).toBe(18);
        
        // Title spacing is 2x = 24
        expect(formatter.getElementSpacing(docType, 'title')).toBe(24);
        
        // List spacing is 0.5x = 6
        expect(formatter.getElementSpacing(docType, 'list')).toBe(6);
      });

      it('should use document-specific paragraph spacing', () => {
        // All our documents use 12pt paragraph spacing, but let's verify
        const documentTypes: DocumentType[] = [
          'provisional-patent-application',
          'trademark-application',
          'cease-and-desist-letter'
        ];

        documentTypes.forEach(docType => {
          expect(formatter.getElementSpacing(docType, 'paragraph')).toBe(12);
        });
      });
    });

    describe('requiresDoubleSpacing', () => {
      it('should identify double-spaced documents', () => {
        expect(formatter.requiresDoubleSpacing('provisional-patent-application')).toBe(true);
        expect(formatter.requiresDoubleSpacing('office-action-response')).toBe(true);
      });

      it('should identify non-double-spaced documents', () => {
        expect(formatter.requiresDoubleSpacing('nda-ip-specific')).toBe(false);
        expect(formatter.requiresDoubleSpacing('patent-assignment-agreement')).toBe(false);
        expect(formatter.requiresDoubleSpacing('cease-and-desist-letter')).toBe(false);
      });
    });
  });

  describe('Special Margin Handling', () => {
    describe('getMarginsForPage', () => {
      it('should return standard margins for most documents', () => {
        const margins = formatter.getMarginsForPage('nda-ip-specific', 1);
        expect(margins).toEqual({
          top: 72,
          bottom: 72,
          left: 72,
          right: 72
        });
      });

      it('should return special top margin for office action response first page', () => {
        const firstPageMargins = formatter.getMarginsForPage('office-action-response', 1);
        expect(firstPageMargins).toEqual({
          top: 108, // 1.5 inches
          bottom: 72,
          left: 72,
          right: 72
        });
      });

      it('should return standard margins for office action response subsequent pages', () => {
        const secondPageMargins = formatter.getMarginsForPage('office-action-response', 2);
        expect(secondPageMargins).toEqual({
          top: 72, // Back to 1 inch
          bottom: 72,
          left: 72,
          right: 72
        });
      });
    });

    describe('getUsablePageArea', () => {
      it('should calculate usable area for standard margins', () => {
        const area = formatter.getUsablePageArea('provisional-patent-application', 1);
        expect(area).toEqual({
          width: 468, // 612 - 72 - 72
          height: 648 // 792 - 72 - 72
        });
      });

      it('should calculate reduced area for office action first page', () => {
        const area = formatter.getUsablePageArea('office-action-response', 1);
        expect(area).toEqual({
          width: 468, // 612 - 72 - 72
          height: 612 // 792 - 108 - 72 (reduced by extra top margin)
        });
      });

      it('should calculate normal area for office action second page', () => {
        const area = formatter.getUsablePageArea('office-action-response', 2);
        expect(area).toEqual({
          width: 468,
          height: 648 // Back to normal
        });
      });
    });

    describe('needsHeaderSpace', () => {
      it('should return true for office action response first page', () => {
        expect(formatter.needsHeaderSpace('office-action-response', 1)).toBe(true);
      });

      it('should return false for office action response subsequent pages', () => {
        expect(formatter.needsHeaderSpace('office-action-response', 2)).toBe(false);
        expect(formatter.needsHeaderSpace('office-action-response', 3)).toBe(false);
      });

      it('should return false for all other document types', () => {
        const otherDocTypes: DocumentType[] = [
          'provisional-patent-application',
          'trademark-application',
          'patent-assignment-agreement',
          'nda-ip-specific',
          'patent-license-agreement',
          'technology-transfer-agreement',
          'cease-and-desist-letter'
        ];

        otherDocTypes.forEach(docType => {
          expect(formatter.needsHeaderSpace(docType, 1)).toBe(false);
        });
      });
    });

    describe('getHeaderContent', () => {
      it('should return header content for office action response with metadata', () => {
        const header = formatter.getHeaderContent('office-action-response', {
          applicationNumber: '16/123,456',
          responseDate: 'December 15, 2024'
        });
        
        expect(header).toEqual([
          'Application No.: 16/123,456',
          'Response Date: December 15, 2024'
        ]);
      });

      it('should return partial header with only application number', () => {
        const header = formatter.getHeaderContent('office-action-response', {
          applicationNumber: '16/123,456'
        });
        
        expect(header).toEqual([
          'Application No.: 16/123,456'
        ]);
      });

      it('should return null for office action with no metadata', () => {
        const header = formatter.getHeaderContent('office-action-response');
        expect(header).toBeNull();
      });

      it('should return null for all other document types', () => {
        const header = formatter.getHeaderContent('nda-ip-specific', {
          applicationNumber: '16/123,456',
          responseDate: 'December 15, 2024'
        });
        
        expect(header).toBeNull();
      });
    });
  });

  describe('Configuration Support', () => {
    it('should accept configuration in constructor', () => {
      const customFormatter = new DocumentFormatter({
        overrides: {
          'nda-ip-specific': {
            lineSpacing: 'double'
          }
        }
      });

      const rules = customFormatter.getFormattingRules('nda-ip-specific');
      expect(rules.lineSpacing).toBe('double');
      // Other properties should remain unchanged
      expect(rules.fontSize).toBe(12);
      expect(rules.margins.top).toBe(72);
    });

    it('should apply partial margin overrides', () => {
      const customFormatter = new DocumentFormatter({
        overrides: {
          'provisional-patent-application': {
            margins: {
              top: 90, // Override just top margin
              bottom: 72,
              left: 72,
              right: 72
            }
          }
        }
      });

      const rules = customFormatter.getFormattingRules('provisional-patent-application');
      expect(rules.margins.top).toBe(90);
      expect(rules.margins.bottom).toBe(72);
      expect(rules.lineSpacing).toBe('double'); // Should keep original
    });

    it('should update configuration dynamically', () => {
      const formatter = new DocumentFormatter();
      
      // Initial state
      let rules = formatter.getFormattingRules('trademark-application');
      expect(rules.lineSpacing).toBe('single');
      
      // Update configuration
      formatter.updateConfiguration({
        overrides: {
          'trademark-application': {
            lineSpacing: 'double',
            fontSize: 14
          }
        }
      });
      
      // Check updated rules
      rules = formatter.getFormattingRules('trademark-application');
      expect(rules.lineSpacing).toBe('double');
      expect(rules.fontSize).toBe(14);
    });

    it('should handle multiple document type overrides', () => {
      const customFormatter = new DocumentFormatter({
        overrides: {
          'nda-ip-specific': {
            lineSpacing: 'double'
          },
          'patent-license-agreement': {
            fontSize: 14,
            pageNumberPosition: 'bottom-left'
          }
        }
      });

      const ndaRules = customFormatter.getFormattingRules('nda-ip-specific');
      expect(ndaRules.lineSpacing).toBe('double');
      expect(ndaRules.fontSize).toBe(12); // Original

      const licenseRules = customFormatter.getFormattingRules('patent-license-agreement');
      expect(licenseRules.fontSize).toBe(14);
      expect(licenseRules.pageNumberPosition).toBe('bottom-left');
      expect(licenseRules.lineSpacing).toBe('single'); // Original
    });

    it('should not affect non-overridden document types', () => {
      const customFormatter = new DocumentFormatter({
        overrides: {
          'cease-and-desist-letter': {
            lineSpacing: 'double'
          }
        }
      });

      // Should use original rules for non-overridden types
      const provisionalRules = customFormatter.getFormattingRules('provisional-patent-application');
      expect(provisionalRules.lineSpacing).toBe('double'); // Original value
      expect(provisionalRules.margins.top).toBe(72);
    });

    it('should access configuration object', () => {
      const config = {
        overrides: {
          'office-action-response': {
            fontSize: 11
          }
        }
      };
      
      const formatter = new DocumentFormatter(config);
      const configuration = formatter.getConfiguration();
      
      expect(configuration.getConfig()).toEqual(config);
      expect(configuration.hasOverrides('office-action-response')).toBe(true);
      expect(configuration.hasOverrides('nda-ip-specific')).toBe(false);
    });
  });
}); 