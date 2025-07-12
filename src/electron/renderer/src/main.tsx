import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

// Add theme classes to the root element
const root = createRoot(container);

// Add initial theme classes to the document element
document.documentElement.classList.add('light', 'text-foreground', 'bg-background');

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 