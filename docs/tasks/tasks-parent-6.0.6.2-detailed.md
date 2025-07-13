# Task 6.0.6.2: Handle View Mode State Transitions

## Overview
This task implements smooth state transitions between text and PDF view modes, ensuring data consistency, proper UI updates, and optimal user experience when switching between viewing modes.

## Current State Analysis

### Current Implementation
- EnhancedDocumentViewer shows only text content
- No view mode switching capability
- PDF opens in new window (temporary solution)
- No state preservation between modes

### Requirements
1. Seamless switching between text and PDF views
2. Preserve scroll position and zoom level
3. Synchronize highlights/selections
4. Maintain performance during transitions
5. Handle transition errors gracefully

## Implementation Plan

### 1. Create View Mode Store (Priority: High)

**File**: Create `src/electron/renderer/src/stores/ViewModeStore.ts`

```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type ViewMode = 'text' | 'pdf' | 'split';

export interface ViewState {
  scrollPosition: number;
  zoomLevel: number;
  selectedText?: string;
  searchQuery?: string;
  highlightedRegions?: Array<{
    start: number;
    end: number;
    color: string;
  }>;
}

interface ViewModeState {
  mode: ViewMode;
  previousMode: ViewMode | null;
  textViewState: ViewState;
  pdfViewState: ViewState;
  splitRatio: number; // For split view
  isTransitioning: boolean;
  transitionDirection: 'forward' | 'backward' | null;
  
  // Actions
  setMode: (mode: ViewMode) => void;
  updateTextViewState: (state: Partial<ViewState>) => void;
  updatePDFViewState: (state: Partial<ViewState>) => void;
  setSplitRatio: (ratio: number) => void;
  syncViewStates: () => void;
  
  // Computed
  getCurrentViewState: () => ViewState;
}

export const useViewModeStore = create<ViewModeState>()(
  subscribeWithSelector((set, get) => ({
    mode: 'text',
    previousMode: null,
    textViewState: {
      scrollPosition: 0,
      zoomLevel: 100,
    },
    pdfViewState: {
      scrollPosition: 0,
      zoomLevel: 100,
    },
    splitRatio: 0.5,
    isTransitioning: false,
    transitionDirection: null,
    
    setMode: async (newMode) => {
      const currentMode = get().mode;
      
      if (currentMode === newMode) return;
      
      // Start transition
      set({
        isTransitioning: true,
        transitionDirection: 
          (currentMode === 'text' && newMode === 'pdf') ||
          (currentMode === 'pdf' && newMode === 'split') ||
          (currentMode === 'text' && newMode === 'split')
            ? 'forward' : 'backward',
      });
      
      // Sync states before transition
      get().syncViewStates();
      
      // Delay for animation
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Complete transition
      set({
        mode: newMode,
        previousMode: currentMode,
        isTransitioning: false,
      });
    },
    
    updateTextViewState: (state) => {
      set((current) => ({
        textViewState: { ...current.textViewState, ...state },
      }));
    },
    
    updatePDFViewState: (state) => {
      set((current) => ({
        pdfViewState: { ...current.pdfViewState, ...state },
      }));
    },
    
    setSplitRatio: (ratio) => {
      set({ splitRatio: Math.max(0.2, Math.min(0.8, ratio)) });
    },
    
    syncViewStates: () => {
      const { mode, textViewState, pdfViewState } = get();
      
      // Sync common properties
      if (mode === 'text') {
        set({
          pdfViewState: {
            ...pdfViewState,
            scrollPosition: textViewState.scrollPosition,
            searchQuery: textViewState.searchQuery,
          },
        });
      } else if (mode === 'pdf') {
        set({
          textViewState: {
            ...textViewState,
            scrollPosition: pdfViewState.scrollPosition,
            searchQuery: pdfViewState.searchQuery,
          },
        });
      }
    },
    
    getCurrentViewState: () => {
      const { mode, textViewState, pdfViewState } = get();
      return mode === 'pdf' ? pdfViewState : textViewState;
    },
  }))
);
```

