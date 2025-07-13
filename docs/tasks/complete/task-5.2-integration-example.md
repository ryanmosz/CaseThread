# Task 5.2 Integration Example: Buffer-Based PDF Generation

## Overview

This example demonstrates how to use the newly refactored PDF service to generate PDFs in memory (as buffers) instead of writing to files. This is essential for GUI integration where we need to display PDFs without file system access.

## Basic Usage

### 1. Generate PDF to Buffer

```typescript
import { PDFExportService } from './services/pdf-export';

async function generatePDFBuffer() {
  const service = new PDFExportService();
  
  const documentText = `PROVISIONAL PATENT APPLICATION

For: Revolutionary Widget Design

BACKGROUND OF THE INVENTION

This invention relates to an improved widget design that increases efficiency by 50%.

[SIGNATURE_BLOCK:inventor]
_________________________________
Jane Smith
Inventor`;

  const result = await service.exportToBuffer(
    documentText,
    'provisional-patent-application',
    {
      pageNumbers: true,
      metadata: {
        title: 'Revolutionary Widget Patent',
        author: 'Jane Smith'
      }
    }
  );

  console.log(`Generated PDF with ${result.pageCount} pages`);
  console.log(`PDF size: ${result.metadata.fileSize} bytes`);
  
  // The PDF is now in result.buffer
  return result.buffer;
}
```

### 2. IPC Handler for Electron GUI

```typescript
// In main process (src/electron/main/ipc-handlers.ts)
import { ipcMain } from 'electron';
import { PDFExportService } from '../../services/pdf-export';

ipcMain.handle('generate-pdf-buffer', async (event, { text, documentType, options }) => {
  try {
    const service = new PDFExportService();
    const result = await service.exportToBuffer(text, documentType, options);
    
    // Return buffer as Uint8Array for IPC transfer
    return {
      success: true,
      data: {
        buffer: result.buffer,
        pageCount: result.pageCount,
        metadata: result.metadata
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});
```

### 3. Renderer Process Usage

```typescript
// In renderer process (src/electron/renderer/src/components/DocumentViewer.tsx)
async function generatePDF() {
  const result = await window.electronAPI.generatePDFBuffer({
    text: documentContent,
    documentType: 'patent-license-agreement',
    options: {
      pageNumbers: true,
      onProgress: (step, detail) => {
        console.log(`PDF Generation: ${step}`, detail);
      }
    }
  });

  if (result.success) {
    // Convert buffer back to Blob for display
    const pdfBlob = new Blob([result.data.buffer], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Display in iframe or PDF viewer
    setPdfUrl(pdfUrl);
  }
}
```

### 4. Direct Buffer Usage (No GUI)

```typescript
import { LegalPDFGenerator } from './services/pdf/LegalPDFGenerator';
import { BufferOutput } from './services/pdf/outputs';

async function lowLevelBufferGeneration() {
  const output = new BufferOutput();
  const generator = new LegalPDFGenerator(output, {
    documentType: 'nda-ip-specific',
    title: 'Confidentiality Agreement'
  });

  await generator.start();
  
  generator.writeTitle('NON-DISCLOSURE AGREEMENT');
  generator.writeParagraph('This agreement is entered into...');
  
  await generator.finalize();
  
  const pdfBuffer = await output.end();
  return pdfBuffer;
}
```

## Backward Compatibility

The original file-based export still works:

```typescript
// Original method (still supported)
await service.export(text, '/path/to/output.pdf', 'patent-assignment-agreement');

// New buffer method
const result = await service.exportToBuffer(text, 'patent-assignment-agreement');
```

## Progress Reporting

Both methods support progress callbacks:

```typescript
const options = {
  onProgress: (step: string, detail?: string) => {
    updateProgressBar(step, detail);
  }
};

// Works with both methods
await service.export(text, outputPath, docType, options);
await service.exportToBuffer(text, docType, options);
```

## Testing

```typescript
// Test buffer generation
it('should generate valid PDF buffer', async () => {
  const service = new PDFExportService();
  const result = await service.exportToBuffer(sampleText, 'cease-and-desist-letter');
  
  expect(result.buffer).toBeInstanceOf(Buffer);
  expect(result.buffer.toString('utf8', 0, 5)).toBe('%PDF-');
  expect(result.metadata.exportType).toBe('buffer');
});
```

## Benefits

1. **No File System Required** - Generate PDFs entirely in memory
2. **GUI Integration Ready** - Perfect for Electron apps
3. **Streaming Support** - Can pipe buffers to responses
4. **Testing Friendly** - No cleanup of test files needed
5. **Cloud Compatible** - Works in serverless environments

## Next Steps

- Implement PDF viewer component in GUI
- Add IPC handlers for PDF generation
- Create progress indicators in UI
- Add PDF caching for performance 