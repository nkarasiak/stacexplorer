
/**
 * URL State Integration Script
 * Add this to integrate URL state management with existing search components
 */

// Import the URLStateManager
import { URLStateManager } from './utils/URLStateManager.js';

/**
 * Initialize URL state management for search synchronization
 * @param {Object} components - Application components
 */
export function initializeURLStateManagement(components) {
    const {
        inlineDropdownManager,
        aiSmartSearch,
        mapManager,
        notificationService
    } = components;
    
    console.log('[URL] Initializing URL state management...');
    
    // Create URL state manager
    const urlStateManager = new URLStateManager(
        inlineDropdownManager,
        aiSmartSearch,
        mapManager,
        notificationService
    );
    
    // Add URL management methods to global scope for easy access
    // Create window.stacExplorer if it doesn't exist yet
    if (!window.stacExplorer) {
        window.stacExplorer = {};
    }
    window.stacExplorer.urlStateManager = urlStateManager;
    
    // Add share URL functionality to UI
    // addShareURLButton(urlStateManager, notificationService);
    
    // Add URL state reset functionality
    // addResetURLButton(urlStateManager, notificationService);
    
    console.log('[SUCCESS] URL state management initialized');
    
    return urlStateManager;
}

/**
 * Add share URL button to the interface
 */
function addShareURLButton(urlStateManager, notificationService) {
    // Find a good place to add the share button (search container header)
    const searchHeader = document.getElementById('search-container-header');
    if (searchHeader) {
        // Create share button
        const shareBtn = document.createElement('button');
        shareBtn.className = 'share-url-btn';
        shareBtn.innerHTML = '<i class="material-icons">share</i>';
        shareBtn.title = 'Share search URL';
        shareBtn.style.cssText = `
            background: none;
            border: none;
            color: var(--md-text-secondary);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.2s ease;
            margin-left: 8px;
        `;
        
        // Add hover effects
        shareBtn.addEventListener('mouseenter', () => {
            shareBtn.style.color = 'var(--md-primary)';
            shareBtn.style.backgroundColor = 'var(--md-hover-overlay)';
        });
        
        shareBtn.addEventListener('mouseleave', () => {
            shareBtn.style.color = 'var(--md-text-secondary)';
            shareBtn.style.backgroundColor = 'transparent';
        });
        
        // Add click handler
        shareBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const url = await urlStateManager.copySearchURL();
            if (url) {
                console.log('[URL] Search URL copied:', url);
            }
        });
        
        // Add to header
        const headerContent = searchHeader.querySelector('.header-content') || searchHeader;
        headerContent.appendChild(shareBtn);
        
        console.log('[URL] Share URL button added');
    }
}

/**
 * Add reset URL button to the interface
 */
function addResetURLButton(urlStateManager, notificationService) {
    // Add to the button group in search summary
    const buttonGroup = document.querySelector('.global-search-summary .button-group');
    if (buttonGroup) {
        // Create reset URL button
        const resetURLBtn = document.createElement('button');
        resetURLBtn.className = 'md-btn md-btn-secondary';
        resetURLBtn.innerHTML = '<i class="material-icons">link_off</i> Clear URL';
        resetURLBtn.title = 'Clear search parameters from URL';
        
        // Add click handler
        resetURLBtn.addEventListener('click', () => {
            urlStateManager.clearURLParameters();
            // Also reset the search form
            const resetBtn = document.getElementById('summary-reset-btn');
            if (resetBtn) {
                resetBtn.click();
            }
        });
        
        // Add to button group
        buttonGroup.appendChild(resetURLBtn);
        
        console.log('[URL] Reset URL button added');
    }
}

/**
 * Enhanced event emission for AI Smart Search
 * Call this to make AI Smart Search emit URL state events
 */
