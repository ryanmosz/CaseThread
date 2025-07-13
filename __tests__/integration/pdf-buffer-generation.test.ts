import { PDFExportService } from '../../src/services/pdf-export';
import { LegalPDFGenerator } from '../../src/services/pdf/LegalPDFGenerator';
import { BufferOutput } from '../../src/services/pdf/outputs';

describe('PDF Buffer Generation Integration', () => {
  it('should generate a valid PDF buffer using BufferOutput', async () => {
    // Create buffer output
    const bufferOutput = new BufferOutput();
    
    // Create generator with buffer output
    const generator = new LegalPDFGenerator(bufferOutput, {
      documentType: 'provisional-patent-application',
      title: 'Test Patent Application',
      author: 'Integration Test',
      subject: 'PDF Buffer Generation Test'
    });

    // Start generation
    await generator.start();

    // Write some content
    generator.writeTitle('PROVISIONAL PATENT APPLICATION');
    generator.writeParagraph('For: Innovative Testing Method');
    generator.writeHeading('BACKGROUND OF THE INVENTION', 2);
    generator.writeParagraph('This invention relates to software testing methodologies, particularly for PDF generation systems.');
    generator.writeHeading('SUMMARY OF THE INVENTION', 2);
    generator.writeParagraph('The present invention provides a method for testing PDF generation using buffer outputs instead of file system writes.');
    
    // Add signature block
    generator.addSpace(2);
    generator.writeText('[SIGNATURE_BLOCK:inventor]');
    generator.writeText('_________________________________', { fontSize: 10 });
    generator.writeText('Dr. Test Runner', { fontSize: 10 });
    generator.writeText('Inventor', { fontSize: 10 });
    generator.addSpace(1);
    generator.writeText('Date: _________________', { fontSize: 10 });

    // Finalize
    await generator.finalize();

    // Get the buffer
    const pdfBuffer = await bufferOutput.end();

    // Verify buffer
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000); // PDFs are typically > 1KB
    
    // Check PDF signature
    const pdfSignature = pdfBuffer.toString('utf8', 0, 5);
    expect(pdfSignature).toBe('%PDF-');
    
    // Check for EOF marker
    const eofMarker = pdfBuffer.toString('utf8', pdfBuffer.length - 6, pdfBuffer.length);
    expect(eofMarker).toContain('%%EOF');

    // Verify it's a complete PDF by checking for basic structure
    const pdfContent = pdfBuffer.toString('utf8');
    expect(pdfContent).toContain('endobj');
    expect(pdfContent).toContain('stream');
    expect(pdfContent).toContain('/Type /Catalog');
  });

  it('should generate PDF buffer through PDFExportService', async () => {
            const service = new PDFExportService(); // NullProgressReporter by default
    
    const documentText = `TECHNOLOGY TRANSFER AGREEMENT

This Agreement is made between TechCorp ("Transferor") and InnovateCo ("Transferee").

1. TECHNOLOGY DESCRIPTION
The technology being transferred consists of advanced PDF generation methods.

2. GRANT OF RIGHTS
Transferor hereby grants to Transferee a non-exclusive license to use the Technology.

[SIGNATURE_BLOCK:parties]
_________________________________
John Smith
CEO, TechCorp

_________________________________
Jane Doe
CTO, InnovateCo`;

    const result = await service.exportToBuffer(
      documentText,
      'technology-transfer-agreement',
      {
        pageNumbers: true,
        metadata: {
          title: 'Technology Transfer Agreement',
          author: 'Integration Test Suite'
        }
      }
    );

    // Verify result structure
    expect(result).toHaveProperty('buffer');
    expect(result).toHaveProperty('pageCount');
    expect(result).toHaveProperty('metadata');
    
    // Verify buffer
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer).toBeDefined();
    
    const buffer = result.buffer!; // Assert non-null after checks
    expect(buffer.length).toBeGreaterThan(2000);
    
    // Verify metadata
    expect(result.metadata).toMatchObject({
      documentType: 'technology-transfer-agreement',
      exportType: 'buffer',
      fileSize: buffer.length
    });
    
    // Verify PDF structure
    const pdfStart = buffer.toString('utf8', 0, 5);
    expect(pdfStart).toBe('%PDF-');
    
    // Verify content (PDFKit encodes text, so we check for the hex representation)
    const pdfContent = buffer.toString('utf8');
    expect(pdfContent).toContain('/Title');
    expect(pdfContent).toContain('/Author');
  });
}); 