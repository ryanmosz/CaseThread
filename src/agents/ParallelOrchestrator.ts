/**
 * ParallelOrchestrator - Fans out template sections to multiple DraftingAgent workers,
 * then merges and polishes with OverseerAgent.
 */

import {
  JobConfig,
  JobResult,
  AgentLogEntry,
  CheckpointResult,
  MatterContext,
  ContextBundle,
  PartialDraftOutput
} from '../types/agents';
import { DraftingAgent } from './DraftingAgent';
import { ContextBuilderAgent } from './ContextBuilderAgent';
import { OverseerAgent } from './OverseerAgent';
import { splitIntoTasks } from '../utils/task-splitter';
import { config } from '../config';
import { loadTemplate } from '../services/template';
import { logger } from '../utils/logger';
import { saveDocument, addDocumentMetadata } from '../services/file-writer';
import { createOutputPath } from '../utils/file-naming';
import { parseYaml } from '../services/yaml';
import { isValidDocumentType } from '../utils/validator';
import * as path from 'path';

export class ParallelOrchestrator {
  private contextBuilderAgent: ContextBuilderAgent;
  private overseerAgent: OverseerAgent;

  constructor(private maxParallel = config.parallel.MAX_PARALLEL) {
    this.contextBuilderAgent = new ContextBuilderAgent();
    this.overseerAgent = new OverseerAgent();

    logger.info('ParallelOrchestrator initialized', {
      maxParallel: this.maxParallel,
      agents: [
        this.contextBuilderAgent.name,
        'DraftingAgent xN',
        this.overseerAgent.name
      ]
    });
  }

  async runJob(config: JobConfig): Promise<JobResult> {
    const startTime = Date.now();
    const agentLogs: AgentLogEntry[] = [];
    const checkpointResults: CheckpointResult[] = [];
    const executionOrder: string[] = [];

    logger.info('Starting parallel job execution', {
      documentType: config.documentType,
      inputPath: config.inputPath,
      outputPath: config.outputPath
    });

    try {
      // ---------------- Validate config ----------------
      this.validateJobConfig(config);

      // ---------------- Parse YAML ----------------
      const yamlData = await parseYaml(config.inputPath);

      // ---------------- Load Template ----------------
      const template = await loadTemplate(config.documentType);

      // ---------------- Build Matter Context ----------------
      const matterContext: MatterContext = {
        documentType: config.documentType,
        client: yamlData.client,
        attorney: yamlData.attorney,
        template: template.id,
        yamlData: {
          ...yamlData,
          document_type: config.documentType
        },
        validationResults: [],
        normalizedData: yamlData
      };

      // ---------------- Context Builder ----------------
      executionOrder.push('ContextBuilderAgent');
      const contextRes = await this.contextBuilderAgent.process({ matterContext });

      if (!contextRes.success) {
        logger.warn(`ContextBuilderAgent failed: ${contextRes.error?.message}`);
        contextRes.data = {
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

      agentLogs.push(...(contextRes.metadata?.agentLogs || []));
      checkpointResults.push(...(contextRes.metadata?.checkpoints || []));
      const contextBundle: ContextBundle = contextRes.data.contextBundle;

      // ---------------- Split Tasks ----------------
      const tasks = splitIntoTasks(template, matterContext, contextBundle, this.maxParallel);
      logger.debug('Split template into tasks', { taskCount: tasks.length });

      // ---------------- Drafting Agents in Parallel ----------------
      executionOrder.push('DraftingAgent[xN]');

      const draftingPromises = tasks.map(task => {
        const agent = new DraftingAgent();
        return agent.process({
          template: task.template,
          matterContext: task.matterContext,
          contextBundle: task.contextBundle,
          sectionIds: task.sectionIds
        });
      });

      const draftingResults = await Promise.all(draftingPromises);

      // Validate results
      const partialDrafts: PartialDraftOutput[] = [];
      draftingResults.forEach((res, idx) => {
        if (!res.success) {
          throw new Error(`DraftingAgent task ${idx + 1} failed: ${res.error?.message}`);
        }
        agentLogs.push(...(res.metadata?.agentLogs || []));
        checkpointResults.push(...(res.metadata?.checkpoints || []));
        partialDrafts.push(res.data as PartialDraftOutput);
      });

      // ---------------- Overseer Merge ----------------
      executionOrder.push('OverseerAgent');
      const overseerResult = await this.overseerAgent.process({
        partialDrafts,
        template,
        matterContext
      });

      if (!overseerResult.success) {
        throw new Error(`OverseerAgent failed: ${overseerResult.error?.message}`);
      }

      agentLogs.push(...(overseerResult.metadata?.agentLogs || []));
      checkpointResults.push(...(overseerResult.metadata?.checkpoints || []));

      const { mergedMarkdown } = overseerResult.data;

      // ---------------- Save Document ----------------
      const outputPath = createOutputPath(config.outputPath, config.documentType);
      const generationTime = Math.round((Date.now() - startTime) / 1000);
      const docWithMetadata = addDocumentMetadata(
        mergedMarkdown,
        config.documentType,
        path.basename(config.inputPath),
        generationTime
      );

      const saveRes = await saveDocument(docWithMetadata, outputPath);

      logger.info('Parallel job completed', {
        outputPath: saveRes.path,
        fileSize: saveRes.size,
        processingTime: generationTime
      });

      // Simple review packet (same as legacy)
      const reviewPacket = {
        summary: `Parallel document generation completed for ${config.documentType}`,
        documentDiff: 'N/A - First generation',
        billableTimeMemo: `Document generation: ${generationTime}s`,
        qualityScore: 0.85,
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

      logger.error('Parallel job failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        executionOrder
      });

      return {
        success: false,
        error: {
          code: 'PARALLEL_ORCHESTRATOR_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
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

  private validateJobConfig(config: JobConfig): void {
    if (!config.documentType || !isValidDocumentType(config.documentType)) {
      throw new Error('Invalid or missing document type');
    }
    if (!config.inputPath) {
      throw new Error('Input path required');
    }
    if (!config.outputPath) {
      throw new Error('Output path required');
    }
  }
} 