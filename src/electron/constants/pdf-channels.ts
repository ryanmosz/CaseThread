export const PDF_CHANNELS = {
  // Renderer → Main (invoke channels)
  GENERATE: 'pdf:generate',
  CANCEL: 'pdf:cancel',
  GET_MEMORY_USAGE: 'pdf:memory-usage',
  
  // Export channels
  EXPORT: 'pdf:export',
  EXPORT_SILENT: 'pdf:export-silent',
  
  // Progress subscription channels
  SUBSCRIBE_PROGRESS: 'pdf:subscribe-progress',
  UNSUBSCRIBE_PROGRESS: 'pdf:unsubscribe-progress',
  GET_ACTIVE_PROGRESS: 'pdf:get-active-progress',
  
  // Main → Renderer (event channels)
  PROGRESS: 'pdf:progress',
  COMPLETE: 'pdf:complete',
  ERROR: 'pdf:error',
  CANCELLED: 'pdf:cancelled',
  MEMORY_WARNING: 'pdf:memory-warning',
} as const;

// Channel validation
export const isValidPDFChannel = (channel: string): boolean => {
  return Object.values(PDF_CHANNELS).includes(channel as any);
}; 