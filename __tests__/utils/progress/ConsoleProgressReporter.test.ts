import { ConsoleProgressReporter } from '../../../src/utils/progress/ConsoleProgressReporter';
import ora from 'ora';

// Mock ora
jest.mock('ora');

describe('ConsoleProgressReporter', () => {
  let reporter: ConsoleProgressReporter;
  let mockSpinner: any;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock spinner methods
    mockSpinner = {
      start: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      warn: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      isSpinning: false,
      text: ''
    };
    
    // Mock ora to return our mock spinner
    (ora as jest.Mock).mockReturnValue(mockSpinner);
    
    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    // Create reporter instance
    reporter = new ConsoleProgressReporter();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('report', () => {
    it('should start a new spinner with the message', () => {
      reporter.report('Processing');
      
      expect(ora).toHaveBeenCalledWith('Processing');
      expect(mockSpinner.start).toHaveBeenCalled();
    });

    it('should include detail in the message when provided', () => {
      reporter.report('Processing', 'Step 1 of 3');
      
      expect(ora).toHaveBeenCalledWith('Processing - Step 1 of 3');
    });

    it('should update existing spinner text if already spinning', () => {
      mockSpinner.isSpinning = true;
      
      reporter.report('First message');
      reporter.report('Second message');
      
      expect(ora).toHaveBeenCalledTimes(1); // Only called once
      expect(mockSpinner.text).toBe('Second message');
    });
  });

  describe('startTask', () => {
    it('should start a new spinner with task name', () => {
      reporter.startTask('PDF Generation');
      
      expect(ora).toHaveBeenCalledWith('Starting PDF Generation...');
      expect(mockSpinner.start).toHaveBeenCalled();
    });

    it('should succeed previous spinner if one is running', () => {
      mockSpinner.isSpinning = true;
      
      reporter.startTask('Task 1');
      reporter.startTask('Task 2');
      
      expect(mockSpinner.succeed).toHaveBeenCalledTimes(1);
    });

    it('should track task start time when duration tracking enabled', () => {
      const reporterWithTracking = new ConsoleProgressReporter({ trackDuration: true });
      
      reporterWithTracking.startTask('Test Task');
      
      // Task should be tracked (we'll verify in completeTask test)
      expect(ora).toHaveBeenCalled();
    });
  });

  describe('completeTask', () => {
    it('should succeed the spinner with completion message', () => {
      // Need to have an active spinner first
      reporter.startTask('PDF Generation');
      reporter.completeTask('PDF Generation');
      
      expect(mockSpinner.succeed).toHaveBeenCalledWith('PDF Generation completed');
    });

    it('should show duration when task was tracked', async () => {
      const reporterWithTracking = new ConsoleProgressReporter({ trackDuration: true });
      
      reporterWithTracking.startTask('Test Task');
      
      // Wait a bit to simulate task duration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      reporterWithTracking.completeTask('Test Task');
      
      // Should include duration in message
      const successCall = mockSpinner.succeed.mock.calls[0][0];
      expect(successCall).toMatch(/Test Task completed \(\d+\.\d+s\)/);
    });

    it('should handle completion without active spinner', () => {
      // Don't create any spinner first
      const freshReporter = new ConsoleProgressReporter();
      freshReporter.completeTask('Some Task');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('✔ Some Task completed');
    });
  });

  describe('error', () => {
    it('should fail the spinner with error message', () => {
      // Need an active spinner
      reporter.startTask('Generation');
      reporter.error('Generation failed');
      
      expect(mockSpinner.fail).toHaveBeenCalledWith('Generation failed');
    });

    it('should log error details when provided', () => {
      const error = new Error('Test error');
      reporter.startTask('Operation');
      reporter.error('Operation failed', error);
      
      expect(mockSpinner.fail).toHaveBeenCalledWith('Operation failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Test error');
    });

    it('should handle error without active spinner', () => {
      const freshReporter = new ConsoleProgressReporter();
      freshReporter.error('Some error');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('✖ Some error');
    });
  });

  describe('warn', () => {
    it('should warn the spinner with warning message', () => {
      reporter.startTask('Processing');
      reporter.warn('Deprecated feature used');
      
      expect(mockSpinner.warn).toHaveBeenCalledWith('Deprecated feature used');
    });

    it('should handle warning without active spinner', () => {
      const freshReporter = new ConsoleProgressReporter();
      freshReporter.warn('Some warning');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠ Some warning');
    });
  });

  describe('stop', () => {
    it('should stop the spinner if running', () => {
      // Start a spinner first
      reporter.report('Processing');
      mockSpinner.isSpinning = true; // Make sure it's marked as spinning
      
      reporter.stop();
      
      expect(mockSpinner.stop).toHaveBeenCalled();
    });

    it('should handle stop when no spinner is active', () => {
      const freshReporter = new ConsoleProgressReporter();
      
      expect(() => freshReporter.stop()).not.toThrow();
    });
  });

  describe('options', () => {
    it('should respect includeTimestamps option', () => {
      const reporter = new ConsoleProgressReporter({ 
        includeTimestamps: true 
      });
      
      // Timestamps would be included in logger output
      reporter.report('Test');
      expect(ora).toHaveBeenCalled();
    });

    it('should disable duration tracking when specified', () => {
      const reporter = new ConsoleProgressReporter({ 
        trackDuration: false 
      });
      
      reporter.startTask('Test');
      reporter.completeTask('Test');
      
      expect(mockSpinner.succeed).toHaveBeenCalledWith('Test completed');
      // No duration in message
    });
  });
}); 