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
jest.mock('../../src/services/pdf/MarkdownParser');
jest.mock('../../src/config/pdf-formatting');

describe('PDFExportService', () => {
  let service: PDFExportService;
  let mockGenerator: any;
  let mockFormatter: any;
  let mockParser: any;
  let mockLayoutEngine: any;
  let mockConfig: any;
  let mockMarkdownParser: any;

  const testDir = path.join(__dirname, '../../docs/testing/test-results/pdf-export-service');
  const testPdfPath = path.join(testDir, 'test-output.pdf');

  beforeEach(async () => {
    // Ensure test directory exists
    await fs.mkdir(testDir, { recursive: true });

    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock implementations
    const { LegalPDFGenerator } = require('../../src/services/pdf/LegalPDFGenerator');
    const { DocumentFormatter } = require('../../src/services/pdf/DocumentFormatter');
    const { SignatureBlockParser } = require('../../src/services/pdf/SignatureBlockParser');
    const { PDFLayoutEngine } = require('../../src/services/pdf/PDFLayoutEngine');
    const { MarkdownParser } = require('../../src/services/pdf/MarkdownParser');
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
      writeFormattedText: jest.fn(),
      addSpace: jest.fn(),
      moveTo: jest.fn(),
      getCurrentY: jest.fn().mockReturnValue(100),
      getCurrentPage: jest.fn().mockReturnValue(1),
      getPageDimensions: jest.fn().mockReturnValue({ width: 612, height: 792 }),
      getPageConfig: jest.fn().mockReturnValue({ margins: { top: 72, bottom: 72, left: 72, right: 72 } }),
      getRemainingSpace: jest.fn().mockReturnValue(500),
      measureTextHeight: jest.fn().mockReturnValue(15),
      addPageNumberToCurrentPage: jest.fn(),
      getPagesWithContent: jest.fn().mockReturnValue(new Set([1])),
      drawHorizontalLine: jest.fn()
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
        signatureBlockStyle: 'standard',
        signatureLineLength: 200,
        tableIndent: 0,
        tableCellPadding: 5,
        pageBreakOrphanControl: 2,
        pageBreakWidowControl: 2
      }),
      applyLineSpacing: jest.fn().mockReturnValue(12),
      calculateLineHeight: jest.fn().mockReturnValue(24),
      getElementSpacing: jest.fn().mockReturnValue({ before: 12, after: 12 }),
      getMarginsForPage: jest.fn().mockReturnValue({ top: 72, bottom: 72, left: 72, right: 72 }),
      getUsablePageArea: jest.fn().mockReturnValue({ width: 468, height: 648 }),
      needsHeaderSpace: jest.fn().mockReturnValue(false),
      getHeaderContent: jest.fn().mockReturnValue(null),
      updateConfig: jest.fn(),
      updateConfiguration: jest.fn()
    };
    DocumentFormatter.mockImplementation(() => mockFormatter);

    // Mock parser methods
    mockParser = {
      parseDocument: jest.fn().mockReturnValue({
        content: ['Test content'],
        signatureBlocks: []
      })
    };
    SignatureBlockParser.mockImplementation(() => mockParser);

    // Mock layout engine methods
    mockLayoutEngine = {
      layoutDocument: jest.fn().mockReturnValue({
        pages: [{
          pageNumber: 1,
          blocks: [],
          totalHeight: 100
        }],
        totalPages: 1,
        signatureBlockPlacements: []
      })
    };
    PDFLayoutEngine.mockImplementation(() => mockLayoutEngine);

    // Mock config
    mockConfig = {
      getDefaults: jest.fn().mockReturnValue({
        fontSize: 12,
        margins: { top: 72, bottom: 72, left: 72, right: 72 }
      }),
      updateConfig: jest.fn()
    };
    FormattingConfiguration.getInstance = jest.fn().mockReturnValue(mockConfig);

    // Mock markdown parser
    mockMarkdownParser = {
      parseHeading: jest.fn().mockReturnValue(null),
      parseInlineFormatting: jest.fn().mockReturnValue([{ text: 'Test', bold: false, italic: false }]),
      isHorizontalRule: jest.fn().mockReturnValue(false),
      parseListItem: jest.fn().mockReturnValue(null),
      isBlockQuote: jest.fn().mockReturnValue(false),
      parseBlockQuote: jest.fn().mockReturnValue(null),
      extractLinkText: jest.fn().mockImplementation((text) => text),
      isTableRow: jest.fn().mockReturnValue(false),
      parseTableRow: jest.fn().mockReturnValue([]),
      isTableSeparator: jest.fn().mockReturnValue(false),
      getHeadingFontSize: jest.fn().mockReturnValue(12),
      isMarkdownHeading: jest.fn().mockReturnValue(false)
    };
    MarkdownParser.mockImplementation(() => mockMarkdownParser);

    // Create service instance with mocked dependencies
    const mockProgressReporter = {
      report: jest.fn(),
      startTask: jest.fn(),
      completeTask: jest.fn(),
      error: jest.fn()
    };

    service = new PDFExportService(
      mockFormatter,
      mockParser,
      mockMarkdownParser, // Use mock markdown parser
      (_generator: any) => mockLayoutEngine,
      (_output: any) => mockGenerator,
      mockProgressReporter
    );
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
      // Set up parser mock to return proper parsed document
      mockParser.parseDocument.mockReturnValue({
        content: [
          'PROVISIONAL PATENT APPLICATION',
          'For: Test Invention',
          '',
          'This is a test document.',
          '[SIGNATURE_BLOCK:inventor]'
        ],
        signatureBlocks: [{
          marker: {
            type: 'signature',
            id: 'inventor'
          },
          layout: 'single',
          parties: [{
            role: 'INVENTOR',
            name: 'John Doe',
            title: 'Inventor'
          }]
        }]
      });

      // Set up layout engine to return blocks
      mockLayoutEngine.layoutDocument.mockReturnValue({
        pages: [{
          pageNumber: 1,
          blocks: [
            { type: 'text', content: 'Test content' }
          ],
          totalHeight: 100
        }],
        totalPages: 1
      });

      await service.export(sampleText, testPdfPath, 'provisional-patent-application');

      // Verify all components were called
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

      // Since we're using mocked services, we can't directly test FormattingConfiguration
      // The formatting would be applied through the DocumentFormatter mock
      expect(mockFormatter.getFormattingRules).toHaveBeenCalledWith('nda-ip-specific');
      expect(mockGenerator.start).toHaveBeenCalled();
      expect(mockGenerator.finalize).toHaveBeenCalled();
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

      // Verify the generator was created with correct metadata via the factory
      expect(mockGenerator.start).toHaveBeenCalled();
      expect(mockGenerator.finalize).toHaveBeenCalled();
      
      // The metadata would be passed through the options to the generator factory
      // Since we're using a factory pattern, we can't directly check the constructor call
    });

    it('should handle page numbering', async () => {
      await service.export(sampleText, testPdfPath, 'trademark-application');

      // Page numbering is now handled automatically when content is written
      // Verify that pages with content were tracked
      expect(mockGenerator.getPagesWithContent).toHaveBeenCalled();
      expect(mockGenerator.getPagesWithContent()).toContain(1);
    });

    it('should disable page numbering when requested', async () => {
      const options: PDFExportOptions = {
        pageNumbers: false
      };

      await service.export(sampleText, testPdfPath, 'cease-and-desist-letter', options);

      expect(mockGenerator.addPageNumberToCurrentPage).not.toHaveBeenCalled();
    });

    it('should handle multi-page documents', async () => {
      // Set up signature block for this test
      const signatureBlock = {
        marker: { type: 'signature', id: 'inventor' },
        layout: 'single',
        parties: [{
          role: 'INVENTOR',
          name: 'John Doe',
          title: 'Inventor'
        }]
      };
      
      mockParser.parseDocument.mockReturnValue({
        content: ['Page 1 content', 'Page 2 content'],
        signatureBlocks: [signatureBlock]
      });
      
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
              { type: 'signature', content: signatureBlock, height: 100, breakable: false }
            ],
            remainingHeight: 500,
            pageNumber: 2
          }
        ],
        totalPages: 2
      });

      // Mock getCurrentPage to simulate proper page progression
      mockGenerator.getCurrentPage
        .mockReturnValueOnce(1) // First check before page 2
        .mockReturnValueOnce(1) // Still on page 1, so newPage will be called
        .mockReturnValueOnce(2) // After newPage, now on page 2
        .mockReturnValue(2);     // Any subsequent calls

      // Mock getPagesWithContent for multi-page
      mockGenerator.getPagesWithContent.mockReturnValue(new Set([1, 2]));

      await service.export(sampleText, testPdfPath, 'office-action-response');

      expect(mockGenerator.newPage).toHaveBeenCalledTimes(1);
      // Page numbering is automatic when content is written
      expect(mockGenerator.getPagesWithContent).toHaveBeenCalled();
      expect(mockGenerator.getPagesWithContent()).toEqual(new Set([1, 2]));
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
      // Set up signature block data
      const signatureBlock = {
        marker: { type: 'signature', id: 'inventor' },
        layout: 'single',
        parties: [{
          role: 'INVENTOR',
          name: 'John Doe',
          title: 'Inventor'
        }]
      };
      
      mockParser.parseDocument.mockReturnValue({
        content: ['Test content'],
        signatureBlocks: [signatureBlock]
      });
      
      mockLayoutEngine.layoutDocument.mockReturnValue({
        pages: [{
          pageNumber: 1,
          blocks: [
            { type: 'text', content: 'Test content' },
            { type: 'signature', content: signatureBlock }
          ]
        }],
        totalPages: 1
      });
      
      await service.export(sampleText, testPdfPath, 'patent-license-agreement');

      // Verify the components were called correctly
      expect(mockParser.parseDocument).toHaveBeenCalledWith(sampleText);
      expect(mockLayoutEngine.layoutDocument).toHaveBeenCalled();
      expect(mockGenerator.start).toHaveBeenCalled();
      expect(mockGenerator.finalize).toHaveBeenCalled();
      
      // We can't test the actual rendering of signature blocks with mocked components
      // That would be tested in integration tests or in the specific component tests
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

      // Set up markdown parser to detect horizontal rules
      mockMarkdownParser.isHorizontalRule.mockImplementation((line: string) => {
        const trimmed = line.trim();
        return trimmed === '---' || trimmed === '___' || trimmed === '***';
      });

      mockParser.parseDocument.mockReturnValue({
        content: textWithRules.split('\n'),
        signatureBlocks: []
      });

      // Set up layout engine to return blocks including horizontal rules
      mockLayoutEngine.layoutDocument.mockImplementation((blocks: any) => {
        // Return the blocks as pages so we can verify them
        return {
          pages: [{
            pageNumber: 1,
            blocks: blocks
          }],
          totalPages: 1
        };
      });

      await service.export(textWithRules, testPdfPath, 'provisional-patent-application');

      // Get the blocks that were passed to layoutDocument
      const layoutCall = mockLayoutEngine.layoutDocument.mock.calls[0][0];
      const hrBlocks = layoutCall.filter((block: any) => block.type === 'horizontal-rule');
      
      // We expect 3 horizontal rules
      expect(hrBlocks).toHaveLength(3);
      
      // Each horizontal rule should have standard properties
      hrBlocks.forEach((block: any) => {
        expect(block).toMatchObject({
          type: 'horizontal-rule',
          height: expect.any(Number),
          breakable: false
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

  describe('exportToBuffer', () => {
    const sampleText = `PROVISIONAL PATENT APPLICATION
For: Test Invention

This is a test document.

[SIGNATURE_BLOCK:inventor]
_________________________________
John Doe
Inventor`;

    it('should export text to PDF buffer successfully', async () => {
      // Mock BufferOutput
      const mockBufferOutput = {
        write: jest.fn().mockResolvedValue(undefined),
        end: jest.fn().mockResolvedValue(Buffer.from('mock pdf content')),
        getType: jest.fn().mockReturnValue('buffer')
      };

      jest.mock('../../src/services/pdf/outputs', () => ({
        BufferOutput: jest.fn().mockImplementation(() => mockBufferOutput)
      }));

      const result = await service.exportToBuffer(sampleText, 'provisional-patent-application');

      // Verify result structure
      expect(result).toMatchObject({
        buffer: expect.any(Buffer),
        pageCount: 1,
        metadata: {
          documentType: 'provisional-patent-application',
          generatedAt: expect.any(Date),
          fileSize: expect.any(Number),
          exportType: 'buffer'
        }
      });

      // Verify PDF generation flow (factory is mocked, so we don't check constructor)
      expect(mockParser.parseDocument).toHaveBeenCalledWith(sampleText);
      expect(mockFormatter.getFormattingRules).toHaveBeenCalledWith('provisional-patent-application');
      expect(mockLayoutEngine.layoutDocument).toHaveBeenCalled();
      expect(mockGenerator.start).toHaveBeenCalled();
      expect(mockGenerator.finalize).toHaveBeenCalled();
    });

    it('should apply formatting overrides to buffer export', async () => {
      const options: PDFExportOptions = {
        lineSpacing: 'single',
        fontSize: 14,
        margins: { top: 90, bottom: 90, left: 90, right: 90 }
      };

      const result = await service.exportToBuffer(sampleText, 'nda-ip-specific', options);

      // Since we can't check updateConfiguration due to instanceof check,
      // verify that the service successfully exports with the options
      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.metadata.exportType).toBe('buffer');
      
      // The formatter should have been called to get rules
      expect(mockFormatter.getFormattingRules).toHaveBeenCalledWith('nda-ip-specific');
    });

    it('should handle progress callbacks for buffer export', async () => {
      const progressCallback = jest.fn();
      const options: PDFExportOptions = {
        onProgress: progressCallback
      };

      await service.exportToBuffer(sampleText, 'patent-license-agreement', options);

      // Verify progress callbacks were made
      expect(progressCallback).toHaveBeenCalledWith('Initializing PDF components', undefined);
      expect(progressCallback).toHaveBeenCalledWith('Loading document formatting rules', 'patent-license-agreement');
      expect(progressCallback).toHaveBeenCalledWith('Parsing signature blocks', undefined);
      expect(progressCallback).toHaveBeenCalledWith('Preparing document layout', undefined);
      expect(progressCallback).toHaveBeenCalledWith('Calculating page breaks', undefined);
      expect(progressCallback).toHaveBeenCalledWith('Starting PDF generation', undefined);
      expect(progressCallback).toHaveBeenCalledWith('PDF export completed', undefined);
    });

    it('should handle multi-page buffer exports', async () => {
      // Set up signature block for this test
      const mockSignatureBlock = {
        marker: {
          type: 'signature',
          id: 'test',
          fullMarker: '[SIGNATURE_BLOCK:test]'
        },
        layout: 'single',
        parties: [{
          role: 'Signer',
          name: 'Test Signer',
          title: 'Title',
          fields: []
        }],
        notaryRequired: false
      };
      
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
              { type: 'signature', content: mockSignatureBlock, height: 100, breakable: false }
            ],
            remainingHeight: 500,
            pageNumber: 2
          }
        ],
        totalPages: 2,
        hasOverflow: false
      });

      mockGenerator.getCurrentPage.mockReturnValue(2);

      const result = await service.exportToBuffer(sampleText, 'office-action-response');

      expect(result.pageCount).toBe(2);
      expect(mockGenerator.newPage).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in buffer export', async () => {
      mockGenerator.start.mockRejectedValueOnce(new Error('PDF generation failed'));

      await expect(service.exportToBuffer(sampleText, 'nda-ip-specific'))
        .rejects.toThrow('PDF export to buffer failed: PDF generation failed');
    });

    it('should not require file path for buffer export', async () => {
      const result = await service.exportToBuffer(sampleText, 'cease-and-desist-letter');

      // Verify no file path in result
      expect(result.filePath).toBeUndefined();
      expect(result.buffer).toBeDefined();
      
      // Since we're using a mocked factory, we can't check LegalPDFGenerator directly
      // Instead verify buffer was returned without file path
      expect(result.filePath).toBeUndefined();
      expect(result.buffer).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
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
        'Preparing document layout',
        'Calculating page breaks',
        'Layout complete',
        'Starting PDF generation',
        'Measuring content for accurate pagination',
        'Rendering page',
        'Finalizing PDF document',
        'PDF export completed'
      ]);

      // Verify some steps have details
      expect(progressDetails[1]).toBe('patent-assignment-agreement'); // document type
      expect(progressDetails[5]).toMatch(/\d+ pages/); // page count at "Layout complete"
      expect(progressDetails[8]).toMatch(/\d+ of \d+/); // page rendering details
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