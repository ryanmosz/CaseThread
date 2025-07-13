# Task 6.0.7.1: Implement PDF Generation Error Handling

## Overview
This task implements comprehensive error handling for PDF generation, ensuring graceful failure recovery, proper error reporting, and maintaining application stability during failures.

## Current State Analysis

### Current Issues
1. Errors show as "[object Object]" in UI
2. No error recovery mechanisms
3. Limited error context for debugging
4. No differentiation between error types
5. Memory leaks on generation failure

### Error Categories
1. **Input Errors**: Invalid content, missing data
2. **Processing Errors**: Template parsing, formatting failures
3. **Resource Errors**: Memory limits, disk space
4. **Network Errors**: API timeouts, connection issues
5. **System Errors**: Unexpected crashes, permission issues

## Implementation Plan

### 1. Create Error Classification System (Priority: High)

**File**: Create `src/electron/renderer/src/services/PDFErrorClassifier.ts`

```typescript
export enum PDFErrorType {
  INPUT_VALIDATION = 'INPUT_VALIDATION',
  TEMPLATE_PARSING = 'TEMPLATE_PARSING',
  CONTENT_FORMATTING = 'CONTENT_FORMATTING',
  MEMORY_LIMIT = 'MEMORY_LIMIT',
  DISK_SPACE = 'DISK_SPACE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  GENERATION_CANCELLED = 'GENERATION_CANCELLED',
  UNKNOWN = 'UNKNOWN',
}

export interface ClassifiedError {
  type: PDFErrorType;
  message: string;
  originalError: Error;
  recoverable: boolean;
  suggestedAction?: string;
  context?: Record<string, any>;
}

export class PDFErrorClassifier {
  static classify(error: any): ClassifiedError {
    // Convert to Error object if needed
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    // Check for specific error patterns
    const errorMessage = errorObj.message.toLowerCase();
    const errorStack = errorObj.stack || '';
    
    // Input validation errors
    if (
      errorMessage.includes('invalid') ||
      errorMessage.includes('missing') ||
      errorMessage.includes('required')
    ) {
      return {
        type: PDFErrorType.INPUT_VALIDATION,
        message: 'Invalid input data for PDF generation',
        originalError: errorObj,
        recoverable: true,
        suggestedAction: 'Please check your document content and try again',
        context: this.extractInputContext(errorObj),
      };
    }
    
    // Template parsing errors
    if (
      errorMessage.includes('template') ||
      errorMessage.includes('parse') ||
      errorMessage.includes('syntax')
    ) {
      return {
        type: PDFErrorType.TEMPLATE_PARSING,
        message: 'Failed to parse document template',
        originalError: errorObj,
        recoverable: false,
        suggestedAction: 'This template may be corrupted. Please contact support.',
        context: this.extractTemplateContext(errorObj),
      };
    }
    
    // Memory errors
    if (
      errorMessage.includes('memory') ||
      errorMessage.includes('heap') ||
      errorStack.includes('ENOMEM')
    ) {
      return {
        type: PDFErrorType.MEMORY_LIMIT,
        message: 'Insufficient memory to generate PDF',
        originalError: errorObj,
        recoverable: true,
        suggestedAction: 'Close other applications and try again, or generate a smaller document',
        context: { memoryUsage: this.getMemoryUsage() },
      };
    }
    
    // Disk space errors
    if (
      errorMessage.includes('disk') ||
      errorMessage.includes('space') ||
      errorStack.includes('ENOSPC')
    ) {
      return {
        type: PDFErrorType.DISK_SPACE,
        message: 'Insufficient disk space',
        originalError: errorObj,
        recoverable: true,
        suggestedAction: 'Free up disk space and try again',
      };
    }
    
    // Permission errors
    if (
      errorMessage.includes('permission') ||
      errorMessage.includes('access denied') ||
      errorStack.includes('EACCES')
    ) {
      return {
        type: PDFErrorType.PERMISSION_DENIED,
        message: 'Permission denied for PDF operation',
        originalError: errorObj,
        recoverable: false,
        suggestedAction: 'Check file permissions or run as administrator',
      };
    }
    
    // Network/timeout errors
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('fetch')
    ) {
      return {
        type: PDFErrorType.NETWORK_TIMEOUT,
        message: 'Network request timed out',
        originalError: errorObj,
        recoverable: true,
        suggestedAction: 'Check your internet connection and try again',
      };
    }
    
    // Cancellation
    if (
      errorMessage.includes('cancel') ||
      errorMessage.includes('abort')
    ) {
      return {
        type: PDFErrorType.GENERATION_CANCELLED,
        message: 'PDF generation was cancelled',
        originalError: errorObj,
        recoverable: true,
        suggestedAction: 'Generate PDF again when ready',
      };
    }
    
    // Unknown errors
    return {
      type: PDFErrorType.UNKNOWN,
      message: 'An unexpected error occurred',
      originalError: errorObj,
      recoverable: true,
      suggestedAction: 'Please try again. If the problem persists, contact support.',
      context: { 
        errorMessage: errorObj.message,
        errorStack: errorStack.split('\n').slice(0, 5),
      },
    };
  }
  
  private static extractInputContext(error: Error): Record<string, any> {
    // Extract relevant input information from error
    const context: Record<string, any> = {};
    
    // Look for field names in error message
    const fieldMatch = error.message.match(/field[s]?\s+['"]?(\w+)['"]?/i);
    if (fieldMatch) {
      context.field = fieldMatch[1];
    }
    
    return context;
  }
  
  private static extractTemplateContext(error: Error): Record<string, any> {
    // Extract template information
    const context: Record<string, any> = {};
    
    // Look for line numbers
    const lineMatch = error.message.match(/line\s+(\d+)/i);
    if (lineMatch) {
      context.line = parseInt(lineMatch[1]);
    }
    
    // Look for template names
    const templateMatch = error.message.match(/template[s]?\s+['"]?(\w+)['"]?/i);
    if (templateMatch) {
      context.template = templateMatch[1];
    }
    
    return context;
  }
  
  private static getMemoryUsage(): Record<string, number> {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    
    return {};
  }
}
```

