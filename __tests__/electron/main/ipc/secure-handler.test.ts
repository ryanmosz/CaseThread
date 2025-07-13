import { ipcMain, IpcMainInvokeEvent } from 'electron';

// Mock electron
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../../../src/utils/logger', () => ({
  createChildLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock SecurityValidator
jest.mock('../../../../src/electron/main/ipc/security-validator', () => {
  const mockValidator = {
    isChannelAllowed: jest.fn(),
  };
  
  return {
    SecurityValidator: {
      getInstance: jest.fn(() => mockValidator),
    },
  };
});

// Import after mocks
import { SecureIPCHandler } from '../../../../src/electron/main/ipc/secure-handler';
import { SecurityValidator } from '../../../../src/electron/main/ipc/security-validator';

describe('SecureIPCHandler', () => {
  let mockEvent: IpcMainInvokeEvent;
  let mockValidator: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear rate limit map
    (SecureIPCHandler as any).rateLimitMap.clear();
    
    // Get mock validator instance
    mockValidator = SecurityValidator.getInstance();
    
    mockEvent = {
      sender: { id: 1 },
    } as any;
  });

  afterEach(() => {
    // Cleanup interval
    clearInterval((SecureIPCHandler as any).cleanupInterval);
  });

  describe('handle method', () => {
    it('should register handler with ipcMain', () => {
      const handler = jest.fn();
      mockValidator.isChannelAllowed.mockReturnValue(true);
      
      SecureIPCHandler.handle('test:channel', handler);
      
      expect(ipcMain.handle).toHaveBeenCalledWith('test:channel', expect.any(Function));
    });

    it('should check if channel is allowed', async () => {
      const handler = jest.fn().mockResolvedValue('success');
      mockValidator.isChannelAllowed.mockReturnValue(false);
      
      SecureIPCHandler.handle('forbidden:channel', handler);
      
      const wrappedHandler = (ipcMain.handle as jest.Mock).mock.calls[0][1];
      
      await expect(wrappedHandler(mockEvent)).rejects.toMatchObject({
        message: 'Unauthorized channel access',
        code: 'IPC_ERROR',
      });
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should apply custom validation', async () => {
      const handler = jest.fn().mockResolvedValue('success');
      const validator = jest.fn().mockReturnValue({ valid: false, error: 'Invalid data' });
      mockValidator.isChannelAllowed.mockReturnValue(true);
      
      SecureIPCHandler.handle('test:channel', handler, validator);
      
      const wrappedHandler = (ipcMain.handle as jest.Mock).mock.calls[0][1];
      
      await expect(wrappedHandler(mockEvent, 'data')).rejects.toMatchObject({
        message: 'Invalid data',
        code: 'IPC_ERROR',
      });
      
      expect(validator).toHaveBeenCalledWith(mockEvent, 'data');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should use sanitized args when provided', async () => {
      const handler = jest.fn().mockResolvedValue('success');
      const sanitizedData = { clean: 'data' };
      const validator = jest.fn().mockReturnValue({ 
        valid: true, 
        sanitized: sanitizedData 
      });
      mockValidator.isChannelAllowed.mockReturnValue(true);
      
      SecureIPCHandler.handle('test:channel', handler, validator);
      
      const wrappedHandler = (ipcMain.handle as jest.Mock).mock.calls[0][1];
      const result = await wrappedHandler(mockEvent, 'dirty-data');
      
      expect(handler).toHaveBeenCalledWith(mockEvent, sanitizedData);
      expect(result).toBe('success');
    });

    it('should handle errors gracefully', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Handler failed'));
      mockValidator.isChannelAllowed.mockReturnValue(true);
      
      SecureIPCHandler.handle('test:channel', handler);
      
      const wrappedHandler = (ipcMain.handle as jest.Mock).mock.calls[0][1];
      
      await expect(wrappedHandler(mockEvent)).rejects.toMatchObject({
        message: 'Handler failed',
        code: 'IPC_ERROR',
      });
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      mockValidator.isChannelAllowed.mockReturnValue(true);
    });

    it('should allow requests within rate limit', async () => {
      const handler = jest.fn().mockResolvedValue('success');
      SecureIPCHandler.handle('test:channel', handler);
      
      const wrappedHandler = (ipcMain.handle as jest.Mock).mock.calls[0][1];
      
      // Make 10 requests (well below limit)
      for (let i = 0; i < 10; i++) {
        const result = await wrappedHandler(mockEvent);
        expect(result).toBe('success');
      }
      
      expect(handler).toHaveBeenCalledTimes(10);
    });

    it('should block requests exceeding rate limit', async () => {
      const handler = jest.fn().mockResolvedValue('success');
      const maxRequests = (SecureIPCHandler as any).RATE_LIMIT_MAX;
      
      SecureIPCHandler.handle('test:channel', handler);
      const wrappedHandler = (ipcMain.handle as jest.Mock).mock.calls[0][1];
      
      // Make requests up to the limit
      for (let i = 0; i < maxRequests; i++) {
        await wrappedHandler(mockEvent);
      }
      
      // Next request should be blocked
      await expect(wrappedHandler(mockEvent)).rejects.toMatchObject({
        message: 'Rate limit exceeded',
        code: 'IPC_ERROR',
      });
      
      expect(handler).toHaveBeenCalledTimes(maxRequests);
    });

    it('should track rate limits per channel and sender', async () => {
      const handler1 = jest.fn().mockResolvedValue('success1');
      const handler2 = jest.fn().mockResolvedValue('success2');
      const maxRequests = (SecureIPCHandler as any).RATE_LIMIT_MAX;
      
      SecureIPCHandler.handle('channel:one', handler1);
      SecureIPCHandler.handle('channel:two', handler2);
      
      const wrappedHandler1 = (ipcMain.handle as jest.Mock).mock.calls[0][1];
      const wrappedHandler2 = (ipcMain.handle as jest.Mock).mock.calls[1][1];
      
      // Fill up rate limit for channel:one
      for (let i = 0; i < maxRequests; i++) {
        await wrappedHandler1(mockEvent);
      }
      
      // channel:two should still work
      const result = await wrappedHandler2(mockEvent);
      expect(result).toBe('success2');
      
      // Different sender should also work
      const otherEvent = { sender: { id: 2 } } as any;
      const result2 = await wrappedHandler1(otherEvent);
      expect(result2).toBe('success1');
    });

    it('should clean up old timestamps', async () => {
      jest.useFakeTimers();
      
      const handler = jest.fn().mockResolvedValue('success');
      SecureIPCHandler.handle('test:channel', handler);
      
      const wrappedHandler = (ipcMain.handle as jest.Mock).mock.calls[0][1];
      
      // Make some requests
      await wrappedHandler(mockEvent);
      await wrappedHandler(mockEvent);
      
      // Fast forward past the rate limit window
      jest.advanceTimersByTime(61000); // 61 seconds
      
      // Should be able to make requests again
      const result = await wrappedHandler(mockEvent);
      expect(result).toBe('success');
      
      jest.useRealTimers();
    });
  });

  describe('getRateLimitStats', () => {
    it('should return current rate limit statistics', async () => {
      mockValidator.isChannelAllowed.mockReturnValue(true);
      
      const handler = jest.fn().mockResolvedValue('success');
      SecureIPCHandler.handle('test:channel', handler);
      
      const wrappedHandler = (ipcMain.handle as jest.Mock).mock.calls[0][1];
      
      // Make some requests
      await wrappedHandler(mockEvent);
      await wrappedHandler(mockEvent);
      await wrappedHandler(mockEvent);
      
      const stats = SecureIPCHandler.getRateLimitStats();
      expect(stats['1-test:channel']).toBe(3);
    });
  });

  describe('cleanup', () => {
    it('should clear rate limit map and interval', () => {
      // Add some data to rate limit map
      (SecureIPCHandler as any).rateLimitMap.set('test', [1, 2, 3]);
      
      SecureIPCHandler.cleanup();
      
      expect((SecureIPCHandler as any).rateLimitMap.size).toBe(0);
    });
  });
}); 