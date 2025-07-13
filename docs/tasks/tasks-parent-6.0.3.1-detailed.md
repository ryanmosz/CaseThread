# Task 6.0.3.1 - Add PDF Generation Button to Toolbar

## Overview
Add a dedicated PDF generation button to the document viewer toolbar that allows users to generate a PDF from the currently viewed document using the IPC infrastructure.

## Requirements

### Functional Requirements
1. Add "Generate PDF" button to EnhancedDocumentViewer toolbar
2. Button should be disabled when no document is loaded
3. Show loading state during PDF generation
4. Display progress updates during generation
5. Handle errors gracefully with user feedback
6. Also add PDF option to existing Export dropdown

### Technical Requirements
1. Use existing IPC handlers for PDF generation
2. Implement proper request/response handling
3. Subscribe to progress events
4. Clean up event listeners on unmount
5. Generate unique request IDs

## Implementation Details

### 1. Create PDF Generation Hook
Create `src/electron/renderer/src/hooks/usePDFGeneration.ts`:

```typescript
import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  PDFGenerateRequest, 
  PDFGenerateResponse, 
  PDFProgressUpdate,
  PDFErrorCode 
} from '../../../../types/pdf-ipc';
import { PDF_CHANNELS } from '../../../constants/pdf-channels';

export interface UsePDFGenerationResult {
  generatePDF: (content: string, documentType: string) => Promise<void>;
  isGenerating: boolean;
  progress: PDFProgressUpdate | null;
  error: string | null;
  cancelGeneration: () => void;
}

export const usePDFGeneration = (): UsePDFGenerationResult => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<PDFProgressUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

  // Subscribe to progress events
  useEffect(() => {
    const handleProgress = (event: any, update: PDFProgressUpdate) => {
      if (update.requestId === currentRequestId) {
        setProgress(update);
      }
    };

    const handleComplete = (event: any, data: { requestId: string }) => {
      if (data.requestId === currentRequestId) {
        setIsGenerating(false);
        setProgress(null);
        setCurrentRequestId(null);
      }
    };

    const handleError = (event: any, data: { requestId: string; error: string }) => {
      if (data.requestId === currentRequestId) {
        setError(data.error);
        setIsGenerating(false);
        setProgress(null);
        setCurrentRequestId(null);
      }
    };

    window.electronAPI.onPDFProgress(handleProgress);
    window.electronAPI.onPDFComplete(handleComplete);
    window.electronAPI.onPDFError(handleError);

    return () => {
      window.electronAPI.offPDFProgress(handleProgress);
      window.electronAPI.offPDFComplete(handleComplete);
      window.electronAPI.offPDFError(handleError);
    };
  }, [currentRequestId]);

  const generatePDF = useCallback(async (content: string, documentType: string) => {
    const requestId = uuidv4();
    setCurrentRequestId(requestId);
    setIsGenerating(true);
    setError(null);
    setProgress(null);

    const request: PDFGenerateRequest = {
      requestId,
      content,
      documentType,
      options: {
        fontSize: 12,
        lineSpacing: 'double',
        margins: {
          top: 72,
          bottom: 72,
          left: 72,
          right: 72
        }
      }
    };

    try {
      const response = await window.electronAPI.generatePDF(request);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'PDF generation failed');
      }

      // The completion will be handled by the event listener
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF generation failed');
      setIsGenerating(false);
      setProgress(null);
      setCurrentRequestId(null);
    }
  }, []);

  const cancelGeneration = useCallback(() => {
    if (currentRequestId && isGenerating) {
      window.electronAPI.cancelPDFGeneration({ 
        requestId: currentRequestId,
        reason: 'User cancelled'
      });
      setIsGenerating(false);
      setProgress(null);
      setCurrentRequestId(null);
      setError(null);
    }
  }, [currentRequestId, isGenerating]);

  return {
    generatePDF,
    isGenerating,
    progress,
    error,
    cancelGeneration
  };
};
```

### 2. Update EnhancedDocumentViewer Component

Add PDF generation functionality to `src/electron/renderer/src/components/EnhancedDocumentViewer.tsx`:

