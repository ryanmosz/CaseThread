/**
 * CaseThread LangGraph Agent Nodes
 * 
 * This file implements all the node functions for the quality pipeline with strategic model selection.
 * Each node is responsible for a specific part of the document generation and quality process.
 */

import OpenAI from 'openai';
import { 
  PipelineState, 
  StructuredContext,
  QualityAnalysis,
  StrategicReview
} from '../../../types/langgraph';
import { logger } from '../../../utils/logger';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// =====================================
// Agent 1: Contextual Document Writer Nodes
// =====================================

/**
 * Context Assembly Node (GPT-4)
 * Organizes and structures retrieved ChromaDB context for optimal use
 */
export async function contextAssemblyNode(state: PipelineState): Promise<PipelineState> {
  logger.info('🔧 Context Assembly Node - Starting', {
    client: state.matterContext.client,
    documentType: state.documentType,
    embeddingsCount: state.contextBundle.embeddings.length
  });

  const startTime = Date.now();

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are organizing legal context for document generation. Structure and prioritize the provided context for optimal use by the legal writing system.

CONTEXT INPUTS:
- ChromaDB Precedents: ${JSON.stringify(state.contextBundle.embeddings.slice(0, 5))} (showing first 5 of ${state.contextBundle.embeddings.length})
- Client: ${state.matterContext.client}
- Attorney: ${state.matterContext.attorney}
- Document Type: ${state.documentType}

ORGANIZATION REQUIREMENTS:
1. Prioritize precedents by relevance and similarity scores
2. Identify key legal patterns applicable to this document type
3. Extract relevant risk factors and mitigation strategies
4. Create strategic guidance based on client context
5. Generate context summary for effective utilization

OUTPUT FORMAT:
Return a JSON object with the following structure:
{
  "prioritizedPrecedents": [
    {
      "id": "string",
      "content": "string",
      "relevanceScore": number,
      "similarity": number,
      "source": "string",
      "applicableToSections": ["string"],
      "keyPoints": ["string"]
    }
  ],
  "attorneyPatterns": [
    {
      "id": "string",
      "pattern": "string",
      "implementation": "string",
      "successRate": number,
      "documentTypes": ["string"]
    }
  ],
  "clientPreferences": [
    {
      "id": "string",
      "preference": "string",
      "value": "string",
      "priority": "high|medium|low",
      "applicableDocuments": ["string"]
    }
  ],
  "riskFactors": [
    {
      "id": "string",
      "type": "legal|compliance|business|technical",
      "description": "string",
      "severity": "critical|high|medium|low",
      "mitigationStrategy": "string",
      "applicableSections": ["string"]
    }
  ],
  "strategicGuidance": [
    {
      "scenario": "string",
      "clientType": "string",
      "guidance": "string",
      "rationale": "string",
      "applicableDocuments": ["string"]
    }
  ],
  "contextSummary": "string"
}`
        }
      ],
      temperature: 0.3
    });

    const structuredContext: StructuredContext = JSON.parse(response.choices[0].message.content!);
    const duration = Date.now() - startTime;

    // Update state with structured context and model usage
    const updatedState: PipelineState = {
      ...state,
      structuredContext,
      modelUsage: {
        ...state.modelUsage,
        gpt4Calls: state.modelUsage.gpt4Calls + 1,
        totalTokensUsed: state.modelUsage.totalTokensUsed + (response.usage?.total_tokens || 0),
        totalCost: state.modelUsage.totalCost + calculateCost('gpt-4', response.usage?.total_tokens || 0),
        callDetails: [
          ...state.modelUsage.callDetails,
          {
            id: `context-assembly-${Date.now()}`,
            node: 'context_assembly',
            model: 'gpt-4',
            tokens: response.usage?.total_tokens || 0,
            cost: calculateCost('gpt-4', response.usage?.total_tokens || 0),
            duration,
            timestamp: new Date(),
            success: true
          }
        ]
      }
    };

    logger.info('✅ Context Assembly Node - Completed', {
      duration: `${duration}ms`,
      precedentsOrganized: structuredContext.prioritizedPrecedents.length,
      riskFactors: structuredContext.riskFactors.length,
      tokensUsed: response.usage?.total_tokens || 0
    });

    return updatedState;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ Context Assembly Node - Failed', {
      error: (error as Error).message,
      duration: `${duration}ms`
    });

    return {
      ...state,
      errors: [
        ...state.errors,
        {
          id: `error-${Date.now()}`,
          node: 'context_assembly',
          type: 'api',
          message: (error as Error).message,
          details: error,
          timestamp: new Date(),
          recoverable: true
        }
      ]
    };
  }
}

/**
 * Document Generation Node (o3)
 * Core legal writing with context integration - uses o3 for complex legal reasoning
 */
export async function documentGenerationNode(state: PipelineState): Promise<PipelineState> {
  logger.info('📝 Document Generation Node - Starting', {
    client: state.matterContext.client,
    documentType: state.documentType,
    iteration: state.currentIteration,
    hasStructuredContext: !!state.structuredContext
  });

  const startTime = Date.now();

  try {
    // Build the generation prompt with structured context
    const contextSummary = state.structuredContext ? 
      `STRUCTURED CONTEXT AVAILABLE:
- ${state.structuredContext.prioritizedPrecedents.length} prioritized precedents
- ${state.structuredContext.riskFactors.length} identified risk factors
- ${state.structuredContext.attorneyPatterns.length} attorney patterns
- ${state.structuredContext.clientPreferences.length} client preferences

Context Summary: ${state.structuredContext.contextSummary}

Key Precedents:
${state.structuredContext.prioritizedPrecedents.slice(0, 3).map(p => 
  `- ${p.source}: ${p.keyPoints.join(', ')} (Relevance: ${p.relevanceScore})`
).join('\n')}

Risk Factors to Address:
${state.structuredContext.riskFactors.map(r => 
  `- ${r.type}: ${r.description} (${r.severity}) - Mitigation: ${r.mitigationStrategy}`
).join('\n')}` : 
      'No structured context available - generating based on template and matter context only.';

    const response = await openai.chat.completions.create({
      model: "o3",
      messages: [
        {
          role: "system",
          content: `You are a senior IP attorney drafting a ${state.documentType} for ${state.matterContext.client}. Generate a professional, comprehensive legal document using the structured context provided.

CLIENT MATTER:
- Client: ${state.matterContext.client}
- Attorney: ${state.matterContext.attorney || 'Not specified'}
- Document Type: ${state.documentType}
- Template ID: ${state.template.id}

${contextSummary}

GENERATION REQUIREMENTS:
1. Follow the template structure exactly
2. Incorporate relevant precedent language where applicable
3. Address all identified risk factors with appropriate legal language
4. Use professional IP law terminology and standards
5. Include appropriate disclaimers and boilerplate language
6. Ensure enforceability and compliance with applicable laws
7. Maintain consistency in terminology throughout
8. Fill all template sections completely - no placeholder text
9. Use the provided YAML data: ${JSON.stringify(state.matterContext.yamlData)}

QUALITY STANDARDS:
- Complete all template sections
- No placeholder text or [BRACKET] content
- Consistent legal terminology
- Appropriate complexity for document type
- Professional formatting in markdown
- Strategic positioning for client objectives

IMPORTANT: Generate the complete document in markdown format. This is ${state.currentIteration > 0 ? `iteration ${state.currentIteration + 1}` : 'the initial generation'}.`
        }
      ]
    });

    const generatedDocument = response.choices[0].message.content!;
    const duration = Date.now() - startTime;

    // Update state with generated document and model usage
    const updatedState: PipelineState = {
      ...state,
      generatedDocument,
      currentIteration: state.currentIteration + 1,
      modelUsage: {
        ...state.modelUsage,
        o3Calls: state.modelUsage.o3Calls + 1,
        totalTokensUsed: state.modelUsage.totalTokensUsed + (response.usage?.total_tokens || 0),
        totalCost: state.modelUsage.totalCost + calculateCost('o3', response.usage?.total_tokens || 0),
        callDetails: [
          ...state.modelUsage.callDetails,
          {
            id: `document-generation-${Date.now()}`,
            node: 'document_generation',
            model: 'o3',
            tokens: response.usage?.total_tokens || 0,
            cost: calculateCost('o3', response.usage?.total_tokens || 0),
            duration,
            timestamp: new Date(),
            success: true
          }
        ]
      }
    };

    logger.info('✅ Document Generation Node - Completed', {
      duration: `${duration}ms`,
      iteration: updatedState.currentIteration,
      documentLength: generatedDocument.length,
      tokensUsed: response.usage?.total_tokens || 0
    });

    return updatedState;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ Document Generation Node - Failed', {
      error: (error as Error).message,
      duration: `${duration}ms`,
      iteration: state.currentIteration
    });

    return {
      ...state,
      errors: [
        ...state.errors,
        {
          id: `error-${Date.now()}`,
          node: 'document_generation',
          type: 'api',
          message: (error as Error).message,
          details: error,
          timestamp: new Date(),
          recoverable: true
        }
      ]
    };
  }
}

/**
 * Basic Refinement Node (GPT-4)
 * Handles simple revision requests and improvements
 */
export async function basicRefinementNode(state: PipelineState): Promise<PipelineState> {
  logger.info('✨ Basic Refinement Node - Starting', {
    client: state.matterContext.client,
    documentType: state.documentType,
    hasDocument: !!state.generatedDocument
  });

  // For now, this is a pass-through node
  // In future iterations, this can add basic formatting and consistency improvements
  logger.info('✅ Basic Refinement Node - Pass-through (to be enhanced)');
  
  return {
    ...state,
    refinedDocument: state.generatedDocument
  };
}

// =====================================
// Agent 2: Quality Gate Analyzer Nodes
// =====================================

/**
 * Initial Scanning Node (GPT-4)
 * Basic completeness and formatting checks
 */
export async function initialScanningNode(state: PipelineState): Promise<PipelineState> {
  logger.info('🔍 Initial Scanning Node - Starting', {
    client: state.matterContext.client,
    documentType: state.documentType,
    hasDocument: !!state.generatedDocument
  });

  // For now, this is a pass-through node that logs the scanning
  // In future iterations, this can add basic validation checks
  logger.info('✅ Initial Scanning Node - Pass-through (to be enhanced)');
  
  return state;
}

/**
 * Legal Analysis Node (o3)
 * Complex legal accuracy and risk assessment - uses o3 for sophisticated legal analysis
 */
export async function legalAnalysisNode(state: PipelineState): Promise<PipelineState> {
  logger.info('⚖️  Legal Analysis Node - Starting', {
    client: state.matterContext.client,
    documentType: state.documentType,
    hasDocument: !!state.generatedDocument
  });

  const startTime = Date.now();

  try {
    const response = await openai.chat.completions.create({
      model: "o3",
      messages: [
        {
          role: "system",
          content: `You are a senior partner conducting rigorous quality review of a ${state.documentType}. Analyze this document against the highest professional standards.

DOCUMENT TO REVIEW:
${state.generatedDocument}

TEMPLATE REQUIREMENTS:
${JSON.stringify(state.template, null, 2)}

QUALITY CRITERIA (Each scored 0-100):
1. LEGAL ACCURACY (25%): Correct legal terminology, accurate citations, proper legal concepts
2. COMPLETENESS (25%): All template sections filled, comprehensive coverage, no placeholders
3. CONSISTENCY (20%): Consistent terminology, logical flow, uniform formatting
4. PROFESSIONAL TONE (15%): Appropriate formality, clear language, professional style
5. RISK MITIGATION (15%): Identified risks, protective language, compliance considerations

ANALYSIS REQUIREMENTS:
1. Score each criterion (0-100)
2. Calculate weighted overall score using weights: Legal Accuracy (25%), Completeness (25%), Consistency (20%), Professional Tone (15%), Risk Mitigation (15%)
3. Identify specific issues with severity levels
4. Provide actionable recommendations for improvement
5. Check for placeholder text, incomplete sections, or formatting issues

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "overallScore": number,
  "criteriaScores": {
    "legalAccuracy": number,
    "completeness": number,
    "consistency": number,
    "professionalTone": number,
    "riskMitigation": number
  },
  "detailedAnalysis": {
    "legalAccuracy": {
      "score": number,
      "passed": boolean,
      "issues": ["string"],
      "recommendations": ["string"],
      "examples": ["string"]
    },
    "completeness": {
      "score": number,
      "passed": boolean,
      "issues": ["string"],
      "recommendations": ["string"],
      "examples": ["string"]
    },
    "consistency": {
      "score": number,
      "passed": boolean,
      "issues": ["string"],
      "recommendations": ["string"],
      "examples": ["string"]
    },
    "professionalTone": {
      "score": number,
      "passed": boolean,
      "issues": ["string"],
      "recommendations": ["string"],
      "examples": ["string"]
    },
    "riskMitigation": {
      "score": number,
      "passed": boolean,
      "issues": ["string"],
      "recommendations": ["string"],
      "examples": ["string"]
    }
  },
  "specificFeedback": [
    {
      "category": "string",
      "severity": "critical|high|medium|low",
      "issue": "string",
      "recommendation": "string",
      "example": "string",
      "location": {
        "section": "string",
        "line": number
      }
    }
  ],
  "recommendedActions": ["string"]
}`
        }
      ]
    });

    const qualityAnalysis: QualityAnalysis = JSON.parse(response.choices[0].message.content!);
    const duration = Date.now() - startTime;

    // Update state with quality analysis and model usage
    const updatedState: PipelineState = {
      ...state,
      qualityAnalysis,
      qualityScore: qualityAnalysis.overallScore,
      qualityHistory: [
        ...state.qualityHistory,
        {
          iteration: state.currentIteration,
          overallScore: qualityAnalysis.overallScore,
          criteriaScores: qualityAnalysis.criteriaScores,
          passedGate: qualityAnalysis.overallScore >= 80,
          timestamp: new Date(),
          feedback: qualityAnalysis.specificFeedback
        }
      ],
      modelUsage: {
        ...state.modelUsage,
        o3Calls: state.modelUsage.o3Calls + 1,
        totalTokensUsed: state.modelUsage.totalTokensUsed + (response.usage?.total_tokens || 0),
        totalCost: state.modelUsage.totalCost + calculateCost('o3', response.usage?.total_tokens || 0),
        callDetails: [
          ...state.modelUsage.callDetails,
          {
            id: `legal-analysis-${Date.now()}`,
            node: 'legal_analysis',
            model: 'o3',
            tokens: response.usage?.total_tokens || 0,
            cost: calculateCost('o3', response.usage?.total_tokens || 0),
            duration,
            timestamp: new Date(),
            success: true
          }
        ]
      }
    };

    logger.info('✅ Legal Analysis Node - Completed', {
      duration: `${duration}ms`,
      overallScore: qualityAnalysis.overallScore,
      passedGate: qualityAnalysis.overallScore >= 80,
      tokensUsed: response.usage?.total_tokens || 0
    });

    return updatedState;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ Legal Analysis Node - Failed', {
      error: (error as Error).message,
      duration: `${duration}ms`
    });

    return {
      ...state,
      errors: [
        ...state.errors,
        {
          id: `error-${Date.now()}`,
          node: 'legal_analysis',
          type: 'api',
          message: (error as Error).message,
          details: error,
          timestamp: new Date(),
          recoverable: true
        }
      ]
    };
  }
}

/**
 * Scoring Feedback Node (GPT-4)
 * Generate structured feedback and quality scores
 */
export async function scoringFeedbackNode(state: PipelineState): Promise<PipelineState> {
  logger.info('📊 Scoring Feedback Node - Starting', {
    client: state.matterContext.client,
    documentType: state.documentType,
    qualityScore: state.qualityScore,
    hasAnalysis: !!state.qualityAnalysis
  });

  // This node processes the quality analysis and sets the gate status
  const passedQualityGate = state.qualityScore >= 80;
  
  const updatedState: PipelineState = {
    ...state,
    passedQualityGate
  };

  logger.info('✅ Scoring Feedback Node - Completed', {
    qualityScore: state.qualityScore,
    passedGate: passedQualityGate,
    threshold: 80
  });

  return updatedState;
}

/**
 * Refinement Generator Node (GPT-4)
 * Create targeted refinement instructions when quality gate fails
 */
export async function refinementGeneratorNode(state: PipelineState): Promise<PipelineState> {
  logger.info('🔄 Refinement Generator Node - Starting', {
    client: state.matterContext.client,
    documentType: state.documentType,
    qualityScore: state.qualityScore,
    iteration: state.currentIteration
  });

  // For now, this node prepares the state for refinement
  // The targeted refinement will use the quality feedback to improve the document
  logger.info('✅ Refinement Generator Node - Prepared for refinement');
  
  return state;
}

/**
 * Targeted Refinement Node (GPT-4)
 * Process specific quality feedback and improve the document
 */
export async function targetedRefinementNode(state: PipelineState): Promise<PipelineState> {
  logger.info('🎯 Targeted Refinement Node - Starting', {
    client: state.matterContext.client,
    documentType: state.documentType,
    qualityScore: state.qualityScore,
    iteration: state.currentIteration
  });

  // This node will cycle back to document generation with refinement instructions
  // For now, it's a pass-through that will be enhanced
  logger.info('✅ Targeted Refinement Node - Pass-through (cycling back to generation)');
  
  return state;
}

// =====================================
// Agent 3: Final Reviewer Nodes
// =====================================

/**
 * Consistency Check Node (GPT-4)
 * Cross-reference consistency across document
 */
export async function consistencyCheckNode(state: PipelineState): Promise<PipelineState> {
  logger.info('✅ Consistency Check Node - Starting', {
    client: state.matterContext.client,
    documentType: state.documentType,
    qualityScore: state.qualityScore
  });

  // For now, this is a pass-through node
  // In future iterations, this can add detailed consistency checks
  logger.info('✅ Consistency Check Node - Pass-through (to be enhanced)');
  
  return state;
}

/**
 * Strategic Review Node (o3)
 * Partner-level strategic positioning and final quality check
 */
export async function strategicReviewNode(state: PipelineState): Promise<PipelineState> {
  logger.info('🎖️  Strategic Review Node - Starting', {
    client: state.matterContext.client,
    documentType: state.documentType,
    qualityScore: state.qualityScore
  });

  const startTime = Date.now();

  try {
    const response = await openai.chat.completions.create({
      model: "o3",
      messages: [
        {
          role: "system",
          content: `You are a senior partner conducting final strategic review of a ${state.documentType} for ${state.matterContext.client}. This document has passed quality gates (score: ${state.qualityScore}/100) and now needs strategic positioning and final assessment.

