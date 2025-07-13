import { ProgressReporter } from '../../types/progress';
import { createChildLogger, Logger } from '../logger';

/**
 * Null progress reporter that does nothing
 * Useful for testing or when progress reporting is not needed
 */
export class NullProgressReporter implements ProgressReporter {
  private logger: Logger;
  private logActivity: boolean;
  
  constructor(logActivity: boolean = false) {
    this.logger = createChildLogger({ service: 'NullProgressReporter' });
    this.logActivity = logActivity;
  }
  
  /**
   * Report a general progress update (no-op)
   */
  report(step: string, detail?: string): void {
    if (this.logActivity) {
      this.logger.debug('Progress report (ignored)', { step, detail });
    }
  }
  
  /**
   * Start a named task (no-op)
   */
  startTask(taskName: string): void {
    if (this.logActivity) {
      this.logger.debug('Task start (ignored)', { taskName });
    }
  }
  
  /**
   * Complete a named task (no-op)
   */
  completeTask(taskName: string): void {
    if (this.logActivity) {
      this.logger.debug('Task complete (ignored)', { taskName });
    }
  }
  
  /**
   * Report an error (logs but doesn't display)
   */
  error(message: string, error?: Error): void {
    // Always log errors even in null reporter
    this.logger.error(message, { 
      error: error?.message, 
      stack: error?.stack 
    });
  }
  
  /**
   * Report a warning (logs but doesn't display)
   */
  warn(message: string): void {
    // Always log warnings even in null reporter
    this.logger.warn(message);
  }
  
  /**
   * Singleton instance for convenience
   */
  private static instance: NullProgressReporter;
  
  /**
   * Get a shared instance of NullProgressReporter
   */
  static getInstance(): NullProgressReporter {
    if (!NullProgressReporter.instance) {
      NullProgressReporter.instance = new NullProgressReporter();
    }
    return NullProgressReporter.instance;
  }
} 