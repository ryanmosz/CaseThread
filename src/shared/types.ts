// Shared types between main and renderer processes

export interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  path: string;
}

export interface Template {
  id: string;
  name: string;
  type: string;
  version: string;
  description: string;
  complexity: string;
  estimatedTime: string;
  metadata: {
    category: string;
    jurisdiction: string;
    lastUpdated: string;
    author: string;
  };
  requiredFields: TemplateField[];
  sections?: TemplateSection[];
  filePath: string;
}

export interface TemplateField {
  id: string;
  name: string;
  label?: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'date' | 'select' | 'boolean';
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: string[]; // For select fields
  defaultValue?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface TemplateSection {
  id: string;
  title: string;
  order: number;
  required: boolean;
  content: string;
  firmCustomizable: boolean;
  conditionalOn?: {
    field: string;
    value: string;
  };
  prompts?: {
    system: string;
    user: string;
    temperature: number;
    maxTokens: number;
  };
}

export interface ElectronAPI {
  // File system operations
  readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  readDirectory: (dirPath: string) => Promise<{ success: boolean; data?: DirectoryEntry[]; error?: string }>;
  
  // Template operations
  loadTemplates: () => Promise<{ success: boolean; data?: Template[]; error?: string }>;
  loadTemplateSchema: (templateId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  
  // CLI operations
  generateDocument: (templateId: string, formData: any) => Promise<{ success: boolean; data?: { output: string; errors: string }; error?: string }>;
  learnFromPath: (dirPath: string) => Promise<{ success: boolean; data?: { output: string; errors: string }; error?: string }>;
  
  // Dialog operations
  showSaveDialog: (options?: any) => Promise<any>;
  showOpenDialog: (options?: any) => Promise<any>;
}

// Types are exported for use in both main and renderer processes
// Window interface is declared in preload script 