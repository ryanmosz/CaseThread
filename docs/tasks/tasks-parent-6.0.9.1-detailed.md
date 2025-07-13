# Task 6.0.9.1: Update API Documentation

## Overview
Update all API documentation to reflect the new PDF generation capabilities in the GUI, including IPC channels, TypeScript interfaces, and usage examples.

## Current State
- Basic API documentation exists for CLI
- No GUI-specific API documentation
- IPC channels undocumented
- PDF service API partially documented

## Documentation to Update

### 1. PDF Service API Documentation
File: `docs/api/pdf-service-api.md`

```markdown
# PDF Service API Documentation

## Overview
The PDF Service provides comprehensive PDF generation capabilities for the CaseThread application, supporting both CLI and GUI interfaces.

## GUI Integration

### IPC Channels

#### `pdf:generate`
Generates a PDF from document content using the specified template.

**Request:**
```typescript
interface PDFGenerateRequest {
  content: string;           // Markdown content to convert
  templateId: string;        // Template identifier (e.g., 'patent-assignment')
  metadata?: {               // Optional metadata
    author?: string;
    title?: string;
    subject?: string;
    keywords?: string[];
  };
  options?: {
    attemptNumber?: number;  // For retry tracking
  };
}
```

**Response:**
```typescript
interface PDFGenerateResponse {
  success: boolean;
  data?: ArrayBuffer;        // PDF buffer on success
  error?: string;            // Error message on failure
  errorInfo?: {
    message: string;
    code?: string;
    retryable: boolean;
  };
  metadata?: {
    duration: number;        // Generation time in ms
    size: number;           // PDF size in bytes
    attemptNumber: number;   // Which attempt succeeded
  };
}
```

**Example:**
```typescript
const result = await window.electronAPI.pdf.generate({
  content: '# Patent Assignment\n\nThis agreement...',
  templateId: 'patent-assignment',
  metadata: {
    author: 'John Doe',
    title: 'Patent Assignment Agreement'
  }
});

if (result.success) {
  console.log(`PDF generated: ${result.metadata.size} bytes`);
  // Use result.data as ArrayBuffer
}
```

#### `pdf:export`
Exports a PDF buffer to the file system.

**Request:**
```typescript
interface PDFExportRequest {
  buffer: ArrayBuffer;       // PDF data to save
  fileName?: string;         // Suggested filename
  showInFolder?: boolean;    // Open file location after save
}
```

**Response:**
```typescript
interface PDFExportResponse {
  success: boolean;
  filePath?: string;         // Saved file path on success
  error?: string;            // Error message on failure
}
```

**Example:**
```typescript
const exportResult = await window.electronAPI.pdf.export({
  buffer: pdfBuffer,
  fileName: 'patent-assignment-2024.pdf',
  showInFolder: true
});

if (exportResult.success) {
  console.log(`PDF saved to: ${exportResult.filePath}`);
}
```

### Progress Tracking

#### `progress:subscribe`
Subscribe to progress updates for PDF generation.

**Usage:**
```typescript
// Subscribe to progress updates
window.electronAPI.progress.subscribe();

// Listen for progress events
window.electronAPI.on('pdf:progress', (progress) => {
  console.log(`${progress.stage}: ${progress.progress}%`);
  console.log(progress.message);
});
```

#### Progress Stages
```typescript
type ProgressStage = 
  | 'initializing'      // Setting up PDF generation
  | 'parsing'           // Parsing markdown content
  | 'processing'        // Processing with template
  | 'generating'        // Creating PDF pages
  | 'finalizing'        // Adding metadata and finishing
  | 'complete'          // Generation complete
  | 'error';            // Error occurred