DOCUMENT FOR FINAL REVIEW:
${state.generatedDocument}

QUALITY ANALYSIS PASSED:
Overall Score: ${state.qualityScore}/100
Previous Quality Feedback: ${state.qualityAnalysis ? JSON.stringify(state.qualityAnalysis.specificFeedback.slice(0, 3)) : 'No detailed feedback available'}

CLIENT CONTEXT:
- Client: ${state.matterContext.client}
- Attorney: ${state.matterContext.attorney || 'Not specified'}
- Document Type: ${state.documentType}

STRATEGIC REVIEW CRITERIA (Score 0-100 each):
1. STRATEGIC POSITIONING (30%): Alignment with client objectives, competitive advantage
2. CLIENT RELATIONSHIP (25%): Appropriate tone, communication style match, trust building
3. BUSINESS IMPACT (20%): Commercial viability, implementation practicality
4. RISK OPTIMIZATION (15%): Balanced risk allocation, practical enforceability
5. PROFESSIONAL EXCELLENCE (10%): Partner-level quality, firm reputation enhancement

FINAL REVIEW REQUIREMENTS:
1. Score each strategic criterion (0-100)
2. Calculate weighted overall score using the percentages above
3. Identify strategic enhancements and positioning improvements
4. Provide delivery recommendations and client communication strategy
5. Suggest next steps for implementation

