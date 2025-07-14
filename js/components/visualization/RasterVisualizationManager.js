/**
 * RasterVisualizationManager.js - Manages STAC raster visualization on MapLibre GL maps
 * 
 * Integrates with TiTiler.xyz for dynamic raster visualization with different band combinations
 * Provides seamless map integration for STAC items with multiple visualization presets
 */

import { defaultBandEngine } from './BandCombinationEngine.js';

export class RasterVisualizationManager {
    constructor(mapManager, bandEngine = defaultBandEngine) {
        this.mapManager = mapManager;
        this.bandEngine = bandEngine;
        this.currentLayers = new Map();
        this.layerOpacities = new Map();
        this.layerBlendModes = new Map();
        
        // Layer management
        this.maxLayers = 3; // Prevent too many layers from slowing down the map
        this.defaultOpacity = 0.8;
        
        console.log('🎨 RasterVisualizationManager initialized with TiTiler.xyz');
    }

    /**
     * Add a STAC item as a raster layer on the map
     * @param {Object} stacItem - STAC item object
     * @param {string} preset - Visualization preset key
     * @param {Object} options - Additional options
     * @returns {Promise<string>} Layer ID for management
     */
    async addSTACItemLayer(stacItem, preset = 'true-color', options = {}) {
        try {
            const layerId = `stac-${stacItem.id}-${preset}-${Date.now()}`;
            
            // Check layer limit
            if (this.currentLayers.size >= this.maxLayers) {
                console.warn(`⚠️ Maximum ${this.maxLayers} layers reached. Removing oldest layer.`);
                this.removeOldestLayer();
            }

            // Get appropriate presets for collection
            const collectionPresets = this.bandEngine.getPresetsForCollection(stacItem.collection);
            const selectedPreset = collectionPresets[preset];

            if (!selectedPreset) {
                throw new Error(`Preset "${preset}" not available for collection "${stacItem.collection}"`);
            }

            // Create MapLibre layer and source (use direct asset URLs, not STAC item URL)
            const { layerId: actualLayerId, sourceId } = this.createTiTilerLayer(null, selectedPreset, layerId, options, stacItem);

            console.log(`🗺️ [LAYER] MapLibre layer created successfully`);
            
            // Fade in the layer
            this.fadeInMapLibreLayer(layerId, options.opacity || this.defaultOpacity);

            // Store layer information
            this.currentLayers.set(layerId, {
                layerId: layerId,
                sourceId: sourceId,
                item: stacItem,
                preset: preset,
                presetConfig: selectedPreset,
                createdAt: Date.now(),
                visible: true
            });

            this.layerOpacities.set(layerId, options.opacity || this.defaultOpacity);
            this.layerBlendModes.set(layerId, options.blendMode || 'normal');

            // Zoom to item bounds if requested
            if (options.zoomTo !== false && stacItem.bbox) {
                this.zoomToItem(stacItem, options.zoomPadding);
            }

            console.log(`✅ Added STAC layer: ${selectedPreset.name} for ${stacItem.id}`);
            
            // Dispatch event for UI updates
            this.dispatchLayerEvent('layerAdded', { layerId, item: stacItem, preset, presetConfig: selectedPreset });
            
            return layerId;

        } catch (error) {
            console.error('❌ Error adding STAC layer:', error);
            throw error;
        }
    }

    /**
     * Create a TiTiler-powered MapLibre GL raster source and layer
     * @param {string} stacItemUrl - STAC item URL (not used for direct asset access)
     * @param {Object} presetConfig - Preset configuration
     * @param {string} layerId - Layer identifier
     * @param {Object} options - Additional options
     * @param {Object} stacItem - STAC item for direct asset access
     * @returns {string} Layer ID for MapLibre
     */
    createTiTilerLayer(stacItemUrl, presetConfig, layerId, options = {}, stacItem = null) {
        console.log(`🗺️ [LAYER] Creating TiTiler MapLibre layer with ID: ${layerId}`);
        console.log(`🗺️ [LAYER] STAC item:`, stacItem?.id || 'No item provided');
        console.log(`🗺️ [LAYER] Preset config:`, presetConfig);
        console.log(`🗺️ [LAYER] Using direct asset URLs (not STAC item URL)`);
        
        // Build the tile URL template using direct asset URLs
        const urlTemplate = this.bandEngine.buildTileUrl(
            null, // No STAC item URL needed
            presetConfig, 
            '{z}', '{x}', '{y}',
            stacItem  // Pass STAC item for direct asset access
        );

        console.log(`🗺️ [LAYER] Tile URL template: ${urlTemplate}`);

        const sourceId = `${layerId}-source`;

        // Add raster source to MapLibre
        this.mapManager.map.addSource(sourceId, {
            type: 'raster',
            tiles: [urlTemplate],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 18,
            attribution: `${presetConfig.name} | TiTiler.xyz`
        });

        // Add raster layer to MapLibre
        this.mapManager.map.addLayer({
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: {
                'raster-opacity': 0, // Start invisible for fade-in
                'raster-fade-duration': 0 // No fade animation initially
            },
            layout: {
                'visibility': 'visible'
            }
        });

        console.log(`✅ [LAYER] Added MapLibre source: ${sourceId} and layer: ${layerId}`);

        // Set up event monitoring for this layer
        this.setupMapLibreLayerEvents(layerId, sourceId);

        return { layerId, sourceId };
    }

