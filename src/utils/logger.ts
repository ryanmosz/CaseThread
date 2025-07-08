/**
 * Logger utility for CaseThread CLI POC
 * 
 * Provides structured logging with Winston, supporting both console
 * and file outputs with different formatting for each transport.
 */

import winston from 'winston';
import * as path from 'path';

const logDir = 'logs';
const debugLogFile = path.join(logDir, 'debug.log');
const errorLogFile = path.join(logDir, 'error.log');

// Create custom format for debug logs
const debugFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  
  // Add metadata if present
  if (Object.keys(meta).length > 0) {
    log += '\n' + JSON.stringify(meta, null, 2);
  }
  
  return log;
});

export const logger = winston.createLogger({
  level: 'info', // Default level
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // File transport for debug logs
    new winston.transports.File({
      filename: debugLogFile,
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        debugFormat
      )
    }),
    // File transport for errors
    new winston.transports.File({
      filename: errorLogFile,
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    // Console transport (only shows in debug mode)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      silent: true // Will be enabled when debug flag is set
    })
  ]
});

// Helper to enable/disable console output
export function enableConsoleLogging(enable: boolean): void {
  const consoleTransport = logger.transports.find(
    t => t instanceof winston.transports.Console
  ) as winston.transports.ConsoleTransportInstance;
  
  if (consoleTransport) {
    consoleTransport.silent = !enable;
  }
}

// Update logger level and console output when level changes
const originalLevel = Object.getOwnPropertyDescriptor(logger, 'level');
Object.defineProperty(logger, 'level', {
  get() {
    return originalLevel?.get?.call(this);
  },
  set(newLevel: string) {
    originalLevel?.set?.call(this, newLevel);
    // Enable console logging when in debug mode
    enableConsoleLogging(newLevel === 'debug');
  }
});

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
 * Type for log levels
 */
export type LogLevel = keyof typeof LOG_LEVELS;

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
export type Logger = winston.Logger; 