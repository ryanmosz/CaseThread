import { IpcMainInvokeEvent, dialog, app } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PDF_CHANNELS } from '../../constants/pdf-channels';
import {
  PDFExportRequest,
  PDFExportResponse,
  PDFError,
  PDFErrorCode,
} from '../../../types/pdf-ipc';
import { createChildLogger } from '../../../utils/logger';
import { SecureIPCHandler } from './secure-handler';
import { SecurityValidator } from './security-validator';

/**
 * Handles PDF export operations from the renderer process
 */
export class PDFExportHandler {
  private static instance: PDFExportHandler;
  private logger = createChildLogger({ service: 'PDFExportHandler' });
  
  static getInstance(): PDFExportHandler {
    if (!PDFExportHandler.instance) {
      PDFExportHandler.instance = new PDFExportHandler();
    }
    return PDFExportHandler.instance;
  }
  
  private constructor() {
    this.setupHandlers();
  }
  
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
    
    this.logger.debug('PDF export IPC handlers registered with security validation');
  }
  
  /**
   * Handle PDF export with save dialog
   */
  private async handleExport(
    _event: IpcMainInvokeEvent,
    request: PDFExportRequest
  ): Promise<PDFExportResponse> {
    try {
      this.validateExportRequest(request);
      
      // Show save dialog
      const dialogOptions = {
        title: 'Save PDF Document',
        defaultPath: this.getDefaultPath(request),
        filters: [
          { name: 'PDF Documents', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['createDirectory', 'showOverwriteConfirmation'] as any
      };
      
      const result = await dialog.showSaveDialog(dialogOptions);
      
      if (result.canceled || !result.filePath) {
        return {
          success: false,
          error: {
            code: PDFErrorCode.CANCELLED,
            message: 'Export cancelled by user',
          }
        };
      }
      
      // Write the PDF buffer to file
      await this.writePdfToFile(result.filePath, request.buffer);
      
      this.logger.info('PDF exported via dialog', {
        requestId: request.requestId,
        filePath: result.filePath,
        size: request.buffer.length,
      });
      
      return {
        success: true,
        filePath: result.filePath,
        fileName: path.basename(result.filePath),
        fileSize: request.buffer.length,
      };
      
    } catch (error) {
      return this.handleExportError(error);
    }
  }
  
  /**
   * Handle silent PDF export (without dialog)
   */
  private async handleSilentExport(
    _event: IpcMainInvokeEvent,
    request: PDFExportRequest
  ): Promise<PDFExportResponse> {
    try {
      this.validateExportRequest(request);
      
      if (!request.filePath) {
        throw new Error('File path is required for silent export');
      }
      
      // Validate the file path
      const resolvedPath = path.resolve(request.filePath);
      const directory = path.dirname(resolvedPath);
      
      // Ensure directory exists
      await fs.mkdir(directory, { recursive: true });
      
      // Write the PDF buffer to file
      await this.writePdfToFile(resolvedPath, request.buffer);
      
      this.logger.info('PDF exported silently', {
        requestId: request.requestId,
        filePath: resolvedPath,
        size: request.buffer.length,
      });
      
      return {
        success: true,
        filePath: resolvedPath,
        fileName: path.basename(resolvedPath),
        fileSize: request.buffer.length,
      };
      
    } catch (error) {
      return this.handleExportError(error);
    }
  }
  
  /**
   * Validate export request
   */
  private validateExportRequest(request: PDFExportRequest): void {
    if (!request.requestId || request.requestId.trim() === '') {
      throw new Error('Request ID is required');
    }
    
    if (!request.buffer || request.buffer.length === 0) {
      throw new Error('PDF buffer is empty');
    }
    
    if (request.buffer.length > 100 * 1024 * 1024) { // 100MB limit
      throw new Error('PDF buffer exceeds maximum size limit (100MB)');
    }
    
    if (!request.documentType) {
      throw new Error('Document type is required');
    }
    
    if (request.options?.format && !['pdf', 'pdf/a'].includes(request.options.format)) {
      throw new Error(`Invalid export format: ${request.options.format}`);
    }
  }
  
  /**
   * Get default file path for save dialog
   */
  private getDefaultPath(request: PDFExportRequest): string {
    const documentsPath = app.getPath('documents');
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const defaultName = request.options?.defaultFileName || 
                       `${request.documentType}-${date}.pdf`;
    
    // Sanitize filename
    const sanitizedName = defaultName.replace(/[<>:"/\\|?*]/g, '-');
    
    return path.join(documentsPath, sanitizedName);
  }
  
  /**
   * Write PDF buffer to file
   */
  private async writePdfToFile(filePath: string, buffer: Uint8Array): Promise<void> {
    try {
      // Convert Uint8Array to Buffer if needed
      const nodeBuffer = Buffer.from(buffer);
      
      // Validate buffer is a valid PDF
      if (!this.isValidPdfBuffer(nodeBuffer)) {
        throw new Error('Invalid PDF buffer');
      }
      
      // Write with proper permissions
      await fs.writeFile(filePath, nodeBuffer, {
        mode: 0o644, // Read/write for owner, read for others
      });
      
      // Verify file was written
      const stats = await fs.stat(filePath);
      if (stats.size !== buffer.length) {
        throw new Error('File size mismatch after write');
      }
      
    } catch (error) {
      this.logger.error('Failed to write PDF file', {
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
  
  /**
   * Check if buffer contains valid PDF data
   */
  private isValidPdfBuffer(buffer: Buffer): boolean {
    // Check PDF header
    const header = buffer.slice(0, 5).toString('ascii');
    return header === '%PDF-';
  }
  
  /**
   * Handle export errors
   */
  private handleExportError(error: any): PDFExportResponse {
    let errorCode = PDFErrorCode.EXPORT_FAILED;
    let message = 'Failed to export PDF';
    
    if (error.code === 'EACCES') {
      errorCode = PDFErrorCode.PERMISSION_DENIED;
      message = 'Permission denied to write file';
    } else if (error.code === 'ENOSPC') {
      errorCode = PDFErrorCode.DISK_FULL;
      message = 'Insufficient disk space';
    } else if (error.code === 'ENOTDIR') {
      errorCode = PDFErrorCode.INVALID_PATH;
      message = 'Invalid directory path';
    } else if (error.code === 'EISDIR') {
      errorCode = PDFErrorCode.INVALID_PATH;
      message = 'Path is a directory, not a file';
    }
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF buffer')) {
        message = 'Invalid PDF data';
      } else if (error.message.includes('exceeds maximum size')) {
        message = error.message;
      } else if (error.message.includes('PDF buffer is empty')) {
        message = error.message;
      } else if (error.message.includes('Request ID is required')) {
        message = error.message;
      } else if (error.message.includes('File path is required')) {
        message = error.message;
      } else if (error.message.includes('Invalid export format')) {
        message = error.message;
      } else if (error.message.includes('size mismatch')) {
        message = error.message;
      }
    }
    
    const pdfError: PDFError = {
      code: errorCode,
      message,
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    };
    
    this.logger.error('PDF export failed', pdfError);
    
    return {
      success: false,
      error: pdfError,
    };
  }
  
  /**
   * Cleanup handler
   */
  cleanup(): void {
    // IPC handlers are automatically cleaned up by Electron
    this.logger.info('PDFExportHandler cleaned up');
  }
} 