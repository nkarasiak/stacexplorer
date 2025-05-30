/**
 * AISmartSearch.js - Minimalist sentence-based search interface
 * Provides a streamlined "I want {collections} over {location} at {date} with {parameters}" interface
 * Enhanced with editable placeholders and improved collection management
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
            console.log('🤖 AI Smart Search button initialized');
        } else {
            console.error('❌ AI Smart Search button not found');
        }
    }
    
    /**
     * Ensure a data source is selected and collections are available
     * @returns {Promise<boolean>} True if collections are available
     */
    async ensureDataSourceSelected() {
        try {
            // Check if we already have collections
            if (this.collectionManager.collections && this.collectionManager.collections.length > 0) {
                return true;
            }
            
            // Check if a catalog is already selected
            const catalogSelect = document.getElementById('catalog-select');
            if (!catalogSelect || !catalogSelect.value || catalogSelect.value === 'custom') {
                // Auto-select a default catalog (Element84 as it has comprehensive collections)
                console.log('🔄 Auto-selecting default data source...');
                catalogSelect.value = 'element84';
                
                // Trigger the catalog change event
                const catalogChangeEvent = new Event('change');
                catalogSelect.dispatchEvent(catalogChangeEvent);
                
                // Wait a moment for the collections to load
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check if collections are now available
                return this.collectionManager.collections && this.collectionManager.collections.length > 0;
            }
            
            return this.collectionManager.collections && this.collectionManager.collections.length > 0;
        } catch (error) {
            console.error('❌ Error ensuring data source selection:', error);
            return false;
        }
    }
    
    /**
     * Create and show the minimalist search interface
     */
    async showMinimalistSearch() {
        try {
            // Ensure we have a data source selected
            const hasCollections = await this.ensureDataSourceSelected();
            
            if (!hasCollections) {
                this.notificationService.showNotification('Please select a data source first from the search panel', 'warning');
                return;
            }
            
            // Create fullscreen element
            this.fullscreenElement = document.createElement('div');
            this.fullscreenElement.className = 'ai-fullscreen';
            
            // Get available collections from the collection manager
            const collections = this.collectionManager.collections || [];
            
            // Create the collection options
            const collectionItems = collections.map(collection => 
                `<div class="ai-dropdown-item" data-value="${collection.id}">
                    <div class="collection-item-content">
                        <div class="collection-title">${collection.title || collection.id}</div>
                        <div class="collection-id">${collection.id}</div>
                    </div>
                </div>`
            ).join('');
            
            // Set current date for datepickers
            const today = new Date();
            const formattedToday = this.formatDate(today);
            
            const last7Days = new Date();
            last7Days.setDate(last7Days.getDate() - 7);
            const formattedLast7Days = this.formatDate(last7Days);
            
            // Build fullscreen content with editable fields
            this.fullscreenElement.innerHTML = `
                <div class="ai-fullscreen-header">
                    <button class="ai-fullscreen-close" aria-label="Close search">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                
                <div class="ai-fullscreen-content">
                    <div class="ai-sentence-container">
                        I want 
                        <span class="ai-field editable-field ${this.selectedCollection ? '' : 'empty'}" 
                              id="ai-field-collection" 
                              data-placeholder="DATA"
                              contenteditable="true"
                              data-original-text="${this.selectedCollection ? this.getCollectionDisplayName(this.selectedCollection) : 'DATA'}">${this.selectedCollection ? this.getCollectionDisplayName(this.selectedCollection) : 'DATA'}</span>
                        <div class="ai-dropdown" id="ai-dropdown-collection">
                            <div class="ai-collection-search">
                                <input type="text" class="ai-collection-search-input" 
                                    placeholder="Search for datasets...">
                            </div>
                            <div class="ai-collections-list">
                                ${collectionItems}
                            </div>
                        </div>
                        over 
                        <span class="ai-field editable-field" 
                              id="ai-field-location" 
                              data-placeholder="EVERYWHERE"
                              contenteditable="true"
                              data-original-text="${this.selectedLocation === 'everywhere' ? 'EVERYWHERE' : 'Custom Location'}">${this.selectedLocation === 'everywhere' ? 'EVERYWHERE' : 'Custom Location'}</span>
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
                        at 
                        <span class="ai-field editable-field" 
                              id="ai-field-date" 
                              data-placeholder="ANYTIME"
                              contenteditable="true"
                              data-original-text="ANYTIME">ANYTIME</span>
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
                        with 
                        <span class="ai-field editable-field" 
                              id="ai-field-params" 
                              data-placeholder="PARAMETERS"
                              contenteditable="true"
                              data-original-text="CLOUD COVER: ${this.cloudCover}%">CLOUD COVER: ${this.cloudCover}%</span>
                        <div class="ai-dropdown" id="ai-dropdown-params">
                            <div class="ai-custom-params">
                                <div class="ai-param-slider">
                                    <div class="ai-param-slider-header">
                                        <span class="ai-param-slider-label">Maximum Cloud Cover</span>
                                        <span class="ai-param-slider-value" id="ai-cloud-value">${this.cloudCover}%</span>
                                    </div>
                                    <input type="range" class="ai-param-slider-input" id="ai-cloud-slider"
                                        min="0" max="100" value="${this.cloudCover}">
                                </div>
                                <button class="ai-location-action" id="ai-apply-params">
                                    Apply Parameters
                                </button>
                            </div>
                        </div>
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
            
            console.log('🤖 AI Smart Search minimalist displayed with collections:', collections.length);
        } catch (error) {
            console.error('❌ Error showing AI minimalist search:', error);
            this.notificationService.showNotification('Error showing AI search interface', 'error');
        }
    }
    
    /**
     * Get display name for a collection
     * @param {string} collectionId - Collection ID
     * @returns {string} Display name
     */
    getCollectionDisplayName(collectionId) {
        const collection = this.collectionManager.getCollectionById(collectionId);
        return collection ? (collection.title || collectionId) : collectionId;
    }
    
    /**
     * Set up event listeners for the minimalist interface
     */
    setupMinimalistEventListeners() {
        // Close button
        const closeButton = this.fullscreenElement.querySelector('.ai-fullscreen-close');
        closeButton.addEventListener('click', () => this.closeFullscreen());
        
        // Set up editable field handlers
        this.setupEditableFieldHandlers();
        
        // Collection field specific
        this.setupCollectionField();
        
        // Location field specific
        this.setupLocationField();
        
        // Date field specific
        this.setupDateField();
        
        // Parameters field specific
        this.setupParametersField();
        
        // Execute Search button
        const executeSearchBtn = document.getElementById('ai-execute-search');
        executeSearchBtn.addEventListener('click', () => {
            this.executeSearch();
        });
        
        // Global click handler to close dropdowns when clicking outside
        const globalClickHandler = (event) => {
            if (this.fullscreenElement && !event.target.closest('.ai-field') && !event.target.closest('.ai-dropdown')) {
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
     * Set up handlers for editable fields
     */
    setupEditableFieldHandlers() {
        const editableFields = this.fullscreenElement.querySelectorAll('.editable-field');
        
        editableFields.forEach(field => {
            // Handle clicking to show dropdown or edit
            field.addEventListener('click', (e) => {
                const fieldId = field.id.replace('ai-field-', '');
                this.toggleField(fieldId);
                e.stopPropagation();
            });
            
            // Handle text editing
            field.addEventListener('input', (e) => {
                this.handleFieldTextChange(field);
            });
            
            // Handle focus and blur for better UX
            field.addEventListener('focus', (e) => {
                field.classList.remove('empty');
                if (field.textContent === field.dataset.originalText) {
                    field.textContent = '';
                }
            });
            
            field.addEventListener('blur', (e) => {
                if (field.textContent.trim() === '') {
                    field.textContent = field.dataset.originalText;
                    field.classList.add('empty');
                } else {
                    field.classList.remove('empty');
                }
            });
            
            // Handle Enter key to confirm edit
            field.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    field.blur();
                    this.closeDropdowns();
                }
            });
        });
    }
    
    /**
     * Handle text changes in editable fields
     * @param {HTMLElement} field - The field element that changed
     */
    handleFieldTextChange(field) {
        const fieldId = field.id.replace('ai-field-', '');
        const text = field.textContent.trim();
        
        // Update internal state based on field type
        switch (fieldId) {
            case 'collection':
                // For collection, try to match text to available collections
                this.handleCollectionTextChange(text);
                break;
            case 'location':
                // For location, update selected location
                this.selectedLocation = text || 'everywhere';
                break;
            case 'date':
                // For date, try to parse natural language
                this.handleDateTextChange(text);
                break;
            case 'params':
                // For parameters, try to parse parameters
                this.handleParametersTextChange(text);
                break;
        }
    }
    
    /**
     * Handle collection text changes
     * @param {string} text - The entered text
     */
    handleCollectionTextChange(text) {
        if (!text) return;
        
        // Try to find a matching collection
        const collections = this.collectionManager.collections || [];
        const matchingCollection = collections.find(collection => 
            collection.title.toLowerCase().includes(text.toLowerCase()) ||
            collection.id.toLowerCase().includes(text.toLowerCase())
        );
        
        if (matchingCollection) {
            this.selectedCollection = matchingCollection.id;
        }
    }
    
    /**
     * Handle date text changes
     * @param {string} text - The entered text
     */
    handleDateTextChange(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('anytime') || lowerText.includes('any time')) {
            this.selectedDate = { type: 'anytime', start: null, end: null };
        } else if (lowerText.includes('last 7') || lowerText.includes('week')) {
            const today = new Date();
            const lastWeek = new Date();
            lastWeek.setDate(today.getDate() - 7);
            this.selectedDate = {
                type: 'last7',
                start: this.formatDate(lastWeek),
                end: this.formatDate(today)
            };
        } else if (lowerText.includes('last 30') || lowerText.includes('month')) {
            const today = new Date();
            const lastMonth = new Date();
            lastMonth.setDate(today.getDate() - 30);
            this.selectedDate = {
                type: 'last30',
                start: this.formatDate(lastMonth),
                end: this.formatDate(today)
            };
        }
    }
    
    /**
     * Handle parameters text changes
     * @param {string} text - The entered text
     */
    handleParametersTextChange(text) {
        // Try to extract cloud cover percentage
        const cloudMatch = text.match(/(\d+)%?/);
        if (cloudMatch) {
            const cloudValue = parseInt(cloudMatch[1]);
            if (cloudValue >= 0 && cloudValue <= 100) {
                this.cloudCover = cloudValue;
            }
        }
    }
    
    /**
     * Set up collection field handlers
     */
    setupCollectionField() {
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
                const collectionField = document.getElementById('ai-field-collection');
                const displayName = this.getCollectionDisplayName(this.selectedCollection);
                collectionField.textContent = displayName;
                collectionField.dataset.originalText = displayName;
                collectionField.classList.remove('empty');
                this.closeDropdowns();
                e.stopPropagation();
            });
        });
    }
    
    /**
     * Set up location field handlers
     */
    setupLocationField() {
        // Everywhere option
        const everywhereOption = this.fullscreenElement.querySelector('#ai-dropdown-location .ai-dropdown-item');
        everywhereOption.addEventListener('click', (e) => {
            this.selectedLocation = "everywhere";
            const locationField = document.getElementById('ai-field-location');
            locationField.textContent = "EVERYWHERE";
            locationField.dataset.originalText = "EVERYWHERE";
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
                    console.log('🗺️ Drawing callback received bbox:', bbox);
                    
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
                            locationField.dataset.originalText = "Map Selection";
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
                const locationField = document.getElementById('ai-field-location');
                locationField.textContent = "Custom Location";
                locationField.dataset.originalText = "Custom Location";
                locationField.classList.remove('empty');
            }
        });
    }
    
    /**
     * Set up date field handlers
     */
    setupDateField() {
        const dateField = document.getElementById('ai-field-date');
        
        // Date presets
        const datePresets = this.fullscreenElement.querySelectorAll('.ai-date-preset');
        datePresets.forEach(preset => {
            preset.addEventListener('click', (e) => {
                const presetType = preset.dataset.type;
                this.selectedDate.type = presetType;
                
                // Set the display text
                dateField.textContent = preset.textContent;
                dateField.dataset.originalText = preset.textContent;
                
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
            
            const displayText = `${startInput.value} to ${endInput.value}`;
            dateField.textContent = displayText;
            dateField.dataset.originalText = displayText;
            dateField.classList.remove('empty');
            
            this.closeDropdowns();
            e.stopPropagation();
        });
    }
    
    /**
     * Set up parameters field handlers
     */
    setupParametersField() {
        const paramsField = document.getElementById('ai-field-params');
        
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
            const displayText = `Cloud Cover: ${this.cloudCover}%`;
            paramsField.textContent = displayText;
            paramsField.dataset.originalText = displayText;
            paramsField.classList.remove('empty');
            
            this.closeDropdowns();
            e.stopPropagation();
        });
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
                        console.warn('⚠️ Could not parse WKT polygon to bbox:', e);
                    }
                }
            }
            
            // Show notification
            this.notificationService.showNotification('Processing your search request...', 'info');
            
            // Log the parameters
            console.log('🔍 AI Smart Search Parameters:', params);
            
            // Close the fullscreen
            this.closeFullscreen();
            
            // Apply parameters to the search form
            this.applySearchParameters(params);
            
            // Execute the search
            if (this.searchPanel) {
                this.searchPanel.performSearch();
            }
            
            // Show success notification
            this.notificationService.showNotification('Search executed successfully! 🎉', 'success');
        } catch (error) {
            console.error('❌ Error executing search:', error);
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
            
            console.log('✅ Applied search parameters:', params);
        } catch (error) {
            console.error('❌ Error applying search parameters:', error);
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
}
