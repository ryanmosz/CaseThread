# Task 6.0.4.2 - Handle Blob URL Creation and Cleanup

## Overview
Implement proper blob URL lifecycle management for PDF display to prevent memory leaks. This includes creating blob URLs from PDF buffers, tracking active URLs, and ensuring cleanup when PDFs are no longer needed.

## Requirements

### Functional Requirements
1. Create blob URLs from PDF buffers safely
2. Track all active blob URLs
3. Clean up URLs when switching documents
4. Clean up URLs when component unmounts
5. Handle cleanup on page refresh/close
6. Prevent duplicate blob URL creation
7. Monitor memory usage

### Technical Requirements
1. Implement centralized blob URL management
2. Use React lifecycle hooks for cleanup
3. Handle edge cases (rapid switching, etc.)
4. Provide memory usage warnings
5. Implement automatic cleanup strategies

## Implementation Details

### 1. Create Blob URL Manager

Centralized service for blob URL management:

```typescript
// src/electron/renderer/src/services/BlobURLManager.ts
export class BlobURLManager {
  private static instance: BlobURLManager;
  private activeURLs: Map<string, {
    url: string;
    created: Date;
    size: number;
    type: string;
  }> = new Map();
  
  private constructor() {
    // Set up cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
    
    // Periodic cleanup of orphaned URLs (older than 1 hour)
    setInterval(() => {
      this.cleanupOrphaned();
    }, 60 * 60 * 1000); // Every hour
  }
  
  static getInstance(): BlobURLManager {
    if (!BlobURLManager.instance) {
      BlobURLManager.instance = new BlobURLManager();
    }
    return BlobURLManager.instance;
  }
  
  /**
   * Create a blob URL from buffer
   */
  createBlobURL(
    buffer: ArrayBuffer, 
    type: string = 'application/pdf',
    key?: string
  ): string {
    // Revoke existing URL for this key if present
    if (key && this.activeURLs.has(key)) {
      this.revokeURL(key);
    }
    
    // Create new blob and URL
    const blob = new Blob([buffer], { type });
    const url = URL.createObjectURL(blob);
    
    // Track the URL
    const id = key || this.generateId();
    this.activeURLs.set(id, {
      url,
      created: new Date(),
      size: buffer.byteLength,
      type
    });
    
    // Log memory usage
    this.logMemoryUsage();
    
    return url;
  }
  
  /**
   * Revoke a specific URL
   */
  revokeURL(key: string): void {
    const entry = this.activeURLs.get(key);
    if (entry) {
      URL.revokeObjectURL(entry.url);
      this.activeURLs.delete(key);
      console.log(`Revoked blob URL: ${key}`);
    }
  }
  
  /**
   * Revoke URL by actual URL string
   */
  revokeByURL(url: string): void {
    for (const [key, entry] of this.activeURLs.entries()) {
      if (entry.url === url) {
        this.revokeURL(key);
        break;
      }
    }
  }
  
  /**
   * Clean up all URLs
   */
  cleanup(): void {
    for (const [key] of this.activeURLs.entries()) {
      this.revokeURL(key);
    }
    console.log('Cleaned up all blob URLs');
  }
  
  /**
   * Clean up orphaned URLs older than specified time
   */
  cleanupOrphaned(maxAgeMs: number = 60 * 60 * 1000): void {
    const now = new Date();
    const keysToRemove: string[] = [];
    
    for (const [key, entry] of this.activeURLs.entries()) {
      const age = now.getTime() - entry.created.getTime();
      if (age > maxAgeMs) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => this.revokeURL(key));
    
    if (keysToRemove.length > 0) {
      console.log(`Cleaned up ${keysToRemove.length} orphaned blob URLs`);
    }
  }
  
  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    count: number;
    totalSize: number;
    oldestAge: number;
  } {
    let totalSize = 0;
    let oldestAge = 0;
    const now = new Date();
    
    for (const entry of this.activeURLs.values()) {
      totalSize += entry.size;
      const age = now.getTime() - entry.created.getTime();
      if (age > oldestAge) {
        oldestAge = age;
      }
    }
    
    return {
      count: this.activeURLs.size,
      totalSize,
      oldestAge
    };
  }
  
  /**
   * Log memory usage warnings
   */
  private logMemoryUsage(): void {
    const stats = this.getMemoryStats();
    
    // Warn if too many URLs
    if (stats.count > 10) {
      console.warn(`High number of active blob URLs: ${stats.count}`);
    }
    
    // Warn if too much memory
    const maxMemoryMB = 100;
    const totalSizeMB = stats.totalSize / (1024 * 1024);
    if (totalSizeMB > maxMemoryMB) {
      console.warn(`High blob URL memory usage: ${totalSizeMB.toFixed(1)}MB`);
    }
  }
  
  private generateId(): string {
    return `blob-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 2. Create useBlobURL Hook

React hook for blob URL lifecycle management:

