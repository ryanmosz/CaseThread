/**
 * Tests for RetrieverService
 */

import { RetrieverService } from '../../src/services/retriever';
import { generateEmbedding } from '../../src/services/embeddings';
import { MatterContext } from '../../src/types/agents';
import { logger } from '../../src/utils/logger';

// Mock dependencies
jest.mock('chromadb', () => ({
  ChromaClient: jest.fn().mockImplementation(() => ({
    getOrCreateCollection: jest.fn(),
  })),
}));

jest.mock('../../src/services/embeddings', () => ({
  generateEmbedding: jest.fn(),
  generateEmbeddings: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('RetrieverService', () => {
  let retrieverService: RetrieverService;
  let mockCollection: any;
  let mockClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock collection
    mockCollection = {
      add: jest.fn(),
      query: jest.fn(),
      count: jest.fn().mockResolvedValue(100),
      delete: jest.fn(),
    };

    // Mock ChromaClient
    mockClient = {
      getOrCreateCollection: jest.fn().mockResolvedValue(mockCollection),
    };

    // Mock the ChromaClient constructor
    const { ChromaClient } = require('chromadb');
    ChromaClient.mockImplementation(() => mockClient);

    // Mock generateEmbedding
    (generateEmbedding as jest.Mock).mockResolvedValue([0.1, 0.2, 0.3]);

    // Create service instance
    retrieverService = new RetrieverService({
      chromaPath: './test-vector-db',
      enableLogging: false,
    });
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const service = new RetrieverService();
      expect(service).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const config = {
        chromaPath: './custom-path',
        collectionName: 'test-collection',
        similarityThreshold: 0.8,
        maxResults: 5,
        enableLogging: false,
      };

      const service = new RetrieverService(config);
      expect(service).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize ChromaDB collection successfully', async () => {
      await retrieverService.initialize();

      expect(mockClient.getOrCreateCollection).toHaveBeenCalledWith({
        name: 'casethread_contexts',
        metadata: {
          'hnsw:space': 'cosine',
          description: 'CaseThread legal document context embeddings',
        },
      });
    });

    it('should handle initialization errors', async () => {
      mockClient.getOrCreateCollection.mockRejectedValue(new Error('Connection failed'));

      await expect(retrieverService.initialize()).rejects.toThrow('ChromaDB initialization failed');
    });
  });

  describe('storeDocument', () => {
    beforeEach(async () => {
      await retrieverService.initialize();
    });

    it('should store a document successfully', async () => {
      const document = {
        id: 'doc1',
        content: 'Test document content',
        metadata: {
          title: 'Test Document',
          source: 'test-source',
          documentType: 'nda',
          citation: 'Test Citation',
        },
      };

      await retrieverService.storeDocument(document);

      expect(generateEmbedding).toHaveBeenCalledWith(document.content);
      expect(mockCollection.add).toHaveBeenCalledWith({
        ids: [document.id],
        embeddings: [[0.1, 0.2, 0.3]],
        metadatas: [document.metadata],
        documents: [document.content],
      });
    });

    it('should handle store document errors', async () => {
      const document = {
        id: 'doc1',
        content: 'Test content',
        metadata: {
          title: 'Test',
          source: 'test',
          documentType: 'nda',
        },
      };

      mockCollection.add.mockRejectedValue(new Error('Storage failed'));

      await expect(retrieverService.storeDocument(document)).rejects.toThrow('Storage failed');
    });
  });

  describe('storeDocuments', () => {
    beforeEach(async () => {
      await retrieverService.initialize();
    });

    it('should store multiple documents in batch', async () => {
      const documents = [
        {
          id: 'doc1',
          content: 'Content 1',
          metadata: { title: 'Doc 1', source: 'src1', documentType: 'nda' },
        },
        {
          id: 'doc2',
          content: 'Content 2',
          metadata: { title: 'Doc 2', source: 'src2', documentType: 'patent' },
        },
      ];

      await retrieverService.storeDocuments(documents);

      expect(generateEmbedding).toHaveBeenCalledTimes(2);
      expect(mockCollection.add).toHaveBeenCalledWith({
        ids: ['doc1', 'doc2'],
        embeddings: [[0.1, 0.2, 0.3], [0.1, 0.2, 0.3]],
        metadatas: documents.map(doc => doc.metadata),
        documents: documents.map(doc => doc.content),
      });
    });

    it('should handle empty documents array', async () => {
      await expect(retrieverService.storeDocuments([])).rejects.toThrow('Texts array cannot be empty');
    });
  });

  describe('searchContext', () => {
    beforeEach(async () => {
      await retrieverService.initialize();
    });

    it('should search for relevant context successfully', async () => {
      const matterContext: MatterContext = {
        documentType: 'nda-ip-specific',
        client: 'Test Client',
        yamlData: {
          document_type: 'nda-ip-specific',
          client: 'Test Client',
          agreement_type: 'mutual',
          disclosing_party: 'Company A',
          receiving_party: 'Company B',
        },
        validationResults: [],
        normalizedData: {},
      };

      const mockQueryResults = {
        documents: [['Document content 1', 'Document content 2']],
        metadatas: [
          [
            { title: 'Doc 1', source: 'src1', documentType: 'nda', citation: 'Citation 1' },
            { title: 'Doc 2', source: 'src2', documentType: 'nda', citation: 'Citation 2' },
          ],
        ],
        distances: [[0.1, 0.2]], // High similarity (low distance)
      };

      mockCollection.query.mockResolvedValue(mockQueryResults);

      const result = await retrieverService.searchContext(matterContext);

      expect(generateEmbedding).toHaveBeenCalled();
      expect(mockCollection.query).toHaveBeenCalledWith({
        queryEmbeddings: [[0.1, 0.2, 0.3]],
        nResults: 10,
        include: ['documents', 'metadatas', 'distances'],
      });

      expect(result.embeddings).toHaveLength(2);
      expect(result.sources).toHaveLength(2);
      expect(result.queryMetadata.resultsCount).toBe(2);
    });

    it('should filter out low-similarity results', async () => {
      const matterContext: MatterContext = {
        documentType: 'nda',
        client: 'Test Client',
        yamlData: {
          document_type: 'nda',
          client: 'Test Client',
        },
        validationResults: [],
        normalizedData: {},
      };

      const mockQueryResults = {
        documents: [['Content 1', 'Content 2']],
        metadatas: [
          [
            { title: 'Doc 1', source: 'src1', documentType: 'nda' },
            { title: 'Doc 2', source: 'src2', documentType: 'nda' },
          ],
        ],
        distances: [[0.1, 0.9]], // One high similarity, one low similarity
      };

      mockCollection.query.mockResolvedValue(mockQueryResults);

      const result = await retrieverService.searchContext(matterContext);

      // Should only return the high-similarity result
      expect(result.embeddings).toHaveLength(1);
      expect(result.sources).toHaveLength(1);
      expect(result.embeddings[0].similarity).toBe(0.9); // 1 - 0.1
    });

    it('should handle search errors', async () => {
      const matterContext: MatterContext = {
        documentType: 'nda',
        client: 'Test Client',
        yamlData: {
          document_type: 'nda',
          client: 'Test Client',
        },
        validationResults: [],
        normalizedData: {},
      };

      mockCollection.query.mockRejectedValue(new Error('Search failed'));

      await expect(retrieverService.searchContext(matterContext)).rejects.toThrow('Search failed');
    });
  });

  describe('searchWithQuery', () => {
    beforeEach(async () => {
      await retrieverService.initialize();
    });

    it('should search with custom query string', async () => {
      const query = 'patent license agreement';

      const mockQueryResults = {
        documents: [['Patent license content']],
        metadatas: [[{ title: 'Patent License', source: 'src', documentType: 'patent' }]],
        distances: [[0.15]],
      };

      mockCollection.query.mockResolvedValue(mockQueryResults);

      const result = await retrieverService.searchWithQuery(query);

      expect(generateEmbedding).toHaveBeenCalledWith(query);
      expect(result.embeddings).toHaveLength(1);
      expect(result.sources).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('should return collection statistics', async () => {
      await retrieverService.initialize();

      const stats = await retrieverService.getStats();

      expect(stats.documentCount).toBe(100);
      expect(stats.collectionName).toBe('casethread_contexts');
      expect(stats.chromaPath).toBe('./test-vector-db');
    });
  });

  describe('clear', () => {
    it('should clear all documents from collection', async () => {
      await retrieverService.initialize();

      await retrieverService.clear();

      expect(mockCollection.delete).toHaveBeenCalledWith({});
    });
  });

  describe('close', () => {
    it('should close the service properly', async () => {
      await retrieverService.initialize();
      await retrieverService.close();

      // Should log that service is closed
      expect(logger.info).toHaveBeenCalledWith('RetrieverService closed');
    });
  });

  describe('buildSearchQuery', () => {
    it('should build query from matter context', async () => {
      const matterContext: MatterContext = {
        documentType: 'nda-ip-specific',
        client: 'Test Client',
        yamlData: {
          document_type: 'nda-ip-specific',
          client: 'Test Client',
          agreement_type: 'mutual',
          disclosing_party: 'Company A',
          purpose: 'Technology evaluation',
        },
        validationResults: [],
        normalizedData: {},
      };

      await retrieverService.initialize();
      
      // Mock the query to capture the built query
      mockCollection.query.mockResolvedValue({
        documents: [[]],
        metadatas: [[]],
        distances: [[]],
      });

      await retrieverService.searchContext(matterContext);

      // Should have called generateEmbedding with a query that includes document type, client, and relevant fields
      expect(generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('nda ip specific')
      );
    });
  });
}); 