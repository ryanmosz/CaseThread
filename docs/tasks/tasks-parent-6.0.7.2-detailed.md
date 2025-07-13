# Task 6.0.7.2: Add User-Friendly Error Messages

## Overview
This task focuses on creating a comprehensive user-friendly error messaging system that translates technical errors into clear, actionable messages that help users understand and resolve issues.

## Current State Analysis

### Current Issues
1. Technical error messages shown to users
2. No localization support
3. Inconsistent error presentation
4. Missing contextual help
5. No error message customization

### Requirements
1. Clear, non-technical language
2. Actionable suggestions
3. Consistent tone and formatting
4. Contextual help links
5. Accessibility compliance

## Implementation Plan

### 1. Create Error Message Repository (Priority: High)

**File**: Create `src/electron/renderer/src/constants/errorMessages.ts`

```typescript
import { PDFErrorType } from '../services/PDFErrorClassifier';

export interface ErrorMessageTemplate {
  title: string;
  message: string;
  details?: string;
  actions: ErrorAction[];
  helpLink?: string;
  icon?: 'error' | 'warning' | 'info';
}

export interface ErrorAction {
  label: string;
  action: 'retry' | 'cancel' | 'help' | 'report' | 'custom';
  primary?: boolean;
  handler?: () => void;
}

export const ERROR_MESSAGES: Record<PDFErrorType, ErrorMessageTemplate> = {
  [PDFErrorType.INPUT_VALIDATION]: {
    title: 'Document Information Missing',
    message: 'Some required information is missing from your document.',
    details: 'Please check that all required fields are filled in before generating the PDF.',
    actions: [
      { label: 'Review Document', action: 'cancel', primary: true },
      { label: 'Get Help', action: 'help' },
    ],
    helpLink: '/help/document-requirements',
    icon: 'warning',
  },
  
  [PDFErrorType.TEMPLATE_PARSING]: {
    title: 'Document Format Issue',
    message: 'We encountered an issue with the document format.',
    details: 'This document template may need to be updated. Our team has been notified.',
    actions: [
      { label: 'Try Different Template', action: 'custom', primary: true },
      { label: 'Report Issue', action: 'report' },
    ],
    helpLink: '/help/template-errors',
    icon: 'error',
  },
  
  [PDFErrorType.CONTENT_FORMATTING]: {
    title: 'Formatting Issue',
    message: 'Some content couldn\'t be formatted correctly.',
    details: 'The PDF was generated but some formatting may not appear as expected.',
    actions: [
      { label: 'Continue Anyway', action: 'cancel', primary: true },
      { label: 'Fix Formatting', action: 'custom' },
    ],
    icon: 'warning',
  },
  
  [PDFErrorType.MEMORY_LIMIT]: {
    title: 'Not Enough Memory',
    message: 'Your computer is running low on memory.',
    details: 'Try closing other applications to free up memory, or generate a smaller document.',
    actions: [
      { label: 'Try Again', action: 'retry', primary: true },
      { label: 'Generate Smaller PDF', action: 'custom' },
    ],
    helpLink: '/help/memory-issues',
    icon: 'warning',
  },
  
  [PDFErrorType.DISK_SPACE]: {
    title: 'Low Disk Space',
    message: 'There isn\'t enough space to save the PDF.',
    details: 'Free up some disk space and try again.',
    actions: [
      { label: 'Check Storage', action: 'custom', primary: true },
      { label: 'Try Again', action: 'retry' },
    ],
    helpLink: '/help/disk-space',
    icon: 'error',
  },
  
  [PDFErrorType.PERMISSION_DENIED]: {
    title: 'Permission Required',
    message: 'CaseThread needs permission to save PDFs.',
    details: 'Please check your security settings or run CaseThread as an administrator.',
    actions: [
      { label: 'Check Permissions', action: 'custom', primary: true },
      { label: 'Get Help', action: 'help' },
    ],
    helpLink: '/help/permissions',
    icon: 'error',
  },
  
  [PDFErrorType.NETWORK_TIMEOUT]: {
    title: 'Connection Timeout',
    message: 'The operation is taking longer than expected.',
    details: 'This might be due to a slow internet connection or server issues.',
    actions: [
      { label: 'Try Again', action: 'retry', primary: true },
      { label: 'Work Offline', action: 'custom' },
    ],
    helpLink: '/help/connection-issues',
    icon: 'warning',
  },
  
  [PDFErrorType.GENERATION_CANCELLED]: {
    title: 'PDF Generation Cancelled',
    message: 'The PDF generation was stopped.',
    details: 'You can generate the PDF again whenever you\'re ready.',
    actions: [
      { label: 'Generate Again', action: 'retry', primary: true },
      { label: 'Close', action: 'cancel' },
    ],
    icon: 'info',
  },
  
  [PDFErrorType.UNKNOWN]: {
    title: 'Something Went Wrong',
    message: 'We encountered an unexpected issue.',
    details: 'Please try again. If this keeps happening, our support team can help.',
    actions: [
      { label: 'Try Again', action: 'retry', primary: true },
      { label: 'Get Support', action: 'report' },
    ],
    helpLink: '/help/contact-support',
    icon: 'error',
  },
};

// Fallback messages for edge cases
export const FALLBACK_ERROR_MESSAGE: ErrorMessageTemplate = {
  title: 'Unable to Complete Action',
  message: 'Something prevented us from completing your request.',
  details: 'Please try again or contact support if the issue persists.',
  actions: [
    { label: 'Try Again', action: 'retry', primary: true },
    { label: 'Contact Support', action: 'help' },
  ],
  icon: 'error',
};
```

