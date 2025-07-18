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
     * Connect to a custom STAC catalog
     * @param {string} url - URL of the STAC catalog
     */
    async connectToCustomCatalog(url) {
        try {
            // Normalize URL: remove trailing slash if present
            const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
            
            // Check if URL is valid by fetching the root catalog
            const response = await fetch(normalizedUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }
            
            const rootCatalog = await response.json();
            
            // Check if this is a valid STAC catalog
            if (!rootCatalog.links || !rootCatalog.stac_version) {
                throw new Error('Invalid STAC catalog: missing required fields');
            }
            
            // Find collections and search endpoints
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
            if (!this.endpoints.collections) {
                return [];
            }
            
            // Add limit parameter to the URL
            const url = new URL(this.endpoints.collections);
            url.searchParams.append('limit', limit.toString());
            
            console.log(`📡 Fetching collections from: ${url.toString()}`);
            
            const response = await fetch(url.toString());
            
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
}