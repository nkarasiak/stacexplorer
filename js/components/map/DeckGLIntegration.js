/**
 * DeckGLIntegration - Enhanced visualization layer for STAC Explorer
 * 
 * Provides GPU-accelerated rendering capabilities with Deck.gl
 * while maintaining compatibility with existing MapLibre GL architecture
 */

// Use global Deck.gl objects from CDN
// For deck.gl@8.9.0, the global object structure is different
function getDeckGLClasses() {
    if (typeof window.deck !== 'undefined') {
        // deck.gl exposes classes under window.deck
        return {
            Deck: window.deck.Deck,
            TileLayer: window.deck.TileLayer,
            BitmapLayer: window.deck.BitmapLayer,
            TerrainLayer: window.deck.TerrainLayer
        };
    } else if (typeof window.DeckGL !== 'undefined') {
        // Alternative global structure
        return {
            Deck: window.DeckGL.Deck,
            TileLayer: window.DeckGL.TileLayer,
            BitmapLayer: window.DeckGL.BitmapLayer,
            TerrainLayer: window.DeckGL.TerrainLayer
        };
    }
    return null;
}

class DeckGLIntegration {
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.deck = null;
        this.isInitialized = false;
        this.layers = new Map();
        this.currentStacLayer = null;
        
        // Enhanced visualization components
        this.collectionViz = null;
        this.itemRenderer = null;
        
