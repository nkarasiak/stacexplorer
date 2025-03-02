/**
 * Configuration settings for STAC Catalog Explorer
 */

export const CONFIG = {
    // STAC API Endpoints
    stacEndpoints: {
        local: {
            root: 'http://localhost:8080/stac',
            collections: 'http://localhost:8080/stac/collections',
            search: 'http://localhost:8080/stac/search'
        },
        copernicus: {
            root: 'https://stac.dataspace.copernicus.eu/v1',
            collections: 'https://stac.dataspace.copernicus.eu/v1/collections',
            search: 'https://stac.dataspace.copernicus.eu/v1/search'
        },
        custom: {
            root: '',
            collections: '',
            search: ''
        }
    },
    
    // Map settings
    mapSettings: {
        defaultCenter: [51.505, -0.09], // London
        defaultZoom: 5,
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
    
    // Default search parameters
    defaultSearchParams: {
        limit: 50 // Default number of items to return in a search
    },
    
    // Application settings
    appSettings: {
        defaultDateRange: 30, // Default date range in days
        itemsPerPage: 10 // Number of items per page in results
    }
};