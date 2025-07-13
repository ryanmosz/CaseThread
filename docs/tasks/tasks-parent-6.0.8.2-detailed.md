# Task 6.0.8.2: Create IPC Handler Tests

## Overview
Write comprehensive tests for all PDF-related IPC handlers in the main process, ensuring secure and reliable communication between renderer and main processes.

## Current State
- IPC handlers implemented for PDF generation and export
- Progress reporting infrastructure in place
- Basic IPC tests exist but no PDF-specific coverage
- Mock services available for testing

## Implementation Details

### 1. Test PDF Generation Handler
File: `__tests__/electron/main/ipc/pdf-generation-handler.test.ts`

```typescript
import { ipcMain, IpcMainInvokeEvent, WebContents } from 'electron';
import { setupPDFGenerationHandler } from '@/electron/main/ipc/pdf-generation-handler';
import { PDFServiceFactory } from '@/services/pdf/PDFServiceFactory';
import { ProgressManager } from '@/electron/main/ipc/progress-manager';
import { ServiceContainer } from '@/services/ServiceContainer';

// Mock Electron
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn()
  }
}));

// Mock services
jest.mock('@/services/pdf/PDFServiceFactory');
jest.mock('@/electron/main/ipc/progress-manager');
jest.mock('@/services/ServiceContainer');

describe('PDF Generation Handler', () => {
  let mockEvent: Partial<IpcMainInvokeEvent>;
  let mockSender: Partial<WebContents>;
  let handlers: Map<string, Function>;

  beforeEach(() => {
    handlers = new Map();
    
    // Capture registered handlers
    (ipcMain.handle as jest.Mock).mockImplementation((channel, handler) => {
      handlers.set(channel, handler);
    });

    // Mock event and sender
    mockSender = {
      id: 1,
      send: jest.fn()
    };
    
    mockEvent = {
      sender: mockSender as WebContents
    };

    // Setup handler
    setupPDFGenerationHandler();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('pdf:generate', () => {
    it('should generate PDF successfully', async () => {
      const mockPdfBuffer = Buffer.from('mock-pdf-content');
      const mockPdfService = {
        generatePDF: jest.fn().mockResolvedValue(mockPdfBuffer)
      };

      (ServiceContainer.get as jest.Mock).mockReturnValue(mockPdfService);
      
      const handler = handlers.get('pdf:generate');
      const result = await handler(mockEvent, {
        content: '# Test Document',
        templateId: 'patent-assignment',
        metadata: { author: 'Test' }
      });

      expect(result).toEqual({
        success: true,
        data: mockPdfBuffer,
        metadata: expect.objectContaining({
          size: mockPdfBuffer.length,
          duration: expect.any(Number)
        })
      });

      expect(mockPdfService.generatePDF).toHaveBeenCalledWith({
        content: '# Test Document',
        templateId: 'patent-assignment',
        metadata: { author: 'Test' }
      });
    });

    it('should handle PDF generation errors', async () => {
      const error = new Error('PDF generation failed');
      const mockPdfService = {
        generatePDF: jest.fn().mockRejectedValue(error)
      };

      (ServiceContainer.get as jest.Mock).mockReturnValue(mockPdfService);

      const handler = handlers.get('pdf:generate');
      const result = await handler(mockEvent, {
        content: '# Test Document',
        templateId: 'invalid-template'
      });

      expect(result).toEqual({
        success: false,
        error: 'PDF generation failed',
        errorInfo: expect.objectContaining({
          message: 'PDF generation failed',
          retryable: false
        })
      });
    });

    it('should validate input parameters', async () => {
      const handler = handlers.get('pdf:generate');
      
      // Missing content
      const result = await handler(mockEvent, {
        templateId: 'patent-assignment'
      });

      expect(result).toEqual({
        success: false,
        error: 'Missing required parameter: content',
        errorInfo: {
          message: 'Missing required parameter: content',
          code: 'VALIDATION_ERROR',
          retryable: false
        }
      });
    });

    it('should report progress during generation', async () => {
      const mockProgressManager = {
        updateProgress: jest.fn()
      };
      
      (ProgressManager.getInstance as jest.Mock).mockReturnValue(mockProgressManager);

      const mockPdfService = {
        generatePDF: jest.fn().mockImplementation(async (options) => {
          // Simulate progress updates
          await new Promise(resolve => setTimeout(resolve, 10));
          return Buffer.from('mock-pdf');
        })
      };

      (ServiceContainer.get as jest.Mock).mockReturnValue(mockPdfService);

      const handler = handlers.get('pdf:generate');
      await handler(mockEvent, {
        content: '# Test',
        templateId: 'test'
      });

      // Check progress updates
      expect(mockProgressManager.updateProgress).toHaveBeenCalledWith(
        mockSender,
        expect.objectContaining({
          stage: 'initializing',
          progress: 0,
          message: 'Starting PDF generation...'
        })
      );

      expect(mockProgressManager.updateProgress).toHaveBeenCalledWith(
        mockSender,
        expect.objectContaining({
          stage: 'complete',
          progress: 100,
          message: 'PDF generation complete'
        })
      );
    });

    it('should handle concurrent generation requests', async () => {
      const mockPdfService = {
        generatePDF: jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return Buffer.from('mock-pdf');
        })
      };

      (ServiceContainer.get as jest.Mock).mockReturnValue(mockPdfService);

      const handler = handlers.get('pdf:generate');
      
      // Start multiple concurrent requests
      const promises = [
        handler(mockEvent, { content: 'Doc1', templateId: 'test' }),
        handler(mockEvent, { content: 'Doc2', templateId: 'test' }),
        handler(mockEvent, { content: 'Doc3', templateId: 'test' })
      ];

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Service should be called 3 times
      expect(mockPdfService.generatePDF).toHaveBeenCalledTimes(3);
    });
  });
});
```

