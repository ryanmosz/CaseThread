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

/**
 * Supported document types for legal documents
 */
export type DocumentType = 
  | 'provisional-patent-application'
  | 'trademark-application'
  | 'office-action-response'
  | 'nda-ip-specific'
  | 'patent-assignment-agreement'
  | 'patent-license-agreement'
  | 'technology-transfer-agreement'
  | 'cease-and-desist-letter';

/**
 * Document-specific formatting rules
 */
export interface DocumentFormattingRules {
  lineSpacing: 'single' | 'one-half' | 'double';
  fontSize: number;
  font: string;
  margins: Margins;
  pageNumberPosition: 'bottom-center' | 'bottom-right' | 'bottom-left';
  titleCase: boolean;
  sectionNumbering: boolean;
  paragraphIndent: number;
  paragraphSpacing: number;
  blockQuoteIndent: number;
  signatureLineSpacing: 'single' | 'double';
}

/**
 * Line spacing configuration in points
 */
export interface LineSpacingConfig {
  single: number;
  oneHalf: number;
  double: number;
}

/**
 * Represents a detected signature marker in the document
 */
export interface SignatureMarker {
  type: 'signature' | 'initial' | 'notary';
  id: string;
  fullMarker: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Information about a party in a signature block
 */
export interface SignatureParty {
  role?: string;              // "ASSIGNOR", "LICENSEE", "NOTARY PUBLIC", etc.
  name?: string;              // Signer's name
  title?: string;             // Professional title
  company?: string;           // Company name
  date?: string;              // Date field (if present)
  lineType?: 'signature' | 'initial';  // Type of line
  // Notary-specific fields
  notaryCounty?: string;      // County where notarization occurred
  notaryState?: string;       // State where notarization occurred
  commissionExpires?: string; // Notary commission expiration
  commissionNumber?: string;  // Notary commission number
}

/**
 * Complete signature block data extracted from document
 */
export interface SignatureBlockData {
  marker: SignatureMarker;
  layout: 'single' | 'side-by-side';
  parties: SignatureParty[];
  notaryRequired: boolean;
}

/**
 * Document with extracted signature blocks
 */
export interface ParsedDocument {
  content: string[];
  signatureBlocks: SignatureBlockData[];
  hasSignatures: boolean;
} 

/**
 * Layout types for PDFLayoutEngine
 */
export interface LayoutBlock {
  type: 'text' | 'signature' | 'heading' | 'list' | 'table' | 'horizontal-rule' | 'list-item' | 'blockquote';
  content: string | SignatureBlockData | ListItemData;
  height: number;
  breakable: boolean;
  keepWithNext?: boolean;
  headingLevel?: number; // For heading blocks (1-6)
  listData?: ListItemData; // For list items
}

/**
 * Data for list items
 */
export interface ListItemData {
  type: 'ordered' | 'unordered';
  level: number;
  marker: string;
  text: string;
}

export interface LayoutConstraints {
  maxHeight: number;
  minOrphanLines: number;
  minWidowLines: number;
  preferredBreakPoints: number[];
}

export interface LayoutResult {
  pages: LayoutPage[];
  totalPages: number;
  hasOverflow: boolean;
}

export interface LayoutPage {
  blocks: LayoutBlock[];
  remainingHeight: number;
  pageNumber: number;
}

/**
 * Measurement of a block's actual height for two-pass rendering
 */
export interface BlockMeasurement {
  type: string;
  estimatedHeight: number;
  actualHeight: number;
  canSplit: boolean;
}

/**
 * Page measurements for accurate rendering
 */
export interface PageMeasurements {
  blocks: BlockMeasurement[];
  totalHeight: number;
  hasSignatureBlock: boolean;
} 