### 2. Create Error Recovery Service (Priority: High)

**File**: Create `src/electron/renderer/src/services/PDFErrorRecoveryService.ts`

```typescript
import { PDFErrorType, ClassifiedError } from './PDFErrorClassifier';
import { usePDFBufferStore } from '../stores/PDFBufferStore';

export interface RecoveryStrategy {
  type: 'retry' | 'cleanup' | 'fallback' | 'none';
  action?: () => Promise<void>;
  delay?: number;
  maxAttempts?: number;
}

export class PDFErrorRecoveryService {
  private static instance: PDFErrorRecoveryService;
  private retryAttempts = new Map<string, number>();
  
  static getInstance(): PDFErrorRecoveryService {
    if (!PDFErrorRecoveryService.instance) {
      PDFErrorRecoveryService.instance = new PDFErrorRecoveryService();
    }
    return PDFErrorRecoveryService.instance;
  }
  
  /**
   * Determine recovery strategy based on error type
   */
  getRecoveryStrategy(
    error: ClassifiedError,
    requestId: string
  ): RecoveryStrategy {
    const attempts = this.retryAttempts.get(requestId) || 0;
    
    switch (error.type) {
      case PDFErrorType.INPUT_VALIDATION:
        return {
          type: 'none',
          // User needs to fix input
        };
        
      case PDFErrorType.MEMORY_LIMIT:
        return {
          type: 'cleanup',
          action: async () => {
            // Clean up memory
            await this.cleanupMemory();
          },
          delay: 2000,
          maxAttempts: 1,
        };
        
      case PDFErrorType.NETWORK_TIMEOUT:
        return {
          type: 'retry',
          delay: Math.min(1000 * Math.pow(2, attempts), 10000), // Exponential backoff
          maxAttempts: 3,
        };
        
      case PDFErrorType.DISK_SPACE:
        return {
          type: 'cleanup',
          action: async () => {
            // Clean up old PDF buffers
            const bufferStore = usePDFBufferStore.getState();
            bufferStore.cleanupOldBuffers();
          },
          delay: 1000,
          maxAttempts: 1,
        };
        
      case PDFErrorType.GENERATION_CANCELLED:
        return {
          type: 'none',
          // User cancelled, no recovery needed
        };
        
      case PDFErrorType.TEMPLATE_PARSING:
      case PDFErrorType.PERMISSION_DENIED:
        return {
          type: 'fallback',
          action: async () => {
            // Try alternative generation method
            console.log('Attempting fallback PDF generation method');
          },
        };
        
      default:
        return {
          type: attempts < 2 ? 'retry' : 'none',
          delay: 1000,
          maxAttempts: 2,
        };
    }
  }
  
  /**
   * Execute recovery strategy
   */
  async executeRecovery(
    strategy: RecoveryStrategy,
    requestId: string,
    onRetry: () => Promise<void>
  ): Promise<boolean> {
    const attempts = this.retryAttempts.get(requestId) || 0;
    
    if (strategy.type === 'none') {
      this.retryAttempts.delete(requestId);
      return false;
    }
    
    if (strategy.maxAttempts && attempts >= strategy.maxAttempts) {
      this.retryAttempts.delete(requestId);
      return false;
    }
    
    this.retryAttempts.set(requestId, attempts + 1);
    
    try {
      // Execute pre-recovery action if specified
      if (strategy.action) {
        await strategy.action();
      }
      
      // Wait for delay if specified
      if (strategy.delay) {
        await new Promise(resolve => setTimeout(resolve, strategy.delay));
      }
      
      // Execute recovery based on type
      switch (strategy.type) {
        case 'retry':
          await onRetry();
          return true;
          
        case 'cleanup':
          // Cleanup already done in action
          await onRetry();
          return true;
          
        case 'fallback':
          // Fallback handled in action
          return true;
          
        default:
          return false;
      }
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
      this.retryAttempts.delete(requestId);
      return false;
    }
  }
  
  /**
   * Clean up memory by forcing garbage collection and clearing caches
   */
  private async cleanupMemory(): Promise<void> {
    // Clear unused PDF buffers
    const bufferStore = usePDFBufferStore.getState();
    bufferStore.cleanupOldBuffers();
    
    // Clear image caches if any
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
      } catch (e) {
        console.error('Failed to clear caches:', e);
      }
    }
    
    // Request garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  }
  
  /**
   * Reset retry attempts for a request
   */
  resetAttempts(requestId: string): void {
    this.retryAttempts.delete(requestId);
  }
}
```

