/**
 * Type definitions for CaseThread Multi-Agent System
 */

import { YamlData, Template } from './index';

// Base Agent Interface
export interface Agent {
  readonly name: string;
  readonly description: string;
  process(input: any): Promise<AgentResult>;
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: AgentError;
  metadata?: {
    processingTime: number;
    checkpoints: CheckpointResult[];
    agentLogs: AgentLogEntry[];
  };
}

export interface AgentError {
  code: string;
  message: string;
  details?: any;
}

export interface CheckpointResult {
  name: string;
  passed: boolean;
  message?: string;
  timestamp: Date;
}

export interface AgentLogEntry {
  agent: string;
  input_hash: string;
  output_hash: string;
  timestamp: Date;
  metadata?: any;
}

// Intake Agent Types
export interface MatterContext {
  documentType: string;
  client: string;
  attorney?: string;
  template?: string;
  yamlData: YamlData;
  validationResults: ValidationResult[];
  normalizedData: Record<string, any>;
}

export interface ValidationResult {
  field: string;
  isValid: boolean;
  message?: string;
  value?: any;
}

export interface IntakeAgentInput {
  yamlFilePath: string;
  documentType: string;
}

export interface IntakeAgentOutput {
  matterContext: MatterContext;
  validationErrors: ValidationResult[];
}

// Context Builder Agent Types
export interface ContextBundle {
  embeddings: ContextEmbedding[];
  sources: ContextSource[];
  totalTokens: number;
  queryMetadata: {
    searchTerms: string[];
    similarityThreshold: number;
    resultsCount: number;
  };
}

export interface ContextEmbedding {
  id: string;
  content: string;
  similarity: number;
  metadata: any;
}

export interface ContextSource {
  id: string;
  title: string;
  url?: string;
  citation: string;
  relevanceScore: number;
  excerpt: string;
}

export interface ContextBuilderInput {
  matterContext: MatterContext;
}

export interface ContextBuilderOutput {
  contextBundle: ContextBundle;
}

// Drafting Agent Types
export interface DraftingAgentInput {
  template: Template;
  matterContext: MatterContext;
  contextBundle: ContextBundle;
  /**
   * Optional subset of section IDs this drafting agent should generate.
   * When undefined, the agent should draft the entire template.
   */
  sectionIds?: string[];
}

export interface DraftingAgentOutput {
  draftMarkdown: string;
  generationMetadata: {
    sectionsGenerated: string[];
    placeholdersRemaining: string[];
    tokenCount: number;
    streamingChunks: number;
  };
}

/**
 * Represents a granular drafting task assigned to a worker model.
 */
export interface DraftingTask {
  /** Unique task identifier */
  id: string;
  /** IDs of the template sections to draft */
  sectionIds: string[];
  /** Reference to the full template (unchanged across tasks) */
  template: Template;
  /** Contextual data required for drafting */
  matterContext: MatterContext;
  contextBundle: ContextBundle;
}

/**
 * Output of a DraftingAgent when it only drafts a subset of sections.
 */
export interface PartialDraftOutput {
  draftMarkdown: string; // Markdown for the drafted sections only
  generationMetadata: {
    sectionsGenerated: string[];
    placeholdersRemaining: string[];
    tokenCount: number;
    streamingChunks: number;
  };
}

/**
 * Input for the OverseerAgent responsible for merging and polishing partial drafts.
 */
export interface OverseerInput {
  partialDrafts: PartialDraftOutput[];
  template: Template;
  matterContext: MatterContext;
}

export interface OverseerOutput {
  mergedMarkdown: string;
  /** Metadata about the overseer pass */
  overseerMetadata: {
    rewriteRatio: number; // Percentage of characters changed during overseer edit
    tokenCount: number;
    issuesDetected: string[];
  };
}

// QA Agent Types
export interface QAAgentInput {
  draftMarkdown: string;
  template: Template;
  matterContext: MatterContext;
}

export interface QAAgentOutput {
  annotatedMarkdown: string;
  qaReport: QAReport;
}

export interface QAReport {
  checks: QACheck[];
  score: number;
  recommendations: string[];
  isComplete: boolean;
}

export interface QACheck {
  name: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// Risk/Compliance Agent Types
export interface RiskAgentInput {
  annotatedMarkdown: string;
  qaReport: QAReport;
  matterContext: MatterContext;
}

export interface RiskAgentOutput {
  riskFlags: RiskFlag[];
  recommendedRedactions: Redaction[];
  complianceScore: number;
}

export interface RiskFlag {
  type: 'ethics' | 'privilege' | 'export_control' | 'prohibited_language';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  location: {
    line: number;
    column: number;
    length: number;
  };
  suggestedAction: string;
}

export interface Redaction {
  startIndex: number;
  endIndex: number;
  reason: string;
  replacement?: string;
}

// Reviewer Agent Types
export interface ReviewerAgentInput {
  finalMarkdown: string;
  qaReport: QAReport;
  riskFlags: RiskFlag[];
  matterContext: MatterContext;
}

export interface ReviewerAgentOutput {
  reviewPacket: ReviewPacket;
}

export interface ReviewPacket {
  summary: string;
  documentDiff: string;
  billableTimeMemo: string;
  qualityScore: number;
  recommendations: string[];
  nextSteps: string[];
  attachments: {
    qaReport: QAReport;
    riskFlags: RiskFlag[];
    agentLogs: AgentLogEntry[];
  };
}

// Orchestrator Types
export interface JobConfig {
  documentType: string;
  inputPath: string;
  outputPath: string;
  options: {
    debug?: boolean;
    skipRiskCheck?: boolean;
    skipQA?: boolean;
    streamingEnabled?: boolean;
  };
}

export interface JobResult {
  success: boolean;
  reviewPacket?: ReviewPacket;
  error?: AgentError;
  metadata: {
    totalProcessingTime: number;
    agentExecutionOrder: string[];
    checkpointResults: CheckpointResult[];
    agentLogs: AgentLogEntry[];
  };
}

// Guard Rail Types
export interface GuardRail {
  name: string;
  description: string;
  validate(input: any): Promise<GuardRailResult>;
}

export interface GuardRailResult {
  passed: boolean;
  message?: string;
  severity: 'error' | 'warning' | 'info';
  details?: any;
} 