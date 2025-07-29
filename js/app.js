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
import { UnifiedRouter } from './utils/UnifiedRouter.js';
// import { ShareManager } from './utils/ShareManager.js'; // REMOVED - no longer needed
import { initializeGeometrySync } from './utils/GeometrySync.js';
import { GeocodingService } from './utils/GeocodingService.js';

// Import UI components
import { CardSearchPanel } from './components/search/CardSearchPanel.js';
import { CatalogSelector } from './components/search/CatalogSelector.js';
import { CollectionManagerEnhanced } from './components/search/CollectionManagerEnhanced.js';
import { CollectionSelectorIntegration } from './components/search/CollectionSelectorIntegration.js';
import { SearchForm } from './components/search/SearchForm.js';
import { FilterManager } from './components/search/FilterManager.js';
import { ResultsPanel } from './components/results/ResultsPanel.js';
// Removed: AI Search functionality removed
import { InlineDropdownManager } from './components/ui/InlineDropdownManager.js';
import { searchHistoryUI } from './components/ui/SearchHistoryUI.js';
import { CommandPalette } from './components/ui/CommandPalette.js';
import { SatelliteAnimation } from './components/ui/SatelliteAnimation.js';
import { InteractiveTutorial } from './components/ui/InteractiveTutorial.js';
import { ViewModeToggle } from './components/ui/ViewModeToggle.js';
import { CatalogBrowserPanel } from './components/search/CatalogBrowserPanel.js';
import { ItemViewPage } from './components/pages/ItemViewPage.js';
// Removed: URL state integration is now handled by UnifiedStateManager
// Removed inline AI search imports - only using the full-screen version now

// Import configuration
import { CONFIG } from './config.js';
import { cookieCache } from './utils/CookieCache.js';
import { searchHistoryManager } from './utils/SearchHistoryManager.js';
import { DateUtils } from './utils/DateUtils.js';
import { offlineManager } from './utils/OfflineManager.js';

// Export the main initialization function for Vite
export async function initializeApp() {
  await initApp();
}

