import { WebContents } from 'electron';
import { PDF_CHANNELS } from '../../constants/pdf-channels';
import { PDFProgressUpdate } from '../../../types/pdf-ipc';
import { createChildLogger } from '../../../utils/logger';

export interface ProgressSubscription {
  requestId: string;
  webContents: WebContents;
  startTime: number;
  lastUpdate: number;
}

/**
 * Manages progress update subscriptions and batches updates for performance
 */
export class ProgressManager {
  private static instance: ProgressManager;
  private subscriptions = new Map<string, ProgressSubscription>();
  private updateQueue = new Map<string, PDFProgressUpdate[]>();
  private logger = createChildLogger({ service: 'ProgressManager' });
  
  // Batch updates every 100ms
  private batchInterval: NodeJS.Timeout | null = null;
  
  static getInstance(): ProgressManager {
    if (!ProgressManager.instance) {
      ProgressManager.instance = new ProgressManager();
    }
    return ProgressManager.instance;
  }
  
  private constructor() {
    this.startBatchProcessor();
  }
  
  private startBatchProcessor(): void {
    this.batchInterval = setInterval(() => {
      this.processBatchedUpdates();
    }, 100);
  }
  
  private processBatchedUpdates(): void {
    for (const [requestId, updates] of this.updateQueue.entries()) {
      if (updates.length === 0) continue;
      
      const subscription = this.subscriptions.get(requestId);
      if (!subscription || subscription.webContents.isDestroyed()) {
        this.unsubscribe(requestId);
        this.updateQueue.delete(requestId);
        continue;
      }
      
      // Send only the latest update
      const latestUpdate = updates[updates.length - 1];
      
      try {
        subscription.webContents.send(PDF_CHANNELS.PROGRESS, latestUpdate);
        subscription.lastUpdate = Date.now();
      } catch (error) {
        this.logger.error('Failed to send progress update', error);
        this.unsubscribe(requestId);
      }
      
      // Clear the queue for this request
      this.updateQueue.set(requestId, []);
    }
  }
  
  subscribe(requestId: string, webContents: WebContents): void {
    if (webContents.isDestroyed()) {
      this.logger.warn('Attempted to subscribe with destroyed webContents', { requestId });
      return;
    }
    
    this.subscriptions.set(requestId, {
      requestId,
      webContents,
      startTime: Date.now(),
      lastUpdate: Date.now(),
    });
    
    // Initialize empty queue for this request
    this.updateQueue.set(requestId, []);
    
    this.logger.debug('Progress subscription added', { requestId });
  }
  
  unsubscribe(requestId: string): void {
    this.subscriptions.delete(requestId);
    this.updateQueue.delete(requestId);
    this.logger.debug('Progress subscription removed', { requestId });
  }
  
  sendProgress(update: PDFProgressUpdate): void {
    const subscription = this.subscriptions.get(update.requestId);
    if (!subscription) {
      // Not subscribed, ignore
      return;
    }
    
    if (subscription.webContents.isDestroyed()) {
      this.unsubscribe(update.requestId);
      return;
    }
    
    // Add to queue for batching
    const queue = this.updateQueue.get(update.requestId) || [];
    queue.push(update);
    this.updateQueue.set(update.requestId, queue);
  }
  
  /**
   * Send an immediate update without batching (for critical updates)
   */
  sendImmediate(update: PDFProgressUpdate): void {
    const subscription = this.subscriptions.get(update.requestId);
    if (!subscription || subscription.webContents.isDestroyed()) {
      this.unsubscribe(update.requestId);
      return;
    }
    
    try {
      subscription.webContents.send(PDF_CHANNELS.PROGRESS, update);
      subscription.lastUpdate = Date.now();
    } catch (error) {
      this.logger.error('Failed to send immediate progress update', error);
      this.unsubscribe(update.requestId);
    }
  }
  
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
  
  hasSubscription(requestId: string): boolean {
    return this.subscriptions.has(requestId);
  }
  
  getSubscriptionInfo(requestId: string): ProgressSubscription | undefined {
    return this.subscriptions.get(requestId);
  }
  
  cleanup(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
    
    // Send any remaining updates before cleanup
    this.processBatchedUpdates();
    
    this.subscriptions.clear();
    this.updateQueue.clear();
    
    this.logger.info('ProgressManager cleaned up');
  }
} 