/**
 * Tests for retry utility
 */

import { withRetry, withTimeout } from '../../src/utils/retry';

describe('Retry Utility', () => {
  describe('withRetry', () => {
    it('should return result on first successful attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await withRetry(mockFn, {
        maxAttempts: 3,
        delayMs: 10,
        backoffMultiplier: 2,
        maxDelayMs: 100
      });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('success');

      const onRetry = jest.fn();
      
      const result = await withRetry(mockFn, {
        maxAttempts: 3,
        delayMs: 10,
        backoffMultiplier: 2,
        maxDelayMs: 100
      }, onRetry);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it('should throw error after max attempts', async () => {
      const error = new Error('Always fails');
      const mockFn = jest.fn().mockRejectedValue(error);
      const onRetry = jest.fn();

      await expect(
        withRetry(mockFn, {
          maxAttempts: 3,
          delayMs: 10,
          backoffMultiplier: 2,
          maxDelayMs: 100
        }, onRetry)
      ).rejects.toThrow('Always fails');

      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenCalledTimes(2); // Called on retry, not on final failure
    });

    it('should apply exponential backoff', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
      const delays: number[] = [];
      
      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((fn: any, delay?: number) => {
        delays.push(delay || 0);
        return originalSetTimeout(fn, 0); // Execute immediately for test
      }) as any;

      try {
        await withRetry(mockFn, {
          maxAttempts: 4,
          delayMs: 100,
          backoffMultiplier: 2,
          maxDelayMs: 1000
        });
      } catch {
        // Expected to fail
      }

      global.setTimeout = originalSetTimeout;

      expect(delays).toEqual([100, 200, 400]); // 100, 100*2, 100*4
    });

    it('should respect max delay', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
      const delays: number[] = [];
      
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((fn: any, delay?: number) => {
        delays.push(delay || 0);
        return originalSetTimeout(fn, 0);
      }) as any;

      try {
        await withRetry(mockFn, {
          maxAttempts: 4,
          delayMs: 100,
          backoffMultiplier: 10,
          maxDelayMs: 300
        });
      } catch {
        // Expected to fail
      }

      global.setTimeout = originalSetTimeout;

      expect(delays).toEqual([100, 300, 300]); // 100, 1000 capped to 300, 10000 capped to 300
    });
  });

  describe('withTimeout', () => {
    it('should return result if promise resolves before timeout', async () => {
      const promise = new Promise(resolve => 
        setTimeout(() => resolve('success'), 50)
      );

      const result = await withTimeout(
        promise,
        100,
        new Error('Timeout')
      );

      expect(result).toBe('success');
    });

    it('should throw timeout error if promise takes too long', async () => {
      const promise = new Promise(resolve => 
        setTimeout(() => resolve('success'), 200)
      );

      await expect(
        withTimeout(promise, 50, new Error('Custom timeout'))
      ).rejects.toThrow('Custom timeout');
    });

    it('should clear timeout after successful resolution', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const promise = Promise.resolve('immediate');
      
      await withTimeout(promise, 1000, new Error('Timeout'));

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should clear timeout after rejection', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const promise = Promise.reject(new Error('Immediate rejection'));
      
      await expect(
        withTimeout(promise, 1000, new Error('Timeout'))
      ).rejects.toThrow('Immediate rejection');

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should handle promise that rejects before timeout', async () => {
      const error = new Error('Promise error');
      const promise = Promise.reject(error);

      await expect(
        withTimeout(promise, 1000, new Error('Timeout'))
      ).rejects.toThrow('Promise error');
    });
  });

  describe('withRetry and withTimeout combined', () => {
    it('should retry timeouts', async () => {
      let attempt = 0;
      const mockFn = jest.fn().mockImplementation(async () => {
        attempt++;
        if (attempt === 1) {
          // First attempt times out
          await new Promise(resolve => setTimeout(resolve, 200));
          return 'should not reach';
        }
        // Second attempt succeeds quickly
        return 'success';
      });

      const result = await withRetry(
        async () => {
          return await withTimeout(
            mockFn(),
            100,
            new Error('Timeout')
          );
        },
        {
          maxAttempts: 2,
          delayMs: 10,
          backoffMultiplier: 2,
          maxDelayMs: 100
        }
      );

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });
}); 