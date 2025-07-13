# Task 6.0.1.3 - Plan state management for PDF data

## Description
Design the state management architecture for PDF-related data in the Electron application. This includes managing PDF buffers, metadata, generation status, and view states across the renderer and main processes.

## Implementation Steps

### 1. Analyze Current State Management
Review existing state patterns in:
- EnhancedDocumentViewer component state
- BackgroundGenerationContext
- IPC communication patterns
- Document management state

### 2. Design PDF State Structure

#### Core PDF State Interface
```typescript
interface PDFState {
  // Generation state
  isGenerating: boolean;
  generationProgress: {
    step: string;
    detail: string;
    percentage: number;
  } | null;
  generationError: Error | null;
  
  // PDF data
  pdfBuffer: ArrayBuffer | null;
  pdfBlobUrl: string | null;
  pdfMetadata: {
    pageCount: number;
    fileSize: number;
    documentType: string;
    generatedAt: Date;
    generationDuration: number;
  } | null;
  
  // View state
  viewMode: 'text' | 'pdf' | 'split';
  pdfViewState: {
    currentPage: number;
    zoom: number;
    scrollPosition: { x: number; y: number };
  };
  
  // Export state
  lastExportPath: string | null;
  isExporting: boolean;
}
```

### 3. Design State Management Approach

#### Option A: React Context + useReducer
```typescript
// PDF context for component tree
const PDFContext = createContext<{
  state: PDFState;
  dispatch: Dispatch<PDFAction>;
}>({} as any);

// Actions
type PDFAction =
  | { type: 'START_GENERATION' }
  | { type: 'UPDATE_PROGRESS'; payload: { step: string; detail: string; percentage: number } }
  | { type: 'GENERATION_COMPLETE'; payload: { buffer: ArrayBuffer; metadata: PDFMetadata } }
  | { type: 'GENERATION_ERROR'; payload: Error }
  | { type: 'SET_VIEW_MODE'; payload: 'text' | 'pdf' | 'split' }
  | { type: 'UPDATE_PDF_VIEW'; payload: Partial<PDFViewState> }
  | { type: 'CLEAR_PDF' };
```

#### Option B: Zustand Store (if already used)
```typescript
interface PDFStore extends PDFState {
  // Actions
  startGeneration: () => void;
  updateProgress: (step: string, detail: string, percentage: number) => void;
  setGenerationComplete: (buffer: ArrayBuffer, metadata: PDFMetadata) => void;
  setGenerationError: (error: Error) => void;
  setViewMode: (mode: 'text' | 'pdf' | 'split') => void;
  updatePdfView: (state: Partial<PDFViewState>) => void;
  clearPdf: () => void;
}
```

### 4. Plan IPC State Synchronization

#### Main Process State
```typescript
// Track active PDF generations per window
interface MainProcessPDFState {
  activeGenerations: Map<number, {
    webContentsId: number;
    documentPath: string;
    startTime: Date;
    service: PDFExportService;
  }>;
}
```

#### IPC Events for State Updates
```typescript
// Renderer → Main
ipcRenderer.invoke('pdf:generate', { content, documentType, options });
ipcRenderer.invoke('pdf:export', { buffer, defaultPath });
ipcRenderer.invoke('pdf:cancel-generation');

// Main → Renderer
ipcMain.on('pdf:progress', (event, { step, detail, percentage }) => {
  event.sender.send('pdf:progress-update', { step, detail, percentage });
});
```

### 5. Design Memory Management Strategy

```typescript
class PDFMemoryManager {
  private blobUrls: Set<string> = new Set();
  
  createBlobUrl(buffer: ArrayBuffer): string {
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    this.blobUrls.add(url);
    return url;
  }
  
  revokeBlobUrl(url: string): void {
    if (this.blobUrls.has(url)) {
      URL.revokeObjectURL(url);
      this.blobUrls.delete(url);
    }
  }
  
  cleanup(): void {
    this.blobUrls.forEach(url => URL.revokeObjectURL(url));
    this.blobUrls.clear();
  }
}
```

## Code Examples

