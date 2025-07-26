/**
 * Enhanced STAC API Client with modern JavaScript features
 * Includes retry logic, better error handling, and TypeScript-style JSDoc
 */

/**
 * @typedef {Object} STACEndpoints
 * @property {string} root - Root catalog URL
 * @property {string} collections - Collections endpoint URL
 * @property {string} search - Search endpoint URL
 */

/**
 * @typedef {Object} SearchParams
 * @property {Array<number>} [bbox] - Bounding box [west, south, east, north]
 * @property {string} [datetime] - Date/time range
 * @property {Array<string>} [collections] - Collection IDs to search
 * @property {number} [limit] - Maximum number of results
 * @property {Object} [query] - Additional query parameters
 */

export class STACApiClient {
    /**
     * Create a new STAC API client
     * @param {STACEndpoints} endpoints - Object containing API endpoints
     */
    constructor(endpoints) {
        this.setEndpoints(endpoints);
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.abortController = new AbortController();
    }
    
    /**
     * Set API endpoints
     * @param {STACEndpoints} endpoints - Object containing API endpoints
     */
    setEndpoints(endpoints) {
        this.endpoints = {
            root: endpoints.root || '',
            collections: endpoints.collections || '',
            search: endpoints.search || ''
        };
    }
    
    /**
     * Enhanced fetch with retry logic and timeout
     * @param {string} url - URL to fetch
     * @param {RequestInit} options - Fetch options
     * @param {number} attempt - Current attempt number
     * @returns {Promise<Response>}
     */
    async #fetchWithRetry(url, options = {}, attempt = 1) {
        const fetchOptions = {
            ...options,
            signal: this.abortController.signal,
            timeout: 10000 // 10 second timeout
        };
        
