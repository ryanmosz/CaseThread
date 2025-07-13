# Task 6.0.6.3: Manage Document Switching with PDF State

## Overview
This task implements state management for document switching while preserving PDF generation state, view preferences, and ensuring smooth transitions between different documents.

## Current State Analysis

### Current Issues
1. PDF buffers are lost when switching documents
2. View mode resets to text on document switch
3. No preservation of per-document preferences
4. Generation state not tracked across documents
5. Memory not cleaned up on document switch

### Requirements
1. Preserve PDF buffers when switching documents
2. Remember view mode per document
3. Clean up unused resources
4. Restore document state on return
5. Handle concurrent PDF generations

## Implementation Plan

### 1. Create Document State Manager (Priority: High)

**File**: Create `src/electron/renderer/src/stores/DocumentStateStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DocumentType } from '../../../../types';
import { ViewMode } from './ViewModeStore';

interface DocumentState {
  documentId: string;
  documentType: DocumentType;
  lastViewMode: ViewMode;
  lastScrollPosition: { text: number; pdf: number };
  lastZoomLevel: { text: number; pdf: number };
  hasPDFGenerated: boolean;
  pdfBufferId?: string;
  lastAccessed: Date;
  preferences: {
    autoGeneratePDF: boolean;
    defaultView: ViewMode;
    syncScroll: boolean;
  };
}

interface DocumentStateStore {
  documents: Map<string, DocumentState>;
  activeDocumentId: string | null;
  globalPreferences: {
    rememberViewMode: boolean;
    autoCleanupAfterDays: number;
    maxDocumentStates: number;
  };
  
  // Actions
  setActiveDocument: (documentId: string, documentType: DocumentType) => void;
  updateDocumentState: (documentId: string, updates: Partial<DocumentState>) => void;
  getDocumentState: (documentId: string) => DocumentState | undefined;
  cleanupOldStates: () => void;
  clearDocumentState: (documentId: string) => void;
  
  // Utilities
  getRecentDocuments: (limit?: number) => DocumentState[];
  hasVisitedDocument: (documentId: string) => boolean;
}

export const useDocumentStateStore = create<DocumentStateStore>()(
  persist(
    (set, get) => ({
      documents: new Map(),
      activeDocumentId: null,
      globalPreferences: {
        rememberViewMode: true,
        autoCleanupAfterDays: 30,
        maxDocumentStates: 50,
      },
      
      setActiveDocument: (documentId, documentType) => {
        const existingState = get().documents.get(documentId);
        
        if (!existingState) {
          // Create new document state
          const newState: DocumentState = {
            documentId,
            documentType,
            lastViewMode: 'text',
            lastScrollPosition: { text: 0, pdf: 0 },
            lastZoomLevel: { text: 100, pdf: 100 },
            hasPDFGenerated: false,
            lastAccessed: new Date(),
            preferences: {
              autoGeneratePDF: false,
              defaultView: 'text',
              syncScroll: true,
            },
          };
          
          set((state) => {
            const newDocuments = new Map(state.documents);
            newDocuments.set(documentId, newState);
            
            // Cleanup if exceeding max
            if (newDocuments.size > state.globalPreferences.maxDocumentStates) {
              get().cleanupOldStates();
            }
            
            return {
              documents: newDocuments,
              activeDocumentId: documentId,
            };
          });
        } else {
          // Update existing state
          set((state) => {
            const newDocuments = new Map(state.documents);
            newDocuments.set(documentId, {
              ...existingState,
              lastAccessed: new Date(),
            });
            
            return {
              documents: newDocuments,
              activeDocumentId: documentId,
            };
          });
        }
      },
      
      updateDocumentState: (documentId, updates) => {
        set((state) => {
          const document = state.documents.get(documentId);
          if (!document) return state;
          
          const newDocuments = new Map(state.documents);
          newDocuments.set(documentId, {
            ...document,
            ...updates,
            lastAccessed: new Date(),
          });
          
          return { documents: newDocuments };
        });
      },
      
      getDocumentState: (documentId) => {
        return get().documents.get(documentId);
      },
      
      cleanupOldStates: () => {
        set((state) => {
          const now = Date.now();
          const maxAge = state.globalPreferences.autoCleanupAfterDays * 24 * 60 * 60 * 1000;
          const newDocuments = new Map();
          
          // Convert to array and sort by last accessed
          const sortedDocs = Array.from(state.documents.entries())
            .sort(([, a], [, b]) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
          
          // Keep recent documents up to max
          sortedDocs.slice(0, state.globalPreferences.maxDocumentStates).forEach(([id, doc]) => {
            const age = now - doc.lastAccessed.getTime();
            if (age < maxAge || id === state.activeDocumentId) {
              newDocuments.set(id, doc);
            }
          });
          
          return { documents: newDocuments };
        });
      },
      
      clearDocumentState: (documentId) => {
        set((state) => {
          const newDocuments = new Map(state.documents);
          newDocuments.delete(documentId);
          
          return {
            documents: newDocuments,
            activeDocumentId: state.activeDocumentId === documentId ? null : state.activeDocumentId,
          };
        });
      },
      
      getRecentDocuments: (limit = 10) => {
        const documents = Array.from(get().documents.values());
        return documents
          .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
          .slice(0, limit);
      },
      
      hasVisitedDocument: (documentId) => {
        return get().documents.has(documentId);
      },
    }),
    {
      name: 'document-state-storage',
      partialize: (state) => ({
        documents: Array.from(state.documents.entries()).map(([id, doc]) => ({
          id,
          ...doc,
          lastAccessed: doc.lastAccessed.toISOString(),
        })),
        globalPreferences: state.globalPreferences,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.documents) {
          // Convert array back to Map and parse dates
          const documentsMap = new Map();
          
          (state.documents as any[]).forEach((item) => {
            const { id, ...doc } = item;
            documentsMap.set(id, {
              ...doc,
              lastAccessed: new Date(doc.lastAccessed),
            });
          });
          
          state.documents = documentsMap;
        }
      },
    }
  )
);
```

