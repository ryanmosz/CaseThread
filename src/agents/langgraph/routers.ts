/**
 * CaseThread LangGraph Quality Gate Routers
 * 
 * This file implements the conditional routing logic for quality gates in the pipeline.
 * Routers determine whether documents pass quality thresholds and what the next action should be.
 */

import { 
  PipelineState, 
  QualityGateDecision, 
  FinalGateDecision,
  QualityGateResult,
  FinalGateResult,
  QUALITY_GATE_THRESHOLD,
  FINAL_GATE_THRESHOLD,
  MAX_ITERATIONS
} from '../../types/langgraph';
import { logger } from '../../utils/logger';

// =====================================
// Quality Gate Router (80% threshold)
// =====================================

/**
 * Quality Gate Router
 * 
 * Determines whether a document passes the 80% quality threshold.
 * If it fails, routes to refinement. If it passes, routes to final review.
 * If max iterations reached, exits the pipeline.
 */
export function qualityGateRouter(state: PipelineState): QualityGateDecision {
  logger.info('🚪 Quality Gate Router - Evaluating', {
    client: state.matterContext.client,
    documentType: state.documentType,
    qualityScore: state.qualityScore,
    threshold: QUALITY_GATE_THRESHOLD,
    iteration: state.currentIteration,
    maxIterations: state.maxIterations
  });

  // Check if max iterations reached
  if (state.currentIteration >= state.maxIterations) {
    logger.warn('⚠️  Quality Gate Router - Max iterations reached', {
      iteration: state.currentIteration,
      maxIterations: state.maxIterations,
      finalScore: state.qualityScore
    });
    return 'max_iterations';
  }

  // Check if quality score meets threshold
  const passedGate = state.qualityScore >= QUALITY_GATE_THRESHOLD;
  const decision: QualityGateDecision = passedGate ? 'pass' : 'fail';

  // Log the decision with context
  if (passedGate) {
    logger.info('✅ Quality Gate Router - PASSED', {
      qualityScore: state.qualityScore,
      threshold: QUALITY_GATE_THRESHOLD,
      margin: state.qualityScore - QUALITY_GATE_THRESHOLD,
      nextAction: 'proceeding to final review'
    });
  } else {
    logger.info('❌ Quality Gate Router - FAILED', {
      qualityScore: state.qualityScore,
      threshold: QUALITY_GATE_THRESHOLD,
      shortfall: QUALITY_GATE_THRESHOLD - state.qualityScore,
      iteration: state.currentIteration,
      nextAction: 'routing to refinement'
    });
  }

  return decision;
}

/**
 * Creates a detailed quality gate result with metrics
 */
export function createQualityGateResult(state: PipelineState): QualityGateResult {
  const decision = qualityGateRouter(state);
  
  const result: QualityGateResult = {
    decision,
    score: state.qualityScore,
    threshold: QUALITY_GATE_THRESHOLD,
    iteration: state.currentIteration,
    feedback: state.qualityAnalysis?.specificFeedback || [],
    nextAction: getQualityGateNextAction(decision, state)
  };

  logger.debug('📊 Quality Gate Result Created', {
    decision: result.decision,
    score: result.score,
    threshold: result.threshold,
    nextAction: result.nextAction
  });

  return result;
}

/**
 * Determines the next action based on quality gate decision
 */
function getQualityGateNextAction(decision: QualityGateDecision, state: PipelineState): string {
  switch (decision) {
    case 'pass':
      return 'Proceed to consistency check and final review';
    case 'fail':
      return `Refine document (iteration ${state.currentIteration + 1}/${state.maxIterations})`;
    case 'max_iterations':
      return 'Exit pipeline - maximum iterations reached';
    default:
      return 'Unknown action';
  }
}

// =====================================
// Final Gate Router (90% threshold)
// =====================================

/**
 * Final Gate Router
 * 
 * Determines whether a document passes the 90% final quality threshold.
 * If it fails, routes to final refinement. If it passes, approves for delivery.
 * If max iterations reached, exits the pipeline.
 */
export function finalGateRouter(state: PipelineState): FinalGateDecision {
  logger.info('🏆 Final Gate Router - Evaluating', {
    client: state.matterContext.client,
    documentType: state.documentType,
    qualityScore: state.qualityScore,
    threshold: FINAL_GATE_THRESHOLD,
    iteration: state.currentIteration,
    maxIterations: state.maxIterations
  });

  // Check if max iterations reached
  if (state.currentIteration >= state.maxIterations) {
    logger.warn('⚠️  Final Gate Router - Max iterations reached', {
      iteration: state.currentIteration,
      maxIterations: state.maxIterations,
      finalScore: state.qualityScore
    });
    return 'max_iterations';
  }

  // Check if quality score meets final threshold
  const passedGate = state.qualityScore >= FINAL_GATE_THRESHOLD;
  const decision: FinalGateDecision = passedGate ? 'approve' : 'refine';

  // Log the decision with context
  if (passedGate) {
    logger.info('✅ Final Gate Router - APPROVED', {
      qualityScore: state.qualityScore,
      threshold: FINAL_GATE_THRESHOLD,
      margin: state.qualityScore - FINAL_GATE_THRESHOLD,
      nextAction: 'approved for client delivery'
    });
  } else {
    logger.info('🔄 Final Gate Router - NEEDS REFINEMENT', {
      qualityScore: state.qualityScore,
      threshold: FINAL_GATE_THRESHOLD,
      shortfall: FINAL_GATE_THRESHOLD - state.qualityScore,
      iteration: state.currentIteration,
      nextAction: 'routing to final refinement'
    });
  }

  return decision;
}

