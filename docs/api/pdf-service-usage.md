# PDF Service Usage Guide

## Overview

The CaseThread PDF Service has been modularized to support different environments (CLI, GUI, testing) with flexible progress reporting and output options. This guide covers all usage patterns.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Progress Reporting](#progress-reporting)
3. [Output Options](#output-options)
4. [Factory Methods](#factory-methods)
5. [Advanced Usage](#advanced-usage)
6. [API Reference](#api-reference)
7. [Migration Guide](#migration-guide)

## Quick Start

### CLI Usage

```typescript
import { PDFServiceFactory } from './services/pdf/PDFServiceFactory';

// Create a CLI-optimized service with console progress reporting
const pdfService = PDFServiceFactory.forCLI();

// Generate PDF to file
await pdfService.export(
  documentText,
  'output.pdf',
  'patent-assignment-agreement'
);
```

### GUI Usage

```typescript
import { PDFServiceFactory } from './services/pdf/PDFServiceFactory';

// Create a GUI-optimized service with callback progress reporting
const pdfService = PDFServiceFactory.forGUI((step, detail) => {
  // Update your UI with progress
  updateProgressBar(step, detail);
});

// Generate PDF to buffer for display
const result = await pdfService.exportToBuffer(
  documentText,
  'trademark-application'
);

// Display in viewer
displayPDF(result.buffer);
showMetadata(result.metadata);
```

### Testing Usage

```typescript
import { PDFServiceFactory } from './services/pdf/PDFServiceFactory';

// Create a test-optimized service with no progress output
const pdfService = PDFServiceFactory.forTesting();

// Use in tests without console noise
await pdfService.export(testDoc, 'test.pdf', 'nda-ip-specific');
```

## Progress Reporting

### Built-in Progress Reporters

#### ConsoleProgressReporter
Used by `forCLI()` - displays progress with ora spinners.

```typescript
import { ConsoleProgressReporter } from './utils/progress';

const reporter = new ConsoleProgressReporter({
  includeTimestamps: false,  // Don't show timestamps
  trackDuration: true        // Show operation duration
});

const service = new PDFExportService(reporter);
```

#### CallbackProgressReporter
Used by `forGUI()` - sends progress to your callback function.

```typescript
import { CallbackProgressReporter } from './utils/progress';

const reporter = new CallbackProgressReporter(
  (step: string, detail?: string) => {
    console.log(`Progress: ${step}`, detail);
  },
  {
    includeTimestamps: true,
    trackDuration: true
  }
);

const service = new PDFExportService(reporter);
```

#### NullProgressReporter
Used by `forTesting()` - no output, optionally logs to console.

```typescript
import { NullProgressReporter } from './utils/progress';

const reporter = new NullProgressReporter(true); // Enable debug logging
const service = new PDFExportService(reporter);
```

### Custom Progress Reporter

Implement the `ProgressReporter` interface:

```typescript
import { ProgressReporter } from './types/progress';

class CustomProgressReporter implements ProgressReporter {
  report(step: string, detail?: string): void {
    // Your custom implementation
    sendToAnalytics('pdf_progress', { step, detail });
  }

  finish(): void {
    // Called when operation completes
    sendToAnalytics('pdf_complete');
  }
}

const service = new PDFExportService(new CustomProgressReporter());
```

## Output Options

### File Output

```typescript
// Direct file output
await pdfService.export(
  text,
  '/path/to/output.pdf',
  'provisional-patent-application',
  {
    pageNumbers: true,
    lineSpacing: 'double',
    fontSize: 12
  }
);
```

### Buffer Output

```typescript
// Buffer output for GUI/web
const result = await pdfService.exportToBuffer(
  text,
  'cease-and-desist-letter',
  {
    metadata: {
      title: 'Cease and Desist Letter',
      author: 'John Doe, Esq.'
    }
  }
);

// Access the buffer
const pdfBuffer: Buffer = result.buffer;
const pageCount: number = result.pageCount;
const metadata = result.metadata;
```

### Export Result Structure

```typescript
interface PDFExportResult {
  buffer: Buffer;
  pageCount: number;
  metadata: {
    documentType: string;
    generatedAt: Date;
    fileSize: number;
    exportType: 'buffer' | 'file';
    generator: string;
    formatVersion: string;
  };
  processingTime: number;         // milliseconds
  signatureBlockCount: number;
  hasTableOfContents: boolean;
  estimatedReadingTime: number;   // minutes
}
```

## Factory Methods

### PDFServiceFactory.forCLI()

Creates a service optimized for command-line usage:
- Console progress with spinners
- No timestamps in output
- Shows operation duration

```typescript
const service = PDFServiceFactory.forCLI();
```

### PDFServiceFactory.forGUI(callback)

Creates a service optimized for GUI integration:
- Progress sent to callback function
- Includes timestamps
- Tracks operation duration

```typescript
const service = PDFServiceFactory.forGUI((step, detail) => {
  updateUI(step, detail);
});
```

### PDFServiceFactory.forTesting()

Creates a service optimized for testing:
- No console output
- Optional debug logging
- Minimal overhead

```typescript
const service = PDFServiceFactory.forTesting();
```

### PDFServiceFactory.createExportService(options)

Create a custom-configured service:

```typescript
const service = PDFServiceFactory.createExportService({
  progressReporter: new CustomProgressReporter(),
  defaultOptions: {
    pageNumbers: false,
    lineSpacing: 'single'
  }
});
```

### PDFServiceFactory.createPipeline(options)

Create a complete pipeline with helpers:

```typescript
const pipeline = PDFServiceFactory.createPipeline({
  progressReporter: new ConsoleProgressReporter(),
  defaultOptions: { fontSize: 11 }
});

// Use the pipeline
await pipeline.generateToFile(text, 'output.pdf', 'nda-ip-specific');
const buffer = await pipeline.generateToBuffer(text, 'nda-ip-specific');
```

## Advanced Usage

### Backward Compatibility

The service maintains backward compatibility with `onProgress` callbacks:

```typescript
// Old style still works
await pdfService.export(text, 'out.pdf', 'patent-license', {
  onProgress: (step, detail) => {
    console.log(step, detail);
  }
});
```

### Custom PDF Generation Options

```typescript
const options: PDFExportOptions = {
  // Page formatting
  pageNumbers: true,
  paperSize: 'letter',
  
  // Text formatting
  fontSize: 12,
  lineSpacing: 'double',
  margins: { top: 72, right: 72, bottom: 72, left: 72 },
  
  // Metadata
  metadata: {
    title: 'Patent Assignment Agreement',
    author: 'CaseThread Legal',
    subject: 'IP Transfer',
    keywords: ['patent', 'assignment', 'IP']
  },
  
  // Features
  parseMarkdown: true,
  watermark: 'DRAFT',
  header: 'Confidential'
};

await pdfService.export(text, 'output.pdf', 'patent-assignment', options);
```

### Direct Component Usage

For advanced scenarios, use components directly:

```typescript
import { LegalPDFGenerator } from './services/pdf/LegalPDFGenerator';
import { BufferOutput } from './services/pdf/outputs';

// Create custom output
const output = new BufferOutput();

// Create generator
const generator = new LegalPDFGenerator(output, {
  documentType: 'trademark-application',
  title: 'Trademark Application'
});

// Generate PDF
await generator.start();
generator.writeTitle('TRADEMARK APPLICATION');
generator.writeParagraph('For the mark: CASETHREAD');
await generator.finalize();

// Get buffer
const buffer = await output.end();
```

## API Reference

### PDFExportService

```typescript
class PDFExportService {
  constructor(progressReporter?: ProgressReporter);
  
  // Export to file
  async export(
    text: string,
    outputPath: string,
    documentType: string,
    options?: PDFExportOptions
  ): Promise<void>;
  
  // Export to buffer
  async exportToBuffer(
    text: string,
    documentType: string,
    options?: PDFExportOptions
  ): Promise<PDFExportResult>;
}
```

### PDFExportOptions

```typescript
interface PDFExportOptions {
  pageNumbers?: boolean;
  margins?: Margins;
  lineSpacing?: 'single' | 'one-half' | 'double';
  fontSize?: number;
  paperSize?: 'letter' | 'legal' | 'a4';
  header?: string;
  watermark?: string;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
  };
  onProgress?: (step: string, detail?: string) => void;
  parseMarkdown?: boolean;
}
```

### ProgressReporter

```typescript
interface ProgressReporter {
  report(step: string, detail?: string): void;
  finish(): void;
}
```

## Migration Guide

### From Direct Instantiation

Before:
```typescript
const service = new PDFExportService();
```

After:
```typescript
// Choose based on your environment
const service = PDFServiceFactory.forCLI();
// or
const service = PDFServiceFactory.forGUI(progressCallback);
// or
const service = PDFServiceFactory.forTesting();
```

### From File to Buffer Output

Before:
```typescript
await service.export(text, 'output.pdf', 'patent-license');
const buffer = await fs.readFile('output.pdf');
```

After:
```typescript
const result = await service.exportToBuffer(text, 'patent-license');
const buffer = result.buffer;
// Access rich metadata
console.log(`Generated ${result.pageCount} pages in ${result.processingTime}ms`);
```

### Custom Progress Handling

Before:
```typescript
await service.export(text, 'out.pdf', 'nda', {
  onProgress: (step) => console.log(step)
});
```

After:
```typescript
const service = PDFServiceFactory.forGUI((step, detail) => {
  updateProgressUI(step, detail);
});
await service.export(text, 'out.pdf', 'nda');
```

## Best Practices

1. **Choose the Right Factory Method**: Use `forCLI()`, `forGUI()`, or `forTesting()` based on your environment.

2. **Use Buffers for GUI**: Generate to buffer for immediate display without file I/O.

3. **Leverage Metadata**: Use the rich metadata in `PDFExportResult` for UI feedback.

4. **Handle Errors**: Wrap calls in try-catch for proper error handling.

5. **Optimize for Performance**: Reuse service instances when generating multiple PDFs.

## Examples

### Complete GUI Integration

```typescript
// In your GUI backend
import { PDFServiceFactory } from './services/pdf/PDFServiceFactory';
import { ipcMain } from 'electron';

// Create service with progress callback
const pdfService = PDFServiceFactory.forGUI((step, detail) => {
  // Send progress to renderer
  mainWindow.webContents.send('pdf-progress', { step, detail });
});

// Handle PDF generation request
ipcMain.handle('generate-pdf', async (event, { text, documentType }) => {
  try {
    const result = await pdfService.exportToBuffer(text, documentType);
    
    return {
      success: true,
      buffer: result.buffer,
      metadata: result.metadata,
      pageCount: result.pageCount,
      processingTime: result.processingTime
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});
```

### Batch Processing with Progress

```typescript
const service = PDFServiceFactory.forCLI();

async function batchGeneratePDFs(documents: Document[]) {
  for (const [index, doc] of documents.entries()) {
    console.log(`Processing document ${index + 1} of ${documents.length}`);
    
    await service.export(
      doc.content,
      `output/${doc.filename}.pdf`,
      doc.type
    );
  }
}
```

### Testing with Mock Progress

```typescript
import { ProgressReporter } from './types/progress';

class MockProgressReporter implements ProgressReporter {
  steps: string[] = [];
  
  report(step: string, detail?: string): void {
    this.steps.push(step);
  }
  
  finish(): void {
    this.steps.push('FINISHED');
  }
}

// In tests
const mockReporter = new MockProgressReporter();
const service = new PDFExportService(mockReporter);

await service.export(text, 'test.pdf', 'patent-assignment');

expect(mockReporter.steps).toContain('Parsing signature blocks');
expect(mockReporter.steps).toContain('FINISHED');
``` 