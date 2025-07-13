# Task 6.0.2.3 - Add PDF Export IPC Handler

## Description
Create an IPC handler for exporting generated PDFs to the file system from the GUI. This handler will manage the save dialog, file writing, and proper error handling for PDF export operations.

## Implementation Steps

### 1. Create PDF Export Handler
```typescript
// src/electron/main/ipc/pdf-export-handler.ts
import { ipcMain, IpcMainInvokeEvent, dialog, app } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PDF_CHANNELS } from '../../constants/pdf-channels';
import {
  PDFExportRequest,
  PDFExportResponse,
  PDFExportOptions,
  PDFError,
  PDFErrorCode,
} from '../../../types/pdf-ipc';
import { createChildLogger } from '../../../utils/logger';

export class PDFExportHandler {
  private static instance: PDFExportHandler;
  private logger = createChildLogger({ service: 'PDFExportHandler' });
  
  static getInstance(): PDFExportHandler {
    if (!PDFExportHandler.instance) {
      PDFExportHandler.instance = new PDFExportHandler();
    }
    return PDFExportHandler.instance;
  }
  
  private constructor() {
    this.setupHandlers();
  }
  
  private setupHandlers(): void {
    ipcMain.handle(PDF_CHANNELS.EXPORT, this.handleExport.bind(this));
    ipcMain.handle(PDF_CHANNELS.EXPORT_SILENT, this.handleSilentExport.bind(this));
    this.logger.debug('PDF export IPC handlers registered');
  }
  
  private async handleExport(
    event: IpcMainInvokeEvent,
    request: PDFExportRequest
  ): Promise<PDFExportResponse> {
    try {
      this.validateExportRequest(request);
      
      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Save PDF Document',
        defaultPath: this.getDefaultPath(request),
        filters: [
          { name: 'PDF Documents', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['createDirectory', 'showOverwriteConfirmation']
      });
      
      if (result.canceled || !result.filePath) {
        return {
          success: false,
          error: {
            code: PDFErrorCode.CANCELLED,
            message: 'Export cancelled by user',
          }
        };
      }
      
      // Write the PDF buffer to file
      await this.writePdfToFile(result.filePath, request.buffer);
      
      return {
        success: true,
        filePath: result.filePath,
        fileName: path.basename(result.filePath),
        fileSize: request.buffer.length,
      };
      
    } catch (error) {
      return this.handleExportError(error);
    }
  }
  
  private async handleSilentExport(
    event: IpcMainInvokeEvent,
    request: PDFExportRequest
  ): Promise<PDFExportResponse> {
    try {
      this.validateExportRequest(request);
      
      if (!request.filePath) {
        throw new Error('File path is required for silent export');
      }
      
      // Ensure directory exists
      const directory = path.dirname(request.filePath);
      await fs.mkdir(directory, { recursive: true });
      
      // Write the PDF buffer to file
      await this.writePdfToFile(request.filePath, request.buffer);
      
      return {
        success: true,
        filePath: request.filePath,
        fileName: path.basename(request.filePath),
        fileSize: request.buffer.length,
      };
      
    } catch (error) {
      return this.handleExportError(error);
    }
  }
  
  private validateExportRequest(request: PDFExportRequest): void {
    if (!request.requestId || request.requestId.trim() === '') {
      throw new Error('Request ID is required');
    }
    
    if (!request.buffer || request.buffer.length === 0) {
      throw new Error('PDF buffer is empty');
    }
    
    if (request.buffer.length > 100 * 1024 * 1024) { // 100MB limit
      throw new Error('PDF buffer exceeds maximum size limit (100MB)');
    }
    
    if (request.options?.format && !['pdf', 'pdf/a'].includes(request.options.format)) {
      throw new Error(`Invalid export format: ${request.options.format}`);
    }
  }
  
  private getDefaultPath(request: PDFExportRequest): string {
    const documentsPath = app.getPath('documents');
    const defaultName = request.options?.defaultFileName || 
                       `${request.documentType}-${new Date().toISOString().split('T')[0]}.pdf`;
    
    return path.join(documentsPath, defaultName);
  }
  
  private async writePdfToFile(filePath: string, buffer: Uint8Array): Promise<void> {
    try {
      // Convert Uint8Array to Buffer if needed
      const nodeBuffer = Buffer.from(buffer);
      
      // Write with proper permissions
      await fs.writeFile(filePath, nodeBuffer, {
        mode: 0o644, // Read/write for owner, read for others
      });
      
      this.logger.info('PDF exported successfully', { 
        filePath, 
        size: buffer.length 
      });
    } catch (error) {
      this.logger.error('Failed to write PDF file', error);
      throw error;
    }
  }
  
  private handleExportError(error: any): PDFExportResponse {
    let errorCode = PDFErrorCode.EXPORT_FAILED;
    let message = 'Failed to export PDF';
    
    if (error.code === 'EACCES') {
      errorCode = PDFErrorCode.PERMISSION_DENIED;
      message = 'Permission denied to write file';
    } else if (error.code === 'ENOSPC') {
      errorCode = PDFErrorCode.DISK_FULL;
      message = 'Insufficient disk space';
    } else if (error.code === 'ENOTDIR') {
      errorCode = PDFErrorCode.INVALID_PATH;
      message = 'Invalid directory path';
    }
    
    const pdfError: PDFError = {
      code: errorCode,
      message,
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    };
    
    this.logger.error('PDF export failed', { error: pdfError });
    
    return {
      success: false,
      error: pdfError,
    };
  }
}
```

