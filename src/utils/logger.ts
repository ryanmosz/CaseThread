/**
 * Logger utility for CaseThread CLI POC
 * 
 * Provides structured logging with Winston, supporting both console
 * and file outputs with different formatting for each transport.
 */

import winston from 'winston';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Log levels available in the application
 */
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
} as const;

/**
 * Get log level from environment or default to 'info'
 */
const getLogLevel = (): string => {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  return level && level in LOG_LEVELS ? level : 'info';
};

/**
 * Get log file path from environment or default
 */
const getLogFilePath = (): string => {
  return process.env.DEBUG_LOG_PATH || path.join(process.cwd(), 'logs', 'casethread.log');
};

/**
 * Custom format for console output with colors and readable timestamps
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let output = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      // Remove stack from meta if it's already been printed
      const { stack, ...cleanMeta } = meta;
      if (Object.keys(cleanMeta).length > 0) {
        output += ` ${JSON.stringify(cleanMeta, null, 2)}`;
      }
    }
    
    return output;
  })
);

/**
 * JSON format for file output for easy parsing
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Create the Winston logger instance
 */
const createLogger = (): winston.Logger => {
  const logLevel = getLogLevel();
  const logFilePath = getLogFilePath();
  
  const transports: winston.transport[] = [
    // Console transport with custom formatting
    new winston.transports.Console({
      format: consoleFormat,
      level: logLevel
    })
  ];

  // Add file transport if not in test environment
  if (process.env.NODE_ENV !== 'test') {
    transports.push(
      new winston.transports.File({
        filename: logFilePath,
        format: fileFormat,
        level: 'debug', // File always gets debug level
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    );
  }

  return winston.createLogger({
    levels: LOG_LEVELS,
    transports,
    // Don't exit on uncaught errors
    exitOnError: false
  });
};

/**
 * Main logger instance
 */
export const logger = createLogger();

/**
 * Log an error with optional error object
 * 
 * @param message - Error message
 * @param error - Optional error object
 * @param meta - Additional metadata
 * 
 * @example
 * ```typescript
 * logError('Failed to load template', error, { templateId: 'patent-assignment' });
 * ```
 */
export function logError(message: string, error?: Error, meta?: Record<string, any>): void {
  const errorMeta = error ? {
    errorMessage: error.message,
    errorName: error.name,
    stack: error.stack,
    ...meta
  } : meta;

  logger.error(message, errorMeta);
}

/**
 * Log a warning message
 * 
 * @param message - Warning message
 * @param meta - Additional metadata
 * 
 * @example
 * ```typescript
 * logWarning('Template version mismatch', { expected: '1.0.0', actual: '0.9.0' });
 * ```
 */
export function logWarning(message: string, meta?: Record<string, any>): void {
  logger.warn(message, meta);
}

/**
 * Log an info message
 * 
 * @param message - Info message
 * @param meta - Additional metadata
 * 
 * @example
 * ```typescript
 * logInfo('Document generation started', { type: 'patent-assignment', client: 'TechFlow' });
 * ```
 */
export function logInfo(message: string, meta?: Record<string, any>): void {
  logger.info(message, meta);
}

/**
 * Log a debug message
 * 
 * @param message - Debug message
 * @param meta - Additional metadata
 * 
 * @example
 * ```typescript
 * logDebug('Template loaded', { templateId: 'patent-assignment', sections: 5 });
 * ```
 */
export function logDebug(message: string, meta?: Record<string, any>): void {
  logger.debug(message, meta);
}

/**
 * Create a child logger with additional context
 * 
 * @param context - Context to add to all log messages
 * @returns Child logger instance
 * 
 * @example
 * ```typescript
 * const templateLogger = createChildLogger({ service: 'template-loader' });
 * templateLogger.info('Loading template'); // Will include service: 'template-loader'
 * ```
 */
export function createChildLogger(context: Record<string, any>): winston.Logger {
  return logger.child(context);
}

/**
 * Measure and log the duration of an operation
 * 
 * @param operation - Name of the operation
 * @param fn - Function to measure
 * @returns Result of the function
 * 
 * @example
 * ```typescript
 * const result = await measureDuration('template-loading', async () => {
 *   return await loadTemplate('patent-assignment');
 * });
 * ```
 */
export async function measureDuration<T>(
  operation: string,
  fn: () => T | Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    logDebug(`Operation completed: ${operation}`, { duration: `${duration}ms` });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logError(`Operation failed: ${operation}`, error as Error, { duration: `${duration}ms` });
    throw error;
  }
}

// Export Winston types for external use
export type LogLevel = keyof typeof LOG_LEVELS;
export type Logger = winston.Logger; 