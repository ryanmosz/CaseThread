# CaseThread LangGraph Pipeline - System Patterns

## Architecture Overview

### LangGraph-Based Quality Pipeline
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LangGraph Quality-First Document Generation        │
├─────────────────────────────────────────────────────────────────────────────┤
│ [StateGraph Workflow with Automatic State Management]                      │
│                                                                             │
│ START → context_assembly → document_generation → basic_refinement           │
│                                     ↓                                       │
│ initial_scanning → legal_analysis → scoring_feedback → [Quality Gate 80%]   │
│                                     ↓                                       │
│ [PASS] → consistency_check → strategic_review → client_readiness → [Final Gate 90%] │
│                                     ↓                                       │
│ [FAIL] → refinement_generator → targeted_refinement → (loop back)           │
│                                     ↓                                       │
│ [APPROVE] → END (Success) | [REFINE] → final_refinement → (loop back)      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key LangGraph Design Patterns

### 1. State-Based Workflow Pattern
```typescript
interface PipelineState {
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
  modelUsage: {
    gpt4Calls: number;
    o3Calls: number;
    totalCost: number;
    costOptimization: CostMetrics;
  };
  
  // Quality metrics
  qualityScore: number;
  passedQualityGate: boolean;
  passedFinalGate: boolean;
  completionStatus: 'in_progress' | 'quality_approved' | 'final_approved' | 'failed' | 'max_iterations';
}
```

### 2. Conditional Routing Pattern
```typescript
function qualityGateRouter(state: PipelineState): string {
  const latestScore = state.qualityHistory[state.qualityHistory.length - 1];
  
  if (state.currentIteration >= state.maxIterations) {
    return "max_iterations";
  }
  
  if (latestScore.overallScore >= 80) {
    return "pass";
  }
  
  return "fail";
}

function finalGateRouter(state: PipelineState): string {
  const latestScore = state.qualityHistory[state.qualityHistory.length - 1];
  
  if (state.currentIteration >= state.maxIterations) {
    return "max_iterations";
  }
  
  if (latestScore.overallScore >= 90) {
    return "approve";
  }
  
  return "refine";
}
```

### 3. Strategic Model Selection Pattern
- **High Intelligence Tasks (o3)**: Complex legal reasoning, strategic analysis
- **Medium Intelligence Tasks (GPT-4)**: Organization, basic analysis, feedback
- **Cost Optimization**: 40-50% reduction compared to all-o3 approach

### 4. Iterative Refinement Pattern
```typescript
// LangGraph automatically manages loops
.addConditionalEdges("scoring_feedback", qualityGateRouter, {
  "pass": "consistency_check",
  "fail": "refinement_generator",
  "max_iterations": END
})

// Refinement loop with state persistence
.addEdge("refinement_generator", "targeted_refinement")
.addEdge("targeted_refinement", "document_generation")
```

### 5. Context Integration Pattern
- **ChromaDB Utilization**: Legal precedents actively enhance document generation
- **Attorney Pattern Learning**: Successful approaches learned and applied
- **Client Preference Adaptation**: Customization based on client requirements

## LangGraph Node Architecture

### Agent 1: Contextual Document Writer (LangGraph Nodes)

```typescript
// Context Assembly Node (GPT-4)
async function contextAssemblyNode(state: PipelineState): Promise<PipelineState> {
  const openai = new OpenAI();
  
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are organizing legal context for document generation. Structure and prioritize the provided context for optimal use by the legal writing system.

CONTEXT INPUTS:
- ChromaDB Precedents: ${JSON.stringify(state.contextBundle.embeddings)}
- Attorney Patterns: ${JSON.stringify(state.matterContext.attorney)}
- Client Preferences: ${JSON.stringify(state.matterContext.client)}

ORGANIZATION REQUIREMENTS:
1. Prioritize precedents by relevance and similarity
2. Identify key attorney patterns applicable to this document type
3. Highlight client-specific preferences and requirements
4. Create coherent context structure for legal writing

Output structured context bundle with priority rankings.`
      }
    ]
  });
  
  return {
    ...state,
    structuredContext: JSON.parse(response.choices[0].message.content),
    modelUsage: {
      ...state.modelUsage,
      gpt4Calls: state.modelUsage.gpt4Calls + 1
    }
  };
}

