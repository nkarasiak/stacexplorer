/**
 * Enhanced App Initialization with Inline Dropdown Support
 * Add this to your existing app.js file to enable inline dropdowns
 */

// Add this import at the top of your app.js file
// import { InlineDropdownManager } from './components/ui/InlineDropdownManager.js';

/**
 * Enhanced initialization function that includes inline dropdown support
 * Replace the existing search summary item initialization in app.js with this code
 */
function initializeEnhancedSearchUI(components) {
    const {
        apiClient,
        searchPanel,
        collectionManager,
        mapManager,
        notificationService,
        aiSmartSearch
    } = components;
    
    // Initialize Inline Dropdown Manager
    const inlineDropdownManager = new InlineDropdownManager(
        apiClient,
        searchPanel,
        collectionManager,
        mapManager,
        notificationService
    );
    
    console.log('✨ Inline Dropdown Manager initialized');
    
    // Enhanced clickable search title - still opens fullscreen for main search
    const searchTitle = document.getElementById('search-title');
    if (searchTitle) {
        searchTitle.addEventListener('click', () => {
            console.log('🔍 Search title clicked - opening AI Smart Search with hidden menu');
            aiSmartSearch.showMinimalistSearch({ hideMenuOnOpen: true });
        });
        console.log('🎯 Clickable search title initialized');
    } else {
        console.error('❌ Search title element not found');
    }
    
    // Enhanced behavior: Remove the old search summary item handlers
    // The InlineDropdownManager will handle them now
    
    console.log('🎨 Enhanced search interface initialized with inline dropdowns!');
    
    // Return the manager so it can be exposed to global scope
    return inlineDropdownManager;
}

/**
 * Add CSS link to HTML head dynamically
 */
function addInlineDropdownStyles() {
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'css/inline-dropdown.css';
    document.head.appendChild(cssLink);
    
    console.log('🎨 Inline dropdown styles loaded');
}

/**
 * Initialize inline dropdowns - call this in your main app initialization
 */
function initializeInlineDropdowns(components) {
    // Add CSS styles
    addInlineDropdownStyles();
    
    // Initialize the enhanced UI
    const inlineDropdownManager = initializeEnhancedSearchUI(components);
    
    // Show success notification
    if (components.notificationService) {
        setTimeout(() => {
            components.notificationService.showNotification(
                '✨ Enhanced menu dropdowns enabled! Click any search field to see inline options.',
                'success'
            );
        }, 2000);
    }
    
    return inlineDropdownManager;
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initializeInlineDropdowns, initializeEnhancedSearchUI };
}

// Global function for manual initialization
window.initializeInlineDropdowns = initializeInlineDropdowns;

console.log('📋 Enhanced app initialization script loaded');
