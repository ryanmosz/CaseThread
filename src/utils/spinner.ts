/**
 * Spinner utility for CaseThread CLI POC
 * 
 * Provides a user-friendly progress indicator using Ora,
 * with fallback behavior for non-TTY environments.
 */

import ora, { Ora, Options as OraOptions } from 'ora';
import { logInfo, logDebug } from './logger';

/**
 * Spinner states for different progress stages
 */
export const SPINNER_STATES = {
  VALIDATING: '⏳ Validating document type...',
  LOADING_TEMPLATE: '📄 Loading template files...',
  VALIDATING_INPUT: '🔍 Validating input data...',
  CONNECTING_AI: '🤖 Connecting to OpenAI...',
  GENERATING: '📡 Generating document (this may take 30-60 seconds)...',
  SAVING: '💾 Saving output...',
  SUCCESS: '✅ Document generated successfully!',
  ERROR: '❌ An error occurred',
  WARNING: '⚠️  Warning'
} as const;

/**
 * Type for spinner state keys
 */
export type SpinnerState = keyof typeof SPINNER_STATES;

/**
 * Extended spinner interface with custom methods
 */
export interface CaseThreadSpinner {
  /** Update the spinner message */
  updateMessage: (message: string) => void;
  /** Mark operation as successful */
  success: (message?: string) => void;
  /** Mark operation as failed */
  fail: (message?: string) => void;
  /** Show a warning */
  warn: (message?: string) => void;
  /** Stop the spinner without a status */
  stop: () => void;
  /** Check if running in TTY mode */
  isSpinning: boolean;
  /** The underlying Ora instance (if in TTY mode) */
  ora?: Ora;
}

/**
 * Non-TTY fallback implementation
 */
class NonTTYSpinner implements CaseThreadSpinner {
  isSpinning = false;
  private currentMessage = '';

  updateMessage(message: string): void {
    this.currentMessage = message;
    console.log(message);
    logDebug('Spinner message', { message });
  }

  success(message?: string): void {
    const finalMessage = message || this.currentMessage;
    console.log(`✅ ${finalMessage}`);
    logInfo('Operation succeeded', { message: finalMessage });
  }

  fail(message?: string): void {
    const finalMessage = message || this.currentMessage;
    console.error(`❌ ${finalMessage}`);
    logInfo('Operation failed', { message: finalMessage });
  }

  warn(message?: string): void {
    const finalMessage = message || this.currentMessage;
    console.warn(`⚠️  ${finalMessage}`);
    logInfo('Operation warning', { message: finalMessage });
  }

  stop(): void {
    // No-op for non-TTY
  }
}

/**
 * TTY spinner implementation wrapping Ora
 */
class TTYSpinner implements CaseThreadSpinner {
  ora: Ora;
  isSpinning = true;

  constructor(options: OraOptions) {
    this.ora = ora(options);
    this.ora.start();
  }

  updateMessage(message: string): void {
    this.ora.text = message;
    logDebug('Spinner message updated', { message });
  }

  success(message?: string): void {
    this.ora.succeed(message);
    this.isSpinning = false;
    logInfo('Operation succeeded', { message: message || this.ora.text });
  }

  fail(message?: string): void {
    this.ora.fail(message);
    this.isSpinning = false;
    logInfo('Operation failed', { message: message || this.ora.text });
  }

  warn(message?: string): void {
    this.ora.warn(message);
    this.isSpinning = false;
    logInfo('Operation warning', { message: message || this.ora.text });
  }

  stop(): void {
    this.ora.stop();
    this.isSpinning = false;
  }
}

/**
 * Creates a new spinner instance
 * 
 * @param initialMessage - Initial spinner message
 * @param options - Additional Ora options
 * @returns CaseThreadSpinner instance
 * 
 * @example
 * ```typescript
 * const spinner = createSpinner('Loading...');
 * // Do some work
 * spinner.updateMessage('Processing...');
 * // More work
 * spinner.success('Done!');
 * ```
 */
export function createSpinner(
  initialMessage: string = 'Loading...',
  options: Partial<OraOptions> = {}
): CaseThreadSpinner {
  // Check if we're in a TTY environment
  const isTTY = process.stdout.isTTY && process.env.NODE_ENV !== 'test';

  if (!isTTY) {
    const spinner = new NonTTYSpinner();
    spinner.updateMessage(initialMessage);
    return spinner;
  }

  const oraOptions: OraOptions = {
    text: initialMessage,
    color: 'cyan',
    spinner: 'dots',
    ...options
  };

  return new TTYSpinner(oraOptions);
}

/**
 * Creates a spinner with a predefined state message
 * 
 * @param state - Predefined spinner state
 * @param options - Additional Ora options
 * @returns CaseThreadSpinner instance
 * 
 * @example
 * ```typescript
 * const spinner = createSpinnerWithState('LOADING_TEMPLATE');
 * // Later...
 * spinner.success('Template loaded!');
 * ```
 */
export function createSpinnerWithState(
  state: SpinnerState,
  options: Partial<OraOptions> = {}
): CaseThreadSpinner {
  return createSpinner(SPINNER_STATES[state], options);
}

/**
 * Executes a function with a spinner, automatically handling success/failure
 * 
 * @param message - Spinner message during execution
 * @param fn - Function to execute
 * @param successMessage - Optional success message
 * @param errorMessage - Optional error message
 * @returns Result of the function
 * 
 * @example
 * ```typescript
 * const result = await withSpinner(
 *   'Loading template...',
 *   async () => loadTemplate('patent-assignment'),
 *   'Template loaded!',
 *   'Failed to load template'
 * );
 * ```
 */
export async function withSpinner<T>(
  message: string,
  fn: () => T | Promise<T>,
  successMessage?: string,
  errorMessage?: string
): Promise<T> {
  const spinner = createSpinner(message);

  try {
    const result = await fn();
    spinner.success(successMessage);
    return result;
  } catch (error) {
    spinner.fail(errorMessage);
    throw error;
  }
}

/**
 * Creates a progress spinner for multi-step operations
 * 
 * @param steps - Array of step descriptions
 * @returns Object with methods to control the progress
 * 
 * @example
 * ```typescript
 * const progress = createProgressSpinner([
 *   'Loading template',
 *   'Validating input',
 *   'Generating document'
 * ]);
 * 
 * await progress.next(); // Moves to 'Loading template'
 * // Do work...
 * await progress.next(); // Moves to 'Validating input'
 * // Do work...
 * await progress.complete(); // Shows success
 * ```
 */
export function createProgressSpinner(steps: string[]) {
  let currentStep = -1;
  let spinner: CaseThreadSpinner | null = null;

  return {
    /**
     * Move to the next step
     */
    async next(): Promise<void> {
      currentStep++;
      
      if (currentStep >= steps.length) {
        throw new Error('No more steps');
      }

      const stepMessage = `[${currentStep + 1}/${steps.length}] ${steps[currentStep]}`;
      
      if (!spinner) {
        spinner = createSpinner(stepMessage);
      } else {
        spinner.updateMessage(stepMessage);
      }
    },

    /**
     * Complete the progress successfully
     */
    async complete(message?: string): Promise<void> {
      if (spinner) {
        spinner.success(message || 'All steps completed!');
      }
    },

    /**
     * Fail the progress
     */
    async fail(message?: string): Promise<void> {
      if (spinner) {
        const failMessage = message || `Failed at step ${currentStep + 1}: ${steps[currentStep]}`;
        spinner.fail(failMessage);
      }
    },

    /**
     * Get current step index
     */
    getCurrentStep(): number {
      return currentStep;
    }
  };
} 