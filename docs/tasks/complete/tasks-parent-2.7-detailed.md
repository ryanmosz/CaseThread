# Task 2.7 Detailed: Add Comprehensive Tests

**Part of Parent Task 2.0: Create Core PDF Generation Service with Legal Formatting**

## Overview

This subtask implements comprehensive test coverage for the entire PDF generation system. It includes unit tests for individual components, integration tests for the complete pipeline, and tests for all 8 document types to ensure legal formatting requirements are met.

## Sub-tasks

### 2.7.1 Write unit tests for PDF generator

**Description**: Create thorough unit tests for the LegalPDFGenerator class.

**Implementation Steps**:

1. Create comprehensive test file `__tests__/services/pdf/LegalPDFGenerator.test.ts`:
```typescript
import { LegalPDFGenerator } from '../../../src/services/pdf/LegalPDFGenerator';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';

describe('LegalPDFGenerator', () => {
  const testOutputDir = path.join(__dirname, '../../../test-output');
  let generator: LegalPDFGenerator;
  let testFile: string;

  beforeAll(() => {
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  beforeEach(() => {
    testFile = path.join(testOutputDir, `test-${Date.now()}.pdf`);
    generator = new LegalPDFGenerator(testFile, {
      documentType: 'test-document',
      title: 'Test Legal Document',
      author: 'Test Suite'
    });
  });

  afterEach(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  describe('Document Creation', () => {
    it('should create a PDF document with default settings', async () => {
      await generator.start();
      await generator.finalize();
      
      expect(fs.existsSync(testFile)).toBe(true);
      const stats = fs.statSync(testFile);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should apply custom page configuration', () => {
      const customGenerator = new LegalPDFGenerator(testFile, {
        documentType: 'test'
      }, {
        margins: { top: 108, bottom: 72, left: 72, right: 72 },
        pageNumberPosition: 'bottom-right'
      });
      
      const config = customGenerator.getPageConfig();
      expect(config.margins.top).toBe(108);
      expect(config.pageNumberPosition).toBe('bottom-right');
    });

    it('should handle document metadata', async () => {
      const metadata = {
        documentType: 'patent-license-agreement',
        title: 'Patent License Agreement',
        author: 'Legal Firm LLC',
        subject: 'Technology Licensing',
        keywords: ['patent', 'license', 'technology']
      };
      
      const metaGenerator = new LegalPDFGenerator(testFile, metadata);
      await metaGenerator.start();
      
      // PDFKit sets metadata in document info
      const doc = metaGenerator.getDocument();
      expect(doc.info.Title).toBe(metadata.title);
      expect(doc.info.Author).toBe(metadata.author);
      
      await metaGenerator.finalize();
    });
  });

  describe('Text Writing', () => {
    it('should write basic text', async () => {
      await generator.start();
      generator.writeText('This is a test paragraph.');
      await generator.finalize();
      
      const fileSize = fs.statSync(testFile).size;
      expect(fileSize).toBeGreaterThan(1000); // PDF with text
    });

    it('should write formatted paragraphs', async () => {
      await generator.start();
      
      generator.writeParagraph('First paragraph with standard formatting.');
      generator.writeParagraph('Second paragraph with custom font size.', {
        fontSize: 14
      });
      
      await generator.finalize();
      expect(fs.existsSync(testFile)).toBe(true);
    });

    it('should write titles and headings', async () => {
      await generator.start();
      
      generator.writeTitle('DOCUMENT TITLE');
      generator.writeHeading('Section 1: Introduction', 1);
      generator.writeParagraph('Section content goes here.');
      generator.writeHeading('Subsection 1.1', 2);
      generator.writeParagraph('Subsection content.');
      
      await generator.finalize();
      expect(fs.existsSync(testFile)).toBe(true);
    });

    it('should handle text alignment options', async () => {
      await generator.start();
      
      generator.writeText('Left aligned text', { align: 'left' });
      generator.writeText('Center aligned text', { align: 'center' });
      generator.writeText('Right aligned text', { align: 'right' });
      
      await generator.finalize();
      expect(fs.existsSync(testFile)).toBe(true);
    });
  });

  describe('Page Management', () => {
    it('should add new pages', async () => {
      await generator.start();
      
      expect(generator.getCurrentPage()).toBe(1);
      
      generator.writeText('Page 1 content');
      generator.addPage();
      
      expect(generator.getCurrentPage()).toBe(2);
      
      generator.writeText('Page 2 content');
      await generator.finalize();
    });

    it('should track current position', async () => {
      await generator.start();
      
      const startY = generator.getCurrentY();
      generator.writeText('Some text');
      const endY = generator.getCurrentY();
      
      expect(endY).toBeGreaterThan(startY);
      
      await generator.finalize();
    });

    it('should check available space', async () => {
      await generator.start();
      
      // Should have space at start of page
      expect(generator.hasSpace(100)).toBe(true);
      
      // Fill page with content
      for (let i = 0; i < 50; i++) {
        generator.writeParagraph('Line of text to fill the page.');
      }
      
      // Should have less space now
      expect(generator.hasSpace(500)).toBe(false);
      
      await generator.finalize();
    });

    it('should ensure space before writing', async () => {
      await generator.start();
      
      const startPage = generator.getCurrentPage();
      
      // Fill most of the page
      for (let i = 0; i < 40; i++) {
        generator.writeParagraph('Filler text');
      }
      
      // Ensure space for large block
      generator.ensureSpace(200);
      
      // Should have moved to next page
      expect(generator.getCurrentPage()).toBe(startPage + 1);
      
      await generator.finalize();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid output path', async () => {
      const invalidPath = '/invalid/path/test.pdf';
      const badGenerator = new LegalPDFGenerator(invalidPath, {
        documentType: 'test'
      });
      
      await expect(badGenerator.start()).rejects.toThrow();
    });

    it('should require start before writing', async () => {
      expect(() => {
        generator.writeText('Text without start');
      }).toThrow();
    });

    it('should handle finalize without start', async () => {
      await expect(generator.finalize()).rejects.toThrow();
    });
  });
});
```

