# Task 6.0.2.1 - Create PDF generation IPC handler

## Description
Implement the main process IPC handler for PDF generation requests. This handler will receive generation requests from the renderer process, invoke the PDF service, handle progress updates, and return the generated PDF buffer.

## Implementation Steps

### 1. Create Handler Class Structure
```typescript
// src/electron/main/ipc/pdf-generation-handler.ts
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { PDFServiceFactory } from '../../../services/pdf/PDFServiceFactory';
import { PDFGenerateRequest, PDFGenerateResponse } from '../../../types/pdf-ipc';

export class PDFGenerationHandler {
  private activeRequests = new Map<string, AbortController>();
  
  constructor() {
    this.setupHandlers();
  }
  
  private setupHandlers() {
    ipcMain.handle('pdf:generate', this.handleGeneratePDF.bind(this));
    ipcMain.handle('pdf:cancel', this.handleCancelGeneration.bind(this));
  }
}
```

### 2. Implement Generation Logic
```typescript
private async handleGeneratePDF(
  event: IpcMainInvokeEvent,
  request: PDFGenerateRequest
): Promise<PDFGenerateResponse> {
  const startTime = Date.now();
  const abortController = new AbortController();
  
  try {
    // Validate request
    this.validateRequest(request);
    
    // Track active request
    this.activeRequests.set(request.requestId, abortController);
    
    // Create service with progress callback
    const service = PDFServiceFactory.forGUI((step, detail) => {
      this.sendProgress(event, request.requestId, step, detail);
    });
    
    // Generate PDF
    const result = await service.exportToBuffer(
      request.content,
      request.documentType,
      request.options
    );
    
    // Return success response
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
          generationTime: Date.now() - startTime,
        },
      },
    };
  } catch (error) {
    return this.createErrorResponse(request.requestId, error);
  } finally {
    this.activeRequests.delete(request.requestId);
  }
}
```

### 3. Implement Progress Reporting
```typescript
private sendProgress(
  event: IpcMainInvokeEvent,
  requestId: string,
  step: string,
  detail: string | undefined
) {
  const progress = {
    requestId,
    step,
    detail: detail || '',
    percentage: this.calculatePercentage(step),
    timestamp: new Date(),
  };
  
  // Send to the specific window that initiated the request
  event.sender.send('pdf:progress', progress);
}

private calculatePercentage(step: string): number {
  const progressMap: Record<string, number> = {
    'Initializing PDF components': 5,
    'Applying custom formatting': 10,
    'Loading document formatting rules': 15,
    'Parsing signature blocks': 25,
    'Found signature blocks': 30,
    'Preparing document layout': 40,
    'Calculating page breaks': 50,
    'Layout complete': 60,
    'Starting PDF generation': 70,
    'Measuring content for accurate pagination': 75,
    'Rendering page': 80, // This will be called multiple times
    'Finalizing PDF document': 95,
    'PDF export completed': 100,
  };
  
  return progressMap[step] || 0;
}
```

### 4. Implement Request Validation
```typescript
private validateRequest(request: PDFGenerateRequest): void {
  if (!request.requestId) {
    throw new Error('Request ID is required');
  }
  
  if (!request.content || typeof request.content !== 'string') {
    throw new Error('Content must be a non-empty string');
  }
  
  if (!request.documentType) {
    throw new Error('Document type is required');
  }
  
  const validTypes = [
    'provisional-patent-application',
    'nda-ip-specific',
    'patent-license-agreement',
    'trademark-application',
    'patent-assignment-agreement',
    'office-action-response',
    'cease-and-desist-letter',
    'technology-transfer-agreement',
  ];
  
  if (!validTypes.includes(request.documentType)) {
    throw new Error(`Invalid document type: ${request.documentType}`);
  }
  
  // Validate options if provided
  if (request.options) {
    this.validateOptions(request.options);
  }
}

private validateOptions(options: any): void {
  if (options.fontSize && (options.fontSize < 8 || options.fontSize > 24)) {
    throw new Error('Font size must be between 8 and 24');
  }
  
  if (options.lineSpacing && !['single', '1.5', 'double'].includes(options.lineSpacing)) {
    throw new Error('Invalid line spacing');
  }
  
  if (options.margins) {
    const { top, bottom, left, right } = options.margins;
    if ([top, bottom, left, right].some(m => m < 0 || m > 200)) {
      throw new Error('Margins must be between 0 and 200');
    }
  }
}
```

### 5. Implement Cancellation
```typescript
private async handleCancelGeneration(
  _event: IpcMainInvokeEvent,
  requestId: string
): Promise<void> {
  const controller = this.activeRequests.get(requestId);
  if (controller) {
    controller.abort();
    this.activeRequests.delete(requestId);
  }
}
```

### 6. Implement Error Handling
```typescript
private createErrorResponse(requestId: string, error: any): PDFGenerateResponse {
  let code = 'PDF_GENERATION_FAILED';
  let message = 'An error occurred during PDF generation';
  
  if (error.name === 'AbortError') {
    code = 'PDF_GENERATION_CANCELLED';
    message = 'PDF generation was cancelled';
  } else if (error.code === 'ENOENT') {
    code = 'PDF_TEMPLATE_NOT_FOUND';
    message = 'Document template not found';
  } else if (error.message) {
    message = error.message;
  }
  
  console.error(`PDF generation error for request ${requestId}:`, error);
  
  return {
    success: false,
    requestId,
    error: {
      code,
      message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
  };
}
```

