/**
 * SearchForm.js - Component for search criteria inputs
 */

import { isWKT, wktToGeoJSON, isGeoJSON, parseGeoJSON, geojsonToBbox } from '../../utils/GeometryUtils.js';

export class SearchForm {
    /**
     * Create a new SearchForm
     * @param {Object} mapManager - Map manager for coordinating with the map 
     */
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.currentGeometry = null; // Store current geometry for search
        this.initFromUrl();
        this.initEventListeners();
        this.initClipboardListener();
        this.addGeometryButton();
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
    
    /**
     * Add a button to the location card for adding geometry
     */
    addGeometryButton() {
        try {
            const locationCardBody = document.querySelector('#location-card .search-card-body .card-form-group');
            
            if (locationCardBody) {
                // Create the add geometry button
                const addGeometryBtn = document.createElement('button');
                addGeometryBtn.className = 'md-btn md-btn-secondary compact-btn';
                addGeometryBtn.id = 'add-geometry-btn';
                addGeometryBtn.innerHTML = '<i class="material-icons">add_location</i> Add Geometry';
                addGeometryBtn.title = 'Add WKT or GeoJSON geometry';
                
                // Create a container for the new button to maintain layout
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'geometry-button-container mt-2';
                buttonContainer.appendChild(addGeometryBtn);
                
                // Add to the location card
                locationCardBody.appendChild(buttonContainer);
                
                // Add event listener for the button
                addGeometryBtn.addEventListener('click', () => this.showGeometryInputModal());
                
                console.log('Add Geometry button added to location card');
            } else {
                console.error('Could not find location card body to add geometry button');
            }
        } catch (error) {
            console.error('Error adding geometry button:', error);
        }
    }
    
