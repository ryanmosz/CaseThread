# Task 6.0.8.1: Write Unit Tests for PDF Components

## Overview
Create comprehensive unit tests for all PDF-related React components, hooks, and utilities to ensure reliability and maintainability of the PDF generation feature.

## Current State
- PDF components implemented but lack test coverage
- Basic test infrastructure exists with Jest and React Testing Library
- Mock electron API available in `__mocks__` directory
- No specific PDF component tests exist

## Implementation Details

### 1. Test PDF Generation Hook
File: `__tests__/electron/renderer/hooks/usePDFGeneration.test.tsx`

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePDFGeneration } from '@/electron/renderer/src/hooks/usePDFGeneration';
import { toast } from '@/electron/renderer/src/components/ui/use-toast';

// Mock dependencies
jest.mock('@/electron/renderer/src/components/ui/use-toast');
const mockElectronAPI = {
  pdf: {
    generate: jest.fn(),
    export: jest.fn()
  }
};
(global as any).window = { electronAPI: mockElectronAPI };

describe('usePDFGeneration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => usePDFGeneration());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.pdfBuffer).toBeNull();
  });

  it('should generate PDF successfully', async () => {
    const mockPdfBuffer = new ArrayBuffer(1024);
    mockElectronAPI.pdf.generate.mockResolvedValue({
      success: true,
      data: mockPdfBuffer
    });

    const { result } = renderHook(() => usePDFGeneration());

    await act(async () => {
      await result.current.generatePDF();
    });

    expect(mockElectronAPI.pdf.generate).toHaveBeenCalledWith({
      content: expect.any(String),
      templateId: expect.any(String),
      metadata: expect.any(Object)
    });

    expect(result.current.pdfBuffer).toBe(mockPdfBuffer);
    expect(result.current.error).toBeNull();
    expect(toast).toHaveBeenCalledWith({
      title: 'PDF Generated Successfully',
      description: 'Your document has been generated.',
      variant: 'default'
    });
  });

  it('should handle PDF generation errors', async () => {
    const errorMessage = 'PDF generation failed';
    mockElectronAPI.pdf.generate.mockResolvedValue({
      success: false,
      error: errorMessage
    });

    const { result } = renderHook(() => usePDFGeneration());

    await act(async () => {
      await result.current.generatePDF();
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.pdfBuffer).toBeNull();
    expect(toast).toHaveBeenCalledWith({
      title: 'PDF Generation Failed',
      description: errorMessage,
      variant: 'destructive'
    });
  });

  it('should export PDF successfully', async () => {
    const mockPdfBuffer = new ArrayBuffer(1024);
    const filePath = '/path/to/document.pdf';
    
    mockElectronAPI.pdf.export.mockResolvedValue({
      success: true,
      filePath
    });

    const { result } = renderHook(() => usePDFGeneration());
    
    // Set PDF buffer first
    act(() => {
      result.current.setPdfBuffer(mockPdfBuffer);
    });

    await act(async () => {
      await result.current.exportPDF();
    });

    expect(mockElectronAPI.pdf.export).toHaveBeenCalledWith({
      buffer: mockPdfBuffer,
      fileName: expect.stringMatching(/\.pdf$/)
    });

    expect(toast).toHaveBeenCalledWith({
      title: 'PDF Exported',
      description: `Document saved to: ${filePath}`,
      variant: 'default'
    });
  });

  it('should clear PDF buffer', () => {
    const mockPdfBuffer = new ArrayBuffer(1024);
    const { result } = renderHook(() => usePDFGeneration());

    act(() => {
      result.current.setPdfBuffer(mockPdfBuffer);
    });

    expect(result.current.pdfBuffer).toBe(mockPdfBuffer);

    act(() => {
      result.current.clearPDF();
    });

    expect(result.current.pdfBuffer).toBeNull();
  });

  it('should handle loading states correctly', async () => {
    let generateResolve: (value: any) => void;
    const generatePromise = new Promise((resolve) => {
      generateResolve = resolve;
    });

    mockElectronAPI.pdf.generate.mockReturnValue(generatePromise);

    const { result } = renderHook(() => usePDFGeneration());

    expect(result.current.loading).toBe(false);

    act(() => {
      result.current.generatePDF();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      generateResolve!({ success: true, data: new ArrayBuffer(1024) });
      await generatePromise;
    });

    expect(result.current.loading).toBe(false);
  });
});
```

### 2. Test PDF Viewer Component
File: `__tests__/electron/renderer/components/PDFViewer.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PDFViewer } from '@/electron/renderer/src/components/PDFViewer';
import '@testing-library/jest-dom';