        try {
            const response = await fetch(url, fetchOptions);
            
            if (!response.ok) {
                // If it's a client error (4xx), don't retry
                if (response.status >= 400 && response.status < 500) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                // For server errors (5xx), retry if we have attempts left
                if (attempt < this.retryAttempts) {
                    console.warn(`Request failed (attempt ${attempt}), retrying...`);
                    await this.#delay(this.retryDelay * attempt);
                    return this.#fetchWithRetry(url, options, attempt + 1);
                }
                
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request was cancelled');
            }
            
            if (attempt < this.retryAttempts && !error.message.includes('HTTP 4')) {
                console.warn(`Request failed (attempt ${attempt}), retrying...`);
                await this.#delay(this.retryDelay * attempt);
                return this.#fetchWithRetry(url, options, attempt + 1);
            }
            
            throw error;
        }
    }
    
    /**
     * Utility function to create delays
     * @param {number} ms - Milliseconds to delay
     */
    #delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Cancel all pending requests
     */
    cancelRequests() {
        this.abortController.abort();
        this.abortController = new AbortController();
    }
    
    /**
     * Connect to a custom STAC catalog with enhanced validation
     * @param {string} url - URL of the STAC catalog
     * @returns {Promise<Object>} - Promise resolving to the root catalog
     */
    async connectToCustomCatalog(url) {
        try {
            const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
            
            const response = await this.#fetchWithRetry(normalizedUrl);
            const rootCatalog = await response.json();
            
            // Enhanced STAC validation
            const requiredFields = ['links', 'stac_version'];
            const missingFields = requiredFields.filter(field => !rootCatalog[field]);
            
            if (missingFields.length > 0) {
                throw new Error(`Invalid STAC catalog: missing required fields: ${missingFields.join(', ')}`);
            }
            
            // Validate STAC version
            const stacVersion = rootCatalog.stac_version;
            if (!stacVersion.match(/^1\.\d+\.\d+$/)) {
                console.warn(`Unsupported STAC version: ${stacVersion}. Some features may not work correctly.`);
            }
            
            // Auto-discover endpoints
            const endpoints = this.#discoverEndpoints(rootCatalog, normalizedUrl);
            this.setEndpoints(endpoints);
            
            return rootCatalog;
        } catch (error) {
            console.error('Error connecting to custom catalog:', error);
            throw new Error(`Failed to connect to STAC catalog: ${error.message}`);
        }
    }
    
    /**
     * Discover API endpoints from root catalog links
     * @param {Object} rootCatalog - Root catalog object
     * @param {string} baseUrl - Base URL of the catalog
     * @returns {STACEndpoints}
     */
    #discoverEndpoints(rootCatalog, baseUrl) {
        const endpoints = {
            root: baseUrl,
            collections: `${baseUrl}/collections`,
            search: `${baseUrl}/search`
        };
        
        // Look for explicit links
        rootCatalog.links?.forEach(link => {
            const href = new URL(link.href, baseUrl).href;
            
            switch (link.rel) {
                case 'data':
                case 'collections':
                    endpoints.collections = href;
                    break;
                case 'search':
                    endpoints.search = href;
                    break;
            }
        });
        
        return endpoints;
    }
    
    /**
     * Fetch collections with caching
     * @param {boolean} useCache - Whether to use cached results
     * @returns {Promise<Array>} - Promise resolving to an array of collections
     */
    async fetchCollections(useCache = true) {
        const cacheKey = 'stac_collections';
        
        if (useCache && this.#hasValidCache(cacheKey)) {
            return this.#getFromCache(cacheKey);
        }
        
        try {
            if (!this.endpoints.collections) {
                throw new Error('Collections endpoint not defined');
            }
            
            const response = await this.#fetchWithRetry(this.endpoints.collections);
            const data = await response.json();
            
            let collections = [];
            if (data.collections) {
                collections = data.collections;
            } else if (Array.isArray(data)) {
                collections = data;
            } else {
                collections = [data];
            }
            
            // Cache the results
            this.#setCache(cacheKey, collections);
            
            return collections;
        } catch (error) {
            console.error('Error fetching collections:', error);
            throw new Error(`Failed to fetch collections: ${error.message}`);
        }
    }
    
    /**
     * Search for STAC items with enhanced parameters validation
     * @param {SearchParams} params - Search parameters
     * @returns {Promise<Array>} - Promise resolving to an array of items
     */
    async searchItems(params = {}) {
        try {
            if (!this.endpoints.search) {
                throw new Error('Search endpoint not defined');
            }
            
            // Validate and sanitize parameters
            const sanitizedParams = this.#sanitizeSearchParams(params);
            
            
            const response = await this.#fetchWithRetry(this.endpoints.search, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/geo+json'
                },
                body: JSON.stringify(sanitizedParams)
            });
            
            const data = await response.json();
            
            if (data.features) {
                return data.features;
            } else if (Array.isArray(data)) {
                return data;
            } else {
                return [];
            }
        } catch (error) {
            console.error('Error searching items:', error);
            throw new Error(`Failed to search items: ${error.message}`);
        }
    }
    
    /**
     * Sanitize and validate search parameters
     * @param {SearchParams} params - Raw search parameters
     * @returns {SearchParams} - Sanitized parameters
     */
    #sanitizeSearchParams(params) {
        const sanitized = { ...params };
        
        // Validate bbox
        if (sanitized.bbox && Array.isArray(sanitized.bbox)) {
            if (sanitized.bbox.length !== 4) {
                throw new Error('Bounding box must have exactly 4 coordinates');
            }
            
            const [west, south, east, north] = sanitized.bbox;
            if (west >= east || south >= north) {
                throw new Error('Invalid bounding box coordinates');
            }
        }
        
        // Ensure limit is reasonable
        if (sanitized.limit && (sanitized.limit < 1 || sanitized.limit > 10000)) {
            sanitized.limit = Math.max(1, Math.min(10000, sanitized.limit));
        }
        
        return sanitized;
    }
    
    // Simple cache implementation
    #cache = new Map();
    #cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    #hasValidCache(key) {
        const cached = this.#cache.get(key);
        return cached && (Date.now() - cached.timestamp) < this.#cacheTimeout;
    }
    
    #getFromCache(key) {
        return this.#cache.get(key)?.data;
    }
    
    #setCache(key, data) {
        this.#cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    /**
     * Clear all cached data
     */
    clearCache() {
        this.#cache.clear();
    }
}
