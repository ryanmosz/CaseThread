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
        fontSize: 14
      }));
      
      generator.writeHeading('Level 2', 2);
      expect(writeTextSpy).toHaveBeenCalledWith('Level 2', expect.objectContaining({
        fontSize: 13
      }));
      
      generator.writeHeading('Level 3', 3);
      expect(writeTextSpy).toHaveBeenCalledWith('Level 3', expect.objectContaining({
        fontSize: 12
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
}); 