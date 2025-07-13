# Task 6.0.5.3: Handle Progress for Quality Pipeline Integration

## Overview
This task focuses on integrating progress tracking for the quality (multi-agent) pipeline, ensuring seamless progress updates when using the advanced AI-powered document generation workflow.

## Current State Analysis

### Quality Pipeline Components
1. **QualityPipelineWorkflow**: LangGraph workflow orchestrating agents
2. **ContextBuilderAgent**: Retrieves relevant legal context
3. **DraftingAgent**: Creates initial document draft
4. **OverseerAgent**: Reviews and refines the document
5. **Orchestrator**: Manages agent coordination

### Current Progress Gaps
- No progress reporting from LangGraph nodes
- Agent processing appears as a black box
- No visibility into RAG retrieval progress
- Missing coordination between quality and PDF progress

## Implementation Plan

### 1. Create LangGraph Progress Adapter (Priority: High)

**File**: Create `src/agents/langgraph/ProgressAdapter.ts`

```typescript
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StateGraph } from '@langchain/langgraph';
import { QualityPipelineState } from '../../types/langgraph';
import { ProgressReporter } from '../../types/progress';

export interface LangGraphProgressEvent {
  nodeId: string;
  status: 'entering' | 'processing' | 'completed' | 'error';
  message?: string;
  metadata?: Record<string, any>;
}

export class LangGraphProgressAdapter {
  private progressReporter: ProgressReporter;
  private startTime: number = Date.now();
  private nodeProgress: Map<string, number> = new Map([
    ['initialize', 5],
    ['context_builder', 25],
    ['drafting_agent', 50],
    ['overseer_agent', 75],
    ['format_output', 90],
    ['complete', 100],
  ]);
  
  constructor(progressReporter: ProgressReporter) {
    this.progressReporter = progressReporter;
  }
  
  /**
   * Wrap a node function to add progress reporting
   */
  wrapNode<T extends (...args: any[]) => any>(
    nodeId: string,
    nodeFn: T,
    progressMessage?: string
  ): T {
    return (async (...args: any[]) => {
      try {
        // Report node entry
        this.reportNodeProgress(nodeId, 'entering', progressMessage);
        
        // Execute the actual node function
        const result = await nodeFn(...args);
        
        // Report completion
        this.reportNodeProgress(nodeId, 'completed');
        
        return result;
      } catch (error) {
        // Report error
        this.reportNodeProgress(nodeId, 'error', error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    }) as T;
  }
  
  /**
   * Create progress-aware node definitions
   */
  createProgressAwareNodes(workflow: QualityPipelineWorkflow): Record<string, any> {
    return {
      initialize: this.wrapNode('initialize', workflow.initialize.bind(workflow), 'Initializing quality pipeline'),
      buildContext: this.wrapNode('context_builder', workflow.buildContext.bind(workflow), 'Building legal context'),
      draft: this.wrapNode('drafting_agent', workflow.draft.bind(workflow), 'Drafting document'),
      review: this.wrapNode('overseer_agent', workflow.review.bind(workflow), 'Reviewing document'),
      formatOutput: this.wrapNode('format_output', workflow.formatOutput.bind(workflow), 'Formatting final output'),
    };
  }
  
  private reportNodeProgress(
    nodeId: string,
    status: LangGraphProgressEvent['status'],
    message?: string
  ): void {
    const progress = this.nodeProgress.get(nodeId) || 0;
    const elapsed = Date.now() - this.startTime;
    
    // Calculate sub-progress within the node
    let adjustedProgress = progress;
    if (status === 'processing') {
      // Add 50% of the node's progress range for processing
      const nextProgress = this.getNextNodeProgress(nodeId);
      adjustedProgress = progress + ((nextProgress - progress) * 0.5);
    } else if (status === 'completed') {
      // Use full progress for completed
      adjustedProgress = this.getNextNodeProgress(nodeId) - 1;
    }
    
    this.progressReporter.report({
      stage: 'quality-pipeline',
      message: message || `${this.getNodeDisplayName(nodeId)}: ${status}`,
      percentage: adjustedProgress,
      detail: nodeId,
      metadata: {
        nodeId,
        status,
        elapsed,
      },
    });
  }
  
  private getNextNodeProgress(currentNode: string): number {
    const nodes = Array.from(this.nodeProgress.keys());
    const currentIndex = nodes.indexOf(currentNode);
    
    if (currentIndex < nodes.length - 1) {
      return this.nodeProgress.get(nodes[currentIndex + 1]) || 100;
    }
    
    return 100;
  }
  
  private getNodeDisplayName(nodeId: string): string {
    const displayNames: Record<string, string> = {
      'initialize': 'Initialization',
      'context_builder': 'Context Retrieval',
      'drafting_agent': 'Document Drafting',
      'overseer_agent': 'Quality Review',
      'format_output': 'Final Formatting',
      'complete': 'Complete',
    };
    
    return displayNames[nodeId] || nodeId;
  }
}
```

