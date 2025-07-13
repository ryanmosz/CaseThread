import { dialog, ipcMain } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PDFExportHandler } from '../../../../src/electron/main/ipc/pdf-export-handler';
import { PDFExportRequest, PDFErrorCode } from '../../../../src/types/pdf-ipc';

// Mock electron modules
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
  },
  dialog: {
    showSaveDialog: jest.fn(),
  },
  app: {
    getPath: jest.fn(() => '/mock/documents'),
  },
  BrowserWindow: {
    fromWebContents: jest.fn(() => ({ id: 1 })),
    fromId: jest.fn(() => ({ id: 1 })),
  },
}));

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
  },
}));

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
  validatePDFExportRequest: jest.fn(),
};

jest.mock('../../../../src/electron/main/ipc/security-validator', () => ({
  SecurityValidator: {
    getInstance: () => mockSecurityValidator,
  },
}));

describe('PDFExportHandler', () => {
  let mockEvent: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear singleton instance
    (PDFExportHandler as any).instance = null;
    
    mockEvent = {
      sender: {
        getOwnerBrowserWindow: jest.fn(() => ({ id: 1 })),
      },
    };
    
    // Setup security validator mock
    mockSecurityValidator.validatePDFExportRequest.mockImplementation((_event, request) => {
      // Simulate validation logic
      if (!request.requestId || request.requestId === '') {
        return { valid: false, error: 'Invalid request ID' };
      }
      if (!request.buffer || request.buffer.length === 0) {
        return { valid: false, error: 'Invalid buffer' };
      }
      if (request.buffer.length > 100 * 1024 * 1024) {
        return { valid: false, error: 'Invalid buffer' };
      }
      if (request.options?.format && !['pdf', 'pdf/a'].includes(request.options.format)) {
        return { valid: false, error: 'Invalid export options' };
      }
      return { valid: true, sanitized: request };
    });
    
    // Create handler instance - this will register IPC handlers
    PDFExportHandler.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PDFExportHandler.getInstance();
      const instance2 = PDFExportHandler.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Export with Dialog', () => {
    const validRequest: PDFExportRequest = {
      requestId: 'test-123',
      buffer: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]), // %PDF-
      documentType: 'patent-assignment-agreement' as any,
      options: {
        defaultFileName: 'test-document.pdf',
      },
    };

    it('should export PDF successfully', async () => {
      (dialog.showSaveDialog as jest.Mock).mockResolvedValue({
        canceled: false,
        filePath: '/test/path/document.pdf',
      });
      
      (fs.stat as jest.Mock).mockResolvedValue({ size: 5 });
      
      const handleExport = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'pdf:export')[1];
      
      const result = await handleExport(mockEvent, validRequest);
      
      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/test/path/document.pdf');
      expect(result.fileName).toBe('document.pdf');
      expect(result.fileSize).toBe(5);
    });

    it('should handle dialog cancellation', async () => {
      (dialog.showSaveDialog as jest.Mock).mockResolvedValue({
        canceled: true,
      });
      
      const handleExport = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'pdf:export')[1];
      
      const result = await handleExport(mockEvent, validRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(PDFErrorCode.CANCELLED);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should validate request', async () => {
      const invalidRequest = {
        ...validRequest,
        buffer: new Uint8Array(0), // Empty buffer
      };
      
      const handleExport = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'pdf:export')[1];
      
      await expect(handleExport(mockEvent, invalidRequest)).rejects.toMatchObject({
        message: 'Invalid buffer',
        code: 'IPC_ERROR',
      });
    });

    it('should sanitize filename', async () => {
      const requestWithBadName = {
        ...validRequest,
        options: {
          defaultFileName: 'test<>:"/\\|?*.pdf',
        },
      };
      
      (dialog.showSaveDialog as jest.Mock).mockResolvedValue({
        canceled: false,
        filePath: '/test/path/test.pdf',
      });
      
      const handleExport = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'pdf:export')[1];
      
      await handleExport(mockEvent, requestWithBadName);
      
      const dialogCall = (dialog.showSaveDialog as jest.Mock).mock.calls[0][0];
      // After sanitization, all special chars are replaced with -
      expect(dialogCall.defaultPath).toContain('test---------.pdf');
    });
  });

  describe('Silent Export', () => {
    const validRequest: PDFExportRequest = {
      requestId: 'test-123',
      buffer: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]), // %PDF-
      documentType: 'patent-assignment-agreement' as any,
      filePath: '/test/path/document.pdf',
    };

    it('should export PDF silently', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({ size: 5 });
      
      const handleSilentExport = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'pdf:export-silent')[1];
      
      const result = await handleSilentExport(mockEvent, validRequest);
      
      expect(result.success).toBe(true);
      expect(result.filePath).toBe(path.resolve('/test/path/document.pdf'));
      expect(fs.mkdir).toHaveBeenCalledWith(
        path.dirname(path.resolve('/test/path/document.pdf')),
        { recursive: true }
      );
    });

    it('should require filePath for silent export', async () => {
      const requestWithoutPath = {
        ...validRequest,
        filePath: undefined,
      };
      
      const handleSilentExport = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'pdf:export-silent')[1];
      
      const result = await handleSilentExport(mockEvent, requestWithoutPath);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('File path is required');
    });
  });

  describe('File System Errors', () => {
    const validRequest: PDFExportRequest = {
      requestId: 'test-123',
      buffer: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]), // %PDF-
      documentType: 'patent-assignment-agreement' as any,
      filePath: '/test/path/document.pdf',
    };

    it('should handle permission denied error', async () => {
      const error = new Error('Permission denied');
      (error as any).code = 'EACCES';
      (fs.writeFile as jest.Mock).mockRejectedValue(error);
      
      const handleSilentExport = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'pdf:export-silent')[1];
      
      const result = await handleSilentExport(mockEvent, validRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(PDFErrorCode.PERMISSION_DENIED);
    });

    it('should handle disk full error', async () => {
      const error = new Error('No space left on device');
      (error as any).code = 'ENOSPC';
      (fs.writeFile as jest.Mock).mockRejectedValue(error);
      
      const handleSilentExport = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'pdf:export-silent')[1];
      
      const result = await handleSilentExport(mockEvent, validRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(PDFErrorCode.DISK_FULL);
    });

    it('should handle invalid path error', async () => {
      const error = new Error('Not a directory');
      (error as any).code = 'ENOTDIR';
      (fs.writeFile as jest.Mock).mockRejectedValue(error);
      
      const handleSilentExport = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'pdf:export-silent')[1];
      
      const result = await handleSilentExport(mockEvent, validRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(PDFErrorCode.INVALID_PATH);
    });
  });

  describe('PDF Validation', () => {
    it('should reject invalid PDF buffer', async () => {
      const invalidPdfRequest: PDFExportRequest = {
        requestId: 'test-123',
        buffer: new Uint8Array([0x00, 0x01, 0x02, 0x03]), // Not a PDF
        documentType: 'patent-assignment-agreement' as any,
        filePath: '/test/path/document.pdf',
      };
      
      const handleSilentExport = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'pdf:export-silent')[1];
      
      const result = await handleSilentExport(mockEvent, invalidPdfRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid PDF data');
    });

    it('should validate file size after write', async () => {
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.stat as jest.Mock).mockResolvedValue({ size: 10 }); // Different size
      
      const validRequest: PDFExportRequest = {
        requestId: 'test-123',
        buffer: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]), // %PDF-
        documentType: 'patent-assignment-agreement' as any,
        filePath: '/test/path/document.pdf',
      };
      
      const handleSilentExport = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'pdf:export-silent')[1];
      
      const result = await handleSilentExport(mockEvent, validRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('File size mismatch after write');
    });
  });

  describe('Request Validation', () => {
    const baseRequest: PDFExportRequest = {
      requestId: 'test-123',
      buffer: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]), // %PDF-
      documentType: 'patent-assignment-agreement' as any,
    };

    it('should reject request without requestId', async () => {
      const invalidRequest = { ...baseRequest };
      delete (invalidRequest as any).requestId;
      
      const handleExport = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'pdf:export')[1];
      
      await expect(handleExport(mockEvent, invalidRequest)).rejects.toMatchObject({
        message: 'Invalid request ID',
        code: 'IPC_ERROR',
      });
    });

    it('should reject buffer exceeding size limit', async () => {
      const oversizedRequest = {
        ...baseRequest,
        buffer: new Uint8Array(101 * 1024 * 1024), // 101MB
      };
      
      const handleExport = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'pdf:export')[1];
      
      await expect(handleExport(mockEvent, oversizedRequest)).rejects.toMatchObject({
        message: 'Invalid buffer',
        code: 'IPC_ERROR',
      });
    });

    it('should reject invalid export format', async () => {
      const invalidFormatRequest = {
        ...baseRequest,
        options: {
          format: 'invalid' as any,
        },
      };
      
      const handleExport = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'pdf:export')[1];
      
      await expect(handleExport(mockEvent, invalidFormatRequest)).rejects.toMatchObject({
        message: 'Invalid export options',
        code: 'IPC_ERROR',
      });
    });
  });
}); 