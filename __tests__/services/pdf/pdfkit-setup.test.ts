import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

describe('PDFKit Setup Validation', () => {
  const testOutputDir = path.join(__dirname, '../../../test-output');
  
  beforeAll(() => {
    // Create test output directory if it doesn't exist
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup test files
    const testFile = path.join(testOutputDir, 'pdfkit-test.pdf');
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  it('should create a PDF document with PDFKit', (done) => {
    const outputPath = path.join(testOutputDir, 'pdfkit-test.pdf');
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(outputPath);
    
    doc.pipe(stream);
    
    // Add test content
    doc.fontSize(12)
       .font('Times-Roman')
       .text('PDFKit Test Document', 72, 72);
    
    doc.end();
    
    stream.on('finish', () => {
      // Verify file exists and has content
      expect(fs.existsSync(outputPath)).toBe(true);
      const stats = fs.statSync(outputPath);
      expect(stats.size).toBeGreaterThan(0);
      done();
    });
  });

  it('should support Times-Roman font', () => {
    const doc = new PDFDocument();
    
    // This should not throw
    expect(() => {
      doc.font('Times-Roman');
    }).not.toThrow();
  });

  it('should handle page size configuration', () => {
    const doc = new PDFDocument({
      size: 'LETTER', // 8.5 x 11 inches
      margins: {
        top: 72,    // 1 inch = 72 points
        bottom: 72,
        left: 72,
        right: 72
      }
    });
    
    // Check page dimensions (in points)
    expect(doc.page.width).toBe(612);  // 8.5 * 72
    expect(doc.page.height).toBe(792); // 11 * 72
  });
}); 