### 2. Enhance Agent Progress Reporting (Priority: High)

**File**: Update `src/agents/ContextBuilderAgent.ts`

```typescript
export class ContextBuilderAgent extends BaseAgent {
  // ... existing code ...
  
  async buildContext(
    state: QualityPipelineState,
    progressCallback?: (detail: string, subProgress: number) => void
  ): Promise<Partial<QualityPipelineState>> {
    const { formData, documentType } = state;
    
    try {
      // Report retrieval start
      progressCallback?.('Analyzing document requirements', 10);
      
      // Step 1: Analyze requirements
      const requirements = await this.analyzeRequirements(formData, documentType);
      progressCallback?.('Searching legal database', 30);
      
      // Step 2: Retrieve relevant documents
      const searchQueries = this.generateSearchQueries(requirements);
      const retrievedDocs: any[] = [];
      
      for (let i = 0; i < searchQueries.length; i++) {
        const query = searchQueries[i];
        progressCallback?.(
          `Retrieving context: ${query.type}`,
          30 + (40 * (i / searchQueries.length))
        );
        
        const docs = await this.retriever.retrieve(query.query, {
          documentType: documentType,
          k: 5,
        });
        
        retrievedDocs.push(...docs);
      }
      
      progressCallback?.('Organizing legal context', 80);
      
      // Step 3: Organize and filter context
      const organizedContext = await this.organizeContext(retrievedDocs, requirements);
      
      progressCallback?.('Context retrieval complete', 100);
      
      return {
        context: organizedContext,
        messages: [
          ...state.messages,
          new HumanMessage(`Retrieved ${retrievedDocs.length} relevant documents`),
        ],
      };
    } catch (error) {
      this.logger.error('Failed to build context', { error });
      throw error;
    }
  }
  
  private generateSearchQueries(requirements: any): Array<{ type: string; query: string }> {
    // Generate specific search queries based on document requirements
    return [
      { type: 'precedents', query: requirements.primaryQuery },
      { type: 'regulations', query: requirements.regulatoryQuery },
      { type: 'examples', query: requirements.exampleQuery },
    ];
  }
}
```

### 3. Create Progress Aggregator for GUI (Priority: High)

**File**: Create `src/electron/main/services/QualityPipelineProgressAggregator.ts`

