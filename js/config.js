/**
 * Configuration settings for STAC Catalog Explorer
 */

import { loadCollections } from './utils/CollectionConfig.js';

export const CONFIG = {
    // Load STAC API Endpoints from collections.json
    async getStacEndpoints() {
        const collections = await loadCollections();
        const endpoints = {};
        
        collections.forEach(collection => {
            if (collection.endpoint) {
                const baseUrl = collection.endpoint.replace(/\/$/, ''); // remove trailing slash
                const type = collection.type || 'api'; // default to 'api' if not specified
                
                endpoints[collection.id] = {
                    root: baseUrl,
                    collections: type === 'catalog' ? '' : `${baseUrl}/collections`,
                    search: type === 'catalog' ? '' : `${baseUrl}/search`,
                    type: type
                };
            }
        });
        
        return endpoints;
    },
    
    // Map settings
    mapSettings: {
        defaultCenter: [52.5, 28.5], // Middle East / Central Asia region
        defaultZoom: 2.5,
        defaultBasemap: 'Dark',
        basemapOptions: {
            Dark: {
                url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            },
            Light: {
                url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            }
        }
    },
    
    // Performance settings
    performanceSettings: {
        useDeckGL: true, // Enable GPU acceleration with Deck.gl
        enableWebGL2: true, // Prefer WebGL2 when available
        maxLayers: 10, // Maximum number of concurrent layers
        cacheSize: 100 // Cache size for tiles and assets
    },
    
    // Default search parameters
    defaultSearchParams: {
        limit: 50 // Default number of items to return in a search
    },
    
    // Application settings
    appSettings: {
        defaultDateRange: 0, // Default date range in days (0 means no default)
        itemsPerPage: 10, // Number of items per page in results
        customCatalogUrl: '', // Custom STAC catalog/API URL
        async getEnabledProviders() {
            const collections = await loadCollections();
            return collections
                .filter(collection => collection.enabled !== false)
                .map(collection => collection.id);
        }
    }
};
