/**
 * MapManager.js - Handles map display and interactions using MapLibre GL
 */

export class MapManager {
    /**
     * Create a new MapManager
     * @param {string} mapElementId - ID of the map container element
     * @param {Object} config - Configuration settings
     */
    constructor(mapElementId, config) {
        this.mapElementId = mapElementId;
        this.config = config;
        this.map = null;
        this.currentLayer = null;
        this.currentLayerOverlay = null;
        this.currentAssetKey = null;
        this.mapReady = false;
        
        // Drawing state
        this.isDrawing = false;
        this.startPoint = null;
        this.currentBox = null;
        this.boxSourceId = 'bbox-source';
        this.boxLayerId = 'bbox-layer';
        this.boxOutlineLayerId = 'bbox-outline-layer';
        this.firstClickComplete = false; // Track if first click is done
        
        // Initialize the map
        this.initMap();
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    /**
     * Initialize the map
     */
    initMap() {
        try {
            // Create map with default settings
            this.map = new maplibregl.Map({
                container: this.mapElementId,
                center: this.config.mapSettings.defaultCenter.reverse(), // MapLibre uses [lng, lat] format
                zoom: this.config.mapSettings.defaultZoom,
                style: this.getMapStyle(this.config.mapSettings.defaultBasemap)
            });
            
            // Add navigation control
            this.map.addControl(new maplibregl.NavigationControl({        visualizePitch: true,
        visualizeRoll: false,
        showZoom: true,
        showCompass: false
			}), 'top-right');
            
            // Initialize map after it loads
            this.map.on('load', () => {
                this.initDrawingSources();
                this.mapReady = true;
                console.log('Map is fully loaded and ready');
            });
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }
    
    /**
     * Get the map style based on the basemap name
     * @param {string} basemapName - Name of the basemap
     * @returns {Object} - MapLibre style object
     */
    getMapStyle(basemapName) {
        // Get basemap config or use default if not found
        const basemapConfig = this.config.mapSettings.basemapOptions[basemapName] || 
                            this.config.mapSettings.basemapOptions.Dark;
        
        // Create a MapLibre style object
        return {
            version: 8,
            sources: {
                'raster-tiles': {
                    type: 'raster',
                    tiles: [basemapConfig.url.replace('{s}', 'a')],
                    tileSize: 256,
                    attribution: basemapConfig.attribution
                }
            },
            layers: [
                {
                    id: 'basemap',
                    type: 'raster',
                    source: 'raster-tiles',
                    minzoom: 0,
                    maxzoom: 19
                }
            ]
        };
    }
    
    /**
     * Initialize drawing sources and layers
     */
    initDrawingSources() {
        try {
            // Add source for the bounding box
            this.map.addSource(this.boxSourceId, {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[]]
                    }
                }
            });
            
            // Add fill layer for the bounding box
            this.map.addLayer({
                id: this.boxLayerId,
                type: 'fill',
                source: this.boxSourceId,
                paint: {
                    'fill-color': '#2196F3',
                    'fill-opacity': 0.1
                }
            });
            
            // Add outline layer for the bounding box
            this.map.addLayer({
                id: this.boxOutlineLayerId,
                type: 'line',
                source: this.boxSourceId,
                paint: {
                    'line-color': '#2196F3',
                    'line-width': 2
                }
            });
            
            console.log('Drawing sources and layers initialized');
        } catch (error) {
            console.error('Error initializing drawing sources:', error);
        }
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Theme change event
        document.addEventListener('themeChange', (event) => {
            if (event.detail && event.detail.theme) {
                this.setBasemap(event.detail.theme);
            }
        });
        
