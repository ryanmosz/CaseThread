#!/usr/bin/env node
import { Command } from 'commander';
import { generateCommand } from './commands/generate';
import { learnCommand } from './commands/learn';
import { logger } from './utils/logger';

// Create the main program instance
const program = new Command();

// Configure the CLI program
program
  .name('casethread-poc')
  .description('CaseThread CLI Proof of Concept - Generate legal documents using AI')
  .version('0.1.0')
  .option('-d, --debug', 'Enable debug logging')
  .hook('preAction', (thisCommand) => {
    // This hook runs before any command action
    const options = thisCommand.opts();
    if (options.debug) {
      logger.level = 'debug';
      logger.debug('Debug logging enabled via global flag');
      logger.debug(`Running command: ${thisCommand.args.join(' ')}`);
      logger.debug(`Node version: ${process.version}`);
      logger.debug(`Working directory: ${process.cwd()}`);
    }
  });

// Add commands
program.addCommand(generateCommand);
program.addCommand(learnCommand);

// Parse command line arguments
program.parse(); 