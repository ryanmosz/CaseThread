# Task 6.0.2.4 - Create IPC Security Validation

## Description
Implement comprehensive security validation for all IPC channels to prevent security vulnerabilities, validate data integrity, and ensure safe communication between renderer and main processes. This includes input sanitization, request validation, and permission checks.

## Implementation Steps

### 1. Create Security Validation Service
```typescript
// src/electron/main/ipc/security-validator.ts
import { IpcMainInvokeEvent } from 'electron';
import { createChildLogger } from '../../../utils/logger';
import {
  PDFGenerateRequest,
  PDFExportRequest,
  PDFCancelRequest,
} from '../../../types/pdf-ipc';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: any;
}

export class SecurityValidator {
  private static instance: SecurityValidator;
  private logger = createChildLogger({ service: 'SecurityValidator' });
  
  // Whitelisted channels that can be invoked
  private readonly allowedChannels = new Set([
    'pdf:generate',
    'pdf:export',
    'pdf:export-silent',
    'pdf:cancel',
    'pdf:memory-usage',
    'pdf:subscribe-progress',
    'pdf:unsubscribe-progress',
    'pdf:get-active-progress',
  ]);
  
  // Maximum allowed sizes
  private readonly MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_STRING_LENGTH = 10000;
  private readonly MAX_ARRAY_LENGTH = 1000;
  
  static getInstance(): SecurityValidator {
    if (!SecurityValidator.instance) {
      SecurityValidator.instance = new SecurityValidator();
    }
    return SecurityValidator.instance;
  }
  
  private constructor() {
    this.logger.debug('Security validator initialized');
  }
  
  /**
   * Validate IPC channel is allowed
   */
  isChannelAllowed(channel: string): boolean {
    const allowed = this.allowedChannels.has(channel);
    
    if (!allowed) {
      this.logger.warn('Blocked unauthorized channel access', { channel });
    }
    
    return allowed;
  }
  
  /**
   * Validate PDF generation request
   */
  validatePDFGenerateRequest(
    event: IpcMainInvokeEvent,
    request: any
  ): ValidationResult {
    try {
      // Check basic structure
      if (!request || typeof request !== 'object') {
        return { valid: false, error: 'Invalid request structure' };
      }
      
      // Validate request size
      const requestSize = JSON.stringify(request).length;
      if (requestSize > this.MAX_REQUEST_SIZE) {
        return { valid: false, error: 'Request exceeds size limit' };
      }
      
      // Validate required fields
      const { requestId, content, documentType, documentId } = request;
      
      if (!this.isValidRequestId(requestId)) {
        return { valid: false, error: 'Invalid request ID' };
      }
      
      if (!this.isValidContent(content)) {
        return { valid: false, error: 'Invalid content' };
      }
      
      if (!this.isValidDocumentType(documentType)) {
        return { valid: false, error: 'Invalid document type' };
      }
      
      if (!this.isValidDocumentId(documentId)) {
        return { valid: false, error: 'Invalid document ID' };
      }
      
      // Validate options if present
      if (request.options && !this.isValidGenerationOptions(request.options)) {
        return { valid: false, error: 'Invalid generation options' };
      }
      
      // Sanitize the request
      const sanitized: PDFGenerateRequest = {
        requestId: this.sanitizeString(requestId),
        content: this.sanitizeContent(content),
        documentType: documentType,
        documentId: this.sanitizeString(documentId),
        options: request.options ? this.sanitizeGenerationOptions(request.options) : undefined,
      };
      
      return { valid: true, sanitized };
      
    } catch (error) {
      this.logger.error('Error validating PDF generate request', error);
      return { valid: false, error: 'Validation error' };
    }
  }
  
  /**
   * Validate PDF export request
   */
  validatePDFExportRequest(
    event: IpcMainInvokeEvent,
    request: any
  ): ValidationResult {
    try {
      if (!request || typeof request !== 'object') {
        return { valid: false, error: 'Invalid request structure' };
      }
      
      const { requestId, buffer, documentType, filePath, options } = request;
      
      if (!this.isValidRequestId(requestId)) {
        return { valid: false, error: 'Invalid request ID' };
      }
      
      if (!this.isValidBuffer(buffer)) {
        return { valid: false, error: 'Invalid buffer' };
      }
      
      if (!this.isValidDocumentType(documentType)) {
        return { valid: false, error: 'Invalid document type' };
      }
      
      if (filePath && !this.isValidFilePath(filePath)) {
        return { valid: false, error: 'Invalid file path' };
      }
      
      if (options && !this.isValidExportOptions(options)) {
        return { valid: false, error: 'Invalid export options' };
      }
      
      const sanitized: PDFExportRequest = {
        requestId: this.sanitizeString(requestId),
        buffer: buffer, // Already validated
        documentType: documentType,
        filePath: filePath ? this.sanitizeFilePath(filePath) : undefined,
        options: options ? this.sanitizeExportOptions(options) : undefined,
      };
      
      return { valid: true, sanitized };
      
    } catch (error) {
      this.logger.error('Error validating PDF export request', error);
      return { valid: false, error: 'Validation error' };
    }
  }
  
  /**
   * Validate cancel request
   */
  validateCancelRequest(
    event: IpcMainInvokeEvent,
    request: any
  ): ValidationResult {
    try {
      if (!request || typeof request !== 'object') {
        return { valid: false, error: 'Invalid request structure' };
      }
      
      const { requestId, reason } = request;
      
      if (!this.isValidRequestId(requestId)) {
        return { valid: false, error: 'Invalid request ID' };
      }
      
      if (reason && !this.isValidString(reason, 500)) {
        return { valid: false, error: 'Invalid reason' };
      }
      
      const sanitized: PDFCancelRequest = {
        requestId: this.sanitizeString(requestId),
        reason: reason ? this.sanitizeString(reason) : undefined,
      };
      
      return { valid: true, sanitized };
      
    } catch (error) {
      this.logger.error('Error validating cancel request', error);
      return { valid: false, error: 'Validation error' };
    }
  }
  
  /**
   * Validate string parameter
   */
  validateStringParam(
    event: IpcMainInvokeEvent,
    param: any,
    maxLength = this.MAX_STRING_LENGTH
  ): ValidationResult {
    if (!this.isValidString(param, maxLength)) {
      return { valid: false, error: 'Invalid string parameter' };
    }
    
    return { valid: true, sanitized: this.sanitizeString(param) };
  }
  
  // Validation helpers
  private isValidRequestId(id: any): boolean {
    return typeof id === 'string' && 
           id.length > 0 && 
           id.length <= 100 &&
           /^[a-zA-Z0-9-_]+$/.test(id);
  }
  
  private isValidContent(content: any): boolean {
    return typeof content === 'string' &&
           content.length > 0 &&
           content.length <= this.MAX_REQUEST_SIZE;
  }
  
  private isValidDocumentType(type: any): boolean {
    const validTypes = [
      'provisional-patent-application',
      'patent-assignment-agreement',
      'patent-license-agreement',
      'trademark-application',
      'cease-and-desist-letter',
      'nda-ip-specific',
      'office-action-response',
      'technology-transfer-agreement',
    ];
    
    return typeof type === 'string' && validTypes.includes(type);
  }
  
  private isValidDocumentId(id: any): boolean {
    return typeof id === 'string' &&
           id.length > 0 &&
           id.length <= 100;
  }
  
  private isValidBuffer(buffer: any): boolean {
    return buffer instanceof Uint8Array &&
           buffer.length > 0 &&
           buffer.length <= 100 * 1024 * 1024; // 100MB max
  }
  
  private isValidFilePath(path: any): boolean {
    if (typeof path !== 'string' || path.length === 0) {
      return false;
    }
    
    // Prevent directory traversal
    if (path.includes('..') || path.includes('~')) {
      return false;
    }
    
    // Check for valid path characters
    const validPathRegex = /^[a-zA-Z0-9\s\-_./\\:]+$/;
    return validPathRegex.test(path);
  }
  
  private isValidString(str: any, maxLength: number): boolean {
    return typeof str === 'string' &&
           str.length <= maxLength;
  }
  
  private isValidGenerationOptions(options: any): boolean {
    if (typeof options !== 'object' || options === null) {
      return false;
    }
    
    // Validate specific option fields
    if (options.fontSize && (
      typeof options.fontSize !== 'number' ||
      options.fontSize < 8 ||
      options.fontSize > 24
    )) {
      return false;
    }
    
    if (options.lineSpacing && ![
      'single', 'one-half', 'double'
    ].includes(options.lineSpacing)) {
      return false;
    }
    
    if (options.margins && !this.isValidMargins(options.margins)) {
      return false;
    }
    
    return true;
  }
  
  private isValidMargins(margins: any): boolean {
    if (typeof margins !== 'object' || margins === null) {
      return false;
    }
    
    const { top, bottom, left, right } = margins;
    return [top, bottom, left, right].every(
      m => typeof m === 'number' && m >= 0 && m <= 200
    );
  }
  
  private isValidExportOptions(options: any): boolean {
    if (typeof options !== 'object' || options === null) {
      return false;
    }
    
    if (options.defaultFileName && 
        !this.isValidString(options.defaultFileName, 255)) {
      return false;
    }
    
    if (options.format && !['pdf', 'pdf/a'].includes(options.format)) {
      return false;
    }
    
    return true;
  }
  
  // Sanitization helpers
  private sanitizeString(str: string): string {
    return str.trim().replace(/[<>]/g, '');
  }
  
  private sanitizeContent(content: string): string {
    // Remove any potential script tags or dangerous content
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  }
  
  private sanitizeFilePath(path: string): string {
    // Remove any directory traversal attempts
    return path.replace(/\.\./g, '').replace(/~/g, '');
  }
  
  private sanitizeGenerationOptions(options: any): any {
    const sanitized: any = {};
    
    if (options.fontSize) {
      sanitized.fontSize = Math.min(Math.max(options.fontSize, 8), 24);
    }
    
    if (options.lineSpacing) {
      sanitized.lineSpacing = options.lineSpacing;
    }
    
    if (options.margins) {
      sanitized.margins = {
        top: Math.min(Math.max(options.margins.top, 0), 200),
        bottom: Math.min(Math.max(options.margins.bottom, 0), 200),
        left: Math.min(Math.max(options.margins.left, 0), 200),
        right: Math.min(Math.max(options.margins.right, 0), 200),
      };
    }
    
    if (typeof options.includeMetadata === 'boolean') {
      sanitized.includeMetadata = options.includeMetadata;
    }
    
    if (typeof options.validateSignatures === 'boolean') {
      sanitized.validateSignatures = options.validateSignatures;
    }
    
    if (options.watermark) {
      sanitized.watermark = this.sanitizeString(options.watermark).substring(0, 100);
    }
    
    return sanitized;
  }
  
  private sanitizeExportOptions(options: any): any {
    const sanitized: any = {};
    
    if (options.defaultFileName) {
      sanitized.defaultFileName = this.sanitizeString(options.defaultFileName)
        .substring(0, 255);
    }
    
    if (options.format) {
      sanitized.format = options.format;
    }
    
    if (options.metadata) {
      sanitized.metadata = {
        title: options.metadata.title ? 
          this.sanitizeString(options.metadata.title).substring(0, 255) : undefined,
        author: options.metadata.author ?
          this.sanitizeString(options.metadata.author).substring(0, 255) : undefined,
        subject: options.metadata.subject ?
          this.sanitizeString(options.metadata.subject).substring(0, 255) : undefined,
        keywords: Array.isArray(options.metadata.keywords) ?
          options.metadata.keywords
            .slice(0, 20) // Max 20 keywords
            .map(k => this.sanitizeString(String(k)).substring(0, 50)) : undefined,
      };
    }
    
    return sanitized;
  }
}
```

