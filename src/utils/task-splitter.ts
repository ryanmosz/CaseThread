import { Template } from '../types';
import { DraftingTask, MatterContext, ContextBundle } from '../types/agents';
import { config } from '../config';

/**
 * Split template sections into balanced DraftingTasks for parallel processing.
 * Sections are chunked sequentially to preserve original document order.
 *
 * @param template Full template definition
 * @param matterContext CaseThread matter context
 * @param contextBundle Additional contextual embeddings/sources
 * @param maxParallel Maximum number of parallel tasks (defaults to CT_MAX_PARALLEL env or 4)
 */
export function splitIntoTasks(
  template: Template,
  matterContext: MatterContext,
  contextBundle: ContextBundle,
  maxParallel: number = config.parallel.MAX_PARALLEL
): DraftingTask[] {
  if (!template.sections || template.sections.length === 0) {
    throw new Error('Template has no sections to split');
  }

  const numTasks = Math.min(maxParallel, template.sections.length);
  const chunkSize = Math.ceil(template.sections.length / numTasks);

  const tasks: DraftingTask[] = [];

  for (let i = 0; i < numTasks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, template.sections.length);
    const sectionSlice = template.sections.slice(start, end);

    if (sectionSlice.length === 0) continue;

    tasks.push({
      id: `task-${i + 1}`,
      sectionIds: sectionSlice.map(s => s.id),
      template,
      matterContext,
      contextBundle
    });
  }

  return tasks;
} 