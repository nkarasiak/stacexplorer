/**
 * Main entry point for STAC Catalog Explorer
 * Modern ES6+ module-based architecture with Vite
 */

// Note: CSS imports moved back to HTML for compatibility with simple servers

// Import core application
import { initializeApp } from '../js/app.js'

// Initialize the application
async function init() {
  console.log('🚀 Vite main.js initializing...')
  
  // Ensure DOM is fully ready
  if (document.readyState !== 'complete') {
    console.log('⏳ Waiting for DOM to be complete...')
    await new Promise(resolve => {
      if (document.readyState === 'complete') {
        resolve()
      } else {
        window.addEventListener('load', resolve)
      }
    })
  }
  
  console.log('✅ DOM ready, initializing app...')
  
  // Give a small delay to ensure all elements are rendered
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Check for critical DOM elements
  const criticalElements = [
    'sidebar',
    'map',
    'main-search-btn',
    'search-container'
  ]
  
  const missingElements = criticalElements.filter(id => !document.getElementById(id))
  
  if (missingElements.length > 0) {
    console.error('❌ Critical DOM elements missing:', missingElements)
    console.error('This might indicate the HTML structure was not loaded properly')
    // Still try to initialize, but with a warning
  } else {
    console.log('✅ All critical DOM elements found')
  }
  
  // Initialize the app
  try {
    await initializeApp()
    console.log('🎉 STAC Explorer initialized successfully with Vite!')
  } catch (error) {
    console.error('❌ Failed to initialize STAC Explorer:', error)
    
    // Show user-friendly error
    const errorDiv = document.createElement('div')
    errorDiv.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      background: #f44336; color: white; padding: 15px; border-radius: 8px;
      max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `
    errorDiv.innerHTML = `
      <h3>⚠️ Initialization Error</h3>
      <p>The STAC Explorer failed to start properly.</p>
      <details>
        <summary>Technical Details</summary>
        <pre style="font-size: 12px; margin-top: 10px;">${error.message || error}</pre>
      </details>
      <button onclick="window.location.reload()" style="margin-top: 10px; padding: 5px 10px; background: #fff; color: #333; border: none; border-radius: 4px; cursor: pointer;">
        🔄 Reload Page
      </button>
    `
    document.body.appendChild(errorDiv)
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  // If already loaded, wait a bit for Vite's module loading
  setTimeout(init, 50)
}

// Hot Module Replacement for development
if (import.meta.hot) {
  import.meta.hot.accept('@/app.js', (newModule) => {
    if (newModule) {
      console.log('🔄 App module updated')
    }
  })
}