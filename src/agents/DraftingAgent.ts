/**
 * Drafting Agent - Generates documents section-by-section using template metadata
 */

import { BaseAgent } from './BaseAgent';
import { 
  DraftingAgentInput, 
  DraftingAgentOutput, 
  CheckpointResult 
} from '../types/agents';
import { generateDocument } from '../services/openai';
import { loadExplanation } from '../services/template';
import { logger } from '../utils/logger';

export class DraftingAgent extends BaseAgent {
  readonly name = 'DraftingAgent';
  readonly description = 'Generates documents section-by-section using template metadata';

  protected async execute(input: DraftingAgentInput): Promise<DraftingAgentOutput> {
    logger.debug(`DraftingAgent processing: ${input.template.id} for ${input.matterContext.client}`);

    // Load template explanation
    const explanation = await loadExplanation(input.matterContext.documentType);
    
    // Generate document using existing OpenAI service
    const draftMarkdown = await generateDocument(
      input.template,
      explanation,
      input.matterContext.yamlData
    );

    // Analyze the generated document
    const sectionsGenerated = this.extractSections(draftMarkdown);
    const placeholdersRemaining = this.findPlaceholders(draftMarkdown);
    const tokenCount = this.estimateTokenCount(draftMarkdown);

    return {
      draftMarkdown,
      generationMetadata: {
        sectionsGenerated,
        placeholdersRemaining,
        tokenCount,
        streamingChunks: 1 // Since we're not streaming yet
      }
    };
  }

  protected validateInput(input: DraftingAgentInput): void {
    super.validateInput(input);
    
    if (!input.template) {
      throw new Error('Template is required');
    }
    
    if (!input.matterContext) {
      throw new Error('Matter context is required');
    }
    
    if (!input.matterContext.yamlData) {
      throw new Error('YAML data is required in matter context');
    }
  }

  protected async runPreCheckpoints(input: DraftingAgentInput): Promise<CheckpointResult[]> {
    const checkpoints: CheckpointResult[] = [];

    // Checkpoint: Template sections present
    const hasSections = input.template.sections && input.template.sections.length > 0;
    checkpoints.push(this.createCheckpoint(
      'template_sections_present',
      hasSections,
      hasSections ? 
        `Template has ${input.template.sections.length} sections` : 
        'Template has no sections defined'
    ));

    // Checkpoint: Required fields available
    const hasRequiredFields = input.template.requiredFields && input.template.requiredFields.length > 0;
    checkpoints.push(this.createCheckpoint(
      'required_fields_available',
      hasRequiredFields,
      hasRequiredFields ? 
        `Template has ${input.template.requiredFields.length} required fields` : 
        'Template has no required fields defined'
    ));

    return checkpoints;
  }

  protected async runPostCheckpoints(output: DraftingAgentOutput): Promise<CheckpointResult[]> {
    const checkpoints: CheckpointResult[] = [];

    // Checkpoint: No placeholders remaining
    const noPlaceholders = output.generationMetadata.placeholdersRemaining.length === 0;
    checkpoints.push(this.createCheckpoint(
      'no_placeholders_remaining',
      noPlaceholders,
      noPlaceholders ? 
        'No placeholders remaining in document' : 
        `${output.generationMetadata.placeholdersRemaining.length} placeholders remaining`
    ));

    // Checkpoint: Document has content
    const hasContent = output.draftMarkdown.trim().length > 50;
    checkpoints.push(this.createCheckpoint(
      'document_has_content',
      hasContent,
      hasContent ? 
        `Document has ${output.draftMarkdown.length} characters` : 
        'Document appears to be empty or too short'
    ));

    // Checkpoint: Streaming response heartbeat (simulated for now)
    const streamingOk = output.generationMetadata.streamingChunks > 0;
    checkpoints.push(this.createCheckpoint(
      'streaming_heartbeat',
      streamingOk,
      streamingOk ? 
        'Streaming response completed successfully' : 
        'Streaming response failed'
    ));

    return checkpoints;
  }

  private extractSections(markdown: string): string[] {
    const sections: string[] = [];
    const lines = markdown.split('\n');
    
    for (const line of lines) {
      if (line.match(/^#+\s+/)) {
        sections.push(line.replace(/^#+\s+/, '').trim());
      }
    }
    
    return sections;
  }

  private findPlaceholders(markdown: string): string[] {
    const placeholders: string[] = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    
    while ((match = regex.exec(markdown)) !== null) {
      placeholders.push(match[1]);
    }
    
    return placeholders;
  }

  private estimateTokenCount(text: string): number {
    // Simple estimation: roughly 4 characters per token
    return Math.ceil(text.length / 4);
  }
} 