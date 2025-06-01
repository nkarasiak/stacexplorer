/**
 * AISmartSearchInline.js - Inline version of the AI Smart Search Enhanced
 * Provides the same sentence-based interface but embedded in the main dashboard
 * Reuses all the logic and functions from AISmartSearchEnhanced
 */

import { AISmartSearchEnhanced } from './AISmartSearchEnhanced.js';

export class AISmartSearchInline extends AISmartSearchEnhanced {
    /**
     * Create a new AISmartSearchInline component
     * @param {Object} apiClient - STAC API client
     * @param {Object} searchPanel - Search panel for executing searches
     * @param {Object} collectionManager - Collection manager for accessing collections
     * @param {Object} mapManager - Map manager for location handling
     * @param {Object} notificationService - Notification service
     */
    constructor(apiClient, searchPanel, collectionManager, mapManager, notificationService) {
        super(apiClient, searchPanel, collectionManager, mapManager, notificationService);
        
        this.inlineContainer = null;
        this.isInlineMode = true; // Flag to differentiate from fullscreen mode
        
        // Don't initialize AI button for inline version
        // This will be handled by the parent component
    }
    
    /**
     * Override the AI button initialization since we don't need it for inline
     */
    initAIButton() {
        // Do nothing - inline version doesn't have the AI button
        console.log('🤖 Inline AI Smart Search - skipping AI button init');
    }
    
    /**
     * Render the inline AI search interface into a container
     * @param {HTMLElement} container - Container element to render into
     */
    async renderInline(container) {
        try {
            console.log('🤖 Rendering Inline AI Smart Search...');
            
            if (!container) {
                throw new Error('Container element is required');
            }
            
            this.inlineContainer = container;
            
            // Create the inline interface immediately
            this.createInlineInterface();
            
            // Load collections in background (same as fullscreen version)
            this.loadCollectionsInBackground();
            
        } catch (error) {
            console.error('❌ Error rendering inline AI search:', error);
            this.notificationService.showNotification('Error showing inline AI search interface', 'error');
        }
    }
    
    /**
     * Create the inline interface (similar to createAndShowInterface but for inline use)
     */
    createInlineInterface() {
        // Clear any existing content
        this.inlineContainer.innerHTML = '';
        
        // Create inline interface HTML
        this.inlineContainer.innerHTML = `
            <div class="ai-inline-container">
                <div class="ai-inline-header">
                    <div>
                        <div class="ai-inline-title">
                            <i class="material-icons">psychology</i>
                            AI Smart Search
                        </div>
                        <div class="ai-inline-subtitle">
                            Click on any field to customize your search
                        </div>
                    </div>
                </div>
                
                <div class="ai-sentence-container ai-sentence-inline">
                    I want 
                    <span class="ai-field ${this.selectedCollection ? '' : 'empty'}" 
                          id="ai-field-collection-inline" 
                          data-placeholder="EVERYTHING">${this.selectedCollection ? this.getCollectionDisplayName(this.selectedCollection) : 'EVERYTHING'}</span>
                    over 
                    <span class="ai-field ${this.selectedLocation === 'everywhere' ? 'empty' : ''}" 
                          id="ai-field-location-inline" 
                          data-placeholder="THE WORLD">${this.selectedLocation === 'everywhere' ? 'THE WORLD' : 'Custom Location'}</span>
                    at 
                    <span class="ai-field ${this.selectedDate.type === 'anytime' ? 'empty' : ''}" 
                          id="ai-field-date-inline" 
                          data-placeholder="ANYTIME">${this.getEnhancedDateDisplayText()}</span>
                    with 
                    <span class="ai-field" 
                          id="ai-field-params-inline" 
                          data-placeholder="PARAMETERS">≤${this.cloudCover}% CLOUDS</span>
                </div>
                
                <div class="ai-execute-container ai-execute-inline">
                    <button class="ai-execute-btn" id="ai-execute-search-inline">
                        <i class="material-icons">search</i> Search
                    </button>
                </div>
            </div>
        `;
        
        // Set up event listeners for inline version
        this.setupInlineEventListeners();
        
        console.log('🤖 Inline AI Smart Search interface created');
    }
    