interface ProgressUpdate {
  stage: ProgressStage;
  progress: number;      // 0-100
  message: string;       // Human-readable status
  metadata?: any;        // Stage-specific data
}
```

### React Hooks

#### `usePDFGeneration`
React hook for PDF generation in the renderer process.

**Import:**
```typescript
import { usePDFGeneration } from '@/electron/renderer/src/hooks/usePDFGeneration';
```

**Usage:**
```typescript
const MyComponent = () => {
  const {
    generatePDF,
    loading,
    error,
    pdfBuffer,
    exportPDF,
    clearPDF,
    retryAttempt,
    isRetrying,
    cancelRetry
  } = usePDFGeneration();

  const handleGeneratePDF = async () => {
    await generatePDF({
      enableRetry: true,
      retryOptions: {
        maxAttempts: 3,
        initialDelay: 1000
      }
    });
  };

  return (
    <div>
      <button onClick={handleGeneratePDF} disabled={loading}>
        {loading ? 'Generating...' : 'Generate PDF'}
      </button>
      
      {error && <div className="error">{error}</div>}
      
      {pdfBuffer && (
        <button onClick={exportPDF}>Export PDF</button>
      )}
      
      {isRetrying && (
        <div>
          Retry attempt {retryAttempt}
          <button onClick={cancelRetry}>Cancel</button>
        </div>
      )}
    </div>
  );
};
```

### Error Handling

#### Error Types
```typescript
enum PDFErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  GENERATION_FAILED = 'GENERATION_FAILED',
  EXPORT_FAILED = 'EXPORT_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',
  TIMEOUT = 'TIMEOUT'
}

interface PDFError extends Error {
  code: PDFErrorCode;
  retryable: boolean;
  details?: any;
}
```

#### Error Handling Example
```typescript
try {
  const result = await window.electronAPI.pdf.generate(options);
  if (!result.success) {
    handlePDFError(result.error, result.errorInfo);
  }
} catch (error) {
  // Handle IPC communication errors
  console.error('IPC error:', error);
}

function handlePDFError(error: string, errorInfo?: ErrorInfo) {
  if (errorInfo?.retryable) {
    // Show retry UI
  } else {
    // Show permanent error
  }
}
```

### Template System

#### Available Templates
| Template ID | Document Type | Required Fields |
|------------|---------------|-----------------|
| `provisional-patent-application` | Provisional Patent | title, inventors, description |
| `nda-ip-specific` | NDA (IP-Specific) | parties, confidentialInfo, term |
| `patent-license-agreement` | Patent License | licensor, licensee, patents, royalties |
| `trademark-application` | Trademark Application | mark, owner, goodsServices |
| `patent-assignment-agreement` | Patent Assignment | assignor, assignee, patents, consideration |
| `technology-transfer-agreement` | Technology Transfer | transferor, transferee, technology, terms |
| `office-action-response` | Office Action Response | applicationNo, rejections, arguments |
| `cease-and-desist-letter` | Cease and Desist | sender, recipient, infringement, demands |

#### Template Usage
```typescript
// Get template information
const templateInfo = await window.electronAPI.pdf.getTemplateInfo('patent-assignment');

// Validate against template
const validation = await window.electronAPI.pdf.validateTemplate(
  documentData,
  'patent-assignment'
);

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

### Security Considerations

#### Content Validation
- Maximum content size: 5MB
- Allowed markdown features controlled by template
- Path traversal prevention in file operations
- XSS prevention in rendered content

#### IPC Security
```typescript
// Main process validates all requests
const secureHandler = (event, options) => {
  // Validate sender
  if (!isValidSender(event.sender)) {
    throw new Error('Invalid sender context');
  }

  // Validate options
  const validation = validatePDFOptions(options);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Process with sanitized options
  return processPDF(validation.sanitized);
};
```
```

### 2. TypeScript Type Definitions
File: `docs/api/pdf-types.md`

```markdown
# PDF TypeScript Type Definitions

## Core Types

### Document Types
```typescript
// Available document types
type DocumentType = 
  | 'provisional-patent-application'
  | 'nda-ip-specific'
  | 'patent-license-agreement'
  | 'trademark-application'
  | 'patent-assignment-agreement'
  | 'technology-transfer-agreement'
  | 'office-action-response'
  | 'cease-and-desist-letter';

// Document metadata
interface DocumentMetadata {
  title: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creationDate?: Date;
  modificationDate?: Date;
}

// Document content structure
interface DocumentContent {
  type: DocumentType;
  content: string;
  metadata: DocumentMetadata;
  data: Record<string, any>;
}
```

