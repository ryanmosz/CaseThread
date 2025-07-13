import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  PDFGenerateRequest, 
  PDFGenerateResponse, 
  PDFProgressUpdate,
  PDFCancelRequest
} from '../../../../types/pdf-ipc';
import { DocumentType } from '../../../../types';

// Simple logger for renderer process
const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[PDFGeneration] ${message}`, meta || '');
  },
  error: (message: string, meta?: any) => {
    console.error(`[PDFGeneration] ${message}`, meta || '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[PDFGeneration] ${message}`, meta || '');
  },
  debug: (message: string, meta?: any) => {
    console.debug(`[PDFGeneration] ${message}`, meta || '');
  }
};

export interface UsePDFGenerationResult {
  generatePDF: (content: string, documentType: DocumentType) => Promise<void>;
  isGenerating: boolean;
  progress: PDFProgressUpdate | null;
  error: string | null;
  pdfBlobUrl: string | null;
  pdfBuffer: ArrayBuffer | null;
  pdfMetadata: any | null;
  cancelGeneration: () => void;
  clearPDF: () => void;
}

export const usePDFGeneration = (): UsePDFGenerationResult => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<PDFProgressUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [pdfMetadata, setPdfMetadata] = useState<any | null>(null);

  // Register event listeners
  useEffect(() => {
    const handleProgress = (update: PDFProgressUpdate) => {
      if (update.requestId === currentRequestId) {
        logger.debug('Received progress update', update);
        setProgress(update);
      }
    };

    const handleError = (data: { requestId: string; error: any; errorMessage: string }) => {
      if (data.requestId === currentRequestId) {
        logger.error('PDF generation error', data);
        setError(data.errorMessage || 'PDF generation failed');
        setIsGenerating(false);
      }
    };

    // Add listeners
    window.electronAPI.pdf.onProgress(handleProgress);
    window.electronAPI.pdf.onError(handleError);

    // Cleanup
    return () => {
      window.electronAPI.pdf.offProgress(handleProgress);
      window.electronAPI.pdf.offError(handleError);
    };
  }, [currentRequestId]);

  const generatePDF = useCallback(async (content: string, documentType: DocumentType) => {
    const requestId = uuidv4();
    const documentId = `doc-${uuidv4()}`; // Generate a unique document ID
    setCurrentRequestId(requestId);
    setIsGenerating(true);
    setError(null);
    setProgress(null);

    const request: PDFGenerateRequest = {
      requestId,
      content,
      documentType,
      documentId, // Add the missing documentId field
      options: {
        fontSize: 12,
        lineSpacing: 'double',
        margins: {
          top: 72,
          bottom: 72,
          left: 72,
          right: 72
        }
      }
    };

    logger.info('Starting PDF generation', { requestId, documentType });

    try {
      const response = await window.electronAPI.pdf.generate(request);
      
      if (response.success && response.data) {
        logger.info('PDF generation response received', {
          requestId: response.requestId,
          bufferSize: response.data.buffer.byteLength,
          pageCount: response.data.metadata.pageCount
        });
        
        // Log success
        console.log('PDF generated successfully!', {
          pageCount: response.data.metadata.pageCount,
          fileSize: response.data.metadata.fileSize,
          documentType: response.data.metadata.documentType
        });
        
        // Store the buffer
        setPdfBuffer(response.data.buffer);
        
        // Store metadata with generation timestamp
        setPdfMetadata({
          ...response.data.metadata,
          generatedAt: new Date(),
          generationTime: response.data.metadata.generationTime || 0
        });
        
        // Create blob for display
        const blob = new Blob([response.data.buffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
        
        // Store globally for debugging
        (window as any).__lastGeneratedPDF = {
          buffer: response.data.buffer,
          metadata: response.data.metadata,
          documentType: documentType,
          timestamp: new Date()
        };
        
        setIsGenerating(false);
      } else {
        logger.error('PDF generation failed', response);
        setError(response.error?.message || 'PDF generation failed');
        setIsGenerating(false);
      }
    } catch (err) {
      logger.error('PDF generation exception', err);
      const errorMessage = err instanceof Error ? err.message : 'PDF generation failed';
      setError(errorMessage);
      setIsGenerating(false);
    }
  }, []);

  const cancelGeneration = useCallback(() => {
    if (currentRequestId) {
      logger.info('Cancelling PDF generation', { requestId: currentRequestId });
      const cancelRequest: PDFCancelRequest = { requestId: currentRequestId };
      window.electronAPI.pdf.cancel(cancelRequest);
      setIsGenerating(false);
      setCurrentRequestId(null);
      setProgress(null);
    }
  }, [currentRequestId]);

  const clearPDF = useCallback(() => {
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
    setPdfBuffer(null);
    setPdfMetadata(null);
    setError(null);
  }, [pdfBlobUrl]);

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
}; 