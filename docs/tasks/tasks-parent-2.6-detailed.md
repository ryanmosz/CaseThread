# Task 2.6 Detailed: Create CLI Export Command

**Part of Parent Task 2.0: Create Core PDF Generation Service with Legal Formatting**

## Overview

This subtask implements the CLI export command that allows users to convert generated text documents to PDF format. The command integrates all previous components (PDF generator, formatter, parser, and layout engine) into a cohesive user interface.

## Sub-tasks

### 2.6.1 Create export command structure

**Description**: Set up the basic Commander.js command structure for PDF export.

**Implementation Steps**:

1. Create `src/commands/export.ts`:
```typescript
import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PDFExportService } from '../services/pdf-export';
import { Logger } from '../utils/logger';
import { createSpinner } from '../utils/spinner';
import { handleError } from '../utils/error-handler';
import { validatePath } from '../utils/validator';

export function createExportCommand(): Command {
  const exportCommand = new Command('export');
  const logger = new Logger('ExportCommand');

  exportCommand
    .description('Export a generated document to PDF format')
    .argument('<input>', 'Path to the input text file')
    .argument('<output>', 'Path for the output PDF file')
    .option('-t, --type <type>', 'Document type (if not specified, will attempt to detect)')
    .option('-d, --debug', 'Enable debug output')
    .option('--no-page-numbers', 'Disable page numbering')
    .option('--margins <margins>', 'Custom margins in inches (e.g., "1,1,1,1" for top,right,bottom,left)')
    .action(async (inputPath: string, outputPath: string, options: any) => {
      const spinner = createSpinner('Exporting to PDF...');
      
      try {
        // Validate inputs
        await validateExportInputs(inputPath, outputPath);
        
        // Initialize PDF export service
        const exportService = new PDFExportService();
        
        // Read input file
        spinner.text = 'Reading input file...';
        const inputText = await fs.readFile(inputPath, 'utf-8');
        
        // Detect or use specified document type
        const documentType = options.type || await detectDocumentType(inputText);
        
        // Parse options
        const exportOptions = parseExportOptions(options);
        
        // Export to PDF
        spinner.text = 'Generating PDF...';
        await exportService.export(inputText, outputPath, documentType, exportOptions);
        
        spinner.succeed(`PDF exported successfully to ${outputPath}`);
        
        // Show summary
        const stats = await fs.stat(outputPath);
        logger.info('Export complete', {
          inputFile: inputPath,
          outputFile: outputPath,
          documentType,
          fileSize: `${(stats.size / 1024).toFixed(2)} KB`
        });
        
      } catch (error) {
        spinner.fail('Export failed');
        handleError(error as Error, options.debug);
        process.exit(1);
      }
    });

  return exportCommand;
}

async function validateExportInputs(inputPath: string, outputPath: string): Promise<void> {
  // Validate input file exists
  try {
    await fs.access(inputPath, fs.constants.R_OK);
  } catch {
    throw new Error(`Input file not found or not readable: ${inputPath}`);
  }
  
  // Validate output directory exists
  const outputDir = path.dirname(outputPath);
  try {
    await fs.access(outputDir, fs.constants.W_OK);
  } catch {
    throw new Error(`Output directory not writable: ${outputDir}`);
  }
  
  // Ensure output has .pdf extension
  if (!outputPath.toLowerCase().endsWith('.pdf')) {
    throw new Error('Output file must have .pdf extension');
  }
}

function parseExportOptions(options: any): any {
  const exportOptions: any = {
    pageNumbers: options.pageNumbers !== false
  };
  
  // Parse custom margins
  if (options.margins) {
    const margins = options.margins.split(',').map((m: string) => parseFloat(m.trim()));
    if (margins.length === 4 && margins.every((m: number) => !isNaN(m))) {
      exportOptions.margins = {
        top: margins[0] * 72,    // Convert inches to points
        right: margins[1] * 72,
        bottom: margins[2] * 72,
        left: margins[3] * 72
      };
    }
  }
  
  return exportOptions;
}

async function detectDocumentType(text: string): Promise<string> {
  // Simple detection based on content
  const upperText = text.toUpperCase();
  
  if (upperText.includes('PROVISIONAL PATENT APPLICATION')) {
    return 'provisional-patent-application';
  } else if (upperText.includes('TRADEMARK APPLICATION')) {
    return 'trademark-application';
  } else if (upperText.includes('OFFICE ACTION')) {
    return 'office-action-response';
  } else if (upperText.includes('NON-DISCLOSURE AGREEMENT')) {
    return 'nda-ip-specific';
  } else if (upperText.includes('PATENT ASSIGNMENT')) {
    return 'patent-assignment-agreement';
  } else if (upperText.includes('PATENT LICENSE')) {
    return 'patent-license-agreement';
  } else if (upperText.includes('TECHNOLOGY TRANSFER')) {
    return 'technology-transfer-agreement';
  } else if (upperText.includes('CEASE AND DESIST')) {
    return 'cease-and-desist-letter';
  }
  
  // Default
  return 'patent-assignment-agreement';
}
```

