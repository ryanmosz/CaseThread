# Task 5.3 Plan: Define Enhanced API

## Goal
Create a more robust and flexible API for PDF generation that abstracts progress reporting, enhances result types, and provides factory methods for easy component creation.

## Key Objectives

### 1. Progress Reporter Abstraction
Create a progress reporting interface that works for both CLI (with spinners) and GUI (with progress bars).

### 2. Enhanced PDFExportResult
Add more metadata and capabilities to the result object for better integration.

### 3. Factory Methods
Provide easy-to-use factory methods for creating PDF components with sensible defaults.

## Implementation Plan

### Step 1: Progress Reporter Interface (30 mins)

**Create `src/types/progress.ts`:**
```typescript
export interface ProgressReporter {
  report(step: string, detail?: string): void;
  startTask(taskName: string): void;
  completeTask(taskName: string): void;
  error(message: string, error?: Error): void;
}
```

**Implementations:**
- `ConsoleProgressReporter` - For CLI with ora spinners
- `CallbackProgressReporter` - For GUI with callbacks
- `NullProgressReporter` - For silent operation

### Step 2: Enhance PDFExportResult (30 mins)

**Update `src/types/pdf.ts`:**
```typescript
export interface PDFExportResult {
  // Existing fields
  buffer?: Buffer;
  filePath?: string;
  pageCount: number;
  metadata: PDFMetadata;
  
  // New fields
  warnings?: string[];
  processingTime: number;
  memoryUsage?: number;
  signatureBlockCount: number;
  hasTableOfContents: boolean;
  estimatedReadingTime: number; // in minutes
}

export interface PDFMetadata {
  documentType: string;
  generatedAt: Date;
  fileSize: number;
  exportType: 'file' | 'buffer';
  
  // New metadata
  generator: string; // 'CaseThread v1.0'
  formatVersion: string; // '1.0'
  compressionLevel?: number;
  encryption?: PDFEncryption;
}
```

### Step 3: Factory Methods (45 mins)

**Create `src/services/pdf/PDFServiceFactory.ts`:**
```typescript
export class PDFServiceFactory {
  // Create a configured PDF export service
  static createExportService(options?: {
    progressReporter?: ProgressReporter;
    defaultOptions?: PDFExportOptions;
  }): PDFExportService;
  
  // Create a PDF generator with output
  static createGenerator(
    output: PDFOutput | string,
    documentType: string,
    options?: PDFGenerationOptions
  ): LegalPDFGenerator;
  
  // Create appropriate output based on target
  static createOutput(target: string | 'buffer'): PDFOutput;
  
  // Create a complete PDF pipeline
  static createPipeline(options?: PipelineOptions): PDFPipeline;
}
```

### Step 4: Update PDFExportService (45 mins)

**Refactor to use new abstractions:**
- Accept ProgressReporter in constructor
- Use factory methods internally
- Return enhanced PDFExportResult
- Track warnings during generation
- Measure processing time and memory

### Step 5: Create Examples (30 mins)

**Document usage patterns:**
```typescript
// CLI Usage
const service = PDFServiceFactory.createExportService({
  progressReporter: new ConsoleProgressReporter()
});

// GUI Usage
const service = PDFServiceFactory.createExportService({
  progressReporter: new CallbackProgressReporter((step, detail) => {
    updateProgressBar(step, detail);
  })
});

// Simple Buffer Generation
const output = PDFServiceFactory.createOutput('buffer');
const generator = PDFServiceFactory.createGenerator(
  output,
  'patent-assignment-agreement'
);
```

## Success Criteria

1. **Progress Abstraction**: Works seamlessly for both CLI and GUI
2. **Enhanced Results**: Provides rich metadata about generation
3. **Factory Methods**: Simplify component creation
4. **Backward Compatible**: Existing code continues to work
5. **Well Tested**: Unit tests for all new components

## Time Estimate: 3 hours

### Breakdown:
- Progress Reporter: 30 mins
- Enhanced Result Types: 30 mins
- Factory Methods: 45 mins
- Service Updates: 45 mins
- Examples & Tests: 30 mins

## Benefits

1. **Cleaner Integration**: GUI doesn't need to know about CLI specifics
2. **Better Monitoring**: Track performance and issues
3. **Easier Usage**: Factory methods hide complexity
4. **Future Proof**: Easy to add new output types or reporters
5. **Better Developer Experience**: Clear, simple API 