/**
 * UnifiedRouter.js - Unified URL routing system for STAC Explorer
 * Handles both /view/ (search/visualization) and /browser/ (catalog browsing) modes
 * Replaces both PathRouter.js and URL handling in UnifiedStateManager.js
 */

export class UnifiedRouter {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.isProcessingRoute = false;
        this.currentMode = 'view'; // 'view' or 'browser'
        
        // Route patterns for both modes
        this.routes = {
            // View mode routes (search/visualization) - order matters for pattern matching
            viewRoot: /^\/view\/?$/,
            viewSearch: /^\/view\/search\/?$/,
            viewItem: /^\/view\/item\/([^\/]+)\/?$/,
            viewCollection: /^\/view\/collection\/([^\/]+)\/?$/,
            viewCatalogCollection: /^\/view\/([^\/]+)\/([^\/]+)\/?$/,  // /view/{catalogId}/{collectionId} - must be last
            
            // Browser mode routes (catalog browsing) - simplified structure
            browserRoot: /^\/browser\/?$/,
            browserCatalog: /^\/browser\/([^\/]+)\/?$/,                    // /browser/{catalogId}
            browserCollection: /^\/browser\/([^\/]+)\/([^\/]+)\/?$/,       // /browser/{catalogId}/{collectionId}
            browserItem: /^\/browser\/([^\/]+)\/([^\/]+)\/([^\/]+)\/?$/,    // /browser/{catalogId}/{collectionId}/{itemId}
            
            // Legacy redirect patterns
            legacyCatalog: /^\/catalog(?:\/.*)?$/,
            legacyBrowserVerbose: /^\/browser\/catalog\/([^\/]+)(?:\/collection\/([^\/]+))?(?:\/item\/([^\/]+))?\/?$/
        };
        