**Testing**: Verify command registration and basic validation.

**Definition of Done**: Export command created and registered with CLI.

### 2.6.2 Add command line arguments

**Description**: Implement comprehensive command line argument handling.

**Implementation Steps**:

1. Update command registration in `src/index.ts`:
```typescript
import { createExportCommand } from './commands/export';

// In the main program setup
program
  .addCommand(createGenerateCommand())
  .addCommand(createExportCommand())  // Add export command
  .addCommand(createLearnCommand());
```

2. Add advanced options to export command:
```typescript
exportCommand
  .description('Export a generated document to PDF format')
  .argument('<input>', 'Path to the input text file')
  .argument('<output>', 'Path for the output PDF file')
  .option('-t, --type <type>', 'Document type', [
    'provisional-patent-application',
    'trademark-application', 
    'office-action-response',
    'nda-ip-specific',
    'patent-assignment-agreement',
    'patent-license-agreement',
    'technology-transfer-agreement',
    'cease-and-desist-letter'
  ])
  .option('-d, --debug', 'Enable debug output')
  .option('--no-page-numbers', 'Disable page numbering')
  .option('--margins <margins>', 'Custom margins in inches (format: "top,right,bottom,left")')
  .option('--line-spacing <spacing>', 'Override line spacing', ['single', 'one-half', 'double'])
  .option('--font-size <size>', 'Font size in points', parseInt)
  .option('--paper-size <size>', 'Paper size', ['letter', 'legal', 'a4'])
  .option('--header <text>', 'Add header text to all pages')
  .option('--watermark <text>', 'Add watermark text')
  .option('--metadata <json>', 'Document metadata as JSON')
  .addHelpText('after', `
Examples:
  $ casethread export document.txt document.pdf
  $ casethread export document.txt document.pdf --type nda-ip-specific
  $ casethread export document.txt document.pdf --margins "1.5,1,1,1"
  $ casethread export document.txt document.pdf --no-page-numbers --line-spacing double
  `);
```

3. Add validation for options:
```typescript
function validateExportOptions(options: any): void {
  // Validate document type
  if (options.type) {
    const validTypes = [
      'provisional-patent-application',
      'trademark-application',
      'office-action-response',
      'nda-ip-specific',
      'patent-assignment-agreement',
      'patent-license-agreement',
      'technology-transfer-agreement',
      'cease-and-desist-letter'
    ];
    
    if (!validTypes.includes(options.type)) {
      throw new Error(`Invalid document type: ${options.type}`);
    }
  }
  
  // Validate line spacing
  if (options.lineSpacing && !['single', 'one-half', 'double'].includes(options.lineSpacing)) {
    throw new Error(`Invalid line spacing: ${options.lineSpacing}`);
  }
  
  // Validate font size
  if (options.fontSize && (options.fontSize < 8 || options.fontSize > 24)) {
    throw new Error('Font size must be between 8 and 24 points');
  }
  
  // Validate paper size
  if (options.paperSize && !['letter', 'legal', 'a4'].includes(options.paperSize)) {
    throw new Error(`Invalid paper size: ${options.paperSize}`);
  }
  
  // Validate metadata JSON
  if (options.metadata) {
    try {
      JSON.parse(options.metadata);
    } catch {
      throw new Error('Invalid metadata JSON');
    }
  }
}
```

**Testing**: Test various command line argument combinations.

**Definition of Done**: All command line arguments working correctly.

### 2.6.3 Implement file reading logic

**Description**: Add robust file reading with encoding detection and validation.

**Implementation Steps**:

