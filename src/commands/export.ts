import { Command } from 'commander';
import * as path from 'path';
import { promises as fs } from 'fs';
import { createSpinner } from '../utils/spinner';
import { logger } from '../utils/logger';
import { handleError, createError } from '../utils/error-handler';
import { PDFExportService } from '../services/pdf-export';

interface ExportOptions {
  debug?: boolean;
  pageNumbers?: boolean;
  margins?: string;
  lineSpacing?: string;  // Changed to string to accept 'auto'
  fontSize?: string;
}

const SPINNER_MESSAGES = {
  INIT: 'Initializing PDF export...',
  READ_FILE: 'Reading input document...',
  PARSE_SIGNATURE: 'Parsing signature blocks...',
  GENERATE_PDF: 'Generating PDF document...',
  SAVE_PDF: 'Saving PDF file...',
  SUCCESS: 'PDF exported successfully!'
};

/**
 * Parse margins string into individual values
 * @param marginsStr - Comma-separated margin values in points
 * @returns Object with top, right, bottom, left margins
 */
function parseMargins(marginsStr?: string): { top?: number; right?: number; bottom?: number; left?: number } | undefined {
  if (!marginsStr) return undefined;
  
  const values = marginsStr.split(',').map(v => parseInt(v.trim(), 10));
  
  if (values.length === 1) {
    // Single value applies to all sides
    return { top: values[0], right: values[0], bottom: values[0], left: values[0] };
  } else if (values.length === 2) {
    // Two values: vertical, horizontal
    return { top: values[0], right: values[1], bottom: values[0], left: values[1] };
  } else if (values.length === 4) {
    // Four values: top, right, bottom, left
    return { top: values[0], right: values[1], bottom: values[2], left: values[3] };
  }
  
  throw new Error('Invalid margins format. Use 1, 2, or 4 comma-separated values');
}

/**
 * Extract document type from content or filename
 * @param content - Document content
 * @param filename - Input filename
 * @returns Document type or 'unknown'
 */
function extractDocumentType(content: string, filename: string): string {
  // Look for document type in metadata header
  const metadataMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (metadataMatch) {
    const typeMatch = metadataMatch[1].match(/documentType:\s*(.+)/);
    if (typeMatch) {
      return typeMatch[1].trim();
    }
  }
  
  // Try to extract from filename
  const basename = path.basename(filename, path.extname(filename));
  const knownTypes = [
    'provisional-patent-application',
    'patent-assignment-agreement',
    'patent-license-agreement',
    'nda-ip-specific',
    'trademark-application',
    'office-action-response',
    'cease-and-desist-letter',
    'technology-transfer-agreement'
  ];
  
  for (const type of knownTypes) {
    if (basename.toLowerCase().includes(type)) {
      return type;
    }
  }
  
  return 'unknown';
}

export const exportCommand = new Command('export')
  .description('Export a text document to PDF with legal formatting')
  .argument('<input>', 'Path to input text file')
  .argument('<output>', 'Path for output PDF file')
  .option('-d, --debug', 'Enable debug logging')
  .option('--no-page-numbers', 'Disable page numbers')
  .option('-m, --margins <margins>', 'Custom margins in points (e.g., "72,72,72,72" for 1 inch all around)')
  .option('-l, --line-spacing <spacing>', 'Line spacing (single, one-half, double)', 'auto')
  .option('-f, --font-size <size>', 'Font size in points (e.g., "12")')
  .action(async (inputPath: string, outputPath: string, options: ExportOptions) => {
    // Check for command-level debug flag
    if (options.debug && logger.level !== 'debug') {
      logger.level = 'debug';
      logger.debug('Debug logging enabled via command flag');
    }
    
    const spinner = createSpinner(SPINNER_MESSAGES.INIT);
    
    // Log command execution details
    logger.debug('=== Export Command Execution ===');
    logger.debug(`Input Path: ${inputPath}`);
    logger.debug(`Output Path: ${outputPath}`);
    logger.debug(`Page Numbers: ${options.pageNumbers !== false}`);
    logger.debug(`Margins: ${options.margins || 'default'}`);
    logger.debug(`Line Spacing: ${options.lineSpacing || 'auto'}`);
    logger.debug(`Font Size: ${options.fontSize || 'default'}`);
    logger.debug(`Debug Mode: ${options.debug || logger.level === 'debug'}`);
    logger.debug('================================');
    
    try {
      // Resolve paths
      const resolvedInputPath = path.resolve(inputPath);
      const resolvedOutputPath = path.resolve(outputPath);
      
      // Validate input file exists
      spinner.updateMessage(SPINNER_MESSAGES.READ_FILE);
      try {
        await fs.access(resolvedInputPath);
        logger.debug(`Input file exists: ${resolvedInputPath}`);
      } catch {
        throw createError('FILE_NOT_FOUND', resolvedInputPath);
      }
      
      // Ensure output has .pdf extension
      if (!resolvedOutputPath.endsWith('.pdf')) {
        throw new Error('Output file must have .pdf extension');
      }
      
      // Ensure output directory exists
      const outputDir = path.dirname(resolvedOutputPath);
      try {
        await fs.mkdir(outputDir, { recursive: true });
        logger.debug(`Output directory ensured: ${outputDir}`);
      } catch (error) {
        throw createError('PERMISSION_ERROR', outputDir);
      }
      
      // Read input file
      let content: string;
      try {
        content = await fs.readFile(resolvedInputPath, 'utf-8');
        logger.debug(`Read ${content.length} characters from input file`);
      } catch (error) {
        throw createError('PERMISSION_ERROR', resolvedInputPath);
      }
      
      // Extract document type
      const documentType = extractDocumentType(content, resolvedInputPath);
      logger.debug(`Detected document type: ${documentType}`);
      
      // Create PDF export service
      spinner.updateMessage(SPINNER_MESSAGES.GENERATE_PDF);
      const pdfService = new PDFExportService();
      
      // Build export options
      const exportOptions: any = {
        pageNumbers: options.pageNumbers !== false
      };
      
      if (options.lineSpacing && options.lineSpacing !== 'auto') {
        const validSpacings = ['single', 'one-half', 'double'];
        if (validSpacings.includes(options.lineSpacing)) {
          exportOptions.lineSpacing = options.lineSpacing as 'single' | 'one-half' | 'double';
        } else {
          throw new Error('Line spacing must be one of: single, one-half, double');
        }
      }
      
      if (options.fontSize) {
        const fontSize = parseInt(options.fontSize, 10);
        if (isNaN(fontSize) || fontSize < 8 || fontSize > 24) {
          throw new Error('Font size must be between 8 and 24 points');
        }
        exportOptions.fontSize = fontSize;
      }
      
      if (options.margins) {
        exportOptions.margins = parseMargins(options.margins);
      }
      
      // Generate PDF
      spinner.updateMessage(SPINNER_MESSAGES.SAVE_PDF);
      await pdfService.export(
        content,
        resolvedOutputPath,
        documentType,
        exportOptions
      );
      
      spinner.success(SPINNER_MESSAGES.SUCCESS);
      console.log(`\n✅ PDF exported successfully to: ${resolvedOutputPath}\n`);
      
      process.exit(0);
      
    } catch (error) {
      logger.debug('Error occurred during export:', error);
      handleError(error as Error, spinner);
    }
  }); 