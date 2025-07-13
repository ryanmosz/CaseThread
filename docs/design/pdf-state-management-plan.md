# PDF State Management Plan

## Overview
This document outlines the state management architecture for PDF functionality in the CaseThread Electron application. The plan integrates with existing state patterns while providing efficient management of PDF buffers, generation status, and view states.

## State Architecture

### 1. Core State Structure

```typescript
// src/types/pdf-state.ts
export interface PDFState {
  // Document identification
  documentId: string | null;
  documentType: DocumentType | null;
  
  // Generation state
  generation: {
    isActive: boolean;
    progress: {
      step: PDFGenerationStep;
      detail: string;
      percentage: number;
      startTime: Date | null;
    };
    error: PDFError | null;
  };
  
  // PDF data
  data: {
    buffer: ArrayBuffer | null;
    blobUrl: string | null;
    metadata: PDFMetadata | null;
  };
  
  // View state
  view: {
    mode: ViewMode;
    pdfViewport: {
      currentPage: number;
      totalPages: number;
      zoom: number;
      rotation: 0 | 90 | 180 | 270;
      scrollPosition: { x: number; y: number };
    };
  };
  
  // Export state
  export: {
    isExporting: boolean;
    lastExportPath: string | null;
    exportError: Error | null;
  };
}

export enum PDFGenerationStep {
  IDLE = 'idle',
  PARSING = 'parsing',
  EXTRACTING_METADATA = 'extracting_metadata',
  PROCESSING_SIGNATURES = 'processing_signatures',
  GENERATING_LAYOUT = 'generating_layout',
  FINALIZING = 'finalizing',
  COMPLETE = 'complete'
}

export type ViewMode = 'text' | 'pdf' | 'split';

export interface PDFMetadata {
  pageCount: number;
  fileSize: number;
  documentType: string;
  generatedAt: Date;
  generationDuration: number;
  hasSignatureBlocks: boolean;
  formFields: string[];
}

export interface PDFError {
  code: PDFErrorCode;
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
}
```

### 2. State Management Implementation

We'll use React Context with useReducer for predictable state updates, integrating with the existing BackgroundGenerationContext pattern.

```typescript
// src/electron/renderer/src/contexts/PDFContext.tsx
import React, { createContext, useReducer, useContext, useRef, useEffect } from 'react';
import { PDFState, PDFAction } from '@/types/pdf-state';
import { PDFMemoryManager } from '@/utils/pdf-memory-manager';

const initialState: PDFState = {
  documentId: null,
  documentType: null,
  generation: {
    isActive: false,
    progress: {
      step: PDFGenerationStep.IDLE,
      detail: '',
      percentage: 0,
      startTime: null
    },
    error: null
  },
  data: {
    buffer: null,
    blobUrl: null,
    metadata: null
  },
  view: {
    mode: 'text',
    pdfViewport: {
      currentPage: 1,
      totalPages: 0,
      zoom: 100,
      rotation: 0,
      scrollPosition: { x: 0, y: 0 }
    }
  },
  export: {
    isExporting: false,
    lastExportPath: null,
    exportError: null
  }
};

const PDFContext = createContext<{
  state: PDFState;
  dispatch: React.Dispatch<PDFAction>;
} | undefined>(undefined);

export const PDFProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(pdfReducer, initialState);
  const memoryManager = useRef(new PDFMemoryManager());
  
  // Memory cleanup on unmount
  useEffect(() => {
    return () => {
      memoryManager.current.cleanup();
    };
  }, []);
  
  // Manage blob URLs
  useEffect(() => {
    if (state.data.buffer && !state.data.blobUrl) {
      const url = memoryManager.current.createBlobUrl(state.data.buffer);
      dispatch({ type: 'SET_BLOB_URL', payload: url });
    }
    
    // Cleanup old blob URL when buffer changes
    return () => {
      if (state.data.blobUrl) {
        memoryManager.current.revokeBlobUrl(state.data.blobUrl);
      }
    };
  }, [state.data.buffer]);
  
  return (
    <PDFContext.Provider value={{ state, dispatch }}>
      {children}
    </PDFContext.Provider>
  );
};
```

### 3. State Actions and Reducer

