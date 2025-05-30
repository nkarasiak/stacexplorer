/**
 * AISmartSearch.js - Minimalist sentence-based search interface
 * Provides a streamlined "I want {collections} over {location} at {date} with {parameters}" interface
 */

export class AISmartSearch {
    /**
     * Create a new AISmartSearch component
     * @param {Object} apiClient - STAC API client
     * @param {Object} searchPanel - Search panel for executing searches
     * @param {Object} collectionManager - Collection manager for accessing collections
     * @param {Object} mapManager - Map manager for location handling
     * @param {Object} notificationService - Notification service
     */
    constructor(apiClient, searchPanel, collectionManager, mapManager, notificationService) {
        this.apiClient = apiClient;
        this.searchPanel = searchPanel;
        this.collectionManager = collectionManager;
        this.mapManager = mapManager;
        this.notificationService = notificationService;
        
        this.fullscreenElement = null;
        this.escapeListener = null;
        
        // Selected parameters
        this.selectedCollection = "";
        this.selectedLocation = "everywhere";
        this.selectedDate = {
            type: "anytime", // "anytime", "last7", "last30", "custom"
            start: null,
            end: null
        };
        this.cloudCover = 20;
        
        this.activeField = null;
        
        // Flag to track if we're returning from map drawing
        this.returningFromMapDrawing = false;
        this.drawnBbox = null;
        
        this.initAIButton();
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }
    

    
    /**
     * Clean up resources when component is destroyed
     */
    cleanup() {
        if (this.fullscreenElement && document.body.contains(this.fullscreenElement)) {
            document.body.removeChild(this.fullscreenElement);
            this.fullscreenElement = null;
        }
        
        // Remove all event listeners
        if (this.escapeListener) {
            document.removeEventListener('keydown', this.escapeListener);
            this.escapeListener = null;
        }
        
        if (this.globalClickHandler) {
            document.removeEventListener('click', this.globalClickHandler);
            this.globalClickHandler = null;
        }
    }
    
    /**
     * Initialize AI button event listener
     */
    initAIButton() {
        const aiButton = document.getElementById('ai-search-btn');
        if (aiButton) {
            aiButton.addEventListener('click', () => {
                this.showMinimalistSearch();
            });
            console.log('AI Smart Search button initialized');
        } else {
            console.error('AI Smart Search button not found');
        }
    }
    
