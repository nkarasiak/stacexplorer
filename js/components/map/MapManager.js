/**
 * MapManager - Complete implementation with automatic initialization
 * 
 * Handles map display, thumbnail overlays, and interactive drawing tools
 * Now includes automatic initialization on page load
 */

class MapManager {
    constructor(containerId, config) {
        this.map = null;
        this.config = config || {};
        this.containerId = containerId;
        this.thumbnailSources = new Map();
        this.thumbnailLayers = new Map();
        this.isInitialized = false;
        this.drawingMode = false;
        this.drawingType = null;
        this.drawingCallback = null;
        this.drawControl = null;
        this.currentDrawnFeature = null;
        this.initializationPromise = null;
        this.currentTheme = 'dark'; // Default theme
        
        // Don't auto-initialize here - let app.js control initialization
        // This prevents duplicate map instances
    }

    /**
     * Initialize the map manager
     */
    async initialize(mapContainer, mapStyle) {
        if (this.isInitialized) {
            return;
        }

        // If already initializing, return the same promise
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._doInitialize(mapContainer, mapStyle);
        return this.initializationPromise;
    }

    /**
     * Internal initialization method
     */
    async _doInitialize(mapContainer, mapStyle) {
        try {
            // Ensure mapContainer is a string or element
            let container = mapContainer || this.containerId;
            if (typeof container === 'string') {
                const element = document.getElementById(container);
                if (!element) {
                    throw new Error(`Map container element '${container}' not found`);
                }
                
                // Check if this element already has a map and clean it up
                if (element._maplibregl_map) {
                    console.warn('🧽 Cleaning up existing map instance on container:', container);
                    const existingMap = element._maplibregl_map;
                    existingMap.remove();
                    // Small delay to ensure cleanup completes
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                container = container;
            }

            console.log('🗺️ Initializing MapManager with container:', container);

            // Detect current theme
            this.currentTheme = document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light';
            
            // Get the appropriate map style based on theme
            const styleUrl = this.getMapStyle(this.currentTheme);

            // Initialize MapLibre GL map
            this.map = new maplibregl.Map({
                container: container,
                style: styleUrl,
                center: this.config.mapSettings?.defaultCenter || [0, 0],
                zoom: this.config.mapSettings?.defaultZoom || 2,
                attributionControl: false
            });

            // Add attribution control
            this.map.addControl(new maplibregl.AttributionControl(), 'bottom-right');

            // Add navigation controls
            this.map.addControl(new maplibregl.NavigationControl(), 'top-right');

            await new Promise((resolve, reject) => {
                this.map.on('load', resolve);
                this.map.on('error', reject);
                
                // Timeout after 10 seconds
                setTimeout(() => reject(new Error('Map load timeout')), 10000);
            });

            // Initialize drawing functionality
            this.initializeDrawing();
            
            // Set up theme observer
            this.setupThemeObserver();

            this.isInitialized = true;
            console.log('✅ MapManager initialized successfully');
            
            // Trigger custom event for other components
            window.dispatchEvent(new CustomEvent('mapManagerReady', { 
                detail: { mapManager: this } 
            }));
            
        } catch (error) {
            console.error('❌ Failed to initialize MapManager:', error);
            this.initializationPromise = null;
            throw error;
        }
    }

    /**
     * Get the map style URL based on theme
     */
    getMapStyle(theme) {
        // If using configuration with tile-based maps
        if (this.config.mapSettings?.basemapOptions) {
            // For tile-based maps, we need to create a MapLibre style object
            const basemapOption = theme === 'dark' 
                ? this.config.mapSettings.basemapOptions.Dark 
                : this.config.mapSettings.basemapOptions.Light;
            
            if (basemapOption) {
                return {
                    version: 8,
                    sources: {
                        'carto-tiles': {
                            type: 'raster',
                            tiles: [basemapOption.url.replace('{s}', 'a')],
                            tileSize: 256,
                            attribution: basemapOption.attribution
                        }
                    },
                    layers: [{
                        id: 'carto-tiles-layer',
                        type: 'raster',
                        source: 'carto-tiles',
                        minzoom: 0,
                        maxzoom: 22
                    }]
                };
            }
        }
        
        // Fallback to vector styles
        if (theme === 'dark') {
            return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
        } else {
            return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
        }
    }

    /**
     * Set up observer for theme changes
     */
    setupThemeObserver() {
        // Create a MutationObserver to watch for class changes on the document element
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const newTheme = document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light';
                    if (newTheme !== this.currentTheme) {
                        this.currentTheme = newTheme;
                        this.updateMapTheme(newTheme);
                    }
                }
            });
        });

        // Start observing
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

    /**
     * Update map theme
     */
    updateMapTheme(theme) {
        if (!this.map) return;
        
        console.log(`🎨 Updating map theme to: ${theme}`);
        const styleUrl = this.getMapStyle(theme);
        
        // Save current viewport
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        const bearing = this.map.getBearing();
        const pitch = this.map.getPitch();
        
        // Update style
        this.map.setStyle(styleUrl);
        
        // Restore viewport after style loads
        this.map.once('style.load', () => {
            this.map.setCenter(center);
            this.map.setZoom(zoom);
            this.map.setBearing(bearing);
            this.map.setPitch(pitch);
            
            // Re-initialize drawing layers
            this.initializeDrawing();
            
            // Re-add any existing thumbnails
            this.reapplyThumbnails();
        });
    }

    /**
     * Reapply thumbnails after style change
     */
    reapplyThumbnails() {
        // Store current thumbnails
        const thumbnails = new Map(this.thumbnailSources);
        
        // Clear references
        this.thumbnailSources.clear();
        this.thumbnailLayers.clear();
        
        // Re-add each thumbnail
        thumbnails.forEach((sourceId, itemId) => {
            // This is a simplified re-add, you might need to store more info
            console.log(`Re-adding thumbnail for item: ${itemId}`);
        });
    }

    /**
     * Auto-initialize with common container names
     */
    async autoInitialize() {
        const commonContainerIds = ['map', 'mapContainer', 'main-map', 'stac-map'];
        
        for (const containerId of commonContainerIds) {
            const element = document.getElementById(containerId);
            if (element) {
                console.log(`🎯 Found map container: ${containerId}`);
                try {
                    await this.initialize(containerId);
                    return true;
                } catch (error) {
                    console.warn(`⚠️ Failed to initialize with container ${containerId}:`, error);
                    continue;
                }
            }
        }
        
        console.error('❌ No suitable map container found. Tried:', commonContainerIds);
        return false;
    }

    /**
     * Initialize drawing controls and event handlers
     */
    initializeDrawing() {
        // Add sources for drawing
        this.map.addSource('drawing-source', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        // Add layer for drawing polygons
        this.map.addLayer({
            id: 'drawing-layer',
            type: 'fill',
            source: 'drawing-source',
            paint: {
                'fill-color': '#2196F3',
                'fill-opacity': 0.2
            },
            filter: ['==', '$type', 'Polygon']
        });

        // Add layer for drawing outlines
        this.map.addLayer({
            id: 'drawing-outline',
            type: 'line',
            source: 'drawing-source',
            paint: {
                'line-color': '#2196F3',
                'line-width': 2
            },
            filter: ['in', '$type', 'Polygon', 'LineString']
        });

        // Add layer for drawing points (first corner marker)
        this.map.addLayer({
            id: 'drawing-points',
            type: 'circle',
            source: 'drawing-source',
            paint: {
                'circle-radius': 6,
                'circle-color': '#2196F3',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FFFFFF'
            },
            filter: ['==', '$type', 'Point']
        });

        console.log('🎨 Drawing functionality initialized');
    }

    /**
     * Start drawing a bounding box
     */
    startDrawingBbox(callback) {
        if (!this.isMapReady()) {
            console.error('❌ Map not initialized');
            return;
        }

        this.drawingMode = true;
        this.drawingType = 'bbox';
        this.drawingCallback = callback;
        
        // Change cursor to crosshair
        this.map.getCanvas().style.cursor = 'crosshair';
        
        // Clear any existing drawing
        this.clearDrawing();
        
        console.log('🎯 Started drawing bbox mode');
        
        // Set up drawing event listeners
        this.setupDrawingListeners();
    }

    /**
     * Start drawing a polygon
     */
    startDrawingPolygon(callback) {
        if (!this.isMapReady()) {
            console.error('❌ Map not initialized');
            return;
        }

        this.drawingMode = true;
        this.drawingType = 'polygon';
        this.drawingCallback = callback;
        
        this.map.getCanvas().style.cursor = 'crosshair';
        this.clearDrawing();
        
        console.log('🎯 Started drawing polygon mode');
        this.setupDrawingListeners();
    }

    /**
     * Setup drawing event listeners
     */
    setupDrawingListeners() {
        if (this.drawingType === 'bbox') {
            this.setupBboxDrawing();
        } else if (this.drawingType === 'polygon') {
            this.setupPolygonDrawing();
        }
    }

    /**
     * Setup bbox drawing with two-click method
     */
    setupBboxDrawing() {
        let firstPoint = null;
        let isDrawing = false;

        const onClick = (e) => {
            if (!this.drawingMode) return;
            
            if (!isDrawing) {
                // First click - set the starting point
                firstPoint = [e.lngLat.lng, e.lngLat.lat];
                isDrawing = true;
                console.log('🎯 First corner set at:', firstPoint);
                
                // Add a marker at the first point for visual feedback
                const marker = {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: firstPoint
                    }
                };
                
                this.map.getSource('drawing-source').setData({
                    type: 'FeatureCollection',
                    features: [marker]
                });
                
            } else {
                // Second click - complete the rectangle
                const secondPoint = [e.lngLat.lng, e.lngLat.lat];
                const bbox = this.createBboxFromPoints(firstPoint, secondPoint);
                
                console.log('🎯 Second corner set at:', secondPoint);
                console.log('📦 Bounding box created:', bbox);
                
                this.finishDrawing(bbox);
                
                // Reset for next drawing
                firstPoint = null;
                isDrawing = false;
            }
        };

        const onMouseMove = (e) => {
            if (!isDrawing || !firstPoint) return;
            
            // Show preview of the rectangle as mouse moves
            const currentPoint = [e.lngLat.lng, e.lngLat.lat];
            this.updateBboxPreview(firstPoint, currentPoint);
        };

        const onRightClick = (e) => {
            // Cancel drawing on right click
            if (isDrawing) {
                e.preventDefault();
                console.log('❌ Drawing cancelled');
                isDrawing = false;
                firstPoint = null;
                this.clearDrawing();
            }
        };

        // Add event listeners
        this.map.on('click', onClick);
        this.map.on('mousemove', onMouseMove);
        this.map.on('contextmenu', onRightClick);

        // Store references for cleanup
        this._drawingListeners = { onClick, onMouseMove, onRightClick };
        
        // Show instructions to user
        if (window.stacExplorer?.notificationService) {
            window.stacExplorer.notificationService.showNotification(
                '📍 Click to set first corner, then click again to complete the rectangle. Right-click to cancel.',
                'info'
            );
        }
    }

    /**
     * Setup polygon drawing (simplified - single click points)
     */
    setupPolygonDrawing() {
        const points = [];

        const onClick = (e) => {
            if (!this.drawingMode) return;
            
            points.push([e.lngLat.lng, e.lngLat.lat]);
            
            if (points.length >= 3) {
                // Close the polygon
                points.push(points[0]);
                const polygon = {
                    type: 'Polygon',
                    coordinates: [points]
                };
                this.finishDrawing(polygon);
            } else {
                this.updatePolygonPreview(points);
            }
        };

        this.map.on('click', onClick);
        this._drawingListeners = { onClick };
    }

    /**
     * Update bbox preview during drawing
     */
    updateBboxPreview(startPoint, endPoint) {
        const bbox = this.createBboxFromPoints(startPoint, endPoint);
        const features = [];
        
        // Add the first point marker
        features.push({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: startPoint
            }
        });
        
        // Add the preview rectangle
        features.push({
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [bbox[0], bbox[1]], // sw
                    [bbox[2], bbox[1]], // se
                    [bbox[2], bbox[3]], // ne
                    [bbox[0], bbox[3]], // nw
                    [bbox[0], bbox[1]]  // close
                ]]
            }
        });

        this.map.getSource('drawing-source').setData({
            type: 'FeatureCollection',
            features: features
        });
    }

    /**
     * Update polygon preview during drawing
     */
    updatePolygonPreview(points) {
        if (points.length < 2) return;
        
        const feature = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: points
            }
        };

        this.map.getSource('drawing-source').setData({
            type: 'FeatureCollection',
            features: [feature]
        });
    }

    /**
     * Create bbox from two points
     */
    createBboxFromPoints(startPoint, endPoint) {
        const [x1, y1] = startPoint;
        const [x2, y2] = endPoint;
        
        return [
            Math.min(x1, x2), // west
            Math.min(y1, y2), // south
            Math.max(x1, x2), // east
            Math.max(y1, y2)  // north
        ];
    }

    /**
     * Finish drawing and call callback
     */
    finishDrawing(geometry) {
        this.stopDrawing();
        
        if (this.drawingCallback) {
            this.drawingCallback(geometry);
        }
        
        console.log('✅ Drawing completed:', geometry);
    }

    /**
     * Stop drawing mode
     */
    stopDrawing() {
        this.drawingMode = false;
        this.drawingType = null;
        
        if (this.map) {
            this.map.getCanvas().style.cursor = '';
        }
        
        // Remove event listeners
        if (this._drawingListeners) {
            const { onMouseDown, onMouseMove, onMouseUp, onClick, onRightClick } = this._drawingListeners;
            
            // Remove old drag-style listeners if they exist
            if (onMouseDown) this.map.off('mousedown', onMouseDown);
            if (onMouseUp) this.map.off('mouseup', onMouseUp);
            
            // Remove click-style listeners
            if (onClick) this.map.off('click', onClick);
            if (onRightClick) this.map.off('contextmenu', onRightClick);
            
            // Remove common listeners
            if (onMouseMove) this.map.off('mousemove', onMouseMove);
            
            this._drawingListeners = null;
        }
        
        if (this.map) {
            this.map.dragPan.enable();
        }
        
        console.log('🛑 Stopped drawing mode');
    }

    /**
     * Clear current drawing
     */
    clearDrawing() {
        if (this.map && this.map.getSource('drawing-source')) {
            this.map.getSource('drawing-source').setData({
                type: 'FeatureCollection',
                features: []
            });
        }
    }

    /**
     * Add thumbnail to map - simplified approach
     */
    addThumbnailToMap(item) {
        if (!this.isMapReady() || !item.thumbnail) {
            this.addBoundingBoxToMap(item);
            return;
        }

        const sourceId = `thumbnail-${item.id}`;
        const layerId = `thumbnail-layer-${item.id}`;

        try {
            // Remove existing thumbnail if present
            this.removeThumbnailFromMap(item.id);

            // Let MapLibre try to load the image directly
            this.map.addSource(sourceId, {
                type: 'image',
                url: item.thumbnail,
                coordinates: this.getBoundingBoxCoordinates(item.bbox)
            });

            this.map.addLayer({
                id: layerId,
                type: 'raster',
                source: sourceId,
                paint: {
                    'raster-opacity': 0.8
                }
            });

            // Store references
            this.thumbnailSources.set(item.id, sourceId);
            this.thumbnailLayers.set(item.id, layerId);

            console.log(`📸 Added thumbnail for item: ${item.id}`);
            
        } catch (error) {
            console.warn(`⚠️  Thumbnail failed for ${item.id}, showing bounding box:`, error);
            this.addBoundingBoxToMap(item);
        }
    }

    /**
     * Add bounding box when thumbnail is not available
     */
    addBoundingBoxToMap(item) {
        if (!this.isMapReady() || !item.bbox) {
            return;
        }

        const sourceId = `bbox-${item.id}`;
        const layerId = `bbox-layer-${item.id}`;

        try {
            this.removeThumbnailFromMap(item.id);

            const coordinates = this.getBoundingBoxCoordinates(item.bbox);
            
            this.map.addSource(sourceId, {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [coordinates]
                    }
                }
            });

            this.map.addLayer({
                id: layerId,
                type: 'line',
                source: sourceId,
                paint: {
                    'line-color': '#2196F3',
                    'line-width': 2,
                    'line-opacity': 0.8
                }
            });

            this.thumbnailSources.set(item.id, sourceId);
            this.thumbnailLayers.set(item.id, layerId);

            console.log(`📦 Added bounding box for item: ${item.id}`);
            
        } catch (error) {
            console.error(`❌ Failed to add bounding box for ${item.id}:`, error);
        }
    }

    /**
     * Remove thumbnail or bounding box from map
     */
    removeThumbnailFromMap(itemId) {
        if (!this.map) return;
        
        try {
            const layerId = this.thumbnailLayers.get(itemId);
            const sourceId = this.thumbnailSources.get(itemId);

            if (layerId && this.map.getLayer(layerId)) {
                this.map.removeLayer(layerId);
            }

            if (sourceId && this.map.getSource(sourceId)) {
                this.map.removeSource(sourceId);
            }

            this.thumbnailLayers.delete(itemId);
            this.thumbnailSources.delete(itemId);
            
        } catch (error) {
            console.warn(`⚠️  Error removing thumbnail for ${itemId}:`, error);
        }
    }

    /**
     * Clear all thumbnails from map
     */
    clearAllThumbnails() {
        const itemIds = Array.from(this.thumbnailLayers.keys());
        itemIds.forEach(itemId => this.removeThumbnailFromMap(itemId));
        console.log('🧹 Cleared all thumbnails from map');
    }

    /**
     * Convert bounding box to MapLibre coordinates
     */
    getBoundingBoxCoordinates(bbox) {
        if (!bbox || bbox.length !== 4) {
            return [[[-180, -85], [180, -85], [180, 85], [-180, 85]]];
        }

        const [west, south, east, north] = bbox;
        return [
            [west, north],  // top-left
            [east, north],  // top-right
            [east, south],  // bottom-right
            [west, south]   // bottom-left
        ];
    }

    /**
     * Fit map to bounding box
     */
    fitToBounds(bbox) {
        if (!this.isMapReady() || !bbox || bbox.length !== 4) {
            return;
        }

        try {
            const [west, south, east, north] = bbox;
            this.map.fitBounds([[west, south], [east, north]], { 
                padding: 50,
                maxZoom: 12
            });
        } catch (error) {
            console.error('❌ Failed to fit to bounds:', error);
        }
    }

    /**
     * Get map instance
     */
    getMap() {
        return this.map;
    }

    /**
     * Check if map is initialized and ready
     */
    isMapReady() {
        return this.isInitialized && this.map && this.map.loaded();
    }

    /**
     * Set map style
     */
    setStyle(styleUrl) {
        if (this.map) {
            this.map.setStyle(styleUrl);
        }
    }

    /**
     * Resize map (useful after container size changes)
     */
    resize() {
        if (this.map) {
            this.map.resize();
        }
    }

    /**
     * Destroy map manager and clean up resources
     */
    destroy() {
        if (this.map) {
            this.stopDrawing();
            this.clearAllThumbnails();
            this.map.remove();
            this.map = null;
        }
        
        this.thumbnailSources.clear();
        this.thumbnailLayers.clear();
        this.isInitialized = false;
        this.initializationPromise = null;
        
        console.log('🗑️  MapManager destroyed and cleaned up');
    }
}

