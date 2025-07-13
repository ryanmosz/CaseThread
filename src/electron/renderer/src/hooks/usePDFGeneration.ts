import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  PDFGenerateRequest, 
  PDFGenerateResponse, 
  PDFProgressUpdate,
  PDFCancelRequest
} from '../../../../types/pdf-ipc';
import { DocumentType } from '../../../../types';
import { PDFMetadataExtended } from '../../../../types/pdf';
import { BlobURLManager } from '../services/BlobURLManager';

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
  currentBuffer: ArrayBuffer | null;
  blobUrl: string | null;
  metadata: PDFMetadataExtended | null;
  cancelGeneration: () => void;
  clearPDF: () => void;
}

export const usePDFGeneration = (
  addToast: (toast: { title: string; description: string; color: string }) => void
): UsePDFGenerationResult => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<PDFProgressUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [currentBuffer, setCurrentBuffer] = useState<ArrayBuffer | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<PDFMetadataExtended | null>(null);
  
  // Blob URL Manager
  const blobManager = useMemo(() => BlobURLManager.getInstance(), []);

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
        addToast({
          title: 'PDF Generation Failed',
          description: data.errorMessage || 'An error occurred while generating the PDF',
          color: 'danger'
        });
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
  }, [currentRequestId, addToast]);

  // Clean up blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (blobUrl && currentRequestId) {
        blobManager.revokeURL(`pdf-${currentRequestId}`);
      }
    };
  }, [blobUrl, currentRequestId, blobManager]);

  const generatePDF = useCallback(async (content: string, documentType: DocumentType) => {
    const requestId = uuidv4();
    const documentId = `doc-${uuidv4()}`;
    setCurrentRequestId(requestId);
    setIsGenerating(true);
    setError(null);
    setProgress(null);

    const request: PDFGenerateRequest = {
      requestId,
      content,
      documentType,
      documentId,
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
        
        // Store the buffer
        setCurrentBuffer(response.data.buffer);
        
        // Store enhanced metadata
        const enhancedMetadata: PDFMetadataExtended = {
          pageCount: response.data.metadata.pageCount,
          fileSize: response.data.metadata.fileSize,
          documentType: response.data.metadata.documentType,
          generatedAt: new Date(),
          generationTime: response.data.metadata.generationTime || 0,
          hasSignatureBlocks: response.data.metadata.hasSignatureBlocks,
          formFields: response.data.metadata.formFields,
          fontSize: response.data.metadata.fontSize,
          lineSpacing: response.data.metadata.lineSpacing,
          margins: response.data.metadata.margins,
          signatureBlockCount: response.data.metadata.signatureBlockCount,
          warnings: response.data.metadata.warnings
        };
        setMetadata(enhancedMetadata);
        
        // Create and manage blob URL
        const url = blobManager.createBlobURL(
          response.data.buffer, 
          'application/pdf',
          `pdf-${requestId}`
        );
        setBlobUrl(url);
        
        // Store globally for debugging
        (window as any).__lastGeneratedPDF = {
          buffer: response.data.buffer,
          metadata: enhancedMetadata,
          documentType: documentType,
          timestamp: new Date()
        };
        
        setIsGenerating(false);
        
        addToast({
          title: 'PDF Generated Successfully',
          description: `${enhancedMetadata.pageCount} pages created`,
          color: 'success'
        });
      } else {
        logger.error('PDF generation failed', response);
        const errorMsg = response.error?.message || 'PDF generation failed';
        setError(errorMsg);
        setIsGenerating(false);
        
        addToast({
          title: 'PDF Generation Failed',
          description: errorMsg,
          color: 'danger'
        });
      }
    } catch (err) {
      logger.error('PDF generation exception', err);
      const errorMessage = err instanceof Error ? err.message : 'PDF generation failed';
      setError(errorMessage);
      setIsGenerating(false);
      
      addToast({
        title: 'PDF Generation Error',
        description: errorMessage,
        color: 'danger'
      });
    }
  }, [blobManager, addToast]);

  const cancelGeneration = useCallback(() => {
    if (currentRequestId) {
      logger.info('Cancelling PDF generation', { requestId: currentRequestId });
      const cancelRequest: PDFCancelRequest = { requestId: currentRequestId };
      window.electronAPI.pdf.cancel(cancelRequest);
      setIsGenerating(false);
      setCurrentRequestId(null);
      setProgress(null);
      
      addToast({
        title: 'PDF Generation Cancelled',
        description: 'The PDF generation was cancelled',
        color: 'warning'
      });
    }
  }, [currentRequestId, addToast]);

  const clearPDF = useCallback(() => {
    if (blobUrl && currentRequestId) {
      blobManager.revokeURL(`pdf-${currentRequestId}`);
      setBlobUrl(null);
    }
    setCurrentBuffer(null);
    setMetadata(null);
    setError(null);
  }, [blobUrl, currentRequestId, blobManager]);

  return {
    generatePDF,
    isGenerating,
    progress,
    error,
    currentBuffer,
    blobUrl,
    metadata,
    cancelGeneration,
    clearPDF
  };
}; 