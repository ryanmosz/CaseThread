import { NullProgressReporter } from '../../../src/utils/progress/NullProgressReporter';
import { createChildLogger } from '../../../src/utils/logger';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  createChildLogger: jest.fn(() => ({
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }))
}));

describe('NullProgressReporter', () => {
  let reporter: NullProgressReporter;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };
    (createChildLogger as jest.Mock).mockReturnValue(mockLogger);
  });

  describe('basic operations', () => {
    beforeEach(() => {
      reporter = new NullProgressReporter();
    });

    it('should do nothing on report', () => {
      reporter.report('Test message', 'Detail');
      
      expect(mockLogger.debug).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should do nothing on startTask', () => {
      reporter.startTask('Test task');
      
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it('should do nothing on completeTask', () => {
      reporter.completeTask('Test task');
      
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it('should log errors even in null reporter', () => {
      const error = new Error('Test error');
      reporter.error('Operation failed', error);
      
      expect(mockLogger.error).toHaveBeenCalledWith('Operation failed', {
        error: 'Test error',
        stack: error.stack
      });
    });

    it('should log warnings even in null reporter', () => {
      reporter.warn('Deprecation warning');
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Deprecation warning');
    });
  });

  describe('with activity logging', () => {
    beforeEach(() => {
      reporter = new NullProgressReporter(true);
    });

    it('should log report activity when enabled', () => {
      reporter.report('Test message', 'Detail');
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Progress report (ignored)', 
        { step: 'Test message', detail: 'Detail' }
      );
    });

    it('should log startTask activity when enabled', () => {
      reporter.startTask('Test task');
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Task start (ignored)', 
        { taskName: 'Test task' }
      );
    });

    it('should log completeTask activity when enabled', () => {
      reporter.completeTask('Test task');
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Task complete (ignored)', 
        { taskName: 'Test task' }
      );
    });

    it('should still log errors normally', () => {
      reporter.error('Test error');
      
      expect(mockLogger.error).toHaveBeenCalledWith('Test error', {
        error: undefined,
        stack: undefined
      });
    });
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const instance1 = NullProgressReporter.getInstance();
      const instance2 = NullProgressReporter.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should create instance without activity logging', () => {
      const instance = NullProgressReporter.getInstance();
      
      instance.report('Test');
      
      // Should not log debug messages
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe('no-op behavior', () => {
    beforeEach(() => {
      reporter = new NullProgressReporter();
    });

    it('should handle multiple operations without side effects', () => {
      // Perform many operations
      reporter.report('Step 1');
      reporter.startTask('Task 1');
      reporter.report('Step 2', 'With detail');
      reporter.completeTask('Task 1');
      reporter.startTask('Task 2');
      reporter.report('Step 3');
      reporter.completeTask('Task 2');
      
      // Only errors and warnings should be logged
      expect(mockLogger.debug).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should be safe to use in production', () => {
      // Should not throw on any operation
      expect(() => {
        reporter.report('Test');
        reporter.startTask('Task');
        reporter.completeTask('Task');
        reporter.warn('Warning');
        reporter.error('Error');
      }).not.toThrow();
    });
  });
}); 