# CaseThread Multi-Model Pipeline - System Patterns

## Architecture Overview

### Multi-Model Agent Pipeline
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Quality-First Document Generation                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Agent 1: Contextual Document Writer]                                      │
│                                                                             │
│ Context Assembly (GPT-4) → Document Generation (o3) → Basic Refinement (GPT-4) │
│                                     ↓                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Agent 2: Quality Gate Analyzer]                                           │
│                                                                             │
│ Initial Scanning (GPT-4) → Legal Analysis (o3) → Scoring & Feedback (GPT-4) │
│                                     ↓                                        │
│                         [80% Quality Gate Decision]                         │
│                                     ↓                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Agent 3: Final Reviewer]                                                  │
│                                                                             │
│ Consistency Check (GPT-4) → Strategic Review (o3) → Client Ready (GPT-4)    │
│                                     ↓                                        │
│                         [90% Quality Gate Decision]                         │
│                                     ↓                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Context Integration System]                                               │
│                                                                             │
│ ChromaDB Precedents ←→ Attorney Patterns ←→ Client Preferences ←→ Quality Learning │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Design Patterns

### 1. Strategic Model Selection Pattern
- **High Intelligence Tasks (o3)**: Complex legal reasoning, strategic analysis
- **Medium Intelligence Tasks (GPT-4)**: Organization, basic analysis, feedback
- **Cost Optimization**: 40-50% reduction compared to all-o3 approach

### 2. Quality Gate Pattern
- **Progressive Quality Checks**: Each agent has specific quality thresholds
- **Iterative Refinement**: Failed quality gates trigger targeted improvement
- **Feedback Loops**: Specific, actionable feedback for each refinement cycle

### 3. Context Integration Pattern
- **ChromaDB Utilization**: Legal precedents actively enhance document generation
- **Attorney Pattern Learning**: Successful approaches learned and applied
- **Client Preference Adaptation**: Customization based on client requirements

### 4. Multi-Agent Orchestration Pattern
- **QualityOrchestrator**: Manages 3-agent pipeline flow
- **Parallel Processing**: Independent quality checks and context assembly
- **Error Recovery**: Graceful handling of quality gate failures

### 5. Learning System Pattern
- **Pattern Recognition**: Successful document generation strategies
- **Continuous Improvement**: Quality metrics improve over time
- **Preference Learning**: Attorney and client-specific customization

## Agent Architecture

### Core Agent Components

#### 1. Agent 1: Contextual Document Writer
```typescript
interface ContextualDocumentWriter {
  contextAssembly: {
    model: 'gpt-4';
    function: 'organizeContext';
    input: ContextBundle;
    output: StructuredContext;
  };
  
  documentGeneration: {
    model: 'o3';
    function: 'generateDocument';
    input: StructuredContext + Template + MatterContext;
    output: GeneratedDocument;
  };
  
  basicRefinement: {
    model: 'gpt-4';
    function: 'refineDocument';
    input: GeneratedDocument + SimpleFeedback;
    output: RefinedDocument;
  };
}
```

#### 2. Agent 2: Quality Gate Analyzer
```typescript
interface QualityGateAnalyzer {
  initialScanning: {
    model: 'gpt-4';
    function: 'scanDocument';
    input: GeneratedDocument;
    output: BasicQualityReport;
  };
  
  legalAnalysis: {
    model: 'o3';
    function: 'analyzeLegalQuality';
    input: GeneratedDocument + Template;
    output: LegalQualityAnalysis;
  };
  
  scoringFeedback: {
    model: 'gpt-4';
    function: 'generateFeedback';
    input: LegalQualityAnalysis + BasicQualityReport;
    output: QualityScore + ActionableFeedback;
  };
}
```

#### 3. Agent 3: Final Reviewer
```typescript
interface FinalReviewer {
  consistencyCheck: {
    model: 'gpt-4';
    function: 'checkConsistency';
    input: QualityApprovedDocument;
    output: ConsistencyReport;
  };
  
  strategicReview: {
    model: 'o3';
    function: 'strategicAnalysis';
    input: QualityApprovedDocument + ClientContext;
    output: StrategicAssessment;
  };
  
  clientReadiness: {
    model: 'gpt-4';
    function: 'finalPolish';
    input: StrategicAssessment + ConsistencyReport;
    output: ClientReadyDocument;
  };
}
```

## Data Flow Architecture

### 1. Context Assembly Flow
```
ChromaDB Query → Precedent Retrieval → Attorney Pattern Matching → Client Preference Loading → Structured Context Bundle
```

### 2. Quality Pipeline Flow
```
User Request → Agent 1 (Write) → Agent 2 (Analyze) → [Quality Gate] → Agent 3 (Review) → [Final Gate] → Delivery
```

### 3. Refinement Loop Flow
```
Quality Failure → Specific Feedback → Targeted Refinement → Quality Re-analysis → Gate Decision
```

## Integration Patterns