### 3. Create Error Boundary Component (Priority: High)

**File**: Create `src/electron/renderer/src/components/PDFErrorBoundary.tsx`

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Download } from 'lucide-react';
import { PDFErrorClassifier, PDFErrorType } from '../services/PDFErrorClassifier';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: PDFErrorType | null;
  errorMessage: string;
  suggestedAction: string;
}

export class PDFErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: null,
      errorMessage: '',
      suggestedAction: '',
    };
  }
  
  static getDerivedStateFromError(error: Error): State {
    const classified = PDFErrorClassifier.classify(error);
    
    return {
      hasError: true,
      error,
      errorType: classified.type,
      errorMessage: classified.message,
      suggestedAction: classified.suggestedAction || '',
    };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PDF Error Boundary caught:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Send error telemetry
    this.sendErrorTelemetry(error, errorInfo);
  }
  
  private sendErrorTelemetry(error: Error, errorInfo: ErrorInfo) {
    // Send to analytics service
    if (window.electronAPI?.sendAnalytics) {
      window.electronAPI.sendAnalytics('pdf_error', {
        errorType: this.state.errorType,
        errorMessage: error.message,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorType: null,
      errorMessage: '',
      suggestedAction: '',
    });
  };
  
  handleDownloadLogs = async () => {
    if (!this.state.error) return;
    
    const errorLog = {
      timestamp: new Date().toISOString(),
      errorType: this.state.errorType,
      message: this.state.errorMessage,
      stack: this.state.error.stack,
      userAgent: navigator.userAgent,
      memory: 'memory' in performance ? (performance as any).memory : undefined,
    };
    
    const blob = new Blob([JSON.stringify(errorLog, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdf-error-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="max-w-md w-full">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start">
                <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-medium text-red-900">
                    PDF Generation Error
                  </h3>
                  
                  <p className="mt-2 text-sm text-red-700">
                    {this.state.errorMessage}
                  </p>
                  
                  {this.state.suggestedAction && (
                    <p className="mt-2 text-sm text-gray-600">
                      {this.state.suggestedAction}
                    </p>
                  )}
                  
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={this.handleReset}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </button>
                    
                    <button
                      onClick={this.handleDownloadLogs}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                    >
                      <Download className="w-4 h-4" />
                      Download Error Log
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600">
                  Technical Details
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### 4. Update PDF Generation Hook with Error Handling (Priority: High)

**File**: Update `src/electron/renderer/src/hooks/usePDFGeneration.ts`

```typescript
import { PDFErrorClassifier } from '../services/PDFErrorClassifier';
import { PDFErrorRecoveryService } from '../services/PDFErrorRecoveryService';

export const usePDFGeneration = (
  documentId: string,
  documentType: DocumentType
): UsePDFGenerationResult => {
  // ... existing state ...
  const [errorDetails, setErrorDetails] = useState<ClassifiedError | null>(null);
  const recoveryService = PDFErrorRecoveryService.getInstance();
  
  const generatePDF = useCallback(async (content: string) => {
    const requestId = uuidv4();
    setCurrentRequestId(requestId);
    setIsGenerating(true);
    setError(null);
    setErrorDetails(null);
    setProgress(null);
    
    const attemptGeneration = async (): Promise<void> => {
      try {
        const response = await window.electronAPI.pdf.generate({
          requestId,
          content,
          documentType,
          options: {
            fontSize: 12,
            lineSpacing: 'double',
            margins: { top: 72, bottom: 72, left: 72, right: 72 },
          },
        });
        
        if (!response.success) {
          throw new Error(response.error?.message || 'PDF generation failed');
        }
        
        if (response.data?.buffer) {
          const bufferId = addBuffer(response.data.buffer, response.data.metadata);
          console.log('PDF generated successfully:', bufferId);
          
          // Reset recovery attempts on success
          recoveryService.resetAttempts(requestId);
        }
      } catch (err) {
        // Classify the error
        const classified = PDFErrorClassifier.classify(err);
        setErrorDetails(classified);
        
        // Log detailed error information
        console.error('PDF generation error details:', {
          requestId,
          classified,
          originalError: err,
        });
        
        // Get recovery strategy
        const strategy = recoveryService.getRecoveryStrategy(classified, requestId);
        
        // Attempt recovery if possible
        if (strategy.type !== 'none') {
          console.log('Attempting error recovery:', strategy);
          
          const recovered = await recoveryService.executeRecovery(
            strategy,
            requestId,
            attemptGeneration
          );
          
          if (recovered) {
            return; // Recovery succeeded
          }
        }
        
        // Set user-friendly error message
        setError(classified.message);
        setIsGenerating(false);
        setProgress(null);
        setCurrentRequestId(null);
        
        // Show error notification
        showErrorNotification(classified);
      }
    };
    
    await attemptGeneration();
  }, [content, documentType, documentId, addBuffer]);
  
  const showErrorNotification = (error: ClassifiedError) => {
    if (window.electronAPI?.showNotification) {
      window.electronAPI.showNotification({
        title: 'PDF Generation Failed',
        body: error.message,
        type: 'error',
        actions: error.recoverable ? ['Try Again', 'Cancel'] : ['OK'],
      });
    }
  };
  
  return {
    generatePDF,
    isGenerating,
    progress,
    error,
    errorDetails,
    cancelGeneration,
  };
};
```

### 5. Create Error Logging Service (Priority: Medium)

**File**: Create `src/electron/main/services/PDFErrorLogger.ts`

```typescript
import { createChildLogger } from '../../../utils/logger';
import fs from 'fs/promises';
import path from 'path';

export class PDFErrorLogger {
  private static instance: PDFErrorLogger;
  private logger = createChildLogger({ service: 'PDFErrorLogger' });
  private errorLogPath: string;
  
  static getInstance(): PDFErrorLogger {
    if (!PDFErrorLogger.instance) {
      PDFErrorLogger.instance = new PDFErrorLogger();
    }
    return PDFErrorLogger.instance;
  }
  
  constructor() {
    this.errorLogPath = path.join(
      process.env.APPDATA || process.env.HOME || '.',
      'CaseThread',
      'logs',
      'pdf-errors.log'
    );
    
    this.ensureLogDirectory();
  }
  
  private async ensureLogDirectory(): Promise<void> {
    const dir = path.dirname(this.errorLogPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }
  
  async logError(
    requestId: string,
    error: any,
    context: Record<string, any>
  ): Promise<void> {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      error: {
        message: error.message || String(error),
        stack: error.stack,
        code: error.code,
      },
      context,
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
      },
    };
    
    // Log to file
    try {
      await fs.appendFile(
        this.errorLogPath,
        JSON.stringify(errorEntry) + '\n'
      );
    } catch (writeError) {
      console.error('Failed to write error log:', writeError);
    }
    
    // Log to console
    this.logger.error('PDF generation error', errorEntry);
  }
  
  async getRecentErrors(count: number = 10): Promise<any[]> {
    try {
      const content = await fs.readFile(this.errorLogPath, 'utf-8');
      const lines = content.trim().split('\n');
      
      return lines
        .slice(-count)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    } catch (error) {
      return [];
    }
  }
  
  async clearErrorLog(): Promise<void> {
    try {
      await fs.writeFile(this.errorLogPath, '');
    } catch (error) {
      console.error('Failed to clear error log:', error);
    }
  }
}
```

## Testing Requirements

### Unit Tests

```typescript
describe('PDFErrorClassifier', () => {
  it('should classify memory errors correctly', () => {
    const error = new Error('Cannot allocate memory for PDF generation');
    const classified = PDFErrorClassifier.classify(error);
    
    expect(classified.type).toBe(PDFErrorType.MEMORY_LIMIT);
    expect(classified.recoverable).toBe(true);
    expect(classified.suggestedAction).toContain('Close other applications');
  });
  
  it('should classify validation errors correctly', () => {
    const error = new Error('Missing required field: authorName');
    const classified = PDFErrorClassifier.classify(error);
    
    expect(classified.type).toBe(PDFErrorType.INPUT_VALIDATION);
    expect(classified.context?.field).toBe('authorName');
  });
});

describe('PDFErrorRecoveryService', () => {
  it('should retry network errors with exponential backoff', async () => {
    const service = PDFErrorRecoveryService.getInstance();
    const error: ClassifiedError = {
      type: PDFErrorType.NETWORK_TIMEOUT,
      message: 'Network timeout',
      originalError: new Error('timeout'),
      recoverable: true,
    };
    
    const strategy = service.getRecoveryStrategy(error, 'test-id');
    
    expect(strategy.type).toBe('retry');
    expect(strategy.delay).toBe(1000); // First attempt
    
    // Simulate retry
    await service.executeRecovery(strategy, 'test-id', async () => {});
    
    // Second attempt should have longer delay
    const strategy2 = service.getRecoveryStrategy(error, 'test-id');
    expect(strategy2.delay).toBe(2000);
  });
});
```

### Integration Tests

```typescript
describe('PDF Error Handling Integration', () => {
  it('should recover from memory errors', async () => {
    // Simulate low memory condition
    // Trigger PDF generation
    // Verify cleanup happens
    // Verify retry succeeds
  });
  
  it('should show appropriate error UI', async () => {
    // Trigger different error types
    // Verify correct error messages shown
    // Verify suggested actions displayed
    // Verify error boundary catches crashes
  });
});
```

## Implementation Checklist

- [ ] Create error classification system
- [ ] Implement error recovery service
- [ ] Create error boundary component
- [ ] Update PDF generation hook
- [ ] Implement error logging service
- [ ] Add error telemetry
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation

## Dependencies

- Task 6.0.3.1 (PDF generation button) must be complete
- Task 6.0.5.1 (Progress integration) should be complete

## Estimated Time

- Implementation: 4-5 hours
- Testing: 2-3 hours
- Total: 6-8 hours

## Notes

- Consider adding error rate limiting to prevent spam
- Add option to automatically report errors
- Consider implementing error analytics dashboard
- Add ability to export error logs for support
- Consider adding offline error queuing 