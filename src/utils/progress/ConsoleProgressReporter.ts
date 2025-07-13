import ora, { Ora } from 'ora';
import { ProgressReporter, ProgressReporterOptions } from '../../types/progress';
import { createChildLogger, Logger } from '../logger';

/**
 * Console-based progress reporter using ora spinners
 * Suitable for CLI applications
 */
export class ConsoleProgressReporter implements ProgressReporter {
  private spinner: Ora | null = null;
  private logger: Logger;
  private taskStartTimes: Map<string, number> = new Map();
  private options: ProgressReporterOptions;
  
  constructor(options: ProgressReporterOptions = {}) {
    this.logger = createChildLogger({ service: 'ConsoleProgressReporter' });
    this.options = {
      includeTimestamps: false,
      trackDuration: true,
      ...options
    };
  }
  
  /**
   * Report a general progress update
   */
  report(step: string, detail?: string): void {
    const message = detail ? `${step} - ${detail}` : step;
    
    if (this.spinner && this.spinner.isSpinning) {
      this.spinner.text = message;
    } else {
      this.spinner = ora(message).start();
    }
    
    this.logger.debug('Progress update', { step, detail });
  }
  
  /**
   * Start a named task
   */
  startTask(taskName: string): void {
    if (this.options.trackDuration) {
      this.taskStartTimes.set(taskName, Date.now());
    }
    
    if (this.spinner && this.spinner.isSpinning) {
      this.spinner.succeed();
    }
    
    this.spinner = ora(`Starting ${taskName}...`).start();
    this.logger.info(`Task started: ${taskName}`);
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
      ? `${taskName} completed (${(duration / 1000).toFixed(2)}s)`
      : `${taskName} completed`;
    
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
    } else {
      console.log(`✔ ${message}`);
    }
    
    this.logger.info(`Task completed: ${taskName}`, { duration });
  }
  
  /**
   * Report an error
   */
  error(message: string, error?: Error): void {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
    } else {
      console.error(`✖ ${message}`);
    }
    
    if (error) {
      console.error(error.message);
      this.logger.error(message, { error: error.message, stack: error.stack });
    } else {
      this.logger.error(message);
    }
  }
  
  /**
   * Report a warning
   */
  warn(message: string): void {
    if (this.spinner) {
      this.spinner.warn(message);
      this.spinner = null;
    } else {
      console.warn(`⚠ ${message}`);
    }
    
    this.logger.warn(message);
  }
  
  /**
   * Stop any active spinner
   */
  stop(): void {
    if (this.spinner && this.spinner.isSpinning) {
      this.spinner.stop();
      this.spinner = null;
    }
  }
} 