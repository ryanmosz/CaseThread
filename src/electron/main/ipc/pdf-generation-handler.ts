import { IpcMainInvokeEvent } from 'electron';
import { PDFServiceFactory } from '../../../services/pdf/PDFServiceFactory';
import { PDF_CHANNELS } from '../../constants/pdf-channels';
import {
  PDFGenerateRequest,
  PDFGenerateResponse,
  PDFProgressUpdate,
  PDFError,
  PDFErrorCode,
  PDFCancelRequest,
  PDFGenerationOptions,
} from '../../../types/pdf-ipc';
import { DocumentType } from '../../../types';
import { ProgressEvent } from '../../../types/progress';
import { ProgressManager } from './progress-manager';
import { SecureIPCHandler } from './secure-handler';
import { SecurityValidator } from './security-validator';

export class PDFGenerationHandler {
  private static instance: PDFGenerationHandler;
  private activeRequests = new Map<string, {
    abortController: AbortController;
    startTime: number;
    webContentsId: number;
  }>();
  private progressManager = ProgressManager.getInstance();

  static getInstance(): PDFGenerationHandler {
    if (!PDFGenerationHandler.instance) {
      PDFGenerationHandler.instance = new PDFGenerationHandler();
    }
    return PDFGenerationHandler.instance;
  }

  private constructor() {
    this.setupHandlers();
  }

  private setupHandlers(): void {
    const validator = SecurityValidator.getInstance();
    
    SecureIPCHandler.handle(
      PDF_CHANNELS.GENERATE,
      this.handleGeneratePDF.bind(this),
      (event, request) => validator.validatePDFGenerateRequest(event, request)
    );
    
    SecureIPCHandler.handle(
      PDF_CHANNELS.CANCEL,
      this.handleCancelGeneration.bind(this),
      (event, request) => validator.validateCancelRequest(event, request)
    );
    
    console.log('PDF generation IPC handlers registered with security validation');
  }

  private async handleGeneratePDF(
    event: IpcMainInvokeEvent,
    request: PDFGenerateRequest
  ): Promise<PDFGenerateResponse> {
    const startTime = Date.now();
    const abortController = new AbortController();
    const webContents = event.sender;

    try {
      // Validate request
      this.validateRequest(request);

      // Track active request
      this.activeRequests.set(request.requestId, {
        abortController,
        startTime,
        webContentsId: webContents.id,
      });

      // Create progress callback that converts ProgressEvent to our sendProgress format
      const progressCallback = (progressEvent: ProgressEvent) => {
        // Extract step and detail from the progress event
        const step = progressEvent.message;
        const detail = progressEvent.detail || '';
        this.sendProgress(event, request.requestId, step, detail, startTime);
      };

      // Create PDF service with progress callback
      const service = PDFServiceFactory.forGUI(progressCallback);

      // Generate PDF
      const result = await service.exportToBuffer(
        request.content,
        request.documentType,
        request.options
      );

      // Ensure we have a buffer
      if (!result.buffer) {
        throw new Error('PDF generation did not return a buffer');
      }

      // Send completion event
      webContents.send(PDF_CHANNELS.COMPLETE, {
        requestId: request.requestId,
        duration: Date.now() - startTime,
      });

      // Return success response
      return {
        requestId: request.requestId,
        success: true,
        data: {
          buffer: result.buffer,
          metadata: {
            pageCount: result.pageCount,
            fileSize: result.buffer.byteLength,
            documentType: request.documentType,
            generatedAt: new Date(),
            generationTime: Date.now() - startTime,
            hasSignatureBlocks: result.signatureBlockCount > 0,
            formFields: [], // TODO: Extract form fields when implemented
          },
          warnings: result.warnings,
        },
      };
    } catch (error: any) {
      // Handle cancellation
      if (error.name === 'AbortError') {
        webContents.send(PDF_CHANNELS.CANCELLED, { requestId: request.requestId });
        return {
          requestId: request.requestId,
          success: false,
          error: {
            code: PDFErrorCode.GENERATION_CANCELLED,
            message: 'PDF generation was cancelled',
            recoverable: true,
          },
        };
      }

      // Handle other errors
      const pdfError = this.createErrorResponse(error);
      webContents.send(PDF_CHANNELS.ERROR, {
        requestId: request.requestId,
        error: pdfError,
      });

      return {
        requestId: request.requestId,
        success: false,
        error: pdfError,
      };
    } finally {
      // Cleanup
      this.activeRequests.delete(request.requestId);
      this.progressManager.unsubscribe(request.requestId);
    }
  }

