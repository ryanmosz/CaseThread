# Task 6.0.6.1: Implement PDF Buffer State Management

## Overview
This task focuses on implementing robust state management for PDF buffers in the GUI, ensuring efficient memory usage, proper lifecycle management, and seamless state transitions.

## Current State Analysis

### Current Issues
1. PDF buffers are stored directly in component state
2. No centralized buffer management
3. Memory leaks from unreleased blob URLs
4. No persistence across document switches
5. No buffer validation or integrity checks

### Memory Considerations
- PDF buffers can be large (1-10MB typical, up to 50MB+)
- Multiple documents may have PDFs generated
- Blob URLs must be properly released
- Browser memory limits must be respected

## Implementation Plan

### 1. Create PDF Buffer Store (Priority: High)

**File**: Create `src/electron/renderer/src/stores/PDFBufferStore.ts`

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DocumentType } from '../../../../types';

interface PDFBuffer {
  id: string;
  documentId: string;
  documentType: DocumentType;
  buffer: ArrayBuffer;
  blobUrl?: string;
  metadata: {
    pageCount: number;
    fileSize: number;
    generatedAt: Date;
    generationTime: number;
    hasSignatureBlocks: boolean;
  };
  lastAccessed: Date;
}

interface PDFBufferState {
  buffers: Map<string, PDFBuffer>;
  activeBufferId: string | null;
  maxBuffers: number;
  maxTotalSize: number; // in bytes
  
  // Actions
  addBuffer: (buffer: PDFBuffer) => void;
  removeBuffer: (bufferId: string) => void;
  getBuffer: (bufferId: string) => PDFBuffer | undefined;
  setActiveBuffer: (bufferId: string | null) => void;
  getBlobUrl: (bufferId: string) => string | undefined;
  cleanupOldBuffers: () => void;
  clearAll: () => void;
  
  // Utility
  getTotalSize: () => number;
  getBuffersByDocument: (documentId: string) => PDFBuffer[];
}