APPROVAL THRESHOLD: 90/100

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "finalScore": number,
  "strategicScores": {
    "strategicPositioning": number,
    "clientRelationship": number,
    "businessImpact": number,
    "riskOptimization": number,
    "professionalExcellence": number
  },
  "strategicEnhancements": ["string"],
  "deliveryNotes": ["string"],
  "nextSteps": ["string"],
  "clientCommunicationStrategy": "string",
  "approvedForDelivery": boolean
}`
        }
      ]
    });

    const strategicReview: StrategicReview = JSON.parse(response.choices[0].message.content!);
    const duration = Date.now() - startTime;

    // Update state with strategic review and model usage
    const updatedState: PipelineState = {
      ...state,
      qualityScore: strategicReview.finalScore,
      passedFinalGate: strategicReview.finalScore >= 90,
      modelUsage: {
        ...state.modelUsage,
        o3Calls: state.modelUsage.o3Calls + 1,
        totalTokensUsed: state.modelUsage.totalTokensUsed + (response.usage?.total_tokens || 0),
        totalCost: state.modelUsage.totalCost + calculateCost('o3', response.usage?.total_tokens || 0),
        callDetails: [
          ...state.modelUsage.callDetails,
          {
            id: `strategic-review-${Date.now()}`,
            node: 'strategic_review',
            model: 'o3',
            tokens: response.usage?.total_tokens || 0,
            cost: calculateCost('o3', response.usage?.total_tokens || 0),
            duration,
            timestamp: new Date(),
            success: true
          }
        ]
      }
    };

    logger.info('✅ Strategic Review Node - Completed', {
      duration: `${duration}ms`,
      finalScore: strategicReview.finalScore,
      passedFinalGate: strategicReview.finalScore >= 90,
      tokensUsed: response.usage?.total_tokens || 0
    });

    return updatedState;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ Strategic Review Node - Failed', {
      error: (error as Error).message,
      duration: `${duration}ms`
    });

    return {
      ...state,
      errors: [
        ...state.errors,
        {
          id: `error-${Date.now()}`,
          node: 'strategic_review',
          type: 'api',
          message: (error as Error).message,
          details: error,
          timestamp: new Date(),
          recoverable: true
        }
      ]
    };
  }
}

/**
 * Client Readiness Node (GPT-4)
 * Final formatting and presentation polish
 */
export async function clientReadinessNode(state: PipelineState): Promise<PipelineState> {
  logger.info('🤝 Client Readiness Node - Starting', {
    client: state.matterContext.client,
    documentType: state.documentType,
    qualityScore: state.qualityScore,
    passedFinalGate: state.passedFinalGate
  });

  // Set final document and completion status
  const updatedState: PipelineState = {
    ...state,
    finalDocument: state.generatedDocument,
    completionStatus: state.passedFinalGate ? 'final_approved' : 'quality_approved',
    endTime: new Date()
  };

  logger.info('✅ Client Readiness Node - Completed', {
    finalScore: state.qualityScore,
    status: updatedState.completionStatus,
    passedFinalGate: state.passedFinalGate
  });

  return updatedState;
}

/**
 * Final Refinement Node (GPT-4)
 * Final polish and client readiness when final gate fails
 */
export async function finalRefinementNode(state: PipelineState): Promise<PipelineState> {
  logger.info('🏁 Final Refinement Node - Starting', {
    client: state.matterContext.client,
    documentType: state.documentType,
    qualityScore: state.qualityScore,
    iteration: state.currentIteration
  });

  // This node will cycle back to document generation with final refinement instructions
  // For now, it's a pass-through that will be enhanced
  logger.info('✅ Final Refinement Node - Pass-through (cycling back to generation)');
  
  return state;
}

// =====================================
// Helper Functions
// =====================================

/**
 * Calculate API call cost based on model and token usage
 */
function calculateCost(model: 'gpt-4' | 'o3', tokens: number): number {
  // Placeholder cost calculation - adjust based on actual OpenAI pricing
  const costPerToken = {
    'gpt-4': 0.00003, // $0.03 per 1K tokens (approximate)
    'o3': 0.00015     // $0.15 per 1K tokens (approximate, o3 is more expensive)
  };
  
  return (tokens / 1000) * costPerToken[model];
}

// =====================================
// End of Node Implementations
// ===================================== 