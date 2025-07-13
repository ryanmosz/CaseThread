# PDF Viewer Integration Design Document

## Task 6.0.1.1 - Design PDF viewer integration approach

### Executive Summary

This document outlines the design approach for integrating PDF viewing capabilities into the CaseThread Electron GUI application. The integration will enable users to generate PDFs from legal documents, preview them within the application, and export them to the file system.

### Current Architecture Analysis

#### EnhancedDocumentViewer Component
- **State Management**: Uses React hooks (useState, useEffect) for local state
- **Content Display**: Renders markdown content in a scrollable view
- **Toolbar Structure**: Contains save button, export dropdown, and diff toggle
- **Error Handling**: Implements error boundaries and user-friendly error messages
- **Integration Points**: 
  - Progress display through generationProgress and generationStage props
  - Content saving through onContentSaved callback
  - Diff viewing for suggested content changes

#### BackgroundGenerationStatus Component
- **Progress Tracking**: Displays elapsed time and progress percentage
- **State Management**: Uses BackgroundGenerationContext for centralized state
- **UI Features**: Supports minimized/expanded views
- **Cancellation**: Provides cancel button for long-running operations

### PDF Display Options Evaluation

#### Option A: Native Browser PDF Display (iframe/embed) ✅ RECOMMENDED
```typescript
<iframe 
  src={pdfBlobUrl} 
  width="100%" 
  height="100%" 
  style={{ border: 'none' }}
  title="PDF Preview"
/>
```

**Pros:**
- Zero additional dependencies
- Native browser PDF controls (zoom, navigation, print)
- Excellent cross-platform support
- Minimal implementation complexity
- Built-in accessibility features

**Cons:**
- Limited customization of PDF viewer UI
- Cannot add custom overlays or annotations
- Browser-dependent feature set

**Decision**: Start with iframe approach for MVP, evaluate enhancement needs later.

#### Option B: PDF.js Integration
**Pros:**
- Full control over viewer UI
- Custom toolbar and navigation
- Annotation support possible
- Consistent experience across browsers

**Cons:**
- Large dependency (>2MB)
- Complex implementation
- Performance overhead
- Maintenance burden

#### Option C: React-PDF Library
**Pros:**
- React-friendly API
- Good TypeScript support
- Moderate customization options

**Cons:**
- Additional dependency
- Less feature-rich than PDF.js
- May have rendering issues with complex PDFs

### View Mode Architecture Design

#### State Structure
```typescript
interface PDFViewerState {
  // View mode management
  viewMode: 'text' | 'pdf' | 'split';
  
  // PDF data
  pdfBuffer: ArrayBuffer | null;
  pdfBlobUrl: string | null;
  pdfMetadata: {
    pageCount: number;
    documentType: string;
    generatedAt: Date;
    fileSize: number;
    generationDuration: number;
  } | null;
  
  // Generation state
  isGenerating: boolean;
  generationProgress: number;
  generationStage: string;
  generationError: Error | null;
  
  // Export state
  lastExportPath: string | null;
  isExporting: boolean;
}
```

#### View Mode Transitions
```
text (default) → [Generate PDF] → generating → pdf
                                      ↓
                                   [Cancel] → text
                                      ↓
                                   [Error] → text (with error message)

pdf → [Toggle View] → text
    → [Export] → exporting → pdf (with success message)
```

### Component Integration Plan

#### 1. EnhancedDocumentViewer Modifications
- Add PDF generation button to toolbar
- Implement view mode toggle
- Integrate PDFViewer component
- Handle state transitions
- Add PDF-specific controls when in PDF view

#### 2. New PDFViewer Component
```typescript
interface PDFViewerProps {
  pdfBlobUrl: string;
  metadata: PDFMetadata;
  onError?: (error: Error) => void;
  onExport?: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ 
  pdfBlobUrl, 
  metadata,
  onError,
  onExport 
}) => {
  return (
    <div className="pdf-viewer-container h-full flex flex-col">
      <div className="pdf-viewer-header p-2 border-b flex items-center justify-between">
        <div className="text-sm text-foreground/60">
          {metadata.pageCount} pages • {formatFileSize(metadata.fileSize)}
        </div>
        <Button size="sm" onClick={onExport}>
          Export PDF
        </Button>
      </div>
      <iframe 
        src={pdfBlobUrl}
        className="flex-1 w-full"
        title="PDF Preview"
        onError={() => onError?.(new Error('Failed to load PDF'))}
      />
    </div>
  );
};
```

