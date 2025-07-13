# Task 6.0.2.2 - Implement Progress Reporting IPC Channel

## Description
Create a dedicated IPC channel system for streaming progress updates from the main process to the renderer. This will enable real-time progress feedback during PDF generation in the GUI.

## Implementation Steps

### 1. Enhance Progress Reporting Infrastructure
```typescript
// src/electron/main/ipc/progress-manager.ts
import { WebContents } from 'electron';
import { PDF_CHANNELS } from '../../constants/pdf-channels';
import { PDFProgressUpdate } from '../../../types/pdf-ipc';

export interface ProgressSubscription {
  requestId: string;
  webContents: WebContents;
  startTime: number;
  lastUpdate: number;
}

export class ProgressManager {
  private static instance: ProgressManager;
  private subscriptions = new Map<string, ProgressSubscription>();
  
  static getInstance(): ProgressManager {
    if (!ProgressManager.instance) {
      ProgressManager.instance = new ProgressManager();
    }
    return ProgressManager.instance;
  }
  
  subscribe(requestId: string, webContents: WebContents): void {
    if (webContents.isDestroyed()) return;
    
    this.subscriptions.set(requestId, {
      requestId,
      webContents,
      startTime: Date.now(),
      lastUpdate: Date.now(),
    });
  }
  
  unsubscribe(requestId: string): void {
    this.subscriptions.delete(requestId);
  }
  
  sendProgress(update: PDFProgressUpdate): void {
    const subscription = this.subscriptions.get(update.requestId);
    if (!subscription || subscription.webContents.isDestroyed()) {
      this.unsubscribe(update.requestId);
      return;
    }
    
    // Throttle updates to prevent overwhelming the renderer
    const now = Date.now();
    if (now - subscription.lastUpdate < 100) return; // Max 10 updates/second
    
    subscription.lastUpdate = now;
    subscription.webContents.send(PDF_CHANNELS.PROGRESS, update);
  }
}
```

### 2. Create Progress IPC Handlers
```typescript
// src/electron/main/ipc/progress-handlers.ts
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { PDF_CHANNELS } from '../../constants/pdf-channels';
import { ProgressManager } from './progress-manager';

export class ProgressHandlers {
  private progressManager = ProgressManager.getInstance();
  
  constructor() {
    this.setupHandlers();
  }
  
  private setupHandlers(): void {
    // Subscribe to progress updates
    ipcMain.handle(PDF_CHANNELS.SUBSCRIBE_PROGRESS, (event, requestId: string) => {
      this.progressManager.subscribe(requestId, event.sender);
      return { success: true };
    });
    
    // Unsubscribe from progress updates
    ipcMain.handle(PDF_CHANNELS.UNSUBSCRIBE_PROGRESS, (event, requestId: string) => {
      this.progressManager.unsubscribe(requestId);
      return { success: true };
    });
    
    // Get all active subscriptions (for debugging)
    ipcMain.handle(PDF_CHANNELS.GET_ACTIVE_PROGRESS, () => {
      return Array.from(this.progressManager.getActiveSubscriptions());
    });
  }
}
```

### 3. Update PDF Generation Handler
```typescript
// Update src/electron/main/ipc/pdf-generation-handler.ts
import { ProgressManager } from './progress-manager';

export class PDFGenerationHandler {
  private progressManager = ProgressManager.getInstance();
  
  private sendProgress(
    event: IpcMainInvokeEvent,
    requestId: string,
    step: string,
    detail: string | undefined,
    startTime: number
  ): void {
    const progress: PDFProgressUpdate = {
      requestId,
      step,
      detail: detail || step,
      percentage: this.calculatePercentage(step),
      timestamp: new Date(),
      estimatedTimeRemaining: this.estimateTimeRemaining(requestId, step, startTime),
    };
    
    // Send through progress manager for better control
    this.progressManager.sendProgress(progress);
  }
  
  private cleanup(requestId: string): void {
    this.activeRequests.delete(requestId);
    this.progressManager.unsubscribe(requestId);
  }
}
```

