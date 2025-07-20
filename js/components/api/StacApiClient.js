/**
 * STACApiClient.js - Client for interacting with STAC APIs
 */

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
        
        if (endpoints) {
            this.setEndpoints(endpoints);
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
            // Normalize URL: remove trailing slash if present
            const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
            
            // Check if URL is valid by fetching the root catalog
            const proxyUrl = this.getProxyUrl(normalizedUrl);
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }
            
            const rootCatalog = await response.json();
            
            // Check if this is a valid STAC catalog
            if (!rootCatalog.links || !rootCatalog.stac_version) {
                throw new Error('Invalid STAC catalog: missing required fields');
            }
            
            // For Planet Labs catalog, store the root catalog data directly
            if (normalizedUrl.includes('planet.com')) {
                this.planetLabsCatalogData = rootCatalog;
                // Set empty endpoints since Planet doesn't have API endpoints
                this.setEndpoints({
                    root: normalizedUrl,
                    collections: '', // Will be handled specially
                    search: ''
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
            // Handle Planet Labs catalog specially
            if (this.planetLabsCatalogData) {
                return await this.fetchPlanetLabsCollections();
            }
            
            if (!this.endpoints.collections) {
                return [];
            }
            
            // Add limit parameter to the URL
            const url = new URL(this.endpoints.collections);
            url.searchParams.append('limit', limit.toString());
            
            console.log(`📡 Fetching collections from: ${url.toString()}`);
            
            // Use proxy for external URLs
            const proxyUrl = this.getProxyUrl(url.toString());
            const response = await fetch(proxyUrl);
            
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
            
            console.log(`📋 Fetched ${collections.length} collections from ${this.endpoints.collections}`);
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
            console.log('📡 Fetching Planet Labs collections from catalog structure...');
            
            const collections = [];
            
            // Find child links that point to collections or sub-catalogs
            const childLinks = this.planetLabsCatalogData.links.filter(link => 
                link.rel === 'child' || link.rel === 'catalog'
            );
            
            console.log(`Found ${childLinks.length} child catalogs/collections`);
            
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
            
            console.log(`📋 Fetched ${collections.length} Planet Labs collections`);
            return collections;
            
        } catch (error) {
            console.error('❌ Error fetching Planet Labs collections:', error);
            throw new Error(`Failed to fetch Planet Labs collections: ${error.message}`);
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
     * Search for STAC items
     * @param {Object} params - Search parameters
     * @returns {Promise<Array>} - Promise resolving to an array of items
     */
    async searchItems(params = {}) {
        try {
            // Handle Planet Labs catalog specially
            if (this.planetLabsCatalogData) {
                return await this.searchPlanetLabsItems(params);
            }
            
            if (!this.endpoints.search) {
                return [];
            }
            
            console.log('Making search request to:', this.endpoints.search);
            console.log('Request params:', JSON.stringify(params, null, 2));
            
            const response = await fetch(this.endpoints.search, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
            });
            
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
        console.log('🔍 [PRESIGN] Starting presigning process for', items.length, 'items');
        
        if (!Array.isArray(items)) {
            console.log('🔍 [PRESIGN] Input is not an array, returning as-is');
            return items;
        }
        
        return Promise.all(items.map(async (item, itemIndex) => {
            console.log(`🔍 [PRESIGN] Processing item ${itemIndex}:`, item.id);
            
            if (!item.assets) {
                console.log(`🔍 [PRESIGN] Item ${itemIndex} has no assets`);
                return item;
            }
            
            console.log(`🔍 [PRESIGN] Item ${itemIndex} has ${Object.keys(item.assets).length} assets:`, Object.keys(item.assets));
            
            // Process each asset in the item
            await Promise.all(Object.keys(item.assets).map(async assetKey => {
                const asset = item.assets[assetKey];
                console.log(`🔍 [PRESIGN] Checking asset ${assetKey}:`, asset.href);
                
                const needsPresigning = asset.href && (asset.href.includes('planetarycomputer') || this.needsPlanetaryComputerPresigning(asset.href));
                console.log(`🔍 [PRESIGN] Asset ${assetKey} needs presigning:`, needsPresigning);
                
                if (needsPresigning) {
                    // Convert to presigned URL
                    const originalUrl = asset.href;
                    if (asset.href.includes('planetarycomputer')) {
                        asset.href = asset.href.replace(
                            'https://planetarycomputer.microsoft.com/api/stac/v1',
                            'https://planetarycomputer.microsoft.com/api/data/v1'
                        );
                        console.log(`🔗 [PRESIGN] STAC API conversion for ${assetKey}:`, originalUrl, '→', asset.href);
                    } else {
                        // Handle direct blob storage URLs that need presigning
                        console.log(`🔗 [PRESIGN] Getting presigned URL for blob storage ${assetKey}:`, originalUrl);
                        asset.href = await this.getPresignedUrl(asset.href);
                        console.log(`🔗 [PRESIGN] Blob storage conversion for ${assetKey}:`, originalUrl, '→', asset.href);
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
        console.log(`🔍 [DOMAIN-CHECK] URL: ${url} | Needs presigning: ${needsPresigning}`);
        return needsPresigning;
    }
    
    /**
     * Get a presigned URL for Planetary Computer blob storage
     * @param {string} url - Original blob storage URL
     * @returns {Promise<string>} - Presigned URL
     */
    async getPresignedUrl(url) {
        try {
            console.log(`🔗 [PRESIGN-API] Attempting to presign: ${url}`);
            
            // Extract collection from URL to determine the correct SAS token endpoint
            const collection = this.extractCollectionFromUrl(url);
            if (!collection) {
                console.warn(`🔗 [PRESIGN-API] Could not extract collection from URL: ${url}`);
                return url;
            }
            
            console.log(`🔗 [PRESIGN-API] Extracted collection: ${collection}`);
            
            // Use the correct SAS token endpoint for the specific collection
            const tokenEndpoint = `https://planetarycomputer.microsoft.com/api/sas/v1/token/${collection}`;
            console.log(`🔗 [PRESIGN-API] Requesting SAS token from: ${tokenEndpoint}`);
            
            const tokenResponse = await fetch(tokenEndpoint);
            
            console.log(`🔗 [PRESIGN-API] Response status: ${tokenResponse.status}`);
            
            if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                console.log(`🔗 [PRESIGN-API] Got SAS token:`, tokenData);
                
                if (tokenData.token) {
                    const presignedUrl = `${url}?${tokenData.token}`;
                    console.log(`🔗 [PRESIGN-API] Created presigned URL:`, presignedUrl);
                    return presignedUrl;
                }
            } else {
                const errorText = await tokenResponse.text();
                console.warn(`🔗 [PRESIGN-API] Token request failed:`, {
                    status: tokenResponse.status,
                    statusText: tokenResponse.statusText,
                    responseText: errorText
                });
            }
            
        } catch (error) {
            console.warn('🔗 [PRESIGN-API] Error during presigning:', error);
        }
        
        // Fallback to original URL if presigning fails
        console.log(`🔗 [PRESIGN-API] Using fallback URL: ${url}`);
        return url;
    }
    
    /**
     * Create a presigned version of a STAC item for multiband operations
     * @param {Object} stacItem - Original STAC item
     * @returns {Promise<Object>} - STAC item with presigned asset URLs
     */
    async createPresignedSTACItem(stacItem) {
        console.log('🔗 [PRESIGN-STAC] Creating presigned STAC item for multiband operations');
        
        if (!stacItem || !stacItem.assets) {
            console.log('🔗 [PRESIGN-STAC] No assets to presign, returning original item');
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
            console.log('🔗 [PRESIGN-STAC] No assets need presigning, returning original item');
            return presignedItem;
        }
        
        console.log(`🔗 [PRESIGN-STAC] Presigning ${Object.keys(presignedItem.assets).length} assets`);
        
        // Presign each asset that needs it
        await Promise.all(Object.keys(presignedItem.assets).map(async assetKey => {
            const asset = presignedItem.assets[assetKey];
            
            if (asset.href && this.needsPlanetaryComputerPresigning(asset.href)) {
                console.log(`🔗 [PRESIGN-STAC] Presigning asset: ${assetKey}`);
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
                
                console.log(`🔗 [PRESIGN-STAC] Asset ${assetKey}: ${originalUrl.substring(0, 50)}... → ${asset.href.substring(0, 50)}...`);
            } else {
                console.log(`🔗 [PRESIGN-STAC] Asset ${assetKey} doesn't need presigning`);
            }
        }));
        
        console.log('🔗 [PRESIGN-STAC] Presigned STAC item created successfully');
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
            console.log('🪐 Searching Planet Labs catalog items...', params);
            
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
                                console.log(`📂 Found matching collection: ${childData.id || link.title}`);
                                
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
                console.log('🔍 Searching all Planet Labs catalogs...');
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
            
            console.log(`📋 Found ${items.length} Planet Labs items`);
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
            
            console.log(`📄 Found ${itemLinks.length} item links in catalog`);
            
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