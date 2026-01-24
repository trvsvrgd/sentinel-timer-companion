import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { logger } from './utils/logger';

// Global error handlers
window.addEventListener('error', (event) => {
  logger.error('Unhandled JavaScript error', event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
  event.preventDefault(); // Prevent default browser behavior
});

// Prevent memory leaks from console logging in production
if (process.env.NODE_ENV === 'production') {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Only log critical errors in production
    if (args[0] instanceof Error) {
      logger.error('Console error', args[0]);
    }
    originalConsoleError.apply(console, args);
  };
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  logger.error('Root element not found', new Error('Root element #root not found in DOM'));
  throw new Error('Root element #root not found in DOM');
}

try {
  const root = createRoot(rootElement);
  root.render(<App />);
} catch (error) {
  logger.error('Failed to render application', error instanceof Error ? error : new Error(String(error)));
  // Show user-friendly error
  rootElement.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; gap: 1rem;">
      <h1>Application Failed to Load</h1>
      <p>Please refresh the page or contact support if the problem persists.</p>
      <button onclick="window.location.reload()" style="padding: 0.5rem 1rem; cursor: pointer;">Reload</button>
    </div>
  `;
}
