# Task 6.0.3.2 - Implement View Mode Toggle

## Overview
Add a toggle button to the EnhancedDocumentViewer that allows users to switch between text/markdown view and PDF preview view. This enables users to see both the source content and the generated PDF without leaving the viewer.

## Requirements

### Functional Requirements
1. Add view mode toggle button to toolbar
2. Support two view modes: "Text" and "PDF"
3. Show text/markdown editor in Text mode
4. Show PDF preview in PDF mode
5. Preserve scroll position when switching modes
6. Only enable PDF mode when a PDF has been generated
7. Clear PDF view when switching documents

### Technical Requirements
1. Use state management for current view mode
2. Conditionally render content based on mode
3. Integrate with existing PDF generation state
4. Handle memory cleanup for PDF blob URLs
5. Update button states based on available content

## Implementation Details

### 1. Update EnhancedDocumentViewer Component

Add view mode state and toggle functionality:

```typescript
// Add to imports
import { ViewModeType } from '../../../types/pdf';

// Add to component state
const [viewMode, setViewMode] = useState<ViewModeType>('text');
const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

// Add cleanup effect
useEffect(() => {
  return () => {
    // Clean up blob URL when component unmounts
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
    }
  };
}, []);

// Update cleanup when switching documents
useEffect(() => {
  // Clean up previous PDF when document changes
  if (pdfBlobUrl) {
    URL.revokeObjectURL(pdfBlobUrl);
    setPdfBlobUrl(null);
  }
  setViewMode('text'); // Reset to text view
}, [documentPath]);
```

### 2. Update PDF Generation Hook

Modify the hook to return the blob URL instead of opening in new window:

```typescript
// In usePDFGeneration.ts
export interface UsePDFGenerationResult {
  generatePDF: (content: string, documentType: DocumentType) => Promise<void>;
  isGenerating: boolean;
  progress: PDFProgressUpdate | null;
  error: string | null;
  pdfBlobUrl: string | null;
  cancelGeneration: () => void;
  clearPDF: () => void;
}

// Add state
const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

// Update generatePDF callback
if (response.data?.buffer) {
  // Create a blob from the buffer
  const blob = new Blob([response.data.buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  setPdfBlobUrl(url);
  
  console.log('PDF generated successfully, buffer size:', response.data.buffer.byteLength);
}

// Add clearPDF function
const clearPDF = useCallback(() => {
  if (pdfBlobUrl) {
    URL.revokeObjectURL(pdfBlobUrl);
    setPdfBlobUrl(null);
  }
}, [pdfBlobUrl]);

// Return in hook result
return {
  generatePDF,
  isGenerating,
  progress,
  error,
  pdfBlobUrl,
  cancelGeneration,
  clearPDF
};
```

### 3. Add View Mode Toggle Button

Create toggle button component:

```typescript
// View mode icons
const TextIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const ViewIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

// In toolbar section
<ButtonGroup>
  <Button
    variant={viewMode === 'text' ? 'solid' : 'flat'}
    size="sm"
    color={viewMode === 'text' ? 'primary' : 'default'}
    onClick={() => setViewMode('text')}
    startContent={<TextIcon />}
    isDisabled={!content}
  >
    Text
  </Button>
  <Button
    variant={viewMode === 'pdf' ? 'solid' : 'flat'}
    size="sm"
    color={viewMode === 'pdf' ? 'primary' : 'default'}
    onClick={() => setViewMode('pdf')}
    startContent={<ViewIcon />}
    isDisabled={!pdfBlobUrl}
  >
    PDF
  </Button>
</ButtonGroup>
```

### 4. Conditional Content Rendering

Update the content area to show appropriate view:

```typescript
// In the document content section
<div className="flex-1 overflow-hidden">
  {viewMode === 'text' ? (
    // Existing text/markdown view
    showDiff && suggestedContent && content ? (
      <DiffViewer ... />
    ) : (
      <ScrollShadow className="h-full overflow-auto">
        <div className="p-6">
          {isFormData ? (
            // Form data view
          ) : (
            <Textarea ... />
          )}
        </div>
      </ScrollShadow>
    )
  ) : (
    // PDF view
    <div className="h-full w-full">
      {pdfBlobUrl ? (
        <iframe
          src={pdfBlobUrl}
          className="w-full h-full border-0"
          title="PDF Preview"
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-foreground/60">No PDF generated yet</p>
        </div>
      )}
    </div>
  )}
</div>
```

### 5. Update Success Handler

When PDF generation succeeds, automatically switch to PDF view:

```typescript
// After successful PDF generation
const handleGeneratePDF = async () => {
  // ... existing code ...
  
  try {
    await generatePDF(editedContent, documentType);
    
    // Switch to PDF view after successful generation
    setViewMode('pdf');
    
    addToast({
      title: 'PDF Generated',
      description: 'Your PDF has been generated successfully',
      color: 'success'
    });
  } catch (err) {
    // Error is handled by the hook
  }
};
```

### 6. Add Type Definition

Add ViewModeType to types:

```typescript
// In src/types/pdf.ts or appropriate types file
export type ViewModeType = 'text' | 'pdf';
```

## Testing Approach

1. **Unit Tests**
   - Test view mode toggle state changes
   - Test conditional rendering based on mode
   - Test cleanup of blob URLs
   - Test button disabled states

2. **Integration Tests**
   - Test switching between views preserves content
   - Test PDF generation enables PDF view
   - Test document switching resets view mode
   - Test memory cleanup on unmount

3. **Manual Testing**
   - Generate PDF and toggle between views
   - Verify PDF displays correctly in iframe
   - Test switching documents clears PDF view
   - Monitor browser memory for blob URL cleanup

## Success Criteria

✅ View mode toggle buttons visible in toolbar
✅ Can switch between text and PDF views
✅ PDF view disabled until PDF is generated
✅ PDF displays correctly in iframe
✅ Switching documents resets to text view
✅ Blob URLs are properly cleaned up
✅ Smooth transitions between views
✅ Buttons show active state correctly

## Notes

- Consider adding keyboard shortcuts (e.g., Ctrl+Shift+V for view toggle)
- May want to add split view option in future (show both side-by-side)
- Consider preserving view mode in local storage per document
- Ensure PDF iframe has proper security attributes
- Monitor performance with large PDFs