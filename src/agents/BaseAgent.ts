/**
 * Base Agent class for CaseThread Multi-Agent System
 */

import { Agent, AgentResult, AgentError, CheckpointResult, AgentLogEntry } from '../types/agents';
import { logger } from '../utils/logger';
import { createHash } from 'crypto';

export abstract class BaseAgent implements Agent {
  abstract readonly name: string;
  abstract readonly description: string;

  constructor() {
    // Note: Cannot access abstract properties in constructor
    // Agent initialization logging will happen in process method
  }

  /**
   * Process input and return result with metadata
   */
  async process(input: any): Promise<AgentResult> {
    const startTime = Date.now();
    const inputHash = this.hashInput(input);
    
    logger.info(`${this.name} agent processing started`, {
      agent: this.name,
      inputHash
    });

    try {
      // Validate input
      this.validateInput(input);

      // Run checkpoints before processing
      const preCheckpoints = await this.runPreCheckpoints(input);
      const failedPreCheckpoints = preCheckpoints.filter(c => !c.passed);
      
      if (failedPreCheckpoints.length > 0) {
        const error: AgentError = {
          code: 'CHECKPOINT_FAILED',
          message: `Pre-processing checkpoints failed: ${failedPreCheckpoints.map(c => c.name).join(', ')}`,
          details: failedPreCheckpoints
        };
        
        return {
          success: false,
          error,
          metadata: {
            processingTime: Date.now() - startTime,
            checkpoints: preCheckpoints,
            agentLogs: []
          }
        };
      }

      // Execute main processing logic
      const result = await this.execute(input);
      
      // Run checkpoints after processing
      const postCheckpoints = await this.runPostCheckpoints(result);
      const failedPostCheckpoints = postCheckpoints.filter(c => !c.passed);
      
      if (failedPostCheckpoints.length > 0) {
        const error: AgentError = {
          code: 'CHECKPOINT_FAILED',
          message: `Post-processing checkpoints failed: ${failedPostCheckpoints.map(c => c.name).join(', ')}`,
          details: failedPostCheckpoints
        };
        
        return {
          success: false,
          error,
          metadata: {
            processingTime: Date.now() - startTime,
            checkpoints: [...preCheckpoints, ...postCheckpoints],
            agentLogs: []
          }
        };
      }

      // Create agent log entry
      const outputHash = this.hashOutput(result);
      const agentLog: AgentLogEntry = {
        agent: this.name,
        input_hash: inputHash,
        output_hash: outputHash,
        timestamp: new Date(),
        metadata: {
          processingTime: Date.now() - startTime,
          checkpointsPassed: [...preCheckpoints, ...postCheckpoints].length
        }
      };

      logger.info(`${this.name} agent processing completed`, {
        agent: this.name,
        inputHash,
        outputHash,
        processingTime: Date.now() - startTime
      });

      return {
        success: true,
        data: result,
        metadata: {
          processingTime: Date.now() - startTime,
          checkpoints: [...preCheckpoints, ...postCheckpoints],
          agentLogs: [agentLog]
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error(`${this.name} agent processing failed`, {
        agent: this.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      });

      return {
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error
        },
        metadata: {
          processingTime,
          checkpoints: [],
          agentLogs: []
        }
      };
    }
  }

  /**
   * Abstract method that subclasses must implement
   */
  protected abstract execute(input: any): Promise<any>;

  /**
   * Validate input - can be overridden by subclasses
   */
  protected validateInput(input: any): void {
    if (input === null || input === undefined) {
      throw new Error(`${this.name} agent received null or undefined input`);
    }
  }

  /**
   * Run pre-processing checkpoints - can be overridden by subclasses
   */
  protected async runPreCheckpoints(_input: any): Promise<CheckpointResult[]> {
    return [];
  }

  /**
   * Run post-processing checkpoints - can be overridden by subclasses  
   */
  protected async runPostCheckpoints(_output: any): Promise<CheckpointResult[]> {
    return [];
  }

  /**
   * Create hash of input for logging
   */
  private hashInput(input: any): string {
    try {
      const inputString = JSON.stringify(input);
      return createHash('sha256').update(inputString).digest('hex').substring(0, 16);
    } catch (error) {
      return createHash('sha256').update(String(input)).digest('hex').substring(0, 16);
    }
  }

  /**
   * Create hash of output for logging
   */
  private hashOutput(output: any): string {
    try {
      const outputString = JSON.stringify(output);
      return createHash('sha256').update(outputString).digest('hex').substring(0, 16);
    } catch (error) {
      return createHash('sha256').update(String(output)).digest('hex').substring(0, 16);
    }
  }

  /**
   * Create a checkpoint result
   */
  protected createCheckpoint(name: string, passed: boolean, message?: string): CheckpointResult {
    return {
      name,
      passed,
      message,
      timestamp: new Date()
    };
  }
} 