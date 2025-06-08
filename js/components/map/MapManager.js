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
     * Display item on map (thumbnail or specific asset)
     * @param {Object} item - STAC item to display
     * @param {string} assetKey - Asset key to display (e.g., 'thumbnail')
     * @returns {Promise}
     */
    /**
     * Display an item on the map
     * @param {Object} item - STAC item to display
     * @param {string} preferredAssetKey - Preferred asset key to display
     */
    async displayItemOnMap(item, preferredAssetKey = null) {
        try {
            console.log('Displaying item on map:', item.id);
            
            // Remove any existing layers
            this.removeCurrentLayer();
            
            // Get bounding box
            const bbox = this.getBoundingBox(item);
            if (!bbox) {
                console.warn('Item has no valid bbox or geometry');
                return;
            }
            
            // Fit map to item bounds
            this.fitMapToBbox(bbox);
            
            // Show loading indicator
            const loadingIndicator = document.getElementById('loading');
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            
            // Try to find visual assets
            const visualAssets = this.findVisualAssets(item);
            
            // If we have a preferred asset key and it exists, use it
            if (preferredAssetKey && item.assets && item.assets[preferredAssetKey]) {
                await this.addAssetOverlay(item.assets[preferredAssetKey], item, preferredAssetKey);
                return;
            }
            
            // If we have visual assets, use the first one
            if (visualAssets.length > 0) {
                await this.addAssetOverlay(visualAssets[0].asset, item, visualAssets[0].key);
                return;
            }
            
            // For Planetary Computer items, check rendered_preview first
            if (item.assets && item.assets.rendered_preview && item.assets.rendered_preview.href.includes('planetarycomputer')) {
                await this.addAssetOverlay(item.assets.rendered_preview, item, 'rendered_preview');
                return;
            }
            
            // If we have a thumbnail, use it
            if (item.assets && item.assets.thumbnail) {
                await this.addAssetOverlay(item.assets.thumbnail, item, 'thumbnail');
                return;
            }
            
            // If we have a preview, use it
            if (item.assets && item.assets.preview) {
                await this.addAssetOverlay(item.assets.preview, item, 'preview');
                return;
            }
            
            // If we have an overview, use it
            if (item.assets && item.assets.overview) {
                await this.addAssetOverlay(item.assets.overview, item, 'overview');
                return;
            }
            
            // If we have a thumbnail in the results panel, use it
            if (this.useResultsThumbnail(item)) {
                return;
            }
            
            // If all else fails, just show the bounding box
            this.addGeoJsonLayerWithoutTooltip(bbox, item);
            
            // Hide loading indicator
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        } catch (error) {
            console.error('Error displaying item on map:', error);
            
            // Hide loading indicator
            const loadingIndicator = document.getElementById('loading');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }

/**
* Display item geometry/boundaries on map with beautiful gradient
* @param {Object} item - STAC item with geometry
* @returns {Promise}
*/
async displayItemGeometry(item) {
if (!this.isMapReady()) {
throw new Error('Map not initialized');
}

try {
// Clear any existing layers first
this.removeCurrentLayer();
            this.clearAllThumbnails();

// Get bounding box
let bbox = this.getBoundingBox(item);
if (!bbox) {
    console.warn('Item has no valid bbox or geometry');
                throw new Error('No geometry available for this item');
}

// Create beautiful geometry display
let geojson;
            if (item.geometry && item.geometry.type === 'Polygon') {
    // Use the actual geometry if available
    geojson = {
                    type: 'Feature',
        properties: {
            title: item.properties?.title || item.title || item.id,
        description: item.properties?.description || item.description || 'STAC Item Geometry'
        },
                    geometry: item.geometry
    };
} else {
        // Create polygon from bbox
    geojson = {
        type: 'Feature', 
            properties: {
                    title: item.properties?.title || item.title || item.id,
                        description: item.properties?.description || item.description || 'STAC Item Boundary'
                    },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            [bbox[0], bbox[3]], // northwest
                            [bbox[2], bbox[3]], // northeast
                            [bbox[2], bbox[1]], // southeast
                            [bbox[0], bbox[1]], // southwest
                            [bbox[0], bbox[3]]  // close polygon
                        ]]
                    }
                };
            }

            // Add beautiful gradient geometry layer
            this.addBeautifulGeometryLayer(geojson, `geometry-${item.id}`);

            // Fit map to bounds
            this.fitMapToBbox(bbox);

            console.log(`🎨 Displayed beautiful gradient geometry for item ${item.id} on map`);
            return Promise.resolve();
        } catch (error) {
            console.error(`Failed to display item geometry:`, error);
            throw error;
        }
    }

    /**
     * Calculate bounding box from geometry
     * @param {Object} geometry - GeoJSON geometry
     * @returns {Array} Bounding box [west, south, east, north]
     */
    calculateBboxFromGeometry(geometry) {
        if (!geometry || !geometry.coordinates) {
            return null;
        }

        let minLng = Infinity;
        let minLat = Infinity;
        let maxLng = -Infinity;
        let maxLat = -Infinity;

        const processCoordinates = (coords) => {
            if (Array.isArray(coords[0])) {
                coords.forEach(processCoordinates);
            } else {
                const [lng, lat] = coords;
                minLng = Math.min(minLng, lng);
                minLat = Math.min(minLat, lat);
                maxLng = Math.max(maxLng, lng);
                maxLat = Math.max(maxLat, lat);
            }
        };

        processCoordinates(geometry.coordinates);

        return [minLng, minLat, maxLng, maxLat];
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
    
        /**
     * Remove current layer from map
     */
    removeCurrentLayer() {
        try {
            // If we have a current layer, remove it
            if (this.currentLayer && this.currentLayer.sourceId) {
                // Get all layers that use this source
                const layers = this.map.getStyle().layers.filter(layer => 
                    layer.source === this.currentLayer.sourceId
                );
                
                // Remove each layer
                layers.forEach(layer => {
                    if (this.map.getLayer(layer.id)) {
                        this.map.removeLayer(layer.id);
                    }
                });
                
                // Remove the source
                if (this.map.getSource(this.currentLayer.sourceId)) {
                    this.map.removeSource(this.currentLayer.sourceId);
                }
                
                // Clear current layer
                this.currentLayer = null;
                this.currentLayerOverlay = null;
                this.currentAssetKey = null;
            }
        } catch (error) {
            console.error('Error removing current layer:', error);
        }
    }

    getBoundingBox(item) {
        // If item has bbox, use it
        if (item.bbox && item.bbox.length === 4) {
            return item.bbox;
        }
        
        // If item has geometry, calculate bbox
        if (item.geometry && item.geometry.type === 'Polygon') {
            // Extract bounds from polygon coordinates
            const coords = item.geometry.coordinates[0];
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            
            coords.forEach(coord => {
                minX = Math.min(minX, coord[0]);
                minY = Math.min(minY, coord[1]);
                maxX = Math.max(maxX, coord[0]);
                maxY = Math.max(maxY, coord[1]);
            });
            
            return [minX, minY, maxX, maxY];
        }
        
        return null;
    }
    
    /**
     * Fit map to bounding box
     * @param {Array} bbox - Bounding box [west, south, east, north]
     */
    fitMapToBbox(bbox) {
        if (bbox && bbox.length === 4) {
            this.map.fitBounds([
                [bbox[0], bbox[1]], // Southwest
                [bbox[2], bbox[3]]  // Northeast
            ], { padding: 50 });
        }
    }
    
    /**
     * Add asset overlay to map
     * @param {Object} asset - Asset object
     * @param {Object} item - STAC item
     * @param {string} assetKey - Asset key
     */
    async addAssetOverlay(asset, item, assetKey) {
        try {
            console.log(`Adding asset overlay for ${assetKey}:`, asset);
            
            // Store current asset key
            this.currentAssetKey = assetKey;
            
            // Check if asset has href
            if (!asset.href) {
                console.warn('Asset has no href');
                return false;
            }
            
            // Add visual overlay
            await this.addVisualOverlay(asset, item);
            
            // Hide loading indicator
            const loadingIndicator = document.getElementById('loading');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            return true;
        } catch (error) {
            console.error('Error adding asset overlay:', error);
            
            // Hide loading indicator
            const loadingIndicator = document.getElementById('loading');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            return false;
        }
    }
    
    /**
     * Add visual overlay to map
     * @param {Object} asset - Asset object
     * @param {Object} item - STAC item
     */
    async addVisualOverlay(asset, item) {
        try {
            console.log('Adding visual overlay for asset:', asset);
            
            // Get image URL
            const imageUrl = asset.href;
            
            // Get bounds
            let bbox = this.getBoundingBox(item);
            if (!bbox) {
                console.warn('Item has no valid bbox or geometry for overlay');
                return false;
            }
            
            // Add image to map
            await this.addImageOverlay(imageUrl, bbox, item);
            
            return true;
        } catch (error) {
            console.error('Error adding visual overlay:', error);
            return false;
        }
    }
    
        /**
     * Add GeoJSON layer without tooltip - with beautiful blue to purple gradient
     * @param {Array} bbox - Bounding box
     * @param {Object} item - STAC item
     */
    addGeoJsonLayerWithoutTooltip(bbox, item) {
        // Create beautiful gradient geometry display
        this.addBeautifulGeometryLayer({
            type: 'Feature',
            properties: {
                title: item.title || item.id || 'Unknown Item',
                description: item.description || ''
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [bbox[0], bbox[3]],
                    [bbox[2], bbox[3]],
                    [bbox[2], bbox[1]],
                    [bbox[0], bbox[1]],
                    [bbox[0], bbox[3]]
                ]]
            }
        });
    }
        /**
     * Try to get a proxy URL for CORS issues
     * @param {string} url - Original URL
     * @returns {string} - Proxy URL or original URL
     */
    getProxyUrl(url) {
        // Check if we're on the same origin
        if (url.startsWith(window.location.origin)) {
            return url; // No need for proxy
        }
        
        // Try to use a CORS proxy if available
        // Modify this based on your available proxies
        
        // Option 1: Use a built-in proxy (if your server has one)
        // return `/proxy?url=${encodeURIComponent(url)}`;
        
        // Option 2: Use a public CORS proxy (be careful with these)
        // return `https://cors-anywhere.herokuapp.com/${url}`;
        
        // Option 3: Use relative path if image is on the server
        if (url.startsWith('http') && url.includes('/') && !url.startsWith(window.location.origin)) {
            // Extract just the filename and try as relative
            const filename = url.substring(url.lastIndexOf('/') + 1);
            return `./images/${filename}`;
        }
        
        // No proxy available, return original
        return url;
    }
    
    /**
     * Add image with pre-validation
     * @param {string} url - Image URL
     * @param {Array} bbox - Bounding box
     * @param {Object} item - STAC item
     * @returns {Promise<boolean>} - Success status
     */
    async addImageWithValidation(url, bbox, item) {
        // Create a unique ID for this image source
        const sourceId = `image-overlay-validated-${Date.now()}`;
        
        try {
            // Pre-load and validate the image
            const imageData = await this.loadAndValidateImage(`https://corsproxy.io/?url=${url}`);
            console.log('Image validated successfully:', imageData);
            
            // If we have a data URL from validation, use it instead
            const finalUrl = imageData.dataUrl || url;
            
            // Calculate optimal coordinates based on image dimensions
            const coordinates = await this.calculateOptimalCoordinates(
                imageData, 
                bbox
            );
            
            // Add image source
            this.map.addSource(sourceId, {
                type: 'image',
                url: finalUrl,
                coordinates: coordinates
            });
            
            // Add image layer
            this.map.addLayer({
                id: `${sourceId}-layer`,
                type: 'raster',
                source: sourceId,
                paint: {
                    'raster-opacity': 1.0,
                    'raster-resampling': 'linear'
                }
            });
            
            // Store as current layer
            this.currentLayer = {
                sourceId,
                getBounds: () => {
                    return [
                        [bbox[0], bbox[1]], // Southwest
                        [bbox[2], bbox[3]]  // Northeast
                    ];
                }
            };
            
            // Store overlay for opacity control
            this.currentLayerOverlay = {
                setOpacity: (opacity) => {
                    this.map.setPaintProperty(`${sourceId}-layer`, 'raster-opacity', opacity);
                }
            };
            
            console.log('Validated image placement successful');
            return true;
        } catch (error) {
            console.error('Error with validated image placement:', error);
            this.addGeoJsonLayerWithoutTooltip(bbox, item);
            return false;
        }
    }
    
    /**
     * Load and validate image, optionally converting to data URL
     * @param {string} url - Image URL
     * @returns {Promise<Object>} - Image data with dimensions and optional dataUrl
     */
    async loadAndValidateImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                // For images that might have CORS issues, try to convert to data URL
                try {
                    // Create a canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Draw image to canvas
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    // Try to get data URL (will fail if tainted by CORS)
                    try {
                        const dataUrl = canvas.toDataURL('image/png');
                        resolve({
                            width: img.width,
                            height: img.height,
                            aspectRatio: img.width / img.height,
                            dataUrl: dataUrl
                        });
                    } catch (corsError) {
                        // If we can't get data URL due to CORS, just return dimensions
                        console.warn('Could not create data URL due to CORS, using original URL');
                        resolve({
                            width: img.width,
                            height: img.height, 
                            aspectRatio: img.width / img.height
                        });
                    }
                } catch (canvasError) {
                    console.warn('Error using canvas:', canvasError);
                    resolve({
                        width: img.width,
                        height: img.height,
                        aspectRatio: img.width / img.height
                    });
                }
            };
            
            img.onerror = () => {
                reject(new Error(`Failed to load image: ${url}`));
            };
            
            // Set crossOrigin to anonymous to avoid CORS issues if possible
            img.crossOrigin = "anonymous";
            img.src = url;
            
            // Set a timeout in case the image hangs
            setTimeout(() => {
                reject(new Error(`Timeout loading image: ${url}`));
            }, 10000); // 10 second timeout
        });
    }
    
    /**
     * Calculate optimal coordinates based on image dimensions
     * @param {Object} imageData - Image data with dimensions
     * @param {Array} bbox - Bounding box [west, south, east, north]
     * @returns {Array} - Array of coordinate pairs
     */
    async calculateOptimalCoordinates(imageData, bbox) {
        // If we don't have image dimensions, use the bbox directly
        if (!imageData || !imageData.width || !imageData.height) {
            return [
                [bbox[0], bbox[3]], // top-left (northwest)
                [bbox[2], bbox[3]], // top-right (northeast)
                [bbox[2], bbox[1]], // bottom-right (southeast)
                [bbox[0], bbox[1]]  // bottom-left (southwest)
            ];
        }
        
        // Calculate aspect ratios
        const imgAspectRatio = imageData.width / imageData.height;
        const bboxWidth = Math.abs(bbox[2] - bbox[0]);
        const bboxHeight = Math.abs(bbox[3] - bbox[1]);
        const bboxAspectRatio = bboxWidth / bboxHeight;
        
        // If aspects are very close, no need to adjust
        if (Math.abs(imgAspectRatio - bboxAspectRatio) < 0.1) {
            return [
                [bbox[0], bbox[3]], // top-left
                [bbox[2], bbox[3]], // top-right
                [bbox[2], bbox[1]], // bottom-right
                [bbox[0], bbox[1]]  // bottom-left
            ];
        }
        
        // Adjust coordinates to match image aspect ratio while centering in bbox
        let adjustedBbox;
        
        if (imgAspectRatio > bboxAspectRatio) {
            // Image is wider than bbox
            const adjustedHeight = bboxWidth / imgAspectRatio;
            const heightDiff = bboxHeight - adjustedHeight;
            const midY = (bbox[1] + bbox[3]) / 2;
            
            adjustedBbox = [
                bbox[0],
                midY - (adjustedHeight / 2),
                bbox[2],
                midY + (adjustedHeight / 2)
            ];
        } else {
            // Image is taller than bbox
            const adjustedWidth = bboxHeight * imgAspectRatio;
            const widthDiff = bboxWidth - adjustedWidth;
            const midX = (bbox[0] + bbox[2]) / 2;
            
            adjustedBbox = [
                midX - (adjustedWidth / 2),
                bbox[1],
                midX + (adjustedWidth / 2),
                bbox[3]
            ];
        }
        
        return [
            [adjustedBbox[0], adjustedBbox[3]], // top-left
            [adjustedBbox[2], adjustedBbox[3]], // top-right
            [adjustedBbox[2], adjustedBbox[1]], // bottom-right
            [adjustedBbox[0], adjustedBbox[1]]  // bottom-left
        ];
    }
        /**
     * Find assets with 'visual' roles in a STAC item
     * @param {Object} item - STAC item
     * @returns {Array} - Array of visual assets
     */
    findVisualAssets(item) {
        const visualAssets = [];
        
        if (item && item.assets) {
            // Check each asset
            for (const [key, asset] of Object.entries(item.assets)) {
                // Check if asset has visual role
                if (asset.roles && asset.roles.includes('visual')) {
                    visualAssets.push({ key, asset });
                }
            }
        }
        
        return visualAssets;
    }
    
    /**
     * Find result item by trying multiple strategies
     * @param {string} itemId - Item ID to find
     * @returns {Element|null} - Found element or null
     */
    findResultItemByMultipleStrategies(itemId) {
        console.log('Finding result item for ID:', itemId);
        
        // Strategy 1: Direct query with data-id
        let resultItem = document.querySelector(`.dataset-item[data-id="${itemId}"]`);
        if (resultItem) {
            console.log('Found item using data-id selector');
            return resultItem;
        }
        
        // Strategy 2: Look for item with matching ID attribute
        resultItem = document.querySelector(`[id="${itemId}"]`);
        if (resultItem) {
            console.log('Found item using id attribute selector');
            return resultItem;
        }
        
        // Strategy 3: Check all dataset items
        const allItems = document.querySelectorAll('.dataset-item');
        for (const element of allItems) {
            if (element.dataset.id === itemId || element.id === itemId) {
                console.log('Found item by iterating through dataset items');
                return element;
            }
        }
        
        // Strategy 4: Look for any elements that contain the ID in their text
        const elements = document.querySelectorAll('.results-container div, .item-container div');
        for (const element of elements) {
            if (element.textContent && element.textContent.includes(itemId)) {
                // Found an element that mentions the ID, check if it has or is near an image
                const nearbyImg = element.querySelector('img') || 
                                  element.parentElement.querySelector('img') ||
                                  element.closest('.dataset-item, .item');
                if (nearbyImg) {
                    console.log('Found item by text content and proximity to image');
                    return nearbyImg.closest('.dataset-item, .item') || element;
                }
            }
        }
        
        console.warn('Could not find item using any strategy');
        return null;
    }
    
        /**
     * Add image overlay to map
     * @param {string} imageUrl - Image URL
     * @param {Array} bbox - Bounding box [west, south, east, north]
     * @param {Object} item - STAC item
     */
    async addImageOverlay(imageUrl, bbox, item) {
        try {
            console.log('Adding image overlay:', imageUrl);
            
            // Remove existing overlay if any
            this.removeCurrentLayer();

            // 1. Ensure proper URL handling
            let absoluteUrl = this.ensureAbsoluteUrl(imageUrl);
            console.log('Absolute URL:', absoluteUrl);
            
            // Create a unique ID for this image source
            const sourceId = `image-overlay-${Date.now()}`;
            
            // 2. Try direct approach first - this is better for CORS issues
            // with MapLibre handling the image directly
            try {
                // Apply coordinates directly
                const coordinates = [
                    [bbox[0], bbox[3]], // top-left (northwest)
                    [bbox[2], bbox[3]], // top-right (northeast)
                    [bbox[2], bbox[1]], // bottom-right (southeast)
                    [bbox[0], bbox[1]]  // bottom-left (southwest)
                ];
                
                // Add source without pre-validation
                this.map.addSource(sourceId, {
                    type: 'image',
                    url: absoluteUrl,
                    coordinates: coordinates
                });
                
                // Add image layer
                this.map.addLayer({
                    id: `${sourceId}-layer`,
                    type: 'raster',
                    source: sourceId,
                    paint: {
                        'raster-opacity': 1.0,
                        'raster-resampling': 'linear'
                    }
                });
                
                // Store as current layer
                this.currentLayer = {
                    sourceId,
                    getBounds: () => {
                        return [
                            [bbox[0], bbox[1]], // Southwest
                            [bbox[2], bbox[3]]  // Northeast
                        ];
                    }
                };
                
                // Store overlay for opacity control
                this.currentLayerOverlay = {
                    setOpacity: (opacity) => {
                        this.map.setPaintProperty(`${sourceId}-layer`, 'raster-opacity', opacity);
                    }
                };
                
                console.log('Direct image placement successful');
                
                // Register error handler for post-adding errors
                this.map.once('error', (e) => {
                    if (e.sourceId === sourceId) {
                        console.error('Error with direct image overlay, trying alternative:', e);
                        this.handleImageError(sourceId, absoluteUrl, bbox, item);
                    }
                });
                
                return true;
            } catch (directError) {
                // If direct approach fails, try the more involved approach
                console.error('Direct image placement failed:', directError);
                return await this.addImageWithValidation(absoluteUrl, bbox, item);
            }
        } catch (error) {
            console.error('Error in addImageOverlay:', error);
            
            // Use GeoJSON fallback without tooltip
            this.addGeoJsonLayerWithoutTooltip(bbox, item);
            return false;
        }
    }
    
    /**
     * Handle image loading error
     * @param {string} sourceId - Source ID
     * @param {string} url - Image URL 
     * @param {Array} bbox - Bounding box
     * @param {Object} item - STAC item
     */
    async handleImageError(sourceId, url, bbox, item) {
        // Cleanup failed attempt
        try {
            if (this.map.getLayer(`${sourceId}-layer`)) {
                this.map.removeLayer(`${sourceId}-layer`);
            }
            if (this.map.getSource(sourceId)) {
                this.map.removeSource(sourceId);
            }
        } catch (removeError) {
            console.warn('Error cleaning up failed layer:', removeError);
        }
        
        // Try again with the validated approach
        try {
            await this.addImageWithValidation(url, bbox, item);
        } catch (validationError) {
            console.error('Validation approach also failed:', validationError);
            
            // Try with proxy if available
            const proxyUrl = this.getProxyUrl(url);
            if (proxyUrl !== url) {
                try {
                    await this.addImageWithValidation(proxyUrl, bbox, item);
                } catch (proxyError) {
                    console.error('Proxy approach also failed:', proxyError);
                    this.addGeoJsonLayerWithoutTooltip(bbox, item);
                }
            } else {
                this.addGeoJsonLayerWithoutTooltip(bbox, item);
            }
        }
    }

    /**
     * Use thumbnail from results panel
     * @param {Object} item - STAC item
     * @returns {boolean} - True if successful, false otherwise
     */
    useResultsThumbnail(item) {
        try {
            console.log('Trying to use results thumbnail for item:', item.id);
            
            // Find the item in the results panel using multiple strategies
            let resultItem = this.findResultItemByMultipleStrategies(item.id);
            
            if (!resultItem) {
                console.warn('Could not find item in results panel');
                return false;
            }
            
            // Find the thumbnail
            const thumbnail = resultItem.querySelector('.dataset-thumbnail, img');
            if (!thumbnail) {
                console.warn('No thumbnail element found in results panel');
                return false;
            }
            
            if (!thumbnail.src || thumbnail.src.includes('placeholder')) {
                console.warn('No valid thumbnail source found in results panel');
                return false;
            }
            
            // Ensure we have an absolute URL
            const absoluteUrl = this.ensureAbsoluteUrl(thumbnail.src);
            console.log('Found thumbnail in results panel:', absoluteUrl);
            
            // Get bounds
            let bbox = this.getBoundingBox(item);
            if (!bbox) {
                console.warn('Item has no valid bbox or geometry for overlay');
                return false;
            }
            
            // Add image to map
            this.addImageOverlay(absoluteUrl, bbox, item);
            
            return true;
        } catch (error) {
            console.error('Error using results thumbnail:', error);
            return false;
        }
    }


    async addThumbnailToMap(item, preferredAssetKey = null) {
        try {
            console.log('Displaying item on map:', item.id);
            
            // Remove any existing layers
            this.removeCurrentLayer();
            
            // Get bounding box
            const bbox = this.getBoundingBox(item);
            if (!bbox) {
                console.warn('Item has no valid bbox or geometry');
                return;
            }
            
            // Fit map to item bounds
            this.fitMapToBbox(bbox);
            
            // Show loading indicator
            const loadingIndicator = document.getElementById('loading');
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            
            // Try to find visual assets
            const visualAssets = this.findVisualAssets(item);
            
            // If we have a preferred asset key and it exists, use it
            if (preferredAssetKey && item.assets && item.assets[preferredAssetKey]) {
                await this.addAssetOverlay(item.assets[preferredAssetKey], item, preferredAssetKey);
                return;
            }
            
            // If we have visual assets, use the first one
            if (visualAssets.length > 0) {
                await this.addAssetOverlay(visualAssets[0].asset, item, visualAssets[0].key);
                return;
            }
            
            // For Planetary Computer items, check rendered_preview first
            if (item.assets && item.assets.rendered_preview && item.assets.rendered_preview.href.includes('planetarycomputer')) {
                await this.addAssetOverlay(item.assets.rendered_preview, item, 'rendered_preview');
                return;
            }
            
            // If we have a thumbnail, use it
            if (item.assets && item.assets.thumbnail) {
                await this.addAssetOverlay(item.assets.thumbnail, item, 'thumbnail');
                return;
            }
            
            // If we have a preview, use it
            if (item.assets && item.assets.preview) {
                await this.addAssetOverlay(item.assets.preview, item, 'preview');
                return;
            }
            
            // If we have an overview, use it
            if (item.assets && item.assets.overview) {
                await this.addAssetOverlay(item.assets.overview, item, 'overview');
                return;
            }
            
            // If we have a thumbnail in the results panel, use it
            if (this.useResultsThumbnail(item)) {
                return;
            }
            
            // If all else fails, just show the bounding box
            this.addGeoJsonLayerWithoutTooltip(bbox, item);
            
            // Hide loading indicator
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        } catch (error) {
            console.error('Error displaying item on map:', error);
            
            // Hide loading indicator
            const loadingIndicator = document.getElementById('loading');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }
    
    async imageToDataURL(url) {
        // Always use proxy to avoid CORS
        const proxyUrl = `${encodeURIComponent(url)}`;
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                try {
                    const dataUrl = canvas.toDataURL('image/png');
                    resolve(dataUrl);
                } catch (e) {
                    reject(e);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = proxyUrl;
        });
    }    
    /**
     * Try alternative methods to display an image if the primary method fails
     * @param {string} imageUrl - Image URL
     * @param {Array} bbox - Bounding box [west, south, east, north]
     * @param {Object} item - STAC item
     * @returns {boolean} - True if successful, false otherwise
     */
    tryAlternativeImageDisplay(imageUrl, bbox, item) {
        try {
            console.log('Trying alternative image display method');
            
            // Show GeoJSON without any tooltip
            this.addGeoJsonLayerWithoutTooltip(bbox, item);
            return true;
        } catch (error) {
            console.error('Error in alternative image display:', error);
            return false;
        }
    }
    
    /**
     * Add beautiful geometry layer with blue to purple gradient
     * @param {Object} geojson - GeoJSON object
     * @param {string} sourceId - Source ID
     */
    addBeautifulGeometryLayer(geojson, sourceId = 'beautiful-geometry') {
        // Remove existing source and layers if they exist
        if (this.map.getSource(sourceId)) {
            // First remove any layers that use this source
            this.map.getStyle().layers.forEach(layer => {
                if (layer.source === sourceId) {
                    this.map.removeLayer(layer.id);
                }
            });
            
            // Then remove the source
            this.map.removeSource(sourceId);
        }
        
        // Add source
        this.map.addSource(sourceId, {
            type: 'geojson',
            data: geojson
        });
        
        // Add animated fill layer with beautiful gradient-like effect
        this.map.addLayer({
            id: `${sourceId}-fill-glow`,
            type: 'fill',
            source: sourceId,
            paint: {
                'fill-color': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    5, '#4A90E2',   // Beautiful blue at lower zoom
                    10, '#8B5CF6', // Purple at medium zoom
                    15, '#A855F7'  // Lighter purple at higher zoom
                ],
                'fill-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    5, 0.15,  // More transparent at lower zoom
                    10, 0.25, // Medium opacity at medium zoom
                    15, 0.35  // More opaque at higher zoom
                ]
            }
        });
        
        // Add inner fill with gradient effect
        this.map.addLayer({
            id: `${sourceId}-fill-inner`,
            type: 'fill',
            source: sourceId,
            paint: {
                'fill-color': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    5, '#6366F1',   // Indigo blue
                    10, '#8B5CF6',  // Purple
                    15, '#A855F7'   // Light purple
                ],
                'fill-opacity': 0.1
            }
        });
        
        // Add beautiful gradient stroke
        this.map.addLayer({
            id: `${sourceId}-stroke-outer`,
            type: 'line',
            source: sourceId,
            paint: {
                'line-color': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    5, '#3B82F6',   // Blue
                    10, '#7C3AED',  // Purple
                    15, '#9333EA'   // Bright purple
                ],
                'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    5, 2,
                    10, 3,
                    15, 4
                ],
                'line-opacity': 0.8
            }
        });
        
        // Add inner stroke for depth
        this.map.addLayer({
            id: `${sourceId}-stroke-inner`,
            type: 'line',
            source: sourceId,
            paint: {
                'line-color': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    5, '#60A5FA',   // Light blue
                    10, '#A78BFA',  // Light purple
                    15, '#C084FC'   // Very light purple
                ],
                'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    5, 1,
                    10, 1.5,
                    15, 2
                ],
                'line-opacity': 0.6
            }
        });
        
        // Store as current layer
        this.currentLayer = {
            sourceId,
            getBounds: () => {
                // Calculate bounds from GeoJSON
                if (geojson.type === 'Feature' && geojson.geometry) {
                    if (geojson.geometry.type === 'Polygon') {
                        const coords = geojson.geometry.coordinates[0];
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        
                        coords.forEach(coord => {
                            minX = Math.min(minX, coord[0]);
                            minY = Math.min(minY, coord[1]);
                            maxX = Math.max(maxX, coord[0]);
                            maxY = Math.max(maxY, coord[1]);
                        });
                        
                        return [[minX, minY], [maxX, maxY]];
                    }
                }
                return null;
            }
        };
        
        console.log('🎨 Added beautiful blue-to-purple gradient geometry layer');
    }
    
    /**
     * Add GeoJSON layer to map (legacy method, kept for compatibility)
     * @param {Object} geojson - GeoJSON object
     * @param {string} sourceId - Source ID
     */
    addGeoJsonLayer(geojson, sourceId = 'item-geometry') {
        // Use the beautiful geometry layer instead
        this.addBeautifulGeometryLayer(geojson, sourceId);
    }
    
    /**
     * Remove current layer from map
     */
    removeCurrentLayer() {
        try {
            // If we have a current layer, remove it
            if (this.currentLayer && this.currentLayer.sourceId) {
                // Get all layers that use this source
                const layers = this.map.getStyle().layers.filter(layer => 
                    layer.source === this.currentLayer.sourceId
                );
                
                // Remove each layer
                layers.forEach(layer => {
                    if (this.map.getLayer(layer.id)) {
                        this.map.removeLayer(layer.id);
                    }
                });
                
                // Remove the source
                if (this.map.getSource(this.currentLayer.sourceId)) {
                    this.map.removeSource(this.currentLayer.sourceId);
                }
                
                // Clear current layer
                this.currentLayer = null;
                this.currentLayerOverlay = null;
                this.currentAssetKey = null;
            }
        } catch (error) {
            console.error('Error removing current layer:', error);
        }
    }
    
    /**
     * Fit the map view to the current layer bounds
     */
    fitToLayerBounds() {
        if (this.currentLayer && this.currentLayer.getBounds) {
            const bounds = this.currentLayer.getBounds();
            if (bounds) {
                this.map.fitBounds(bounds, {
                    padding: 50
                });
            }
        }
    }
    
    /**
     * Set the opacity of the current layer
     * @param {number} opacity - Opacity value (0-1)
     */
    setLayerOpacity(opacity) {
        if (this.currentLayerOverlay && this.currentLayerOverlay.setOpacity) {
            this.currentLayerOverlay.setOpacity(opacity);
        }
    }
    
    /**
     * Load image from direct URL
     */
    async loadImageFromDirectUrl() {
        try {
            // Get URL from input
            const urlInput = document.getElementById('direct-image-url');
            if (!urlInput || !urlInput.value) {
                console.warn('No URL provided');
                return;
            }
            
            const imageUrl = urlInput.value.trim();
            console.log('Loading image from direct URL:', imageUrl);
            
            // Get bounds from input
            const boundsInput = document.getElementById('direct-image-bounds');
            if (!boundsInput || !boundsInput.value) {
                console.warn('No bounds provided');
                return;
            }
            
            // Parse bounds
            const boundsString = boundsInput.value.trim();
            const bounds = boundsString.split(',').map(Number);
            
            if (bounds.length !== 4 || bounds.some(isNaN)) {
                console.warn('Invalid bounds format');
                return;
            }
            
            // Show loading indicator
            document.getElementById('loading').style.display = 'block';
            
            // Add image overlay
            await this.addImageOverlay(imageUrl, bounds, { id: 'direct-url-image' });
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
        } catch (error) {
            console.error('Error loading image from direct URL:', error);
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
        }
    }
    
    /**
     * Ensure a URL is absolute
     * @param {string} url - URL to process
     * @returns {string} - Absolute URL
     */
    ensureAbsoluteUrl(url) {
        if (!url) return url;
        
        // If the URL is already absolute, return it
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return url;
        }
        
        // If it's a root-relative URL, add the origin
        if (url.startsWith('/')) {
            return window.location.origin + url;
        }
        
        // If it's a relative URL, resolve it against the current page
        const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
        return new URL(url, baseUrl).href;
    }
    
    /**
     * Check if an asset is a Cloud Optimized GeoTIFF (COG)
     * @param {Object} asset - Asset object
     * @returns {boolean} - True if the asset is a COG, false otherwise
     */
    isCOGAsset(asset) {
        // Check if the asset type is 'image/tiff; application=geotiff; profile=cloud-optimized'
        return asset.type === 'image/tiff; application=geotiff; profile=cloud-optimized';
    }
    
    /**
     * Add image overlay to map
     * @param {string} imageUrl - Image URL
     * @param {Array} bbox - Bounding box [west, south, east, north]
     * @param {Object} item - STAC item
     */
    async addImageOverlay(imageUrl, bbox, item) {
        try {
            console.log('Adding image overlay:', imageUrl);
            
            // Remove existing overlay if any
            this.removeCurrentLayer();

            // 1. Ensure proper URL handling
            let absoluteUrl = this.ensureAbsoluteUrl(imageUrl);
            console.log('Absolute URL:', absoluteUrl);
            
            // Create a unique ID for this image source
            const sourceId = `image-overlay-${Date.now()}`;
            
            // 2. Try direct approach first - this is better for CORS issues
            // with MapLibre handling the image directly
            try {
                // Apply coordinates directly
                const coordinates = [
                    [bbox[0], bbox[3]], // top-left (northwest)
                    [bbox[2], bbox[3]], // top-right (northeast)
                    [bbox[2], bbox[1]], // bottom-right (southeast)
                    [bbox[0], bbox[1]]  // bottom-left (southwest)
                ];
                
                // Add source without pre-validation
                this.map.addSource(sourceId, {
                    type: 'image',
                    url: absoluteUrl,
                    coordinates: coordinates
                });
                
                // Add image layer
                this.map.addLayer({
                    id: `${sourceId}-layer`,
                    type: 'raster',
                    source: sourceId,
                    paint: {
                        'raster-opacity': 1.0,
                        'raster-resampling': 'linear'
                    }
                });
                
                // Store as current layer
                this.currentLayer = {
                    sourceId,
                    getBounds: () => {
                        return [
                            [bbox[0], bbox[1]], // Southwest
                            [bbox[2], bbox[3]]  // Northeast
                        ];
                    }
                };
                
                // Store overlay for opacity control
                this.currentLayerOverlay = {
                    setOpacity: (opacity) => {
                        this.map.setPaintProperty(`${sourceId}-layer`, 'raster-opacity', opacity);
                    }
                };
                
                console.log('Direct image placement successful');
                
                // Register error handler for post-adding errors
                this.map.once('error', (e) => {
                    if (e.sourceId === sourceId) {
                        console.error('Error with direct image overlay, trying alternative:', e);
                        this.handleImageError(sourceId, absoluteUrl, bbox, item);
                    }
                });
                
                return true;
            } catch (directError) {
                // If direct approach fails, try the more involved approach
                console.error('Direct image placement failed:', directError);
                return await this.addImageWithValidation(absoluteUrl, bbox, item);
            }
        } catch (error) {
            console.error('Error in addImageOverlay:', error);
            
            // Use GeoJSON fallback without tooltip
            this.addGeoJsonLayerWithoutTooltip(bbox, item);
            return false;
        }
    }


    fitToBounds(bbox) {
        if (!this.map || !bbox) return;
        const [west, south, east, north] = bbox;
        this.map.fitBounds([[west, south], [east, north]], { 
            padding: 50, 
            maxZoom: 16,
            duration: 1000 
        });
    }

    clearAllThumbnails() {
        if (!this.thumbnailLayers) this.thumbnailLayers = new Set();
        this.thumbnailLayers.forEach(layerId => {
            if (this.map?.getLayer(layerId)) this.map.removeLayer(layerId);
            if (this.map?.getSource(layerId.replace('-layer', ''))) {
                this.map.removeSource(layerId.replace('-layer', ''));
            }
        });
        this.thumbnailLayers.clear();
    }

    isMapReady() {
        return this.map && this.map.loaded();
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
