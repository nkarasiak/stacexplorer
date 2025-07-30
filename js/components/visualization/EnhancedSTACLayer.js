/**
 * EnhancedSTACLayer - Advanced STAC tile rendering with Deck.gl
 * 
 * Provides optimized rendering for large STAC datasets using GPU acceleration
 */

// Use global Deck.gl objects from CDN
const { TileLayer, BitmapLayer } = deck;

/**
 * Custom STAC tile layer with enhanced features
 */
export class STACTileLayer extends TileLayer {
    constructor(props) {
        super({
            ...props,
            id: props.id || 'stac-tile-layer',
            
            // Enhanced tile settings
            maxRequests: 8,
            maxCacheSize: 100,
            refinementStrategy: 'best-available',
            
            // Performance optimizations
            updateTriggers: {
                getTileData: props.updateTriggers?.getTileData
            }
        });
    }

    renderSubLayers(props) {
        const { bbox, data, tile } = props;
        
        if (!data) return null;

        const { west, south, east, north } = bbox;
        
        return new BitmapLayer(props, {
            data: null,
            image: data,
            bounds: [west, south, east, north],
            
            // Enhanced rendering
            textureParameters: {
                [WebGL2RenderingContext.TEXTURE_MIN_FILTER]: WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR,
                [WebGL2RenderingContext.TEXTURE_MAG_FILTER]: WebGL2RenderingContext.LINEAR,
            },
            
            // Error handling
            onError: (error) => {
            }
        });
    }
}

/**
 * STAC Collection visualization manager
 */
export class STACCollectionVisualization {
    constructor(deckGLIntegration) {
        this.deckGL = deckGLIntegration;
        this.activeLayers = new Map();
        this.loadedCollections = new Set();
    }

    /**
     * Add STAC collection as tiled layer
     * @param {Object} collection - STAC collection
     * @param {Object} options - Visualization options
     */
    async addCollection(collection, options = {}) {
        try {

            // Check if collection has tile endpoints
            const tileEndpoint = this.findTileEndpoint(collection);
            if (!tileEndpoint) {
                return this.addCollectionAsItems(collection, options);
            }

            // Create tile layer
            const layer = new STACTileLayer({
                id: `collection-${collection.id}`,
                data: tileEndpoint,
                
                // Tile configuration
                getTileData: (tile) => this.loadTile(tile, collection, options),
                
                // Rendering options
                opacity: options.opacity || 0.8,
                visible: options.visible !== false,
                
                // Performance settings
                maxZoom: options.maxZoom || 18,
                minZoom: options.minZoom || 0,
                
                updateTriggers: {
                    getTileData: [collection.id, options.timeRange, options.filters]
                }
            });

            // Add to Deck.gl
            this.deckGL.layers.set(`collection-${collection.id}`, layer);
            this.deckGL.updateLayers();
            
            // Track loaded collection
            this.loadedCollections.add(collection.id);
            this.activeLayers.set(collection.id, layer);

            return true;

        } catch (error) {
            return false;
        }
    }

    /**
     * Find tile endpoint in collection
     * @param {Object} collection - STAC collection
     * @returns {string|null} Tile endpoint URL
     */
    findTileEndpoint(collection) {
        // Check for common tile endpoint patterns
        const links = collection.links || [];
        
        // Look for tile endpoints
        for (const link of links) {
            if (link.rel === 'tiles' || 
                link.rel === 'wmts' || 
                link.type?.includes('tiles')) {
                return link.href;
            }
        }

        // Check assets for tile templates
        const assets = collection.assets || {};
        for (const [key, asset] of Object.entries(assets)) {
            if (key.includes('tile') || 
                asset.type?.includes('tiles') ||
                asset.href?.includes('{z}/{x}/{y}')) {
                return asset.href;
            }
        }

        return null;
    }