    /**
     * Create and show the minimalist search interface
     */
    showMinimalistSearch() {
        try {
            // Create fullscreen element
            this.fullscreenElement = document.createElement('div');
            this.fullscreenElement.className = 'ai-fullscreen';
            
            // Get available collections
            // Get available collections from both data sources
            const collections = this.getComprehensiveCollections();
            
            // Create the collection options
            const collectionItems = collections.map(collection => 
                `<div class="ai-dropdown-item" data-value="${collection.id}" data-source="${collection.source}">
                    <div class="collection-item-content">
                        <div class="collection-title">${collection.title}</div>
                        <div class="collection-source">${collection.source}</div>
                    </div>
                </div>`
            ).join('');
            
            // Set current date for datepickers
            const today = new Date();
            const formattedToday = this.formatDate(today);
            
            const last7Days = new Date();
            last7Days.setDate(last7Days.getDate() - 7);
            const formattedLast7Days = this.formatDate(last7Days);
            
            const last30Days = new Date();
            last30Days.setDate(last30Days.getDate() - 30);
            const formattedLast30Days = this.formatDate(last30Days);
            
            // Build fullscreen content
            this.fullscreenElement.innerHTML = `
                <div class="ai-fullscreen-header">
                    <button class="ai-fullscreen-close" aria-label="Close search">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                
                <div class="ai-fullscreen-content">
                    <div class="ai-sentence-container">
                        I want 
                        <span class="ai-field empty" id="ai-field-collection" data-placeholder="DATA">
                            <div class="ai-dropdown" id="ai-dropdown-collection">
                                <div class="ai-collection-search">
                                    <input type="text" class="ai-collection-search-input" 
                                        placeholder="Search for datasets...">
                                </div>
                                <div class="ai-collections-list">
                                    ${collectionItems}
                                </div>
                            </div>
                        </span> 
                        over 
                        <span class="ai-field" id="ai-field-location" data-placeholder="LOCATION">EVERYWHERE
                            <div class="ai-dropdown" id="ai-dropdown-location">
                                <div class="ai-dropdown-item" data-value="everywhere">EVERYWHERE</div>
                                <div class="ai-location-input">
                                    <textarea class="ai-location-textarea" 
                                        placeholder="Paste WKT or GeoJSON polygon..."></textarea>
                                    <div class="ai-location-actions">
                                        <button class="ai-location-action" id="ai-draw-on-map">
                                            <i class="material-icons">edit</i> Draw on Map
                                        </button>
                                        <button class="ai-location-action" id="ai-clear-location">
                                            <i class="material-icons">clear</i> Clear
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </span> 
                        at 
                        <span class="ai-field" id="ai-field-date" data-placeholder="DATE">ANYTIME
                            <div class="ai-dropdown" id="ai-dropdown-date">
                                <div class="ai-date-presets">
                                    <div class="ai-date-preset" data-type="anytime">ANYTIME</div>
                                    <div class="ai-date-preset" data-type="last7">Last 7 days</div>
                                    <div class="ai-date-preset" data-type="last30">Last 30 days</div>
                                    <div class="ai-date-preset" data-type="last90">Last 3 months</div>
                                </div>
                                <div class="ai-date-custom">
                                    <div>Custom range:</div>
                                    <div class="ai-date-custom-inputs">
                                        <input type="date" class="ai-date-input" id="ai-date-start" 
                                            value="${formattedLast7Days}">
                                        <span>to</span>
                                        <input type="date" class="ai-date-input" id="ai-date-end" 
                                            value="${formattedToday}">
                                        <button class="ai-location-action" id="ai-apply-custom-date">
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </span> 
                        with 
                        <span class="ai-field" id="ai-field-params" data-placeholder="PARAMETERS">CLOUD COVER: 20%
                            <div class="ai-dropdown" id="ai-dropdown-params">
                                <div class="ai-custom-params">
                                    <div class="ai-param-slider">
                                        <div class="ai-param-slider-header">
                                            <span class="ai-param-slider-label">Maximum Cloud Cover</span>
                                            <span class="ai-param-slider-value" id="ai-cloud-value">20%</span>
                                        </div>
                                        <input type="range" class="ai-param-slider-input" id="ai-cloud-slider"
                                            min="0" max="100" value="20">
                                    </div>
                                    <button class="ai-location-action" id="ai-apply-params">
                                        Apply Parameters
                                    </button>
                                </div>
                            </div>
                        </span>
                    </div>
                    
                    <div class="ai-execute-container">
                        <button class="ai-execute-btn" id="ai-execute-search">
                            <i class="material-icons">search</i> Search
                        </button>
                    </div>
                </div>
            `;
            
            // Add fullscreen to document
            document.body.appendChild(this.fullscreenElement);
            
            // Set up event listeners
            this.setupMinimalistEventListeners();
            
            // If we have a drawn bbox, update the location field
            if (this.selectedLocation && this.selectedLocation !== 'everywhere') {
                const locationField = document.getElementById('ai-field-location');
                if (locationField) {
                    locationField.textContent = "Map Selection";
                    locationField.classList.remove('empty');
                }
            }
            
            console.log('AI Smart Search minimalist displayed');
        } catch (error) {
            console.error('Error showing AI minimalist search:', error);
            this.notificationService.showNotification('Error showing AI search interface', 'error');
        }
    }
    
