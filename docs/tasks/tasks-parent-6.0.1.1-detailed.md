# Task 6.0.1.1 - Design PDF viewer integration approach

## Description
Design the integration approach for displaying PDFs within the EnhancedDocumentViewer component. This involves determining how to handle PDF rendering, view mode switching, and integration with the existing document viewing architecture.

## Implementation Steps

### 1. Analyze Current Viewer Architecture
Review the existing EnhancedDocumentViewer component to understand:
- Current state management approach
- How document content is displayed
- Existing toolbar and control mechanisms
- Integration with BackgroundGenerationStatus

### 2. Evaluate PDF Display Options

#### Option A: Native Browser PDF Display (iframe/embed)
```typescript
// Pros: Simple, native browser support
// Cons: Limited control over styling/features
<iframe 
  src={pdfBlobUrl} 
  width="100%" 
  height="100%" 
  style={{ border: 'none' }}
/>
```

#### Option B: PDF.js Integration
```typescript
// Pros: Full control, custom features
// Cons: Additional dependency, more complex
import * as pdfjsLib from 'pdfjs-dist';
// Custom PDF viewer component
```

#### Option C: React-PDF Library
```typescript
// Pros: React-friendly, good features
// Cons: Another dependency
import { Document, Page } from 'react-pdf';
```

### 3. Design View Mode Architecture
Create a view mode system that supports:
- Text view (current markdown display)
- PDF view (generated PDF display)
- Split view (both side-by-side) - optional enhancement

### 4. Design State Management
```typescript
interface PDFViewerState {
  viewMode: 'text' | 'pdf' | 'split';
  pdfBuffer: ArrayBuffer | null;
  pdfBlobUrl: string | null;
  pdfMetadata: {
    pageCount: number;
    documentType: string;
    generatedAt: Date;
    fileSize: number;
  } | null;
  isGenerating: boolean;
  error: Error | null;
}
```

### 5. Design Component Integration
Plan how PDF viewer will integrate with:
- EnhancedDocumentViewer (parent component)
- BackgroundGenerationStatus (progress display)
- Toolbar (view mode toggle, export button)
- IPC handlers (for PDF generation)

## Code Examples

### View Mode Toggle Design
```typescript
// In EnhancedDocumentViewer toolbar
<ToggleGroup 
  type="single" 
  value={viewMode} 
  onValueChange={setViewMode}
>
  <ToggleGroupItem value="text" aria-label="Text view">
    <FileTextIcon />
  </ToggleGroupItem>
  <ToggleGroupItem value="pdf" aria-label="PDF view" disabled={!pdfBlobUrl}>
    <FileIcon />
  </ToggleGroupItem>
</ToggleGroup>
```

### PDF Display Component Structure
```typescript
interface PDFViewerProps {
  pdfBlobUrl: string;
  onPageChange?: (page: number) => void;
  onError?: (error: Error) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfBlobUrl, onPageChange, onError }) => {
  // Implementation based on chosen approach
  return (
    <div className="pdf-viewer-container">
      {/* PDF rendering here */}
    </div>
  );
};
```

### State Management Integration
```typescript
// In EnhancedDocumentViewer
const [pdfState, setPdfState] = useState<PDFViewerState>({
  viewMode: 'text',
  pdfBuffer: null,
  pdfBlobUrl: null,
  pdfMetadata: null,
  isGenerating: false,
  error: null
});

// Cleanup on unmount or document change
useEffect(() => {
  return () => {
    if (pdfState.pdfBlobUrl) {
      URL.revokeObjectURL(pdfState.pdfBlobUrl);
    }
  };
}, [pdfState.pdfBlobUrl]);
```

## File Changes

### Files to Modify
1. `src/electron/renderer/src/components/EnhancedDocumentViewer.tsx`
   - Add PDF viewer integration
   - Add view mode state
   - Add toolbar controls

2. `src/types/index.ts` or `src/shared/types.ts`
   - Add PDFViewerState interface
   - Add view mode types

### New Files to Create
1. `src/electron/renderer/src/components/PDFViewer.tsx`
   - Dedicated PDF display component

2. `src/electron/renderer/src/hooks/usePDFGeneration.ts`
   - Custom hook for PDF generation logic

## Testing Approach

### Design Review Testing
1. Create mockups/wireframes showing:
   - Text view with PDF generation button
   - PDF view with navigation controls
   - Transition between views
   - Error states

2. Validate design decisions:
   - Performance implications of chosen approach
   - Browser compatibility
   - Memory management for large PDFs

### Prototype Testing
1. Create minimal prototype with chosen PDF display method
2. Test with sample PDFs of various sizes
3. Verify cleanup of blob URLs
4. Test view mode transitions

## Definition of Done

- [ ] PDF display approach selected and documented
- [ ] View mode architecture designed
- [ ] State management structure defined
- [ ] Component integration plan documented
- [ ] Mockups/wireframes created
- [ ] Technical decision document created
- [ ] Prototype validated chosen approach
- [ ] Design reviewed with team/stakeholders

## Common Pitfalls

1. **Memory Leaks**: Forgetting to revoke blob URLs
   ```typescript
   // Always cleanup blob URLs
   URL.revokeObjectURL(blobUrl);
   ```

2. **Large PDF Handling**: Not considering performance for large documents
   - Implement pagination or lazy loading
   - Consider virtual scrolling for PDF.js

3. **Browser Compatibility**: Not testing across different browsers
   - Test PDF display in Chrome, Firefox, Safari
   - Have fallback for unsupported browsers

4. **State Synchronization**: View mode and PDF availability mismatch
   - Disable PDF view when no PDF is available
   - Handle loading states properly

5. **Error Handling**: Not planning for PDF generation failures
   - Design clear error messages
   - Provide retry mechanisms

## Notes

- Consider starting with iframe approach for MVP, then enhance later
- Keep PDF viewer component loosely coupled for easy replacement
- Plan for future enhancements (annotations, search, etc.)
- Document the chosen approach thoroughly for other developers 