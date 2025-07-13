/**
 * Progress reporting interface for PDF generation
 * Abstracts progress reporting to work with any UI (CLI, GUI, etc.)
 */
export interface ProgressReporter {
  /**
   * Report a general progress update
   * @param step - Current step description
   * @param detail - Optional additional detail
   */
  report(step: string, detail?: string): void;
  
  /**
   * Start a named task
   * @param taskName - Name of the task being started
   */
  startTask(taskName: string): void;
  
  /**
   * Complete a named task
   * @param taskName - Name of the task being completed
   */
  completeTask(taskName: string): void;
  
  /**
   * Report an error
   * @param message - Error message
   * @param error - Optional error object
   */
  error(message: string, error?: Error): void;
  
  /**
   * Report a warning
   * @param message - Warning message
   */
  warn?(message: string): void;
}

/**
 * Progress event for tracking generation progress
 */
export interface ProgressEvent {
  type: 'start' | 'progress' | 'complete' | 'error' | 'warning';
  taskName?: string;
  message: string;
  detail?: string;
  error?: Error;
  timestamp: Date;
  percentage?: number;
}

/**
 * Options for creating progress reporters
 */
export interface ProgressReporterOptions {
  /**
   * Whether to include timestamps in output
   */
  includeTimestamps?: boolean;
  
  /**
   * Whether to track task duration
   */
  trackDuration?: boolean;
  
  /**
   * Custom formatter for messages
   */
  formatter?: (event: ProgressEvent) => string;
} 