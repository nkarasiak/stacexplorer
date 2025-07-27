/**
 * PathRouter.js - Clean URL path routing for STAC Explorer
 * Converts between clean paths (/catalog/collection/item/) and internal state
 */

export class PathRouter {
    constructor(unifiedStateManager) {
        this.stateManager = unifiedStateManager;
        this.isProcessingRoute = false;
        
        // Route patterns
        this.routes = {
            // /catalog (catalog selection view)
            catalogRoot: /^\/catalog\/?$/,
            // /catalog/{catalogId}
            catalog: /^\/catalog\/([^\/]+)\/?$/,
            // /catalog/{catalogId}/collection/{collectionId}
            collection: /^\/catalog\/([^\/]+)\/collection\/([^\/]+)\/?$/,
            // /catalog/{catalogId}/collection/{collectionId}/item/{itemId}
            item: /^\/catalog\/([^\/]+)\/collection\/([^\/]+)\/item\/([^\/]+)\/?$/
        };
        
        this.initialize();
    }
    
    initialize() {
        // Listen for state changes to update the path
        this.setupStateListeners();
        
        // Handle browser navigation
        window.addEventListener('popstate', (event) => {
            this.handlePopState(event);
        });
        
        // Process initial path
        this.processCurrentPath();
    }
    
    setupStateListeners() {
        // Listen for catalog browser state changes
        document.addEventListener('catalogBrowserStateChanged', (event) => {
            if (!this.isProcessingRoute) {
                this.updatePathFromState(event.detail);
            }
        });
        
        // Listen for view mode changes
        document.addEventListener('viewModeChanged', (event) => {
            if (!this.isProcessingRoute && event.detail.mode === 'browser') {
                this.updatePathFromState(event.detail);
            }
        });
    }
    
    /**
     * Process the current URL path
     */
    processCurrentPath() {
        const path = window.location.pathname;
        
        // Skip if we're on the home path
        if (path === '/' || path === '/index.html') {
            return;
        }
        
        console.log('📍 Processing path:', path);
        
        // Try to match against our route patterns
        const route = this.matchRoute(path);
        if (route) {
            this.handleRoute(route);
        }
    }
    
