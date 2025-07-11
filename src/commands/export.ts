import { Command } from 'commander';
import * as path from 'path';
import { promises as fs } from 'fs';
import { createSpinner } from '../utils/spinner';
import { logger } from '../utils/logger';
import { handleError, createError, CLIError } from '../utils/error-handler';
import { PDFExportService, PDFExportOptions } from '../services/pdf-export';
import { ErrorCode } from '../types/errors';

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
function parseMargins(marginsStr?: string): { top: number; right: number; bottom: number; left: number } | undefined {
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
        const stats = await fs.stat(resolvedInputPath);
        if (!stats.isFile()) {
          throw new CLIError(`Input path is not a file: ${resolvedInputPath}`, ErrorCode.INVALID_INPUT);
        }
        if (stats.size === 0) {
          throw new CLIError(`Input file is empty: ${resolvedInputPath}`, ErrorCode.EMPTY_FILE);
        }
        if (stats.size > 50 * 1024 * 1024) { // 50MB limit
          throw new CLIError(`Input file is too large (${(stats.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 50MB.`, ErrorCode.FILE_TOO_LARGE);
        }
        logger.debug(`Input file exists: ${resolvedInputPath} (${stats.size} bytes)`);
      } catch (error) {
        if (error instanceof CLIError) throw error;
        if ((error as any).code === 'ENOENT') {
          throw createError('FILE_NOT_FOUND', resolvedInputPath);
        }
        throw new CLIError(`Cannot access input file: ${(error as Error).message}`, ErrorCode.FILE_ACCESS_ERROR);
      }
      
      // Ensure output has .pdf extension
      if (!resolvedOutputPath.endsWith('.pdf')) {
        throw new CLIError('Output file must have .pdf extension', ErrorCode.INVALID_OUTPUT);
      }
      
      // Ensure output directory exists
      const outputDir = path.dirname(resolvedOutputPath);
      try {
        await fs.mkdir(outputDir, { recursive: true });
        logger.debug(`Output directory ensured: ${outputDir}`);
      } catch (error) {
        logger.error('Failed to create output directory', error);
        throw new CLIError(`Cannot create output directory: ${outputDir}`, ErrorCode.PERMISSION_ERROR);
      }
      
      // Check write permissions to output directory
      try {
        await fs.access(outputDir, fs.constants.W_OK);
      } catch {
        throw new CLIError(`No write permission for directory: ${outputDir}`, ErrorCode.PERMISSION_ERROR);
      }
      
      // Read input file
      let content: string;
      try {
        content = await fs.readFile(resolvedInputPath, 'utf-8');
        logger.debug(`Read ${content.length} characters from input file`);
        spinner.updateMessage(`Read ${content.length.toLocaleString()} characters`);
        
        // Validate content
        if (content.trim().length === 0) {
          throw new CLIError('Input file contains only whitespace', ErrorCode.EMPTY_FILE);
        }
      } catch (error) {
        if (error instanceof CLIError) throw error;
        logger.error('Failed to read input file', error);
        throw new CLIError(`Cannot read input file: ${(error as Error).message}`, ErrorCode.FILE_READ_ERROR);
      }
      
      // Extract document type
      spinner.updateMessage('Detecting document type...');
      const documentType = extractDocumentType(content, resolvedInputPath);
      logger.debug(`Detected document type: ${documentType}`);
      spinner.updateMessage(`Document type: ${documentType}`);
      
      // Create PDF export service
      const pdfService = new PDFExportService();
      
      // Build export options
      const exportOptions: PDFExportOptions = {
        pageNumbers: options.pageNumbers !== false,
        onProgress: (step: string, detail?: string) => {
          const message = detail ? `${step}: ${detail}` : step;
          spinner.updateMessage(message);
        }
      };
      
      // Validate and set line spacing
      if (options.lineSpacing && options.lineSpacing !== 'auto') {
        const validSpacings = ['single', 'one-half', 'double'];
        if (validSpacings.includes(options.lineSpacing)) {
          exportOptions.lineSpacing = options.lineSpacing as 'single' | 'one-half' | 'double';
        } else {
          throw new CLIError(
            `Invalid line spacing '${options.lineSpacing}'. Must be one of: single, one-half, double, or auto`,
            ErrorCode.INVALID_OPTION
          );
        }
      }
      
      // Validate and set font size
      if (options.fontSize) {
        const fontSize = parseInt(options.fontSize, 10);
        if (isNaN(fontSize) || fontSize < 8 || fontSize > 24) {
          throw new CLIError(
            `Invalid font size '${options.fontSize}'. Must be between 8 and 24 points`,
            ErrorCode.INVALID_OPTION
          );
        }
        exportOptions.fontSize = fontSize;
      }
      
      // Parse and validate margins
      if (options.margins) {
        try {
          exportOptions.margins = parseMargins(options.margins);
        } catch (error) {
          throw new CLIError(
            `Invalid margins format: ${(error as Error).message}`,
            ErrorCode.INVALID_OPTION
          );
        }
      }
      
      // Generate PDF
      try {
        spinner.updateMessage(SPINNER_MESSAGES.GENERATE_PDF);
        await pdfService.export(
          content,
          resolvedOutputPath,
          documentType,
          exportOptions
        );
      } catch (error) {
        logger.error('PDF generation failed', error);
        if (error instanceof Error) {
          if (error.message.includes('ENOSPC')) {
            throw new CLIError('Insufficient disk space to save PDF', ErrorCode.DISK_FULL);
          } else if (error.message.includes('EMFILE')) {
            throw new CLIError('Too many open files. Please close some applications and try again', ErrorCode.SYSTEM_LIMIT);
          } else if (error.message.includes('signature') || error.message.includes('marker')) {
            throw new CLIError(
              `Document parsing error: ${error.message}`,
              ErrorCode.PARSING_ERROR
            );
          }
        }
        throw new CLIError(
          `PDF generation failed: ${(error as Error).message}`,
          ErrorCode.PDF_GENERATION_ERROR
        );
      }
      
      // Verify output file was created
      try {
        const outputStats = await fs.stat(resolvedOutputPath);
        if (outputStats.size === 0) {
          throw new CLIError('Generated PDF is empty', ErrorCode.GENERATION_ERROR);
        }
        logger.debug(`PDF created successfully: ${outputStats.size} bytes`);
      } catch (error) {
        if (error instanceof CLIError) throw error;
        throw new CLIError('Failed to verify PDF output', ErrorCode.VERIFICATION_ERROR);
      }
      
      spinner.success(SPINNER_MESSAGES.SUCCESS);
      console.log(`\n✅ PDF exported successfully to: ${resolvedOutputPath}\n`);
      console.log(`   📄 Document type: ${documentType}`);
      console.log(`   📏 Size: ${(await fs.stat(resolvedOutputPath)).size.toLocaleString()} bytes`);
      
      process.exit(0);
      
    } catch (error) {
      logger.debug('Error occurred during export:', error);
      
      // Add specific help for common errors
      if (error instanceof CLIError) {
        if (error.code === ErrorCode.FILE_NOT_FOUND) {
          console.error('\n💡 Tip: Make sure the input file path is correct and the file exists.');
        } else if (error.code === ErrorCode.PERMISSION_ERROR) {
          console.error('\n💡 Tip: Check that you have write permissions to the output directory.');
        } else if (error.code === ErrorCode.EMPTY_FILE) {
          console.error('\n💡 Tip: The input file must contain text content to convert to PDF.');
        } else if (error.code === ErrorCode.INVALID_OPTION) {
          console.error('\n💡 Tip: Use --help to see valid option values.');
        }
      }
      
      handleError(error as Error, spinner);
    }
  }); 