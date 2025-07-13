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

/**
 * Validates and sanitizes IPC requests for security
 */
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
    _event: IpcMainInvokeEvent,
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
    _event: IpcMainInvokeEvent,
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
    _event: IpcMainInvokeEvent,
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
    _event: IpcMainInvokeEvent,
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
        top: Math.min(Math.max(options.margins.top || 0, 0), 200),
        bottom: Math.min(Math.max(options.margins.bottom || 0, 0), 200),
        left: Math.min(Math.max(options.margins.left || 0, 0), 200),
        right: Math.min(Math.max(options.margins.right || 0, 0), 200),
      };
    }
    
    if (typeof options.includeMetadata === 'boolean') {
      sanitized.includeMetadata = options.includeMetadata;
    }
    
    if (typeof options.validateSignatures === 'boolean') {
      sanitized.validateSignatures = options.validateSignatures;
    }
    
    if (options.watermark) {
      sanitized.watermark = this.sanitizeString(String(options.watermark)).substring(0, 100);
    }
    
    return sanitized;
  }
  
  private sanitizeExportOptions(options: any): any {
    const sanitized: any = {};
    
    if (options.defaultFileName) {
      sanitized.defaultFileName = this.sanitizeString(String(options.defaultFileName))
        .substring(0, 255);
    }
    
    if (options.format) {
      sanitized.format = options.format;
    }
    
    if (options.metadata) {
      sanitized.metadata = {} as any;
      
      if (options.metadata.title) {
        sanitized.metadata.title = this.sanitizeString(String(options.metadata.title)).substring(0, 255);
      }
      
      if (options.metadata.author) {
        sanitized.metadata.author = this.sanitizeString(String(options.metadata.author)).substring(0, 255);
      }
      
      if (options.metadata.subject) {
        sanitized.metadata.subject = this.sanitizeString(String(options.metadata.subject)).substring(0, 255);
      }
      
      if (Array.isArray(options.metadata.keywords)) {
        sanitized.metadata.keywords = options.metadata.keywords
          .slice(0, 20) // Max 20 keywords
          .map((k: any) => this.sanitizeString(String(k)).substring(0, 50));
      }
    }
    
    return sanitized;
  }
} 