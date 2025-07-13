/**
 * Unit tests for the logger utility
 */

// Mock winston before importing anything
jest.mock('winston', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(() => ({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    }))
  };

  return {
    createLogger: jest.fn(() => mockLogger),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      printf: jest.fn(),
      colorize: jest.fn(),
      simple: jest.fn(),
      json: jest.fn(),
      errors: jest.fn()
    },
    transports: {
      Console: jest.fn(),
      File: jest.fn()
    }
  };
});

import winston from 'winston';
import { 
  logError,
  logWarning,
  logInfo,
  logDebug,
  createChildLogger
} from '../../src/utils/logger';

describe('Logger Utility', () => {
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the mocked logger instance
    mockLogger = (winston.createLogger as jest.Mock).mock.results[0]?.value;
    if (!mockLogger) {
      // Call createLogger to get the mock instance
      mockLogger = winston.createLogger();
    }
  });



  describe('logError', () => {
    it('should log error message', () => {
      logError('Test error message');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Test error message',
        undefined
      );
    });

    it('should log error with Error object', () => {
      const error = new Error('Test error');
      error.stack = 'Test stack trace';
      
      logError('Failed operation', error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed operation',
        expect.objectContaining({
          errorMessage: 'Test error',
          errorName: 'Error',
          stack: 'Test stack trace'
        })
      );
    });

    it('should log error with metadata', () => {
      const error = new Error('Test error');
      const meta = { userId: '123', operation: 'save' };
      
      logError('Failed operation', error, meta);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed operation',
        expect.objectContaining({
          errorMessage: 'Test error',
          errorName: 'Error',
          userId: '123',
          operation: 'save'
        })
      );
    });

    it('should log error with only metadata', () => {
      const meta = { code: 'ERR_001' };
      
      logError('Error occurred', undefined, meta);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error occurred',
        meta
      );
    });
  });

  describe('logWarning', () => {
    it('should log warning message', () => {
      logWarning('Test warning');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Test warning',
        undefined
      );
    });

    it('should log warning with metadata', () => {
      const meta = { threshold: 100, actual: 150 };
      
      logWarning('Threshold exceeded', meta);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Threshold exceeded',
        meta
      );
    });
  });

  describe('logInfo', () => {
    it('should log info message', () => {
      logInfo('Test info');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Test info',
        undefined
      );
    });

    it('should log info with metadata', () => {
      const meta = { status: 'completed', duration: '100ms' };
      
      logInfo('Operation completed', meta);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Operation completed',
        meta
      );
    });
  });

  describe('logDebug', () => {
    it('should log debug message', () => {
      logDebug('Test debug');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Test debug',
        undefined
      );
    });

    it('should log debug with metadata', () => {
      const meta = { input: { a: 1, b: 2 }, output: 3 };
      
      logDebug('Calculation result', meta);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Calculation result',
        meta
      );
    });
  });

  describe('createChildLogger', () => {
    it('should create child logger with context', () => {
      const context = { service: 'template-loader' };
      
      const childLogger = createChildLogger(context);
      
      // Test that child logger includes context in all log methods
      childLogger.info('test message', { extra: 'data' });
      expect(mockLogger.info).toHaveBeenCalledWith('test message', {
        service: 'template-loader',
        extra: 'data'
      });
      
      childLogger.error('error message');
      expect(mockLogger.error).toHaveBeenCalledWith('error message', {
        service: 'template-loader'
      });
    });

    it('should return logger instance', () => {
      const childLogger = createChildLogger({ service: 'test' });
      expect(childLogger).toBeDefined();
      expect(childLogger).toHaveProperty('error');
      expect(childLogger).toHaveProperty('warn');
      expect(childLogger).toHaveProperty('info');
      expect(childLogger).toHaveProperty('debug');
    });
  });


}); 