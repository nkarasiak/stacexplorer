/**
 * GlobeManager - 3D Globe implementation using globe.gl
 * 
 * Provides 3D Earth visualization for STAC data with interactive features
 */

class GlobeManager {
    constructor(containerId, config = {}) {
        this.containerId = containerId;
        this.config = config;
        this.globe = null;
        this.isInitialized = false;
        this.dataLayers = new Map();
        this.currentTheme = 'dark';
        this.animationId = null;
        
        // STAC visualization properties
        this.thumbnailLayers = new Map();
        this.pointsData = [];
        this.polygonsData = [];
        
        // Camera controls
        this.controls = {
            enableRotation: true,
            autoRotate: false,
            autoRotateSpeed: 0.5
        };
    }

    /**
     * Initialize the 3D globe
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Get container element
            const container = document.getElementById(this.containerId);
            if (!container) {
                throw new Error(`Globe container element '${this.containerId}' not found`);
            }

            // Check if Globe is available
            if (typeof Globe === 'undefined') {
                throw new Error('Globe.gl library not loaded. Please ensure globe.gl is included.');
            }

            // Initialize globe
            this.globe = Globe()
                .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
                .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
                .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
                .width(container.clientWidth)
                .height(container.clientHeight)
                .enablePointerInteraction(true);

            // Apply theme-specific settings
            this.applyTheme(this.currentTheme);

            // Mount to container
            this.globe(container);

            // Set up controls
            this.setupControls();

            // Handle resize
            this.setupResizeHandler();

            this.isInitialized = true;
            console.log('🌍 Globe initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize globe:', error);
            throw error;
        }
    }

    /**
     * Apply theme-specific styling
     */
    applyTheme(theme) {
        this.currentTheme = theme;
        
        if (!this.globe) return;

        if (theme === 'light') {
            this.globe
                .globeImageUrl('//unpkg.com/three-globe/example/img/earth-day.jpg')
                .backgroundImageUrl('//unpkg.com/three-globe/example/img/stars.png');
        } else {
            this.globe
                .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
                .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png');
        }
    }

    /**
     * Set up camera controls
     */
    setupControls() {
        if (!this.globe) return;

        const controls = this.globe.controls();
        
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.enableZoom = true;
        controls.enableRotate = this.controls.enableRotation;
        controls.enablePan = false;
        controls.minDistance = 101;
        controls.maxDistance = 800;
        
        if (this.controls.autoRotate) {
            controls.autoRotate = true;
            controls.autoRotateSpeed = this.controls.autoRotateSpeed;
        }
    }

    /**
     * Handle window resize
     */
    setupResizeHandler() {
        const handleResize = () => {
            if (!this.globe) return;
            
            const container = document.getElementById(this.containerId);
            if (container) {
                this.globe
                    .width(container.clientWidth)
                    .height(container.clientHeight);
            }
        };

        window.addEventListener('resize', handleResize);
        
        // Store reference for cleanup
        this.resizeHandler = handleResize;
    }

    /**
     * Add STAC collection points to the globe
     */
    addSTACPoints(stacItems) {
        if (!this.globe || !stacItems || !Array.isArray(stacItems)) {
            return;
        }

        const pointsData = stacItems.map(item => {
            const geometry = item.geometry;
            let lat = 0, lng = 0;

            // Extract coordinates from geometry
            if (geometry && geometry.coordinates) {
                if (geometry.type === 'Point') {
                    [lng, lat] = geometry.coordinates;
                } else if (geometry.type === 'Polygon' && geometry.coordinates[0]) {
                    // Use centroid of polygon
                    const coords = geometry.coordinates[0];
                    lng = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length;
                    lat = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length;
                }
            }

            return {
                lat,
                lng,
                size: 0.5,
                color: this.getItemColor(item),
                item
            };
        });

        this.pointsData = pointsData;

        this.globe
            .pointsData(pointsData)
            .pointAltitude(0.01)
            .pointColor('color')
            .pointRadius('size')
            .pointResolution(6) // Reduced for better performance
            .onPointClick((point, event) => {
                this.handlePointClick(point, event);
            })
            .onPointHover((point, prevPoint) => {
                this.handlePointHover(point, prevPoint);
            });
    }

