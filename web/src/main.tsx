import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App';
import './index.css';
import { performanceMonitor } from './utils/performance';

// Clear any stale authentication data on app initialization
// This ensures we don't have cached auth state
if (typeof window !== 'undefined') {
  // Check if there's a token and validate it immediately
  const token = localStorage.getItem('los_token');
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp) {
          const expiresAt = payload.exp * 1000;
          // If token is expired, clear everything
          if (Date.now() >= expiresAt) {
            console.log('Expired token detected on startup, clearing...');
            localStorage.removeItem('los_token');
            localStorage.removeItem('los_token_refresh');
            localStorage.removeItem('los_token_user');
          }
        } else {
          // No expiration, clear it
          console.log('Token without expiration, clearing...');
          localStorage.removeItem('los_token');
          localStorage.removeItem('los_token_refresh');
          localStorage.removeItem('los_token_user');
        }
      } else {
        // Invalid token format, clear it
        console.log('Invalid token format, clearing...');
        localStorage.removeItem('los_token');
        localStorage.removeItem('los_token_refresh');
        localStorage.removeItem('los_token_user');
      }
    } catch (err) {
      // Token parsing failed, clear everything
      console.log('Token parsing failed on startup, clearing...', err);
      localStorage.removeItem('los_token');
      localStorage.removeItem('los_token_refresh');
      localStorage.removeItem('los_token_user');
    }
  }
}

// Initialize performance monitoring
performanceMonitor.mark('app-start');

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);


