// Shared types between main and renderer processes

export interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  path: string;
  children?: DirectoryEntry[];
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
  type: 'text' | 'textarea' | 'number' | 'email' | 'date' | 'select' | 'multiselect' | 'boolean';
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: string[]; // For select and multiselect fields
  defaultValue?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
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
  generateDocument: (templateId: string, formData: any, options?: { useMultiagent?: boolean }) => Promise<{ 
    success: boolean; 
    data?: { 
      output: string; 
      cliOutput: string;
      errors: string; 
      documentContent: string;
      savedFilePath: string;
      folderPath: string;
      folderName: string;
      categoryFolder: string;
      formDataPath: string;
    }; 
    error?: string 
  }>;
  learnFromPath: (dirPath: string) => Promise<{ success: boolean; data?: { output: string; errors: string }; error?: string }>;
  
  // Dialog operations
  showSaveDialog: (options?: any) => Promise<any>;
  showOpenDialog: (options?: any) => Promise<any>;
  
  // AI Assistant operations
  callAIAssistant: (prompt: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  
  // PDF operations
  pdf: {
    generate: (request: any) => Promise<any>;
    cancel: (request: any) => Promise<void>;
    export: (request: any) => Promise<any>;
    exportSilent: (request: any) => Promise<any>;
    subscribeProgress: (requestId: string) => Promise<{ success: boolean; error?: string }>;
    unsubscribeProgress: (requestId: string) => Promise<{ success: boolean; error?: string }>;
    getActiveProgress: () => Promise<{ subscriptions: string[]; count: number }>;
    // Event listeners for PDF operations
    onProgress: (callback: (data: any) => void) => any;
    offProgress: (callback: any) => void;
    onComplete: (callback: (data: any) => void) => any;
    offComplete: (callback: any) => void;
    onError: (callback: (data: any) => void) => any;
    offError: (callback: any) => void;
  };
  
  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => void;
  removeListener: (channel: string, callback: (...args: any[]) => void) => void;
  removeAllListeners: (channel: string) => void;
  onPDFProgress: (callback: (event: any, data: any) => void) => void;
  offPDFProgress: (callback: (event: any, data: any) => void) => void;
  onPDFComplete: (callback: (event: any, data: any) => void) => void;
  offPDFComplete: (callback: (event: any, data: any) => void) => void;
  onPDFError: (callback: (event: any, data: any) => void) => void;
  offPDFError: (callback: (event: any, data: any) => void) => void;
  
  // Legacy methods for backward compatibility
  generatePDF: (request: any) => Promise<any>;
  cancelPDFGeneration: (request: any) => Promise<void>;
}

// Types are exported for use in both main and renderer processes
// Window interface is declared in preload script 