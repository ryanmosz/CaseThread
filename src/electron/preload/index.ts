import { contextBridge, ipcRenderer } from 'electron';
import { Template, DirectoryEntry, ElectronAPI } from '../../shared/types';

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
  CALL_AI_ASSISTANT: 'ai:callAssistant',
  // PDF channels
  PDF_GENERATE: 'pdf:generate',
  PDF_CANCEL: 'pdf:cancel',
  PDF_EXPORT: 'pdf:export',
  PDF_EXPORT_SILENT: 'pdf:export-silent',
  PDF_SUBSCRIBE_PROGRESS: 'pdf:subscribe-progress',
  PDF_UNSUBSCRIBE_PROGRESS: 'pdf:unsubscribe-progress',
  PDF_GET_ACTIVE_PROGRESS: 'pdf:get-active-progress',
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
  generateDocument: (templateId: string, formData: any, options?: { useMultiagent?: boolean }) =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_DOCUMENT, { templateId, formData, options }),
  
  learnFromPath: (dirPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.LEARN_FROM_PATH, dirPath),
  
  // Dialog operations
  showSaveDialog: (options = {}) =>
    ipcRenderer.invoke(IPC_CHANNELS.SHOW_SAVE_DIALOG, options),
  
  showOpenDialog: (options = {}) =>
    ipcRenderer.invoke(IPC_CHANNELS.SHOW_OPEN_DIALOG, options),
  
  // AI Assistant operations
  callAIAssistant: (prompt: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CALL_AI_ASSISTANT, prompt),
  
  // PDF operations
  pdf: {
    generate: (request: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.PDF_GENERATE, request),
    
    cancel: (request: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.PDF_CANCEL, request.requestId || request),
    
    export: (request: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.PDF_EXPORT, request),
    
    exportSilent: (request: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.PDF_EXPORT_SILENT, request),
    
    subscribeProgress: (requestId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PDF_SUBSCRIBE_PROGRESS, requestId),
    
    unsubscribeProgress: (requestId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PDF_UNSUBSCRIBE_PROGRESS, requestId),
    
    getActiveProgress: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PDF_GET_ACTIVE_PROGRESS),
    
    // Event listeners for PDF operations
    onProgress: (callback: (data: any) => void) => {
      const wrappedCallback = (_event: any, data: any) => callback(data);
      ipcRenderer.on('pdf:progress', wrappedCallback);
      return wrappedCallback;
    },
    
    offProgress: (callback: any) => {
      ipcRenderer.removeListener('pdf:progress', callback);
    },
    
    onComplete: (callback: (data: any) => void) => {
      const wrappedCallback = (_event: any, data: any) => callback(data);
      ipcRenderer.on('pdf:complete', wrappedCallback);
      return wrappedCallback;
    },
    
    offComplete: (callback: any) => {
      ipcRenderer.removeListener('pdf:complete', callback);
    },
    
    onError: (callback: (data: any) => void) => {
      const wrappedCallback = (_event: any, data: any) => callback(data);
      ipcRenderer.on('pdf:error', wrappedCallback);
      return wrappedCallback;
    },
    
    offError: (callback: any) => {
      ipcRenderer.removeListener('pdf:error', callback);
    },
  },
  
  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = ['pdf:progress', 'pdf:complete', 'pdf:error', 'pdf:cancelled'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },
  
  removeListener: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
  
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // Convenience methods for PDF events
  onPDFProgress: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('pdf:progress', callback);
  },
  
  offPDFProgress: (callback: (event: any, data: any) => void) => {
    ipcRenderer.removeListener('pdf:progress', callback);
  },
  
  onPDFComplete: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('pdf:complete', callback);
  },
  
  offPDFComplete: (callback: (event: any, data: any) => void) => {
    ipcRenderer.removeListener('pdf:complete', callback);
  },
  
  onPDFError: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('pdf:error', callback);
  },
  
  offPDFError: (callback: (event: any, data: any) => void) => {
    ipcRenderer.removeListener('pdf:error', callback);
  },
  
  // Legacy methods for backward compatibility
  generatePDF: (request: any) => ipcRenderer.invoke(IPC_CHANNELS.PDF_GENERATE, request),
  cancelPDFGeneration: (request: any) => ipcRenderer.invoke(IPC_CHANNELS.PDF_CANCEL, request.requestId || request),
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', electronAPI);

// Type declaration for global usage in renderer
declare global {
  interface Window {
    electron: ElectronAPI;
  }
} 