```typescript
import { ProgressEvent } from '../../../types/progress';
import { PDFProgressUpdate } from '../../../types/pdf-ipc';

export class QualityPipelineProgressAggregator {
  private qualityProgress: number = 0;
  private pdfProgress: number = 0;
  private isQualityComplete: boolean = false;
  
  /**
   * Update quality pipeline progress
   */
  updateQualityProgress(progress: number, detail: string): void {
    this.qualityProgress = progress;
    
    if (progress >= 100) {
      this.isQualityComplete = true;
    }
  }
  
  /**
   * Update PDF generation progress
   */
  updatePDFProgress(progress: number): void {
    this.pdfProgress = progress;
  }
  
  /**
   * Get aggregated progress for display
   */
  getAggregatedProgress(): PDFProgressUpdate {
    let totalProgress: number;
    let currentStep: string;
    let detail: string;
    
    if (!this.isQualityComplete) {
      // Quality pipeline is 70% of total progress
      totalProgress = Math.round(this.qualityProgress * 0.7);
      currentStep = this.getQualityStepName(this.qualityProgress);
      detail = 'AI-powered document generation in progress';
    } else {
      // PDF generation is the final 30%
      totalProgress = 70 + Math.round(this.pdfProgress * 0.3);
      currentStep = 'Generating PDF';
      detail = 'Converting document to PDF format';
    }
    
    return {
      requestId: '', // Will be set by caller
      step: currentStep,
      detail,
      percentage: totalProgress,
      timestamp: new Date(),
      estimatedTimeRemaining: this.estimateTimeRemaining(totalProgress),
    };
  }
  
  private getQualityStepName(progress: number): string {
    if (progress < 10) return 'Initializing AI pipeline';
    if (progress < 30) return 'Retrieving legal context';
    if (progress < 60) return 'AI drafting document';
    if (progress < 85) return 'AI reviewing document';
    if (progress < 100) return 'Finalizing document';
    return 'Quality generation complete';
  }
  
  private estimateTimeRemaining(currentProgress: number): number | undefined {
    // Simple estimation based on typical generation times
    const avgTotalTime = 45; // seconds
    const elapsed = (currentProgress / 100) * avgTotalTime;
    const remaining = avgTotalTime - elapsed;
    
    return remaining > 0 ? Math.round(remaining) : undefined;
  }
  
  reset(): void {
    this.qualityProgress = 0;
    this.pdfProgress = 0;
    this.isQualityComplete = false;
  }
}
```

### 4. Integrate with IPC Handlers (Priority: High)

**File**: Update `src/electron/main/ipc-handlers.ts`

```typescript
import { QualityPipelineProgressAggregator } from './services/QualityPipelineProgressAggregator';
import { ProgressManager } from './ipc/progress-manager';

// Add to existing handlers
ipcMain.handle('generate-document', async (event, templateId, formData, options) => {
  const requestId = uuidv4();
  const aggregator = new QualityPipelineProgressAggregator();
  const progressManager = ProgressManager.getInstance();
  
  try {
    if (options?.useMultiagent) {
      // Create progress reporter for quality pipeline
      const qualityProgressReporter = {
        report: (event: ProgressEvent) => {
          aggregator.updateQualityProgress(event.percentage || 0, event.message);
          
          // Send aggregated progress
          const update = aggregator.getAggregatedProgress();
          update.requestId = requestId;
          
          progressManager.sendProgress(update);
          
          // Also send to the specific window
          if (!event.sender.isDestroyed()) {
            event.sender.send('generation:progress', update);
          }
        },
      };
      
      // Run quality pipeline with progress
      const result = await runQualityPipeline(
        templateId,
        formData,
        qualityProgressReporter
      );
      
      // Now generate PDF with progress
      const pdfProgressReporter = {
        report: (event: ProgressEvent) => {
          aggregator.updatePDFProgress(event.percentage || 0);
          
          const update = aggregator.getAggregatedProgress();
          update.requestId = requestId;
          
          progressManager.sendProgress(update);
        },
      };
      
      const pdfBuffer = await generatePDFFromContent(
        result.content,
        templateId,
        pdfProgressReporter
      );
      
      return { success: true, content: result.content, pdfBuffer };
    } else {
      // Standard generation (existing code)
      // ...
    }
  } catch (error) {
    // Error handling
  }
});
```

### 5. Add Progress History Tracking (Priority: Low)

**File**: Create `src/electron/main/services/ProgressHistoryTracker.ts`

