/**
 * Learn Command - Index mock legal documents into vector database
 */

import { Command } from 'commander';
import { logger } from '../utils/logger';
import { documentIndexer } from '../services/indexer';
import { createSpinner } from '../utils/spinner';

interface LearnOptions {
  debug?: boolean;
  clear?: boolean;
  dataPath?: string;
}

const SPINNER_MESSAGES = {
  INIT: 'Initializing document indexer...',
  CLEAR: 'Clearing existing document index...',
  INDEXING: 'Indexing legal documents into vector database...',
  COMPLETE: 'Document indexing completed successfully!'
};

export const learnCommand = new Command('learn')
  .description('Index mock legal documents into vector database for context retrieval')
  .option('-d, --debug', 'Enable debug logging')
  .option('-c, --clear', 'Clear existing index before indexing')
  .option('-p, --data-path <path>', 'Path to mock data directory', 'mock-data')
  .action(async (options: LearnOptions) => {
    // Check for command-level debug flag
    if (options.debug && logger.level !== 'debug') {
      logger.level = 'debug';
      logger.debug('Debug logging enabled via command flag');
    }
    
    const spinner = createSpinner(SPINNER_MESSAGES.INIT);
    const startTime = Date.now();
    
    // Log command execution details
    logger.debug('=== Learn Command Execution ===');
    logger.debug(`Data Path: ${options.dataPath}`);
    logger.debug(`Clear Index: ${options.clear || false}`);
    logger.debug(`Debug Mode: ${options.debug || logger.level === 'debug'}`);
    logger.debug('===============================');
    
    try {
      // Clear existing index if requested
      if (options.clear) {
        spinner.updateMessage(SPINNER_MESSAGES.CLEAR);
        await documentIndexer.clearIndex();
        logger.info('Document index cleared');
      }
      
      // Index documents
      spinner.updateMessage(SPINNER_MESSAGES.INDEXING);
      
      const indexingStartTime = Date.now();
      const updateInterval = setInterval(() => {
        const elapsed = Math.round((Date.now() - indexingStartTime) / 1000);
        spinner.updateMessage(`${SPINNER_MESSAGES.INDEXING} (${elapsed}s elapsed)`);
      }, 5000);
      
      let stats;
      try {
        stats = await documentIndexer.indexAllDocuments();
        clearInterval(updateInterval);
        logger.debug('Document indexing completed', stats);
      } catch (error: any) {
        clearInterval(updateInterval);
        logger.error('Error during document indexing:', error);
        throw error;
      }
      
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      
      // Success!
      spinner.success(`${SPINNER_MESSAGES.COMPLETE} (completed in ${totalTime}s)`);
      
      // Display success information
      console.log('\n🧠 Document Learning Complete!\n');
      console.log(`📚 Documents processed: ${stats.documentsProcessed}`);
      console.log(`🔍 Documents indexed: ${stats.documentsIndexed}`);
      console.log(`📊 Total content length: ${(stats.totalContentLength / 1024).toFixed(2)} KB`);
      console.log(`⏱️  Processing time: ${totalTime} seconds`);
      
      if (stats.errors.length > 0) {
        console.log(`⚠️  Errors encountered: ${stats.errors.length}`);
        if (options.debug) {
          console.log('\nError details:');
          stats.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
          });
        }
      }
      
      console.log('\n💡 Tip: Now you can generate documents with enhanced context!');
      console.log('Example: casethread generate patent-assignment-agreement input.yaml');
      
      process.exit(0);
      
    } catch (error) {
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      
      logger.error('Learn command failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: totalTime
      });
      
      spinner.fail(`Document learning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      console.error('\n❌ Document Learning Failed!');
      console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(`Processing time: ${totalTime} seconds`);
      
      // Check if it's a connection error to ChromaDB
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch') || errorMessage.includes('Invalid URL')) {
        console.log('\n💡 ChromaDB Server Required:');
        console.log('CaseThread requires a ChromaDB server to be running for vector storage.');
        console.log('\n🚀 Start ChromaDB server:');
        console.log('   docker-compose up chromadb');
        console.log('\n   Or manually:');
        console.log('   docker run -p 8000:8000 chromadb/chroma:latest');
        console.log('\n   Then run the learn command again.');
      }
      
      if (options.debug && error instanceof Error) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
      
      process.exit(1);
    }
  });

 