```typescript
// src/electron/renderer/src/hooks/useBlobURL.ts
import { useEffect, useRef, useState } from 'react';
import { BlobURLManager } from '../services/BlobURLManager';

export interface UseBlobURLOptions {
  key?: string;
  autoCleanup?: boolean;
  maxAge?: number;
}

export const useBlobURL = (options: UseBlobURLOptions = {}) => {
  const {
    key,
    autoCleanup = true,
    maxAge
  } = options;
  
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const managerRef = useRef(BlobURLManager.getInstance());
  const urlKeyRef = useRef<string | null>(null);
  
  // Create blob URL from buffer
  const createBlobURL = (buffer: ArrayBuffer, type?: string) => {
    try {
      // Clean up previous URL if exists
      if (urlKeyRef.current) {
        managerRef.current.revokeURL(urlKeyRef.current);
      }
      
      // Create new URL
      const urlKey = key || `component-${Date.now()}`;
      const url = managerRef.current.createBlobURL(buffer, type, urlKey);
      
      urlKeyRef.current = urlKey;
      setBlobUrl(url);
      setError(null);
      
      // Set up auto cleanup if maxAge specified
      if (maxAge) {
        setTimeout(() => {
          if (urlKeyRef.current === urlKey) {
            cleanup();
          }
        }, maxAge);
      }
      
      return url;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create blob URL';
      setError(errorMsg);
      console.error('Blob URL creation error:', err);
      return null;
    }
  };
  
  // Manual cleanup
  const cleanup = () => {
    if (urlKeyRef.current) {
      managerRef.current.revokeURL(urlKeyRef.current);
      urlKeyRef.current = null;
      setBlobUrl(null);
    }
  };
  
  // Auto cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoCleanup) {
        cleanup();
      }
    };
  }, [autoCleanup]);
  
  // Get memory stats
  const getMemoryStats = () => {
    return managerRef.current.getMemoryStats();
  };
  
  return {
    blobUrl,
    createBlobURL,
    cleanup,
    error,
    getMemoryStats
  };
};
```

### 3. Update PDF Generation Hook

Use the blob URL manager:

```typescript
// In usePDFGeneration.ts
import { useBlobURL } from '../hooks/useBlobURL';

export const usePDFGeneration = (): UsePDFGenerationResult => {
  // ... existing state ...
  
  const { 
    blobUrl: pdfBlobUrl, 
    createBlobURL, 
    cleanup: cleanupBlobURL,
    getMemoryStats 
  } = useBlobURL({
    key: 'pdf-viewer',
    autoCleanup: true
  });
  
  // Update generatePDF
  const generatePDF = useCallback(async (content: string, documentType: DocumentType) => {
    // ... existing code ...
    
    if (response.data?.buffer) {
      // Store the buffer
      setPdfBuffer(response.data.buffer);
      
      // Create blob URL using manager
      createBlobURL(response.data.buffer, 'application/pdf');
      
      // Log memory stats
      const stats = getMemoryStats();
      console.log('Blob URL Memory Stats:', stats);
      
      // Store metadata
      if (response.data.metadata) {
        setPdfMetadata(response.data.metadata);
      }
    }
  }, [createBlobURL, getMemoryStats]);
  
  // Update clearPDF
  const clearPDF = useCallback(() => {
    cleanupBlobURL();
    setPdfBuffer(null);
    setPdfMetadata(null);
  }, [cleanupBlobURL]);
  
  // ... rest of hook ...
};
```

### 4. Add Memory Monitor Component

Optional component to display memory usage:

```typescript
// src/electron/renderer/src/components/BlobMemoryMonitor.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardBody, Progress } from '@heroui/react';
import { BlobURLManager } from '../services/BlobURLManager';

export const BlobMemoryMonitor: React.FC = () => {
  const [stats, setStats] = useState(BlobURLManager.getInstance().getMemoryStats());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(BlobURLManager.getInstance().getMemoryStats());
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const formatAge = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };
  
  // Only show if there are active URLs
  if (stats.count === 0) return null;
  
  const memoryUsagePercent = Math.min((stats.totalSize / (100 * 1024 * 1024)) * 100, 100);
  const memoryColor = memoryUsagePercent > 80 ? 'danger' : 
                      memoryUsagePercent > 50 ? 'warning' : 'success';
  
  return (
    <Card className="fixed bottom-4 right-4 w-64 shadow-lg">
      <CardBody className="p-3">
        <h4 className="text-xs font-semibold mb-2">Blob URL Memory</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Active URLs:</span>
            <span className="font-medium">{stats.count}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Total Size:</span>
            <span className="font-medium">{formatBytes(stats.totalSize)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Oldest:</span>
            <span className="font-medium">{formatAge(stats.oldestAge)}</span>
          </div>
          <Progress 
            size="sm"
            value={memoryUsagePercent}
            color={memoryColor}
            className="mt-2"
          />
        </div>
      </CardBody>
    </Card>
  );
};
```

## Testing Approach

1. **Unit Tests**
   - Test BlobURLManager singleton
   - Test URL creation and revocation
   - Test memory tracking
   - Test cleanup strategies

2. **Integration Tests**
   - Test hook lifecycle
   - Test auto-cleanup on unmount
   - Test memory limits
   - Test orphan cleanup

3. **Manual Testing**
   - Generate multiple PDFs rapidly
   - Monitor browser memory usage
   - Test page refresh cleanup
   - Verify no memory leaks

## Success Criteria

✅ Blob URLs created successfully
✅ URLs cleaned up on document switch
✅ URLs cleaned up on unmount
✅ No memory leaks detected
✅ Orphaned URLs cleaned automatically
✅ Memory warnings displayed
✅ Stats accurately tracked
✅ Performance remains smooth

## Notes

- Consider implementing LRU cache for blob URLs
- May want to add user preferences for memory limits
- Could integrate with browser memory API
- Consider service worker for advanced caching
- Monitor impact on performance