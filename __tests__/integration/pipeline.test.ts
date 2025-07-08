/**
 * Integration Test for Multi-Agent Pipeline Happy Path
 * Tests the complete orchestrator flow from YAML input to document generation
 */

import { Orchestrator } from '../../src/agents/Orchestrator';
import { JobConfig } from '../../src/types/agents';
import { logger } from '../../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock OpenAI service to avoid real API calls
jest.mock('../../src/services/openai', () => ({
  generateDocument: jest.fn().mockResolvedValue(`# Patent Assignment Agreement

This Patent Assignment Agreement ("Agreement") is entered into as of June 15, 2023 by and between David Park, Dr. Lisa Wang, and Kevin Zhang (collectively, "Assignor") and TechFlow Solutions, Inc. ("Assignee").

## 1. ASSIGNMENT

Assignor hereby assigns, transfers, and conveys to Assignee all right, title, and interest in and to the following patents:

- Provisional Patent Application No. 63/234,567 - "Predictive Cache Optimization System"
- Invention Disclosure TFS-2019-001 - "LSTM Neural Network Architecture for Cache Prediction"
- Invention Disclosure TFS-2020-003 - "Modified Raft Consensus Protocol for Distributed Systems"

## 2. CONSIDERATION

The consideration for this assignment is Assignor's employment with Assignee.

## 3. REPRESENTATIONS AND WARRANTIES

Assignor represents and warrants that Assignor has not previously assigned the Patents to any third party.

## 4. GENERAL PROVISIONS

This Agreement shall be governed by the laws of Delaware.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.`),
  OpenAIService: jest.fn().mockImplementation(() => ({
    generateDocument: jest.fn().mockResolvedValue(`# Patent Assignment Agreement

This Patent Assignment Agreement ("Agreement") is entered into as of June 15, 2023 by and between David Park, Dr. Lisa Wang, and Kevin Zhang (collectively, "Assignor") and TechFlow Solutions, Inc. ("Assignee").

## 1. ASSIGNMENT

Assignor hereby assigns, transfers, and conveys to Assignee all right, title, and interest in and to the following patents:

- Provisional Patent Application No. 63/234,567 - "Predictive Cache Optimization System"
- Invention Disclosure TFS-2019-001 - "LSTM Neural Network Architecture for Cache Prediction"
- Invention Disclosure TFS-2020-003 - "Modified Raft Consensus Protocol for Distributed Systems"

## 2. CONSIDERATION

The consideration for this assignment is Assignor's employment with Assignee.

## 3. REPRESENTATIONS AND WARRANTIES

Assignor represents and warrants that Assignor has not previously assigned the Patents to any third party.

## 4. GENERAL PROVISIONS

This Agreement shall be governed by the laws of Delaware.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.`),
    calculateCost: jest.fn().mockReturnValue({
      promptTokens: 3000,
      completionTokens: 1000,
      totalTokens: 4000,
      estimatedCost: '$0.15'
    })
  }))
}));

// Mock ChromaDB to avoid database dependencies
jest.mock('chromadb', () => ({
  ChromaApi: jest.fn().mockImplementation(() => ({
    createCollection: jest.fn().mockResolvedValue({
      name: 'test-collection',
      query: jest.fn().mockResolvedValue({
        ids: [[]],
        distances: [[]],
        documents: [[]],
        metadatas: [[]]
      })
    }),
    getCollection: jest.fn().mockResolvedValue({
      name: 'test-collection',
      query: jest.fn().mockResolvedValue({
        ids: [[]],
        distances: [[]],
        documents: [[]],
        metadatas: [[]]
      })
    })
  }))
}));

// Mock embeddings service
jest.mock('../../src/services/embeddings', () => ({
  EmbeddingsService: jest.fn().mockImplementation(() => ({
    generateEmbedding: jest.fn().mockResolvedValue(new Array(1536).fill(0.1))
  }))
}));

