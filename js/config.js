/**
 * Configuration settings for STAC Catalog Explorer
 */

export const CONFIG = {
    // STAC API Endpoints
    stacEndpoints: {
        copernicus: {
            root: 'https://stac.dataspace.copernicus.eu/v1',
            collections: 'https://stac.dataspace.copernicus.eu/v1/collections',
            search: 'https://stac.dataspace.copernicus.eu/v1/search'
        },
        element84: {
            root: 'https://earth-search.aws.element84.com/v1',
            collections: 'https://earth-search.aws.element84.com/v1/collections',
            search: 'https://earth-search.aws.element84.com/v1/search'
        },
        planetary: {
            root: 'https://planetarycomputer.microsoft.com/api/stac/v1',
            collections: 'https://planetarycomputer.microsoft.com/api/stac/v1/collections',
            search: 'https://planetarycomputer.microsoft.com/api/stac/v1/search'
        },
        planetlabs: {
            root: 'https://www.planet.com/data/stac/catalog.json',
            collections: '',
            search: '',
            type: 'catalog'
        },
        custom: {
            root: '',
            collections: '',
            search: ''
        }
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
        enabledProviders: ['copernicus', 'element84', 'planetary', 'planetlabs'] // Default enabled providers
    }
};
