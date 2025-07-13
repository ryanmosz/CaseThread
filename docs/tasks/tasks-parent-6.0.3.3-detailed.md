# Task 6.0.3.3 - Create PDF Metadata Display

## Overview
Add a metadata panel to the EnhancedDocumentViewer that displays information about the generated PDF, including file size, page count, generation time, and document properties. This provides users with useful information about their generated documents.

## Requirements

### Functional Requirements
1. Display PDF metadata in a collapsible panel
2. Show file size, page count, generation time
3. Display document type and formatting options used
4. Show signature block information if present
5. Include generation timestamp
6. Allow copying metadata to clipboard
7. Update metadata when new PDF is generated

### Technical Requirements
1. Extract metadata from PDF generation response
2. Store metadata in component state
3. Format data for user-friendly display
4. Implement copy-to-clipboard functionality
5. Handle metadata for different document types

## Implementation Details

### 1. Update PDF Metadata Type

Extend the existing metadata interface:

```typescript
// In src/types/pdf-ipc.ts
export interface PDFMetadata {
  pageCount: number;
  fileSize: number;
  documentType: string;
  generatedAt: Date;
  generationTime: number;
  hasSignatureBlocks: boolean;
  formFields: string[];
  // Additional metadata
  fontSize?: number;
  lineSpacing?: string;
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  signatureBlockCount?: number;
  warnings?: string[];
}
```

### 2. Add Metadata State to Component

```typescript
// In EnhancedDocumentViewer
const [pdfMetadata, setPdfMetadata] = useState<PDFMetadata | null>(null);
const [showMetadata, setShowMetadata] = useState(false);

// Update when PDF is generated
useEffect(() => {
  if (pdfBlobUrl && generatePDFResult?.metadata) {
    setPdfMetadata(generatePDFResult.metadata);
  }
}, [pdfBlobUrl, generatePDFResult]);

// Clear metadata when document changes
useEffect(() => {
  setPdfMetadata(null);
  setShowMetadata(false);
}, [documentPath]);
```

### 3. Create Metadata Panel Component

```typescript
// Metadata icon
const InfoIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Metadata panel component
const PDFMetadataPanel = ({ 
  metadata, 
  isOpen, 
  onClose 
}: { 
  metadata: PDFMetadata; 
  isOpen: boolean;
  onClose: () => void;
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const copyMetadata = () => {
    const metadataText = `
PDF Metadata
============
Document Type: ${metadata.documentType}
Generated: ${new Date(metadata.generatedAt).toLocaleString()}
Generation Time: ${formatDuration(metadata.generationTime)}
File Size: ${formatFileSize(metadata.fileSize)}
Page Count: ${metadata.pageCount}
Signature Blocks: ${metadata.hasSignatureBlocks ? `Yes (${metadata.signatureBlockCount || 0})` : 'No'}
${metadata.fontSize ? `Font Size: ${metadata.fontSize}pt` : ''}
${metadata.lineSpacing ? `Line Spacing: ${metadata.lineSpacing}` : ''}
${metadata.warnings?.length ? `\nWarnings:\n${metadata.warnings.join('\n')}` : ''}
    `.trim();

    navigator.clipboard.writeText(metadataText);
    addToast({
      title: 'Metadata Copied',
      description: 'PDF metadata copied to clipboard',
      color: 'success'
    });
  };

  if (!isOpen) return null;

  return (
    <Card className="absolute top-16 right-4 w-80 z-50 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <h4 className="text-sm font-semibold">PDF Information</h4>
        <Button
          size="sm"
          variant="light"
          isIconOnly
          onClick={onClose}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </CardHeader>
      <CardBody className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-foreground/60">Document Type:</span>
            <span className="font-medium capitalize">
              {metadata.documentType.replace(/-/g, ' ')}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-foreground/60">File Size:</span>
            <span className="font-medium">{formatFileSize(metadata.fileSize)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-foreground/60">Page Count:</span>
            <span className="font-medium">{metadata.pageCount} pages</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-foreground/60">Generated:</span>
            <span className="font-medium">
              {new Date(metadata.generatedAt).toLocaleTimeString()}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-foreground/60">Generation Time:</span>
            <span className="font-medium">{formatDuration(metadata.generationTime)}</span>
          </div>
          
          {metadata.hasSignatureBlocks && (
            <div className="flex justify-between">
              <span className="text-foreground/60">Signature Blocks:</span>
              <span className="font-medium">{metadata.signatureBlockCount || 'Yes'}</span>
            </div>
          )}
        </div>

        {metadata.warnings && metadata.warnings.length > 0 && (
          <div className="mt-3 p-2 bg-warning/10 rounded-md">
            <p className="text-xs font-medium text-warning mb-1">Warnings:</p>
            <ul className="text-xs text-foreground/60 space-y-1">
              {metadata.warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        <Button
          size="sm"
          variant="flat"
          className="w-full mt-3"
          onClick={copyMetadata}
          startContent={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          }
        >
          Copy Metadata
        </Button>
      </CardBody>
    </Card>
  );
};
```