```typescript
interface ProgressHistoryEntry {
  timestamp: Date;
  stage: string;
  progress: number;
  detail: string;
  duration: number;
}

export class ProgressHistoryTracker {
  private history: Map<string, ProgressHistoryEntry[]> = new Map();
  private readonly MAX_HISTORY_SIZE = 100;
  
  recordProgress(
    requestId: string,
    stage: string,
    progress: number,
    detail: string
  ): void {
    const entries = this.history.get(requestId) || [];
    const lastEntry = entries[entries.length - 1];
    
    const duration = lastEntry 
      ? Date.now() - lastEntry.timestamp.getTime()
      : 0;
    
    entries.push({
      timestamp: new Date(),
      stage,
      progress,
      detail,
      duration,
    });
    
    // Maintain size limit
    if (entries.length > this.MAX_HISTORY_SIZE) {
      entries.shift();
    }
    
    this.history.set(requestId, entries);
  }
  
  getHistory(requestId: string): ProgressHistoryEntry[] {
    return this.history.get(requestId) || [];
  }
  
  analyzeBottlenecks(requestId: string): Array<{
    stage: string;
    duration: number;
    percentage: number;
  }> {
    const entries = this.getHistory(requestId);
    if (entries.length === 0) return [];
    
    // Group by stage and sum durations
    const stageDurations = new Map<string, number>();
    
    entries.forEach(entry => {
      const current = stageDurations.get(entry.stage) || 0;
      stageDurations.set(entry.stage, current + entry.duration);
    });
    
    const totalDuration = Array.from(stageDurations.values())
      .reduce((sum, dur) => sum + dur, 0);
    
    // Convert to bottleneck analysis
    return Array.from(stageDurations.entries())
      .map(([stage, duration]) => ({
        stage,
        duration,
        percentage: (duration / totalDuration) * 100,
      }))
      .sort((a, b) => b.duration - a.duration);
  }
  
  cleanup(requestId: string): void {
    this.history.delete(requestId);
  }
}
```

## Testing Requirements

### Unit Tests

```typescript
describe('LangGraphProgressAdapter', () => {
  it('should wrap nodes with progress reporting', async () => {
    const mockReporter = { report: jest.fn() };
    const adapter = new LangGraphProgressAdapter(mockReporter);
    
    const mockNode = jest.fn().mockResolvedValue({ result: 'test' });
    const wrappedNode = adapter.wrapNode('test_node', mockNode, 'Test message');
    
    await wrappedNode({ state: {} });
    
    expect(mockReporter.report).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Test message'),
        metadata: expect.objectContaining({ nodeId: 'test_node' }),
      })
    );
  });
});

describe('QualityPipelineProgressAggregator', () => {
  it('should aggregate quality and PDF progress correctly', () => {
    const aggregator = new QualityPipelineProgressAggregator();
    
    // Quality progress
    aggregator.updateQualityProgress(50, 'Drafting');
    let progress = aggregator.getAggregatedProgress();
    expect(progress.percentage).toBe(35); // 50% * 0.7
    
    // Complete quality, start PDF
    aggregator.updateQualityProgress(100, 'Complete');
    aggregator.updatePDFProgress(50);
    progress = aggregator.getAggregatedProgress();
    expect(progress.percentage).toBe(85); // 70 + (50% * 0.3)
  });
});
```

### Integration Tests

```typescript
describe('Quality Pipeline Progress Integration', () => {
  it('should report progress through entire quality pipeline', async () => {
    const progressUpdates: number[] = [];
    
    // Mock progress callback
    const progressCallback = (update: PDFProgressUpdate) => {
      progressUpdates.push(update.percentage);
    };
    
    // Run quality pipeline with document
    await runQualityPipelineWithProgress(
      'patent-assignment-agreement',
      mockFormData,
      progressCallback
    );
    
    // Verify progress sequence
    expect(progressUpdates.length).toBeGreaterThan(5);
    expect(progressUpdates[0]).toBeLessThan(10);
    expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    
    // Verify monotonic increase
    for (let i = 1; i < progressUpdates.length; i++) {
      expect(progressUpdates[i]).toBeGreaterThanOrEqual(progressUpdates[i - 1]);
    }
  });
});
```

## Implementation Checklist

- [ ] Create LangGraph progress adapter
- [ ] Update agents with progress callbacks
- [ ] Create quality pipeline progress aggregator
- [ ] Integrate with IPC handlers
- [ ] Add progress history tracking
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation

## Dependencies

- Task 6.0.5.1 (Connect to BackgroundGenerationStatus) must be complete
- Task 6.0.5.2 (Map PDF stages to progress) must be complete
- Quality pipeline (Task 3.0) must be integrated

## Estimated Time

- Implementation: 4-5 hours
- Testing: 2-3 hours
- Total: 6-8 hours

## Notes

- Consider adding progress caching for interrupted generations
- Add telemetry for agent performance monitoring
- Consider WebSocket for real-time progress updates
- Add visual indicators for which agent is currently active 