### 2. Create Secure IPC Handler Wrapper
```typescript
// src/electron/main/ipc/secure-handler.ts
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { SecurityValidator } from './security-validator';
import { createChildLogger } from '../../../utils/logger';

export type HandlerFunction = (
  event: IpcMainInvokeEvent,
  ...args: any[]
) => Promise<any>;

export class SecureIPCHandler {
  private static validator = SecurityValidator.getInstance();
  private static logger = createChildLogger({ service: 'SecureIPCHandler' });
  
  /**
   * Register a secure IPC handler with validation
   */
  static handle(
    channel: string,
    handler: HandlerFunction,
    validator?: (event: IpcMainInvokeEvent, ...args: any[]) => any
  ): void {
    ipcMain.handle(channel, async (event, ...args) => {
      try {
        // Check if channel is allowed
        if (!this.validator.isChannelAllowed(channel)) {
          throw new Error('Unauthorized channel access');
        }
        
        // Rate limiting check
        if (!this.checkRateLimit(event, channel)) {
          throw new Error('Rate limit exceeded');
        }
        
        // Custom validation if provided
        if (validator) {
          const validation = validator(event, ...args);
          if (!validation.valid) {
            throw new Error(validation.error || 'Validation failed');
          }
          
          // Use sanitized args if provided
          if (validation.sanitized) {
            args = [validation.sanitized];
          }
        }
        
        // Log the request
        this.logger.debug('Handling secure IPC request', {
          channel,
          webContentsId: event.sender.id,
        });
        
        // Call the actual handler
        return await handler(event, ...args);
        
      } catch (error) {
        this.logger.error('Secure IPC handler error', {
          channel,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        throw error;
      }
    });
  }
  
  /**
   * Basic rate limiting
   */
  private static rateLimitMap = new Map<string, number[]>();
  private static readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private static readonly RATE_LIMIT_MAX = 100; // Max requests per window
  
  private static checkRateLimit(
    event: IpcMainInvokeEvent,
    channel: string
  ): boolean {
    const key = `${event.sender.id}-${channel}`;
    const now = Date.now();
    
    // Get or create request timestamps
    let timestamps = this.rateLimitMap.get(key) || [];
    
    // Remove old timestamps
    timestamps = timestamps.filter(t => now - t < this.RATE_LIMIT_WINDOW);
    
    // Check if limit exceeded
    if (timestamps.length >= this.RATE_LIMIT_MAX) {
      return false;
    }
    
    // Add current timestamp
    timestamps.push(now);
    this.rateLimitMap.set(key, timestamps);
    
    return true;
  }
  
  /**
   * Clean up rate limit data periodically
   */
  private static cleanupInterval = setInterval(() => {
    const now = Date.now();
    
    for (const [key, timestamps] of this.rateLimitMap.entries()) {
      const filtered = timestamps.filter(
        t => now - t < this.RATE_LIMIT_WINDOW
      );
      
      if (filtered.length === 0) {
        this.rateLimitMap.delete(key);
      } else {
        this.rateLimitMap.set(key, filtered);
      }
    }
  }, 60000); // Clean up every minute
  
  /**
   * Cleanup handler
   */
  static cleanup(): void {
    clearInterval(this.cleanupInterval);
    this.rateLimitMap.clear();
  }
}
```

