/**
 * Retry utility for handling transient failures with exponential backoff
 */

import { logger } from './logger';

/**
 * Options for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  delayMs: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
}

/**
 * Execute a function with retry logic
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @param onRetry - Callback invoked on each retry attempt
 * @returns Promise resolving to function result
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === options.maxAttempts) {
        throw lastError;
      }
      
      if (onRetry) {
        onRetry(attempt, lastError);
      }
      
      const delay = Math.min(
        options.delayMs * Math.pow(options.backoffMultiplier, attempt - 1),
        options.maxDelayMs
      );
      
      logger.debug(`Retrying after ${delay}ms (attempt ${attempt}/${options.maxAttempts})`, {
        error: lastError.message,
        attempt,
        delay
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Execute a promise with timeout
 * @param promise - Promise to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param timeoutError - Error to throw on timeout
 * @returns Promise that rejects if timeout is reached
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: Error
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(timeoutError), timeoutMs);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
} 