### PDF Generation Types
```typescript
// PDF generation options
interface PDFGenerationOptions {
  template: DocumentType;
  content: string;
  metadata?: DocumentMetadata;
  formatting?: PDFFormattingOptions;
  security?: PDFSecurityOptions;
}

// PDF formatting options
interface PDFFormattingOptions {
  fontSize?: number;
  fontFamily?: string;
  lineHeight?: number;
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  headerFooter?: boolean;
  pageNumbers?: boolean;
  watermark?: string;
}

// PDF security options
interface PDFSecurityOptions {
  userPassword?: string;
  ownerPassword?: string;
  permissions?: {
    printing?: boolean;
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
  };
}
```

### IPC Types
```typescript
// IPC channel names
const PDF_CHANNELS = {
  GENERATE: 'pdf:generate',
  EXPORT: 'pdf:export',
  PROGRESS: 'pdf:progress',
  ERROR: 'pdf:error'
} as const;

// IPC message types
interface IPCRequest<T = any> {
  id: string;
  channel: string;
  data: T;
  timestamp: number;
}

interface IPCResponse<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: IPCError;
  timestamp: number;
}

interface IPCError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}
```

### GUI Component Types
```typescript
// PDF viewer props
interface PDFViewerProps {
  pdfBuffer: ArrayBuffer | null;
  className?: string;
  onPageChange?: (page: number) => void;
  onZoomChange?: (zoom: number) => void;
  onError?: (error: Error) => void;
}

// Document toolbar props
interface DocumentToolbarProps {
  onGeneratePDF: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onExportPDF: () => void;
  isGeneratingPDF: boolean;
  viewMode: ViewMode;
  hasPDF: boolean;
}

// View modes
type ViewMode = 'text' | 'pdf' | 'split';

// PDF metadata display
interface PDFMetadataDisplayProps {
  metadata: PDFMetadata | null;
}

interface PDFMetadata {
  title: string;
  author: string;
  creationDate: Date;
  pages: number;
  size: number;
  templateId: string;
}
```

### Progress Types
```typescript
// Progress reporter interface
interface ProgressReporter {
  updateProgress(update: ProgressUpdate): void;
  onComplete(): void;
  onError(error: Error): void;
}

// Progress update structure
interface ProgressUpdate {
  stage: ProgressStage;
  progress: number;
  message: string;
  metadata?: {
    currentPage?: number;
    totalPages?: number;
    processedBytes?: number;
    totalBytes?: number;
    [key: string]: any;
  };
}

// Progress stages
type ProgressStage = 
  | 'initializing'
  | 'parsing'
  | 'processing'
  | 'generating'
  | 'finalizing'
  | 'complete'
  | 'error';
```

### Error Types
```typescript
// PDF-specific errors
class PDFGenerationError extends Error {
  code: PDFErrorCode;
  retryable: boolean;
  details?: any;

  constructor(
    message: string,
    code: PDFErrorCode,
    retryable: boolean = false,
    details?: any
  ) {
    super(message);
    this.name = 'PDFGenerationError';
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }
}

// Error codes
enum PDFErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  GENERATION_FAILED = 'GENERATION_FAILED',
  EXPORT_FAILED = 'EXPORT_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',
  TIMEOUT = 'TIMEOUT',
  INVALID_CONTENT = 'INVALID_CONTENT',
  RENDERER_ERROR = 'RENDERER_ERROR'
}
```

## Usage Examples

### Type-Safe PDF Generation
```typescript
import { PDFGenerationOptions, DocumentType } from '@/types/pdf';

async function generateDocument(
  type: DocumentType,
  data: Record<string, any>
): Promise<ArrayBuffer> {
  const options: PDFGenerationOptions = {
    template: type,
    content: await renderTemplate(type, data),
    metadata: {
      title: `${type} - ${new Date().toISOString()}`,
      author: 'CaseThread User'
    },
    formatting: {
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      pageNumbers: true
    }
  };

  const result = await window.electronAPI.pdf.generate(options);
  
  if (!result.success) {
    throw new PDFGenerationError(
      result.error || 'Unknown error',
      PDFErrorCode.GENERATION_FAILED,
      result.errorInfo?.retryable
    );
  }

  return result.data!;
}
```