// Full initialization for browser mode - now compatible with viewer mode
async function initAppForBrowserMode() {
    try {
        console.log('🚀 Full initialization for browser mode (compatible with viewer)');
        
        // Initialize all services (same as viewer mode)
        const notificationService = new NotificationService();
        const uiManager = new UIManager();
        const apiClient = new STACApiClient();
        
        // Initialize map manager (hidden for browser mode but fully functional)
        const mapManager = new MapManager();
        
        // Initialize catalog selector first (will be updated with collection manager)
        const catalogSelector = new CatalogSelector(apiClient, null, notificationService);
        
        // Initialize collection manager
        const collectionManager = new CollectionManagerEnhanced(apiClient, notificationService, catalogSelector, CONFIG);
        
        // Update catalog selector with collection manager
        catalogSelector.collectionManager = collectionManager;
        
        // Initialize filter manager (needs container element)
        const filterContainer = document.getElementById('smart-filters-container') || 
                               document.getElementById('search-container') || 
                               document.querySelector('.sidebar-content') ||
                               document.body; // Ultimate fallback
        const filterManager = new FilterManager(filterContainer, notificationService);
        
        // Initialize results panel (without inline dropdown manager initially)
        const resultsPanel = new ResultsPanel(
            apiClient,
            notificationService,
            mapManager,
            notificationService,
            null // Will be updated below
        );
        
        // Initialize search form
        const searchForm = new SearchForm(mapManager, null);
        
        // Initialize search panel
        const searchPanel = new CardSearchPanel(
            apiClient, 
            resultsPanel, 
            catalogSelector,
            collectionManager, 
            searchForm,
            notificationService
        );
        
        // Initialize Inline Dropdown Manager
        const inlineDropdownManager = new InlineDropdownManager(
            apiClient,
            searchPanel,
            collectionManager,
            mapManager,
            notificationService
        );
        
        // Update results panel with inline dropdown manager
        resultsPanel.inlineDropdownManager = inlineDropdownManager;
        
        // Initialize collection selector integration
        const collectionSelectorIntegration = new CollectionSelectorIntegration(
            collectionManager, 
            apiClient, 
            notificationService, 
            CONFIG
        );
        
        // Load collections
        await collectionManager.loadAllCollectionsOnStartup();
        
        // Update filters for collections
        if (collectionManager && collectionManager.allCollections && collectionManager.allCollections.length > 0) {
            filterManager.updateFiltersForCollections(collectionManager.allCollections);
        }
        
        // Update search form with inline dropdown manager
        if (searchForm.inlineDropdownManager === null) {
            searchForm.inlineDropdownManager = inlineDropdownManager;
        }
        
        // Initialize catalog browser and item view page
        const catalogBrowser = new CatalogBrowserPanel(apiClient, notificationService, CONFIG);
        const itemViewPage = new ItemViewPage(apiClient, notificationService, CONFIG);
        
        // Initialize view mode toggle - set to catalog mode for browser
        const viewModeToggle = new ViewModeToggle();
        viewModeToggle.setMode('catalog', true);
        
        // Initialize full state manager with all components
        const stateManager = new UnifiedStateManager({
            mapManager,
            searchPanel,
            inlineDropdownManager,
            catalogBrowser,
            viewModeToggle,
            notificationService
        });
        
        // For browser mode, hide map initially but allow toggling
        const mapContainer = document.getElementById('map');
        if (mapContainer) mapContainer.style.display = 'none';
        
        // Allow sidebar to be visible in browser mode for toggling between modes
        const searchContainer = document.querySelector('.sidebar');
        if (searchContainer) {
            // Keep sidebar visible but initially collapsed/minimized for browser mode
            searchContainer.style.display = 'block';
        }
        
        // Initialize router
        const unifiedRouter = new UnifiedRouter(stateManager);
        
        // Show catalog browser for browser mode
        catalogBrowser.show(true);
        
        // Make all components globally accessible (same as viewer mode)
        if (!window.stacExplorer) window.stacExplorer = {};
        window.stacExplorer.unifiedStateManager = stateManager;
        window.stacExplorer.unifiedRouter = unifiedRouter;
        window.stacExplorer.catalogBrowser = catalogBrowser;
        window.stacExplorer.itemViewPage = itemViewPage;
        window.stacExplorer.viewModeToggle = viewModeToggle;
        window.stacExplorer.notificationService = notificationService;
        window.stacExplorer.uiManager = uiManager;
        window.stacExplorer.mapManager = mapManager;
        window.stacExplorer.searchPanel = searchPanel;
        window.stacExplorer.inlineDropdownManager = inlineDropdownManager;
        window.stacExplorer.collectionManager = collectionManager;
        window.stacExplorer.apiClient = apiClient;
        window.stacExplorer.resultsPanel = resultsPanel;
        window.stacExplorer.catalogSelector = catalogSelector;
        window.stacExplorer.filterManager = filterManager;
        window.stacExplorer.searchForm = searchForm;
        
        // Set up location input event listeners for both browser and viewer modes
        setTimeout(() => {
            setupLocationInputs(inlineDropdownManager);
        }, 100);
        
        // Set up view mode change handlers to show/hide UI elements in browser mode
        viewModeToggle.onModeChange = (mode) => {
            const mapContainer = document.getElementById('map');
            const sidebarContent = document.querySelector('.sidebar-content');
            
            if (mode === 'map') {
                // Show map and search UI
                if (mapContainer) mapContainer.style.display = 'block';
                if (sidebarContent) sidebarContent.style.display = 'block';
                // Hide catalog browser
                catalogBrowser.hide();
            } else if (mode === 'catalog') {
                // Hide map, show catalog browser
                if (mapContainer) mapContainer.style.display = 'none';
                // Keep sidebar visible for mode toggle
                catalogBrowser.show();
            }
        };
        
        console.log('✅ Full browser mode initialization complete (compatible with viewer)');
        
        // Show the page now that initialization is complete
        if (window.__STAC_SHOW_PAGE) {
            window.__STAC_SHOW_PAGE();
        }
        
    } catch (error) {
        console.error('❌ Error in full browser mode initialization:', error);
        // Fallback to normal initialization
        await initAppNormal();
    }
}

