import { ProgressReporter, ProgressReporterOptions, ProgressEvent } from '../../types/progress';
import { createChildLogger, Logger } from '../logger';

/**
 * Callback function for progress events
 */
export type ProgressCallback = (event: ProgressEvent) => void;

/**
 * Callback-based progress reporter suitable for GUI applications
 * Calls user-provided callback with progress events
 */
export class CallbackProgressReporter implements ProgressReporter {
  private logger: Logger;
  private callback: ProgressCallback;
  private taskStartTimes: Map<string, number> = new Map();
  private options: ProgressReporterOptions;
  private eventCount = 0;
  
  constructor(callback: ProgressCallback, options: ProgressReporterOptions = {}) {
    this.logger = createChildLogger({ service: 'CallbackProgressReporter' });
    this.callback = callback;
    this.options = {
      includeTimestamps: true,
      trackDuration: true,
      ...options
    };
  }
  
  /**
   * Emit a progress event
   */
  private emit(event: Omit<ProgressEvent, 'timestamp'>): void {
    const fullEvent: ProgressEvent = {
      ...event,
      timestamp: new Date()
    };
    
    this.eventCount++;
    
    try {
      this.callback(fullEvent);
      this.logger.debug('Progress event emitted', { 
        type: event.type, 
        message: event.message,
        eventNumber: this.eventCount
      });
    } catch (error) {
      this.logger.error('Callback error', { 
        error: (error as Error).message,
        event: fullEvent
      });
    }
  }
  
  /**
   * Report a general progress update
   */
  report(step: string, detail?: string): void {
    this.emit({
      type: 'progress',
      message: step,
      detail
    });
  }
  
  /**
   * Start a named task
   */
  startTask(taskName: string): void {
    if (this.options.trackDuration) {
      this.taskStartTimes.set(taskName, Date.now());
    }
    
    this.emit({
      type: 'start',
      taskName,
      message: `Starting ${taskName}`
    });
  }
  
  /**
   * Complete a named task
   */
  completeTask(taskName: string): void {
    let duration: number | undefined;
    
    if (this.options.trackDuration && this.taskStartTimes.has(taskName)) {
      const startTime = this.taskStartTimes.get(taskName)!;
      duration = Date.now() - startTime;
      this.taskStartTimes.delete(taskName);
    }
    
    const message = duration 
      ? `${taskName} completed in ${(duration / 1000).toFixed(2)}s`
      : `${taskName} completed`;
    
    this.emit({
      type: 'complete',
      taskName,
      message,
      detail: duration ? `Duration: ${duration}ms` : undefined
    });
  }
  
  /**
   * Report an error
   */
  error(message: string, error?: Error): void {
    this.emit({
      type: 'error',
      message,
      error,
      detail: error?.message
    });
  }
  
  /**
   * Report a warning
   */
  warn(message: string): void {
    this.emit({
      type: 'warning',
      message
    });
  }
  
  /**
   * Get the total number of events emitted
   */
  getEventCount(): number {
    return this.eventCount;
  }
  
  /**
   * Create a simplified callback reporter
   */
  static simple(onProgress: (message: string, detail?: string) => void): CallbackProgressReporter {
    return new CallbackProgressReporter((event) => {
      onProgress(event.message, event.detail);
    });
  }
} 