// Document Generation Node (o3)
async function documentGenerationNode(state: PipelineState): Promise<PipelineState> {
  const openai = new OpenAI();
  
  const response = await openai.chat.completions.create({
    model: "o3",
    messages: [
      {
        role: "system",
        content: `You are a senior IP attorney drafting a ${state.documentType} for ${state.matterContext.client}. Generate a professional, comprehensive legal document using the structured context provided.

CLIENT MATTER:
- Client: ${state.matterContext.client}
- Attorney: ${state.matterContext.attorney}
- Document Type: ${state.documentType}
- Complexity Level: ${state.template.complexity}

STRUCTURED CONTEXT:
${JSON.stringify(state.structuredContext)}

GENERATION REQUIREMENTS:
1. Follow template structure exactly
2. Incorporate relevant precedent language
3. Address all identified risk factors
4. Use attorney-preferred patterns
5. Maintain professional IP law standards
6. Include appropriate disclaimers
7. Ensure enforceability and compliance

Generate the complete document in markdown format.`
      }
    ]
  });
  
  return {
    ...state,
    generatedDocument: response.choices[0].message.content,
    modelUsage: {
      ...state.modelUsage,
      o3Calls: state.modelUsage.o3Calls + 1
    }
  };
}
```

### Agent 2: Quality Gate Analyzer (LangGraph Nodes)

```typescript
// Legal Analysis Node (o3)
async function legalAnalysisNode(state: PipelineState): Promise<PipelineState> {
  const openai = new OpenAI();
  
  const response = await openai.chat.completions.create({
    model: "o3",
    messages: [
      {
        role: "system",
        content: `You are a senior partner conducting rigorous quality review of a ${state.documentType}. Analyze this document against the highest professional standards.

DOCUMENT TO REVIEW:
${state.generatedDocument}

QUALITY CRITERIA (Each scored 0-100):
1. LEGAL ACCURACY (25%): Correct legal terminology, accurate citations, proper legal concepts
2. COMPLETENESS (25%): All template sections filled, comprehensive coverage
3. CONSISTENCY (20%): Consistent terminology, logical flow, uniform formatting
4. PROFESSIONAL TONE (15%): Appropriate formality, clear language, professional style
5. RISK MITIGATION (15%): Identified risks, protective language, compliance considerations

ANALYSIS REQUIREMENTS:
1. Score each criterion (0-100)
2. Calculate weighted overall score
3. Identify specific issues with severity
4. Provide actionable recommendations

Format response as detailed JSON analysis.`
      }
    ]
  });
  
  return {
    ...state,
    qualityAnalysis: JSON.parse(response.choices[0].message.content),
    qualityHistory: [
      ...state.qualityHistory,
      {
        iteration: state.currentIteration,
        overallScore: JSON.parse(response.choices[0].message.content).overallScore,
        criteriaScores: JSON.parse(response.choices[0].message.content).criteriaScores,
        passedGate: JSON.parse(response.choices[0].message.content).overallScore >= 80,
        timestamp: new Date()
      }
    ],
    modelUsage: {
      ...state.modelUsage,
      o3Calls: state.modelUsage.o3Calls + 1
    }
  };
}
```

### Agent 3: Final Reviewer (LangGraph Nodes)

```typescript
// Strategic Review Node (o3)
async function strategicReviewNode(state: PipelineState): Promise<PipelineState> {
  const openai = new OpenAI();
  
  const response = await openai.chat.completions.create({
    model: "o3",
    messages: [
      {
        role: "system",
        content: `You are a senior partner conducting final review of a ${state.documentType} for ${state.matterContext.client}. This document has passed quality gates and now needs strategic positioning and final polish.

DOCUMENT FOR FINAL REVIEW:
${state.generatedDocument}

QUALITY ANALYSIS PASSED:
Overall Score: ${state.qualityScore}/100

CLIENT CONTEXT:
- Client: ${state.matterContext.client}
- Attorney: ${state.matterContext.attorney}
- Document Type: ${state.documentType}

STRATEGIC CONSIDERATIONS:
1. STRATEGIC POSITIONING (30%): Alignment with client objectives, competitive advantage
2. CLIENT RELATIONSHIP (25%): Appropriate tone, communication style match
3. BUSINESS IMPACT (20%): Commercial viability, implementation practicality
4. RISK OPTIMIZATION (15%): Balanced risk allocation, practical enforceability
5. PROFESSIONAL EXCELLENCE (10%): Partner-level quality, firm reputation

FINAL REVIEW REQUIREMENTS:
1. Score overall readiness (0-100)
2. Identify strategic enhancements
3. Provide delivery recommendations
4. Suggest client communication strategy

APPROVAL THRESHOLD: 90/100
Format response as comprehensive final assessment.`
      }
    ]
  });
  
  return {
    ...state,
    finalDocument: response.choices[0].message.content,
    qualityHistory: [
      ...state.qualityHistory,
      {
        iteration: state.currentIteration,
        overallScore: JSON.parse(response.choices[0].message.content).finalScore,
        criteriaScores: JSON.parse(response.choices[0].message.content).strategicScores,
        passedGate: JSON.parse(response.choices[0].message.content).finalScore >= 90,
        timestamp: new Date()
      }
    ],
    passedFinalGate: JSON.parse(response.choices[0].message.content).finalScore >= 90,
    modelUsage: {
      ...state.modelUsage,
      o3Calls: state.modelUsage.o3Calls + 1
    }
  };
}
```

## LangGraph Workflow Definition

### Core StateGraph Structure

```typescript
import { StateGraph, START, END } from "@langchain/langgraph";

