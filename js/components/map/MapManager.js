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
        
        // Deck.gl integration
        this.deckGLIntegration = null;
        
        // Check user preference from localStorage, then config, default to true
        const userPreference = localStorage.getItem('stac-explorer-use-deckgl');
        if (userPreference !== null) {
            this.useDeckGL = userPreference === 'true';
        } else {
            this.useDeckGL = config?.performanceSettings?.useDeckGL !== false; // Default to true, check config
        }
        
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


            // Detect current theme - check saved preference first, then default to light
            const savedTheme = localStorage.getItem('stac-explorer-theme');
            if (savedTheme) {
                this.currentTheme = savedTheme;
            } else {
                // Default to light theme to match UIManager default
                this.currentTheme = 'light';
            }
            
            
            // Get the appropriate map style based on theme
            const styleUrl = this.getMapStyle(this.currentTheme);

            // Initialize MapLibre GL map with proper config defaults
            const defaultCenter = [52.5, 28.5]; // Middle East / Central Asia region
            const defaultZoom = 2.5;
            
            this.map = new maplibregl.Map({
                container: container,
                style: styleUrl,
                center: this.config.mapSettings?.defaultCenter || defaultCenter,
                zoom: this.config.mapSettings?.defaultZoom || defaultZoom,
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
            
            // Initialize Deck.gl integration if enabled
            if (this.useDeckGL) {
                await this.initializeDeckGL();
            }

            this.isInitialized = true;
            
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
        // Listen for themeChange events from UIManager (more reliable)
        document.addEventListener('themeChange', (event) => {
            const newTheme = event.detail.themeMode;
            if (newTheme && newTheme !== this.currentTheme) {
                this.currentTheme = newTheme;
                this.updateMapTheme(newTheme);
            }
        });

        // Also keep MutationObserver as fallback
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
                
                
                this.finishDrawing(bbox);
                
                // Reset for next drawing
                firstPoint = null;
                isDrawing = false;
            }
        };

        // Throttled mouse move for better mobile performance
        let lastMoveTime = 0;
        const moveThrottle = 16; // ~60fps
        const onMouseMove = (e) => {
            if (!isDrawing || !firstPoint) return;
            
            // Throttle mouse move events for better performance
            const now = Date.now();
            if (now - lastMoveTime < moveThrottle) return;
            lastMoveTime = now;
            
            // Show preview of the rectangle as mouse moves
            const currentPoint = [e.lngLat.lng, e.lngLat.lat];
            this.updateBboxPreview(firstPoint, currentPoint);
        };

        const onRightClick = (e) => {
            // Cancel drawing on right click
            if (isDrawing) {
                e.preventDefault();
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
        
        // Clear any existing search bbox since we're drawing a new one
        this.clearSearchBbox();
        
        if (this.drawingCallback) {
            this.drawingCallback(geometry);
        }
        
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
     * Initialize Deck.gl integration
     */
    async initializeDeckGL() {
        try {
            
            // Import SimpleDeckGLIntegration dynamically
            const { default: SimpleDeckGLIntegration } = await import('./SimpleDeckGLIntegration.js');
            
            // Create integration instance
            this.deckGLIntegration = new SimpleDeckGLIntegration(this);
            
            // Initialize
            await this.deckGLIntegration.initialize();
            
        } catch (error) {
            console.warn('⚠️ Failed to initialize Deck.gl, falling back to MapLibre only:', error);
            this.useDeckGL = false;
            this.deckGLIntegration = null;
        }
    }

    /**
     * Display item on map with Deck.gl acceleration (enhanced method)
     * @param {Object} item - STAC item to display
     * @param {string} preferredAssetKey - Preferred asset key to display
     * @param {boolean} preserveViewport - If true, don't fit map to bbox
     * @param {Object} options - Display options
     * @returns {Promise}
     */
    async displayItemOnMap(item, preferredAssetKey = null, preserveViewport = false, options = {}) {
        // Try Deck.gl first if available
        if (this.deckGLIntegration && this.deckGLIntegration.isAvailable() && !options.forceMapLibre) {
            try {
                const success = await this.deckGLIntegration.addStacItemLayer(
                    item, 
                    preferredAssetKey || 'rendered_preview',
                    options
                );
                
                if (success) {
                    return;
                }
            } catch (error) {
                console.warn('⚠️ Deck.gl rendering failed, falling back to MapLibre:', error);
            }
        }
        
        // Fallback to original MapLibre implementation
        await this._displayItemOnMapLibre(item, preferredAssetKey, preserveViewport);
    }

    /**
     * Original MapLibre display implementation
     * @param {Object} item - STAC item to display
     * @param {string} preferredAssetKey - Preferred asset key to display
     * @param {boolean} preserveViewport - If true, don't fit map to bbox
     */
    async _displayItemOnMapLibre(item, preferredAssetKey = null, preserveViewport = false) {
        try {
            
            // Remove any existing layers
            this.removeCurrentLayer();
            
            // Get bounding box
            const bbox = this.getBoundingBox(item);
            if (!bbox) {
                console.warn('Item has no valid bbox or geometry');
                return;
            }
            
            // Fit map to item bounds (unless preserveViewport is true)
            if (!preserveViewport) {
                this.fitMapToBbox(bbox);
            }
            
            // Show loading indicator
            const loadingIndicator = document.getElementById('loading');
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            
            // Helper function to check if URL is usable (not S3 scheme)
            const isUsableUrl = (url) => {
                return url && !url.startsWith('s3://') && (url.startsWith('http://') || url.startsWith('https://'));
            };
            
            // PRIORITY 1: Check links for thumbnail or preview (more reliable than assets)
            if (item.links && Array.isArray(item.links)) {
                const thumbnailLink = item.links.find(link => link.rel === 'thumbnail');
                const previewLink = item.links.find(link => link.rel === 'preview');
                
                if (thumbnailLink && isUsableUrl(thumbnailLink.href)) {
                    console.log('🗺️ Using links.thumbnail for MapLibre display:', thumbnailLink.href);
                    await this.addAssetOverlay(thumbnailLink, item, 'links.thumbnail');
                    return;
                } else if (previewLink && isUsableUrl(previewLink.href)) {
                    console.log('🗺️ Using links.preview for MapLibre display:', previewLink.href);
                    await this.addAssetOverlay(previewLink, item, 'links.preview');
                    return;
                }
            }
            
            // PRIORITY 2: Strongly prioritize preview/thumbnail assets (JPG, PNG, etc.) to avoid CORS issues
            const previewAssets = ['rendered_preview', 'thumbnail', 'preview', 'overview'];
            
            // For Planetary Computer items, check rendered_preview first (usually works)
            if (item.assets && item.assets.rendered_preview && item.assets.rendered_preview.href.includes('planetarycomputer')) {
                await this.addAssetOverlay(item.assets.rendered_preview, item, 'rendered_preview');
                return;
            }
            
            // Try all preview assets first (these are usually JPG/PNG and work better)
            for (const assetKey of previewAssets) {
                if (item.assets && item.assets[assetKey]) {
                    const asset = item.assets[assetKey];
                    // Prefer preview images (JPG/PNG) over anything else
                    if (this.isPreviewAsset(asset)) {
                        await this.addAssetOverlay(asset, item, assetKey);
                        return;
                    }
                }
            }
            
            // If we have a preferred asset key and it's a preview, use it
            if (preferredAssetKey && item.assets && item.assets[preferredAssetKey]) {
                const asset = item.assets[preferredAssetKey];
                if (this.isPreviewAsset(asset)) {
                    await this.addAssetOverlay(asset, item, preferredAssetKey);
                    return;
                }
            }
            
            // Try any remaining preview assets, even if they might have CORS issues
            for (const assetKey of previewAssets) {
                if (item.assets && item.assets[assetKey]) {
                    await this.addAssetOverlay(item.assets[assetKey], item, assetKey);
                    return;
                }
            }
            
            // If no preview assets, try the preferred asset anyway
            if (preferredAssetKey && item.assets && item.assets[preferredAssetKey]) {
                await this.addAssetOverlay(item.assets[preferredAssetKey], item, preferredAssetKey);
                return;
            }
            
            // Last resort: try any visual assets but expect them to fail with CORS
            const visualAssets = this.findVisualAssets(item);
            if (visualAssets.length > 0) {
                await this.addAssetOverlay(visualAssets[0].asset, item, visualAssets[0].key);
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
            console.warn(`Thumbnail failed for ${item.id}, showing bounding box:`, error);
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
        // Cleanup Deck.gl integration first
        if (this.deckGLIntegration) {
            this.deckGLIntegration.destroy();
            this.deckGLIntegration = null;
        }
        
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
     * Remove current layer from map (enhanced with Deck.gl support)
     */
    removeCurrentLayer() {
        // Clear Deck.gl layers first
        if (this.deckGLIntegration && this.deckGLIntegration.isAvailable()) {
            this.deckGLIntegration.removeStacLayer();
        }
        
        try {
            console.log('🧹 [CLEAR-DEBUG] Starting layer removal...');
            console.log('🧹 [CLEAR-DEBUG] Current layer state:', this.currentLayer);
            
            // Additional aggressive cleanup - remove common layer IDs directly
            const commonLayerIds = [
                'item-geometry-layer',
                'item-geometry-layer-stroke',
                'thumbnail-layer',
                'image-overlay-layer'
            ];
            
            commonLayerIds.forEach(layerId => {
                if (this.map.getLayer(layerId)) {
                    console.log(`🧹 [CLEAR-DEBUG] Removing common layer: ${layerId}`);
                    this.map.removeLayer(layerId);
                }
            });
            
            // Additional aggressive source cleanup
            const commonSourceIds = [
                'item-geometry',
                'thumbnail-source',
                'image-overlay-source'
            ];
            
            commonSourceIds.forEach(sourceId => {
                if (this.map.getSource(sourceId)) {
                    console.log(`🧹 [CLEAR-DEBUG] Removing common source: ${sourceId}`);
                    this.map.removeSource(sourceId);
                }
            });
            
            // If we have a current layer, remove it
            if (this.currentLayer) {
                console.log('🧹 [CLEAR-DEBUG] Removing tracked current layer...');
                
                // Handle new structure with layerIds array
                if (this.currentLayer.layerIds && Array.isArray(this.currentLayer.layerIds)) {
                    console.log('🧹 [CLEAR-DEBUG] Removing layers by ID array:', this.currentLayer.layerIds);
                    this.currentLayer.layerIds.forEach(layerId => {
                        if (this.map.getLayer(layerId)) {
                            console.log(`🧹 [CLEAR-DEBUG] Removed layer: ${layerId}`);
                            this.map.removeLayer(layerId);
                        } else {
                            console.log(`🧹 [CLEAR-DEBUG] Layer not found: ${layerId}`);
                        }
                    });
                }
                // Handle old structure or remaining layers by source
                else if (this.currentLayer.sourceId) {
                    console.log('🧹 [CLEAR-DEBUG] Removing layers by source:', this.currentLayer.sourceId);
                    const layers = this.map.getStyle().layers.filter(layer => 
                        layer.source === this.currentLayer.sourceId
                    );
                    
                    console.log('🧹 [CLEAR-DEBUG] Found layers to remove:', layers.map(l => l.id));
                    layers.forEach(layer => {
                        if (this.map.getLayer(layer.id)) {
                            console.log(`🧹 [CLEAR-DEBUG] Removed layer by source: ${layer.id}`);
                            this.map.removeLayer(layer.id);
                        }
                    });
                }
                // Handle Leaflet-style layers (legacy)
                else if (this.currentLayer.remove) {
                    console.log('🧹 [CLEAR-DEBUG] Removing legacy layer');
                    this.currentLayer.remove();
                }
                
                // Remove the source
                if (this.currentLayer.sourceId && this.map.getSource(this.currentLayer.sourceId)) {
                    console.log(`🧹 [CLEAR-DEBUG] Removing source: ${this.currentLayer.sourceId}`);
                    this.map.removeSource(this.currentLayer.sourceId);
                }
                
                // Clear current layer
                this.currentLayer = null;
                this.currentLayerOverlay = null;
                this.currentAssetKey = null;
                console.log('🧹 [CLEAR-DEBUG] Cleared current layer tracking');
            } else {
                console.log('🧹 [CLEAR-DEBUG] No tracked current layer to remove');
            }
            
            // Final verification - list all remaining layers
            const remainingLayers = this.map.getStyle().layers.map(l => l.id);
            console.log('🧹 [CLEAR-DEBUG] Remaining layers after cleanup:', remainingLayers);
            
        } catch (error) {
            console.error('❌ [CLEAR-DEBUG] Error removing current layer:', error);
        }
    }

    getBoundingBox(item) {
        // If item has bbox, use it
        if (item.bbox && item.bbox.length === 4) {
            return item.bbox;
        }
        
        // If item has geometry, calculate bbox
        if (item.geometry && item.geometry.type === 'Polygon') {
            return this.getGeometryBounds(item.geometry);
        }
        
        return null;
    }
    
    /**
     * Get bounds from any geometry type
     * @param {Object} geometry - GeoJSON geometry
     * @returns {Array} Bounding box [west, south, east, north]
     */
    getGeometryBounds(geometry) {
        if (!geometry || !geometry.coordinates) {
            return null;
        }
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        const updateBounds = (coord) => {
            minX = Math.min(minX, coord[0]);
            minY = Math.min(minY, coord[1]);
            maxX = Math.max(maxX, coord[0]);
            maxY = Math.max(maxY, coord[1]);
        };
        
        const processCoords = (coords, depth = 0) => {
            if (typeof coords[0] === 'number') {
                // This is a coordinate pair
                updateBounds(coords);
            } else {
                // This is an array of coordinates
                coords.forEach(coord => processCoords(coord, depth + 1));
            }
        };
        
        processCoords(geometry.coordinates);
        
        return [minX, minY, maxX, maxY];
    }
    
    /**
     * Fit map to geometry bounds
     * @param {Object} geometry - GeoJSON geometry
     */
    fitMapToGeometry(geometry) {
        const bounds = this.getGeometryBounds(geometry);
        if (bounds) {
            this.fitMapToBbox(bounds);
        }
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
     * @param {Object|Array} geometryOrBounds - Either GeoJSON geometry or bbox array
     */
    async addAssetOverlay(asset, item, assetKey, geometryOrBounds = null) {
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
            await this.addVisualOverlay(asset, item, geometryOrBounds);
            
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
     * @param {Object|Array} geometryOrBounds - Either GeoJSON geometry or bbox array
     */
    async addVisualOverlay(asset, item, geometryOrBounds = null) {
        try {
            console.log('Adding visual overlay for asset:', asset);
            
            // Get image URL
            const imageUrl = asset.href;
            
            // Check for CORS-problematic domains - for raster data, show geometry only
            if (this.hasCORSIssues(imageUrl) && this.isRasterAsset(asset)) {
                console.log('CORS-problematic raster asset, showing geometry only:', imageUrl);
                this.addGeometryOverlay(item);
                return true;
            }
            
            // For preview/thumbnail images, try to load them even from CORS domains
            // as they're usually smaller and may work
            const isPreviewAsset = this.isPreviewAsset(asset);
            if (this.hasCORSIssues(imageUrl) && !isPreviewAsset) {
                console.log('CORS-problematic non-preview asset, showing geometry only:', imageUrl);
                this.addGeometryOverlay(item);
                return true;
            }
            
            // Use provided geometry/bounds or get from item
            let bbox;
            if (geometryOrBounds) {
                // If geometry object is provided, extract bounds from it
                if (geometryOrBounds.type && geometryOrBounds.coordinates) {
                    console.log('Using provided geometry for overlay bounds');
                    bbox = this.getGeometryBounds(geometryOrBounds);
                } else if (Array.isArray(geometryOrBounds) && geometryOrBounds.length === 4) {
                    // If bounds array is provided directly
                    console.log('Using provided bounds for overlay');
                    bbox = geometryOrBounds;
                }
            }
            
            // Fallback to item bounds if no geometry/bounds provided
            if (!bbox) {
                bbox = this.getBoundingBox(item);
            }
            
            if (!bbox) {
                console.warn('Item has no valid bbox or geometry for overlay');
                return false;
            }
            
            // Try to add image to map, fallback to geometry if it fails
            try {
                await this.addImageOverlay(imageUrl, bbox, item);
                return true;
            } catch (imageError) {
                console.warn('Failed to load image overlay, showing geometry instead:', imageError);
                this.addGeometryOverlay(item);
                return true;
            }
            
        } catch (error) {
            console.error('Error adding visual overlay:', error);
            // Always fallback to geometry
            this.addGeometryOverlay(item);
            return false;
        }
    }
    
    /**
     * Check if a URL might have CORS issues
     * @param {string} url - URL to check
     * @returns {boolean} True if URL might have CORS issues
     */
    hasCORSIssues(url) {
        const corsProblematicDomains = [
            'datahub.creodias.eu',
            'catalogue.dataspace.copernicus.eu',
            'scihub.copernicus.eu'
        ];
        
        return corsProblematicDomains.some(domain => url.includes(domain));
    }
    
    /**
     * Check if an asset is raster data (COG, GeoTIFF, etc.)
     * @param {Object} asset - STAC asset
     * @returns {boolean} True if asset is raster data
     */
    isRasterAsset(asset) {
        const rasterTypes = [
            'image/tiff',
            'image/geotiff',
            'application/geotiff',
            'image/tiff; application=geotiff',
            'image/tiff; application=geotiff; profile=cloud-optimized'
        ];
        
        // Check by media type
        if (asset.type && rasterTypes.includes(asset.type)) {
            return true;
        }
        
        // Check by file extension
        if (asset.href && (asset.href.includes('.tif') || asset.href.includes('.tiff'))) {
            return true;
        }
        
        // Check by asset roles
        if (asset.roles && asset.roles.includes('data')) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if an asset is a preview/thumbnail image (PNG, JPG, etc.)
     * @param {Object} asset - STAC asset
     * @returns {boolean} True if asset is a preview image
     */
    isPreviewAsset(asset) {
        const previewTypes = [
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/gif',
            'image/webp'
        ];
        
        // Check by media type
        if (asset.type && previewTypes.includes(asset.type)) {
            return true;
        }
        
        // Check by file extension
        if (asset.href) {
            const lowerHref = asset.href.toLowerCase();
            if (lowerHref.includes('.png') || lowerHref.includes('.jpg') || 
                lowerHref.includes('.jpeg') || lowerHref.includes('.gif') || 
                lowerHref.includes('.webp')) {
                return true;
            }
        }
        
        // Check by asset roles
        if (asset.roles && (asset.roles.includes('thumbnail') || 
                            asset.roles.includes('preview') || 
                            asset.roles.includes('overview'))) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if a URL looks like a preview/thumbnail image
     * @param {string} url - Image URL
     * @returns {boolean} True if URL looks like a preview image
     */
    isLikelyPreviewUrl(url) {
        if (!url) return false;
        
        const lowerUrl = url.toLowerCase();
        
        // Check for common preview/thumbnail indicators in URL
        const previewIndicators = [
            'preview', 'thumbnail', 'thumb', 'overview', 
            '.jpg', '.jpeg', '.png', '.gif', '.webp',
            'rendered_preview', 'visual'
        ];
        
        // Check for preview indicators
        const hasPreviewIndicator = previewIndicators.some(indicator => 
            lowerUrl.includes(indicator)
        );
        
        // Exclude obvious raster/data files
        const dataIndicators = [
            '.tif', '.tiff', '.jp2', '.hdf', '.nc', '.grib',
            'B01.jp2', 'B02.jp2', 'B03.jp2', 'B04.jp2', // Sentinel bands
            'data/', '/cog/', '.cog'
        ];
        
        const isDataFile = dataIndicators.some(indicator => 
            lowerUrl.includes(indicator)
        );
        
        return hasPreviewIndicator && !isDataFile;
    }
    
    /**
     * Convert image URL to data URL to avoid CORS issues
     * @param {string} url - Image URL
     * @returns {Promise<string>} - Data URL or null if failed
     */
    async convertImageToDataUrl(url) {
        try {
            // Try to fetch the image using a CORS proxy
            const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            // Get the image data as blob
            const blob = await response.blob();
            
            // Convert blob to data URL
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.warn('Failed to convert image to data URL:', error);
            return null;
        }
    }
    
    /**
     * Add geometry overlay (outline) for an item
     * @param {Object} item - STAC item
     */
    addGeometryOverlay(item) {
        console.log('Adding geometry overlay for item:', item.id);
        
        // Remove existing layers
        this.removeCurrentLayer();
        
        if (item.geometry) {
            // Add geometry as a GeoJSON source and layer
            const sourceId = 'item-geometry';
            const layerId = 'item-geometry-layer';
            
            // Remove existing geometry source if it exists
            if (this.map.getSource(sourceId)) {
                this.map.removeLayer(layerId);
                this.map.removeSource(sourceId);
            }
            
            // Add the geometry source
            this.map.addSource(sourceId, {
                type: 'geojson',
                data: item.geometry
            });
            
            // Add fill layer
            this.map.addLayer({
                id: layerId,
                type: 'fill',
                source: sourceId,
                paint: {
                    'fill-color': '#4f46e5',
                    'fill-opacity': 0.1
                }
            });
            
            // Add stroke layer
            this.map.addLayer({
                id: layerId + '-stroke',
                type: 'line',
                source: sourceId,
                paint: {
                    'line-color': '#4f46e5',
                    'line-width': 2,
                    'line-opacity': 0.8
                }
            });
            
            // Store current layer info for cleanup
            this.currentLayer = {
                sourceId: sourceId,
                layerIds: [layerId, layerId + '-stroke']
            };
            
            // Fit map to geometry bounds
            const bounds = this.getGeometryBounds(item.geometry);
            if (bounds) {
                this.fitMapToBbox(bounds);
            }
            
        } else if (item.bbox) {
            // If no geometry, use bbox
            const bbox = item.bbox;
            
            // Create a rectangle geometry from bbox
            const rectangleGeometry = {
                type: 'Polygon',
                coordinates: [[
                    [bbox[0], bbox[1]], // sw
                    [bbox[2], bbox[1]], // se
                    [bbox[2], bbox[3]], // ne
                    [bbox[0], bbox[3]], // nw
                    [bbox[0], bbox[1]]  // close
                ]]
            };
            
            const sourceId = 'item-bbox';
            const layerId = 'item-bbox-layer';
            
            // Remove existing bbox source if it exists
            if (this.map.getSource(sourceId)) {
                this.map.removeLayer(layerId);
                this.map.removeSource(sourceId);
            }
            
            // Add the bbox source
            this.map.addSource(sourceId, {
                type: 'geojson',
                data: rectangleGeometry
            });
            
            // Add fill layer
            this.map.addLayer({
                id: layerId,
                type: 'fill',
                source: sourceId,
                paint: {
                    'fill-color': '#4f46e5',
                    'fill-opacity': 0.1
                }
            });
            
            // Add stroke layer
            this.map.addLayer({
                id: layerId + '-stroke',
                type: 'line',
                source: sourceId,
                paint: {
                    'line-color': '#4f46e5',
                    'line-width': 2,
                    'line-opacity': 0.8
                }
            });
            
            // Store current layer info for cleanup
            this.currentLayer = {
                sourceId: sourceId,
                layerIds: [layerId, layerId + '-stroke']
            };
            
            // Fit map to bbox
            this.fitMapToBbox(bbox);
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
        
        // Skip image loading due to CORS issues - go directly to GeoJSON fallback
        // This provides a visual representation without CORS errors
        this.addGeoJsonLayerWithoutTooltip(bbox, item);
        return true;
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
            
            // Check if this looks like a preview/thumbnail URL that might work
            const isLikelyPreview = this.isLikelyPreviewUrl(imageUrl);
            
            if (isLikelyPreview) {
                // For preview/thumbnail images, convert to data URL first to avoid CORS
                try {
                    // Fetch image and convert to data URL
                    const dataUrl = await this.convertImageToDataUrl(absoluteUrl);
                    
                    if (dataUrl) {
                        // Apply coordinates directly
                        const coordinates = [
                            [bbox[0], bbox[3]], // top-left (northwest)
                            [bbox[2], bbox[3]], // top-right (northeast)
                            [bbox[2], bbox[1]], // bottom-right (southeast)
                            [bbox[0], bbox[1]]  // bottom-left (southwest)
                        ];
                        
                        // Add source with data URL
                        this.map.addSource(sourceId, {
                            type: 'image',
                            url: dataUrl,
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
                        
                        return true;
                    }
                } catch (error) {
                    console.warn('Failed to convert image to data URL:', error);
                }
            }
            
            // For non-preview assets or if data URL conversion failed, use GeoJSON fallback
            return await this.addImageWithValidation(absoluteUrl, bbox, item);
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
            
            // Remove any existing layers
            this.removeCurrentLayer();
            
            // Check if item has geometry - use it directly for more accurate positioning
            let bounds = null;
            let useGeometry = false;
            
            if (item.geometry && item.geometry.type) {
                console.log('Using item geometry for positioning:', item.geometry.type);
                bounds = this.getGeometryBounds(item.geometry);
                useGeometry = true;
            } else {
                // Fallback to bbox
                const bbox = this.getBoundingBox(item);
                if (!bbox) {
                    console.warn('Item has no valid bbox or geometry');
                    return;
                }
                bounds = bbox;
            }
            
            // Fit map to item bounds
            if (useGeometry) {
                this.fitMapToGeometry(item.geometry);
            } else {
                this.fitMapToBbox(bounds);
            }
            
            // Show loading indicator
            const loadingIndicator = document.getElementById('loading');
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            
            // Try to find visual assets
            const visualAssets = this.findVisualAssets(item);
            
            // Helper function to check if URL is usable (not S3 scheme)
            const isUsableUrl = (url) => {
                return url && !url.startsWith('s3://') && (url.startsWith('http://') || url.startsWith('https://'));
            };
            
            // PRIORITY 1: Check links for thumbnail or preview (more reliable than assets)
            if (item.links && Array.isArray(item.links)) {
                const thumbnailLink = item.links.find(link => link.rel === 'thumbnail');
                const previewLink = item.links.find(link => link.rel === 'preview');
                
                if (thumbnailLink && isUsableUrl(thumbnailLink.href)) {
                    console.log('🗺️ Using links.thumbnail for map display:', thumbnailLink.href);
                    await this.addAssetOverlay(thumbnailLink, item, 'links.thumbnail', useGeometry ? item.geometry : bounds);
                    return;
                } else if (previewLink && isUsableUrl(previewLink.href)) {
                    console.log('🗺️ Using links.preview for map display:', previewLink.href);
                    await this.addAssetOverlay(previewLink, item, 'links.preview', useGeometry ? item.geometry : bounds);
                    return;
                }
            }
            
            // If we have a preferred asset key and it exists, use it
            if (preferredAssetKey && item.assets && item.assets[preferredAssetKey]) {
                await this.addAssetOverlay(item.assets[preferredAssetKey], item, preferredAssetKey, useGeometry ? item.geometry : bounds);
                return;
            }
            
            // PRIORITY 2: Check assets if no usable links found
            
            // If we have visual assets, use the first one
            if (visualAssets.length > 0) {
                await this.addAssetOverlay(visualAssets[0].asset, item, visualAssets[0].key, useGeometry ? item.geometry : bounds);
                return;
            }
            
            // For Planetary Computer items, check rendered_preview first
            if (item.assets && item.assets.rendered_preview && item.assets.rendered_preview.href.includes('planetarycomputer')) {
                await this.addAssetOverlay(item.assets.rendered_preview, item, 'rendered_preview', useGeometry ? item.geometry : bounds);
                return;
            }
            
            // If we have a thumbnail, use it
            if (item.assets && item.assets.thumbnail) {
                await this.addAssetOverlay(item.assets.thumbnail, item, 'thumbnail', useGeometry ? item.geometry : bounds);
                return;
            }
            
            // If we have a preview, use it
            if (item.assets && item.assets.preview) {
                await this.addAssetOverlay(item.assets.preview, item, 'preview', useGeometry ? item.geometry : bounds);
                return;
            }
            
            // If we have an overview, use it
            if (item.assets && item.assets.overview) {
                await this.addAssetOverlay(item.assets.overview, item, 'overview', useGeometry ? item.geometry : bounds);
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
            console.log('🧹 [CLEAR-DEBUG] Starting layer removal...');
            console.log('🧹 [CLEAR-DEBUG] Current layer state:', this.currentLayer);
            
            // Additional aggressive cleanup - remove common layer IDs directly
            const commonLayerIds = [
                'item-geometry-layer',
                'item-geometry-layer-stroke',
                'thumbnail-layer',
                'image-overlay-layer'
            ];
            
            commonLayerIds.forEach(layerId => {
                if (this.map.getLayer(layerId)) {
                    console.log(`🧹 [CLEAR-DEBUG] Removing common layer: ${layerId}`);
                    this.map.removeLayer(layerId);
                }
            });
            
            // Additional aggressive source cleanup
            const commonSourceIds = [
                'item-geometry',
                'thumbnail-source',
                'image-overlay-source'
            ];
            
            commonSourceIds.forEach(sourceId => {
                if (this.map.getSource(sourceId)) {
                    console.log(`🧹 [CLEAR-DEBUG] Removing common source: ${sourceId}`);
                    this.map.removeSource(sourceId);
                }
            });
            
            // If we have a current layer, remove it
            if (this.currentLayer) {
                console.log('🧹 [CLEAR-DEBUG] Removing tracked current layer...');
                
                // Handle new structure with layerIds array
                if (this.currentLayer.layerIds && Array.isArray(this.currentLayer.layerIds)) {
                    console.log('🧹 [CLEAR-DEBUG] Removing layers by ID array:', this.currentLayer.layerIds);
                    this.currentLayer.layerIds.forEach(layerId => {
                        if (this.map.getLayer(layerId)) {
                            console.log(`🧹 [CLEAR-DEBUG] Removed layer: ${layerId}`);
                            this.map.removeLayer(layerId);
                        } else {
                            console.log(`🧹 [CLEAR-DEBUG] Layer not found: ${layerId}`);
                        }
                    });
                }
                // Handle old structure or remaining layers by source
                else if (this.currentLayer.sourceId) {
                    console.log('🧹 [CLEAR-DEBUG] Removing layers by source:', this.currentLayer.sourceId);
                    const layers = this.map.getStyle().layers.filter(layer => 
                        layer.source === this.currentLayer.sourceId
                    );
                    
                    console.log('🧹 [CLEAR-DEBUG] Found layers to remove:', layers.map(l => l.id));
                    layers.forEach(layer => {
                        if (this.map.getLayer(layer.id)) {
                            console.log(`🧹 [CLEAR-DEBUG] Removed layer by source: ${layer.id}`);
                            this.map.removeLayer(layer.id);
                        }
                    });
                }
                // Handle Leaflet-style layers (legacy)
                else if (this.currentLayer.remove) {
                    console.log('🧹 [CLEAR-DEBUG] Removing legacy layer');
                    this.currentLayer.remove();
                }
                
                // Remove the source
                if (this.currentLayer.sourceId && this.map.getSource(this.currentLayer.sourceId)) {
                    console.log(`🧹 [CLEAR-DEBUG] Removing source: ${this.currentLayer.sourceId}`);
                    this.map.removeSource(this.currentLayer.sourceId);
                }
                
                // Clear current layer
                this.currentLayer = null;
                this.currentLayerOverlay = null;
                this.currentAssetKey = null;
                console.log('🧹 [CLEAR-DEBUG] Cleared current layer tracking');
            } else {
                console.log('🧹 [CLEAR-DEBUG] No tracked current layer to remove');
            }
            
            // Final verification - list all remaining layers
            const remainingLayers = this.map.getStyle().layers.map(l => l.id);
            console.log('🧹 [CLEAR-DEBUG] Remaining layers after cleanup:', remainingLayers);
            
        } catch (error) {
            console.error('❌ [CLEAR-DEBUG] Error removing current layer:', error);
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
            
            // Check if this looks like a preview/thumbnail URL that might work
            const isLikelyPreview = this.isLikelyPreviewUrl(imageUrl);
            
            if (isLikelyPreview) {
                // For preview/thumbnail images, convert to data URL first to avoid CORS
                try {
                    // Fetch image and convert to data URL
                    const dataUrl = await this.convertImageToDataUrl(absoluteUrl);
                    
                    if (dataUrl) {
                        // Apply coordinates directly
                        const coordinates = [
                            [bbox[0], bbox[3]], // top-left (northwest)
                            [bbox[2], bbox[3]], // top-right (northeast)
                            [bbox[2], bbox[1]], // bottom-right (southeast)
                            [bbox[0], bbox[1]]  // bottom-left (southwest)
                        ];
                        
                        // Add source with data URL
                        this.map.addSource(sourceId, {
                            type: 'image',
                            url: dataUrl,
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
                        
                        return true;
                    }
                } catch (error) {
                    console.warn('Failed to convert image to data URL:', error);
                }
            }
            
            // For non-preview assets or if data URL conversion failed, use GeoJSON fallback
            return await this.addImageWithValidation(absoluteUrl, bbox, item);
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

    /**
     * Display a bounding box on the map with a name/label
     * Called by UnifiedStateManager when restoring geometry from URL
     * @param {Array} coords - [minX, minY, maxX, maxY] bounding box coordinates  
     * @param {string} name - Display name for the geometry
     */
    displayBboxOnMap(coords, name = 'Search Area') {
        console.log(`🗺️ Displaying bbox on map: ${name}`, coords);
        
        if (!coords || coords.length !== 4) {
            console.warn('Invalid bbox coordinates provided to displayBboxOnMap:', coords);
            return;
        }
        
        const [minX, minY, maxX, maxY] = coords;
        
        // Create bbox geometry in GeoJSON format
        const bboxGeometry = {
            type: 'Feature',
            properties: {
                name: name,
                type: 'search-area'
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [minX, minY],
                    [maxX, minY], 
                    [maxX, maxY],
                    [minX, maxY],
                    [minX, minY]
                ]]
            }
        };
        
        const sourceId = 'search-bbox';
        const layerId = 'search-bbox-layer';
        
        // Remove existing search bbox if it exists
        if (this.map.getSource(sourceId)) {
            if (this.map.getLayer(layerId)) {
                this.map.removeLayer(layerId);
            }
            if (this.map.getLayer(layerId + '-stroke')) {
                this.map.removeLayer(layerId + '-stroke');
            }
            this.map.removeSource(sourceId);
        }
        
        // Add the bbox source
        this.map.addSource(sourceId, {
            type: 'geojson',
            data: bboxGeometry
        });
        
        // Add beautiful fill layer
        this.map.addLayer({
            id: layerId,
            type: 'fill',
            source: sourceId,
            paint: {
                'fill-color': '#ff6b35',
                'fill-opacity': 0.1
            }
        });
        
        // Add stroke layer
        this.map.addLayer({
            id: layerId + '-stroke',
            type: 'line',
            source: sourceId,
            paint: {
                'line-color': '#ff6b35',
                'line-width': 2,
                'line-opacity': 0.8,
                'line-dasharray': [2, 2]
            }
        });
        
        // Store search bbox info (separate from currentLayer to persist)
        this.searchBbox = {
            sourceId: sourceId,
            layerIds: [layerId, layerId + '-stroke'],
            coords: coords,
            name: name
        };
        
        // Fit map to bbox bounds with some padding
        try {
            this.fitMapToBbox([minX, minY, maxX, maxY]);
        } catch (error) {
            console.warn('Could not fit map to bbox bounds:', error);
        }
        
        console.log(`✅ Search bbox '${name}' displayed on map`);
    }
    
    /**
     * Clear search bbox from map (only when new geometry is provided)
     */
    clearSearchBbox() {
        if (this.searchBbox) {
            console.log('🧹 Clearing search bbox from map:', this.searchBbox.name);
            
            // Remove layers
            this.searchBbox.layerIds.forEach(layerId => {
                if (this.map.getLayer(layerId)) {
                    this.map.removeLayer(layerId);
                }
            });
            
            // Remove source
            if (this.map.getSource(this.searchBbox.sourceId)) {
                this.map.removeSource(this.searchBbox.sourceId);
            }
            
            this.searchBbox = null;
        }
    }
    
    /**
     * Get current search bbox if any
     * @returns {Object|null} Current search bbox info
     */
    getCurrentSearchBbox() {
        return this.searchBbox || null;
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
