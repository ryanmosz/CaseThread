# Task 6.0.3.4 - Add Export PDF Button

## Overview
Add a dedicated "Export PDF" button to the EnhancedDocumentViewer toolbar that allows users to save the generated PDF to their local file system. This completes the PDF workflow by providing a way to save the generated document after preview.

## Requirements

### Functional Requirements
1. Add "Export PDF" button to toolbar
2. Only enable when PDF has been generated
3. Open system save dialog with appropriate filename
4. Save PDF with correct extension and metadata
5. Show success/error feedback after save
6. Remember last save location (if possible)
7. Suggest intelligent filename based on document

### Technical Requirements
1. Use PDF export IPC handler already created
2. Generate appropriate default filename
3. Handle save dialog responses
4. Provide user feedback for save operations
5. Handle errors gracefully

## Implementation Details

### 1. Add Export PDF Hook

Create a hook to handle PDF export functionality:

```typescript
// src/electron/renderer/src/hooks/usePDFExport.ts
import { useState, useCallback } from 'react';
import { PDFExportRequest } from '../../../../types/pdf-ipc';

export interface UsePDFExportResult {
  exportPDF: (buffer: ArrayBuffer, filename: string) => Promise<void>;
  isExporting: boolean;
  error: string | null;
}

export const usePDFExport = (): UsePDFExportResult => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportPDF = useCallback(async (buffer: ArrayBuffer, filename: string) => {
    setIsExporting(true);
    setError(null);

    try {
      const request: PDFExportRequest = {
        buffer: Buffer.from(buffer),
        defaultFilename: filename,
        options: {
          title: 'Save PDF Document',
          filters: [
            { name: 'PDF Documents', extensions: ['pdf'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        }
      };

      const response = await window.electronAPI.pdf.export(request);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Export failed');
      }

      // Show success toast
      if (response.data?.savedPath) {
        addToast({
          title: 'PDF Exported',
          description: `Saved to ${response.data.savedPath}`,
          color: 'success'
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export PDF';
      setError(errorMessage);
      addToast({
        title: 'Export Failed',
        description: errorMessage,
        color: 'danger'
      });
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    exportPDF,
    isExporting,
    error
  };
};
```

### 2. Update EnhancedDocumentViewer

Add export functionality to the component:

```typescript
// Add to imports
import { usePDFExport } from '../hooks/usePDFExport';

// Add export hook
const { exportPDF, isExporting } = usePDFExport();

// Store PDF buffer reference
const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);

// Update PDF generation to store buffer
useEffect(() => {
  const { pdfBlobUrl, pdfBuffer: buffer } = generatePDFResult || {};
  if (buffer) {
    setPdfBuffer(buffer);
  }
}, [generatePDFResult]);

// Clear buffer when document changes
useEffect(() => {
  setPdfBuffer(null);
}, [documentPath]);

// Generate intelligent filename
const generatePDFFilename = useCallback(() => {
  if (!documentName) return 'document.pdf';
  
  // Remove extension and add timestamp
  const baseName = documentName.replace(/\.[^/.]+$/, '');
  const timestamp = new Date().toISOString().split('T')[0];
  const documentType = detectDocumentType(documentName);
  
  // Format: DocumentName_Type_YYYY-MM-DD.pdf
  return `${baseName}_${documentType}_${timestamp}.pdf`;
}, [documentName]);

// Handle export
const handleExportPDF = async () => {
  if (!pdfBuffer) {
    addToast({
      title: 'No PDF to export',
      description: 'Please generate a PDF first',
      color: 'danger'
    });
    return;
  }

  const filename = generatePDFFilename();
  await exportPDF(pdfBuffer, filename);
};
```

### 3. Add Export Button to Toolbar

```typescript
// Export icon
const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// In toolbar, after Generate PDF button
<Button
  variant="flat"
  size="sm"
  color="primary"
  isLoading={isExporting}
  isDisabled={!pdfBuffer || isExporting}
  onClick={handleExportPDF}
  startContent={!isExporting && <DownloadIcon />}
>
  {isExporting ? 'Exporting...' : 'Export PDF'}
</Button>
```

### 4. Update PDF Generation Hook

Modify hook to return the buffer:

```typescript
// In usePDFGeneration.ts
export interface UsePDFGenerationResult {
  generatePDF: (content: string, documentType: DocumentType) => Promise<void>;
  isGenerating: boolean;
  progress: PDFProgressUpdate | null;
  error: string | null;
  pdfBlobUrl: string | null;
  pdfBuffer: ArrayBuffer | null;
  pdfMetadata: PDFMetadata | null;
  cancelGeneration: () => void;
  clearPDF: () => void;
}

// Add buffer state
const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);

// Store buffer when generating
if (response.data?.buffer) {
  // Store the buffer
  setPdfBuffer(response.data.buffer);
  
  // Create blob for display
  const blob = new Blob([response.data.buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  setPdfBlobUrl(url);
}

// Clear buffer in clearPDF
const clearPDF = useCallback(() => {
  if (pdfBlobUrl) {
    URL.revokeObjectURL(pdfBlobUrl);
    setPdfBlobUrl(null);
  }
  setPdfBuffer(null);
  setPdfMetadata(null);
}, [pdfBlobUrl]);

// Return buffer in result
return {
  generatePDF,
  isGenerating,
  progress,
  error,
  pdfBlobUrl,
  pdfBuffer,
  pdfMetadata,
  cancelGeneration,
  clearPDF
};
```

### 5. Update Export Dropdown

Also add PDF export option to existing export dropdown:

```typescript
// In the existing Export dropdown menu
<DropdownItem
  key="pdf"
  onClick={handleExportPDF}
  isDisabled={!pdfBuffer || isExporting}
  startContent={<DownloadIcon />}
>
  Export as PDF
</DropdownItem>
```

### 6. Add Keyboard Shortcut

Implement Ctrl+Shift+S for PDF export:

```typescript
// Add to keyboard shortcuts effect
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Existing Ctrl+S for save...
    
    // Ctrl+Shift+S for PDF export
    if (event.ctrlKey && event.shiftKey && event.key === 's') {
      event.preventDefault();
      if (pdfBuffer && !isExporting) {
        handleExportPDF();
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [pdfBuffer, isExporting, handleExportPDF]);
```

## Testing Approach

1. **Unit Tests**
   - Test filename generation logic
   - Test export request formatting
   - Test error handling
   - Test button state management

2. **Integration Tests**
   - Test IPC communication for export
   - Test save dialog interaction
   - Test success/error feedback
   - Test keyboard shortcuts

3. **Manual Testing**
   - Export PDFs to various locations
   - Test filename suggestions
   - Test cancel in save dialog
   - Verify file is saved correctly
   - Test on different OS (Windows/Mac/Linux)

## Success Criteria

✅ Export button visible in toolbar
✅ Button disabled until PDF generated
✅ Save dialog opens with suggested filename
✅ PDF saves to selected location
✅ Success toast shows with file path
✅ Error handling for save failures
✅ Keyboard shortcut works (Ctrl+Shift+S)
✅ Export option in dropdown menu

## Notes

- Consider adding bulk export in future
- May want to add export presets (e.g., print-ready, web-optimized)
- Could add export history
- Consider automatic save option
- May want to add email as attachment feature