    /**
     * Load individual tile
     * @param {Object} tile - Tile object
     * @param {Object} collection - STAC collection
     * @param {Object} options - Options
     */
    async loadTile(tile, collection, options) {
        const { x, y, z } = tile.index;
        
        try {
            // Build tile URL
            let tileUrl = collection.tileEndpoint
                .replace('{z}', z)
                .replace('{x}', x)
                .replace('{y}', y);

            // Add query parameters for filtering
            if (options.timeRange) {
                const params = new URLSearchParams();
                params.set('datetime', `${options.timeRange.start}/${options.timeRange.end}`);
                tileUrl += `?${params.toString()}`;
            }

            // Load tile image
            const response = await fetch(tileUrl);
            if (!response.ok) {
                throw new Error(`Tile request failed: ${response.status}`);
            }

            const blob = await response.blob();
            return URL.createObjectURL(blob);

        } catch (error) {
            return null;
        }
    }

    /**
     * Add collection as individual items (fallback)
     * @param {Object} collection - STAC collection
     * @param {Object} options - Options
     */
    async addCollectionAsItems(collection, options) {
        // This would implement item-by-item rendering
        // for collections without tile endpoints
        return false;
    }

    /**
     * Remove collection layer
     * @param {string} collectionId - Collection ID
     */
    removeCollection(collectionId) {
        if (this.activeLayers.has(collectionId)) {
            this.deckGL.removeLayer(`collection-${collectionId}`);
            this.activeLayers.delete(collectionId);
            this.loadedCollections.delete(collectionId);
        }
    }

    /**
     * Update collection visibility
     * @param {string} collectionId - Collection ID
     * @param {boolean} visible - Visibility
     */
    setCollectionVisibility(collectionId, visible) {
        const layer = this.activeLayers.get(collectionId);
        if (layer) {
            const updatedLayer = layer.clone({ visible });
            this.deckGL.layers.set(`collection-${collectionId}`, updatedLayer);
            this.deckGL.updateLayers();
        }
    }

    /**
     * Update collection opacity
     * @param {string} collectionId - Collection ID  
     * @param {number} opacity - Opacity (0-1)
     */
    setCollectionOpacity(collectionId, opacity) {
        const layer = this.activeLayers.get(collectionId);
        if (layer) {
            const updatedLayer = layer.clone({ opacity });
            this.deckGL.layers.set(`collection-${collectionId}`, updatedLayer);
            this.deckGL.updateLayers();
        }
    }

    /**
     * Get loaded collections
     * @returns {Array} Array of loaded collection IDs
     */
    getLoadedCollections() {
        return Array.from(this.loadedCollections);
    }

    /**
     * Clear all collections
     */
    clearAllCollections() {
        for (const collectionId of this.loadedCollections) {
            this.removeCollection(collectionId);
        }
    }
}

/**
 * Enhanced STAC item renderer with performance optimizations
 */
export class EnhancedSTACRenderer {
    constructor(deckGLIntegration) {
        this.deckGL = deckGLIntegration;
        this.itemCache = new Map();
        this.loadingItems = new Set();
    }

    /**
     * Render STAC item with advanced options
     * @param {Object} item - STAC item
     * @param {Object} options - Rendering options
     */
    async renderItem(item, options = {}) {
        const itemId = item.id;
        
        // Check cache first
        if (this.itemCache.has(itemId) && !options.forceReload) {
            return this.itemCache.get(itemId);
        }

        // Prevent duplicate loading
        if (this.loadingItems.has(itemId)) {
            return null;
        }

        this.loadingItems.add(itemId);

        try {
            // Enhanced asset selection
            const asset = this.selectBestAsset(item, options);
            if (!asset) {
                throw new Error('No suitable asset found for rendering');
            }

            // Optimized rendering based on asset type
            let renderResult;
            if (this.isCOGAsset(asset)) {
                renderResult = await this.renderCOGAsset(item, asset, options);
            } else if (this.isImageAsset(asset)) {
                renderResult = await this.renderImageAsset(item, asset, options);
            } else {
                throw new Error(`Unsupported asset type: ${asset.type}`);
            }

            // Cache the result
            this.itemCache.set(itemId, renderResult);
            
            return renderResult;

        } catch (error) {
            return null;
        } finally {
            this.loadingItems.delete(itemId);
        }
    }

