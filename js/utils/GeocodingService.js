/**
 * GeocodingService.js - Service for location search and geocoding
 * 
 * Provides functionality to search for locations by name and get their
 * bounding boxes using the Nominatim (OpenStreetMap) API.
 * 
 * Features:
 * - Location name to coordinates/bbox conversion
 * - Debounced search to avoid API spam
 * - Support for various location types (cities, countries, addresses)
 * - Caching for improved performance
 * - Error handling and fallbacks
 */

/**
 * GeocodingService class for location search and geocoding
 */
export class GeocodingService {
    /**
     * Create a new GeocodingService
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'https://nominatim.openstreetmap.org';
        this.language = options.language || 'en';
        this.limit = options.limit || 10;
        this.debounceDelay = options.debounceDelay || 300;
        this.cache = new Map();
        this.maxCacheSize = options.maxCacheSize || 1000;
        this.searchTimeout = null;
        
        // User-Agent is required by Nominatim
        this.userAgent = options.userAgent || 'STAC-Explorer/1.0';
        
    }
    
    /**
     * Search for locations with debouncing
     * @param {string} query - Search query (e.g., "Paris", "France", "New York")
     * @param {Function} callback - Callback function to handle results
     * @param {Object} options - Additional search options
     */
    searchLocations(query, callback, options = {}) {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Set new timeout for debouncing
        this.searchTimeout = setTimeout(async () => {
            try {
                const results = await this.geocodeLocation(query, options);
                callback(results, null);
            } catch (error) {
                callback([], error);
            }
        }, this.debounceDelay);
    }
    
