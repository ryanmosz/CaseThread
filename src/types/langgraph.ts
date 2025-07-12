/**
 * Type definitions for CaseThread LangGraph Quality Pipeline
 */

import { Template } from './index';
import { MatterContext, ContextBundle } from './agents';

// =====================================
// Core Pipeline State Interface
// =====================================

export interface PipelineState {
  // Input state
  documentType: string;
  template: Template;
  matterContext: MatterContext;
  contextBundle: ContextBundle;
  
  // Processing state (auto-managed by LangGraph)
  currentIteration: number;
  maxIterations: number;
  qualityHistory: QualityScore[];
  refinementHistory: RefinementAttempt[];
  
  // Agent outputs (state persistence)
  structuredContext?: StructuredContext;
  generatedDocument?: string;
  refinedDocument?: string;
  qualityAnalysis?: QualityAnalysis;
  finalDocument?: string;
  
  // Model usage tracking
  modelUsage: ModelUsageTracker;
  
  // Quality metrics
  qualityScore: number;
  passedQualityGate: boolean;
  passedFinalGate: boolean;
  completionStatus: 'in_progress' | 'quality_approved' | 'final_approved' | 'failed' | 'max_iterations';
  
  // Timestamps
  startTime: Date;
  endTime?: Date;
  
  // Error handling
  errors: PipelineError[];
  warnings: PipelineWarning[];
}

// =====================================
// Context and Generation Types
// =====================================

export interface StructuredContext {
  prioritizedPrecedents: PrioritizedPrecedent[];
  attorneyPatterns: AttorneyPattern[];
  clientPreferences: ClientPreference[];
  riskFactors: RiskFactor[];
  strategicGuidance: StrategicGuidance[];
  contextSummary: string;
}

export interface PrioritizedPrecedent {
  id: string;
  content: string;
  relevanceScore: number;
  similarity: number;
  source: string;
  applicableToSections: string[];
  keyPoints: string[];
}

export interface AttorneyPattern {
  id: string;
  attorneyId: string;
  pattern: string;
  implementation: string;
  successRate: number;
  documentTypes: string[];
  lastUpdated: Date;
}

export interface ClientPreference {
  id: string;
  clientId: string;
  preference: string;
  value: string;
  priority: 'high' | 'medium' | 'low';
  applicableDocuments: string[];
}

export interface RiskFactor {
  id: string;
  type: 'legal' | 'compliance' | 'business' | 'technical';
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  mitigationStrategy: string;
  applicableSections: string[];
}

export interface StrategicGuidance {
  scenario: string;
  clientType: string;
  guidance: string;
  rationale: string;
  applicableDocuments: string[];
}

// =====================================
// Quality Analysis Types
// =====================================

export interface QualityScore {
  iteration: number;
  overallScore: number;
  criteriaScores: QualityCriteriaScores;
  passedGate: boolean;
  timestamp: Date;
  feedback: QualityFeedback[];
}

export interface QualityCriteriaScores {
  legalAccuracy: number;
  completeness: number;
  consistency: number;
  professionalTone: number;
  riskMitigation: number;
}

export interface QualityAnalysis {
  overallScore: number;
  criteriaScores: QualityCriteriaScores;
  detailedAnalysis: {
    legalAccuracy: QualityMetric;
    completeness: QualityMetric;
    consistency: QualityMetric;
    professionalTone: QualityMetric;
    riskMitigation: QualityMetric;
  };
  specificFeedback: QualityFeedback[];
  recommendedActions: string[];
}

export interface QualityMetric {
  score: number;
  passed: boolean;
  issues: string[];
  recommendations: string[];
  examples?: string[];
}

export interface QualityFeedback {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue: string;
  recommendation: string;
  example?: string;
  location?: {
    section: string;
    line?: number;
  };
}

// =====================================
// Refinement Types
// =====================================

export interface RefinementAttempt {
  iteration: number;
  focusAreas: string[];
  improvements: string[];
  timeSpent: number;
  success: boolean;
  qualityImprovement: number;
  specificChanges: RefinementChange[];
}

export interface RefinementChange {
  section: string;
  type: 'addition' | 'modification' | 'deletion';
  description: string;
  reasoning: string;
  impact: 'high' | 'medium' | 'low';
}

export interface RefinementRequest {
  iterationNumber: number;
  qualityFeedback: QualityFeedback[];
  specificInstructions: string[];
  focusAreas: string[];
  previousAttempt: string;
  targetScore: number;
}

// =====================================
// Model Usage and Cost Tracking
// =====================================

export interface ModelUsageTracker {
  gpt4Calls: number;
  o3Calls: number;
  totalTokensUsed: number;
  totalCost: number;
  costOptimization: CostOptimizationMetrics;
  callDetails: ModelCall[];
}

export interface CostOptimizationMetrics {
  potentialO3Cost: number;
  actualCost: number;
  costSavings: number;
  savingsPercentage: number;
  optimalModelSelection: boolean;
}