### 2. Create View Transition Component (Priority: High)

**File**: Create `src/electron/renderer/src/components/ViewTransition.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useViewModeStore } from '../stores/ViewModeStore';

interface ViewTransitionProps {
  children: React.ReactNode;
  viewKey: string;
}

export const ViewTransition: React.FC<ViewTransitionProps> = ({ 
  children, 
  viewKey 
}) => {
  const { isTransitioning, transitionDirection } = useViewModeStore();
  
  const variants = {
    enter: (direction: 'forward' | 'backward') => ({
      x: direction === 'forward' ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: 'forward' | 'backward') => ({
      x: direction === 'forward' ? '-100%' : '100%',
      opacity: 0,
    }),
  };
  
  return (
    <AnimatePresence mode="wait" custom={transitionDirection}>
      <motion.div
        key={viewKey}
        custom={transitionDirection}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: 'spring', stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
```

### 3. Create View Mode Toggle Component (Priority: High)

**File**: Create `src/electron/renderer/src/components/ViewModeToggle.tsx`

```typescript
import React from 'react';
import { useViewModeStore, ViewMode } from '../stores/ViewModeStore';
import { FileText, FileImage, Columns } from 'lucide-react';
import { motion } from 'framer-motion';

export const ViewModeToggle: React.FC = () => {
  const { mode, setMode, isTransitioning } = useViewModeStore();
  
  const modes: Array<{
    value: ViewMode;
    icon: React.ReactNode;
    label: string;
  }> = [
    { value: 'text', icon: <FileText size={16} />, label: 'Text' },
    { value: 'pdf', icon: <FileImage size={16} />, label: 'PDF' },
    { value: 'split', icon: <Columns size={16} />, label: 'Split' },
  ];
  
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
      <div className="relative flex">
        {/* Sliding indicator */}
        <motion.div
          className="absolute inset-0 bg-blue-500 rounded-md"
          layout
          layoutId="view-mode-indicator"
          style={{
            width: `${100 / modes.length}%`,
            left: `${(modes.findIndex(m => m.value === mode) * 100) / modes.length}%`,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
        />
        
        {/* Mode buttons */}
        {modes.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            disabled={isTransitioning}
            className={`
              relative z-10 flex items-center gap-1 px-3 py-1.5
              transition-colors duration-200
              ${mode === m.value ? 'text-white' : 'text-gray-600 hover:text-gray-900'}
            `}
            title={m.label}
          >
            {m.icon}
            <span className="text-xs font-medium">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
```

### 4. Update EnhancedDocumentViewer (Priority: High)

**File**: Update `src/electron/renderer/src/components/EnhancedDocumentViewer.tsx`