    /**
     * Geocode a location query and return structured results
     * @param {string} query - Location query
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Array of location results
     */
    async geocodeLocation(query, options = {}) {
        if (!query || query.trim().length < 2) {
            return [];
        }
        
        const normalizedQuery = query.trim().toLowerCase();
        
        // Check cache first
        const cacheKey = `${normalizedQuery}:${JSON.stringify(options)}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            const results = await this.fetchFromNominatim(query, options);
            const processedResults = this.processNominatimResults(results);
            
            // Cache the results
            this.cacheResult(cacheKey, processedResults);
            
            return processedResults;
        } catch (error) {
            throw error;
        }
    }
    
    /**
     * Fetch results from Nominatim API
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Raw Nominatim results
     */
    async fetchFromNominatim(query, options = {}) {
        const params = new URLSearchParams({
            q: query,
            format: 'json',
            addressdetails: '1',
            extratags: '1',
            namedetails: '1',
            limit: options.limit || this.limit,
            'accept-language': options.language || this.language,
            bounded: options.bounded || '0',
            dedupe: '1' // Remove duplicate results
        });
        
        // Add viewbox if provided (bias results to a specific area)
        if (options.viewbox) {
            params.append('viewbox', options.viewbox);
            params.append('bounded', '1');
        }
        
        // Add country codes if provided
        if (options.countrycodes) {
            params.append('countrycodes', options.countrycodes);
        }
        
        const url = `${this.baseUrl}/search?${params}`;
        
        console.log('🌍 Geocoding API request:', url);
        const response = await fetch(url, {
            headers: {
                'User-Agent': this.userAgent
            }
        });
        
        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Respect Nominatim's usage policy with a small delay
        await this.delay(100);
        
        return data;
    }
    
    /**
     * Process raw Nominatim results into structured format
     * @param {Array} results - Raw Nominatim results
     * @returns {Array} Processed location results
     */
    processNominatimResults(results) {
        if (!Array.isArray(results)) {
            return [];
        }
        
        return results.map(result => {
            const processed = {
                // Basic information
                displayName: result.display_name,
                name: result.name,
                type: result.type,
                class: result.class,
                importance: parseFloat(result.importance) || 0,
                
                // Coordinates
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                coordinates: [parseFloat(result.lon), parseFloat(result.lat)],
                
                // Bounding box [west, south, east, north]
                bbox: result.boundingbox ? [
                    parseFloat(result.boundingbox[2]), // west (min_lon)
                    parseFloat(result.boundingbox[0]), // south (min_lat)
                    parseFloat(result.boundingbox[3]), // east (max_lon)
                    parseFloat(result.boundingbox[1])  // north (max_lat)
                ] : null,
                
                // Address components
                address: result.address || {},
                
                // Additional metadata
                placeId: result.place_id,
                osmType: result.osm_type,
                osmId: result.osm_id,
                licence: result.licence,
                
                // Computed properties
                category: this.categorizeLocation(result),
                relevanceScore: this.calculateRelevanceScore(result)
            };
            
            // Add formatted display information
            processed.formattedName = this.formatLocationName(processed);
            processed.shortName = this.getShortName(processed);
            
            return processed;
        });
    }
    
    /**
     * Categorize a location based on its type and class
     * @param {Object} result - Nominatim result
     * @returns {string} Location category
     */
    categorizeLocation(result) {
        const type = result.type?.toLowerCase();
        const className = result.class?.toLowerCase();
        
        // Countries
        if (className === 'boundary' && type === 'administrative') {
            const adminLevel = result.address?.country_code ? 'country' : 'region';
            return adminLevel;
        }
        
        // Places
        if (className === 'place') {
            const placeTypes = {
                'city': 'city',
                'town': 'town',
                'village': 'village',
                'hamlet': 'hamlet',
                'suburb': 'suburb',
                'neighbourhood': 'neighborhood',
                'state': 'state',
                'county': 'county',
                'country': 'country'
            };
            return placeTypes[type] || 'place';
        }
        
        // Administrative boundaries
        if (className === 'boundary') {
            return 'administrative';
        }
        
        // Natural features
        if (className === 'natural') {
            return 'natural';
        }
        
        // Addresses
        if (className === 'building' || className === 'amenity') {
            return 'address';
        }
        
        return 'other';
    }
    
    /**
     * Calculate relevance score for sorting results
     * @param {Object} result - Nominatim result
     * @returns {number} Relevance score (higher is better)
     */
    calculateRelevanceScore(result) {
        let score = 0;
        
        // Base importance from Nominatim
        score += (parseFloat(result.importance) || 0) * 100;
        
        // Boost popular place types
        const category = this.categorizeLocation(result);
        const categoryBoosts = {
            'country': 50,
            'state': 40,
            'city': 30,
            'town': 20,
            'village': 10,
            'administrative': 25,
            'natural': 15
        };
        score += categoryBoosts[category] || 0;
        
        // Boost places with population data
        if (result.extratags?.population) {
            const population = parseInt(result.extratags.population);
            score += Math.log10(population + 1) * 5;
        }
        
        return score;
    }
    
    /**
     * Format location name for display
     * @param {Object} location - Processed location object
     * @returns {string} Formatted display name
     */
    formatLocationName(location) {
        const address = location.address;
        const parts = [];
        
        // Add the main name
        if (location.name) {
            parts.push(location.name);
        }
        
        // Add context based on category
        if (location.category === 'city' || location.category === 'town') {
            if (address.state && address.country) {
                parts.push(`${address.state}, ${address.country}`);
            } else if (address.country) {
                parts.push(address.country);
            }
        } else if (location.category === 'country') {
            // Just the country name
            return location.name || location.displayName;
        } else if (location.category === 'state') {
            if (address.country) {
                parts.push(address.country);
            }
        }
        
        return parts.join(', ') || location.displayName;
    }
    
    /**
     * Get short name for compact display
     * @param {Object} location - Processed location object
     * @returns {string} Short name
     */
    getShortName(location) {
        const address = location.address;
        
        if (location.category === 'country') {
            return location.name;
        } else if (location.category === 'city' || location.category === 'town') {
            return `${location.name}${address.country_code ? ` (${address.country_code.toUpperCase()})` : ''}`;
        } else {
            return location.name || location.type;
        }
    }
    
    /**
     * Cache search results
     * @param {string} key - Cache key
     * @param {Array} results - Results to cache
     */
    cacheResult(key, results) {
        // Clear old entries if cache is full
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, results);
    }
    
    /**
     * Get location details by coordinates
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<Object>} Location details
     */
    async reverseGeocode(lat, lon) {
        const params = new URLSearchParams({
            lat: lat.toString(),
            lon: lon.toString(),
            format: 'json',
            addressdetails: '1',
            zoom: '10'
        });
        
        const url = `${this.baseUrl}/reverse?${params}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.userAgent
                }
            });
            
            if (!response.ok) {
                throw new Error(`Reverse geocoding error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Respect usage policy
            await this.delay(100);
            
            return this.processNominatimResults([data])[0] || null;
        } catch (error) {
            throw error;
        }
    }
    
    /**
     * Get bounding box for a specific location ID
     * @param {string} placeId - Place ID from search results
     * @returns {Promise<Array>} Bounding box [west, south, east, north]
     */
    async getLocationBbox(placeId) {
        const params = new URLSearchParams({
            place_id: placeId,
            format: 'json',
            addressdetails: '1'
        });
        
        const url = `${this.baseUrl}/details?${params}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.userAgent
                }
            });
            
            if (!response.ok) {
                throw new Error(`Details API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.boundingbox) {
                return [
                    parseFloat(data.boundingbox[2]), // west
                    parseFloat(data.boundingbox[0]), // south
                    parseFloat(data.boundingbox[3]), // east
                    parseFloat(data.boundingbox[1])  // north
                ];
            }
            
            return null;
        } catch (error) {
            throw error;
        }
    }
    
    /**
     * Utility function to add delay (for respecting API rate limits)
     * @param {number} ms - Delay in milliseconds
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Clear the search cache
     */
    clearCache() {
        this.cache.clear();
    }
    
    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            keys: Array.from(this.cache.keys())
        };
    }
}

/**
 * Default geocoding service instance
 */
export const defaultGeocodingService = new GeocodingService({
    userAgent: 'STAC-Explorer/1.0 (OpenSource Geospatial Data Explorer)',
    limit: 8,
    debounceDelay: 300,
    maxCacheSize: 500
});

/**
 * Utility function to format bounding box for display
 * @param {Array} bbox - Bounding box [west, south, east, north]
 * @returns {string} Formatted bbox string
 */
export function formatBboxForDisplay(bbox) {
    if (!bbox || bbox.length !== 4) {
        return 'Invalid bbox';
    }
    
    const [west, south, east, north] = bbox.map(coord => parseFloat(coord).toFixed(4));
    return `${west}, ${south}, ${east}, ${north}`;
}

/**
 * Utility function to validate bounding box
 * @param {Array} bbox - Bounding box to validate
 * @returns {boolean} True if valid
 */
export function isValidBbox(bbox) {
    if (!Array.isArray(bbox) || bbox.length !== 4) {
        return false;
    }
    
    const [west, south, east, north] = bbox.map(parseFloat);
    
    return (
        !isNaN(west) && !isNaN(south) && !isNaN(east) && !isNaN(north) &&
        west >= -180 && west <= 180 &&
        east >= -180 && east <= 180 &&
        south >= -90 && south <= 90 &&
        north >= -90 && north <= 90 &&
        west < east &&
        south < north
    );
}
