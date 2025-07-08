import { jest } from '@jest/globals';
import { logger } from '../src/utils/logger';

// Mock modules before importing
jest.mock('../src/utils/logger');
jest.mock('../src/commands/generate', () => ({
  generateCommand: {
    name: jest.fn().mockReturnValue('generate'),
    parse: jest.fn(),
    parseAsync: jest.fn()
  }
}));

describe('CLI Entry Point', () => {
  let originalArgv: string[];
  let mockLoggerDebug: jest.Mock;

  beforeEach(() => {
    originalArgv = process.argv;
    mockLoggerDebug = jest.fn();
    (logger.debug as jest.Mock) = mockLoggerDebug;
    logger.level = 'info';
    
    // Clear module cache to ensure fresh imports
    jest.resetModules();
  });

  afterEach(() => {
    process.argv = originalArgv;
    jest.clearAllMocks();
  });

  describe('Debug Flag Functionality', () => {
    it('should enable debug logging with global --debug flag', async () => {
      process.argv = ['node', 'index.js', '--debug', 'generate', 'patent-assignment', 'test.yaml'];
      
      // Import the CLI after setting up the argv
      await import('../src/index');
      
      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));
      
      expect(logger.level).toBe('debug');
      expect(mockLoggerDebug).toHaveBeenCalledWith('Debug logging enabled via global flag');
      expect(mockLoggerDebug).toHaveBeenCalledWith(expect.stringContaining('Running command:'));
      expect(mockLoggerDebug).toHaveBeenCalledWith(expect.stringContaining('Node version:'));
      expect(mockLoggerDebug).toHaveBeenCalledWith(expect.stringContaining('Working directory:'));
    });

    it('should not enable debug logging without --debug flag', async () => {
      process.argv = ['node', 'index.js', 'generate', 'patent-assignment', 'test.yaml'];
      
      // Import the CLI after setting up the argv
      await import('../src/index');
      
      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));
      
      expect(logger.level).toBe('info');
      expect(mockLoggerDebug).not.toHaveBeenCalled();
    });

    it('should enable debug logging with -d shorthand', async () => {
      process.argv = ['node', 'index.js', '-d', 'generate', 'patent-assignment', 'test.yaml'];
      
      // Import the CLI after setting up the argv
      await import('../src/index');
      
      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));
      
      expect(logger.level).toBe('debug');
      expect(mockLoggerDebug).toHaveBeenCalledWith('Debug logging enabled via global flag');
    });
  });
}); 