### 2. Create Document Switch Handler (Priority: High)

**File**: Create `src/electron/renderer/src/hooks/useDocumentSwitch.ts`

```typescript
import { useEffect, useCallback, useRef } from 'react';
import { useDocumentStateStore } from '../stores/DocumentStateStore';
import { useViewModeStore } from '../stores/ViewModeStore';
import { usePDFBufferStore } from '../stores/PDFBufferStore';
import { DocumentType } from '../../../../types';

interface UseDocumentSwitchOptions {
  documentId: string;
  documentType: DocumentType;
  onDocumentChange?: (previousId: string | null, newId: string) => void;
}

export const useDocumentSwitch = ({
  documentId,
  documentType,
  onDocumentChange,
}: UseDocumentSwitchOptions) => {
  const previousDocumentId = useRef<string | null>(null);
  
  const {
    setActiveDocument,
    updateDocumentState,
    getDocumentState,
  } = useDocumentStateStore();
  
  const {
    mode: currentViewMode,
    setMode,
    textViewState,
    pdfViewState,
  } = useViewModeStore();
  
  const { activeBufferId } = usePDFBufferStore();
  
  // Handle document switch
  useEffect(() => {
    if (documentId === previousDocumentId.current) return;
    
    const handleSwitch = async () => {
      // Save state of previous document
      if (previousDocumentId.current) {
        updateDocumentState(previousDocumentId.current, {
          lastViewMode: currentViewMode,
          lastScrollPosition: {
            text: textViewState.scrollPosition,
            pdf: pdfViewState.scrollPosition,
          },
          lastZoomLevel: {
            text: textViewState.zoomLevel,
            pdf: pdfViewState.zoomLevel,
          },
          pdfBufferId: activeBufferId || undefined,
        });
      }
      
      // Set new active document
      setActiveDocument(documentId, documentType);
      
      // Restore state of new document
      const newDocState = getDocumentState(documentId);
      if (newDocState) {
        // Restore view mode
        if (newDocState.lastViewMode && newDocState.hasPDFGenerated) {
          setMode(newDocState.lastViewMode);
        } else {
          setMode('text'); // Default to text if no PDF
        }
        
        // Restore scroll positions and zoom
        useViewModeStore.setState({
          textViewState: {
            ...textViewState,
            scrollPosition: newDocState.lastScrollPosition.text,
            zoomLevel: newDocState.lastZoomLevel.text,
          },
          pdfViewState: {
            ...pdfViewState,
            scrollPosition: newDocState.lastScrollPosition.pdf,
            zoomLevel: newDocState.lastZoomLevel.pdf,
          },
        });
        
        // Set active PDF buffer if exists
        if (newDocState.pdfBufferId) {
          usePDFBufferStore.getState().setActiveBuffer(newDocState.pdfBufferId);
        }
      }
      
      // Notify change
      if (onDocumentChange) {
        onDocumentChange(previousDocumentId.current, documentId);
      }
      
      previousDocumentId.current = documentId;
    };
    
    handleSwitch();
  }, [
    documentId,
    documentType,
    setActiveDocument,
    updateDocumentState,
    getDocumentState,
    onDocumentChange,
  ]);
  
  // Save state periodically
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (documentId) {
        updateDocumentState(documentId, {
          lastViewMode: currentViewMode,
          lastScrollPosition: {
            text: textViewState.scrollPosition,
            pdf: pdfViewState.scrollPosition,
          },
          lastZoomLevel: {
            text: textViewState.zoomLevel,
            pdf: pdfViewState.zoomLevel,
          },
        });
      }
    }, 5000); // Save every 5 seconds
    
    return () => clearInterval(saveInterval);
  }, [
    documentId,
    currentViewMode,
    textViewState,
    pdfViewState,
    updateDocumentState,
  ]);
  
  // Mark PDF as generated when buffer is added
  const markPDFGenerated = useCallback(() => {
    updateDocumentState(documentId, {
      hasPDFGenerated: true,
      pdfBufferId: activeBufferId || undefined,
    });
  }, [documentId, activeBufferId, updateDocumentState]);
  
  return {
    markPDFGenerated,
    documentState: getDocumentState(documentId),
  };
};
```

