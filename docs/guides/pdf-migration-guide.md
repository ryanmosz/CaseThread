# PDF Service Migration Guide

## Overview

This guide helps you migrate from direct PDF generation to the new modularized PDF Service. The new service offers better flexibility, testability, and GUI support while maintaining backward compatibility.

## Version Compatibility

- **Old Version**: Direct instantiation of PDF components
- **New Version**: Factory-based service with dependency injection
- **Breaking Changes**: None - full backward compatibility maintained

## Migration Benefits

1. **Buffer Support**: Generate PDFs in memory for GUI applications
2. **Progress Reporting**: Real-time updates during generation
3. **Better Testing**: All dependencies are injectable
4. **Environment Optimization**: Different configurations for CLI/GUI/Testing
5. **Cleaner API**: Simplified interface with factory methods

## Quick Migration

### Before (Direct Instantiation)

```typescript
import { LegalPDFGenerator } from './services/pdf/LegalPDFGenerator';
import { DocumentFormatter } from './services/pdf/DocumentFormatter';
import { SignatureBlockParser } from './services/pdf/SignatureBlockParser';
import { PDFLayoutEngine } from './services/pdf/PDFLayoutEngine';

// Old way - manual setup
const generator = new LegalPDFGenerator(outputPath, options);
const formatter = new DocumentFormatter();
const parser = new SignatureBlockParser();
const layoutEngine = new PDFLayoutEngine(generator, formatter, parser);

await generator.start();
// ... manual PDF generation logic ...
await generator.finalize();
```

### After (Using Factory)

```typescript
import { PDFServiceFactory } from '@casethread/pdf-service';

// New way - simple factory
const service = PDFServiceFactory.forCLI();
await service.export(text, outputPath, documentType);
```

## Step-by-Step Migration

### Step 1: Update Imports

Replace individual component imports with the factory:

```typescript
// Old imports
import { LegalPDFGenerator } from './services/pdf/LegalPDFGenerator';
import { PDFExportService } from './services/pdf-export';

// New imports
import { PDFServiceFactory } from '@casethread/pdf-service';
```

### Step 2: Replace Direct Instantiation

#### CLI Applications

```typescript
// Old
const exportService = new PDFExportService();
await exportService.export(text, output, docType);

// New
const service = PDFServiceFactory.forCLI();
await service.export(text, output, docType);
```

#### GUI Applications

```typescript
// Old - no buffer support
// Had to generate to temp file and read back

// New - direct buffer support
const service = PDFServiceFactory.forGUI((step, detail) => {
  updateProgress(step, detail);
});
const result = await service.exportToBuffer(text, docType);
displayPDF(result.buffer);
```

### Step 3: Update Progress Handling

#### Old Progress Handling

```typescript
const options = {
  onProgress: (step, detail) => {
    console.log(`${step}: ${detail}`);
  }
};
await exportService.export(text, output, docType, options);
```

#### New Progress Handling

```typescript
// Built into factory for CLI
const service = PDFServiceFactory.forCLI(); // Automatic ora spinners

// Or custom for GUI
const service = PDFServiceFactory.forGUI((step, detail) => {
  progressBar.update(step, detail);
});
```

### Step 4: Update Tests

#### Old Test Setup

```typescript
describe('PDFExportService', () => {
  let service: PDFExportService;
  
  beforeEach(() => {
    service = new PDFExportService();
    // Mock internal dependencies was difficult
  });
});
```

#### New Test Setup

```typescript
describe('PDFExportService', () => {
  let service: IPDFExportService;
  
  beforeEach(() => {
    // Easy mocking with DI
    service = PDFServiceFactory.forTesting({
      documentFormatter: mockFormatter,
      signatureParser: mockParser,
      progressReporter: mockReporter
    });
  });
});
```

## Common Migration Scenarios

### Scenario 1: CLI Tool Migration

**Old Implementation:**
```typescript
// cli.ts
import { PDFExportService } from './services/pdf-export';

export async function exportCommand(input: string, output: string, type: string) {
  const service = new PDFExportService();
  const content = await fs.readFile(input, 'utf-8');
  
  await service.export(content, output, type, {
    pageNumbers: true,
    onProgress: (step) => console.log(step)
  });
}
```

**New Implementation:**
```typescript
// cli.ts
import { PDFServiceFactory } from '@casethread/pdf-service';

export async function exportCommand(input: string, output: string, type: string) {
  const service = PDFServiceFactory.forCLI();
  const content = await fs.readFile(input, 'utf-8');
  
  await service.export(content, output, type, {
    pageNumbers: true
    // Progress is automatic with ora spinners
  });
}
```

### Scenario 2: Adding GUI Support

**Old Approach (No Buffer Support):**
```typescript
// Had to use temporary files
const tempFile = path.join(os.tmpdir(), 'temp.pdf');
await service.export(content, tempFile, docType);
const buffer = await fs.readFile(tempFile);
await fs.unlink(tempFile);
```

**New Approach (Direct Buffer):**
```typescript
const service = PDFServiceFactory.forGUI(updateProgress);
const result = await service.exportToBuffer(content, docType);
// result.buffer is ready to use
```

### Scenario 3: Custom Configuration

**Old Approach:**
```typescript
// Limited customization options
const service = new PDFExportService();
// Had to modify internal properties
```

**New Approach:**
```typescript
// Full customization via DI
const service = new PDFExportService(
  customFormatter,
  customParser,
  customMarkdownParser,
  customLayoutEngine,
  customGenerator,
  customProgressReporter
);

// Or via factory
const service = PDFServiceFactory.createExportService({
  documentFormatter: customFormatter,
  progressReporter: customReporter
});
```

## API Compatibility Reference

### Unchanged APIs

These methods work exactly the same:

- `export(text, outputPath, documentType, options?)`
- `exportToBuffer(text, documentType, options?)` (now available in base service)
- All `PDFExportOptions` properties
- All document type strings

### Enhanced APIs

These have new capabilities but remain backward compatible:

- Progress reporting (now injectable)
- Service creation (now via factory)
- Dependency management (now explicit)

### New APIs

These are entirely new:

- `PDFServiceFactory.forCLI()`
- `PDFServiceFactory.forGUI(onProgress)`
- `PDFServiceFactory.forTesting(config?)`
- `ProgressReporter` interface
- `ServiceConfiguration` interface

## Migration Checklist

- [ ] Update package imports to use factory
- [ ] Replace `new PDFExportService()` with factory methods
- [ ] Update progress handling to use appropriate factory
- [ ] For GUI apps, switch to `exportToBuffer()`
- [ ] Update tests to use `forTesting()` with mocks
- [ ] Remove any temporary file handling for buffers
- [ ] Test all document types still work correctly

## Rollback Plan

If you need to rollback, the old instantiation still works:

```typescript
// This still works for backward compatibility
const service = new PDFExportService();
await service.export(text, output, docType);
```

However, you'll miss out on:
- Optimized progress reporting
- Easy testing with mocks
- GUI-friendly buffer generation

## Getting Help

If you encounter issues during migration:

1. Check the [API Reference](../api/pdf-service-api.md)
2. Review the [Integration Guide](./pdf-integration-guide.md)
3. Enable debug logging: `DEBUG=casethread:* npm start`
4. File an issue with migration details

## Next Steps

After migration, explore:

1. [Performance Optimization](./pdf-integration-guide.md#performance-tips)
2. [Custom Progress Reporters](./pdf-integration-guide.md#custom-integration)
3. [Architecture Overview](../architecture/pdf-service-architecture.md) 