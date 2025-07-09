import { OverseerAgent } from '../../src/agents/OverseerAgent';
import { Template } from '../../src/types';
import { MatterContext, PartialDraftOutput } from '../../src/types/agents';

// Silence logger
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

describe('OverseerAgent merge logic', () => {
  const template: Template = {
    id: 'tmpl',
    name: 'Merge Test',
    description: 'desc',
    version: '1.0',
    category: 'cat',
    jurisdiction: 'jur',
    requiredFields: [],
    sections: [
      { id: 's1', title: 'Alpha', order: 1, required: true, content: '' },
      { id: 's2', title: 'Beta', order: 2, required: true, content: '' },
      { id: 's3', title: 'Gamma', order: 3, required: true, content: '' }
    ],
    metadata: { author: 'a', lastUpdated: '2025', tags: [] }
  };

  const matterContext: MatterContext = {
    documentType: 'merge-doc',
    client: 'Client',
    yamlData: { document_type: 'merge-doc', client: 'Client' },
    validationResults: [],
    normalizedData: {}
  } as any;

  const draftA: PartialDraftOutput = {
    draftMarkdown: `## Alpha\nContent A repeated so length passes checkpoint. Lorem ipsum dolor sit amet.`,
    generationMetadata: {
      sectionsGenerated: ['Alpha'],
      placeholdersRemaining: [],
      tokenCount: 50,
      streamingChunks: 1
    }
  };

  const draftB: PartialDraftOutput = {
    draftMarkdown: `## Beta\nContent B. Lorem ipsum dolor sit amet.\n\n## Gamma\nContent C. Lorem ipsum dolor sit amet.`,
    generationMetadata: {
      sectionsGenerated: ['Beta', 'Gamma'],
      placeholdersRemaining: [],
      tokenCount: 80,
      streamingChunks: 1
    }
  };

  it('merges drafts in template order', async () => {
    const agent = new OverseerAgent();

    const res = await agent.process({
      partialDrafts: [draftB, draftA], // intentionally unordered
      template,
      matterContext
    });

    expect(res.success).toBe(true);

    const merged = res.data.mergedMarkdown;
    const alphaIdx = merged.indexOf('## Alpha');
    const betaIdx = merged.indexOf('## Beta');
    const gammaIdx = merged.indexOf('## Gamma');

    expect(alphaIdx).toBeGreaterThan(-1);
    expect(betaIdx).toBeGreaterThan(-1);
    expect(gammaIdx).toBeGreaterThan(-1);

    expect(alphaIdx).toBeLessThan(betaIdx);
    expect(betaIdx).toBeLessThan(gammaIdx);
  });
}); 