### 2. Test PDF Export Handler
File: `__tests__/electron/main/ipc/pdf-export-handler.test.ts`

```typescript
import { dialog, shell } from 'electron';
import { setupPDFExportHandler } from '@/electron/main/ipc/pdf-export-handler';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn() },
  dialog: { showSaveDialog: jest.fn() },
  shell: { showItemInFolder: jest.fn() }
}));

jest.mock('fs/promises');

describe('PDF Export Handler', () => {
  let handlers: Map<string, Function>;
  let mockEvent: any;

  beforeEach(() => {
    handlers = new Map();
    (ipcMain.handle as jest.Mock).mockImplementation((channel, handler) => {
      handlers.set(channel, handler);
    });

    mockEvent = { sender: { id: 1 } };
    setupPDFExportHandler();
  });

  describe('pdf:export', () => {
    it('should export PDF to selected file', async () => {
      const mockBuffer = Buffer.from('pdf-content');
      const filePath = '/Users/test/document.pdf';

      (dialog.showSaveDialog as jest.Mock).mockResolvedValue({
        canceled: false,
        filePath
      });

      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const handler = handlers.get('pdf:export');
      const result = await handler(mockEvent, {
        buffer: mockBuffer,
        fileName: 'document.pdf'
      });

      expect(result).toEqual({
        success: true,
        filePath
      });

      expect(dialog.showSaveDialog).toHaveBeenCalledWith({
        defaultPath: 'document.pdf',
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      expect(fs.writeFile).toHaveBeenCalledWith(
        filePath,
        mockBuffer
      );
    });

    it('should handle cancelled save dialog', async () => {
      (dialog.showSaveDialog as jest.Mock).mockResolvedValue({
        canceled: true
      });

      const handler = handlers.get('pdf:export');
      const result = await handler(mockEvent, {
        buffer: Buffer.from('pdf'),
        fileName: 'test.pdf'
      });

      expect(result).toEqual({
        success: false,
        error: 'Export cancelled by user'
      });

      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle file write errors', async () => {
      const filePath = '/Users/test/document.pdf';
      const writeError = new Error('Permission denied');

      (dialog.showSaveDialog as jest.Mock).mockResolvedValue({
        canceled: false,
        filePath
      });

      (fs.writeFile as jest.Mock).mockRejectedValue(writeError);

      const handler = handlers.get('pdf:export');
      const result = await handler(mockEvent, {
        buffer: Buffer.from('pdf'),
        fileName: 'document.pdf'
      });

      expect(result).toEqual({
        success: false,
        error: 'Failed to save PDF: Permission denied'
      });
    });

    it('should validate buffer parameter', async () => {
      const handler = handlers.get('pdf:export');
      
      const result = await handler(mockEvent, {
        fileName: 'test.pdf'
        // Missing buffer
      });

      expect(result).toEqual({
        success: false,
        error: 'Invalid PDF buffer provided'
      });
    });

    it('should generate default filename if not provided', async () => {
      const mockBuffer = Buffer.from('pdf-content');
      
      (dialog.showSaveDialog as jest.Mock).mockResolvedValue({
        canceled: false,
        filePath: '/Users/test/document.pdf'
      });

      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const handler = handlers.get('pdf:export');
      await handler(mockEvent, {
        buffer: mockBuffer
        // No fileName provided
      });

      expect(dialog.showSaveDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultPath: expect.stringMatching(/^document-\d{4}-\d{2}-\d{2}\.pdf$/)
        })
      );
    });

    it('should show file in folder after export', async () => {
      const filePath = '/Users/test/document.pdf';
      
      (dialog.showSaveDialog as jest.Mock).mockResolvedValue({
        canceled: false,
        filePath
      });

      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const handler = handlers.get('pdf:export');
      const result = await handler(mockEvent, {
        buffer: Buffer.from('pdf'),
        fileName: 'test.pdf',
        showInFolder: true
      });

      expect(result.success).toBe(true);
      expect(shell.showItemInFolder).toHaveBeenCalledWith(filePath);
    });
  });
});
```

