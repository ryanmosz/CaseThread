import { useState, useCallback } from 'react';

interface UsePDFExportReturn {
  exportPDF: (buffer: ArrayBuffer, filename: string, documentType?: string) => Promise<void>;
  exportPDFSilent: (buffer: ArrayBuffer, filePath: string, documentType?: string) => Promise<void>;
  isExporting: boolean;
  error: string | null;
}

export function usePDFExport(): UsePDFExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportPDF = useCallback(async (buffer: ArrayBuffer, filename: string, documentType: string = 'legal-document') => {
    setIsExporting(true);
    setError(null);

    try {
      console.log('[PDFExport] Starting export', { filename, size: buffer.byteLength });
      
      // Create a proper PDFExportRequest
      const request = {
        requestId: `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        buffer: new Uint8Array(buffer),
        documentType,
        options: {
          defaultFileName: filename
        }
      };
      
      const result = await window.electron.pdf.export(request);
      
      if (result.success) {
        console.log('[PDFExport] Export successful', { 
          path: result.filePath,
          size: result.fileSize 
        });
        // Success - could show a toast notification here if needed
      } else if (result.error?.code === 'PDF_CANCELLED') {
        // User cancelled - don't treat as error
        console.log('[PDFExport] Export cancelled by user');
      } else {
        const errorMsg = result.error?.message || 'Failed to export PDF';
        console.error('[PDFExport] Export failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('[PDFExport] Export exception:', err);
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMsg);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportPDFSilent = useCallback(async (buffer: ArrayBuffer, filePath: string, documentType: string = 'legal-document') => {
    setIsExporting(true);
    setError(null);

    try {
      console.log('[PDFExport] Starting silent export', { filePath, size: buffer.byteLength });
      
      // Create a proper PDFExportRequest with filePath for silent export
      const request = {
        requestId: `export-silent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        buffer: new Uint8Array(buffer),
        documentType,
        filePath
      };
      
      const result = await window.electron.pdf.exportSilent(request);
      
      if (result.success) {
        console.log('[PDFExport] Silent export successful', { 
          path: result.filePath,
          size: result.fileSize 
        });
      } else {
        const errorMsg = result.error?.message || 'Failed to export PDF';
        console.error('[PDFExport] Silent export failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('[PDFExport] Silent export exception:', err);
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMsg);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportPDF, exportPDFSilent, isExporting, error };
} 