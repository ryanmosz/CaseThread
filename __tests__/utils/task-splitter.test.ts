import { splitIntoTasks } from '../../src/utils/task-splitter';
import { Template } from '../../src/types';
import { MatterContext, ContextBundle } from '../../src/types/agents';

// Mock logger to silence output
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

describe('splitIntoTasks', () => {
  const createTemplate = (sectionCount: number): Template => {
    return {
      id: 'mock-template',
      name: 'Mock Template',
      description: 'A template for testing',
      version: '1.0',
      category: 'test',
      jurisdiction: 'n/a',
      requiredFields: [],
      sections: Array.from({ length: sectionCount }, (_, i) => ({
        id: `sec-${i + 1}`,
        title: `Section ${i + 1}`,
        order: i + 1,
        required: true,
        content: `Content ${i + 1}`
      })),
      metadata: {
        author: 'Tester',
        lastUpdated: '2025-01-01',
        tags: []
      }
    };
  };

  const matterContext: MatterContext = {
    documentType: 'mock-doc',
    client: 'Test Client',
    yamlData: { document_type: 'mock-doc', client: 'Test Client' },
    validationResults: [],
    normalizedData: {}
  } as any; // Cast to suppress unused fields in test

  const contextBundle: ContextBundle = {
    embeddings: [],
    sources: [],
    totalTokens: 0,
    queryMetadata: { searchTerms: [], similarityThreshold: 0.75, resultsCount: 0 }
  };

  it('splits into balanced non-overlapping tasks', () => {
    const sectionCount = 7;
    const maxParallel = 4;
    const template = createTemplate(sectionCount);

    const tasks = splitIntoTasks(template, matterContext, contextBundle, maxParallel);

    // 1. Task count should not exceed maxParallel and should be >0
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.length).toBeLessThanOrEqual(maxParallel);

    // 2. Collect all sectionIds from tasks
    const collectedIds = tasks.flatMap(t => t.sectionIds);
    expect(collectedIds.length).toBe(sectionCount);
    // 3. No duplicates
    const uniqueIds = new Set(collectedIds);
    expect(uniqueIds.size).toBe(sectionCount);

    // 4. All original ids accounted for
    const originalIds = template.sections.map(s => s.id);
    expect(uniqueIds).toEqual(new Set(originalIds));

    // 5. Balance property: sizes differ by at most 1
    const sizes = tasks.map(t => t.sectionIds.length);
    const maxSize = Math.max(...sizes);
    const minSize = Math.min(...sizes);
    expect(maxSize - minSize).toBeLessThanOrEqual(1);
  });
}); 