// Create global instance
let globalMapManager = null;

/**
 * Get or create the global MapManager instance
 */
function getMapManager(containerId, config) {
    if (!globalMapManager) {
        globalMapManager = new MapManager(containerId, config);
    }
    return globalMapManager;
}

/**
 * Initialize MapManager automatically when DOM is ready
 */
function initializeMapManagerOnLoad() {
    // Check if map is already initialized via app.js
    if (globalMapManager && globalMapManager.isInitialized) {
        console.log('✓ MapManager already initialized via app.js');
        return;
    }
    
    console.log('🚀 Auto-initializing MapManager...');
    
    // Try to get config from global scope if available
    const config = window.CONFIG || null;
    
    const mapManager = getMapManager(null, config);
    
    // Only auto-initialize if not already initialized
    if (!mapManager.isInitialized) {
        // Try to auto-initialize
        mapManager.autoInitialize().then(success => {
            if (success) {
                console.log('✅ MapManager auto-initialized successfully');
            } else {
                console.warn('⚠️ MapManager auto-initialization failed - no suitable container found');
            }
        }).catch(error => {
            console.error('❌ MapManager auto-initialization error:', error);
        });
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMapManagerOnLoad);
} else {
    // DOM is already ready
    initializeMapManagerOnLoad();
}

// Also try when window loads (fallback)
window.addEventListener('load', () => {
    if (!globalMapManager || !globalMapManager.isMapReady()) {
        console.log('🔄 Retrying MapManager initialization on window load...');
        initializeMapManagerOnLoad();
    }
});

// Export for use in other modules
window.MapManager = MapManager;
window.getMapManager = getMapManager;

// Named export for ES6 modules
export { MapManager, getMapManager };

// Also provide default export for compatibility
export default MapManager;
