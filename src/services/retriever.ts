/**
 * Retriever Service - Vector database integration for context building
 * Uses ChromaDB with local persistence for firm precedents and legal datasets
 */

import { ChromaClient, Collection } from 'chromadb';
import { ContextBundle, ContextEmbedding, ContextSource, MatterContext } from '../types/agents';
import { logger } from '../utils/logger';
import { generateEmbedding } from './embeddings';
import path from 'path';

export interface RetrieverConfig {
  chromaPath?: string;
  collectionName?: string;
  similarityThreshold?: number;
  maxResults?: number;
  enableLogging?: boolean;
}

export interface StoredDocument {
  id: string;
  content: string;
  metadata: {
    title: string;
    source: string;
    documentType: string;
    jurisdiction?: string;
    date?: string;
    citation?: string;
    relevanceScore?: number;
    // Additional context properties for better retrieval
    attorney?: string;
    client?: string;
    industry?: string;
    practiceArea?: string;
    writingStyle?: string;
    [key: string]: any; // Allow additional metadata properties
  };
}

export class RetrieverService {
  private client: ChromaClient;
  private collection: Collection | null = null;
  private config: Required<RetrieverConfig>;

  constructor(config: RetrieverConfig = {}) {
    this.config = {
      chromaPath: config.chromaPath || path.join(process.cwd(), '.ct_vector'),
      collectionName: config.collectionName || 'casethread_contexts',
      similarityThreshold: config.similarityThreshold || 0.75,
      maxResults: config.maxResults || 10,
      enableLogging: config.enableLogging ?? true
    };

    // ChromaDB client configuration - requires server to be running
    // Default to localhost:8000 (standard ChromaDB server)
    this.client = new ChromaClient({
      path: 'http://localhost:8000'
    });

    if (this.config.enableLogging) {
      logger.info('RetrieverService initialized', {
        chromaPath: this.config.chromaPath,
        collectionName: this.config.collectionName
      });
    }
  }

