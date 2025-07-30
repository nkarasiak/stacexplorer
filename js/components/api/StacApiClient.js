/**
 * STACApiClient.js - Client for interacting with STAC APIs
 */

import { offlineManager } from '../../utils/OfflineManager.js';
import { getCollectionName } from '../../utils/CollectionConfig.js';

export class STACApiClient {
    /**
     * Create a new STAC API client
     * @param {Object} endpoints - Object containing API endpoints (optional)
     */
    constructor(endpoints) {
        this.endpoints = {
            root: '',
            collections: '',
            search: ''
        };
        
        // Token cache to prevent rate limiting
        this.tokenCache = new Map();
        this.tokenCacheExpiry = new Map();
        this.TOKEN_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
        
        // Rate limiting state
        this.tokenRequestQueue = new Map(); // Pending requests per collection
        this.lastTokenRequest = new Map(); // Last request time per collection
        this.MIN_REQUEST_INTERVAL = 1000; // Minimum 1 second between requests
        
        if (endpoints) {
            this.setEndpoints(endpoints);
        }
    }
    
    /**
     * Fetch with retry logic for network resilience
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @param {number} retries - Number of retry attempts
     * @param {number} delay - Delay between retries (ms)
     */
    async fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                
                // Add timeout to prevent hanging requests
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
                
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                return response;
                
            } catch (error) {
                console.warn(`❌ Attempt ${attempt} failed:`, error.message);
                
                if (attempt === retries) {
                    // Last attempt failed
                    throw new Error(`All ${retries} attempts failed. Last error: ${error.message}`);
                }
                
                // Check if it's a network error that might benefit from retry
                const isNetworkError = 
                    error.name === 'TypeError' ||
                    error.message.includes('Failed to fetch') ||
                    error.message.includes('ERR_CONNECTION_RESET') ||
                    error.message.includes('ERR_NETWORK') ||
                    error.name === 'AbortError';
                
                if (!isNetworkError) {
                    // Non-retryable error
                    throw error;
                }
                
                // Wait before retry with exponential backoff
                const waitTime = delay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    /**
     * Set API endpoints
     * @param {Object} endpoints - Object containing API endpoints
     */
    setEndpoints(endpoints) {
        if (!endpoints) return;
        
        this.endpoints = {
            root: endpoints.root || '',
            collections: endpoints.collections || '',
            search: endpoints.search || ''
        };
    }
    
    /**
     * Get current API endpoints
     * @returns {Object} Current endpoints
     */
    getCurrentEndpoints() {
        return { ...this.endpoints };
    }
    
    /**
     * Get proxy URL for external requests to handle CORS
     * @param {string} url - Original URL
     * @returns {string} Proxied URL
     */
    getProxyUrl(url) {
        // Don't use proxy with simple HTTP server - try direct requests
        return url;
    }

    /**
     * Connect to a custom STAC catalog
     * @param {string} url - URL of the STAC catalog
     */
    async connectToCustomCatalog(url) {
        try {
            // Check if offline
            if (offlineManager.getOfflineStatus()) {
                throw new Error('Cannot connect to catalog - No internet connection');
            }
            // Normalize URL: remove trailing slash if present
            const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
            
            // Check if URL is valid by fetching the root catalog
            const proxyUrl = this.getProxyUrl(normalizedUrl);
            const response = await this.fetchWithRetry(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }
            
            const rootCatalog = await response.json();
            
            // Check if this is a valid STAC catalog
            if (!rootCatalog.links || !rootCatalog.stac_version) {
                throw new Error('Invalid STAC catalog: missing required fields');
            }
            
            // Check if this is a static catalog (URL ends with .json)
            if (normalizedUrl.endsWith('.json')) {
                console.log('📂 Static catalog detected (URL ends with .json)');
                
                // Store catalog data for special handling based on provider
                if (normalizedUrl.includes('planet.com')) {
                    this.planetLabsCatalogData = rootCatalog;
                } else if (normalizedUrl.includes('earthengine-stac.storage.googleapis.com')) {
                    this.geeCatalogData = rootCatalog;
                } else {
                    // Generic static catalog handling
                    this.staticCatalogData = rootCatalog;
                }
                
                // Set empty endpoints since static catalogs don't have API endpoints
                this.setEndpoints({
                    root: normalizedUrl,
                    collections: '', // Will be handled specially
                    search: '',
                    type: 'catalog'
                });
            } else {
                // Check if endpoints are already set with empty collections (catalog-type)
                // If so, don't override them
                if (this.endpoints.collections === '' && this.endpoints.search === '') {
                    console.log('📂 Catalog-type endpoint detected - preserving empty collections/search URLs');
                    // Just update the root, keep collections and search empty
                    this.setEndpoints({
                        root: normalizedUrl,
                        collections: '',
                        search: '',
                        type: 'catalog'
                    });
                } else {
                    // Find collections and search endpoints for regular STAC APIs
                    let collectionsUrl = `${normalizedUrl}/collections`;
                    let searchUrl = `${normalizedUrl}/search`;
                    
                    // Try to find links in the root catalog
                    const collectionsLink = rootCatalog.links.find(link => 
                        link.rel === 'data' || link.rel === 'collections');
                    const searchLink = rootCatalog.links.find(link => 
                        link.rel === 'search');
                    
                    if (collectionsLink && collectionsLink.href) {
                        collectionsUrl = new URL(collectionsLink.href, normalizedUrl).href;
                    }
                    
                    if (searchLink && searchLink.href) {
                        searchUrl = new URL(searchLink.href, normalizedUrl).href;
                    }
                    
                    // Set endpoints
                    this.setEndpoints({
                        root: normalizedUrl,
                        collections: collectionsUrl,
                        search: searchUrl
                    });
                }
            }
            
            return rootCatalog;
        } catch (error) {
            console.error('Error connecting to custom catalog:', error);
            throw new Error(`Failed to connect to STAC catalog: ${error.message}`);
        }
    }
    
    /**
     * Fetch collections from the STAC API with pagination support
     * @param {number} limit - Maximum number of collections to fetch (default: 1000)
     * @returns {Promise<Array>} - Promise resolving to an array of collections
     */
    async fetchCollections(limit = 1000) {
        try {
            // Check if offline
            if (offlineManager.getOfflineStatus()) {
                throw new Error('Cannot fetch collections - No internet connection');
            }
            // Handle Planet Labs catalog specially
            if (this.planetLabsCatalogData) {
                return await this.fetchPlanetLabsCollections();
            }
            
            // Handle Google Earth Engine catalog specially
            if (this.geeCatalogData) {
                return await this.fetchGEECollections();
            }
            
            // Handle generic static catalog
            if (this.staticCatalogData) {
                return await this.fetchStaticCatalogCollections();
            }
            
            if (!this.endpoints.collections) {
                return [];
            }
            
            // Add limit parameter to the URL
            const url = new URL(this.endpoints.collections);
            url.searchParams.append('limit', limit.toString());
            
            
            // Use proxy for external URLs
            const proxyUrl = this.getProxyUrl(url.toString());
            const response = await this.fetchWithRetry(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Check if the response has a collections property (STAC API spec)
            let collections = [];
            if (data.collections) {
                collections = data.collections;
            } else if (Array.isArray(data)) {
                // Some implementations return an array directly
                collections = data;
            } else {
                // If it's not an array or doesn't have collections, it's likely a single collection
                collections = [data];
            }
            
            return collections;
            
        } catch (error) {
            console.error('❌ Error fetching collections:', error);
            throw new Error(`Failed to fetch collections: ${error.message}`);
        }
    }
    
    /**
     * Fetch collections from Planet Labs catalog structure
     * @returns {Promise<Array>} - Promise resolving to an array of collections
     */
    async fetchPlanetLabsCollections() {
        try {
            
            const collections = [];
            
            // Find child links that point to collections or sub-catalogs
            const childLinks = this.planetLabsCatalogData.links.filter(link => 
                link.rel === 'child' || link.rel === 'catalog'
            );
            
            
            // Fetch each child to see if it's a collection or contains collections
            for (const link of childLinks) {
                try {
                    const childUrl = new URL(link.href, this.endpoints.root).href;
                    const response = await fetch(childUrl);
                    
                    if (response.ok) {
                        const childData = await response.json();
                        
                        // If it's a collection, add it directly
                        if (childData.type === 'Collection') {
                            collections.push({
                                ...childData,
                                sourceLabel: 'Planet Labs',
                                source: 'planet'
                            });
                        } else if (childData.type === 'Catalog') {
                            // Create a simplified collection entry for sub-catalogs
                            collections.push({
                                id: childData.id || link.title || 'unknown',
                                title: childData.title || link.title || childData.id,
                                description: childData.description || 'Planet Labs catalog',
                                type: 'Collection',
                                sourceLabel: 'Planet Labs',
                                source: 'planet',
                                stac_version: childData.stac_version,
                                links: childData.links
                            });
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to fetch child catalog: ${link.href}`, error);
                }
            }
            
            return collections;
            
        } catch (error) {
            console.error('❌ Error fetching Planet Labs collections:', error);
            throw new Error(`Failed to fetch Planet Labs collections: ${error.message}`);
        }
    }
    
    /**
     * Fetch collections from Google Earth Engine catalog structure
     * @returns {Promise<Array>} - Promise resolving to an array of collections
     */
    async fetchGEECollections() {
        try {
            const collections = [];
            
            // Find child links that point to collections or sub-catalogs
            const childLinks = this.geeCatalogData.links.filter(link => 
                link.rel === 'child' || link.rel === 'catalog'
            );
            
            // Fetch each child to see if it's a collection or contains collections
            for (const link of childLinks) {
                try {
                    const childUrl = new URL(link.href, this.endpoints.root).href;
                    const proxyUrl = this.getProxyUrl(childUrl);
                    const response = await this.fetchWithRetry(proxyUrl);
                    
                    if (response.ok) {
                        const childData = await response.json();
                        
                        // If it's a collection, add it directly
                        if (childData.type === 'Collection') {
                            collections.push({
                                ...childData,
                                sourceLabel: 'Google Earth Engine',
                                source: 'gee'
                            });
                        } else if (childData.type === 'Catalog') {
                            // Create a simplified collection entry for sub-catalogs
                            collections.push({
                                id: childData.id || link.title || 'unknown',
                                title: childData.title || link.title || childData.id,
                                description: childData.description || 'Google Earth Engine catalog',
                                type: 'Collection',
                                sourceLabel: 'Google Earth Engine',
                                source: 'gee',
                                stac_version: childData.stac_version,
                                links: childData.links
                            });
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to fetch GEE child catalog: ${link.href}`, error);
                }
            }
            
            return collections;
            
        } catch (error) {
            console.error('❌ Error fetching GEE collections:', error);
            throw new Error(`Failed to fetch GEE collections: ${error.message}`);
        }
    }
    
    /**
     * Fetch collections from generic static catalog structure
     * @returns {Promise<Array>} - Promise resolving to an array of collections
     */
    async fetchStaticCatalogCollections() {
        try {
            const collections = [];
            
            // Find child links that point to collections or sub-catalogs
            const childLinks = this.staticCatalogData.links.filter(link => 
                link.rel === 'child' || link.rel === 'catalog'
            );
            
            // Fetch each child to see if it's a collection or contains collections
            for (const link of childLinks) {
                try {
                    const childUrl = new URL(link.href, this.endpoints.root).href;
                    const proxyUrl = this.getProxyUrl(childUrl);
                    const response = await this.fetchWithRetry(proxyUrl);
                    
                    if (response.ok) {
                        const childData = await response.json();
                        
                        // If it's a collection, add it directly
                        if (childData.type === 'Collection') {
                            collections.push({
                                ...childData,
                                sourceLabel: 'Static Catalog',
                                source: 'static'
                            });
                        } else if (childData.type === 'Catalog') {
                            // Create a simplified collection entry for sub-catalogs
                            collections.push({
                                id: childData.id || link.title || 'unknown',
                                title: childData.title || link.title || childData.id,
                                description: childData.description || 'Static catalog',
                                type: 'Collection',
                                sourceLabel: 'Static Catalog',
                                source: 'static',
                                stac_version: childData.stac_version,
                                links: childData.links
                            });
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to fetch static catalog child: ${link.href}`, error);
                }
            }
            
            return collections;
            
        } catch (error) {
            console.error('❌ Error fetching static catalog collections:', error);
            throw new Error(`Failed to fetch static catalog collections: ${error.message}`);
        }
    }
    
    /**
     * Fetch a specific collection
     * @param {string} collectionId - ID of the collection to fetch
     * @returns {Promise<Object>} - Promise resolving to the collection
     */
    async fetchCollection(collectionId) {
        try {
            if (!this.endpoints.collections) {
                return null;
            }
            
            const url = `${this.endpoints.collections}/${collectionId}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Error fetching collection ${collectionId}:`, error);
            throw new Error(`Failed to fetch collection: ${error.message}`);
        }
    }
    
    /**
     * Get current catalog display name
     * @returns {string} - Display name of current catalog
     */
    async getCurrentCatalogName() {
        const catalogSelect = document.getElementById('catalog-select');
        const selectedCatalog = catalogSelect?.value || '';
        
        if (selectedCatalog === 'custom') {
            return 'Custom STAC Catalog';
        }
        
        const catalogName = await getCollectionName(selectedCatalog);
        return catalogName || 'STAC Catalog';
    }

    /**
     * Check if Planet Labs catalog is currently selected
     * @returns {boolean} - True if Planet Labs catalog is currently active
     */
    isCurrentlyPlanetLabs() {
        // Check if the catalog selector indicates Planet Labs is selected
        const catalogSelect = document.getElementById('catalog-select');
        const selectedCatalog = catalogSelect?.value || '';
        
        // Check if it's planetlabs or any Planet Labs-related catalog
        const isPlanetLabs = selectedCatalog === 'planetlabs' || 
                             // Also check if the current endpoints indicate Planet Labs
                             (this.endpoints.root && this.endpoints.root.includes('planet.com'));
        
        return isPlanetLabs;
    }
    
    /**
     * Get collections from the STAC catalog
     * @param {number} limit - Maximum number of collections to fetch (default: 1000)
     * @returns {Promise<Array>} - Promise resolving to an array of collections
     */
    async getCollections(limit = 1000) {
        return await this.fetchCollections(limit);
    }
    
    /**
     * Search for STAC items
     * @param {Object} params - Search parameters
     * @returns {Promise<Array>} - Promise resolving to an array of items
     */
    async searchItems(params = {}) {
        try {
            // Check if offline
            if (offlineManager.getOfflineStatus()) {
                throw new Error('Cannot search items - No internet connection');
            }
            // Handle Planet Labs catalog specially - but only if it's currently selected
            if (this.planetLabsCatalogData && this.isCurrentlyPlanetLabs()) {
                return await this.searchPlanetLabsItems(params);
            }
            
            if (!this.endpoints.search) {
                return [];
            }
            
            
            const response = await this.fetchWithRetry(this.endpoints.search, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
            }, 3);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Search request failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    responseText: errorText
                });
                throw new Error(`HTTP error ${response.status}: ${response.statusText}\n${errorText}`);
            }
            
            const data = await response.json();
            
            // Debug: Log some sample cloud cover values from returned items
            let features = [];
            if (data.features) {
                features = data.features;
            } else if (Array.isArray(data)) {
                features = data;
            }
            
            if (features.length > 0) {
                const sampleCloudCover = features.slice(0, 3).map(item => ({
                    id: item.id,
                    cloudCover: item.properties?.['eo:cloud_cover']
                }));
                
                // Check if we have cloud cover filter in the search params
                if (params['eo:cloud_cover']) {
                    const filterValue = params['eo:cloud_cover'].lte;
                    const exceedsFilter = features.filter(item => {
                        const cloudCover = item.properties?.['eo:cloud_cover'];
                        return cloudCover !== undefined && cloudCover > filterValue;
                    });
                    
                    if (exceedsFilter.length > 0) {
                        console.warn(`🚨 WARNING: Found ${exceedsFilter.length} items exceeding cloud cover filter (>${filterValue}%):`, 
                            exceedsFilter.slice(0, 3).map(item => ({
                                id: item.id,
                                cloudCover: item.properties?.['eo:cloud_cover']
                            }))
                        );
                    } else {
                    }
                }
            }
            
            // Check if the response has a features property (GeoJSON/STAC API spec)
            if (data.features) {
                return await this.presignPlanetaryComputerUrls(data.features);
            } else if (Array.isArray(data)) {
                // Some implementations might return an array directly
                return await this.presignPlanetaryComputerUrls(data);
            } else {
                // If it's not an array or doesn't have features, return empty array
                return [];
            }
        } catch (error) {
            console.error('Error searching items:', error);
            throw new Error(`Failed to search items: ${error.message}`);
        }
    }
    
    /**
     * Fetch a specific item
     * @param {string} collectionId - ID of the collection
     * @param {string} itemId - ID of the item to fetch
     * @returns {Promise<Object>} - Promise resolving to the item
     */
    async fetchItem(collectionId, itemId) {
        try {
            if (!this.endpoints.collections) {
                return null;
            }
            
            const url = `${this.endpoints.collections}/${collectionId}/items/${itemId}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }
            
            const item = await response.json();
            const presignedItems = await this.presignPlanetaryComputerUrls([item]);
            return presignedItems[0];
        } catch (error) {
            console.error(`Error fetching item ${itemId}:`, error);
            throw new Error(`Failed to fetch item: ${error.message}`);
        }
    }
    
    /**
     * Convert Planetary Computer URLs to presigned URLs for all assets in STAC items
     * @param {Array} items - Array of STAC items
     * @returns {Array} - Items with presigned URLs
     */
    async presignPlanetaryComputerUrls(items) {
        
        if (!Array.isArray(items)) {
            return items;
        }
        
        return Promise.all(items.map(async (item, itemIndex) => {
            
            if (!item.assets) {
                return item;
            }
            
            
            // Process each asset in the item
            await Promise.all(Object.keys(item.assets).map(async assetKey => {
                const asset = item.assets[assetKey];
                
                const needsPresigning = asset.href && (asset.href.includes('planetarycomputer') || this.needsPlanetaryComputerPresigning(asset.href));
                
                if (needsPresigning) {
                    // Convert to presigned URL
                    const originalUrl = asset.href;
                    if (asset.href.includes('planetarycomputer')) {
                        asset.href = asset.href.replace(
                            'https://planetarycomputer.microsoft.com/api/stac/v1',
                            'https://planetarycomputer.microsoft.com/api/data/v1'
                        );
                    } else {
                        // Handle direct blob storage URLs that need presigning
                        asset.href = await this.getPresignedUrl(asset.href);
                    }
                }
            }));
            
            return item;
        }));
    }
    
    /**
     * Check if a URL needs Planetary Computer presigning
     * @param {string} url - URL to check
     * @returns {boolean} - Whether the URL needs presigning
     */
    needsPlanetaryComputerPresigning(url) {
        // List of Azure blob storage domains used by Planetary Computer
        const pcBlobDomains = [
            'sentinel1euwestrtc.blob.core.windows.net',
            'sentinel2l2a01.blob.core.windows.net',
            'modiseuwest.blob.core.windows.net',
            'landsateuwest.blob.core.windows.net',
            'naipeuwest.blob.core.windows.net',
            'ecmwfeuwest.blob.core.windows.net',
            'copernicusdem.blob.core.windows.net',
            // Add other PC blob domains as needed
        ];
        
        const needsPresigning = pcBlobDomains.some(domain => url.includes(domain));
        return needsPresigning;
    }
    
    /**
     * Fetch a new token for a specific collection
     * @param {string} collection - Collection name
     * @returns {Promise<string>} - Token string
     */
    async fetchToken(collection) {
        const tokenEndpoint = `https://planetarycomputer.microsoft.com/api/sas/v1/token/${collection}`;
        
        console.log(`🔗 [PRESIGN-API] Fetching new token for collection: ${collection}`);
        
        try {
            const tokenResponse = await fetch(tokenEndpoint);
            
            if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                
                if (tokenData.token) {
                    // Cache the token
                    const now = Date.now();
                    this.tokenCache.set(collection, tokenData.token);
                    this.tokenCacheExpiry.set(collection, now + this.TOKEN_CACHE_DURATION);
                    console.log(`🔗 [PRESIGN-API] Cached token for collection: ${collection} (expires in ${this.TOKEN_CACHE_DURATION/1000/60} minutes)`);
                    
                    return tokenData.token;
                }
            } else {
                const errorText = await tokenResponse.text();
                console.warn(`🔗 [PRESIGN-API] Token request failed:`, {
                    status: tokenResponse.status,
                    statusText: tokenResponse.statusText,
                    responseText: errorText
                });
                
                // Handle 429 errors with exponential backoff
                if (tokenResponse.status === 429) {
                    const retryAfter = tokenResponse.headers.get('Retry-After') || '60';
                    const waitTime = parseInt(retryAfter) * 1000;
                    console.warn(`🔗 [PRESIGN-API] Rate limited. Waiting ${waitTime}ms before retry.`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    return this.fetchToken(collection); // Retry once
                }
                
                throw new Error(`Token request failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
            }
        } catch (error) {
            console.error(`🔗 [PRESIGN-API] Error fetching token for ${collection}:`, error);
            throw error;
        }
    }

    /**
     * Get a presigned URL for Planetary Computer blob storage
     * @param {string} url - Original blob storage URL
     * @returns {Promise<string>} - Presigned URL
     */
    async getPresignedUrl(url) {
        try {
            
            // Extract collection from URL to determine the correct SAS token endpoint
            const collection = this.extractCollectionFromUrl(url);
            if (!collection) {
                console.warn(`🔗 [PRESIGN-API] Could not extract collection from URL: ${url}`);
                return url;
            }
            
            // Check token cache first
            const now = Date.now();
            const cachedToken = this.tokenCache.get(collection);
            const cacheExpiry = this.tokenCacheExpiry.get(collection);
            
            if (cachedToken && cacheExpiry && now < cacheExpiry) {
                console.log(`🔗 [PRESIGN-API] Using cached token for collection: ${collection}`);
                return `${url}?${cachedToken}`;
            }
            
            // Check if there's already a pending request for this collection
            if (this.tokenRequestQueue.has(collection)) {
                console.log(`🔗 [PRESIGN-API] Waiting for existing token request for collection: ${collection}`);
                const token = await this.tokenRequestQueue.get(collection);
                return `${url}?${token}`;
            }
            
            // Rate limiting: ensure minimum interval between requests
            const lastRequest = this.lastTokenRequest.get(collection) || 0;
            const timeSinceLastRequest = now - lastRequest;
            if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
                const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
                console.log(`🔗 [PRESIGN-API] Rate limiting: waiting ${waitTime}ms before token request for ${collection}`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            
            // Create a promise for this token request and queue it
            const tokenPromise = this.fetchToken(collection);
            this.tokenRequestQueue.set(collection, tokenPromise);
            this.lastTokenRequest.set(collection, Date.now());
            
            try {
                const token = await tokenPromise;
                return `${url}?${token}`;
            } finally {
                // Clean up the queue
                this.tokenRequestQueue.delete(collection);
            }
            
        } catch (error) {
            console.warn('🔗 [PRESIGN-API] Error during presigning:', error);
        }
        
        // Fallback to original URL if presigning fails
        return url;
    }
    
    /**
     * Create a presigned version of a STAC item for multiband operations
     * @param {Object} stacItem - Original STAC item
     * @returns {Promise<Object>} - STAC item with presigned asset URLs
     */
    async createPresignedSTACItem(stacItem) {
        
        if (!stacItem || !stacItem.assets) {
            return stacItem;
        }

        // Deep clone the STAC item to avoid modifying the original
        const presignedItem = JSON.parse(JSON.stringify(stacItem));
        
        // Check if any assets need presigning
        let needsPresigning = false;
        for (const [assetKey, asset] of Object.entries(presignedItem.assets)) {
            if (asset.href && this.needsPlanetaryComputerPresigning(asset.href)) {
                needsPresigning = true;
                break;
            }
        }
        
        if (!needsPresigning) {
            return presignedItem;
        }
        
        
        // Presign each asset that needs it
        await Promise.all(Object.keys(presignedItem.assets).map(async assetKey => {
            const asset = presignedItem.assets[assetKey];
            
            if (asset.href && this.needsPlanetaryComputerPresigning(asset.href)) {
                const originalUrl = asset.href;
                
                if (asset.href.includes('planetarycomputer')) {
                    // Convert STAC API URLs to data API URLs
                    asset.href = asset.href.replace(
                        'https://planetarycomputer.microsoft.com/api/stac/v1',
                        'https://planetarycomputer.microsoft.com/api/data/v1'
                    );
                } else {
                    // Get presigned URL for direct blob storage URLs
                    asset.href = await this.getPresignedUrl(asset.href);
                }
                
            } else {
            }
        }));
        
        return presignedItem;
    }

    /**
     * Extract collection name from Planetary Computer blob storage URL
     * @param {string} url - Blob storage URL
     * @returns {string|null} - Collection name or null if not found
     */
    extractCollectionFromUrl(url) {
        try {
            // Map blob storage containers to their corresponding collection names
            const containerToCollection = {
                'sentinel1euwestrtc': 'sentinel-1-rtc',
                'sentinel2l2a01': 'sentinel-2-l2a', 
                'modiseuwest': 'modis',
                'landsateuwest': 'landsat-c2-l2',
                'naipeuwest': 'naip',
                'ecmwfeuwest': 'era5-pds',
                'copernicusdem': 'cop-dem-glo-30'
            };
            
            // Extract container name from URL
            for (const [container, collection] of Object.entries(containerToCollection)) {
                if (url.includes(`${container}.blob.core.windows.net`)) {
                    return collection;
                }
            }
            
            // Fallback: try to extract from URL path patterns
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            
            // Extract container name from hostname (e.g., sentinel1euwestrtc.blob.core.windows.net)
            const containerMatch = hostname.match(/^([^.]+)\.blob\.core\.windows\.net$/);
            if (containerMatch) {
                const container = containerMatch[1];
                return containerToCollection[container] || container;
            }
            
            return null;
        } catch (error) {
            console.warn('🔗 [PRESIGN-API] Error extracting collection from URL:', error);
            return null;
        }
    }
    
    /**
     * Search Planet Labs catalog items
     * @param {Object} params - Search parameters
     * @returns {Promise<Array>} - Promise resolving to an array of items
     */
    async searchPlanetLabsItems(params = {}) {
        try {
            
            const items = [];
            const selectedCollection = params.collections?.[0];
            
            if (selectedCollection) {
                // Find the specific collection/catalog
                const childLinks = this.planetLabsCatalogData.links.filter(link => 
                    link.rel === 'child' || link.rel === 'catalog'
                );
                
                for (const link of childLinks) {
                    try {
                        const childUrl = new URL(link.href, this.endpoints.root).href;
                        const response = await fetch(childUrl);
                        
                        if (response.ok) {
                            const childData = await response.json();
                            
                            // Check if this is the collection we're looking for
                            if (childData.id === selectedCollection || link.title?.includes(selectedCollection)) {
                                
                                // Get items from this collection/catalog
                                const collectionItems = await this.fetchItemsFromCatalog(childData, childUrl);
                                items.push(...collectionItems);
                                break;
                            }
                        }
                    } catch (error) {
                        console.warn(`Failed to search in catalog: ${link.href}`, error);
                    }
                }
            } else {
                // No specific collection - search all catalogs (limited results)
                const childLinks = this.planetLabsCatalogData.links.filter(link => 
                    link.rel === 'child' || link.rel === 'catalog'
                ).slice(0, 3); // Limit to first 3 catalogs to avoid too many requests
                
                for (const link of childLinks) {
                    try {
                        const childUrl = new URL(link.href, this.endpoints.root).href;
                        const response = await fetch(childUrl);
                        
                        if (response.ok) {
                            const childData = await response.json();
                            const collectionItems = await this.fetchItemsFromCatalog(childData, childUrl, 5); // Limit items per catalog
                            items.push(...collectionItems);
                        }
                    } catch (error) {
                        console.warn(`Failed to search in catalog: ${link.href}`, error);
                    }
                }
            }
            
            return items;
            
        } catch (error) {
            console.error('❌ Error searching Planet Labs items:', error);
            return [];
        }
    }
    
    /**
     * Fetch items from a Planet Labs catalog
     * @param {Object} catalogData - Catalog data
     * @param {string} catalogUrl - Catalog URL
     * @param {number} limit - Maximum items to fetch
     * @returns {Promise<Array>} - Promise resolving to an array of items
     */
    async fetchItemsFromCatalog(catalogData, catalogUrl, limit = 10) {
        const items = [];
        
        try {
            // Look for item links
            const itemLinks = catalogData.links?.filter(link => 
                link.rel === 'item'
            ).slice(0, limit) || [];
            
            
            for (const itemLink of itemLinks) {
                try {
                    const itemUrl = new URL(itemLink.href, catalogUrl).href;
                    const response = await fetch(itemUrl);
                    
                    if (response.ok) {
                        const itemData = await response.json();
                        
                        // Add source information
                        itemData.sourceLabel = 'Planet Labs';
                        itemData.source = 'planetlabs';
                        
                        items.push(itemData);
                    }
                } catch (error) {
                    console.warn(`Failed to fetch item: ${itemLink.href}`, error);
                }
            }
            
            // If no direct items, look for child catalogs
            if (items.length === 0) {
                const childLinks = catalogData.links?.filter(link => 
                    link.rel === 'child' || link.rel === 'catalog'
                ).slice(0, 2) || []; // Limit depth
                
                for (const childLink of childLinks) {
                    try {
                        const childUrl = new URL(childLink.href, catalogUrl).href;
                        const response = await fetch(childUrl);
                        
                        if (response.ok) {
                            const childData = await response.json();
                            const childItems = await this.fetchItemsFromCatalog(childData, childUrl, Math.max(1, Math.floor(limit / childLinks.length)));
                            items.push(...childItems);
                        }
                    } catch (error) {
                        console.warn(`Failed to fetch child catalog: ${childLink.href}`, error);
                    }
                }
            }
            
        } catch (error) {
            console.error('Error fetching items from catalog:', error);
        }
        
        return items;
    }
}