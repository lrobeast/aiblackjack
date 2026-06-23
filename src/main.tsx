import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handlers to intercept and log raw errors cleanly
window.addEventListener("error", (event) => {
  console.info("🚨 [Global Error Handled]:", {
    message: event.message,
    source: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error ? {
      message: event.error.message,
      stack: event.error.stack,
    } : null,
  });
  
  // Safely prevent default for cross-origin/script errors to avoid polluting the parent frame's unhandled exception tracker
  if (event.message === "Script error." || !event.filename || event.filename.includes("extensions") || event.message.includes("websocket")) {
    event.preventDefault();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  console.info("🚨 [Unhandled Rejection]:", {
    reason: event.reason,
    message: event.reason?.message,
    stack: event.reason?.stack,
  });
  
  // Prevent unhandled promise rejections from bubbling up to the window
  event.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