### 3. Update Existing IPC Handlers
```typescript
// Update src/electron/main/ipc/pdf-generation-handler.ts
import { SecureIPCHandler } from './secure-handler';
import { SecurityValidator } from './security-validator';

// In setupHandlers method:
private setupHandlers(): void {
  const validator = SecurityValidator.getInstance();
  
  SecureIPCHandler.handle(
    PDF_CHANNELS.GENERATE,
    this.handleGenerate.bind(this),
    (event, request) => validator.validatePDFGenerateRequest(event, request)
  );
  
  SecureIPCHandler.handle(
    PDF_CHANNELS.CANCEL,
    this.handleCancel.bind(this),
    (event, request) => validator.validateCancelRequest(event, request)
  );
}

// Update src/electron/main/ipc/pdf-export-handler.ts
private setupHandlers(): void {
  const validator = SecurityValidator.getInstance();
  
  SecureIPCHandler.handle(
    PDF_CHANNELS.EXPORT,
    this.handleExport.bind(this),
    (event, request) => validator.validatePDFExportRequest(event, request)
  );
  
  SecureIPCHandler.handle(
    PDF_CHANNELS.EXPORT_SILENT,
    this.handleSilentExport.bind(this),
    (event, request) => validator.validatePDFExportRequest(event, request)
  );
}

// Update src/electron/main/ipc/progress-handlers.ts
private setupHandlers(): void {
  const validator = SecurityValidator.getInstance();
  
  SecureIPCHandler.handle(
    PDF_CHANNELS.SUBSCRIBE_PROGRESS,
    this.handleSubscribe.bind(this),
    (event, requestId) => validator.validateStringParam(event, requestId)
  );
  
  SecureIPCHandler.handle(
    PDF_CHANNELS.UNSUBSCRIBE_PROGRESS,
    this.handleUnsubscribe.bind(this),
    (event, requestId) => validator.validateStringParam(event, requestId)
  );
}
```

