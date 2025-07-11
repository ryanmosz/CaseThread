import { PDFExportService, PDFExportOptions } from '../../src/services/pdf-export';
import * as fs from 'fs/promises';
import * as path from 'path';

// Set test mode to ensure output goes to test directory
process.env.TEST_MODE = 'true';
process.env.TEST_NAME = 'pdf-export-service';

// Mock the PDF components
jest.mock('../../src/services/pdf/LegalPDFGenerator');
jest.mock('../../src/services/pdf/DocumentFormatter');
jest.mock('../../src/services/pdf/SignatureBlockParser');
jest.mock('../../src/services/pdf/PDFLayoutEngine');
jest.mock('../../src/config/pdf-formatting');

describe('PDFExportService', () => {
  let service: PDFExportService;
  let mockGenerator: any;
  let mockFormatter: any;
  let mockParser: any;
  let mockLayoutEngine: any;
  let mockConfig: any;

  const testDir = path.join(__dirname, '../../docs/testing/test-results/pdf-export-service');
  const testPdfPath = path.join(testDir, 'test-output.pdf');

  beforeEach(async () => {
    // Ensure test directory exists
    await fs.mkdir(testDir, { recursive: true });

    // Clear all mocks
    jest.clearAllMocks();

    // Create service instance
    service = new PDFExportService();

    // Setup mock implementations
    const { LegalPDFGenerator } = require('../../src/services/pdf/LegalPDFGenerator');
    const { DocumentFormatter } = require('../../src/services/pdf/DocumentFormatter');
    const { SignatureBlockParser } = require('../../src/services/pdf/SignatureBlockParser');
    const { PDFLayoutEngine } = require('../../src/services/pdf/PDFLayoutEngine');
    const { FormattingConfiguration } = require('../../src/config/pdf-formatting');

    // Mock generator methods
    mockGenerator = {
      start: jest.fn().mockResolvedValue(undefined),
      finalize: jest.fn().mockResolvedValue(undefined),
      setFont: jest.fn(),
      setMargins: jest.fn(),
      newPage: jest.fn(),
      writeHeading: jest.fn(),
      writeParagraph: jest.fn(),
      writeText: jest.fn(),
      addSpace: jest.fn(),
      moveTo: jest.fn(),
      getCurrentY: jest.fn().mockReturnValue(100),
      getPageDimensions: jest.fn().mockReturnValue({ width: 612, height: 792 }),
      addPageNumberToCurrentPage: jest.fn()
    };
    LegalPDFGenerator.mockImplementation(() => mockGenerator);

    // Mock formatter methods
    mockFormatter = {
      getFormattingRules: jest.fn().mockReturnValue({
        lineSpacing: 'double',
        fontSize: 12,
        font: 'Times-Roman',
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        pageNumberPosition: 'bottom-center',
        titleCase: false,
        sectionNumbering: true,
        paragraphIndent: 36,
        paragraphSpacing: 12,
        blockQuoteIndent: 36,
        signatureLineSpacing: 'single'
      }),
      getMarginsForPage: jest.fn().mockReturnValue({ top: 72, bottom: 72, left: 72, right: 72 }),
      applyLineSpacing: jest.fn().mockReturnValue(12)
    };
    DocumentFormatter.mockImplementation(() => mockFormatter);

    // Mock parser methods
    mockParser = {
      parseDocument: jest.fn().mockReturnValue({
        content: [
          'PROVISIONAL PATENT APPLICATION',
          'For: Test Invention',
          '',
          'This is a test document.',
          '[SIGNATURE_BLOCK:inventor]',
          'Inventor signature block'
        ],
        signatureBlocks: [{
          marker: {
            type: 'signature',
            id: 'inventor',
            fullMarker: '[SIGNATURE_BLOCK:inventor]',
            startIndex: 0,
            endIndex: 25
          },
          layout: 'single',
          parties: [{
            role: 'INVENTOR',
            name: 'John Doe',
            title: 'Inventor',
            date: 'Date'
          }],
          notaryRequired: false
        }],
        hasSignatures: true
      })
    };
    SignatureBlockParser.mockImplementation(() => mockParser);

    // Mock layout engine methods
    mockLayoutEngine = {
      layoutDocument: jest.fn().mockReturnValue({
        pages: [{
          blocks: [
            { type: 'heading', content: 'PROVISIONAL PATENT APPLICATION', height: 20, breakable: false },
            { type: 'text', content: 'For: Test Invention', height: 15, breakable: true },
            { type: 'text', content: 'This is a test document.', height: 15, breakable: true },
            { type: 'signature', content: mockParser.parseDocument().signatureBlocks[0], height: 100, breakable: false }
          ],
          remainingHeight: 500,
          pageNumber: 1
        }],
        totalPages: 1,
        hasOverflow: false
      })
    };
    PDFLayoutEngine.mockImplementation(() => mockLayoutEngine);

    // Mock configuration
    mockConfig = {
      applyOverrides: jest.fn(),
      getConfig: jest.fn().mockReturnValue({}),
      updateConfig: jest.fn()
    };
    FormattingConfiguration.mockImplementation(() => mockConfig);
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink(testPdfPath);
    } catch {}
  });

  describe('export', () => {
    const sampleText = `PROVISIONAL PATENT APPLICATION
For: Test Invention

This is a test document.

[SIGNATURE_BLOCK:inventor]
_________________________________
John Doe
Inventor`;

    it('should export text to PDF successfully', async () => {
      await service.export(sampleText, testPdfPath, 'provisional-patent-application');

      // Verify all components were initialized
      const { LegalPDFGenerator } = require('../../src/services/pdf/LegalPDFGenerator');
      const { DocumentFormatter } = require('../../src/services/pdf/DocumentFormatter');
      const { SignatureBlockParser } = require('../../src/services/pdf/SignatureBlockParser');
      const { PDFLayoutEngine } = require('../../src/services/pdf/PDFLayoutEngine');
      
      expect(LegalPDFGenerator).toHaveBeenCalled();
      expect(DocumentFormatter).toHaveBeenCalled();
      expect(SignatureBlockParser).toHaveBeenCalled();
      expect(PDFLayoutEngine).toHaveBeenCalled();

      // Verify PDF generation flow
      expect(mockParser.parseDocument).toHaveBeenCalledWith(sampleText);
      expect(mockFormatter.getFormattingRules).toHaveBeenCalledWith('provisional-patent-application');
      expect(mockLayoutEngine.layoutDocument).toHaveBeenCalled();
      expect(mockGenerator.start).toHaveBeenCalled();
      expect(mockGenerator.finalize).toHaveBeenCalled();
    });

    it('should apply formatting overrides', async () => {
      const options: PDFExportOptions = {
        lineSpacing: 'single',
        fontSize: 14,
        margins: { top: 90, bottom: 90, left: 90, right: 90 }
      };

      await service.export(sampleText, testPdfPath, 'nda-ip-specific', options);

      expect(mockConfig.updateConfig).toHaveBeenCalledWith({
        overrides: {
          'nda-ip-specific': {
            lineSpacing: 'single',
            fontSize: 14,
            margins: { top: 90, bottom: 90, left: 90, right: 90 }
          }
        }
      });
    });

    it('should set document metadata', async () => {
      const options: PDFExportOptions = {
        metadata: {
          title: 'Test Document',
          author: 'Test Author',
          subject: 'Test Subject',
          keywords: ['test', 'document']
        }
      };

      await service.export(sampleText, testPdfPath, 'patent-assignment-agreement', options);

      // Verify generator was initialized with correct metadata
      const { LegalPDFGenerator } = require('../../src/services/pdf/LegalPDFGenerator');
      expect(LegalPDFGenerator).toHaveBeenCalledWith(
        testPdfPath,
        expect.objectContaining({
          documentType: 'patent-assignment-agreement',
          title: 'Test Document',
          author: 'Test Author',
          subject: 'Test Subject',
          keywords: ['test', 'document']
        })
      );
    });

    it('should handle page numbering', async () => {
      await service.export(sampleText, testPdfPath, 'trademark-application');

      expect(mockGenerator.addPageNumberToCurrentPage).toHaveBeenCalled();
    });

    it('should disable page numbering when requested', async () => {
      const options: PDFExportOptions = {
        pageNumbers: false
      };

      await service.export(sampleText, testPdfPath, 'cease-and-desist-letter', options);

      expect(mockGenerator.addPageNumberToCurrentPage).not.toHaveBeenCalled();
    });

    it('should handle multi-page documents', async () => {
      // Mock multi-page layout
      mockLayoutEngine.layoutDocument.mockReturnValueOnce({
        pages: [
          {
            blocks: [
              { type: 'heading', content: 'Page 1 Heading', height: 20, breakable: false },
              { type: 'text', content: 'Page 1 content', height: 15, breakable: true }
            ],
            remainingHeight: 100,
            pageNumber: 1
          },
          {
            blocks: [
              { type: 'text', content: 'Page 2 content', height: 15, breakable: true },
              { type: 'signature', content: mockParser.parseDocument().signatureBlocks[0], height: 100, breakable: false }
            ],
            remainingHeight: 500,
            pageNumber: 2
          }
        ],
        totalPages: 2,
        hasOverflow: false
      });

      await service.export(sampleText, testPdfPath, 'office-action-response');

      expect(mockGenerator.newPage).toHaveBeenCalledTimes(1);
      expect(mockGenerator.addPageNumberToCurrentPage).toHaveBeenCalledTimes(2);
    });

    it('should handle office action specific margins', async () => {
      // Mock office action margins
      mockFormatter.getMarginsForPage
        .mockReturnValueOnce({ top: 108, bottom: 72, left: 72, right: 72 }) // Page 1
        .mockReturnValueOnce({ top: 72, bottom: 72, left: 72, right: 72 });  // Page 2

      await service.export(sampleText, testPdfPath, 'office-action-response');

      expect(mockFormatter.getMarginsForPage).toHaveBeenCalledWith('office-action-response', 1);
      // Note: setMargins doesn't exist, margins are handled in constructor
    });

    it('should render signature blocks correctly', async () => {
      await service.export(sampleText, testPdfPath, 'patent-license-agreement');

      // Verify signature rendering
      expect(mockGenerator.writeText).toHaveBeenCalledWith('_________________________________', { fontSize: 10 });
      expect(mockGenerator.writeText).toHaveBeenCalledWith('John Doe', { fontSize: 10 });
      expect(mockGenerator.writeText).toHaveBeenCalledWith('Title: Inventor', { fontSize: 10 });
      expect(mockGenerator.writeText).toHaveBeenCalledWith('Date: _______________________', { fontSize: 10 });
    });

    it('should handle side-by-side signature layout', async () => {
      // Mock side-by-side signature block
      mockParser.parseDocument.mockReturnValueOnce({
        content: ['Test content', '[SIGNATURE_BLOCK:parties]'],
        signatureBlocks: [{
          marker: {
            type: 'signature',
            id: 'parties',
            fullMarker: '[SIGNATURE_BLOCK:parties]',
            startIndex: 0,
            endIndex: 25
          },
          layout: 'side-by-side',
          parties: [
            { role: 'ASSIGNOR', name: 'John Doe', title: 'CEO', company: 'Company A' },
            { role: 'ASSIGNEE', name: 'Jane Smith', title: 'CTO', company: 'Company B' }
          ],
          notaryRequired: false
        }],
        hasSignatures: true
      });

      mockLayoutEngine.layoutDocument.mockReturnValueOnce({
        pages: [{
          blocks: [
            { type: 'text', content: 'Test content', height: 15, breakable: true },
            { 
              type: 'signature', 
              content: {
                marker: { type: 'signature', id: 'parties', fullMarker: '[SIGNATURE_BLOCK:parties]', startIndex: 0, endIndex: 25 },
                layout: 'side-by-side',
                parties: [
                  { role: 'ASSIGNOR', name: 'John Doe', title: 'CEO', company: 'Company A' },
                  { role: 'ASSIGNEE', name: 'Jane Smith', title: 'CTO', company: 'Company B' }
                ],
                notaryRequired: false
              },
              height: 100, 
              breakable: false 
            }
          ],
          remainingHeight: 500,
          pageNumber: 1
        }],
        totalPages: 1,
        hasOverflow: false
      });

      await service.export(sampleText, testPdfPath, 'technology-transfer-agreement');

      // Verify side-by-side positioning
      expect(mockGenerator.moveTo).toHaveBeenCalledTimes(3); // Initial + 2 columns + reset
      expect(mockGenerator.getCurrentY).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockGenerator.start.mockRejectedValueOnce(new Error('PDF generation failed'));

      await expect(service.export(sampleText, testPdfPath, 'nda-ip-specific'))
        .rejects.toThrow('PDF export failed: PDF generation failed');
    });

    it('should handle empty documents', async () => {
      mockParser.parseDocument.mockReturnValueOnce({
        content: [],
        signatureBlocks: [],
        hasSignatures: false
      });

      mockLayoutEngine.layoutDocument.mockReturnValueOnce({
        pages: [{
          blocks: [],
          remainingHeight: 648,
          pageNumber: 1
        }],
        totalPages: 1,
        hasOverflow: false
      });

      await service.export('', testPdfPath, 'patent-assignment-agreement');

      expect(mockGenerator.finalize).toHaveBeenCalled();
    });

    it('should detect headings correctly', async () => {
      const textWithHeadings = `TITLE IN ALL CAPS
1. Numbered Section
II. Roman Numeral Section
Regular paragraph text here.`;

      mockParser.parseDocument.mockReturnValueOnce({
        content: textWithHeadings.split('\n'),
        signatureBlocks: [],
        hasSignatures: false
      });

      await service.export(textWithHeadings, testPdfPath, 'provisional-patent-application');

      // Verify layout engine was called with heading blocks
      const layoutCall = mockLayoutEngine.layoutDocument.mock.calls[0][0];
      expect(layoutCall).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'heading', content: 'TITLE IN ALL CAPS' }),
        expect.objectContaining({ type: 'heading', content: '1. Numbered Section' }),
        expect.objectContaining({ type: 'heading', content: 'II. Roman Numeral Section' }),
        expect.objectContaining({ type: 'text', content: 'Regular paragraph text here.' })
      ]));
    });

    it('should detect and handle horizontal rules', async () => {
      const textWithRules = `Section 1
Content for section 1.

---

Section 2
Content for section 2.

___

Section 3
Content for section 3.

***`;

      mockParser.parseDocument.mockReturnValueOnce({
        content: textWithRules.split('\n'),
        signatureBlocks: [],
        hasSignatures: false
      });

      // Add mock for drawHorizontalLine
      mockGenerator.drawHorizontalLine = jest.fn();

      await service.export(textWithRules, testPdfPath, 'patent-assignment-agreement');

      // Verify layout engine was called with horizontal rule blocks
      const layoutCall = mockLayoutEngine.layoutDocument.mock.calls[0][0];
      const hrBlocks = layoutCall.filter((block: any) => block.type === 'horizontal-rule');
      expect(hrBlocks).toHaveLength(3);
      
      // Each horizontal rule should have standard properties
      hrBlocks.forEach((block: any) => {
        expect(block).toMatchObject({
          type: 'horizontal-rule',
          content: '',
          height: 20,
          breakable: false,
          keepWithNext: false
        });
      });
    });

    it('should render horizontal rule blocks with drawHorizontalLine', async () => {
      // Mock layout with a horizontal rule block
      mockLayoutEngine.layoutDocument.mockReturnValueOnce({
        pages: [{
          blocks: [
            { type: 'text', content: 'Before rule', height: 15, breakable: true },
            { type: 'horizontal-rule', content: '', height: 20, breakable: false },
            { type: 'text', content: 'After rule', height: 15, breakable: true }
          ],
          remainingHeight: 500,
          pageNumber: 1
        }],
        totalPages: 1,
        hasOverflow: false
      });

      // Add mock for drawHorizontalLine
      mockGenerator.drawHorizontalLine = jest.fn();

      await service.export('Before rule\n---\nAfter rule', testPdfPath, 'patent-assignment-agreement');

      // Verify drawHorizontalLine was called
      expect(mockGenerator.drawHorizontalLine).toHaveBeenCalledTimes(1);
      expect(mockGenerator.drawHorizontalLine).toHaveBeenCalledWith();
    });
  });

  describe('integration with all document types', () => {
    const documentTypes = [
      'provisional-patent-application',
      'trademark-application',
      'office-action-response',
      'nda-ip-specific',
      'patent-assignment-agreement',
      'patent-license-agreement',
      'technology-transfer-agreement',
      'cease-and-desist-letter'
    ];

    documentTypes.forEach(docType => {
      it(`should export ${docType} successfully`, async () => {
        const sampleText = `Sample ${docType} document\n\n[SIGNATURE_BLOCK:test]`;
        
        await service.export(sampleText, testPdfPath, docType);

        expect(mockFormatter.getFormattingRules).toHaveBeenCalledWith(docType);
        expect(mockGenerator.finalize).toHaveBeenCalled();
      });
    });
  });

  describe('Progress Reporting', () => {
    const sampleText = `PROVISIONAL PATENT APPLICATION
For: Test Invention

This is a test document.

[SIGNATURE_BLOCK:inventor]
_________________________________
John Doe
Inventor`;

    it('should report progress at each major step', async () => {
      const progressSteps: string[] = [];
      const progressDetails: (string | undefined)[] = [];
      
      const options: PDFExportOptions = {
        onProgress: (step: string, detail?: string) => {
          progressSteps.push(step);
          progressDetails.push(detail);
        }
      };

      await service.export(sampleText, testPdfPath, 'patent-assignment-agreement', options);

      // Verify all expected progress steps
      expect(progressSteps).toEqual([
        'Initializing PDF components',
        'Loading document formatting rules',
        'Parsing signature blocks',
        'Found signature blocks',
        'Preparing document layout',
        'Calculating page breaks',
        'Layout complete',
        'Starting PDF generation',
        'Rendering page',
        'Finalizing PDF document',
        'PDF export completed'
      ]);

      // Verify some steps have details
      expect(progressDetails[1]).toBe('patent-assignment-agreement'); // document type
      expect(progressDetails[3]).toMatch(/\d+ blocks/); // signature blocks count
      expect(progressDetails[6]).toMatch(/\d+ pages/); // page count
    });

    it('should not throw if no progress callback provided', async () => {
      await expect(
        service.export(sampleText, testPdfPath, 'patent-assignment-agreement')
      ).resolves.not.toThrow();
    });

    it('should report custom formatting progress when overrides applied', async () => {
      const progressSteps: string[] = [];
      
      const options: PDFExportOptions = {
        lineSpacing: 'single',
        fontSize: 14,
        onProgress: (step: string) => progressSteps.push(step)
      };

      await service.export(sampleText, testPdfPath, 'patent-assignment-agreement', options);

      expect(progressSteps).toContain('Applying custom formatting');
    });

    it('should report progress for multi-page documents', async () => {
      // Mock multi-page layout
      mockLayoutEngine.layoutDocument.mockReturnValueOnce({
        pages: [
          {
            blocks: [
              { type: 'text', content: 'Page 1 content', height: 15, breakable: true }
            ],
            remainingHeight: 100,
            pageNumber: 1
          },
          {
            blocks: [
              { type: 'text', content: 'Page 2 content', height: 15, breakable: true }
            ],
            remainingHeight: 500,
            pageNumber: 2
          }
        ],
        totalPages: 2,
        hasOverflow: false
      });

      // Create content that will generate multiple pages
      const longContent = Array(50).fill('This is a long paragraph.').join('\n\n');
      const progressDetails: string[] = [];
      
      const options: PDFExportOptions = {
        onProgress: (step: string, detail?: string) => {
          if (step === 'Rendering page' && detail) {
            progressDetails.push(detail);
          }
        }
      };

      await service.export(longContent, testPdfPath, 'patent-assignment-agreement', options);

      // Should have multiple page rendering progress reports
      expect(progressDetails.length).toBe(2);
      expect(progressDetails[0]).toBe('1 of 2');
      expect(progressDetails[1]).toBe('2 of 2');
    });
  });
}); 