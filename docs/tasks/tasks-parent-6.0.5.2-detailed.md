# Task 6.0.5.2: Map PDF Generation Stages to Progress Updates

## Overview
This task involves creating a comprehensive mapping between PDF generation stages and progress updates, ensuring accurate progress representation throughout the generation lifecycle.

## Current State Analysis

### Existing Progress Points
From `PDFGenerationHandler.calculatePercentage()`:
```typescript
const progressMap: Record<string, number> = {
  'Initializing PDF components': 5,
  'Applying custom formatting': 10,
  'Loading document formatting rules': 15,
  'Parsing signature blocks': 25,
  'Found signature blocks': 30,
  'Preparing document layout': 40,
  'Calculating page breaks': 50,
  'Layout complete': 60,
  'Starting PDF generation': 70,
  'Measuring content for accurate pagination': 75,
  'Rendering page': 80,
  'Finalizing PDF document': 95,
  'PDF export completed': 100,
};
```

### Issues with Current Mapping
1. Static percentages don't reflect actual time spent
2. No support for document-specific variations
3. Missing granular sub-stages
4. No progress for quality pipeline stages

## Implementation Plan

### 1. Create Dynamic Progress Calculator (Priority: High)

**File**: Create `src/electron/main/services/PDFProgressCalculator.ts`

```typescript
import { DocumentType } from '../../../types';

export interface ProgressStage {
  name: string;
  weight: number; // Relative weight for time calculation
  subStages?: ProgressStage[];
}

export class PDFProgressCalculator {
  private static stages: Record<string, ProgressStage[]> = {
    // Base stages for all documents
    base: [
      { name: 'Initializing PDF components', weight: 5 },
      { name: 'Loading document formatting rules', weight: 10 },
      { name: 'Applying custom formatting', weight: 5 },
    ],
    
    // Document-specific stages
    'patent-assignment-agreement': [
      { name: 'Parsing signature blocks', weight: 20 },
      { name: 'Processing assignor/assignee sections', weight: 15 },
      { name: 'Formatting legal clauses', weight: 25 },
    ],
    
    'provisional-patent-application': [
      { name: 'Processing technical drawings references', weight: 15 },
      { name: 'Formatting claims section', weight: 30 },
      { name: 'Organizing specification', weight: 20 },
    ],
    
    // Layout and rendering (common)
    layout: [
      { name: 'Preparing document layout', weight: 15 },
      { name: 'Calculating page breaks', weight: 10 },
      { name: 'Measuring content dimensions', weight: 10 },
    ],
    
    rendering: [
      { 
        name: 'Rendering pages', 
        weight: 40,
        subStages: [] // Dynamically filled based on page count
      },
      { name: 'Finalizing PDF document', weight: 10 },
      { name: 'PDF export completed', weight: 5 },
    ],
  };
  
  private documentType: DocumentType;
  private totalWeight: number = 0;
  private stageWeights: Map<string, { start: number; end: number }> = new Map();
  
  constructor(documentType: DocumentType, pageCount?: number) {
    this.documentType = documentType;
    this.calculateWeights(pageCount);
  }
  
  private calculateWeights(pageCount: number = 1): void {
    // Combine stages based on document type
    const stages = [
      ...PDFProgressCalculator.stages.base,
      ...(PDFProgressCalculator.stages[this.documentType] || []),
      ...PDFProgressCalculator.stages.layout,
      ...PDFProgressCalculator.stages.rendering,
    ];
    
    // Add page-specific substages
    const renderingStage = stages.find(s => s.name === 'Rendering pages');
    if (renderingStage && pageCount > 1) {
      renderingStage.subStages = Array.from({ length: pageCount }, (_, i) => ({
        name: `Rendering page ${i + 1} of ${pageCount}`,
        weight: renderingStage.weight / pageCount,
      }));
    }
    
    // Calculate total weight
    this.totalWeight = stages.reduce((sum, stage) => sum + stage.weight, 0);
    
    // Calculate percentage ranges for each stage
    let currentPercentage = 0;
    stages.forEach(stage => {
      const stagePercentage = (stage.weight / this.totalWeight) * 100;
      this.stageWeights.set(stage.name, {
        start: currentPercentage,
        end: currentPercentage + stagePercentage,
      });
      
      // Handle substages
      if (stage.subStages) {
        stage.subStages.forEach(subStage => {
          const subPercentage = (subStage.weight / this.totalWeight) * 100;
          this.stageWeights.set(subStage.name, {
            start: currentPercentage,
            end: currentPercentage + subPercentage,
          });
          currentPercentage += subPercentage;
        });
      } else {
        currentPercentage += stagePercentage;
      }
    });
  }
  
  getProgressForStage(stageName: string): number {
    const range = this.stageWeights.get(stageName);
    if (!range) {
      console.warn(`Unknown stage: ${stageName}`);
      return 0;
    }
    
    // Return the midpoint of the stage range
    return Math.round((range.start + range.end) / 2);
  }
  
  getDetailedProgress(stageName: string, subProgress?: number): number {
    const range = this.stageWeights.get(stageName);
    if (!range) return 0;
    
    if (subProgress !== undefined) {
      // Calculate progress within the stage
      const stageProgress = range.start + (range.end - range.start) * (subProgress / 100);
      return Math.round(stageProgress);
    }
    
    return this.getProgressForStage(stageName);
  }
}
```