### 4. Add Content Security Policy
```typescript
// src/electron/main/security-config.ts
import { BrowserWindow, session } from 'electron';

export function setupContentSecurityPolicy(window: BrowserWindow): void {
  // Set strict CSP headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self'",
          "connect-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
        ].join('; ')
      }
    });
  });
}

// Add to window creation in main/index.ts
private async createMainWindow(): Promise<void> {
  this.mainWindow = new BrowserWindow({
    // ... existing config
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      // ... other settings
    }
  });
  
  setupContentSecurityPolicy(this.mainWindow);
}
```

## Code Examples

### Using Secure Handlers
```typescript
// Example of secure PDF generation
const handleGenerate = async (event, request) => {
  // Request is already validated and sanitized
  const { requestId, content, documentType } = request;
  
  // Process safely...
};

// Example of adding custom validation
SecureIPCHandler.handle(
  'custom:channel',
  handleCustom,
  (event, data) => {
    if (!data.customField || data.customField.length > 100) {
      return { valid: false, error: 'Invalid custom field' };
    }
    return { valid: true };
  }
);
```

## Testing Approach

### Unit Tests
```typescript
// __tests__/electron/main/ipc/security-validator.test.ts
describe('SecurityValidator', () => {
  describe('validatePDFGenerateRequest', () => {
    it('should accept valid requests', () => {
      // Test valid request
    });
    
    it('should reject invalid request ID', () => {
      // Test various invalid IDs
    });
    
    it('should reject oversized requests', () => {
      // Test size limits
    });
    
    it('should sanitize content', () => {
      // Test script tag removal
    });
  });
  
  describe('validatePDFExportRequest', () => {
    it('should reject directory traversal', () => {
      // Test path validation
    });
  });
});

// __tests__/electron/main/ipc/secure-handler.test.ts
describe('SecureIPCHandler', () => {
  it('should enforce rate limiting', async () => {
    // Test rate limit enforcement
  });
  
  it('should block unauthorized channels', async () => {
    // Test channel whitelist
  });
});
```