1. Create file reading utilities:
```typescript
import * as chardet from 'chardet';
import * as iconv from 'iconv-lite';

async function readInputFile(filePath: string): Promise<string> {
  const logger = new Logger('FileReader');
  
  try {
    // Check file size
    const stats = await fs.stat(filePath);
    if (stats.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('Input file too large (max 10MB)');
    }
    
    // Detect encoding
    const buffer = await fs.readFile(filePath);
    const encoding = chardet.detect(buffer) || 'utf8';
    logger.debug('Detected encoding', { encoding, file: filePath });
    
    // Convert to UTF-8 if needed
    let text: string;
    if (encoding !== 'utf8' && encoding !== 'UTF-8') {
      text = iconv.decode(buffer, encoding);
    } else {
      text = buffer.toString('utf8');
    }
    
    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Validate content
    if (text.trim().length === 0) {
      throw new Error('Input file is empty');
    }
    
    return text;
  } catch (error) {
    logger.error('Failed to read input file', error);
    throw new Error(`Failed to read input file: ${(error as Error).message}`);
  }
}

async function validateTextContent(text: string): Promise<void> {
  // Check for binary content
  const binaryChars = text.match(/[\x00-\x08\x0E-\x1F\x7F-\x9F]/g);
  if (binaryChars && binaryChars.length > text.length * 0.01) {
    throw new Error('Input file appears to contain binary content');
  }
  
  // Check minimum content length
  const words = text.trim().split(/\s+/);
  if (words.length < 10) {
    throw new Error('Input file contains insufficient content (minimum 10 words)');
  }
  
  // Warn about potential issues
  const logger = new Logger('ContentValidator');
  
  if (text.length > 500000) {
    logger.warn('Large document detected - PDF generation may be slow');
  }
  
  const signatureMarkers = text.match(/\[SIGNATURE_BLOCK:[^\]]+\]/g) || [];
  if (signatureMarkers.length > 10) {
    logger.warn('Many signature blocks detected', { count: signatureMarkers.length });
  }
}
```

**Testing**: Test file reading with various encodings and content types.

**Definition of Done**: File reading handles various formats robustly.

### 2.6.4 Add progress indicators

**Description**: Implement detailed progress feedback during PDF generation.

**Implementation Steps**:

1. Create progress tracking system:
```typescript
import { EventEmitter } from 'events';

export class ProgressTracker extends EventEmitter {
  private totalSteps: number;
  private currentStep: number;
  private spinner: any;

  constructor(spinner: any) {
    super();
    this.totalSteps = 0;
    this.currentStep = 0;
    this.spinner = spinner;
  }

  public setTotalSteps(steps: number): void {
    this.totalSteps = steps;
    this.currentStep = 0;
  }

  public incrementStep(message?: string): void {
    this.currentStep++;
    const percentage = Math.round((this.currentStep / this.totalSteps) * 100);
    
    if (message) {
      this.spinner.text = `${message} (${percentage}%)`;
    } else {
      this.spinner.text = `Processing... (${percentage}%)`;
    }
    
    this.emit('progress', {
      current: this.currentStep,
      total: this.totalSteps,
      percentage
    });
  }

  public setMessage(message: string): void {
    const percentage = Math.round((this.currentStep / this.totalSteps) * 100);
    this.spinner.text = `${message} (${percentage}%)`;
  }
}
```

2. Integrate progress tracking in export process:
```typescript
// In the export action
const progress = new ProgressTracker(spinner);

// Set up progress stages
progress.setTotalSteps(7);

// Stage 1: Validate inputs
progress.incrementStep('Validating inputs...');
await validateExportInputs(inputPath, outputPath);

// Stage 2: Read file
progress.incrementStep('Reading input file...');
const inputText = await readInputFile(inputPath);

// Stage 3: Parse document
progress.incrementStep('Parsing document structure...');
const parsedDoc = parser.parseDocument(inputText);

// Stage 4: Prepare layout
progress.incrementStep('Preparing layout...');
const blocks = await prepareLayoutBlocks(parsedDoc);

// Stage 5: Generate PDF
progress.incrementStep('Generating PDF pages...');
await generator.start();

// Stage 6: Render content
progress.incrementStep('Rendering content...');
await renderAllPages(blocks, generator, progress);

// Stage 7: Finalize
progress.incrementStep('Finalizing PDF...');
await generator.finalize();

spinner.succeed(`PDF exported successfully to ${outputPath}`);
```

3. Add sub-progress for long operations:
```typescript
async function renderAllPages(
  blocks: LayoutBlock[],
  generator: LegalPDFGenerator,
  parentProgress: ProgressTracker
): Promise<void> {
  const totalBlocks = blocks.length;
  let processedBlocks = 0;
  
  for (const block of blocks) {
    await renderBlock(block, generator);
    
    processedBlocks++;
    if (processedBlocks % 10 === 0) {
      parentProgress.setMessage(
        `Rendering content... (${processedBlocks}/${totalBlocks} blocks)`
      );
    }
  }
}
```

**Testing**: Verify progress indicators update correctly.

**Definition of Done**: Progress feedback provides useful information to users.

### 2.6.5 Handle errors gracefully

**Description**: Implement comprehensive error handling for all failure scenarios.

**Implementation Steps**:

1. Create custom error types:
```typescript
export class PDFExportError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PDFExportError';
  }
}

export class FileAccessError extends PDFExportError {
  constructor(path: string, operation: 'read' | 'write') {
    super(
      `Cannot ${operation} file: ${path}`,
      `FILE_${operation.toUpperCase()}_ERROR`,
      { path, operation }
    );
  }
}

export class InvalidDocumentError extends PDFExportError {
  constructor(reason: string) {
    super(
      `Invalid document: ${reason}`,
      'INVALID_DOCUMENT',
      { reason }
    );
  }
}

export class PDFGenerationError extends PDFExportError {
  constructor(stage: string, originalError: Error) {
    super(
      `PDF generation failed during ${stage}`,
      'PDF_GENERATION_ERROR',
      { stage, originalError: originalError.message }
    );
  }
}
```

