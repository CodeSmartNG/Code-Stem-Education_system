import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

// ✅ Add debug logs
console.log('🚀 main.jsx loaded successfully!');

// ✅ Check if root element exists
const rootElement = document.getElementById('root');
console.log('📍 Root element:', rootElement);

if (!rootElement) {
  console.error('❌ Root element not found!');
  document.body.innerHTML = `
    <div style="padding:20px;text-align:center;font-family:sans-serif;background:#f5f5f5;min-height:100vh;">
      <h1 style="color:#dc2626;">❌ Error</h1>
      <p>Root element not found. Please check your index.html.</p>
      <p style="font-size:12px;color:#666;">If you're seeing this, the script is loading but the root div is missing.</p>
    </div>
  `;
} else {
  console.log('✅ Root element found!');
  
  try {
    console.log('🔄 Creating React root...');
    const root = ReactDOM.createRoot(rootElement);
    
    console.log('🔄 Rendering React app...');
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
    
    console.log('✅ React app rendered successfully!');
  } catch (error) {
    console.error('❌ Error rendering app:', error);
    rootElement.innerHTML = `
      <div style="padding:20px;text-align:center;font-family:sans-serif;background:#f5f5f5;min-height:100vh;">
        <h1 style="color:#dc2626;">❌ Error Loading App</h1>
        <p style="color:#666;">${error.message}</p>
        <button onclick="window.location.reload()" style="padding:10px 20px;margin-top:10px;cursor:pointer;background:#4f46e5;color:white;border:none;border-radius:5px;">
          🔄 Refresh
        </button>
      </div>
    `;
  }
}

// ============================================
// ✅ PWA SERVICE WORKER REGISTRATION
// (Required for the Share Target to work)
// ============================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('✅ PWA Service Worker registered successfully', reg))
      .catch((err) => console.error('❌ Service Worker registration failed', err));
  });
}
