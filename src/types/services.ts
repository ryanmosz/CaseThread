import { 
  DocumentFormattingRules, 
  SignatureBlockData, 
  LayoutBlock, 
  LayoutResult,
  PDFOutput,
  PDFGenerationOptions,
  ParsedDocument,
  TextOptions
} from './pdf';
import { PDFExportOptions, PDFExportResult } from '../services/pdf-export';
import { Logger } from '../utils/logger';
import { ProgressReporter } from './progress';
import { FormattedSegment } from '../services/pdf/MarkdownParser';

/**
 * Template loading service interface
 */
export interface ITemplateLoader {
  loadTemplate(documentType: string): Promise<any>;
  loadExplanation(documentType: string): Promise<string>;
  listTemplates(): string[];
}

/**
 * Document formatting service interface
 */
export interface IDocumentFormatter {
  getFormattingRules(documentType: string): DocumentFormattingRules;
  applyLineSpacing(documentType: string, isSignatureBlock: boolean): number;
  calculateLineHeight(fontSize: number, lineSpacing: 'single' | 'one-half' | 'double'): number;
  getMarginsForPage(documentType: string, pageNumber: number): { top: number; bottom: number; left: number; right: number };
}

/**
 * Signature block parsing service interface
 */
export interface ISignatureParser {
  parseDocument(text: string): ParsedDocument;
}

/**
 * Markdown parsing service interface
 */
export interface IMarkdownParser {
  parseHeading(line: string): { level: number; text: string } | null;
  parseInlineFormatting(text: string): FormattedSegment[];
  isHorizontalRule(line: string): boolean;
  parseListItem(line: string): { type: 'ordered' | 'unordered'; level: number; marker: string; text: string } | null;
  isBlockQuote(line: string): boolean;
  parseBlockQuote(line: string): string | null;
  extractLinkText(text: string): string;
  isTableRow(line: string): boolean;
  parseTableRow(line: string): string[];
  isTableSeparator(line: string): boolean;
  getHeadingFontSize(level: number): number;
  isMarkdownHeading(line: string): boolean;
}

/**
 * PDF layout engine interface
 */
export interface ILayoutEngine {
  layoutDocument(blocks: LayoutBlock[], documentType: string): LayoutResult;
}

/**
 * PDF generator interface
 */
export interface IPDFGenerator {
  start(): Promise<void>;
  finalize(): Promise<void>;
  writeText(text: string, options?: TextOptions): void;
  writeParagraph(text: string, options?: TextOptions): void;
  writeHeading(text: string, level?: 1 | 2 | 3 | 4 | 5 | 6, options?: TextOptions): void;
  writeTitle(title: string): void;
  newPage(): void;
  getCurrentY(): number;
  getCurrentPage(): number;
  getPageDimensions(): { width: number; height: number };
  getRemainingSpace(): number;
  measureTextHeight(text: string, width?: number, options?: TextOptions): number;
  moveTo(yOrOptions: number | { x: number; y: number }, y?: number): void;
  addSpace(space: number): void;
  drawHorizontalLine(options?: any): void;
  writeFormattedText(segments: FormattedSegment[], baseOptions?: TextOptions): void;
  getPagesWithContent(): Set<number>;
}

/**
 * PDF export service interface
 */
export interface IPDFExportService {
  export(text: string, outputPath: string, documentType: string, options?: PDFExportOptions): Promise<void>;
  exportToBuffer(text: string, documentType: string, options?: PDFExportOptions): Promise<PDFExportResult>;
}

/**
 * Service configuration for custom DI setup
 */
export interface ServiceConfiguration {
  templateLoader?: ITemplateLoader;
  documentFormatter?: IDocumentFormatter;
  signatureParser?: ISignatureParser;
  markdownParser?: IMarkdownParser;
  layoutEngineFactory?: (generator: IPDFGenerator) => ILayoutEngine;
  pdfGeneratorFactory?: (output: PDFOutput, options: PDFGenerationOptions) => IPDFGenerator;
  progressReporter?: ProgressReporter;
  logger?: Logger;
}

/**
 * Factory functions for creating services
 */
export type LayoutEngineFactory = (
  generator: any, // Using any to avoid circular dependency issues
  formatter: any, 
  parser: any
) => ILayoutEngine;

export type PDFGeneratorFactory = (
  output: PDFOutput, 
  options: PDFGenerationOptions
) => any; // Using any to avoid type incompatibility 