### 4. Add Metadata Toggle Button

Add button to toolbar to show/hide metadata panel:

```typescript
// In toolbar section, add after PDF generation button
{pdfMetadata && (
  <Button
    variant="flat"
    size="sm"
    onClick={() => setShowMetadata(!showMetadata)}
    startContent={<InfoIcon />}
  >
    Info
  </Button>
)}
```

### 5. Update PDF Generation Hook

Ensure metadata is properly returned:

```typescript
// In usePDFGeneration hook
export interface UsePDFGenerationResult {
  generatePDF: (content: string, documentType: DocumentType) => Promise<void>;
  isGenerating: boolean;
  progress: PDFProgressUpdate | null;
  error: string | null;
  pdfBlobUrl: string | null;
  pdfMetadata: PDFMetadata | null;
  cancelGeneration: () => void;
  clearPDF: () => void;
}

// Add state
const [pdfMetadata, setPdfMetadata] = useState<PDFMetadata | null>(null);

// Update in generatePDF
if (response.data?.buffer) {
  const blob = new Blob([response.data.buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  setPdfBlobUrl(url);
  
  // Store metadata
  if (response.data.metadata) {
    setPdfMetadata(response.data.metadata);
  }
}

// Clear metadata in clearPDF
const clearPDF = useCallback(() => {
  if (pdfBlobUrl) {
    URL.revokeObjectURL(pdfBlobUrl);
    setPdfBlobUrl(null);
  }
  setPdfMetadata(null);
}, [pdfBlobUrl]);
```

### 6. Render Metadata Panel

Add the panel to the component:

```typescript
// After the main content div
{showMetadata && pdfMetadata && (
  <PDFMetadataPanel
    metadata={pdfMetadata}
    isOpen={showMetadata}
    onClose={() => setShowMetadata(false)}
  />
)}
```

## Testing Approach

1. **Unit Tests**
   - Test metadata formatting functions
   - Test copy to clipboard functionality
   - Test panel visibility toggling
   - Test metadata clearing on document change

2. **Integration Tests**
   - Test metadata extraction from PDF response
   - Test metadata display after generation
   - Test metadata updates on regeneration
   - Test warning display

3. **Manual Testing**
   - Generate PDFs and verify metadata accuracy
   - Test copy functionality across browsers
   - Verify responsive design on small screens
   - Test with different document types

## Success Criteria

✅ Metadata panel displays after PDF generation
✅ All metadata fields show correct values
✅ File size formatted appropriately
✅ Generation time shows in user-friendly format
✅ Copy to clipboard works reliably
✅ Panel can be toggled open/closed
✅ Warnings display when present
✅ Metadata clears when switching documents

## Notes

- Consider adding download statistics in future
- May want to add print metadata
- Could show compression ratio if applicable
- Consider adding metadata export as JSON
- May want persistent metadata history