### 2. Create Error Message Service (Priority: High)

**File**: Create `src/electron/renderer/src/services/ErrorMessageService.ts`

```typescript
import { PDFErrorType, ClassifiedError } from './PDFErrorClassifier';
import { ERROR_MESSAGES, FALLBACK_ERROR_MESSAGE, ErrorMessageTemplate } from '../constants/errorMessages';

export interface FormattedErrorMessage {
  title: string;
  message: string;
  details: string;
  actions: ErrorAction[];
  helpLink?: string;
  icon: 'error' | 'warning' | 'info';
  technicalDetails?: string;
}

export class ErrorMessageService {
  private static instance: ErrorMessageService;
  
  static getInstance(): ErrorMessageService {
    if (!ErrorMessageService.instance) {
      ErrorMessageService.instance = new ErrorMessageService();
    }
    return ErrorMessageService.instance;
  }
  
  /**
   * Format error for user display
   */
  formatError(
    error: ClassifiedError,
    options: {
      includeTechnical?: boolean;
      customContext?: Record<string, any>;
    } = {}
  ): FormattedErrorMessage {
    const template = this.getErrorTemplate(error.type);
    
    // Personalize the message with context
    const personalizedMessage = this.personalizeMessage(
      template,
      error,
      options.customContext
    );
    
    return {
      ...personalizedMessage,
      technicalDetails: options.includeTechnical ? 
        this.formatTechnicalDetails(error) : undefined,
    };
  }
  
  /**
   * Get error template for a specific error type
   */
  private getErrorTemplate(errorType: PDFErrorType): ErrorMessageTemplate {
    return ERROR_MESSAGES[errorType] || FALLBACK_ERROR_MESSAGE;
  }
  
  /**
   * Personalize error message with context
   */
  private personalizeMessage(
    template: ErrorMessageTemplate,
    error: ClassifiedError,
    customContext?: Record<string, any>
  ): FormattedErrorMessage {
    let message = template.message;
    let details = template.details || '';
    
    // Add specific context based on error type
    if (error.type === PDFErrorType.INPUT_VALIDATION && error.context?.field) {
      message = `The "${this.humanizeFieldName(error.context.field)}" field is missing or invalid.`;
      details = 'Please check this field and try again.';
    }
    
    if (error.type === PDFErrorType.MEMORY_LIMIT && error.context?.memoryUsage) {
      const usage = error.context.memoryUsage;
      const percentUsed = Math.round((usage.usedJSHeapSize / usage.jsHeapSizeLimit) * 100);
      details = `Memory usage: ${percentUsed}%. ${details}`;
    }
    
    // Add custom context if provided
    if (customContext?.documentType) {
      details = `While generating ${this.humanizeDocumentType(customContext.documentType)}: ${details}`;
    }
    
    return {
      title: template.title,
      message,
      details,
      actions: template.actions,
      helpLink: template.helpLink,
      icon: template.icon || 'error',
    };
  }
  
  /**
   * Convert field names to human-readable format
   */
  private humanizeFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  }
  
  /**
   * Convert document types to human-readable format
   */
  private humanizeDocumentType(documentType: string): string {
    const typeMap: Record<string, string> = {
      'patent-assignment-agreement': 'Patent Assignment Agreement',
      'provisional-patent-application': 'Provisional Patent Application',
      'nda-ip-specific': 'Non-Disclosure Agreement',
      'trademark-application': 'Trademark Application',
      'cease-and-desist-letter': 'Cease and Desist Letter',
      'patent-license-agreement': 'Patent License Agreement',
      'office-action-response': 'Office Action Response',
      'technology-transfer-agreement': 'Technology Transfer Agreement',
    };
    
    return typeMap[documentType] || documentType;
  }
  
  /**
   * Format technical details for support/debugging
   */
  private formatTechnicalDetails(error: ClassifiedError): string {
    const details = [
      `Error Type: ${error.type}`,
      `Timestamp: ${new Date().toISOString()}`,
      `Message: ${error.originalError.message}`,
    ];
    
    if (error.context) {
      details.push(`Context: ${JSON.stringify(error.context, null, 2)}`);
    }
    
    if (error.originalError.stack) {
      details.push(`Stack Trace:\n${error.originalError.stack}`);
    }
    
    return details.join('\n');
  }
  
  /**
   * Get suggested keyboard shortcuts for actions
   */
  getActionShortcuts(actions: ErrorAction[]): Record<string, string> {
    const shortcuts: Record<string, string> = {};
    
    actions.forEach((action, index) => {
      if (action.primary) {
        shortcuts[action.label] = 'Enter';
      } else if (index === 1) {
        shortcuts[action.label] = 'Esc';
      }
    });
    
    return shortcuts;
  }
}
```