### 3. Create Document History Component (Priority: Medium)

**File**: Create `src/electron/renderer/src/components/DocumentHistory.tsx`

```typescript
import React, { useState } from 'react';
import { useDocumentStateStore } from '../stores/DocumentStateStore';
import { formatDistanceToNow } from 'date-fns';
import { FileText, FileImage, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DocumentHistoryProps {
  onSelectDocument: (documentId: string) => void;
  currentDocumentId?: string;
}

export const DocumentHistory: React.FC<DocumentHistoryProps> = ({
  onSelectDocument,
  currentDocumentId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { getRecentDocuments, clearDocumentState } = useDocumentStateStore();
  
  const recentDocuments = getRecentDocuments(10);
  
  const handleClearDocument = (e: React.MouseEvent, documentId: string) => {
    e.stopPropagation();
    clearDocumentState(documentId);
  };
  
  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        title="Recent Documents"
      >
        <Clock className="w-5 h-5 text-gray-600" />
      </button>
      
      {/* History Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-25 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg z-50"
            >
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Recent Documents</h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto h-full pb-20">
                {recentDocuments.length === 0 ? (
                  <p className="text-center text-gray-500 mt-8">No recent documents</p>
                ) : (
                  <div className="divide-y">
                    {recentDocuments.map((doc) => (
                      <div
                        key={doc.documentId}
                        onClick={() => {
                          onSelectDocument(doc.documentId);
                          setIsOpen(false);
                        }}
                        className={`
                          p-4 hover:bg-gray-50 cursor-pointer transition-colors
                          ${doc.documentId === currentDocumentId ? 'bg-blue-50' : ''}
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {doc.hasPDFGenerated ? (
                                <FileImage className="w-4 h-4 text-green-600" />
                              ) : (
                                <FileText className="w-4 h-4 text-gray-400" />
                              )}
                              <h3 className="font-medium text-sm">
                                {doc.documentType}
                              </h3>
                            </div>
                            
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDistanceToNow(doc.lastAccessed, { addSuffix: true })}
                            </p>
                            
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                {doc.lastViewMode}
                              </span>
                              {doc.hasPDFGenerated && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                  PDF Ready
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <button
                            onClick={(e) => handleClearDocument(e, doc.documentId)}
                            className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
```

### 4. Create Resource Cleanup Service (Priority: High)

**File**: Create `src/electron/renderer/src/services/ResourceCleanupService.ts`

```typescript
import { useDocumentStateStore } from '../stores/DocumentStateStore';
import { usePDFBufferStore } from '../stores/PDFBufferStore';
import { useViewModeStore } from '../stores/ViewModeStore';

export class ResourceCleanupService {
  private static instance: ResourceCleanupService;
  private cleanupTimeout: NodeJS.Timeout | null = null;
  
  static getInstance(): ResourceCleanupService {
    if (!ResourceCleanupService.instance) {
      ResourceCleanupService.instance = new ResourceCleanupService();
    }
    return ResourceCleanupService.instance;
  }
  
  /**
   * Schedule cleanup when switching documents
   */
  scheduleCleanup(previousDocumentId: string | null): void {
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
    }
    
    // Delay cleanup to allow for quick switches back
    this.cleanupTimeout = setTimeout(() => {
      this.performCleanup(previousDocumentId);
    }, 30000); // 30 seconds
  }
  
  /**
   * Perform resource cleanup
   */
  private performCleanup(excludeDocumentId: string | null): void {
    const documentStore = useDocumentStateStore.getState();
    const pdfStore = usePDFBufferStore.getState();
    
    // Get all document states
    const allDocuments = Array.from(documentStore.documents.values());
    const activeDocumentId = documentStore.activeDocumentId;
    
    // Find buffers that belong to inactive documents
    const buffersToClean: string[] = [];
    
    pdfStore.buffers.forEach((buffer, bufferId) => {
      const belongsToActiveDoc = buffer.documentId === activeDocumentId;
      const belongsToExcludedDoc = buffer.documentId === excludeDocumentId;
      
      if (!belongsToActiveDoc && !belongsToExcludedDoc) {
        // Check if document is in recent history
        const docState = documentStore.getDocumentState(buffer.documentId);
        
        if (!docState || Date.now() - docState.lastAccessed.getTime() > 600000) {
          // Document not accessed in last 10 minutes
          buffersToClean.push(bufferId);
        }
      }
    });
    
    // Clean up buffers
    buffersToClean.forEach(bufferId => {
      pdfStore.removeBuffer(bufferId);
    });
    
    // Clean up old document states
    documentStore.cleanupOldStates();
    
    console.log(`Cleaned up ${buffersToClean.length} PDF buffers`);
  }
  
  /**
   * Force immediate cleanup
   */
  forceCleanup(): void {
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
    }
    
    this.performCleanup(null);
  }
  
  /**
   * Cancel scheduled cleanup
   */
  cancelCleanup(): void {
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
  }
}
```

### 5. Update Main App Component (Priority: High)

**File**: Update `src/electron/renderer/src/App.tsx`

```typescript
import { useDocumentSwitch } from './hooks/useDocumentSwitch';
import { ResourceCleanupService } from './services/ResourceCleanupService';
import { DocumentHistory } from './components/DocumentHistory';