    /**
     * Add STAC collection polygons to the globe with image overlays
     */
    addSTACPolygons(stacItems) {
        if (!this.globe || !stacItems || !Array.isArray(stacItems)) {
            return;
        }

        const polygonsData = stacItems
            .filter(item => item.geometry && item.geometry.type === 'Polygon')
            .map(item => {
                const imageUrl = this.getItemThumbnail(item);
                return {
                    coordinates: item.geometry.coordinates[0], // Outer ring
                    color: imageUrl ? 'rgba(255,255,255,0.8)' : this.getItemColor(item),
                    altitude: 0.005,
                    imageUrl: imageUrl,
                    item
                };
            });

        this.polygonsData = polygonsData;

        this.globe
            .polygonsData(polygonsData)
            .polygonAltitude('altitude')
            .polygonCapColor(d => d.imageUrl ? 'rgba(255,255,255,0.9)' : d.color)
            .polygonSideColor(d => d.imageUrl ? 'rgba(255,255,255,0.7)' : d.color)
            .polygonStrokeColor(() => '#ffffff')
            .polygonLabel(d => `${d.item.id || 'STAC Item'}`)
            .onPolygonClick((polygon, event) => {
                this.handlePolygonClick(polygon, event);
            })
            .onPolygonHover((polygon, prevPolygon) => {
                this.handlePolygonHover(polygon, prevPolygon);
            });

        // Add custom tile layers for image overlays
        this.addImageOverlays(polygonsData.filter(d => d.imageUrl));
    }

    /**
     * Add image overlays for STAC items with thumbnails
     */
    addImageOverlays(itemsWithImages) {
        if (!itemsWithImages.length) return;

        const tilesData = itemsWithImages.map(item => {
            const bounds = this.getPolygonBounds(item.coordinates);
            return {
                ...bounds,
                imgUrl: item.imageUrl,
                item: item.item
            };
        });

        this.globe
            .tilesData(tilesData)
            .tileLabel(d => `${d.item.id || 'STAC Item'}`)
            .tileAltitude(0.01)
            .onTileClick((tile, event) => {
                this.handlePolygonClick({item: tile.item}, event);
            })
            .onTileHover((tile, prevTile) => {
                this.handlePolygonHover(tile ? {item: tile.item} : null, prevTile ? {item: prevTile.item} : null);
            });
    }

    /**
     * Get bounding box for polygon coordinates
     */
    getPolygonBounds(coordinates) {
        let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
        
        coordinates.forEach(coord => {
            const [lng, lat] = coord;
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
        });

        return { s: minLat, n: maxLat, w: minLng, e: maxLng };
    }

    /**
     * Get thumbnail URL for STAC item
     */
    getItemThumbnail(item) {
        if (!item.assets) return null;

        // Look for thumbnail in common asset keys
        const thumbnailKeys = ['thumbnail', 'preview', 'overview', 'rendered_preview'];
        
        for (const key of thumbnailKeys) {
            if (item.assets[key] && item.assets[key].href) {
                return item.assets[key].href;
            }
        }

        // Look for any asset with 'thumbnail' or 'preview' in the key name
        for (const [key, asset] of Object.entries(item.assets)) {
            if (key.toLowerCase().includes('thumbnail') || 
                key.toLowerCase().includes('preview') ||
                key.toLowerCase().includes('overview')) {
                if (asset.href && asset.href.match(/\.(jpg|jpeg|png|webp|tiff|tif)$/i)) {
                    return asset.href;
                }
            }
        }

        // Look for any image asset as fallback
        for (const [key, asset] of Object.entries(item.assets)) {
            if (asset.type && asset.type.startsWith('image/')) {
                return asset.href;
            }
        }

        return null;
    }

    /**
     * Get color for STAC item based on properties
     */
    getItemColor(item) {
        // Default color scheme
        const colors = {
            'optical': '#00ff88',
            'radar': '#ff6b35',
            'thermal': '#ff3366',
            'default': '#4fc3f7'
        };

        // Try to determine type from properties
        if (item.properties) {
            const props = item.properties;
            if (props.instruments && props.instruments.includes('SAR')) {
                return colors.radar;
            }
            if (props['eo:bands']) {
                return colors.optical;
            }
            if (props.platform && props.platform.toLowerCase().includes('thermal')) {
                return colors.thermal;
            }
        }

        return colors.default;
    }