/**
 * Creates a detailed final gate result with strategic assessment
 */
export function createFinalGateResult(state: PipelineState): FinalGateResult {
  const decision = finalGateRouter(state);
  
  const result: FinalGateResult = {
    decision,
    score: state.qualityScore,
    threshold: FINAL_GATE_THRESHOLD,
    iteration: state.currentIteration,
    strategicAssessment: {
      finalScore: state.qualityScore,
      strategicScores: {
        strategicPositioning: 0,
        clientRelationship: 0,
        businessImpact: 0,
        riskOptimization: 0,
        professionalExcellence: 0
      },
      strategicEnhancements: [],
      deliveryNotes: [],
      nextSteps: [],
      clientCommunicationStrategy: '',
      approvedForDelivery: decision === 'approve'
    },
    nextAction: getFinalGateNextAction(decision, state)
  };

  logger.debug('📊 Final Gate Result Created', {
    decision: result.decision,
    score: result.score,
    threshold: result.threshold,
    nextAction: result.nextAction
  });

  return result;
}

/**
 * Determines the next action based on final gate decision
 */
function getFinalGateNextAction(decision: FinalGateDecision, state: PipelineState): string {
  switch (decision) {
    case 'approve':
      return 'Document approved for client delivery';
    case 'refine':
      return `Final refinement needed (iteration ${state.currentIteration + 1}/${state.maxIterations})`;
    case 'max_iterations':
      return 'Exit pipeline - maximum iterations reached';
    default:
      return 'Unknown action';
  }
}

// =====================================
// Router Utilities
// =====================================

/**
 * Validates if a state is ready for quality gate evaluation
 */
export function validateStateForQualityGate(state: PipelineState): boolean {
  const validations = [
    { check: () => !!state.generatedDocument, message: 'Generated document is required' },
    { check: () => state.qualityScore >= 0, message: 'Quality score must be set' },
    { check: () => !!state.qualityAnalysis, message: 'Quality analysis is required' },
    { check: () => state.currentIteration >= 0, message: 'Current iteration must be set' },
    { check: () => state.maxIterations > 0, message: 'Max iterations must be positive' }
  ];

  for (const validation of validations) {
    if (!validation.check()) {
      logger.error('❌ Quality Gate Validation Failed', { 
        message: validation.message,
        state: {
          hasDocument: !!state.generatedDocument,
          qualityScore: state.qualityScore,
          hasAnalysis: !!state.qualityAnalysis,
          iteration: state.currentIteration,
          maxIterations: state.maxIterations
        }
      });
      return false;
    }
  }

  return true;
}

/**
 * Validates if a state is ready for final gate evaluation
 */
export function validateStateForFinalGate(state: PipelineState): boolean {
  const validations = [
    { check: () => !!state.generatedDocument, message: 'Generated document is required' },
    { check: () => state.qualityScore >= QUALITY_GATE_THRESHOLD, message: 'Must pass quality gate first' },
    { check: () => state.passedQualityGate, message: 'Quality gate must be passed' },
    { check: () => state.currentIteration >= 0, message: 'Current iteration must be set' },
    { check: () => state.maxIterations > 0, message: 'Max iterations must be positive' }
  ];

  for (const validation of validations) {
    if (!validation.check()) {
      logger.error('❌ Final Gate Validation Failed', { 
        message: validation.message,
        state: {
          hasDocument: !!state.generatedDocument,
          qualityScore: state.qualityScore,
          passedQualityGate: state.passedQualityGate,
          iteration: state.currentIteration,
          maxIterations: state.maxIterations
        }
      });
      return false;
    }
  }

  return true;
}

/**
 * Gets comprehensive gate statistics for monitoring
 */
export function getGateStatistics(state: PipelineState): any {
  return {
    qualityGate: {
      threshold: QUALITY_GATE_THRESHOLD,
      currentScore: state.qualityScore,
      passed: state.passedQualityGate,
      margin: state.qualityScore - QUALITY_GATE_THRESHOLD,
      attempts: state.qualityHistory.length
    },
    finalGate: {
      threshold: FINAL_GATE_THRESHOLD,
      currentScore: state.qualityScore,
      passed: state.passedFinalGate,
      margin: state.qualityScore - FINAL_GATE_THRESHOLD,
      readyForEvaluation: state.passedQualityGate
    },
    iterations: {
      current: state.currentIteration,
      maximum: state.maxIterations,
      remaining: state.maxIterations - state.currentIteration,
      utilizationRate: (state.currentIteration / state.maxIterations) * 100
    },
    qualityProgression: state.qualityHistory.map(q => ({
      iteration: q.iteration,
      score: q.overallScore,
      passed: q.passedGate,
      timestamp: q.timestamp
    }))
  };
}

// =====================================
// Router Configuration
// =====================================

/**
 * Router configuration for easy reference
 */
export const routerConfig = {
  qualityGate: {
    threshold: QUALITY_GATE_THRESHOLD,
    router: qualityGateRouter,
    validator: validateStateForQualityGate,
    resultCreator: createQualityGateResult
  },
  finalGate: {
    threshold: FINAL_GATE_THRESHOLD,
    router: finalGateRouter,
    validator: validateStateForFinalGate,
    resultCreator: createFinalGateResult
  },
  maxIterations: MAX_ITERATIONS
};

// =====================================
// End of Router Implementations
// ===================================== 