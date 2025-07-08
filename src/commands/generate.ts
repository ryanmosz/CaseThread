import { Command, Argument } from 'commander';
import { createSpinner } from '../utils/spinner';
import { logger } from '../utils/logger';
import { isValidDocumentType, SUPPORTED_TYPES } from '../utils/validator';
import { loadTemplate, loadExplanation } from '../services/template';
import { parseYaml } from '../services/yaml';
import { OpenAIService } from '../services/openai';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface GenerateOptions {
  output: string;
}

// Define spinner messages for consistency
const SPINNER_MESSAGES = {
  INIT: 'Initializing...',
  VALIDATE_TYPE: 'Validating document type...',
  CREATE_OUTPUT_DIR: 'Creating output directory...',
  CHECK_PERMISSIONS: 'Checking directory permissions...',
  LOAD_TEMPLATE: 'Loading document template...',
  LOAD_EXPLANATION: 'Loading template explanation...',
  PARSE_YAML: 'Parsing input data...',
  VALIDATE_YAML: 'Validating input data...',
  PREPARE_PROMPT: 'Preparing AI prompt...',
  CONNECT_OPENAI: 'Connecting to OpenAI...',
  GENERATE_DOC: 'Generating document (this may take 30-60 seconds)...',
  SAVE_DOC: 'Saving document...',
  SUCCESS: 'Document generated successfully!'
};

export const generateCommand = new Command('generate')
  .description('Generate a legal document from template and input data')
  .addArgument(new Argument('<document-type>', 'Type of legal document to generate'))
  .addArgument(new Argument('<input-path>', 'Path to YAML input file'))
  .option('-o, --output <path>', 'Output directory for generated document', '.')
  .action(async (documentType: string, inputPath: string, options: GenerateOptions) => {
    const spinner = createSpinner(SPINNER_MESSAGES.INIT);
    const startTime = Date.now();
    
    try {
      // Step 1: Validate and resolve output directory
      const outputDir = path.resolve(options.output);
      logger.debug(`Output directory set to: ${outputDir}`);
      
      // Verify output directory exists or can be created
      try {
        await fs.access(outputDir);
        spinner.updateMessage(SPINNER_MESSAGES.CHECK_PERMISSIONS);
      } catch {
        // Directory doesn't exist, try to create it
        spinner.updateMessage(SPINNER_MESSAGES.CREATE_OUTPUT_DIR);
        await fs.mkdir(outputDir, { recursive: true });
      }
      
      // Verify write permissions
      try {
        await fs.access(outputDir, fs.constants.W_OK);
      } catch {
        throw new Error(`No write permission for output directory: ${outputDir}`);
      }
      
      // Step 2: Validate document type
      spinner.updateMessage(SPINNER_MESSAGES.VALIDATE_TYPE);
      logger.debug(`Validating document type: ${documentType}`);
      
      if (!isValidDocumentType(documentType)) {
        throw new Error(
          `Invalid document type: ${documentType}\n` +
          `Supported types: ${SUPPORTED_TYPES.join(', ')}`
        );
      }
      
      // Step 3: Load template files with individual updates
      spinner.updateMessage(SPINNER_MESSAGES.LOAD_TEMPLATE);
      logger.debug(`Loading template for type: ${documentType}`);
      const template = await loadTemplate(documentType);
      
      spinner.updateMessage(SPINNER_MESSAGES.LOAD_EXPLANATION);
      const explanation = await loadExplanation(documentType);
      
      // Step 4: Parse and validate YAML
      spinner.updateMessage(SPINNER_MESSAGES.PARSE_YAML);
      logger.debug(`Loading YAML from: ${inputPath}`);
      const yamlData = await parseYaml(inputPath);
      
      spinner.updateMessage(SPINNER_MESSAGES.VALIDATE_YAML);
      // YAML validation happens inside parseYaml, this is just for visual feedback
      
      // Step 5: Generate document with detailed progress
      spinner.updateMessage(SPINNER_MESSAGES.PREPARE_PROMPT);
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for visual feedback
      
      spinner.updateMessage(SPINNER_MESSAGES.CONNECT_OPENAI);
      
      // Add timestamp to long-running message
      const genStartTime = Date.now();
      spinner.updateMessage(SPINNER_MESSAGES.GENERATE_DOC);
      
      // Update spinner during generation with elapsed time
      const updateInterval = setInterval(() => {
        const elapsed = Math.round((Date.now() - genStartTime) / 1000);
        spinner.updateMessage(`${SPINNER_MESSAGES.GENERATE_DOC} (${elapsed}s elapsed)`);
      }, 5000);
      
      try {
        // Initialize OpenAI service
        const openaiService = new OpenAIService({
          apiKey: process.env.OPENAI_API_KEY || '',
          model: process.env.OPENAI_MODEL || 'o3',
          temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.2')
        });
        
        const result = await openaiService.generateDocument(
          template,
          explanation,
          yamlData
        );
        
        clearInterval(updateInterval);
        
        // Success!
        const totalTime = Math.round((Date.now() - startTime) / 1000);
        spinner.success(`${SPINNER_MESSAGES.SUCCESS} (completed in ${totalTime}s)`);
        
        // Store output directory for use in subtask 5.7
        logger.debug(`Document will be saved to: ${outputDir}`);
        
        // Temporary: Output to console until 5.7 implements file saving
        console.log(`\n--- Generated Document (will be saved to ${outputDir}) ---\n`);
        console.log(result.content);
        
      } catch (error) {
        clearInterval(updateInterval);
        throw error;
      }
      
    } catch (error) {
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      spinner.fail(`Error: ${(error as Error).message} (failed after ${totalTime}s)`);
      logger.error('Document generation failed:', error);
      process.exit(1);
    }
  }); 