import { PDFOutput } from '../../../types/pdf';
import { createChildLogger, Logger } from '../../../utils/logger';

/**
 * Buffer-based output implementation for PDF generation
 * Accumulates PDF data in memory and returns it as a Buffer
 */
export class BufferOutput implements PDFOutput {
  private chunks: Buffer[] = [];
  private logger: Logger;
  private finalized = false;
  private finalBuffer?: Buffer;
  
  constructor() {
    this.logger = createChildLogger({ service: 'BufferOutput' });
    this.logger.debug('BufferOutput initialized');
  }
  
  /**
   * Add a chunk of PDF data to the buffer
   */
  async write(chunk: Buffer): Promise<void> {
    if (this.finalized) {
      throw new Error('Cannot write to finalized buffer');
    }
    
    this.chunks.push(chunk);
    this.logger.debug('Chunk added to buffer', { 
      chunkSize: chunk.length,
      totalChunks: this.chunks.length
    });
  }
  
  /**
   * Concatenate all chunks and return the complete PDF buffer
   */
  async end(): Promise<Buffer> {
    if (this.finalized && this.finalBuffer) {
      // Return cached buffer if already finalized
      return this.finalBuffer;
    }
    
    if (this.finalized) {
      throw new Error('Buffer finalized but no data available');
    }
    
    this.finalized = true;
    this.finalBuffer = Buffer.concat(this.chunks);
    
    this.logger.debug('Buffer finalized', {
      totalSize: this.finalBuffer.length,
      chunkCount: this.chunks.length
    });
    
    // Clear chunks to free memory
    this.chunks = [];
    
    return this.finalBuffer;
  }
  
  /**
   * Get the output type
   */
  getType(): 'buffer' {
    return 'buffer';
  }
  
  /**
   * Get current buffer size
   */
  getCurrentSize(): number {
    return this.chunks.reduce((total, chunk) => total + chunk.length, 0);
  }
} 