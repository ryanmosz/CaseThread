import * as fs from 'fs';
import { PDFOutput } from '../../../types/pdf';
import { createChildLogger, Logger } from '../../../utils/logger';

/**
 * File-based output implementation for PDF generation
 * Writes PDF data directly to a file on disk
 */
export class FileOutput implements PDFOutput {
  private stream: fs.WriteStream;
  private logger: Logger;
  private filePath: string;
  
  constructor(filePath: string) {
    this.logger = createChildLogger({ service: 'FileOutput' });
    this.filePath = filePath;
    this.stream = fs.createWriteStream(filePath);
    
    // Set up error handling
    this.stream.on('error', (error) => {
      this.logger.error('File write error', { error: error.message, filePath });
      throw error;
    });
    
    this.logger.debug('FileOutput initialized', { filePath });
  }
  
  /**
   * Write a chunk of PDF data to the file
   */
  async write(chunk: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.stream.writable) {
        const error = new Error('Stream is not writable');
        this.logger.error('Write failed', { error: error.message });
        reject(error);
        return;
      }
      
      this.stream.write(chunk, (error) => {
        if (error) {
          this.logger.error('Write error', { error: error.message });
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
  
  /**
   * Close the file stream and finalize the file
   */
  async end(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stream.end((error?: Error) => {
        if (error) {
          this.logger.error('Stream end error', { error: error.message });
          reject(error);
        } else {
          this.logger.debug('File output finalized', { filePath: this.filePath });
          resolve();
        }
      });
    });
  }
  
  /**
   * Get the output type
   */
  getType(): 'file' {
    return 'file';
  }
  
  /**
   * Get the file path for this output
   */
  getFilePath(): string {
    return this.filePath;
  }
} 