        this.initialize();
    }
    
    initialize() {
        this.setupEventListeners();
        this.setupPopStateHandler();
        this.processCurrentPath();
    }
    
    setupEventListeners() {
        // Listen for view mode changes
        document.addEventListener('viewModeChanged', (event) => {
            console.log('🔄 viewModeChanged event received:', event.detail.mode, 'Processing route:', this.isProcessingRoute);
            if (!this.isProcessingRoute) {
                console.log('🔄 Handling view mode change to:', event.detail.mode);
                this.handleViewModeChange(event.detail.mode);
            } else {
                console.log('🚫 Ignoring view mode change - route processing in progress');
            }
        });
        
        // Listen for catalog browser state changes
        document.addEventListener('catalogBrowserStateChanged', (event) => {
            console.log('🔄 catalogBrowserStateChanged event received:', event.detail, 'Processing route:', this.isProcessingRoute, 'Current mode:', this.currentMode);
            if (!this.isProcessingRoute && this.currentMode === 'browser') {
                console.log('🔄 Updating browser path from state change');
                this.updateBrowserPath(event.detail);
            } else {
                console.log('🚫 Ignoring catalog browser state change - route processing or wrong mode');
            }
        });
        
        // Listen for search state changes
        document.addEventListener('searchParameterChanged', (event) => {
            if (!this.isProcessingRoute && this.currentMode === 'view') {
                this.updateViewPath(event.detail);
            }
        });
        
        // Listen for item activation in view mode
        document.addEventListener('itemActivated', (event) => {
            if (!this.isProcessingRoute && this.currentMode === 'view') {
                this.updateViewPath({
                    type: 'item',
                    itemId: event.detail.itemId,
                    assetKey: event.detail.assetKey
                });
            }
        });
        
        // Listen for collection selection in view mode
        document.addEventListener('collectionSelected', (event) => {
            console.log('🔄 collectionSelected event received:', event.detail);
            if (!this.isProcessingRoute && this.currentMode === 'view') {
                console.log('🔄 Updating view path for collection selection');
                this.updateViewPath({
                    type: 'collection',
                    collection: event.detail.collection.id,
                    catalogId: event.detail.catalogId  // Pass catalog ID from event
                });
            } else {
                console.log('🚫 Ignoring collection selection - route processing or wrong mode');
            }
        });
    }
    
    setupPopStateHandler() {
        window.addEventListener('popstate', (event) => {
            console.log('📍 Handling popstate navigation');
            this.processCurrentPath();
        });
    }
    
    /**
     * Process the current URL path and route appropriately
     */
    processCurrentPath() {
        const path = window.location.pathname;
        console.log('📍 Processing path:', path);
        
        // Set processing flag immediately to prevent cascade events
        this.isProcessingRoute = true;
        
        // Handle root path
        if (path === '/' || path === '/index.html') {
            this.isProcessingRoute = false;
            this.redirectToViewMode();
            return;
        }
        
        // Try to match against route patterns
        const route = this.matchRoute(path);
        if (route) {
            this.handleRoute(route);
        } else {
            console.warn('📍 No route matched, redirecting to view mode');
            this.isProcessingRoute = false;
            this.redirectToViewMode();
        }
    }
    
    /**
     * Match path against route patterns
     */
    matchRoute(path) {
        for (const [routeName, pattern] of Object.entries(this.routes)) {
            const match = path.match(pattern);
            if (match) {
                return {
                    name: routeName,
                    matches: match.slice(1),
                    path: path,
                    mode: routeName.startsWith('browser') ? 'browser' : 'view'
                };
            }
        }
        return null;
    }
    
    /**
     * Handle a matched route
     */
    async handleRoute(route) {
        this.isProcessingRoute = true;
        
        try {
            console.log('📍 Handling route:', route.name, 'Mode:', route.mode);
            console.log('📍 isProcessingRoute set to true');
            
            // Set the current mode
            this.currentMode = route.mode;
            console.log('📍 Current mode set to:', this.currentMode);
            
            // Ensure correct view mode is active
            if (this.stateManager.viewModeToggle) {
                const toggleMode = route.mode === 'browser' ? 'catalog' : 'map';
                console.log('📍 Setting view mode toggle to:', toggleMode, '(silent mode)');
                this.stateManager.viewModeToggle.setMode(toggleMode, true); // Silent mode to prevent cascade
            }
            
            // Handle specific routes
            switch (route.name) {
                // View mode routes
                case 'viewRoot':
                case 'viewSearch':
                    await this.handleViewRoute();
                    break;
                    
                case 'viewItem':
                    await this.handleViewItemRoute(route.matches[0]);
                    break;
                    
                case 'viewCollection':
                    await this.handleViewCollectionRoute(route.matches[0]);
                    break;
                    
                case 'viewCatalogCollection':
                    await this.handleViewCatalogCollectionRoute(route.matches[0], route.matches[1]);
                    break;
                
                // Browser mode routes
                case 'browserRoot':
                    await this.handleBrowserRootRoute();
                    break;
                    
                case 'browserCatalog':
                    await this.handleBrowserCatalogRoute(route.matches[0]);
                    break;
                    
                case 'browserCollection':
                    await this.handleBrowserCollectionRoute(route.matches[0], route.matches[1]);
                    break;
                    
                case 'browserItem':
                    await this.handleBrowserItemRoute(route.matches[0], route.matches[1], route.matches[2]);
                    break;
                
                // Legacy redirects
                case 'legacyCatalog':
                    this.redirectLegacyCatalogRoute(route.path);
                    break;
                    
                case 'legacyBrowserVerbose':
                    this.redirectLegacyBrowserRoute(route.matches);
                    break;
            }
            
        } catch (error) {
            console.error('📍 Error handling route:', error);
        } finally {
            console.log('📍 Route handling complete, setting isProcessingRoute to false');
            this.isProcessingRoute = false;
        }
    }
    
    // === VIEW MODE ROUTE HANDLERS ===
    
    async handleViewRoute() {
        console.log('📍 Handling view route - search/visualization mode');
        
        // Restore search state from query parameters
        const params = new URLSearchParams(window.location.search);
        if (params.toString()) {
            console.log('📍 Restoring search state from query params');
            await this.stateManager.initFromUrl();
        }
    }
    
    async handleViewItemRoute(itemId) {
        console.log('📍 Handling view item route:', itemId);
        
        // Set active item and restore other state from query params
        this.stateManager.activeItemId = itemId;
        
        const params = new URLSearchParams(window.location.search);
        if (params.has('asset_key')) {
            this.stateManager.activeAssetKey = params.get('asset_key');
        }
        
        await this.stateManager.initFromUrl();
    }
    
    async handleViewCollectionRoute(collectionId) {
        console.log('📍 Handling view collection route:', collectionId);
        
        // Set collection and restore other state from query params
        const collectionSelect = document.getElementById('collection-select');
        if (collectionSelect) {
            // Wait for collections to load
            await this.stateManager.waitForCollectionsLoaded();
            collectionSelect.value = collectionId;
            collectionSelect.dispatchEvent(new Event('change'));
        }
        
        await this.stateManager.initFromUrl();
    }
    
    async handleViewCatalogCollectionRoute(catalogId, collectionId) {
        console.log('📍 Handling view catalog+collection route:', catalogId, collectionId);
        
        try {
            // First, get the catalog configuration by its real STAC ID
            const catalog = await this.getCatalogConfig(catalogId);
            if (!catalog) {
                console.warn('📍 Catalog not found for ID:', catalogId);
                // Fallback to regular collection route
                await this.handleViewCollectionRoute(collectionId);
                return;
            }
            
            console.log('📍 Found catalog for view mode:', catalog);
            
            // Set the API client to use this catalog
            if (this.stateManager.apiClient) {
                console.log('📍 Setting API client endpoints to:', catalog.endpoint);
                this.stateManager.apiClient.setEndpoints(catalog.endpoint);
            }
            
            // Update the collection source summary to show the selected catalog
            const sourceSummary = document.getElementById('summary-source');
            if (sourceSummary) {
                console.log('📍 Updating source summary to show:', catalog.name);
                sourceSummary.textContent = catalog.name;
                sourceSummary.setAttribute('data-catalog-id', catalog.id);
                sourceSummary.setAttribute('data-catalog-name', catalog.name);
            }
            
            // Wait for collections to load from the new catalog, then set the collection
            const collectionSelect = document.getElementById('collection-select');
            if (collectionSelect) {
                console.log('📍 Waiting for collections to load from catalog:', catalog.name);
                await this.stateManager.waitForCollectionsLoaded();
                
                console.log('📍 Setting collection selector to:', collectionId);
                collectionSelect.value = collectionId;
                collectionSelect.dispatchEvent(new Event('change'));
            }
            
            // Initialize other state from query parameters
            await this.stateManager.initFromUrl();
            
        } catch (error) {
            console.error('📍 Error handling view catalog+collection route:', error);
            // Fallback to regular collection route
            await this.handleViewCollectionRoute(collectionId);
        }
    }
    
    // === BROWSER MODE ROUTE HANDLERS ===
    
    async handleBrowserRootRoute() {
        console.log('📍 Handling browser root route - catalog selection');
        
        if (this.stateManager.catalogBrowser) {
            this.stateManager.catalogBrowser.navigateToRoot();
        }
    }
    
    async handleBrowserCatalogRoute(catalogId) {
        console.log('📍 Handling browser catalog route:', catalogId);
        
        if (this.stateManager.catalogBrowser) {
            const catalog = await this.getCatalogConfig(catalogId);
            if (catalog) {
                await this.stateManager.catalogBrowser.selectCatalog(catalog);
            } else {
                console.warn('📍 Catalog not found:', catalogId);
            }
        }
    }
    
    async handleBrowserCollectionRoute(catalogId, collectionId) {
        console.log('📍 Handling browser collection route - direct load:', catalogId, collectionId);
        
        // Switch to browser mode and ensure catalog browser is ready
        if (this.currentMode !== 'browser') {
            this.currentMode = 'browser';
            
            // Show catalog browser directly without going through setViewMode
            if (this.stateManager.catalogBrowser) {
                this.stateManager.catalogBrowser.show(true); // Skip auto-load for direct deep links
            }
            
            // Update UI state without triggering events that cause reloads
            if (this.stateManager.viewModeToggle) {
                this.stateManager.viewModeToggle.setMode('browser', true); // silent mode
            }
        }
        
        // Wait for catalog browser to be ready
        if (!this.stateManager.catalogBrowser) {
            console.warn('📍 Catalog browser not available');
            return;
        }
        
        try {
            console.log('📍 Direct loading collection without intermediate steps');
            
            // Get catalog configuration
            const catalog = await this.getCatalogConfig(catalogId);
            if (!catalog) {
                console.error('📍 Catalog configuration not found:', catalogId);
                return;
            }
            
            // Set up API client directly
            this.stateManager.catalogBrowser.apiClient.setEndpoints(catalog.endpoint);
            
            // Load collections directly
            const collections = await this.stateManager.catalogBrowser.apiClient.getCollections();
            const collection = collections.find(c => c.id === collectionId);
            
            if (collection) {
                console.log('📍 Found collection, loading directly:', collectionId);
                
                // Set up the path manually without triggering intermediate displays
                this.stateManager.catalogBrowser.currentPath = [
                    { type: 'catalog', data: { id: catalogId, name: catalog.name || catalogId, title: catalog.name || catalogId } }
                ];
                
                // Update breadcrumb
                this.stateManager.catalogBrowser.updateBreadcrumb();
                
                // Directly browse the collection without showing catalog collections first
                await this.stateManager.catalogBrowser.browseCollection(collection);
                
            } else {
                console.warn('📍 Collection not found:', collectionId);
                // Show catalog collections as fallback
                await this.stateManager.catalogBrowser.selectCatalog(catalog);
            }
            
        } catch (error) {
            console.error('📍 Error in direct collection load:', error);
            // Minimal fallback - just show browser without navigation
            if (this.stateManager.catalogBrowser) {
                this.stateManager.catalogBrowser.show(true); // Skip auto-load for fallback too
            }
        }
    }
    
    async handleBrowserItemRoute(catalogId, collectionId, itemId) {
        console.log('📍 Handling browser item route - direct load:', catalogId, collectionId, itemId);
        
        // Switch to browser mode and ensure catalog browser is ready
        if (this.currentMode !== 'browser') {
            this.currentMode = 'browser';
            
            // Show catalog browser directly without going through setViewMode
            if (this.stateManager.catalogBrowser) {
                this.stateManager.catalogBrowser.show(true); // Skip auto-load for direct deep links
            }
            
            // Update UI state without triggering events that cause reloads
            if (this.stateManager.viewModeToggle) {
                this.stateManager.viewModeToggle.setMode('browser', true); // silent mode
            }
        }
        
        // Wait for catalog browser to be ready
        if (!this.stateManager.catalogBrowser) {
            console.warn('📍 Catalog browser not available');
            return;
        }
        
        try {
            console.log('📍 Direct loading item without intermediate steps');
            
            // Get catalog configuration
            const catalog = await this.getCatalogConfig(catalogId);
            if (!catalog) {
                console.error('📍 Catalog configuration not found:', catalogId);
                return;
            }
            
            // Set up API client directly
            this.stateManager.catalogBrowser.apiClient.setEndpoints(catalog.endpoint);
            
            // Load collections to get the collection object
            const collections = await this.stateManager.catalogBrowser.apiClient.getCollections();
            const collection = collections.find(c => c.id === collectionId);
            
            if (!collection) {
                console.warn('📍 Collection not found:', collectionId);
                // Fallback to loading all collections
                await this.stateManager.catalogBrowser.selectCatalog(catalog);
                return;
            }
            
            // Load items from the collection
            const items = await this.stateManager.catalogBrowser.apiClient.getCollectionItems(collectionId);
            const item = items.features?.find(i => i.id === itemId);
            
            if (item) {
                console.log('📍 Found item, loading directly:', itemId);
                
                // Set up the path manually without triggering intermediate displays
                this.stateManager.catalogBrowser.currentPath = [
                    { type: 'catalog', data: { id: catalogId, name: catalog.name || catalogId, title: catalog.name || catalogId } },
                    { type: 'collection', data: collection }
                ];
                
                // Update breadcrumb
                this.stateManager.catalogBrowser.updateBreadcrumb();
                
                // Directly show the items
                await this.stateManager.catalogBrowser.displayItems(items.features);
                
                // Highlight and scroll to the specific item
                setTimeout(() => {
                    const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
                    if (itemElement) {
                        itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        itemElement.classList.add('highlighted');
                    }
                }, 500);
                
            } else {
                console.warn('📍 Item not found, loading collection items:', itemId);
                // Set up the path and show all items from collection
                this.stateManager.catalogBrowser.currentPath = [
                    { type: 'catalog', data: { id: catalogId, name: catalog.name || catalogId, title: catalog.name || catalogId } }
                ];
                await this.stateManager.catalogBrowser.browseCollection(collection);
            }
            
        } catch (error) {
            console.error('📍 Error in direct item load:', error);
            // Minimal fallback - just show browser
            if (this.stateManager.catalogBrowser) {
                this.stateManager.catalogBrowser.show(true); // Skip auto-load for fallback too
            }
        }
    }
    
    // === PATH UPDATE METHODS ===
    
    /**
     * Handle view mode changes from UI
     */
    handleViewModeChange(mode) {
        const newMode = mode === 'catalog' ? 'browser' : 'view';
        
        if (newMode !== this.currentMode) {
            this.currentMode = newMode;
            
            if (newMode === 'view') {
                this.redirectToViewMode();
            } else {
                this.redirectToBrowserMode();
            }
        }
    }
    
    /**
     * Update path for view mode (search/visualization)
     */
    updateViewPath(stateChange) {
        let newPath = '/view';
        const params = new URLSearchParams(window.location.search);
        
        // Determine specific view path
        if (stateChange.type === 'item' && stateChange.itemId) {
            newPath = `/view/item/${encodeURIComponent(stateChange.itemId)}`;
            if (stateChange.assetKey) {
                params.set('asset_key', stateChange.assetKey);
            }
        } else if (stateChange.type === 'collection' && stateChange.collection) {
            // Check if catalog ID is provided in the state change
            const catalogId = stateChange.catalogId || this.getCurrentCatalogIdSync();
            if (catalogId) {
                // Use new catalog+collection format: /view/{catalogId}/{collectionId}
                newPath = `/view/${encodeURIComponent(catalogId)}/${encodeURIComponent(stateChange.collection)}`;
                console.log('📍 Generated catalog+collection URL:', newPath);
            } else {
                // Fallback to legacy collection-only format
                newPath = `/view/collection/${encodeURIComponent(stateChange.collection)}`;
                console.log('📍 Generated legacy collection URL (no catalog):', newPath);
            }
        } else if (stateChange.search || stateChange.locationBbox || stateChange.dateStart) {
            newPath = '/view/search';
        }
        
        // Update query parameters for view state
        this.updateViewQueryParams(params, stateChange);
        
        // Build final URL
        const queryString = params.toString();
        const fullUrl = queryString ? `${newPath}?${queryString}` : newPath;
        
        if (fullUrl !== window.location.pathname + window.location.search) {
            console.log('📍 Updating view path to:', fullUrl);
            window.history.pushState({}, '', fullUrl);
        }
    }
    
    /**
     * Update path for browser mode (catalog browsing)
     */
    updateBrowserPath(state) {
        console.log('🔧 updateBrowserPath() called with state:', state);
        
        let newPath = '/browser';
        
        if (state.catalogId) {
            console.log('🔧 Using catalog ID for URL:', state.catalogId);
            newPath = `/browser/${encodeURIComponent(state.catalogId)}`;
            
            if (state.collectionId) {
                console.log('🔧 Adding collection ID to URL:', state.collectionId);
                newPath += `/${encodeURIComponent(state.collectionId)}`;
                
                if (state.itemId) {
                    console.log('🔧 Adding item ID to URL:', state.itemId);
                    newPath += `/${encodeURIComponent(state.itemId)}`;
                }
            }
        }
        
        if (newPath !== window.location.pathname) {
            console.log('📍 Updating browser path from', window.location.pathname, 'to:', newPath);
            window.history.pushState({}, '', newPath);
        } else {
            console.log('📍 Path unchanged:', newPath);
        }
    }
    
    /**
     * Update query parameters for view mode
     */
    updateViewQueryParams(params, stateChange) {
        // Map state changes to URL parameters
        const urlKeys = this.stateManager.urlKeys;
        
        Object.entries(stateChange).forEach(([key, value]) => {
            switch (key) {
                case 'collection':
                    if (value) {
                        params.set(urlKeys.collection, value);
                    } else {
                        params.delete(urlKeys.collection);
                    }
                    break;
                    
                case 'collectionSource':
                    if (value) params.set(urlKeys.collectionSource, value);
                    break;
                    
                case 'locationBbox':
                    if (Array.isArray(value)) {
                        params.set(urlKeys.locationBbox, value.join(','));
                    } else if (value) {
                        params.set(urlKeys.locationBbox, value);
                    }
                    break;
                    
                case 'locationName':
                    if (value && value !== 'THE WORLD') {
                        params.set(urlKeys.locationName, value);
                    }
                    break;
                    
                case 'dateStart':
                    if (value) params.set(urlKeys.dateStart, value);
                    break;
                    
                case 'dateEnd':
                    if (value) params.set(urlKeys.dateEnd, value);
                    break;
                    
                case 'dateType':
                    if (value && value !== 'anytime') {
                        params.set(urlKeys.dateType, value);
                    }
                    break;
                    
                case 'cloudCover':
                    if (value && value !== 20) {
                        params.set(urlKeys.cloudCover, value.toString());
                    }
                    break;
                    
                case 'search':
                    if (value) {
                        params.set(urlKeys.search, value);
                    } else {
                        params.delete(urlKeys.search);
                    }
                    break;
            }
        });
        
        // Add map state if available
        if (this.stateManager.mapManager?.map) {
            const center = this.stateManager.mapManager.map.getCenter();
            const zoom = this.stateManager.mapManager.map.getZoom();
            params.set(urlKeys.mapCenter, `${center.lat.toFixed(6)},${center.lng.toFixed(6)}`);
            params.set(urlKeys.mapZoom, zoom.toString());
        }
    }
    
    // === REDIRECT METHODS ===
    
    redirectToViewMode() {
        console.log('📍 Redirecting to view mode');
        this.currentMode = 'view';
        
        // Preserve any existing query parameters
        const search = window.location.search;
        const newUrl = search ? `/view${search}` : '/view';
        
        window.history.replaceState({}, '', newUrl);
        
        // Ensure view mode toggle is correct
        if (this.stateManager.viewModeToggle) {
            this.stateManager.viewModeToggle.setMode('map');
        }
    }
    
    redirectToBrowserMode() {
        console.log('📍 Redirecting to browser mode');
        this.currentMode = 'browser';
        
        window.history.replaceState({}, '', '/browser');
        
        // Ensure view mode toggle is correct
        if (this.stateManager.viewModeToggle) {
            this.stateManager.viewModeToggle.setMode('catalog');
        }
    }
    
    redirectLegacyCatalogRoute(path) {
        console.log('📍 Redirecting legacy catalog route:', path);
        
        // Convert old /catalog/... URLs to new simplified /browser/... format
        const newPath = path.replace(/^\/catalog/, '/browser');
        window.history.replaceState({}, '', newPath);
        this.processCurrentPath();
    }
    
    redirectLegacyBrowserRoute(matches) {
        console.log('📍 Redirecting legacy verbose browser route:', matches);
        
        // Convert /browser/catalog/{id}/collection/{id}/item/{id} to /browser/{id}/{id}/{id}
        let newPath = '/browser';
        
        const catalogId = matches[0];
        const collectionId = matches[1];
        const itemId = matches[2];
        
        if (catalogId) {
            newPath += `/${catalogId}`;
            
            if (collectionId) {
                newPath += `/${collectionId}`;
                
                if (itemId) {
                    newPath += `/${itemId}`;
                }
            }
        }
        
        // Preserve query parameters
        const search = window.location.search;
        const fullNewPath = search ? `${newPath}${search}` : newPath;
        
        console.log('📍 Redirecting to simplified path:', fullNewPath);
        window.history.replaceState({}, '', fullNewPath);
        this.processCurrentPath();
    }
    
    // === UTILITY METHODS ===
    
    /**
     * Get catalog configuration by ID (dynamically resolves from available catalogs)
     */
    async getCatalogConfig(catalogId) {
        // First try to get from the dynamically loaded catalogs
        const availableCatalogs = await this.getAvailableCatalogs();
        
        // Look for exact match by ID
        let catalog = availableCatalogs.find(c => c.id === catalogId);
        
        // If not found, try legacy aliases
        if (!catalog) {
            const legacyAliases = {
                'copernicus': 'cdse-stac',
                'element84': 'earth-search-aws', 
                'planetary': 'microsoft-pc'
            };
            
            const realId = legacyAliases[catalogId];
            if (realId) {
                catalog = availableCatalogs.find(c => c.id === realId);
            }
        }
        
        return catalog || null;
    }
    
    /**
     * Get available catalogs dynamically from the application configuration
     */
    async getAvailableCatalogs() {
        // Always try to use the CatalogBrowserPanel's method first (most reliable)
        if (this.stateManager.catalogBrowser && typeof this.stateManager.catalogBrowser.getAvailableCatalogs === 'function') {
            try {
                console.log('📋 Using CatalogBrowserPanel.getAvailableCatalogs() for real STAC IDs');
                const catalogs = await this.stateManager.catalogBrowser.getAvailableCatalogs();
                console.log('📋 Got catalogs from CatalogBrowserPanel:', catalogs);
                return catalogs;
            } catch (error) {
                console.warn('⚠️ Failed to get catalogs from CatalogBrowserPanel:', error);
            }
        }
        
        // Fallback: Direct config fetching (less reliable, should be avoided)
        console.log('⚠️ Falling back to direct config fetching - real STAC IDs might not be available');
        if (window.stacExplorer?.config?.stacEndpoints) {
            const catalogs = [];
            
            for (const [key, endpoint] of Object.entries(window.stacExplorer.config.stacEndpoints)) {
                try {
                    // Try to fetch the catalog ID from the STAC root endpoint
                    const response = await fetch(endpoint.root);
                    const stacRoot = await response.json();
                    
                    catalogs.push({
                        id: stacRoot.id || key, // Use actual STAC ID or fallback to config key
                        name: stacRoot.title || stacRoot.description || key, // Use 'title' field from STAC
                        endpoint: endpoint,
                        url: endpoint.root
                    });
                } catch (error) {
                    console.warn(`Failed to fetch catalog info for ${key}:`, error);
                    // Fallback to config-based catalog
                    catalogs.push({
                        id: key,
                        name: key,
                        endpoint: endpoint,
                        url: endpoint.root
                    });
                }
            }
            
            return catalogs;
        }
        
        // Ultimate fallback - return empty array
        console.warn('❌ No catalog sources available - returning empty array');
        return [];
    }
    
    /**
     * Get current catalog ID from the active API client (synchronous version)
     */
    getCurrentCatalogIdSync() {
        try {
            // If we have an API client, try to determine which catalog it's using
            if (this.stateManager.apiClient && this.stateManager.apiClient.endpoints) {
                const currentEndpoint = this.stateManager.apiClient.endpoints.root;
                console.log('📍 Current API endpoint:', currentEndpoint);
                
                // Check against known catalog endpoints from config
                if (window.stacExplorer?.config?.stacEndpoints) {
                    for (const [configKey, endpoint] of Object.entries(window.stacExplorer.config.stacEndpoints)) {
                        if (endpoint.root === currentEndpoint) {
                            console.log('📍 Found matching catalog config key:', configKey);
                            
                            // Try to get the real STAC ID from cache or use legacy mapping
                            const legacyMapping = {
                                'copernicus': 'cdse-stac',
                                'element84': 'earth-search-aws', 
                                'planetary': 'microsoft-pc'
                            };
                            
                            const realId = legacyMapping[configKey] || configKey;
                            console.log('📍 Using catalog ID:', realId);
                            return realId;
                        }
                    }
                }
            }
            
            console.log('📍 No current catalog ID found');
            return null;
        } catch (error) {
            console.warn('📍 Error getting current catalog ID:', error);
            return null;
        }
    }
    
    /**
     * Get current catalog ID from the active API client (async version)
     */
    async getCurrentCatalogId() {
        try {
            // If we have an API client, try to determine which catalog it's using
            if (this.stateManager.apiClient && this.stateManager.apiClient.endpoints) {
                const currentEndpoint = this.stateManager.apiClient.endpoints.root;
                console.log('📍 Current API endpoint:', currentEndpoint);
                
                // Get available catalogs and find the matching one
                const availableCatalogs = await this.getAvailableCatalogs();
                const matchingCatalog = availableCatalogs.find(catalog => 
                    catalog.endpoint && catalog.endpoint.root === currentEndpoint
                );
                
                if (matchingCatalog) {
                    console.log('📍 Found matching catalog:', matchingCatalog.id);
                    return matchingCatalog.id;
                }
            }
            
            console.log('📍 No current catalog ID found');
            return null;
        } catch (error) {
            console.warn('📍 Error getting current catalog ID:', error);
            return null;
        }
    }
    
    /**
     * Get current mode
     */
    getCurrentMode() {
        return this.currentMode;
    }
    
    /**
     * Get shareable URL for current state
     */
    getShareableURL() {
        return window.location.href;
    }
}

export default UnifiedRouter;