### Quality Orchestrator
```typescript
interface QualityOrchestrator {
  executeQualityPipeline: (request: DocumentRequest) => Promise<QualityDocument>;
  handleQualityGate: (score: QualityScore, threshold: number) => QualityDecision;
  manageRefinementLoop: (feedback: QualityFeedback) => RefinementStrategy;
  trackQualityMetrics: (session: DocumentSession) => QualityMetrics;
}
```

### Context Integration Bridge
```typescript
interface ContextIntegrationBridge {
  assembleContext: (request: DocumentRequest) => Promise<ContextBundle>;
  enhanceWithPrecedents: (context: ContextBundle) => EnhancedContext;
  applyAttorneyPatterns: (context: EnhancedContext) => PatternEnhancedContext;
  adaptClientPreferences: (context: PatternEnhancedContext) => ClientAdaptedContext;
}
```

## State Management Patterns

### Quality Pipeline State
```typescript
interface QualityPipelineState {
  currentAgent: 'writer' | 'analyzer' | 'reviewer';
  qualityScore: number;
  iterationCount: number;
  refinementHistory: RefinementAttempt[];
  contextUtilization: ContextMetrics;
}
```

### Learning System State
```typescript
interface LearningSystemState {
  attorneyPatterns: Map<string, AttorneyPattern>;
  clientPreferences: Map<string, ClientPreference>;
  qualityImprovement: QualityTrend;
  successfulStrategies: StrategyPattern[];
}
```

## Error Handling Patterns

### 1. Quality Gate Failure Recovery
- **Immediate Feedback**: Specific, actionable improvement instructions
- **Progressive Refinement**: Focused improvement on identified weaknesses
- **Escalation**: Maximum 3 iterations before human review

### 2. Context Integration Failure
- **Graceful Degradation**: Fallback to basic template generation
- **Partial Context**: Use available context even if incomplete
- **Error Logging**: Comprehensive logging for debugging

### 3. Model Availability Fallback
- **o3 Unavailable**: Fallback to GPT-4 with quality warning
- **GPT-4 Unavailable**: Fallback to existing single-agent system
- **Total Failure**: Graceful error message with retry options

## Performance Patterns

### Strategic Caching
```typescript
interface StrategicCache {
  contextCache: Map<string, ContextBundle>;
  attorneyPatternCache: Map<string, AttorneyPattern>;
  qualityMetricsCache: Map<string, QualityMetrics>;
  templateCache: Map<string, Template>;
}
```

### Parallel Processing
```typescript
interface ParallelProcessor {
  contextAssembly: Promise<ContextBundle>;
  templateValidation: Promise<ValidationResult>;
  precedentSearch: Promise<PrecedentResult>;
  qualityMetricsPreparation: Promise<QualityMetrics>;
}
```

## Quality Metrics Patterns

### 5-Criteria Scoring System
```typescript
interface QualityMetrics {
  legalAccuracy: { score: number; weight: 0.25 };
  completeness: { score: number; weight: 0.25 };
  consistency: { score: number; weight: 0.20 };
  professionalTone: { score: number; weight: 0.15 };
  riskMitigation: { score: number; weight: 0.15 };
  overallScore: number;
}
```

### Learning Pattern Recognition
```typescript
interface LearningPattern {
  patternType: 'attorney' | 'client' | 'quality';
  frequency: number;
  successRate: number;
  applicableScenarios: string[];
  qualityImpact: number;
}
```

## Security Patterns

### Model Access Control
- **API Key Management**: Secure storage and rotation
- **Rate Limiting**: Prevent abuse and cost overruns
- **Input Validation**: Sanitize all user inputs
- **Output Filtering**: Remove sensitive information

### Context Security
- **Data Encryption**: ChromaDB data encrypted at rest
- **Access Control**: Role-based access to client data
- **Audit Logging**: Complete audit trail for document generation
- **Privacy Protection**: Client confidentiality maintained

## Backwards Compatibility Patterns

### Dual Mode Operation
```typescript
interface DualModeOrchestrator {
  speedMode: () => StandardOrchestrator;
  qualityMode: () => QualityOrchestrator;
  modeSelection: (flags: CLIFlags) => OrchestratorType;
}
```

### Preserved Interfaces
- **Existing CLI**: All current commands remain functional
- **Template System**: No changes to template structure
- **Mock Data**: Existing test data continues to work
- **Docker Deployment**: Container setup unchanged

## Cost Optimization Patterns

### Model Selection Strategy
```typescript
interface ModelSelectionStrategy {
  taskComplexity: (task: Task) => ComplexityLevel;
  modelRecommendation: (complexity: ComplexityLevel) => ModelType;
  costEstimation: (pipeline: AgentPipeline) => CostEstimate;
  optimizationSuggestions: (usage: UsageMetrics) => OptimizationPlan;
}
```

### Resource Management
- **Smart Caching**: Reduce redundant API calls
- **Batch Processing**: Optimize concurrent operations
- **Context Reuse**: Leverage previous context where applicable
- **Quality Threshold Optimization**: Balance quality vs cost 