### Type Guards
```typescript
// Document type guard
function isValidDocumentType(type: string): type is DocumentType {
  const validTypes: DocumentType[] = [
    'provisional-patent-application',
    'nda-ip-specific',
    // ... other types
  ];
  return validTypes.includes(type as DocumentType);
}

// Progress stage guard
function isProgressStage(stage: string): stage is ProgressStage {
  const validStages: ProgressStage[] = [
    'initializing',
    'parsing',
    'processing',
    'generating',
    'finalizing',
    'complete',
    'error'
  ];
  return validStages.includes(stage as ProgressStage);
}

// Error code guard
function isPDFError(error: any): error is PDFGenerationError {
  return error instanceof PDFGenerationError ||
         (error?.name === 'PDFGenerationError' && 'code' in error);
}
```
```

### 3. Integration Guide
File: `docs/guides/pdf-integration-guide.md`

```markdown
# PDF Integration Guide

## Overview
This guide covers how to integrate PDF generation capabilities into the CaseThread GUI application.

## Quick Start

### 1. Basic PDF Generation
```typescript
import { usePDFGeneration } from '@/hooks/usePDFGeneration';

function DocumentEditor() {
  const { generatePDF, loading, error, pdfBuffer } = usePDFGeneration();

  const handleGeneratePDF = async () => {
    await generatePDF();
  };

  return (
    <div>
      <button onClick={handleGeneratePDF} disabled={loading}>
        Generate PDF
      </button>
      {error && <ErrorMessage message={error} />}
      {pdfBuffer && <PDFViewer pdfBuffer={pdfBuffer} />}
    </div>
  );
}
```

### 2. Advanced Features

#### With Progress Tracking
```typescript
function DocumentWithProgress() {
  const { generatePDF, loading } = usePDFGeneration();
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);

  useEffect(() => {
    const handleProgress = (update: ProgressUpdate) => {
      setProgress(update);
    };

    window.electronAPI.on('pdf:progress', handleProgress);
    return () => {
      window.electronAPI.off('pdf:progress', handleProgress);
    };
  }, []);

  return (
    <div>
      <button onClick={generatePDF}>Generate PDF</button>
      {progress && (
        <ProgressBar 
          value={progress.progress} 
          label={progress.message}
        />
      )}
    </div>
  );
}
```

#### With Retry Logic
```typescript
function DocumentWithRetry() {
  const { 
    generatePDF, 
    error, 
    retryAttempt, 
    isRetrying,
    cancelRetry 
  } = usePDFGeneration();

  const handleGenerate = () => {
    generatePDF({
      enableRetry: true,
      retryOptions: {
        maxAttempts: 3,
        initialDelay: 1000,
        backoffFactor: 2
      }
    });
  };

  return (
    <div>
      <button onClick={handleGenerate}>Generate PDF</button>
      
      {isRetrying && (
        <div className="retry-status">
          <p>Retrying... Attempt {retryAttempt}</p>
          <button onClick={cancelRetry}>Cancel</button>
        </div>
      )}
      
      {error && !isRetrying && (
        <ErrorMessage message={error} />
      )}
    </div>
  );
}
```

### 3. Complete Implementation Example
```typescript
import React, { useState, useCallback } from 'react';
import { 
  EnhancedDocumentViewer,
  DocumentToolbar,
  PDFViewer,
  PDFMetadataDisplay 
} from '@/components';
import { usePDFGeneration } from '@/hooks/usePDFGeneration';

export function DocumentWorkspace() {
  const [viewMode, setViewMode] = useState<'text' | 'pdf'>('text');
  const {
    generatePDF,
    loading,
    error,
    pdfBuffer,
    exportPDF,
    clearPDF
  } = usePDFGeneration();

  const handleGeneratePDF = useCallback(async () => {
    try {
      await generatePDF();
      // Automatically switch to PDF view on success
      if (pdfBuffer) {
        setViewMode('pdf');
      }
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
  }, [generatePDF, pdfBuffer]);

  const handleViewModeChange = useCallback((mode: 'text' | 'pdf') => {
    if (mode === 'pdf' && !pdfBuffer) {
      // Generate PDF if switching to PDF view without one
      handleGeneratePDF();
    } else {
      setViewMode(mode);
    }
  }, [pdfBuffer, handleGeneratePDF]);

  return (
    <div className="h-screen flex flex-col">
      <DocumentToolbar
        onGeneratePDF={handleGeneratePDF}
        onViewModeChange={handleViewModeChange}
        onExportPDF={exportPDF}
        isGeneratingPDF={loading}
        viewMode={viewMode}
        hasPDF={!!pdfBuffer}
      />
      
      <div className="flex-1 flex">
        <div className="flex-1">
          {viewMode === 'text' ? (
            <EnhancedDocumentViewer />
          ) : (
            <PDFViewer pdfBuffer={pdfBuffer} />
          )}
        </div>
        
        {pdfBuffer && (
          <div className="w-64 border-l">
            <PDFMetadataDisplay pdfBuffer={pdfBuffer} />
          </div>
        )}
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
```

