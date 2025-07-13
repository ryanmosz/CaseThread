import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { PDFGenerationHandler } from '../../../../src/electron/main/ipc/pdf-generation-handler';
import { PDFServiceFactory } from '../../../../src/services/pdf/PDFServiceFactory';
import { PDF_CHANNELS } from '../../../../src/electron/constants/pdf-channels';
import {
  PDFGenerateRequest,
  PDFGenerateResponse,
  PDFErrorCode,
} from '../../../../src/types/pdf-ipc';
import { ProgressManager } from '../../../../src/electron/main/ipc/progress-manager';

// Mock electron
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
  },
}));

// Mock PDF service
jest.mock('../../../../src/services/pdf/PDFServiceFactory');

// Mock logger
jest.mock('../../../../src/utils/logger', () => ({
  createChildLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock SecurityValidator and SecureIPCHandler
jest.mock('../../../../src/electron/main/ipc/security-validator');
jest.mock('../../../../src/electron/main/ipc/secure-handler', () => ({
  SecureIPCHandler: {
    handle: (channel: string, handler: Function, validator?: Function) => {
      // For tests, register the handler directly with validation
      const wrappedHandler = async (event: any, ...args: any[]) => {
        // If validator provided, run it first
        if (validator) {
          const result = validator(event, ...args);
          if (!result.valid) {
            throw { message: result.error || 'Validation failed', code: 'IPC_ERROR' };
          }
          // Use sanitized args if provided
          if (result.sanitized) {
            args = [result.sanitized];
          }
        }
        // Call the actual handler
        return handler(event, ...args);
      };
      (ipcMain.handle as jest.Mock)(channel, wrappedHandler);
    },
  },
}));

const mockSecurityValidator = {
  validatePDFGenerateRequest: jest.fn(),
  validateCancelRequest: jest.fn(),
  validateStringParam: jest.fn(),
};

jest.mock('../../../../src/electron/main/ipc/security-validator', () => ({
  SecurityValidator: {
    getInstance: () => mockSecurityValidator,
  },
}));

describe('PDFGenerationHandler', () => {
  let handler: PDFGenerationHandler;
  let mockEvent: Partial<IpcMainInvokeEvent>;
  let mockService: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock event
    mockEvent = {
      sender: {
        id: 1,
        send: jest.fn(),
        isDestroyed: jest.fn().mockReturnValue(false),
      } as any,
    };

    // Create mock PDF service
    mockService = {
      exportToBuffer: jest.fn().mockResolvedValue({
        buffer: Buffer.from(new ArrayBuffer(1000)),
        pageCount: 5,
        signatureBlockCount: 2,
        warnings: [],
        metadata: {
          documentType: 'test',
          generatedAt: new Date(),
          fileSize: 1000,
          exportType: 'buffer',
        },
      }),
    };

    (PDFServiceFactory as any).createPDFService = jest.fn().mockReturnValue(mockService);
    (PDFServiceFactory.forGUI as jest.Mock) = jest.fn().mockReturnValue(mockService);

    // Setup security validator mocks
    mockSecurityValidator.validatePDFGenerateRequest.mockImplementation((_event, request) => {
      // Simulate validation logic
      if (!request.requestId || request.requestId === '') {
        return { valid: false, error: 'Invalid request ID' };
      }
      if (!request.content || request.content === '') {
        return { valid: false, error: 'Invalid content' };
      }
      if (!request.documentType || ![
        'provisional-patent-application',
        'patent-assignment-agreement',
        'patent-license-agreement',
        'trademark-application',
        'cease-and-desist-letter',
        'nda-ip-specific',
        'office-action-response',
        'technology-transfer-agreement',
      ].includes(request.documentType)) {
        return { valid: false, error: 'Invalid document type' };
      }
      if (!request.documentId || request.documentId === '') {
        return { valid: false, error: 'Invalid document ID' };
      }
      // Validate options
      if (request.options) {
        if (request.options.fontSize && (
          typeof request.options.fontSize !== 'number' ||
          request.options.fontSize < 8 ||
          request.options.fontSize > 24
        )) {
          return { valid: false, error: 'Invalid generation options' };
        }
        if (request.options.lineSpacing && ![
          'single', 'one-half', 'double'
        ].includes(request.options.lineSpacing)) {
          return { valid: false, error: 'Invalid generation options' };
        }
      }
      return { valid: true, sanitized: request };
    });

    mockSecurityValidator.validateCancelRequest.mockImplementation((_event, request) => {
      if (!request.requestId || request.requestId === '') {
        return { valid: false, error: 'Invalid request ID' };
      }
      return { valid: true, sanitized: request };
    });

    // Clear singleton instance
    (PDFGenerationHandler as any).instance = null;
    
    // Create handler instance
    handler = PDFGenerationHandler.getInstance();
  });

  afterEach(() => {
    // Clean up the handler instance if it exists
    const handler = (PDFGenerationHandler as any).instance;
    if (handler) {
      handler.cleanup();
    }
    
    // Clean up singleton
    (PDFGenerationHandler as any).instance = null;
    
    // Clean up ProgressManager singleton
    const progressManager = (ProgressManager as any).instance;
    if (progressManager) {
      progressManager.cleanup();
      (ProgressManager as any).instance = null;
    }
    
    // Clear all jest timers and mocks
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should register IPC handlers on construction', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        PDF_CHANNELS.GENERATE,
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        PDF_CHANNELS.CANCEL,
        expect.any(Function)
      );
    });

    it('should use singleton pattern', () => {
      const instance1 = PDFGenerationHandler.getInstance();
      const instance2 = PDFGenerationHandler.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('PDF Generation', () => {
    const validRequest: PDFGenerateRequest = {
      requestId: 'test-123',
      content: '# Test Document',
      documentType: 'patent-assignment-agreement',
      documentId: 'doc-1',
      options: {
        fontSize: 12,
        lineSpacing: 'double',
      },
    };

    it('should generate PDF successfully', async () => {
      // Get the handler function
      const generateHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === PDF_CHANNELS.GENERATE
      )[1];

      const response: PDFGenerateResponse = await generateHandler(mockEvent, validRequest);

      expect(response.success).toBe(true);
      expect(response.requestId).toBe(validRequest.requestId);
      expect(response.data).toBeDefined();
      expect(response.data?.buffer).toBeInstanceOf(Buffer);
      expect(response.data?.metadata.pageCount).toBe(5);
      expect(response.data?.metadata.documentType).toBe(validRequest.documentType);
      expect(response.data?.metadata.hasSignatureBlocks).toBe(true);
    });

    it('should send progress updates during generation', async () => {
      // Create a service that calls progress during export
      (PDFServiceFactory.forGUI as jest.Mock).mockImplementation((callback) => {
        return {
          exportToBuffer: jest.fn().mockImplementation(async () => {
            // Simulate progress events
            callback({
              type: 'progress',
              message: 'Loading document formatting rules',
              detail: 'Loading PDF settings',
              timestamp: new Date(),
            });
            callback({
              type: 'progress',
              message: 'Parsing signature blocks',
              detail: 'Found 2 signature blocks',
              timestamp: new Date(),
            });
            
            // Return the mock result
            return mockService.exportToBuffer();
          }),
        };
      });

      const generateHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === PDF_CHANNELS.GENERATE
      )[1];

      await generateHandler(mockEvent, validRequest);

      expect(mockEvent.sender?.send).toHaveBeenCalledWith(
        PDF_CHANNELS.PROGRESS,
        expect.objectContaining({
          requestId: validRequest.requestId,
          step: 'Loading document formatting rules',
          percentage: 15,
        })
      );
    });

    it('should send completion event on success', async () => {
      const generateHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === PDF_CHANNELS.GENERATE
      )[1];

      await generateHandler(mockEvent, validRequest);

      expect(mockEvent.sender?.send).toHaveBeenCalledWith(
        PDF_CHANNELS.COMPLETE,
        expect.objectContaining({
          requestId: validRequest.requestId,
          duration: expect.any(Number),
        })
      );
    });
  });

  describe('Request Validation', () => {
    const generateHandler = () => {
      return (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === PDF_CHANNELS.GENERATE
      )[1];
    };

    it('should reject request without requestId', async () => {
      const invalidRequest = {
        content: '# Test',
        documentType: 'nda-ip-specific',
        documentId: 'doc-1',
      } as any;

      await expect(generateHandler()(mockEvent, invalidRequest)).rejects.toMatchObject({
        message: 'Invalid request ID',
        code: 'IPC_ERROR',
      });
    });

    it('should reject request with empty content', async () => {
      const invalidRequest: PDFGenerateRequest = {
        requestId: 'test-123',
        content: '',
        documentType: 'nda-ip-specific',
        documentId: 'doc-1',
      };

      await expect(generateHandler()(mockEvent, invalidRequest)).rejects.toMatchObject({
        message: 'Invalid content',
        code: 'IPC_ERROR',
      });
    });

    it('should reject invalid document type', async () => {
      const invalidRequest = {
        requestId: 'test-123',
        content: '# Test',
        documentType: 'invalid-type',
        documentId: 'doc-1',
      } as any;

      await expect(generateHandler()(mockEvent, invalidRequest)).rejects.toMatchObject({
        message: 'Invalid document type',
        code: 'IPC_ERROR',
      });
    });

    it('should validate font size range', async () => {
      const invalidRequest: PDFGenerateRequest = {
        requestId: 'test-123',
        content: '# Test',
        documentType: 'nda-ip-specific',
        documentId: 'doc-1',
        options: {
          fontSize: 30, // Too large
        },
      };

      await expect(generateHandler()(mockEvent, invalidRequest)).rejects.toMatchObject({
        message: 'Invalid generation options',
        code: 'IPC_ERROR',
      });
    });

    it('should validate line spacing options', async () => {
      const invalidRequest: PDFGenerateRequest = {
        requestId: 'test-123',
        content: '# Test',
        documentType: 'nda-ip-specific',
        documentId: 'doc-1',
        options: {
          lineSpacing: 'triple' as any,
        },
      };

      await expect(generateHandler()(mockEvent, invalidRequest)).rejects.toMatchObject({
        message: 'Invalid generation options',
        code: 'IPC_ERROR',
      });
    });
  });

  describe('Error Handling', () => {
    const validRequest: PDFGenerateRequest = {
      requestId: 'test-123',
      content: '# Test Document',
      documentType: 'patent-assignment-agreement',
      documentId: 'doc-1',
    };

    it('should handle generation errors gracefully', async () => {
      mockService.exportToBuffer.mockRejectedValueOnce(
        new Error('Invalid signature block format')
      );

      const generateHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === PDF_CHANNELS.GENERATE
      )[1];

      const response = await generateHandler(mockEvent, validRequest);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(PDFErrorCode.INVALID_DOCUMENT);
      expect(response.error?.message).toContain('Invalid signature block');
      expect(response.error?.suggestion).toBeDefined();
    });

    it('should handle memory errors', async () => {
      mockService.exportToBuffer.mockRejectedValueOnce(
        new Error('Out of memory')
      );

      const generateHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === PDF_CHANNELS.GENERATE
      )[1];

      const response = await generateHandler(mockEvent, validRequest);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(PDFErrorCode.MEMORY_LIMIT);
      expect(response.error?.suggestion).toContain('Try closing other applications');
    });

    it('should send error event on failure', async () => {
      mockService.exportToBuffer.mockRejectedValueOnce(
        new Error('Generation failed')
      );

      const generateHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === PDF_CHANNELS.GENERATE
      )[1];

      await generateHandler(mockEvent, validRequest);

      expect(mockEvent.sender?.send).toHaveBeenCalledWith(
        PDF_CHANNELS.ERROR,
        expect.objectContaining({
          requestId: validRequest.requestId,
          error: expect.objectContaining({
            code: PDFErrorCode.GENERATION_FAILED,
          }),
        })
      );
    });

    it('should exclude stack traces in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockService.exportToBuffer.mockRejectedValueOnce(
        new Error('Test error')
      );

      const generateHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === PDF_CHANNELS.GENERATE
      )[1];

      const response = await generateHandler(mockEvent, validRequest);

      expect(response.error?.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Cancellation', () => {
    it('should cancel active generation', async () => {
      const validRequest: PDFGenerateRequest = {
        requestId: 'test-123',
        content: '# Test Document',
        documentType: 'patent-assignment-agreement',
        documentId: 'doc-1',
      };

      // Create a service that can be cancelled
      let shouldAbort = false;
      const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' });
      
      (PDFServiceFactory.forGUI as jest.Mock).mockImplementation((_callback) => {
        return {
          exportToBuffer: jest.fn().mockImplementation(async () => {
            // Simulate a long-running operation that checks for cancellation
            await new Promise((resolve, reject) => {
              const checkInterval = setInterval(() => {
                if (shouldAbort) {
                  clearInterval(checkInterval);
                  reject(abortError);
                }
              }, 10);
              
              // Also set a timeout to eventually resolve if not cancelled
              setTimeout(() => {
                clearInterval(checkInterval);
                resolve(mockService.exportToBuffer());
              }, 1000);
            });
          }),
        };
      });

      const generateHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === PDF_CHANNELS.GENERATE
      )[1];

      // Start generation (but don't await)
      const generationPromise = generateHandler(mockEvent, validRequest);

      // Wait a bit then cancel
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Set the abort flag (simulating what the handler would do)
      shouldAbort = true;
      
      const response = await generationPromise;

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(PDFErrorCode.GENERATION_CANCELLED);
    });

    it('should send cancelled event when generation is cancelled', async () => {
      const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' });
      mockService.exportToBuffer.mockRejectedValueOnce(abortError);

      const generateHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === PDF_CHANNELS.GENERATE
      )[1];

      await generateHandler(mockEvent, {
        requestId: 'test-123',
        content: '# Test',
        documentType: 'nda-ip-specific',
        documentId: 'doc-1',
      });

      expect(mockEvent.sender?.send).toHaveBeenCalledWith(
        PDF_CHANNELS.CANCELLED,
        { requestId: 'test-123' }
      );
    });
  });

  describe('Active Request Management', () => {
    it('should track active requests', async () => {
      const stats = handler.getStats();
      expect(stats.activeCount).toBe(0);
      expect(stats.requestIds).toEqual([]);
    });

    it('should cleanup requests after completion', async () => {
      const validRequest: PDFGenerateRequest = {
        requestId: 'test-123',
        content: '# Test Document',
        documentType: 'patent-assignment-agreement',
        documentId: 'doc-1',
      };

      const generateHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === PDF_CHANNELS.GENERATE
      )[1];

      await generateHandler(mockEvent, validRequest);

      const stats = handler.getStats();
      expect(stats.activeCount).toBe(0);
    });

    it('should cleanup all requests on handler cleanup', () => {
      handler.cleanup();
      
      const stats = handler.getStats();
      expect(stats.activeCount).toBe(0);
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate correct percentages for known steps', async () => {
      const progressUpdates: any[] = [];
      
      (PDFServiceFactory.forGUI as jest.Mock).mockImplementation((_callback) => {
        return {
          exportToBuffer: jest.fn().mockImplementation(async () => {
            // Simulate various progress steps
            _callback({
              type: 'progress',
              message: 'Initializing PDF components',
              detail: '',
              timestamp: new Date(),
            });
            _callback({
              type: 'progress',
              message: 'Loading document formatting rules',
              detail: '',
              timestamp: new Date(),
            });
            _callback({
              type: 'progress',
              message: 'Parsing signature blocks',
              detail: '',
              timestamp: new Date(),
            });
            _callback({
              type: 'progress',
              message: 'PDF export completed',
              detail: '',
              timestamp: new Date(),
            });
            
            return mockService.exportToBuffer();
          }),
        };
      });

      mockEvent.sender!.send = jest.fn((channel, data) => {
        if (channel === PDF_CHANNELS.PROGRESS) {
          progressUpdates.push(data);
        }
      });

      const generateHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === PDF_CHANNELS.GENERATE
      )[1];

      await generateHandler(mockEvent, {
        requestId: 'test-123',
        content: '# Test',
        documentType: 'nda-ip-specific',
        documentId: 'doc-1',
      });

      const percentages = progressUpdates.map(u => u.percentage);
      expect(percentages).toContain(5);   // Initializing
      expect(percentages).toContain(15);  // Loading rules
      expect(percentages).toContain(25);  // Parsing signatures
      expect(percentages).toContain(100); // Completed
    });

    it('should handle "Rendering page X of Y" format', async () => {
      (PDFServiceFactory.forGUI as jest.Mock).mockImplementation((_callback) => {
        return {
          exportToBuffer: jest.fn().mockImplementation(async () => {
            _callback({
              type: 'progress',
              message: 'Rendering page 1 of 5',
              detail: '',
              timestamp: new Date(),
            });
            _callback({
              type: 'progress',
              message: 'Rendering page 3 of 5',
              detail: '',
              timestamp: new Date(),
            });
            
            return mockService.exportToBuffer();
          }),
        };
      });

      const progressUpdates: any[] = [];
      mockEvent.sender!.send = jest.fn((channel, data) => {
        if (channel === PDF_CHANNELS.PROGRESS) {
          progressUpdates.push(data);
        }
      });

      const generateHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === PDF_CHANNELS.GENERATE
      )[1];

      await generateHandler(mockEvent, {
        requestId: 'test-123',
        content: '# Test',
        documentType: 'nda-ip-specific',
        documentId: 'doc-1',
      });

      const renderingUpdates = progressUpdates.filter(u => u.step.startsWith('Rendering page'));
      expect(renderingUpdates.every(u => u.percentage === 80)).toBe(true);
    });
  });

  describe('Window State Handling', () => {
    it('should cancel generation if window is destroyed', async () => {
      let progressSent = false;
      
      (PDFServiceFactory.forGUI as jest.Mock).mockImplementation((_callback) => {
        return {
          exportToBuffer: jest.fn().mockImplementation(async () => {
            // Try to send progress when window is destroyed
            _callback({
              type: 'progress',
              message: 'Loading document formatting rules',
              detail: '',
              timestamp: new Date(),
            });
            progressSent = true;
            
            return mockService.exportToBuffer();
          }),
        };
      });

      (mockEvent.sender!.isDestroyed as jest.Mock).mockReturnValue(true);

      const generateHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === PDF_CHANNELS.GENERATE
      )[1];

      await generateHandler(mockEvent, {
        requestId: 'test-123',
        content: '# Test',
        documentType: 'nda-ip-specific',
        documentId: 'doc-1',
      });

      // Progress was attempted but should not have been sent to destroyed window
      expect(progressSent).toBe(true);
      expect(mockEvent.sender?.send).not.toHaveBeenCalledWith(
        PDF_CHANNELS.PROGRESS,
        expect.anything()
      );
    });
  });
}); 