/**
 * UnifiedStateManager.js - Comprehensive URL state management system
 * Combines functionality from StateManager.js and URLStateManager.js
 * Manages all application state via URL parameters with consistent naming
 */

export class UnifiedStateManager {
    constructor(components = {}) {
        // Component references
        this.catalogSelector = components.catalogSelector;
        this.mapManager = components.mapManager;
        this.searchPanel = components.searchPanel;
        this.inlineDropdownManager = components.inlineDropdownManager;
        this.notificationService = components.notificationService || {
            showNotification: (msg, type) => {}
        };
        
        // State tracking
        this.currentState = {};
        this.isUpdatingFromURL = false;
        this.isRestoringFromUrl = false;
        this.isApplyingState = false;
        this.updateTimeout = null;
        
        // Active item tracking
        this.activeItemId = null;
        this.activeAssetKey = null;
        
        // URL parameter keys - consistent naming convention
        this.urlKeys = {
            // Collection parameters
            collection: 'cn',           // collection name
            collectionSource: 'cs',     // collection source (catalog)
            
            // Location parameters
            locationBbox: 'bbox',       // bounding box
            locationName: 'ln',         // location name
            locationQuery: 'lq',        // original search query
            
            // Date parameters
            dateType: 'dt',             // date type/preset
            dateStart: 'ds',            // date start
            dateEnd: 'de',              // date end
            
            // Map parameters
            mapCenter: 'mapCenter',     // map center coordinates
            mapZoom: 'mapZoom',         // map zoom level
            
            // Search parameters
            search: 'search',           // search text
            cloudCover: 'cc',           // cloud cover threshold
            
            // Item parameters
            itemId: 'item',             // collection item ID
            assetKey: 'asset_key',      // active asset key
            
            // Geometry parameters
            geometry: 'g',              // WKT/GeoJSON geometry
            geojson: 'gj',              // complete GeoJSON
            
            // Legacy/additional parameters
            catalogUrl: 'catalogUrl'    // custom catalog URL
        };
        
        // Check if we have URL parameters that indicate state restoration
        const params = new URLSearchParams(window.location.search);
        this.hasUrlState = this.hasSignificantUrlState(params);
        
        this.initialize();
    }
    
    /**
     * Initialize the unified state manager
     */
    async initialize() {
        
        // Listen for browser back/forward navigation
        window.addEventListener('popstate', (event) => {
            this.restoreStateFromURL();
        });
        
        // Set up event listeners for state changes
        this.setupStateListeners();
        
        // Wait for map to be ready before initializing state
        if (this.mapManager) {
            await this.waitForMapReady();
        }
        
        // Restore state from URL on page load
        if (this.hasUrlState) {
            await this.initFromUrl();
        }
        
    }
    
    /**
     * Check if URL has significant state parameters
     */
    hasSignificantUrlState(params) {
        return params.has(this.urlKeys.itemId) || 
               params.has(this.urlKeys.mapCenter) || 
               params.has(this.urlKeys.search) ||
               params.has(this.urlKeys.collection) ||
               params.has(this.urlKeys.locationBbox) ||
               params.has(this.urlKeys.dateStart) ||
               params.has(this.urlKeys.dateEnd);
    }
    
    /**
     * Wait for map to be ready
     */
    async waitForMapReady() {
        return new Promise((resolve) => {
            const checkMapReady = () => {
                if (this.mapManager && this.mapManager.isMapReady()) {
                    resolve();
                } else {
                    setTimeout(checkMapReady, 100);
                }
            };
            checkMapReady();
        });
    }
    
    /**
     * Initialize application state from URL parameters
     */
    async initFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const pathname = window.location.pathname;
        
        this.isRestoringFromUrl = true;
        
        // Note: RESTful URLs removed for GitHub Pages compatibility
        
