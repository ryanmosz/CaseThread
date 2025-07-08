#!/usr/bin/env node
import { Command } from 'commander';
import { generateCommand } from './commands/generate';
import { logger } from './utils/logger';

// Create the main program instance
const program = new Command();

// Configure the CLI program
program
  .name('casethread-poc')
  .description('CaseThread CLI Proof of Concept - Generate legal documents using AI')
  .version('0.1.0')
  .option('-d, --debug', 'Enable debug logging');

// Add the generate command
program.addCommand(generateCommand);

// Parse command line arguments
program.parse();

// Handle debug flag globally
const options = program.opts();
if (options.debug) {
  logger.level = 'debug';
  logger.debug('Debug logging enabled');
} 