import { LegalPDFGenerator } from '../../../src/services/pdf/LegalPDFGenerator';
import * as fs from 'fs';
import * as path from 'path';

describe('LegalPDFGenerator', () => {
  const testOutputDir = path.join(__dirname, '../../../test-output');
  const testFile = path.join(testOutputDir, 'test-generator.pdf');

  beforeAll(() => {
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  describe('Class Instantiation', () => {
    it('should create an instance with default configuration', () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document',
        title: 'Test Document'
      });

      expect(generator).toBeInstanceOf(LegalPDFGenerator);
      expect(generator.getDocument()).toBeDefined();
      expect(generator.getCurrentPage()).toBe(1);
      
      const pageConfig = generator.getPageConfig();
      expect(pageConfig.size).toBe('LETTER');
      expect(pageConfig.margins.top).toBe(72);
      expect(pageConfig.margins.bottom).toBe(72);
      expect(pageConfig.margins.left).toBe(72);
      expect(pageConfig.margins.right).toBe(72);
      expect(pageConfig.pageNumbers).toBe(true);
      expect(pageConfig.pageNumberPosition).toBe('bottom-center');
    });

    it('should create an instance with custom page configuration', () => {
      const customConfig = {
        pageNumberPosition: 'bottom-right' as const,
        margins: {
          top: 108,    // 1.5 inches
          bottom: 72,
          left: 72,
          right: 72
        }
      };

      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'office-action-response',
        title: 'Office Action Response'
      }, customConfig);

      const pageConfig = generator.getPageConfig();
      expect(pageConfig.margins.top).toBe(108);
      expect(pageConfig.pageNumberPosition).toBe('bottom-right');
    });

    it('should initialize PDFKit document with correct metadata', () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'patent-application',
        title: 'Patent Application',
        author: 'John Doe',
        subject: 'Software Patent',
        keywords: ['patent', 'software', 'invention']
      });

      const doc = generator.getDocument();
      expect(doc.info.Title).toBe('Patent Application');
      expect(doc.info.Author).toBe('John Doe');
      expect(doc.info.Subject).toBe('Software Patent');
      expect(doc.info.Keywords).toBe('patent, software, invention');
    });
  });

  describe('Document Creation', () => {
    it('should create a PDF with basic text', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document',
        title: 'Test Document'
      });

      await generator.start();
      
      // Write some test content using PDFKit directly for now
      const doc = generator.getDocument();
      doc.text('TEST DOCUMENT', { align: 'center' });
      doc.moveDown();
      doc.text('This is a test paragraph.');
      
      await generator.finalize();

      // Wait a moment for file system to sync
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify file was created
      expect(fs.existsSync(testFile)).toBe(true);
      const stats = fs.statSync(testFile);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should handle finalize errors gracefully', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      // Don't call start(), so stream is null
      // This should handle the error gracefully
      await expect(generator.finalize()).resolves.toBeUndefined();
    });

    it('should finalize document and resolve when complete', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      await generator.start();
      
      // Add minimal content
      const doc = generator.getDocument();
      doc.text('Test content');
      
      // finalize should complete without error
      await expect(generator.finalize()).resolves.toBeUndefined();
      
      // File should exist after finalization
      expect(fs.existsSync(testFile)).toBe(true);
    });

    it('should call addPageNumbers when page numbers are enabled', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      // Spy on the private addPageNumbers method
      const addPageNumbersSpy = jest.spyOn(generator as any, 'addPageNumbers');

      await generator.start();
      await generator.finalize();

      // Should be called since pageNumbers is true by default
      expect(addPageNumbersSpy).toHaveBeenCalled();
    });

    it('should not call addPageNumbers when disabled', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      }, {
        pageNumbers: false
      });

      // Spy on the private addPageNumbers method
      const addPageNumbersSpy = jest.spyOn(generator as any, 'addPageNumbers');

      await generator.start();
      await generator.finalize();

      // Should not be called when pageNumbers is false
      expect(addPageNumbersSpy).not.toHaveBeenCalled();
    });
  });

  describe('Text Writing Methods', () => {
    it('should write text with default formatting', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      await generator.start();
      
      generator.writeText('This is test text');
      
      await generator.finalize();
      
      // Wait for file system
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(fs.existsSync(testFile)).toBe(true);
    });

    it('should write paragraph with spacing', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      await generator.start();
      
      // Test method chaining
      const result = generator
        .writeParagraph('First paragraph')
        .writeParagraph('Second paragraph');
      
      expect(result).toBe(generator); // Verify chaining works
      
      await generator.finalize();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(fs.existsSync(testFile)).toBe(true);
    });

    it('should write title in uppercase and centered', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      await generator.start();
      
      // Spy on writeText to verify options
      const writeTextSpy = jest.spyOn(generator, 'writeText');
      
      generator.writeTitle('test title');
      
      expect(writeTextSpy).toHaveBeenCalledWith('TEST TITLE', expect.objectContaining({
        fontSize: 14,
        align: 'center'
      }));
      
      await generator.finalize();
    });

    it('should write headings with appropriate sizes', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      await generator.start();
      
      const writeTextSpy = jest.spyOn(generator, 'writeText');
      
      generator.writeHeading('Level 1', 1);
      expect(writeTextSpy).toHaveBeenCalledWith('Level 1', expect.objectContaining({
        fontSize: 16,
        font: 'Times-Bold'
      }));
      
      generator.writeHeading('Level 2', 2);
      expect(writeTextSpy).toHaveBeenCalledWith('Level 2', expect.objectContaining({
        fontSize: 14,
        font: 'Times-Bold'
      }));
      
      generator.writeHeading('Level 3', 3);
      expect(writeTextSpy).toHaveBeenCalledWith('Level 3', expect.objectContaining({
        fontSize: 12,
        font: 'Times-Bold'
      }));
      
      generator.writeHeading('Level 4', 4);
      expect(writeTextSpy).toHaveBeenCalledWith('Level 4', expect.objectContaining({
        fontSize: 12,
        font: 'Times-Roman'
      }));
      
      await generator.finalize();
    });

    it('should add vertical space', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      await generator.start();
      
      const doc = generator.getDocument();
      const moveDownSpy = jest.spyOn(doc, 'moveDown');
      
      generator.addSpace(); // Default 1 line
      expect(moveDownSpy).toHaveBeenCalledWith(1);
      
      generator.addSpace(3); // Custom 3 lines
      expect(moveDownSpy).toHaveBeenCalledWith(3);
      
      await generator.finalize();
    });

    it('should apply custom text options', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      await generator.start();
      
      const doc = generator.getDocument();
      const fontSpy = jest.spyOn(doc, 'font');
      const fontSizeSpy = jest.spyOn(doc, 'fontSize');
      const textSpy = jest.spyOn(doc, 'text');
      
      generator.writeText('Custom text', {
        font: 'Helvetica',
        fontSize: 16,
        align: 'right',
        lineGap: 6
      });
      
      expect(fontSpy).toHaveBeenCalledWith('Helvetica');
      expect(fontSizeSpy).toHaveBeenCalledWith(16);
      expect(textSpy).toHaveBeenCalledWith('Custom text', expect.objectContaining({
        align: 'right',
        lineGap: 6
      }));
      
      await generator.finalize();
    });

    it('should create a complete legal document', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-legal-document',
        title: 'Patent Assignment Agreement'
      });

      await generator.start();
      
      // Simulate a simple legal document structure
      generator
        .writeTitle('PATENT ASSIGNMENT AGREEMENT')
        .addSpace()
        .writeParagraph('This Patent Assignment Agreement (the "Agreement") is entered into as of [DATE].')
        .writeHeading('1. DEFINITIONS', 1)
        .writeParagraph('1.1 "Patent Rights" means all patents and patent applications...')
        .writeHeading('2. ASSIGNMENT', 1)
        .writeParagraph('2.1 The Assignor hereby assigns to the Assignee all right, title, and interest...')
        .addSpace(2)
        .writeText('[SIGNATURE_BLOCK:assignor]');
      
      await generator.finalize();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify PDF was created with content
      expect(fs.existsSync(testFile)).toBe(true);
      const stats = fs.statSync(testFile);
      expect(stats.size).toBeGreaterThan(1000); // Should have substantial content
    });
  });

  describe('Page Management', () => {
    it('should track current page number', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      expect(generator.getCurrentPage()).toBe(1);
      
      await generator.start();
      generator.newPage();
      
      expect(generator.getCurrentPage()).toBe(2);
      
      await generator.finalize();
    });

    it('should add new pages with newPage()', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      await generator.start();
      
      generator
        .writeText('Page 1 content')
        .newPage()
        .writeText('Page 2 content')
        .newPage()
        .writeText('Page 3 content');
      
      expect(generator.getCurrentPage()).toBe(3);
      
      await generator.finalize();
    });

    it('should track vertical position', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      await generator.start();
      
      const initialY = generator.getCurrentY();
      expect(initialY).toBeGreaterThan(0);
      
      generator.writeParagraph('Test paragraph');
      
      const afterParagraphY = generator.getCurrentY();
      expect(afterParagraphY).toBeGreaterThan(initialY);
      
      await generator.finalize();
    });

    it('should calculate remaining space on page', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      await generator.start();
      
      const initialSpace = generator.getRemainingSpace();
      const pageDimensions = generator.getPageDimensions();
      
      // Should have most of the page available initially
      expect(initialSpace).toBeLessThan(pageDimensions.height);
      expect(initialSpace).toBeGreaterThan(pageDimensions.height * 0.7);
      
      // Write content to reduce space
      generator.writeParagraph('Test content');
      
      const remainingSpace = generator.getRemainingSpace();
      expect(remainingSpace).toBeLessThan(initialSpace);
      
      await generator.finalize();
    });

    it('should check if space is available', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      await generator.start();
      
      // Should have space for small content
      expect(generator.hasSpaceFor(100)).toBe(true);
      
      // Should not have space for entire page
      const pageDimensions = generator.getPageDimensions();
      expect(generator.hasSpaceFor(pageDimensions.height)).toBe(false);
      
      await generator.finalize();
    });

    it('should ensure space and add page if needed', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      await generator.start();
      
      // Fill most of the page
      const pageHeight = generator.getPageDimensions().height;
      const margins = generator.getPageConfig().margins;
      
      // Move to near bottom of page
      generator.moveTo(pageHeight - margins.bottom - 50);
      
      expect(generator.getCurrentPage()).toBe(1);
      
      // Request more space than available
      generator.ensureSpace(100);
      
      // Should have added a new page
      expect(generator.getCurrentPage()).toBe(2);
      
      await generator.finalize();
    });

    it('should move to specific position', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      await generator.start();
      
      const targetY = 200;
      generator.moveTo(targetY);
      
      expect(generator.getCurrentY()).toBe(targetY);
      
      await generator.finalize();
    });

    it('should get page dimensions', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      await generator.start();
      
      const dimensions = generator.getPageDimensions();
      
      // Letter size: 8.5" x 11" = 612 x 792 points
      expect(dimensions.width).toBe(612);
      expect(dimensions.height).toBe(792);
      
      await generator.finalize();
    });

    it('should handle automatic page breaks', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      await generator.start();
      
      // Write enough content to trigger automatic page break
      for (let i = 0; i < 50; i++) {
        generator.writeParagraph(`This is paragraph ${i + 1}. It contains enough text to eventually fill the page and trigger an automatic page break.`);
      }
      
      // Should have created multiple pages
      expect(generator.getCurrentPage()).toBeGreaterThan(1);
      
      await generator.finalize();
      
      // Verify file was created
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(fs.existsSync(testFile)).toBe(true);
    });
  });

  describe('Page Numbering', () => {
    it('should add page number to current page', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      await generator.start();
      
      generator.writeText('Page content');
      generator.addPageNumberToCurrentPage();
      
      await generator.finalize();
      
      // Verify PDF was created
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(fs.existsSync(testFile)).toBe(true);
    });

    it('should format page numbers as numeric by default', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      // Access private method through type assertion for testing
      const formatPageNumber = (generator as any).formatPageNumber.bind(generator);
      
      const format = { format: 'numeric' as const, prefix: 'Page ' };
      expect(formatPageNumber(1, format)).toBe('Page 1');
      expect(formatPageNumber(10, format)).toBe('Page 10');
      expect(formatPageNumber(999, format)).toBe('Page 999');
    });

    it('should format page numbers as roman numerals', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      const formatPageNumber = (generator as any).formatPageNumber.bind(generator);
      
      const format = { format: 'roman' as const };
      expect(formatPageNumber(1, format)).toBe('i');
      expect(formatPageNumber(4, format)).toBe('iv');
      expect(formatPageNumber(9, format)).toBe('ix');
      expect(formatPageNumber(40, format)).toBe('xl');
      expect(formatPageNumber(90, format)).toBe('xc');
      expect(formatPageNumber(400, format)).toBe('cd');
      expect(formatPageNumber(900, format)).toBe('cm');
    });

    it('should format page numbers as alphabetic', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      const formatPageNumber = (generator as any).formatPageNumber.bind(generator);
      
      const format = { format: 'alpha' as const };
      expect(formatPageNumber(1, format)).toBe('a');
      expect(formatPageNumber(26, format)).toBe('z');
      expect(formatPageNumber(27, format)).toBe('aa');
      expect(formatPageNumber(28, format)).toBe('ab');
      expect(formatPageNumber(52, format)).toBe('az');
      expect(formatPageNumber(53, format)).toBe('ba');
    });

    it('should apply prefix and suffix to page numbers', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      });

      const formatPageNumber = (generator as any).formatPageNumber.bind(generator);
      
      const format = { 
        format: 'numeric' as const, 
        prefix: 'Page ', 
        suffix: ' of 100' 
      };
      expect(formatPageNumber(5, format)).toBe('Page 5 of 100');
    });

    it('should respect page number position configuration', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      }, {
        pageNumbers: true,
        pageNumberPosition: 'bottom-right'
      });

      await generator.start();
      
      const doc = generator.getDocument();
      const textSpy = jest.spyOn(doc, 'text');
      
      generator.addPageNumberToCurrentPage();
      
      // Check that text was called with appropriate x position
      expect(textSpy).toHaveBeenCalled();
      const lastCall = textSpy.mock.calls[textSpy.mock.calls.length - 1];
      const xPosition = lastCall[1] as number;
      
      // For bottom-right, x should be near the right margin
      expect(xPosition).toBeGreaterThan(400); // Should be on right side of page
      
      await generator.finalize();
    });

    it('should skip page numbering when disabled', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      }, {
        pageNumbers: false
      });

      await generator.start();
      
      const doc = generator.getDocument();
      const textSpy = jest.spyOn(doc, 'text');
      
      generator.addPageNumberToCurrentPage();
      
      // Should not have added any text
      expect(textSpy).not.toHaveBeenCalled();
      
      await generator.finalize();
    });

    it('should warn about page numbering limitation', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      }, {
        pageNumbers: true
      });

      await generator.start();
      
      // Spy on logger
      const warnSpy = jest.spyOn((generator as any).logger, 'warn');
      
      await generator.finalize();
      
      // Should have warned about limitation
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Page numbering is limited')
      );
    });

    it('should create multi-page document with page numbering config', async () => {
      const generator = new LegalPDFGenerator(testFile, {
        documentType: 'test-document'
      }, {
        pageNumbers: true,
        pageNumberPosition: 'bottom-center',
        pageNumberFormat: {
          format: 'roman',
          prefix: '',
          suffix: '',
          fontSize: 12
        }
      });

      await generator.start();
      
      // Create multiple pages
      generator
        .writeTitle('MULTI-PAGE DOCUMENT')
        .writeParagraph('This document will have multiple pages.')
        .newPage()
        .writeParagraph('Page 2 content')
        .newPage()
        .writeParagraph('Page 3 content');
      
      // Check page count before finalize
      const pageCount = generator.getCurrentPage();
      expect(pageCount).toBe(3);
      
      await generator.finalize();
      
      // Verify file exists
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(fs.existsSync(testFile)).toBe(true);
    });
  });
}); 