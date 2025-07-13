# Task 6.0.9.3: Clean Up and Optimize Code

## Overview
Perform final code cleanup, optimization, and refactoring to ensure the PDF integration is production-ready, maintainable, and performant.

## Current State
- PDF features implemented across multiple files
- Some duplicate code exists
- Performance not yet optimized
- Code organization needs review

## Cleanup Tasks

### 1. Remove Duplicate Code
File: `src/utils/pdf-common.ts`

```typescript
// Consolidate common PDF utilities
export const PDF_CONSTANTS = {
  MAX_CONTENT_SIZE: 5 * 1024 * 1024, // 5MB
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  ZOOM_LEVELS: [50, 75, 100, 125, 150, 200],
  PAGE_SIZES: {
    LETTER: { width: 612, height: 792 },
    LEGAL: { width: 612, height: 1008 },
    A4: { width: 595, height: 842 }
  }
} as const;

// Common validation functions
export function validatePDFContent(content: string): ValidationResult {
  if (!content || content.trim().length === 0) {
    return { 
      isValid: false, 
      error: 'Content cannot be empty' 
    };
  }

  if (Buffer.byteLength(content, 'utf8') > PDF_CONSTANTS.MAX_CONTENT_SIZE) {
    return { 
      isValid: false, 
      error: 'Content exceeds maximum size limit (5MB)' 
    };
  }

  return { isValid: true };
}

// Common error handling
export function createPDFError(
  message: string, 
  code: PDFErrorCode,
  retryable: boolean = false
): PDFGenerationError {
  return new PDFGenerationError(message, code, retryable);
}

// Common blob URL management
export class BlobURLManager {
  private urls = new Set<string>();

  createURL(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    this.urls.add(url);
    return url;
  }

  revokeURL(url: string): void {
    if (this.urls.has(url)) {
      URL.revokeObjectURL(url);
      this.urls.delete(url);
    }
  }

  revokeAll(): void {
    this.urls.forEach(url => URL.revokeObjectURL(url));
    this.urls.clear();
  }

  get count(): number {
    return this.urls.size;
  }
}
```

### 2. Optimize Performance
File: `src/electron/renderer/src/hooks/usePDFGeneration.ts`

```typescript
// Add performance optimizations
import { useMemo, useCallback, useRef } from 'react';
import { debounce } from '@/utils/debounce';

export const usePDFGeneration = () => {
  // Use refs for values that don't need re-renders
  const generationIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoize expensive computations
  const documentInfo = useMemo(() => {
    const doc = getCurrentDocument();
    if (!doc) return null;

    return {
      content: doc.content,
      templateId: getTemplateIdForDocument(doc),
      metadata: doc.metadata
    };
  }, [getCurrentDocument]);

  // Debounce PDF generation to prevent rapid calls
  const debouncedGenerate = useMemo(
    () => debounce(async (options: PDFGenerationOptions) => {
      // Cancel previous generation if still running
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      generationIdRef.current = generateId();

      try {
        const result = await window.electronAPI.pdf.generate({
          ...options,
          signal: abortControllerRef.current.signal,
          generationId: generationIdRef.current
        });

        return result;
      } finally {
        abortControllerRef.current = null;
      }
    }, 300),
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      debouncedGenerate.cancel();
    };
  }, [debouncedGenerate]);

  // Optimize re-renders with useCallback
  const generatePDF = useCallback(async (options?: PDFGenerationOptions) => {
    if (!documentInfo) {
      setError('No document available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await debouncedGenerate({
        ...documentInfo,
        ...options
      });

      if (result.success) {
        setPdfBuffer(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [documentInfo, debouncedGenerate]);

  return {
    generatePDF,
    loading,
    error,
    pdfBuffer,
    // ... other exports
  };
};
```

### 3. Memory Management
File: `src/electron/renderer/src/components/PDFViewer.tsx`

```typescript
// Optimize memory usage in PDF viewer
export const PDFViewer: React.FC<PDFViewerProps> = ({ pdfBuffer }) => {
  const blobManagerRef = useRef(new BlobURLManager());
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null);

  // Create blob URL with proper cleanup
  useEffect(() => {
    if (!pdfBuffer) {
      setPdfUrl(null);
      return;
    }

    // Create blob in chunks for large PDFs
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const url = blobManagerRef.current.createURL(blob);
    setPdfUrl(url);

    // Cleanup function
    return () => {
      blobManagerRef.current.revokeURL(url);
      if (pdfDocumentRef.current) {
        pdfDocumentRef.current.destroy();
        pdfDocumentRef.current = null;
      }
    };
  }, [pdfBuffer]);

  // Load PDF with memory optimization
  useEffect(() => {
    if (!pdfUrl) return;

    let cancelled = false;

    const loadPDF = async () => {
      try {
        setIsLoading(true);

        // Configure PDF.js for memory efficiency
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: 'cmaps/',
          cMapPacked: true,
          // Limit memory usage
          rangeChunkSize: 65536,
          disableAutoFetch: true,
          disableStream: false
        });

        if (cancelled) {
          loadingTask.destroy();
          return;
        }

        const pdf = await loadingTask.promise;
        if (!cancelled) {
          pdfDocumentRef.current = pdf;
          setNumPages(pdf.numPages);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('PDF loading error:', error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  // Render page with virtualization for performance
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDocumentRef.current) return;

    try {
      const page = await pdfDocumentRef.current.getPage(pageNum);
      const viewport = page.getViewport({ scale: zoom / 100 });

      // Create offscreen canvas for rendering
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d', {
        alpha: false,
        desynchronized: true
      });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render with performance optimizations
      const renderContext = {
        canvasContext: context,
        viewport,
        // Use CSS transforms for better performance
        transform: [devicePixelRatio, 0, 0, devicePixelRatio, 0, 0]
      };

      await page.render(renderContext).promise;

      // Clean up page object
      page.cleanup();
    } catch (error) {
      console.error('Page render error:', error);
    }
  }, [zoom]);

  // ... rest of component
};
```