    /**
     * Set up event handlers for MapLibre layer
     * @param {string} layerId - Layer identifier
     * @param {string} sourceId - Source identifier
     */
    setupMapLibreLayerEvents(layerId, sourceId) {
        console.log(`🔗 [MAPLIBRE] Setting up events for layer: ${layerId}, source: ${sourceId}`);

        // Listen for source data events
        this.mapManager.map.on('sourcedata', (e) => {
            if (e.sourceId === sourceId) {
                console.log(`📊 [MAPLIBRE] Source data event for ${sourceId}: type=${e.dataType}, loaded=${e.isSourceLoaded}`);
                
                if (e.isSourceLoaded) {
                    console.log(`✅ [MAPLIBRE] Source ${sourceId} fully loaded - dispatching layerLoaded event`);
                    this.dispatchLayerEvent('layerLoaded', { layerId });
                }
            }
        });

        // Listen for data loading events
        this.mapManager.map.on('dataloading', (e) => {
            if (e.sourceId === sourceId) {
                console.log(`⏳ [MAPLIBRE] Data loading for ${sourceId}, type: ${e.dataType}`);
                this.updateLoadingStatus(layerId, 1, 1); // Simplified for MapLibre
            }
        });

        // Listen for data events (when tiles load)
        this.mapManager.map.on('data', (e) => {
            if (e.sourceId === sourceId && e.dataType === 'source') {
                console.log(`📋 [MAPLIBRE] Data loaded for ${sourceId}`);
                this.updateLoadingStatus(layerId, 0, 1); // Mark as complete
            }
        });

        // Listen for errors
        this.mapManager.map.on('error', (e) => {
            console.warn(`🔴 [MAPLIBRE] Error for source ${sourceId}:`, e.error);
        });
    }

    /**
     * Build STAC item URL for TiTiler
     * @param {Object} stacItem - STAC item object
     * @returns {string} Full STAC item URL
     */
    buildSTACItemUrl(stacItem) {
        console.log(`🔗 [STAC] Building STAC item URL for item:`, stacItem);
        
        // If the item has a self link, use that
        const selfLink = stacItem.links?.find(link => link.rel === 'self');
        if (selfLink?.href) {
            console.log(`🔗 [STAC] Using self link: ${selfLink.href}`);
            return selfLink.href;
        }

        // For rio-tiler/cogeo.xyz, we need to pass the STAC item as base64 encoded JSON
        console.log(`🔗 [STAC] Encoding STAC item as base64 for rio-tiler`);
        const jsonString = JSON.stringify(stacItem);
        const base64Encoded = btoa(jsonString);
        console.log(`🔗 [STAC] Original JSON length: ${jsonString.length}, base64 length: ${base64Encoded.length}`);
        return `data:application/json;base64,${base64Encoded}`;
    }

    /**
     * Change visualization preset for existing layer
     * @param {string} layerId - Layer identifier
     * @param {string} newPreset - New preset key
     * @returns {Promise<string>} New layer ID
     */
    async changeVisualization(layerId, newPreset) {
        const layerInfo = this.currentLayers.get(layerId);
        if (!layerInfo) {
            throw new Error(`Layer ${layerId} not found`);
        }

        // Get current opacity and blend mode
        const opacity = this.layerOpacities.get(layerId);
        const blendMode = this.layerBlendModes.get(layerId);

        // Remove old layer
        this.removeLayer(layerId);

        // Add new layer with same item but different preset
        return this.addSTACItemLayer(layerInfo.item, newPreset, {
            opacity,
            blendMode,
            zoomTo: false // Don't zoom again
        });
    }

    /**
     * Update layer opacity
     * @param {string} layerId - Layer identifier
     * @param {number} opacity - Opacity value (0-1)
     */
    setLayerOpacity(layerId, opacity) {
        const layerInfo = this.currentLayers.get(layerId);
        if (layerInfo && this.mapManager.map.getLayer(layerId)) {
            this.mapManager.map.setPaintProperty(layerId, 'raster-opacity', opacity);
            this.layerOpacities.set(layerId, opacity);
            
            this.dispatchLayerEvent('layerOpacityChanged', { layerId, opacity });
        }
    }