    /**
     * Select best asset for rendering
     * @param {Object} item - STAC item
     * @param {Object} options - Options
     */
    selectBestAsset(item, options) {
        const assets = item.assets || {};
        
        // Priority order for asset selection
        const assetPriority = [
            'rendered_preview',
            'thumbnail',
            'preview',
            'overview',
            'visual',
            'data'
        ];

        // If specific asset requested
        if (options.assetKey && assets[options.assetKey]) {
            return assets[options.assetKey];
        }

        // Find best asset by priority
        for (const assetKey of assetPriority) {
            if (assets[assetKey]) {
                return assets[assetKey];
            }
        }

        // Fallback to first available asset
        const assetKeys = Object.keys(assets);
        return assetKeys.length > 0 ? assets[assetKeys[0]] : null;
    }

    /**
     * Check if asset is Cloud Optimized GeoTIFF
     * @param {Object} asset - Asset object
     */
    isCOGAsset(asset) {
        return asset.type?.includes('geotiff') ||
               asset.type?.includes('cloud-optimized') ||
               asset.href?.includes('.tif');
    }

    /**
     * Check if asset is regular image
     * @param {Object} asset - Asset object
     */
    isImageAsset(asset) {
        return asset.type?.startsWith('image/') &&
               !this.isCOGAsset(asset);
    }

    /**
     * Render COG asset with tiling
     * @param {Object} item - STAC item
     * @param {Object} asset - COG asset
     * @param {Object} options - Options
     */
    async renderCOGAsset(item, asset, options) {
        
        // Use TileLayer for COG rendering
        const layer = new TileLayer({
            id: `cog-${item.id}`,
            data: this.buildCOGTileUrl(asset.href),
            
            getTileData: (tile) => this.loadCOGTile(tile, asset, options),
            
            // COG-specific settings
            maxZoom: 18,
            minZoom: 0,
            tileSize: 256,
            
            renderSubLayers: (props) => {
                return new BitmapLayer(props, {
                    data: null,
                    image: props.tile.data,
                    bounds: [
                        props.tile.bbox.west,
                        props.tile.bbox.south,
                        props.tile.bbox.east,
                        props.tile.bbox.north
                    ]
                });
            }
        });

        return layer;
    }

    /**
     * Render regular image asset
     * @param {Object} item - STAC item
     * @param {Object} asset - Image asset
     * @param {Object} options - Options
     */
    async renderImageAsset(item, asset, options) {
        
        const bbox = this.deckGL.mapManager.getBoundingBox(item);
        if (!bbox) {
            throw new Error('No bounding box available for item');
        }

        const layer = new BitmapLayer({
            id: `image-${item.id}`,
            image: asset.href,
            bounds: [bbox[0], bbox[1], bbox[2], bbox[3]],
            
            // Enhanced image rendering
            opacity: options.opacity || 0.8,
            desaturate: options.desaturate || 0,
            transparentColor: options.transparentColor || null,
            
            // Performance optimizations
            textureParameters: {
                [WebGL2RenderingContext.TEXTURE_MIN_FILTER]: WebGL2RenderingContext.LINEAR,
                [WebGL2RenderingContext.TEXTURE_MAG_FILTER]: WebGL2RenderingContext.LINEAR,
            }
        });

        return layer;
    }

    /**
     * Build COG tile URL template
     * @param {string} cogUrl - COG URL
     */
    buildCOGTileUrl(cogUrl) {
        // This would integrate with a COG tile server
        // For now, return the base URL
        return cogUrl;
    }

    /**
     * Load COG tile
     * @param {Object} tile - Tile object
     * @param {Object} asset - COG asset
     * @param {Object} options - Options
     */
    async loadCOGTile(tile, asset, options) {
        // Implementation would load specific COG tile
        // This is a placeholder for COG tile loading
        return null;
    }

    /**
     * Clear item cache
     */
    clearCache() {
        this.itemCache.clear();
    }
}

export default {
    STACTileLayer,
    STACCollectionVisualization,
    EnhancedSTACRenderer
};