describe('Pipeline Integration Tests', () => {
  let orchestrator: Orchestrator;
  let tempDir: string;
  let testYamlPath: string;
  let testOutputPath: string;

  beforeAll(async () => {
    // Create temporary directory for test files
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'casethread-test-'));
    testOutputPath = tempDir;
    
    // Create test YAML file
    testYamlPath = path.join(tempDir, 'test-input.yaml');
    const testYamlContent = `
client: "TechFlow Solutions"
attorney: "Sarah Johnson"
document_type: "patent-assignment-agreement"
template: "patent-assignment-agreement.json"

assignors:
  - name: "David Park"
    role: "founder"
    consideration: 1000
  - name: "Dr. Lisa Wang"
    role: "founder"
    consideration: 1000
  - name: "Kevin Zhang"
    role: "founder"
    consideration: 1000

assignee:
  name: "TechFlow Solutions, Inc."
  state: "Delaware"
  type: "corporation"

patents:
  - title: "Predictive Cache Optimization System"
    application_number: "63/234,567"
    filing_date: "2023-04-20"
    status: "provisional"
  - title: "LSTM Neural Network Architecture for Cache Prediction"
    disclosure_id: "TFS-2019-001"
    status: "disclosure"
  - title: "Modified Raft Consensus Protocol for Distributed Systems"
    disclosure_id: "TFS-2020-003"
    status: "disclosure"

technology_scope: "Machine learning algorithms, distributed systems, and cache optimization technologies"
effective_date: "2023-06-15"
assignment_type: "founder"
consideration_type: "employment"
include_applications: true
include_future: true
warranty_level: "limited"

special_provisions:
  - "All inventions conceived during employment are included"
  - "Assignor agrees to reasonable cooperation for patent prosecution"

cooperation_obligations:
  - "Execution of formal USPTO assignment documents"
  - "Assistance with patent prosecution as reasonably requested"
  - "Provision of technical information and testimony if needed"

equity_acceleration: false
urgency: "standard"
deadline: "2023-07-01"
governing_law: "Delaware"
matter_number: "TFS-2023-001"
`;

    await fs.promises.writeFile(testYamlPath, testYamlContent.trim());
  });

  afterAll(async () => {
    // Clean up temporary directory
    if (tempDir) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    orchestrator = new Orchestrator();
    jest.clearAllMocks();
  });

  // Helper function to create test JobConfig
  const createTestJobConfig = (overrides: Partial<JobConfig> = {}): JobConfig => ({
    documentType: 'patent-assignment-agreement',
    inputPath: testYamlPath,
    outputPath: testOutputPath,
    options: {
      debug: false,
      skipRiskCheck: true,
      skipQA: true,
      streamingEnabled: false
    },
    ...overrides
  });

  describe('Happy Path - Complete Pipeline', () => {
    it('should successfully execute the complete pipeline', async () => {
      // Arrange
      const jobConfig = createTestJobConfig();

      // Act
      const result = await orchestrator.runJob(jobConfig);

      // Assert
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.reviewPacket).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should execute agents in correct order', async () => {
      // Arrange
      const jobConfig = createTestJobConfig();

      // Act
      const result = await orchestrator.runJob(jobConfig);

      // Assert
      expect(result.success).toBe(true);
      expect(result.metadata?.agentExecutionOrder).toEqual([
        'ContextBuilderAgent',
        'DraftingAgent'
      ]);
    });

    it('should generate valid review packet', async () => {
      // Arrange
      const jobConfig = createTestJobConfig();

      // Act
      const result = await orchestrator.runJob(jobConfig);

      // Assert
      expect(result.success).toBe(true);
      expect(result.reviewPacket).toBeDefined();
      expect(result.reviewPacket?.summary).toContain('Document generation completed');
      expect(result.reviewPacket?.recommendations.length).toBeGreaterThan(0);
      expect(result.reviewPacket?.nextSteps.length).toBeGreaterThan(0);
    });

    it('should create output document file', async () => {
      // Arrange
      const jobConfig = createTestJobConfig();

      // Act
      const result = await orchestrator.runJob(jobConfig);

      // Assert
      expect(result.success).toBe(true);
      
      // Check that a file was created in the output directory
      const files = await fs.promises.readdir(testOutputPath);
      const outputFiles = files.filter(f => f.startsWith('patent-assignment-agreement-') && f.endsWith('.md'));
      expect(outputFiles.length).toBe(1);

      // Verify file content
      const outputFile = path.join(testOutputPath, outputFiles[0]);
      const content = await fs.promises.readFile(outputFile, 'utf-8');
      expect(content).toContain('Patent Assignment Agreement');
      expect(content).toContain('David Park');
      expect(content).toContain('TechFlow Solutions');
      expect(content).toContain('Delaware');
    });

    it('should include metadata in generated document', async () => {
      // Arrange
      const jobConfig = createTestJobConfig();

      // Act
      const result = await orchestrator.runJob(jobConfig);

      // Assert
      expect(result.success).toBe(true);
      
      // Check document metadata
      const files = await fs.promises.readdir(testOutputPath);
      const outputFiles = files.filter(f => f.startsWith('patent-assignment-agreement-') && f.endsWith('.md'));
      const outputFile = path.join(testOutputPath, outputFiles[0]);
      const content = await fs.promises.readFile(outputFile, 'utf-8');
      
      expect(content).toContain('Generated by CaseThread CLI');
      expect(content).toContain('Document Type: patent-assignment-agreement');
      expect(content).toContain('Input File: test-input.yaml');
      expect(content).toContain('Generated:');
      expect(content).toContain('Generation Time:');
    });

    it('should track processing time', async () => {
      // Arrange
      const jobConfig = createTestJobConfig();

      // Act
      const startTime = Date.now();
      // Add a small delay to ensure processing time is greater than 0
      await new Promise(resolve => setTimeout(resolve, 10));
      const result = await orchestrator.runJob(jobConfig);
      const endTime = Date.now();

      // Assert
      expect(result.success).toBe(true);
      expect(result.metadata?.totalProcessingTime).toBeDefined();
      expect(result.metadata?.totalProcessingTime).toBeGreaterThan(0);
      expect(result.metadata?.totalProcessingTime).toBeLessThan(endTime - startTime + 100); // Allow small margin
    });

    it('should collect agent logs', async () => {
      // Arrange
      const jobConfig = createTestJobConfig();

      // Act
      const result = await orchestrator.runJob(jobConfig);

      // Assert
      expect(result.success).toBe(true);
      expect(result.metadata?.agentLogs).toBeDefined();
      expect(result.metadata?.agentLogs).toBeInstanceOf(Array);
      expect(result.reviewPacket?.attachments?.agentLogs).toBeDefined();
    });

    it('should handle context builder failure gracefully', async () => {
      // Arrange
      const jobConfig = createTestJobConfig();

      // Mock context builder to fail
      const originalContextBuilder = orchestrator['contextBuilderAgent'];
      orchestrator['contextBuilderAgent'] = {
        name: 'ContextBuilderAgent',
        process: jest.fn().mockResolvedValue({
          success: false,
          error: { message: 'Context building failed' }
        })
      } as any;

      // Act
      const result = await orchestrator.runJob(jobConfig);

      // Assert
      expect(result.success).toBe(true); // Should still succeed despite context builder failure
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Context Builder Agent failed')
      );

      // Restore original
      orchestrator['contextBuilderAgent'] = originalContextBuilder;
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid document type', async () => {
      // Arrange
      const jobConfig = createTestJobConfig({
        documentType: 'invalid-type'
      });

      // Act
      const result = await orchestrator.runJob(jobConfig);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Invalid document type');
    });

    it('should handle missing input file', async () => {
      // Arrange
      const jobConfig = createTestJobConfig({
        inputPath: path.join(tempDir, 'non-existent-file.yaml')
      });

      // Act
      const result = await orchestrator.runJob(jobConfig);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Agent Information', () => {
    it('should return information about available agents', () => {
      // Act
      const agentInfo = orchestrator.getAgentInfo();

      // Assert
      expect(agentInfo).toBeDefined();
      expect(agentInfo.agents.length).toBe(2);
      expect(agentInfo.agents[0].name).toBe('DraftingAgent');
      expect(agentInfo.agents[1].name).toBe('ContextBuilderAgent');
    });
  });
}); 