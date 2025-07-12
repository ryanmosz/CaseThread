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
import { ParallelOrchestrator } from '../agents/ParallelOrchestrator';
import { config } from '../config';
import { executeQualityPipeline } from '../agents/langgraph/QualityPipelineWorkflow';
import { loadTemplate } from '../services/template';
import { parseYaml } from '../services/yaml';
import { ContextBuilderAgent } from '../agents/ContextBuilderAgent';
import { MatterContext } from '../types/agents';
import { createOutputPath } from '../utils/file-naming';
import { saveDocument } from '../services/file-writer';

interface GenerateOptions {
  output: string;
  debug?: boolean;
  parallel?: boolean;
  quality?: boolean;
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
  .option('-p, --parallel', 'Enable parallel drafting (experimental)')
  .option('-q, --quality', 'Enable quality pipeline with LangGraph (premium mode)')
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
      
      // Check if quality pipeline mode is enabled
      if (options.quality) {
        // Run LangGraph Quality Pipeline
        spinner.updateMessage('🎯 Running LangGraph Quality Pipeline...');
        logger.info('Quality mode enabled - using LangGraph 3-agent pipeline');
        
        // Parse YAML file
        const yamlData = await parseYaml(inputPath);
        
        // Load template
        const template = await loadTemplate(documentType);
        
        // Create matter context
        const matterContext: MatterContext = {
          documentType,
          client: yamlData.client,
          attorney: yamlData.attorney,
          template: template.id,
          yamlData: {
            ...yamlData,
            document_type: documentType
          },
          validationResults: [],
          normalizedData: yamlData
        };
        
        // Build context using existing ContextBuilderAgent
        const contextBuilderAgent = new ContextBuilderAgent();
        const contextResult = await contextBuilderAgent.process({ matterContext });
        
        if (!contextResult.success) {
          logger.warn(`Context Builder Agent failed: ${contextResult.error?.message}`);
          // Continue with empty context bundle if context building fails
          contextResult.data = {
            contextBundle: {
              embeddings: [],
              sources: [],
              totalTokens: 0,
              queryMetadata: {
                searchTerms: [],
                similarityThreshold: 0.75,
                resultsCount: 0
              }
            }
          };
        }
        
        const { contextBundle } = contextResult.data;
        
        // Execute LangGraph Quality Pipeline
        const pipelineResult = await executeQualityPipeline(
          documentType,
          template,
          matterContext,
          contextBundle,
          {
            maxIterations: 3,
            debug: options.debug || false,
            threadId: `quality-${Date.now()}`
          }
        );
        
        // Generate output path
        const outputPath = createOutputPath(outputDir, documentType);
        
        // Save the final document
        const saveResult = await saveDocument(
          pipelineResult.finalDocument || pipelineResult.generatedDocument || '',
          outputPath
        );
        
        const generationTime = Math.round(
          (pipelineResult.endTime!.getTime() - pipelineResult.startTime.getTime()) / 1000
        );
        
        // Success!
        spinner.success(`${SPINNER_MESSAGES.SUCCESS} (Quality Pipeline - ${generationTime}s)`);
        
        // Display enhanced success information for quality mode
        console.log('\n🎯 Quality Pipeline Complete!\n');
        console.log(`📄 Document Type: ${documentType}`);
        console.log(`📁 Saved to: ${saveResult.path}`);
        console.log(`⏱️  Generation time: ${generationTime} seconds`);
        console.log(`🏆 Final Quality Score: ${pipelineResult.qualityScore}/100`);
        console.log(`🔄 Iterations: ${pipelineResult.currentIteration}`);
        console.log(`🎭 Status: ${pipelineResult.completionStatus}`);
        console.log(`💰 Cost Optimization: ${pipelineResult.modelUsage.costOptimization.savingsPercentage.toFixed(1)}% savings`);
        
        if (pipelineResult.passedFinalGate) {
          console.log('✅ Document approved for client delivery');
        } else if (pipelineResult.passedQualityGate) {
          console.log('⚠️  Document meets quality standards but needs final refinement');
        } else {
          console.log('❌ Document needs improvement (consider additional iterations)');
        }
        
        console.log('\n🤖 Model Usage:');
        console.log(`  GPT-4 calls: ${pipelineResult.modelUsage.gpt4Calls}`);
        console.log(`  o3 calls: ${pipelineResult.modelUsage.o3Calls}`);
        console.log(`  Total cost: $${pipelineResult.modelUsage.totalCost.toFixed(4)}`);
        
        if (pipelineResult.errors.length > 0) {
          console.log('\n⚠️  Warnings/Errors:');
          pipelineResult.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error.type}: ${error.message}`);
          });
        }
        
        console.log('\n💡 Quality Tip: Review the document against the specific quality feedback provided');
        
        process.exit(ErrorCode.SUCCESS);
        
             } else {
         // Use orchestrator to run the complete pipeline
         spinner.updateMessage('🚀 Running multi-agent pipeline...');

         const orchestrator = options.parallel || config.parallel.ENABLED_BY_DEFAULT
           ? new ParallelOrchestrator()
           : new Orchestrator();
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
       }
      
    } catch (error) {
      logger.debug('Error occurred during generation:', error);
      handleError(error as Error, spinner);
    }
  }); 