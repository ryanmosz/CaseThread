/**
 * Tests for the RetrieverService
 */

import { RetrieverService, StoredDocument } from '../../src/services/retriever';
import { MatterContext } from '../../src/types/agents';
import path from 'path';

// Mock ChromaDB
jest.mock('chromadb', () => {
  // Create mock functions for collection
  const mockAdd = jest.fn().mockResolvedValue({});
  const mockQuery = jest.fn().mockResolvedValue({
    documents: [[]],
    metadatas: [[]],
    distances: [[]],
  });
  const mockCount = jest.fn().mockResolvedValue(42);
  const mockDelete = jest.fn().mockResolvedValue({});

  // Create mock collection
  const mockCollection = {
    add: mockAdd,
    query: mockQuery,
    count: mockCount,
    delete: mockDelete,
  };

  // Create mock getOrCreateCollection function
  const mockGetOrCreateCollection = jest.fn().mockResolvedValue(mockCollection);

  // Create mock ChromaClient
  const MockChromaClient = jest.fn().mockImplementation(() => ({
    getOrCreateCollection: mockGetOrCreateCollection
  }));

  return {
    ChromaClient: MockChromaClient,
    Collection: jest.fn()
  };
});

// Mock embeddings service
jest.mock('../../src/services/embeddings', () => ({
  generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  generateEmbeddings: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]),
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('RetrieverService', () => {
  let retrieverService: RetrieverService;
  let mockClient: any;
  let mockCollection: any;
  let mockGetOrCreateCollection: jest.Mock;
  let generateEmbedding: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Get mock references
    mockClient = new (require('chromadb').ChromaClient)();
    mockGetOrCreateCollection = mockClient.getOrCreateCollection as jest.Mock;
    mockCollection = {
      add: jest.fn().mockResolvedValue({}),
      query: jest.fn().mockResolvedValue({
        documents: [[]],
        metadatas: [[]],
        distances: [[]],
      }),
      count: jest.fn().mockResolvedValue(42),
      delete: jest.fn().mockResolvedValue({}),
    };
    mockGetOrCreateCollection.mockResolvedValue(mockCollection);
    
    generateEmbedding = require('../../src/services/embeddings').generateEmbedding as jest.Mock;

    // Create service instance with test config
    retrieverService = new RetrieverService({
      chromaPath: path.join(process.cwd(), '.test_vector'),
      collectionName: 'test_collection',
      enableLogging: false
    });
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultService = new RetrieverService();
      expect(defaultService).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const config = {
        collectionName: 'custom_collection',
        similarityThreshold: 0.8,
        maxResults: 5,
      };

      const service = new RetrieverService(config);
      expect(service).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize ChromaDB collection successfully', async () => {
      await retrieverService.initialize();

      expect(mockGetOrCreateCollection).toHaveBeenCalledWith({
        name: 'test_collection',
        metadata: {
          'hnsw:space': 'cosine',
          description: 'CaseThread legal document context embeddings'
        },
        embeddingFunction: expect.objectContaining({
          generate: expect.any(Function)
        })
      });
    });

    it('should handle initialization errors', async () => {
      mockGetOrCreateCollection.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(retrieverService.initialize()).rejects.toThrow('ChromaDB initialization failed');
    });
  });

  describe('storeDocument', () => {
    beforeEach(async () => {
      await retrieverService.initialize();
      (retrieverService as any).collection = mockCollection;
    });

    it('should store a document successfully', async () => {
      const document: StoredDocument = {
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
      const document: StoredDocument = {
        id: 'doc1',
        content: 'Test content',
        metadata: {
          title: 'Test',
          source: 'test',
          documentType: 'nda',
        },
      };

      mockCollection.add.mockRejectedValueOnce(new Error('Storage failed'));

      await expect(retrieverService.storeDocument(document)).rejects.toThrow('Storage failed');
    });
  });

  describe('storeDocuments', () => {
    beforeEach(async () => {
      await retrieverService.initialize();
      (retrieverService as any).collection = mockCollection;
    });

    it('should store multiple documents in batch', async () => {
      const documents: StoredDocument[] = [
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
      (retrieverService as any).collection = mockCollection;
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
        distances: [[0.1, 0.2]], // Low distance means high similarity
      };

      mockCollection.query.mockResolvedValueOnce(mockQueryResults);

      const result = await retrieverService.searchContext(matterContext);

      expect(generateEmbedding).toHaveBeenCalled();
      expect(mockCollection.query).toHaveBeenCalledWith({
        queryEmbeddings: [[0.1, 0.2, 0.3]],
        nResults: expect.any(Number),
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
        distances: [[0.1, 0.9]], // One low distance (high similarity), one high distance (low similarity)
      };

      mockCollection.query.mockResolvedValueOnce(mockQueryResults);

      const result = await retrieverService.searchContext(matterContext);

      // Should only return the high-similarity result (low distance)
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

      mockCollection.query.mockRejectedValueOnce(new Error('Search failed'));

      await expect(retrieverService.searchContext(matterContext)).rejects.toThrow('Search failed');
    });
  });

  describe('searchWithQuery', () => {
    beforeEach(async () => {
      await retrieverService.initialize();
      (retrieverService as any).collection = mockCollection;
    });

    it('should search with custom query string', async () => {
      const query = 'patent license agreement';

      const mockQueryResults = {
        documents: [['Patent license content']],
        metadatas: [[{ title: 'Patent License', source: 'src', documentType: 'patent' }]],
        distances: [[0.15]],
      };

      mockCollection.query.mockResolvedValueOnce(mockQueryResults);

      const result = await retrieverService.searchWithQuery(query);

      expect(generateEmbedding).toHaveBeenCalledWith(query);
      expect(result.embeddings).toHaveLength(1);
      expect(result.sources).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('should return collection statistics', async () => {
      await retrieverService.initialize();
      (retrieverService as any).collection = mockCollection;

      const stats = await retrieverService.getStats();

      expect(stats.documentCount).toBe(42);
      expect(stats.collectionName).toBe('test_collection');
      expect(stats.chromaPath).toBe(path.join(process.cwd(), '.test_vector'));
    });
  });

  describe('clear', () => {
    it('should clear all documents from collection', async () => {
      await retrieverService.initialize();
      (retrieverService as any).collection = mockCollection;

      await retrieverService.clear();

      expect(mockCollection.delete).toHaveBeenCalledWith({});
    });
  });

  describe('close', () => {
    it('should close the service properly', async () => {
      await retrieverService.initialize();
      (retrieverService as any).collection = mockCollection;
      
      await retrieverService.close();

      // Verify collection is null after closing
      expect((retrieverService as any).collection).toBeNull();
    });
  });

  describe('buildSearchQuery', () => {
    it('should build query from matter context', async () => {
      await retrieverService.initialize();
      (retrieverService as any).collection = mockCollection;
      
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
      
      mockCollection.query.mockResolvedValueOnce({
        documents: [[]],
        metadatas: [[]],
        distances: [[]],
      });

      await retrieverService.searchContext(matterContext);

      // Should have called generateEmbedding with a query that includes document type, client, and relevant fields
      const expectedQueryParts = [
        'nda ip specific',
        'client: Test Client',
        'agreement_type: mutual',
        'disclosing_party: Company A',
        'purpose: Technology evaluation'
      ];
      
      const callArg = generateEmbedding.mock.calls[0][0];
      expectedQueryParts.forEach(part => {
        expect(callArg).toContain(part);
      });
    });
  });
  
  describe('singleton', () => {
    it('should provide a singleton instance via getRetrieverService', () => {
      const { getRetrieverService } = require('../../src/services/retriever');
      
      const instance1 = getRetrieverService();
      const instance2 = getRetrieverService();
      
      expect(instance1).toBe(instance2);
    });
    
    it('should provide a singleton instance via retrieverService.instance', () => {
      const { retrieverService } = require('../../src/services/retriever');
      
      const instance1 = retrieverService.instance;
      const instance2 = retrieverService.instance;
      
      expect(instance1).toBe(instance2);
    });
  });
}); 