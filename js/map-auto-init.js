/**
 * Auto-Initialize MapManager
 * Simple script to ensure MapManager is initialized on page load
 */

import { getMapManager } from './components/map/MapManager.js';


// Function to initialize map
async function initializeMap() {
    try {
        // Get MapManager instance
        const mapManager = getMapManager();
        
        // Try auto-initialization
        const success = await mapManager.autoInitialize();
        
        if (success) {
        } else {
        }
    } catch (error) {
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
    try {
        const mapManager = getMapManager();
        if (mapManager && !mapManager.isMapReady()) {
            initializeMap();
        }
    } catch (error) {
    }
});
