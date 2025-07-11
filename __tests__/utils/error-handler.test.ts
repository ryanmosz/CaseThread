// Mock ora before imports that use it
jest.mock('ora');

// Mock logger to avoid file system operations
jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    level: 'info'
  }
}));

// Mock spinner to avoid importing the real module
jest.mock('../../src/utils/spinner', () => ({
  createSpinner: jest.fn(() => ({
    fail: jest.fn()
  })),
  CaseThreadSpinner: jest.fn()
}));

import { CLIError, handleError, createError } from '../../src/utils/error-handler';
import { ErrorCode } from '../../src/types/errors';
import { logger } from '../../src/utils/logger';

describe('Error Handler', () => {
  let mockSpinner: any;
  let mockExit: jest.SpyInstance;
  let mockLoggerError: jest.Mock;

  beforeEach(() => {
    // Mock spinner
    mockSpinner = {
      fail: jest.fn()
    };

    // Mock process.exit
    mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit called with code ${code}`);
    });

    // Setup logger mocks
    mockLoggerError = logger.error as jest.Mock;
    logger.level = 'info';
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockExit.mockRestore();
  });

  describe('CLIError', () => {
    it('should create error with message and code', () => {
      const error = new CLIError('Test error', ErrorCode.INVALID_ARGUMENTS);
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.INVALID_ARGUMENTS);
      expect(error.name).toBe('CLIError');
    });

    it('should default to GENERAL_ERROR code', () => {
      const error = new CLIError('Test error');
      expect(error.code).toBe(ErrorCode.GENERAL_ERROR);
    });
  });

  describe('createError', () => {
    it('should create error for INVALID_TYPE', () => {
      const error = createError('INVALID_TYPE', 'bad-type', ['type1', 'type2']);
      expect(error.message).toContain('Invalid document type: \'bad-type\'');
      expect(error.message).toContain('• type1');
      expect(error.message).toContain('• type2');
    });

    it('should create error for FILE_NOT_FOUND', () => {
      const error = createError('FILE_NOT_FOUND', '/path/to/file.yaml');
      expect(error.message).toContain('File not found: \'/path/to/file.yaml\'');
    });

    it('should create error for MISSING_YAML_FIELDS', () => {
      const error = createError('MISSING_YAML_FIELDS', ['field1', 'field2']);
      expect(error.message).toContain('Missing required fields');
      expect(error.message).toContain('• field1');
      expect(error.message).toContain('• field2');
    });
  });

  describe('handleError', () => {
    it('should handle CLIError with custom exit code', () => {
      const error = new CLIError('Custom error', ErrorCode.INVALID_ARGUMENTS);
      
      try {
        handleError(error, mockSpinner);
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toBe('process.exit called with code 1');
      }

      expect(mockSpinner.fail).toHaveBeenCalledWith('Custom error');
      expect(mockLoggerError).toHaveBeenCalledWith('Full error details:', error);
    });

    it('should handle ENOENT errors', () => {
      const error = new Error("ENOENT: no such file or directory, open 'test.yaml'");
      
      try {
        handleError(error, mockSpinner);
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toBe('process.exit called with code 1');
      }

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining("File not found: 'test.yaml'")
      );
    });

    it('should handle permission errors', () => {
      const error = new Error('EACCES: permission denied, open "/protected/file"');
      
      try {
        handleError(error, mockSpinner);
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toBe('process.exit called with code 1');
      }

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied: \'/protected/file\'')
      );
    });

    it('should handle network errors', () => {
      const error = new Error('fetch failed: ECONNREFUSED');
      
      try {
        handleError(error, mockSpinner);
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toBe('process.exit called with code 1');
      }

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining('Network connection error')
      );
    });

    it('should handle OpenAI API key errors', () => {
      const error = new Error('Invalid API Key provided');
      
      try {
        handleError(error, mockSpinner);
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toBe('process.exit called with code 1');
      }

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining('OpenAI API error')
      );
      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining('Invalid API key provided')
      );
    });

    it('should handle rate limit errors', () => {
      const error = new Error('Request rate limit exceeded');
      
      try {
        handleError(error, mockSpinner);
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toBe('process.exit called with code 1');
      }

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit exceeded')
      );
    });

    it('should handle unknown errors without debug info', () => {
      const error = new Error('Something went wrong');
      logger.level = 'info';
      
      try {
        handleError(error, mockSpinner);
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toBe('process.exit called with code 1');
      }

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining('An unexpected error occurred')
      );
      expect(mockSpinner.fail).not.toHaveBeenCalledWith(
        expect.stringContaining('Something went wrong')
      );
    });

    it('should handle unknown errors with debug info in debug mode', () => {
      const error = new Error('Something went wrong');
      logger.level = 'debug';
      
      try {
        handleError(error, mockSpinner);
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toBe('process.exit called with code 1');
      }

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining('Debug info: Something went wrong')
      );
    });
  });
}); 