```typescript
// Add imports
import { usePDFGeneration } from '../hooks/usePDFGeneration';
import { addToast } from '@heroui/react';

// Add PDF icon component
const PDFIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M9 17h6M9 13h6M9 9h4" />
  </svg>
);

// In component body, add PDF generation hook
const { generatePDF, isGenerating, progress, error: pdfError, cancelGeneration } = usePDFGeneration();

// Add document type detection
const detectDocumentType = (documentName: string): string => {
  const name = documentName.toLowerCase();
  if (name.includes('patent-assignment')) return 'patent-assignment-agreement';
  if (name.includes('cease-and-desist')) return 'cease-and-desist-letter';
  if (name.includes('nda')) return 'nda-ip-specific';
  if (name.includes('patent-license')) return 'patent-license-agreement';
  if (name.includes('provisional-patent')) return 'provisional-patent-application';
  if (name.includes('trademark')) return 'trademark-application';
  if (name.includes('office-action')) return 'office-action-response';
  if (name.includes('technology-transfer')) return 'technology-transfer-agreement';
  return 'patent-assignment-agreement'; // default
};

// Add PDF generation handler
const handleGeneratePDF = async () => {
  if (!content || !documentName) {
    addToast({
      title: 'No document loaded',
      description: 'Please open a document before generating a PDF',
      type: 'error'
    });
    return;
  }

  const documentType = detectDocumentType(documentName);
  
  try {
    await generatePDF(content, documentType);
    
    addToast({
      title: 'PDF Generated',
      description: 'Your PDF has been generated successfully',
      type: 'success'
    });
  } catch (err) {
    // Error is handled by the hook
  }
};

// Show PDF error
useEffect(() => {
  if (pdfError) {
    addToast({
      title: 'PDF Generation Failed',
      description: pdfError,
      type: 'error'
    });
  }
}, [pdfError]);

// Add PDF generation button to toolbar (after Save button)
{/* Generate PDF Button */}
<Button
  variant="flat"
  size="sm"
  color="primary"
  isLoading={isGenerating}
  isDisabled={!content || isGenerating}
  onClick={handleGeneratePDF}
  startContent={!isGenerating && <PDFIcon />}
>
  {isGenerating ? 
    (progress ? `${progress.percentage}%` : 'Generating...') : 
    'Generate PDF'
  }
</Button>

// Update Export dropdown to include PDF option
<DropdownItem
  key="pdf"
  onClick={handleGeneratePDF}
  isDisabled={!content || isGenerating}
  startContent={<PDFIcon />}
>
  Generate as PDF
</DropdownItem>
```

### 3. Add Progress Modal (Optional Enhancement)

For better UX, show generation progress in a modal:

```typescript
// Add progress modal
{isGenerating && progress && (
  <Modal 
    isOpen={isGenerating} 
    onClose={cancelGeneration}
    size="sm"
  >
    <ModalContent>
      <ModalHeader>Generating PDF</ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-foreground/60 mb-2">{progress.step}</p>
            {progress.detail && (
              <p className="text-xs text-foreground/40">{progress.detail}</p>
            )}
          </div>
          
          <Progress 
            value={progress.percentage} 
            color="primary"
            showValueLabel
          />
          
          {progress.estimatedTimeRemaining && (
            <p className="text-xs text-foreground/60">
              Estimated time: {Math.ceil(progress.estimatedTimeRemaining / 1000)}s
            </p>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button 
          color="danger" 
          variant="light" 
          onClick={cancelGeneration}
        >
          Cancel
        </Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
)}
```

## Testing Requirements

1. **Button Visibility**
   - PDF button appears in toolbar
   - PDF option appears in Export dropdown

2. **Button States**
   - Disabled when no document is loaded
   - Shows loading state during generation
   - Shows progress percentage when available

3. **Functionality**
   - Generates PDF for current document
   - Shows progress updates
   - Handles errors gracefully
   - Can cancel generation

4. **Document Types**
   - Test with all 8 document types
   - Verify correct type detection

5. **Error Scenarios**
   - Invalid document content
   - Generation failure
   - Cancellation

## Implementation Order

1. Create usePDFGeneration hook
2. Add PDF icon component
3. Integrate hook into EnhancedDocumentViewer
4. Add PDF button to toolbar
5. Add PDF option to Export dropdown
6. Add progress display
7. Test functionality
8. Add progress modal (optional)

## Success Criteria

- [ ] PDF button visible in toolbar
- [ ] PDF option in Export dropdown
- [ ] Loading state during generation
- [ ] Progress updates displayed
- [ ] Error handling with user feedback
- [ ] All document types supported
- [ ] Clean code with proper TypeScript types 