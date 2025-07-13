import { WebContents } from 'electron';
import { ProgressManager } from '../../../../src/electron/main/ipc/progress-manager';
import { PDF_CHANNELS } from '../../../../src/electron/constants/pdf-channels';
import { PDFProgressUpdate } from '../../../../src/types/pdf-ipc';

// Mock electron WebContents
function createMockWebContents(isDestroyed = false): WebContents {
  return {
    id: 1,
    send: jest.fn(),
    isDestroyed: jest.fn().mockReturnValue(isDestroyed),
  } as any;
}

describe('ProgressManager', () => {
  let manager: ProgressManager;

  beforeEach(() => {
    // Clear singleton instance
    (ProgressManager as any).instance = null;
    manager = ProgressManager.getInstance();
  });

  afterEach(() => {
    manager.cleanup();
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ProgressManager.getInstance();
      const instance2 = ProgressManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Subscription Management', () => {
    it('should add subscription', () => {
      const mockWebContents = createMockWebContents();
      
      manager.subscribe('test-123', mockWebContents);
      
      expect(manager.getActiveSubscriptions()).toContain('test-123');
      expect(manager.hasSubscription('test-123')).toBe(true);
    });

    it('should not add subscription with destroyed webContents', () => {
      const mockWebContents = createMockWebContents(true);
      
      manager.subscribe('test-123', mockWebContents);
      
      expect(manager.getActiveSubscriptions()).not.toContain('test-123');
    });

    it('should remove subscription', () => {
      const mockWebContents = createMockWebContents();
      
      manager.subscribe('test-123', mockWebContents);
      manager.unsubscribe('test-123');
      
      expect(manager.getActiveSubscriptions()).not.toContain('test-123');
      expect(manager.hasSubscription('test-123')).toBe(false);
    });

    it('should get subscription info', () => {
      const mockWebContents = createMockWebContents();
      const now = Date.now();
      
      manager.subscribe('test-123', mockWebContents);
      const info = manager.getSubscriptionInfo('test-123');
      
      expect(info).toBeDefined();
      expect(info?.requestId).toBe('test-123');
      expect(info?.webContents).toBe(mockWebContents);
      expect(info?.startTime).toBeGreaterThanOrEqual(now);
    });
  });

  describe('Progress Updates', () => {
    it('should batch progress updates', async () => {
      const mockWebContents = createMockWebContents();
      manager.subscribe('test-123', mockWebContents);

      // Send multiple updates quickly
      for (let i = 0; i < 10; i++) {
        manager.sendProgress({
          requestId: 'test-123',
          step: `Step ${i}`,
          detail: `Detail ${i}`,
          percentage: i * 10,
          timestamp: new Date(),
        });
      }

      // Updates should be queued, not sent immediately
      expect(mockWebContents.send).not.toHaveBeenCalled();

      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should only send the latest update
      expect(mockWebContents.send).toHaveBeenCalledTimes(1);
      expect(mockWebContents.send).toHaveBeenCalledWith(
        PDF_CHANNELS.PROGRESS,
        expect.objectContaining({ 
          step: 'Step 9',
          percentage: 90,
        })
      );
    });

    it('should send immediate updates', () => {
      const mockWebContents = createMockWebContents();
      manager.subscribe('test-123', mockWebContents);

      const update: PDFProgressUpdate = {
        requestId: 'test-123',
        step: 'Critical Step',
        detail: 'Important',
        percentage: 50,
        timestamp: new Date(),
      };

      manager.sendImmediate(update);

      expect(mockWebContents.send).toHaveBeenCalledTimes(1);
      expect(mockWebContents.send).toHaveBeenCalledWith(PDF_CHANNELS.PROGRESS, update);
    });

    it('should ignore updates for non-subscribed requests', () => {
      const mockWebContents = createMockWebContents();
      
      manager.sendProgress({
        requestId: 'not-subscribed',
        step: 'Step',
        detail: '',
        percentage: 50,
        timestamp: new Date(),
      });

      // Wait for batch processing
      setTimeout(() => {
        expect(mockWebContents.send).not.toHaveBeenCalled();
      }, 150);
    });

    it('should unsubscribe if webContents is destroyed', async () => {
      const mockWebContents = createMockWebContents();
      manager.subscribe('test-123', mockWebContents);

      // Simulate webContents being destroyed
      (mockWebContents.isDestroyed as jest.Mock).mockReturnValue(true);

      manager.sendProgress({
        requestId: 'test-123',
        step: 'Step',
        detail: '',
        percentage: 50,
        timestamp: new Date(),
      });

      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(manager.hasSubscription('test-123')).toBe(false);
    });

    it('should handle send errors gracefully', () => {
      const mockWebContents = createMockWebContents();
      mockWebContents.send = jest.fn().mockImplementation(() => {
        throw new Error('Send failed');
      });

      manager.subscribe('test-123', mockWebContents);
      
      // Should not throw
      expect(() => {
        manager.sendImmediate({
          requestId: 'test-123',
          step: 'Step',
          detail: '',
          percentage: 50,
          timestamp: new Date(),
        });
      }).not.toThrow();

      // Should unsubscribe on error
      expect(manager.hasSubscription('test-123')).toBe(false);
    });
  });

  describe('Batch Processing', () => {
    it('should process batched updates at regular intervals', async () => {
      const mockWebContents = createMockWebContents();
      manager.subscribe('test-123', mockWebContents);

      // Send first batch
      manager.sendProgress({
        requestId: 'test-123',
        step: 'Step 1',
        detail: '',
        percentage: 10,
        timestamp: new Date(),
      });

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockWebContents.send).toHaveBeenCalledTimes(1);

      // Send second batch
      manager.sendProgress({
        requestId: 'test-123',
        step: 'Step 2',
        detail: '',
        percentage: 20,
        timestamp: new Date(),
      });

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockWebContents.send).toHaveBeenCalledTimes(2);
    });

    it('should clear queue after processing', async () => {
      const mockWebContents = createMockWebContents();
      manager.subscribe('test-123', mockWebContents);

      // Send updates
      manager.sendProgress({
        requestId: 'test-123',
        step: 'Step 1',
        detail: '',
        percentage: 10,
        timestamp: new Date(),
      });

      await new Promise(resolve => setTimeout(resolve, 150));

      // Send more updates
      manager.sendProgress({
        requestId: 'test-123',
        step: 'Step 2',
        detail: '',
        percentage: 20,
        timestamp: new Date(),
      });

      await new Promise(resolve => setTimeout(resolve, 150));

      // Should have sent exactly 2 updates (not accumulating)
      expect(mockWebContents.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all subscriptions', () => {
      const mockWebContents1 = createMockWebContents();
      const mockWebContents2 = createMockWebContents();

      manager.subscribe('test-1', mockWebContents1);
      manager.subscribe('test-2', mockWebContents2);

      expect(manager.getActiveSubscriptions()).toHaveLength(2);

      manager.cleanup();

      expect(manager.getActiveSubscriptions()).toHaveLength(0);
    });

    it('should send remaining updates before cleanup', async () => {
      const mockWebContents = createMockWebContents();
      manager.subscribe('test-123', mockWebContents);

      // Queue an update
      manager.sendProgress({
        requestId: 'test-123',
        step: 'Final Step',
        detail: '',
        percentage: 100,
        timestamp: new Date(),
      });

      // Cleanup should process remaining updates
      manager.cleanup();

      expect(mockWebContents.send).toHaveBeenCalledWith(
        PDF_CHANNELS.PROGRESS,
        expect.objectContaining({ step: 'Final Step' })
      );
    });

    it('should stop batch processing after cleanup', async () => {
      manager.cleanup();

      const mockWebContents = createMockWebContents();
      manager.subscribe('test-123', mockWebContents);

      manager.sendProgress({
        requestId: 'test-123',
        step: 'Step',
        detail: '',
        percentage: 50,
        timestamp: new Date(),
      });

      // Wait for what would be batch processing time
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should not send because batch processor was stopped
      expect(mockWebContents.send).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Subscriptions', () => {
    it('should handle multiple concurrent subscriptions', async () => {
      const mockWebContents1 = createMockWebContents();
      const mockWebContents2 = createMockWebContents();

      manager.subscribe('test-1', mockWebContents1);
      manager.subscribe('test-2', mockWebContents2);

      manager.sendProgress({
        requestId: 'test-1',
        step: 'Step 1',
        detail: '',
        percentage: 50,
        timestamp: new Date(),
      });

      manager.sendProgress({
        requestId: 'test-2',
        step: 'Step 2',
        detail: '',
        percentage: 75,
        timestamp: new Date(),
      });

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockWebContents1.send).toHaveBeenCalledWith(
        PDF_CHANNELS.PROGRESS,
        expect.objectContaining({ requestId: 'test-1' })
      );

      expect(mockWebContents2.send).toHaveBeenCalledWith(
        PDF_CHANNELS.PROGRESS,
        expect.objectContaining({ requestId: 'test-2' })
      );
    });
  });
}); 