    /**
     * Show a modal for manually entering geometry
     */
    showGeometryInputModal() {
        try {
            // Create modal container
            const modal = document.createElement('div');
            modal.className = 'geometry-modal';
            modal.innerHTML = `
                <div class="geometry-modal-content">
                    <div class="geometry-modal-header">
                        <h3>Add Geometry</h3>
                        <button class="close-btn"><i class="material-icons">close</i></button>
                    </div>
                    <div class="geometry-modal-body">
                        <p class="modal-instruction">Paste WKT or GeoJSON geometry:</p>
                        <textarea id="geometry-input" placeholder="POLYGON ((30 10, 40 40, 20 40, 10 20, 30 10))" rows="6"></textarea>
                        <div class="geometry-format-tabs">
                            <button class="format-tab active" data-format="wkt">WKT</button>
                            <button class="format-tab" data-format="geojson">GeoJSON</button>
                        </div>
                        <div class="format-help">
                            <p class="wkt-help">Example WKT: <code>POLYGON ((30 10, 40 40, 20 40, 10 20, 30 10))</code></p>
                            <p class="geojson-help" style="display:none;">Example GeoJSON: <code>{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[30,10],[40,40],[20,40],[10,20],[30,10]]]}}</code></p>
                        </div>
                    </div>
                    <div class="geometry-modal-footer">
                        <button id="apply-geometry-btn" class="md-btn md-btn-primary">Apply Geometry</button>
                        <button id="cancel-geometry-btn" class="md-btn md-btn-secondary">Cancel</button>
                    </div>
                </div>
            `;
            
            // Add modal to document
            document.body.appendChild(modal);
            
            // Add style for the modal
            const style = document.createElement('style');
            style.textContent = `
                .geometry-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }
                .geometry-modal-content {
                    background-color: var(--card-bg, #fff);
                    border-radius: 8px;
                    width: 90%;
                    max-width: 600px;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
                    display: flex;
                    flex-direction: column;
                }
                .geometry-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    border-bottom: 1px solid var(--border-color, #ddd);
                }
                .geometry-modal-header h3 {
                    margin: 0;
                    font-size: 18px;
                    color: var(--text-color, #333);
                }
                .close-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: var(--text-color, #333);
                }
                .geometry-modal-body {
                    padding: 16px;
                    overflow-y: auto;
                }
                .modal-instruction {
                    margin-top: 0;
                    margin-bottom: 12px;
                    color: var(--text-color, #333);
                }
                #geometry-input {
                    width: 100%;
                    padding: 12px;
                    border: 1px solid var(--border-color, #ddd);
                    border-radius: 4px;
                    background-color: var(--input-bg, #f5f5f5);
                    color: var(--text-color, #333);
                    font-family: monospace;
                    resize: vertical;
                }
                .geometry-format-tabs {
                    display: flex;
                    margin-top: 12px;
                }
                .format-tab {
                    padding: 8px 16px;
                    background: none;
                    border: 1px solid var(--border-color, #ddd);
                    cursor: pointer;
                }
                .format-tab:first-child {
                    border-radius: 4px 0 0 4px;
                }
                .format-tab:last-child {
                    border-radius: 0 4px 4px 0;
                }
                .format-tab.active {
                    background-color: var(--primary-color, #2196F3);
                    color: white;
                    border-color: var(--primary-color, #2196F3);
                }
                .format-help {
                    margin-top: 12px;
                    font-size: 12px;
                    color: var(--text-muted, #666);
                }
                .format-help code {
                    display: block;
                    padding: 8px;
                    background-color: var(--code-bg, #f0f0f0);
                    border-radius: 4px;
                    overflow-x: auto;
                    margin-top: 4px;
                    font-size: 11px;
                }
                .geometry-modal-footer {
                    padding: 16px;
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    border-top: 1px solid var(--border-color, #ddd);
                }
            `;
            document.head.appendChild(style);
            
            // Setup event listeners for modal
            const closeBtn = modal.querySelector('.close-btn');
            const cancelBtn = modal.querySelector('#cancel-geometry-btn');
            const applyBtn = modal.querySelector('#apply-geometry-btn');
            const formatTabs = modal.querySelectorAll('.format-tab');
            const wktHelp = modal.querySelector('.wkt-help');
            const geojsonHelp = modal.querySelector('.geojson-help');
            const geometryInput = modal.querySelector('#geometry-input');
            
            // Handle format tab selection
            formatTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    formatTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    const format = tab.dataset.format;
                    if (format === 'wkt') {
                        wktHelp.style.display = 'block';
                        geojsonHelp.style.display = 'none';
                    } else {
                        wktHelp.style.display = 'none';
                        geojsonHelp.style.display = 'block';
                    }
                });
            });
            
            // Close modal handlers
            const closeModal = () => {
                document.body.removeChild(modal);
                document.head.removeChild(style);
            };
            
            closeBtn.addEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);
            
            // Apply geometry handler
            applyBtn.addEventListener('click', () => {
                const geometryText = geometryInput.value.trim();
                const activeFormat = modal.querySelector('.format-tab.active').dataset.format;
                
                if (geometryText) {
                    this.processGeometryInput(geometryText, activeFormat);
                    closeModal();
                } else {
                    alert('Please enter geometry data');
                }
            });
            
            // Focus the input field
            geometryInput.focus();
        } catch (error) {
            console.error('Error showing geometry modal:', error);
        }
    }
    
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
            
            console.log('Clipboard listeners initialized for WKT/GeoJSON detection');
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
                console.log('WKT detected in clipboard:', text);
                this.processGeometryInput(text, 'wkt');
                return true;
            } else if (isGeoJSON(text)) {
                console.log('GeoJSON detected in clipboard:', text);
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
            
            // Extract bbox from GeoJSON
            const bbox = geojsonToBbox(geojson);
            
            if (bbox) {
                // Update bbox input field
                this.updateBBoxInput(bbox);
                
                // Display geometry on map
                if (this.mapManager) {
                    try {
                        console.log('🗺️ Displaying geometry on map from SearchForm');
                        
                        // Display geometry with beautiful styling
                        if (typeof this.mapManager.addBeautifulGeometryLayer === 'function') {
                            this.mapManager.addBeautifulGeometryLayer(
                                geojson, 
                                `searchform-geometry-${Date.now()}`
                            );
                        } else if (typeof this.mapManager.addGeoJsonLayer === 'function') {
                            this.mapManager.addGeoJsonLayer(
                                geojson, 
                                `searchform-geometry-${Date.now()}`
                            );
                        }
                        
                        // Zoom to the geometry bounds
                        if (typeof this.mapManager.fitToBounds === 'function') {
                            this.mapManager.fitToBounds(bbox);
                        } else if (typeof this.mapManager.fitMapToBbox === 'function') {
                            this.mapManager.fitMapToBbox(bbox);
                        }
                        
                        console.log('✅ Geometry successfully displayed and zoomed on map');
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
                            console.log('🗺️ Updating map from bbox input:', bboxValues);
                            
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
            if (startDate || endDate) {
                params.datetime = `${startDate ? startDate + 'T00:00:00Z' : ''}/${endDate ? endDate + 'T23:59:59Z' : ''}`;
            }
            
            // Add geometry or bbox
            if (this.currentGeometry) {
                // Use intersects with the current geometry if available
                params.intersects = this.currentGeometry.geometry;
            } else {
                // Otherwise use bbox if provided
                const bboxValue = document.getElementById('bbox-input')?.value.trim();
                if (bboxValue) {
                    const bbox = bboxValue.split(',').map(Number);
                    if (bbox.length === 4 && !bbox.some(isNaN)) {
                        params.bbox = bbox;
                    }
                }
            }

            // Add cloud cover if enabled and provided
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
                        console.log(`🌥️ Applying cloud cover filter: <= ${cloudCoverValue}%`);
                    } else {
                        console.log(`📡 Skipping cloud cover filter for non-optical data: ${collections}`);
                    }
                    // For non-optical data (SAR, DEM, etc.), skip the cloud cover filter entirely
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