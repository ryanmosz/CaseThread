# PRD - Parent Task 6.0: GUI Integration with PDF Service

## Introduction/Overview

This task integrates the modularized PDF generation service into the Electron GUI, enabling users to generate, preview, and export PDF documents directly from the application's viewer pane. The integration leverages Developer G's recent GUI enhancements, including the BackgroundGenerationStatus component and the quality pipeline, to provide a seamless user experience for creating professional legal documents in PDF format.

The implementation follows a preview-before-export workflow where documents are generated to memory buffers, displayed for review, and then exported to user-selected file locations. This approach maximizes user control and prevents generation of unwanted files.

## Goals

1. **Enable PDF Generation from GUI**: Allow users to generate PDFs directly from the document viewer without using the CLI
2. **Implement Preview Workflow**: Display generated PDFs in the viewer before saving to disk
3. **Provide Progress Feedback**: Use BackgroundGenerationStatus component to show real-time generation progress
4. **Integrate with Quality Pipeline**: Generate PDFs after documents pass through the quality improvement pipeline
5. **Maintain Smooth UX**: Ensure responsive UI during long-running PDF generation operations
6. **Support All Document Types**: Enable PDF generation for all 8 legal document types

## User Stories

1. **As a legal professional**, I want to generate a PDF from my reviewed document, so that I can share it with clients in a professional format.

2. **As a user**, I want to preview the PDF before saving it to disk, so that I can verify formatting and content are correct.

3. **As a user**, I want to see progress updates during PDF generation, so that I know the system is working and how long to wait.

4. **As a power user**, I want to generate PDFs after quality pipeline enhancement, so that my documents meet the highest professional standards.

5. **As a user**, I want to switch between text and PDF views, so that I can compare the source document with the generated output.

## Functional Requirements

1. **PDF Generation Button**: Add a "Generate PDF" button to the EnhancedDocumentViewer toolbar that initiates PDF generation
2. **Progress Display**: Use BackgroundGenerationStatus component to show PDF generation progress with meaningful stages
3. **Buffer-Based Generation**: Generate PDFs to memory buffers using `PDFServiceFactory.forGUI()` with progress callbacks
4. **PDF Preview Display**: Display generated PDFs in the viewer pane using an appropriate rendering method
5. **View Mode Switching**: Allow users to toggle between text and PDF views of the same document
6. **Export to File**: Provide "Export PDF to File" functionality using Electron's native save dialog
7. **IPC Communication**: Implement secure IPC handlers for PDF generation in the main process
8. **Error Handling**: Display user-friendly error messages for generation failures
9. **State Management**: Maintain PDF buffer in component state for multiple exports
10. **Quality Integration**: Optionally generate PDFs after quality pipeline approval
11. **Metadata Display**: Show PDF metadata (page count, size, generation time) in the UI
12. **Resource Cleanup**: Properly clean up blob URLs and memory when switching documents

## Non-Goals (Out of Scope)

1. **PDF Editing**: This task does not include PDF annotation or editing capabilities
2. **Batch Generation**: Single document PDF generation only, no batch processing
3. **Cloud Storage**: No direct cloud upload functionality
4. **PDF Signing**: No digital signature capabilities
5. **Custom PDF Viewer**: Use existing solutions (iframe or library), don't build custom viewer
6. **Print Functionality**: Direct printing from PDF view is not included
7. **PDF/A Format**: Standard PDF format only, no archival format support
8. **Template Modification**: No changes to existing PDF templates or formatting

## Design Considerations

### UI/UX Design
- The "Generate PDF" button should be prominently placed in the viewer toolbar
- Progress indicators should show meaningful stages ("Parsing document", "Formatting pages", etc.)
- PDF preview should maintain the same dimensions as the text view for consistency
- Export button should only be enabled after successful PDF generation
- Error states should provide clear recovery options

### Technical Architecture
- PDF generation occurs in the main process via IPC for security
- Buffer-based approach prevents temporary file creation
- Blob URLs display PDFs in iframe or PDF viewer component
- Component state manages view modes and PDF buffers
- Progress callbacks update BackgroundGenerationStatus component

## Technical Considerations

### Dependencies
- Existing: PDFKit, React, Electron, TypeScript
- May need: PDF.js for browser-based PDF rendering (if iframe approach has limitations)

### Performance
- PDF generation for large documents may take 10-30 seconds
- Memory usage increases with PDF buffer storage
- Blob URLs must be revoked to prevent memory leaks

### Security
- All file operations occur in main process
- Path validation prevents directory traversal
- IPC channels use specific permissions

### Integration Points
- PDFServiceFactory.forGUI() for progress callbacks
- BackgroundGenerationStatus for progress display
- EnhancedDocumentViewer for UI integration
- Quality pipeline for document enhancement
- IPC handlers for main/renderer communication

## Success Metrics

1. **Generation Success Rate**: 95%+ successful PDF generations without errors
2. **Performance**: PDF generation completes within 30 seconds for typical documents
3. **User Satisfaction**: Users can preview and export PDFs without confusion
4. **Memory Efficiency**: No memory leaks from blob URLs or buffers
5. **Progress Accuracy**: Progress indicators reflect actual generation stages
6. **Error Recovery**: Users can retry failed generations without restarting app

## Open Questions

1. **PDF Viewer Choice**: Should we use iframe, PDF.js, or another PDF rendering solution?
   - **Recommendation**: Start with iframe for simplicity, evaluate PDF.js if needed

2. **Progress Granularity**: How detailed should progress updates be?
   - **Recommendation**: Show major stages (parsing, formatting, rendering) with percentage

3. **Buffer Size Limits**: Should we limit PDF size to prevent memory issues?
   - **Recommendation**: Warn users for PDFs over 10MB but allow generation

4. **View Persistence**: Should PDF view persist when switching documents?
   - **Recommendation**: Return to text view when switching documents

5. **Quality Pipeline Integration**: Should PDF generation always run after quality pipeline?
   - **Recommendation**: Make it optional via user preference or button variant 