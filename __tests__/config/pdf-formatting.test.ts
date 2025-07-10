import { FormattingConfiguration, FormattingConfig } from '../../src/config/pdf-formatting';
import { DocumentFormattingRules } from '../../src/types/pdf';

describe('FormattingConfiguration', () => {
  const baseRules: DocumentFormattingRules = {
    lineSpacing: 'single',
    fontSize: 12,
    font: 'Times-Roman',
    margins: {
      top: 72,
      bottom: 72,
      left: 72,
      right: 72
    },
    pageNumberPosition: 'bottom-center',
    titleCase: false,
    sectionNumbering: false,
    paragraphIndent: 0,
    paragraphSpacing: 12,
    blockQuoteIndent: 36,
    signatureLineSpacing: 'single'
  };

  describe('constructor', () => {
    it('should create instance with empty config', () => {
      const config = new FormattingConfiguration();
      expect(config.getConfig()).toEqual({});
    });

    it('should create instance with provided config', () => {
      const configData: FormattingConfig = {
        overrides: {
          'nda-ip-specific': {
            lineSpacing: 'double'
          }
        }
      };
      
      const config = new FormattingConfiguration(configData);
      expect(config.getConfig()).toEqual(configData);
    });
  });

  describe('applyOverrides', () => {
    it('should return base rules when no overrides exist', () => {
      const config = new FormattingConfiguration();
      const result = config.applyOverrides('nda-ip-specific', baseRules);
      expect(result).toEqual(baseRules);
    });

    it('should apply overrides for matching document type', () => {
      const config = new FormattingConfiguration({
        overrides: {
          'nda-ip-specific': {
            lineSpacing: 'double',
            fontSize: 14
          }
        }
      });

      const result = config.applyOverrides('nda-ip-specific', baseRules);
      expect(result.lineSpacing).toBe('double');
      expect(result.fontSize).toBe(14);
      expect(result.font).toBe('Times-Roman'); // Unchanged
    });

    it('should merge margin overrides correctly', () => {
      const config = new FormattingConfiguration({
        overrides: {
          'nda-ip-specific': {
            margins: {
              top: 90,
              bottom: 72,
              left: 72,
              right: 72
            }
          }
        }
      });

      const result = config.applyOverrides('nda-ip-specific', baseRules);
      expect(result.margins.top).toBe(90);
      expect(result.margins.bottom).toBe(72);
    });

    it('should handle partial margin overrides', () => {
      const config = new FormattingConfiguration({
        overrides: {
          'nda-ip-specific': {
            margins: {
              top: 90,
              bottom: 90,
              left: 72,
              right: 72
            }
          }
        }
      });

      const result = config.applyOverrides('nda-ip-specific', baseRules);
      expect(result.margins).toEqual({
        top: 90,
        bottom: 90,
        left: 72,
        right: 72
      });
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const config = new FormattingConfiguration();
      
      config.updateConfig({
        overrides: {
          'patent-license-agreement': {
            fontSize: 11
          }
        }
      });

      const updatedConfig = config.getConfig();
      expect(updatedConfig.overrides?.['patent-license-agreement']?.fontSize).toBe(11);
    });

    it('should merge configurations', () => {
      const config = new FormattingConfiguration({
        overrides: {
          'nda-ip-specific': {
            lineSpacing: 'double'
          }
        }
      });

      config.updateConfig({
        overrides: {
          'patent-license-agreement': {
            fontSize: 14
          }
        }
      });

      const merged = config.getConfig();
      expect(merged.overrides?.['nda-ip-specific']?.lineSpacing).toBe('double');
      expect(merged.overrides?.['patent-license-agreement']?.fontSize).toBe(14);
    });
  });

  describe('clearOverrides', () => {
    it('should clear overrides for specific document type', () => {
      const config = new FormattingConfiguration({
        overrides: {
          'nda-ip-specific': { lineSpacing: 'double' },
          'patent-license-agreement': { fontSize: 14 }
        }
      });

      config.clearOverrides('nda-ip-specific');
      
      const currentConfig = config.getConfig();
      expect(currentConfig.overrides?.['nda-ip-specific']).toBeUndefined();
      expect(currentConfig.overrides?.['patent-license-agreement']?.fontSize).toBe(14);
    });

    it('should handle clearing non-existent overrides', () => {
      const config = new FormattingConfiguration();
      expect(() => config.clearOverrides('nda-ip-specific')).not.toThrow();
    });
  });

  describe('hasOverrides', () => {
    it('should return true when overrides exist', () => {
      const config = new FormattingConfiguration({
        overrides: {
          'nda-ip-specific': { lineSpacing: 'double' }
        }
      });

      expect(config.hasOverrides('nda-ip-specific')).toBe(true);
    });

    it('should return false when no overrides exist', () => {
      const config = new FormattingConfiguration({
        overrides: {
          'nda-ip-specific': { lineSpacing: 'double' }
        }
      });

      expect(config.hasOverrides('patent-license-agreement')).toBe(false);
    });

    it('should return false for empty config', () => {
      const config = new FormattingConfiguration();
      expect(config.hasOverrides('nda-ip-specific')).toBe(false);
    });
  });

  describe('applyDefaults', () => {
    it('should return base rules when no defaults configured', () => {
      const config = new FormattingConfiguration();
      const result = config.applyDefaults(baseRules);
      expect(result).toEqual(baseRules);
    });

    it('should apply default overrides', () => {
      const config = new FormattingConfiguration({
        defaults: {
          fontSize: 11,
          paragraphSpacing: 18
        }
      });

      const result = config.applyDefaults(baseRules);
      expect(result.fontSize).toBe(11);
      expect(result.paragraphSpacing).toBe(18);
      expect(result.lineSpacing).toBe('single'); // Original
    });

    it('should merge default margin overrides', () => {
      const config = new FormattingConfiguration({
        defaults: {
          margins: {
            top: 90,
            bottom: 90,
            left: 72,
            right: 72
          }
        }
      });

      const result = config.applyDefaults(baseRules);
      expect(result.margins).toEqual({
        top: 90,
        bottom: 90,
        left: 72,
        right: 72
      });
    });
  });
}); 