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

// Keep the original function for backwards compatibility
async function initApp() {
    
    try {
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
        
        // Initialize unified state manager after all components are ready
        const stateManager = new UnifiedStateManager({
            catalogSelector,
            mapManager, 
            searchPanel,
            inlineDropdownManager,
            notificationService
        });
        
        // Make stateManager globally accessible
        window.stacExplorer.unifiedStateManager = stateManager;

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
        
        
        
        // Debug offline manager status
        console.log('🌐 Offline Manager Status at startup:', {
            isOffline: offlineManager.getOfflineStatus(),
            navigatorOnLine: navigator.onLine,
            debugInfo: offlineManager.getDebugInfo()
        });
        
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