// Mock PDF.js
jest.mock('pdfjs-dist', () => ({
  getDocument: jest.fn(),
  GlobalWorkerOptions: { workerSrc: '' }
}));

describe('PDFViewer', () => {
  const mockPdfBuffer = new ArrayBuffer(1024);
  const mockBlobUrl = 'blob:http://localhost/test-pdf';

  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => mockBlobUrl);
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    render(<PDFViewer pdfBuffer={mockPdfBuffer} />);
    
    expect(screen.getByText(/loading pdf/i)).toBeInTheDocument();
  });

  it('should create blob URL for PDF buffer', () => {
    render(<PDFViewer pdfBuffer={mockPdfBuffer} />);

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(
      expect.any(Blob)
    );
  });

  it('should clean up blob URL on unmount', () => {
    const { unmount } = render(<PDFViewer pdfBuffer={mockPdfBuffer} />);

    unmount();

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockBlobUrl);
  });

  it('should handle null PDF buffer', () => {
    render(<PDFViewer pdfBuffer={null} />);

    expect(screen.getByText(/no pdf available/i)).toBeInTheDocument();
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('should update when PDF buffer changes', () => {
    const { rerender } = render(<PDFViewer pdfBuffer={mockPdfBuffer} />);

    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);

    const newBuffer = new ArrayBuffer(2048);
    rerender(<PDFViewer pdfBuffer={newBuffer} />);

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockBlobUrl);
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(2);
  });

  it('should render PDF navigation controls', async () => {
    render(<PDFViewer pdfBuffer={mockPdfBuffer} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/previous page/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/next page/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/zoom in/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/zoom out/i)).toBeInTheDocument();
    });
  });
});
```

### 3. Test PDF Toolbar Component
File: `__tests__/electron/renderer/components/DocumentToolbar.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentToolbar } from '@/electron/renderer/src/components/DocumentToolbar';
import '@testing-library/jest-dom';

describe('DocumentToolbar', () => {
  const mockOnGeneratePDF = jest.fn();
  const mockOnViewModeChange = jest.fn();
  const mockOnExportPDF = jest.fn();

  const defaultProps = {
    onGeneratePDF: mockOnGeneratePDF,
    onViewModeChange: mockOnViewModeChange,
    onExportPDF: mockOnExportPDF,
    isGeneratingPDF: false,
    viewMode: 'text' as const,
    hasPDF: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render generate PDF button', () => {
    render(<DocumentToolbar {...defaultProps} />);

    const generateButton = screen.getByRole('button', { 
      name: /generate pdf/i 
    });
    expect(generateButton).toBeInTheDocument();
    expect(generateButton).not.toBeDisabled();
  });

  it('should disable generate button when generating', () => {
    render(<DocumentToolbar {...defaultProps} isGeneratingPDF={true} />);

    const generateButton = screen.getByRole('button', { 
      name: /generating/i 
    });
    expect(generateButton).toBeDisabled();
  });

  it('should call onGeneratePDF when clicked', () => {
    render(<DocumentToolbar {...defaultProps} />);

    const generateButton = screen.getByRole('button', { 
      name: /generate pdf/i 
    });
    fireEvent.click(generateButton);

    expect(mockOnGeneratePDF).toHaveBeenCalledTimes(1);
  });

  it('should show view mode toggle when PDF is available', () => {
    render(<DocumentToolbar {...defaultProps} hasPDF={true} />);

    expect(screen.getByRole('button', { name: /text view/i }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pdf view/i }))
      .toBeInTheDocument();
  });

  it('should highlight active view mode', () => {
    render(<DocumentToolbar {...defaultProps} hasPDF={true} viewMode="pdf" />);

    const pdfButton = screen.getByRole('button', { name: /pdf view/i });
    expect(pdfButton).toHaveClass('bg-gray-200');
  });

  it('should show export button when PDF is available', () => {
    render(<DocumentToolbar {...defaultProps} hasPDF={true} />);

    const exportButton = screen.getByRole('button', { name: /export pdf/i });
    expect(exportButton).toBeInTheDocument();
  });

  it('should call onExportPDF when export clicked', () => {
    render(<DocumentToolbar {...defaultProps} hasPDF={true} />);

    const exportButton = screen.getByRole('button', { name: /export pdf/i });
    fireEvent.click(exportButton);

    expect(mockOnExportPDF).toHaveBeenCalledTimes(1);
  });
});
```

### 4. Test PDF Retry Utilities
File: `__tests__/utils/pdf-retry.test.ts`

```typescript
import { withRetry, DEFAULT_RETRY_OPTIONS } from '@/utils/pdf-retry';

