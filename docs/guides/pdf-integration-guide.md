# PDF Service Integration Guide

## Overview

This guide walks you through integrating the CaseThread PDF Service into your application. Whether you're building a CLI tool, GUI application, or web service, the PDF Service provides flexible options for generating legal documents.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [CLI Integration](#cli-integration)
4. [GUI Integration](#gui-integration)
5. [Electron Integration](#electron-integration)
6. [Web Service Integration](#web-service-integration)
7. [Custom Integration](#custom-integration)
8. [Best Practices](#best-practices)
9. [Performance Tips](#performance-tips)
10. [Troubleshooting](#troubleshooting)

## Quick Start

### Basic Example

```typescript
import { PDFServiceFactory } from '@casethread/pdf-service';

// For CLI applications
const cliService = PDFServiceFactory.forCLI();
await cliService.export(documentText, 'output.pdf', 'nda-ip-specific');

// For GUI applications
const guiService = PDFServiceFactory.forGUI((step, detail) => {
  console.log(`Progress: ${step}`);
});
const result = await guiService.exportToBuffer(documentText, 'nda-ip-specific');
```

## Installation

```bash
npm install @casethread/pdf-service
```

### TypeScript Configuration

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

## CLI Integration

### Basic CLI Usage

```typescript
import { PDFServiceFactory } from '@casethread/pdf-service';
import { readFileSync } from 'fs';

async function generatePDF(inputFile: string, outputFile: string, docType: string) {
  // Create CLI-optimized service
  const service = PDFServiceFactory.forCLI();
  
  // Read input document
  const content = readFileSync(inputFile, 'utf-8');
  
  // Generate PDF with console progress
  await service.export(content, outputFile, docType, {
    pageNumbers: true,
    metadata: {
      title: 'Legal Document',
      author: 'CLI Tool'
    }
  });
  
  console.log(`✓ PDF saved to ${outputFile}`);
}
```

### Advanced CLI with Custom Options

```typescript
import { PDFServiceFactory } from '@casethread/pdf-service';
import { Command } from 'commander';

const program = new Command();

program
  .command('generate <input> <output>')
  .option('-t, --type <type>', 'document type', 'nda-ip-specific')
  .option('-n, --no-page-numbers', 'disable page numbers')
  .option('-s, --spacing <spacing>', 'line spacing', 'single')
  .action(async (input, output, options) => {
    const service = PDFServiceFactory.forCLI();
    const content = await fs.readFile(input, 'utf-8');
    
    await service.export(content, output, options.type, {
      pageNumbers: options.pageNumbers,
      lineSpacing: options.spacing as any,
      parseMarkdown: true
    });
  });

program.parse();
```

## GUI Integration

### Basic GUI Implementation

```typescript
import { PDFServiceFactory } from '@casethread/pdf-service';

class PDFGenerator {
  private service;
  
  constructor(private onProgress: (step: string, detail?: string) => void) {
    this.service = PDFServiceFactory.forGUI(this.onProgress);
  }
  
  async generatePDF(content: string, docType: string): Promise<Buffer> {
    const result = await this.service.exportToBuffer(content, docType, {
      pageNumbers: true,
      metadata: {
        title: document.getElementById('title')?.value || 'Untitled',
        author: 'GUI Application'
      }
    });
    
    return result.buffer;
  }
}

// Usage in your UI
const generator = new PDFGenerator((step, detail) => {
  document.getElementById('progress-text').innerText = step;
  if (detail) {
    document.getElementById('progress-detail').innerText = detail;
  }
});

const pdfBuffer = await generator.generatePDF(content, 'patent-assignment');
```

### React Component Example

```typescript
import React, { useState } from 'react';
import { PDFServiceFactory } from '@casethread/pdf-service';

export function PDFGeneratorComponent() {
  const [progress, setProgress] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  const generatePDF = async (content: string, docType: string) => {
    const service = PDFServiceFactory.forGUI((step, detail) => {
      setProgress(`${step} ${detail || ''}`);
    });
    
    try {
      const result = await service.exportToBuffer(content, docType);
      
      // Create blob URL for display
      const blob = new Blob([result.buffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      
      setProgress(`Complete! ${result.pageCount} pages generated.`);
    } catch (error) {
      setProgress(`Error: ${error.message}`);
    }
  };
  
  return (
    <div>
      <button onClick={() => generatePDF(documentContent, 'nda-ip-specific')}>
        Generate PDF
      </button>
      <p>{progress}</p>
      {pdfUrl && (
        <iframe src={pdfUrl} width="100%" height="600px" />
      )}
    </div>
  );
}
```

## Electron Integration

### Main Process Setup

```typescript
// main.ts
import { ipcMain } from 'electron';
import { PDFServiceFactory } from '@casethread/pdf-service';

ipcMain.handle('generate-pdf', async (event, { content, docType, options }) => {
  const service = PDFServiceFactory.forGUI((step, detail) => {
    event.sender.send('pdf-progress', { step, detail });
  });
  
  try {
    const result = await service.exportToBuffer(content, docType, options);
    return {
      success: true,
      buffer: result.buffer,
      metadata: result.metadata,
      pageCount: result.pageCount
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});
```

### Renderer Process

```typescript
// renderer.ts
import { ipcRenderer } from 'electron';

class PDFService {
  async generatePDF(content: string, docType: string) {
    // Listen for progress updates
    ipcRenderer.on('pdf-progress', (event, { step, detail }) => {
      this.updateProgress(step, detail);
    });
    
    const result = await ipcRenderer.invoke('generate-pdf', {
      content,
      docType,
      options: { pageNumbers: true }
    });
    
    if (result.success) {
      // Display PDF
      const blob = new Blob([result.buffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      document.getElementById('pdf-viewer').src = url;
    } else {
      console.error('PDF generation failed:', result.error);
    }
  }
  
  private updateProgress(step: string, detail?: string) {
    // Update UI with progress
  }
}
```

## Web Service Integration

### Express.js Example

```typescript
import express from 'express';
import { PDFServiceFactory } from '@casethread/pdf-service';

const app = express();
app.use(express.json());

app.post('/api/generate-pdf', async (req, res) => {
  const { content, documentType, options } = req.body;
  
  // Create service without progress (background generation)
  const service = PDFServiceFactory.forTesting();
  
  try {
    const result = await service.exportToBuffer(content, documentType, options);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': result.buffer.length,
      'Content-Disposition': `attachment; filename="${documentType}.pdf"`
    });
    
    res.send(result.buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Next.js API Route

```typescript
// pages/api/generate-pdf.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PDFServiceFactory } from '@casethread/pdf-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { content, documentType } = req.body;
  const service = PDFServiceFactory.forTesting();
  
  try {
    const result = await service.exportToBuffer(content, documentType);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

## Custom Integration

### Creating a Custom Progress Reporter

```typescript
import { ProgressReporter } from '@casethread/pdf-service';

class WebSocketProgressReporter implements ProgressReporter {
  constructor(private socket: WebSocket) {}
  
  report(step: string, detail?: string): void {
    this.socket.send(JSON.stringify({ type: 'progress', step, detail }));
  }
  
  start(taskName: string): void {
    this.socket.send(JSON.stringify({ type: 'start', taskName }));
  }
  
  complete(): void {
    this.socket.send(JSON.stringify({ type: 'complete' }));
  }
  
  fail(error: Error): void {
    this.socket.send(JSON.stringify({ type: 'error', message: error.message }));
  }
}

// Use with custom service configuration
const service = new PDFExportService(
  undefined, // use default formatter
  undefined, // use default parser
  undefined, // use default markdown parser
  undefined, // use default layout engine
  undefined, // use default generator
  new WebSocketProgressReporter(websocket)
);
```

### Custom Document Formatter

```typescript
import { IDocumentFormatter, DocumentFormattingRules } from '@casethread/pdf-service';

class CustomFormatter implements IDocumentFormatter {
  getFormattingRules(documentType: string): DocumentFormattingRules {
    // Return custom formatting rules
    return {
      lineSpacing: 'double',
      fontSize: 14,
      font: 'Helvetica',
      margins: { top: 90, bottom: 90, left: 72, right: 72 },
      // ... other rules
    };
  }
  
  // Implement other required methods
}

// Use with service
const service = PDFServiceFactory.createExportService({
  documentFormatter: new CustomFormatter()
});
```

## Best Practices

### 1. Error Handling

Always wrap PDF generation in try-catch blocks:

```typescript
try {
  const result = await service.exportToBuffer(content, docType);
  // Handle success
} catch (error) {
  if (error.code === 'INVALID_DOCUMENT_TYPE') {
    // Handle invalid document type
  } else if (error.code === 'PARSING_ERROR') {
    // Handle parsing errors
  } else {
    // Handle other errors
  }
}
```

### 2. Memory Management

For large documents, consider streaming:

```typescript
// For very large documents, generate to file instead of buffer
if (documentSize > 10 * 1024 * 1024) { // 10MB
  await service.export(content, tempFile, docType);
  // Stream file to response
} else {
  const result = await service.exportToBuffer(content, docType);
  // Use buffer directly
}
```

### 3. Progress Reporting

Provide meaningful progress updates:

```typescript
const service = PDFServiceFactory.forGUI((step, detail) => {
  // Map technical steps to user-friendly messages
  const userMessage = {
    'Initializing PDF components': 'Starting up...',
    'Parsing signature blocks': 'Processing signatures...',
    'Calculating page breaks': 'Formatting document...',
    'Rendering page': 'Creating PDF pages...',
    'Finalizing PDF document': 'Almost done...'
  }[step] || step;
  
  updateUI(userMessage, detail);
});
```

## Performance Tips

### 1. Reuse Service Instances

```typescript
// Good - reuse service
const service = PDFServiceFactory.forGUI(callback);
for (const doc of documents) {
  await service.exportToBuffer(doc.content, doc.type);
}

// Avoid - creating new service each time
for (const doc of documents) {
  const service = PDFServiceFactory.forGUI(callback); // Don't do this
  await service.exportToBuffer(doc.content, doc.type);
}
```

### 2. Parallel Generation

```typescript
// Generate multiple PDFs in parallel
const promises = documents.map(doc => 
  service.exportToBuffer(doc.content, doc.type)
);
const results = await Promise.all(promises);
```

### 3. Caching

```typescript
const pdfCache = new Map<string, Buffer>();

async function getCachedPDF(content: string, docType: string) {
  const key = `${docType}:${hash(content)}`;
  
  if (pdfCache.has(key)) {
    return pdfCache.get(key);
  }
  
  const result = await service.exportToBuffer(content, docType);
  pdfCache.set(key, result.buffer);
  
  return result.buffer;
}
```

## Troubleshooting

### Common Issues

1. **"Invalid document type" error**
   - Ensure you're using a supported document type
   - Check spelling and case sensitivity

2. **Empty PDF or missing content**
   - Verify your input text is not empty
   - Check for proper signature block markers

3. **Memory errors with large documents**
   - Use file output instead of buffer for large documents
   - Increase Node.js memory limit: `node --max-old-space-size=4096`

4. **Progress not updating**
   - Ensure your progress callback is properly bound
   - Check that you're using the correct factory method

### Debug Mode

Enable debug logging:

```typescript
process.env.DEBUG = 'casethread:*';
const service = PDFServiceFactory.forCLI();
// Detailed logs will be printed to console
```

## See Also

- [API Reference](../api/pdf-service-api.md)
- [Migration Guide](./pdf-migration-guide.md)
- [Architecture Overview](../architecture/pdf-service-architecture.md) 