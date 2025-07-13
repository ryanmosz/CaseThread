import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { SecurityValidator, ValidationResult } from './security-validator';
import { createChildLogger } from '../../../utils/logger';

export type HandlerFunction = (
  event: IpcMainInvokeEvent,
  ...args: any[]
) => Promise<any>;

export type ValidatorFunction = (
  event: IpcMainInvokeEvent,
  ...args: any[]
) => ValidationResult;

/**
 * Wrapper for secure IPC handler registration
 */
export class SecureIPCHandler {
  private static validator = SecurityValidator.getInstance();
  private static logger = createChildLogger({ service: 'SecureIPCHandler' });
  
  // Rate limiting map: key -> timestamps
  private static rateLimitMap = new Map<string, number[]>();
  private static readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private static readonly RATE_LIMIT_MAX = 100; // Max requests per window
  
  /**
   * Register a secure IPC handler with validation
   */
  static handle(
    channel: string,
    handler: HandlerFunction,
    validator?: ValidatorFunction
  ): void {
    ipcMain.handle(channel, async (event, ...args) => {
      try {
        // Check if channel is allowed
        if (!this.validator.isChannelAllowed(channel)) {
          throw new Error('Unauthorized channel access');
        }
        
        // Rate limiting check
        if (!this.checkRateLimit(event, channel)) {
          throw new Error('Rate limit exceeded');
        }
        
        // Custom validation if provided
        if (validator) {
          const validation = validator(event, ...args);
          if (!validation.valid) {
            throw new Error(validation.error || 'Validation failed');
          }
          
          // Use sanitized args if provided
          if (validation.sanitized) {
            args = [validation.sanitized];
          }
        }
        
        // Log the request
        this.logger.debug('Handling secure IPC request', {
          channel,
          webContentsId: event.sender.id,
        });
        
        // Call the actual handler
        return await handler(event, ...args);
        
      } catch (error) {
        this.logger.error('Secure IPC handler error', {
          channel,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        // Don't expose internal error details
        const safeError = {
          message: error instanceof Error ? error.message : 'Request failed',
          code: 'IPC_ERROR',
        };
        
        throw safeError;
      }
    });
  }
  
  /**
   * Basic rate limiting
   */
  private static checkRateLimit(
    event: IpcMainInvokeEvent,
    channel: string
  ): boolean {
    const key = `${event.sender.id}-${channel}`;
    const now = Date.now();
    
    // Get or create request timestamps
    let timestamps = this.rateLimitMap.get(key) || [];
    
    // Remove old timestamps
    timestamps = timestamps.filter(t => now - t < this.RATE_LIMIT_WINDOW);
    
    // Check if limit exceeded
    if (timestamps.length >= this.RATE_LIMIT_MAX) {
      this.logger.warn('Rate limit exceeded', { 
        key, 
        requests: timestamps.length,
        window: this.RATE_LIMIT_WINDOW,
      });
      return false;
    }
    
    // Add current timestamp
    timestamps.push(now);
    this.rateLimitMap.set(key, timestamps);
    
    return true;
  }
  
  /**
   * Clean up rate limit data periodically
   */
  private static cleanupInterval = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, timestamps] of this.rateLimitMap.entries()) {
      const filtered = timestamps.filter(
        t => now - t < this.RATE_LIMIT_WINDOW
      );
      
      if (filtered.length === 0) {
        this.rateLimitMap.delete(key);
        cleaned++;
      } else {
        this.rateLimitMap.set(key, filtered);
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug('Cleaned up rate limit entries', { count: cleaned });
    }
  }, 60000); // Clean up every minute
  
  /**
   * Get rate limit statistics
   */
  static getRateLimitStats(): { [key: string]: number } {
    const stats: { [key: string]: number } = {};
    const now = Date.now();
    
    for (const [key, timestamps] of this.rateLimitMap.entries()) {
      const validTimestamps = timestamps.filter(
        t => now - t < this.RATE_LIMIT_WINDOW
      );
      stats[key] = validTimestamps.length;
    }
    
    return stats;
  }
  
  /**
   * Cleanup handler
   */
  static cleanup(): void {
    clearInterval(this.cleanupInterval);
    this.rateLimitMap.clear();
    this.logger.info('SecureIPCHandler cleaned up');
  }
} 