```typescript
// src/electron/renderer/src/reducers/pdf-reducer.ts
export type PDFAction =
  // Generation actions
  | { type: 'START_GENERATION'; payload: { documentId: string; documentType: DocumentType } }
  | { type: 'UPDATE_PROGRESS'; payload: { step: PDFGenerationStep; detail: string; percentage: number } }
  | { type: 'GENERATION_COMPLETE'; payload: { buffer: ArrayBuffer; metadata: PDFMetadata } }
  | { type: 'GENERATION_ERROR'; payload: PDFError }
  | { type: 'CANCEL_GENERATION' }
  
  // View actions
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'UPDATE_PDF_VIEWPORT'; payload: Partial<PDFState['view']['pdfViewport']> }
  | { type: 'SET_BLOB_URL'; payload: string }
  
  // Export actions
  | { type: 'START_EXPORT' }
  | { type: 'EXPORT_COMPLETE'; payload: string }
  | { type: 'EXPORT_ERROR'; payload: Error }
  
  // Data actions
  | { type: 'CLEAR_PDF' }
  | { type: 'LOAD_CACHED_PDF'; payload: { buffer: ArrayBuffer; metadata: PDFMetadata } };

export const pdfReducer = (state: PDFState, action: PDFAction): PDFState => {
  switch (action.type) {
    case 'START_GENERATION':
      return {
        ...state,
        documentId: action.payload.documentId,
        documentType: action.payload.documentType,
        generation: {
          isActive: true,
          progress: {
            step: PDFGenerationStep.PARSING,
            detail: 'Starting PDF generation...',
            percentage: 0,
            startTime: new Date()
          },
          error: null
        },
        data: {
          buffer: null,
          blobUrl: null,
          metadata: null
        }
      };
      
    case 'UPDATE_PROGRESS':
      return {
        ...state,
        generation: {
          ...state.generation,
          progress: {
            ...state.generation.progress,
            step: action.payload.step,
            detail: action.payload.detail,
            percentage: action.payload.percentage
          }
        }
      };
      
    case 'GENERATION_COMPLETE':
      const duration = state.generation.progress.startTime
        ? Date.now() - state.generation.progress.startTime.getTime()
        : 0;
        
      return {
        ...state,
        generation: {
          isActive: false,
          progress: {
            step: PDFGenerationStep.COMPLETE,
            detail: 'PDF generated successfully',
            percentage: 100,
            startTime: state.generation.progress.startTime
          },
          error: null
        },
        data: {
          buffer: action.payload.buffer,
          blobUrl: null, // Will be set by effect
          metadata: {
            ...action.payload.metadata,
            generationDuration: duration
          }
        }
      };
      
    case 'SET_VIEW_MODE':
      return {
        ...state,
        view: {
          ...state.view,
          mode: action.payload
        }
      };
      
    // ... other cases
    
    default:
      return state;
  }
};
```

### 4. Memory Management

```typescript
// src/electron/renderer/src/utils/pdf-memory-manager.ts
export class PDFMemoryManager {
  private blobUrls: Map<string, { url: string; size: number; created: Date }> = new Map();
  private maxMemory = 100 * 1024 * 1024; // 100MB limit
  private currentMemory = 0;
  
  createBlobUrl(buffer: ArrayBuffer): string {
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const size = buffer.byteLength;
    
    // Check memory limit
    if (this.currentMemory + size > this.maxMemory) {
      this.evictOldest();
    }
    
    this.blobUrls.set(url, { url, size, created: new Date() });
    this.currentMemory += size;
    
    return url;
  }
  
  revokeBlobUrl(url: string): void {
    const entry = this.blobUrls.get(url);
    if (entry) {
      URL.revokeObjectURL(url);
      this.currentMemory -= entry.size;
      this.blobUrls.delete(url);
    }
  }
  
  private evictOldest(): void {
    let oldest: { url: string; created: Date } | null = null;
    
    for (const [url, entry] of this.blobUrls) {
      if (!oldest || entry.created < oldest.created) {
        oldest = { url, created: entry.created };
      }
    }
    
    if (oldest) {
      this.revokeBlobUrl(oldest.url);
    }
  }
  
  cleanup(): void {
    for (const [url] of this.blobUrls) {
      URL.revokeObjectURL(url);
    }
    this.blobUrls.clear();
    this.currentMemory = 0;
  }
  
  getMemoryUsage(): { used: number; limit: number; count: number } {
    return {
      used: this.currentMemory,
      limit: this.maxMemory,
      count: this.blobUrls.size
    };
  }
}
```

### 5. IPC Communication Layer

