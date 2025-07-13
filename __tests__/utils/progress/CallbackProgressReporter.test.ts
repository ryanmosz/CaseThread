import { CallbackProgressReporter } from '../../../src/utils/progress/CallbackProgressReporter';
import { ProgressEvent } from '../../../src/types/progress';

describe('CallbackProgressReporter', () => {
  let events: ProgressEvent[];
  let callback: jest.Mock;
  let reporter: CallbackProgressReporter;

  beforeEach(() => {
    events = [];
    callback = jest.fn((event: ProgressEvent) => {
      events.push(event);
    });
    reporter = new CallbackProgressReporter(callback);
  });

  describe('report', () => {
    it('should emit progress event with message', () => {
      reporter.report('Processing document');
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(events[0]).toMatchObject({
        type: 'progress',
        message: 'Processing document',
        timestamp: expect.any(Date)
      });
    });

    it('should include detail when provided', () => {
      reporter.report('Processing', 'Page 1 of 10');
      
      expect(events[0]).toMatchObject({
        type: 'progress',
        message: 'Processing',
        detail: 'Page 1 of 10'
      });
    });
  });

  describe('startTask', () => {
    it('should emit start event with task name', () => {
      reporter.startTask('PDF Generation');
      
      expect(events[0]).toMatchObject({
        type: 'start',
        taskName: 'PDF Generation',
        message: 'Starting PDF Generation'
      });
    });

    it('should track task start time', () => {
      const beforeStart = Date.now();
      reporter.startTask('Test Task');
      const afterStart = Date.now();
      
      const eventTime = events[0].timestamp.getTime();
      expect(eventTime).toBeGreaterThanOrEqual(beforeStart);
      expect(eventTime).toBeLessThanOrEqual(afterStart);
    });
  });

  describe('completeTask', () => {
    it('should emit complete event with task name', () => {
      reporter.completeTask('PDF Generation');
      
      expect(events[0]).toMatchObject({
        type: 'complete',
        taskName: 'PDF Generation',
        message: 'PDF Generation completed'
      });
    });

    it('should include duration when task was tracked', async () => {
      reporter.startTask('Test Task');
      
      // Wait to simulate task duration
      await new Promise(resolve => setTimeout(resolve, 50));
      
      reporter.completeTask('Test Task');
      
      const completeEvent = events[1]; // Second event (after start)
      expect(completeEvent.message).toMatch(/Test Task completed in \d+\.\d+s/);
      expect(completeEvent.detail).toMatch(/Duration: \d+ms/);
    });

    it('should handle completion without prior start', () => {
      reporter.completeTask('Unknown Task');
      
      expect(events[0]).toMatchObject({
        type: 'complete',
        taskName: 'Unknown Task',
        message: 'Unknown Task completed'
      });
      expect(events[0].detail).toBeUndefined();
    });
  });

  describe('error', () => {
    it('should emit error event', () => {
      reporter.error('Operation failed');
      
      expect(events[0]).toMatchObject({
        type: 'error',
        message: 'Operation failed'
      });
    });

    it('should include error object and detail', () => {
      const error = new Error('Network timeout');
      reporter.error('Request failed', error);
      
      expect(events[0]).toMatchObject({
        type: 'error',
        message: 'Request failed',
        error: error,
        detail: 'Network timeout'
      });
    });
  });

  describe('warn', () => {
    it('should emit warning event', () => {
      reporter.warn('Deprecated method used');
      
      expect(events[0]).toMatchObject({
        type: 'warning',
        message: 'Deprecated method used'
      });
    });
  });

  describe('callback error handling', () => {
    it('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      
      const reporterWithError = new CallbackProgressReporter(errorCallback);
      
      // Should not throw
      expect(() => reporterWithError.report('Test')).not.toThrow();
      expect(errorCallback).toHaveBeenCalled();
    });
  });

  describe('event counting', () => {
    it('should track total event count', () => {
      reporter.report('Event 1');
      reporter.startTask('Task 1');
      reporter.completeTask('Task 1');
      reporter.warn('Warning 1');
      reporter.error('Error 1');
      
      expect(reporter.getEventCount()).toBe(5);
    });
  });

  describe('options', () => {
    it('should include timestamps by default', () => {
      const reporter = new CallbackProgressReporter(callback);
      reporter.report('Test');
      
      expect(events[0].timestamp).toBeInstanceOf(Date);
    });

    it('should track duration by default', async () => {
      const reporter = new CallbackProgressReporter(callback);
      reporter.startTask('Task');
      
      // Wait a bit to ensure duration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      reporter.completeTask('Task');
      
      expect(events[1].detail).toMatch(/Duration:/);
    });

    it('should respect custom options', () => {
      const reporter = new CallbackProgressReporter(callback, {
        trackDuration: false
      });
      
      reporter.startTask('Task');
      reporter.completeTask('Task');
      
      expect(events[1].detail).toBeUndefined();
    });
  });

  describe('simple factory', () => {
    it('should create simplified callback reporter', () => {
      const messages: Array<{message: string, detail?: string}> = [];
      
      const simpleReporter = CallbackProgressReporter.simple((message, detail) => {
        messages.push({ message, detail });
      });
      
      simpleReporter.report('Test', 'Detail');
      simpleReporter.error('Error occurred');
      
      expect(messages).toEqual([
        { message: 'Test', detail: 'Detail' },
        { message: 'Error occurred', detail: undefined }
      ]);
    });
  });
}); 