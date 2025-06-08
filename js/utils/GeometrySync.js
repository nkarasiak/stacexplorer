/**
 * GeometrySync.js - Synchronize geometry between main interface and AI Smart Search
 * 
 * This utility provides seamless integration between the main location input
 * and the AI Smart Search location field, automatically parsing and syncing
 * WKT and GeoJSON geometries.
 */

import { isWKT, isGeoJSON, wktToGeoJSON, parseGeoJSON, geojsonToBbox } from './GeometryUtils.js';

/**
 * GeometrySync class for managing geometry synchronization
 */
export class GeometrySync {
    /**
     * Create a new GeometrySync instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.aiSmartSearch = null;
        this.mapManager = null;
        this.notificationService = null;
        
        // Callbacks for geometry updates
        this.onGeometryParsed = options.onGeometryParsed || null;
        this.onGeometryError = options.onGeometryError || null;
        
        // Current parsed geometry
        this.currentGeometry = null;
        this.currentBbox = null;
        
        console.log('🔄 GeometrySync initialized');
    }
    
    /**
     * Initialize the geometry sync system
     * @param {Object} dependencies - Required dependencies
     */
    initialize({ aiSmartSearch, mapManager, notificationService }) {
        this.aiSmartSearch = aiSmartSearch;
        this.mapManager = mapManager;
        this.notificationService = notificationService;
        
        this.setupEventListeners();
        console.log('✅ GeometrySync initialized with dependencies');
    }
    
    /**
     * Set up event listeners for geometry inputs
     */
    setupEventListeners() {
        // Main bbox input field
        const bboxInput = document.getElementById('bbox-input');
        if (bboxInput) {
            // Listen for paste events
            bboxInput.addEventListener('paste', (e) => {
                setTimeout(() => {
                    this.handleMainInputChange(bboxInput.value);
                }, 10); // Small delay to ensure paste content is available
            });
            
            // Listen for manual input changes
            bboxInput.addEventListener('input', (e) => {
                this.handleMainInputChange(e.target.value);
            });
            
            // Listen for blur events (when user finishes editing)
            bboxInput.addEventListener('blur', (e) => {
                this.handleMainInputChange(e.target.value);
            });
            
            console.log('📝 Main bbox input listeners set up');
        } else {
            console.warn('⚠️ Main bbox input not found');
        }
        
        // Listen for map drawing events
        document.addEventListener('bboxDrawn', (e) => {
            if (e.detail && e.detail.bbox) {
                this.handleBboxDrawn(e.detail.bbox);
            }
        });
        
        console.log('🗺️ Map drawing listeners set up');
    }
    
    /**
     * Handle changes in the main location input
     * @param {string} inputValue - The input value to process
     */
    handleMainInputChange(inputValue) {
        if (!inputValue || inputValue.trim().length < 10) {
            // Too short to be meaningful geometry
            return;
        }
        
        const trimmedValue = inputValue.trim();
        
        // Check if this looks like geometry data
        if (this.looksLikeGeometry(trimmedValue)) {
            console.log('📐 Detected potential geometry in main input:', trimmedValue.substring(0, 50) + '...');
            this.parseAndSyncGeometry(trimmedValue, 'main-input');
        } else if (this.looksLikeBbox(trimmedValue)) {
            // Handle simple bbox coordinates
            console.log('📦 Detected bbox coordinates in main input:', trimmedValue);
            this.handleBboxCoordinates(trimmedValue);
        }
    }
    