### 4. Bundle Size Optimization
File: `webpack.config.js` or `vite.config.js`

```javascript
// Optimize bundle size for PDF features
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate PDF.js into its own chunk
          'pdf-viewer': ['pdfjs-dist'],
          // Separate React PDF components
          'pdf-components': [
            './src/electron/renderer/src/components/PDFViewer',
            './src/electron/renderer/src/components/PDFMetadataDisplay'
          ]
        }
      }
    },
    // Tree-shake unused PDF.js features
    treeShake: {
      moduleSideEffects: (id) => {
        if (id.includes('pdfjs-dist')) {
          return !id.includes('build/pdf.worker');
        }
        return true;
      }
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
    exclude: ['pdfjs-dist/build/pdf.worker.entry']
  }
};
```

### 5. Code Organization Refactor
File: `src/electron/renderer/src/features/pdf/index.ts`

```typescript
// Reorganize PDF features into feature module
export * from './components/PDFViewer';
export * from './components/PDFToolbar';
export * from './components/PDFMetadataDisplay';
export * from './hooks/usePDFGeneration';
export * from './hooks/usePDFExport';
export * from './hooks/usePDFProgress';
export * from './utils/pdf-validation';
export * from './utils/pdf-retry';
export * from './types';

// Feature configuration
export const PDF_FEATURE_CONFIG = {
  enabled: true,
  maxFileSize: 5 * 1024 * 1024,
  supportedFormats: ['letter', 'legal', 'a4'],
  defaultZoom: 100,
  cacheEnabled: true,
  cacheDuration: 3600000 // 1 hour
};
```

### 6. Type Safety Improvements
File: `src/types/pdf-strict.ts`

```typescript
// Add stricter type definitions
import { z } from 'zod';

// Runtime validation schemas
export const PDFGenerateRequestSchema = z.object({
  content: z.string().min(1).max(5 * 1024 * 1024),
  templateId: z.enum([
    'provisional-patent-application',
    'nda-ip-specific',
    'patent-license-agreement',
    'trademark-application',
    'patent-assignment-agreement',
    'technology-transfer-agreement',
    'office-action-response',
    'cease-and-desist-letter'
  ]),
  metadata: z.object({
    author: z.string().optional(),
    title: z.string().optional(),
    subject: z.string().optional(),
    keywords: z.array(z.string()).optional()
  }).optional()
});

export type PDFGenerateRequest = z.infer<typeof PDFGenerateRequestSchema>;

// Type guards with runtime validation
export function isPDFGenerateRequest(data: unknown): data is PDFGenerateRequest {
  return PDFGenerateRequestSchema.safeParse(data).success;
}

// Branded types for extra safety
export type PDFBuffer = ArrayBuffer & { readonly _brand: unique symbol };
export type GenerationId = string & { readonly _brand: unique symbol };

// Helper functions for branded types
export function toPDFBuffer(buffer: ArrayBuffer): PDFBuffer {
  return buffer as PDFBuffer;
}

export function toGenerationId(id: string): GenerationId {
  return id as GenerationId;
}
```

### 7. Testing Improvements
File: `__tests__/helpers/pdf-test-utils.ts`