    /**
     * Handle point click events
     */
    handlePointClick(point, event) {
        if (point && point.item) {
            console.log('📍 Globe point clicked:', point.item);
            
            // Show STAC item details
            this.showItemDetails(point.item);
            
            // Emit custom event for other components to handle
            const customEvent = new CustomEvent('stac-globe-point-click', {
                detail: {
                    item: point.item,
                    coordinates: [point.lng, point.lat],
                    event
                }
            });
            document.dispatchEvent(customEvent);
        }
    }

    /**
     * Handle polygon click events
     */
    handlePolygonClick(polygon, event) {
        if (polygon && polygon.item) {
            console.log('📐 Globe polygon clicked:', polygon.item);
            
            // Show STAC item details
            this.showItemDetails(polygon.item);
            
            // Emit custom event for other components to handle
            const customEvent = new CustomEvent('stac-globe-polygon-click', {
                detail: {
                    item: polygon.item,
                    coordinates: polygon.coordinates,
                    event
                }
            });
            document.dispatchEvent(customEvent);
        }
    }

    /**
     * Handle point hover events
     */
    handlePointHover(point, prevPoint) {
        // Change cursor style
        const container = document.getElementById(this.containerId);
        if (container) {
            container.style.cursor = point ? 'pointer' : 'grab';
        }

        if (point && point.item) {
            // Show tooltip or update info panel
            this.showTooltip(point.item, 'point');
        } else {
            this.hideTooltip();
        }
    }

    /**
     * Handle polygon hover events
     */
    handlePolygonHover(polygon, prevPolygon) {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.style.cursor = polygon ? 'pointer' : 'grab';
        }

