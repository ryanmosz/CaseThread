# GUI PDF Workflow Plan

## Overview

This document outlines the PDF generation and export workflow for the CaseThread GUI application, which uses a 3-pane layout design.

## GUI Layout Structure

The application features a 3-pane design:

1. **Left Pane**: File Explorer/Document Manager
   - Browse and select documents
   - Manage document library
   - Navigate folder structure

2. **Middle Pane**: Viewer Pane
   - Display text content for editing
   - Display generated PDFs for review
   - Toggle between text and PDF views
   - Progress indicators during generation

3. **Right Pane**: Document Type Chooser
   - Select legal document type
   - Display document type information
   - Show required fields and options

## PDF Workflow

### Phase 1: Text Editing
- User selects or creates document in left pane
- Text content displayed in middle viewer pane
- User selects document type from right pane
- User edits/reviews text content

### Phase 2: PDF Generation
- User clicks "Generate PDF" button in viewer toolbar
- Progress indicators show generation steps
- PDF service generates document to buffer (in-memory)
- Viewer pane switches from text to PDF display
- PDF displayed using iframe or PDF viewer component

### Phase 3: PDF Review
- User reviews generated PDF in viewer pane
- Can switch back to text view if changes needed
- PDF metadata displayed (page count, size, etc.)
- Navigation controls for multi-page documents

### Phase 4: PDF Export
- User clicks "Export PDF to File" button
- System shows native save dialog
- User selects save location and filename
- PDF buffer written to selected file location
- Confirmation notification displayed

## Technical Implementation

### PDF Generation Service

```typescript
// Service initialization for GUI
const pdfService = PDFServiceFactory.forGUI((step, detail) => {
  updateProgressIndicator(step, detail);
});

// Generate PDF to buffer
const result = await pdfService.exportToBuffer(
  textContent,
  documentType,
  options
);
```

### Viewer Pane Component Structure

```typescript
interface ViewerPaneState {
  viewMode: 'text' | 'pdf';
  textContent: string;
  pdfBuffer: Buffer | null;
  pdfUrl: string | null;
  isGenerating: boolean;
  progress: string;
}
```

### Key Functions

1. **handleGeneratePDF()**
   - Get text content from viewer
   - Get document type from right pane
   - Call PDF service exportToBuffer()
   - Store buffer for later export
   - Create blob URL for display
   - Switch viewer to PDF mode

2. **handleExportPDF()**
   - Retrieve stored PDF buffer
   - Show native save dialog
   - Write buffer to selected file
   - Show success notification

3. **handleViewModeToggle()**
   - Switch between text and PDF views
   - Preserve both text and PDF states
   - Update toolbar buttons

## IPC Communication (Electron)

### Main Process Handlers

```typescript
// Show save dialog
ipcMain.handle('show-save-dialog', async (event, options) => {
  return dialog.showSaveDialog(options);
});

// Save file to disk
ipcMain.handle('save-file', async (event, filePath, buffer) => {
  await fs.writeFile(filePath, buffer);
  return { success: true };
});

// Generate PDF with progress
ipcMain.handle('generate-pdf', async (event, { text, docType, options }) => {
  const service = PDFServiceFactory.forGUI((step, detail) => {
    event.sender.send('pdf-progress', { step, detail });
  });
  
  const result = await service.exportToBuffer(text, docType, options);
  return {
    buffer: result.buffer,
    metadata: result.metadata,
    pageCount: result.pageCount
  };
});
```

### Renderer Process Usage

```typescript
// Generate PDF
const result = await ipcRenderer.invoke('generate-pdf', {
  text: textContent,
  docType: selectedDocumentType,
  options: { pageNumbers: true }
});

// Listen for progress updates
ipcRenderer.on('pdf-progress', (event, { step, detail }) => {
  updateProgress(step, detail);
});

// Export PDF
const { filePath } = await ipcRenderer.invoke('show-save-dialog', {
  defaultPath: 'document.pdf',
  filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
});

if (filePath) {
  await ipcRenderer.invoke('save-file', filePath, pdfBuffer);
}
```

## UI/UX Considerations

### Progress Indicators
- Show real-time progress during PDF generation
- Display steps like "Parsing document", "Formatting pages", etc.
- Use progress bar or spinner with text updates

### Error Handling
- Display user-friendly error messages
- Provide recovery options (retry, go back to text)
- Log detailed errors for debugging

### State Management
- Preserve text content when switching views
- Cache generated PDF until explicitly regenerated
- Handle unsaved changes warnings

### Toolbar Actions
- **Text Mode**: "Generate PDF" button
- **PDF Mode**: "Back to Text", "Export PDF", "Print" buttons
- Disable buttons during operations

## Benefits of Buffer-Based Approach

1. **Preview Before Save**: Users can review PDF before committing to file
2. **Multiple Exports**: Can save same PDF multiple times/locations
3. **Memory Efficient**: Single buffer serves both display and export
4. **Flexible Storage**: Can later add cloud upload, email, etc.
5. **Better UX**: No temporary files or cleanup needed

## Integration with Existing Features

### Document Type Selection (Right Pane)
- Selected type passed to PDF service
- Type determines formatting rules
- Type info displayed to user

### File Management (Left Pane)
- Generated PDFs can be saved back to document library
- Track which texts have been converted to PDF
- Show PDF icon for documents with generated PDFs

### Multi-Document Support
- Each document maintains its own state
- Switch between documents preserves view mode
- Batch PDF generation possible

## Performance Considerations

1. **Buffer Size Limits**: Monitor memory usage for large PDFs
2. **Generation Speed**: Show accurate progress for long documents
3. **View Switching**: Instant toggle between text/PDF views
4. **Caching**: Consider caching generated PDFs per session

## Testing Requirements

1. **Unit Tests**: PDF service integration
2. **Component Tests**: Viewer pane state management
3. **E2E Tests**: Full workflow from text to saved PDF
4. **Error Tests**: Network issues, file permissions, etc.

## Future Enhancements

1. **PDF Annotations**: Add notes to generated PDFs
2. **Batch Export**: Export multiple PDFs at once
3. **Cloud Integration**: Save directly to cloud storage
4. **Email Integration**: Send PDF via email
5. **Print Support**: Direct printing from viewer

## Summary

The PDF workflow leverages the modularized PDF service to provide a seamless experience:

1. ✅ In-memory PDF generation with progress
2. ✅ Preview in viewer before saving
3. ✅ Export to user-selected location
4. ✅ Full integration with 3-pane GUI
5. ✅ Clean separation of concerns

This design provides maximum flexibility while maintaining a simple, intuitive user experience. 