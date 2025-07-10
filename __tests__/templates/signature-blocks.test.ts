import { loadTemplate } from '../../src/services/template';
import { MockOpenAIService } from '../../src/services/mock-openai';
import { isOfficeActionSignatureBlock, isStandardSignatureBlock } from '../../src/types';

// Set test environment to ensure outputs go to test-results folder
process.env.TEST_MODE = 'true';
process.env.TEST_NAME = 'signature-blocks';

describe('Signature Blocks in Templates', () => {
  const templatesWithSignatureBlocks = [
    'patent-assignment-agreement',
    'trademark-application', 
    'cease-and-desist-letter',
    'nda-ip-specific',
    'office-action-response',
    'patent-license-agreement',
    'provisional-patent-application',
    'technology-transfer-agreement'
  ];

  describe('Template Structure', () => {
    templatesWithSignatureBlocks.forEach(templateId => {
      it(`${templateId} should have signatureBlocks defined`, async () => {
        const template = await loadTemplate(templateId);
        // @ts-ignore - signatureBlocks is optional on Template type
        expect(template.signatureBlocks).toBeDefined();
        // @ts-ignore
        expect(Array.isArray(template.signatureBlocks)).toBe(true);
        // @ts-ignore
        expect(template.signatureBlocks.length).toBeGreaterThan(0);
      });

      it(`${templateId} should have signature markers in content`, async () => {
        const template = await loadTemplate(templateId);
        
        // Find all signature block markers in the template
        const content = template.sections.map(s => s.content).join(' ');
        const signatureMarkers = content.match(/\[SIGNATURE_BLOCK:[^\]]+\]/g) || [];
        
        // Verify each signature block has a corresponding marker
        // @ts-ignore
        template.signatureBlocks?.forEach((block: any) => {
          const markerPattern = `[SIGNATURE_BLOCK:${block.id}]`;
          expect(signatureMarkers).toContain(markerPattern);
        });
      });

      it(`${templateId} should not have redundant signature text`, async () => {
        const template = await loadTemplate(templateId);
        const content = template.sections.map(s => s.content).join(' ');
        
        // Check for patterns we removed
        const redundantPatterns = [
          /By:\s*_{3,}/,  // "By: ____" lines
          /\[ATTORNEY NAME\]/,  // Placeholder text
          /\[FIRM NAME\]/,
          /SIGNATURE:.*\/\{\{.*\}\}\//  // TEAS format
        ];
        
        redundantPatterns.forEach(pattern => {
          expect(content).not.toMatch(pattern);
        });
      });
    });
  });

  describe('Initial Blocks', () => {
    it('patent-assignment-agreement should have initial blocks', async () => {
      const template = await loadTemplate('patent-assignment-agreement');
      // @ts-ignore
      expect(template.initialBlocks).toBeDefined();
      // @ts-ignore
      expect(Array.isArray(template.initialBlocks)).toBe(true);
      // @ts-ignore
      expect(template.initialBlocks.length).toBeGreaterThan(0);
      
      // Check marker in content
      const content = template.sections.map(s => s.content).join(' ');
      // @ts-ignore
      template.initialBlocks?.forEach((block: any) => {
        const marker = `[INITIALS_BLOCK:${block.id}]`;
        expect(content).toContain(marker);
      });
    });

    it('nda-ip-specific should have page initial blocks', async () => {
      const template = await loadTemplate('nda-ip-specific');
      // @ts-ignore
      expect(template.initialBlocks).toBeDefined();
      // @ts-ignore
      expect(Array.isArray(template.initialBlocks)).toBe(true);
      
      // Verify page initials configuration
      // @ts-ignore
      const pageInitials = template.initialBlocks?.find((b: any) => b.id === 'page-initials');
      expect(pageInitials).toBeDefined();
      expect(pageInitials?.placement.locations).toContain('each-page-footer');
    });
  });

  describe('Notary Blocks', () => {
    it('patent-assignment-agreement should have notary blocks', async () => {
      const template = await loadTemplate('patent-assignment-agreement');
      // @ts-ignore
      expect(template.notaryBlocks).toBeDefined();
      // @ts-ignore
      expect(Array.isArray(template.notaryBlocks)).toBe(true);
      // @ts-ignore
      expect(template.notaryBlocks.length).toBeGreaterThan(0);
      
      // Check marker in content
      const content = template.sections.map(s => s.content).join(' ');
      // @ts-ignore
      template.notaryBlocks?.forEach((block: any) => {
        const marker = `[NOTARY_BLOCK:${block.id}]`;
        expect(content).toContain(marker);
      });
    });
  });

  describe('Document Generation', () => {
    let mockOpenAI: MockOpenAIService;
    
    beforeEach(() => {
      mockOpenAI = new MockOpenAIService({
        apiKey: 'test-key',
        model: 'test-model',
        temperature: 0.7
      });
    });

    templatesWithSignatureBlocks.forEach(templateId => {
      it(`${templateId} should generate documents with signature markers`, async () => {
        const template = await loadTemplate(templateId);
        
        // Create minimal YAML data for the template
        const yamlData: any = {
          document_type: templateId,
          client: 'Test Client',
          attorney: 'Test Attorney'
        };
        
        // Add required fields based on template
        template.requiredFields.forEach(field => {
          if (!yamlData[field.id]) {
            switch (field.type) {
              case 'text':
                yamlData[field.id] = `Test ${field.name}`;
                break;
              case 'select':
                yamlData[field.id] = field.options?.[0] || 'default';
                break;
              case 'boolean':
                yamlData[field.id] = true;
                break;
              case 'number':
                yamlData[field.id] = 10;
                break;
              case 'date':
                yamlData[field.id] = '2025-01-08';
                break;
              case 'multiselect':
                yamlData[field.id] = field.options ? [field.options[0]] : [];
                break;
              default:
                // For any type not explicitly handled (including potential textarea)
                // treat as text
                yamlData[field.id] = `Test ${field.name}`;
            }
          }
        });
        
        // Generate document
        const result = await mockOpenAI.generateDocument(template, yamlData, yamlData);
        
        // Verify signature markers are present
        // @ts-ignore
        template.signatureBlocks?.forEach((block: any) => {
          const marker = `[SIGNATURE_BLOCK:${block.id}]`;
          expect(result.content).toContain(marker);
        });
        
        // Verify no redundant signature text
        expect(result.content).not.toMatch(/By:\s*_{3,}/);
        expect(result.content).not.toMatch(/\[ATTORNEY NAME\]/);
        expect(result.content).not.toMatch(/SIGNATURE:.*\/[^\/]+\//);
      });
    });
  });

  describe('Signature Block Schema', () => {
    templatesWithSignatureBlocks.forEach(templateId => {
      it(`${templateId} signature blocks should have valid schema`, async () => {
        const template = await loadTemplate(templateId);
        
        // @ts-ignore
        template.signatureBlocks?.forEach((block: any) => {
          // Required fields
          expect(block.id).toBeDefined();
          expect(block.type).toBeDefined();
          
          // Office action response has a different structure
          if (templateId === 'office-action-response') {
            expect(block.label).toBeDefined();
            expect(block.position).toBeDefined();
            expect(block.fields).toBeDefined();
            expect(Array.isArray(block.fields)).toBe(true);
          } else {
            expect(block.placement).toBeDefined();
            expect(block.placement.marker).toBe(`[SIGNATURE_BLOCK:${block.id}]`);
            
            // Party information
            expect(block.party).toBeDefined();
            expect(block.party.role).toBeDefined();
            expect(block.party.fields).toBeDefined();
            
            // Common fields
            if (block.party.fields.name) {
              expect(block.party.fields.name.required).toBeDefined();
              expect(block.party.fields.name.label).toBeDefined();
            }
          }
        });
      });
    });

    it('office-action-response should have USPTO registration number field', async () => {
      const template = await loadTemplate('office-action-response');
      
      // @ts-ignore
      const signatureBlock = template.signatureBlocks?.find((b: any) => b.id === 'attorney-signature');
      expect(signatureBlock).toBeDefined();
      
      // Office action response has a different structure with fields array directly
      if (signatureBlock && isOfficeActionSignatureBlock(signatureBlock)) {
        const fields = signatureBlock.fields;
        const registrationField = fields?.find((f: any) => f.id === 'registration_number');
        expect(registrationField).toBeDefined();
        expect(registrationField?.label).toContain('USPTO Registration');
        expect(registrationField?.required).toBe(true);
      } else {
        fail('Expected office action response to have OfficeActionSignatureBlock format');
      }
    });

    it('patent-license-agreement should have two-party signatures', async () => {
      const template = await loadTemplate('patent-license-agreement');
      
      // @ts-ignore
      expect(template.signatureBlocks).toBeDefined();
      // @ts-ignore
      expect(template.signatureBlocks?.length).toBe(2);
      
      // @ts-ignore
      const licensorBlock = template.signatureBlocks?.find((b: any) => b.id === 'licensor-signature');
      // @ts-ignore
      const licenseeBlock = template.signatureBlocks?.find((b: any) => b.id === 'licensee-signature');
      
      expect(licensorBlock).toBeDefined();
      expect(licenseeBlock).toBeDefined();
      
      // Verify both have appropriate labels in party object
      if (licensorBlock && isStandardSignatureBlock(licensorBlock)) {
        expect(licensorBlock.party?.label).toContain('LICENSOR');
      }
      if (licenseeBlock && isStandardSignatureBlock(licenseeBlock)) {
        expect(licenseeBlock.party?.label).toContain('LICENSEE');
      }
      
      // Verify side-by-side layout
      if (licensorBlock && isStandardSignatureBlock(licensorBlock)) {
        const layout = licensorBlock.layout;
        if (typeof layout === 'string') {
          expect(layout).toBe('side-by-side');
        } else {
          expect(layout?.position).toBe('side-by-side');
        }
      }
      if (licenseeBlock && isStandardSignatureBlock(licenseeBlock)) {
        const layout = licenseeBlock.layout;
        if (typeof layout === 'string') {
          expect(layout).toBe('side-by-side');
        } else {
          expect(layout?.position).toBe('side-by-side');
        }
      }
    });

    it('provisional-patent-application should have inventor signature(s)', async () => {
      const template = await loadTemplate('provisional-patent-application');
      
      // @ts-ignore
      expect(template.signatureBlocks).toBeDefined();
      // @ts-ignore
      expect(template.signatureBlocks?.length).toBeGreaterThanOrEqual(1);
      
      // @ts-ignore
      const inventorBlock = template.signatureBlocks?.find((b: any) => b.id === 'inventor-signature');
      expect(inventorBlock).toBeDefined();
      
      // Verify inventor signature has appropriate fields
      if (inventorBlock && isStandardSignatureBlock(inventorBlock)) {
        expect(inventorBlock.party?.label).toContain('Inventor');
        expect(inventorBlock.party?.fields?.name).toBeDefined();
        expect(inventorBlock.party?.fields?.date).toBeDefined();
      }
      
      // Check for optional witness blocks (common for patent documents)
      // @ts-ignore
      const witnessBlock = template.signatureBlocks?.find((b: any) => b.id === 'witness-signature');
      if (witnessBlock && isStandardSignatureBlock(witnessBlock)) {
        expect(witnessBlock.party?.label).toContain('Witness');
      }
    });
  });

  describe('Technology Transfer Agreement Specific Tests', () => {
    it('technology-transfer-agreement should have provider and recipient signatures', async () => {
      const template = await loadTemplate('technology-transfer-agreement');
      
      // @ts-ignore
      expect(template.signatureBlocks).toBeDefined();
      // @ts-ignore
      expect(template.signatureBlocks?.length).toBe(2);
      
      // @ts-ignore
      const providerBlock = template.signatureBlocks?.find((b: any) => b.id === 'provider-signature');
      // @ts-ignore
      const recipientBlock = template.signatureBlocks?.find((b: any) => b.id === 'recipient-signature');
      
      expect(providerBlock).toBeDefined();
      expect(recipientBlock).toBeDefined();
      
      // Verify labels
      if (providerBlock && isStandardSignatureBlock(providerBlock)) {
        expect(providerBlock.party?.label).toBe('PROVIDER');
      }
      if (recipientBlock && isStandardSignatureBlock(recipientBlock)) {
        expect(recipientBlock.party?.label).toBe('RECIPIENT');
      }
      
      // Verify side-by-side layout
      if (providerBlock && isStandardSignatureBlock(providerBlock)) {
        const layout = providerBlock.layout;
        if (typeof layout === 'string') {
          expect(layout).toBe('side-by-side');
        } else {
          expect(layout?.position).toBe('side-by-side');
        }
      }
      if (recipientBlock && isStandardSignatureBlock(recipientBlock)) {
        const layout = recipientBlock.layout;
        if (typeof layout === 'string') {
          expect(layout).toBe('side-by-side');
        } else {
          expect(layout?.position).toBe('side-by-side');
        }
      }
    });

    it('technology-transfer-agreement should have initial blocks for critical sections', async () => {
      const template = await loadTemplate('technology-transfer-agreement');
      
      // @ts-ignore
      expect(template.initialBlocks).toBeDefined();
      // @ts-ignore
      expect(template.initialBlocks?.length).toBe(4);
      
      // Verify all initial blocks
      // @ts-ignore
      const initialIds = template.initialBlocks?.map((b: any) => b.id);
      expect(initialIds).toContain('technology-transfer-initials');
      expect(initialIds).toContain('financial-terms-initials');
      expect(initialIds).toContain('ip-provisions-initials');
      expect(initialIds).toContain('export-control-initials');
      
      // Verify export control is conditional
      // @ts-ignore
      const exportInitials = template.initialBlocks?.find((b: any) => b.id === 'export-control-initials');
      expect(exportInitials?.conditional).toBe(true);
    });

    it('technology-transfer-agreement should have initial markers in critical sections', async () => {
      const template = await loadTemplate('technology-transfer-agreement');
      
      const techSection = template.sections.find(s => s.id === 'technology_transfer');
      expect(techSection?.content).toContain('[INITIALS_BLOCK:technology-transfer]');
      
      const financialSection = template.sections.find(s => s.id === 'financial_terms');
      expect(financialSection?.content).toContain('[INITIALS_BLOCK:financial-terms]');
      
      const ipSection = template.sections.find(s => s.id === 'ip_provisions');
      expect(ipSection?.content).toContain('[INITIALS_BLOCK:ip-provisions]');
      
      const exportSection = template.sections.find(s => s.id === 'export_control');
      expect(exportSection?.content).toContain('[INITIALS_BLOCK:export-control]');
    });
  });
}); 