## Code Examples

### Complete Handler Implementation
```typescript
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { PDFServiceFactory } from '../../../services/pdf/PDFServiceFactory';
import { 
  PDFGenerateRequest, 
  PDFGenerateResponse,
  PDFProgressUpdate 
} from '../../../types/pdf-ipc';

export class PDFGenerationHandler {
  private static instance: PDFGenerationHandler;
  private activeRequests = new Map<string, AbortController>();
  
  static getInstance(): PDFGenerationHandler {
    if (!PDFGenerationHandler.instance) {
      PDFGenerationHandler.instance = new PDFGenerationHandler();
    }
    return PDFGenerationHandler.instance;
  }
  
  private constructor() {
    this.setupHandlers();
  }
  
  private setupHandlers() {
    ipcMain.handle('pdf:generate', this.handleGeneratePDF.bind(this));
    ipcMain.handle('pdf:cancel', this.handleCancelGeneration.bind(this));
  }
  
  // ... rest of implementation
  
  cleanup() {
    // Cancel all active requests
    this.activeRequests.forEach(controller => controller.abort());
    this.activeRequests.clear();
  }
}
```

### Integration in Main Process
```typescript
// src/electron/main/index.ts
import { app } from 'electron';
import { PDFGenerationHandler } from './ipc/pdf-generation-handler';

app.whenReady().then(() => {
  // Initialize PDF handler
  PDFGenerationHandler.getInstance();
  
  // ... other initialization
});

app.on('before-quit', () => {
  // Cleanup active PDF generations
  PDFGenerationHandler.getInstance().cleanup();
});
```

## File Changes

### New Files to Create
1. `src/electron/main/ipc/pdf-generation-handler.ts`
   - Main PDF generation IPC handler class

2. `src/types/pdf-ipc.ts`
   - TypeScript interfaces for IPC communication

### Files to Modify
1. `src/electron/main/index.ts`
   - Initialize PDF handler on app ready
   - Add cleanup on app quit

2. `src/electron/main/ipc-handlers.ts`
   - Import and register PDF handler if using central registration

## Testing Approach

### Unit Tests
```typescript
// __tests__/electron/main/ipc/pdf-generation-handler.test.ts
import { PDFGenerationHandler } from '../../../../src/electron/main/ipc/pdf-generation-handler';

describe('PDFGenerationHandler', () => {
  let handler: PDFGenerationHandler;
  
  beforeEach(() => {
    handler = new PDFGenerationHandler();
  });
  
  it('should validate request parameters', async () => {
    const invalidRequest = {
      requestId: '123',
      content: '',
      documentType: 'invalid',
    };
    
    const response = await handler.handleGeneratePDF(mockEvent, invalidRequest);
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe('PDF_INVALID_REQUEST');
  });
  
  it('should track active requests', async () => {
    const request = createValidRequest();
    const promise = handler.handleGeneratePDF(mockEvent, request);
    
    expect(handler['activeRequests'].has(request.requestId)).toBe(true);
    
    await promise;
    
    expect(handler['activeRequests'].has(request.requestId)).toBe(false);
  });
});
```

### Integration Tests
```typescript
describe('PDF IPC Integration', () => {
  it('should handle complete generation flow', async () => {
    const handler = PDFGenerationHandler.getInstance();
    const progressUpdates: any[] = [];
    
    mockEvent.sender.send = jest.fn((channel, data) => {
      if (channel === 'pdf:progress') {
        progressUpdates.push(data);
      }
    });
    
    const response = await handler.handleGeneratePDF(mockEvent, validRequest);
    
    expect(response.success).toBe(true);
    expect(response.data?.buffer).toBeInstanceOf(ArrayBuffer);
    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
  });
});
```

## Definition of Done

- [ ] PDF generation handler class implemented
- [ ] Request validation complete with all document types
- [ ] Progress reporting sending updates to renderer
- [ ] Cancellation mechanism working
- [ ] Error handling for all failure scenarios
- [ ] Memory management for active requests
- [ ] Unit tests covering all methods
- [ ] Integration tests for complete flow
- [ ] Handler registered in main process

## Common Pitfalls

1. **Memory Leaks**: Not cleaning up active requests
   - Always remove from map in finally block
   - Clear all on app quit

2. **Window Closed**: Sending progress to closed window
   - Check if webContents is destroyed before sending
   - Handle errors gracefully

3. **Large Buffers**: Sending huge PDFs over IPC
   - Consider chunking for very large files
   - Monitor memory usage

4. **Concurrent Requests**: Not handling multiple simultaneous requests
   - Use unique request IDs
   - Maintain separate abort controllers

5. **Error Details**: Exposing sensitive information
   - Only include stack traces in development
   - Sanitize error messages for production

## Notes

- Consider implementing request queuing for resource management
- Add metrics/logging for monitoring PDF generation performance
- Plan for future enhancements like batch generation
- Document expected generation times for different document types
- Consider adding request timeout mechanism 