# Task 6.0.1.4 - Define IPC communication protocol

## Description
Define the Inter-Process Communication (IPC) protocol between the Electron main process and renderer process for PDF operations. This includes establishing channel names, message formats, error handling, and security considerations.

## Implementation Steps

### 1. Define IPC Channel Structure

#### Channel Naming Convention
```typescript
// PDF-related channels
const PDF_CHANNELS = {
  // Renderer → Main (invoke)
  GENERATE: 'pdf:generate',
  EXPORT: 'pdf:export',
  CANCEL: 'pdf:cancel',
  
  // Main → Renderer (send)
  PROGRESS: 'pdf:progress',
  COMPLETE: 'pdf:complete',
  ERROR: 'pdf:error',
  CANCELLED: 'pdf:cancelled',
} as const;
```

### 2. Design Message Interfaces

#### Request/Response Types
```typescript
// Renderer → Main requests
interface PDFGenerateRequest {
  content: string;
  documentType: string;
  options?: {
    fontSize?: number;
    lineSpacing?: string;
    margins?: { top: number; bottom: number; left: number; right: number };
  };
  requestId: string; // For tracking
}

interface PDFExportRequest {
  buffer: ArrayBuffer;
  defaultFileName: string;
  defaultPath?: string;
}

// Main → Renderer responses
interface PDFGenerateResponse {
  success: boolean;
  requestId: string;
  data?: {
    buffer: ArrayBuffer;
    metadata: {
      pageCount: number;
      fileSize: number;
      generatedAt: Date;
      documentType: string;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

interface PDFProgressUpdate {
  requestId: string;
  step: string;
  detail: string;
  percentage: number;
  timestamp: Date;
}
```

### 3. Implement IPC Security

#### Preload Script API
```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

// Validate channels
const validChannels = Object.values(PDF_CHANNELS);

contextBridge.exposeInMainWorld('pdfAPI', {
  // Generate PDF from content
  generate: async (request: PDFGenerateRequest): Promise<PDFGenerateResponse> => {
    if (!request.content || !request.documentType) {
      throw new Error('Invalid PDF generation request');
    }
    return ipcRenderer.invoke(PDF_CHANNELS.GENERATE, request);
  },
  
  // Export PDF to file
  export: async (request: PDFExportRequest): Promise<string> => {
    if (!request.buffer || !request.defaultFileName) {
      throw new Error('Invalid PDF export request');
    }
    return ipcRenderer.invoke(PDF_CHANNELS.EXPORT, request);
  },
  
  // Cancel ongoing generation
  cancel: async (requestId: string): Promise<void> => {
    return ipcRenderer.invoke(PDF_CHANNELS.CANCEL, requestId);
  },
  
  // Progress listener
  onProgress: (callback: (update: PDFProgressUpdate) => void) => {
    const subscription = (_event: any, update: PDFProgressUpdate) => callback(update);
    ipcRenderer.on(PDF_CHANNELS.PROGRESS, subscription);
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(PDF_CHANNELS.PROGRESS, subscription);
    };
  },
});
```

### 4. Design Main Process Handlers

#### Handler Implementation
```typescript
// main/pdf-ipc-handlers.ts
import { ipcMain, dialog, BrowserWindow } from 'electron';
import { PDFServiceFactory } from '../services/pdf/PDFServiceFactory';

export class PDFIPCHandlers {
  private activeRequests = new Map<string, AbortController>();
  
  register() {
    // PDF Generation Handler
    ipcMain.handle(PDF_CHANNELS.GENERATE, async (event, request: PDFGenerateRequest) => {
      const webContents = event.sender;
      const abortController = new AbortController();
      
      try {
        // Track active request
        this.activeRequests.set(request.requestId, abortController);
        
        // Create PDF service with progress callback
        const service = PDFServiceFactory.forGUI((step, detail) => {
          const progress: PDFProgressUpdate = {
            requestId: request.requestId,
            step,
            detail: detail || '',
            percentage: this.calculatePercentage(step),
            timestamp: new Date(),
          };
          webContents.send(PDF_CHANNELS.PROGRESS, progress);
        });
        
        // Generate PDF
        const result = await service.exportToBuffer(
          request.content,
          request.documentType,
          request.options
        );
        
        return {
          success: true,
          requestId: request.requestId,
          data: {
            buffer: result.buffer,
            metadata: {
              pageCount: result.pageCount,
              fileSize: result.buffer.byteLength,
              generatedAt: new Date(),
              documentType: request.documentType,
            },
          },
        };
      } catch (error) {
        return {
          success: false,
          requestId: request.requestId,
          error: {
            code: 'PDF_GENERATION_FAILED',
            message: error.message,
            details: error.stack,
          },
        };
      } finally {
        this.activeRequests.delete(request.requestId);
      }
    });
    
    // Export Handler
    ipcMain.handle(PDF_CHANNELS.EXPORT, async (event, request: PDFExportRequest) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) throw new Error('Window not found');
      
      const result = await dialog.showSaveDialog(window, {
        defaultPath: request.defaultPath || request.defaultFileName,
        filters: [
          { name: 'PDF Documents', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      
      if (!result.canceled && result.filePath) {
        const fs = require('fs').promises;
        await fs.writeFile(result.filePath, Buffer.from(request.buffer));
        return result.filePath;
      }
      
      throw new Error('Export cancelled');
    });
    
    // Cancel Handler
    ipcMain.handle(PDF_CHANNELS.CANCEL, async (_event, requestId: string) => {
      const controller = this.activeRequests.get(requestId);
      if (controller) {
        controller.abort();
        this.activeRequests.delete(requestId);
      }
    });
  }
  
  private calculatePercentage(step: string): number {
    const stepPercentages: Record<string, number> = {
      'Initializing PDF components': 10,
      'Loading document formatting rules': 20,
      'Parsing signature blocks': 30,
      'Preparing document layout': 40,
      'Calculating page breaks': 50,
      'Layout complete': 60,
      'Starting PDF generation': 70,
      'Rendering page': 80,
      'Finalizing PDF document': 90,
      'PDF export completed': 100,
    };
    return stepPercentages[step] || 0;
  }
}
```