```typescript
// src/electron/renderer/src/hooks/usePDFOperations.ts
import { useContext, useCallback } from 'react';
import { PDFContext } from '@/contexts/PDFContext';
import { useBackgroundGeneration } from '@/contexts/BackgroundGenerationContext';

export const usePDFOperations = () => {
  const context = useContext(PDFContext);
  if (!context) throw new Error('usePDFOperations must be used within PDFProvider');
  
  const { state, dispatch } = context;
  const { addOperation, updateOperation } = useBackgroundGeneration();
  
  const generatePDF = useCallback(async (
    content: string,
    documentType: DocumentType,
    documentId: string
  ) => {
    dispatch({ type: 'START_GENERATION', payload: { documentId, documentType } });
    
    // Register with background generation tracker
    const operationId = addOperation({
      type: 'pdf-generation',
      name: `Generating PDF: ${documentId}`,
      status: 'running'
    });
    
    try {
      // Set up progress listener
      const removeListener = window.api.onPDFProgress((progress) => {
        dispatch({
          type: 'UPDATE_PROGRESS',
          payload: {
            step: progress.step,
            detail: progress.detail,
            percentage: progress.percentage
          }
        });
        
        updateOperation(operationId, {
          progress: progress.percentage,
          message: progress.detail
        });
      });
      
      const result = await window.api.generatePDF({
        content,
        documentType,
        options: {
          includeMetadata: true,
          validateSignatures: true
        }
      });
      
      dispatch({
        type: 'GENERATION_COMPLETE',
        payload: {
          buffer: result.buffer,
          metadata: result.metadata
        }
      });
      
      updateOperation(operationId, {
        status: 'completed',
        progress: 100
      });
      
      removeListener();
    } catch (error) {
      const pdfError: PDFError = {
        code: error.code || 'GENERATION_FAILED',
        message: error.message,
        details: error,
        timestamp: new Date(),
        recoverable: error.code !== 'INVALID_DOCUMENT'
      };
      
      dispatch({ type: 'GENERATION_ERROR', payload: pdfError });
      
      updateOperation(operationId, {
        status: 'error',
        error: error.message
      });
    }
  }, [dispatch, addOperation, updateOperation]);
  
  const exportPDF = useCallback(async (defaultName?: string) => {
    if (!state.data.buffer) {
      throw new Error('No PDF to export');
    }
    
    dispatch({ type: 'START_EXPORT' });
    
    try {
      const filePath = await window.api.exportPDF({
        buffer: state.data.buffer,
        defaultName: defaultName || `${state.documentId}_${Date.now()}.pdf`
      });
      
      dispatch({ type: 'EXPORT_COMPLETE', payload: filePath });
      return filePath;
    } catch (error) {
      dispatch({ type: 'EXPORT_ERROR', payload: error });
      throw error;
    }
  }, [state.data.buffer, state.documentId, dispatch]);
  
  const setViewMode = useCallback((mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  }, [dispatch]);
  
  const updateViewport = useCallback((viewport: Partial<PDFState['view']['pdfViewport']>) => {
    dispatch({ type: 'UPDATE_PDF_VIEWPORT', payload: viewport });
  }, [dispatch]);
  
  const clearPDF = useCallback(() => {
    dispatch({ type: 'CLEAR_PDF' });
  }, [dispatch]);
  
  return {
    // State
    ...state,
    
    // Operations
    generatePDF,
    exportPDF,
    setViewMode,
    updateViewport,
    clearPDF,
    
    // Computed values
    canExport: !!state.data.buffer,
    canViewPDF: !!state.data.blobUrl,
    isProcessing: state.generation.isActive || state.export.isExporting
  };
};
```

### 6. Integration with Existing Components

```typescript
// Integration example for EnhancedDocumentViewer
export const EnhancedDocumentViewer: React.FC<Props> = ({ document }) => {
  const { 
    generatePDF, 
    view, 
    setViewMode, 
    data,
    generation,
    canViewPDF 
  } = usePDFOperations();
  
  const handleGeneratePDF = async () => {
    await generatePDF(
      document.content,
      document.type,
      document.id
    );
  };
  
  return (
    <div className="document-viewer">
      <Toolbar>
        <ViewModeToggle 
          mode={view.mode}
          onChange={setViewMode}
          disabled={!canViewPDF && view.mode === 'pdf'}
        />
        <PDFGenerateButton
          onClick={handleGeneratePDF}
          isGenerating={generation.isActive}
          progress={generation.progress}
        />
      </Toolbar>
      
      {view.mode === 'text' && <MarkdownViewer content={document.content} />}
      {view.mode === 'pdf' && data.blobUrl && (
        <PDFViewer url={data.blobUrl} viewport={view.pdfViewport} />
      )}
    </div>
  );
};
```

### 7. State Persistence Strategy