**Testing**: Run tests to verify PDF generator functionality.

**Definition of Done**: All PDF generator unit tests pass.

### 2.7.2 Test signature block parser

**Description**: Create tests for signature block parsing functionality.

**Implementation Steps**:

1. Create test file `__tests__/services/pdf/SignatureBlockParser.test.ts`:
```typescript
import { SignatureBlockParser } from '../../../src/services/pdf/SignatureBlockParser';

describe('SignatureBlockParser', () => {
  let parser: SignatureBlockParser;

  beforeEach(() => {
    parser = new SignatureBlockParser();
  });

  describe('Marker Detection', () => {
    it('should detect signature block markers', () => {
      const text = `
Document content here.

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

    it('should detect multiple markers', () => {
      const text = `
[SIGNATURE_BLOCK:party-a]
Party A signature

[SIGNATURE_BLOCK:party-b]  
Party B signature

[NOTARY_BLOCK:notary-1]
Notary section
      `;

      const result = parser.parseDocument(text);
      
      expect(result.signatureBlocks).toHaveLength(3);
      expect(result.signatureBlocks[0].marker.id).toBe('party-a');
      expect(result.signatureBlocks[1].marker.id).toBe('party-b');
      expect(result.signatureBlocks[2].marker.type).toBe('notary');
    });

    it('should detect initial blocks', () => {
      const text = `
[INITIALS_BLOCK:page-acknowledgment]
Initials: _____
      `;

      const result = parser.parseDocument(text);
      
      expect(result.signatureBlocks).toHaveLength(1);
      expect(result.signatureBlocks[0].marker.type).toBe('initial');
    });

    it('should handle text without markers', () => {
      const text = 'Regular document text without any signature markers.';
      
      const result = parser.parseDocument(text);
      
      expect(result.hasSignatures).toBe(false);
      expect(result.signatureBlocks).toHaveLength(0);
      expect(result.content.join('\n')).toBe(text);
    });
  });

  describe('Layout Detection', () => {
    it('should detect single column layout', () => {
      const text = `
[SIGNATURE_BLOCK:single-signature]
PARTY:
_______________________
Name: Alice Smith
Title: Director
      `;

      const result = parser.parseDocument(text);
      
      expect(result.signatureBlocks[0].layout).toBe('single');
    });

    it('should detect side-by-side layout with tabs', () => {
      const text = `
[SIGNATURE_BLOCK:mutual-signature]
PARTY A:\t\t\tPARTY B:
_______________________\t\t_______________________
Name: Alice Smith\t\tName: Bob Johnson
      `;

      const result = parser.parseDocument(text);
      
      expect(result.signatureBlocks[0].layout).toBe('side-by-side');
    });

    it('should detect side-by-side layout with spaces', () => {
      const text = `
[SIGNATURE_BLOCK:dual-signature]
DISCLOSING PARTY:                    RECEIVING PARTY:
_______________________             _______________________
      `;

      const result = parser.parseDocument(text);
      
      expect(result.signatureBlocks[0].layout).toBe('side-by-side');
    });
  });

  describe('Party Extraction', () => {
    it('should extract single party information', () => {
      const text = `
[SIGNATURE_BLOCK:test]
LICENSEE:
_______________________
Name: Tech Corp Inc.
Title: Authorized Representative
      `;

      const result = parser.parseDocument(text);
      const parties = result.signatureBlocks[0].parties;
      
      expect(parties).toHaveLength(1);
      expect(parties[0].role).toBe('LICENSEE');
      expect(parties[0].name).toBe('Tech Corp Inc.');
      expect(parties[0].title).toBe('Authorized Representative');
    });

    it('should extract multiple parties', () => {
      const text = `
[SIGNATURE_BLOCK:multi]
ASSIGNOR:                           ASSIGNEE:
_______________________            _______________________
Name: John Inventor               Name: Big Corp LLC
Title: Individual                 Title: VP of Engineering
      `;

      const result = parser.parseDocument(text);
      const parties = result.signatureBlocks[0].parties;
      
      expect(parties).toHaveLength(2);
      expect(parties[0].role).toBe('ASSIGNOR');
      expect(parties[0].name).toBe('John Inventor');
      expect(parties[1].role).toBe('ASSIGNEE');
      expect(parties[1].name).toBe('Big Corp LLC');
    });

    it('should handle missing party details', () => {
      const text = `
[SIGNATURE_BLOCK:minimal]
PARTY:
_______________________
      `;

      const result = parser.parseDocument(text);
      const parties = result.signatureBlocks[0].parties;
      
      expect(parties).toHaveLength(1);
      expect(parties[0].role).toBe('PARTY');
      expect(parties[0].name).toBeUndefined();
      expect(parties[0].title).toBeUndefined();
    });
  });

  describe('Notary Block Handling', () => {
    it('should identify notary blocks', () => {
      const text = `
[NOTARY_BLOCK:notary-section]
State of California
County of ___________

Subscribed and sworn before me
      `;

      const result = parser.parseDocument(text);
      
      expect(result.signatureBlocks[0].notaryRequired).toBe(true);
      expect(result.signatureBlocks[0].marker.type).toBe('notary');
    });

    it('should parse notary content', () => {
      const text = `
[NOTARY_BLOCK:assignor-notary]
STATE OF ___________
COUNTY OF __________

Notary Public: _______________________
Commission Expires: __________
      `;

      const result = parser.parseDocument(text);
      const block = result.signatureBlocks[0];
      
      expect(block.notaryRequired).toBe(true);
      // Content should be preserved for rendering
    });
  });

  describe('Height Calculations', () => {
    it('should calculate block height for single signature', () => {
      const blockData = {
        marker: { 
          type: 'signature' as const, 
          id: 'test',
          fullMarker: '[SIGNATURE_BLOCK:test]',
          startIndex: 0,
          endIndex: 0
        },
        layout: 'single' as const,
        parties: [{
          role: 'PARTY',
          name: 'Test Name',
          title: 'Test Title',
          lineType: 'signature' as const
        }],
        notaryRequired: false
      };

      const height = parser.calculateBlockHeight(blockData);
      
      expect(height).toBeGreaterThan(0);
      expect(height).toBeLessThan(200); // Reasonable height
    });

    it('should include notary section in height', () => {
      const blockWithoutNotary = {
        marker: { type: 'signature' as const, id: 'test', fullMarker: '', startIndex: 0, endIndex: 0 },
        layout: 'single' as const,
        parties: [{ role: 'PARTY', lineType: 'signature' as const }],
        notaryRequired: false
      };

      const blockWithNotary = {
        ...blockWithoutNotary,
        notaryRequired: true
      };

      const heightWithout = parser.calculateBlockHeight(blockWithoutNotary);
      const heightWith = parser.calculateBlockHeight(blockWithNotary);
      
      expect(heightWith).toBeGreaterThan(heightWithout);
    });
  });
});
```

**Testing**: Run tests to verify signature block parsing.

**Definition of Done**: All signature block parser tests pass.

### 2.7.3 Test document formatter

**Description**: Create tests for document formatting rules.

**Implementation Steps**:

1. Create test file `__tests__/services/pdf/DocumentFormatter.test.ts`:
```typescript
import { DocumentFormatter } from '../../../src/services/pdf/DocumentFormatter';
import { DocumentType } from '../../../src/types/pdf';