### 3. Test Progress Handler
File: `__tests__/electron/main/ipc/progress-handlers.test.ts`

```typescript
import { setupProgressHandlers } from '@/electron/main/ipc/progress-handlers';
import { ProgressManager } from '@/electron/main/ipc/progress-manager';

describe('Progress Handlers', () => {
  let handlers: Map<string, Function>;
  let mockProgressManager: any;
  let mockEvent: any;
  let mockSender: any;

  beforeEach(() => {
    handlers = new Map();
    
    mockSender = {
      id: 1,
      on: jest.fn(),
      removeListener: jest.fn()
    };

    mockEvent = { sender: mockSender };

    mockProgressManager = {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      getProgress: jest.fn()
    };

    (ProgressManager.getInstance as jest.Mock).mockReturnValue(mockProgressManager);

    setupProgressHandlers();
  });

  describe('progress:subscribe', () => {
    it('should subscribe to progress updates', () => {
      const handler = handlers.get('progress:subscribe');
      const callback = jest.fn();

      handler(mockEvent);

      expect(mockProgressManager.addListener).toHaveBeenCalledWith(
        mockSender,
        expect.any(Function)
      );
    });

    it('should forward progress updates to renderer', () => {
      const handler = handlers.get('progress:subscribe');
      handler(mockEvent);

      // Get the callback that was registered
      const registeredCallback = mockProgressManager.addListener.mock.calls[0][1];

      // Simulate progress update
      const progressData = {
        stage: 'processing',
        progress: 50,
        message: 'Processing...'
      };

      registeredCallback(progressData);

      expect(mockSender.send).toHaveBeenCalledWith(
        'pdf:progress',
        progressData
      );
    });

    it('should clean up on renderer disconnect', () => {
      const handler = handlers.get('progress:subscribe');
      handler(mockEvent);

      // Simulate renderer disconnection
      const destroyCallback = mockSender.on.mock.calls.find(
        call => call[0] === 'destroyed'
      )[1];

      destroyCallback();

      expect(mockProgressManager.removeListener).toHaveBeenCalledWith(
        mockSender
      );
    });
  });

  describe('progress:unsubscribe', () => {
    it('should unsubscribe from progress updates', () => {
      const handler = handlers.get('progress:unsubscribe');
      handler(mockEvent);

      expect(mockProgressManager.removeListener).toHaveBeenCalledWith(
        mockSender
      );
    });
  });

  describe('progress:get-current', () => {
    it('should return current progress state', () => {
      const mockProgress = {
        stage: 'finalizing',
        progress: 90,
        message: 'Almost done...'
      };

      mockProgressManager.getProgress.mockReturnValue(mockProgress);

      const handler = handlers.get('progress:get-current');
      const result = handler(mockEvent);

      expect(result).toEqual(mockProgress);
      expect(mockProgressManager.getProgress).toHaveBeenCalledWith(mockSender);
    });

    it('should return null if no progress exists', () => {
      mockProgressManager.getProgress.mockReturnValue(null);

      const handler = handlers.get('progress:get-current');
      const result = handler(mockEvent);

      expect(result).toBeNull();
    });
  });
});
```

