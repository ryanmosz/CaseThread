/**
 * Orchestrator - Manages the multi-agent pipeline flow
 */

import { JobConfig, JobResult, AgentLogEntry, CheckpointResult, MatterContext } from '../types/agents';
import { DraftingAgent } from './DraftingAgent';
import { ContextBuilderAgent } from './ContextBuilderAgent';
import { loadTemplate } from '../services/template';
import { logger } from '../utils/logger';
import { saveDocument, addDocumentMetadata } from '../services/file-writer';
import { createOutputPath } from '../utils/file-naming';
import * as path from 'path';
import { parseYaml } from '../services/yaml';
import { isValidDocumentType } from '../utils/validator';

export class Orchestrator {
  private draftingAgent: DraftingAgent;
  private contextBuilderAgent: ContextBuilderAgent;

  constructor() {
    this.draftingAgent = new DraftingAgent();
    this.contextBuilderAgent = new ContextBuilderAgent();
    
    logger.info('Orchestrator initialized with agents:', {
      agents: [this.draftingAgent.name, this.contextBuilderAgent.name]
    });
  }

  /**
   * Execute the complete job pipeline
   */
  async runJob(config: JobConfig): Promise<JobResult> {
    const startTime = Date.now();
    const agentLogs: AgentLogEntry[] = [];
    const checkpointResults: CheckpointResult[] = [];
    const executionOrder: string[] = [];
    
    logger.info('Starting job execution', {
      documentType: config.documentType,
      inputPath: config.inputPath,
      outputPath: config.outputPath
    });

    // Track stage timings
    const stageTiming = {
      startup: 0,
      context: 0,
      drafting: 0,
      saving: 0
    };

    try {
      // Validate job configuration
      this.validateJobConfig(config);

      // Parse YAML file directly
      logger.debug('Parsing YAML input file');
      const yamlData = await parseYaml(config.inputPath);
      
      // Load template for drafting
      logger.debug('Loading document template');
      const template = await loadTemplate(config.documentType);

      // Create matter context directly
      const matterContext: MatterContext = {
        documentType: config.documentType,
        client: yamlData.client,
        attorney: yamlData.attorney,
        template: template.id,
        yamlData: {
          ...yamlData, // Use all YAML data
          document_type: config.documentType // Ensure document_type is set
        },
        validationResults: [],
        normalizedData: yamlData
      };

      // Record startup time
      stageTiming.startup = Date.now() - startTime;
      logger.info(`⏱️  Stage: Startup & Validation - ${stageTiming.startup}ms`);

      // Stage 1: Context Builder Agent
      const contextStartTime = Date.now();
      logger.debug('Running Context Builder Agent');
      logger.info('🔍 Stage: Context Search (ChromaDB) - Starting...');
      executionOrder.push('ContextBuilderAgent');
      
      const contextResult = await this.contextBuilderAgent.process({
        matterContext
      });

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

      // Record context time
      stageTiming.context = Date.now() - contextStartTime;
      logger.info(`⏱️  Stage: Context Search - ${stageTiming.context}ms`);

      // Collect metadata from context building
      agentLogs.push(...(contextResult.metadata?.agentLogs || []));
      checkpointResults.push(...(contextResult.metadata?.checkpoints || []));

      const { contextBundle } = contextResult.data;

      // Stage 2: Drafting Agent
      const draftStartTime = Date.now();
      logger.debug('Running Drafting Agent');
      logger.info('🤖 Stage: Document Generation (AI) - Starting...');
      executionOrder.push('DraftingAgent');
      
      const draftingResult = await this.draftingAgent.process({
        template,
        matterContext,
        contextBundle
      });

      if (!draftingResult.success) {
        throw new Error(`Drafting Agent failed: ${draftingResult.error?.message}`);
      }

      // Record drafting time
      stageTiming.drafting = Date.now() - draftStartTime;
      logger.info(`⏱️  Stage: Document Generation - ${stageTiming.drafting}ms`);

      // Collect metadata from drafting
      agentLogs.push(...(draftingResult.metadata?.agentLogs || []));
      checkpointResults.push(...(draftingResult.metadata?.checkpoints || []));

      const { draftMarkdown } = draftingResult.data;

      // Save the document
      const saveStartTime = Date.now();
      logger.info('💾 Stage: Saving Document - Starting...');
      const outputPath = createOutputPath(config.outputPath, config.documentType);
      
      const generationTime = Math.round((Date.now() - startTime) / 1000);
      const documentWithMetadata = addDocumentMetadata(
        draftMarkdown,
        config.documentType,
        path.basename(config.inputPath),
        generationTime
      );

      const saveResult = await saveDocument(documentWithMetadata, outputPath);
      
      // Record saving time
      stageTiming.saving = Date.now() - saveStartTime;
      logger.info(`⏱️  Stage: Saving Document - ${stageTiming.saving}ms`);
      
      const totalTime = Date.now() - startTime;
      logger.info('Job completed successfully', {
        outputPath: saveResult.path,
        fileSize: saveResult.size,
        processingTime: generationTime,
        stageTiming: {
          startup: `${stageTiming.startup}ms`,
          context: `${stageTiming.context}ms`,
          drafting: `${stageTiming.drafting}ms`,
          saving: `${stageTiming.saving}ms`,
          total: `${totalTime}ms`
        }
      });

      // Log summary timing
      logger.info(`📊 Timing Summary: Startup(${stageTiming.startup}ms) → Context(${stageTiming.context}ms) → AI(${stageTiming.drafting}ms) → Save(${stageTiming.saving}ms) = Total(${totalTime}ms)`);

      // Create a simple review packet for now
      const reviewPacket = {
        summary: `Document generation completed for ${config.documentType}`,
        documentDiff: 'N/A - First generation',
        billableTimeMemo: `Document generation: ${generationTime}s`,
        qualityScore: 0.85, // Placeholder
        recommendations: [
          'Review generated content for accuracy',
          'Verify all placeholders have been filled',
          'Check legal compliance requirements'
        ],
        nextSteps: [
          'Attorney review required',
          'Client approval needed',
          'File in matter management system'
        ],
        attachments: {
          qaReport: {
            checks: [],
            score: 0.85,
            recommendations: [],
            isComplete: true
          },
          riskFlags: [],
          agentLogs
        }
      };

      return {
        success: true,
        reviewPacket,
        metadata: {
          totalProcessingTime: totalTime,
          agentExecutionOrder: executionOrder,
          checkpointResults,
          agentLogs
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Job execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        executionOrder
      });

      return {
        success: false,
        error: {
          code: 'ORCHESTRATOR_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error
        },
        metadata: {
          totalProcessingTime: processingTime,
          agentExecutionOrder: executionOrder,
          checkpointResults,
          agentLogs
        }
      };
    }
  }

  /**
   * Get information about available agents
   */
  getAgentInfo() {
    return {
      agents: [
        {
          name: this.draftingAgent.name,
          description: this.draftingAgent.description
        },
        {
          name: this.contextBuilderAgent.name,
          description: this.contextBuilderAgent.description
        }
      ]
    };
  }

  /**
   * Validate job configuration
   */
  validateJobConfig(config: JobConfig): void {
    if (!config.documentType) {
      throw new Error('Document type is required');
    }
    
    if (!config.inputPath) {
      throw new Error('Input path is required');
    }
    
    if (!config.outputPath) {
      throw new Error('Output path is required');
    }

    if (!isValidDocumentType(config.documentType)) {
      throw new Error(`Invalid document type: ${config.documentType}`);
    }
  }
} 