// Keep the original function for backwards compatibility
async function initApp() {
    
    try {
        // Check if early detection already identified this as a browser deep link
        if (window.__STAC_EARLY_BROWSER_MODE) {
            console.log('🚀 Early browser mode detected, using fast initialization');
            await initAppForBrowserMode();
            return;
        }
        
        // Fallback detection for browser mode (including root browser path)
        const path = window.location.pathname;
        const isBrowserMode = path.startsWith('/browser');
        
        if (isBrowserMode) {
            console.log('🚀 Browser mode detected (fallback), using fast initialization:', path);
            await initAppForBrowserMode();
            return;
        }
        
        await initAppNormal();
    } catch (error) {
        console.error('Error initializing application:', error);
        alert(`Error initializing application: ${error.message}`);
    }
}

// Normal initialization for map/search mode  
async function initAppNormal() {
    try {
        console.log('🌍 Normal initialization for map/search mode');
        
        // Initialize core services
        const notificationService = new NotificationService();
        
        // Initialize UI manager first to set theme before map initialization
        const uiManager = new UIManager();
        
        // Use the global MapManager instance to prevent duplicates
        const mapManager = getMapManager('map', CONFIG);
        
        const apiClient = new STACApiClient(); // Initialize without any endpoint
        
        // Initialize GeocodingService for tutorial
        const geocodingService = new GeocodingService();
        
        // Make geocoding service available globally for location search
        window.geocodingService = geocodingService;
        
        // Add initialization function for location search
        window.initializeGeocodingService = async () => {
            if (!window.geocodingService) {
                window.geocodingService = new GeocodingService();
            }
            return window.geocodingService;
        };
        
        // Initialize catalog selector first to handle default catalog load
        const catalogSelector = new CatalogSelector(apiClient, notificationService, CONFIG);
        
        // Wait for map to be ready before initializing collection manager
        await mapManager.initialize('map').then(() => {
            // Update Deck.gl status indicator
            updateDeckGLStatus(mapManager);
            
            // Trigger theme update for map after initialization
            const currentTheme = document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light';
            console.log('🎨 Map initialized, applying current theme:', currentTheme);
            document.dispatchEvent(new CustomEvent('themeChange', {
                detail: { 
                    theme: currentTheme === 'light' ? 'Light' : 'Dark',
                    themeMode: currentTheme
                }
            }));
        }).catch(error => {
            console.error('Failed to initialize map:', error);
        });
        
        // Initialize enhanced collection manager 
        const collectionManager = new CollectionManagerEnhanced(apiClient, notificationService, catalogSelector, CONFIG);
        
        // Delay collection selector integration until after UI components are ready
        let collectionSelectorIntegration = null;
        
        // Initialize results panel 
        const resultsPanel = new ResultsPanel(apiClient, mapManager, notificationService);
        
        // Initialize smart filter system
        const filterContainer = document.getElementById('smart-filters-container');
        const filterManager = new FilterManager(filterContainer, notificationService);
        
        // Make components globally accessible
        if (!window.stacExplorer) window.stacExplorer = {};
        window.stacExplorer.filterManager = filterManager;
        window.stacExplorer.collectionSelectorIntegration = collectionSelectorIntegration;
        
        // Initialize search form first (needed by search panel)
        const searchForm = new SearchForm(mapManager, null); // Initially null, will be updated below
        
        // Initialize search panel with all required components
        const searchPanel = new CardSearchPanel(
            apiClient, 
            resultsPanel, 
            catalogSelector,
            collectionManager, 
            searchForm,
            notificationService
        );
        
        // Initialize Inline Dropdown Manager for enhanced menu behavior BEFORE loading collections
        const inlineDropdownManager = new InlineDropdownManager(
            apiClient,
            searchPanel,
            collectionManager,
            mapManager,
            notificationService
        );
        
        // Initialize collection selector integration after UI components are ready
        collectionSelectorIntegration = new CollectionSelectorIntegration(
            collectionManager, 
            apiClient, 
            notificationService, 
            CONFIG
        );
        
        // Start collection loading after all core components are ready (including dropdown manager)
        await collectionManager.loadAllCollectionsOnStartup();
        
        // Check if collections are already loaded and trigger filter update
        if (collectionManager && collectionManager.allCollections && collectionManager.allCollections.length > 0) {
            filterManager.updateFiltersForCollections(collectionManager.allCollections);
        }
        
        
        // Update search form with inline dropdown manager for location updates
        if (searchForm.inlineDropdownManager === null) {
            searchForm.inlineDropdownManager = inlineDropdownManager;
        }
        
        // URL State Management is now handled by UnifiedStateManager
        
        
        // AI Search keyboard shortcut removed
        
        // Initialize geometry sync for seamless integration
        const geometrySync = initializeGeometrySync({
            mapManager,
            notificationService,
            inlineDropdownManager
        });
        
        // Initialize catalog browser and view mode toggle
        const catalogBrowser = new CatalogBrowserPanel(apiClient, notificationService, CONFIG);
        const itemViewPage = new ItemViewPage(apiClient, notificationService, CONFIG);
        const viewModeToggle = new ViewModeToggle();
        
        // Set up catalog browser event handlers
        catalogBrowser.setItemSelectHandler((item) => {
            // When an item is selected, add it to the map and results
            resultsPanel.displayResults([item]);
            mapManager.displaySearchResults([item]);
            notificationService.showNotification(`Selected item: ${item.properties?.title || item.id}`, 'info');
        });
        
        catalogBrowser.setCollectionSelectHandler((collection) => {
            // When a collection is selected, update the search form
            if (collectionManager) {
                collectionManager.selectCollection(collection.id);
                notificationService.showNotification(`Selected collection: ${collection.title || collection.id}`, 'info');
            }
        });
        
        // Set up view mode toggle handler
        viewModeToggle.setModeChangeHandler((mode) => {
            if (mode === 'catalog') {
                catalogBrowser.show();
            } else {
                catalogBrowser.hide();
            }
        });

        // Initialize unified state manager after all components are ready
        const stateManager = new UnifiedStateManager({
            catalogSelector,
            mapManager, 
            searchPanel,
            inlineDropdownManager,
            notificationService,
            catalogBrowser,
            viewModeToggle
        });
        
        // Initialize unified router for clean URLs
        const unifiedRouter = new UnifiedRouter(stateManager);
        
        // Make components globally accessible
        window.stacExplorer.unifiedStateManager = stateManager;
        window.stacExplorer.unifiedRouter = unifiedRouter;
        window.stacExplorer.catalogBrowser = catalogBrowser;
        window.stacExplorer.itemViewPage = itemViewPage;
        window.stacExplorer.viewModeToggle = viewModeToggle;
        
        // Manual URL restoration as a fallback after everything is loaded
        setTimeout(async () => {
            const params = new URLSearchParams(window.location.search);
            if (params.has('vm') && params.get('vm') === 'browser') {
                console.log('🔄 Attempting manual URL restoration as fallback...');
                await stateManager.manuallyRestoreUrlState();
            }
        }, 2000);

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
        
        
        // Initialize Command Palette
        const commandPalette = new CommandPalette();
        
        // Register STAC Explorer specific commands
        commandPalette.registerCommand({
            id: 'focus-search',
            title: 'Focus Search Field',
            description: 'Jump to the main search interface',
            category: 'navigation',
            keywords: ['search', 'find', 'focus'],
            action: () => {
                const searchBtn = document.getElementById('main-search-btn');
                if (searchBtn) {
                    searchBtn.click();
                    searchBtn.focus();
                } else {
                    console.error('🎯 Search button not found!');
                }
            }
        });
        
        commandPalette.registerCommand({
            id: 'toggle-sidebar',
            title: 'Toggle Sidebar',
            description: 'Show or hide the sidebar',
            category: 'navigation',
            keywords: ['sidebar', 'menu', 'toggle', 'hide', 'show'],
            action: () => {
                const toggle = document.getElementById('sidebar-toggle');
                if (toggle) {
                    toggle.click();
                } else {
                    console.error('🎯 Sidebar toggle not found!');
                }
            }
        });
        
        commandPalette.registerCommand({
            id: 'show-tutorial',
            title: 'Show Tutorial',
            description: 'Start the interactive tutorial for beginners',
            category: 'help',
            keywords: ['tutorial', 'help', 'guide', 'learn', 'walkthrough'],
            action: () => {
                interactiveTutorial.start();
            }
        });
        
        commandPalette.registerCommand({
            id: 'view-results',
            title: 'View Results',
            description: 'Scroll to search results',
            category: 'navigation', 
            keywords: ['results', 'view', 'scroll'],
            action: () => {
                const resultsCard = document.getElementById('results-card');
                if (resultsCard) {
                    resultsCard.scrollIntoView({ behavior: 'smooth' });
                } else {
                    console.error('🎯 Results card not found!');
                }
            }
        });
        
        // Add time preset commands
        const timePresets = [
            { value: 'anytime', title: 'Anytime', description: 'No date restriction', icon: 'all_inclusive' },
            { value: 'last7days', title: 'Last 7 days', description: 'Past week including today', icon: 'view_week' },
            { value: 'last30days', title: 'Last 30 days', description: 'Past month including today', icon: 'calendar_month' },
            { value: 'last3days', title: 'Last 3 days', description: 'Past 3 days including today', icon: 'view_day' },
            { value: 'thisweek', title: 'This week', description: 'Monday to Sunday (current week)', icon: 'date_range' },
            { value: 'lastweek', title: 'Last week', description: 'Previous Monday to Sunday', icon: 'skip_previous' },
            { value: 'thismonth', title: 'This month', description: 'First to last day of current month', icon: 'calendar_today' },
            { value: 'lastmonth', title: 'Last month', description: 'Previous month (first to last day)', icon: 'skip_previous' },
            { value: 'last90days', title: 'Last 3 months', description: 'Past 3 months including today', icon: 'calendar_view_month' },
            { value: 'last6months', title: 'Last 6 months', description: 'Past 6 months including today', icon: 'view_timeline' },
            { value: 'thisyear', title: 'This year', description: 'January 1st to December 31st (current year)', icon: 'calendar_view_year' },
            { value: 'lastyear', title: 'Last year', description: 'Previous year (January to December)', icon: 'skip_previous' }
        ];
        
        timePresets.forEach(preset => {
            commandPalette.registerCommand({
                id: `time-${preset.value}`,
                title: `Time: ${preset.title}`,
                description: preset.description,
                category: 'time',
                keywords: ['time', 'date', preset.title.toLowerCase()],
                action: () => {
                    // Calculate the actual date range for this preset
                    const dateRange = DateUtils.calculateDateRange(preset.value);
                    
                    // Fill the date input fields if we have valid dates
                    if (dateRange.start && dateRange.end) {
                        const startInput = document.getElementById('date-start');
                        const endInput = document.getElementById('date-end');
                        
                        if (startInput && endInput) {
                            startInput.value = dateRange.start;
                            endInput.value = dateRange.end;
                            
                            // Trigger change events to update any listeners
                            startInput.dispatchEvent(new Event('change', { bubbles: true }));
                            endInput.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        
                        // Update the left panel search summary
                        if (window.stacExplorer && window.stacExplorer.inlineDropdownManager) {
                            const displayText = `${dateRange.start} to ${dateRange.end}`;
                            window.stacExplorer.inlineDropdownManager.updateSearchSummary('date', displayText.toUpperCase());
                        }
                    } else if (preset.value === 'anytime') {
                        // Clear date inputs for "anytime"
                        const startInput = document.getElementById('date-start');
                        const endInput = document.getElementById('date-end');
                        
                        if (startInput && endInput) {
                            startInput.value = '';
                            endInput.value = '';
                            
                            // Trigger change events
                            startInput.dispatchEvent(new Event('change', { bubbles: true }));
                            endInput.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        
                        // Update the left panel search summary for anytime
                        if (window.stacExplorer && window.stacExplorer.inlineDropdownManager) {
                            window.stacExplorer.inlineDropdownManager.updateSearchSummary('date', 'ANYTIME');
                        }
                    }
                    
                    // Also use the inline dropdown manager to handle the selection
                    if (window.stacExplorer && window.stacExplorer.inlineDropdownManager) {
                        window.stacExplorer.inlineDropdownManager.handleDateSelection(preset.value);
                    } else {
                        console.error('🎯 Inline dropdown manager not found!');
                    }
                }
            });
        });
        
        // Add custom date range command
        commandPalette.registerCommand({
            id: 'time-custom',
            title: 'Time: Custom Date Range',
            description: 'Select your own start and end dates',
            category: 'time',
            keywords: ['time', 'date', 'custom', 'range', 'picker'],
            action: () => {
                // Use the inline dropdown manager to open custom date picker
                if (window.stacExplorer && window.stacExplorer.inlineDropdownManager) {
                    window.stacExplorer.inlineDropdownManager.openFlatpickrCalendar();
                } else {
                    console.error('🎯 Inline dropdown manager not found!');
                }
            }
        });
        
        // Initialize Satellite Animation
        const satelliteAnimation = new SatelliteAnimation();
        
        // Make satellite animation globally accessible for debugging
        window.satelliteAnimation = satelliteAnimation;
        
        // Initialize Interactive Tutorial
        const interactiveTutorial = new InteractiveTutorial();
        
        // REMOVED: Share manager (no longer needed)
        // const shareManager = new ShareManager(stateManager, notificationService);
        
        // Set up initial date range if configured
        if (CONFIG.appSettings.defaultDateRange > 0) {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - CONFIG.appSettings.defaultDateRange);
            
            // Format dates as YYYY-MM-DD for the input fields
            const formatDateForInput = (date) => {
                // Use local date to avoid timezone shifts
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
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
        
        
        
        // Debug offline manager status
        
        // Set up location input event listeners for both browser and viewer modes
        setTimeout(() => {
            setupLocationInputs(inlineDropdownManager);
        }, 100);
        
        // Expose key objects to the global scope for developer console access
        // Preserve existing window.stacExplorer properties if they exist
        window.stacExplorer = {
            ...window.stacExplorer,
            mapManager,
            apiClient,
            searchPanel,
            rasterVisualizationManager,
            visualizationPanel,
            collectionManager,
            collectionSelectorIntegration,
            resultsPanel,
            stateManager, // Now the unified state manager
            urlStateManager: stateManager, // Alias for backward compatibility
            filterManager,
            inlineDropdownManager,
            geometrySync,
            commandPalette,
            satelliteAnimation,
            interactiveTutorial,
            geocodingService,
            offlineManager,
            uiManager,
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
}

/**
 * Update Deck.gl status indicator in the UI
 * @param {MapManager} mapManager - The map manager instance
 */
function updateDeckGLStatus(mapManager) {
    const statusElement = document.getElementById('deckgl-status');
    const statusText = document.getElementById('deckgl-status-text');
    
    if (!statusElement || !statusText) return;
    
    if (mapManager.deckGLIntegration && mapManager.deckGLIntegration.isAvailable()) {
        // Deck.gl is active
        statusElement.style.display = 'flex';
        statusElement.classList.remove('inactive');
        statusElement.title = 'GPU acceleration active with Deck.gl';
        statusText.textContent = 'GPU';
        
        // Get performance stats if available
        const stats = mapManager.deckGLIntegration.getPerformanceStats();
        if (stats && stats.isWebGL2) {
            statusText.textContent = 'WebGL2';
        }
        
    } else if (mapManager.deckGLIntegration) {
        // Deck.gl integration exists but not available
        statusElement.style.display = 'flex';
        statusElement.classList.add('inactive');
        statusElement.title = 'GPU acceleration unavailable';
        statusText.textContent = 'CPU';
        
    } else {
        // No Deck.gl integration
        statusElement.style.display = 'none';
    }
}

/**
 * Toggle Deck.gl mode (for advanced users)
 */
window.toggleDeckGLMode = function() {
    const confirmation = confirm(
        'Toggle GPU acceleration mode?\n\n' +
        'This will reload the page to apply the change.\n' +
        'Current mode will be switched between GPU and CPU rendering.'
    );
    
    if (confirmation) {
        // Toggle the setting in localStorage
        const currentSetting = localStorage.getItem('stac-explorer-use-deckgl');
        const newSetting = currentSetting === 'false' ? 'true' : 'false';
        localStorage.setItem('stac-explorer-use-deckgl', newSetting);
        
        // Reload the page to apply the change
        window.location.reload();
    }
};

/**
 * Set up location input event listeners to connect with InlineDropdownManager
 * @param {InlineDropdownManager} inlineDropdownManager - The dropdown manager instance
 */
function setupLocationInputs(inlineDropdownManager) {
    // Find all location input elements
    const locationInputs = document.querySelectorAll('.mini-location-input');
    
    locationInputs.forEach(input => {
        // Add focus event to show location dropdown
        input.addEventListener('focus', async (e) => {
            try {
                await inlineDropdownManager.showInlineDropdown('location', e.target);
            } catch (error) {
                // Silently handle dropdown errors
            }
        });
        
        // Add input event for real-time search directly in the original input
        input.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            
            // Clear any existing location bbox when user starts typing
            if (window.stacExplorer?.mapManager?.removeBoundingBoxVisualization) {
                window.stacExplorer.mapManager.removeBoundingBoxVisualization('location-bbox');
            }
            
            // Ensure dropdown is open first
            try {
                await inlineDropdownManager.showInlineDropdown('location', e.target);
            } catch (error) {
                return;
            }
            
            // Get the results container from the current dropdown
            const dropdown = document.querySelector('.inline-dropdown-container');
            const resultsContainer = dropdown?.querySelector('.location-results');
            
            if (!resultsContainer) return;
            
            if (query.length < 2) {
                resultsContainer.innerHTML = '';
                resultsContainer.style.display = 'none';
                return;
            }
            
            resultsContainer.style.display = 'block';
            resultsContainer.innerHTML = '<div style="padding: 12px; color: #666; text-align: center;">Searching...</div>';
            
            // Import and use the geocoding service
            import('./utils/GeocodingService.js').then(module => {
                const { defaultGeocodingService } = module;
                
                defaultGeocodingService.searchLocations(query, (results, error) => {
                    console.log('DEBUG - Search callback:', 'Results:', results?.length, 'Error:', !!error);
                    
                    if (error) {
                        resultsContainer.style.display = 'block';
                        resultsContainer.innerHTML = '<div style="padding: 8px; color: #666;">Error searching locations</div>';
                        return;
                    }
                    
                    if (results.length === 0) {
                        resultsContainer.style.display = 'block';
                        resultsContainer.innerHTML = '<div style="padding: 8px; color: #666;">No locations found</div>';
                        return;
                    }
                    
                    console.log('DEBUG - Showing results container');
                    resultsContainer.style.display = 'block';
                    
                    // Display results
                    resultsContainer.innerHTML = results.map(location => {
                        return `
                            <div class="location-result-item" data-bbox="${location.bbox ? location.bbox.join(',') : ''}" 
                                 data-name="${location.formattedName}" style="
                                padding: 8px 12px;
                                cursor: pointer;
                                border-bottom: 1px solid #eee;
                                transition: background-color 0.2s;
                            " onmouseover="this.style.backgroundColor='#f5f5f5'" 
                               onmouseout="this.style.backgroundColor='transparent'">
                                <div style="font-weight: 500; margin-bottom: 2px;">${location.formattedName}</div>
                                <div style="font-size: 12px; color: #666;">${location.category} • ${location.shortName}</div>
                            </div>
                        `;
                    }).join('');
                    
                    // Add click handlers to result items
                    resultsContainer.querySelectorAll('.location-result-item').forEach(item => {
                        item.addEventListener('click', () => {
                            const locationName = item.dataset.name;
                            const bbox = item.dataset.bbox;
                            
                            // Update the original input value
                            input.value = locationName;
                            
                            // Trigger location selection (emit custom event)
                            const locationEvent = new CustomEvent('locationSelected', {
                                detail: { 
                                    name: locationName, 
                                    bbox: bbox ? bbox.split(',').map(Number) : null 
                                }
                            });
                            document.dispatchEvent(locationEvent);
                        });
                    });
                });
            }).catch(error => {
                resultsContainer.innerHTML = '<div style="padding: 8px; color: #999;">Location search unavailable</div>';
            });
        });
    });
    
    // Listen for location selection events from the dropdown
    document.addEventListener('locationSelected', (e) => {
        const { name, bbox } = e.detail;
        
        // Update all location inputs with the selected location
        locationInputs.forEach(input => {
            input.value = name;
        });
        
        // Update the search summary
        inlineDropdownManager.updateSearchSummary('location', name.toUpperCase());
        
        // If we have a bbox, zoom the map to it and show the bounding box
        if (bbox && window.stacExplorer && window.stacExplorer.mapManager) {
            try {
                const mapManager = window.stacExplorer.mapManager;
                
                // Clear any existing location bbox visualization
                if (typeof mapManager.removeBoundingBoxVisualization === 'function') {
                    mapManager.removeBoundingBoxVisualization('location-bbox');
                }
                
                // Add bounding box visualization
                if (typeof mapManager.addBoundingBoxVisualization === 'function') {
                    mapManager.addBoundingBoxVisualization(bbox, 'location-bbox');
                }
                
                // Zoom to the location
                if (mapManager.map && mapManager.map.fitBounds) {
                    // Convert bbox format: [west, south, east, north] to [[west, south], [east, north]]
                    const bounds = [[bbox[0], bbox[1]], [bbox[2], bbox[3]]];
                    mapManager.map.fitBounds(bounds, { padding: 20 });
                }
            } catch (error) {
                // Silently handle map zoom errors
                console.warn('Error handling location selection:', error);
            }
        }
        
        // Close the dropdown
        inlineDropdownManager.closeCurrentDropdown();
    });
    
    // Add event handler for the draw bbox button
    const drawBboxBtn = document.getElementById('draw-bbox-inline');
    if (drawBboxBtn) {
        drawBboxBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🎯 Draw bbox button clicked');
            
            // Get the map manager
            const mapManager = window.stacExplorer?.mapManager;
            if (!mapManager || typeof mapManager.startDrawingBbox !== 'function') {
                console.error('❌ Map drawing not available - MapManager or startDrawingBbox method not found');
                return;
            }
            
            // Update the location display to show drawing in progress
            inlineDropdownManager.updateSearchSummary('location', '🖊️ Drawing...');
            
            // Show instruction notification
            const notificationService = window.stacExplorer?.notificationService;
            if (notificationService) {
                notificationService.showNotification('🖊️ Click two points on the map to draw a bounding box', 'info');
            }
            
            // Start drawing with callback
            mapManager.startDrawingBbox((bbox) => {
                if (bbox && Array.isArray(bbox) && bbox.length === 4) {
                    console.log('✅ Bbox drawn:', bbox);
                    
                    // Update location inputs with the drawn area
                    locationInputs.forEach(input => {
                        input.value = 'Custom Area';
                    });
                    
                    // Update the search summary
                    inlineDropdownManager.updateSearchSummary('location', '📍 CUSTOM AREA');
                    
                    // Dispatch geometry selected event for the router
                    document.dispatchEvent(new CustomEvent('geometrySelected', {
                        detail: {
                            bbox: bbox,
                            name: 'Custom Area'
                        }
                    }));
                    
                    // Show success notification
                    if (notificationService) {
                        notificationService.showNotification('✅ Area selected successfully', 'success');
                    }
                } else {
                    console.warn('⚠️ Invalid bbox received:', bbox);
                    // Reset the location display
                    inlineDropdownManager.updateSearchSummary('location', 'THE WORLD');
                }
            });
        });
    } else {
        console.warn('⚠️ Draw bbox button not found in DOM');
    }
    
}

// Manual test function for location search (dev/debug use only)
window.testLocationSearch = function() {
    const input = document.querySelector('.mini-location-input') || document.querySelector('#summary-location-input');
    if (input && window.stacExplorer && window.stacExplorer.inlineDropdownManager) {
        input.focus();
        window.stacExplorer.inlineDropdownManager.showInlineDropdown('location', input);
    }
};	