    /**
     * Set up event listeners for the minimalist interface
     */
    setupMinimalistEventListeners() {
        // Close button
        const closeButton = this.fullscreenElement.querySelector('.ai-fullscreen-close');
        closeButton.addEventListener('click', () => this.closeFullscreen());
        
        // Collection field
        const collectionField = document.getElementById('ai-field-collection');
        collectionField.addEventListener('click', (e) => {
            this.toggleField('collection');
            e.stopPropagation();
        });
        
        // Collection search input
        const collectionSearch = this.fullscreenElement.querySelector('.ai-collection-search-input');
        collectionSearch.addEventListener('input', (e) => {
            this.filterCollections(e.target.value);
        });
        
        // Collection items
        const collectionItems = this.fullscreenElement.querySelectorAll('#ai-dropdown-collection .ai-dropdown-item');
        collectionItems.forEach(item => {
            item.addEventListener('click', (e) => {
                this.selectedCollection = item.dataset.value;
                collectionField.textContent = item.textContent;
                collectionField.classList.remove('empty');
                this.closeDropdowns();
                e.stopPropagation();
            });
        });
        
        // Location field
        const locationField = document.getElementById('ai-field-location');
        locationField.addEventListener('click', (e) => {
            this.toggleField('location');
            e.stopPropagation();
        });
        
        // Everywhere option
        const everywhereOption = this.fullscreenElement.querySelector('#ai-dropdown-location .ai-dropdown-item');
        everywhereOption.addEventListener('click', (e) => {
            this.selectedLocation = "everywhere";
            locationField.textContent = "EVERYWHERE";
            this.closeDropdowns();
            e.stopPropagation();
        });
        
        // Draw on map button
        const drawOnMapBtn = document.getElementById('ai-draw-on-map');
        drawOnMapBtn.addEventListener('click', () => {
            // Temporarily close the fullscreen to allow drawing on the map
            this.closeFullscreen();
            
            // Start drawing mode with a callback function
            if (this.mapManager) {
                this.mapManager.startDrawingBbox((bbox) => {
                    // After drawing is complete, this callback will be called
                    console.log('Drawing callback received bbox:', bbox);
                    
                    // Convert bbox to WKT and store it
                    const wkt = this.bboxToWkt(bbox);
                    this.selectedLocation = wkt;
                    
                    // Show the AI Search interface again
                    this.showMinimalistSearch();
                    
                    // Update the location field after the interface is shown
                    setTimeout(() => {
                        const locationField = document.getElementById('ai-field-location');
                        if (locationField) {
                            locationField.textContent = "Map Selection";
                            locationField.classList.remove('empty');
                        }
                    }, 100);
                });
                
                this.notificationService.showNotification('Draw a bounding box on the map', 'info');
            }
        });
        
        // Clear location button
        const clearLocationBtn = document.getElementById('ai-clear-location');
        clearLocationBtn.addEventListener('click', (e) => {
            const locationTextarea = this.fullscreenElement.querySelector('.ai-location-textarea');
            locationTextarea.value = '';
            e.stopPropagation();
        });
        
        // Location textarea
        const locationTextarea = this.fullscreenElement.querySelector('.ai-location-textarea');
        locationTextarea.addEventListener('input', () => {
            if (locationTextarea.value.trim()) {
                this.selectedLocation = locationTextarea.value.trim();
                locationField.textContent = "Custom Location";
                locationField.classList.remove('empty');
            }
        });
        
        // Date field
        const dateField = document.getElementById('ai-field-date');
        dateField.addEventListener('click', (e) => {
            this.toggleField('date');
            e.stopPropagation();
        });
        
        // Date presets
        const datePresets = this.fullscreenElement.querySelectorAll('.ai-date-preset');
        datePresets.forEach(preset => {
            preset.addEventListener('click', (e) => {
                const presetType = preset.dataset.type;
                this.selectedDate.type = presetType;
                
                // Set the display text
                dateField.textContent = preset.textContent;
                
                // Calculate actual dates except for 'anytime'
                if (presetType !== 'anytime') {
                    const today = new Date();
                    let startDate = new Date();
                    
                    if (presetType === 'last7') {
                        startDate.setDate(today.getDate() - 7);
                    } else if (presetType === 'last30') {
                        startDate.setDate(today.getDate() - 30);
                    } else if (presetType === 'last90') {
                        startDate.setDate(today.getDate() - 90);
                    }
                    
                    this.selectedDate.start = this.formatDate(startDate);
                    this.selectedDate.end = this.formatDate(today);
                } else {
                    // For 'anytime', set start and end to null
                    this.selectedDate.start = null;
                    this.selectedDate.end = null;
                }
                
                this.closeDropdowns();
                e.stopPropagation();
            });
        });
        
        // Apply custom date button
        const applyCustomDateBtn = document.getElementById('ai-apply-custom-date');
        applyCustomDateBtn.addEventListener('click', (e) => {
            const startInput = document.getElementById('ai-date-start');
            const endInput = document.getElementById('ai-date-end');
            
            this.selectedDate.type = 'custom';
            this.selectedDate.start = startInput.value;
            this.selectedDate.end = endInput.value;
            
            dateField.textContent = `${startInput.value} to ${endInput.value}`;
            dateField.classList.remove('empty');
            
            this.closeDropdowns();
            e.stopPropagation();
        });
        
        // Parameters field
        const paramsField = document.getElementById('ai-field-params');
        paramsField.addEventListener('click', (e) => {
            this.toggleField('params');
            e.stopPropagation();
        });
        
        // Cloud cover slider
        const cloudSlider = document.getElementById('ai-cloud-slider');
        const cloudValue = document.getElementById('ai-cloud-value');
        
        cloudSlider.addEventListener('input', () => {
            this.cloudCover = cloudSlider.value;
            cloudValue.textContent = `${this.cloudCover}%`;
        });
        
        // Apply parameters button
        const applyParamsBtn = document.getElementById('ai-apply-params');
        applyParamsBtn.addEventListener('click', (e) => {
            paramsField.textContent = `Cloud Cover: ${this.cloudCover}%`;
            paramsField.classList.remove('empty');
            
            this.closeDropdowns();
            e.stopPropagation();
        });
        
        // Execute Search button
        const executeSearchBtn = document.getElementById('ai-execute-search');
        executeSearchBtn.addEventListener('click', () => {
            this.executeSearch();
        });
        
        // Global click handler to close dropdowns when clicking outside
        const globalClickHandler = () => {
            if (this.fullscreenElement) {
                this.closeDropdowns();
            }
        };
        document.addEventListener('click', globalClickHandler);
        
        // Store the reference so we can remove it when closing
        this.globalClickHandler = globalClickHandler;
        
        // Global escape key handler
        this.escapeListener = (event) => {
            if (event.key === 'Escape') {
                if (this.activeField) {
                    this.closeDropdowns();
                } else if (this.fullscreenElement) {
                    this.closeFullscreen();
                }
            }
        };
        document.addEventListener('keydown', this.escapeListener);
    }
    