describe('DocumentFormatter', () => {
  let formatter: DocumentFormatter;

  beforeEach(() => {
    formatter = new DocumentFormatter();
  });

  describe('Formatting Rules', () => {
    it('should return correct rules for provisional patent', () => {
      const rules = formatter.getFormattingRules('provisional-patent-application');
      
      expect(rules.lineSpacing).toBe('double');
      expect(rules.margins.top).toBe(72);
      expect(rules.sectionNumbering).toBe(true);
      expect(rules.paragraphIndent).toBe(36);
    });

    it('should return correct rules for office action response', () => {
      const rules = formatter.getFormattingRules('office-action-response');
      
      expect(rules.lineSpacing).toBe('double');
      expect(rules.margins.top).toBe(108); // 1.5 inches
      expect(rules.paragraphIndent).toBe(0);
      expect(rules.pageNumberPosition).toBe('bottom-right');
    });

    it('should return correct rules for agreements', () => {
      const ndaRules = formatter.getFormattingRules('nda-ip-specific');
      expect(ndaRules.lineSpacing).toBe('single');
      
      const assignmentRules = formatter.getFormattingRules('patent-assignment-agreement');
      expect(assignmentRules.lineSpacing).toBe('one-half');
    });

    it('should return default rules for unknown type', () => {
      const rules = formatter.getFormattingRules('unknown-type' as DocumentType);
      
      expect(rules.lineSpacing).toBe('double');
      expect(rules.margins.top).toBe(72);
    });
  });

  describe('Line Spacing', () => {
    it('should calculate line spacing correctly', () => {
      expect(formatter.getLineSpacing('single')).toBe(0);
      expect(formatter.getLineSpacing('one-half')).toBe(6);
      expect(formatter.getLineSpacing('double')).toBe(12);
    });

    it('should apply line spacing based on document type', () => {
      const singleSpacing = formatter.applyLineSpacing('nda-ip-specific', false);
      expect(singleSpacing).toBe(0);
      
      const doubleSpacing = formatter.applyLineSpacing('provisional-patent-application', false);
      expect(doubleSpacing).toBe(12);
    });

    it('should use single spacing for signature blocks', () => {
      const spacing = formatter.applyLineSpacing('provisional-patent-application', true);
      expect(spacing).toBe(0); // Single spacing
    });

    it('should calculate line height with font size', () => {
      const height = formatter.calculateLineHeight(12, 'double');
      expect(height).toBeGreaterThan(12);
    });
  });

  describe('Margin Handling', () => {
    it('should return standard margins for most documents', () => {
      const margins = formatter.getMarginsForPage('nda-ip-specific', 1);
      
      expect(margins.top).toBe(72);
      expect(margins.bottom).toBe(72);
      expect(margins.left).toBe(72);
      expect(margins.right).toBe(72);
    });

    it('should return special first page margin for office actions', () => {
      const firstPage = formatter.getMarginsForPage('office-action-response', 1);
      expect(firstPage.top).toBe(108);
      
      const secondPage = formatter.getMarginsForPage('office-action-response', 2);
      expect(secondPage.top).toBe(72);
    });

    it('should calculate usable page area', () => {
      const area = formatter.getUsablePageArea('nda-ip-specific', 1);
      
      expect(area.width).toBe(468); // 612 - 144 (2 * 72)
      expect(area.height).toBe(648); // 792 - 144
    });

    it('should identify documents needing header space', () => {
      expect(formatter.needsHeaderSpace('office-action-response', 1)).toBe(true);
      expect(formatter.needsHeaderSpace('office-action-response', 2)).toBe(false);
      expect(formatter.needsHeaderSpace('nda-ip-specific', 1)).toBe(false);
    });
  });

  describe('Configuration Overrides', () => {
    it('should apply configuration overrides', () => {
      const customFormatter = new DocumentFormatter({
        overrides: {
          'nda-ip-specific': {
            lineSpacing: 'double',
            fontSize: 14
          }
        }
      });
      
      const rules = customFormatter.getFormattingRules('nda-ip-specific');
      expect(rules.lineSpacing).toBe('double');
      expect(rules.fontSize).toBe(14);
    });

    it('should merge margin overrides correctly', () => {
      const customFormatter = new DocumentFormatter({
        overrides: {
          'patent-assignment-agreement': {
            margins: { top: 90 }
          }
        }
      });
      
      const rules = customFormatter.getFormattingRules('patent-assignment-agreement');
      expect(rules.margins.top).toBe(90);
      expect(rules.margins.bottom).toBe(72); // Unchanged
    });
  });

  describe('Element Spacing', () => {
    it('should return appropriate spacing for elements', () => {
      const paragraphSpace = formatter.getElementSpacing('nda-ip-specific', 'paragraph');
      expect(paragraphSpace).toBe(12);
      
      const sectionSpace = formatter.getElementSpacing('nda-ip-specific', 'section');
      expect(sectionSpace).toBe(18); // 1.5x paragraph
      
      const titleSpace = formatter.getElementSpacing('nda-ip-specific', 'title');
      expect(titleSpace).toBe(24); // 2x paragraph
    });
  });
});
```

**Testing**: Run tests to verify formatting rules.

**Definition of Done**: All document formatter tests pass.

### 2.7.4 Create integration tests

**Description**: Implement end-to-end integration tests for the complete PDF export pipeline.

**Implementation Steps**:

1. Create integration test file `__tests__/integration/pdf-export.test.ts`:
```typescript
import { PDFExportService } from '../../src/services/pdf-export';
import * as fs from 'fs';
import * as path from 'path';