    /**
     * Match the current path against route patterns
     */
    matchRoute(path) {
        for (const [routeName, pattern] of Object.entries(this.routes)) {
            const match = path.match(pattern);
            if (match) {
                return {
                    name: routeName,
                    matches: match.slice(1), // Remove the full match
                    path: path
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
            console.log('📍 Handling route:', route.name, route.matches);
            
            // Ensure we're in browser mode
            if (this.stateManager.viewModeToggle) {
                this.stateManager.viewModeToggle.setMode('browser');
            }
            
            switch (route.name) {
                case 'catalogRoot':
                    await this.handleCatalogRootRoute();
                    break;
                    
                case 'catalog':
                    await this.handleCatalogRoute(route.matches[0]);
                    break;
                    
                case 'collection':
                    await this.handleCollectionRoute(route.matches[0], route.matches[1]);
                    break;
                    
                case 'item':
                    await this.handleItemRoute(route.matches[0], route.matches[1], route.matches[2]);
                    break;
            }
            
        } catch (error) {
            console.error('📍 Error handling route:', error);
        } finally {
            this.isProcessingRoute = false;
        }
    }
    
    /**
     * Handle catalog root route: /catalog
     */
    async handleCatalogRootRoute() {
        console.log('📍 Navigating to catalog selection view');
        
        if (this.stateManager.catalogBrowser) {
            // Show the catalog selection view
            this.stateManager.catalogBrowser.navigateToRoot();
        }
        
        // Update URL parameters for compatibility
        this.updateQueryParams({
            vm: 'browser'
        });
    }
    
    /**
     * Handle catalog route: /catalog/{catalogId}
     */
    async handleCatalogRoute(catalogId) {
        console.log('📍 Navigating to catalog:', catalogId);
        
        if (this.stateManager.catalogBrowser) {
            const catalog = this.getCatalogConfig(catalogId);
            if (catalog) {
                await this.stateManager.catalogBrowser.selectCatalog(catalog);
            }
        }
        
        // Update URL parameters for compatibility
        this.updateQueryParams({
            vm: 'browser',
            cid: catalogId
        });
    }
    
    /**
     * Handle collection route: /catalog/{catalogId}/collection/{collectionId}
     */
    async handleCollectionRoute(catalogId, collectionId) {
        console.log('📍 Navigating to collection:', catalogId, collectionId);
        
        // First navigate to catalog
        await this.handleCatalogRoute(catalogId);
        
        // Then navigate to collection
        if (this.stateManager.catalogBrowser) {
            // Wait for catalog to load
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            try {
                const collections = await this.stateManager.catalogBrowser.apiClient.getCollections();
                const collection = collections.find(c => c.id === collectionId);
                
                if (collection) {
                    await this.stateManager.catalogBrowser.browseCollection(collection);
                }
            } catch (error) {
                console.error('📍 Error loading collection:', error);
            }
        }
        
        // Update URL parameters for compatibility
        this.updateQueryParams({
            vm: 'browser',
            cid: catalogId,
            col: collectionId
        });
    }
    
    /**
     * Handle item route: /catalog/{catalogId}/collection/{collectionId}/item/{itemId}
     */
    async handleItemRoute(catalogId, collectionId, itemId) {
        console.log('📍 Navigating to item:', catalogId, collectionId, itemId);
        
        // First navigate to collection
        await this.handleCollectionRoute(catalogId, collectionId);
        
        // Then navigate to item
        if (this.stateManager.catalogBrowser) {
            // Wait for collection to load
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            try {
                const items = await this.stateManager.catalogBrowser.apiClient.getCollectionItems(collectionId);
                const item = items.features?.find(i => i.id === itemId);
                
                if (item) {
                    await this.stateManager.catalogBrowser.browseItem(item);
                }
            } catch (error) {
                console.error('📍 Error loading item:', error);
            }
        }
        
        // Update URL parameters for compatibility
        this.updateQueryParams({
            vm: 'browser',
            cid: catalogId,
            col: collectionId,
            itm: itemId
        });
    }
    
    /**
     * Update path from state changes
     */
    updatePathFromState(state) {
        if (this.isProcessingRoute) return;
        
        let newPath = '/';
        
        // Check if we're in browser mode but no specific catalog selected (catalog selection view)
        if (state.viewMode === 'browser' && !state.catalogId) {
            newPath = '/catalog';
        } else if (state.catalogId) {
            newPath = `/catalog/${encodeURIComponent(state.catalogId)}`;
            
            if (state.collectionId) {
                newPath += `/collection/${encodeURIComponent(state.collectionId)}`;
                
                if (state.itemId) {
                    newPath += `/item/${encodeURIComponent(state.itemId)}`;
                }
            }
        }
        
        // Only update if path has changed
        if (newPath !== window.location.pathname) {
            console.log('📍 Updating path to:', newPath);
            
            // Preserve query parameters for compatibility
            const search = window.location.search;
            const fullUrl = newPath + search;
            
            window.history.pushState({}, '', fullUrl);
        }
    }
    
    /**
     * Handle browser back/forward navigation
     */
    handlePopState(event) {
        console.log('📍 Handling popstate');
        this.processCurrentPath();
    }
    
    /**
     * Get catalog configuration by ID
     */
    getCatalogConfig(catalogId) {
        const catalogConfigs = {
            'copernicus': {
                id: 'copernicus',
                name: 'Copernicus Data Space',
                endpoint: {
                    root: 'https://stac.dataspace.copernicus.eu/v1',
                    collections: 'https://stac.dataspace.copernicus.eu/v1/collections',
                    search: 'https://stac.dataspace.copernicus.eu/v1/search'
                }
            },
            'element84': {
                id: 'element84',
                name: 'Element84 Earth Search',
                endpoint: {
                    root: 'https://earth-search.aws.element84.com/v1',
                    collections: 'https://earth-search.aws.element84.com/v1/collections',
                    search: 'https://earth-search.aws.element84.com/v1/search'
                }
            },
            'planetary': {
                id: 'planetary',
                name: 'Microsoft Planetary Computer',
                endpoint: {
                    root: 'https://planetarycomputer.microsoft.com/api/stac/v1',
                    collections: 'https://planetarycomputer.microsoft.com/api/stac/v1/collections',
                    search: 'https://planetarycomputer.microsoft.com/api/stac/v1/search'
                }
            }
        };
        
        return catalogConfigs[catalogId] || null;
    }
    
    /**
     * Update query parameters for backward compatibility
     */
    updateQueryParams(params) {
        const url = new URL(window.location);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value) {
                url.searchParams.set(key, value);
            } else {
                url.searchParams.delete(key);
            }
        });
        
        // Update URL without triggering navigation
        window.history.replaceState({}, '', url.toString());
    }
    
    /**
     * Generate a clean path for given state
     */
    generatePath(catalogId, collectionId = null, itemId = null) {
        let path = `/catalog/${encodeURIComponent(catalogId)}`;
        
        if (collectionId) {
            path += `/collection/${encodeURIComponent(collectionId)}`;
            
            if (itemId) {
                path += `/item/${encodeURIComponent(itemId)}`;
            }
        }
        
        return path;
    }
    
    /**
     * Navigate to a clean path
     */
    navigateTo(catalogId, collectionId = null, itemId = null) {
        const path = this.generatePath(catalogId, collectionId, itemId);
        window.history.pushState({}, '', path);
        this.processCurrentPath();
    }
}

export default PathRouter;