    /**
     * Set up event listeners for the inline version
     */
    setupInlineEventListeners() {
        // Set up field click handlers (similar to enhanced version but with inline IDs)
        this.setupInlineFieldHandlers();
        
        // Execute Search button
        const executeSearchBtn = document.getElementById('ai-execute-search-inline');
        if (executeSearchBtn) {
            executeSearchBtn.addEventListener('click', () => {
                this.executeSearch();
            });
        }
        
        // Global click handler to close dropdowns (reuse from parent)
        this.globalClickHandler = (event) => {
            if (!event.target.closest('.ai-field') && !event.target.closest('.ai-dropdown-enhanced')) {
                this.closeAllDropdowns();
            }
        };
        document.addEventListener('click', this.globalClickHandler);
        
        // Global escape key handler (reuse from parent)
        this.escapeListener = (event) => {
            if (event.key === 'Escape' && this.currentDropdown) {
                this.closeAllDropdowns();
            }
        };
        document.addEventListener('keydown', this.escapeListener);
        
        // Global paste detection for WKT/GeoJSON (reuse from parent)
        this.setupGlobalPasteDetection();
    }
    
    /**
     * Set up inline field handlers (similar to enhanced version but with inline IDs)
     */
    setupInlineFieldHandlers() {
        // COLLECTION field - collections dropdown
        const collectionField = document.getElementById('ai-field-collection-inline');
        if (collectionField) {
            collectionField.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showMinimalistDropdown('collection', collectionField, this.createCollectionDropdown());
            });
        }
        
        // LOCATION field - location dropdown
        const locationField = document.getElementById('ai-field-location-inline');
        if (locationField) {
            locationField.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showMinimalistDropdown('location', locationField, this.createLocationDropdown());
            });
        }
        
        // DATE field - date dropdown
        const dateField = document.getElementById('ai-field-date-inline');
        if (dateField) {
            dateField.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showMinimalistDropdown('date', dateField, this.createDateDropdown());
            });
        }
        
        // PARAMETERS field - parameters dropdown
        const paramsField = document.getElementById('ai-field-params-inline');
        if (paramsField) {
            paramsField.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showMinimalistDropdown('params', paramsField, this.createParametersDropdown());
            });
        }
    }
    
    /**
     * Override executeSearch to handle inline mode properly
     */
    executeSearch() {
        try {
            // First sync our parameters to the hidden form elements for compatibility
            this.syncToHiddenForm();
            
            // Use the same search execution logic from parent
            super.executeSearch();
            
            // For inline mode, we don't need to close fullscreen or ensure sidebar visibility
            // The sidebar is already visible since we're inline
            console.log('🤖 Inline AI Smart Search: Search executed');
            
        } catch (error) {
            console.error('❌ Error executing inline search:', error);
            this.notificationService.showNotification('Error processing your search request', 'error');
        }
    }
    
    /**
     * Sync inline AI search parameters to hidden form elements for compatibility
     */
    syncToHiddenForm() {
        try {
            // Sync collection selection
            const collectionSelect = document.getElementById('collection-select');
            if (collectionSelect && this.selectedCollection !== undefined) {
                collectionSelect.value = this.selectedCollection || '';
                collectionSelect.dispatchEvent(new Event('change'));
            }
            
            // Sync catalog selection if we have a selected collection source
            const catalogSelect = document.getElementById('catalog-select');
            if (catalogSelect && this.selectedCollectionSource) {
                catalogSelect.value = this.selectedCollectionSource;
                catalogSelect.dispatchEvent(new Event('change'));
            }
            
            // Sync location/bbox
            const bboxInput = document.getElementById('bbox-input');
            if (bboxInput && this.selectedLocation && Array.isArray(this.selectedLocation)) {
                bboxInput.value = this.selectedLocation.join(',');
                bboxInput.dispatchEvent(new Event('input'));
            }
            
            // Sync date range
            const dateStart = document.getElementById('date-start');
            const dateEnd = document.getElementById('date-end');
            if (dateStart && dateEnd && this.selectedDate.start && this.selectedDate.end) {
                dateStart.value = this.selectedDate.start;
                dateEnd.value = this.selectedDate.end;
                dateStart.dispatchEvent(new Event('change'));
                dateEnd.dispatchEvent(new Event('change'));
            }
            
            // Sync cloud cover
            const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
            const cloudCoverRange = document.getElementById('cloud-cover');
            const cloudCoverValue = document.getElementById('cloud-cover-value');
            
            if (cloudCoverEnabled && cloudCoverRange && cloudCoverValue) {
                cloudCoverEnabled.checked = true;
                cloudCoverRange.value = this.cloudCover;
                cloudCoverValue.textContent = `${this.cloudCover}%`;
                cloudCoverRange.disabled = false;
                
                cloudCoverEnabled.dispatchEvent(new Event('change'));
                cloudCoverRange.dispatchEvent(new Event('input'));
            }
            
            console.log('🔄 Synced inline AI search parameters to hidden form elements');
            
        } catch (error) {
            console.error('❌ Error syncing to hidden form:', error);
        }
    }
    
    /**
     * Override ensureSidebarVisible for inline mode (no action needed)
     */
    ensureSidebarVisible() {
        // For inline mode, sidebar is already visible
        console.log('🤖 Inline mode: Sidebar already visible, skipping visibility check');
    }
    
    /**
     * Update field values when search parameters change
     * This allows external components to update the inline interface
     * @param {Object} params - Updated search parameters
     */
    updateFields(params = {}) {
        try {
            if (params.collection !== undefined) {
                this.selectedCollection = params.collection;
                const collectionField = document.getElementById('ai-field-collection-inline');
                if (collectionField) {
                    collectionField.textContent = params.collection ? 
                        this.getCollectionDisplayName(params.collection) : 'EVERYTHING';
                    collectionField.classList.toggle('empty', !params.collection);
                }
            }
            
            if (params.location !== undefined) {
                this.selectedLocation = params.location;
                const locationField = document.getElementById('ai-field-location-inline');
                if (locationField) {
                    const displayText = params.location === 'everywhere' ? 'THE WORLD' : 'Custom Location';
                    locationField.textContent = displayText;
                    locationField.classList.toggle('empty', params.location === 'everywhere');
                }
            }
            
            if (params.date !== undefined) {
                this.selectedDate = params.date;
                const dateField = document.getElementById('ai-field-date-inline'); 
                if (dateField) {
                    dateField.textContent = this.getEnhancedDateDisplayText();
                    dateField.classList.toggle('empty', this.selectedDate.type === 'anytime');
                }
            }
            
            if (params.cloudCover !== undefined) {
                this.cloudCover = params.cloudCover;
                const paramsField = document.getElementById('ai-field-params-inline');
                if (paramsField) {
                    paramsField.textContent = `≤${this.cloudCover}% CLOUDS`;
                }
            }
            
            console.log('🔄 Updated inline AI search fields');
            
        } catch (error) {
            console.error('❌ Error updating inline fields:', error);
        }
    }
    
    /**
     * Get current search parameters from the inline interface
     * @returns {Object} Current search parameters
     */
    getCurrentParameters() {
        return {
            collection: this.selectedCollection,
            location: this.selectedLocation,
            date: this.selectedDate,
            cloudCover: this.cloudCover,
            locationResult: this.selectedLocationResult
        };
    }
    
    /**
     * Override cleanup to handle inline-specific cleanup
     */
    cleanup() {
        // Clean up event listeners
        if (this.globalClickHandler) {
            document.removeEventListener('click', this.globalClickHandler);
            this.globalClickHandler = null;
        }
        
        if (this.escapeListener) {
            document.removeEventListener('keydown', this.escapeListener);
            this.escapeListener = null;
        }
        
        if (this.pasteHandler) {
            document.removeEventListener('paste', this.pasteHandler);
            this.pasteHandler = null;
        }
        
        // Close any open dropdowns
        this.closeAllDropdowns();
        
        // Clear inline container
        if (this.inlineContainer) {
            this.inlineContainer.innerHTML = '';
            this.inlineContainer = null;
        }
        
        console.log('🧹 Inline AI Smart Search cleaned up');
    }
    
    /**
     * Handle pasted geometry for inline mode (override to update inline fields)
     * @param {Object} geometryResult - Parsed geometry result
     * @param {string} originalText - Original pasted text
     */
    handlePastedGeometry(geometryResult, originalText) {
        // Use parent logic for processing
        super.handlePastedGeometry(geometryResult, originalText);
        
        // Update inline field
        const locationField = document.getElementById('ai-field-location-inline');
        if (locationField) {
            locationField.textContent = 'Custom Geometry';
            locationField.classList.remove('empty');
        }
    }
    
    /**
     * Setup collection dropdown events (override to handle inline field updates)
     */
    setupCollectionDropdownEvents(container) {
        // Use parent logic but override the field update part
        const originalSetup = super.setupCollectionDropdownEvents.bind(this);
        
        // Call parent setup
        originalSetup(container);
        
        // Add additional handling for inline field updates
        container.addEventListener('click', (e) => {
            const option = e.target.closest('.ai-option');
            if (option && option.dataset.value !== undefined) {
                // Update inline field
                const collectionField = document.getElementById('ai-field-collection-inline');
                if (collectionField) {
                    if (option.dataset.value === '') {
                        collectionField.textContent = 'EVERYTHING';
                        collectionField.classList.add('empty');
                    } else {
                        const title = option.querySelector('.ai-option-title');
                        if (title) {
                            collectionField.textContent = title.textContent;
                            collectionField.classList.remove('empty');
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Setup location dropdown events (override to handle inline field updates)
     */
    setupLocationDropdownEvents(container) {
        // Everywhere option
        const everywhereOption = container.querySelector('[data-value="everywhere"]');
        if (everywhereOption) {
            everywhereOption.addEventListener('click', () => {
                this.selectedLocation = 'everywhere';
                const locationField = document.getElementById('ai-field-location-inline');
                if (locationField) {
                    locationField.textContent = 'THE WORLD';
                    locationField.classList.add('empty');
                }
                this.closeAllDropdowns();
            });
        }
        
        // Draw on map option
        const drawOption = container.querySelector('#draw-location');
        if (drawOption) {
            drawOption.addEventListener('click', () => {
                this.handleDrawOnMap();
            });
        }
        
        // Paste geometry option
        const pasteOption = container.querySelector('#paste-geometry');
        if (pasteOption) {
            pasteOption.addEventListener('click', () => {
                this.handlePasteGeometry();
            });
        }
        
        // Location search
        const searchInput = container.querySelector('#location-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchLocations(e.target.value, container);
                }, 300);
            });
        }
    }
    
    /**
     * Handle date preset selection (override to update inline field)
     */
    handleDatePreset(preset) {
        // Use parent logic
        super.handleDatePreset(preset);
        
        // Update inline field
        const dateField = document.getElementById('ai-field-date-inline');
        if (dateField) {
            dateField.textContent = this.getEnhancedDateDisplayText();
            dateField.classList.toggle('empty', preset === 'anytime');
        }
    }
    
    /**
     * Handle custom date range (override to update inline field)
     */
    handleCustomDateRange(container) {
        // Use parent logic
        super.handleCustomDateRange(container);
        
        // Update inline field
        const dateField = document.getElementById('ai-field-date-inline');
        if (dateField && this.selectedDate.type === 'custom') {
            dateField.textContent = `${this.selectedDate.start} to ${this.selectedDate.end}`;
            dateField.classList.remove('empty');
        }
    }
}