### 2. Update Progress Manager Integration (Priority: High)

**File**: Update `src/electron/main/ipc/pdf-generation-handler.ts`

```typescript
private progressCalculator: PDFProgressCalculator | null = null;

private async handleGeneratePDF(
  event: IpcMainInvokeEvent,
  request: PDFGenerateRequest
): Promise<PDFGenerateResponse> {
  // ... existing code ...
  
  // Initialize progress calculator for this document type
  this.progressCalculator = new PDFProgressCalculator(request.documentType);
  
  // Create enhanced progress callback
  const progressCallback = (progressEvent: ProgressEvent) => {
    const enhancedProgress = this.enhanceProgressEvent(progressEvent);
    this.sendProgress(event, request.requestId, enhancedProgress.step, enhancedProgress.detail, startTime);
  };
  
  // ... rest of the method ...
}

private enhanceProgressEvent(event: ProgressEvent): { step: string; detail: string; percentage: number } {
  const step = event.message;
  const detail = event.detail || '';
  
  // Use calculator for accurate percentage
  const percentage = this.progressCalculator?.getDetailedProgress(step, event.subProgress) || 0;
  
  return { step, detail, percentage };
}
```

### 3. Add Quality Pipeline Progress Stages (Priority: Medium)

**File**: Create `src/electron/main/services/QualityPipelineProgressMapper.ts`

```typescript
export class QualityPipelineProgressMapper {
  private static qualityStages: ProgressStage[] = [
    { name: 'Initializing quality pipeline', weight: 5 },
    { name: 'Context retrieval phase', weight: 15 },
    { name: 'Drafting agent processing', weight: 30 },
    { name: 'Overseer agent review', weight: 25 },
    { name: 'Final document assembly', weight: 15 },
    { name: 'Quality checks complete', weight: 10 },
  ];
  
  static mapLangGraphProgress(nodeId: string, status: string): string {
    const mappings: Record<string, string> = {
      'context_builder': 'Context retrieval phase',
      'drafting_agent': 'Drafting agent processing',
      'overseer_agent': 'Overseer agent review',
      'final_assembly': 'Final document assembly',
    };
    
    return mappings[nodeId] || `Processing: ${nodeId}`;
  }
  
  static integrateWithPDFProgress(
    qualityProgress: number, 
    pdfProgress: number
  ): number {
    // Quality pipeline is 70% of total, PDF generation is 30%
    if (qualityProgress < 100) {
      return Math.round(qualityProgress * 0.7);
    }
    
    return 70 + Math.round(pdfProgress * 0.3);
  }
}
```

### 4. Create Progress Analytics (Priority: Low)

**File**: Create `src/electron/main/services/ProgressAnalytics.ts`

```typescript
interface ProgressMetrics {
  stageName: string;
  duration: number;
  timestamp: Date;
  documentType: DocumentType;
}

export class ProgressAnalytics {
  private static metrics: ProgressMetrics[] = [];
  private static readonly MAX_METRICS = 1000;
  
  static recordStageCompletion(
    stageName: string,
    duration: number,
    documentType: DocumentType
  ): void {
    this.metrics.push({
      stageName,
      duration,
      timestamp: new Date(),
      documentType,
    });
    
    // Maintain size limit
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }
  
  static getAverageStageTime(stageName: string): number {
    const stageMetrics = this.metrics.filter(m => m.stageName === stageName);
    if (stageMetrics.length === 0) return 0;
    
    const totalTime = stageMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalTime / stageMetrics.length;
  }
  
  static predictRemainingTime(
    currentStage: string,
    documentType: DocumentType
  ): number | null {
    // Get remaining stages
    const calculator = new PDFProgressCalculator(documentType);
    const currentProgress = calculator.getProgressForStage(currentStage);
    
    if (currentProgress === 0 || currentProgress === 100) return null;
    
    // Estimate based on historical data
    const avgTimePerPercent = this.getAverageTimePerPercent(documentType);
    const remainingPercent = 100 - currentProgress;
    
    return avgTimePerPercent * remainingPercent;
  }
  
  private static getAverageTimePerPercent(documentType: DocumentType): number {
    const docMetrics = this.metrics.filter(m => m.documentType === documentType);
    if (docMetrics.length === 0) return 100; // Default 100ms per percent
    
    // Calculate total time for completed generations
    const completedGenerations = new Map<string, number>();
    
    // Group metrics by generation session
    // ... implementation details ...
    
    return 100; // Placeholder
  }
}
```