        // Map drawing events
        if (this.map) {
            // Mouse down event - start or complete drawing
            this.map.on('click', (e) => {
                if (!this.isDrawing) return;
                
                if (!this.firstClickComplete) {
                    // First click - begin drawing
                    this.startPoint = [e.lngLat.lng, e.lngLat.lat];
                    this.firstClickComplete = true;
                    
                    // Initialize the box with the starting point
                    this.updateBox(this.startPoint, this.startPoint);
                    
                    console.log('First click at:', this.startPoint);
                } else {
                    // Second click - complete drawing
                    const endPoint = [e.lngLat.lng, e.lngLat.lat];
                    
                    // Update the box with final coordinates
                    this.updateBox(this.startPoint, endPoint);
                    
                    // Calculate the bounding box
                    const minX = Math.min(this.startPoint[0], endPoint[0]);
                    const minY = Math.min(this.startPoint[1], endPoint[1]);
                    const maxX = Math.max(this.startPoint[0], endPoint[0]);
                    const maxY = Math.max(this.startPoint[1], endPoint[1]);
                    
                    const bbox = [minX, minY, maxX, maxY];
                    
                    // Dispatch event with bbox
                    document.dispatchEvent(new CustomEvent('bboxDrawn', { 
                        detail: { 
                            bbox,
                            bounds: [[minX, minY], [maxX, maxY]]
                        } 
                    }));
                    
                    // Reset drawing state
                    this.isDrawing = false;
                    this.firstClickComplete = false;
                    this.map.getCanvas().style.cursor = '';
                    
                    // Log the bbox for debugging
                    console.log('Drawn bbox:', bbox);
                }
            });
            
            // Mouse move event - update drawing preview
            this.map.on('mousemove', (e) => {
                if (!this.isDrawing || !this.firstClickComplete) return;
                
                // Update the box preview with current mouse position
                this.updateBox(this.startPoint, [e.lngLat.lng, e.lngLat.lat]);
            });
            
            // Key press event - cancel drawing with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isDrawing) {
                    this.clearDrawings();
                    this.isDrawing = false;
                    this.firstClickComplete = false;
                    this.startPoint = null;
                    this.map.getCanvas().style.cursor = '';
                }
            });
        }
        
        // Clear map drawings event
        document.addEventListener('clearMapDrawings', () => {
            this.clearDrawings();
        });
        
        // Expand tools panel event
        document.addEventListener('expandToolsPanel', () => {
            const toolsPanel = document.getElementById('tools-panel');
            if (toolsPanel && toolsPanel.classList.contains('collapsed')) {
                document.getElementById('tools-header').click();
            }
        });
        
        // Direct image URL loading
        const loadImageBtn = document.getElementById('load-image-btn');
        if (loadImageBtn) {
            loadImageBtn.addEventListener('click', () => {
                this.loadImageFromDirectUrl();
            });
            
            // Also allow pressing Enter in the input field
            const directUrlInput = document.getElementById('direct-image-url');
            if (directUrlInput) {
                directUrlInput.addEventListener('keypress', (event) => {
                    if (event.key === 'Enter') {
                        this.loadImageFromDirectUrl();
                    }
                });
            }
        }
    }
    
    /**
     * Update the bounding box on the map
     * @param {Array} start - Start point [lng, lat]
     * @param {Array} end - End point [lng, lat]
     */
    updateBox(start, end) {
        if (!this.map || !this.map.getSource(this.boxSourceId)) return;
        
        // Create a rectangle from the start and end points
        const coordinates = [
            [start[0], start[1]],
            [end[0], start[1]],
            [end[0], end[1]],
            [start[0], end[1]],
            [start[0], start[1]] // Close the polygon
        ];
        
        // Update the source data
        this.map.getSource(this.boxSourceId).setData({
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [coordinates]
            }
        });
    }
    
    /**
     * Set the basemap
     * @param {string} basemapName - Name of the basemap to use
     */
    setBasemap(basemapName) {
        // Get the new style
        const newStyle = this.getMapStyle(basemapName);
        
        // Update the map style
        this.map.setStyle(newStyle);
        
        // Re-initialize drawing sources after style change
        this.map.once('styledata', () => {
            this.initDrawingSources();
        });
    }
    
    /**
     * Start the bounding box drawing mode
     */
    startDrawingBbox() {
        try {
            // Check if map is ready
            if (!this.map) {
                console.error('Map is not initialized');
                return;
            }
            
            if (!this.mapReady) {
                console.error('Map is not fully loaded yet');
                alert('The map is still loading. Please try again in a moment.');
                return;
            }
            
            // Clear any existing drawings
            this.clearDrawings();
            
            // Set drawing state
            this.isDrawing = true;
            this.startPoint = null;
            this.firstClickComplete = false;
            
            // Set cursor to crosshair
            this.map.getCanvas().style.cursor = 'crosshair';
            
            console.log('Drawing mode activated in MapManager');
        } catch (error) {
            console.error('Error starting drawing mode:', error);
            alert('An error occurred while activating drawing mode. Please try again.');
        }
    }
    
    /**
     * Clear all drawings from the map
     */
    clearDrawings() {
        try {
            // Reset drawing state
            this.isDrawing = false;
            this.startPoint = null;
            this.firstClickComplete = false;
            
            // Clear the bounding box
            if (this.map && this.map.getSource(this.boxSourceId)) {
                this.map.getSource(this.boxSourceId).setData({
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[]]
                    }
                });
            }
            
            // Clear bbox input field
            const bboxInput = document.getElementById('bbox-input');
            if (bboxInput) {
                bboxInput.value = '';
            }
            
            // Reset cursor
            if (this.map && this.map.getCanvas()) {
                this.map.getCanvas().style.cursor = '';
            }
            
            console.log('Cleared all drawings');
        } catch (error) {
            console.error('Error clearing drawings:', error);
        }
    }
    
    /**
     * Update the map view from a bounding box input
     * @param {string} bboxString - Comma-separated bounding box string (west,south,east,north)
     */
    updateBBoxFromInput(bboxString) {
        try {
            // Parse the bbox string
            const bbox = bboxString.split(',').map(Number);
            
            // Validate
            if (bbox.length !== 4 || bbox.some(isNaN)) {
                throw new Error('Invalid bbox format');
            }
            
            // Clear existing drawings
            this.clearDrawings();
            
            // Create a rectangle for the bbox
            const coordinates = [
                [bbox[0], bbox[3]], // Northwest
                [bbox[2], bbox[3]], // Northeast
                [bbox[2], bbox[1]], // Southeast
                [bbox[0], bbox[1]], // Southwest
                [bbox[0], bbox[3]]  // Close the polygon
            ];
            
            // Update the source data
            if (this.map && this.map.getSource(this.boxSourceId)) {
                this.map.getSource(this.boxSourceId).setData({
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [coordinates]
                    }
                });
            }
            
            // Fit map to the bbox
            this.fitMapToBbox(bbox);
            
            console.log('Updated bbox from input:', bbox);
            
            // Dispatch event with bbox
            document.dispatchEvent(new CustomEvent('bboxDrawn', { 
                detail: { 
                    bbox,
                    bounds: [[bbox[0], bbox[1]], [bbox[2], bbox[3]]]
                } 
            }));
        } catch (error) {
            console.error('Error updating bbox from input:', error);
        }
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
     * Get bounding box from item
     * @param {Object} item - STAC item
     * @returns {Array|null} - Bounding box [west, south, east, north] or null
     */
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
     * Add GeoJSON layer without tooltip
     * @param {Array} bbox - Bounding box
     * @param {Object} item - STAC item
     */
    addGeoJsonLayerWithoutTooltip(bbox, item) {
        // Just show the bounding box outline without any tooltip
        this.addGeoJsonLayer({
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
     * Add GeoJSON layer to map
     * @param {Object} geojson - GeoJSON object
     * @param {string} sourceId - Source ID
     */
    addGeoJsonLayer(geojson, sourceId = 'item-geometry') {
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
        
        // Add fill layer
        this.map.addLayer({
            id: `${sourceId}-fill`,
            type: 'fill',
            source: sourceId,
            paint: {
                'fill-color': '#2196F3',
                'fill-opacity': 0.1
            }
        });
        
        // Add line layer
        this.map.addLayer({
            id: `${sourceId}-line`,
            type: 'line',
            source: sourceId,
            paint: {
                'line-color': '#2196F3',
                'line-width': 2
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
}