### 2. Update PDF IPC Types
```typescript
// src/types/pdf-ipc.ts - Add export types
export interface PDFExportRequest {
  requestId: string;
  buffer: Uint8Array;
  documentType: DocumentType;
  filePath?: string; // For silent export
  options?: PDFExportOptions;
}

export interface PDFExportOptions {
  defaultFileName?: string;
  format?: 'pdf' | 'pdf/a';
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
  };
}

export interface PDFExportResponse {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  error?: PDFError;
}

// Add error codes
export enum PDFErrorCode {
  // ... existing codes
  EXPORT_FAILED = 'EXPORT_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DISK_FULL = 'DISK_FULL',
  INVALID_PATH = 'INVALID_PATH',
}
```

### 3. Add Export Channels
```typescript
// src/electron/constants/pdf-channels.ts
export const PDF_CHANNELS = {
  // ... existing channels
  
  // Export channels
  EXPORT: 'pdf:export',
  EXPORT_SILENT: 'pdf:export-silent',
} as const;
```

### 4. Create Export Hook
```typescript
// src/electron/renderer/src/hooks/usePDFExport.ts
import { useState, useCallback } from 'react';
import { PDFExportOptions } from '../../../../types/pdf-ipc';
import { DocumentType } from '../../../../types';

interface ExportState {
  isExporting: boolean;
  error: string | null;
  lastExportPath?: string;
}

export const usePDFExport = () => {
  const [state, setState] = useState<ExportState>({
    isExporting: false,
    error: null,
  });
  
  const exportPDF = useCallback(async (
    requestId: string,
    buffer: Uint8Array,
    documentType: DocumentType,
    options?: PDFExportOptions
  ) => {
    setState({ isExporting: true, error: null });
    
    try {
      const response = await window.electron.pdf.export({
        requestId,
        buffer,
        documentType,
        options,
      });
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Export failed');
      }
      
      setState({
        isExporting: false,
        error: null,
        lastExportPath: response.filePath,
      });
      
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState({
        isExporting: false,
        error: message,
      });
      throw error;
    }
  }, []);
  
  const exportSilently = useCallback(async (
    requestId: string,
    buffer: Uint8Array,
    documentType: DocumentType,
    filePath: string,
    options?: PDFExportOptions
  ) => {
    setState({ isExporting: true, error: null });
    
    try {
      const response = await window.electron.pdf.exportSilent({
        requestId,
        buffer,
        documentType,
        filePath,
        options,
      });
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Export failed');
      }
      
      setState({
        isExporting: false,
        error: null,
        lastExportPath: response.filePath,
      });
      
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState({
        isExporting: false,
        error: message,
      });
      throw error;
    }
  }, []);
  
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);
  
  return {
    exportPDF,
    exportSilently,
    isExporting: state.isExporting,
    error: state.error,
    lastExportPath: state.lastExportPath,
    clearError,
  };
};
```

