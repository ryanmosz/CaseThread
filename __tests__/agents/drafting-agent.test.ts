import { DraftingAgent } from '../../src/agents/DraftingAgent';
import { Template } from '../../src/types';
import { MatterContext, ContextBundle } from '../../src/types/agents';

// Silence logger
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

// Mock loadExplanation to return dummy string
jest.mock('../../src/services/template', () => ({
  loadExplanation: jest.fn(async () => 'mock explanation')
}));

// Mock generateDocument to produce markdown reflecting only the passed template sections
const mockGenerateDocument = jest.fn(async (template: Template) => {
  const lines: string[] = ['# Mock Document', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'];
  template.sections.forEach(sec => {
    lines.push(`## ${sec.title}`);
    lines.push(sec.content);
  });
  return lines.join('\n');
});

jest.mock('../../src/services/openai', () => ({
  generateDocument: (template: Template) => mockGenerateDocument(template)
}));

describe('DraftingAgent section filter', () => {
  const template: Template = {
    id: 'tmpl',
    name: 'Test',
    description: 'desc',
    version: '1.0',
    category: 'cat',
    jurisdiction: 'jur',
    requiredFields: [{ id: 'f1', name: 'Field1', type: 'text', description: '', required: false }],
    sections: [
      { id: 's1', title: 'One', order: 1, required: true, content: 'C1' },
      { id: 's2', title: 'Two', order: 2, required: true, content: 'C2' },
      { id: 's3', title: 'Three', order: 3, required: true, content: 'C3' }
    ],
    metadata: { author: 'a', lastUpdated: '2025', tags: [] }
  };

  const matterContext: MatterContext = {
    documentType: 'mock-doc',
    client: 'Client',
    yamlData: { document_type: 'mock-doc', client: 'Client' },
    validationResults: [],
    normalizedData: {}
  } as any;

  const contextBundle: ContextBundle = {
    embeddings: [],
    sources: [],
    totalTokens: 0,
    queryMetadata: { searchTerms: [], similarityThreshold: 0.75, resultsCount: 0 }
  };

  it('drafts only specified sections when sectionIds provided', async () => {
    const agent = new DraftingAgent();

    const res = await agent.process({
      template,
      matterContext,
      contextBundle,
      sectionIds: ['s1', 's3']
    });

    expect(res.success).toBe(true);
    const output = res.data;
    expect(output.generationMetadata.sectionsGenerated).toContain('One');
    expect(output.generationMetadata.sectionsGenerated).toContain('Three');
    expect(output.generationMetadata.sectionsGenerated).not.toContain('Two');

    // Ensure generateDocument received filtered template with 2 sections
    expect(mockGenerateDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        sections: expect.arrayContaining([
          expect.objectContaining({ id: 's1' }),
          expect.objectContaining({ id: 's3' })
        ])
      })
    );
  });
}); 