### 5. Implement Progress Smoothing (Priority: Medium)

**File**: Create `src/electron/main/services/ProgressSmoother.ts`

```typescript
export class ProgressSmoother {
  private targetProgress: number = 0;
  private currentProgress: number = 0;
  private animationFrame: NodeJS.Timeout | null = null;
  private onUpdate: (progress: number) => void;
  
  constructor(onUpdate: (progress: number) => void) {
    this.onUpdate = onUpdate;
  }
  
  setProgress(progress: number): void {
    this.targetProgress = progress;
    
    if (!this.animationFrame) {
      this.startAnimation();
    }
  }
  
  private startAnimation(): void {
    const animate = () => {
      const diff = this.targetProgress - this.currentProgress;
      
      if (Math.abs(diff) < 0.1) {
        this.currentProgress = this.targetProgress;
        this.onUpdate(Math.round(this.currentProgress));
        this.animationFrame = null;
        return;
      }
      
      // Smooth animation with easing
      this.currentProgress += diff * 0.1;
      this.onUpdate(Math.round(this.currentProgress));
      
      this.animationFrame = setTimeout(animate, 50);
    };
    
    animate();
  }
  
  cleanup(): void {
    if (this.animationFrame) {
      clearTimeout(this.animationFrame);
      this.animationFrame = null;
    }
  }
}
```

## Testing Requirements

### Unit Tests

```typescript
describe('PDFProgressCalculator', () => {
  it('should calculate correct percentages for stages', () => {
    const calculator = new PDFProgressCalculator('patent-assignment-agreement');
    
    expect(calculator.getProgressForStage('Parsing signature blocks')).toBeGreaterThan(0);
    expect(calculator.getProgressForStage('PDF export completed')).toBe(100);
  });
  
  it('should handle page-specific progress', () => {
    const calculator = new PDFProgressCalculator('provisional-patent-application', 10);
    
    const page5Progress = calculator.getDetailedProgress('Rendering page 5 of 10');
    const page10Progress = calculator.getDetailedProgress('Rendering page 10 of 10');
    
    expect(page10Progress).toBeGreaterThan(page5Progress);
  });
});
```

### Integration Tests

```typescript
describe('Progress Mapping Integration', () => {
  it('should emit accurate progress throughout generation', async () => {
    const progressEvents: number[] = [];
    
    // Mock progress callback
    const callback = (event: ProgressEvent) => {
      progressEvents.push(event.percentage);
    };
    
    // Generate PDF and collect progress
    await pdfService.exportToBuffer(content, 'patent-license-agreement', { progressCallback: callback });
    
    // Verify progress sequence
    expect(progressEvents).toEqual(expect.arrayContaining([
      expect.any(Number), // Multiple progress points
    ]));
    
    // Progress should be monotonically increasing
    for (let i = 1; i < progressEvents.length; i++) {
      expect(progressEvents[i]).toBeGreaterThanOrEqual(progressEvents[i - 1]);
    }
  });
});
```

## Implementation Checklist

- [ ] Create PDFProgressCalculator class
- [ ] Update PDFGenerationHandler to use calculator
- [ ] Implement quality pipeline progress mapping
- [ ] Add progress analytics collection
- [ ] Implement progress smoothing
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation

## Dependencies

- Task 6.0.2.2 (Progress reporting IPC) must be complete
- Task 6.0.5.1 (Connect to BackgroundGenerationStatus) should be complete

## Estimated Time

- Implementation: 3-4 hours
- Testing: 2 hours
- Total: 5-6 hours

## Notes

- Consider caching progress calculations for performance
- Add configuration for stage weights customization
- Monitor actual stage durations to refine weights
- Consider adding progress estimation based on document size 