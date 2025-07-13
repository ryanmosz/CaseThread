import { useState, useCallback } from 'react';
import { PDFGenerationOptions, PDFGenerationProgress, PDFGenerationResult } from '../../../../types/pdf-ipc';

interface UsePDFGenerationReturn {
  generatePDF: (options: PDFGenerationOptions) => Promise<void>;
  isGenerating: boolean;
  progress: PDFGenerationProgress | null;
  error: string | null;
  pdfBuffer: ArrayBuffer | null;
  blobUrl: string | null;
  metadata: PDFGenerationResult['metadata'] | null;
}

export function usePDFGeneration(): UsePDFGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<PDFGenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<PDFGenerationResult['metadata'] | null>(null);

  const generatePDF = useCallback(async (options: PDFGenerationOptions) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('[PDFGeneration] Starting PDF generation', { requestId, documentType: options.documentType });
    
    try {
      setIsGenerating(true);
      setError(null);
      setProgress(null);
      setPdfBuffer(null);
      
      // Clean up previous blob URL
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }

      // Set up progress listener
      const progressHandler = (_event: any, progressData: PDFGenerationProgress) => {
        if (progressData.requestId === requestId) {
          console.log('[PDFGeneration] Progress update:', progressData);
          setProgress(progressData);
        }
      };

      window.electron.on('pdf:generation:progress', progressHandler);

      // Create request with all required fields for security validator
      const request = {
        requestId,
        content: options.content,
        documentType: options.documentType,
        documentId: options.metadata?.title || `doc-${Date.now()}`, // Use title or generate ID
        options: {
          includeMetadata: true,
          validateSignatures: true,
          // Add any other generation options
          metadata: options.metadata ? {
            title: options.metadata.title || '',
            subject: options.metadata.subject || '',
            author: options.metadata.author || '',
            keywords: options.metadata.keywords?.split(', ') || [],
          } : undefined
        }
      };

      console.log('[PDFGeneration] Calling IPC with request:', request);
      const result = await window.electron.pdf.generate(request);

      if (result.success && result.data) {
        console.log('[PDFGeneration] PDF generated successfully', {
          size: result.data.buffer.byteLength,
          pages: result.data.metadata?.pageCount
        });
        
        setPdfBuffer(result.data.buffer);
        setMetadata(result.data.metadata);
        
        // Create blob URL for display
        const blob = new Blob([result.data.buffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        
        setError(null);
      } else {
        const errorMsg = result.error || 'Failed to generate PDF';
        console.error('[PDFGeneration] Generation failed:', errorMsg);
        setError(errorMsg);
      }

      // Clean up listener
      window.electron.off('pdf:generation:progress', progressHandler);
    } catch (err) {
      console.error('[PDFGeneration] PDF generation exception', err);
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  }, [blobUrl]);

  return {
    generatePDF,
    isGenerating,
    progress,
    error,
    pdfBuffer,
    blobUrl,
    metadata
  };
} 