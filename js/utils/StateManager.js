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
        
        // Wait for initial catalog setup before initializing state
        // This ensures we don't interfere with the default Copernicus load
        setTimeout(() => {
            this.initFromUrl();
            this.setupStateListeners();
        }, 100);
    }
    
    /**
     * Initialize application state from URL parameters
     */
    initFromUrl() {
        const params = new URLSearchParams(window.location.search);
        
        // Handle non-default catalog selection
        if (params.has('catalog') && params.get('catalog') !== 'copernicus') {
            const catalog = params.get('catalog');
            if (catalog === 'custom') {
                const customUrl = params.get('catalogUrl');
                if (customUrl) {
                    document.getElementById('custom-catalog-url').value = customUrl;
                }
                document.getElementById('catalog-select').value = catalog;
                this.catalogSelector.handleCatalogChange(catalog);
            } else {
                document.getElementById('catalog-select').value = catalog;
                this.catalogSelector.handleCatalogChange(catalog);
            }
        }
        
        // Handle other state parameters after collections are loaded
        const handleCollectionsLoaded = () => {
            // Restore collection selection if specified
            if (params.has('collection')) {
                const collection = params.get('collection');
                document.getElementById('collection-select').value = collection;
                document.getElementById('collection-select').dispatchEvent(new Event('change'));
            }
            
            // Restore search parameters
            if (params.has('search')) {
                document.getElementById('search-input').value = params.get('search');
            }
            if (params.has('dateStart')) {
                document.getElementById('date-start').value = params.get('dateStart');
            }
            if (params.has('dateEnd')) {
                document.getElementById('date-end').value = params.get('dateEnd');
            }
            if (params.has('bbox')) {
                document.getElementById('bbox-input').value = params.get('bbox');
                this.mapManager.updateBBoxFromInput(params.get('bbox'));
            }
            
            // Restore map state
            if (params.has('mapCenter') && params.has('mapZoom')) {
                const [lat, lng] = params.get('mapCenter').split(',').map(Number);
                const zoom = parseInt(params.get('mapZoom'));
                this.mapManager.map.setView([lat, lng], zoom);
            }
            
            // Restore active item if specified
            if (params.has('activeItem')) {
                this.activeItemId = params.get('activeItem');
                
                // If we also have an active asset, store it
                if (params.has('activeAsset')) {
                    this.activeAssetKey = params.get('activeAsset');
                }
                
                // We'll need to wait for search results to load before we can activate the item
                document.addEventListener('searchResultsLoaded', this.handleSearchResultsLoaded.bind(this), { once: true });
            }
            
            // Trigger search if we have any search parameters
            if (this.hasSearchParams(params) && this.searchPanel) {
                this.searchPanel.performSearch();
            }
        };

        // Listen for collections to be loaded
        document.addEventListener('collectionsUpdated', handleCollectionsLoaded, { once: true });
    }
    
    /**
     * Handle when search results are loaded, to restore active item
     * @param {CustomEvent} event - The search results loaded event
     */
    handleSearchResultsLoaded(event) {
        if (!this.activeItemId) return;
        
        const results = event.detail.results;
        if (!results || !results.length) return;
        
        // Find the item in the results
        const activeItem = results.find(item => item.id === this.activeItemId);
        if (activeItem) {
            console.log('Restoring active item from URL:', this.activeItemId);
            
            // If we have an active asset, pass it to the display method
            if (this.activeAssetKey) {
                console.log('Using specified asset key from URL:', this.activeAssetKey);
                this.mapManager.displayItemOnMap(activeItem, this.activeAssetKey);
            } else {
                // Default to thumbnail if no asset key is specified
                console.log('No asset key specified, defaulting to thumbnail');
                this.mapManager.displayItemOnMap(activeItem, 'thumbnail');
            }
            
            // Also update the UI to show this item as selected
            setTimeout(() => {
                document.querySelectorAll('.dataset-item').forEach(el => {
                    if (el.dataset.itemId === this.activeItemId) {
                        el.classList.add('active');
                        
                        // Ensure the results card is expanded
                        if (document.getElementById('results-card').classList.contains('collapsed')) {
                            document.getElementById('results-header').click();
                        }
                        
                        // Scroll the item into view
                        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                });
                
                // Ensure tools panel is expanded
                if (document.getElementById('tools-panel').classList.contains('collapsed')) {
                    document.getElementById('tools-header').click();
                }
            }, 500); // Small delay to ensure the UI is ready
        }
    }
    
    /**
     * Setup listeners for state changes
     */
    setupStateListeners() {
        // Listen for catalog changes
        document.getElementById('catalog-select').addEventListener('change', () => this.updateUrl());
        
        // Listen for collection changes
        document.getElementById('collection-select').addEventListener('change', () => this.updateUrl());
        
        // Listen for search parameter changes
        document.getElementById('search-input').addEventListener('change', () => this.updateUrl());
        document.getElementById('date-start').addEventListener('change', () => this.updateUrl());
        document.getElementById('date-end').addEventListener('change', () => this.updateUrl());
        document.getElementById('bbox-input').addEventListener('change', () => this.updateUrl());
        
        // Listen for map changes
        this.mapManager.map.on('moveend', () => this.updateUrl());
        
        // Listen for active item changes
        document.addEventListener('itemActivated', (event) => {
            this.activeItemId = event.detail.itemId;
            this.activeAssetKey = event.detail.assetKey || null;
            this.updateUrl();
        });
    }
    
    /**
     * Update URL with current application state
     */
    updateUrl() {
        const params = new URLSearchParams();
        
        // Add catalog selection
        const catalog = document.getElementById('catalog-select').value;
        if (catalog) {
            params.set('catalog', catalog);
            if (catalog === 'custom') {
                const customUrl = document.getElementById('custom-catalog-url').value;
                if (customUrl) {
                    params.set('catalogUrl', customUrl);
                }
            }
        }
        
        // Add collection selection
        const collection = document.getElementById('collection-select').value;
        if (collection) {
            params.set('collection', collection);
        }
        
        // Add search parameters
        const searchText = document.getElementById('search-input').value;
        if (searchText) {
            params.set('search', searchText);
        }
        
        const dateStart = document.getElementById('date-start').value;
        if (dateStart) {
            params.set('dateStart', dateStart);
        }
        
        const dateEnd = document.getElementById('date-end').value;
        if (dateEnd) {
            params.set('dateEnd', dateEnd);
        }
        
        const bbox = document.getElementById('bbox-input').value;
        if (bbox) {
            params.set('bbox', bbox);
        }
        
        // Add map state
        const center = this.mapManager.map.getCenter();
        params.set('mapCenter', `${center.lat.toFixed(6)},${center.lng.toFixed(6)}`);
        params.set('mapZoom', this.mapManager.map.getZoom().toString());
        
        // Add active item if specified
        if (this.activeItemId) {
            params.set('activeItem', this.activeItemId);
            
            // If we have an active asset, add it too
            if (this.activeAssetKey) {
                params.set('activeAsset', this.activeAssetKey);
            }
        }
        
        // Update URL without reloading the page
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);
    }
    
    /**
     * Check if URL parameters contain any search criteria
     * @param {URLSearchParams} params - URL parameters
     * @returns {boolean} True if search parameters exist
     */
    hasSearchParams(params) {
        return params.has('search') || 
               params.has('dateStart') || 
               params.has('dateEnd') || 
               params.has('bbox') ||
               params.has('collection');
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