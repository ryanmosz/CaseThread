import PDFDocument from 'pdfkit';

/**
 * Options for PDF document generation
 */
export interface PDFGenerationOptions {
  documentType: string;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
}

/**
 * Document margin configuration
 */
export interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Page numbering format options
 */
export interface PageNumberFormat {
  format: 'numeric' | 'roman' | 'alpha'; // 1, 2, 3 | i, ii, iii | a, b, c
  prefix?: string; // e.g., "Page "
  suffix?: string; // e.g., " of 10"
  startingNumber?: number; // Default: 1
  fontSize?: number; // Default: 10
  font?: string; // Default: 'Times-Roman'
}

/**
 * Page configuration for PDF documents
 */
export interface PageConfig {
  size: 'LETTER' | 'LEGAL' | 'A4';
  margins: Margins;
  pageNumbers: boolean;
  pageNumberPosition: 'bottom-center' | 'bottom-right' | 'bottom-left';
  pageNumberFormat?: PageNumberFormat;
}

/**
 * Position coordinates on a PDF page
 */
export interface PDFPosition {
  x: number;
  y: number;
}

/**
 * Text formatting options for PDF content
 */
export interface TextOptions {
  fontSize?: number;
  font?: string;
  lineGap?: number;
  align?: 'left' | 'center' | 'right' | 'justify';
  continued?: boolean;
} 