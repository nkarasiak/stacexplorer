/**
 * AISmartSearch.js - Minimalist sentence-based search interface
 * Provides a streamlined "I want {collections} over {location} at {date} with {parameters}" interface
 * Enhanced with editable placeholders, improved collection management, and advanced location search
 */

import { defaultGeocodingService } from '../../utils/GeocodingService.js';
import { isWKT, isGeoJSON, wktToGeoJSON, parseGeoJSON, geojsonToBbox } from '../../utils/GeometryUtils.js';
import { DateUtils } from '../../utils/DateUtils.js';

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
        this.geocodingService = defaultGeocodingService;
        
        this.fullscreenElement = null;
        this.escapeListener = null;
        
        // Location search state
        this.locationSearchResults = [];
        this.selectedLocationResult = null;
        this.locationSearchTimeout = null;
        
        // Selected parameters
        this.selectedCollection = "";
        this.selectedLocation = "everywhere";
        this.selectedDate = {
            type: "anytime",
            start: null,
            end: null,
            preset: null
        };
        this.cloudCover = 20;
        
        this.activeField = null;
        
        // Collections loaded from all data sources
        this.allAvailableCollections = null;
        this.selectedCollectionSource = null;
        
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
            console.log('🤖 Enhanced AI Smart Search button initialized');
        } else {
            console.error('❌ AI Smart Search button not found');
        }
    }
    
    /**
     * Load collections from all available data sources
     * @returns {Promise<Array>} Combined collections from all sources
     */
    async loadAllCollections() {
        const allCollections = [];
        const dataSources = ['copernicus', 'element84'];
        
        console.log('🔄 Loading collections from all data sources...');
        
        for (const source of dataSources) {
            try {
                console.log(`🔍 Loading collections from ${source}...`);
                
                // Get endpoints for this source
                const endpoints = window.stacExplorer.config.stacEndpoints[source];
                if (!endpoints) {
                    console.warn(`⚠️ No endpoints configured for ${source}`);
                    continue;
                }
                
                // Set API client to use this source
                this.apiClient.setEndpoints(endpoints);
                
                // Fetch collections from this source
                const collections = await this.apiClient.fetchCollections();
                
                // Add source information to each collection
                const collectionsWithSource = collections.map(collection => ({
                    ...collection,
                    source: source,
                    sourceLabel: source === 'copernicus' ? 'Copernicus' : 'Element84',
                    displayTitle: `${collection.title || collection.id} (${source === 'copernicus' ? 'Copernicus' : 'Element84'})`
                }));
                
                allCollections.push(...collectionsWithSource);
                console.log(`✅ Loaded ${collections.length} collections from ${source}`);
                
            } catch (error) {
                console.error(`❌ Error loading collections from ${source}:`, error);
                // Continue with other sources even if one fails
            }
        }
        
        console.log(`🗂️ Total collections loaded: ${allCollections.length}`);
        return allCollections;
    }
    /**
     * Ensure collections are available from all data sources
     * @returns {Promise<boolean>} True if collections are available
     */
    async ensureDataSourceSelected() {
        try {
            // Check if we already have collections loaded in the AI search context
            if (this.allAvailableCollections && this.allAvailableCollections.length > 0) {
                console.log(`🗂️ Using cached collections: ${this.allAvailableCollections.length}`);
                return true;
            }
            
            // Load collections from all data sources
            console.log('🔄 Loading collections from all data sources for AI Search...');
            this.allAvailableCollections = await this.loadAllCollections();
            
            // Update the collection manager with all collections for compatibility
            if (this.collectionManager) {
                this.collectionManager.collections = this.allAvailableCollections;
            }
            
            const hasCollections = this.allAvailableCollections && this.allAvailableCollections.length > 0;
            
            if (hasCollections) {
                console.log(`✅ Successfully loaded ${this.allAvailableCollections.length} collections from all sources`);
            } else {
                console.warn('⚠️ No collections could be loaded from any data source');
            }
            
            return hasCollections;
            
        } catch (error) {
            console.error('❌ Error ensuring collections are loaded:', error);
            return false;
        }
    }
    
    /**
     * Create and show the minimalist search interface
     */
    async showMinimalistSearch() {
        try {
            console.log('🤖 Showing AI Smart Search immediately...');
            
            // Show interface immediately with placeholder collections
            this.createAndShowInterface();
            
            // Load collections in background
            this.loadCollectionsInBackground();
            
        } catch (error) {
            console.error('❌ Error showing AI minimalist search:', error);
            this.notificationService.showNotification('Error showing AI search interface', 'error');
        }
    }
    
    /**
     * Create and show the interface immediately
     */
    createAndShowInterface() {
        // Create fullscreen element
        this.fullscreenElement = document.createElement('div');
        this.fullscreenElement.className = 'ai-fullscreen';
        
        // Set current date for datepickers
        const today = new Date();
        const formattedToday = this.formatDate(today);
        
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        const formattedLast7Days = this.formatDate(last7Days);
        
        // Build interface with enhanced date functionality
        this.fullscreenElement.innerHTML = `
            <div class="ai-fullscreen-header">
                <button class="ai-fullscreen-close" aria-label="Close search">
                    <i class="material-icons">close</i>
                </button>
            </div>
            
            <div class="ai-fullscreen-content">
                <div class="ai-sentence-container">
                    I want 
                    <span class="ai-field ${this.selectedCollection ? '' : 'empty'}" 
                          id="ai-field-collection" 
                          data-placeholder="DATA">${this.selectedCollection ? this.getCollectionDisplayName(this.selectedCollection) : 'DATA'}</span>
                    <div class="ai-dropdown" id="ai-dropdown-collection">
                        <div class="ai-dropdown-edit-section">
                            <input type="text" class="ai-dropdown-edit-input" 
                                placeholder="Type to search collections..." 
                                id="ai-collection-edit-input">
                        </div>
                        <div class="ai-collection-search">
                            <input type="text" class="ai-collection-search-input" 
                                placeholder="Search for datasets...">
                        </div>
                        <div class="ai-collections-list" id="ai-collections-list">
                            <div class="ai-collections-loading">
                                <i class="material-icons ai-loading-spinner">refresh</i>
                                <span>Loading collections from all data sources...</span>
                            </div>
                        </div>
                    </div>
                    over 
                    <span class="ai-field ${this.selectedLocation === 'everywhere' ? 'empty' : ''}" 
                          id="ai-field-location" 
                          data-placeholder="EVERYWHERE">${this.selectedLocation === 'everywhere' ? 'EVERYWHERE' : 'Custom Location'}</span>
                    <div class="ai-dropdown" id="ai-dropdown-location">
                        <div class="ai-dropdown-edit-section">
                            <input type="text" class="ai-dropdown-edit-input" 
                                placeholder="Search for places (e.g., Paris, France, New York)..." 
                                id="ai-location-search-input">
                        </div>
                        
                        <!-- Location Search Results -->
                        <div class="ai-location-search-results" id="ai-location-search-results">
                            <!-- Search results will be populated here -->
                        </div>
                        
                        <!-- Quick Options -->
                        <div class="ai-location-quick-options">
                            <div class="ai-dropdown-item" data-value="everywhere">
                                <i class="material-icons">public</i>
                                <span>EVERYWHERE</span>
                            </div>
                        </div>
                        
                        <!-- Manual Input Options -->
                        <div class="ai-location-manual-input">
                            <div class="ai-location-section-header">
                                <i class="material-icons">my_location</i>
                                <span>Manual Input</span>
                            </div>
                            
                            <!-- Drawing Option -->
                            <div class="ai-location-option">
                                <button class="ai-location-action" id="ai-draw-on-map">
                                    <i class="material-icons">edit</i> Draw on Map
                                </button>
                                <span class="ai-location-option-desc">Draw a bounding box on the map</span>
                            </div>
                            
                            <!-- WKT/GeoJSON Input -->
                            <div class="ai-location-option">
                                <div class="ai-location-geometry-input">
                                    <textarea class="ai-location-textarea" 
                                        placeholder="Paste WKT or GeoJSON polygon..." 
                                        id="ai-location-geometry-input"></textarea>
                                    <div class="ai-location-geometry-actions">
                                        <button class="ai-location-action ai-location-action-small" id="ai-parse-geometry">
                                            <i class="material-icons">check</i> Apply
                                        </button>
                                        <button class="ai-location-action ai-location-action-small" id="ai-clear-geometry">
                                            <i class="material-icons">clear</i> Clear
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    at 
                    <span class="ai-field ${this.selectedDate.type === 'anytime' ? 'empty' : ''}" 
                          id="ai-field-date" 
                          data-placeholder="ANYTIME">${this.getEnhancedDateDisplayText()}</span>
                    ${this.renderSimpleDateDropdown()}
                    with 
                    <span class="ai-field" 
                          id="ai-field-params" 
                          data-placeholder="PARAMETERS">CLOUD COVER: ${this.cloudCover}%</span>
                    <div class="ai-dropdown" id="ai-dropdown-params">
                        <div class="ai-dropdown-edit-section">
                            <input type="text" class="ai-dropdown-edit-input" 
                                placeholder="Type parameters like '20% cloud cover'..." 
                                id="ai-params-edit-input">
                        </div>
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
        
        console.log('🤖 AI Smart Search interface shown immediately');
    }
    
    /**
     * Load collections in the background and update interface
     */
    async loadCollectionsInBackground() {
        try {
            console.log('🔄 Loading collections in background...');
            
            // Load collections from all data sources
            const hasCollections = await this.ensureDataSourceSelected();
            
            if (hasCollections && this.fullscreenElement) {
                // Update the collections list in the interface
                this.updateCollectionsList();
                this.notificationService.showNotification(`🎉 Loaded ${this.allAvailableCollections.length} collections from all sources!`, 'success');
            } else {
                // Show error in collections list
                this.showCollectionsError();
                this.notificationService.showNotification('Could not load collections. You can still search by typing collection names.', 'warning');
            }
            
        } catch (error) {
            console.error('❌ Error loading collections in background:', error);
            this.showCollectionsError();
            this.notificationService.showNotification('Error loading collections. You can still search by typing collection names.', 'warning');
        }
    }
    
    /**
     * Update the collections list in the already-shown interface
     */
    updateCollectionsList() {
        const collectionsContainer = document.getElementById('ai-collections-list');
        if (!collectionsContainer || !this.allAvailableCollections) {
            return;
        }
        
        // Create the collection options with source information
        const collectionItems = this.allAvailableCollections.map(collection => 
            `<div class="ai-dropdown-item" data-value="${collection.id}" data-source="${collection.source}">
                <div class="collection-item-content">
                    <div class="collection-title">${collection.displayTitle || collection.title || collection.id}</div>
                    <div class="collection-id">${collection.id}</div>
                </div>
            </div>`
        ).join('');
        
        // Replace loading with actual collections
        collectionsContainer.innerHTML = collectionItems;
        
        // Re-setup collection field handlers with new items
        this.setupCollectionField();
        
        console.log(`✅ Updated collections list with ${this.allAvailableCollections.length} collections`);
    }
    
    /**
     * Show error state in collections list
     */
    showCollectionsError() {
        const collectionsContainer = document.getElementById('ai-collections-list');
        if (!collectionsContainer) {
            return;
        }
        
        collectionsContainer.innerHTML = `
            <div class="ai-collections-error">
                <i class="material-icons">error_outline</i>
                <span>Could not load collections</span>
                <small>You can still type collection names manually</small>
            </div>
        `;
    }

    
    /**
     * Get display name for a collection from all available collections
     * @param {string} collectionId - Collection ID
     * @returns {string} Display name
     */
    getCollectionDisplayName(collectionId) {
        // First try to find in our loaded collections
        if (this.allAvailableCollections) {
            const collection = this.allAvailableCollections.find(c => c.id === collectionId);
            if (collection) {
                return collection.displayTitle || collection.title || collectionId;
            }
        }
        
        // Fallback to collection manager
        const collection = this.collectionManager.getCollectionById(collectionId);
        return collection ? (collection.title || collectionId) : collectionId;
    }
    /**
     * Get enhanced display text for the date field using DateUtils
     * @returns {string} Display text for date
     */
    getEnhancedDateDisplayText() {
        return DateUtils.getDateDisplayText(this.selectedDate);
    }
    
    /**
     * Get display text for the date field (legacy compatibility)
     * @returns {string} Display text for date
     */
    getDateDisplayText() {
        return this.getEnhancedDateDisplayText();
    }
    
    
    /**
     * Set up event listeners for the minimalist interface
     */
    /**
 * Set up event listeners for the minimalist interface
 */
/**
 * Set up event listeners for the minimalist interface
 */
setupMinimalistEventListeners() {
    // Close button
    const closeButton = this.fullscreenElement.querySelector('.ai-fullscreen-close');
    closeButton.addEventListener('click', () => this.closeFullscreen());
    
    // Set up field click handlers (restored original behavior)
    this.setupFieldClickHandlers();
    
    // Set up dropdown edit inputs (new feature)
    this.setupDropdownEditInputs();
    
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
 * Set up field click handlers - hybrid approach
 * - DATA field: Shows dropdown with collections
 * - LOCATION field: Shows dropdown with location search (FIXED)
 * - Other fields: Direct editing
 */
setupFieldClickHandlers() {
    // DATA field: Show dropdown with collections (not direct editing)
    const collectionField = document.getElementById('ai-field-collection');
    collectionField.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleField('collection');
    });
    
    // LOCATION field: Show dropdown with location search (FIXED)
    const locationField = document.getElementById('ai-field-location');
    locationField.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleField('location');
    });
    
    // Other fields: Show dropdown for date, direct editing for params
    const dateField = document.getElementById('ai-field-date');
    dateField.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleField('date');
    });
    
    const paramsField = document.getElementById('ai-field-params');
    paramsField.addEventListener('click', (e) => {
        e.stopPropagation();
        this.startDirectEdit(paramsField, 'params');
    });
}

/**
 * Start direct editing of a field (simplified approach)
 * @param {HTMLElement} field - The field element
 * @param {string} type - Field type
 */
startDirectEdit(field, type) {
    // Prevent multiple edit sessions
    if (field.contentEditable === 'true') {
        return;
    }
    
    console.log(`🖋️ Starting direct edit for ${type} field`);
    
    // Store original content
    const originalText = field.textContent.trim();
    const isEmptyField = field.classList.contains('empty');
    const placeholder = field.getAttribute('data-placeholder');
    
    // Clear field if it contains placeholder text
    if (isEmptyField || originalText === placeholder) {
        field.textContent = '';
    }
    
    // Enable editing
    field.contentEditable = 'true';
    field.classList.add('ai-field-editing');
    field.classList.remove('empty');
    field.focus();
    
    // Select all text if there's existing content
    if (!isEmptyField && originalText !== placeholder) {
        setTimeout(() => {
            const range = document.createRange();
            range.selectNodeContents(field);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }, 10);
    }
    
    // Create finish editing function
    const finishEdit = () => {
        const newText = field.textContent.trim();
        
        field.contentEditable = 'false';
        field.classList.remove('ai-field-editing');
        
        if (newText && newText !== placeholder) {
            // Process the entered text
            this.processFieldEdit(type, newText, field);
            field.classList.remove('empty');
        } else {
            // Restore to empty state
            field.textContent = placeholder;
            field.classList.add('empty');
            this.resetFieldValue(type);
        }
        
        // Clean up event listeners
        field.removeEventListener('blur', finishEdit);
        field.removeEventListener('keydown', keyHandler);
    };
    
    const keyHandler = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finishEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            // Restore original state
            field.contentEditable = 'false';
            field.classList.remove('ai-field-editing');
            
            if (isEmptyField) {
                field.textContent = placeholder;
                field.classList.add('empty');
            } else {
                field.textContent = originalText;
                field.classList.remove('empty');
            }
            
            // Clean up
            field.removeEventListener('blur', finishEdit);
            field.removeEventListener('keydown', keyHandler);
        }
    };
    
    // Add event listeners
    field.addEventListener('blur', finishEdit);
    field.addEventListener('keydown', keyHandler);
}

/**
 * Process field edit and update internal state
 * @param {string} type - Field type
 * @param {string} text - New text
 * @param {HTMLElement} field - Field element
 */
processFieldEdit(type, text, field) {
    switch (type) {
        case 'collection':
            this.handleCollectionEdit(text, field);
            break;
        case 'location':
            this.handleLocationEdit(text, field);
            break;
        case 'date':
            this.handleDateEdit(text, field);
            break;
        case 'params':
            this.handleParamsEdit(text, field);
            break;
    }
}

/**
 * Handle collection field editing
 */
handleCollectionEdit(text, field) {
    // Try to find matching collection from all available collections
    const collections = this.allAvailableCollections || [];
    const match = collections.find(c => 
        c.title?.toLowerCase().includes(text.toLowerCase()) ||
        c.id?.toLowerCase().includes(text.toLowerCase()) ||
        text.toLowerCase().includes(c.title?.toLowerCase()) ||
        text.toLowerCase().includes(c.id?.toLowerCase()) ||
        c.displayTitle?.toLowerCase().includes(text.toLowerCase())
    );
    
    if (match) {
        this.selectedCollection = match.id;
        this.selectedCollectionSource = match.source;
        field.textContent = match.displayTitle || match.title || match.id;
    } else {
        // Use the text as-is and try to find it later
        this.selectedCollection = text;
        this.selectedCollectionSource = null;
        field.textContent = text;
    }
    
    console.log(`📋 Collection set to: ${this.selectedCollection} from ${this.selectedCollectionSource || 'unknown source'}`);
}

/**
 * Handle location field editing
 */
handleLocationEdit(text, field) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('everywhere') || lowerText.includes('global') || lowerText.includes('world')) {
        this.selectedLocation = 'everywhere';
        field.textContent = 'EVERYWHERE';
    } else if (lowerText.includes('polygon') || lowerText.includes('point') || lowerText.includes('geojson')) {
        // Assume it's geometry data
        this.selectedLocation = text;
        field.textContent = 'Custom Geometry';
    } else {
        // Treat as location description
        this.selectedLocation = text;
        field.textContent = text;
    }
    
    console.log(`🗺️ Location set to: ${this.selectedLocation}`);
}

/**
 * Handle date field editing
 */
handleDateEdit(text, field) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('anytime') || lowerText.includes('any time') || lowerText.includes('all')) {
        this.selectedDate = { type: 'anytime', start: null, end: null };
        field.textContent = 'ANYTIME';
    } else if (lowerText.includes('week') || lowerText.includes('7 day')) {
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - 7);
        this.selectedDate = {
            type: 'last7',
            start: this.formatDate(start),
            end: this.formatDate(today)
        };
        field.textContent = 'Last 7 days';
    } else if (lowerText.includes('month') || lowerText.includes('30 day')) {
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - 30);
        this.selectedDate = {
            type: 'last30',
            start: this.formatDate(start),
            end: this.formatDate(today)
        };
        field.textContent = 'Last 30 days';
    } else if (lowerText.includes('3 month') || lowerText.includes('90 day') || lowerText.includes('quarter')) {
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - 90);
        this.selectedDate = {
            type: 'last90',
            start: this.formatDate(start),
            end: this.formatDate(today)
        };
        field.textContent = 'Last 3 months';
    } else {
        // Try to parse as custom date or keep as-is
        field.textContent = text;
        console.log('📅 Custom date text:', text);
    }
    
    console.log(`📅 Date set to:`, this.selectedDate);
}

/**
 * Handle parameters field editing
 */
handleParamsEdit(text, field) {
    // Try to extract cloud cover percentage
    const cloudMatch = text.match(/(\d+)%?/);
    if (cloudMatch) {
        const value = parseInt(cloudMatch[1]);
        if (value >= 0 && value <= 100) {
            this.cloudCover = value;
            field.textContent = `Cloud Cover: ${value}%`;
            console.log(`☁️ Cloud cover set to: ${value}%`);
            return;
        }
    }
    
    // If no cloud cover found, keep the text as-is
    field.textContent = text;
    console.log('⚙️ Custom parameters:', text);
}

/**
 * Reset field value to default
 */
resetFieldValue(type) {
    switch (type) {
        case 'collection':
            this.selectedCollection = '';
            break;
        case 'location':
            this.selectedLocation = 'everywhere';
            break;
        case 'date':
            this.selectedDate = { type: 'anytime', start: null, end: null };
            break;
        case 'params':
            this.cloudCover = 20;
            break;
    }
}

/**
 * Enable editing mode for a field (DEPRECATED - keeping for compatibility)
 * @param {HTMLElement} field - The field element
 * @param {string} type - Field type
 */
editField(field, type) {
    const originalText = field.textContent.trim();
    const wasEmpty = field.classList.contains('empty');
    const placeholder = field.getAttribute('data-placeholder');
    
    // Clear the field content for editing
    if (wasEmpty || originalText === placeholder) {
        field.textContent = '';
    }
    
    // Remove empty class and enable editing
    field.classList.remove('empty');
    field.contentEditable = 'true';
    field.classList.add('ai-field-editing');
    field.focus();
    
    // If there's existing content (not placeholder), select it
    if (!wasEmpty && originalText !== placeholder) {
        setTimeout(() => {
            const range = document.createRange();
            range.selectNodeContents(field);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }, 10);
    }
    
    // Finish editing function
    const finishEdit = () => {
        field.contentEditable = 'false';
        field.classList.remove('ai-field-editing');
        
        const newText = field.textContent.trim();
        
        if (newText && newText !== placeholder) {
            // User entered meaningful text
            this.processEditedField(type, newText, field);
            field.classList.remove('empty');
        } else {
            // No meaningful text entered, restore empty state
            field.textContent = placeholder;
            field.classList.add('empty');
            
            // If we had original content and user cleared it, restore original
            if (!wasEmpty && originalText !== placeholder) {
                field.textContent = originalText;
                field.classList.remove('empty');
            }
        }
        
        field.removeEventListener('blur', finishEdit);
        field.removeEventListener('keydown', keyHandler);
    };
    
    const keyHandler = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finishEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            // Restore original state on escape
            if (wasEmpty) {
                field.textContent = placeholder;
                field.classList.add('empty');
            } else {
                field.textContent = originalText;
                field.classList.remove('empty');
            }
            finishEdit();
        }
    };
    
    field.addEventListener('blur', finishEdit);
    field.addEventListener('keydown', keyHandler);
    
    console.log(`✏️ Started editing ${type} field`);
}



/**
 * Process edited field content
 * @param {string} type - Field type
 * @param {string} text - New text
 * @param {HTMLElement} field - Field element
 */
processEditedField(type, text, field) {
    switch (type) {
        case 'collection':
            const collections = this.collectionManager.collections || [];
            const match = collections.find(c => 
                c.title?.toLowerCase().includes(text.toLowerCase()) ||
                c.id?.toLowerCase().includes(text.toLowerCase())
            );
            
            if (match) {
                this.selectedCollection = match.id;
                field.textContent = match.title || match.id;
            } else {
                this.selectedCollection = text;
                field.textContent = text;
            }
            break;
            
        case 'location':
            if (text.toLowerCase().includes('everywhere') || text.toLowerCase().includes('global')) {
                this.selectedLocation = 'everywhere';
                field.textContent = 'EVERYWHERE';
            } else {
                this.selectedLocation = text;
                field.textContent = text;
            }
            break;
            
        case 'date':
            const lowerText = text.toLowerCase();
            if (lowerText.includes('anytime')) {
                this.selectedDate = { type: 'anytime', start: null, end: null };
                field.textContent = 'ANYTIME';
            } else if (lowerText.includes('week') || lowerText.includes('7')) {
                const today = new Date();
                const start = new Date();
                start.setDate(today.getDate() - 7);
                this.selectedDate = {
                    type: 'last7',
                    start: this.formatDate(start),
                    end: this.formatDate(today)
                };
                field.textContent = 'Last 7 days';
            } else if (lowerText.includes('month') || lowerText.includes('30')) {
                const today = new Date();
                const start = new Date();
                start.setDate(today.getDate() - 30);
                this.selectedDate = {
                    type: 'last30',
                    start: this.formatDate(start),
                    end: this.formatDate(today)
                };
                field.textContent = 'Last 30 days';
            } else {
                field.textContent = text;
            }
            break;
            
        case 'params':
            const cloudMatch = text.match(/(\d+)%?/);
            if (cloudMatch) {
                const value = parseInt(cloudMatch[1]);
                if (value >= 0 && value <= 100) {
                    this.cloudCover = value;
                    field.textContent = `Cloud Cover: ${value}%`;
                    return;
                }
            }
            field.textContent = text;
            break;
    }
    
    field.classList.remove('empty');
}


/**
 * Set up dropdown edit inputs for direct typing
 */
setupDropdownEditInputs() {
    // Collection edit input
    const collectionEditInput = document.getElementById('ai-collection-edit-input');
    if (collectionEditInput) {
        collectionEditInput.addEventListener('input', (e) => {
            this.handleCollectionTextChange(e.target.value);
            this.filterCollections(e.target.value);
        });
        
        collectionEditInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const text = e.target.value.trim();
                if (text) {
                    const collectionField = document.getElementById('ai-field-collection');
                    collectionField.textContent = text;
                    collectionField.classList.remove('empty');
                    this.closeDropdowns();
                }
            }
        });
    }
    
    // Location edit input
    const locationEditInput = document.getElementById('ai-location-edit-input');
    if (locationEditInput) {
        locationEditInput.addEventListener('input', (e) => {
            this.selectedLocation = e.target.value.trim() || 'everywhere';
        });
        
        locationEditInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const text = e.target.value.trim();
                const locationField = document.getElementById('ai-field-location');
                if (text) {
                    locationField.textContent = text;
                    this.selectedLocation = text;
                } else {
                    locationField.textContent = 'EVERYWHERE';
                    this.selectedLocation = 'everywhere';
                }
                locationField.classList.remove('empty');
                this.closeDropdowns();
            }
        });
    }
    
    // Date edit input
    const dateEditInput = document.getElementById('ai-date-edit-input');
    if (dateEditInput) {
        dateEditInput.addEventListener('input', (e) => {
            this.handleDateTextChange(e.target.value);
        });
        
        dateEditInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleDateTextChange(e.target.value);
                const dateField = document.getElementById('ai-field-date');
                dateField.textContent = this.getDateDisplayText();
                dateField.classList.remove('empty');
                this.closeDropdowns();
            }
        });
    }
    
    // Parameters edit input
    const paramsEditInput = document.getElementById('ai-params-edit-input');
    if (paramsEditInput) {
        paramsEditInput.addEventListener('input', (e) => {
            this.handleParametersTextChange(e.target.value);
        });
        
        paramsEditInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleParametersTextChange(e.target.value);
                const paramsField = document.getElementById('ai-field-params');
                paramsField.textContent = `Cloud Cover: ${this.cloudCover}%`;
                paramsField.classList.remove('empty');
                this.closeDropdowns();
            }
        });
    }
}


    /**
     * Handle collection text changes
     * @param {string} text - The entered text
     */
    handleCollectionTextChange(text) {
        if (!text) {return;}
        
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
     * Set up collection field handlers - enhanced dropdown with all collections
     */
    setupCollectionField() {
        // Collection search input
        const collectionSearch = this.fullscreenElement.querySelector('.ai-collection-search-input');
        if (collectionSearch) {
            collectionSearch.addEventListener('input', (e) => {
                this.filterCollections(e.target.value);
            });
        }
        
        // Collection items - ensure all collections are clickable
        const collectionItems = this.fullscreenElement.querySelectorAll('#ai-dropdown-collection .ai-dropdown-item');
        console.log(`🗂️ Found ${collectionItems.length} collection items to set up`);
        
        collectionItems.forEach((item, index) => {
            item.addEventListener('click', (e) => {
                const collectionId = item.dataset.value;
                const collectionSource = item.dataset.source;
                console.log(`💆 Clicked collection: ${collectionId} from ${collectionSource}`);
                
                if (!collectionId) {
                    console.error('⚠️ Collection item missing data-value:', item);
                    return;
                }
                
                // Store both collection ID and source for later API calls
                this.selectedCollection = collectionId;
                this.selectedCollectionSource = collectionSource;
                
                const collectionField = document.getElementById('ai-field-collection');
                const displayName = this.getCollectionDisplayName(collectionId);
                
                collectionField.textContent = displayName;
                collectionField.classList.remove('empty');
                
                console.log(`📋 Selected collection: ${collectionId} from ${collectionSource} (${displayName})`);
                
                this.closeDropdowns();
                e.stopPropagation();
            });
            
            console.log(`  - Set up collection item ${index + 1}: ${item.dataset.value} (${item.dataset.source})`);
        });
        
        console.log(`✅ Set up ${collectionItems.length} collection items for selection`);
    }
    
    /**
     * Set up location field handlers with enhanced geocoding functionality
     */
    setupLocationField() {
        // Location search input with autocomplete
        const locationSearchInput = document.getElementById('ai-location-search-input');
        if (locationSearchInput) {
            locationSearchInput.addEventListener('input', (e) => {
                this.handleLocationSearch(e.target.value);
            });
            
            locationSearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const firstResult = document.querySelector('.ai-location-result-item');
                    if (firstResult) {
                        firstResult.click();
                    }
                }
            });
        }
        
        // Everywhere option
        const everywhereOption = this.fullscreenElement.querySelector('#ai-dropdown-location .ai-dropdown-item[data-value="everywhere"]');
        if (everywhereOption) {
            everywhereOption.addEventListener('click', (e) => {
                this.selectedLocation = "everywhere";
                this.selectedLocationResult = null;
                const locationField = document.getElementById('ai-field-location');
                locationField.textContent = "EVERYWHERE";
                locationField.classList.add('empty');
                this.closeDropdowns();
                e.stopPropagation();
            });
        }
        
        // Draw on map button
        const drawOnMapBtn = document.getElementById('ai-draw-on-map');
        if (drawOnMapBtn) {
            drawOnMapBtn.addEventListener('click', () => {
                this.handleDrawOnMap();
            });
        }
        
        // Geometry input handling
        const geometryInput = document.getElementById('ai-location-geometry-input');
        const parseGeometryBtn = document.getElementById('ai-parse-geometry');
        const clearGeometryBtn = document.getElementById('ai-clear-geometry');
        
        if (parseGeometryBtn) {
            parseGeometryBtn.addEventListener('click', () => {
                this.handleGeometryInput(geometryInput.value);
            });
        }
        
        if (clearGeometryBtn) {
            clearGeometryBtn.addEventListener('click', () => {
                geometryInput.value = '';
                this.resetLocationSelection();
            });
        }
    }
    
    /**
     * Handle location search with geocoding service
     * @param {string} query - Search query
     */
    handleLocationSearch(query) {
        const resultsContainer = document.getElementById('ai-location-search-results');
        
        if (!query || query.trim().length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }
        
        // Show loading indicator
        resultsContainer.innerHTML = '<div class="ai-location-loading"><i class="material-icons">search</i> Searching...</div>';
        
        // Use geocoding service with debouncing
        this.geocodingService.searchLocations(query, (results, error) => {
            if (error) {
                resultsContainer.innerHTML = '<div class="ai-location-error"><i class="material-icons">error</i> Search failed</div>';
                console.error('Location search error:', error);
                return;
            }
            
            this.displayLocationResults(results);
        });
    }
    
    /**
     * Display location search results
     * @param {Array} results - Search results from geocoding service
     */
    displayLocationResults(results) {
        const resultsContainer = document.getElementById('ai-location-search-results');
        
        if (!results || results.length === 0) {
            resultsContainer.innerHTML = '<div class="ai-location-no-results"><i class="material-icons">location_off</i> No results found</div>';
            return;
        }
        
        // Sort results by relevance score
        const sortedResults = results.sort((a, b) => b.relevanceScore - a.relevanceScore);
        
        const resultItems = sortedResults.map((result, index) => {
            const categoryIcon = this.getLocationCategoryIcon(result.category);
            const bbox = result.bbox ? `${result.bbox[0].toFixed(2)}, ${result.bbox[1].toFixed(2)}, ${result.bbox[2].toFixed(2)}, ${result.bbox[3].toFixed(2)}` : 'No bbox';
            
            return `
                <div class="ai-location-result-item" data-index="${index}">
                    <div class="ai-location-result-main">
                        <i class="material-icons ai-location-result-icon">${categoryIcon}</i>
                        <div class="ai-location-result-info">
                            <div class="ai-location-result-name">${result.formattedName}</div>
                            <div class="ai-location-result-details">
                                <span class="ai-location-result-category">${result.category}</span>
                                ${result.bbox ? `<span class="ai-location-result-bbox">bbox: ${bbox}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="ai-location-result-actions">
                        <button class="ai-location-result-select" title="Select this location">
                            <i class="material-icons">check</i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        resultsContainer.innerHTML = resultItems;
        
        // Add click handlers to result items
        const resultElements = resultsContainer.querySelectorAll('.ai-location-result-item');
        resultElements.forEach((element, index) => {
            element.addEventListener('click', () => {
                this.selectLocationResult(sortedResults[index]);
            });
        });
    }
    
    /**
     * Get icon for location category
     * @param {string} category - Location category
     * @returns {string} Material icon name
     */
    getLocationCategoryIcon(category) {
        const icons = {
            'country': 'flag',
            'state': 'map',
            'city': 'location_city',
            'town': 'home',
            'village': 'cottage',
            'neighborhood': 'neighborhood',
            'administrative': 'account_balance',
            'natural': 'nature',
            'address': 'home',
            'other': 'place'
        };
        return icons[category] || 'place';
    }
    
    /**
     * Select a location result
     * @param {Object} locationResult - Selected location result
     */
    selectLocationResult(locationResult) {
        this.selectedLocationResult = locationResult;
        this.selectedLocation = locationResult.bbox || locationResult.coordinates;
        
        const locationField = document.getElementById('ai-field-location');
        locationField.textContent = locationResult.shortName || locationResult.formattedName;
        locationField.classList.remove('empty');
        
        console.log('📍 Selected location:', locationResult);
        
        this.closeDropdowns();
    }
    
    /**
     * Handle draw on map functionality
     */
    handleDrawOnMap() {
        // Temporarily close the fullscreen to allow drawing on the map
        this.closeFullscreen();
        
        // Start drawing mode with a callback function
        if (this.mapManager) {
            this.mapManager.startDrawingBbox((bbox) => {
                // After drawing is complete, this callback will be called
                console.log('🗺️ Drawing callback received bbox:', bbox);
                
                // Store the bbox
                this.selectedLocation = bbox;
                this.selectedLocationResult = {
                    formattedName: 'Map Selection',
                    shortName: 'Map Selection',
                    bbox: bbox,
                    category: 'drawn'
                };
                
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
    }
    
    /**
     * Handle geometry input (WKT/GeoJSON)
     * @param {string} geometryText - Input geometry text
     */
    handleGeometryInput(geometryText) {
        if (!geometryText || !geometryText.trim()) {
            this.notificationService.showNotification('Please enter WKT or GeoJSON', 'warning');
            return;
        }
        
        const text = geometryText.trim();
        let geojson = null;
        let bbox = null;
        
        try {
            // Try to parse as GeoJSON first
            if (isGeoJSON(text)) {
                geojson = parseGeoJSON(text);
                bbox = geojsonToBbox(geojson);
            } else if (isWKT(text)) {
                // Try to parse as WKT
                geojson = wktToGeoJSON(text);
                bbox = geojsonToBbox(geojson);
            } else {
                throw new Error('Invalid geometry format');
            }
            
            if (!bbox) {
                throw new Error('Could not extract bounding box from geometry');
            }
            
            // Store the result
            this.selectedLocation = bbox;
            this.selectedLocationResult = {
                formattedName: 'Custom Geometry',
                shortName: 'Custom Geometry',
                bbox: bbox,
                category: 'geometry',
                geojson: geojson
            };
            
            const locationField = document.getElementById('ai-field-location');
            locationField.textContent = "Custom Geometry";
            locationField.classList.remove('empty');
            
            this.notificationService.showNotification('Geometry parsed successfully!', 'success');
            console.log('📐 Parsed geometry:', { geojson, bbox });
            
        } catch (error) {
            console.error('❌ Error parsing geometry:', error);
            this.notificationService.showNotification('Invalid WKT or GeoJSON format', 'error');
        }
    }
    
    /**
     * Update the location field display (called by GeometrySync)
     * @param {string} displayName - Display name for the location
     * @param {string} category - Category of location
     */
    updateLocationFieldDisplay(displayName, category) {
        // This can be called even when the AI Search interface is not open
        // It updates the internal state so when AI Search opens, it shows the correct location
        
        this.selectedLocation = this.selectedLocationResult?.bbox || this.selectedLocation;
        
        console.log(`📍 AI Search location updated: ${displayName} (${category})`);
        
        // If AI Search is currently open, update the field immediately
        if (this.fullscreenElement && document.body.contains(this.fullscreenElement)) {
            const locationField = document.getElementById('ai-field-location');
            if (locationField) {
                locationField.textContent = displayName;
                locationField.classList.remove('empty');
                console.log('✅ AI Search location field updated in real-time');
            }
        }
    }
    
    /**
     * Reset location selection to default
     */
    resetLocationSelection() {
        this.selectedLocation = "everywhere";
        this.selectedLocationResult = null;
        const locationField = document.getElementById('ai-field-location');
        if (locationField) {
            locationField.textContent = "EVERYWHERE";
            locationField.classList.add('empty');
        }
    }
    
    /**
     * Render simple date dropdown with list of suggestions
     * @returns {string} HTML for simple date dropdown
     */
    renderSimpleDateDropdown() {
        const today = new Date();
        const formattedToday = DateUtils.formatDate(today);
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);
        const formattedLastWeek = DateUtils.formatDate(lastWeek);
        
        // Simple list of date suggestions
        const dateOptions = [
            { type: 'anytime', label: 'ANYTIME', icon: 'all_inclusive', description: 'No date restriction' },
            { type: 'today', label: 'Today', icon: 'today', description: 'Today only' },
            { type: 'yesterday', label: 'Yesterday', icon: 'history', description: 'Yesterday only' },
            { type: 'last7days', label: 'Last 7 days', icon: 'view_week', description: 'Past week including today' },
            { type: 'thisweek', label: 'This week', icon: 'date_range', description: 'Monday to Sunday (current week)' },
            { type: 'lastweek', label: 'Last week', icon: 'skip_previous', description: 'Previous Monday to Sunday' },
            { type: 'last30days', label: 'Last 30 days', icon: 'calendar_month', description: 'Past month including today' },
            { type: 'thismonth', label: 'This month', icon: 'calendar_today', description: 'Current month' },
            { type: 'lastmonth', label: 'Last month', icon: 'skip_previous', description: 'Previous month' },
            { type: 'last90days', label: 'Last 3 months', icon: 'calendar_view_month', description: 'Past 3 months' },
            { type: 'last6months', label: 'Last 6 months', icon: 'view_timeline', description: 'Past 6 months' },
            { type: 'thisyear', label: 'This year', icon: 'calendar_view_year', description: 'Current year' },
            { type: 'lastyear', label: 'Last year', icon: 'skip_previous', description: 'Previous year' },
            { type: 'custom', label: 'Custom range...', icon: 'tune', description: 'Select your own dates' }
        ];
        
        const optionsList = dateOptions.map(option => `
            <div class="ai-date-option" data-type="${option.type}" title="${option.description}">
                <i class="material-icons">${option.icon}</i>
                <div class="ai-date-option-content">
                    <div class="ai-date-option-label">${option.label}</div>
                    <div class="ai-date-option-description">${option.description}</div>
                </div>
            </div>
        `).join('');
        
        return `
            <div class="ai-dropdown ai-dropdown-simple" id="ai-dropdown-date">
                <div class="ai-dropdown-header">
                    <div class="ai-dropdown-edit-section">
                        <input type="text" class="ai-dropdown-edit-input" 
                            placeholder="Type date like 'last week', 'this month'..." 
                            id="ai-date-edit-input">
                        <button class="ai-dropdown-parse-btn" id="ai-parse-date-btn" title="Parse natural language date">
                            <i class="material-icons">psychology</i>
                        </button>
                    </div>
                </div>
                
                <div class="ai-dropdown-body">
                    <div class="ai-date-options-list">
                        ${optionsList}
                    </div>
                    
                    <!-- Custom Date Range Section (shown when custom is selected) -->
                    <div class="ai-date-custom-section" id="ai-date-custom-section" style="display: none;">
                        <div class="ai-date-section-header">
                            <div>
                                <i class="material-icons">date_range</i>
                                <span>Custom Date Range</span>
                            </div>
                        </div>
                        
                        <div class="ai-date-custom-inputs">
                            <div class="ai-date-input-group">
                                <label for="ai-date-start">From:</label>
                                <input type="date" class="ai-date-input" id="ai-date-start" 
                                    value="${formattedLastWeek}">
                            </div>
                            <div class="ai-date-input-separator">
                                <i class="material-icons">arrow_forward</i>
                            </div>
                            <div class="ai-date-input-group">
                                <label for="ai-date-end">To:</label>
                                <input type="date" class="ai-date-input" id="ai-date-end" 
                                    value="${formattedToday}">
                            </div>
                            <button class="ai-apply-btn" id="ai-apply-custom-date">
                                <i class="material-icons">check</i>
                                Apply Range
                            </button>
                        </div>
                        
                        <!-- Date Range Validation -->
                        <div class="ai-date-validation" id="ai-date-validation" style="display: none;">
                            <div class="ai-date-validation-content">
                                <i class="material-icons ai-validation-icon">info</i>
                                <span class="ai-validation-message" id="ai-validation-message"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Get category title for UI display
     * @param {string} category - Category key
     * @returns {string} Display title
     */
    getCategoryTitle(category) {
        const titles = {
            'any': 'Any Time',
            'recent': 'Recent',
            'periods': 'Time Periods',
            'extended': 'Extended Ranges',
            'custom': 'Custom'
        };
        return titles[category] || category;
    }
    
    /**
     * Get category icon for UI display
     * @param {string} category - Category key
     * @returns {string} Material icon name
     */
    getCategoryIcon(category) {
        const icons = {
            'any': 'all_inclusive',
            'recent': 'schedule',
            'periods': 'date_range',
            'extended': 'view_timeline',
            'custom': 'tune'
        };
        return icons[category] || 'date_range';
    }
    
    /**
     * Set up simple date field with list-based functionality
     */
    setupDateField() {
        // Natural language date parsing
        const dateEditInput = document.getElementById('ai-date-edit-input');
        const parseDateBtn = document.getElementById('ai-parse-date-btn');
        
        if (parseDateBtn) {
            parseDateBtn.addEventListener('click', () => {
                const text = dateEditInput.value.trim();
                if (text) {
                    this.parseNaturalLanguageDate(text);
                }
            });
        }
        
        if (dateEditInput) {
            dateEditInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const text = e.target.value.trim();
                    if (text) {
                        this.parseNaturalLanguageDate(text);
                    }
                }
            });
        }
        
        // Date option list items
        const dateOptions = this.fullscreenElement.querySelectorAll('.ai-date-option');
        dateOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const optionType = option.dataset.type;
                
                if (optionType === 'custom') {
                    // Show custom date section
                    this.showCustomDateSection();
                } else {
                    // Apply preset and close
                    this.applyDatePreset(optionType);
                }
                e.stopPropagation();
            });
        });
        
        // Custom date range handlers
        const applyCustomDateBtn = document.getElementById('ai-apply-custom-date');
        if (applyCustomDateBtn) {
            applyCustomDateBtn.addEventListener('click', (e) => {
                this.applyCustomDateRange();
                e.stopPropagation();
            });
        }
        
        // Date range validation
        const startInput = document.getElementById('ai-date-start');
        const endInput = document.getElementById('ai-date-end');
        
        [startInput, endInput].forEach(input => {
            if (input) {
                input.addEventListener('change', () => {
                    this.validateDateRange();
                });
            }
        });
    }
    
    /**
     * Show the custom date range section
     */
    showCustomDateSection() {
        const customSection = document.getElementById('ai-date-custom-section');
        if (customSection) {
            customSection.style.display = 'block';
            
            // Focus on the start date input
            const startInput = document.getElementById('ai-date-start');
            if (startInput) {
                setTimeout(() => startInput.focus(), 100);
            }
        }
    }
    
    /**
     * Parse natural language date input
     * @param {string} text - Natural language date text
     */
    parseNaturalLanguageDate(text) {
        const parsed = DateUtils.parseNaturalLanguageDate(text);
        
        if (parsed) {
            this.selectedDate = parsed;
            this.updateDateField();
            this.validateDateRange();
            this.notificationService.showNotification(`✅ Parsed date: "${text}"`, 'success');
        } else {
            this.notificationService.showNotification(`❌ Could not parse: "${text}". Try "last week", "this month", etc.`, 'warning');
        }
    }
    
    /**
     * Apply a date preset
     * @param {string} presetType - Type of preset to apply
     */
    applyDatePreset(presetType) {
        const range = DateUtils.calculateDateRange(presetType);
        
        this.selectedDate = {
            type: presetType,
            start: range.start,
            end: range.end,
            preset: presetType
        };
        
        this.updateDateField();
        this.closeDropdowns();
        
        console.log(`📅 Applied date preset: ${presetType}`, this.selectedDate);
    }
    
    /**
     * Apply custom date range
     */
    applyCustomDateRange() {
        const startInput = document.getElementById('ai-date-start');
        const endInput = document.getElementById('ai-date-end');
        
        if (startInput && endInput) {
            const validation = DateUtils.validateDateRange(startInput.value, endInput.value);
            
            if (validation.isValid) {
                this.selectedDate = {
                    type: 'custom',
                    start: startInput.value,
                    end: endInput.value,
                    preset: null
                };
                
                this.updateDateField();
                this.showDateValidation(validation.message, 'success');
                this.closeDropdowns();
            } else {
                this.showDateValidation(validation.message, 'error');
            }
        }
    }
    
    /**
     * Validate current date range
     */
    validateDateRange() {
        const startInput = document.getElementById('ai-date-start');
        const endInput = document.getElementById('ai-date-end');
        
        if (startInput && endInput && startInput.value && endInput.value) {
            const validation = DateUtils.validateDateRange(startInput.value, endInput.value);
            this.showDateValidation(validation.message, validation.isValid ? 'success' : 'error');
        } else {
            this.hideDateValidation();
        }
    }
    
    /**
     * Show date validation message
     * @param {string} message - Validation message
     * @param {string} type - Message type ('success', 'error', 'info')
     */
    showDateValidation(message, type) {
        const validation = document.getElementById('ai-date-validation');
        const messageEl = document.getElementById('ai-validation-message');
        const iconEl = validation?.querySelector('.ai-validation-icon');
        
        if (validation && messageEl && iconEl) {
            messageEl.textContent = message;
            
            validation.className = `ai-date-validation ai-validation-${type}`;
            iconEl.textContent = type === 'success' ? 'check_circle' : 
                                type === 'error' ? 'error' : 'info';
            
            validation.style.display = 'block';
        }
    }
    
    /**
     * Hide date validation message
     */
    hideDateValidation() {
        const validation = document.getElementById('ai-date-validation');
        if (validation) {
            validation.style.display = 'none';
        }
    }
    
    /**
     * Update date field display
     */
    updateDateField() {
        const dateField = document.getElementById('ai-field-date');
        if (dateField) {
            const displayText = this.getEnhancedDateDisplayText();
            dateField.textContent = displayText;
            dateField.classList.toggle('empty', this.selectedDate.type === 'anytime');
        }
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
    
    // Toggle field dropdown visibility
    toggleField(fieldId) {
        console.log(`🔄 Toggling field: ${fieldId}`);
        
        // Close any open dropdown first
        this.closeDropdowns();
        
        // Then open the clicked one
        const field = document.getElementById(`ai-field-${fieldId}`);
        const dropdown = document.getElementById(`ai-dropdown-${fieldId}`);
        
        if (!field) {
            console.error(`❌ Field ai-field-${fieldId} not found`);
            return;
        }
        
        if (!dropdown) {
            console.error(`❌ Dropdown ai-dropdown-${fieldId} not found`);
            return;
        }
        
        // Add active class to field
        field.classList.add('active');
        this.activeField = fieldId;
        
        // Force show dropdown with inline styles as backup
        dropdown.style.display = 'block';
        dropdown.style.visibility = 'visible';
        dropdown.style.opacity = '1';
        dropdown.style.zIndex = '1001';
        
        console.log(`✅ Field ${fieldId} activated`);
        console.log(`  - Field has active class: ${field.classList.contains('active')}`);
        console.log(`  - Dropdown display: ${window.getComputedStyle(dropdown).display}`);
        console.log(`  - Dropdown visibility: ${window.getComputedStyle(dropdown).visibility}`);
        
        // Handle field-specific functionality
        if (fieldId === 'collection') {
            // Collection-specific setup
            const collectionItems = dropdown.querySelectorAll('.ai-dropdown-item');
            console.log(`🗂️ Collection dropdown opened with ${collectionItems.length} items`);
            
            setTimeout(() => {
                const searchInput = this.fullscreenElement.querySelector('.ai-collection-search-input');
                if (searchInput) {
                    searchInput.focus();
                    console.log('🔍 Collection search input focused');
                }
            }, 100);
        } else if (fieldId === 'location') {
            // Location-specific setup
            console.log('🌍 Location dropdown opened');
            
            setTimeout(() => {
                const locationSearchInput = document.getElementById('ai-location-search-input');
                if (locationSearchInput) {
                    locationSearchInput.focus();
                    console.log('🔍 Location search input focused');
                }
            }, 100);
            
            // Clear any previous search results
            const resultsContainer = document.getElementById('ai-location-search-results');
            if (resultsContainer) {
                resultsContainer.innerHTML = '';
            }
        } else if (fieldId === 'date') {
            // Date-specific setup
            console.log('📅 Date dropdown opened');
            
            // Focus on natural language input if available
            setTimeout(() => {
                const dateEditInput = document.getElementById('ai-date-edit-input');
                if (dateEditInput) {
                    dateEditInput.focus();
                    console.log('🔍 Date edit input focused');
                }
            }, 100);
        }
    }
    
    /**
     * Close all open dropdowns - enhanced cleanup
     */
    closeDropdowns() {
        if (!this.fullscreenElement) {return;}
        
        const activeFields = this.fullscreenElement.querySelectorAll('.ai-field.active');
        console.log(`🔄 Closing ${activeFields.length} active dropdowns`);
        
        activeFields.forEach(field => {
            field.classList.remove('active');
            
            // Find and clean up corresponding dropdown
            const fieldId = field.id.replace('ai-field-', '');
            const dropdown = document.getElementById(`ai-dropdown-${fieldId}`);
            
            if (dropdown) {
                // Remove inline styles that were added as backup
                dropdown.style.display = '';
                dropdown.style.visibility = '';
                dropdown.style.opacity = '';
                dropdown.style.zIndex = '';
            }
        });
        
        this.activeField = null;
        console.log('✅ All dropdowns closed');
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
            const collectionId = item.dataset.value?.toLowerCase() || '';
            const source = item.dataset.source?.toLowerCase() || '';
            
            // Search in title, ID, and source
            const matches = normalizedQuery === '' || 
                           text.includes(normalizedQuery) ||
                           collectionId.includes(normalizedQuery) ||
                           source.includes(normalizedQuery);
            
            if (matches) {
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
            const missingFields = [];
            
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
                if (Array.isArray(this.selectedLocation) && this.selectedLocation.length === 4) {
                    // Direct bbox array
                    params.bbox = this.selectedLocation;
                } else if (this.selectedLocationResult && this.selectedLocationResult.bbox) {
                    // From geocoding result
                    params.bbox = this.selectedLocationResult.bbox;
                } else if (typeof this.selectedLocation === 'string') {
                    // Try to parse geometry string
                    try {
                        let geojson = null;
                        
                        if (isGeoJSON(this.selectedLocation)) {
                            geojson = parseGeoJSON(this.selectedLocation);
                        } else if (isWKT(this.selectedLocation)) {
                            geojson = wktToGeoJSON(this.selectedLocation);
                        }
                        
                        if (geojson) {
                            const bbox = geojsonToBbox(geojson);
                            if (bbox) {
                                params.bbox = bbox;
                            }
                        }
                    } catch (e) {
                        console.warn('⚠️ Could not parse location geometry:', e);
                    }
                }
            }
            
            // Show notification
            this.notificationService.showNotification('Processing your search request...', 'info');
            
            // Log the parameters
            console.log('🔍 AI Smart Search Parameters:', params);
            
            // Close the fullscreen
            this.closeFullscreen();
            
            // Ensure sidebar is visible after search execution
            this.ensureSidebarVisible();
            
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
            
            // If we have a selected collection with source info, set the API client accordingly
            if (this.selectedCollectionSource && this.selectedCollection) {
                console.log(`🔌 Setting API client to use ${this.selectedCollectionSource} for collection ${this.selectedCollection}`);
                const endpoints = window.stacExplorer.config.stacEndpoints[this.selectedCollectionSource];
                if (endpoints) {
                    this.apiClient.setEndpoints(endpoints);
                    
                    // Also update the catalog selector to reflect the current source
                    const catalogSelect = document.getElementById('catalog-select');
                    if (catalogSelect) {
                        catalogSelect.value = this.selectedCollectionSource;
                        // Trigger change event to update UI
                        catalogSelect.dispatchEvent(new Event('change'));
                    }
                }
            }
            
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
        if (dateStart) {dateStart.value = '';}
        if (dateEnd) {dateEnd.value = '';}
        
        // Reset bbox
        const bboxInput = document.getElementById('bbox-input');
        if (bboxInput) {bboxInput.value = '';}
        
        // Reset map if available
        if (this.mapManager && typeof this.mapManager.clearDrawings === 'function') {
            this.mapManager.clearDrawings();
        }
        
        // Reset cloud cover
        const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
        if (cloudCoverEnabled) {cloudCoverEnabled.checked = false;}
    }
    
    /**
     * Update the search summary in the dashboard
     */
    updateSearchSummary() {
        const summaryDetails = document.getElementById('summary-details');
        if (!summaryDetails) {return;}
        
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
     * Ensure sidebar is visible after AI search execution
     * Handles both mobile and desktop scenarios
     */
    ensureSidebarVisible() {
        try {
            console.log('🔄 Ensuring sidebar is visible after AI search...');
            
            const sidebar = document.getElementById('sidebar');
            if (!sidebar) {
                console.warn('⚠️ Sidebar element not found');
                return;
            }
            
            // Check if we're on mobile (using the same breakpoint as the CSS)
            const isMobile = window.innerWidth <= 768;
            
            if (isMobile) {
                // On mobile, use the mobile sidebar manager to show the sidebar
                if (window.mobileSidebarManager && typeof window.mobileSidebarManager.openSidebar === 'function') {
                    window.mobileSidebarManager.openSidebar();
                    console.log('📱 Mobile sidebar opened via mobileSidebarManager');
                } else {
                    // Fallback: manually show mobile sidebar
                    sidebar.classList.add('mobile-open');
                    document.body.classList.add('sidebar-open');
                    console.log('📱 Mobile sidebar opened via fallback');
                }
            } else {
                // On desktop, ensure sidebar is visible (not hidden)
                if (sidebar.classList.contains('hidden')) {
                    sidebar.classList.remove('hidden');
                    console.log('💻 Desktop sidebar shown');
                } else {
                    console.log('💻 Desktop sidebar already visible');
                }
            }
            
            // Add a slight delay to ensure smooth transition and then scroll results into view
            setTimeout(() => {
                const resultsCard = document.getElementById('results-card');
                if (resultsCard) {
                    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    console.log('📜 Scrolled to results section');
                }
            }, 300);
            
        } catch (error) {
            console.error('❌ Error ensuring sidebar visibility:', error);
        }
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
     * Create collection dropdown content for inline dropdowns
     * @returns {HTMLElement} Dropdown content element
     */
    createCollectionDropdown() {
        const container = document.createElement('div');
        container.className = 'ai-dropdown-content';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'ai-dropdown-header';
        header.innerHTML = `
            <i class="material-icons">dataset</i>
            <span>Select Data Source</span>
        `;
        
        // Create search section
        const searchSection = document.createElement('div');
        searchSection.className = 'ai-search-section';
        searchSection.innerHTML = `
            <input type="text" class="ai-search-input" placeholder="Search collections..." />
        `;
        
        // Create options section
        const optionsSection = document.createElement('div');
        optionsSection.className = 'ai-options-section';
        
        // Add EVERYTHING option first
        const everythingOption = document.createElement('div');
        everythingOption.className = 'ai-option ai-everything-option';
        everythingOption.dataset.value = '';
        everythingOption.innerHTML = `
            <i class="material-icons">public</i>
            <div class="ai-option-content">
                <div class="ai-option-title">SOURCE EVERYTHING</div>
                <div class="ai-option-subtitle">Search across all available data sources</div>
            </div>
        `;
        optionsSection.appendChild(everythingOption);
        
        // Add separator
        const separator = document.createElement('div');
        separator.className = 'ai-source-separator';
        optionsSection.appendChild(separator);
        
        // Group collections by source
        const collections = this.allAvailableCollections || [];
        const groupedCollections = this.groupCollectionsBySource(collections);
        
        // Add collections grouped by source
        Object.keys(groupedCollections).forEach((source, sourceIndex) => {
            // Add source group header
            const sourceHeader = document.createElement('div');
            sourceHeader.className = 'ai-source-group-header';
            sourceHeader.textContent = this.getSourceDisplayName(source);
            optionsSection.appendChild(sourceHeader);
            
            // Add collections for this source
            groupedCollections[source].forEach(collection => {
                const option = document.createElement('div');
                option.className = 'ai-option';
                option.dataset.value = collection.id;
                option.dataset.source = collection.source;
                
                option.innerHTML = `
                    <i class="material-icons">satellite_alt</i>
                    <div class="ai-option-content">
                        <div class="ai-option-title">${collection.title || collection.id}</div>
                        <div class="ai-option-subtitle">${collection.id} • ${this.getSourceDisplayName(collection.source)}</div>
                    </div>
                    <button class="ai-option-details" data-collection-id="${collection.id}" data-collection-source="${collection.source}" title="View details">
                        <i class="material-icons">info</i>
                    </button>
                `;
                
                optionsSection.appendChild(option);
            });
            
            // Add separator between sources (except for last source)
            if (sourceIndex < Object.keys(groupedCollections).length - 1) {
                const sourceSeparator = document.createElement('div');
                sourceSeparator.className = 'ai-source-separator';
                optionsSection.appendChild(sourceSeparator);
            }
        });
        
        // If no collections available, show message
        if (collections.length === 0) {
            const noCollections = document.createElement('div');
            noCollections.className = 'ai-no-results';
            noCollections.innerHTML = `
                <i class="material-icons">info</i>
                <p>No collections available</p>
                <small>Collections are being loaded...</small>
            `;
            optionsSection.appendChild(noCollections);
        }
        
        // Assemble the dropdown
        container.appendChild(header);
        container.appendChild(searchSection);
        container.appendChild(optionsSection);
        
        return container;
    }
    
    /**
     * Group collections by their source
     * @param {Array} collections - Array of collections
     * @returns {Object} Collections grouped by source
     */
    groupCollectionsBySource(collections) {
        const grouped = {};
        
        collections.forEach(collection => {
            const source = collection.source || 'unknown';
            if (!grouped[source]) {
                grouped[source] = [];
            }
            grouped[source].push(collection);
        });
        
        // Sort collections within each source by title
        Object.keys(grouped).forEach(source => {
            grouped[source].sort((a, b) => {
                const titleA = (a.title || a.id).toLowerCase();
                const titleB = (b.title || b.id).toLowerCase();
                return titleA.localeCompare(titleB);
            });
        });
        
        return grouped;
    }
    
    /**
     * Get display name for data source
     * @param {string} source - Source identifier
     * @returns {string} Display name
     */
    getSourceDisplayName(source) {
        const sourceNames = {
            'copernicus': '🛰️ Copernicus Data Space',
            'element84': '🌍 Element84 Earth Search',
            'custom': '⚙️ Custom STAC Catalog',
            'unknown': '❓ Unknown Source'
        };
        
        return sourceNames[source] || `📡 ${source}`;
    }
    
    /**
     * Create location dropdown content for inline dropdowns
     * @returns {HTMLElement} Dropdown content element
     */
    createLocationDropdown() {
        const container = document.createElement('div');
        container.className = 'ai-dropdown-content';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'ai-dropdown-header';
        header.innerHTML = `
            <i class="material-icons">place</i>
            <span>Select Location</span>
        `;
        
        // Create search section
        const searchSection = document.createElement('div');
        searchSection.className = 'ai-search-section';
        searchSection.innerHTML = `
            <input type="text" class="ai-search-input" placeholder="Search for places (e.g., Paris, France)..." />
        `;
        
        // Create search results container
        const searchResults = document.createElement('div');
        searchResults.id = 'location-results';
        searchResults.className = 'ai-search-results';
        
        // Create options section
        const optionsSection = document.createElement('div');
        optionsSection.className = 'ai-options-section';
        
        // Add EVERYWHERE option
        const everywhereOption = document.createElement('div');
        everywhereOption.className = 'ai-option';
        everywhereOption.dataset.value = 'everywhere';
        everywhereOption.innerHTML = `
            <i class="material-icons">public</i>
            <div class="ai-option-content">
                <div class="ai-option-title">THE WORLD</div>
                <div class="ai-option-subtitle">Search everywhere without location restriction</div>
            </div>
        `;
        optionsSection.appendChild(everywhereOption);
        
        // Add separator
        const separator = document.createElement('div');
        separator.className = 'ai-source-separator';
        optionsSection.appendChild(separator);
        
        // Add manual input options
        const manualOptions = [
            {
                id: 'draw-location',
                icon: 'edit',
                title: 'Draw on Map',
                subtitle: 'Draw a bounding box on the map'
            },
            {
                id: 'paste-geometry',
                icon: 'content_paste',
                title: 'Paste Geometry',
                subtitle: 'Paste WKT or GeoJSON polygon'
            }
        ];
        
        manualOptions.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = 'ai-option';
            optionEl.id = option.id;
            optionEl.innerHTML = `
                <i class="material-icons">${option.icon}</i>
                <div class="ai-option-content">
                    <div class="ai-option-title">${option.title}</div>
                    <div class="ai-option-subtitle">${option.subtitle}</div>
                </div>
            `;
            optionsSection.appendChild(optionEl);
        });
        
        // Assemble the dropdown
        container.appendChild(header);
        container.appendChild(searchSection);
        container.appendChild(searchResults);
        container.appendChild(optionsSection);
        
        return container;
    }
    
    /**
     * Create date dropdown content for inline dropdowns
     * @returns {HTMLElement} Dropdown content element
     */
    createDateDropdown() {
        const container = document.createElement('div');
        container.className = 'ai-dropdown-content';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'ai-dropdown-header';
        header.innerHTML = `
            <i class="material-icons">schedule</i>
            <span>Select Time Period</span>
        `;
        
        // Create options section
        const optionsSection = document.createElement('div');
        optionsSection.className = 'ai-options-section';
        
        // Define date options
        const dateOptions = [
            {
                value: 'anytime',
                icon: 'all_inclusive',
                title: 'ANYTIME',
                subtitle: 'No date restriction'
            },
            {
                value: 'today',
                icon: 'today',
                title: 'Today',
                subtitle: 'Today only'
            },
            {
                value: 'yesterday',
                icon: 'history',
                title: 'Yesterday',
                subtitle: 'Yesterday only'
            },
            {
                value: 'last7days',
                icon: 'view_week',
                title: 'Last 7 days',
                subtitle: 'Past week including today'
            },
            {
                value: 'thismonth',
                icon: 'calendar_today',
                title: 'This month',
                subtitle: 'Current month'
            },
            {
                value: 'lastmonth',
                icon: 'skip_previous',
                title: 'Last month',
                subtitle: 'Previous month'
            },
            {
                value: 'last90days',
                icon: 'calendar_view_month',
                title: 'Last 3 months',
                subtitle: 'Past 3 months'
            },
            {
                value: 'custom',
                icon: 'tune',
                title: 'Custom range...',
                subtitle: 'Select your own dates'
            }
        ];
        
        // Add date options
        dateOptions.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = 'ai-option';
            optionEl.dataset.value = option.value;
            
            if (option.value === 'custom') {
                optionEl.id = 'custom-date';
            }
            
            optionEl.innerHTML = `
                <i class="material-icons">${option.icon}</i>
                <div class="ai-option-content">
                    <div class="ai-option-title">${option.title}</div>
                    <div class="ai-option-subtitle">${option.subtitle}</div>
                </div>
            `;
            optionsSection.appendChild(optionEl);
        });
        
        // Create custom date section (initially hidden)
        const customSection = document.createElement('div');
        customSection.id = 'custom-date-section';
        customSection.className = 'ai-custom-section';
        customSection.style.display = 'none';
        
        const today = new Date();
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);
        
        customSection.innerHTML = `
            <div class="ai-date-inputs">
                <div class="ai-date-group">
                    <label for="date-start">From:</label>
                    <input type="date" id="date-start" class="ai-date-input" value="${this.formatDate(lastWeek)}" />
                </div>
                <div class="ai-date-group">
                    <label for="date-end">To:</label>
                    <input type="date" id="date-end" class="ai-date-input" value="${this.formatDate(today)}" />
                </div>
            </div>
            <button class="ai-apply-btn" id="apply-date-range">
                <i class="material-icons">check</i>
                Apply Date Range
            </button>
        `;
        
        // Assemble the dropdown
        container.appendChild(header);
        container.appendChild(optionsSection);
        container.appendChild(customSection);
        
        return container;
    }
