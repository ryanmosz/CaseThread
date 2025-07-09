import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface for type safety
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

export interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  path: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: any[];
  filePath: string;
}

// IPC Channel constants (shared with main process)
const IPC_CHANNELS = {
  READ_FILE: 'fs:readFile',
  WRITE_FILE: 'fs:writeFile',
  READ_DIRECTORY: 'fs:readDirectory',
  LOAD_TEMPLATES: 'template:loadTemplates',
  LOAD_TEMPLATE_SCHEMA: 'template:loadSchema',
  GENERATE_DOCUMENT: 'cli:generateDocument',
  LEARN_FROM_PATH: 'cli:learnFromPath',
  SHOW_SAVE_DIALOG: 'dialog:showSaveDialog',
  SHOW_OPEN_DIALOG: 'dialog:showOpenDialog',
} as const;

// Create the API object
const electronAPI: ElectronAPI = {
  // File system operations
  readFile: (filePath: string) => 
    ipcRenderer.invoke(IPC_CHANNELS.READ_FILE, filePath),
  
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.WRITE_FILE, { filePath, content }),
  
  readDirectory: (dirPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_DIRECTORY, dirPath),
  
  // Template operations
  loadTemplates: () =>
    ipcRenderer.invoke(IPC_CHANNELS.LOAD_TEMPLATES),
  
  loadTemplateSchema: (templateId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.LOAD_TEMPLATE_SCHEMA, templateId),
  
  // CLI operations
  generateDocument: (templateId: string, formData: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_DOCUMENT, { templateId, formData }),
  
  learnFromPath: (dirPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.LEARN_FROM_PATH, dirPath),
  
  // Dialog operations
  showSaveDialog: (options = {}) =>
    ipcRenderer.invoke(IPC_CHANNELS.SHOW_SAVE_DIALOG, options),
  
  showOpenDialog: (options = {}) =>
    ipcRenderer.invoke(IPC_CHANNELS.SHOW_OPEN_DIALOG, options),
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for global usage in renderer
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 