### State Provider Implementation
```typescript
export const PDFStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(pdfReducer, initialPDFState);
  const memoryManager = useRef(new PDFMemoryManager());
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      memoryManager.current.cleanup();
    };
  }, []);
  
  // Handle blob URL creation
  useEffect(() => {
    if (state.pdfBuffer && !state.pdfBlobUrl) {
      const url = memoryManager.current.createBlobUrl(state.pdfBuffer);
      dispatch({ type: 'SET_BLOB_URL', payload: url });
    }
  }, [state.pdfBuffer]);
  
  return (
    <PDFContext.Provider value={{ state, dispatch }}>
      {children}
    </PDFContext.Provider>
  );
};
```

### Custom Hook for PDF Operations
```typescript
export const usePDFOperations = () => {
  const { state, dispatch } = useContext(PDFContext);
  
  const generatePDF = useCallback(async (content: string, documentType: string) => {
    dispatch({ type: 'START_GENERATION' });
    
    try {
      const result = await window.api.generatePDF({ content, documentType });
      dispatch({ 
        type: 'GENERATION_COMPLETE', 
        payload: { buffer: result.buffer, metadata: result.metadata } 
      });
    } catch (error) {
      dispatch({ type: 'GENERATION_ERROR', payload: error });
    }
  }, [dispatch]);
  
  const exportPDF = useCallback(async () => {
    if (!state.pdfBuffer) return;
    
    dispatch({ type: 'START_EXPORT' });
    try {
      const filePath = await window.api.exportPDF({ 
        buffer: state.pdfBuffer,
        defaultName: `document_${Date.now()}.pdf`
      });
      dispatch({ type: 'EXPORT_COMPLETE', payload: filePath });
    } catch (error) {
      dispatch({ type: 'EXPORT_ERROR', payload: error });
    }
  }, [state.pdfBuffer, dispatch]);
  
  return {
    ...state,
    generatePDF,
    exportPDF,
    setViewMode: (mode) => dispatch({ type: 'SET_VIEW_MODE', payload: mode }),
  };
};
```

## File Changes

### New Files to Create
1. `src/electron/renderer/src/contexts/PDFContext.tsx`
   - PDF state context and provider
   - State reducer implementation
   - Memory management utilities

2. `src/electron/renderer/src/hooks/usePDFOperations.ts`
   - Custom hook for PDF operations
   - IPC communication wrappers

3. `src/types/pdf-state.ts`
   - TypeScript interfaces for PDF state
   - Action type definitions

### Files to Modify
1. `src/electron/renderer/src/App.tsx`
   - Wrap app with PDFStateProvider

2. `src/electron/renderer/src/components/EnhancedDocumentViewer.tsx`
   - Integrate PDF state management
   - Use PDF operations hook

## Testing Approach

### State Management Tests
```typescript
describe('PDF State Management', () => {
  it('should handle generation lifecycle', () => {
    const { result } = renderHook(() => usePDFOperations(), {
      wrapper: PDFStateProvider,
    });
    
    act(() => {
      result.current.generatePDF('content', 'patent-assignment');
    });
    
    expect(result.current.isGenerating).toBe(true);
  });
  
  it('should cleanup blob URLs on unmount', () => {
    const revokeObjectURL = jest.spyOn(URL, 'revokeObjectURL');
    const { unmount } = render(<PDFStateProvider><div /></PDFStateProvider>);
    
    unmount();
    expect(revokeObjectURL).toHaveBeenCalled();
  });
});
```

## Definition of Done

- [ ] PDF state structure designed and documented
- [ ] State management approach selected
- [ ] Memory management strategy implemented
- [ ] IPC synchronization plan created
- [ ] State persistence strategy defined
- [ ] Error handling patterns established
- [ ] Performance considerations documented
- [ ] Integration points with existing state identified

## Common Pitfalls

1. **Memory Leaks**: Not cleaning up blob URLs
   - Always revoke blob URLs when done
   - Implement cleanup on component unmount

2. **State Synchronization**: Main/renderer process mismatch
   - Keep single source of truth
   - Handle IPC failures gracefully

3. **Large Buffer Handling**: Keeping large PDFs in memory
   - Consider streaming for large files
   - Implement memory limits

4. **Lost State**: View state lost on document switch
   - Persist view preferences
   - Cache PDF state per document

5. **Race Conditions**: Multiple simultaneous generations
   - Queue or prevent concurrent generations
   - Cancel previous generations

## Notes

- Consider using existing state management if project already has one
- Keep PDF state separate from document content state
- Plan for future features (annotations, bookmarks)
- Document state shape for other developers
- Consider state persistence across app restarts 