    /**
     * Toggle a field's dropdown open/closed
     * @param {string} fieldId - The ID of the field to toggle
     */
    toggleField(fieldId) {
        // Close any open dropdown first
        this.closeDropdowns();
        
        // Then open the clicked one
        const field = document.getElementById(`ai-field-${fieldId}`);
        if (field) {
            field.classList.add('active');
            this.activeField = fieldId;
            
            // If it's the collection field, focus the search input
            if (fieldId === 'collection') {
                setTimeout(() => {
                    const searchInput = this.fullscreenElement.querySelector('.ai-collection-search-input');
                    if (searchInput) {
                        searchInput.focus();
                    }
                }, 100);
            }
        }
    }
    
    /**
     * Close all open dropdowns
     */
    closeDropdowns() {
        if (!this.fullscreenElement) return;
        
        const activeFields = this.fullscreenElement.querySelectorAll('.ai-field.active');
        activeFields.forEach(field => {
            field.classList.remove('active');
        });
        this.activeField = null;
    }
    
    /**
     * Filter the collections list based on search input
     * @param {string} query - The search query
     */
    filterCollections(query) {
        const collectionItems = this.fullscreenElement.querySelectorAll('#ai-dropdown-collection .ai-dropdown-item');
        const normalizedQuery = query.toLowerCase().trim();
        
        collectionItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (normalizedQuery === '' || text.includes(normalizedQuery)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    /**
     * Close the fullscreen search interface
     */
    closeFullscreen() {
        if (this.fullscreenElement && document.body.contains(this.fullscreenElement)) {
            // Remove event listeners
            if (this.escapeListener) {
                document.removeEventListener('keydown', this.escapeListener);
                this.escapeListener = null;
            }
            
            if (this.globalClickHandler) {
                document.removeEventListener('click', this.globalClickHandler);
                this.globalClickHandler = null;
            }
            
            // Remove the fullscreen from the DOM
            document.body.removeChild(this.fullscreenElement);
            this.fullscreenElement = null;
            
            // Reset active field
            this.activeField = null;
        }
    }
    
    /**
     * Execute search with the selected parameters
     */
    executeSearch() {
        try {
            // Check if we have the minimum required parameters
            let missingFields = [];
            
            if (!this.selectedCollection) {
                const collectionField = document.getElementById('ai-field-collection');
                collectionField.classList.add('error');
                missingFields.push('collections');
            }
            
            if (missingFields.length > 0) {
                this.notificationService.showNotification(`Please select ${missingFields.join(' and ')}`, 'warning');
                return;
            }
            
            // Collect parameters
            const params = {
                collections: [this.selectedCollection],
                cloudCover: this.cloudCover
            };
            
            // Add date range if not "anytime"
            if (this.selectedDate.type !== 'anytime' && this.selectedDate.start && this.selectedDate.end) {
                params.dateRange = {
                    start: this.selectedDate.start,
                    end: this.selectedDate.end
                };
            }
            
            // Add location if not "everywhere"
            if (this.selectedLocation && this.selectedLocation !== 'everywhere') {
                if (this.selectedLocation.startsWith('POLYGON')) {
                    try {
                        // Try to extract a rough bbox for compatibility
                        const coords = this.selectedLocation.match(/\(([^)]+)\)/)[1].split(',');
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        
                        coords.forEach(coord => {
                            const [x, y] = coord.trim().split(' ').map(parseFloat);
                            minX = Math.min(minX, x);
                            minY = Math.min(minY, y);
                            maxX = Math.max(maxX, x);
                            maxY = Math.max(maxY, y);
                        });
                        
                        params.bbox = [minX, minY, maxX, maxY];
                    } catch (e) {
                        console.warn('Could not parse WKT polygon to bbox:', e);
                    }
                }
            }
            
            // Show notification
            this.notificationService.showNotification('Processing your search request...', 'info');
            
            // Log the parameters
            console.log('AI Smart Search Parameters:', params);
            
            // Close the fullscreen
            this.closeFullscreen();
            
            // Apply parameters to the search form
            this.applySearchParameters(params);
            
            // Execute the search
            if (this.searchPanel) {
                this.searchPanel.performSearch();
            }
            
            // Show success notification
            this.notificationService.showNotification('Search executed successfully', 'success');
        } catch (error) {
            console.error('Error executing search:', error);
            this.notificationService.showNotification('Error processing your search request', 'error');
        }
    }
    
    /**
     * Apply extracted search parameters to the search form
     * @param {Object} params - Search parameters
     */
    applySearchParameters(params) {
        try {
            // Reset all form elements first to clear previous selections
            this.resetSearchForm();
            
            // Apply date range if provided
            if (params.dateRange && params.dateRange.start && params.dateRange.end) {
                document.getElementById('date-start').value = params.dateRange.start;
                document.getElementById('date-end').value = params.dateRange.end;
            }
            
            // Apply collection if provided and exists
            if (params.collections && params.collections.length > 0) {
                const collectionSelect = document.getElementById('collection-select');
                if (collectionSelect) {
                    collectionSelect.value = params.collections[0];
                    // Trigger change event to update the UI
                    collectionSelect.dispatchEvent(new Event('change'));
                }
            }
            
            // Apply cloud cover if provided
            if (params.cloudCover !== null && params.cloudCover !== undefined) {
                const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
                const cloudCoverInput = document.getElementById('cloud-cover');
                const cloudCoverValue = document.getElementById('cloud-cover-value');
                
                if (cloudCoverEnabled && cloudCoverInput && cloudCoverValue) {
                    cloudCoverEnabled.checked = true;
                    cloudCoverInput.value = params.cloudCover;
                    cloudCoverValue.textContent = `${params.cloudCover}%`;
                    cloudCoverInput.disabled = false;
                    
                    // Show controls if they're hidden
                    const cloudCoverControls = document.getElementById('cloud-cover-controls');
                    if (cloudCoverControls) {
                        cloudCoverControls.style.display = 'block';
                        cloudCoverControls.classList.add('enabled');
                    }
                }
            }
            
            // Apply bbox if provided
            if (params.bbox) {
                const bboxInput = document.getElementById('bbox-input');
                if (bboxInput) {
                    bboxInput.value = params.bbox.join(',');
                }
                
                // If we have map manager and bbox, update the map
                if (this.mapManager && params.bbox && params.bbox.length === 4) {
                    this.mapManager.setBboxFromCoordinates(params.bbox);
                }
            }
            
            // Update summary display
            this.updateSearchSummary();
            
            console.log('Applied search parameters:', params);
        } catch (error) {
            console.error('Error applying search parameters:', error);
        }
    }
    
    /**
     * Reset the search form to default values
     */
    resetSearchForm() {
        // Reset date range
        const dateStart = document.getElementById('date-start');
        const dateEnd = document.getElementById('date-end');
        if (dateStart) dateStart.value = '';
        if (dateEnd) dateEnd.value = '';
        
        // Reset bbox
        const bboxInput = document.getElementById('bbox-input');
        if (bboxInput) bboxInput.value = '';
        
        // Reset map if available
        if (this.mapManager && typeof this.mapManager.clearDrawings === 'function') {
            this.mapManager.clearDrawings();
        }
        
        // Reset cloud cover
        const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
        if (cloudCoverEnabled) cloudCoverEnabled.checked = false;
    }
    
    /**
     * Update the search summary in the dashboard
     */
    updateSearchSummary() {
        const summaryDetails = document.getElementById('summary-details');
        if (!summaryDetails) return;
        
        // Create summary text
        let summary = '';
        
        // Add collection if selected
        const collectionSelect = document.getElementById('collection-select');
        if (collectionSelect && collectionSelect.value) {
            const selectedOption = collectionSelect.options[collectionSelect.selectedIndex];
            const collectionName = selectedOption.textContent || collectionSelect.value;
            summary += `Collection: ${collectionName}, `;
        }
        
        // Add date range if set
        const dateStart = document.getElementById('date-start');
        const dateEnd = document.getElementById('date-end');
        if (dateStart && dateStart.value && dateEnd && dateEnd.value) {
            summary += `Date: ${dateStart.value} to ${dateEnd.value}, `;
        }
        
        // Add location if set
        const bboxInput = document.getElementById('bbox-input');
        if (bboxInput && bboxInput.value) {
            summary += 'Location: Custom area, ';
        }
        
        // Add cloud cover if enabled
        const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
        const cloudCoverInput = document.getElementById('cloud-cover');
        if (cloudCoverEnabled && cloudCoverEnabled.checked && cloudCoverInput) {
            summary += `Cloud Cover: Max ${cloudCoverInput.value}%, `;
        }
        
        // Trim trailing comma and space
        summary = summary.replace(/, $/, '');
        
        // Set summary text or default
        summaryDetails.textContent = summary || 'Configure your search';
    }
    
    /**
     * Format a Date object as YYYY-MM-DD
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    
    /**
     * Convert a bounding box to WKT polygon
     * @param {Array} bbox - Bounding box [minX, minY, maxX, maxY]
     * @returns {string} WKT polygon
     */
    bboxToWkt(bbox) {
        if (!bbox || bbox.length !== 4) {
            return '';
        }
        
        const [minX, minY, maxX, maxY] = bbox;
        
        // Create a WKT polygon from the bounding box
        return `POLYGON((${minX} ${minY}, ${maxX} ${minY}, ${maxX} ${maxY}, ${minX} ${maxY}, ${minX} ${minY}))`;
    }

    /**
     * Get comprehensive collections from both data sources
     * @returns {Array} Array of collection objects from all sources
     */
    getComprehensiveCollections() {
        // First try to get collections from the current selected source
        const currentCollections = this.collectionManager.collections || [];
        
        if (currentCollections.length > 0) {
            // If we have current collections, use them and add source info
            const catalogSelect = document.getElementById('catalog-select');
            const selectedCatalog = catalogSelect ? catalogSelect.value : '';
            const sourceName = this.getSourceName(selectedCatalog);
            
            return currentCollections.map(collection => ({
                ...collection,
                source: sourceName
            }));
        }
        
        // If no current collections, provide comprehensive collection from both sources
        return [
            // Copernicus Marine Collections
            { 
                id: 'cmems_mod_ibi_phy_my_0.083deg-3D_P1M-m', 
                title: 'Atlantic-Iberian Ocean Physics Reanalysis',
                source: 'Copernicus Marine'
            },
            { 
                id: 'cmems_mod_glo_phy_my_0.083deg_P1M-m', 
                title: 'Global Ocean Physics Reanalysis',
                source: 'Copernicus Marine'
            },
            { 
                id: 'cmems_obs-sl_glo_phy-ssh_my_allsat-l4-duacs-0.25deg_P1D', 
                title: 'Global Ocean Sea Surface Heights',
                source: 'Copernicus Marine'
            },
            { 
                id: 'cmems_obs_glo_phy_sss_l3_my_multi-oi_P1M', 
                title: 'Global Ocean Sea Surface Salinity',
                source: 'Copernicus Marine'
            },
            
            // Element84 Collections (Satellite Imagery)
            { 
                id: 'sentinel-s2-l2a-cogs', 
                title: 'Sentinel-2 Collection 2 Level-2A',
                source: 'Element84'
            },
            { 
                id: 'sentinel-s1-grd', 
                title: 'Sentinel-1 Ground Range Detected',
                source: 'Element84'
            },
            { 
                id: 'landsat-c2-l2', 
                title: 'Landsat Collection 2 Level-2',
                source: 'Element84'
            },
            { 
                id: 'cop-dem-glo-30', 
                title: 'Copernicus DEM GLO-30',
                source: 'Element84'
            },
            { 
                id: 'noaa-climate-data-cdr', 
                title: 'NOAA Climate Data Record',
                source: 'Element84'
            }
        ];
    }
    
    /**
     * Get human-readable source name
     * @param {string} catalogType - The catalog type
     * @returns {string} Human-readable source name
     */
    getSourceName(catalogType) {
        switch (catalogType) {
            case 'copernicus':
                return 'Copernicus Marine';
            case 'element84':
                return 'Element84';
            case 'custom':
                return 'Custom';
            default:
                return 'Various Sources';
        }
    }
    
    /**
     * Get all available collections from both data sources
     * @returns {Array} Array of collection objects with source information
     */
    getAllAvailableCollections() {
        // Check if we have collections from the current selected catalog
        const currentCollections = this.collectionManager.collections || [];
        
        if (currentCollections.length > 0) {
            // If we have current collections, use them
            return currentCollections.map(collection => ({
                ...collection,
                source: this.getCurrentDataSourceName()
            }));
        }
        
        // If no current collections, provide a comprehensive set from both sources
        return [
            // Copernicus Marine Collections
            { 
                id: 'cmems_mod_ibi_phy_my_0.083deg-3D_P1M-m', 
                title: 'Atlantic-Iberian Biscay Irish Ocean Physics Reanalysis',
                source: 'Copernicus Marine',
                category: 'Ocean Physics'
            },
            { 
                id: 'cmems_mod_glo_phy_my_0.083deg_P1M-m', 
                title: 'Global Ocean Physics Reanalysis',
                source: 'Copernicus Marine',
                category: 'Ocean Physics'
            },
            { 
                id: 'cmems_obs-sl_glo_phy-ssh_my_allsat-l4-duacs-0.25deg_P1D', 
                title: 'Global Ocean Gridded L4 Sea Surface Heights',
                source: 'Copernicus Marine',
                category: 'Sea Level'
            },
            { 
                id: 'cmems_obs_glo_phy_sss_l3_my_multi-oi_P1M', 
                title: 'Global Ocean Sea Surface Salinity L3',
                source: 'Copernicus Marine',
                category: 'Sea Surface'
            },
            
            // Element84 Collections (Satellite Imagery)
            { 
                id: 'sentinel-s2-l2a-cogs', 
                title: 'Sentinel-2 Collection 2 Level-2A',
                source: 'Element84',
                category: 'Optical Imagery'
            },
            { 
                id: 'sentinel-s1-grd', 
                title: 'Sentinel-1 Ground Range Detected (GRD)',
                source: 'Element84',
                category: 'SAR Imagery'
            },
            { 
                id: 'landsat-c2-l2', 
                title: 'Landsat Collection 2 Level-2',
                source: 'Element84',
                category: 'Optical Imagery'
            },
            { 
                id: 'cop-dem-glo-30', 
                title: 'Copernicus DEM GLO-30',
                source: 'Element84',
                category: 'Elevation'
            },
            { 
                id: 'naip', 
                title: 'National Agriculture Imagery Program',
                source: 'Element84',
                category: 'Aerial Imagery'
            }
        ];
    }
    
    /**
     * Get the current data source name
     * @returns {string} Human-readable data source name
     */
    getCurrentDataSourceName() {
        const catalogSelect = document.getElementById('catalog-select');
        const selectedCatalog = catalogSelect ? catalogSelect.value : '';
        
        switch (selectedCatalog) {
            case 'copernicus':
                return 'Copernicus Marine';
            case 'element84':
                return 'Element84';
            case 'custom':
                return 'Custom';
            default:
                return 'Unknown';
        }
    }
    
    /**
     * Create collection dropdown items with source grouping
     * @param {Array} collections - Array of collection objects
     * @returns {string} HTML string for collection items
     */
    createCollectionItems(collections) {
        // Group collections by source
        const groupedCollections = {};
        collections.forEach(collection => {
            const source = collection.source || 'Other';
            if (!groupedCollections[source]) {
                groupedCollections[source] = [];
            }
            groupedCollections[source].push(collection);
        });
        
        let html = '<div class="ai-collection-search">';
        html += '<input type="text" class="ai-collection-search-input" placeholder="Search datasets...">';
        html += '</div>';
        
        html += '<div class="ai-collections-list">';
        
        // Create grouped items
        Object.keys(groupedCollections).forEach(source => {
            if (Object.keys(groupedCollections).length > 1) {
                html += `<div class="ai-collection-group-header">${source}</div>`;
            }
            
            groupedCollections[source].forEach(collection => {
                const isSelected = this.selectedCollection === collection.id;
                const selectedClass = isSelected ? 'selected' : '';
                const checkIcon = isSelected ? '<i class="material-icons">check</i>' : '';
                const categoryBadge = collection.category ? `<span class="ai-collection-category">${collection.category}</span>` : '';
                
                html += `
                    <div class="ai-dropdown-item ai-collection-item ${selectedClass}" data-value="${collection.id}" data-source="${source}">
                        <div class="ai-collection-item-content">
                            ${checkIcon}
                            <div class="ai-collection-item-details">
                                <div class="ai-collection-item-title">${collection.title || collection.id}</div>
                                ${categoryBadge}
                            </div>
                        </div>
                    </div>
                `;
            });
        });
        
        html += '</div>';
        
        // Add clear selection option if something is selected
        if (this.selectedCollection) {
            html += '<div class="ai-dropdown-item ai-clear-selection" data-action="clear">';
            html += '<i class="material-icons">clear</i> Clear Selection';
            html += '</div>';
        }
        
        return html;
    }
}