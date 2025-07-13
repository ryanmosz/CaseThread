import { IpcMainInvokeEvent, ipcMain } from 'electron';
import { PDF_CHANNELS } from '../../constants/pdf-channels';
import { ProgressManager } from './progress-manager';
import { createChildLogger } from '../../../utils/logger';
import { SecureIPCHandler } from './secure-handler';
import { SecurityValidator } from './security-validator';

/**
 * Handles IPC communication for progress subscriptions
 */
export class ProgressHandlers {
  private static instance: ProgressHandlers;
  private progressManager = ProgressManager.getInstance();
  private logger = createChildLogger({ service: 'ProgressHandlers' });
  
  static getInstance(): ProgressHandlers {
    if (!ProgressHandlers.instance) {
      ProgressHandlers.instance = new ProgressHandlers();
    }
    return ProgressHandlers.instance;
  }
  
  private constructor() {
    this.setupHandlers();
  }
  
  private setupHandlers(): void {
    const validator = SecurityValidator.getInstance();
    
    // Subscribe to progress updates
    SecureIPCHandler.handle(
      PDF_CHANNELS.SUBSCRIBE_PROGRESS,
      this.handleSubscribe.bind(this),
      (event, requestId) => validator.validateStringParam(event, requestId, 100)
    );
    
    // Unsubscribe from progress updates
    SecureIPCHandler.handle(
      PDF_CHANNELS.UNSUBSCRIBE_PROGRESS,
      this.handleUnsubscribe.bind(this),
      (event, requestId) => validator.validateStringParam(event, requestId, 100)
    );
    
    // Get all active subscriptions (for debugging)
    SecureIPCHandler.handle(
      PDF_CHANNELS.GET_ACTIVE_PROGRESS,
      this.handleGetActive.bind(this)
    );
    
    this.logger.debug('Progress IPC handlers registered with security validation');
  }
  
  private async handleSubscribe(
    event: IpcMainInvokeEvent,
    requestId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!requestId) {
        throw new Error('Request ID is required');
      }
      
      this.progressManager.subscribe(requestId, event.sender);
      this.logger.debug('Progress subscription created', { requestId });
      
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to subscribe to progress', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  private async handleUnsubscribe(
    _event: IpcMainInvokeEvent,
    requestId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!requestId) {
        throw new Error('Request ID is required');
      }
      
      this.progressManager.unsubscribe(requestId);
      this.logger.debug('Progress subscription removed', { requestId });
      
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to unsubscribe from progress', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  private async handleGetActive(
    _event: IpcMainInvokeEvent
  ): Promise<{ subscriptions: string[]; count: number }> {
    const subscriptions = this.progressManager.getActiveSubscriptions();
    
    return {
      subscriptions,
      count: subscriptions.length,
    };
  }
  
  cleanup(): void {
    // IPC handlers are automatically cleaned up by Electron
    this.logger.info('ProgressHandlers cleaned up');
  }
} 