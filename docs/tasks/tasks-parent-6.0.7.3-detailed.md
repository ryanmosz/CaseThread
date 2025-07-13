# Task 6.0.7.3: Create Retry Mechanism for Failures

## Overview
Implement a robust retry mechanism for PDF generation failures with exponential backoff, configurable retry limits, and user control over retry behavior.

## Current State
- Basic error handling implemented in 6.0.7.1 and 6.0.7.2
- PDF generation hook reports errors to user
- No automatic retry functionality exists
- Users must manually retry failed operations

## Implementation Details

### 1. Create Retry Utilities
File: `src/utils/pdf-retry.ts`

```typescript
export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  shouldRetry: (error: Error, attempt: number) => boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  shouldRetry: (error) => {
    // Don't retry on validation errors
    if (error.message.includes('Invalid') || 
        error.message.includes('validation')) {
      return false;
    }
    // Retry on network and temporary errors
    return error.message.includes('network') ||
           error.message.includes('timeout') ||
           error.message.includes('ECONNREFUSED');
  }
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === opts.maxAttempts || 
          !opts.shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffFactor, attempt - 1),
        opts.maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

### 2. Update PDF Generation Hook with Retry
File: `src/electron/renderer/src/hooks/usePDFGeneration.ts`

Add retry functionality:

```typescript
import { withRetry, RetryOptions } from '@/utils/pdf-retry';

export interface PDFGenerationOptions {
  enableRetry?: boolean;
  retryOptions?: Partial<RetryOptions>;
}