2. Implement error recovery strategies:
```typescript
async function exportWithRetry(
  exportService: PDFExportService,
  inputText: string,
  outputPath: string,
  documentType: string,
  options: any,
  maxRetries: number = 3
): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await exportService.export(inputText, outputPath, documentType, options);
      return; // Success
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry certain errors
      if (error instanceof FileAccessError || 
          error instanceof InvalidDocumentError) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new PDFGenerationError('export', lastError!);
}
```

3. Add cleanup on failure:
```typescript
async function cleanupOnError(outputPath: string): Promise<void> {
  try {
    // Check if partial file exists
    await fs.access(outputPath);
    
    // Remove partial file
    await fs.unlink(outputPath);
    
    const logger = new Logger('Cleanup');
    logger.debug('Removed partial output file', { path: outputPath });
  } catch {
    // File doesn't exist, nothing to clean up
  }
}

// In the main action
try {
  // ... export logic
} catch (error) {
  await cleanupOnError(outputPath);
  spinner.fail('Export failed');
  
  // Provide helpful error messages
  if (error instanceof FileAccessError) {
    console.error(`\n❌ ${error.message}`);
    console.error('Please check file permissions and try again.');
  } else if (error instanceof InvalidDocumentError) {
    console.error(`\n❌ ${error.message}`);
    console.error('Please ensure the input file contains valid document text.');
  } else if (error instanceof PDFGenerationError) {
    console.error(`\n❌ ${error.message}`);
    console.error('This may be a temporary issue. Please try again.');
  } else {
    console.error(`\n❌ Unexpected error: ${(error as Error).message}`);
  }
  
  if (options.debug) {
    console.error('\nDebug information:');
    console.error(error);
  }
  
  process.exit(1);
}
```

**Testing**: Test error handling for various failure scenarios.

**Definition of Done**: All errors handled gracefully with helpful messages.

## Test Implementation

Create `__tests__/commands/export.test.ts`:
```typescript
import { createExportCommand } from '../../src/commands/export';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Export Command', () => {
  const testDir = path.join(__dirname, '../../test-output');
  const inputFile = path.join(testDir, 'test-input.txt');
  const outputFile = path.join(testDir, 'test-output.pdf');

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test files
    try {
      await fs.unlink(inputFile);
      await fs.unlink(outputFile);
    } catch {}
  });

  it('should create export command', () => {
    const command = createExportCommand();
    expect(command.name()).toBe('export');
    expect(command.description()).toContain('Export');
  });

  it('should validate input file exists', async () => {
    const command = createExportCommand();
    
    // Test with non-existent file
    await expect(async () => {
      await command.parseAsync(['node', 'test', 'nonexistent.txt', 'output.pdf']);
    }).rejects.toThrow();
  });

  it('should require PDF extension for output', async () => {
    // Create test input file
    await fs.writeFile(inputFile, 'Test content');
    
    const command = createExportCommand();
    
    await expect(async () => {
      await command.parseAsync(['node', 'test', inputFile, 'output.txt']);
    }).rejects.toThrow('must have .pdf extension');
  });

  it('should detect document type from content', async () => {
    const content = 'PROVISIONAL PATENT APPLICATION\nFor: Test Invention';
    await fs.writeFile(inputFile, content);
    
    // Test detection logic
    const { detectDocumentType } = require('../../src/commands/export');
    const type = await detectDocumentType(content);
    expect(type).toBe('provisional-patent-application');
  });
});
```

## Common Pitfalls

1. **Path Resolution**: Always resolve paths relative to current working directory
2. **File Permissions**: Check both read and write permissions before processing
3. **Memory Usage**: Large files can cause memory issues - implement streaming if needed
4. **Encoding Issues**: Handle various text encodings properly
5. **Concurrent Access**: Prevent multiple processes from writing to same output file

## File Changes

- **Created**:
  - `src/commands/export.ts` - Export command implementation
  - `__tests__/commands/export.test.ts` - Command tests
  
- **Modified**:
  - `src/index.ts` - Register export command
  - `package.json` - Add chardet and iconv-lite dependencies

## Next Steps

1. Continue to Task 2.7: Add Comprehensive Tests
2. Create user documentation for export command
3. Add batch export functionality for multiple files

## Success Criteria

- [ ] Export command created and registered
- [ ] All command line arguments working
- [ ] File reading handles various formats
- [ ] Progress indicators provide useful feedback
- [ ] Errors handled gracefully
- [ ] All tests pass 