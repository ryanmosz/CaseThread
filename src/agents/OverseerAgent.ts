import { BaseAgent } from './BaseAgent';
import {
  OverseerInput,
  OverseerOutput,
  CheckpointResult
} from '../types/agents';
import { mergeMarkdown } from '../utils/markdown-merge';
import { logger } from '../utils/logger';

export class OverseerAgent extends BaseAgent {
  readonly name = 'OverseerAgent';
  readonly description = 'Merges partial drafts and performs final polish';

  protected async execute(input: OverseerInput): Promise<OverseerOutput> {
    logger.debug('OverseerAgent merging partial drafts', {
      partialCount: input.partialDrafts.length
    });

    // Merge markdown according to template order
    let mergedMarkdown = mergeMarkdown(input.partialDrafts, input.template);

    // Deduplicate repeated sections that may arise if workers produced full docs
    mergedMarkdown = this.removeDuplicateSections(mergedMarkdown);

    // For now we skip an additional OpenAI polishing pass to keep costs low.
    // In future iterations, we could call an editing model here.

    const totalCharsOriginal = input.partialDrafts.reduce((sum, pd) => sum + pd.draftMarkdown.length, 0);
    const rewriteRatio = totalCharsOriginal === 0 ? 0 : (mergedMarkdown.length - totalCharsOriginal) / totalCharsOriginal;

    return {
      mergedMarkdown,
      overseerMetadata: {
        rewriteRatio: Number(rewriteRatio.toFixed(3)),
        tokenCount: Math.ceil(mergedMarkdown.length / 4), // rough estimate
        issuesDetected: []
      }
    };
  }

  /**
   * Remove duplicate occurrences of section headers (## Header) and their content.
   * Keeps the first occurrence according to document order.
   */
  private removeDuplicateSections(doc: string): string {
    const lines = doc.split('\n');
    const seen = new Set<string>();
    const output: string[] = [];
    let skip = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^##\s+(.+)/);
      if (headerMatch) {
        const title = headerMatch[1].trim();
        if (seen.has(title)) {
          // Start skipping until next unseen header
          skip = true;
          continue;
        } else {
          seen.add(title);
          skip = false;
        }
      }
      if (!skip) {
        output.push(line);
      }
    }
    return output.join('\n');
  }

  protected async runPreCheckpoints(input: OverseerInput): Promise<CheckpointResult[]> {
    const checkpoints: CheckpointResult[] = [];

    // Check: At least one partial draft present
    const hasDrafts = input.partialDrafts.length > 0;
    checkpoints.push(this.createCheckpoint('partial_drafts_present', hasDrafts));

    return checkpoints;
  }

  protected async runPostCheckpoints(output: OverseerOutput): Promise<CheckpointResult[]> {
    const checkpoints: CheckpointResult[] = [];

    // Check: Merged document not empty
    const hasContent = output.mergedMarkdown.trim().length > 50;
    checkpoints.push(this.createCheckpoint('merged_document_has_content', hasContent));

    return checkpoints;
  }
} 