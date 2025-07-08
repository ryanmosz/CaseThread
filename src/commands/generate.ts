import { Command } from 'commander';
import * as path from 'path';
import { promises as fs } from 'fs';
import { 
  loadTemplate, 
  loadExplanation 
} from '../services/template';
import { parseYaml } from '../services/yaml';
import { generateDocument } from '../services/openai';
import { 
  isValidDocumentType,
  SUPPORTED_TYPES 
} from '../utils/validator';
import { createSpinner, CaseThreadSpinner } from '../utils/spinner';
import { logger } from '../utils/logger';
import { SpinnerMessages } from '../types';
import { handleError, createError } from '../utils/error-handler';
import { ErrorCode } from '../types/errors';
import { createOutputPath } from '../utils/file-naming';
import { saveDocument, addDocumentMetadata } from '../services/file-writer';

interface GenerateOptions {
  output: string;
  debug?: boolean;
}

// Simple wrapper to match the expected interface
class SpinnerWrapper {
  private spinner: CaseThreadSpinner;
  
  constructor(initialMessage: string) {
    this.spinner = createSpinner(initialMessage);
  }
  
  updateMessage(message: string): void {
    this.spinner.updateMessage(message);
  }
  
  succeed(message?: string): void {
    this.spinner.success(message);
  }
  
  fail(message?: string): void {
    this.spinner.fail(message);
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
    const startTime = Date.now();
    
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
      
      // Load template files
      spinner.updateMessage(SPINNER_MESSAGES.LOAD_TEMPLATE);
      logger.debug(`Loading template from: templates/core/${documentType}.json`);
      
      let template, explanation;
      try {
        template = await loadTemplate(documentType);
        logger.debug(`Template loaded successfully, keys: ${Object.keys(template).join(', ')}`);
      } catch (error: any) {
        if (error.message.includes('ENOENT')) {
          throw createError('TEMPLATE_NOT_FOUND', documentType);
        }
        throw error;
      }
      
      spinner.updateMessage(SPINNER_MESSAGES.LOAD_EXPLANATION);
      logger.debug(`Loading explanation from: templates/explanations/${documentType}-explanation.md`);
      try {
        explanation = await loadExplanation(documentType);
        logger.debug(`Explanation loaded, length: ${explanation.length} characters`);
      } catch (error: any) {
        if (error.message.includes('ENOENT')) {
          throw createError('TEMPLATE_NOT_FOUND', documentType);
        }
        throw error;
      }
      
      // Parse and validate YAML
      spinner.updateMessage(SPINNER_MESSAGES.PARSE_YAML);
      logger.debug(`Parsing YAML file: ${inputPath}`);
      
      let yamlData;
      try {
        yamlData = await parseYaml(inputPath);
        logger.debug(`YAML parsed successfully, keys: ${Object.keys(yamlData).join(', ')}`);
      } catch (error: any) {
        if (error.message.includes('ENOENT')) {
          throw createError('FILE_NOT_FOUND', inputPath);
        } else if (error.message.includes('YAMLException')) {
          throw createError('INVALID_YAML', error.message);
        } else if (error.message.includes('Missing required fields')) {
          // Extract field names from error
          const fields = error.message.match(/Missing required fields: (.+)/)?.[1]?.split(', ') || [];
          throw createError('MISSING_YAML_FIELDS', fields);
        }
        throw error;
      }
      
      spinner.updateMessage(SPINNER_MESSAGES.VALIDATE_YAML);
      logger.debug(`YAML data validated successfully`);
      
      // Generate document
      spinner.updateMessage(SPINNER_MESSAGES.PREPARE_PROMPT);
      logger.debug('Preparing to call OpenAI API...');
      logger.debug(`Template sections: ${JSON.stringify(Object.keys(template), null, 2)}`);
      logger.debug(`YAML data preview: ${JSON.stringify(yamlData, null, 2).substring(0, 200)}...`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      spinner.updateMessage(SPINNER_MESSAGES.CONNECT_OPENAI);
      
      const genStartTime = Date.now();
      spinner.updateMessage(SPINNER_MESSAGES.GENERATE_DOC);
      
      const updateInterval = setInterval(() => {
        const elapsed = Math.round((Date.now() - genStartTime) / 1000);
        spinner.updateMessage(`${SPINNER_MESSAGES.GENERATE_DOC} (${elapsed}s elapsed)`);
      }, 5000);
      
      let generatedDocument;
      try {
        generatedDocument = await generateDocument(template, explanation, yamlData);
        clearInterval(updateInterval);
        logger.debug(`Document generated successfully, length: ${generatedDocument.length} characters`);
      } catch (error: any) {
        clearInterval(updateInterval);
        logger.debug('Error during OpenAI generation:', error);
        
        // Handle specific OpenAI errors
        if (error.message.includes('API key') || error.message.includes('Invalid API Key')) {
          throw createError('OPENAI_ERROR', 'Invalid or missing API key');
        } else if (error.message.includes('rate limit')) {
          throw createError('OPENAI_ERROR', 'Rate limit exceeded');
        } else if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
          throw createError('NETWORK_ERROR');
        }
        
        throw error;
      }
      
      // Save the document
      spinner.updateMessage(SPINNER_MESSAGES.SAVE_DOC);
      
      // Calculate generation time
      const generationTime = Math.round((Date.now() - startTime) / 1000);
      
      // Add metadata to document
      const documentWithMetadata = addDocumentMetadata(
        generatedDocument,
        documentType,
        path.basename(inputPath),
        generationTime
      );
      
      // Create output path
      const outputPath = createOutputPath(outputDir, documentType);
      logger.debug(`Saving document to: ${outputPath}`);
      
      // Save the document
      const saveResult = await saveDocument(documentWithMetadata, outputPath);
      logger.debug(`Document saved successfully: ${saveResult.path}`);
      
      // Success!
      spinner.succeed(`${SPINNER_MESSAGES.SUCCESS} (completed in ${generationTime}s)`);
      
      // Display success information
      console.log('\n✨ Document Generation Complete!\n');
      console.log(`📄 Document Type: ${documentType}`);
      console.log(`📁 Saved to: ${saveResult.path}`);
      console.log(`📏 File size: ${(saveResult.size / 1024).toFixed(2)} KB`);
      console.log(`⏱️  Generation time: ${generationTime} seconds`);
      console.log('\n💡 Tip: You can open the file with: cat ' + saveResult.path);
      
      process.exit(ErrorCode.SUCCESS);
      
    } catch (error) {
      logger.debug('Error occurred during generation:', error);
      handleError(error as Error, spinner);
    }
  }); 