describe('PDF Retry Utilities', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should succeed on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');

    const result = await withRetry(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const promise = withRetry(operation);
    
    // Fast-forward through first retry delay
    jest.advanceTimersByTime(DEFAULT_RETRY_OPTIONS.initialDelay);
    
    const result = await promise;

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should not retry validation errors', async () => {
    const validationError = new Error('Invalid document format');
    const operation = jest.fn().mockRejectedValue(validationError);

    await expect(withRetry(operation)).rejects.toThrow(validationError);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should respect max attempts', async () => {
    const error = new Error('network error');
    const operation = jest.fn().mockRejectedValue(error);

    const promise = withRetry(operation, { maxAttempts: 3 });

    // Fast-forward through all retry delays
    for (let i = 0; i < 3; i++) {
      jest.advanceTimersByTime(10000); // Max delay
    }

    await expect(promise).rejects.toThrow(error);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff', async () => {
    const operation = jest.fn()
      .mockRejectedValue(new Error('network error'));

    withRetry(operation, { 
      maxAttempts: 3,
      initialDelay: 1000,
      backoffFactor: 2
    });

    // First attempt - no delay
    expect(operation).toHaveBeenCalledTimes(1);

    // Second attempt - 1000ms delay
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(operation).toHaveBeenCalledTimes(2);

    // Third attempt - 2000ms delay (1000 * 2^1)
    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should respect max delay', async () => {
    const operation = jest.fn()
      .mockRejectedValue(new Error('network error'));

    withRetry(operation, {
      maxAttempts: 5,
      initialDelay: 1000,
      maxDelay: 3000,
      backoffFactor: 10 // Would exceed max delay
    });

    // Fast-forward past max delay
    jest.advanceTimersByTime(3000);
    await Promise.resolve();

    // Should use max delay, not calculated delay
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
```

### 5. Test PDF Metadata Display
File: `__tests__/electron/renderer/components/PDFMetadataDisplay.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { PDFMetadataDisplay } from '@/electron/renderer/src/components/PDFMetadataDisplay';
import '@testing-library/jest-dom';

describe('PDFMetadataDisplay', () => {
  const mockMetadata = {
    title: 'Patent Assignment Agreement',
    author: 'CaseThread',
    creationDate: new Date('2024-01-15T10:30:00Z'),
    pages: 5,
    size: 1048576, // 1MB
    templateId: 'patent-assignment'
  };

  it('should display document title', () => {
    render(<PDFMetadataDisplay metadata={mockMetadata} />);

    expect(screen.getByText('Patent Assignment Agreement'))
      .toBeInTheDocument();
  });

  it('should display page count', () => {
    render(<PDFMetadataDisplay metadata={mockMetadata} />);

    expect(screen.getByText('5 pages')).toBeInTheDocument();
  });

  it('should format file size correctly', () => {
    render(<PDFMetadataDisplay metadata={mockMetadata} />);

    expect(screen.getByText('1.0 MB')).toBeInTheDocument();
  });

  it('should format creation date', () => {
    render(<PDFMetadataDisplay metadata={mockMetadata} />);

    expect(screen.getByText(/january 15, 2024/i)).toBeInTheDocument();
  });

  it('should handle missing metadata gracefully', () => {
    render(<PDFMetadataDisplay metadata={null} />);

    expect(screen.getByText(/no metadata available/i)).toBeInTheDocument();
  });

  it('should display template information', () => {
    render(<PDFMetadataDisplay metadata={mockMetadata} />);

    expect(screen.getByText(/patent assignment/i)).toBeInTheDocument();
  });
});
```

### 6. Test PDF Progress Integration
File: `__tests__/electron/renderer/components/BackgroundGenerationStatus.test.tsx`

```typescript
import { render, screen, act } from '@testing-library/react';
import { BackgroundGenerationContext } from '@/electron/renderer/src/contexts/BackgroundGenerationContext';
import { BackgroundGenerationStatus } from '@/electron/renderer/src/components/BackgroundGenerationStatus';
import '@testing-library/jest-dom';

describe('BackgroundGenerationStatus with PDF', () => {
  const mockContextValue = {
    generations: new Map(),
    addGeneration: jest.fn(),
    updateGeneration: jest.fn(),
    removeGeneration: jest.fn()
  };

  it('should show PDF generation progress', () => {
    const pdfGeneration = {
      id: 'pdf-123',
      type: 'pdf',
      fileName: 'document.pdf',
      status: 'in-progress',
      progress: 45,
      message: 'Generating PDF pages...'
    };

    mockContextValue.generations.set('pdf-123', pdfGeneration);

    render(
      <BackgroundGenerationContext.Provider value={mockContextValue}>
        <BackgroundGenerationStatus />
      </BackgroundGenerationContext.Provider>
    );

    expect(screen.getByText('document.pdf')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('Generating PDF pages...')).toBeInTheDocument();
  });

  it('should update progress dynamically', () => {
    const { rerender } = render(
      <BackgroundGenerationContext.Provider value={mockContextValue}>
        <BackgroundGenerationStatus />
      </BackgroundGenerationContext.Provider>
    );

    act(() => {
      mockContextValue.generations.set('pdf-123', {
        id: 'pdf-123',
        type: 'pdf',
        fileName: 'document.pdf',
        status: 'in-progress',
        progress: 75,
        message: 'Finalizing PDF...'
      });
    });

    rerender(
      <BackgroundGenerationContext.Provider value={mockContextValue}>
        <BackgroundGenerationStatus />
      </BackgroundGenerationContext.Provider>
    );

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Finalizing PDF...')).toBeInTheDocument();
  });
});
```

## Testing Strategy

### Unit Test Coverage Goals
- Minimum 80% code coverage for all PDF components
- 100% coverage for critical paths (generation, export, error handling)
- Test all edge cases and error scenarios
- Mock external dependencies properly

### Test Organization
```
__tests__/
├── electron/
│   ├── renderer/
│   │   ├── components/
│   │   │   ├── PDFViewer.test.tsx
│   │   │   ├── DocumentToolbar.test.tsx
│   │   │   ├── PDFMetadataDisplay.test.tsx
│   │   │   └── PDFRetryIndicator.test.tsx
│   │   └── hooks/
│   │       ├── usePDFGeneration.test.tsx
│   │       ├── usePDFExport.test.tsx
│   │       └── usePDFProgress.test.tsx
│   └── main/
│       └── ipc/
│           ├── pdf-generation-handler.test.ts
│           └── pdf-export-handler.test.ts
└── utils/
    └── pdf-retry.test.ts
```

### Running Tests
```bash
# Run all PDF component tests
npm test -- __tests__/electron/renderer

# Run with coverage
npm test -- --coverage __tests__/electron/renderer

# Run specific test file
npm test -- __tests__/electron/renderer/hooks/usePDFGeneration.test.tsx

# Run in watch mode
npm test -- --watch
```

## Acceptance Criteria
- [ ] All PDF components have comprehensive unit tests
- [ ] Tests cover happy paths and error scenarios
- [ ] Mock electron API properly configured
- [ ] Tests are fast and reliable
- [ ] Coverage reports show >80% coverage
- [ ] Tests follow React Testing Library best practices
- [ ] All tests pass in CI/CD pipeline

## Notes
- Use React Testing Library for component tests
- Mock electron IPC calls appropriately
- Test accessibility features
- Consider snapshot tests for complex UI components
- Add performance tests for large PDFs 