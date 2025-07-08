/**
 * Context Builder Agent - Queries vector database for relevant context
 */

import { BaseAgent } from './BaseAgent';
import { 
  ContextBuilderInput, 
  ContextBuilderOutput, 
  CheckpointResult 
} from '../types/agents';
import { getRetrieverService } from '../services/retriever';
import { logger } from '../utils/logger';

export class ContextBuilderAgent extends BaseAgent {
  readonly name = 'ContextBuilderAgent';
  readonly description = 'Queries vector database for relevant context and precedents';

  protected async execute(input: ContextBuilderInput): Promise<ContextBuilderOutput> {
    logger.debug(`ContextBuilderAgent processing matter: ${input.matterContext.documentType} for ${input.matterContext.client}`);

    // Search for relevant context
    const contextBundle = await getRetrieverService().searchContext(input.matterContext);

    logger.info('Context search completed', {
      resultsCount: contextBundle.embeddings.length,
      totalTokens: contextBundle.totalTokens,
      averageSimilarity: contextBundle.embeddings.length > 0 
        ? contextBundle.embeddings.reduce((sum: number, e: any) => sum + e.similarity, 0) / contextBundle.embeddings.length
        : 0
    });

    return {
      contextBundle
    };
  }

  protected async runPreCheckpoints(input: ContextBuilderInput): Promise<CheckpointResult[]> {
    const checkpoints: CheckpointResult[] = [];

    // Check if matter context has required information
    if (!input.matterContext.documentType) {
      checkpoints.push({
        name: 'document_type_present',
        passed: false,
        message: 'Document type is required for context search',
        timestamp: new Date()
      });
    } else {
      checkpoints.push({
        name: 'document_type_present',
        passed: true,
        message: `Document type: ${input.matterContext.documentType}`,
        timestamp: new Date()
      });
    }

    // Check if retriever service is available
    try {
      const stats = await getRetrieverService().getStats();
      checkpoints.push({
        name: 'retriever_service_available',
        passed: true,
        message: `Vector database ready with ${stats.documentCount} documents`,
        timestamp: new Date()
      });
    } catch (error) {
      checkpoints.push({
        name: 'retriever_service_available',
        passed: false,
        message: `Vector database not available: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }

    return checkpoints;
  }

  protected async runPostCheckpoints(output: ContextBuilderOutput): Promise<CheckpointResult[]> {
    const checkpoints: CheckpointResult[] = [];

    // Check if we have high-similarity results
    const highSimilarityCount = output.contextBundle.embeddings.filter(e => e.similarity > 0.75).length;
    
    checkpoints.push({
      name: 'high_similarity_results',
      passed: highSimilarityCount >= 3,
      message: `Found ${highSimilarityCount} high-similarity results (>0.75 similarity)`,
      timestamp: new Date()
    });

    // Check token count
    const tokenCount = output.contextBundle.totalTokens;
    checkpoints.push({
      name: 'token_count_reasonable',
      passed: tokenCount < 4000,
      message: `Total context tokens: ${tokenCount}`,
      timestamp: new Date()
    });

    // Check if we have sources with citations
    const sourcesWithCitations = output.contextBundle.sources.filter(s => s.citation && s.citation.length > 0).length;
    checkpoints.push({
      name: 'sources_have_citations',
      passed: sourcesWithCitations === output.contextBundle.sources.length,
      message: `${sourcesWithCitations}/${output.contextBundle.sources.length} sources have citations`,
      timestamp: new Date()
    });

    return checkpoints;
  }
} 