export const usePDFBufferStore = create<PDFBufferState>()(
  persist(
    (set, get) => ({
      buffers: new Map(),
      activeBufferId: null,
      maxBuffers: 10,
      maxTotalSize: 100 * 1024 * 1024, // 100MB
      
      addBuffer: (buffer) => {
        set((state) => {
          const newBuffers = new Map(state.buffers);
          
          // Check if we need to cleanup before adding
          const totalSize = get().getTotalSize();
          const newTotalSize = totalSize + buffer.metadata.fileSize;
          
          if (newTotalSize > state.maxTotalSize || newBuffers.size >= state.maxBuffers) {
            // Cleanup oldest buffers
            get().cleanupOldBuffers();
          }
          
          // Create blob URL if needed
          if (!buffer.blobUrl) {
            const blob = new Blob([buffer.buffer], { type: 'application/pdf' });
            buffer.blobUrl = URL.createObjectURL(blob);
          }
          
          newBuffers.set(buffer.id, buffer);
          return { buffers: newBuffers };
        });
      },
      
      removeBuffer: (bufferId) => {
        set((state) => {
          const buffer = state.buffers.get(bufferId);
          if (buffer?.blobUrl) {
            URL.revokeObjectURL(buffer.blobUrl);
          }
          
          const newBuffers = new Map(state.buffers);
          newBuffers.delete(bufferId);
          
          return {
            buffers: newBuffers,
            activeBufferId: state.activeBufferId === bufferId ? null : state.activeBufferId,
          };
        });
      },
      
      getBuffer: (bufferId) => {
        const buffer = get().buffers.get(bufferId);
        if (buffer) {
          // Update last accessed time
          buffer.lastAccessed = new Date();
          get().buffers.set(bufferId, buffer);
        }
        return buffer;
      },
      
      setActiveBuffer: (bufferId) => {
        set({ activeBufferId: bufferId });
      },
      
      getBlobUrl: (bufferId) => {
        const buffer = get().getBuffer(bufferId);
        if (!buffer) return undefined;
        
        // Regenerate blob URL if it was revoked
        if (!buffer.blobUrl) {
          const blob = new Blob([buffer.buffer], { type: 'application/pdf' });
          buffer.blobUrl = URL.createObjectURL(blob);
          get().buffers.set(bufferId, buffer);
        }
        
        return buffer.blobUrl;
      },
      
      cleanupOldBuffers: () => {
        set((state) => {
          const buffers = Array.from(state.buffers.values());
          
          // Sort by last accessed time
          buffers.sort((a, b) => 
            a.lastAccessed.getTime() - b.lastAccessed.getTime()
          );
          
          const newBuffers = new Map(state.buffers);
          let totalSize = get().getTotalSize();
          
          // Remove oldest buffers until we're under limits
          while (
            (totalSize > state.maxTotalSize * 0.8 || newBuffers.size > state.maxBuffers * 0.8) &&
            buffers.length > 0
          ) {
            const oldest = buffers.shift()!;
            
            // Don't remove active buffer
            if (oldest.id === state.activeBufferId) continue;
            
            if (oldest.blobUrl) {
              URL.revokeObjectURL(oldest.blobUrl);
            }
            
            newBuffers.delete(oldest.id);
            totalSize -= oldest.metadata.fileSize;
          }
          
          return { buffers: newBuffers };
        });
      },
      
      clearAll: () => {
        // Cleanup all blob URLs
        get().buffers.forEach((buffer) => {
          if (buffer.blobUrl) {
            URL.revokeObjectURL(buffer.blobUrl);
          }
        });
        
        set({
          buffers: new Map(),
          activeBufferId: null,
        });
      },
      
      getTotalSize: () => {
        let total = 0;
        get().buffers.forEach((buffer) => {
          total += buffer.metadata.fileSize;
        });
        return total;
      },
      
      getBuffersByDocument: (documentId) => {
        return Array.from(get().buffers.values()).filter(
          (buffer) => buffer.documentId === documentId
        );
      },
    }),
    {
      name: 'pdf-buffer-storage',
      storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          // Custom storage to handle ArrayBuffer serialization
          const str = localStorage.getItem(name);
          if (!str) return null;
          
          const data = JSON.parse(str);
          
          // Convert base64 back to ArrayBuffer
          if (data.state?.buffers) {
            const buffers = new Map();
            Object.entries(data.state.buffers).forEach(([id, buffer]: [string, any]) => {
              if (buffer.buffer) {
                // Convert base64 to ArrayBuffer
                const binary = atob(buffer.buffer);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                  bytes[i] = binary.charCodeAt(i);
                }
                buffer.buffer = bytes.buffer;
              }
              
              // Convert date strings back to Date objects
              buffer.metadata.generatedAt = new Date(buffer.metadata.generatedAt);
              buffer.lastAccessed = new Date(buffer.lastAccessed);
              
              buffers.set(id, buffer);
            });
            data.state.buffers = buffers;
          }
          
          return data;
        },
        setItem: (name: string, value: any) => {
          // Convert ArrayBuffer to base64 for storage
          if (value.state?.buffers) {
            const serializedBuffers: Record<string, any> = {};
            value.state.buffers.forEach((buffer: PDFBuffer, id: string) => {
              const serialized = { ...buffer };
              
              // Convert ArrayBuffer to base64
              if (buffer.buffer) {
                const bytes = new Uint8Array(buffer.buffer);
                const binary = String.fromCharCode(...bytes);
                serialized.buffer = btoa(binary);
              }
              
              // Don't persist blob URLs
              delete serialized.blobUrl;
              
              serializedBuffers[id] = serialized;
            });
            
            value.state.buffers = serializedBuffers;
          }
          
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: localStorage.removeItem,
      })),
      partialize: (state) => ({
        // Only persist essential data
        buffers: state.buffers,
        activeBufferId: state.activeBufferId,
      }),
    }
  )
);
```

### 2. Create Buffer Lifecycle Manager (Priority: High)

**File**: Create `src/electron/renderer/src/services/PDFBufferLifecycleManager.ts`

```typescript
import { usePDFBufferStore } from '../stores/PDFBufferStore';

export class PDFBufferLifecycleManager {
  private static instance: PDFBufferLifecycleManager;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute
  private readonly BUFFER_TTL = 3600000; // 1 hour
  
  static getInstance(): PDFBufferLifecycleManager {
    if (!PDFBufferLifecycleManager.instance) {
      PDFBufferLifecycleManager.instance = new PDFBufferLifecycleManager();
    }
    return PDFBufferLifecycleManager.instance;
  }
  