    /**
     * Set layer blend mode (not supported in MapLibre - placeholder for future)
     * @param {string} layerId - Layer identifier  
     * @param {string} blendMode - CSS blend mode
     */
    setLayerBlendMode(layerId, blendMode) {
        console.log(`⚠️ [MAPLIBRE] Blend modes not yet supported in MapLibre GL: ${blendMode}`);
        this.layerBlendModes.set(layerId, blendMode);
        this.dispatchLayerEvent('layerBlendModeChanged', { layerId, blendMode });
    }

    /**
     * Toggle layer visibility
     * @param {string} layerId - Layer identifier
     * @param {boolean} visible - Visibility state
     */
    setLayerVisibility(layerId, visible) {
        const layerInfo = this.currentLayers.get(layerId);
        if (layerInfo && this.mapManager.map.getLayer(layerId)) {
            const visibility = visible ? 'visible' : 'none';
            this.mapManager.map.setLayoutProperty(layerId, 'visibility', visibility);
            layerInfo.visible = visible;
            
            this.dispatchLayerEvent('layerVisibilityChanged', { layerId, visible });
        }
    }

    /**
     * Remove a layer from the map
     * @param {string} layerId - Layer identifier
     */
    removeLayer(layerId) {
        const layerInfo = this.currentLayers.get(layerId);
        if (layerInfo) {
            // Fade out before removing
            this.fadeOutMapLibreLayer(layerId, () => {
                // Remove layer and source from MapLibre
                if (this.mapManager.map.getLayer(layerId)) {
                    this.mapManager.map.removeLayer(layerId);
                }
                if (this.mapManager.map.getSource(layerInfo.sourceId)) {
                    this.mapManager.map.removeSource(layerInfo.sourceId);
                }
            });
            
            // Clean up references
            this.currentLayers.delete(layerId);
            this.layerOpacities.delete(layerId);
            this.layerBlendModes.delete(layerId);
            
            console.log(`🗑️ Removed MapLibre layer: ${layerId} and source: ${layerInfo.sourceId}`);
            this.dispatchLayerEvent('layerRemoved', { layerId });
        }
    }

    /**
     * Remove the oldest layer to make room for new ones
     */
    removeOldestLayer() {
        let oldestLayerId = null;
        let oldestTime = Date.now();

        for (const [layerId, layerInfo] of this.currentLayers) {
            if (layerInfo.createdAt < oldestTime) {
                oldestTime = layerInfo.createdAt;
                oldestLayerId = layerId;
            }
        }

        if (oldestLayerId) {
            this.removeLayer(oldestLayerId);
        }
    }

    /**
     * Clear all STAC layers
     */
    clearAllLayers() {
        const layerIds = Array.from(this.currentLayers.keys());
        layerIds.forEach(layerId => this.removeLayer(layerId));
        
        console.log('🧹 Cleared all STAC visualization layers');
        this.dispatchLayerEvent('allLayersCleared');
    }

    /**
     * Zoom map to STAC item bounds
     * @param {Object} stacItem - STAC item
     * @param {number} padding - Padding around bounds
     */
    zoomToItem(stacItem, padding = 0.1) {
        if (stacItem.bbox && stacItem.bbox.length >= 4) {
            const [west, south, east, north] = stacItem.bbox;
            const bounds = [[south, west], [north, east]];
            
            // Add padding
            const latPadding = (north - south) * padding;
            const lngPadding = (east - west) * padding;
            
            const paddedBounds = [
                [south - latPadding, west - lngPadding],
                [north + latPadding, east + lngPadding]
            ];
            
            this.mapManager.map.fitBounds(paddedBounds, {
                animate: true,
                duration: 1.0
            });
        }
    }

    /**
     * Fade in MapLibre layer with smooth transition
     * @param {string} layerId - Layer identifier
     * @param {number} targetOpacity - Target opacity
     */
    fadeInMapLibreLayer(layerId, targetOpacity = 0.8) {
        if (!this.mapManager.map.getLayer(layerId)) return;
        
        const steps = 20;
        const stepSize = targetOpacity / steps;
        let currentOpacity = 0;
        
        const interval = setInterval(() => {
            currentOpacity += stepSize;
            if (currentOpacity >= targetOpacity) {
                currentOpacity = targetOpacity;
                clearInterval(interval);
            }
            
            if (this.mapManager.map.getLayer(layerId)) {
                this.mapManager.map.setPaintProperty(layerId, 'raster-opacity', currentOpacity);
            } else {
                clearInterval(interval);
            }
        }, 50);
    }