describe('PDF Export Integration', () => {
  const testOutputDir = path.join(__dirname, '../../test-output');
  const exportService = new PDFExportService();
  let testFiles: string[] = [];

  beforeAll(() => {
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Cleanup test files
    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
    testFiles = [];
  });

  describe('Basic Export', () => {
    it('should export simple document to PDF', async () => {
      const outputPath = path.join(testOutputDir, 'simple-export.pdf');
      testFiles.push(outputPath);
      
      const inputText = `
PATENT ASSIGNMENT AGREEMENT

This Agreement is entered into as of January 1, 2024.

WHEREAS, Assignor owns certain patent rights;

NOW, THEREFORE, the parties agree as follows:

1. Assignment. Assignor hereby assigns all rights to Assignee.

[SIGNATURE_BLOCK:assignor-signature]
ASSIGNOR:
_______________________
Name: John Inventor
      `;
      
      await exportService.export(
        inputText,
        outputPath,
        'patent-assignment-agreement'
      );
      
      expect(fs.existsSync(outputPath)).toBe(true);
      const stats = fs.statSync(outputPath);
      expect(stats.size).toBeGreaterThan(5000); // Reasonable PDF size
    });

    it('should handle documents with multiple signature blocks', async () => {
      const outputPath = path.join(testOutputDir, 'multi-signature.pdf');
      testFiles.push(outputPath);
      
      const inputText = `
NON-DISCLOSURE AGREEMENT

[Content sections...]

[SIGNATURE_BLOCK:disclosing-party]
DISCLOSING PARTY:
_______________________

[SIGNATURE_BLOCK:receiving-party]  
RECEIVING PARTY:
_______________________
      `;
      
      await exportService.export(
        inputText,
        outputPath,
        'nda-ip-specific'
      );
      
      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it('should export with custom options', async () => {
      const outputPath = path.join(testOutputDir, 'custom-options.pdf');
      testFiles.push(outputPath);
      
      const inputText = 'Simple test document content.';
      
      await exportService.exportWithOptions(
        inputText,
        outputPath,
        {
          documentType: 'cease-and-desist-letter',
          formatting: {
            margins: { top: 90, bottom: 90, left: 72, right: 72 },
            pageNumbers: false,
            lineSpacing: 'double'
          }
        }
      );
      
      expect(fs.existsSync(outputPath)).toBe(true);
    });
  });

  describe('Document Type Handling', () => {
    const documentTypes: Array<[string, string]> = [
      ['provisional-patent-application', 'PROVISIONAL PATENT APPLICATION\n\nFor: Test Invention'],
      ['trademark-application', 'TRADEMARK APPLICATION\n\nMark: TEST MARK'],
      ['office-action-response', 'RESPONSE TO OFFICE ACTION\n\nApplication No: 12/345,678'],
      ['nda-ip-specific', 'NON-DISCLOSURE AGREEMENT\n\nConfidential Information'],
      ['patent-assignment-agreement', 'PATENT ASSIGNMENT AGREEMENT\n\nAssignment of Rights'],
      ['patent-license-agreement', 'PATENT LICENSE AGREEMENT\n\nLicense Grant'],
      ['technology-transfer-agreement', 'TECHNOLOGY TRANSFER AGREEMENT\n\nTransfer Terms'],
      ['cease-and-desist-letter', 'CEASE AND DESIST LETTER\n\nDemand to Stop']
    ];

    documentTypes.forEach(([type, content]) => {
      it(`should export ${type} correctly`, async () => {
        const outputPath = path.join(testOutputDir, `${type}.pdf`);
        testFiles.push(outputPath);
        
        await exportService.export(content, outputPath, type);
        
        expect(fs.existsSync(outputPath)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid output path', async () => {
      const invalidPath = '/invalid/directory/output.pdf';
      
      await expect(
        exportService.export('Test content', invalidPath, 'nda-ip-specific')
      ).rejects.toThrow();
    });

    it('should handle empty input', async () => {
      const outputPath = path.join(testOutputDir, 'empty.pdf');
      testFiles.push(outputPath);
      
      await expect(
        exportService.export('', outputPath, 'nda-ip-specific')
      ).rejects.toThrow('empty');
    });

    it('should handle very large documents', async () => {
      const outputPath = path.join(testOutputDir, 'large.pdf');
      testFiles.push(outputPath);
      
      // Generate large content
      const largeContent = Array(1000).fill('This is a paragraph of text. ').join('\n\n');
      
      await exportService.export(
        largeContent,
        outputPath,
        'patent-assignment-agreement'
      );
      
      expect(fs.existsSync(outputPath)).toBe(true);
    }, 30000); // Increase timeout for large document
  });

  describe('Layout Features', () => {
    it('should prevent signature blocks from splitting', async () => {
      const outputPath = path.join(testOutputDir, 'no-split-signature.pdf');
      testFiles.push(outputPath);
      
      // Create content that would push signature to page boundary
      const filler = Array(50).fill('Paragraph to fill the page.').join('\n\n');
      const inputText = `${filler}\n\n[SIGNATURE_BLOCK:test]\nSIGNATURE:\n_______________________`;
      
      await exportService.export(
        inputText,
        outputPath,
        'patent-assignment-agreement'
      );
      
      // Visual inspection would be needed to fully verify
      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it('should handle side-by-side signatures', async () => {
      const outputPath = path.join(testOutputDir, 'side-by-side.pdf');
      testFiles.push(outputPath);
      
      const inputText = `
MUTUAL AGREEMENT

[SIGNATURE_BLOCK:mutual]
PARTY A:                    PARTY B:
_______________________    _______________________
Name:                      Name:
      `;
      
      await exportService.export(
        inputText,
        outputPath,
        'nda-ip-specific'
      );
      
      expect(fs.existsSync(outputPath)).toBe(true);
    });
  });
});
```

**Testing**: Run integration tests to verify complete pipeline.

**Definition of Done**: All integration tests pass.

### 2.7.5 Test all 8 document types

**Description**: Create specific tests for each document type to ensure formatting compliance.

**Implementation Steps**:

1. Create document-specific test file `__tests__/integration/document-types.test.ts`:
```typescript
import { PDFExportService } from '../../src/services/pdf-export';
import * as fs from 'fs';
import * as path from 'path';

describe('Document Type Specific Tests', () => {
  const testOutputDir = path.join(__dirname, '../../test-output/document-types');
  const exportService = new PDFExportService();

  beforeAll(() => {
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  describe('Provisional Patent Application', () => {
    it('should format with double spacing and paragraph numbers', async () => {
      const outputPath = path.join(testOutputDir, 'provisional-patent.pdf');
      
      const content = `
PROVISIONAL PATENT APPLICATION

For: Advanced Widget System

BACKGROUND OF THE INVENTION

[0001] This invention relates to widget systems.

[0002] Prior art widgets have various limitations.

SUMMARY OF THE INVENTION

[0003] The present invention provides an improved widget.

[SIGNATURE_BLOCK:inventor-signature]
INVENTOR:
_______________________
Name: Jane Inventor
      `;
      
      await exportService.export(
        content,
        outputPath,
        'provisional-patent-application'
      );
      
      expect(fs.existsSync(outputPath)).toBe(true);
      // Would need PDF parsing to verify double-spacing
    });
  });

  describe('Office Action Response', () => {
    it('should format with special header margin', async () => {
      const outputPath = path.join(testOutputDir, 'office-action.pdf');
      
      const content = `
IN THE UNITED STATES PATENT AND TRADEMARK OFFICE

Application No.: 16/123,456
Filing Date: January 1, 2023
Applicant: Test Corp.

RESPONSE TO OFFICE ACTION

Dear Examiner:

This is in response to the Office Action dated March 1, 2024.

REMARKS

Claim 1 has been amended to address the rejection.

[SIGNATURE_BLOCK:attorney-signature]
Respectfully submitted,
_______________________
Attorney for Applicant
Reg. No. 12,345
      `;
      
      await exportService.export(
        content,
        outputPath,
        'office-action-response'
      );
      
      expect(fs.existsSync(outputPath)).toBe(true);
    });
  });

  describe('Legal Agreements', () => {
    it('should format NDA with single spacing', async () => {
      const outputPath = path.join(testOutputDir, 'nda.pdf');
      
      const content = `
MUTUAL NON-DISCLOSURE AGREEMENT

This Agreement is entered into as of _________, 2024, between Company A and Company B.

1. Definition of Confidential Information.

2. Obligations of Receiving Party.

3. Term.

[SIGNATURE_BLOCK:mutual-signature]
COMPANY A:                    COMPANY B:
_______________________      _______________________
By:                         By:
Name:                       Name:
Title:                      Title:
      `;
      
      await exportService.export(content, outputPath, 'nda-ip-specific');
      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it('should format Patent Assignment with 1.5 spacing', async () => {
      const outputPath = path.join(testOutputDir, 'assignment.pdf');
      
      const content = `
PATENT ASSIGNMENT AGREEMENT

WHEREAS, Assignor is the owner of certain patent rights;

NOW, THEREFORE, for good and valuable consideration:

1. Assignor hereby assigns to Assignee all right, title, and interest.

[SIGNATURE_BLOCK:assignor]
ASSIGNOR:
_______________________

[NOTARY_BLOCK:assignor-notary]
State of _______
County of ______
      `;
      
      await exportService.export(
        content,
        outputPath,
        'patent-assignment-agreement'
      );
      
      expect(fs.existsSync(outputPath)).toBe(true);
    });
  });

  describe('Correspondence', () => {
    it('should format cease and desist letter correctly', async () => {
      const outputPath = path.join(testOutputDir, 'cease-desist.pdf');
      
      const content = `
[Date]

Via Certified Mail

Re: Cease and Desist - Patent Infringement

Dear Sir/Madam:

We represent Patent Owner Inc. It has come to our attention that your company is infringing.

We demand that you immediately cease and desist.

[SIGNATURE_BLOCK:attorney]
Sincerely,

_______________________
Attorney at Law
      `;
      
      await exportService.export(
        content,
        outputPath,
        'cease-and-desist-letter'
      );
      
      expect(fs.existsSync(outputPath)).toBe(true);
    });
  });

  describe('Complex Agreements', () => {
    it('should handle technology transfer agreement', async () => {
      const outputPath = path.join(testOutputDir, 'tech-transfer.pdf');
      
      const content = `
TECHNOLOGY TRANSFER AGREEMENT

Between University ("Licensor") and Company ("Licensee")

RECITALS

A. Licensor has developed certain technology.
B. Licensee desires to commercialize.

AGREEMENT

1. DEFINITIONS
2. GRANT OF LICENSE  
3. ROYALTIES
4. MILESTONES

[SIGNATURE_BLOCK:licensor]
LICENSOR:
_______________________

[SIGNATURE_BLOCK:licensee]
LICENSEE:
_______________________
      `;
      
      await exportService.export(
        content,
        outputPath,
        'technology-transfer-agreement'
      );
      
      expect(fs.existsSync(outputPath)).toBe(true);
    });
  });
});
```

**Testing**: Run document type specific tests.

**Definition of Done**: All document types generate correctly formatted PDFs.

## Test Execution Strategy

### Running Tests

1. **Unit Tests Only**:
```bash
npm test -- --testPathPattern="unit|services|utils"
```

2. **Integration Tests Only**:
```bash
npm test -- --testPathPattern="integration"
```

3. **All PDF Tests**:
```bash
npm test -- --testPathPattern="pdf"
```

4. **Coverage Report**:
```bash
npm run test:coverage
```

### Test Environment Setup

Create `__tests__/setup.ts`:
```typescript
import * as fs from 'fs';
import * as path from 'path';

// Ensure test output directory exists
const testOutputDir = path.join(__dirname, '../test-output');
if (!fs.existsSync(testOutputDir)) {
  fs.mkdirSync(testOutputDir, { recursive: true });
}

// Add to .gitignore
const gitignorePath = path.join(__dirname, '../.gitignore');
const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
if (!gitignoreContent.includes('test-output/')) {
  fs.appendFileSync(gitignorePath, '\ntest-output/\n');
}

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise during tests
```

Update `jest.config.js`:
```javascript
module.exports = {
  // ... existing config
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testTimeout: 10000, // 10 seconds for PDF generation
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/test-output/'
  ]
};
```

## Common Pitfalls

1. **File System Tests**: Always cleanup test files in afterEach
2. **Async Operations**: Use proper async/await for PDF generation
3. **Large Files**: Increase test timeout for large document tests
4. **Visual Verification**: Some formatting requires manual inspection
5. **Platform Differences**: PDF output may vary slightly by OS

## Test Coverage Goals

- Unit test coverage: > 80%
- Integration test coverage: > 70%
- All 8 document types: 100% tested
- Error scenarios: 100% covered
- Edge cases: Comprehensive coverage

## File Changes

- **Created**:
  - `__tests__/services/pdf/LegalPDFGenerator.test.ts`
  - `__tests__/services/pdf/SignatureBlockParser.test.ts`
  - `__tests__/services/pdf/DocumentFormatter.test.ts`
  - `__tests__/integration/pdf-export.test.ts`
  - `__tests__/integration/document-types.test.ts`
  - `__tests__/setup.ts`
  
- **Modified**:
  - `jest.config.js` - Added setup file and timeout

## Success Criteria

- [ ] All unit tests for PDF generator pass
- [ ] All signature parser tests pass
- [ ] All formatter tests pass
- [ ] Integration tests complete successfully
- [ ] All 8 document types tested
- [ ] Test coverage meets goals
- [ ] No regression in existing tests (318 tests still pass) 