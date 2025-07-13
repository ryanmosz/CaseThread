import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Simple console logger for renderer process
const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${message}`, meta || '');
  },
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${message}`, meta || '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${message}`, meta || '');
  },
  debug: (message: string, meta?: any) => {
    console.debug(`[DEBUG] ${message}`, meta || '');
  }
};

// Log to console in development
if (process.env.NODE_ENV !== 'production') {
  logger.info('Renderer process started');
  
  // Add window error handler
  window.addEventListener('error', (event) => {
    logger.error('Window error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.stack
    });
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled rejection', {
      reason: event.reason,
      promise: event.promise
    });
  });
}

// Development helpers
if (process.env.NODE_ENV === 'development') {
  // Add PDF generation test helper to window
  (window as any).testPDF = {
    generate: (documentType: string = 'nda-ip-specific') => {
      console.log(`[TestPDF] Triggering PDF generation for ${documentType}`);
      const event = new CustomEvent('test-pdf-generate', { 
        detail: { documentType } 
      });
      window.dispatchEvent(event);
    },
    status: () => {
      console.log('[TestPDF] Current PDF generation status:');
      const pdfData = (window as any).__lastGeneratedPDF;
      if (pdfData) {
        console.log('- Last generated:', pdfData.timestamp);
        console.log('- Document type:', pdfData.documentType);
        console.log('- Buffer size:', pdfData.buffer?.byteLength || 0);
        console.log('- Metadata:', pdfData.metadata);
      } else {
        console.log('No PDF has been generated yet.');
      }
    }
  };
  
  console.log('[TestPDF] Development helpers loaded. Use window.testPDF.generate() to test PDF generation.');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 