export const usePDFGeneration = () => {
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const generatePDF = useCallback(async (
    options: PDFGenerationOptions = {}
  ) => {
    setLoading(true);
    setError(null);
    setRetryAttempt(0);

    const { enableRetry = true, retryOptions } = options;

    try {
      const pdfOperation = async () => {
        if (retryAttempt > 0) {
          setIsRetrying(true);
        }

        const currentDocument = getCurrentDocument();
        if (!currentDocument) {
          throw new Error('No document available for PDF generation');
        }

        const templateId = getTemplateIdForDocument(currentDocument);
        const result = await window.electronAPI.pdf.generate({
          content: currentDocument.content,
          templateId,
          metadata: currentDocument.metadata
        });

        if (!result.success || !result.data) {
          throw new Error(result.error || 'PDF generation failed');
        }

        return result.data;
      };

      const result = enableRetry
        ? await withRetry(pdfOperation, {
            ...retryOptions,
            shouldRetry: (error, attempt) => {
              setRetryAttempt(attempt);
              // Let user cancel retries
              if (error.message === 'User cancelled retry') {
                return false;
              }
              // Use custom or default retry logic
              return retryOptions?.shouldRetry?.(error, attempt) ?? 
                     DEFAULT_RETRY_OPTIONS.shouldRetry(error, attempt);
            }
          })
        : await pdfOperation();

      setPdfBuffer(result);
      setError(null);
      
      // Show success with retry info
      if (retryAttempt > 0) {
        toast({
          title: 'PDF Generated Successfully',
          description: `Document generated after ${retryAttempt} retry attempt${retryAttempt > 1 ? 's' : ''}.`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'PDF Generated Successfully',
          description: 'Your document has been generated.',
          variant: 'default'
        });
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      
      // Show error with retry info
      if (enableRetry && retryAttempt > 0) {
        toast({
          title: 'PDF Generation Failed',
          description: `Failed after ${retryAttempt} attempts: ${error.message}`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'PDF Generation Failed',
          description: error.message,
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [retryAttempt]);

  const cancelRetry = useCallback(() => {
    setError('User cancelled retry');
    setIsRetrying(false);
    setLoading(false);
  }, []);

  return {
    generatePDF,
    loading,
    error,
    pdfBuffer,
    exportPDF,
    clearPDF,
    retryAttempt,
    isRetrying,
    cancelRetry
  };
};
```

### 3. Add Retry UI Component
File: `src/electron/renderer/src/components/PDFRetryIndicator.tsx`

```typescript
interface PDFRetryIndicatorProps {
  attempt: number;
  maxAttempts: number;
  onCancel: () => void;
}

export const PDFRetryIndicator: React.FC<PDFRetryIndicatorProps> = ({
  attempt,
  maxAttempts,
  onCancel
}) => {
  if (attempt === 0) return null;

  return (
    <div className="flex items-center justify-between p-4 bg-yellow-50 
                    border border-yellow-200 rounded-md">
      <div className="flex items-center space-x-3">
        <RefreshCw className="w-5 h-5 text-yellow-600 animate-spin" />
        <div>
          <p className="text-sm font-medium text-yellow-800">
            Retrying PDF Generation
          </p>
          <p className="text-xs text-yellow-600">
            Attempt {attempt} of {maxAttempts}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="text-yellow-800 hover:text-yellow-900"
      >
        Cancel
      </Button>
    </div>
  );
};
```

### 4. Update IPC Handler with Retry Support
File: `src/electron/main/ipc/pdf-generation-handler.ts`

Add retry metadata to responses:

```typescript
ipcMain.handle('pdf:generate', async (event, options) => {
  const startTime = Date.now();
  
  try {
    // Include retry metadata in progress
    progressManager.updateProgress(event.sender, {
      stage: 'initializing',
      progress: 0,
      message: 'Starting PDF generation...',
      metadata: {
        retryable: true,
        attemptNumber: options.attemptNumber || 1
      }
    });

    // ... existing PDF generation logic ...

    return {
      success: true,
      data: pdfBuffer,
      metadata: {
        duration: Date.now() - startTime,
        size: pdfBuffer.length,
        attemptNumber: options.attemptNumber || 1
      }
    };
  } catch (error) {
    const errorInfo = {
      message: error.message,
      code: error.code,
      retryable: isRetryableError(error)
    };

    return {
      success: false,
      error: error.message,
      errorInfo
    };
  }
});

function isRetryableError(error: Error): boolean {
  // Network errors
  if (error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENETUNREACH')) {
    return true;
  }

  // Temporary file system errors
  if (error.message.includes('EBUSY') ||
      error.message.includes('EMFILE')) {
    return true;
  }

  // PDF generation specific errors
  if (error.message.includes('timeout') ||
      error.message.includes('memory')) {
    return true;
  }

  return false;
}
```

### 5. Add Configuration Settings
File: `src/config/pdf-retry.ts`

```typescript
export interface PDFRetryConfig {
  enabled: boolean;
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  retryableErrors: string[];
}

export const DEFAULT_PDF_RETRY_CONFIG: PDFRetryConfig = {
  enabled: true,
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffFactor: 2,
  retryableErrors: [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENETUNREACH',
    'EBUSY',
    'EMFILE',
    'timeout',
    'memory'
  ]
};

// Allow configuration through environment or settings
export function getPDFRetryConfig(): PDFRetryConfig {
  return {
    ...DEFAULT_PDF_RETRY_CONFIG,
    enabled: process.env.PDF_RETRY_ENABLED !== 'false',
    maxAttempts: parseInt(process.env.PDF_RETRY_MAX_ATTEMPTS || '3', 10)
  };
}
```

### 6. Update EnhancedDocumentViewer
File: `src/electron/renderer/src/components/EnhancedDocumentViewer.tsx`

Add retry indicator:

```typescript
import { PDFRetryIndicator } from './PDFRetryIndicator';

export const EnhancedDocumentViewer: React.FC = () => {
  const { 
    generatePDF, 
    loading, 
    error, 
    retryAttempt,
    isRetrying,
    cancelRetry
  } = usePDFGeneration();

  // Add retry configuration
  const pdfOptions = {
    enableRetry: true,
    retryOptions: {
      maxAttempts: 3,
      initialDelay: 1000
    }
  };

  return (
    <div className="flex flex-col h-full">
      <DocumentToolbar
        onGeneratePDF={() => generatePDF(pdfOptions)}
        isGeneratingPDF={loading}
      />
      
      {/* Retry indicator */}
      {isRetrying && (
        <PDFRetryIndicator
          attempt={retryAttempt}
          maxAttempts={pdfOptions.retryOptions.maxAttempts}
          onCancel={cancelRetry}
        />
      )}
      
      {/* Rest of component */}
    </div>
  );
};
```

## Testing Requirements

### Unit Tests
- Test retry logic with different error types
- Test exponential backoff calculations
- Test retry cancellation
- Test maximum retry limits

### Integration Tests
- Test retry with actual PDF generation failures
- Test retry UI updates during retries
- Test retry with different document types
- Test configuration options

### Manual Testing
1. Simulate network failures during PDF generation
2. Test retry cancellation functionality
3. Verify retry delays are working correctly
4. Test with different retry configurations

## Acceptance Criteria
- [ ] Retry mechanism implemented with exponential backoff
- [ ] Configurable retry options
- [ ] UI shows retry progress and allows cancellation
- [ ] Only retryable errors trigger retries
- [ ] Retry metadata included in responses
- [ ] Tests cover all retry scenarios
- [ ] Configuration can be customized

## Notes
- Consider adding retry statistics for monitoring
- May want to persist retry configuration
- Could add smart retry logic based on error patterns
- Consider retry budget to prevent excessive retries 