const qualityPipelineWorkflow = new StateGraph(PipelineState)
  // Agent 1: Contextual Document Writer nodes
  .addNode("context_assembly", contextAssemblyNode)
  .addNode("document_generation", documentGenerationNode)
  .addNode("basic_refinement", basicRefinementNode)
  .addNode("targeted_refinement", targetedRefinementNode)
  .addNode("final_refinement", finalRefinementNode)
  
  // Agent 2: Quality Gate Analyzer nodes
  .addNode("initial_scanning", initialScanningNode)
  .addNode("legal_analysis", legalAnalysisNode)
  .addNode("scoring_feedback", scoringFeedbackNode)
  .addNode("refinement_generator", refinementGeneratorNode)
  
  // Agent 3: Final Reviewer nodes
  .addNode("consistency_check", consistencyCheckNode)
  .addNode("strategic_review", strategicReviewNode)
  .addNode("client_readiness", clientReadinessNode)
  
  // Flow definitions
  .addEdge(START, "context_assembly")
  .addEdge("context_assembly", "document_generation")
  .addEdge("document_generation", "basic_refinement")
  .addEdge("basic_refinement", "initial_scanning")
  .addEdge("initial_scanning", "legal_analysis")
  .addEdge("legal_analysis", "scoring_feedback")
  
  // Quality gate conditional routing
  .addConditionalEdges("scoring_feedback", qualityGateRouter, {
    "pass": "consistency_check",
    "fail": "refinement_generator",
    "max_iterations": END
  })
  
  // Refinement loop
  .addEdge("refinement_generator", "targeted_refinement")
  .addEdge("targeted_refinement", "document_generation")
  
  // Final review flow
  .addEdge("consistency_check", "strategic_review")
  .addEdge("strategic_review", "client_readiness")
  
  // Final gate conditional routing
  .addConditionalEdges("client_readiness", finalGateRouter, {
    "approve": END,
    "refine": "final_refinement",
    "max_iterations": END
  })
  
  // Final refinement loop
  .addEdge("final_refinement", "document_generation");
```

## Integration Patterns

### LangGraph Configuration

```typescript
// src/config/langgraph.ts
export const langGraphConfig = {
  stateSchema: PipelineState,
  maxIterations: 3,
  qualityGateThreshold: 80,
  finalGateThreshold: 90,
  timeoutMs: 300000, // 5 minutes
  checkpointSaver: new MemorySaver(),
  debug: process.env.NODE_ENV === 'development'
};
```

### CLI Integration Bridge

```typescript
interface LangGraphOrchestrator {
  executeQualityPipeline: (request: DocumentRequest) => Promise<PipelineState>;
  handleStateManagement: (state: PipelineState) => Promise<PipelineState>;
  trackQualityMetrics: (session: PipelineState) => QualityMetrics;
  optimizeCostSelection: (task: string) => ModelSelection;
}
```

## State Management Patterns

### Automatic State Persistence
```typescript
// LangGraph automatically manages state
// No manual state updates required
// State flows through nodes automatically
// Conditional routing based on state values
```

### Quality Pipeline State Tracking
```typescript
interface QualityMetrics {
  currentIteration: number;
  qualityScore: number;
  iterationHistory: RefinementAttempt[];
  costOptimization: CostMetrics;
  contextUtilization: ContextMetrics;
}
```

### Learning System State
```typescript
interface LearningSystemState {
  attorneyPatterns: Map<string, AttorneyPattern>;
  clientPreferences: Map<string, ClientPreference>;
  qualityImprovements: QualityPattern[];
  costOptimizations: CostPattern[];
  successFactors: SuccessPattern[];
}
```

## Benefits of LangGraph Architecture

### 1. Simplified Orchestration
- **60-70% code reduction** vs custom orchestrators
- **Automatic state management** with persistence
- **Visual workflow representation** for debugging
- **Built-in error handling** and recovery

### 2. Enhanced Reliability
- **Robust loop management** for refinement cycles
- **Conditional routing** for quality gates
- **State validation** and error recovery
- **Timeout management** and graceful failures

### 3. Scalability & Maintainability
- **Easy to add new nodes** and quality gates
- **Simple routing modifications** through conditional edges
- **Clear separation of concerns** between agents
- **Testable node functions** with predictable state

### 4. Cost Optimization
- **Strategic model selection** integrated into nodes
- **Usage tracking** across all model calls
- **Cost monitoring** and optimization patterns
- **Efficient resource allocation** through state management

## Implementation Ready

### Dependencies Required
```json
{
  "dependencies": {
    "@langchain/langgraph": "^0.2.0",
    "@langchain/core": "^0.3.0",
    "@langchain/openai": "^0.3.0"
  }
}
```

### Architecture Complete
- [x] **LangGraph Workflow**: StateGraph with nodes and conditional edges
- [x] **State Schema**: Comprehensive PipelineState interface
- [x] **Node Functions**: Agent implementations with strategic model selection
- [x] **Quality Gates**: Conditional routing with 80% and 90% thresholds
- [x] **Refinement Loops**: Iterative improvement with state persistence
- [x] **Integration Plan**: CLI support and backwards compatibility

**Ready for immediate implementation with complete LangGraph architecture!** 