## Definition of Done

- [ ] SecurityValidator class implemented
- [ ] SecureIPCHandler wrapper created
- [ ] All existing IPC handlers updated
- [ ] Content Security Policy configured
- [ ] Rate limiting implemented
- [ ] Input validation for all request types
- [ ] Path traversal prevention
- [ ] Script injection prevention
- [ ] Unit tests for security validation
- [ ] Integration tests for secure handlers

## Security Considerations

1. **Input Validation**: All inputs from renderer process must be validated
2. **Path Security**: Prevent directory traversal attacks
3. **Content Sanitization**: Remove potentially dangerous content
4. **Rate Limiting**: Prevent DoS attacks
5. **Channel Whitelisting**: Only allow specific IPC channels
6. **CSP Headers**: Strict content security policy
7. **Error Handling**: Don't leak sensitive information in errors

## Common Pitfalls

1. **Trusting Renderer Input**: Never trust data from renderer process
2. **Path Validation**: Always validate and sanitize file paths
3. **Size Limits**: Enforce limits to prevent memory exhaustion
4. **Rate Limiting**: Consider per-channel and global limits
5. **Error Messages**: Avoid exposing internal details

## Notes

- Security validation should be transparent to handlers
- Performance impact should be minimal
- Consider adding metrics/monitoring for security events
- Plan for security audit and penetration testing
- Document security assumptions and threats 