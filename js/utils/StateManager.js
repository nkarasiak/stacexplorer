/**
 * StateManager.js - Handles application state management via URL parameters
 */

export class StateManager {
    constructor(catalogSelector, mapManager, searchPanel) {
        this.catalogSelector = catalogSelector;
        this.mapManager = mapManager;
        this.searchPanel = searchPanel;
        this.activeItemId = null;
        this.activeAssetKey = null;
        this.isRestoringFromUrl = false;
        
        // Check if we have URL parameters that indicate state restoration
        const params = new URLSearchParams(window.location.search);
        this.hasUrlState = this.hasSignificantUrlState(params);
        
        // Wait for map to be ready before initializing state
        this.waitForMapReady().then(() => {
            this.initFromUrl();
            this.setupStateListeners();
        });
    }
    
    /**
     * Check if URL has significant state parameters
     * @param {URLSearchParams} params - URL parameters
     * @returns {boolean} True if URL has significant state
     */
    hasSignificantUrlState(params) {
        return params.has('item_id') || 
               params.has('mapCenter') || 
               params.has('search') ||
               params.has('cn') ||
               params.has('bbox');
    }
    
    /**
     * Wait for map to be ready
     * @returns {Promise}
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
        
        if (!this.hasSignificantUrlState(params)) {
            console.log('🔗 No significant URL state found, proceeding with normal initialization');
            return;
        }
        
        console.log('🔗 Restoring application state from URL parameters');
        this.isRestoringFromUrl = true;
        
        // Hide AI Smart Search and show regular search interface
        this.ensureRegularSearchInterface();
        
        // Handle catalog selection first
        await this.restoreCatalogState(params);
        
        // Wait for collections to be loaded
        await this.waitForCollectionsLoaded();
        
        // Restore other state parameters
        await this.restoreSearchState(params);
        
        // Restore map state
        await this.restoreMapState(params);
        
        // Handle active item restoration
        if (params.has('item_id')) {
            await this.restoreActiveItem(params);
        }
        
        // Execute search if we have search parameters
        if (this.hasSearchParams(params)) {
            console.log('🔍 Executing search with restored parameters...');
            await this.executeSearchAfterRestore();
        }
        
        this.isRestoringFromUrl = false;
        console.log('✅ State restoration from URL completed');
    }
    
    /**
     * Ensure regular search interface is shown and visible for URL state restoration
     */
    ensureRegularSearchInterface() {
        console.log('🔗 Ensuring regular search interface is visible for URL state restoration');
        
        // Hide AI Smart Search fullscreen if it's showing
        const aiSearchContainer = document.querySelector('.ai-smart-search-container');
        if (aiSearchContainer) {
            aiSearchContainer.style.display = 'none';
        }
        
        // Ensure sidebar is visible and properly displayed
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            // Remove hidden class if present
            sidebar.classList.remove('hidden');
            sidebar.style.display = 'flex';
            
            console.log('✅ Sidebar made visible for URL state restoration');
        }
        
        // For mobile devices, ensure sidebar is properly opened
        const isMobile = window.innerWidth <= 768;
        if (isMobile && window.mobileSidebarManager) {
            // Use mobile sidebar manager to properly show sidebar
            if (typeof window.mobileSidebarManager.openSidebar === 'function') {
                window.mobileSidebarManager.openSidebar();
                console.log('📱 Mobile sidebar opened for URL state restoration');
            }
        }
        