        try {
            // Ensure regular search interface is visible
            this.ensureRegularSearchInterface();
            
            // Handle catalog/collection source first
            await this.restoreCatalogState(params);
            
            // Wait for collections to be loaded
            await this.waitForCollectionsLoaded();
            
            // Restore search state
            await this.restoreSearchState(params);
            
            // Restore map state
            await this.restoreMapState(params);
            
            // Handle active item restoration
            if (params.has(this.urlKeys.itemId)) {
                await this.restoreActiveItem(params);
            }
            
            // Execute search if we have search parameters
            if (this.hasSearchParams(params)) {
                await this.executeSearchAfterRestore();
            }
            
            
        } finally {
            this.isRestoringFromUrl = false;
        }
    }
    
    /**
     * Ensure regular search interface is shown and visible
     */
    ensureRegularSearchInterface() {
        
        // Hide AI Smart Search fullscreen if showing
        const aiSearchContainer = document.querySelector('.ai-smart-search-container');
        if (aiSearchContainer) {
            aiSearchContainer.style.display = 'none';
        }
        
        // Ensure sidebar is visible
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.remove('hidden');
            sidebar.style.display = 'flex';
        }
        
        // For mobile devices, ensure sidebar is properly opened
        const isMobile = window.innerWidth <= 768;
        if (isMobile && window.mobileSidebarManager) {
            if (typeof window.mobileSidebarManager.openSidebar === 'function') {
                window.mobileSidebarManager.openSidebar();
            }
        }
        
        // Expand search and results containers
        setTimeout(() => {
            const searchContainer = document.getElementById('search-container');
            const resultsCard = document.getElementById('results-card');
            
            if (searchContainer && searchContainer.classList.contains('collapsed')) {
                const searchHeader = document.getElementById('search-container-header');
                if (searchHeader) searchHeader.click();
            }
            
            if (resultsCard && resultsCard.classList.contains('collapsed')) {
                const resultsHeader = document.getElementById('results-header');
                if (resultsHeader) resultsHeader.click();
            }
        }, 100);
    }
    
    /**
     * Restore catalog/collection source state
     */
    async restoreCatalogState(params) {
        if (params.has(this.urlKeys.collectionSource)) {
            const collectionSource = params.get(this.urlKeys.collectionSource);
            
            const catalogSelect = document.getElementById('catalog-select');
            if (catalogSelect) {
                catalogSelect.value = collectionSource;
                
                if (collectionSource === 'custom') {
                    const customUrl = params.get(this.urlKeys.catalogUrl);
                    if (customUrl) {
                        const customUrlInput = document.getElementById('custom-catalog-url');
                        if (customUrlInput) customUrlInput.value = customUrl;
                    }
                }
                
                // Trigger catalog change
                if (this.catalogSelector && typeof this.catalogSelector.handleCatalogChange === 'function') {
                    this.catalogSelector.handleCatalogChange(collectionSource);
                } else {
                    catalogSelect.dispatchEvent(new Event('change'));
                }
            }
        }
    }
    
    /**
     * Wait for collections to be loaded
     */
    waitForCollectionsLoaded() {
        return new Promise((resolve) => {
            const checkCollections = () => {
                const collectionSelect = document.getElementById('collection-select');
                if (collectionSelect && collectionSelect.options.length > 1) {
                    resolve();
                } else {
                    setTimeout(checkCollections, 100);
                }
            };
            
            document.addEventListener('collectionsUpdated', resolve, { once: true });
            checkCollections();
        });
    }
    
    /**
     * Restore search state from URL parameters
     */
    async restoreSearchState(params) {
        
        // Collection selection
        if (params.has(this.urlKeys.collection)) {
            const collection = params.get(this.urlKeys.collection);
            const collectionSelect = document.getElementById('collection-select');
            if (collectionSelect) {
                await new Promise(resolve => setTimeout(resolve, 300));
                
                const collectionOption = Array.from(collectionSelect.options).find(option => option.value === collection);
                if (collectionOption) {
                    collectionSelect.value = collection;
                    collectionSelect.dispatchEvent(new Event('change'));
                } else {
                    console.warn(`[WARNING] Collection '${collection}' not found`);
                }
            }
        }
        
        // Search text
        if (params.has(this.urlKeys.search)) {
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.value = params.get(this.urlKeys.search);
        }
        
        // Date parameters
        if (params.has(this.urlKeys.dateStart)) {
            const dateStartInput = document.getElementById('date-start');
            if (dateStartInput) {
                dateStartInput.value = params.get(this.urlKeys.dateStart);
            }
        }
        
        if (params.has(this.urlKeys.dateEnd)) {
            const dateEndInput = document.getElementById('date-end');
            if (dateEndInput) {
                dateEndInput.value = params.get(this.urlKeys.dateEnd);
            }
        }
        
        // Geometry (prioritize WKT/GeoJSON geometry over bbox)  
        if (params.has(this.urlKeys.geometry)) {
            const geometryValue = params.get(this.urlKeys.geometry);
            const bboxInput = document.getElementById('bbox-input');
            if (bboxInput) {
                bboxInput.value = geometryValue;
                
                // Trigger geometry processing through existing system
                const event = new Event('input', { bubbles: true });
                bboxInput.dispatchEvent(event);
            }
        } else if (params.has(this.urlKeys.locationBbox)) {
            // Fallback to bbox if no geometry parameter
            const bboxValue = params.get(this.urlKeys.locationBbox);
            const bboxInput = document.getElementById('bbox-input');
            if (bboxInput) {
                bboxInput.value = bboxValue;
                
                // Update map bbox display
                if (this.mapManager && this.mapManager.displayBboxOnMap) {
                    try {
                        const coords = bboxValue.split(',').map(Number);
                        if (coords.length === 4) {
                            this.mapManager.displayBboxOnMap(coords, params.get(this.urlKeys.locationName) || 'URL Selection');
                        }
                    } catch (error) {
                        console.warn('[WARNING] Could not display bbox on map:', error);
                    }
                }
            }
        }
        
        // Apply state to interfaces if they exist
        this.applyStateToInterfaces(params);
    }
    
    /**
     * Apply restored state to UI interfaces
     */
    applyStateToInterfaces(params) {
        if (!this.inlineDropdownManager) return;
        
        this.isApplyingState = true;
        
        try {
            const state = this.parseURLParamsToState(params);
            
            // Apply to inline dropdown manager
            this.applyStateToInlineDropdowns(state);
            
            // AI search functionality removed
            
        } finally {
            setTimeout(() => {
                this.isApplyingState = false;
            }, 500);
        }
    }
    
    /**
     * Parse URL parameters to state object
     */
    parseURLParamsToState(params) {
        const state = {};
        
        
        // Collection parameters
        if (params.has(this.urlKeys.collection)) {
            state.collection = params.get(this.urlKeys.collection);
        }
        if (params.has(this.urlKeys.collectionSource)) {
            state.collectionSource = params.get(this.urlKeys.collectionSource);
        }
        
        // Location parameters
        if (params.has(this.urlKeys.locationBbox)) {
            const bboxStr = params.get(this.urlKeys.locationBbox);
            state.locationBbox = bboxStr.split(',').map(Number);
        }
        if (params.has(this.urlKeys.locationName)) {
            state.locationName = params.get(this.urlKeys.locationName);
        }
        
        // Geometry parameters - prioritize geometry over bbox
        if (params.has(this.urlKeys.geometry)) {
            state.geometry = params.get(this.urlKeys.geometry);
        }
        
        // Date parameters
        if (params.has(this.urlKeys.dateType)) {
            state.dateType = params.get(this.urlKeys.dateType);
        }
        if (params.has(this.urlKeys.dateStart)) {
            state.dateStart = params.get(this.urlKeys.dateStart);
        }
        if (params.has(this.urlKeys.dateEnd)) {
            state.dateEnd = params.get(this.urlKeys.dateEnd);
        }
        
        // Other parameters
        if (params.has(this.urlKeys.cloudCover)) {
            state.cloudCover = parseInt(params.get(this.urlKeys.cloudCover));
        }
        
        return state;
    }
    
    /**
     * Apply state to inline dropdowns
     */
    applyStateToInlineDropdowns(state) {
        try {
            const aiHelper = this.inlineDropdownManager.aiSearchHelper;
            
            // Collection state
            if (state.collection !== undefined) {
                aiHelper.selectedCollection = state.collection;
                aiHelper.selectedCollectionSource = state.collectionSource;
                
                const displayName = state.collection ? 
                    this.getCollectionDisplayName(state.collection, state.collectionSource) : 'EVERYTHING';
                this.inlineDropdownManager.updateSearchSummary('collection', displayName);
            }
            
            // Location state
            if (state.locationBbox || state.locationName) {
                aiHelper.selectedLocation = state.locationBbox || 'everywhere';
                if (state.locationBbox) {
                    aiHelper.selectedLocationResult = {
                        formattedName: state.locationName || 'Custom Location',
                        shortName: state.locationName || 'Custom Location',
                        bbox: state.locationBbox,
                        category: 'restored'
                    };
                }
                
                const displayName = state.locationName || 'THE WORLD';
                this.inlineDropdownManager.updateSearchSummary('location', displayName.toUpperCase());
            }
            
            // Date state
            if (state.dateType) {
                aiHelper.selectedDate = {
                    type: state.dateType,
                    start: state.dateStart,
                    end: state.dateEnd,
                    preset: state.dateType !== 'custom' ? state.dateType : null
                };
                
                // Also update the form inputs for custom dates
                if (state.dateType === 'custom' && state.dateStart && state.dateEnd) {
                    const dateStartInput = document.getElementById('date-start');
                    const dateEndInput = document.getElementById('date-end');
                    
                    if (dateStartInput && state.dateStart) {
                        // Extract just the date part for form inputs (YYYY-MM-DD)
                        const startDateOnly = state.dateStart.split('T')[0];
                        dateStartInput.value = startDateOnly;
                    }
                    
                    if (dateEndInput && state.dateEnd) {
                        // Extract just the date part for form inputs (YYYY-MM-DD)
                        const endDateOnly = state.dateEnd.split('T')[0];
                        dateEndInput.value = endDateOnly;
                    }
                }
                
                let displayText = 'ANYTIME';
                if (state.dateType === 'last30days') {
                    displayText = 'LAST 30 DAYS';
                } else if (state.dateType === 'custom' && state.dateStart && state.dateEnd) {
                    const startDisplay = state.dateStart.split('T')[0];
                    const endDisplay = state.dateEnd.split('T')[0];
                    displayText = `${startDisplay} to ${endDisplay}`.toUpperCase();
                }
                
                this.inlineDropdownManager.updateSearchSummary('date', displayText);
            }
            
            // Cloud cover
            if (state.cloudCover !== undefined) {
                aiHelper.cloudCover = state.cloudCover;
            }
            
        } catch (error) {
            console.error('[ERROR] Error applying state to inline dropdowns:', error);
        }
    }
    
    // AI search functionality removed
    
    /**
     * Restore map state from URL parameters
     */
    async restoreMapState(params) {
        if (params.has(this.urlKeys.mapCenter) && params.has(this.urlKeys.mapZoom)) {
            try {
                const [lat, lng] = params.get(this.urlKeys.mapCenter).split(',').map(Number);
                const zoom = parseFloat(params.get(this.urlKeys.mapZoom));
                
                
                if (this.mapManager && this.mapManager.map) {
                    this.mapManager.map.setCenter([lng, lat]);
                    this.mapManager.map.setZoom(zoom);
                }
            } catch (error) {
                console.error('[ERROR] Failed to restore map state:', error);
            }
        }
    }
    
    /**
     * Restore active item from URL parameters
     */
    async restoreActiveItem(params) {
        this.activeItemId = params.get(this.urlKeys.itemId);
        
        if (params.has(this.urlKeys.assetKey)) {
            this.activeAssetKey = params.get(this.urlKeys.assetKey);
        }
        
        
        // Trigger search if we have search parameters
        if (this.hasSearchParams(params)) {
            try {
                const searchResults = await this.executeSearchAndWaitForResults();
                
                if (searchResults && searchResults.length > 0) {
                    const activeItem = searchResults.find(item => item.id === this.activeItemId);
                    
                    if (activeItem) {
                        setTimeout(() => {
                            this.displayActiveItem(activeItem);
                        }, 1500);
                    } else {
                        console.warn('[WARNING] Active item not found in search results');
                    }
                }
            } catch (error) {
                console.error('[ERROR] Error during search execution:', error);
            }
        }
    }
    
    /**
     * Execute search and wait for results
     */
    async executeSearchAndWaitForResults() {
        return new Promise((resolve) => {
            let timeoutId;
            
            const handleSearchResults = (event) => {
                clearTimeout(timeoutId);
                const results = event.detail?.results || event.detail || [];
                resolve(results);
            };
            
            document.addEventListener('searchResultsLoaded', handleSearchResults, { once: true });
            
            timeoutId = setTimeout(() => {
                document.removeEventListener('searchResultsLoaded', handleSearchResults);
                resolve([]);
            }, 15000);
            
            setTimeout(() => {
                if (this.searchPanel && this.searchPanel.performSearch) {
                    this.searchPanel.performSearch();
                }
            }, 500);
        });
    }
    
    /**
     * Display the active item on the map
     */
    async displayActiveItem(activeItem) {
        try {
            if (!this.mapManager || !this.mapManager.isMapReady()) {
                await this.waitForMapReady();
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Display item on map with the specified asset
            if (this.activeAssetKey === 'geometry') {
                await this.mapManager.displayItemGeometry(activeItem);
            } else if (this.activeAssetKey) {
                await this.mapManager.displayItemOnMap(activeItem, this.activeAssetKey, true);
            } else {
                await this.mapManager.displayItemOnMap(activeItem, 'thumbnail', true);
            }
            
            this.updateUIForActiveItem(activeItem);
            
        } catch (error) {
            console.error('[ERROR] Failed to display active item:', error);
        }
    }
    
    /**
     * Update UI to reflect the active item
     */
    updateUIForActiveItem(activeItem) {
        setTimeout(() => {
            // Find and highlight the active item in results
            document.querySelectorAll('.dataset-item').forEach(el => {
                el.classList.remove('active');
                if (el.dataset.id === this.activeItemId) {
                    el.classList.add('active');
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
            
            // Ensure results card is expanded
            const resultsCard = document.getElementById('results-card');
            if (resultsCard && resultsCard.classList.contains('collapsed')) {
                const resultsHeader = document.getElementById('results-header');
                if (resultsHeader) resultsHeader.click();
            }
        }, 300);
    }
    
    /**
     * Execute search after URL state restoration
     */
    async executeSearchAfterRestore() {
        try {
            // Try multiple search execution methods
            const mainSearchBtn = document.getElementById('main-search-btn');
            if (mainSearchBtn) {
                setTimeout(() => mainSearchBtn.click(), 200);
                return;
            }
            
            const executeSearchBtn = document.getElementById('execute-search');
            if (executeSearchBtn) {
                setTimeout(() => executeSearchBtn.click(), 200);
                return;
            }
            
            if (this.searchPanel && typeof this.searchPanel.performSearch === 'function') {
                setTimeout(() => this.searchPanel.performSearch(), 200);
                return;
            }
            
            if (this.inlineDropdownManager && typeof this.inlineDropdownManager.executeSearch === 'function') {
                setTimeout(() => this.inlineDropdownManager.executeSearch(), 200);
                return;
            }
            
        } catch (error) {
            console.error('[ERROR] Error executing search after URL restore:', error);
        }
    }
    
    /**
     * Check if URL parameters contain search criteria
     */
    hasSearchParams(params) {
        return params.has(this.urlKeys.search) || 
               params.has(this.urlKeys.dateStart) || 
               params.has(this.urlKeys.dateEnd) || 
               params.has(this.urlKeys.locationBbox) ||
               params.has(this.urlKeys.collection);
    }
    
    /**
     * Set up listeners for state changes
     */
    setupStateListeners() {
        
        // Listen for inline dropdown changes
        document.addEventListener('searchParameterChanged', (event) => {
            if (!this.isUpdatingFromURL && !this.isApplyingState) {
                this.updateURLFromState(event.detail);
            }
        });
        
        // AI search functionality removed
        
        // Listen for geometry selection
        document.addEventListener('geometrySelected', (event) => {
            if (!this.isUpdatingFromURL && !this.isApplyingState) {
                this.updateURLFromState({
                    type: 'location',
                    locationBbox: event.detail.bbox,
                    locationName: event.detail.name || 'Map Selection'
                });
            }
        });
        
        // Listen for active item changes
        document.addEventListener('itemActivated', (event) => {
            if (!this.isRestoringFromUrl) {
                this.activeItemId = event.detail.itemId;
                this.activeAssetKey = event.detail.assetKey || null;
                this.updateURL();
            }
        });
        
        // Listen for form element changes
        this.setupFormElementListeners();
        
        // Listen for map changes
        if (this.mapManager && this.mapManager.map) {
            this.mapManager.map.on('moveend', () => {
                if (!this.isRestoringFromUrl) {
                    this.updateURL();
                }
            });
        }
    }
    
    /**
     * Set up listeners for form elements
     */
    setupFormElementListeners() {
        const elements = [
            'catalog-select',
            'collection-select', 
            'search-input',
            'date-start',
            'date-end',
            'bbox-input'
        ];
        
        elements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener('change', () => this.updateURL());
            }
        });
    }
    
    /**
     * Update URL from state change (for inline dropdowns)
     */
    updateURLFromState(stateChange) {
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
            this.performURLUpdate(stateChange);
        }, 300);
    }
    
    /**
     * Perform the actual URL update from state
     */
    performURLUpdate(stateChange) {
        try {
            Object.assign(this.currentState, stateChange);
            
            const urlParams = new URLSearchParams(window.location.search);
            
            // Update parameters based on state
            if (this.currentState.collection !== undefined) {
                if (this.currentState.collection) {
                    urlParams.set(this.urlKeys.collection, this.currentState.collection);
                } else {
                    urlParams.delete(this.urlKeys.collection);
                }
            }
            
            if (this.currentState.collectionSource) {
                urlParams.set(this.urlKeys.collectionSource, this.currentState.collectionSource);
            }
            
            if (this.currentState.locationBbox && Array.isArray(this.currentState.locationBbox)) {
                urlParams.set(this.urlKeys.locationBbox, this.currentState.locationBbox.join(','));
            }
            
            if (this.currentState.locationName && this.currentState.locationName !== 'THE WORLD') {
                urlParams.set(this.urlKeys.locationName, this.currentState.locationName);
            }
            
            if (this.currentState.dateType && this.currentState.dateType !== 'anytime') {
                urlParams.set(this.urlKeys.dateType, this.currentState.dateType);
            }
            
            if (this.currentState.dateStart) {
                urlParams.set(this.urlKeys.dateStart, this.currentState.dateStart);
            }
            
            if (this.currentState.dateEnd) {
                urlParams.set(this.urlKeys.dateEnd, this.currentState.dateEnd);
            }
            
            if (this.currentState.cloudCover && this.currentState.cloudCover !== 20) {
                urlParams.set(this.urlKeys.cloudCover, this.currentState.cloudCover.toString());
            }
            
            // Update URL
            const newURL = urlParams.toString() ? 
                `${window.location.pathname}?${urlParams.toString()}` : 
                window.location.pathname;
            
            window.history.replaceState({ searchState: this.currentState }, '', newURL);
            
        } catch (error) {
            console.error('[ERROR] Error updating URL:', error);
        }
    }
    
    /**
     * Update URL with current application state (for form elements)
     */
    updateURL() {
        if (this.isRestoringFromUrl) {
            return;
        }
        
        // Start with existing URL parameters to preserve state
        const params = new URLSearchParams(window.location.search);
        
        // Update from form elements if they have values
        const catalogSelect = document.getElementById('catalog-select');
        
        // For collection source, prioritize the actual source of the selected collection
        let collectionSource = null;
        const collectionSelect = document.getElementById('collection-select');
        
        // Try to get the actual source from AI search helper if available
        if (this.inlineDropdownManager?.aiSearchHelper?.selectedCollectionSource) {
            collectionSource = this.inlineDropdownManager.aiSearchHelper.selectedCollectionSource;
        } else if (catalogSelect && catalogSelect.value) {
            // Fallback to catalog selector value
            collectionSource = catalogSelect.value;
        }
        
        if (collectionSource) {
            params.set(this.urlKeys.collectionSource, collectionSource);
            
            if (collectionSource === 'custom') {
                const customUrlInput = document.getElementById('custom-catalog-url');
                if (customUrlInput && customUrlInput.value) {
                    params.set(this.urlKeys.catalogUrl, customUrlInput.value);
                }
            }
        }
        
        if (collectionSelect && collectionSelect.value) {
            params.set(this.urlKeys.collection, collectionSelect.value);
        }
        
        const searchInput = document.getElementById('search-input');
        if (searchInput && searchInput.value) {
            params.set(this.urlKeys.search, searchInput.value);
        }
        
        const dateStart = document.getElementById('date-start');
        if (dateStart && dateStart.value) {
            params.set(this.urlKeys.dateStart, dateStart.value);
        }
        
        const dateEnd = document.getElementById('date-end');
        if (dateEnd && dateEnd.value) {
            params.set(this.urlKeys.dateEnd, dateEnd.value);
        }
        
        const bboxInput = document.getElementById('bbox-input');
        if (bboxInput && bboxInput.value) {
            params.set(this.urlKeys.locationBbox, bboxInput.value);
            
            // Add location name if available
            const locationNameElement = document.querySelector('[data-location-name]');
            if (locationNameElement && locationNameElement.dataset.locationName) {
                params.set(this.urlKeys.locationName, locationNameElement.dataset.locationName);
            } else if (this.currentState && this.currentState.locationName && this.currentState.locationName !== 'THE WORLD') {
                params.set(this.urlKeys.locationName, this.currentState.locationName);
            }
        }
        
        // Add filter state (cloud cover)
        if (window.stacExplorer?.filterManager) {
            const activeFilters = window.stacExplorer.filterManager.getActiveFilters();
            if (activeFilters.cloud_cover) {
                params.set(this.urlKeys.cloudCover, activeFilters.cloud_cover.value.toString());
            } else {
                // Remove cloud cover parameter if filter is not active
                params.delete(this.urlKeys.cloudCover);
            }
        }
        
        // Add map state
        if (this.mapManager && this.mapManager.map) {
            const center = this.mapManager.map.getCenter();
            params.set(this.urlKeys.mapCenter, `${center.lat.toFixed(6)},${center.lng.toFixed(6)}`);
            params.set(this.urlKeys.mapZoom, this.mapManager.map.getZoom().toString());
        }
        
        // Add active item if specified
        if (this.activeItemId) {
            params.set(this.urlKeys.itemId, this.activeItemId);
            
            if (this.activeAssetKey) {
                params.set(this.urlKeys.assetKey, this.activeAssetKey);
            }
        }
        
        // Build simple query string URL for GitHub Pages compatibility
        const queryString = params.toString();
        const basePath = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
        const newUrl = queryString ? `${basePath}?${queryString}` : basePath;
        
        window.history.pushState({}, '', newUrl);
    }
    
    /**
     * Restore state from URL parameters (browser navigation)
     */
    restoreStateFromURL() {
        try {
            this.isUpdatingFromURL = true;
            
            const urlParams = new URLSearchParams(window.location.search);
            const restoredState = this.parseURLParamsToState(urlParams);
            
            if (Object.keys(restoredState).length > 0) {
                this.currentState = restoredState;
                this.applyStateToInterfaces(urlParams);
                
                this.notificationService.showNotification('[URL] Search parameters restored from URL', 'info');
            }
            
        } catch (error) {
            console.error('[ERROR] Error restoring state from URL:', error);
        } finally {
            setTimeout(() => {
                this.isUpdatingFromURL = false;
            }, 1000);
        }
    }
    
    /**
     * Get shareable URL with current search parameters
     */
    getShareableURL() {
        return window.location.href;
    }
    
    /**
     * Copy current search URL to clipboard
     */
    async copySearchURL() {
        try {
            const url = this.getShareableURL();
            await navigator.clipboard.writeText(url);
            this.notificationService.showNotification('[URL] Search URL copied to clipboard!', 'success');
            return url;
        } catch (error) {
            console.error('[ERROR] Error copying URL:', error);
            this.notificationService.showNotification('[ERROR] Failed to copy URL', 'error');
            return null;
        }
    }
    
    /**
     * Clear all search parameters from URL
     */
    clearURLParameters() {
        window.history.replaceState({}, '', window.location.pathname);
        this.currentState = {};
        this.notificationService.showNotification('[CLEAR] Search parameters cleared from URL', 'info');
    }
    
    /**
     * Check if URL has state parameters
     * @returns {boolean} True if URL has state parameters
     */
    hasUrlStateParams() {
        return this.hasUrlState;
    }
    
    /**
     * Utility method to get collection display name
     */
    getCollectionDisplayName(collectionId, source = null) {
        const collections = this.inlineDropdownManager?.aiSearchHelper?.allAvailableCollections;
        
        if (collections && collections.length > 0) {
            // Use provided source or fall back to current state source
            const targetSource = source || this.currentState.collectionSource;
            
            // First try to find by ID and source
            let collection = null;
            if (targetSource) {
                collection = collections.find(c => c.id === collectionId && c.source === targetSource);
            }
            
            // If not found with source, fall back to ID only
            if (!collection) {
                collection = collections.find(c => c.id === collectionId);
            }
            
            if (collection) {
                const displayName = collection.displayTitle || collection.title || collectionId;
                return displayName;
            }
        }
        return collectionId;
    }
    
    /**
     * Extract provider name from source URL
     * @param {string} sourceUrl - The collection source URL
     * @returns {string} Provider name suitable for URL
     */
    extractProviderFromSource(sourceUrl) {
        if (!sourceUrl) return null;
        
        try {
            const url = new URL(sourceUrl);
            const hostname = url.hostname;
            
            // Map common STAC providers to friendly names
            const providerMappings = {
                'earth-search.aws.element84.com': 'element84',
                'planetarycomputer.microsoft.com': 'planetary-computer',
                'stac.dataspace.copernicus.eu': 'copernicus',
                'stac.ceos.org': 'ceos',
                'stacindex.org': 'stac-index',
                'catalog.digitalearth.africa': 'digital-earth-africa',
                'stac.eosdis.nasa.gov': 'nasa-eosdis',
                'api.radiant.earth': 'radiant-earth',
                'stac-browser.s3.us-west-2.amazonaws.com': 'aws-s3',
                'localhost': 'local'
            };
            
            // Check for exact matches first
            if (providerMappings[hostname]) {
                return providerMappings[hostname];
            }
            
            // Extract domain name without TLD for generic providers
            const domainParts = hostname.split('.');
            if (domainParts.length >= 2) {
                // Get the main domain name (e.g., 'google' from 'api.google.com')
                const mainDomain = domainParts[domainParts.length - 2];
                return mainDomain.toLowerCase().replace(/[^a-z0-9]/g, '-');
            }
            
            return hostname.replace(/[^a-z0-9]/g, '-').toLowerCase();
            
        } catch (error) {
            console.warn('[URL] Error extracting provider from URL:', sourceUrl, error);
            // Fallback: use a cleaned version of the URL
            return sourceUrl.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 20);
        }
    }
    
    /**
     * Get provider source URL from provider name
     * @param {string} providerName - The provider name from URL
     * @returns {string|null} Source URL or null if not found
     */
    getProviderSourceFromName(providerName) {
        if (!providerName) return null;
        
        // Reverse mapping for known providers
        const reverseProviderMappings = {
            'element84': 'https://earth-search.aws.element84.com/v1',
            'planetary-computer': 'https://planetarycomputer.microsoft.com/api/stac/v1',
            'copernicus': 'https://stac.dataspace.copernicus.eu/v1',
            'ceos': 'https://stac.ceos.org',
            'stac-index': 'https://stacindex.org',
            'digital-earth-africa': 'https://catalog.digitalearth.africa/stac',
            'nasa-eosdis': 'https://stac.eosdis.nasa.gov',
            'radiant-earth': 'https://api.radiant.earth/stac',
            'aws-s3': 'https://stac-browser.s3.us-west-2.amazonaws.com',
            'local': 'http://localhost:3000'
        };
        
        return reverseProviderMappings[providerName] || null;
    }
}

export default UnifiedStateManager;