export interface ModelCall {
  id: string;
  node: string;
  model: 'gpt-4' | 'o3';
  tokens: number;
  cost: number;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

// =====================================
// Strategic Review Types
// =====================================

export interface StrategicReview {
  finalScore: number;
  strategicScores: StrategicCriteriaScores;
  strategicEnhancements: string[];
  deliveryNotes: string[];
  nextSteps: string[];
  clientCommunicationStrategy: string;
  approvedForDelivery: boolean;
}

export interface StrategicCriteriaScores {
  strategicPositioning: number;
  clientRelationship: number;
  businessImpact: number;
  riskOptimization: number;
  professionalExcellence: number;
}

// =====================================
// Error Handling Types
// =====================================

export interface PipelineError {
  id: string;
  node: string;
  type: 'system' | 'validation' | 'api' | 'quality' | 'timeout';
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
}

export interface PipelineWarning {
  id: string;
  node: string;
  type: 'quality' | 'performance' | 'cost' | 'context';
  message: string;
  details?: any;
  timestamp: Date;
}

// =====================================
// Generation Settings Types
// =====================================

export interface GenerationSettings {
  tone: 'formal' | 'business' | 'conversational';
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  complexity: 'simple' | 'standard' | 'complex';
  clientType: 'individual' | 'small_business' | 'enterprise' | 'government';
  urgency: 'standard' | 'expedited' | 'urgent';
}

// =====================================
// Pipeline Configuration Types
// =====================================

export interface PipelineConfig {
  maxIterations: number;
  qualityGateThreshold: number;
  finalGateThreshold: number;
  timeoutMs: number;
  debug: boolean;
  costOptimization: boolean;
  contextUtilization: boolean;
  learningEnabled: boolean;
}

// =====================================
// Learning System Types
// =====================================

export interface DocumentSession {
  id: string;
  documentType: string;
  client: string;
  attorney: string;
  iterations: number;
  finalQualityScore: number;
  refinementAreas: string[];
  successFactors: string[];
  timeToComplete: number;
  contextUtilized: ContextUtilization;
  startTime: Date;
  endTime: Date;
}

export interface ContextUtilization {
  precedentsUsed: number;
  attorneyPatternsApplied: number;
  riskFactorsAddressed: number;
  qualityImprovements: string[];
  effectivenessScore: number;
}

export interface LearningPattern {
  id: string;
  type: 'attorney' | 'client' | 'quality' | 'cost' | 'context';
  pattern: string;
  frequency: number;
  successRate: number;
  applicableScenarios: string[];
  qualityImpact: number;
  costImpact: number;
  lastUpdated: Date;
}

// =====================================
// Quality Gate Router Types
// =====================================

export type QualityGateDecision = 'pass' | 'fail' | 'max_iterations';
export type FinalGateDecision = 'approve' | 'refine' | 'max_iterations';

export interface QualityGateResult {
  decision: QualityGateDecision;
  score: number;
  threshold: number;
  iteration: number;
  feedback: QualityFeedback[];
  nextAction: string;
}

export interface FinalGateResult {
  decision: FinalGateDecision;
  score: number;
  threshold: number;
  iteration: number;
  strategicAssessment: StrategicReview;
  nextAction: string;
}

// =====================================
// Node Function Types
// =====================================

export type NodeFunction = (state: PipelineState) => Promise<PipelineState>;

export interface NodeMetadata {
  name: string;
  description: string;
  expectedModel: 'gpt-4' | 'o3';
  estimatedTokens: number;
  estimatedCost: number;
  timeout: number;
  retryCount: number;
}

// =====================================
// Type Guards
// =====================================

export function isPipelineState(value: any): value is PipelineState {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.documentType === 'string' &&
    typeof value.template === 'object' &&
    typeof value.matterContext === 'object' &&
    typeof value.contextBundle === 'object' &&
    typeof value.currentIteration === 'number' &&
    typeof value.maxIterations === 'number' &&
    Array.isArray(value.qualityHistory) &&
    Array.isArray(value.refinementHistory)
  );
}

export function isQualityScore(value: any): value is QualityScore {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.iteration === 'number' &&
    typeof value.overallScore === 'number' &&
    typeof value.passedGate === 'boolean' &&
    value.timestamp instanceof Date &&
    Array.isArray(value.feedback)
  );
}

export function isQualityFeedback(value: any): value is QualityFeedback {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.category === 'string' &&
    typeof value.severity === 'string' &&
    typeof value.issue === 'string' &&
    typeof value.recommendation === 'string'
  );
}

// =====================================
// Constants
// =====================================

export const QUALITY_GATE_THRESHOLD = 80;
export const FINAL_GATE_THRESHOLD = 90;
export const MAX_ITERATIONS = 3;
export const PIPELINE_TIMEOUT_MS = 300000; // 5 minutes

export const QUALITY_CRITERIA_WEIGHTS = {
  legalAccuracy: 0.25,
  completeness: 0.25,
  consistency: 0.20,
  professionalTone: 0.15,
  riskMitigation: 0.15
} as const;

export const STRATEGIC_CRITERIA_WEIGHTS = {
  strategicPositioning: 0.30,
  clientRelationship: 0.25,
  businessImpact: 0.20,
  riskOptimization: 0.15,
  professionalExcellence: 0.10
} as const;

export const NODE_NAMES = {
  // Agent 1 nodes
  CONTEXT_ASSEMBLY: 'context_assembly',
  DOCUMENT_GENERATION: 'document_generation',
  BASIC_REFINEMENT: 'basic_refinement',
  TARGETED_REFINEMENT: 'targeted_refinement',
  FINAL_REFINEMENT: 'final_refinement',
  
  // Agent 2 nodes
  INITIAL_SCANNING: 'initial_scanning',
  LEGAL_ANALYSIS: 'legal_analysis',
  SCORING_FEEDBACK: 'scoring_feedback',
  REFINEMENT_GENERATOR: 'refinement_generator',
  
  // Agent 3 nodes
  CONSISTENCY_CHECK: 'consistency_check',
  STRATEGIC_REVIEW: 'strategic_review',
  CLIENT_READINESS: 'client_readiness'
} as const;

export type NodeName = typeof NODE_NAMES[keyof typeof NODE_NAMES];

// =====================================
// Utility Types
// =====================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>; 