### 5. Design Error Handling Strategy

```typescript
// Standardized error codes
enum PDFErrorCode {
  GENERATION_FAILED = 'PDF_GENERATION_FAILED',
  EXPORT_FAILED = 'PDF_EXPORT_FAILED',
  INVALID_REQUEST = 'PDF_INVALID_REQUEST',
  CANCELLED = 'PDF_CANCELLED',
  MEMORY_ERROR = 'PDF_MEMORY_ERROR',
  PERMISSION_DENIED = 'PDF_PERMISSION_DENIED',
}

// Error handler utility
class PDFErrorHandler {
  static handle(error: any): PDFError {
    if (error.code === 'EACCES') {
      return {
        code: PDFErrorCode.PERMISSION_DENIED,
        message: 'Permission denied to write PDF file',
        recoverable: false,
      };
    }
    
    if (error.message?.includes('memory')) {
      return {
        code: PDFErrorCode.MEMORY_ERROR,
        message: 'Insufficient memory to generate PDF',
        recoverable: true,
      };
    }
    
    return {
      code: PDFErrorCode.GENERATION_FAILED,
      message: error.message || 'Unknown error occurred',
      recoverable: true,
    };
  }
}
```

## Code Examples

### Renderer Process Usage
```typescript
// In a React component
const generatePDF = async () => {
  const requestId = crypto.randomUUID();
  
  // Set up progress listener
  const unsubscribe = window.pdfAPI.onProgress((update) => {
    console.log(`Progress: ${update.percentage}% - ${update.step}`);
    updateProgressUI(update);
  });
  
  try {
    const response = await window.pdfAPI.generate({
      content: documentContent,
      documentType: 'patent-assignment',
      requestId,
      options: {
        fontSize: 12,
        lineSpacing: 'double',
      },
    });
    
    if (response.success && response.data) {
      setPdfBuffer(response.data.buffer);
      setPdfMetadata(response.data.metadata);
    } else {
      handleError(response.error);
    }
  } catch (error) {
    console.error('PDF generation failed:', error);
  } finally {
    unsubscribe();
  }
};
```

### Type Augmentation
```typescript
// types/electron.d.ts
interface PDFApi {
  generate: (request: PDFGenerateRequest) => Promise<PDFGenerateResponse>;
  export: (request: PDFExportRequest) => Promise<string>;
  cancel: (requestId: string) => Promise<void>;
  onProgress: (callback: (update: PDFProgressUpdate) => void) => () => void;
}

declare global {
  interface Window {
    pdfAPI: PDFApi;
  }
}
```

## File Changes

### New Files to Create
1. `src/electron/main/ipc/pdf-ipc-handlers.ts`
   - Main process IPC handler implementation
   - Request tracking and cancellation

2. `src/types/pdf-ipc.ts`
   - TypeScript interfaces for IPC messages
   - Channel constants

3. `src/electron/preload/pdf-api.ts`
   - Preload script PDF API exposure
   - Channel validation

### Files to Modify
1. `src/electron/preload/index.ts`
   - Import and expose PDF API

2. `src/electron/main/index.ts`
   - Register PDF IPC handlers on app ready

3. `src/types/electron.d.ts`
   - Add window.pdfAPI type definitions

## Testing Approach

### IPC Communication Tests
```typescript
// Mock Electron IPC for testing
describe('PDF IPC Protocol', () => {
  it('should validate request parameters', async () => {
    await expect(
      window.pdfAPI.generate({ content: '', documentType: '', requestId: '123' })
    ).rejects.toThrow('Invalid PDF generation request');
  });
  
  it('should handle progress updates', (done) => {
    const unsubscribe = window.pdfAPI.onProgress((update) => {
      expect(update.requestId).toBeDefined();
      expect(update.percentage).toBeGreaterThanOrEqual(0);
      unsubscribe();
      done();
    });
    
    // Trigger progress update
    mockIpcRenderer.emit('pdf:progress', null, mockProgressUpdate);
  });
});
```

## Definition of Done

- [ ] IPC channel structure defined and documented
- [ ] Message interfaces created with TypeScript
- [ ] Preload script API implemented securely
- [ ] Main process handlers implemented
- [ ] Error handling strategy established
- [ ] Progress tracking implemented
- [ ] Request cancellation supported
- [ ] Type definitions complete
- [ ] Security considerations documented

## Common Pitfalls

1. **Memory Transfer**: Sending large buffers inefficiently
   - Use ArrayBuffer for efficient transfer
   - Consider chunking for very large PDFs

2. **Channel Security**: Exposing dangerous APIs
   - Only expose specific, validated channels
   - Sanitize all inputs in preload script

3. **Progress Accuracy**: Inaccurate progress percentages
   - Map steps to realistic percentages
   - Handle variable-length operations

4. **Error Context**: Losing error details across IPC
   - Serialize error information properly
   - Include stack traces for debugging

5. **Request Tracking**: Not handling concurrent requests
   - Use unique request IDs
   - Clean up completed requests

## Notes

- Follow Electron security best practices
- Keep IPC messages serializable
- Document all channels and message formats
- Consider rate limiting for resource-intensive operations
- Plan for future bidirectional communication needs 