### 4. Add Progress Channel Constants
```typescript
// Update src/electron/constants/pdf-channels.ts
export const PDF_CHANNELS = {
  // ... existing channels
  
  // Progress subscription channels
  SUBSCRIBE_PROGRESS: 'pdf:subscribe-progress',
  UNSUBSCRIBE_PROGRESS: 'pdf:unsubscribe-progress',
  GET_ACTIVE_PROGRESS: 'pdf:get-active-progress',
} as const;
```

### 5. Create Progress Hook for Renderer
```typescript
// src/electron/renderer/src/hooks/usePDFProgress.ts
import { useEffect, useState, useCallback } from 'react';
import { PDFProgressUpdate } from '../../../../types/pdf-ipc';

export interface PDFProgressState {
  [requestId: string]: {
    currentStep: string;
    percentage: number;
    detail?: string;
    estimatedTimeRemaining?: number;
    history: PDFProgressUpdate[];
  };
}

export const usePDFProgress = (requestId?: string) => {
  const [progress, setProgress] = useState<PDFProgressState>({});
  
  useEffect(() => {
    if (!requestId) return;
    
    // Subscribe to progress updates
    window.electron.pdf.subscribeProgress(requestId);
    
    // Listen for progress events
    const handleProgress = (_event: any, update: PDFProgressUpdate) => {
      if (update.requestId !== requestId) return;
      
      setProgress((prev) => ({
        ...prev,
        [update.requestId]: {
          currentStep: update.step,
          percentage: update.percentage,
          detail: update.detail,
          estimatedTimeRemaining: update.estimatedTimeRemaining,
          history: [...(prev[update.requestId]?.history || []), update],
        },
      }));
    };
    
    window.electron.onPDFProgress(handleProgress);
    
    return () => {
      window.electron.pdf.unsubscribeProgress(requestId);
      window.electron.removeListener('pdf:progress', handleProgress);
    };
  }, [requestId]);
  
  const clearProgress = useCallback((id?: string) => {
    if (id) {
      setProgress((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      setProgress({});
    }
  }, []);
  
  return {
    progress: requestId ? progress[requestId] : undefined,
    allProgress: progress,
    clearProgress,
  };
};
```

### 6. Update Preload Script
```typescript
// src/electron/preload/index.ts - Add to existing API
const pdfAPI = {
  // ... existing methods
  
  subscribeProgress: (requestId: string) => 
    ipcRenderer.invoke('pdf:subscribe-progress', requestId),
    
  unsubscribeProgress: (requestId: string) =>
    ipcRenderer.invoke('pdf:unsubscribe-progress', requestId),
    
  getActiveProgress: () =>
    ipcRenderer.invoke('pdf:get-active-progress'),
};

// Progress event listeners
const onPDFProgress = (callback: (event: any, data: any) => void) => {
  ipcRenderer.on('pdf:progress', callback);
};

const removeListener = (channel: string, callback: Function) => {
  ipcRenderer.removeListener(channel, callback);
};
```

## Code Examples

### Complete Progress Manager Implementation
```typescript
// src/electron/main/ipc/progress-manager.ts
import { WebContents } from 'electron';
import { PDF_CHANNELS } from '../../constants/pdf-channels';
import { PDFProgressUpdate } from '../../../types/pdf-ipc';
import { createChildLogger } from '../../../utils/logger';

export class ProgressManager {
  private static instance: ProgressManager;
  private subscriptions = new Map<string, ProgressSubscription>();
  private updateQueue = new Map<string, PDFProgressUpdate[]>();
  private logger = createChildLogger({ service: 'ProgressManager' });
  
  // Batch updates every 100ms
  private batchInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.startBatchProcessor();
  }
  
  private startBatchProcessor(): void {
    this.batchInterval = setInterval(() => {
      this.processBatchedUpdates();
    }, 100);
  }
  
  private processBatchedUpdates(): void {
    for (const [requestId, updates] of this.updateQueue) {
      if (updates.length === 0) continue;
      
      const subscription = this.subscriptions.get(requestId);
      if (!subscription || subscription.webContents.isDestroyed()) {
        this.unsubscribe(requestId);
        continue;
      }
      
      // Send only the latest update
      const latestUpdate = updates[updates.length - 1];
      subscription.webContents.send(PDF_CHANNELS.PROGRESS, latestUpdate);
      
      this.updateQueue.set(requestId, []);
    }
  }
  
  sendProgress(update: PDFProgressUpdate): void {
    const queue = this.updateQueue.get(update.requestId) || [];
    queue.push(update);
    this.updateQueue.set(update.requestId, queue);
  }
  
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
  
  cleanup(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
    this.subscriptions.clear();
    this.updateQueue.clear();
  }
}
```