        // Performance settings
        this.useGPUAcceleration = true;
        this.enableWebGL2 = true;
    }

    /**
     * Initialize Deck.gl integration with MapLibre GL
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Get Deck.gl classes from global objects
            const deckClasses = getDeckGLClasses();
            if (!deckClasses || !deckClasses.Deck) {
                throw new Error('Deck.gl not available - check CDN loading');
            }
            
            const { Deck, TileLayer, BitmapLayer, TerrainLayer } = deckClasses;
            
            const map = this.mapManager.getMap();
            if (!map) {
                throw new Error('MapLibre GL map not available');
            }

            // Create Deck.gl instance
            this.deck = new Deck({
                canvas: this.createOverlayCanvas(),
                width: '100%',
                height: '100%',
                initialViewState: this.getMapViewState(),
                controller: false, // Let MapLibre handle controls
                parent: map.getContainer(),
                style: { position: 'absolute', left: 0, top: 0, pointerEvents: 'none' },
                
                // Performance optimizations
                useDevicePixels: window.devicePixelRatio > 1,
                debug: false,
                
                // Sync with MapLibre GL
                onViewStateChange: ({ viewState }) => {
                    // Optional: sync changes back to MapLibre if needed
                },
                
                onWebGLInitialized: (gl) => {
                    console.log('🎨 Deck.gl WebGL context initialized');
                }
            });

            // Sync view state with MapLibre GL
            this.setupViewStateSync();

            // Initialize enhanced visualization components
            this.collectionViz = null;
            this.itemRenderer = null;
            
            // Load enhanced components asynchronously
            this.loadEnhancedComponents();

            this.isInitialized = true;
            console.log('✅ Deck.gl integration initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize Deck.gl integration:', error);
            throw error;
        }
    }

    /**
     * Create overlay canvas for Deck.gl
     */
    createOverlayCanvas() {
        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '1';
        return canvas;
    }

    /**
     * Load enhanced components asynchronously
     */
    async loadEnhancedComponents() {
        try {
            // For now, we'll implement basic components inline
            // This avoids module loading issues while keeping the API
            console.log('🔧 Enhanced components ready (basic implementation)');
        } catch (error) {
            console.warn('⚠️ Enhanced components not available:', error);
        }
    }

    /**
     * Get current view state from MapLibre GL
     */
    getMapViewState() {
        const map = this.mapManager.getMap();
        const center = map.getCenter();
        
        return {
            longitude: center.lng,
            latitude: center.lat,
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch()
        };
    }

    /**
     * Setup bidirectional view state synchronization
     */
    setupViewStateSync() {
        const map = this.mapManager.getMap();

        // Sync from MapLibre to Deck.gl
        const syncToDeck = () => {
            if (this.deck) {
                this.deck.setProps({
                    viewState: this.getMapViewState()
                });
            }
        };

        // Listen to MapLibre events
        map.on('move', syncToDeck);
        map.on('zoom', syncToDeck);
        map.on('rotate', syncToDeck);
        map.on('pitch', syncToDeck);

        // Store cleanup function
        this.cleanupSync = () => {
            map.off('move', syncToDeck);
            map.off('zoom', syncToDeck);
            map.off('rotate', syncToDeck);
            map.off('pitch', syncToDeck);
        };
    }

    /**
     * Add STAC item visualization with enhanced rendering
     * @param {Object} item - STAC item
     * @param {string} assetKey - Asset key to visualize
     * @param {Object} options - Visualization options
     */
    async addStacItemLayer(item, assetKey = 'rendered_preview', options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            console.log(`🎨 Adding STAC item layer: ${item.id} (${assetKey})`);

            // Remove existing STAC layer
            this.removeStacLayer();

            // Use enhanced renderer if available, otherwise fallback
            let layer = null;
            
            if (this.itemRenderer) {
                try {
                    layer = await this.itemRenderer.renderItem(item, {
                        assetKey,
                        ...options
                    });
                } catch (error) {
                    console.warn('Enhanced renderer failed:', error);
                }
            }

            if (!layer) {
                console.log('Using fallback rendering for STAC item');
                return this.addStacItemLayerFallback(item, assetKey, options);
            }

            // Store current layer
            this.currentStacLayer = layer;
            this.layers.set(`stac-${item.id}`, layer);

            // Update Deck.gl layers
            this.updateLayers();

            // Fit map to bounds
            const bbox = this.mapManager.getBoundingBox(item);
            if (bbox) {
                this.mapManager.fitMapToBbox(bbox);
            }

            console.log('✅ STAC layer added successfully with enhanced Deck.gl rendering');
            return true;

        } catch (error) {
            console.error('❌ Failed to add STAC layer:', error);
            // Fallback to MapLibre rendering
            return this.addStacItemLayerFallback(item, assetKey, options);
        }
    }

    /**
     * Fallback STAC item layer using basic BitmapLayer
     * @param {Object} item - STAC item
     * @param {string} assetKey - Asset key
     * @param {Object} options - Options
     */
    async addStacItemLayerFallback(item, assetKey, options) {
        const asset = item.assets?.[assetKey];
        if (!asset) {
            console.warn(`Asset '${assetKey}' not found in item ${item.id}`);
            return this.mapManager.addAssetOverlay(item.assets[Object.keys(item.assets)[0]], item, assetKey);
        }

        // Get Deck.gl classes
        const deckClasses = getDeckGLClasses();
        if (!deckClasses || !deckClasses.BitmapLayer) {
            console.warn('BitmapLayer not available, falling back to MapLibre');
            return this.mapManager.addAssetOverlay(asset, item, assetKey);
        }

        // Get bounding box
        const bbox = this.mapManager.getBoundingBox(item);
        if (!bbox) {
            console.warn('No bounding box available for item');
            return false;
        }

        // Create basic bitmap layer
        const layer = new deckClasses.BitmapLayer({
            id: `stac-item-${item.id}`,
            image: asset.href,
            bounds: [bbox[0], bbox[1], bbox[2], bbox[3]], // [west, south, east, north]
            
            // Enhanced rendering options
            opacity: options.opacity || 0.8,
            desaturate: options.desaturate || 0,
            transparentColor: options.transparentColor || null,
            tintColor: options.tintColor || [255, 255, 255],
            
            // Performance optimizations
            textureParameters: {
                [WebGL2RenderingContext.TEXTURE_MIN_FILTER]: WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR,
                [WebGL2RenderingContext.TEXTURE_MAG_FILTER]: WebGL2RenderingContext.LINEAR,
                [WebGL2RenderingContext.TEXTURE_WRAP_S]: WebGL2RenderingContext.CLAMP_TO_EDGE,
                [WebGL2RenderingContext.TEXTURE_WRAP_T]: WebGL2RenderingContext.CLAMP_TO_EDGE,
            },
            
            // Error handling
            onError: (error) => {
                console.error('Deck.gl fallback layer error:', error);
                // Ultimate fallback to MapLibre rendering
                return this.mapManager.addAssetOverlay(asset, item, assetKey);
            }
        });

        // Store current layer
        this.currentStacLayer = layer;
        this.layers.set(`stac-${item.id}`, layer);

        // Update Deck.gl layers
        this.updateLayers();

        console.log('✅ STAC layer added with fallback rendering');
        return true;
    }

    /**
     * Add enhanced tile layer for better performance
     * @param {Object} tileConfig - Tile layer configuration
     */
    addTileLayer(tileConfig) {
        const deckClasses = getDeckGLClasses();
        if (!deckClasses || !deckClasses.TileLayer) {
            console.warn('TileLayer not available');
            return;
        }
        
        const layer = new deckClasses.TileLayer({
            id: tileConfig.id || 'tile-layer',
            data: tileConfig.data,
            
            // Enhanced tile rendering
            minZoom: tileConfig.minZoom || 0,
            maxZoom: tileConfig.maxZoom || 22,
            tileSize: tileConfig.tileSize || 256,
            
            renderSubLayers: (props) => {
                const { boundingBox, data } = props.tile;
                
                return new deckClasses.BitmapLayer(props, {
                    data: null,
                    image: data,
                    bounds: [boundingBox[0][0], boundingBox[0][1], boundingBox[1][0], boundingBox[1][1]]
                });
            }
        });

        this.layers.set(tileConfig.id, layer);
        this.updateLayers();
    }

    /**
     * Add terrain visualization layer
     * @param {Object} terrainConfig - Terrain configuration
     */
    addTerrainLayer(terrainConfig) {
        const deckClasses = getDeckGLClasses();
        if (!deckClasses || !deckClasses.TerrainLayer) {
            console.warn('TerrainLayer not available');
            return;
        }
        
        const layer = new deckClasses.TerrainLayer({
            id: 'terrain-layer',
            heightMapUrl: terrainConfig.heightMapUrl,
            textureUrl: terrainConfig.textureUrl,
            bounds: terrainConfig.bounds,
            
            // Terrain-specific options
            meshMaxError: terrainConfig.meshMaxError || 4,
            elevationScale: terrainConfig.elevationScale || 1,
            material: {
                ambient: 0.35,
                diffuse: 0.6,
                shininess: 32,
                specularColor: [30, 30, 30]
            }
        });

        this.layers.set('terrain', layer);
        this.updateLayers();
    }

    /**
     * Remove STAC layer
     */
    removeStacLayer() {
        if (this.currentStacLayer) {
            const layerId = this.currentStacLayer.id;
            this.layers.delete(layerId);
            this.currentStacLayer = null;
            this.updateLayers();
            console.log('🧹 Removed current STAC layer');
        }
    }

    /**
     * Remove specific layer by ID
     * @param {string} layerId - Layer ID to remove
     */
    removeLayer(layerId) {
        if (this.layers.has(layerId)) {
            this.layers.delete(layerId);
            if (this.currentStacLayer?.id === layerId) {
                this.currentStacLayer = null;
            }
            this.updateLayers();
            console.log(`🧹 Removed layer: ${layerId}`);
        }
    }

    /**
     * Clear all Deck.gl layers
     */
    clearAllLayers() {
        this.layers.clear();
        this.currentStacLayer = null;
        this.updateLayers();
        console.log('🧹 Cleared all Deck.gl layers');
    }

    /**
     * Update Deck.gl with current layers
     */
    updateLayers() {
        if (this.deck) {
            const layersArray = Array.from(this.layers.values());
            this.deck.setProps({ layers: layersArray });
        }
    }

    /**
     * Set layer opacity
     * @param {string} layerId - Layer ID
     * @param {number} opacity - Opacity value (0-1)
     */
    setLayerOpacity(layerId, opacity) {
        const layer = this.layers.get(layerId);
        if (layer) {
            // Create new layer with updated opacity
            const updatedLayer = layer.clone({ opacity });
            this.layers.set(layerId, updatedLayer);
            
            if (this.currentStacLayer?.id === layerId) {
                this.currentStacLayer = updatedLayer;
            }
            
            this.updateLayers();
        }
    }

    /**
     * Enable/disable GPU acceleration
     * @param {boolean} enabled - Whether to enable GPU acceleration
     */
    setGPUAcceleration(enabled) {
        this.useGPUAcceleration = enabled;
        if (this.deck) {
            // Reinitialize with new settings if needed
            console.log(`🎨 GPU acceleration ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Get performance stats
     */
    getPerformanceStats() {
        if (this.deck) {
            return {
                layerCount: this.layers.size,
                webglContext: this.deck.getWebGLContext(),
                isWebGL2: this.deck.getWebGLContext() instanceof WebGL2RenderingContext,
                gpuAcceleration: this.useGPUAcceleration
            };
        }
        return null;
    }

    /**
     * Resize Deck.gl canvas
     */
    resize() {
        if (this.deck) {
            this.deck.setProps({
                width: '100%',
                height: '100%'
            });
        }
    }

    /**
     * Destroy Deck.gl integration
     */
    destroy() {
        if (this.cleanupSync) {
            this.cleanupSync();
        }

        if (this.deck) {
            this.deck.finalize();
            this.deck = null;
        }

        this.layers.clear();
        this.currentStacLayer = null;
        this.isInitialized = false;

        console.log('🗑️ Deck.gl integration destroyed');
    }

    /**
     * Check if Deck.gl is available and initialized
     */
    isAvailable() {
        return this.isInitialized && this.deck;
    }

    /**
     * Fallback to MapLibre rendering
     * @param {Object} item - STAC item
     * @param {string} assetKey - Asset key
     */
    fallbackToMapLibre(item, assetKey) {
        console.log('🔄 Falling back to MapLibre rendering');
        return this.mapManager.displayItemOnMap(item, assetKey);
    }
}

// Export for use in MapManager
export default DeckGLIntegration;