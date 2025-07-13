import { DocumentType } from './index';

// Request types (Renderer → Main)
export interface PDFGenerateRequest {
  requestId: string;
  content: string;
  documentType: DocumentType;
  documentId: string;
  options?: PDFGenerationOptions;
}

export interface PDFGenerationOptions {
  fontSize?: number;
  lineSpacing?: 'single' | 'one-half' | 'double';
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  includeMetadata?: boolean;
  validateSignatures?: boolean;
  watermark?: string;
}

export interface PDFCancelRequest {
  requestId: string;
  reason?: string;
}

// Export types (Renderer → Main)
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

// Response types (Main → Renderer)
export interface PDFGenerateResponse {
  requestId: string;
  success: boolean;
  data?: {
    buffer: ArrayBuffer;
    metadata: PDFMetadata;
    warnings?: string[];
  };
  error?: PDFError;
}

export interface PDFMetadata {
  pageCount: number;
  fileSize: number;
  documentType: string;
  generatedAt: string;
  generationTime: number;
  hasSignatureBlocks?: boolean;
  formFields?: string[];
}

export interface PDFExportResponse {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  error?: PDFError;
}

export interface PDFError {
  code: string;
  message: string;
  details?: any;
  recoverable?: boolean;
  suggestion?: string;
}

export interface PDFProgressUpdate {
  requestId: string;
  step: string;
  detail: string;
  percentage: number;
  timestamp: Date;
  estimatedTimeRemaining?: number;
}

// Error codes
export enum PDFErrorCode {
  GENERATION_FAILED = 'PDF_GENERATION_FAILED',
  GENERATION_CANCELLED = 'PDF_GENERATION_CANCELLED',
  INVALID_REQUEST = 'PDF_INVALID_REQUEST',
  INVALID_DOCUMENT = 'PDF_INVALID_DOCUMENT',
  TEMPLATE_NOT_FOUND = 'PDF_TEMPLATE_NOT_FOUND',
  MEMORY_LIMIT = 'PDF_MEMORY_LIMIT',
  PERMISSION_DENIED = 'PDF_PERMISSION_DENIED',
  EXPORT_FAILED = 'PDF_EXPORT_FAILED',
  DISK_FULL = 'PDF_DISK_FULL',
  INVALID_PATH = 'PDF_INVALID_PATH',
  CANCELLED = 'PDF_CANCELLED',
} 