  /**
   * Initialize the vector database collection
   */
  async initialize(): Promise<void> {
    try {
      // Create or get collection with custom embedding function
      // We need to provide a custom embedding function that uses our OpenAI embeddings
      const customEmbeddingFunction = {
        generate: async (texts: string[]) => {
          // We'll handle embeddings ourselves in the storeDocument method
          // Return dummy embeddings here since we pre-compute them
          return texts.map(() => new Array(1536).fill(0));
        }
      };

      this.collection = await this.client.getOrCreateCollection({
        name: this.config.collectionName,
        metadata: {
          'hnsw:space': 'cosine',
          description: 'CaseThread legal document context embeddings'
        },
        embeddingFunction: customEmbeddingFunction
      });

      logger.info('ChromaDB collection initialized', {
        collection: this.config.collectionName,
        count: await this.collection.count()
      });
    } catch (error) {
      logger.error('Failed to initialize ChromaDB collection', { error });
      throw new Error(`ChromaDB initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store a document in the vector database
   */
  async storeDocument(document: StoredDocument): Promise<void> {
    if (!this.collection) {
      await this.initialize();
    }

    try {
      // Generate embedding for document content
      const embedding = await generateEmbedding(document.content);

      // Store in ChromaDB
      await this.collection!.add({
        ids: [document.id],
        embeddings: [embedding],
        metadatas: [document.metadata],
        documents: [document.content]
      });

      if (this.config.enableLogging) {
        logger.debug('Document stored in vector database', {
          id: document.id,
          title: document.metadata.title,
          contentLength: document.content.length
        });
      }
    } catch (error) {
      logger.error('Failed to store document in vector database', { 
        documentId: document.id, 
        error 
      });
      throw error;
    }
  }

  /**
   * Store multiple documents in batch
   */
  async storeDocuments(documents: StoredDocument[]): Promise<void> {
    if (!documents || documents.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    if (!this.collection) {
      await this.initialize();
    }

    try {
      // Generate embeddings for all documents
      const embeddings = await Promise.all(
        documents.map(doc => generateEmbedding(doc.content))
      );

      // Store in ChromaDB
      await this.collection!.add({
        ids: documents.map(doc => doc.id),
        embeddings: embeddings,
        metadatas: documents.map(doc => doc.metadata),
        documents: documents.map(doc => doc.content)
      });

      logger.info('Batch stored documents in vector database', {
        count: documents.length
      });
    } catch (error) {
      logger.error('Failed to batch store documents', { error });
      throw error;
    }
  }

  /**
   * Search for relevant context based on matter context
   */
  async searchContext(matterContext: MatterContext): Promise<ContextBundle> {
    if (!this.collection) {
      await this.initialize();
    }

    try {
      // Build search query from matter context
      const searchQuery = this.buildSearchQuery(matterContext);
      
      // Generate embedding for search query
      const queryEmbedding = await generateEmbedding(searchQuery);

      // Search in ChromaDB
      const results = await this.collection!.query({
        queryEmbeddings: [queryEmbedding],
        nResults: this.config.maxResults,
        include: ['documents', 'metadatas', 'distances']
      });

      // Process results into context bundle
      const contextBundle = this.processSearchResults(results, searchQuery);

      if (this.config.enableLogging) {
        logger.info('Context search completed', {
          query: searchQuery,
          resultsCount: contextBundle.embeddings.length,
          averageSimilarity: contextBundle.embeddings.length > 0 
            ? contextBundle.embeddings.reduce((sum, e) => sum + e.similarity, 0) / contextBundle.embeddings.length
            : 0
        });
      }

      return contextBundle;
    } catch (error) {
      logger.error('Context search failed', { error });
      throw error;
    }
  }

  /**
   * Search with custom query string
   */
  async searchWithQuery(query: string): Promise<ContextBundle> {
    if (!this.collection) {
      await this.initialize();
    }

    try {
      const queryEmbedding = await generateEmbedding(query);

      const results = await this.collection!.query({
        queryEmbeddings: [queryEmbedding],
        nResults: this.config.maxResults,
        include: ['documents', 'metadatas', 'distances']
      });

      return this.processSearchResults(results, query);
    } catch (error) {
      logger.error('Query search failed', { query, error });
      throw error;
    }
  }

  /**
   * Build search query from matter context
   */
  private buildSearchQuery(matterContext: MatterContext): string {
    const parts = [];

    // Add document type
    if (matterContext.documentType) {
      parts.push(matterContext.documentType.replace(/-/g, ' '));
    }

    // Add client context
    if (matterContext.client) {
      parts.push(`client: ${matterContext.client}`);
    }

    // Add relevant YAML data fields
    if (matterContext.yamlData) {
      // Extract important fields that might be relevant for search
      const importantFields = [
        'agreement_type', 'disclosing_party', 'receiving_party', 'purpose',
        'governing_state', 'jurisdiction', 'patent_type', 'invention_title',
        'trademark_name', 'trademark_class', 'technology_type'
      ];

      importantFields.forEach(field => {
        if (matterContext.yamlData[field]) {
          parts.push(`${field}: ${matterContext.yamlData[field]}`);
        }
      });
    }

    const query = parts.join(' ');
    
    if (this.config.enableLogging) {
      logger.debug('Built search query', { query, parts });
    }

    return query;
  }

  /**
   * Process ChromaDB search results into ContextBundle
   */
  private processSearchResults(results: any, originalQuery: string): ContextBundle {
    const embeddings: ContextEmbedding[] = [];
    const sources: ContextSource[] = [];
    let totalTokens = 0;

    if (results.documents && results.documents[0]) {
      const documents = results.documents[0];
      const metadatas = results.metadatas[0];
      const distances = results.distances[0];

      for (let i = 0; i < documents.length; i++) {
        const similarity = 1 - distances[i]; // Convert distance to similarity
        
        // Only include results above similarity threshold
        if (similarity >= this.config.similarityThreshold) {
          const metadata = metadatas[i];
          const content = documents[i];
          
          // Create context embedding
          const embedding: ContextEmbedding = {
            id: `result_${i}`,
            content,
            similarity,
            metadata
          };
          embeddings.push(embedding);

          // Create context source
          const source: ContextSource = {
            id: embedding.id,
            title: metadata.title || 'Untitled Document',
            citation: metadata.citation || `${metadata.source} - ${metadata.documentType}`,
            relevanceScore: similarity,
            excerpt: this.createExcerpt(content, 200),
            url: metadata.url
          };
          sources.push(source);

          // Estimate token count (rough approximation)
          totalTokens += Math.ceil(content.length / 4);
        }
      }
    }

    return {
      embeddings,
      sources,
      totalTokens,
      queryMetadata: {
        searchTerms: originalQuery.split(' '),
        similarityThreshold: this.config.similarityThreshold,
        resultsCount: embeddings.length
      }
    };
  }

  /**
   * Create excerpt from content
   */
  private createExcerpt(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    const excerpt = content.substring(0, maxLength);
    const lastSpace = excerpt.lastIndexOf(' ');
    
    return lastSpace > 0 
      ? excerpt.substring(0, lastSpace) + '...'
      : excerpt + '...';
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<{
    documentCount: number;
    collectionName: string;
    chromaPath: string;
  }> {
    if (!this.collection) {
      await this.initialize();
    }

    const documentCount = await this.collection!.count();
    
    return {
      documentCount,
      collectionName: this.config.collectionName,
      chromaPath: this.config.chromaPath
    };
  }

  /**
   * Clear all documents from collection
   */
  async clear(): Promise<void> {
    if (!this.collection) {
      await this.initialize();
    }

    await this.collection!.delete({});
    logger.info('Vector database collection cleared');
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    // ChromaDB client doesn't need explicit closing
    this.collection = null;
    logger.info('RetrieverService closed');
  }
}

// Lazy singleton instance
let serviceInstance: RetrieverService | null = null;

export function getRetrieverService(): RetrieverService {
  if (!serviceInstance) {
    serviceInstance = new RetrieverService();
  }
  return serviceInstance;
}

// Export singleton instance (lazy)
export const retrieverService = {
  get instance() {
    return getRetrieverService();
  }
}; 