    /**
     * Check if input looks like geometry data
     * @param {string} text - Text to check
     * @returns {boolean} True if it looks like geometry
     */
    looksLikeGeometry(text) {
        // Check for common geometry indicators
        const geometryPatterns = [
            // WKT patterns
            /^\s*POLYGON\s*\(/i,
            /^\s*POINT\s*\(/i,
            /^\s*LINESTRING\s*\(/i,
            /^\s*MULTIPOLYGON\s*\(/i,
            /^\s*MULTIPOINT\s*\(/i,
            /^\s*MULTILINESTRING\s*\(/i,
            
            // GeoJSON Feature patterns
            /^\s*\{.*"type"\s*:\s*["']Feature["']/i,
            /^\s*\{.*"type"\s*:\s*["']FeatureCollection["']/i,
            
            // GeoJSON Geometry patterns (direct geometry objects)
            /^\s*\{.*"type"\s*:\s*["']Polygon["']/i,
            /^\s*\{.*"type"\s*:\s*["']Point["']/i,
            /^\s*\{.*"type"\s*:\s*["']LineString["']/i,
            /^\s*\{.*"type"\s*:\s*["']MultiPolygon["']/i,
            /^\s*\{.*"type"\s*:\s*["']MultiPoint["']/i,
            /^\s*\{.*"type"\s*:\s*["']MultiLineString["']/i,
            /^\s*\{.*"type"\s*:\s*["']GeometryCollection["']/i,
            
            // Generic coordinate patterns
            /^\s*\{.*"coordinates"\s*:/i
        ];
        
        return geometryPatterns.some(pattern => pattern.test(text));
    }
    
    /**
     * Check if input looks like bbox coordinates
     * @param {string} text - Text to check
     * @returns {boolean} True if it looks like bbox
     */
    looksLikeBbox(text) {
        // Check for comma-separated numbers (potential bbox)
        const bboxPattern = /^\s*-?\d+\.?\d*\s*,\s*-?\d+\.?\d*\s*,\s*-?\d+\.?\d*\s*,\s*-?\d+\.?\d*\s*$/;
        return bboxPattern.test(text);
    }
    
    /**
     * Handle simple bbox coordinates
     * @param {string} bboxText - Bbox coordinate string
     */
    handleBboxCoordinates(bboxText) {
        try {
            const coords = bboxText.split(',').map(coord => parseFloat(coord.trim()));
            
            if (coords.length === 4 && coords.every(coord => !isNaN(coord))) {
                const [west, south, east, north] = coords;
                
                // Validate bbox bounds
                if (west >= -180 && west <= 180 && east >= -180 && east <= 180 &&
                    south >= -90 && south <= 90 && north >= -90 && north <= 90 &&
                    west < east && south < north) {
                    
                    this.currentBbox = coords;
                    this.syncToAISearch('Coordinates', coords, 'coordinates');
                    
                    // Update map if available
                    if (this.mapManager && typeof this.mapManager.setBboxFromCoordinates === 'function') {
                        this.mapManager.setBboxFromCoordinates(coords);
                    }
                    
                    console.log('📦 Bbox coordinates parsed and synced:', coords);
                    
                    if (this.notificationService) {
                        this.notificationService.showNotification('✅ Coordinates applied to AI Search', 'success');
                    }
                } else {
                    throw new Error('Invalid bbox coordinates or bounds');
                }
            } else {
                throw new Error('Invalid coordinate format');
            }
        } catch (error) {
            console.warn('⚠️ Failed to parse bbox coordinates:', error);
        }
    }
    
    /**
     * Parse geometry and sync to AI Search
     * @param {string} geometryText - Geometry text to parse
     * @param {string} source - Source of the geometry
     */
    parseAndSyncGeometry(geometryText, source = 'unknown') {
        try {
            let geojson = null;
            let bbox = null;
            let geometryType = null;
            
            // Try to parse as GeoJSON first
            if (isGeoJSON(geometryText)) {
                geojson = parseGeoJSON(geometryText);
                geometryType = 'GeoJSON';
            } else if (isWKT(geometryText)) {
                // Try to parse as WKT
                geojson = wktToGeoJSON(geometryText);
                geometryType = 'WKT';
            } else {
                throw new Error('Unrecognized geometry format');
            }
            
            if (!geojson) {
                throw new Error('Failed to parse geometry');
            }
            
            // Extract bounding box
            bbox = geojsonToBbox(geojson);
            if (!bbox) {
                throw new Error('Could not extract bounding box from geometry');
            }
            
            // Store current geometry
            this.currentGeometry = geojson;
            this.currentBbox = bbox;
            
            // Sync to AI Search
            this.syncToAISearch(`Custom ${geometryType}`, bbox, 'geometry', geojson);
            
            // Display geometry on map
            if (this.mapManager && typeof this.mapManager.displayGeometry === 'function') {
                this.mapManager.displayGeometry(geojson, bbox);
            }
            
            console.log(`📐 ${geometryType} parsed and synced from ${source}:`, { geojson, bbox });
            
            // Show success notification
            if (this.notificationService) {
                this.notificationService.showNotification(`✅ ${geometryType} parsed and added to AI Search!`, 'success');
            }
            
            // Call callback if provided
            if (this.onGeometryParsed) {
                this.onGeometryParsed({ geojson, bbox, geometryType, source });
            }
            
        } catch (error) {
            console.error('❌ Error parsing geometry:', error);
            
            // Show error notification
            if (this.notificationService) {
                this.notificationService.showNotification(`❌ Invalid ${error.message.includes('WKT') ? 'WKT' : error.message.includes('GeoJSON') ? 'GeoJSON' : 'geometry'} format`, 'error');
            }
            
            // Call error callback if provided
            if (this.onGeometryError) {
                this.onGeometryError(error);
            }
        }
    }
    
    /**
     * Handle bbox drawn on map
     * @param {Array} bbox - Drawn bounding box
     */
    handleBboxDrawn(bbox) {
        if (Array.isArray(bbox) && bbox.length === 4) {
            this.currentBbox = bbox;
            this.syncToAISearch('Map Selection', bbox, 'drawn');
            
            console.log('🗺️ Map-drawn bbox synced to AI Search:', bbox);
            
            if (this.notificationService) {
                this.notificationService.showNotification('✅ Map selection added to AI Search', 'success');
            }
        }
    }
    
    /**
     * Sync geometry to AI Smart Search
     * @param {string} displayName - Display name for the location
     * @param {Array} bbox - Bounding box
     * @param {string} category - Category of location
     * @param {Object} geojson - Optional GeoJSON object
     */
    syncToAISearch(displayName, bbox, category, geojson = null) {
        if (!this.aiSmartSearch) {
            console.warn('⚠️ AI Smart Search not available for sync');
            return;
        }
        
        // Create location result object
        const locationResult = {
            formattedName: displayName,
            shortName: displayName,
            bbox: bbox,
            category: category,
            coordinates: bbox ? [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2] : null,
            source: 'main-interface'
        };
        
        if (geojson) {
            locationResult.geojson = geojson;
        }
        
        // Update AI Search location
        this.aiSmartSearch.selectedLocation = bbox;
        this.aiSmartSearch.selectedLocationResult = locationResult;
        
        // Update the visual display
        if (typeof this.aiSmartSearch.updateLocationFieldDisplay === 'function') {
            this.aiSmartSearch.updateLocationFieldDisplay(displayName, category);
        }
        
        console.log('🔄 Geometry synced to AI Search:', locationResult);
    }
    
    /**
     * Get current geometry information
     * @returns {Object} Current geometry and bbox
     */
    getCurrentGeometry() {
        return {
            geometry: this.currentGeometry,
            bbox: this.currentBbox
        };
    }
    
    /**
     * Clear current geometry
     */
    clearGeometry() {
        this.currentGeometry = null;
        this.currentBbox = null;
        
        if (this.aiSmartSearch) {
            this.aiSmartSearch.resetLocationSelection();
        }
        
        console.log('🧹 Geometry cleared');
    }
    
    /**
     * Format bbox for display
     * @param {Array} bbox - Bounding box [west, south, east, north]
     * @returns {string} Formatted bbox string
     */
    formatBbox(bbox) {
        if (!bbox || bbox.length !== 4) {
            return 'Invalid';
        }
        
        return bbox.map(coord => parseFloat(coord).toFixed(4)).join(', ');
    }
}

/**
 * Default geometry sync instance
 */
export const defaultGeometrySync = new GeometrySync({
    onGeometryParsed: (data) => {
        console.log('🎉 Geometry parsed successfully:', data);
    },
    onGeometryError: (error) => {
        console.error('💥 Geometry parsing failed:', error);
    }
});

/**
 * Initialize geometry sync with dependencies
 * @param {Object} dependencies - Required dependencies
 */
export function initializeGeometrySync(dependencies) {
    defaultGeometrySync.initialize(dependencies);
    return defaultGeometrySync;
}

/**
 * Utility function to test if text contains geometry
 * @param {string} text - Text to test
 * @returns {Object} Test results
 */
export function testGeometryContent(text) {
    if (!text || typeof text !== 'string') {
        return { isGeometry: false, type: null };
    }
    
    const trimmed = text.trim();
    
    if (isWKT(trimmed)) {
        return { isGeometry: true, type: 'WKT' };
    }
    
    if (isGeoJSON(trimmed)) {
        // Determine if it's a Feature, FeatureCollection, or Geometry object
        try {
            const json = JSON.parse(trimmed);
            if (json.type === 'Feature') {
                return { isGeometry: true, type: 'GeoJSON Feature' };
            } else if (json.type === 'FeatureCollection') {
                return { isGeometry: true, type: 'GeoJSON FeatureCollection' };
            } else if (['Point', 'LineString', 'Polygon', 'MultiPoint', 
                       'MultiLineString', 'MultiPolygon', 'GeometryCollection'].includes(json.type)) {
                return { isGeometry: true, type: `GeoJSON ${json.type}` };
            } else {
                return { isGeometry: true, type: 'GeoJSON' };
            }
        } catch (e) {
            return { isGeometry: true, type: 'GeoJSON' };
        }
    }
    
    // Check for bbox coordinates
    const bboxPattern = /^\s*-?\d+\.?\d*\s*,\s*-?\d+\.?\d*\s*,\s*-?\d+\.?\d*\s*,\s*-?\d+\.?\d*\s*$/;
    if (bboxPattern.test(trimmed)) {
        return { isGeometry: true, type: 'BBOX' };
    }
    
    return { isGeometry: false, type: null };
}