```typescript
// Consolidated test utilities
export class PDFTestHelper {
  static createMockPDFBuffer(size: number = 1024): ArrayBuffer {
    return new ArrayBuffer(size);
  }

  static createMockPDFGenerateResponse(
    overrides?: Partial<PDFGenerateResponse>
  ): PDFGenerateResponse {
    return {
      success: true,
      data: this.createMockPDFBuffer(),
      metadata: {
        duration: 1000,
        size: 1024,
        attemptNumber: 1
      },
      ...overrides
    };
  }

  static async waitForPDFGeneration(
    app: Application,
    timeout: number = 30000
  ): Promise<void> {
    await app.client.waitUntil(
      async () => {
        const toast = await app.client.getText('[data-testid="toast-message"]');
        return toast.includes('PDF Generated Successfully');
      },
      { timeout, timeoutMsg: 'PDF generation did not complete in time' }
    );
  }

  static async validatePDFStructure(pdfPath: string): Promise<void> {
    const content = await fs.readFile(pdfPath);
    
    // Check PDF header
    expect(content.slice(0, 5).toString()).toBe('%PDF-');
    
    // Check for EOF marker
    const footer = content.slice(-7).toString();
    expect(footer).toContain('%%EOF');
  }
}

// Performance test utilities
export class PDFPerformanceMonitor {
  private marks = new Map<string, number>();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : performance.now();
    
    if (!start) throw new Error(`Mark ${startMark} not found`);
    
    const duration = end - start;
    console.log(`${name}: ${duration.toFixed(2)}ms`);
    
    return duration;
  }

  getAllMeasurements(): Record<string, number> {
    const measurements: Record<string, number> = {};
    
    this.marks.forEach((time, mark) => {
      if (mark.endsWith('-start')) {
        const endMark = mark.replace('-start', '-end');
        if (this.marks.has(endMark)) {
          const name = mark.replace('-start', '');
          measurements[name] = this.measure(name, mark, endMark);
        }
      }
    });
    
    return measurements;
  }
}
```

### 8. Logging and Monitoring
File: `src/utils/pdf-logger.ts`

```typescript
// Enhanced logging for PDF operations
export class PDFLogger {
  private static instance: PDFLogger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  static getInstance(): PDFLogger {
    if (!this.instance) {
      this.instance = new PDFLogger();
    }
    return this.instance;
  }

  log(level: LogLevel, message: string, metadata?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata
    };

    this.logs.push(entry);
    
    // Rotate logs if needed
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console[level](message, metadata);
    }
  }

  info(message: string, metadata?: any): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: any): void {
    this.log('warn', message, metadata);
  }

  error(message: string, error?: Error, metadata?: any): void {
    this.log('error', message, {
      ...metadata,
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      }
    });
  }

  performance(operation: string, duration: number, metadata?: any): void {
    this.log('info', `Performance: ${operation}`, {
      duration,
      ...metadata
    });
  }

  getLogs(filter?: LogFilter): LogEntry[] {
    let filtered = [...this.logs];

    if (filter?.level) {
      filtered = filtered.filter(log => log.level === filter.level);
    }

    if (filter?.startTime) {
      filtered = filtered.filter(
        log => new Date(log.timestamp) >= filter.startTime!
      );
    }

    if (filter?.endTime) {
      filtered = filtered.filter(
        log => new Date(log.timestamp) <= filter.endTime!
      );
    }

    return filtered;
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clear(): void {
    this.logs = [];
  }
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: any;
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogFilter {
  level?: LogLevel;
  startTime?: Date;
  endTime?: Date;
}
```

## Performance Optimization Checklist

### Memory Optimization
- [ ] Implement blob URL lifecycle management
- [ ] Use virtualization for large PDFs
- [ ] Clean up PDF.js resources properly
- [ ] Limit concurrent PDF operations
- [ ] Implement garbage collection hints

### Bundle Size Optimization
- [ ] Code-split PDF features
- [ ] Tree-shake unused PDF.js modules
- [ ] Lazy load PDF viewer component
- [ ] Optimize import statements
- [ ] Remove development-only code

### Runtime Performance
- [ ] Debounce PDF generation calls
- [ ] Implement request cancellation
- [ ] Use Web Workers for heavy operations
- [ ] Optimize React re-renders
- [ ] Cache generated PDFs appropriately

### Code Quality
- [ ] Remove duplicate code
- [ ] Improve type safety
- [ ] Add comprehensive logging
- [ ] Enhance error handling
- [ ] Document complex functions

## Monitoring and Metrics

### Performance Metrics to Track
```typescript
interface PDFMetrics {
  generationTime: number;
  fileSize: number;
  memoryUsage: number;
  errorRate: number;
  retryCount: number;
  cacheHitRate: number;
}

// Collect and report metrics
function reportPDFMetrics(metrics: PDFMetrics): void {
  if (window.electronAPI.telemetry) {
    window.electronAPI.telemetry.report('pdf-generation', metrics);
  }
}
```

### Error Tracking
```typescript
// Enhanced error tracking
function trackPDFError(error: Error, context: any): void {
  PDFLogger.getInstance().error('PDF operation failed', error, context);
  
  if (window.electronAPI.errorTracking) {
    window.electronAPI.errorTracking.report({
      error,
      context,
      feature: 'pdf-generation',
      severity: 'high'
    });
  }
}
```

## Acceptance Criteria
- [ ] No duplicate code across PDF features
- [ ] Bundle size reduced by at least 20%
- [ ] Memory usage optimized for large PDFs
- [ ] All PDF operations properly logged
- [ ] Type safety improved throughout
- [ ] Performance metrics implemented
- [ ] Code coverage above 80%

## Notes
- Profile before and after optimizations
- Test with large PDF files (100+ pages)
- Verify no functionality is broken
- Document any breaking changes
- Consider backward compatibility 