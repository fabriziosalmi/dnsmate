import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Enhanced performance monitoring and error reporting
const startTime = performance.now();

// Monitor Core Web Vitals
const reportWebVitals = async () => {
  try {
    const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');
    
    const logVital = (metric: any) => {
      // Send to monitoring service in production
      if (process.env.NODE_ENV === 'production') {
        fetch('/api/monitoring/vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: metric.name,
            value: metric.value,
            id: metric.id,
            url: window.location.href,
            timestamp: Date.now()
          })
        }).catch(console.error);
      } else {
        console.log(`[${metric.name}]`, metric.value);
      }
    };

    getCLS(logVital);
    getFID(logVital);
    getFCP(logVital);
    getLCP(logVital);
    getTTFB(logVital);
  } catch (error) {
    console.warn('Web Vitals monitoring failed:', error);
  }
};

// Enhanced error boundary for unhandled errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  
  // Send to monitoring in production
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/monitoring/frontend-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: event.error?.message || 'Unknown error',
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: Date.now(),
        url: window.location.href
      })
    }).catch(console.error);
  }
});

// Unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/monitoring/frontend-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'unhandled_rejection',
        reason: event.reason?.toString(),
        timestamp: Date.now(),
        url: window.location.href
      })
    }).catch(console.error);
  }
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Log app initialization time
const initTime = performance.now() - startTime;
console.log(`DNSMate initialized in ${initTime.toFixed(2)}ms`);

// Start web vitals monitoring
reportWebVitals();
