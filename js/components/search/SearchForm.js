/**
 * SearchForm.js - Component for search criteria inputs
 */

import { isWKT, wktToGeoJSON, isGeoJSON, parseGeoJSON, geojsonToBbox } from '../../utils/GeometryUtils.js';

export class SearchForm {
    /**
     * Create a new SearchForm
     * @param {Object} mapManager - Map manager for coordinating with the map 
     * @param {Object} inlineDropdownManager - Inline dropdown manager for location updates
     */
    constructor(mapManager, inlineDropdownManager = null) {
        this.mapManager = mapManager;
        this.inlineDropdownManager = inlineDropdownManager;
        this.currentGeometry = null; // Store current geometry for search
        this.initFromUrl();
        this.initEventListeners();
        this.initClipboardListener();
        // Geometry button removed per user request
    }
    
    /**
     * Initialize form state from URL parameters
     */
    initFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Restore cloud cover state if present in URL
        const cloudCover = urlParams.get('cloudCover');
        const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
        const cloudCoverInput = document.getElementById('cloud-cover');
        const cloudCoverControls = document.getElementById('cloud-cover-controls');
        const cloudCoverValue = document.getElementById('cloud-cover-value');
        
        if (cloudCoverEnabled && cloudCoverInput && cloudCoverControls && cloudCoverValue) {
            if (cloudCover !== null) {
                // Enable cloud cover filter
                cloudCoverEnabled.checked = true;
                cloudCoverInput.disabled = false;
                cloudCoverControls.style.display = 'block';
                cloudCoverControls.classList.add('enabled');
                
                // Set the value
                cloudCoverInput.value = cloudCover;
                cloudCoverValue.textContent = `${cloudCover}%`;
            } else {
                // Reset to default state
                cloudCoverEnabled.checked = false;
                cloudCoverInput.disabled = true;
                cloudCoverControls.style.display = 'none';
                cloudCoverControls.classList.remove('enabled');
                cloudCoverInput.value = '100';
                cloudCoverValue.textContent = '100%';
            }
        }
    }
    
    /**
     * Update URL with current form state
     */
    updateUrl() {
        const url = new URL(window.location.href);
        const urlParams = new URLSearchParams(url.search);
        
        // Update cloud cover in URL if enabled
        const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
        const cloudCoverInput = document.getElementById('cloud-cover');
        
        if (cloudCoverEnabled?.checked && cloudCoverInput && !cloudCoverInput.disabled) {
            urlParams.set('cloudCover', cloudCoverInput.value);
        } else {
            urlParams.delete('cloudCover');
        }
        
        // Update URL without reloading the page
        url.search = urlParams.toString();
        window.history.replaceState({}, '', url);
    }
    
    // Add Geometry functionality removed per user request
    
    // Show Geometry Input Modal functionality removed per user request
    
    /**
     * Initialize clipboard event listeners for detecting WKT/GeoJSON in paste operations
     */
    initClipboardListener() {
        try {
            // Add paste event listener to bbox input
            const bboxInput = document.getElementById('bbox-input');
            if (bboxInput) {
                bboxInput.addEventListener('paste', (event) => {
                    // Get pasted text
                    let pastedText = (event.clipboardData || window.clipboardData).getData('text');
                    
                    // Check if it looks like WKT or GeoJSON
                    if (this.detectAndProcessGeometry(pastedText)) {
                        // Prevent default paste if we processed it as geometry
                        event.preventDefault();
                    }
                });
            }
            
            // Global paste event listener (for when focused on the page but not in an input)
            document.addEventListener('paste', (event) => {
                // Only process if target is not an input or textarea
                const targetTag = event.target.tagName.toLowerCase();
                const isEditable = event.target.isContentEditable || 
                                   event.target.getAttribute('role') === 'textbox';
                
                if (targetTag !== 'input' && targetTag !== 'textarea' && !isEditable) {
                    // Get pasted text
                    let pastedText = (event.clipboardData || window.clipboardData).getData('text');
                    this.detectAndProcessGeometry(pastedText);
                }
            });
            
        } catch (error) {
            console.error('Error setting up clipboard listeners:', error);
        }
    }
    
    /**
     * Detect if text is WKT or GeoJSON and process it
     * 
     * @param {string} text - Text to check for geometric formats
     * @returns {boolean} - True if processed as geometry
     */
    detectAndProcessGeometry(text) {
        if (!text || typeof text !== 'string') {
            return false;
        }
        
        try {
            text = text.trim();
            
            // Detect format and process accordingly
            if (isWKT(text)) {
                this.processGeometryInput(text, 'wkt');
                return true;
            } else if (isGeoJSON(text)) {
                this.processGeometryInput(text, 'geojson');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error detecting geometry format:', error);
            return false;
        }
    }
    
    /**
     * Process geometry input (WKT or GeoJSON)
     * 
     * @param {string} text - Geometry text to process
     * @param {string} format - Format of the input ('wkt' or 'geojson')
     */
    processGeometryInput(text, format) {
        try {
            let geojson = null;
            
            // Convert input to GeoJSON based on format
            if (format === 'wkt' || isWKT(text)) {
                geojson = wktToGeoJSON(text);
            } else if (format === 'geojson' || isGeoJSON(text)) {
                geojson = parseGeoJSON(text);
            }
            
            if (!geojson) {
                console.error('Failed to parse geometry input');
                alert('Invalid geometry format. Please check your input.');
                return;
            }
            
            // Store current geometry for search
            this.currentGeometry = geojson;
            
            // Update location dropdown if available
            if (this.inlineDropdownManager) {
                const geometryFormat = format === 'wkt' ? 'WKT' : 'GEOJSON';
                const displayText = `${geometryFormat} geometry`;
                this.inlineDropdownManager.handleLocationSelection('custom', displayText);
            }
            
            // Extract bbox from GeoJSON
            const bbox = geojsonToBbox(geojson);
            
            if (bbox) {
                // Update bbox input field
                this.updateBBoxInput(bbox);
                
                // Display geometry on map
                if (this.mapManager) {
                    try {
                        
                        // Use a consistent source ID to replace previous geometry
                        const geometrySourceId = 'searchform-geometry';
                        
                        // Display geometry with beautiful styling
                        if (typeof this.mapManager.addBeautifulGeometryLayer === 'function') {
                            this.mapManager.addBeautifulGeometryLayer(
                                geojson, 
                                geometrySourceId
                            );
                        } else if (typeof this.mapManager.addGeoJsonLayer === 'function') {
                            this.mapManager.addGeoJsonLayer(
                                geojson, 
                                geometrySourceId
                            );
                        }
                        
                        // Zoom to the geometry bounds
                        if (typeof this.mapManager.fitToBounds === 'function') {
                            this.mapManager.fitToBounds(bbox);
                        } else if (typeof this.mapManager.fitMapToBbox === 'function') {
                            this.mapManager.fitMapToBbox(bbox);
                        }
                        
                    } catch (mapError) {
                        console.error('❌ Error displaying geometry on map:', mapError);
                        // Continue anyway - the bbox is still updated
                    }
                }
                
                // Show notification
                this.showGeometryNotification(geojson.geometry.type);
            } else {
                console.error('Could not extract bbox from geometry');
                alert('Could not determine the area of the geometry. Please check your input.');
            }
        } catch (error) {
            console.error('Error processing geometry input:', error);
            alert('Error processing geometry. Please check your input format.');
        }
    }
    
    /**
     * Show a notification that geometry was successfully processed
     * 
     * @param {string} geometryType - Type of geometry processed
     */
    showGeometryNotification(geometryType) {
        try {
            // Create notification element
            const notification = document.createElement('div');
            notification.className = 'geometry-notification';
            notification.innerHTML = `
                <i class="material-icons">check_circle</i>
                <span>${geometryType} geometry applied</span>
                <button class="close-notification"><i class="material-icons">close</i></button>
            `;
            
            // Add style for the notification
            const style = document.createElement('style');
            style.textContent = `
                .geometry-notification {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background-color: var(--success-color, #4CAF50);
                    color: white;
                    padding: 12px 16px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                    z-index: 1000;
                    animation: slideIn 0.3s ease-out;
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .close-notification {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 0;
                    margin-left: 8px;
                }
                .close-notification i {
                    font-size: 16px;
                }
            `;
            
            document.head.appendChild(style);
            document.body.appendChild(notification);
            
            // Handle close button
            const closeBtn = notification.querySelector('.close-notification');
            closeBtn.addEventListener('click', () => {
                document.body.removeChild(notification);
                document.head.removeChild(style);
            });
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                    document.head.removeChild(style);
                }
            }, 5000);
        } catch (error) {
            console.error('Error showing geometry notification:', error);
        }
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Manual bbox input handling
        const bboxInput = document.getElementById('bbox-input');
        if (bboxInput) {
            bboxInput.addEventListener('change', (event) => {
                if (this.mapManager && event.target.value) {
                    try {
                        // Parse the bbox input and update map
                        const bboxValues = event.target.value.split(',').map(Number);
                        if (bboxValues.length === 4 && !bboxValues.some(isNaN)) {
                            
                            // Use the correct MapManager method
                            if (typeof this.mapManager.setBboxFromCoordinates === 'function') {
                                this.mapManager.setBboxFromCoordinates(bboxValues);
                            } else if (typeof this.mapManager.fitToBounds === 'function') {
                                this.mapManager.fitToBounds(bboxValues);
                            }
                        }
                    } catch (error) {
                        console.warn('⚠️ Error updating map from bbox input:', error);
                    }
                }
            });
        }
        
        // Listen for map draw events
        document.addEventListener('bboxDrawn', (event) => {
            if (event.detail?.bbox) {
                this.updateBBoxInput(event.detail.bbox);
                // Clear any current geometry since we're using a drawn bbox now
                this.currentGeometry = null;
            }
        });

        // Cloud cover handling
        const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
        const cloudCoverControls = document.getElementById('cloud-cover-controls');
        const cloudCoverInput = document.getElementById('cloud-cover');
        const cloudCoverValue = document.getElementById('cloud-cover-value');

        if (cloudCoverEnabled && cloudCoverControls && cloudCoverInput && cloudCoverValue) {
            // Toggle cloud cover controls visibility
            cloudCoverEnabled.addEventListener('change', () => {
                const isEnabled = cloudCoverEnabled.checked;
                cloudCoverControls.style.display = isEnabled ? 'block' : 'none';
                cloudCoverControls.classList.toggle('enabled', isEnabled);
                cloudCoverInput.disabled = !isEnabled;
                
                // Update URL when cloud cover is toggled
                this.updateUrl();
            });

            // Update cloud cover value display and URL
            cloudCoverInput.addEventListener('input', () => {
                cloudCoverValue.textContent = `${cloudCoverInput.value}%`;
                // Update URL when cloud cover value changes
                this.updateUrl();
            });
        }
    }
    
    /**
     * Update the bbox input field with coordinates
     * @param {Array} bbox - Bounding box coordinates [west, south, east, north]
     */
    updateBBoxInput(bbox) {
        if (!bbox || bbox.length !== 4) return;
        
        const bboxInput = document.getElementById('bbox-input');
        if (bboxInput) {
            bboxInput.value = bbox.map(coord => parseFloat(coord).toFixed(6)).join(',');
        }
    }
    
    /**
     * Check if the selected collections are non-optical data types that don't use cloud cover
     * @param {string} collections - Comma-separated list of collection IDs
     * @returns {boolean} - True if collections are non-optical types
     */
    isNonOpticalCollection(collections) {
        if (!collections) return false;
        
        const collectionIds = collections.toLowerCase();
        
        // Keywords that indicate non-optical data types
        const nonOpticalKeywords = [
            'sar',           // Synthetic Aperture Radar
            'radar',         // Radar data
            'dem',           // Digital Elevation Model
            'dsm',           // Digital Surface Model
            'dtm',           // Digital Terrain Model
            'elevation',     // Elevation data
            'lidar',         // LiDAR data
            'thermal',       // Thermal infrared (may not use cloud cover)
            'temperature',   // Temperature data
            'precipitation', // Weather data
            'wind',          // Wind data
            'pressure',      // Atmospheric pressure
            'humidity',      // Humidity data
            'bathymetry',    // Underwater topography
            'sonar',         // Sonar data
            'cop-dem',       // Copernicus DEM
            'srtm',          // SRTM elevation data
            'aster-dem',     // ASTER DEM
            'nasadem'        // NASA DEM
        ];
        
        // Check if any of the keywords match the collection IDs
        return nonOpticalKeywords.some(keyword => 
            collectionIds.includes(keyword)
        );
    }
    
    /**
     * Get search parameters from form
     * @returns {Object} - Search parameters
     */
    getSearchParams() {
        const params = { limit: 50 };
        
        try {
            // Add text search if provided
            const searchText = document.getElementById('search-input')?.value.trim();
            if (searchText) {
                params.query = {
                    "or": [
                        { "contains": ["title", searchText] },
                        { "contains": ["description", searchText] }
                    ]
                };
            }
            
            // Add date range if provided
            const startDate = document.getElementById('date-start')?.value;
            const endDate = document.getElementById('date-end')?.value;
            if (startDate && endDate) {
                params.datetime = `${startDate}T00:00:00Z/${endDate}T23:59:59Z`;
            }
            
            // Add geometry or bbox
            if (this.currentGeometry) {
                // Use intersects with the current geometry if available
                params.intersects = this.currentGeometry.geometry;
            } else {
                // Otherwise use bbox if provided
                const bboxInput = document.getElementById('bbox-input');
                const bboxValue = bboxInput?.value.trim();
                if (bboxValue) {
                    const bbox = bboxValue.split(',').map(Number);
                    if (bbox.length === 4 && !bbox.some(isNaN)) {
                        params.bbox = bbox;
                    } else {
                        console.warn('⚠️ Invalid bbox format:', bbox);
                    }
                } else {
                    // If no explicit bbox, check for URL location parameters (mapCenter + mapZoom)
                    const urlParams = new URLSearchParams(window.location.search);
                    
                    if (urlParams.has('mapCenter') && urlParams.has('mapZoom')) {
                        try {
                            // Try to get map from this.mapManager first, then fall back to global state
                            let map = this.mapManager?.map;
                            if (!map && window.stacExplorer?.unifiedStateManager?.mapManager?.map) {
                                map = window.stacExplorer.unifiedStateManager.mapManager.map;
                            }
                            
                            if (map) {
                                // Use current map bounds as search constraint
                                const mapBounds = map.getBounds();
                                const mapBbox = [
                                    mapBounds.getWest(),
                                    mapBounds.getSouth(),
                                    mapBounds.getEast(),
                                    mapBounds.getNorth()
                                ];
                                params.bbox = mapBbox;
                            }
                        } catch (error) {
                            console.warn('Error getting map bounds for search constraint:', error);
                        }
                    }
                }
            }

            // Add filters from FilterManager (new system)
            if (window.stacExplorer?.filterManager) {
                const filterParams = window.stacExplorer.filterManager.getSTACQueryParameters();
                Object.assign(params, filterParams);
            } else {
                console.warn('⚠️ FilterManager not available, using legacy cloud cover system');
                // Fallback to legacy cloud cover system
                const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
                const cloudCoverInput = document.getElementById('cloud-cover');
                
                if (cloudCoverEnabled?.checked && cloudCoverInput && !cloudCoverInput.disabled) {
                    const cloudCoverValue = parseInt(cloudCoverInput.value);
                    if (!isNaN(cloudCoverValue)) {
                        // Check if we're dealing with collections that typically don't have cloud cover
                        const collections = document.getElementById('collections')?.value || '';
                        const isNonOpticalData = this.isNonOpticalCollection(collections);
                        
                        if (!isNonOpticalData) {
                            // Only apply cloud cover filter for optical data collections
                            params["eo:cloud_cover"] = { "lte": cloudCoverValue };
                        } else {
                        }
                    }
                }
            }

            // Add collections if they exist in the form
            const collections = document.getElementById('collections')?.value;
            if (collections) {
                params.collections = collections.split(',').map(c => c.trim());
            }

            // Update URL with current state
            this.updateUrl();
        } catch (error) {
            console.error('Error getting search params:', error);
        }
        
        return params;
    }
}