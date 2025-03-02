/**
 * STACApiClient.js - Client for interacting with STAC APIs
 */

export class STACApiClient {
    /**
     * Create a new STAC API client
     * @param {Object} endpoints - Object containing API endpoints
     */
    constructor(endpoints) {
        this.setEndpoints(endpoints);
    }
    
    /**
     * Set API endpoints
     * @param {Object} endpoints - Object containing API endpoints
     */
    setEndpoints(endpoints) {
        this.endpoints = {
            root: endpoints.root || '',
            collections: endpoints.collections || '',
            search: endpoints.search || ''
        };
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
     * Fetch collections from the STAC API
     * @returns {Promise<Array>} - Promise resolving to an array of collections
     */
    async fetchCollections() {
        try {
            if (!this.endpoints.collections) {
                throw new Error('Collections endpoint not defined');
            }
            
            const response = await fetch(this.endpoints.collections);
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Check if the response has a collections property (STAC API spec)
            if (data.collections) {
                return data.collections;
            } else if (Array.isArray(data)) {
                // Some implementations return an array directly
                return data;
            } else {
                // If it's not an array or doesn't have collections, it's likely a single collection
                return [data];
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
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
                throw new Error('Collections endpoint not defined');
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
                throw new Error('Search endpoint not defined');
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
                return data.features;
            } else if (Array.isArray(data)) {
                // Some implementations might return an array directly
                return data;
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
                throw new Error('Collections endpoint not defined');
            }
            
            const url = `${this.endpoints.collections}/${collectionId}/items/${itemId}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Error fetching item ${itemId}:`, error);
            throw new Error(`Failed to fetch item: ${error.message}`);
        }
    }
}