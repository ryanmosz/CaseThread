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
  StrategicReview
} from '../../../types/langgraph';
import { Template } from '../../../types';
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
      temperature: 0.1
    });

    // Clean and parse JSON response, handling markdown code blocks
    const responseContent = response.choices[0].message.content!;
    const cleanJson = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const structuredContext: StructuredContext = JSON.parse(cleanJson);
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
    // Format template structure like the normal pipeline does
    const templateStructure = formatTemplateStructure(state.template);
    
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

TEMPLATE STRUCTURE:
${templateStructure}

${contextSummary}

GENERATION REQUIREMENTS:
1. Follow the exact template structure defined above
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

CRITICAL FORMATTING REQUIREMENTS:
- Generate a complete legal document in Markdown format
- Use proper markdown syntax for headers, lists, and emphasis
- Ensure all variable placeholders are replaced with actual data
- Maintain professional formatting throughout
- **DO NOT include section references like "Section 1:", "Section 2:", etc. in the final document**
- **Generate clean document headers without template section references**
- **PRESERVE these special markers exactly as they appear in the template:**
  - [SIGNATURE_BLOCK:*] - placement markers for signature areas
  - [INITIALS_BLOCK:*] - placement markers for initial areas  
  - [NOTARY_BLOCK:*] - placement markers for notary sections
  **These markers must appear literally in your output - do NOT replace or remove them**