        if (polygon && polygon.item) {
            this.showTooltip(polygon.item, 'polygon');
        } else {
            this.hideTooltip();
        }
    }

    /**
     * Show tooltip for STAC item
     */
    showTooltip(item, type) {
        // Create or update tooltip
        let tooltip = document.getElementById('globe-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'globe-tooltip';
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(0,0,0,0.9);
                color: white;
                padding: 12px 16px;
                border-radius: 6px;
                font-size: 13px;
                pointer-events: none;
                z-index: 1000;
                max-width: 280px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.1);
            `;
            document.body.appendChild(tooltip);
        }

        const title = item.id || 'STAC Item';
        const datetime = item.properties?.datetime || 'Unknown date';
        const platform = item.properties?.platform || 'Unknown platform';
        const collection = item.collection || 'Unknown collection';
        const thumbnail = this.getItemThumbnail(item);

        let thumbnailHtml = '';
        if (thumbnail) {
            thumbnailHtml = `<img src="${thumbnail}" style="width: 100%; max-width: 120px; height: 60px; object-fit: cover; border-radius: 4px; margin-top: 8px;" onerror="this.style.display='none'">`;
        }

        tooltip.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <strong style="color: #4fc3f7;">${title}</strong>
                <div style="font-size: 11px; opacity: 0.9;">
                    <div>📡 ${platform}</div>
                    <div>📅 ${new Date(datetime).toLocaleDateString()}</div>
                    <div>📦 ${collection}</div>
                </div>
                ${thumbnailHtml}
                <div style="font-size: 10px; opacity: 0.7; margin-top: 4px;">Click to view details</div>
            </div>
        `;

        tooltip.style.display = 'block';

        // Position tooltip near mouse
        document.addEventListener('mousemove', this.updateTooltipPosition);
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        const tooltip = document.getElementById('globe-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
        document.removeEventListener('mousemove', this.updateTooltipPosition);
    }

    /**
     * Update tooltip position
     */
    updateTooltipPosition = (event) => {
        const tooltip = document.getElementById('globe-tooltip');
        if (tooltip) {
            tooltip.style.left = (event.clientX + 10) + 'px';
            tooltip.style.top = (event.clientY - 30) + 'px';
        }
    }

    /**
     * Show detailed STAC item information in modal
     */
    showItemDetails(item) {
        // Use existing results panel modal if available
        if (window.stacExplorer && window.stacExplorer.resultsPanel) {
            // Try to use the existing modal system
            const resultsPanel = window.stacExplorer.resultsPanel;
            if (resultsPanel.showItemModal) {
                resultsPanel.showItemModal(item);
                return;
            }
        }

        // Fallback: create a simple details modal
        this.createItemDetailsModal(item);
    }

    /**
     * Create a simple item details modal
     */
    createItemDetailsModal(item) {
        // Remove existing modal if present
        const existingModal = document.getElementById('globe-item-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'globe-item-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
        `;

        const thumbnail = this.getItemThumbnail(item);
        const datetime = item.properties?.datetime || 'Unknown date';
        const platform = item.properties?.platform || 'Unknown platform';
        const collection = item.collection || 'Unknown collection';

        let thumbnailHtml = '';
        if (thumbnail) {
            thumbnailHtml = `
                <div style="margin-bottom: 16px;">
                    <img src="${thumbnail}" style="width: 100%; max-width: 400px; border-radius: 8px;" onerror="this.parentElement.style.display='none'">
                </div>
            `;
        }

        modal.innerHTML = `
            <div style="
                background: white;
                padding: 24px;
                border-radius: 12px;
                max-width: 500px;
                max-height: 80vh;
                overflow-y: auto;
                position: relative;
                color: #333;
            ">
                <button onclick="this.closest('#globe-item-modal').remove()" style="
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                ">×</button>
                
                <h2 style="margin: 0 0 16px 0; color: #333;">${item.id || 'STAC Item'}</h2>
                
                ${thumbnailHtml}
                
                <div style="display: grid; gap: 8px; font-size: 14px;">
                    <div><strong>Platform:</strong> ${platform}</div>
                    <div><strong>Collection:</strong> ${collection}</div>
                    <div><strong>Date:</strong> ${new Date(datetime).toLocaleDateString()}</div>
                    ${item.properties?.instruments ? `<div><strong>Instruments:</strong> ${item.properties.instruments.join(', ')}</div>` : ''}
                    ${item.properties?.['eo:cloud_cover'] !== undefined ? `<div><strong>Cloud Cover:</strong> ${item.properties['eo:cloud_cover']}%</div>` : ''}
                </div>

                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;">
                    <strong>Assets:</strong>
                    <div style="margin-top: 8px; max-height: 200px; overflow-y: auto;">
                        ${Object.entries(item.assets || {}).map(([key, asset]) => `
                            <div style="margin-bottom: 4px; font-size: 12px;">
                                <strong>${key}:</strong> 
                                <a href="${asset.href}" target="_blank" style="color: #4fc3f7; text-decoration: none;">
                                    ${asset.type || 'View'}
                                </a>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Focus on specific coordinates
     */
    focusOnCoordinates(lat, lng, altitude = 200) {
        if (!this.globe) return;

        this.globe.pointOfView({
            lat: lat,
            lng: lng,
            altitude: altitude
        }, 1000); // 1 second transition
    }

    /**
     * Clear all data layers
     */
    clearData() {
        if (!this.globe) return;

        this.pointsData = [];
        this.polygonsData = [];
        
        this.globe
            .pointsData([])
            .polygonsData([]);
    }

    /**
     * Set auto rotation
     */
    setAutoRotation(enabled, speed = 0.5) {
        this.controls.autoRotate = enabled;
        this.controls.autoRotateSpeed = speed;

        if (this.globe && this.globe.controls()) {
            const controls = this.globe.controls();
            controls.autoRotate = enabled;
            controls.autoRotateSpeed = speed;
        }
    }

    /**
     * Get current camera position
     */
    getCameraPosition() {
        if (!this.globe) return null;

        const pov = this.globe.pointOfView();
        return {
            lat: pov.lat,
            lng: pov.lng,
            altitude: pov.altitude
        };
    }

    /**
     * Destroy the globe and clean up resources
     */
    destroy() {
        if (this.globe) {
            // Stop any animations
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }

            // Remove resize handler
            if (this.resizeHandler) {
                window.removeEventListener('resize', this.resizeHandler);
            }

            // Clear container
            const container = document.getElementById(this.containerId);
            if (container) {
                container.innerHTML = '';
                container.style.cursor = '';
            }

            // Hide tooltip
            this.hideTooltip();
            const tooltip = document.getElementById('globe-tooltip');
            if (tooltip) {
                tooltip.remove();
            }

            this.globe = null;
            this.isInitialized = false;
        }
    }

    /**
     * Check if globe is initialized
     */
    isReady() {
        return this.isInitialized && this.globe !== null;
    }
}

// Export for use in other modules
export { GlobeManager };