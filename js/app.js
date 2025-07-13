/**
 * Main application module for STAC Catalog Explorer
 * Ties together all components and initializes the application
 */

// Import core modules
import { UIManager } from './components/common/UIManager.js';
import { NotificationService } from './components/common/NotificationService.js';
import { MapManager, getMapManager } from './components/map/MapManager.js';
import { STACApiClient } from './components/api/StacApiClient.js';
import { StateManager } from './utils/StateManager.js';
// import { ShareManager } from './utils/ShareManager.js'; // REMOVED - no longer needed
import { initializeGeometrySync } from './utils/GeometrySync.js';

// Import UI components
import { CardSearchPanel } from './components/search/CardSearchPanel.js';
import { CatalogSelector } from './components/search/CatalogSelector.js';
import { CollectionManagerEnhanced } from './components/search/CollectionManagerEnhanced.js';
import { SearchForm } from './components/search/SearchForm.js';
import { ResultsPanel } from './components/results/ResultsPanel.js';
import { AISmartSearchEnhanced } from './components/search/AISmartSearchEnhanced.js';
import { InlineDropdownManager } from './components/ui/InlineDropdownManager.js';
import { initializeURLStateManagement, enhanceAISearchForURLState } from './url-state-integration.js';
// Removed inline AI search imports - only using the full-screen version now

// Import configuration
import { CONFIG } from './config.js';

/**
 * Initialize the application when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('STAC Catalog Explorer - Initializing application...');
    
    try {
        // Set initial theme
        document.documentElement.classList.add('dark-theme');
        
        // Initialize core services
        const notificationService = new NotificationService();
        
        // Use the global MapManager instance to prevent duplicates
        const mapManager = getMapManager('map', CONFIG);
        mapManager.initialize('map').catch(error => {
            console.error('Failed to initialize map:', error);
        });
        
        const apiClient = new STACApiClient(); // Initialize without any endpoint
        
        // Initialize UI manager
        const uiManager = new UIManager();
        
        // Initialize catalog selector first to handle default catalog load
        const catalogSelector = new CatalogSelector(apiClient, notificationService);
        
        // Initialize enhanced collection manager with auto-loading from all sources
        const collectionManager = new CollectionManagerEnhanced(apiClient, notificationService, catalogSelector, CONFIG);
        
        // Initialize results panel and search form
        const resultsPanel = new ResultsPanel(apiClient, mapManager, notificationService);
        const searchForm = new SearchForm(mapManager);
        
        // Initialize search panel with all required components
        const searchPanel = new CardSearchPanel(
            apiClient, 
            resultsPanel, 
            catalogSelector,
            collectionManager, 
            searchForm,
            notificationService
        );
        
        // Initialize AI Smart Search Enhanced component (full-screen only)
        const aiSmartSearch = new AISmartSearchEnhanced(
            apiClient,
            searchPanel,
            collectionManager,
            mapManager,
            notificationService
        );
        
        // FIX: Set up keyboard shortcut (Ctrl+K / Cmd+K) to open AI Smart Search
        document.addEventListener('keydown', (event) => {
            // Check for Ctrl+K (Windows/Linux) or Cmd+K (Mac)
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault(); // Prevent browser's default search
                console.log('[SHORTCUT] Keyboard shortcut triggered - opening AI Smart Search');
                aiSmartSearch.showMinimalistSearch({ hideMenuOnOpen: false });
            }
        });
        
        // REMOVED: Clickable search title functionality
        // Search title is no longer clickable
        
        // NEW: Initialize Inline Dropdown Manager for enhanced menu behavior
        const inlineDropdownManager = new InlineDropdownManager(
            apiClient,
            searchPanel,
            collectionManager,
            mapManager,
            notificationService
        );
        
        console.log('[DROPDOWN] Enhanced inline dropdowns initialized for left menu');
        
        // NEW: Initialize URL State Management for perfect synchronization
        const urlStateManager = initializeURLStateManagement({
            inlineDropdownManager,
            aiSmartSearch,
            mapManager,
            notificationService
        });
        
        // Enhance AI Search for URL state events
        enhanceAISearchForURLState(aiSmartSearch);
        
        console.log('[URL] URL state management initialized - search params will sync between interfaces and be stored in URL');
        
        console.log('[KEYBOARD] AI Smart Search keyboard shortcut (Ctrl+K / Cmd+K) initialized');
        
        // Initialize geometry sync for seamless integration (simplified for full-screen only)
        const geometrySync = initializeGeometrySync({
            aiSmartSearch,
            mapManager,
            notificationService
        });
        console.log('[SYNC] GeometrySync initialized - map will sync with AI Search');
        
        // Initialize state manager after all components are ready
        const stateManager = new StateManager(catalogSelector, mapManager, searchPanel);
        
        // REMOVED: Share manager (no longer needed)
        // const shareManager = new ShareManager(stateManager, notificationService);
        
        // Set up initial date range if configured
        if (CONFIG.appSettings.defaultDateRange > 0) {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - CONFIG.appSettings.defaultDateRange);
            
            // Format dates as YYYY-MM-DD for the input fields
            const formatDateForInput = (date) => {
                return date.toISOString().split('T')[0];
            };
            
            document.getElementById('date-start').value = formatDateForInput(startDate);
            document.getElementById('date-end').value = formatDateForInput(endDate);
        } else {
            // Set to "anytime" by default
            const startInput = document.getElementById('date-start');
            const endInput = document.getElementById('date-end');
            if (startInput) startInput.value = '';
            if (endInput) endInput.value = '';
            
            // Update the search summary to show "ANYTIME"
            const dateField = document.getElementById('ai-field-date-inline');
            if (dateField) {
                dateField.textContent = 'ANYTIME';
            }
        }
                
        // Sidebar is now visible by default - AI Smart Search Enhanced available via button click
        if (!stateManager.hasUrlStateParams()) {
            console.log('[AI] No URL state detected, sidebar visible with AI Smart Search ready');
            // Don't auto-show AI Smart Search Enhanced - let users click the button when they want it
            // The sidebar is now visible by default with the AI Smart Search interface available
        } else {
            console.log('[URL] URL state parameters detected, sidebar visible for state restoration');
            // Sidebar is already visible and state restoration will populate it properly
        }
        
        // AI Smart Search Enhanced is ready
        console.log('[AI] AI Smart Search Enhanced is ready!');
        
        
        console.log('STAC Catalog Explorer - Initialization complete');
        
        // Expose key objects to the global scope for developer console access
        // Preserve existing window.stacExplorer properties if they exist
        window.stacExplorer = {
            ...window.stacExplorer, // Preserve existing properties (like urlStateManager)
            mapManager,
            apiClient,
            searchPanel,
            resultsPanel,
            stateManager,
            // shareManager removed - no longer needed
            aiSmartSearch,
            inlineDropdownManager,
            urlStateManager,
            geometrySync,
            config: CONFIG
        };
    } catch (error) {
        console.error('Error initializing application:', error);
        alert(`Error initializing application: ${error.message}`);
    }
});	