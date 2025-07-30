/**
 * MapDrawing - Drawing tools for maps (bbox, polygon)
 * Handles interactive drawing functionality
 */

export class MapDrawing {
    constructor(mapCore) {
        this.mapCore = mapCore;
        this.map = mapCore.getMap();
        this.drawingMode = false;
        this.drawingType = null;
        this.drawingCallback = null;
        this.currentDrawnFeature = null;
        this._drawingListeners = null;
    }

    /**
     * Initialize drawing controls and event handlers
     */
    initializeDrawing() {
        try {
            // Check if source already exists (avoid duplicates)
            if (this.map.getSource('drawing-source')) {
                return;
            }

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

        } catch (error) {
            console.error('❌ Failed to initialize drawing functionality:', error);
        }
    }

    /**
     * Reinitialize drawing after map style change
     */
    reinitializeAfterStyleChange() {
        // Listen for map style updates
        document.addEventListener('mapStyleUpdated', () => {
            this.initializeDrawing();
        });
    }

    /**
     * Start drawing a bounding box
     */
    startDrawingBbox(callback) {
        if (!this.mapCore.isMapReady()) {
            console.warn('⚠️ Map not ready for drawing, waiting for initialization...');
            // Wait for map to be ready and retry
            const waitForMap = () => {
                if (this.mapCore.isMapReady()) {
                    this.startDrawingBbox(callback);
                } else {
                    setTimeout(waitForMap, 100);
                }
            };
            setTimeout(waitForMap, 100);
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
        if (!this.mapCore.isMapReady()) {
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
                
                this.updateDrawingSource({
                    type: 'FeatureCollection',
                    features: [marker]
                }, 'first click marker');
                
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
     * Safely update drawing source data with auto-initialization
     */
    updateDrawingSource(data, context = 'drawing') {
        const drawingSource = this.map.getSource('drawing-source');
        if (drawingSource) {
            drawingSource.setData(data);
            return true;
        } else {
            console.warn(`⚠️ Drawing source not available for ${context}, attempting to initialize...`);
            try {
                // Try to initialize drawing if it hasn't been done yet
                this.initializeDrawing();
                
                // Try again after initialization
                const retryDrawingSource = this.map.getSource('drawing-source');
                if (retryDrawingSource) {
                    retryDrawingSource.setData(data);
                    return true;
                } else {
                    console.warn(`⚠️ Failed to initialize drawing source, skipping ${context}`);
                    return false;
                }
            } catch (error) {
                console.error(`❌ Error initializing drawing source for ${context}:`, error);
                return false;
            }
        }
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

        this.updateDrawingSource({
            type: 'FeatureCollection',
            features: features
        }, 'bbox preview');
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
        
        // Call the callback if provided
        if (this.drawingCallback) {
            this.drawingCallback(geometry);
        }
        
        // Always dispatch geometrySelected event for URL handling
        let bbox;
        let geometryName = 'Custom Area';
        
        
        if (Array.isArray(geometry) && geometry.length === 4) {
            // This is a bbox array [west, south, east, north] - round to 6 decimal places
            bbox = geometry.map(coord => parseFloat(coord.toFixed(6)));
        } else if (geometry && geometry.type === 'Polygon') {
            // Convert polygon to bbox
            const coordinates = geometry.coordinates[0];
            const lngs = coordinates.map(coord => coord[0]);
            const lats = coordinates.map(coord => coord[1]);
            bbox = [
                parseFloat(Math.min(...lngs).toFixed(6)), // west
                parseFloat(Math.min(...lats).toFixed(6)), // south
                parseFloat(Math.max(...lngs).toFixed(6)), // east
                parseFloat(Math.max(...lats).toFixed(6))  // north
            ];
        } else {
            console.error('🎯 MapDrawing: Unknown geometry format:', geometry);
        }
        
        if (bbox) {
            
            const event = new CustomEvent('geometrySelected', {
                detail: {
                    bbox: bbox,
                    name: geometryName
                }
            });
            document.dispatchEvent(event);
        } else {
            console.error('🎯 MapDrawing: No bbox generated from geometry:', geometry);
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
     * Clear search bbox (placeholder - needs to be implemented by parent)
     */
    clearSearchBbox() {
        // This should be implemented by the parent MapManager or coordinated through events
    }
}