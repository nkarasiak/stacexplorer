/**
 * MapLayers - Layer management for maps
 * Handles thumbnail overlays, asset layers, and layer lifecycle
 */

export class MapLayers {
    constructor(mapCore) {
        this.mapCore = mapCore;
        this.map = mapCore.getMap();
        this.thumbnailSources = new Map();
        this.thumbnailLayers = new Map();
    }

    /**
     * Clear all thumbnails from the map
     */
    clearAllThumbnails() {
        
        // Remove all thumbnail layers and sources
        this.thumbnailLayers.forEach((layerId, itemId) => {
            try {
                if (this.map.getLayer(layerId)) {
                    this.map.removeLayer(layerId);
                }
                
                const sourceId = this.thumbnailSources.get(itemId);
                if (sourceId && this.map.getSource(sourceId)) {
                    this.map.removeSource(sourceId);
                }
            } catch (error) {
            }
        });
        
        // Clear the tracking maps
        this.thumbnailSources.clear();
        this.thumbnailLayers.clear();
        
    }

    /**
     * Remove the current active layer
     */
    removeCurrentLayer() {
        try {
            // Remove specific known layer IDs that might exist
            const layersToRemove = [
                'stac-item-layer',
                'stac-item-outline',
                'stac-bounds-layer',
                'stac-bounds-outline',
                'current-item-layer',
                'current-item-outline'
            ];
            
            layersToRemove.forEach(layerId => {
                if (this.map.getLayer(layerId)) {
                    this.map.removeLayer(layerId);
                }
            });
            
            // Remove corresponding sources
            const sourcesToRemove = [
                'stac-item-source',
                'stac-bounds-source',
                'current-item-source'
            ];
            
            sourcesToRemove.forEach(sourceId => {
                if (this.map.getSource(sourceId)) {
                    this.map.removeSource(sourceId);
                }
            });
            
        } catch (error) {
        }
    }

    /**
     * Fit map to bounding box
     */
    fitMapToBbox(bbox) {
        if (!bbox || bbox.length !== 4) {
            return;
        }
        
        try {
            // Convert bbox to LngLatBounds format: [west, south, east, north]
            const bounds = [
                [bbox[0], bbox[1]], // southwest corner
                [bbox[2], bbox[3]]  // northeast corner
            ];
            
            this.map.fitBounds(bounds, {
                padding: { top: 50, bottom: 50, left: 50, right: 50 },
                maxZoom: 14 // Don't zoom in too much
            });
            
        } catch (error) {
        }
    }

    /**
     * Get bounding box from STAC item
     */
    getBoundingBox(item) {
        // Try bbox property first
        if (item.bbox && Array.isArray(item.bbox) && item.bbox.length >= 4) {
            return item.bbox.slice(0, 4); // Take first 4 values [west, south, east, north]
        }
        
        // Try geometry if bbox is not available
        if (item.geometry && item.geometry.type === 'Polygon' && item.geometry.coordinates) {
            const coordinates = item.geometry.coordinates[0]; // First ring of polygon
            if (coordinates && coordinates.length > 0) {
                const lngs = coordinates.map(coord => coord[0]);
                const lats = coordinates.map(coord => coord[1]);
                
                return [
                    Math.min(...lngs), // west
                    Math.min(...lats), // south
                    Math.max(...lngs), // east
                    Math.max(...lats)  // north
                ];
            }
        }
        
        return null;
    }

    /**
     * Add GeoJSON layer without tooltip (for simple boundary display)
     */
    addGeoJsonLayerWithoutTooltip(bbox, item) {
        try {
            // Remove any existing layers first
            this.removeCurrentLayer();
            
            // Create polygon from bbox
            const geojson = {
                type: 'Feature',
                properties: {
                    title: item.properties?.title || item.title || item.id,
                    description: 'STAC Item Boundary'
                },
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
            };
            
            // Remove existing layers and source if they exist
            if (this.map.getLayer('stac-bounds-layer')) {
                this.map.removeLayer('stac-bounds-layer');
            }
            if (this.map.getLayer('stac-bounds-outline')) {
                this.map.removeLayer('stac-bounds-outline');
            }
            if (this.map.getSource('stac-bounds-source')) {
                this.map.removeSource('stac-bounds-source');
            }
            
            // Add source
            this.map.addSource('stac-bounds-source', {
                type: 'geojson',
                data: geojson
            });
            
            // Add fill layer
            this.map.addLayer({
                id: 'stac-bounds-layer',
                type: 'fill',
                source: 'stac-bounds-source',
                paint: {
                    'fill-color': '#2196F3',
                    'fill-opacity': 0.2
                }
            });
            
            // Add outline layer
            this.map.addLayer({
                id: 'stac-bounds-outline',
                type: 'line',
                source: 'stac-bounds-source',
                paint: {
                    'line-color': '#2196F3',
                    'line-width': 2
                }
            });
            
            
        } catch (error) {
        }
    }

    /**
     * Check if asset is a preview/thumbnail type
     */
    isPreviewAsset(asset) {
        if (!asset || !asset.type) return false;
        
        const previewTypes = [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/gif',
            'image/webp'
        ];
        
        return previewTypes.includes(asset.type.toLowerCase());
    }

    /**
     * Find visual assets in STAC item
     */
    findVisualAssets(item) {
        const visualAssets = [];
        
        if (!item.assets) return visualAssets;
        
        Object.entries(item.assets).forEach(([key, asset]) => {
            if (this.isVisualAsset(asset)) {
                visualAssets.push({ key, asset });
            }
        });
        
        return visualAssets;
    }

    /**
     * Check if asset is visual
     */
    isVisualAsset(asset) {
        if (!asset || !asset.type) return false;
        
        const visualTypes = [
            'image/tiff',
            'image/tif', 
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/x-hdf5',
            'application/x-netcdf4'
        ];
        
        return visualTypes.some(type => 
            asset.type.toLowerCase().includes(type) ||
            (asset.href && asset.href.toLowerCase().includes(type.split('/')[1]))
        );
    }

    /**
     * Reapply thumbnails after style change (placeholder)
     */
    reapplyThumbnails() {
        // Store current thumbnails
        const thumbnails = new Map(this.thumbnailSources);
        
        // Clear references
        this.thumbnailSources.clear();
        this.thumbnailLayers.clear();
        
        // Re-add each thumbnail (simplified implementation)
        thumbnails.forEach((sourceId, itemId) => {
            // This would need more implementation based on stored thumbnail data
        });
    }

    /**
     * Add asset overlay to map (simplified version)
     */
    async addAssetOverlay(asset, item, assetKey) {
        
        try {
            // This is a simplified implementation
            // The full implementation would handle image loading, CORS, etc.
            
            const bbox = this.getBoundingBox(item);
            if (!bbox) {
                throw new Error('No valid bbox for asset overlay');
            }
            
            // For now, just show the boundary
            this.addGeoJsonLayerWithoutTooltip(bbox, item);
            
            
        } catch (error) {
            throw error;
        }
    }
}