### 5. Update Preload Script
```typescript
// src/electron/preload/index.ts - Add to pdf API
const pdfAPI = {
  // ... existing methods
  
  export: (request: any) =>
    ipcRenderer.invoke('pdf:export', request),
    
  exportSilent: (request: any) =>
    ipcRenderer.invoke('pdf:export-silent', request),
};
```

### 6. Initialize Export Handler
```typescript
// src/electron/main/index.ts
import { PDFExportHandler } from './ipc/pdf-export-handler.js';

// In setupApplication method
PDFExportHandler.getInstance();
console.log('PDF export handler initialized');
```

## Code Examples

### Using Export in Component
```typescript
// Example usage in EnhancedDocumentViewer
import { usePDFExport } from '../hooks/usePDFExport';

const EnhancedDocumentViewer = () => {
  const { exportPDF, isExporting, error } = usePDFExport();
  const [pdfBuffer, setPdfBuffer] = useState<Uint8Array | null>(null);
  
  const handleExport = async () => {
    if (!pdfBuffer) return;
    
    try {
      const result = await exportPDF(
        'request-123',
        pdfBuffer,
        currentDocument.type,
        {
          defaultFileName: `${currentDocument.name}.pdf`,
          metadata: {
            title: currentDocument.title,
            author: currentUser.name,
          }
        }
      );
      
      if (result.success) {
        showNotification(`PDF saved to ${result.fileName}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };
  
  return (
    <Button
      onClick={handleExport}
      disabled={!pdfBuffer || isExporting}
    >
      {isExporting ? 'Exporting...' : 'Export PDF'}
    </Button>
  );
};
```

## File Changes

### New Files to Create
1. `src/electron/main/ipc/pdf-export-handler.ts`
   - Main export handler implementation
   - Dialog management and file writing

2. `src/electron/renderer/src/hooks/usePDFExport.ts`
   - React hook for PDF export operations

### Files to Modify
1. `src/types/pdf-ipc.ts`
   - Add export request/response interfaces
   - Add new error codes

2. `src/electron/constants/pdf-channels.ts`
   - Add export channel constants

3. `src/electron/preload/index.ts`
   - Add export methods to PDF API

4. `src/electron/main/index.ts`
   - Initialize PDFExportHandler

5. `src/shared/types.ts`
   - Update ElectronAPI interface

## Testing Approach

### Unit Tests
```typescript
// __tests__/electron/main/ipc/pdf-export-handler.test.ts
describe('PDFExportHandler', () => {
  it('should validate export requests', () => {
    // Test request validation
  });
  
  it('should handle save dialog cancellation', async () => {
    // Mock dialog.showSaveDialog to return cancelled
  });
  
  it('should write PDF to file successfully', async () => {
    // Test successful file write
  });
  
  it('should handle file system errors', async () => {
    // Test EACCES, ENOSPC, etc.
  });
  
  it('should handle silent export', async () => {
    // Test export without dialog
  });
});
```

### Integration Tests
```typescript
// Test full export flow from renderer to file system
describe('PDF Export Integration', () => {
  it('should export PDF from renderer process', async () => {
    // Generate PDF
    // Export via IPC
    // Verify file exists
  });
});
```

## Definition of Done

- [ ] PDFExportHandler class implemented
- [ ] Export IPC channels registered
- [ ] Save dialog integration working
- [ ] Silent export option available
- [ ] File writing with proper error handling
- [ ] React hook for export operations
- [ ] Preload script updated
- [ ] Unit tests for export handler
- [ ] Integration tests for full flow
- [ ] Error handling for all failure cases

## Common Pitfalls

1. **Buffer Conversion**: Ensure proper conversion between Uint8Array and Node Buffer
2. **Path Handling**: Use path.join for cross-platform compatibility
3. **Dialog State**: Handle dialog cancellation properly
4. **Permissions**: Test file write permissions on different OS
5. **Large Files**: Test with large PDFs (>50MB)

## Notes

- Consider implementing progress callback for large file writes
- Plan for future cloud export options
- Consider implementing export history
- Document file size limitations
- Plan for export analytics/telemetry 