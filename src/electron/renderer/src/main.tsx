import React from 'react';
import { createRoot } from 'react-dom/client';
import { HeroUIProvider } from '@heroui/react';
import App from './App';
import './styles/globals.css';

// Legal software theme configuration
const theme = {
  colors: {
    primary: {
      DEFAULT: '#0ea5e9',
      foreground: '#ffffff'
    },
    focus: '#0ea5e9'
  }
};

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <HeroUIProvider theme={theme}>
      <App />
    </HeroUIProvider>
  </React.StrictMode>
); 