### 4. Test Security Validation
File: `__tests__/electron/main/ipc/secure-handler.test.ts`

```typescript
import { setupSecureHandler } from '@/electron/main/ipc/secure-handler';
import { validatePDFOptions } from '@/electron/main/ipc/pdf-validation';

jest.mock('@/electron/main/ipc/pdf-validation');

describe('Secure Handler', () => {
  let originalHandler: Function;
  let secureHandler: Function;
  let mockEvent: any;

  beforeEach(() => {
    originalHandler = jest.fn().mockResolvedValue({ success: true });
    mockEvent = {
      sender: {
        id: 1,
        getURL: () => 'file:///app/index.html'
      }
    };
  });

  it('should validate PDF generation options', async () => {
    (validatePDFOptions as jest.Mock).mockReturnValue({ 
      isValid: true 
    });

    secureHandler = setupSecureHandler('pdf:generate', originalHandler);

    const options = {
      content: '# Test',
      templateId: 'test'
    };

    await secureHandler(mockEvent, options);

    expect(validatePDFOptions).toHaveBeenCalledWith(options);
    expect(originalHandler).toHaveBeenCalledWith(mockEvent, options);
  });

  it('should reject invalid options', async () => {
    (validatePDFOptions as jest.Mock).mockReturnValue({
      isValid: false,
      error: 'Invalid template ID'
    });

    secureHandler = setupSecureHandler('pdf:generate', originalHandler);

    const result = await secureHandler(mockEvent, {
      content: '# Test',
      templateId: '../../../etc/passwd'
    });

    expect(result).toEqual({
      success: false,
      error: 'Invalid template ID'
    });

    expect(originalHandler).not.toHaveBeenCalled();
  });

  it('should sanitize file paths', async () => {
    (validatePDFOptions as jest.Mock).mockReturnValue({
      isValid: true,
      sanitized: {
        content: '# Test',
        templateId: 'test',
        outputPath: 'output/document.pdf'
      }
    });

    secureHandler = setupSecureHandler('pdf:generate', originalHandler);

    await secureHandler(mockEvent, {
      content: '# Test',
      templateId: 'test',
      outputPath: '../../../output/document.pdf'
    });

    expect(originalHandler).toHaveBeenCalledWith(mockEvent, {
      content: '# Test',
      templateId: 'test',
      outputPath: 'output/document.pdf'
    });
  });

  it('should enforce size limits', async () => {
    const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB

    (validatePDFOptions as jest.Mock).mockReturnValue({
      isValid: false,
      error: 'Content exceeds maximum size limit (5MB)'
    });

    secureHandler = setupSecureHandler('pdf:generate', originalHandler);

    const result = await secureHandler(mockEvent, {
      content: largeContent,
      templateId: 'test'
    });

    expect(result).toEqual({
      success: false,
      error: 'Content exceeds maximum size limit (5MB)'
    });
  });

  it('should validate sender context', async () => {
    mockEvent.sender.getURL = () => 'https://malicious.com';

    secureHandler = setupSecureHandler('pdf:generate', originalHandler);

    const result = await secureHandler(mockEvent, {
      content: '# Test',
      templateId: 'test'
    });

    expect(result).toEqual({
      success: false,
      error: 'Invalid sender context'
    });
  });
});
```

### 5. Test Progress Manager
File: `__tests__/electron/main/ipc/progress-manager.test.ts`

