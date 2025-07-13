/**
 * Logger utility for CaseThread CLI POC
 * 
 * Provides structured logging with Winston, supporting both console
 * and file outputs with different formatting for each transport.
 */

import winston from 'winston';
import fs from 'fs';
import path from 'path';

const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
const isDevelopment = process.env.NODE_ENV !== 'production';

// Create logs directory if in development
const logsDir = path.join(process.cwd(), 'logs', 'electron');
if (isDevelopment && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Create custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const serviceStr = service ? `[${service}] ` : '';
    return `${timestamp} ${level}: ${serviceStr}${message}${metaStr}`;
  })
);

// Create custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.json()
);

// Base logger configuration
const loggerConfig: winston.LoggerOptions = {
  level: isDevelopment ? 'debug' : 'info',
  levels,
  format: fileFormat,
  transports: []
};

// Only add file transports in main process (not renderer)
if (isElectron && isDevelopment) {
  // Check if we're in the main process by checking for the absence of window object
  const isMainProcess = typeof window === 'undefined';
  
  if (isMainProcess) {
    loggerConfig.transports = [
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error'
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log')
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'main.log')
      })
    ];
  }
}

// Always add console transport in development
if (isDevelopment) {
  (loggerConfig.transports as winston.transport[]).push(
    new winston.transports.Console({
      format: consoleFormat
    })
  );
}

// Create the logger
export const logger = winston.createLogger(loggerConfig);

// Export a type-safe logger interface
export interface Logger {
  error: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  info: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
}

// Helper to create child loggers with service context
export const createChildLogger = (context: { service: string }): Logger => {
  return {
    error: (message: string, meta?: any) => logger.error(message, { ...context, ...meta }),
    warn: (message: string, meta?: any) => logger.warn(message, { ...context, ...meta }),
    info: (message: string, meta?: any) => logger.info(message, { ...context, ...meta }),
    debug: (message: string, meta?: any) => logger.debug(message, { ...context, ...meta }),
  };
};

// Log uncaught errors
if (isDevelopment) {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', { reason, promise });
  });
}

// Backward compatibility functions
export function logInfo(message: string, meta?: any): void {
  logger.info(message, meta);
}

export function logDebug(message: string, meta?: any): void {
  logger.debug(message, meta);
}

export function logError(message: string, error?: Error, meta?: any): void {
  const errorMeta = error ? {
    errorMessage: error.message,
    errorName: error.name,
    stack: error.stack,
    ...meta
  } : meta;
  
  logger.error(message, errorMeta);
}

export function logWarning(message: string, meta?: any): void {
  logger.warn(message, meta);
} 