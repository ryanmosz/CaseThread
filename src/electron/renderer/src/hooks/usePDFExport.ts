import { useState, useCallback } from 'react';

interface UsePDFExportReturn {
  exportPDF: (buffer: ArrayBuffer, filename: string) => Promise<void>;
  isExporting: boolean;
  error: string | null;
}

export function usePDFExport(): UsePDFExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportPDF = useCallback(async (buffer: ArrayBuffer, filename: string) => {
    setIsExporting(true);
    setError(null);

    try {
      console.log('[PDFExport] Starting export', { filename, size: buffer.byteLength });
      
      const result = await window.electron.pdf.export({ buffer, filename });
      
      if (result.success) {
        console.log('[PDFExport] Export successful', { path: result.path });
        // Success is now handled silently or by the caller
      } else {
        const errorMsg = result.error || 'Failed to export PDF';
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

  return { exportPDF, isExporting, error };
} 