  private async handleCancelGeneration(
    _event: IpcMainInvokeEvent,
    request: PDFCancelRequest
  ): Promise<void> {
    const activeRequest = this.activeRequests.get(request.requestId);
    if (activeRequest) {
      activeRequest.abortController.abort();
      this.activeRequests.delete(request.requestId);
    }
  }

  private sendProgress(
    event: IpcMainInvokeEvent,
    requestId: string,
    step: string,
    detail: string | undefined,
    startTime: number
  ): void {
    // Window state is checked by ProgressManager
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
    
    // Also send directly to the event sender for backward compatibility
    if (!event.sender.isDestroyed()) {
      event.sender.send(PDF_CHANNELS.PROGRESS, progress);
    }
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
      'Rendering page': 80, // This may be called multiple times
      'Finalizing PDF document': 95,
      'PDF export completed': 100,
    };

    // Handle "Rendering page X of Y" format
    if (step.startsWith('Rendering page')) {
      return 80;
    }

    return progressMap[step] || 0;
  }

  private estimateTimeRemaining(
    requestId: string,
    currentStep: string,
    startTime: number
  ): number | undefined {
    const activeRequest = this.activeRequests.get(requestId);
    if (!activeRequest) return undefined;

    const elapsed = Date.now() - startTime;
    const percentage = this.calculatePercentage(currentStep);

    if (percentage === 0 || percentage === 100) return undefined;

    const totalEstimate = (elapsed / percentage) * 100;
    const remaining = totalEstimate - elapsed;

    return Math.max(0, Math.round(remaining / 1000)); // Return seconds
  }

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

    const validTypes: DocumentType[] = [
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

  private validateOptions(options: PDFGenerationOptions): void {
    if (options.fontSize !== undefined) {
      if (options.fontSize < 8 || options.fontSize > 24) {
        throw new Error('Font size must be between 8 and 24');
      }
    }

    if (options.lineSpacing !== undefined) {
      if (!['single', 'one-half', 'double'].includes(options.lineSpacing)) {
        throw new Error('Invalid line spacing. Must be single, one-half, or double');
      }
    }

    if (options.margins) {
      const { top, bottom, left, right } = options.margins;
      if ([top, bottom, left, right].some(m => m < 0 || m > 200)) {
        throw new Error('Margins must be between 0 and 200 points');
      }
    }
  }

  private createErrorResponse(error: any): PDFError {
    let code = PDFErrorCode.GENERATION_FAILED;
    let message = 'An error occurred during PDF generation';
    let recoverable = true;
    let suggestion: string | undefined;

    if (error.name === 'AbortError') {
      code = PDFErrorCode.GENERATION_CANCELLED;
      message = 'PDF generation was cancelled';
    } else if (error.code === 'ENOENT') {
      code = PDFErrorCode.TEMPLATE_NOT_FOUND;
      message = 'Document template not found';
      recoverable = false;
      suggestion = 'Ensure all template files are properly installed';
    } else if (error.message?.includes('Invalid signature block')) {
      code = PDFErrorCode.INVALID_DOCUMENT;
      message = error.message;
      suggestion = 'Check the signature block format in your document';
    } else if (error.message?.includes('memory')) {
      code = PDFErrorCode.MEMORY_LIMIT;
      message = 'Insufficient memory to generate PDF';
      suggestion = 'Try closing other applications or generating a smaller document';
    } else if (error.message) {
      message = error.message;
    }

    // Log error in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('PDF generation error:', error);
    }

    return {
      code,
      message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      recoverable,
      suggestion,
    };
  }

  /**
   * Cleanup all active requests
   */
  cleanup(): void {
    // Cancel all active requests
    this.activeRequests.forEach((request, requestId) => {
      console.log(`Cancelling active PDF generation: ${requestId}`);
      request.abortController.abort();
      this.progressManager.unsubscribe(requestId);
    });
    this.activeRequests.clear();
  }

  /**
   * Get statistics about active requests
   */
  getStats(): {
    activeCount: number;
    requestIds: string[];
  } {
    return {
      activeCount: this.activeRequests.size,
      requestIds: Array.from(this.activeRequests.keys()),
    };
  }
} 