```typescript
// src/electron/renderer/src/utils/pdf-state-persistence.ts
interface PersistedPDFState {
  documentId: string;
  viewMode: ViewMode;
  viewport: PDFState['view']['pdfViewport'];
  lastExportPath: string | null;
}

export class PDFStatePersistence {
  private readonly STORAGE_KEY = 'casethread_pdf_state';
  
  save(state: PersistedPDFState): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to persist PDF state:', error);
    }
  }
  
  load(): PersistedPDFState | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load PDF state:', error);
      return null;
    }
  }
  
  clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
```

### 8. Performance Optimization

```typescript
// Debounced viewport updates
const debouncedUpdateViewport = useMemo(
  () => debounce((viewport) => {
    updateViewport(viewport);
  }, 300),
  [updateViewport]
);

// Lazy PDF component loading
const PDFViewer = lazy(() => import('@/components/PDFViewer'));

// Memoized PDF operations
const pdfOperations = useMemo(() => ({
  generate: generatePDF,
  export: exportPDF,
  clear: clearPDF
}), [generatePDF, exportPDF, clearPDF]);
```

## Error Handling Strategy

### Error Types and Recovery

```typescript
export enum PDFErrorCode {
  // Generation errors
  INVALID_DOCUMENT = 'INVALID_DOCUMENT',
  PARSING_FAILED = 'PARSING_FAILED',
  SIGNATURE_PROCESSING_FAILED = 'SIGNATURE_PROCESSING_FAILED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  
  // Export errors
  EXPORT_CANCELLED = 'EXPORT_CANCELLED',
  WRITE_PERMISSION_DENIED = 'WRITE_PERMISSION_DENIED',
  DISK_SPACE_INSUFFICIENT = 'DISK_SPACE_INSUFFICIENT',
  
  // View errors
  RENDER_FAILED = 'RENDER_FAILED',
  CORRUPT_PDF = 'CORRUPT_PDF'
}

const errorRecoveryStrategies: Record<PDFErrorCode, () => void> = {
  [PDFErrorCode.MEMORY_LIMIT_EXCEEDED]: () => {
    // Clear cached PDFs and retry
    memoryManager.cleanup();
  },
  [PDFErrorCode.SIGNATURE_PROCESSING_FAILED]: () => {
    // Retry without signature processing
    generatePDF(content, type, { skipSignatures: true });
  }
};
```

## Testing Strategy

```typescript
// Unit tests for reducer
describe('pdfReducer', () => {
  it('should handle generation lifecycle', () => {
    let state = pdfReducer(initialState, {
      type: 'START_GENERATION',
      payload: { documentId: 'doc1', documentType: 'patent-assignment' }
    });
    
    expect(state.generation.isActive).toBe(true);
    expect(state.generation.progress.step).toBe(PDFGenerationStep.PARSING);
    
    state = pdfReducer(state, {
      type: 'UPDATE_PROGRESS',
      payload: {
        step: PDFGenerationStep.PROCESSING_SIGNATURES,
        detail: 'Processing signature blocks',
        percentage: 60
      }
    });
    
    expect(state.generation.progress.percentage).toBe(60);
  });
});

// Integration tests with IPC
describe('PDF Operations', () => {
  it('should generate PDF with progress updates', async () => {
    const { result } = renderHook(() => usePDFOperations(), {
      wrapper: PDFProvider
    });
    
    const progressUpdates: any[] = [];
    
    // Mock IPC
    window.api.onPDFProgress = (callback) => {
      progressUpdates.push(callback);
      return () => {};
    };
    
    await act(async () => {
      await result.current.generatePDF('content', 'nda', 'doc1');
    });
    
    expect(progressUpdates.length).toBeGreaterThan(0);
  });
});
```

## Migration Plan

1. **Phase 1**: Implement core state structure and context
2. **Phase 2**: Integrate with EnhancedDocumentViewer
3. **Phase 3**: Add IPC communication layer
4. **Phase 4**: Implement memory management
5. **Phase 5**: Add persistence and optimization

## Future Considerations

1. **Caching Strategy**: Cache generated PDFs per document
2. **Offline Support**: Store PDFs for offline viewing
3. **Collaboration**: Share PDF view state between users
4. **Annotations**: Add state for PDF annotations
5. **Versioning**: Track PDF generation versions

## Summary

This state management plan provides:
- Clear separation of concerns between generation, view, and export states
- Memory-efficient blob URL management
- Integration with existing BackgroundGenerationContext
- Robust error handling and recovery
- Performance optimizations for large PDFs
- Extensible architecture for future features 