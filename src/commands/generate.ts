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

export const generateCommand = new Command('generate')
  .description('Generate a legal document from template and input data')
  .addArgument(new Argument('<document-type>', 'Type of legal document to generate'))
  .addArgument(new Argument('<input-path>', 'Path to YAML input file'))
  .option('-o, --output <path>', 'Output directory for generated document', '.')
  .action(async (documentType: string, inputPath: string, options: GenerateOptions) => {
    const spinner = createSpinner('Initializing...');
    
    try {
      // Step 1: Validate and resolve output directory
      const outputDir = path.resolve(options.output);
      logger.debug(`Output directory set to: ${outputDir}`);
      
      // Verify output directory exists or can be created
      try {
        await fs.access(outputDir);
      } catch {
        // Directory doesn't exist, try to create it
        spinner.updateMessage(`Creating output directory: ${outputDir}`);
        await fs.mkdir(outputDir, { recursive: true });
      }
      
      // Verify write permissions
      try {
        await fs.access(outputDir, fs.constants.W_OK);
      } catch {
        throw new Error(`No write permission for output directory: ${outputDir}`);
      }
      
      // Step 2: Validate document type
      spinner.updateMessage('Validating document type...');
      logger.debug(`Validating document type: ${documentType}`);
      
      if (!isValidDocumentType(documentType)) {
        throw new Error(
          `Invalid document type: ${documentType}\n` +
          `Supported types: ${SUPPORTED_TYPES.join(', ')}`
        );
      }
      
      // Step 3: Load template files
      spinner.updateMessage('Loading template files...');
      logger.debug(`Loading template for type: ${documentType}`);
      
      const template = await loadTemplate(documentType);
      const explanation = await loadExplanation(documentType);
      
      // Step 4: Load and validate YAML
      spinner.updateMessage('Validating input data...');
      logger.debug(`Loading YAML from: ${inputPath}`);
      
      const yamlData = await parseYaml(inputPath);
      
      // Step 5: Generate document via OpenAI
      spinner.updateMessage('Connecting to OpenAI...');
      spinner.updateMessage('Generating document (this may take 30-60 seconds)...');
      
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
      
      // Document saving will be handled in subtask 5.7
      spinner.success('Document generated successfully!');
      
      // Store output directory for use in subtask 5.7
      logger.debug(`Document will be saved to: ${outputDir}`);
      
      // Temporary: Output to console until 5.7 implements file saving
      console.log(`\n--- Generated Document (will be saved to ${outputDir}) ---\n`);
      console.log(result.content);
      
    } catch (error) {
      spinner.fail(`Error: ${(error as Error).message}`);
      logger.error('Document generation failed:', error);
      process.exit(1);
    }
  }); 