### 3. Create Error Dialog Component (Priority: High)

**File**: Create `src/electron/renderer/src/components/ErrorDialog.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, AlertTriangle, Info, HelpCircle, Copy } from 'lucide-react';
import { FormattedErrorMessage } from '../services/ErrorMessageService';

interface ErrorDialogProps {
  error: FormattedErrorMessage | null;
  onClose: () => void;
  onAction: (action: string) => void;
}

export const ErrorDialog: React.FC<ErrorDialogProps> = ({
  error,
  onClose,
  onAction,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  
  // Focus management
  useEffect(() => {
    if (error && primaryButtonRef.current) {
      primaryButtonRef.current.focus();
    }
  }, [error]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!error) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        const primaryAction = error.actions.find(a => a.primary);
        if (primaryAction) {
          onAction(primaryAction.action);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [error, onClose, onAction]);
  
  if (!error) return null;
  
  const getIcon = () => {
    switch (error.icon) {
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-600" />;
    }
  };
  
  const getIconBgColor = () => {
    switch (error.icon) {
      case 'error':
        return 'bg-red-100';
      case 'warning':
        return 'bg-yellow-100';
      case 'info':
        return 'bg-blue-100';
    }
  };
  
  const copyTechnicalDetails = () => {
    if (error.technicalDetails) {
      navigator.clipboard.writeText(error.technicalDetails);
      // Show toast notification
    }
  };
  
  return (
    <AnimatePresence>
      {error && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={onClose}
          />
          
          {/* Dialog */}
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="error-dialog-title"
          >
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl">
                {/* Header */}
                <div className="px-6 pt-6 pb-4">
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 rounded-full p-2 ${getIconBgColor()}`}>
                      {getIcon()}
                    </div>
                    
                    <div className="ml-4 flex-1">
                      <h3
                        id="error-dialog-title"
                        className="text-lg font-semibold text-gray-900"
                      >
                        {error.title}
                      </h3>
                      
                      <p className="mt-2 text-sm text-gray-600">
                        {error.message}
                      </p>
                      
                      {error.details && (
                        <p className="mt-2 text-sm text-gray-500">
                          {error.details}
                        </p>
                      )}
                    </div>
                    
                    <button
                      onClick={onClose}
                      className="ml-4 rounded-md p-1 hover:bg-gray-100"
                      aria-label="Close dialog"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>
                
                {/* Help link */}
                {error.helpLink && (
                  <div className="px-6 pb-4">
                    <a
                      href={error.helpLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Learn more about this issue
                    </a>
                  </div>
                )}
                
                {/* Technical details (development mode) */}
                {error.technicalDetails && process.env.NODE_ENV === 'development' && (
                  <details className="px-6 pb-4">
                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                      Technical Details
                    </summary>
                    <div className="mt-2 relative">
                      <pre className="p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                        {error.technicalDetails}
                      </pre>
                      <button
                        onClick={copyTechnicalDetails}
                        className="absolute top-2 right-2 p-1 bg-white rounded shadow hover:bg-gray-50"
                        title="Copy details"
                      >
                        <Copy className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </details>
                )}
                
                {/* Actions */}
                <div className="bg-gray-50 px-6 py-4">
                  <div className="flex flex-row-reverse gap-3">
                    {error.actions.map((action, index) => (
                      <button
                        key={index}
                        ref={action.primary ? primaryButtonRef : undefined}
                        onClick={() => onAction(action.action)}
                        className={`
                          px-4 py-2 rounded-md text-sm font-medium
                          ${action.primary
                            ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
```

### 4. Create Toast Notification System (Priority: Medium)

**File**: Create `src/electron/renderer/src/components/ErrorToast.tsx`

```typescript
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface ErrorToastProps {
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  duration?: number;
  onClose: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const ErrorToast: React.FC<ErrorToastProps> = ({
  message,
  type,
  duration = 5000,
  onClose,
  action,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);
  
  const getStyles = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: <Info className="w-5 h-5 text-blue-600" />,
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
        };
    }
  };
  
  const styles = getStyles();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        flex items-center gap-3 p-4 rounded-lg border shadow-lg
        ${styles.bg} ${styles.border}
      `}
      role="alert"
    >
      {styles.icon}
      
      <p className={`flex-1 text-sm ${styles.text}`}>
        {message}
      </p>
      
      {action && (
        <button
          onClick={action.onClick}
          className={`text-sm font-medium ${styles.text} hover:underline`}
        >
          {action.label}
        </button>
      )}
      
      <button
        onClick={onClose}
        className="p-1 rounded hover:bg-black hover:bg-opacity-10"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

// Toast Container
export const ErrorToastContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>{children}</AnimatePresence>
    </div>
  );
};
```

### 5. Create Error Message Hook (Priority: Medium)

**File**: Create `src/electron/renderer/src/hooks/useErrorMessage.ts`

```typescript
import { useState, useCallback } from 'react';
import { ClassifiedError } from '../services/PDFErrorClassifier';
import { ErrorMessageService, FormattedErrorMessage } from '../services/ErrorMessageService';

interface UseErrorMessageResult {
  showError: (error: ClassifiedError, context?: Record<string, any>) => void;
  hideError: () => void;
  currentError: FormattedErrorMessage | null;
  isVisible: boolean;
}

export const useErrorMessage = (): UseErrorMessageResult => {
  const [currentError, setCurrentError] = useState<FormattedErrorMessage | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  const messageService = ErrorMessageService.getInstance();
  
  const showError = useCallback((
    error: ClassifiedError,
    context?: Record<string, any>
  ) => {
    const formatted = messageService.formatError(error, {
      includeTechnical: process.env.NODE_ENV === 'development',
      customContext: context,
    });
    
    setCurrentError(formatted);
    setIsVisible(true);
    
    // Log to analytics
    if (window.electronAPI?.sendAnalytics) {
      window.electronAPI.sendAnalytics('error_shown', {
        errorType: error.type,
        errorMessage: formatted.message,
        hasActions: formatted.actions.length > 0,
      });
    }
  }, [messageService]);
  
  const hideError = useCallback(() => {
    setIsVisible(false);
    // Keep error in state for animation
    setTimeout(() => setCurrentError(null), 300);
  }, []);
  
  return {
    showError,
    hideError,
    currentError,
    isVisible,
  };
};
```

## Testing Requirements

### Unit Tests

```typescript
describe('ErrorMessageService', () => {
  it('should format validation errors with field context', () => {
    const service = ErrorMessageService.getInstance();
    const error: ClassifiedError = {
      type: PDFErrorType.INPUT_VALIDATION,
      message: 'Validation failed',
      originalError: new Error('Missing field: assignorName'),
      recoverable: true,
      context: { field: 'assignorName' },
    };
    
    const formatted = service.formatError(error);
    
    expect(formatted.message).toContain('Assignor Name');
    expect(formatted.details).toContain('check this field');
  });
  
  it('should provide appropriate actions for each error type', () => {
    const service = ErrorMessageService.getInstance();
    
    Object.values(PDFErrorType).forEach(errorType => {
      const error: ClassifiedError = {
        type: errorType,
        message: 'Test error',
        originalError: new Error('Test'),
        recoverable: true,
      };
      
      const formatted = service.formatError(error);
      
      expect(formatted.actions.length).toBeGreaterThan(0);
      expect(formatted.actions.some(a => a.primary)).toBe(true);
    });
  });
});
```

### Integration Tests

```typescript
describe('Error Dialog Integration', () => {
  it('should handle keyboard navigation', async () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <ErrorDialog
        error={{
          title: 'Test Error',
          message: 'Test message',
          actions: [
            { label: 'Retry', action: 'retry', primary: true },
            { label: 'Cancel', action: 'cancel' },
          ],
        }}
        onClose={jest.fn()}
        onAction={onAction}
      />
    );
    
    // Press Enter to trigger primary action
    fireEvent.keyDown(document, { key: 'Enter' });
    
    expect(onAction).toHaveBeenCalledWith('retry');
  });
  
  it('should show appropriate icons and colors', () => {
    // Test each error type shows correct visual style
  });
});
```

## Implementation Checklist

- [ ] Create error message repository
- [ ] Implement error message service
- [ ] Create error dialog component
- [ ] Create toast notification system
- [ ] Create error message hook
- [ ] Add localization support
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation

## Dependencies

- Task 6.0.7.1 (PDF error handling) must be complete

## Estimated Time

- Implementation: 3-4 hours
- Testing: 2 hours
- Total: 5-6 hours

## Notes

- Consider A/B testing different error messages
- Add analytics to track which errors users encounter most
- Consider adding error message templates for custom errors
- Add support for rich formatting in error messages
- Consider implementing error message versioning 