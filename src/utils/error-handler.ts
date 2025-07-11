import { CaseThreadSpinner } from './spinner';
import { logger } from './logger';
import { ERROR_MESSAGES, ErrorCode } from '../types/errors';

export class CLIError extends Error {
  constructor(
    message: string,
    public code: ErrorCode = ErrorCode.GENERAL_ERROR,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export function handleError(error: Error, spinner: CaseThreadSpinner): never {
  // Log full error details
  logger.error('Full error details:', error);
  
  let userMessage: string;
  let exitCode = 1; // Always use 1 for errors, only use 0 for success
  
  // Determine error type and format message
  if (error instanceof CLIError) {
    userMessage = error.message;
    // Log the specific error code for debugging, but don't use it as exit code
    logger.debug('CLIError code:', error.code);
  } else if (error.message.includes('ENOENT')) {
    const match = error.message.match(/ENOENT.*'([^']+)'/);
    const path = match ? match[1] : 'unknown file';
    userMessage = ERROR_MESSAGES.FILE_NOT_FOUND(path);
  } else if (error.message.includes('file not found')) {
    // Handle YAML file not found errors
    const match = error.message.match(/file not found: (.+)$/i);
    const path = match ? match[1] : 'unknown file';
    userMessage = ERROR_MESSAGES.FILE_NOT_FOUND(path);
  } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
    const match = error.message.match(/['"]([^'"]+)['"]/);
    const path = match ? match[1] : 'unknown location';
    userMessage = ERROR_MESSAGES.PERMISSION_ERROR(path);
  } else if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
    userMessage = ERROR_MESSAGES.NETWORK_ERROR();
  } else if (error.message.includes('Invalid API Key') || error.message.includes('Unauthorized')) {
    userMessage = ERROR_MESSAGES.OPENAI_ERROR('Invalid API key provided');
  } else if (error.message.includes('rate limit')) {
    userMessage = ERROR_MESSAGES.OPENAI_ERROR('Rate limit exceeded. Please wait and try again.');
  } else {
    // For unknown errors, show the original message if not in debug mode
    userMessage = logger.level === 'debug' 
      ? `${ERROR_MESSAGES.UNKNOWN_ERROR()}\n\nDebug info: ${error.message}`
      : ERROR_MESSAGES.UNKNOWN_ERROR();
  }
  
  // Update spinner with error
  spinner.fail(userMessage);
  
  // Exit with error code 1
  process.exit(exitCode);
}

// Helper to create formatted errors
export function createError(
  type: keyof typeof ERROR_MESSAGES,
  ...args: any[]
): CLIError {
  const messageFunc = ERROR_MESSAGES[type];
  const message = typeof messageFunc === 'function' 
    ? (messageFunc as any)(...args)
    : messageFunc;
  
  return new CLIError(message);
} 