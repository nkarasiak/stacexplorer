/**
 * Collection Configuration Loader
 * Centralizes access to collections defined in collections.json
 * Maps between legacy internal IDs and real catalog IDs from STAC endpoints
 * 
 * Architecture:
 * - Single "endpoint" field (corresponds to old endpoints.root)
 * - Optional "type" field ("api" or "catalog", defaults to "api")
 * - Auto-generates /collections and /search URLs for API-type collections
 */

let collectionsCache = null;

// Legacy mapping from old internal IDs to real catalog IDs
const LEGACY_ID_MAPPING = {
    'copernicus': 'cdse-stac',
    'element84': 'earth-search-aws',
    'planetary': 'microsoft-pc',
    'planetlabs': 'planetlabs',
    'gee': 'gee'  // New collections can use their real catalog ID directly
};

// Reverse mapping from real catalog IDs to legacy IDs
const REVERSE_LEGACY_MAPPING = Object.fromEntries(
    Object.entries(LEGACY_ID_MAPPING).map(([legacy, real]) => [real, legacy])
);

/**
 * Load collections from collections.json
 * @returns {Promise<Array>} Array of collection configurations
 */
export async function loadCollections() {
    if (collectionsCache) {
        return collectionsCache;
    }

    try {
        const response = await fetch('/collections.json');
        if (!response.ok) {
            throw new Error(`Failed to load collections.json: ${response.status}`);
        }
        
        const data = await response.json();
        collectionsCache = data.collections || [];
        return collectionsCache;
    } catch (error) {
        console.error('Error loading collections.json:', error);
        // Return empty array as fallback
        return [];
    }
}

/**
 * Get collection configuration by ID (supports both legacy and real IDs)
 * @param {string} collectionId - The collection ID to find (legacy or real)
 * @returns {Promise<Object|null>} Collection configuration or null if not found
 */
export async function getCollectionById(collectionId) {
    const collections = await loadCollections();
    
    // First try direct match with real ID
    let collection = collections.find(c => c.id === collectionId);
    
    // If not found, try mapping legacy ID to real ID
    if (!collection && LEGACY_ID_MAPPING[collectionId]) {
        const realId = LEGACY_ID_MAPPING[collectionId];
        collection = collections.find(c => c.id === realId);
    }
    
    return collection || null;
}

/**
 * Get all enabled collections
 * @returns {Promise<Array>} Array of enabled collection configurations
 */
export async function getEnabledCollections() {
    const collections = await loadCollections();
    return collections.filter(collection => collection.enabled !== false);
}

/**
 * Get collection endpoints by ID (supports both legacy and real IDs)
 * @param {string} collectionId - The collection ID (legacy or real)
 * @returns {Promise<Object|null>} Collection endpoints or null if not found
 */
export async function getCollectionEndpoints(collectionId) {
    const collection = await getCollectionById(collectionId);
    if (!collection || !collection.endpoint) return null;
    
    const type = collection.type || 'api'; // default to 'api' if not specified
    const baseUrl = collection.endpoint.replace(/\/$/, ''); // remove trailing slash
    
    if (type === 'catalog') {
        // For catalog type, only root endpoint is used
        return {
            root: baseUrl,
            collections: '',
            search: '',
            type: 'catalog'
        };
    } else {
        // For API type, generate collections and search endpoints
        return {
            root: baseUrl,
            collections: `${baseUrl}/collections`,
            search: `${baseUrl}/search`,
            type: 'api'
        };
    }
}

/**
 * Get collection name by ID (supports both legacy and real IDs)
 * @param {string} collectionId - The collection ID (legacy or real)
 * @returns {Promise<string|null>} Collection name or null if not found
 */
export async function getCollectionName(collectionId) {
    const collection = await getCollectionById(collectionId);
    return collection ? collection.name : null;
}

/**
 * Get all collection IDs
 * @returns {Promise<Array<string>>} Array of collection IDs
 */
export async function getAllCollectionIds() {
    const collections = await loadCollections();
    return collections.map(collection => collection.id);
}

/**
 * Get enabled collection IDs
 * @returns {Promise<Array<string>>} Array of enabled collection IDs
 */
export async function getEnabledCollectionIds() {
    const collections = await getEnabledCollections();
    return collections.map(collection => collection.id);
}

/**
 * Convert legacy ID to real catalog ID
 * @param {string} legacyId - Legacy internal ID
 * @returns {string} Real catalog ID or original ID if no mapping exists
 */
export function mapLegacyToReal(legacyId) {
    return LEGACY_ID_MAPPING[legacyId] || legacyId;
}

/**
 * Convert real catalog ID to legacy ID
 * @param {string} realId - Real catalog ID
 * @returns {string} Legacy internal ID or original ID if no mapping exists
 */
export function mapRealToLegacy(realId) {
    return REVERSE_LEGACY_MAPPING[realId] || realId;
}

/**
 * Get all legacy IDs that the code still uses
 * @returns {Array<string>} Array of legacy collection IDs
 */
export function getLegacyIds() {
    return Object.keys(LEGACY_ID_MAPPING);
}

/**
 * Check if a collection is properly configured
 * @param {Object} collection - Collection configuration object
 * @returns {boolean} True if collection has required endpoint field
 */
export function isValidCollection(collection) {
    return collection && collection.endpoint && collection.id && collection.name;
}

/**
 * Get collection type (api or catalog)
 * @param {Object} collection - Collection configuration object
 * @returns {string} Collection type ('api' or 'catalog')
 */
export function getCollectionType(collection) {
    return collection && collection.type ? collection.type : 'api';
}

/**
 * Clear the collections cache (useful for testing or dynamic updates)
 */
export function clearCache() {
    collectionsCache = null;
}