export const App: React.FC = () => {
  const [currentDocumentId, setCurrentDocumentId] = useState<string>('');
  const [currentDocumentType, setCurrentDocumentType] = useState<DocumentType>('provisional-patent-application');
  
  // Initialize document switch handling
  const { markPDFGenerated, documentState } = useDocumentSwitch({
    documentId: currentDocumentId,
    documentType: currentDocumentType,
    onDocumentChange: (previousId, newId) => {
      console.log(`Switched from document ${previousId} to ${newId}`);
      
      // Schedule cleanup of previous document resources
      if (previousId) {
        ResourceCleanupService.getInstance().scheduleCleanup(previousId);
      }
    },
  });
  
  // Handle app lifecycle
  useEffect(() => {
    const cleanupService = ResourceCleanupService.getInstance();
    
    // Cleanup on app close
    const handleBeforeUnload = () => {
      cleanupService.forceCleanup();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanupService.forceCleanup();
    };
  }, []);
  
  const handleDocumentSelect = (documentId: string) => {
    // Load document data and update state
    setCurrentDocumentId(documentId);
    // setCurrentDocumentType would be set based on loaded document
  };
  
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">CaseThread</h1>
            <DocumentHistory
              onSelectDocument={handleDocumentSelect}
              currentDocumentId={currentDocumentId}
            />
          </div>
          
          {/* Document list */}
          <DocumentList
            onSelectDocument={handleDocumentSelect}
            currentDocumentId={currentDocumentId}
          />
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1">
        {currentDocumentId ? (
          <EnhancedDocumentViewer
            documentId={currentDocumentId}
            documentType={currentDocumentType}
            documentContent={/* loaded content */}
            onPDFGenerated={markPDFGenerated}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Select a document to begin</p>
          </div>
        )}
      </div>
    </div>
  );
};
```

## Testing Requirements

### Unit Tests

```typescript
describe('DocumentStateStore', () => {
  it('should preserve state when switching documents', () => {
    const store = useDocumentStateStore.getState();
    
    // Set state for document 1
    store.setActiveDocument('doc1', 'patent-assignment-agreement');
    store.updateDocumentState('doc1', {
      lastViewMode: 'pdf',
      hasPDFGenerated: true,
    });
    
    // Switch to document 2
    store.setActiveDocument('doc2', 'provisional-patent-application');
    
    // Switch back to document 1
    store.setActiveDocument('doc1', 'patent-assignment-agreement');
    
    // Verify state preserved
    const doc1State = store.getDocumentState('doc1');
    expect(doc1State?.lastViewMode).toBe('pdf');
    expect(doc1State?.hasPDFGenerated).toBe(true);
  });
  
  it('should cleanup old document states', () => {
    const store = useDocumentStateStore.getState();
    
    // Add many documents
    for (let i = 0; i < 60; i++) {
      store.setActiveDocument(`doc${i}`, 'patent-assignment-agreement');
    }
    
    store.cleanupOldStates();
    
    // Should not exceed max
    expect(store.documents.size).toBeLessThanOrEqual(50);
  });
});
```

### Integration Tests

```typescript
describe('Document Switching Integration', () => {
  it('should restore complete state when returning to document', async () => {
    // Generate PDF for document 1
    // Switch to document 2
    // Switch back to document 1
    // Verify PDF buffer still available
    // Verify view mode restored
    // Verify scroll position restored
  });
  
  it('should cleanup resources after timeout', async () => {
    // Switch between documents
    // Wait for cleanup timeout
    // Verify old buffers cleaned
    // Verify active document preserved
  });
});
```

## Implementation Checklist

- [ ] Create document state store
- [ ] Implement document switch hook
- [ ] Create document history component
- [ ] Implement resource cleanup service
- [ ] Update main app component
- [ ] Add persistence layer
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation

## Dependencies

- Task 6.0.6.1 (PDF buffer state) must be complete
- Task 6.0.6.2 (View mode transitions) must be complete

## Estimated Time

- Implementation: 4-5 hours
- Testing: 2 hours
- Total: 6-7 hours

## Notes

- Consider adding document bookmarks/favorites
- Add metrics for document access patterns
- Consider preloading frequently accessed documents
- Add option to pin documents in memory
- Consider implementing document grouping/folders 