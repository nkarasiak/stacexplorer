/**
 * UnifiedRouter.js - Unified URL routing system for STAC Explorer
 * Handles both /viewer/ (search/visualization) and /browser/ (catalog browsing) modes
 * Replaces both PathRouter.js and URL handling in UnifiedStateManager.js
 */

export class UnifiedRouter {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.isProcessingRoute = false;
        this.currentMode = 'view'; // 'view' or 'browser'
        this.basePath = this.getBasePath();
        
        // Route patterns for both modes - dynamically created to handle base path
        this.routes = this.createRoutePatterns();
        
        this.initialize();
    }
    
    /**
     * Create route patterns with the correct base path
     */
    createRoutePatterns() {
        const base = this.basePath.replace(/\/$/, ''); // Remove trailing slash
        return {
            // Viewer mode routes (search/visualization) - order matters for pattern matching
            viewRoot: new RegExp(`^${base}/viewer/?$`),
            viewSearch: new RegExp(`^${base}/viewer/search/?$`),
            viewItem: new RegExp(`^${base}/viewer/item/([^/]+)/?$`),
            viewCollection: new RegExp(`^${base}/viewer/collection/([^/]+)/?$`),
            viewCatalogCollectionItem: new RegExp(`^${base}/viewer/([^/]+)/([^/]+)/([^/]+)/?$`),  // /viewer/{catalogId}/{collectionId}/{itemId}
            viewCatalogCollection: new RegExp(`^${base}/viewer/([^/]+)/([^/]+)/?$`),  // /viewer/{catalogId}/{collectionId} - must be last
            
            // Browser mode routes (catalog browsing) - simplified structure
            browserRoot: new RegExp(`^${base}/browser/?$`),
            browserCatalog: new RegExp(`^${base}/browser/([^/]+)/?$`),                    // /browser/{catalogId}
            browserCollection: new RegExp(`^${base}/browser/([^/]+)/([^/]+)/?$`),       // /browser/{catalogId}/{collectionId}
            browserItem: new RegExp(`^${base}/browser/([^/]+)/([^/]+)/([^/]+)/?$`),    // /browser/{catalogId}/{collectionId}/{itemId}
            
            // Legacy redirect patterns
            legacyCatalog: /^\/catalog(?:\/.*)?$/,
            legacyBrowserVerbose: /^\/browser\/catalog\/([^\/]+)(?:\/collection\/([^\/]+))?(?:\/item\/([^\/]+))?\/?$/
        };
    }

    /**
     * Get the base path for the application (e.g., '/stacexplorer/' on GitHub Pages)
     */
    getBasePath() {
        // Check if we're running on GitHub Pages
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        
        // Detect GitHub Pages by hostname pattern and path structure
        if (hostname.endsWith('.github.io') && pathname.startsWith('/stacexplorer/')) {
            return '/stacexplorer';
        }
        
        // For local development or other deployments
        return '';
    }
    
    /**
     * Create a path with the correct base path prefix
     */
    createPath(path) {
        return this.basePath + path;
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
        console.log('📍 Route match result:', route);
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
                    
                case 'viewCatalogCollectionItem':
                    await this.handleViewCatalogCollectionItemRoute(route.matches[0], route.matches[1], route.matches[2]);
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
                    console.log('📍 Browser item route matched:', route.matches);
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
        let assetKey = null;
        if (params.has('asset_key')) {
            assetKey = params.get('asset_key');
            this.stateManager.activeAssetKey = assetKey;
        }
        
        // Try to fetch and display the item
        try {
            // We need a collection ID to fetch the item, but we don't have it in this route
            // This route format may not be sufficient - user should use the catalog/collection/item format
            console.warn('📍 Item route without collection context - item fetching not possible');
        } catch (error) {
            console.error('📍 Error fetching item:', error);
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
    
    async handleViewCatalogCollectionItemRoute(catalogId, collectionId, itemId) {
        // Decode URL components in case there are encoded characters
        catalogId = decodeURIComponent(catalogId);
        collectionId = decodeURIComponent(collectionId);
        itemId = decodeURIComponent(itemId);
        
        console.log('📍 Handling view catalog+collection+item route:');
        console.log('  catalogId:', catalogId);
        console.log('  collectionId:', collectionId);
        console.log('  itemId:', itemId);
        console.log('  itemId length:', itemId.length);
        console.log('  original URL:', window.location.pathname);
        
        try {
            // First, get the catalog configuration by its real STAC ID
            const catalog = await this.getCatalogConfig(catalogId);
            if (!catalog) {
                console.warn('📍 Catalog not found for ID:', catalogId);
                // Fallback to regular item route
                await this.handleViewItemRoute(itemId);
                return;
            }
            
            console.log('📍 Found catalog for view mode:', catalog);
            
            // Set the API client to use this catalog
            if (this.stateManager.apiClient) {
                console.log('📍 Setting API client endpoints to:', catalog.endpoint);
                this.stateManager.apiClient.setEndpoints(catalog.endpoint);
            } else {
                console.error('📍 API client not available in state manager');
                // Try to get it from global scope as fallback
                const globalApiClient = window.stacExplorer?.apiClient;
                if (globalApiClient) {
                    console.log('📍 Using global API client as fallback');
                    this.stateManager.apiClient = globalApiClient;
                    this.stateManager.apiClient.setEndpoints(catalog.endpoint);
                } else {
                    console.error('📍 No API client available - cannot proceed');
                    return;
                }
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
            
            // Set the active item
            console.log('📍 Setting active item ID to:', itemId);
            this.stateManager.activeItemId = itemId;
            
            // Get asset key from URL parameters if provided
            const params = new URLSearchParams(window.location.search);
            let assetKey = null;
            if (params.has('asset_key')) {
                assetKey = params.get('asset_key');
                this.stateManager.activeAssetKey = assetKey;
            }
            
            // Initialize other state from query parameters first
            await this.stateManager.initFromUrl();
            
            // Wait for proper initialization before fetching item
            console.log('📍 Waiting for components to be ready...');
            await this.waitForInitialization();
            
            // Fetch and display the specific item on the map
            console.log('📍 Fetching and displaying item:', itemId, 'from collection:', collectionId);
            
            // Final check for API client before fetching
            if (!this.stateManager.apiClient) {
                console.error('📍 API client still not available after initialization - cannot fetch item');
                return;
            }
            
            try {
                const item = await this.stateManager.apiClient.fetchItem(collectionId, itemId);
                if (item) {
                    console.log('📍 Item fetched successfully:', item.id);
                    
                    if (this.stateManager.mapManager) {
                        console.log('📍 Displaying item on map:', item.id);
                        await this.stateManager.mapManager.displayItemOnMap(item, assetKey);
                        
                        // Dispatch event to notify other components
                        document.dispatchEvent(new CustomEvent('itemActivated', {
                            detail: { itemId: item.id, assetKey, item }
                        }));
                    } else {
                        console.error('📍 Map manager not available - cannot display item on map');
                    }
                } else {
                    console.error('📍 Failed to fetch item:', itemId);
                }
            } catch (error) {
                console.error('📍 Error fetching and displaying item:', error);
            }
            
        } catch (error) {
            console.error('📍 Error handling view catalog+collection+item route:', error);
            // Fallback to regular item route
            await this.handleViewItemRoute(itemId);
        }
    }
    
    // === BROWSER MODE ROUTE HANDLERS ===
    
    async handleBrowserRootRoute() {
        console.log('📍 Handling browser root route - catalog selection');
        
        // Ensure we're in browser mode and show the catalog browser
        if (this.currentMode !== 'browser') {
            this.currentMode = 'browser';
            
            // Show catalog browser directly
            if (this.stateManager.catalogBrowser) {
                this.stateManager.catalogBrowser.show(true); // Skip auto-load
            }
            
            // Update UI state without triggering events that cause reloads
            if (this.stateManager.viewModeToggle) {
                this.stateManager.viewModeToggle.setMode('catalog', true); // silent mode
            }
        }
        
        // Navigate to root (catalog selection)
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
        const debugLog = (msg) => {
            console.log(msg);
            // Store in localStorage for debugging
            const logs = JSON.parse(localStorage.getItem('itemRouteDebug') || '[]');
            logs.push(`${new Date().toISOString()}: ${msg}`);
            localStorage.setItem('itemRouteDebug', JSON.stringify(logs.slice(-20))); // Keep last 20 logs
        };
        
        debugLog('📍 Handling browser item route - showing item page: ' + catalogId + ' ' + collectionId + ' ' + itemId);
        
        // Switch to browser mode
        if (this.currentMode !== 'browser') {
            this.currentMode = 'browser';
        }
        
        // Check if ItemViewPage is available - wait for it if needed
        let itemViewPage = window.stacExplorer?.itemViewPage;
        console.log('📍 ItemViewPage available:', !!itemViewPage);
        console.log('📍 window.stacExplorer:', window.stacExplorer);
        
        if (!itemViewPage) {
            console.log('📍 ItemViewPage not available yet, waiting for initialization...');
            // Wait for the app to finish initializing
            await this.waitForAppInitialization();
            itemViewPage = window.stacExplorer?.itemViewPage;
            
            if (!itemViewPage) {
                console.warn('📍 ItemViewPage still not available after waiting');
                return;
            }
            console.log('📍 ItemViewPage now available after waiting');
        }
        
        // Hide catalog browser if it's visible
        const catalogBrowser = window.stacExplorer?.catalogBrowser;
        if (catalogBrowser && catalogBrowser.isVisible) {
            console.log('📍 Hiding catalog browser');
            catalogBrowser.hide();
        }
        
        try {
            debugLog('📍 Loading item for dedicated page view');
            
            // Get catalog configuration
            const catalog = await this.getCatalogConfig(catalogId);
            if (!catalog) {
                console.error('📍 Catalog configuration not found:', catalogId);
                return;
            }
            
            // Set up API client
            const apiClient = this.stateManager.apiClient || window.stacExplorer?.catalogBrowser?.apiClient;
            if (apiClient) {
                apiClient.setEndpoints(catalog.endpoint);
            } else {
                console.error('📍 No API client available');
                return;
            }
            
            // Load collections to get the collection object
            const collections = await apiClient.getCollections();
            const collection = collections.find(c => c.id === collectionId);
            
            if (!collection) {
                console.warn('📍 Collection not found:', collectionId);
                // Fallback to browser mode
                window.location.href = `/browser/${catalogId}/${collectionId}`;
                return;
            }
            
            // Load items from the collection using searchItems
            console.log('📍 Loading items from collection:', collectionId);
            const searchParams = {
                collections: [collectionId],
                limit: 50 // Get more items to increase chance of finding the specific item
            };
            console.log('📍 Search parameters:', searchParams);
            const items = await apiClient.searchItems(searchParams);
            debugLog('📍 Items response type: ' + typeof items);
            debugLog('📍 Items response keys: ' + (items ? Object.keys(items).join(', ') : 'null'));
            debugLog('📍 Items.features: ' + (items?.features ? items.features.length : 'undefined'));
            debugLog('📍 Looking for item ID: ' + itemId);
            
            // Handle different API response formats (same as CatalogBrowserPanel)
            let itemsArray = [];
            if (Array.isArray(items)) {
                // Direct array response (like Element84)
                itemsArray = items;
                debugLog('📍 Direct array response - Items count: ' + items.length);
            } else if (items?.features && Array.isArray(items.features)) {
                // GeoJSON FeatureCollection response
                itemsArray = items.features;
                debugLog('📍 FeatureCollection response - Items count: ' + items.features.length);
            } else {
                debugLog('📍 No items found for this collection');
            }
            
            const item = itemsArray.find(i => i.id === itemId);
            debugLog('📍 Found item: ' + !!item + ' ID: ' + (item?.id || 'none'));
            
            if (item) {
                console.log('📍 Found item, showing in ItemViewPage:', itemId);
                console.log('📍 Item data:', item);
                
                try {
                    // Show the item in the dedicated page
                    await itemViewPage.show(item, catalogId, collectionId);
                    console.log('📍 ItemViewPage.show() completed successfully');
                } catch (showError) {
                    console.error('📍 Error showing ItemViewPage:', showError);
                    // Don't redirect on show error, keep the page
                }
                
            } else {
                debugLog('📍 Item not found in collection. Available items: ' + itemsArray.map(i => i.id).slice(0, 10).join(', '));
                debugLog('📍 Would redirect to collection: ' + itemId);
                alert(`Item not found: ${itemId}\nAvailable items: ${itemsArray.map(i => i.id).slice(0, 5).join(', ')}\nTotal items: ${itemsArray.length}`);
                // Temporarily disable redirect to debug
                // window.location.href = `/browser/${catalogId}/${collectionId}`;
            }
            
        } catch (error) {
            console.error('📍 Error loading item:', error);
            console.error('📍 Error stack:', error.stack);
            alert(`Error loading item: ${error.message}\nCheck console for details`);
            // Show error on the item page instead of redirecting
            try {
                const errorItem = {
                    id: itemId,
                    collection: collectionId,
                    properties: {
                        title: `Error loading item: ${itemId}`,
                        datetime: new Date().toISOString()
                    },
                    assets: {},
                    links: [],
                    geometry: null
                };
                await itemViewPage.show(errorItem, catalogId, collectionId);
                itemViewPage.showError(`Failed to load item data: ${error.message}`);
            } catch (fallbackError) {
                console.error('📍 Fallback error display failed:', fallbackError);
                alert(`Fallback error: ${fallbackError.message}`);
                // Temporarily disable redirect to debug
                // window.location.href = `/browser/${catalogId}/${collectionId}`;
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
        let newPath = this.createPath('/viewer');
        const params = new URLSearchParams(window.location.search);
        
        // Determine specific viewer path
        if (stateChange.type === 'item' && stateChange.itemId) {
            newPath = this.createPath(`/viewer/item/${encodeURIComponent(stateChange.itemId)}`);
            if (stateChange.assetKey) {
                params.set('asset_key', stateChange.assetKey);
            }
        } else if (stateChange.type === 'collection' && stateChange.collection) {
            // Check if catalog ID is provided in the state change
            const catalogId = stateChange.catalogId || this.getCurrentCatalogIdSync();
            if (catalogId) {
                // Use new catalog+collection format: /viewer/{catalogId}/{collectionId}
                newPath = this.createPath(`/viewer/${encodeURIComponent(catalogId)}/${encodeURIComponent(stateChange.collection)}`);
                console.log('📍 Generated catalog+collection URL:', newPath);
            } else {
                // Fallback to legacy collection-only format
                newPath = this.createPath(`/viewer/collection/${encodeURIComponent(stateChange.collection)}`);
                console.log('📍 Generated legacy collection URL (no catalog):', newPath);
            }
        } else if (stateChange.search || stateChange.locationBbox || stateChange.dateStart) {
            newPath = this.createPath('/viewer/search');
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
        const newUrl = search ? `${this.createPath('/viewer')}${search}` : this.createPath('/viewer');
        
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
     * Wait for the application to be fully initialized
     */
    async waitForAppInitialization() {
        const maxWaitTime = 10000; // 10 seconds max wait
        const checkInterval = 100; // Check every 100ms
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            if (window.stacExplorer?.itemViewPage) {
                console.log('📍 App initialization complete');
                return;
            }
            
            // Wait a bit before checking again
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        console.warn('📍 Timeout waiting for app initialization');
    }
    
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
     * Wait for critical components to be initialized
     */
    async waitForInitialization() {
        const maxWait = 5000; // 5 seconds max wait
        const checkInterval = 100; // Check every 100ms
        let waited = 0;
        
        while (waited < maxWait) {
            // Check if essential components are available
            // Note: API client may be set up during route processing, so we mainly wait for mapManager
            if (this.stateManager && 
                this.stateManager.mapManager) {
                console.log('📍 Core components ready after', waited, 'ms');
                return;
            }
            
            // Wait a bit more
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
        }
        
        console.warn('📍 Core components not fully ready after', maxWait, 'ms - proceeding anyway');
    }

    /**
     * Get shareable URL for current state
     */
    getShareableURL() {
        return window.location.href;
    }
}

export default UnifiedRouter;