#### 3. Progress Integration with BackgroundGenerationStatus
- Use existing BackgroundGenerationContext
- Map PDF generation stages to progress updates
- Provide meaningful stage descriptions
- Support cancellation during generation

#### 4. IPC Handler Integration
- Generate PDF through IPC call to main process
- Receive progress updates via IPC events
- Handle buffer transfer efficiently
- Implement proper error handling

### Memory Management Strategy

#### Blob URL Lifecycle
```typescript
class PDFMemoryManager {
  private currentBlobUrl: string | null = null;
  
  createBlobUrl(buffer: ArrayBuffer): string {
    // Revoke existing URL first
    this.cleanup();
    
    const blob = new Blob([buffer], { type: 'application/pdf' });
    this.currentBlobUrl = URL.createObjectURL(blob);
    return this.currentBlobUrl;
  }
  
  cleanup(): void {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
  }
}
```

#### Memory Management Rules
1. Always revoke blob URLs when:
   - Component unmounts
   - User switches documents
   - New PDF is generated
   - View mode changes back to text

2. Limit PDF buffer size:
   - Warn for PDFs > 10MB
   - Consider streaming for very large PDFs
   - Implement memory usage monitoring

### UI/UX Design Specifications

#### Toolbar Button Placement
```
[Document Info] ... [Show Diff] [Save] [Generate PDF] [View: Text ▼] [Export ▼]
```

#### PDF Generation Button States
- **Idle**: "Generate PDF" with document icon
- **Generating**: Spinner with "Generating..."
- **Error**: Red text "Generation Failed"
- **Success**: Brief green checkmark before returning to idle

#### View Mode Toggle
- Dropdown with options: Text, PDF
- Disabled when no PDF is available
- Keyboard shortcut: Ctrl/Cmd + Shift + P

### Error Handling Strategy

#### Generation Errors
```typescript
enum PDFErrorType {
  GENERATION_FAILED = 'GENERATION_FAILED',
  MEMORY_LIMIT = 'MEMORY_LIMIT',
  INVALID_CONTENT = 'INVALID_CONTENT',
  IPC_ERROR = 'IPC_ERROR',
}

interface PDFError {
  type: PDFErrorType;
  message: string;
  recoverable: boolean;
  retryAction?: () => void;
}
```

#### Error Recovery
- Display clear error messages
- Provide retry option for recoverable errors
- Log detailed errors for debugging
- Return to text view on fatal errors

### Performance Considerations

1. **PDF Generation**:
   - Expected duration: 10-30 seconds
   - Progress updates every 1-2 seconds
   - Cancellable operation

2. **Memory Usage**:
   - Monitor buffer size
   - Implement cleanup on idle
   - Consider pagination for large PDFs

3. **UI Responsiveness**:
   - Generation happens in main process
   - UI remains responsive
   - Progress updates via IPC

### Future Enhancement Considerations

1. **PDF.js Migration Path**:
   - Component interface remains stable
   - Only internal implementation changes
   - Progressive enhancement possible

2. **Additional Features**:
   - PDF search functionality
   - Page thumbnails
   - Zoom controls
   - Print optimization

3. **Split View Mode**:
   - Side-by-side text and PDF
   - Synchronized scrolling
   - Useful for verification

### Implementation Roadmap

1. **Phase 1**: Basic Integration (MVP)
   - iframe-based viewer
   - Generate and preview
   - Simple export

2. **Phase 2**: Enhanced UX
   - Better progress reporting
   - Error recovery
   - Keyboard shortcuts

3. **Phase 3**: Advanced Features
   - Split view option
   - PDF.js evaluation
   - Performance optimization

### Technical Decisions

1. **PDF Display Method**: Native iframe (MVP)
2. **State Management**: Component state with Context for progress
3. **Memory Strategy**: Active cleanup with monitoring
4. **Error Approach**: User-friendly with recovery options
5. **Progress Integration**: Reuse BackgroundGenerationStatus

### Success Criteria

- [ ] PDF display approach documented and approved
- [ ] Component architecture defined
- [ ] State management strategy clear
- [ ] Memory management plan established
- [ ] Error handling comprehensive
- [ ] Integration points identified
- [ ] Future enhancement path defined 