```typescript
import { ViewTransition } from './ViewTransition';
import { ViewModeToggle } from './ViewModeToggle';
import { PDFViewer } from './PDFViewer';
import { TextEditor } from './TextEditor';
import { SplitView } from './SplitView';
import { useViewModeStore } from '../stores/ViewModeStore';

export const EnhancedDocumentViewer: React.FC<Props> = ({
  documentContent,
  documentType,
  // ... other props
}) => {
  const { mode, textViewState, pdfViewState, updateTextViewState, updatePDFViewState } = useViewModeStore();
  const { blobUrl } = usePDFBuffer({ documentId, documentType });
  
  // Sync scroll position on content change
  useEffect(() => {
    if (mode === 'text') {
      const editor = editorRef.current;
      if (editor) {
        editor.scrollTop = textViewState.scrollPosition;
      }
    }
  }, [mode, textViewState.scrollPosition]);
  
  const handleTextScroll = (scrollTop: number) => {
    updateTextViewState({ scrollPosition: scrollTop });
  };
  
  const handlePDFScroll = (scrollTop: number) => {
    updatePDFViewState({ scrollPosition: scrollTop });
  };
  
  const renderContent = () => {
    switch (mode) {
      case 'text':
        return (
          <ViewTransition viewKey="text">
            <TextEditor
              content={documentContent}
              onScroll={handleTextScroll}
              scrollPosition={textViewState.scrollPosition}
              zoomLevel={textViewState.zoomLevel}
              searchQuery={textViewState.searchQuery}
            />
          </ViewTransition>
        );
        
      case 'pdf':
        return (
          <ViewTransition viewKey="pdf">
            {blobUrl ? (
              <PDFViewer
                url={blobUrl}
                onScroll={handlePDFScroll}
                scrollPosition={pdfViewState.scrollPosition}
                zoomLevel={pdfViewState.zoomLevel}
                searchQuery={pdfViewState.searchQuery}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Generate PDF to view</p>
              </div>
            )}
          </ViewTransition>
        );
        
      case 'split':
        return (
          <ViewTransition viewKey="split">
            <SplitView
              left={
                <TextEditor
                  content={documentContent}
                  onScroll={handleTextScroll}
                  scrollPosition={textViewState.scrollPosition}
                  zoomLevel={textViewState.zoomLevel}
                />
              }
              right={
                blobUrl ? (
                  <PDFViewer
                    url={blobUrl}
                    onScroll={handlePDFScroll}
                    scrollPosition={pdfViewState.scrollPosition}
                    zoomLevel={pdfViewState.zoomLevel}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-50">
                    <p className="text-gray-500">Generate PDF to view</p>
                  </div>
                )
              }
            />
          </ViewTransition>
        );
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">{documentType}</h2>
        
        <div className="flex items-center gap-4">
          <ViewModeToggle />
          
          {/* PDF Generation button - only show in text mode */}
          {mode === 'text' && (
            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Generate PDF</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
      
      <div className="relative flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
};
```

### 5. Create State Synchronization Service (Priority: Medium)

**File**: Create `src/electron/renderer/src/services/ViewStateSynchronizer.ts`

```typescript
export class ViewStateSynchronizer {
  private static instance: ViewStateSynchronizer;
  
  static getInstance(): ViewStateSynchronizer {
    if (!ViewStateSynchronizer.instance) {
      ViewStateSynchronizer.instance = new ViewStateSynchronizer();
    }
    return ViewStateSynchronizer.instance;
  }
  
  /**
   * Map text position to PDF page/position
   */
  async mapTextPositionToPDF(
    textPosition: number,
    documentContent: string,
    pdfMetadata: { pageBreaks: number[] }
  ): Promise<{ page: number; yPosition: number }> {
    // Calculate which page the text position falls on
    let currentPage = 1;
    let pageStartPosition = 0;
    
    for (let i = 0; i < pdfMetadata.pageBreaks.length; i++) {
      if (textPosition < pdfMetadata.pageBreaks[i]) {
        currentPage = i + 1;
        break;
      }
      pageStartPosition = pdfMetadata.pageBreaks[i];
    }
    
    // Calculate relative position within the page
    const relativePosition = textPosition - pageStartPosition;
    const pageLength = (pdfMetadata.pageBreaks[currentPage - 1] || documentContent.length) - pageStartPosition;
    const yPosition = (relativePosition / pageLength) * 100; // Percentage
    
    return { page: currentPage, yPosition };
  }
  
  /**
   * Map PDF position to text position
   */
  async mapPDFPositionToText(
    page: number,
    yPosition: number,
    pdfMetadata: { pageBreaks: number[] }
  ): Promise<number> {
    const pageStartPosition = page > 1 ? pdfMetadata.pageBreaks[page - 2] : 0;
    const pageEndPosition = pdfMetadata.pageBreaks[page - 1] || Infinity;
    const pageLength = pageEndPosition - pageStartPosition;
    
    // Calculate text position based on percentage
    const textPosition = pageStartPosition + Math.round((yPosition / 100) * pageLength);
    
    return textPosition;
  }
  
  /**
   * Sync search highlights between views
   */
  syncSearchHighlights(
    searchResults: Array<{ start: number; end: number }>,
    fromView: 'text' | 'pdf',
    documentMetadata: any
  ): Array<{ start: number; end: number; page?: number }> {
    if (fromView === 'text') {
      // Map text highlights to PDF pages
      return searchResults.map(result => {
        const { page } = this.mapTextPositionToPDF(
          result.start,
          '',
          documentMetadata
        );
        
        return { ...result, page };
      });
    } else {
      // Map PDF highlights to text positions
      // Implementation depends on PDF structure
      return searchResults;
    }
  }
}
```

