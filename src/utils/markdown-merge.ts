import { Template } from '../types';
import { PartialDraftOutput } from '../types/agents';

/**
 * Merge partial markdown drafts into a single document, preserving
 * the original section order defined in the template.
 *
 * Assumptions:
 * - `splitIntoTasks` assigns contiguous section ranges to each worker so
 *   partial drafts do not overlap.
 * - Each partial draft already contains full markdown for its sections.
 */
export function mergeMarkdown(
  partialDrafts: PartialDraftOutput[],
  template: Template
): string {
  if (partialDrafts.length === 0) {
    throw new Error('No partial drafts provided for merging');
  }

  // Sort partial drafts by the index of their first generated section
  const draftOrder = partialDrafts.sort((a, b) => {
    const aFirst = template.sections.findIndex(sec => a.generationMetadata.sectionsGenerated.includes(sec.title));
    const bFirst = template.sections.findIndex(sec => b.generationMetadata.sectionsGenerated.includes(sec.title));
    return aFirst - bFirst;
  });

  // Concatenate drafts with two newlines as separator
  const merged = draftOrder.map(pd => pd.draftMarkdown.trim()).join('\n\n');

  return merged;
} 