    /**
     * Fade out MapLibre layer with smooth transition
     * @param {string} layerId - Layer identifier
     * @param {Function} callback - Callback after fade completes
     */
    fadeOutMapLibreLayer(layerId, callback) {
        if (!this.mapManager.map.getLayer(layerId)) {
            if (callback) callback();
            return;
        }
        
        const steps = 10;
        const currentOpacity = this.layerOpacities.get(layerId) || 0.8;
        const stepSize = currentOpacity / steps;
        let opacity = currentOpacity;
        
        const interval = setInterval(() => {
            opacity -= stepSize;
            if (opacity <= 0) {
                opacity = 0;
                if (this.mapManager.map.getLayer(layerId)) {
                    this.mapManager.map.setPaintProperty(layerId, 'raster-opacity', opacity);
                }
                clearInterval(interval);
                if (callback) callback();
            } else {
                if (this.mapManager.map.getLayer(layerId)) {
                    this.mapManager.map.setPaintProperty(layerId, 'raster-opacity', opacity);
                } else {
                    clearInterval(interval);
                    if (callback) callback();
                }
            }
        }, 30);
    }

    /**
     * Update loading status for UI feedback
     * @param {string} layerId - Layer identifier
     * @param {number} loadingTiles - Number of loading tiles
     * @param {number} totalTiles - Total tiles requested
     */
    updateLoadingStatus(layerId, loadingTiles, totalTiles) {
        const progress = totalTiles > 0 ? ((totalTiles - loadingTiles) / totalTiles) * 100 : 100;
        
        console.log(`📊 [TILES] Progress update for ${layerId}: ${progress.toFixed(1)}% (${totalTiles - loadingTiles}/${totalTiles} tiles loaded)`);
        
        this.dispatchLayerEvent('layerLoadProgress', { 
            layerId, 
            progress, 
            isLoading: loadingTiles > 0,
            loadingTiles,
            totalTiles
        });
    }

    /**
     * Dispatch custom events for UI integration
     * @param {string} eventType - Event type
     * @param {Object} detail - Event details
     */
    dispatchLayerEvent(eventType, detail = {}) {
        document.dispatchEvent(new CustomEvent(`rasterVisualization:${eventType}`, {
            detail: {
                ...detail,
                manager: this,
                timestamp: Date.now()
            }
        }));
    }

    /**
     * Get information about all current layers
     * @returns {Array} Array of layer information objects
     */
    getLayerInfo() {
        return Array.from(this.currentLayers.entries()).map(([layerId, info]) => ({
            layerId,
            itemId: info.item.id,
            collection: info.item.collection,
            preset: info.preset,
            presetName: info.presetConfig.name,
            opacity: this.layerOpacities.get(layerId),
            blendMode: this.layerBlendModes.get(layerId),
            visible: info.visible,
            createdAt: info.createdAt
        }));
    }

    /**
     * Get layer by ID
     * @param {string} layerId - Layer identifier
     * @returns {Object|null} Layer information
     */
    getLayer(layerId) {
        return this.currentLayers.get(layerId) || null;
    }

    /**
     * Check if layer exists
     * @param {string} layerId - Layer identifier
     * @returns {boolean} Whether layer exists
     */
    hasLayer(layerId) {
        return this.currentLayers.has(layerId);
    }

    /**
     * Get statistics about current layers
     * @returns {Object} Layer statistics
     */
    getStats() {
        return {
            totalLayers: this.currentLayers.size,
            maxLayers: this.maxLayers,
            memoryUsage: this.estimateMemoryUsage(),
            collections: [...new Set(Array.from(this.currentLayers.values()).map(info => info.item.collection))]
        };
    }

    /**
     * Estimate memory usage (rough calculation)
     * @returns {string} Human-readable memory usage
     */
    estimateMemoryUsage() {
        const tileSize = 512 * 512 * 4; // Assume 4 bytes per pixel
        const tilesPerLayer = 20; // Rough estimate
        const totalBytes = this.currentLayers.size * tileSize * tilesPerLayer;
        
        if (totalBytes > 1024 * 1024) {
            return `~${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
        } else {
            return `~${(totalBytes / 1024).toFixed(0)} KB`;
        }
    }
}

/**
 * Create default instance for immediate use
 * @param {Object} mapManager - Map manager instance
 * @returns {RasterVisualizationManager} Configured manager
 */
export function createRasterVisualizationManager(mapManager) {
    return new RasterVisualizationManager(mapManager);
}