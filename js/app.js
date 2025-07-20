/**
 * Main application module for STAC Catalog Explorer
 * Ties together all components and initializes the application
 */

// Import core modules
import { UIManager } from './components/common/UIManager.js';
import { NotificationService } from './components/common/NotificationService.js';
import { MapManager, getMapManager } from './components/map/MapManager.js';
import { STACApiClient } from './components/api/StacApiClient.js';
import { UnifiedStateManager } from './utils/UnifiedStateManager.js';
// import { ShareManager } from './utils/ShareManager.js'; // REMOVED - no longer needed
import { initializeGeometrySync } from './utils/GeometrySync.js';

// Import UI components
import { CardSearchPanel } from './components/search/CardSearchPanel.js';
import { CatalogSelector } from './components/search/CatalogSelector.js';
import { CollectionManagerEnhanced } from './components/search/CollectionManagerEnhanced.js';
import { SearchForm } from './components/search/SearchForm.js';
import { ResultsPanel } from './components/results/ResultsPanel.js';
// Removed: AI Search functionality removed
import { InlineDropdownManager } from './components/ui/InlineDropdownManager.js';
import { searchHistoryUI } from './components/ui/SearchHistoryUI.js';
// Removed: URL state integration is now handled by UnifiedStateManager
// Removed inline AI search imports - only using the full-screen version now

// Import configuration
import { CONFIG } from './config.js';
import { cookieCache } from './utils/CookieCache.js';
import { searchHistoryManager } from './utils/SearchHistoryManager.js';

/**
 * Initialize the application when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', async function() {
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
        
        // AI Search functionality removed
        
        // AI Search keyboard shortcut removed
        
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
        
        // URL State Management is now handled by UnifiedStateManager
        
        console.log('[URL] URL state management initialized - search params will sync between interfaces and be stored in URL');
        
        // AI Search keyboard shortcut removed
        
        // Initialize geometry sync for seamless integration
        const geometrySync = initializeGeometrySync({
            mapManager,
            notificationService
        });
        console.log('[SYNC] GeometrySync initialized');
        
        // Initialize unified state manager after all components are ready
        const stateManager = new UnifiedStateManager({
            catalogSelector,
            mapManager, 
            searchPanel,
            inlineDropdownManager,
            notificationService
        });

        // Initialize Visualization System
        const { RasterVisualizationManager } = await import('./components/visualization/RasterVisualizationManager.js');
        const { VisualizationPanel } = await import('./components/visualization/VisualizationPanel.js');
        
        // Create visualization manager
        const rasterVisualizationManager = new RasterVisualizationManager(mapManager);
        
        // Create visualization panel container
        const vizPanelContainer = document.createElement('div');
        vizPanelContainer.id = 'visualization-panel-container';
        document.body.appendChild(vizPanelContainer);
        
        // Create visualization panel
        const visualizationPanel = new VisualizationPanel(
            vizPanelContainer, 
            rasterVisualizationManager, 
            undefined, // Use default band engine
            notificationService
        );
        
        console.log('🎨 Visualization system initialized');
        
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
                
        // Sidebar is now visible by default
        if (!stateManager.hasUrlStateParams()) {
            console.log('[INIT] No URL state detected, sidebar visible');
        } else {
            console.log('[URL] URL state parameters detected, sidebar visible for state restoration');
        }
        
        
        console.log('STAC Catalog Explorer - Initialization complete');
        
        // Expose key objects to the global scope for developer console access
        // Preserve existing window.stacExplorer properties if they exist
        window.stacExplorer = {
            ...window.stacExplorer,
            mapManager,
            apiClient,
            searchPanel,
            rasterVisualizationManager,
            visualizationPanel,
            resultsPanel,
            stateManager, // Now the unified state manager
            urlStateManager: stateManager, // Alias for backward compatibility
            collectionManager,
            inlineDropdownManager,
            geometrySync,
            config: CONFIG,
            // Visualization system
            visualizationPanel,
            rasterVisualizationManager,
            // Cache management utilities
            cache: {
                clearCollections: () => collectionManager.clearCache(),
                refreshCollections: () => collectionManager.forceRefresh(),
                getStats: () => collectionManager.getCacheStats(),
                clearAll: () => cookieCache.clearAll()
            }
        };
    } catch (error) {
        console.error('Error initializing application:', error);
        alert(`Error initializing application: ${error.message}`);
    }
});	