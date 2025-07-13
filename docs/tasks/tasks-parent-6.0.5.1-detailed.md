# Task 6.0.5.1: Connect PDF Service to BackgroundGenerationStatus

## Overview
This task involves integrating the PDF generation progress reporting with the existing BackgroundGenerationStatus component, ensuring seamless progress updates throughout the PDF generation lifecycle.

## Current State Analysis

### Existing Components
1. **BackgroundGenerationStatus.tsx**: Currently displays progress for document generation
2. **BackgroundGenerationContext.tsx**: Manages generation state globally
3. **PDFGenerationHandler**: Emits progress events during generation
4. **ProgressManager**: Centralized progress event management

### Current Progress Flow
```
PDF Service → Progress Events → IPC Events → Frontend (not connected to BackgroundGenerationStatus)
```

## Implementation Plan

### 1. Extend BackgroundGenerationContext (Priority: High)

**File**: `src/electron/renderer/src/contexts/BackgroundGenerationContext.tsx`

Add PDF-specific state and handlers:

```typescript
interface BackgroundGenerationContextType {
  // Existing properties...
  
  // PDF-specific additions
  pdfGenerationStatus: {
    isGenerating: boolean;
    progress: number;
    currentStep: string;
    documentType?: DocumentType;
    requestId?: string;
  };
  
  // PDF methods
  startPDFGeneration: (documentType: DocumentType, requestId: string) => void;
  updatePDFProgress: (progress: PDFProgressUpdate) => void;
  completePDFGeneration: () => void;
  failPDFGeneration: (error: string) => void;
}
```

### 2. Connect PDF Events to Context (Priority: High)

**File**: Create `src/electron/renderer/src/hooks/usePDFProgressSync.ts`

```typescript
import { useEffect } from 'react';
import { useBackgroundGeneration } from '../contexts/BackgroundGenerationContext';
import { PDFProgressUpdate } from '../../../../types/pdf-ipc';

export const usePDFProgressSync = () => {
  const { updatePDFProgress, completePDFGeneration, failPDFGeneration } = useBackgroundGeneration();
  
  useEffect(() => {
    const handleProgress = (_event: any, update: PDFProgressUpdate) => {
      updatePDFProgress(update);
    };
    
    const handleComplete = () => {
      completePDFGeneration();
    };
    
    const handleError = (_event: any, data: { error: any }) => {
      failPDFGeneration(data.error?.message || 'PDF generation failed');
    };
    
    // Subscribe to PDF events
    window.electronAPI.on('pdf:progress', handleProgress);
    window.electronAPI.on('pdf:complete', handleComplete);
    window.electronAPI.on('pdf:error', handleError);
    
    return () => {
      window.electronAPI.removeListener('pdf:progress', handleProgress);
      window.electronAPI.removeListener('pdf:complete', handleComplete);
      window.electronAPI.removeListener('pdf:error', handleError);
    };
  }, [updatePDFProgress, completePDFGeneration, failPDFGeneration]);
};
```

### 3. Update BackgroundGenerationStatus Component (Priority: High)

**File**: `src/electron/renderer/src/components/BackgroundGenerationStatus.tsx`

Modify to handle PDF generation:

```typescript
const BackgroundGenerationStatus: React.FC = () => {
  const { 
    isGenerating, 
    progress, 
    status,
    pdfGenerationStatus // New
  } = useBackgroundGeneration();
  
  // Determine which progress to show
  const activeGeneration = pdfGenerationStatus.isGenerating ? 'pdf' : 
                          isGenerating ? 'document' : null;
  
  if (!activeGeneration) return null;
  
  const displayProgress = activeGeneration === 'pdf' ? 
    pdfGenerationStatus.progress : progress;
  
  const displayStatus = activeGeneration === 'pdf' ?
    `PDF: ${pdfGenerationStatus.currentStep}` : status;
  
  return (
    <div className="bg-white border rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {activeGeneration === 'pdf' ? 'Generating PDF' : 'Generating Document'}
        </span>
        <span className="text-sm text-gray-500">{displayProgress}%</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${displayProgress}%` }}
        />
      </div>
      
      <p className="text-xs text-gray-600">{displayStatus}</p>
    </div>
  );
};
```

### 4. Integrate with EnhancedDocumentViewer (Priority: Medium)

**File**: `src/electron/renderer/src/components/EnhancedDocumentViewer.tsx`

Update PDF generation to use context:

```typescript
const EnhancedDocumentViewer: React.FC<Props> = ({ /* props */ }) => {
  const { startPDFGeneration } = useBackgroundGeneration();
  const { generatePDF, isGenerating, error } = usePDFGeneration();
  
  const handleGeneratePDF = useCallback(async () => {
    const requestId = uuidv4();
    
    // Start progress tracking
    startPDFGeneration(documentType, requestId);
    
    try {
      await generatePDF(documentContent, documentType);
    } catch (error) {
      // Error handling already done by context
    }
  }, [documentContent, documentType, generatePDF, startPDFGeneration]);
  
  // Rest of component...
};
```

### 5. Add Progress Persistence (Priority: Low)

**File**: Update `BackgroundGenerationContext.tsx`

Add localStorage persistence for progress state:

```typescript
// Save progress to localStorage on updates
useEffect(() => {
  if (pdfGenerationStatus.isGenerating) {
    localStorage.setItem('pdf-generation-progress', JSON.stringify({
      progress: pdfGenerationStatus.progress,
      step: pdfGenerationStatus.currentStep,
      timestamp: Date.now()
    }));
  } else {
    localStorage.removeItem('pdf-generation-progress');
  }
}, [pdfGenerationStatus]);

// Restore on mount
useEffect(() => {
  const saved = localStorage.getItem('pdf-generation-progress');
  if (saved) {
    const data = JSON.parse(saved);
    // Only restore if less than 5 minutes old
    if (Date.now() - data.timestamp < 300000) {
      // Set initial state from saved data
    }
  }
}, []);
```

## Testing Requirements

### Unit Tests

1. **Context Updates**
   - Test PDF progress state management
   - Verify state transitions
   - Test error handling

2. **Hook Integration**
   - Mock IPC events
   - Verify context updates
   - Test cleanup on unmount

3. **Component Display**
   - Test progress bar updates
   - Verify status messages
   - Test switching between generation types

### Integration Tests

```typescript
// __tests__/integration/pdf-progress-integration.test.ts
describe('PDF Progress Integration', () => {
  it('should display progress in BackgroundGenerationStatus', async () => {
    // Setup component with context
    // Trigger PDF generation
    // Emit progress events
    // Verify UI updates
  });
  
  it('should handle concurrent generations', async () => {
    // Start document generation
    // Start PDF generation
    // Verify correct progress displayed
  });
});
```

## Implementation Checklist

- [ ] Extend BackgroundGenerationContext with PDF state
- [ ] Create usePDFProgressSync hook
- [ ] Update BackgroundGenerationStatus component
- [ ] Integrate with EnhancedDocumentViewer
- [ ] Add progress persistence (optional)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation

## Dependencies

- Task 6.0.2.2 (Progress reporting IPC) must be complete
- Task 6.0.3.1 (PDF generation button) must be complete

## Estimated Time

- Implementation: 2-3 hours
- Testing: 1-2 hours
- Total: 3-5 hours

## Notes

- Ensure progress updates are debounced to prevent UI flicker
- Consider adding progress history for debugging
- Progress should be cleared on document switch
- Add telemetry for progress tracking analytics 