## Architecture Overview

### Component Hierarchy
```
DocumentWorkspace
├── DocumentToolbar
│   ├── Generate PDF Button
│   ├── View Mode Toggle
│   └── Export PDF Button
├── Content Area
│   ├── EnhancedDocumentViewer (text mode)
│   └── PDFViewer (pdf mode)
└── PDFMetadataDisplay (sidebar)
```

### Data Flow
```
User Action → React Component → IPC Call → Main Process → PDF Service
     ↑                                           ↓
     └──────── Progress Updates ←────────────────┘
```

### State Management
```typescript
// Recommended state structure
interface DocumentState {
  content: string;
  documentType: DocumentType;
  metadata: DocumentMetadata;
  pdfBuffer: ArrayBuffer | null;
  viewMode: ViewMode;
  generation: {
    loading: boolean;
    error: string | null;
    progress: ProgressUpdate | null;
  };
}
```

## Best Practices

### 1. Error Handling
- Always provide user feedback for errors
- Distinguish between retryable and permanent errors
- Log errors for debugging

### 2. Performance
- Clear PDF buffers when not needed
- Use blob URLs efficiently
- Implement proper cleanup in useEffect

### 3. User Experience
- Show progress for long operations
- Provide clear status indicators
- Allow cancellation of long operations

### 4. Security
- Validate all inputs before PDF generation
- Sanitize file paths for export
- Use content security policies

## Troubleshooting

### Common Issues

#### PDF Generation Fails
```typescript
// Check for common issues
if (error.includes('Template not found')) {
  // Ensure template ID is correct
} else if (error.includes('Invalid content')) {
  // Validate markdown content
} else if (error.includes('Out of memory')) {
  // Document may be too large
}
```

#### Progress Not Updating
```typescript
// Ensure progress subscription
useEffect(() => {
  window.electronAPI.progress.subscribe();
  return () => {
    window.electronAPI.progress.unsubscribe();
  };
}, []);
```

#### Export Fails
```typescript
// Handle export errors
try {
  await exportPDF();
} catch (err) {
  if (err.message.includes('cancelled')) {
    // User cancelled, no action needed
  } else {
    // Show error to user
  }
}
```

## Testing

### Unit Testing
```typescript
// Mock electron API
global.window = {
  electronAPI: {
    pdf: {
      generate: jest.fn(),
      export: jest.fn()
    }
  }
};

// Test component
test('generates PDF on button click', async () => {
  const { getByText } = render(<DocumentEditor />);
  
  fireEvent.click(getByText('Generate PDF'));
  
  await waitFor(() => {
    expect(window.electronAPI.pdf.generate).toHaveBeenCalled();
  });
});
```

### Integration Testing
See `__tests__/integration/pdf-generation-workflow.test.ts` for examples.
```

## Acceptance Criteria
- [ ] API documentation updated with GUI endpoints
- [ ] TypeScript definitions documented
- [ ] Integration guide includes working examples
- [ ] Security considerations documented
- [ ] Error handling patterns explained
- [ ] Testing strategies included
- [ ] Performance best practices covered

## Notes
- Keep documentation in sync with code
- Include code examples for all features
- Document breaking changes clearly
- Provide migration guides when needed
- Include troubleshooting section 