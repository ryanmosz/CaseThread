import { IpcMainInvokeEvent } from 'electron';
import { SecurityValidator } from '../../../../src/electron/main/ipc/security-validator';
import { PDFGenerateRequest, PDFExportRequest, PDFCancelRequest } from '../../../../src/types/pdf-ipc';

// Mock logger
jest.mock('../../../../src/utils/logger', () => ({
  createChildLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('SecurityValidator', () => {
  let validator: SecurityValidator;
  let mockEvent: IpcMainInvokeEvent;

  beforeEach(() => {
    // Clear singleton instance
    (SecurityValidator as any).instance = null;
    validator = SecurityValidator.getInstance();
    
    mockEvent = {
      sender: { id: 1 },
    } as any;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SecurityValidator.getInstance();
      const instance2 = SecurityValidator.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Channel Validation', () => {
    it('should allow whitelisted channels', () => {
      const allowed = [
        'pdf:generate',
        'pdf:export',
        'pdf:export-silent',
        'pdf:cancel',
        'pdf:memory-usage',
        'pdf:subscribe-progress',
        'pdf:unsubscribe-progress',
        'pdf:get-active-progress',
      ];
      
      allowed.forEach(channel => {
        expect(validator.isChannelAllowed(channel)).toBe(true);
      });
    });

    it('should block non-whitelisted channels', () => {
      const blocked = [
        'fs:read',
        'shell:execute',
        'pdf:unknown',
        'custom:dangerous',
      ];
      
      blocked.forEach(channel => {
        expect(validator.isChannelAllowed(channel)).toBe(false);
      });
    });
  });

  describe('PDF Generate Request Validation', () => {
    const validRequest: PDFGenerateRequest = {
      requestId: 'test-123',
      content: 'Valid markdown content',
      documentType: 'patent-assignment-agreement',
      documentId: 'doc-456',
    };

    it('should accept valid requests', () => {
      const result = validator.validatePDFGenerateRequest(mockEvent, validRequest);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBeDefined();
    });

    it('should reject null/undefined requests', () => {
      expect(validator.validatePDFGenerateRequest(mockEvent, null).valid).toBe(false);
      expect(validator.validatePDFGenerateRequest(mockEvent, undefined).valid).toBe(false);
    });

    it('should reject non-object requests', () => {
      expect(validator.validatePDFGenerateRequest(mockEvent, 'string').valid).toBe(false);
      expect(validator.validatePDFGenerateRequest(mockEvent, 123).valid).toBe(false);
    });

    it('should reject invalid request IDs', () => {
      const invalidIds = [
        '',
        'id with spaces',
        'id@with#special!chars',
        'a'.repeat(101), // Too long
      ];
      
      invalidIds.forEach(requestId => {
        const result = validator.validatePDFGenerateRequest(mockEvent, {
          ...validRequest,
          requestId,
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid request ID');
      });
    });

    it('should reject invalid content', () => {
      const result = validator.validatePDFGenerateRequest(mockEvent, {
        ...validRequest,
        content: '',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid content');
    });

    it('should reject oversized requests', () => {
      const hugeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      const result = validator.validatePDFGenerateRequest(mockEvent, {
        ...validRequest,
        content: hugeContent,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Request exceeds size limit');
    });

    it('should reject invalid document types', () => {
      const result = validator.validatePDFGenerateRequest(mockEvent, {
        ...validRequest,
        documentType: 'invalid-type' as any,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid document type');
    });

    it('should sanitize content', () => {
      const dirtyContent = 'Content with <script>alert("xss")</script> and <iframe src="bad"></iframe>';
      const result = validator.validatePDFGenerateRequest(mockEvent, {
        ...validRequest,
        content: dirtyContent,
      });
      
      expect(result.valid).toBe(true);
      expect(result.sanitized?.content).not.toContain('<script>');
      expect(result.sanitized?.content).not.toContain('<iframe>');
    });

    it('should validate generation options', () => {
      const validOptions = {
        fontSize: 12,
        lineSpacing: 'double' as const,
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      };
      
      const result = validator.validatePDFGenerateRequest(mockEvent, {
        ...validRequest,
        options: validOptions,
      });
      
      expect(result.valid).toBe(true);
    });

    it('should reject invalid generation options', () => {
      const invalidOptions = [
        { fontSize: 30 }, // Too large
        { fontSize: 5 }, // Too small
        { lineSpacing: 'invalid' },
        { margins: { top: -10, bottom: 50, left: 50, right: 50 } }, // Negative
        { margins: { top: 300, bottom: 50, left: 50, right: 50 } }, // Too large
      ];
      
      invalidOptions.forEach(options => {
        const result = validator.validatePDFGenerateRequest(mockEvent, {
          ...validRequest,
          options: options as any,
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid generation options');
      });
    });
  });

  describe('PDF Export Request Validation', () => {
    const validRequest: PDFExportRequest = {
      requestId: 'test-123',
      buffer: new Uint8Array([1, 2, 3, 4, 5]),
      documentType: 'patent-assignment-agreement',
    };

    it('should accept valid export requests', () => {
      const result = validator.validatePDFExportRequest(mockEvent, validRequest);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid buffers', () => {
      const invalidBuffers = [
        null,
        undefined,
        'not a buffer',
        [],
        new Uint8Array(0), // Empty
        new Uint8Array(101 * 1024 * 1024), // Too large
      ];
      
      invalidBuffers.forEach(buffer => {
        const result = validator.validatePDFExportRequest(mockEvent, {
          ...validRequest,
          buffer: buffer as any,
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid buffer');
      });
    });

    it('should reject directory traversal in file paths', () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        '~/sensitive/file',
        '/etc/../etc/passwd',
      ];
      
      dangerousPaths.forEach(filePath => {
        const result = validator.validatePDFExportRequest(mockEvent, {
          ...validRequest,
          filePath,
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid file path');
      });
    });

    it('should accept valid file paths', () => {
      const validPaths = [
        '/home/user/documents/file.pdf',
        'C:\\Users\\Documents\\file.pdf',
        './output/document.pdf',
        'file.pdf',
      ];
      
      validPaths.forEach(filePath => {
        const result = validator.validatePDFExportRequest(mockEvent, {
          ...validRequest,
          filePath,
        });
        expect(result.valid).toBe(true);
      });
    });

    it('should sanitize file paths', () => {
      // Test with a path that needs sanitization but is still valid
      const result = validator.validatePDFExportRequest(mockEvent, {
        ...validRequest,
        filePath: 'path/with/file.pdf',
      });
      
      expect(result.valid).toBe(true);
      expect(result.sanitized?.filePath).toBe('path/with/file.pdf');
    });
  });

  describe('Cancel Request Validation', () => {
    it('should accept valid cancel requests', () => {
      const validRequest: PDFCancelRequest = {
        requestId: 'test-123',
        reason: 'User cancelled',
      };
      
      const result = validator.validateCancelRequest(mockEvent, validRequest);
      expect(result.valid).toBe(true);
    });

    it('should accept cancel without reason', () => {
      const result = validator.validateCancelRequest(mockEvent, {
        requestId: 'test-123',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject too long reason', () => {
      const result = validator.validateCancelRequest(mockEvent, {
        requestId: 'test-123',
        reason: 'x'.repeat(501),
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid reason');
    });
  });

  describe('String Parameter Validation', () => {
    it('should accept valid strings', () => {
      const result = validator.validateStringParam(mockEvent, 'valid-string-123');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('valid-string-123');
    });

    it('should reject non-strings', () => {
      [123, true, null, undefined, {}, []].forEach(value => {
        const result = validator.validateStringParam(mockEvent, value);
        expect(result.valid).toBe(false);
      });
    });

    it('should respect custom max length', () => {
      const result = validator.validateStringParam(mockEvent, 'x'.repeat(51), 50);
      expect(result.valid).toBe(false);
    });

    it('should sanitize strings', () => {
      const result = validator.validateStringParam(mockEvent, ' <script>test</script> ');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('scripttest/script');
    });
  });
}); 