### 6. Add Keyboard Shortcuts (Priority: Low)

**File**: Create `src/electron/renderer/src/hooks/useViewModeShortcuts.ts`

```typescript
import { useEffect } from 'react';
import { useViewModeStore, ViewMode } from '../stores/ViewModeStore';

export const useViewModeShortcuts = () => {
  const { mode, setMode } = useViewModeStore();
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for modifier key (Cmd on Mac, Ctrl on others)
      const modifier = event.metaKey || event.ctrlKey;
      
      if (!modifier) return;
      
      switch (event.key) {
        case '1':
          event.preventDefault();
          setMode('text');
          break;
          
        case '2':
          event.preventDefault();
          setMode('pdf');
          break;
          
        case '3':
          event.preventDefault();
          setMode('split');
          break;
          
        case '\\':
          event.preventDefault();
          // Toggle between text and PDF
          setMode(mode === 'text' ? 'pdf' : 'text');
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mode, setMode]);
};
```

## Testing Requirements

### Unit Tests

```typescript
describe('ViewModeStore', () => {
  it('should transition between modes correctly', async () => {
    const { setMode, mode } = useViewModeStore.getState();
    
    expect(mode).toBe('text');
    
    await act(async () => {
      await setMode('pdf');
    });
    
    expect(useViewModeStore.getState().mode).toBe('pdf');
    expect(useViewModeStore.getState().previousMode).toBe('text');
  });
  
  it('should sync view states', () => {
    const { updateTextViewState, syncViewStates, pdfViewState } = useViewModeStore.getState();
    
    updateTextViewState({ scrollPosition: 500, searchQuery: 'test' });
    syncViewStates();
    
    expect(useViewModeStore.getState().pdfViewState.scrollPosition).toBe(500);
    expect(useViewModeStore.getState().pdfViewState.searchQuery).toBe('test');
  });
});
```

### Integration Tests

```typescript
describe('View Mode Transitions', () => {
  it('should animate transitions smoothly', async () => {
    const { container } = render(
      <EnhancedDocumentViewer 
        documentContent="Test content"
        documentType="patent-assignment-agreement"
      />
    );
    
    const toggleButton = screen.getByTitle('PDF');
    
    // Trigger transition
    fireEvent.click(toggleButton);
    
    // Check for animation classes
    await waitFor(() => {
      const transitionElement = container.querySelector('[data-framer-motion]');
      expect(transitionElement).toBeInTheDocument();
    });
  });
  
  it('should preserve scroll position between modes', async () => {
    // Setup component with content
    // Scroll in text mode
    // Switch to PDF mode
    // Switch back to text mode
    // Verify scroll position preserved
  });
});
```

## Implementation Checklist

- [ ] Create view mode store
- [ ] Implement view transition component
- [ ] Create view mode toggle UI
- [ ] Update EnhancedDocumentViewer
- [ ] Implement state synchronization
- [ ] Add keyboard shortcuts
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation

## Dependencies

- Task 6.0.4.1 (PDF viewer component) must be complete
- Task 6.0.6.1 (PDF buffer state) must be complete

## Estimated Time

- Implementation: 4-5 hours
- Testing: 2 hours
- Total: 6-7 hours

## Notes

- Consider adding transition preferences (reduced motion)
- Add analytics for mode usage patterns
- Consider persisting preferred view mode
- Add touch gestures for mobile/tablet support
- Consider implementing smooth zoom transitions 