  private constructor() {
    this.startCleanupInterval();
    
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Listen for low memory warnings
    if ('memory' in performance) {
      this.monitorMemoryPressure();
    }
  }
  
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL);
  }
  
  private performCleanup(): void {
    const store = usePDFBufferStore.getState();
    const now = Date.now();
    
    store.buffers.forEach((buffer, id) => {
      const age = now - buffer.lastAccessed.getTime();
      
      // Remove buffers older than TTL
      if (age > this.BUFFER_TTL && id !== store.activeBufferId) {
        store.removeBuffer(id);
      }
    });
    
    // Run general cleanup
    store.cleanupOldBuffers();
  }
  
  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      // Page is hidden, be more aggressive with cleanup
      this.performCleanup();
    }
  };
  
  private monitorMemoryPressure(): void {
    // Check memory usage periodically
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        if (usageRatio > 0.8) {
          console.warn('High memory usage detected, cleaning up PDF buffers');
          this.emergencyCleanup();
        }
      }
    }, 30000); // Check every 30 seconds
  }
  
  private emergencyCleanup(): void {
    const store = usePDFBufferStore.getState();
    
    // Keep only the active buffer
    store.buffers.forEach((buffer, id) => {
      if (id !== store.activeBufferId) {
        store.removeBuffer(id);
      }
    });
  }
  
  /**
   * Preload a PDF buffer for faster display
   */
  async preloadBuffer(bufferId: string): Promise<void> {
    const store = usePDFBufferStore.getState();
    const buffer = store.getBuffer(bufferId);
    
    if (buffer && !buffer.blobUrl) {
      // Generate blob URL to preload
      store.getBlobUrl(bufferId);
    }
  }
  
  /**
   * Export buffer to file
   */
  async exportBuffer(bufferId: string, filename: string): Promise<void> {
    const store = usePDFBufferStore.getState();
    const buffer = store.getBuffer(bufferId);
    
    if (!buffer) {
      throw new Error('Buffer not found');
    }
    
    // Use Electron's save dialog
    const result = await window.electronAPI.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
    });
    
    if (!result.canceled && result.filePath) {
      await window.electronAPI.writeFile(result.filePath, buffer.buffer);
    }
  }
  
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Cleanup all buffers
    const store = usePDFBufferStore.getState();
    store.clearAll();
  }
}
```

### 3. Create PDF Buffer Hook (Priority: High)

**File**: Create `src/electron/renderer/src/hooks/usePDFBuffer.ts`

```typescript
import { useEffect, useMemo } from 'react';
import { usePDFBufferStore } from '../stores/PDFBufferStore';
import { PDFBufferLifecycleManager } from '../services/PDFBufferLifecycleManager';
import { v4 as uuidv4 } from 'uuid';
import { DocumentType } from '../../../../types';

interface UsePDFBufferOptions {
  documentId: string;
  documentType: DocumentType;
}

interface UsePDFBufferResult {
  currentBuffer: PDFBuffer | undefined;
  blobUrl: string | undefined;
  addBuffer: (arrayBuffer: ArrayBuffer, metadata: PDFBuffer['metadata']) => string;
  removeBuffer: (bufferId: string) => void;
  setActive: (bufferId: string) => void;
  exportPDF: (filename: string) => Promise<void>;
  bufferHistory: PDFBuffer[];
}

export const usePDFBuffer = ({ 
  documentId, 
  documentType 
}: UsePDFBufferOptions): UsePDFBufferResult => {
  const {
    buffers,
    activeBufferId,
    addBuffer: storeAddBuffer,
    removeBuffer: storeRemoveBuffer,
    setActiveBuffer,
    getBlobUrl,
    getBuffersByDocument,
  } = usePDFBufferStore();
  
  // Initialize lifecycle manager
  useEffect(() => {
    const manager = PDFBufferLifecycleManager.getInstance();
    
    return () => {
      // Cleanup is handled by the manager singleton
    };
  }, []);
  
  // Get current buffer
  const currentBuffer = useMemo(() => {
    if (!activeBufferId) return undefined;
    return buffers.get(activeBufferId);
  }, [activeBufferId, buffers]);
  
  // Get blob URL for current buffer
  const blobUrl = useMemo(() => {
    if (!activeBufferId) return undefined;
    return getBlobUrl(activeBufferId);
  }, [activeBufferId, getBlobUrl]);
  
  // Get all buffers for this document
  const bufferHistory = useMemo(() => {
    return getBuffersByDocument(documentId);
  }, [documentId, getBuffersByDocument]);
  
  // Add new buffer
  const addBuffer = (
    arrayBuffer: ArrayBuffer, 
    metadata: PDFBuffer['metadata']
  ): string => {
    const bufferId = uuidv4();
    
    storeAddBuffer({
      id: bufferId,
      documentId,
      documentType,
      buffer: arrayBuffer,
      metadata,
      lastAccessed: new Date(),
    });
    
    // Automatically set as active
    setActiveBuffer(bufferId);
    
    return bufferId;
  };
  
  // Remove buffer
  const removeBuffer = (bufferId: string): void => {
    storeRemoveBuffer(bufferId);
  };
  
  // Set active buffer
  const setActive = (bufferId: string): void => {
    setActiveBuffer(bufferId);
  };
  
  // Export current PDF
  const exportPDF = async (filename: string): Promise<void> => {
    if (!activeBufferId) {
      throw new Error('No active PDF buffer');
    }
    
    const manager = PDFBufferLifecycleManager.getInstance();
    await manager.exportBuffer(activeBufferId, filename);
  };
  
  return {
    currentBuffer,
    blobUrl,
    addBuffer,
    removeBuffer,
    setActive,
    exportPDF,
    bufferHistory,
  };
};
```

### 4. Integrate with PDF Generation (Priority: High)

**File**: Update `src/electron/renderer/src/hooks/usePDFGeneration.ts`

```typescript
import { usePDFBuffer } from './usePDFBuffer';

