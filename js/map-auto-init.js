/**
 * Auto-Initialize MapManager
 * Simple script to ensure MapManager is initialized on page load
 */

(function() {
    'use strict';
    
    console.log('🚀 MapManager Auto-Initializer loaded');
    
    // Function to initialize map
    async function initializeMap() {
        try {
            // Check if MapManager is available
            if (typeof window.getMapManager === 'function') {
                const mapManager = window.getMapManager();
                
                // Try auto-initialization
                const success = await mapManager.autoInitialize();
                
                if (success) {
                    console.log('✅ MapManager initialized successfully');
                } else {
                    console.warn('⚠️ No suitable map container found. Ensure you have an element with id="map"');
                }
            } else {
                console.error('❌ MapManager not found. Make sure MapManager.js is loaded first.');
            }
        } catch (error) {
            console.error('❌ Failed to initialize MapManager:', error);
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeMap);
    } else {
        // DOM is already ready
        setTimeout(initializeMap, 100); // Small delay to ensure MapManager is loaded
    }
    
    // Fallback: also try on window load
    window.addEventListener('load', () => {
        // Check if map is already initialized
        if (window.getMapManager && !window.getMapManager().isMapReady()) {
            console.log('🔄 Retrying MapManager initialization...');
            initializeMap();
        }
    });
    
})();