## File Changes

### New Files to Create
1. `src/electron/main/ipc/progress-manager.ts`
   - Progress subscription management
   - Update batching and throttling

2. `src/electron/main/ipc/progress-handlers.ts`
   - IPC handlers for progress subscriptions

3. `src/electron/renderer/src/hooks/usePDFProgress.ts`
   - React hook for progress tracking

### Files to Modify
1. `src/electron/constants/pdf-channels.ts`
   - Add new progress channel constants

2. `src/electron/main/ipc/pdf-generation-handler.ts`
   - Integrate with ProgressManager
   - Update cleanup logic

3. `src/electron/preload/index.ts`
   - Add progress subscription methods
   - Add event listeners

4. `src/electron/main/index.ts`
   - Initialize ProgressHandlers

## Testing Approach

### Unit Tests
```typescript
// __tests__/electron/main/ipc/progress-manager.test.ts
describe('ProgressManager', () => {
  it('should manage subscriptions', () => {
    const manager = ProgressManager.getInstance();
    const mockWebContents = createMockWebContents();
    
    manager.subscribe('test-123', mockWebContents);
    expect(manager.getActiveSubscriptions()).toContain('test-123');
    
    manager.unsubscribe('test-123');
    expect(manager.getActiveSubscriptions()).not.toContain('test-123');
  });
  
  it('should batch progress updates', async () => {
    const manager = ProgressManager.getInstance();
    const mockWebContents = createMockWebContents();
    
    manager.subscribe('test-123', mockWebContents);
    
    // Send multiple updates quickly
    for (let i = 0; i < 10; i++) {
      manager.sendProgress({
        requestId: 'test-123',
        step: `Step ${i}`,
        percentage: i * 10,
        timestamp: new Date(),
      });
    }
    
    // Wait for batch processing
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Should only send the latest update
    expect(mockWebContents.send).toHaveBeenCalledTimes(1);
    expect(mockWebContents.send).toHaveBeenCalledWith(
      'pdf:progress',
      expect.objectContaining({ step: 'Step 9' })
    );
  });
});
```

## Definition of Done

- [ ] ProgressManager class implemented with batching
- [ ] Progress IPC handlers registered
- [ ] PDF generation handler integrated with ProgressManager
- [ ] Preload script updated with progress methods
- [ ] React hook for progress tracking created
- [ ] Unit tests for progress manager
- [ ] Integration tests for progress flow
- [ ] Progress updates throttled appropriately
- [ ] Memory cleanup on unsubscribe

## Common Pitfalls

1. **Memory Leaks**: Not cleaning up subscriptions
   - Always unsubscribe when done
   - Check for destroyed webContents

2. **Performance**: Sending too many updates
   - Implement batching/throttling
   - Send only latest update per batch

3. **Race Conditions**: Updates after completion
   - Clear subscriptions on completion
   - Check subscription before sending

4. **Event Listeners**: Not removing listeners
   - Always clean up in useEffect
   - Use proper dependency arrays

5. **Type Safety**: Losing types across IPC
   - Define clear interfaces
   - Validate incoming data

## Notes

- Consider implementing progress persistence for recovery
- Plan for multiple concurrent PDF generations
- Consider adding progress analytics
- Document expected update frequency
- Consider adding progress event replay for debugging 