export function enhanceAISearchForURLState(aiSmartSearch) {
    if (!aiSmartSearch) return;
    
    // Store original methods
    const originalExecuteSearch = aiSmartSearch.executeSearch;
    const originalCloseFullscreen = aiSmartSearch.closeFullscreen;
    
    // Override executeSearch to emit state change
    aiSmartSearch.executeSearch = function() {
        const result = originalExecuteSearch.call(this);
        
        // Emit state change after search execution
        setTimeout(() => {
            emitAISearchStateChange(this);
        }, 100);
        
        return result;
    };
    
    // Override closeFullscreen to potentially emit state changes
    aiSmartSearch.closeFullscreen = function() {
        // Emit state change before closing
        emitAISearchStateChange(this);
        
        return originalCloseFullscreen.call(this);
    };
    
    console.log('[SUCCESS] AI Smart Search enhanced for URL state');
}

/**
 * Emit AI search state change event
 */
function emitAISearchStateChange(aiSearch) {
    try {
        const currentState = {
            collection: aiSearch.selectedCollection || null,
            collectionSource: aiSearch.selectedCollectionSource || null,
            locationBbox: null,
            locationName: null,
            dateType: null,
            dateStart: null,
            dateEnd: null,
            cloudCover: aiSearch.cloudCover || 20
        };
        
        // Location state
        if (aiSearch.selectedLocation && aiSearch.selectedLocation !== 'everywhere') {
            if (Array.isArray(aiSearch.selectedLocation)) {
                currentState.locationBbox = aiSearch.selectedLocation;
            }
            
            if (aiSearch.selectedLocationResult) {
                currentState.locationName = aiSearch.selectedLocationResult.shortName || 
                                          aiSearch.selectedLocationResult.formattedName;
                
                // Include geometry if available
                if (aiSearch.selectedLocationResult.geojson) {
                    currentState.geometry = JSON.stringify(aiSearch.selectedLocationResult.geojson);
                }
                if (aiSearch.selectedLocationResult.originalText) {
                    currentState.geometry = aiSearch.selectedLocationResult.originalText;
                }
            }
        }
        
        // Date state
        if (aiSearch.selectedDate && aiSearch.selectedDate.type !== 'anytime') {
            currentState.dateType = aiSearch.selectedDate.type;
            currentState.dateStart = aiSearch.selectedDate.start;
            currentState.dateEnd = aiSearch.selectedDate.end;
        }
        
        // Emit the event
        const event = new CustomEvent('aiSearchStateChanged', {
            detail: currentState,
            bubbles: true
        });
        
        document.dispatchEvent(event);
        
        console.log('[AI] Emitted AI search state change event:', currentState);
        
    } catch (error) {
        console.error('[ERROR] Error emitting AI search state change:', error);
    }
}

/**
 * Simple initialization function for existing app
 */
export function quickInitURLState() {
    // Wait for stacExplorer to be available
    function waitForApp() {
        if (window.stacExplorer?.inlineDropdownManager && window.stacExplorer?.aiSmartSearch) {
            const components = {
                inlineDropdownManager: window.stacExplorer.inlineDropdownManager,
                aiSmartSearch: window.stacExplorer.aiSmartSearch,
                mapManager: window.stacExplorer.mapManager,
                notificationService: window.stacExplorer.notificationService || {
                    showNotification: (msg, type) => console.log(`[${type}] ${msg}`)
                }
            };
            
            // Initialize URL state management
            const urlStateManager = initializeURLStateManagement(components);
            
            // Enhance AI search
            enhanceAISearchForURLState(components.aiSmartSearch);
            
            console.log('[INIT] Quick URL state initialization complete');
            
        } else {
            setTimeout(waitForApp, 500);
        }
    }
    
    waitForApp();
}

// Auto-initialize if running as a script
if (typeof window !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(quickInitURLState, 2000);
        });
    } else {
        setTimeout(quickInitURLState, 2000);
    }
}

console.log('[URL] URL State Integration script loaded');
console.log('[INFO] Run quickInitURLState() to initialize manually');