        // Ensure search and results cards are expanded with better targeting
        setTimeout(() => {
            // Look for the actual search container (updated ID)
            const searchContainer = document.getElementById('search-container');
            const resultsCard = document.getElementById('results-card');
            
            // Expand search container if collapsed
            if (searchContainer && searchContainer.classList.contains('collapsed')) {
                const searchHeader = document.getElementById('search-container-header');
                if (searchHeader) {
                    searchHeader.click();
                    console.log('🔍 Expanded search container');
                }
            }
            
            // Expand results card if collapsed
            if (resultsCard && resultsCard.classList.contains('collapsed')) {
                const resultsHeader = document.getElementById('results-header');
                if (resultsHeader) {
                    resultsHeader.click();
                    console.log('📊 Expanded results card');
                }
            }
            
            console.log('✅ Search interface setup completed for URL state restoration');
        }, 100);
    }
    
    /**
     * Restore catalog state from URL parameters
     * @param {URLSearchParams} params - URL parameters
     */
    async restoreCatalogState(params) {
        if (params.has('catalog')) {
            const catalog = params.get('catalog');
            console.log(`🔗 Restoring catalog: ${catalog}`);
            
            if (catalog === 'custom') {
                const customUrl = params.get('catalogUrl');
                if (customUrl) {
                    const customUrlInput = document.getElementById('custom-catalog-url');
                    if (customUrlInput) customUrlInput.value = customUrl;
                }
            }
            
            const catalogSelect = document.getElementById('catalog-select');
            if (catalogSelect) {
                // Set the catalog value regardless of what it is (copernicus, element84, custom)
                catalogSelect.value = catalog;
                
                // Trigger the catalog change
                if (this.catalogSelector && typeof this.catalogSelector.handleCatalogChange === 'function') {
                    this.catalogSelector.handleCatalogChange(catalog);
                    console.log(`✅ Triggered catalog change to: ${catalog}`);
                } else {
                    // Fallback - dispatch change event
                    catalogSelect.dispatchEvent(new Event('change'));
                    console.log(`✅ Dispatched change event for catalog: ${catalog}`);
                }
            } else {
                console.warn('⚠️ Catalog select element not found');
            }
        } else {
            console.log('🔗 No catalog parameter in URL, using default');
        }
    }
    
    /**
     * Wait for collections to be loaded
     * @returns {Promise}
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
            
            // Also listen for the collections updated event
            document.addEventListener('collectionsUpdated', resolve, { once: true });
            
            // Start checking immediately
            checkCollections();
        });
    }
    
    /**
     * Restore search state from URL parameters
     * @param {URLSearchParams} params - URL parameters
     */
    async restoreSearchState(params) {
        console.log('🔗 Restoring search state from URL parameters...');
        
        // Restore collection selection
        if (params.has('cn')) {
            const collection = params.get('cn');
            console.log(`🔗 Restoring collection: ${collection}`);
            
            const collectionSelect = document.getElementById('collection-select');
            if (collectionSelect) {
                // Wait a bit more to ensure collection options are fully loaded
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Check if the collection exists in the dropdown
                const collectionOption = Array.from(collectionSelect.options).find(option => option.value === collection);
                if (collectionOption) {
                    collectionSelect.value = collection;
                    collectionSelect.dispatchEvent(new Event('change'));
                    console.log(`✅ Successfully set collection to: ${collection}`);
                } else {
                    console.warn(`⚠️ Collection '${collection}' not found in dropdown options`);
                    console.log('Available options:', Array.from(collectionSelect.options).map(opt => opt.value));
                }
                
                // Also update inline dropdown summary if it exists
                if (window.stacExplorer && window.stacExplorer.inlineDropdownManager) {
                    try {
                        // Find collection details to update display name
                        const collectionManager = window.stacExplorer.collectionManager;
                        if (collectionManager) {
                            const collectionObj = collectionManager.getCollectionById(collection);
                            if (collectionObj) {
                                const displayName = collectionObj.title || collectionObj.id;
                                window.stacExplorer.inlineDropdownManager.updateSearchSummary('collection', displayName.toUpperCase());
                                console.log(`✅ Updated inline dropdown collection display: ${displayName}`);
                            }
                        }
                    } catch (error) {
                        console.warn('⚠️ Could not update inline dropdown collection display:', error);
                    }
                }
            } else {
                console.warn('⚠️ Collection select element not found');
            }
        }
        
        // Restore search parameters
        if (params.has('search')) {
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.value = params.get('search');
        }
        
        if (params.has('ds')) {
            const dateStartInput = document.getElementById('date-start');
            if (dateStartInput) {
                dateStartInput.value = params.get('ds');
                console.log(`🔗 Restored date start: ${params.get('ds')}`);
            }
        }
        
        if (params.has('de')) {
            const dateEndInput = document.getElementById('date-end');
            if (dateEndInput) {
                dateEndInput.value = params.get('de');
                console.log(`🔗 Restored date end: ${params.get('de')}`);
            }
        }
        
        if (params.has('bbox')) {
            const bboxValue = params.get('bbox');
            console.log(`🔗 Restoring bbox: ${bboxValue}`);
            
            const bboxInput = document.getElementById('bbox-input');
            if (bboxInput) {
                bboxInput.value = bboxValue;
                
                // Update inline dropdown summary for location
                if (window.stacExplorer && window.stacExplorer.inlineDropdownManager) {
                    try {
                        window.stacExplorer.inlineDropdownManager.updateSearchSummary('location', 'MAP SELECTION');
                        console.log('✅ Updated inline dropdown location display');
                    } catch (error) {
                        console.warn('⚠️ Could not update inline dropdown location display:', error);
                    }
                }
                
                // Update map bbox if the map manager has this method
                if (this.mapManager.updateBBoxFromInput) {
                    this.mapManager.updateBBoxFromInput(bboxValue);
                } else if (this.mapManager.displayBboxOnMap) {
                    // Try alternative method
                    try {
                        const coords = bboxValue.split(',').map(Number);
                        if (coords.length === 4) {
                            this.mapManager.displayBboxOnMap(coords, 'URL Selection');
                            console.log('✅ Displayed bbox on map from URL');
                        }
                    } catch (error) {
                        console.warn('⚠️ Could not display bbox on map:', error);
                    }
                }
            }
        }
        
        console.log('✅ Search state restoration completed');
    }
    
    /**
     * Restore map state from URL parameters
     * @param {URLSearchParams} params - URL parameters
     */
    async restoreMapState(params) {
        if (params.has('mapCenter') && params.has('mapZoom')) {
            try {
                // Parse coordinates (stored as lat,lng but MapLibre expects [lng,lat])
                const [lat, lng] = params.get('mapCenter').split(',').map(Number);
                const zoom = parseFloat(params.get('mapZoom'));
                
                console.log(`🗺️ Restoring map state: center=[${lng}, ${lat}], zoom=${zoom}`);
                
                // Use MapLibre GL methods
                if (this.mapManager && this.mapManager.map) {
                    this.mapManager.map.setCenter([lng, lat]);
                    this.mapManager.map.setZoom(zoom);
                }
            } catch (error) {
                console.error('Failed to restore map state:', error);
            }
        }
    }
    
    /**
     * Restore active item from URL parameters
     * @param {URLSearchParams} params - URL parameters
     */
    async restoreActiveItem(params) {
        this.activeItemId = params.get('item_id');
        
        if (params.has('asset_key')) {
            this.activeAssetKey = params.get('asset_key');
        }
        
        console.log(`🎯 Attempting to restore active item: ${this.activeItemId} (asset: ${this.activeAssetKey || 'default'})`);
        
        // Trigger search if we have search parameters
        if (this.hasSearchParams(params) && this.searchPanel) {
            console.log('🔍 Triggering search to find active item');
            
            try {
                // Execute search and wait for results
                const searchResults = await this.executeSearchAndWaitForResults();
                
                if (searchResults && searchResults.length > 0) {
                    console.log(`📊 Got ${searchResults.length} search results, looking for active item`);
                    
                    // Ensure results are displayed in UI
                    await this.ensureResultsDisplayed(searchResults);
                    
                    // Find the active item
                    const activeItem = searchResults.find(item => item.id === this.activeItemId);
                    
                    if (activeItem) {
                        console.log('✅ Found active item in search results:', this.activeItemId);
                        
                        // Wait a bit more to ensure UI is ready
                        setTimeout(() => {
                            this.displayActiveItem(activeItem);
                        }, 1500); // Increased delay
                    } else {
                        console.warn('❌ Active item not found in search results:', this.activeItemId);
                        console.log('🔍 Available items:', searchResults.map(item => item.id).slice(0, 10));
                    }
                } else {
                    console.warn('❌ No search results obtained');
                }
            } catch (error) {
                console.error('❌ Error during search execution:', error);
            }
        } else {
            console.warn('⚠️ No search parameters found, cannot restore active item without search');
        }
    }
    
    /**
     * Execute search and wait for results
     * @returns {Promise<Array>} Search results
     */
    async executeSearchAndWaitForResults() {
        return new Promise((resolve, reject) => {
            let timeoutId;
            
            // Set up result listener
            const handleSearchResults = (event) => {
                clearTimeout(timeoutId);
                const results = event.detail?.results || event.detail || [];
                console.log(`📊 Search completed with ${results.length} results`);
                resolve(results);
            };
            
            // Listen for search results (only once)
            document.addEventListener('searchResultsLoaded', handleSearchResults, { once: true });
            
            // Set timeout for search
            timeoutId = setTimeout(() => {
                document.removeEventListener('searchResultsLoaded', handleSearchResults);
                console.warn('⏰ Search timeout - no results received within 15 seconds');
                resolve([]);
            }, 15000); // 15 second timeout
            
            // Ensure search parameters are applied before executing
            setTimeout(() => {
                this.logCurrentSearchParameters();
                
                // Trigger the search
                console.log('🔍 Executing search...');
                try {
                    this.searchPanel.performSearch();
                } catch (error) {
                    clearTimeout(timeoutId);
                    document.removeEventListener('searchResultsLoaded', handleSearchResults);
                    console.error('❌ Error executing search:', error);
                    reject(error);
                }
            }, 500); // Small delay to ensure parameters are set
        });
    }
    
    /**
     * Ensure search results are properly displayed in the UI
     * @param {Array} results - Search results to display
     */
    async ensureResultsDisplayed(results) {
        console.log('📊 Ensuring search results are displayed in UI...');
        
        // Make sure results panel shows the items
        if (this.searchPanel && this.searchPanel.resultsPanel) {
            this.searchPanel.resultsPanel.setItems(results);
        }
        
        // Wait for UI to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify results are actually displayed
        const datasetList = document.getElementById('dataset-list');
        if (datasetList) {
            const displayedItems = datasetList.querySelectorAll('.dataset-item');
            console.log(`📊 UI verification: ${displayedItems.length} items displayed in results panel`);
            
            if (displayedItems.length === 0 && results.length > 0) {
                console.warn('⚠️ Results not displayed in UI, attempting to force refresh...');
                
                // Force refresh the results panel
                setTimeout(() => {
                    if (this.searchPanel && this.searchPanel.resultsPanel) {
                        this.searchPanel.resultsPanel.setItems(results);
                        this.searchPanel.resultsPanel.renderPage();
                    }
                }, 200);
            }
        }
    }
    
    /**
     * Log current search parameters for debugging
     */
    logCurrentSearchParameters() {
        console.log('📋 Current search parameters:');
        
        const catalog = document.getElementById('catalog-select')?.value;
        const collection = document.getElementById('collection-select')?.value;
        const search = document.getElementById('search-input')?.value;
        const dateStart = document.getElementById('date-start')?.value;
        const dateEnd = document.getElementById('date-end')?.value;
        const bbox = document.getElementById('bbox-input')?.value;
        
        console.log(`   Catalog: ${catalog || 'not set'}`);
        console.log(`   Collection: ${collection || 'not set'}`);
        console.log(`   Search text: ${search || 'not set'}`);
        console.log(`   Date start: ${dateStart || 'not set'}`);
        console.log(`   Date end: ${dateEnd || 'not set'}`);
        console.log(`   Bbox: ${bbox || 'not set'}`);
        
        // Also check the collection select element state
        const collectionSelect = document.getElementById('collection-select');
        if (collectionSelect) {
            console.log(`   Collection element found: YES (options: ${collectionSelect.options.length})`);
            console.log(`   Selected option text: ${collectionSelect.selectedOptions[0]?.text || 'none'}`);
        } else {
            console.log(`   Collection element found: NO`);
        }
        
        // Validate all required elements are present
        const elementsStatus = {
            'catalog-select': !!document.getElementById('catalog-select'),
            'collection-select': !!document.getElementById('collection-select'),
            'search-input': !!document.getElementById('search-input'),
            'date-start': !!document.getElementById('date-start'),
            'date-end': !!document.getElementById('date-end'),
            'bbox-input': !!document.getElementById('bbox-input')
        };
        console.log('   Element availability:', elementsStatus);
    }
    
    /**
     * Handle when search results are loaded, to restore active item
     * @param {CustomEvent} event - The search results loaded event
     */
    handleSearchResultsLoaded(event) {
        if (!this.activeItemId) return;
        
        const results = event.detail?.results || event.detail;
        if (!results || !results.length) {
            console.warn('❌ No search results found for active item restoration');
            return;
        }
        
        // Find the item in the results
        const activeItem = results.find(item => item.id === this.activeItemId);
        if (activeItem) {
            console.log('✅ Found active item in search results:', this.activeItemId);
            
            setTimeout(() => {
                this.displayActiveItem(activeItem);
            }, 500);
        } else {
            console.warn('❌ Active item not found in search results:', this.activeItemId);
        }
    }
    
    /**
     * Display the active item on the map and update UI
     * @param {Object} activeItem - The STAC item to display
     */
    async displayActiveItem(activeItem) {
        try {
            console.log(`🎨 Preparing to display active item: ${activeItem.id}`);
            
            // Ensure map is ready
            if (!this.mapManager || !this.mapManager.isMapReady()) {
                console.log('⏳ Waiting for map to be ready...');
                await this.waitForMapReady();
            }
            
            // Wait a bit more to ensure map is fully rendered
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log('🗺️ Map is ready, proceeding with item display...');
            
            // Display item on map with the specified asset
            if (this.activeAssetKey === 'geometry') {
                console.log('🎨 Displaying item geometry on map');
                await this.mapManager.displayItemGeometry(activeItem);
            } else if (this.activeAssetKey) {
                console.log(`🖼️ Displaying item on map with asset: ${this.activeAssetKey}`);
                await this.mapManager.displayItemOnMap(activeItem, this.activeAssetKey);
            } else {
                console.log('🖼️ Displaying item on map with default asset');
                await this.mapManager.displayItemOnMap(activeItem, 'thumbnail');
            }
            
            // Update UI to show this item as selected
            this.updateUIForActiveItem(activeItem);
            
            console.log('✅ Active item displayed successfully');
        } catch (error) {
            console.error('❌ Failed to display active item:', error);
            
            // Try fallback to geometry display
            try {
                console.log('🔄 Attempting fallback to geometry display...');
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait before fallback
                await this.mapManager.displayItemGeometry(activeItem);
                this.updateUIForActiveItem(activeItem);
                console.log('✅ Fallback geometry display successful');
            } catch (fallbackError) {
                console.error('❌ Fallback also failed:', fallbackError);
                
                // Final fallback - just update UI without map display
                console.log('🔄 Final fallback: updating UI only...');
                this.updateUIForActiveItem(activeItem);
            }
        }
    }
    
    /**
     * Update UI to reflect the active item
     * @param {Object} activeItem - The active STAC item
     */
    updateUIForActiveItem(activeItem) {
        setTimeout(() => {
            console.log('🎯 Updating UI for active item:', activeItem.id);
            
            // Find and highlight the active item in the results
            document.querySelectorAll('.dataset-item').forEach(el => {
                el.classList.remove('active');
                if (el.dataset.id === this.activeItemId) {
                    el.classList.add('active');
                    console.log('✅ Found and highlighted active item in results');
                    
                    // Scroll the item into view
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
            
            // Ensure the results card is expanded and visible
            const resultsCard = document.getElementById('results-card');
            if (resultsCard) {
                if (resultsCard.classList.contains('collapsed')) {
                    console.log('📋 Expanding results card');
                    const resultsHeader = document.getElementById('results-header');
                    if (resultsHeader) resultsHeader.click();
                }
                
                // Make sure results are visible
                const datasetList = document.getElementById('dataset-list');
                if (datasetList && datasetList.children.length === 0) {
                    console.log('⚠️ Dataset list is empty, results may not have been displayed');
                }
            }
            
            // Ensure search card is expanded if we have search parameters
            const searchCard = document.getElementById('search-card');
            if (searchCard && searchCard.classList.contains('collapsed')) {
                console.log('🔍 Expanding search card');
                const searchHeader = document.getElementById('search-header');
                if (searchHeader) searchHeader.click();
            }
            
            // Ensure tools panel is expanded if it exists
            const toolsPanel = document.getElementById('tools-panel');
            if (toolsPanel && toolsPanel.classList.contains('collapsed')) {
                console.log('🛠️ Expanding tools panel');
                const toolsHeader = document.getElementById('tools-header');
                if (toolsHeader) toolsHeader.click();
            }
            
            console.log('✅ UI update completed');
        }, 300);
    }
    
    /**
     * Setup listeners for state changes
     */
    setupStateListeners() {
        // Only set up listeners if not currently restoring from URL
        if (this.isRestoringFromUrl) {
            return;
        }
        
        console.log('🔗 Setting up state change listeners');
        
        // Ensure sidebar remains visible when setting up listeners
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && sidebar.classList.contains('hidden')) {
            sidebar.classList.remove('hidden');
            console.log('✅ Removed hidden class from sidebar during listener setup');
        }
        
        // Listen for catalog changes
        const catalogSelect = document.getElementById('catalog-select');
        if (catalogSelect) {
            catalogSelect.addEventListener('change', () => this.updateUrl());
        }
        
        // Listen for collection changes
        const collectionSelect = document.getElementById('collection-select');
        if (collectionSelect) {
            collectionSelect.addEventListener('change', () => this.updateUrl());
        }
        
        // Listen for search parameter changes
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('change', () => this.updateUrl());
        }
        
        const dateStart = document.getElementById('date-start');
        if (dateStart) {
            dateStart.addEventListener('change', () => this.updateUrl());
        }
        
        const dateEnd = document.getElementById('date-end');
        if (dateEnd) {
            dateEnd.addEventListener('change', () => this.updateUrl());
        }
        
        const bboxInput = document.getElementById('bbox-input');
        if (bboxInput) {
            bboxInput.addEventListener('change', () => this.updateUrl());
        }
        
        // Listen for map changes
        if (this.mapManager && this.mapManager.map) {
            this.mapManager.map.on('moveend', () => {
                if (!this.isRestoringFromUrl) {
                    this.updateUrl();
                }
            });
        }
        
        // Listen for active item changes
        document.addEventListener('itemActivated', (event) => {
            if (!this.isRestoringFromUrl) {
                this.activeItemId = event.detail.itemId;
                this.activeAssetKey = event.detail.assetKey || null;
                this.updateUrl();
            }
        });
    }
    
    /**
     * Update URL with current application state
     */
    updateUrl() {
        if (this.isRestoringFromUrl) {
            return; // Don't update URL while restoring
        }
        
        // Start with existing URL parameters to preserve state that might not be in form elements
        const params = new URLSearchParams(window.location.search);
        
        // Add catalog/collection source selection
        const catalogSelect = document.getElementById('catalog-select');
        if (catalogSelect && catalogSelect.value) {
            const catalog = catalogSelect.value;
            params.set('cs', catalog); // Use 'cs' for collection source
            if (catalog === 'custom') {
                const customUrlInput = document.getElementById('custom-catalog-url');
                if (customUrlInput && customUrlInput.value) {
                    params.set('catalogUrl', customUrlInput.value);
                }
            }
        }
        
        // Add collection selection (overwrite if form has value)
        const collectionSelect = document.getElementById('collection-select');
        if (collectionSelect && collectionSelect.value) {
            params.set('cn', collectionSelect.value);
        }
        
        // Add search parameters (overwrite if form has value)
        const searchInput = document.getElementById('search-input');
        if (searchInput && searchInput.value) {
            params.set('search', searchInput.value);
        }
        
        // Add date parameters (overwrite if form has value)
        const dateStart = document.getElementById('date-start');
        if (dateStart && dateStart.value) {
            params.set('ds', dateStart.value);
        }
        
        const dateEnd = document.getElementById('date-end');
        if (dateEnd && dateEnd.value) {
            params.set('de', dateEnd.value);
        }
        
        // Add bbox (overwrite if form has value)
        const bboxInput = document.getElementById('bbox-input');
        if (bboxInput && bboxInput.value) {
            params.set('bbox', bboxInput.value);
        }
        
        // Add map state
        if (this.mapManager && this.mapManager.map) {
            const center = this.mapManager.map.getCenter();
            // Store as lat,lng for consistency with existing URLs
            params.set('mapCenter', `${center.lat.toFixed(6)},${center.lng.toFixed(6)}`);
            params.set('mapZoom', this.mapManager.map.getZoom().toString());
        }
        
        // Add active item if specified
        if (this.activeItemId) {
            params.set('item_id', this.activeItemId);
            
            // If we have an active asset, add it too
            if (this.activeAssetKey) {
                params.set('asset_key', this.activeAssetKey);
            }
        }
        
        // Update URL without reloading the page
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);
    }
    
    /**
     * Execute search after URL state restoration
     */
    async executeSearchAfterRestore() {
        try {
            // Try multiple search execution methods
            console.log('🔍 Attempting to execute search after URL state restoration...');
            
            // First, validate that collection parameter is properly set
            this.logCurrentSearchParameters();
            
            // Method 1: Click the main search button
            const mainSearchBtn = document.getElementById('main-search-btn');
            if (mainSearchBtn) {
                console.log('🔍 Triggering search via main search button');
                
                // Add a small delay to ensure the DOM is fully ready
                setTimeout(() => {
                    this.logCurrentSearchParameters(); // Log again right before click
                    mainSearchBtn.click();
                }, 200);
                return;
            }
            
            // Method 2: Click the execute search button
            const executeSearchBtn = document.getElementById('execute-search');
            if (executeSearchBtn) {
                console.log('🔍 Triggering search via execute search button');
                
                // Add a small delay to ensure the DOM is fully ready
                setTimeout(() => {
                    this.logCurrentSearchParameters(); // Log again right before click
                    executeSearchBtn.click();
                }, 200);
                return;
            }
            
            // Method 3: Use search panel if available (CardSearchPanel)
            if (window.stacExplorer && window.stacExplorer.searchPanel) {
                console.log('🔍 Triggering search via search panel (CardSearchPanel)');
                if (typeof window.stacExplorer.searchPanel.performSearch === 'function') {
                    // Add a small delay to ensure the DOM is fully ready
                    setTimeout(async () => {
                        this.logCurrentSearchParameters(); // Log again right before search
                        await window.stacExplorer.searchPanel.performSearch();
                    }, 200);
                    return;
                }
            }
            
            // Method 4: Trigger search via inline dropdown manager
            if (window.stacExplorer && window.stacExplorer.inlineDropdownManager) {
                console.log('🔍 Triggering search via inline dropdown manager');
                if (typeof window.stacExplorer.inlineDropdownManager.executeSearch === 'function') {
                    // Add a small delay to ensure the DOM is fully ready
                    setTimeout(async () => {
                        this.logCurrentSearchParameters(); // Log again right before search
                        await window.stacExplorer.inlineDropdownManager.executeSearch();
                    }, 200);
                    return;
                }
            }
            
            console.warn('⚠️ No search execution method available');
            
        } catch (error) {
            console.error('❌ Error executing search after URL restore:', error);
        }
    }

    /**
     * Check if URL parameters contain any search criteria
     * @param {URLSearchParams} params - URL parameters
     * @returns {boolean} True if search parameters exist
     */
    hasSearchParams(params) {
        return params.has('search') || 
               params.has('ds') || 
               params.has('de') || 
               params.has('bbox') ||
               params.has('cn');
    }
    
    /**
     * Get the current URL state status
     * @returns {boolean} True if URL has state parameters
     */
    hasUrlStateParams() {
        return this.hasUrlState;
    }
    
    /**
     * Wait for an element to be available in the DOM
     * @param {string} selector - Element selector
     * @returns {Promise} Promise that resolves when element is available
     */
    waitForElement(selector) {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }
            
            const observer = new MutationObserver(mutations => {
                if (document.querySelector(selector)) {
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }
} 