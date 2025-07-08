/**
 * Orchestrator - Manages the multi-agent pipeline flow
 */

import { JobConfig, JobResult, AgentLogEntry, CheckpointResult } from '../types/agents';
import { IntakeAgent } from './IntakeAgent';
import { DraftingAgent } from './DraftingAgent';
import { ContextBuilderAgent } from './ContextBuilderAgent';
import { loadTemplate } from '../services/template';
import { logger } from '../utils/logger';
import { saveDocument, addDocumentMetadata } from '../services/file-writer';
import { createOutputPath } from '../utils/file-naming';
import * as path from 'path';

export class Orchestrator {
  private intakeAgent: IntakeAgent;
  private draftingAgent: DraftingAgent;
  private contextBuilderAgent: ContextBuilderAgent;

  constructor() {
    this.intakeAgent = new IntakeAgent();
    this.draftingAgent = new DraftingAgent();
    this.contextBuilderAgent = new ContextBuilderAgent();
    
    logger.info('Orchestrator initialized with agents:', {
      agents: [this.intakeAgent.name, this.draftingAgent.name, this.contextBuilderAgent.name]
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

    try {
      // Stage 1: Intake Agent
      logger.debug('Stage 1: Running Intake Agent');
      executionOrder.push('IntakeAgent');
      
      const intakeResult = await this.intakeAgent.process({
        yamlFilePath: config.inputPath,
        documentType: config.documentType
      });

      if (!intakeResult.success) {
        throw new Error(`Intake Agent failed: ${intakeResult.error?.message}`);
      }

      // Collect metadata from intake
      agentLogs.push(...(intakeResult.metadata?.agentLogs || []));
      checkpointResults.push(...(intakeResult.metadata?.checkpoints || []));

      const { matterContext } = intakeResult.data;
      
      // Load template for drafting
      const template = await loadTemplate(config.documentType);

      // Stage 2: Context Builder Agent
      logger.debug('Stage 2: Running Context Builder Agent');
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

      // Collect metadata from context building
      agentLogs.push(...(contextResult.metadata?.agentLogs || []));
      checkpointResults.push(...(contextResult.metadata?.checkpoints || []));

      const { contextBundle } = contextResult.data;

      // Stage 3: Drafting Agent
      logger.debug('Stage 3: Running Drafting Agent');
      executionOrder.push('DraftingAgent');
      
      const draftingResult = await this.draftingAgent.process({
        template,
        matterContext,
        contextBundle
      });

      if (!draftingResult.success) {
        throw new Error(`Drafting Agent failed: ${draftingResult.error?.message}`);
      }

      // Collect metadata from drafting
      agentLogs.push(...(draftingResult.metadata?.agentLogs || []));
      checkpointResults.push(...(draftingResult.metadata?.checkpoints || []));

      const { draftMarkdown } = draftingResult.data;

      // Save the document
      const outputPath = createOutputPath(config.outputPath, config.documentType);
      
      const generationTime = Math.round((Date.now() - startTime) / 1000);
      const documentWithMetadata = addDocumentMetadata(
        draftMarkdown,
        config.documentType,
        path.basename(config.inputPath),
        generationTime
      );

      const saveResult = await saveDocument(documentWithMetadata, outputPath);
      
      logger.info('Job completed successfully', {
        outputPath: saveResult.path,
        fileSize: saveResult.size,
        processingTime: generationTime
      });

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
          totalProcessingTime: Date.now() - startTime,
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
          name: this.intakeAgent.name,
          description: this.intakeAgent.description
        },
        {
          name: this.draftingAgent.name,
          description: this.draftingAgent.description
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
  }
} 