```typescript
import { ProgressManager } from '@/electron/main/ipc/progress-manager';

describe('ProgressManager', () => {
  let progressManager: ProgressManager;
  let mockSender: any;

  beforeEach(() => {
    progressManager = ProgressManager.getInstance();
    progressManager.clear(); // Clear any existing state

    mockSender = {
      id: 1,
      send: jest.fn()
    };
  });

  it('should be a singleton', () => {
    const instance1 = ProgressManager.getInstance();
    const instance2 = ProgressManager.getInstance();

    expect(instance1).toBe(instance2);
  });

  it('should update progress for sender', () => {
    const progress = {
      stage: 'processing',
      progress: 50,
      message: 'Processing...'
    };

    progressManager.updateProgress(mockSender, progress);

    const current = progressManager.getProgress(mockSender);
    expect(current).toEqual(progress);
  });

  it('should notify listeners on progress update', () => {
    const listener = jest.fn();
    progressManager.addListener(mockSender, listener);

    const progress = {
      stage: 'processing',
      progress: 50,
      message: 'Processing...'
    };

    progressManager.updateProgress(mockSender, progress);

    expect(listener).toHaveBeenCalledWith(progress);
  });

  it('should handle multiple listeners', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();

    const sender1 = { id: 1, send: jest.fn() };
    const sender2 = { id: 2, send: jest.fn() };

    progressManager.addListener(sender1, listener1);
    progressManager.addListener(sender2, listener2);

    const progress1 = { stage: 'stage1', progress: 25, message: 'msg1' };
    const progress2 = { stage: 'stage2', progress: 75, message: 'msg2' };

    progressManager.updateProgress(sender1, progress1);
    progressManager.updateProgress(sender2, progress2);

    expect(listener1).toHaveBeenCalledWith(progress1);
    expect(listener1).not.toHaveBeenCalledWith(progress2);

    expect(listener2).toHaveBeenCalledWith(progress2);
    expect(listener2).not.toHaveBeenCalledWith(progress1);
  });

  it('should remove listeners', () => {
    const listener = jest.fn();
    progressManager.addListener(mockSender, listener);

    progressManager.removeListener(mockSender);

    const progress = {
      stage: 'processing',
      progress: 50,
      message: 'Processing...'
    };

    progressManager.updateProgress(mockSender, progress);

    expect(listener).not.toHaveBeenCalled();
  });

  it('should clear progress on completion', () => {
    progressManager.updateProgress(mockSender, {
      stage: 'processing',
      progress: 50,
      message: 'Processing...'
    });

    expect(progressManager.getProgress(mockSender)).toBeTruthy();

    progressManager.updateProgress(mockSender, {
      stage: 'complete',
      progress: 100,
      message: 'Complete'
    });

    // Progress should be cleared after completion
    setTimeout(() => {
      expect(progressManager.getProgress(mockSender)).toBeNull();
    }, 100);
  });
});
```

### 6. Integration Test Helper
File: `__tests__/electron/main/ipc/test-helpers.ts`

```typescript
export function createMockEvent(overrides: any = {}): IpcMainInvokeEvent {
  return {
    sender: {
      id: 1,
      send: jest.fn(),
      getURL: () => 'file:///app/index.html',
      ...overrides.sender
    },
    ...overrides
  } as any;
}

export function setupIpcMocks() {
  const handlers = new Map<string, Function>();
  
  (ipcMain.handle as jest.Mock).mockImplementation((channel, handler) => {
    handlers.set(channel, handler);
  });

  return {
    handlers,
    invoke: async (channel: string, ...args: any[]) => {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`No handler registered for ${channel}`);
      }
      return handler(...args);
    }
  };
}

export function mockPDFService() {
  return {
    generatePDF: jest.fn(),
    validateTemplate: jest.fn(),
    getTemplateInfo: jest.fn()
  };
}

export function waitForProgress(
  progressManager: ProgressManager,
  sender: WebContents,
  stage: string
): Promise<void> {
  return new Promise((resolve) => {
    const checkProgress = () => {
      const progress = progressManager.getProgress(sender);
      if (progress?.stage === stage) {
        resolve();
      } else {
        setTimeout(checkProgress, 10);
      }
    };
    checkProgress();
  });
}
```

## Testing Strategy

### Test Coverage Requirements
- All IPC handlers must have tests
- Security validation must be thoroughly tested
- Error scenarios must be covered
- Concurrent operations must be tested
- Progress reporting must be verified

### Running IPC Tests
```bash
# Run all IPC handler tests
npm test -- __tests__/electron/main/ipc

# Run with coverage
npm test -- --coverage __tests__/electron/main/ipc

# Run specific handler tests
npm test -- __tests__/electron/main/ipc/pdf-generation-handler.test.ts

# Debug tests
node --inspect-brk ./node_modules/.bin/jest __tests__/electron/main/ipc
```

## Acceptance Criteria
- [ ] All IPC handlers have comprehensive tests
- [ ] Security validation is thoroughly tested
- [ ] Progress reporting is verified
- [ ] Error handling is tested
- [ ] Concurrent operations are tested
- [ ] Mock services work correctly
- [ ] Tests are isolated and fast

## Notes
- Mock electron modules appropriately
- Test both success and failure paths
- Verify security constraints
- Test memory cleanup
- Consider performance implications 