IMPORTANT: Generate the complete document in markdown format ready for use. This is ${state.currentIteration > 0 ? `iteration ${state.currentIteration + 1}` : 'the initial generation'}.`
        }
      ]
    });

    const generatedDocument = response.choices[0].message.content!;
    const duration = Date.now() - startTime;

    // Validate signature blocks are preserved
    const signatureBlocksValid = validateSignatureBlocks(generatedDocument, state.template);
    if (!signatureBlocksValid) {
      logger.warn('Document generation completed but signature blocks may be missing', {
        templateId: state.template.id,
        documentType: state.documentType,
        iteration: state.currentIteration + 1
      });
    }

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
 * Basic Refinement & Validation Node (GPT-4)
 * Combines immediate post-generation refinement with comprehensive validation
 */
export async function basicRefinementNode(state: PipelineState): Promise<PipelineState> {
  logger.info('✨ Basic Refinement & Validation Node - Starting', {
    client: state.matterContext.client,
    documentType: state.documentType,
    hasDocument: !!state.generatedDocument
  });

  const startTime = Date.now();

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are performing comprehensive refinement and validation on a freshly generated ${state.documentType}. Refine the document while conducting thorough validation checks.

DOCUMENT TO REFINE AND VALIDATE:
${state.generatedDocument}

TEMPLATE REQUIREMENTS:
${JSON.stringify(state.template.requiredFields, null, 2)}

COMPREHENSIVE REFINEMENT & VALIDATION:

**PHASE 1: DOCUMENT REFINEMENT**
1. **Formatting Consistency**:
   - Ensure consistent markdown formatting (headers, lists, emphasis)
   - Standardize numbering and bullet point styles
   - Fix any formatting irregularities

2. **Structure Optimization**:
   - Verify all template sections are present and in correct order
   - Ensure proper section hierarchy and flow
   - Optimize section headers for consistency

3. **Content Enhancement**:
   - Remove any placeholder text ([BRACKETS], {{variables}}, TBD)
   - Ensure all required fields are properly filled
   - Standardize date and name formatting
   - Improve clarity while preserving legal substance

4. **Terminology Standardization**:
   - Ensure consistent use of party names throughout
   - Standardize legal terminology and capitalization
   - Optimize contract language for consistency

**PHASE 2: VALIDATION CHECKS**
5. **Completeness Validation**:
   - All required template sections present
   - All required fields filled with substantive content
   - No missing or incomplete sections

6. **Special Markers Verification**:
   - **CRITICAL: Preserve these markers exactly:**
     - [SIGNATURE_BLOCK:*] - placement markers for signature areas
     - [INITIALS_BLOCK:*] - placement markers for initial areas  
     - [NOTARY_BLOCK:*] - placement markers for notary sections

7. **Basic Consistency Check**:
   - Party names consistent throughout
   - Dates properly formatted and logical
   - Cross-references accurate

REFINEMENT GUIDELINES:
- Improve formatting, structure, and presentation
- Do NOT change legal substance or meaning
- Do NOT remove or alter critical legal language
- Preserve all special markers exactly as they appear
- Focus on professional document polish
- **DO NOT include section references like "Section 1:", "Section 2:", etc. in the final document**
- **Generate clean document headers without template section references**

RESPONSE FORMAT:
Return a JSON object with:
{
  "refinedDocument": "the improved document in markdown format",
  "validationResults": {
    "overallScore": number (0-100),
    "sectionsComplete": boolean,
    "specialMarkersPresent": boolean,
    "formattingConsistent": boolean,
    "contentComplete": boolean,
    "issuesFound": [
      {
        "severity": "critical|high|medium|low",
        "issue": "description",
        "location": "section",
        "fixed": boolean
      }
    ],
    "readyForLegalAnalysis": boolean,
    "summary": "brief validation summary"
  }
}`
        }
      ],
      temperature: 0.1
    });

    // Clean and parse JSON response, handling markdown code blocks
    const responseContent = response.choices[0].message.content!;
    const cleanJson = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleanJson);
    const refinedDocument = result.refinedDocument;
    const validationResults = result.validationResults;
    const duration = Date.now() - startTime;

    // Log critical issues found during validation
    const criticalIssues = validationResults.issuesFound?.filter((issue: any) => issue.severity === 'critical') || [];
    if (criticalIssues.length > 0) {
      logger.warn('Critical issues found during refinement & validation', {
        issueCount: criticalIssues.length,
        issues: criticalIssues.map((issue: any) => issue.issue)
      });
    }

    // Additional validation of signature blocks
    const signatureBlocksValid = validateSignatureBlocks(refinedDocument, state.template);
    if (!signatureBlocksValid) {
      logger.warn('Signature blocks may have been lost during refinement', {
        templateId: state.template.id,
        documentType: state.documentType
      });
    }

    // Update state with refined document and validation results
    const updatedState: PipelineState = {
      ...state,
      refinedDocument,
      initialScanResults: {
        scanComplete: true,
        overallScore: validationResults.overallScore,
        issues: validationResults.issuesFound,
        sectionsPresent: validationResults.sectionsComplete ? ['all-sections'] : ['missing-sections'],
        missingRequirements: validationResults.issuesFound
          .filter((issue: any) => issue.severity === 'critical' || issue.severity === 'high')
          .map((issue: any) => issue.issue),
        specialMarkersFound: validationResults.specialMarkersPresent ? ['signature-blocks-present'] : [],
        readyForLegalAnalysis: validationResults.readyForLegalAnalysis,
        summary: validationResults.summary
      },
      modelUsage: {
        ...state.modelUsage,
        gpt4Calls: state.modelUsage.gpt4Calls + 1,
        totalTokensUsed: state.modelUsage.totalTokensUsed + (response.usage?.total_tokens || 0),
        totalCost: state.modelUsage.totalCost + calculateCost('gpt-4', response.usage?.total_tokens || 0),
        callDetails: [
          ...state.modelUsage.callDetails,
          {
            id: `basic-refinement-validation-${Date.now()}`,
            node: 'basic_refinement',
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

    logger.info('✅ Basic Refinement & Validation Node - Completed', {
      duration: `${duration}ms`,
      overallScore: validationResults.overallScore,
      issuesFound: validationResults.issuesFound?.length || 0,
      criticalIssues: criticalIssues.length,
      readyForLegalAnalysis: validationResults.readyForLegalAnalysis,
      signatureBlocksPreserved: signatureBlocksValid,
      tokensUsed: response.usage?.total_tokens || 0
    });

    return updatedState;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ Basic Refinement & Validation Node - Failed', {
      error: (error as Error).message,
      duration: `${duration}ms`
    });

    // Fall back to original document if refinement fails
    return {
      ...state,
      refinedDocument: state.generatedDocument,
      errors: [
        ...state.errors,
        {
          id: `error-${Date.now()}`,
          node: 'basic_refinement',
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

// =====================================
// Agent 2: Quality Gate Analyzer Nodes
// =====================================

/**
 * Initial Scanning Node (GPT-4) - DEPRECATED
 * Functionality merged into basicRefinementNode for streamlined pipeline
 */
export async function initialScanningNode(state: PipelineState): Promise<PipelineState> {
  logger.info('🔍 Initial Scanning Node - Starting', {
    client: state.matterContext.client,
    documentType: state.documentType,
    hasDocument: !!state.refinedDocument
  });

  const startTime = Date.now();

  try {
    // Use the refined document if available, otherwise fall back to generated document
    const documentToScan = state.refinedDocument || state.generatedDocument;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are performing initial quality scanning on a ${state.documentType}. Conduct basic completeness and formatting checks to identify obvious issues before detailed legal analysis.

DOCUMENT TO SCAN:
${documentToScan}

TEMPLATE REQUIREMENTS:
${JSON.stringify(state.template.requiredFields, null, 2)}

SCANNING CHECKLIST:
1. **Section Completeness**:
   - All required template sections present
   - Sections appear in correct order
   - No missing or incomplete sections

2. **Content Completeness**:
   - No placeholder text ({{variables}}, [BRACKETS], TODO items)
   - All required fields filled with actual content
   - No "TBD" or "To be determined" text

3. **Special Markers Validation**:
   - Signature blocks present: [SIGNATURE_BLOCK:*]
   - Initial blocks present if required: [INITIALS_BLOCK:*]
   - Notary blocks present if required: [NOTARY_BLOCK:*]

4. **Basic Formatting**:
   - Proper markdown structure (headers, lists)
   - Consistent formatting throughout
   - Professional document layout

5. **Data Integrity**:
   - Party names consistent throughout
   - Dates properly formatted
   - Numbers and amounts properly formatted

SCANNING RESULTS FORMAT:
Return a JSON object with this structure:
{
  "scanComplete": true,
  "overallScore": number (0-100),
  "issues": [
    {
      "category": "completeness|formatting|markers|data",
      "severity": "critical|high|medium|low",
      "issue": "string description",
      "location": "section or area",
      "recommendation": "how to fix"
    }
  ],
  "sectionsPresent": ["list of sections found"],
  "missingRequirements": ["list of missing items"],
  "specialMarkersFound": ["list of special markers"],
  "readyForLegalAnalysis": boolean,
  "summary": "brief summary of scanning results"
}`
        }
      ],
      temperature: 0.1
    });

    // Clean and parse JSON response, handling markdown code blocks
    const responseContent = response.choices[0].message.content!;
    const cleanJson = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const scanResults = JSON.parse(cleanJson);
    const duration = Date.now() - startTime;

    // Log critical issues found
    const criticalIssues = scanResults.issues?.filter((issue: any) => issue.severity === 'critical') || [];
    if (criticalIssues.length > 0) {
      logger.warn('Critical issues found during initial scanning', {
        issueCount: criticalIssues.length,
        issues: criticalIssues.map((issue: any) => issue.issue)
      });
    }

    // Update state with scan results
    const updatedState: PipelineState = {
      ...state,
      initialScanResults: scanResults,
      modelUsage: {
        ...state.modelUsage,
        gpt4Calls: state.modelUsage.gpt4Calls + 1,
        totalTokensUsed: state.modelUsage.totalTokensUsed + (response.usage?.total_tokens || 0),
        totalCost: state.modelUsage.totalCost + calculateCost('gpt-4', response.usage?.total_tokens || 0),
        callDetails: [
          ...state.modelUsage.callDetails,
          {
            id: `initial-scanning-${Date.now()}`,
            node: 'initial_scanning',
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

    logger.info('✅ Initial Scanning Node - Completed', {
      duration: `${duration}ms`,
      overallScore: scanResults.overallScore,
      issuesFound: scanResults.issues?.length || 0,
      criticalIssues: criticalIssues.length,
      readyForLegalAnalysis: scanResults.readyForLegalAnalysis,
      tokensUsed: response.usage?.total_tokens || 0
    });

    return updatedState;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ Initial Scanning Node - Failed', {
      error: (error as Error).message,
      duration: `${duration}ms`
    });

    return {
      ...state,
      errors: [
        ...state.errors,
        {
          id: `error-${Date.now()}`,
          node: 'initial_scanning',
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
 * Comprehensive Legal Analysis & Strategic Review Node (GPT-4)
 * Combines sophisticated legal analysis with partner-level strategic assessment
 * OPTIMIZED: Changed from o3 to GPT-4 to reduce cost and generation time
 */
export async function legalAnalysisNode(state: PipelineState): Promise<PipelineState> {
  logger.info('⚖️🎖️  Comprehensive Legal Analysis & Strategic Review - Starting', {
    client: state.matterContext.client,
    documentType: state.documentType,
    hasDocument: !!state.generatedDocument
  });

  const startTime = Date.now();

  try {
    // Use the refined document if available, otherwise the generated document
    const documentToAnalyze = state.refinedDocument || state.generatedDocument;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a senior partner conducting comprehensive quality review and strategic assessment of a ${state.documentType} for ${state.matterContext.client}. Provide both detailed legal analysis and strategic positioning review.

DOCUMENT TO ANALYZE:
${documentToAnalyze}

CLIENT CONTEXT:
- Client: ${state.matterContext.client}
- Attorney: ${state.matterContext.attorney || 'Not specified'}
- Document Type: ${state.documentType}
- Template: ${state.template.id}

YAML DATA CONTEXT:
${JSON.stringify(state.matterContext.yamlData, null, 2)}

COMPREHENSIVE ANALYSIS FRAMEWORK:

**PART 1: LEGAL QUALITY ANALYSIS**
Quality Criteria (Each scored 0-100):
1. LEGAL ACCURACY (25%): Correct legal terminology, accurate citations, proper legal concepts
2. COMPLETENESS (25%): All template sections filled, comprehensive coverage, no placeholders
3. CONSISTENCY (20%): Consistent terminology, logical flow, uniform formatting
4. PROFESSIONAL TONE (15%): Appropriate formality, clear language, professional style
5. RISK MITIGATION (15%): Identified risks, protective language, compliance considerations

**PART 2: STRATEGIC ASSESSMENT**
Strategic Criteria (Each scored 0-100):
1. STRATEGIC POSITIONING (30%): Alignment with client objectives, competitive advantage
2. CLIENT RELATIONSHIP (25%): Appropriate tone, communication style match, trust building
3. BUSINESS IMPACT (20%): Commercial viability, implementation practicality
4. RISK OPTIMIZATION (15%): Balanced risk allocation, practical enforceability
5. PROFESSIONAL EXCELLENCE (10%): Partner-level quality, firm reputation enhancement

ANALYSIS REQUIREMENTS:
1. Score each criterion (0-100) for both quality and strategic assessments
2. Calculate weighted scores using the percentages above
3. Identify specific issues with severity levels
4. Provide actionable recommendations
5. Determine final approval status (threshold: 90/100)

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "qualityAnalysis": {
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
  },
  "strategicReview": {
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
  },
  "overallAssessment": {
    "combinedScore": number,
    "passedFinalGate": boolean,
    "readyForDelivery": boolean,
    "executiveSummary": "string"
  }
}`
        }
      ]
    });

    // Clean and parse JSON response, handling markdown code blocks
    const responseContent = response.choices[0].message.content!;
    const cleanJson = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleanJson);
    const qualityAnalysis = result.qualityAnalysis;
    const strategicReview = result.strategicReview;
    const overallAssessment = result.overallAssessment;
    const duration = Date.now() - startTime;

    // Calculate final scores
    const finalScore = overallAssessment.combinedScore;
    const passedFinalGate = overallAssessment.passedFinalGate;

    // Log critical issues if any
    const criticalIssues = qualityAnalysis.specificFeedback?.filter((feedback: any) => feedback.severity === 'critical') || [];
    if (criticalIssues.length > 0) {
      logger.warn('Critical issues found during comprehensive analysis', {
        issueCount: criticalIssues.length,
        issues: criticalIssues.map((issue: any) => issue.issue)
      });
    }

    // Update state with comprehensive analysis results
    const updatedState: PipelineState = {
      ...state,
      qualityAnalysis,
      qualityScore: finalScore,
      passedQualityGate: qualityAnalysis.overallScore >= 80,
      passedFinalGate,
      completionStatus: passedFinalGate ? 'final_approved' : 'quality_approved',
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
        gpt4Calls: state.modelUsage.gpt4Calls + 1,
        totalTokensUsed: state.modelUsage.totalTokensUsed + (response.usage?.total_tokens || 0),
        totalCost: state.modelUsage.totalCost + calculateCost('gpt-4', response.usage?.total_tokens || 0),
        callDetails: [
          ...state.modelUsage.callDetails,
          {
            id: `comprehensive-analysis-${Date.now()}`,
            node: 'legal_analysis',
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

    logger.info('✅ Comprehensive Legal Analysis & Strategic Review - Completed', {
      duration: `${duration}ms`,
      qualityScore: qualityAnalysis.overallScore,
      strategicScore: strategicReview.finalScore,
      combinedScore: finalScore,
      passedFinalGate,
      readyForDelivery: overallAssessment.readyForDelivery,
      criticalIssues: criticalIssues.length,
      tokensUsed: response.usage?.total_tokens || 0
    });

    return updatedState;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ Comprehensive Legal Analysis & Strategic Review - Failed', {
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
 * Scoring Feedback Node (GPT-4) - DEPRECATED  
 * Functionality merged into legalAnalysisNode for streamlined pipeline
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

  const startTime = Date.now();

  try {
    // Only proceed if we have quality feedback
    if (!state.qualityAnalysis) {
      logger.info('✅ Targeted Refinement Node - No quality analysis available, skipping');
      return state;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are refining a ${state.documentType} based on quality feedback. Improve the document while preserving all special markers and structure.

CURRENT DOCUMENT:
${state.generatedDocument}

QUALITY FEEDBACK:
${JSON.stringify(state.qualityAnalysis.specificFeedback, null, 2)}

REFINEMENT INSTRUCTIONS:
1. Address all quality issues identified in the feedback
2. Maintain the exact same document structure and formatting
3. Preserve all legal terminology and professional tone
4. Keep all section headers and numbering consistent
5. **CRITICAL: Preserve these special markers exactly as they appear:**
   - [SIGNATURE_BLOCK:*] - placement markers for signature areas
   - [INITIALS_BLOCK:*] - placement markers for initial areas  
   - [NOTARY_BLOCK:*] - placement markers for notary sections
   **These markers must appear literally in your output - do NOT replace or remove them**

REFINEMENT REQUIREMENTS:
- Only make changes to address the specific quality issues
- Do not change the overall structure or formatting
- Keep all markdown formatting consistent
- Ensure all legal content remains accurate
- Maintain professional language throughout
- **DO NOT include section references like "Section 1:", "Section 2:", etc. in the final document**
- **Generate clean document headers without template section references**

Generate the refined document in markdown format:`
        }
      ],
      temperature: 0.1
    });

    const refinedDocument = response.choices[0].message.content!;
    const duration = Date.now() - startTime;

    // Update state with refined document
    const updatedState: PipelineState = {
      ...state,
      generatedDocument: refinedDocument,
      modelUsage: {
        ...state.modelUsage,
        gpt4Calls: state.modelUsage.gpt4Calls + 1,
        totalTokensUsed: state.modelUsage.totalTokensUsed + (response.usage?.total_tokens || 0),
        totalCost: state.modelUsage.totalCost + calculateCost('gpt-4', response.usage?.total_tokens || 0),
        callDetails: [
          ...state.modelUsage.callDetails,
          {
            id: `targeted-refinement-${Date.now()}`,
            node: 'targeted_refinement',
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

    logger.info('✅ Targeted Refinement Node - Completed', {
      duration: `${duration}ms`,
      tokensUsed: response.usage?.total_tokens || 0
    });

    return updatedState;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ Targeted Refinement Node - Failed', {
      error: (error as Error).message,
      duration: `${duration}ms`
    });

    return {
      ...state,
      errors: [
        ...state.errors,
        {
          id: `error-${Date.now()}`,
          node: 'targeted_refinement',
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

// =====================================
// Agent 3: Final Reviewer Nodes
// =====================================

/**
 * Consistency Check Node (GPT-4) - DEPRECATED
 * Functionality merged into legalAnalysisNode for streamlined pipeline 
 */
export async function consistencyCheckNode(state: PipelineState): Promise<PipelineState> {
  logger.info('✅ Consistency Check Node - Starting', {
    client: state.matterContext.client,
    documentType: state.documentType,
    qualityScore: state.qualityScore
  });

  const startTime = Date.now();

  try {
    // Use the most recent version of the document
    const documentToCheck = state.generatedDocument;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are performing detailed consistency analysis on a ${state.documentType} that has passed the quality gate (${state.qualityScore}/100). Focus on cross-reference consistency and professional polish.

DOCUMENT TO ANALYZE:
${documentToCheck}

YAML DATA FOR REFERENCE:
${JSON.stringify(state.matterContext.yamlData, null, 2)}

CONSISTENCY ANALYSIS AREAS:

1. **Party Name Consistency**:
   - All party references use identical names throughout
   - Consistent capitalization and formatting
   - Proper legal entity designations (LLC, Inc., etc.)

2. **Date Consistency**:
   - All dates formatted consistently
   - Effective dates match throughout document
   - Date references are logical and consistent

3. **Legal Terminology Consistency**:
   - Consistent use of defined terms
   - Proper capitalization of legal terms
   - Consistent style for legal language

4. **Cross-Reference Accuracy**:
   - Section references are accurate
   - All defined terms are used consistently
   - Internal document references are correct

5. **Formatting Consistency**:
   - Consistent numbering schemes
   - Uniform header styles
   - Consistent list formatting and punctuation

6. **Data Consistency**:
   - Numbers and amounts formatted consistently
   - Address formats consistent
   - Contact information properly formatted

7. **Special Markers Verification**:
   - All signature blocks properly placed
   - Initial blocks correctly positioned
   - Notary blocks in appropriate locations

ANALYSIS REQUIREMENTS:
- Identify subtle inconsistencies that affect professionalism
- Focus on details that could confuse readers
- Check for internal contradictions
- Verify proper legal document formatting

CONSISTENCY RESULTS FORMAT:
Return a JSON object with this structure:
{
  "consistencyComplete": true,
  "overallConsistencyScore": number (0-100),
  "consistencyIssues": [
    {
      "area": "party_names|dates|terminology|cross_reference|formatting|data|markers",
      "severity": "critical|high|medium|low",
      "issue": "detailed description",
      "locations": ["where found"],
      "recommendation": "how to fix",
      "impact": "potential impact on document quality"
    }
  ],
  "consistencyMetrics": {
    "partyNameConsistency": number (0-100),
    "dateConsistency": number (0-100),
    "terminologyConsistency": number (0-100),
    "crossReferenceAccuracy": number (0-100),
    "formattingConsistency": number (0-100),
    "dataConsistency": number (0-100),
    "specialMarkersIntegrity": number (0-100)
  },
  "readyForStrategicReview": boolean,
  "summary": "brief summary of consistency analysis"
}`
        }
      ],
      temperature: 0.1
    });

    // Clean and parse JSON response, handling markdown code blocks
    const responseContent = response.choices[0].message.content!;
    const cleanJson = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const consistencyResults = JSON.parse(cleanJson);
    const duration = Date.now() - startTime;

    // Log critical consistency issues
    const criticalIssues = consistencyResults.consistencyIssues?.filter((issue: any) => issue.severity === 'critical') || [];
    if (criticalIssues.length > 0) {
      logger.warn('Critical consistency issues found', {
        issueCount: criticalIssues.length,
        issues: criticalIssues.map((issue: any) => issue.issue)
      });
    }

    // Update state with consistency results
    const updatedState: PipelineState = {
      ...state,
      consistencyResults: consistencyResults,
      modelUsage: {
        ...state.modelUsage,
        gpt4Calls: state.modelUsage.gpt4Calls + 1,
        totalTokensUsed: state.modelUsage.totalTokensUsed + (response.usage?.total_tokens || 0),
        totalCost: state.modelUsage.totalCost + calculateCost('gpt-4', response.usage?.total_tokens || 0),
        callDetails: [
          ...state.modelUsage.callDetails,
          {
            id: `consistency-check-${Date.now()}`,
            node: 'consistency_check',
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

    logger.info('✅ Consistency Check Node - Completed', {
      duration: `${duration}ms`,
      overallConsistencyScore: consistencyResults.overallConsistencyScore,
      issuesFound: consistencyResults.consistencyIssues?.length || 0,
      criticalIssues: criticalIssues.length,
      readyForStrategicReview: consistencyResults.readyForStrategicReview,
      tokensUsed: response.usage?.total_tokens || 0
    });

    return updatedState;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ Consistency Check Node - Failed', {
      error: (error as Error).message,
      duration: `${duration}ms`
    });

    return {
      ...state,
      errors: [
        ...state.errors,
        {
          id: `error-${Date.now()}`,
          node: 'consistency_check',
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
 * Strategic Review Node (GPT-4) - DEPRECATED
 * Functionality merged into legalAnalysisNode for streamlined pipeline
 * OPTIMIZED: Changed from o3 to GPT-4 to reduce cost and generation time
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
      model: "gpt-4",
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

    // Clean and parse JSON response, handling markdown code blocks
    const responseContent = response.choices[0].message.content!;
    const cleanJson = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const strategicReview: StrategicReview = JSON.parse(cleanJson);
    const duration = Date.now() - startTime;

    // Update state with strategic review and model usage
    const updatedState: PipelineState = {
      ...state,
      qualityScore: strategicReview.finalScore,
      passedFinalGate: strategicReview.finalScore >= 90,
      modelUsage: {
        ...state.modelUsage,
        gpt4Calls: state.modelUsage.gpt4Calls + 1,
        totalTokensUsed: state.modelUsage.totalTokensUsed + (response.usage?.total_tokens || 0),
        totalCost: state.modelUsage.totalCost + calculateCost('gpt-4', response.usage?.total_tokens || 0),
        callDetails: [
          ...state.modelUsage.callDetails,
          {
            id: `strategic-review-${Date.now()}`,
            node: 'strategic_review',
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
 * Final document preparation and completion
 */
export async function clientReadinessNode(state: PipelineState): Promise<PipelineState> {
  logger.info('🤝 Client Readiness Node - Starting', {
    client: state.matterContext.client,
    documentType: state.documentType,
    qualityScore: state.qualityScore,
    passedFinalGate: state.passedFinalGate
  });

  // Use the most recent document version as the final document
  const finalDocument = state.refinedDocument || state.generatedDocument;

  // Set final document and completion status
  const updatedState: PipelineState = {
    ...state,
    finalDocument,
    endTime: new Date()
  };

  logger.info('✅ Client Readiness Node - Completed', {
    finalScore: state.qualityScore,
    status: state.completionStatus,
    passedFinalGate: state.passedFinalGate,
    documentReady: true
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

  const startTime = Date.now();

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are performing final refinement on a ${state.documentType} to achieve partner-level quality. Apply final polish while preserving all special markers and structure.

CURRENT DOCUMENT:
${state.generatedDocument}

FINAL REFINEMENT INSTRUCTIONS:
1. Apply final polish for partner-level quality
2. Ensure perfect consistency in terminology and formatting
3. Verify all legal language is precise and professional
4. Maintain the exact same document structure
5. **CRITICAL: Preserve these special markers exactly as they appear:**
   - [SIGNATURE_BLOCK:*] - placement markers for signature areas
   - [INITIALS_BLOCK:*] - placement markers for initial areas  
   - [NOTARY_BLOCK:*] - placement markers for notary sections
   **These markers must appear literally in your output - do NOT replace or remove them**

FINAL QUALITY REQUIREMENTS:
- Partner-level professional language
- Perfect consistency in terminology
- Precise legal accuracy
- Flawless formatting and structure
- Client-ready presentation quality
- Maintain all markdown formatting
- Preserve all section headers and numbering exactly
- **DO NOT include section references like "Section 1:", "Section 2:", etc. in the final document**
- **Generate clean document headers without template section references**

Generate the final refined document in markdown format:`
        }
      ],
      temperature: 0.05
    });

    const finalRefinedDocument = response.choices[0].message.content!;
    const duration = Date.now() - startTime;

    // Update state with final refined document
    const updatedState: PipelineState = {
      ...state,
      generatedDocument: finalRefinedDocument,
      modelUsage: {
        ...state.modelUsage,
        gpt4Calls: state.modelUsage.gpt4Calls + 1,
        totalTokensUsed: state.modelUsage.totalTokensUsed + (response.usage?.total_tokens || 0),
        totalCost: state.modelUsage.totalCost + calculateCost('gpt-4', response.usage?.total_tokens || 0),
        callDetails: [
          ...state.modelUsage.callDetails,
          {
            id: `final-refinement-${Date.now()}`,
            node: 'final_refinement',
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

    logger.info('✅ Final Refinement Node - Completed', {
      duration: `${duration}ms`,
      tokensUsed: response.usage?.total_tokens || 0
    });

    return updatedState;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ Final Refinement Node - Failed', {
      error: (error as Error).message,
      duration: `${duration}ms`
    });

    return {
      ...state,
      errors: [
        ...state.errors,
        {
          id: `error-${Date.now()}`,
          node: 'final_refinement',
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

/**
 * Validate that signature blocks are preserved in the generated document
 */
function validateSignatureBlocks(document: string, template: Template): boolean {
  if (!template.signatureBlocks) {
    return true; // No signature blocks to validate
  }

  let allBlocksPresent = true;
  const missingBlocks: string[] = [];

  for (const block of template.signatureBlocks) {
    // Handle different signature block structures
    const marker = (block as any).placement?.marker;
    if (marker && !document.includes(marker)) {
      allBlocksPresent = false;
      missingBlocks.push(marker);
    }
  }

  if (!allBlocksPresent) {
    logger.warn('Missing signature blocks detected', {
      missingBlocks,
      documentLength: document.length
    });
  }

  return allBlocksPresent;
}

/**
 * Format template structure for the prompt - matches the normal pipeline's approach
 */
function formatTemplateStructure(template: Template): string {
  if (!template || !template.sections) {
    return 'No template structure available.';
  }

  const sections = template.sections
    .sort((a, b) => a.order - b.order)
    .map(section => {
      return `${section.title}
Required: ${section.required}
Content Template:
${section.content}
${section.helpText ? `Guidance: ${section.helpText}` : ''}`;
    })
    .join('\n\n');

  return `Document Type: ${template.name}
Description: ${template.description}
Category: ${template.metadata?.category || 'N/A'}

SECTIONS:
${sections}

REQUIRED FIELDS:
${template.requiredFields?.map(f => `- ${f.name} (${f.type}): ${f.description}`).join('\n') || 'No required fields specified'}`;
}

// =====================================
// End of Node Implementations
// ===================================== 