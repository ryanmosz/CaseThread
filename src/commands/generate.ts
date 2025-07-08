import { Command } from 'commander';
import * as path from 'path';
import { promises as fs } from 'fs';
import { 
  isValidDocumentType,
  SUPPORTED_TYPES 
} from '../utils/validator';
import { createSpinner, CaseThreadSpinner } from '../utils/spinner';
import { logger } from '../utils/logger';
import { SpinnerMessages } from '../types';
import { handleError, createError } from '../utils/error-handler';
import { ErrorCode } from '../types/errors';
import { Orchestrator } from '../agents/Orchestrator';

interface GenerateOptions {
  output: string;
  debug?: boolean;
}

// Simple wrapper to match the expected interface
class SpinnerWrapper implements CaseThreadSpinner {
  private spinner: CaseThreadSpinner;
  
  constructor(initialMessage: string) {
    this.spinner = createSpinner(initialMessage);
  }
  
  updateMessage(message: string): void {
    this.spinner.updateMessage(message);
  }
  
  success(message?: string): void {
    this.spinner.success(message);
  }
  
  succeed(message?: string): void {
    this.spinner.success(message);
  }
  
  fail(message?: string): void {
    this.spinner.fail(message);
  }
  
  warn(message?: string): void {
    this.spinner.warn(message);
  }
  
  stop(): void {
    this.spinner.stop();
  }
  
  get isSpinning(): boolean {
    return this.spinner.isSpinning;
  }
  
  get ora(): any {
    return this.spinner.ora;
  }
}

const SPINNER_MESSAGES: SpinnerMessages = {
  INIT: 'Initializing CaseThread CLI...',
  CHECK_PERMISSIONS: 'Checking output directory permissions...',
  CREATE_OUTPUT_DIR: 'Creating output directory...',
  VALIDATE_TYPE: 'Validating document type...',
  LOAD_TEMPLATE: 'Loading document template...',
  LOAD_EXPLANATION: 'Loading template explanation...',
  PARSE_YAML: 'Parsing input YAML file...',
  VALIDATE_YAML: 'Validating YAML data against template requirements...',
  PREPARE_PROMPT: 'Preparing prompt for AI generation...',
  CONNECT_OPENAI: 'Connecting to OpenAI API...',
  GENERATE_DOC: 'Generating legal document with AI...',
  SAVE_DOC: 'Saving generated document...',
  SUCCESS: 'Document generated successfully!'
};

export const generateCommand = new Command('generate')
  .description('Generate a legal document from template and input data')
  .argument('<document-type>', 'Type of legal document to generate')
  .argument('<input-path>', 'Path to YAML input file')
  .option('-o, --output <path>', 'Output directory for generated document', '.')
  .option('-d, --debug', 'Enable debug logging')
  .action(async (documentType: string, inputPath: string, options: GenerateOptions) => {
    // Check for command-level debug flag
    if (options.debug && logger.level !== 'debug') {
      logger.level = 'debug';
      logger.debug('Debug logging enabled via command flag');
    }
    
    const spinner = new SpinnerWrapper(SPINNER_MESSAGES.INIT);
    
    // Log command execution details
    logger.debug('=== Generate Command Execution ===');
    logger.debug(`Document Type: ${documentType}`);
    logger.debug(`Input Path: ${inputPath}`);
    logger.debug(`Output Directory: ${options.output}`);
    logger.debug(`Debug Mode: ${options.debug || logger.level === 'debug'}`);
    logger.debug('=================================');
    
    try {
      // Validate output directory
      const outputDir = path.resolve(options.output);
      logger.debug(`Resolved output directory: ${outputDir}`);
      
      try {
        await fs.access(outputDir);
        logger.debug(`Output directory exists: ${outputDir}`);
        spinner.updateMessage(SPINNER_MESSAGES.CHECK_PERMISSIONS);
      } catch (error) {
        logger.debug(`Output directory does not exist: ${outputDir}`, error);
        spinner.updateMessage(SPINNER_MESSAGES.CREATE_OUTPUT_DIR);
        try {
          await fs.mkdir(outputDir, { recursive: true });
          logger.debug(`Created output directory: ${outputDir}`);
        } catch (mkdirError) {
          throw createError('PERMISSION_ERROR', outputDir);
        }
      }
      
      // Check write permissions
      try {
        await fs.access(outputDir, fs.constants.W_OK);
        logger.debug(`Write permissions confirmed for: ${outputDir}`);
      } catch {
        throw createError('PERMISSION_ERROR', outputDir);
      }
      
      // Validate document type
      spinner.updateMessage(SPINNER_MESSAGES.VALIDATE_TYPE);
      logger.debug(`Validating document type: ${documentType}`);
      
      if (!isValidDocumentType(documentType)) {
        throw createError('INVALID_TYPE', documentType, SUPPORTED_TYPES);
      }
      
      // Use orchestrator to run the complete pipeline
      spinner.updateMessage('🚀 Running multi-agent pipeline...');
      
      const orchestrator = new Orchestrator();
      const jobResult = await orchestrator.runJob({
        documentType,
        inputPath,
        outputPath: outputDir,
        options: {
          debug: options.debug || false
        }
      });
      
      if (!jobResult.success) {
        throw new Error(`Job failed: ${jobResult.error?.message || 'Unknown error'}`);
      }
      
      const generationTime = Math.round((jobResult.metadata.totalProcessingTime || 0) / 1000);
      
      // Success!
      spinner.success(`${SPINNER_MESSAGES.SUCCESS} (completed in ${generationTime}s)`);
      
      // Display success information
      console.log('\n✨ Document Generation Complete!\n');
      console.log(`📄 Document Type: ${documentType}`);
      console.log(`📁 Saved to: Generated successfully`);
      console.log(`⏱️  Generation time: ${generationTime} seconds`);
      console.log(`🤖 Agents executed: ${jobResult.metadata.agentExecutionOrder.join(' → ')}`);
      
      if (jobResult.reviewPacket && jobResult.reviewPacket.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        jobResult.reviewPacket.recommendations.forEach((rec, index) => {
          console.log(`  ${index + 1}. ${rec}`);
        });
      }
      
      console.log('\n💡 Tip: Review the generated document for accuracy and completeness');
      
      process.exit(ErrorCode.SUCCESS);
      
    } catch (error) {
      logger.debug('Error occurred during generation:', error);
      handleError(error as Error, spinner);
    }
  }); 