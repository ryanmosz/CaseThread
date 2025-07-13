import { useState, useCallback } from 'react';
import { PDFExportRequest } from '../../../../types/pdf-ipc';

export interface UsePDFExportResult {
  exportPDF: (buffer: ArrayBuffer, filename: string) => Promise<void>;
  isExporting: boolean;
  error: string | null;
}

export const usePDFExport = (
  addToast: (toast: { title: string; description: string; color: string }) => void
): UsePDFExportResult => {
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
  }, [addToast]);

  return {
    exportPDF,
    isExporting,
    error
  };
}; 