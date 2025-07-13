export class BlobURLManager {
  private static instance: BlobURLManager;
  private activeURLs: Map<string, {
    url: string;
    created: Date;
    size: number;
    type: string;
  }> = new Map();
  
  private constructor() {
    // Set up cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
    
    // Periodic cleanup of orphaned URLs (older than 1 hour)
    setInterval(() => {
      this.cleanupOrphaned();
    }, 60 * 60 * 1000); // Every hour
  }
  
  static getInstance(): BlobURLManager {
    if (!BlobURLManager.instance) {
      BlobURLManager.instance = new BlobURLManager();
    }
    return BlobURLManager.instance;
  }
  
  /**
   * Create a blob URL from buffer
   */
  createBlobURL(
    buffer: ArrayBuffer, 
    type: string = 'application/pdf',
    key?: string
  ): string {
    // Revoke existing URL for this key if present
    if (key && this.activeURLs.has(key)) {
      this.revokeURL(key);
    }
    
    // Create new blob and URL
    const blob = new Blob([buffer], { type });
    const url = URL.createObjectURL(blob);
    
    // Track the URL
    const id = key || this.generateId();
    this.activeURLs.set(id, {
      url,
      created: new Date(),
      size: buffer.byteLength,
      type
    });
    
    // Log memory usage
    this.logMemoryUsage();
    
    return url;
  }
  
  /**
   * Revoke a specific URL
   */
  revokeURL(key: string): void {
    const entry = this.activeURLs.get(key);
    if (entry) {
      URL.revokeObjectURL(entry.url);
      this.activeURLs.delete(key);
      console.log(`[BlobURLManager] Revoked blob URL: ${key}`);
    }
  }
  
  /**
   * Revoke URL by actual URL string
   */
  revokeByURL(url: string): void {
    for (const [key, entry] of this.activeURLs.entries()) {
      if (entry.url === url) {
        this.revokeURL(key);
        break;
      }
    }
  }
  
  /**
   * Clean up all URLs
   */
  cleanup(): void {
    for (const [key] of this.activeURLs.entries()) {
      this.revokeURL(key);
    }
    console.log('[BlobURLManager] Cleaned up all blob URLs');
  }
  
  /**
   * Clean up orphaned URLs older than specified time
   */
  cleanupOrphaned(maxAgeMs: number = 60 * 60 * 1000): void {
    const now = new Date();
    const keysToRemove: string[] = [];
    
    for (const [key, entry] of this.activeURLs.entries()) {
      const age = now.getTime() - entry.created.getTime();
      if (age > maxAgeMs) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => this.revokeURL(key));
    
    if (keysToRemove.length > 0) {
      console.log(`[BlobURLManager] Cleaned up ${keysToRemove.length} orphaned blob URLs`);
    }
  }
  
  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    count: number;
    totalSize: number;
    oldestAge: number;
  } {
    const now = new Date();
    let totalSize = 0;
    let oldestAge = 0;
    
    for (const entry of this.activeURLs.values()) {
      totalSize += entry.size;
      const age = now.getTime() - entry.created.getTime();
      oldestAge = Math.max(oldestAge, age);
    }
    
    return {
      count: this.activeURLs.size,
      totalSize,
      oldestAge
    };
  }
  
  /**
   * Check if a blob URL is managed
   */
  isManaged(url: string): boolean {
    for (const entry of this.activeURLs.values()) {
      if (entry.url === url) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `blob-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Log memory usage
   */
  private logMemoryUsage(): void {
    const stats = this.getMemoryStats();
    if (stats.count > 0) {
      console.log(`[BlobURLManager] Active URLs: ${stats.count}, Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
      
      // Warn if too many URLs or too much memory
      if (stats.count > 10) {
        console.warn('[BlobURLManager] Warning: High number of active blob URLs');
      }
      if (stats.totalSize > 100 * 1024 * 1024) {
        console.warn('[BlobURLManager] Warning: High memory usage from blob URLs');
      }
    }
  }
} 