export const usePDFGeneration = (
  documentId: string,
  documentType: DocumentType
): UsePDFGenerationResult => {
  // ... existing state ...
  
  const { addBuffer } = usePDFBuffer({ documentId, documentType });
  
  const generatePDF = useCallback(async (content: string) => {
    // ... existing generation code ...
    
    try {
      const response = await window.electronAPI.pdf.generate(request);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'PDF generation failed');
      }
      
      if (response.data?.buffer) {
        // Add to buffer store instead of creating blob URL directly
        const bufferId = addBuffer(response.data.buffer, response.data.metadata);
        
        console.log('PDF added to buffer store:', bufferId);
      }
    } catch (err) {
      // ... error handling ...
    }
  }, [content, documentType, addBuffer]);
  
  // ... rest of the hook ...
};
```

### 5. Create Buffer Status Component (Priority: Low)

**File**: Create `src/electron/renderer/src/components/PDFBufferStatus.tsx`

```typescript
import React from 'react';
import { usePDFBufferStore } from '../stores/PDFBufferStore';
import { formatBytes } from '../utils/format';

export const PDFBufferStatus: React.FC = () => {
  const { buffers, getTotalSize, maxTotalSize } = usePDFBufferStore();
  
  const totalSize = getTotalSize();
  const usagePercentage = (totalSize / maxTotalSize) * 100;
  
  return (
    <div className="text-xs text-gray-500 p-2 border-t">
      <div className="flex items-center justify-between">
        <span>PDF Cache: {buffers.size} documents</span>
        <span>{formatBytes(totalSize)} / {formatBytes(maxTotalSize)}</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
        <div 
          className={`h-1 rounded-full transition-all ${
            usagePercentage > 80 ? 'bg-red-500' : 
            usagePercentage > 60 ? 'bg-yellow-500' : 
            'bg-green-500'
          }`}
          style={{ width: `${usagePercentage}%` }}
        />
      </div>
    </div>
  );
};
```

## Testing Requirements

### Unit Tests

```typescript
describe('PDFBufferStore', () => {
  it('should manage buffer lifecycle correctly', () => {
    const { addBuffer, removeBuffer, buffers } = usePDFBufferStore.getState();
    
    const bufferId = 'test-id';
    const buffer = new ArrayBuffer(1024);
    
    addBuffer({
      id: bufferId,
      documentId: 'doc-1',
      documentType: 'patent-assignment-agreement',
      buffer,
      metadata: {
        pageCount: 5,
        fileSize: 1024,
        generatedAt: new Date(),
        generationTime: 1000,
        hasSignatureBlocks: true,
      },
      lastAccessed: new Date(),
    });
    
    expect(buffers.has(bufferId)).toBe(true);
    
    removeBuffer(bufferId);
    expect(buffers.has(bufferId)).toBe(false);
  });
  
  it('should enforce memory limits', () => {
    const { addBuffer, maxBuffers } = usePDFBufferStore.getState();
    
    // Add buffers up to limit
    for (let i = 0; i < maxBuffers + 5; i++) {
      addBuffer({
        id: `buffer-${i}`,
        // ... buffer data
      });
    }
    
    // Should not exceed max buffers
    expect(usePDFBufferStore.getState().buffers.size).toBeLessThanOrEqual(maxBuffers);
  });
});
```

### Integration Tests

```typescript
describe('PDF Buffer Integration', () => {
  it('should integrate with PDF generation', async () => {
    const { result } = renderHook(() => 
      usePDFGeneration('doc-1', 'patent-assignment-agreement')
    );
    
    // Generate PDF
    await act(async () => {
      await result.current.generatePDF('Test content');
    });
    
    // Check buffer was added
    const buffers = usePDFBufferStore.getState().getBuffersByDocument('doc-1');
    expect(buffers.length).toBe(1);
    expect(buffers[0].documentType).toBe('patent-assignment-agreement');
  });
});
```

## Implementation Checklist

- [ ] Create PDF buffer store with Zustand
- [ ] Implement buffer lifecycle manager
- [ ] Create usePDFBuffer hook
- [ ] Integrate with PDF generation flow
- [ ] Add buffer status component
- [ ] Implement memory pressure handling
- [ ] Add persistence layer
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation

## Dependencies

- Task 6.0.3.1 (PDF generation button) must be complete
- Task 6.0.4.2 (Blob URL management) will use this

## Estimated Time

- Implementation: 4-5 hours
- Testing: 2 hours
- Total: 6-7 hours

## Notes

- Consider IndexedDB for larger buffer storage
- Add telemetry for buffer usage patterns
- Consider compression for stored buffers
- Add buffer integrity validation
- Consider service worker for offline access 