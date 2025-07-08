/**
 * Unit tests for the spinner utility
 */

import ora from 'ora';
import {
  SPINNER_STATES,
  createSpinner,
  createSpinnerWithState,
  withSpinner,
  createProgressSpinner
} from '../../src/utils/spinner';

// Mock ora
jest.mock('ora', () => {
  const mockOra = {
    start: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
    warn: jest.fn(),
    stop: jest.fn(),
    text: ''
  };
  
  return jest.fn(() => mockOra);
});

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn()
}));

describe('Spinner Utility', () => {
  const originalIsTTY = process.stdout.isTTY;
  const originalNodeEnv = process.env.NODE_ENV;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console output during tests
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    process.stdout.isTTY = originalIsTTY;
    process.env.NODE_ENV = originalNodeEnv;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('SPINNER_STATES', () => {
    it('should define all expected states', () => {
      expect(SPINNER_STATES).toHaveProperty('VALIDATING');
      expect(SPINNER_STATES).toHaveProperty('LOADING_TEMPLATE');
      expect(SPINNER_STATES).toHaveProperty('VALIDATING_INPUT');
      expect(SPINNER_STATES).toHaveProperty('CONNECTING_AI');
      expect(SPINNER_STATES).toHaveProperty('GENERATING');
      expect(SPINNER_STATES).toHaveProperty('SAVING');
      expect(SPINNER_STATES).toHaveProperty('SUCCESS');
      expect(SPINNER_STATES).toHaveProperty('ERROR');
      expect(SPINNER_STATES).toHaveProperty('WARNING');
    });

    it('should have correct emoji and messages', () => {
      expect(SPINNER_STATES.VALIDATING).toContain('⏳');
      expect(SPINNER_STATES.SUCCESS).toContain('✅');
      expect(SPINNER_STATES.ERROR).toContain('❌');
      expect(SPINNER_STATES.WARNING).toContain('⚠️');
    });
  });

  describe('createSpinner', () => {
    describe('TTY mode', () => {
      beforeEach(() => {
        process.stdout.isTTY = true;
        process.env.NODE_ENV = 'development';
      });

      it('should create ora spinner in TTY mode', () => {
        const spinner = createSpinner('Loading...');
        
        expect(ora).toHaveBeenCalledWith({
          text: 'Loading...',
          color: 'cyan',
          spinner: 'dots'
        });
        expect(spinner.ora).toBeDefined();
        expect(spinner.isSpinning).toBe(true);
      });

      it('should start the spinner immediately', () => {
        createSpinner('Test');
        const oraInstance = (ora as jest.Mock).mock.results[0].value;
        
        expect(oraInstance.start).toHaveBeenCalled();
      });

      it('should update message', () => {
        const spinner = createSpinner('Initial');
        const oraInstance = (ora as jest.Mock).mock.results[0].value;
        
        spinner.updateMessage('Updated');
        expect(oraInstance.text).toBe('Updated');
      });

      it('should handle success', () => {
        const spinner = createSpinner('Test');
        const oraInstance = (ora as jest.Mock).mock.results[0].value;
        
        spinner.success('Done!');
        expect(oraInstance.succeed).toHaveBeenCalledWith('Done!');
        expect(spinner.isSpinning).toBe(false);
      });

      it('should handle failure', () => {
        const spinner = createSpinner('Test');
        const oraInstance = (ora as jest.Mock).mock.results[0].value;
        
        spinner.fail('Error!');
        expect(oraInstance.fail).toHaveBeenCalledWith('Error!');
        expect(spinner.isSpinning).toBe(false);
      });

      it('should handle warning', () => {
        const spinner = createSpinner('Test');
        const oraInstance = (ora as jest.Mock).mock.results[0].value;
        
        spinner.warn('Warning!');
        expect(oraInstance.warn).toHaveBeenCalledWith('Warning!');
        expect(spinner.isSpinning).toBe(false);
      });

      it('should stop spinner', () => {
        const spinner = createSpinner('Test');
        const oraInstance = (ora as jest.Mock).mock.results[0].value;
        
        spinner.stop();
        expect(oraInstance.stop).toHaveBeenCalled();
        expect(spinner.isSpinning).toBe(false);
      });

      it('should accept custom options', () => {
        createSpinner('Test', { color: 'red', spinner: 'line' });
        
        expect(ora).toHaveBeenCalledWith({
          text: 'Test',
          color: 'red',
          spinner: 'line'
        });
      });
    });

    describe('Non-TTY mode', () => {
      beforeEach(() => {
        process.stdout.isTTY = false;
      });

      it('should create non-TTY spinner', () => {
        const spinner = createSpinner('Loading...');
        
        expect(ora).not.toHaveBeenCalled();
        expect(spinner.ora).toBeUndefined();
        expect(spinner.isSpinning).toBe(false);
        expect(consoleLogSpy).toHaveBeenCalledWith('Loading...');
      });

      it('should update message via console', () => {
        const spinner = createSpinner('Initial');
        consoleLogSpy.mockClear();
        
        spinner.updateMessage('Updated');
        expect(consoleLogSpy).toHaveBeenCalledWith('Updated');
      });

      it('should handle success via console', () => {
        const spinner = createSpinner('Test');
        consoleLogSpy.mockClear();
        
        spinner.success('Done!');
        expect(consoleLogSpy).toHaveBeenCalledWith('✅ Done!');
      });

      it('should handle failure via console', () => {
        const spinner = createSpinner('Test');
        
        spinner.fail('Error!');
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error!');
      });

      it('should handle warning via console', () => {
        const spinner = createSpinner('Test');
        
        spinner.warn('Warning!');
        expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  Warning!');
      });

      it('should handle stop (no-op)', () => {
        const spinner = createSpinner('Test');
        consoleLogSpy.mockClear();
        
        spinner.stop();
        expect(consoleLogSpy).not.toHaveBeenCalled();
      });
    });

    describe('Test environment', () => {
      beforeEach(() => {
        process.stdout.isTTY = true;
        process.env.NODE_ENV = 'test';
      });

      it('should use non-TTY mode in test environment', () => {
        const spinner = createSpinner('Test');
        
        expect(ora).not.toHaveBeenCalled();
        expect(spinner.ora).toBeUndefined();
      });
    });
  });

  describe('createSpinnerWithState', () => {
    beforeEach(() => {
      process.stdout.isTTY = false;
    });

    it('should create spinner with predefined state', () => {
      createSpinnerWithState('LOADING_TEMPLATE');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(SPINNER_STATES.LOADING_TEMPLATE);
    });

    it('should work with all states', () => {
      const states: Array<keyof typeof SPINNER_STATES> = [
        'VALIDATING',
        'LOADING_TEMPLATE',
        'VALIDATING_INPUT',
        'CONNECTING_AI',
        'GENERATING',
        'SAVING',
        'SUCCESS',
        'ERROR',
        'WARNING'
      ];

      states.forEach(state => {
        consoleLogSpy.mockClear();
        createSpinnerWithState(state);
        expect(consoleLogSpy).toHaveBeenCalledWith(SPINNER_STATES[state]);
      });
    });
  });

  describe('withSpinner', () => {
    beforeEach(() => {
      process.stdout.isTTY = false;
    });

    it('should execute function with spinner and show success', async () => {
      const result = await withSpinner(
        'Processing...',
        () => 'result',
        'Success!',
        'Failed!'
      );

      expect(consoleLogSpy).toHaveBeenCalledWith('Processing...');
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Success!');
      expect(result).toBe('result');
    });

    it('should execute async function with spinner', async () => {
      const result = await withSpinner(
        'Processing...',
        async () => {
          await Promise.resolve();
          return 42;
        }
      );

      expect(result).toBe(42);
    });

    it('should handle errors and show failure message', async () => {
      const error = new Error('Test error');
      
      await expect(
        withSpinner(
          'Processing...',
          () => { throw error; },
          'Success!',
          'Operation failed'
        )
      ).rejects.toThrow(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Operation failed');
    });

    it('should use default messages when not provided', async () => {
      await withSpinner('Processing...', () => 'done');
      
      // Should succeed without custom message (uses current spinner text)
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Processing...');
    });
  });

  describe('createProgressSpinner', () => {
    beforeEach(() => {
      process.stdout.isTTY = false;
    });

    it('should create progress spinner with steps', () => {
      const progress = createProgressSpinner(['Step 1', 'Step 2', 'Step 3']);
      
      expect(progress).toHaveProperty('next');
      expect(progress).toHaveProperty('complete');
      expect(progress).toHaveProperty('fail');
      expect(progress).toHaveProperty('getCurrentStep');
    });

    it('should progress through steps', async () => {
      const progress = createProgressSpinner(['Step 1', 'Step 2', 'Step 3']);
      
      await progress.next();
      expect(consoleLogSpy).toHaveBeenCalledWith('[1/3] Step 1');
      expect(progress.getCurrentStep()).toBe(0);
      
      consoleLogSpy.mockClear();
      await progress.next();
      expect(consoleLogSpy).toHaveBeenCalledWith('[2/3] Step 2');
      expect(progress.getCurrentStep()).toBe(1);
      
      consoleLogSpy.mockClear();
      await progress.next();
      expect(consoleLogSpy).toHaveBeenCalledWith('[3/3] Step 3');
      expect(progress.getCurrentStep()).toBe(2);
    });

    it('should throw error when no more steps', async () => {
      const progress = createProgressSpinner(['Step 1']);
      
      await progress.next();
      await expect(progress.next()).rejects.toThrow('No more steps');
    });

    it('should complete with success message', async () => {
      const progress = createProgressSpinner(['Step 1']);
      
      await progress.next();
      await progress.complete('All done!');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ All done!');
    });

    it('should complete with default message', async () => {
      const progress = createProgressSpinner(['Step 1']);
      
      await progress.next();
      await progress.complete();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ All steps completed!');
    });

    it('should fail with error message', async () => {
      const progress = createProgressSpinner(['Step 1', 'Step 2']);
      
      await progress.next();
      await progress.fail('Something went wrong');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Something went wrong');
    });

    it('should fail with default message', async () => {
      const progress = createProgressSpinner(['Step 1', 'Step 2']);
      
      await progress.next();
      await progress.next();
      await progress.fail();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Failed at step 2: Step 2');
    });

    it('should update existing spinner on subsequent next calls', async () => {
      process.stdout.isTTY = true;
      process.env.NODE_ENV = 'development';
      
      const progress = createProgressSpinner(['Step 1', 'Step 2']);
      
      await progress.next();
      const oraInstance1 = (ora as jest.Mock).mock.results[0].value;
      
      await progress.next();
      // Should not create a new ora instance
      expect(ora).toHaveBeenCalledTimes(1);
      expect(oraInstance1.text).toBe('[2/2] Step 2');
    });
  });
}); 