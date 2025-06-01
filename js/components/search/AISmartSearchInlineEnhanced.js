/**
 * AISmartSearchInlineEnhanced.js - Enhanced prominence version of the AI Smart Search Inline
 * Features a more prominent design with fullscreen toggle, better visual hierarchy,
 * and enhanced user experience for primary search interface usage
 */

import { AISmartSearchInline } from './AISmartSearchInline.js';

export class AISmartSearchInlineEnhanced extends AISmartSearchInline {
    /**
     * Create a new AISmartSearchInlineEnhanced component
     * @param {Object} apiClient - STAC API client
     * @param {Object} searchPanel - Search panel for executing searches
     * @param {Object} collectionManager - Collection manager for accessing collections
     * @param {Object} mapManager - Map manager for location handling
     * @param {Object} notificationService - Notification service
     */
    constructor(apiClient, searchPanel, collectionManager, mapManager, notificationService) {
        super(apiClient, searchPanel, collectionManager, mapManager, notificationService);
        
        this.isEnhancedMode = true;
        this.isExpanded = false; // Track if interface is in expanded mode
        
        console.log('🚀 AI Smart Search Inline Enhanced initialized');
    }
    
    /**
     * Render the enhanced inline AI search interface into a container
     * @param {HTMLElement} container - Container element to render into
     */
    async renderInlineEnhanced(container) {
        try {
            console.log('🚀 Rendering Enhanced AI Smart Search Inline...');
            
            if (!container) {
                throw new Error('Container element is required');
            }
            
            this.inlineContainer = container;
            
            // Create the enhanced inline interface
            this.createEnhancedInlineInterface();
            
            // Load collections in background (same as parent)
            this.loadCollectionsInBackground();
            
        } catch (error) {
            console.error('❌ Error rendering enhanced inline AI search:', error);
            this.notificationService.showNotification('Error showing enhanced AI search interface', 'error');
        }
    }
    
    /**
     * Create the enhanced inline interface with prominence and fullscreen toggle
     */
    createEnhancedInlineInterface() {
        // Clear any existing content
        this.inlineContainer.innerHTML = '';
        
        // Create enhanced interface with header, prominent sentence, and fullscreen toggle
        this.inlineContainer.innerHTML = `
            <div class="ai-inline-enhanced-container" id="ai-inline-enhanced">
                <!-- Enhanced Header with Title and Fullscreen Toggle -->
                <div class="ai-inline-enhanced-header">
                    <div class="ai-inline-enhanced-title">
                        <i class="material-icons">psychology</i>
                        <div class="ai-title-content">
                            <h3>AI Smart Search</h3>
                            <span class="ai-subtitle">Natural language data discovery</span>
                        </div>
                    </div>
                    <div class="ai-inline-actions">
                        <button class="ai-fullscreen-toggle" id="ai-fullscreen-toggle" title="Expand to fullscreen">
                            <i class="material-icons">fullscreen</i>
                        </button>
                    </div>
                </div>
                
                <!-- Enhanced AI Sentence Interface -->
                <div class="ai-sentence-enhanced" id="ai-sentence-enhanced">
                    I want 
                    <span class="ai-field-enhanced ${this.selectedCollection ? '' : 'empty'}" 
                          id="ai-field-collection-inline" 
                          data-placeholder="EVERYTHING">${this.selectedCollection ? this.getCollectionDisplayName(this.selectedCollection) : 'EVERYTHING'}</span>
                    over 
                    <span class="ai-field-enhanced ${this.selectedLocation === 'everywhere' ? 'empty' : ''}" 
                          id="ai-field-location-inline" 
                          data-placeholder="THE WORLD">${this.selectedLocation === 'everywhere' ? 'THE WORLD' : 'Custom Location'}</span>
                    at 
                    <span class="ai-field-enhanced ${this.selectedDate.type === 'anytime' ? 'empty' : ''}" 
                          id="ai-field-date-inline" 
                          data-placeholder="ANYTIME">${this.getEnhancedDateDisplayText()}</span>
                    with 
                    <span class="ai-field-enhanced" 
                          id="ai-field-params-inline" 
                          data-placeholder="PARAMETERS">≤${this.cloudCover}% CLOUDS</span>
                </div>
                
                <!-- Enhanced Execute Section -->
                <div class="ai-execute-enhanced" id="ai-execute-enhanced">
                    <button class="ai-execute-btn-enhanced" id="ai-execute-search-inline">
                        <i class="material-icons">search</i>
                        <span>Search</span>
                    </button>
                    <div class="ai-execute-stats" id="ai-execute-stats">
                        <span class="ai-stats-text">Ready to search across all data sources</span>
                    </div>
                </div>
                
                <!-- Enhanced Status/Loading Indicator -->
                <div class="ai-status-enhanced" id="ai-status-enhanced" style="display: none;">
                    <div class="ai-status-content">
                        <div class="ai-status-spinner"></div>
                        <span class="ai-status-text">Processing your search...</span>
                    </div>
                </div>
            </div>
        `;
        
        // Set up enhanced event listeners
        this.setupEnhancedInlineEventListeners();
        
        console.log('🚀 Enhanced AI Smart Search Inline interface created');
    }
    
    /**
     * Set up enhanced event listeners for the inline interface
     */
    setupEnhancedInlineEventListeners() {
        // Fullscreen toggle button
        const fullscreenToggle = document.getElementById('ai-fullscreen-toggle');
        if (fullscreenToggle) {
            fullscreenToggle.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }
        
        // Enhanced field click handlers (reuse parent logic with inline field IDs)
        this.setupEnhancedInlineFieldHandlers();
        
        // Enhanced execute search button
        const executeBtn = document.getElementById('ai-execute-search-inline');
        if (executeBtn) {
            executeBtn.addEventListener('click', () => {
                this.executeEnhancedSearch();
            });
        }
        
        // Global click handler to close dropdowns (same as parent)
        this.globalClickHandler = (event) => {
            if (!event.target.closest('.ai-field-enhanced') && !event.target.closest('.ai-dropdown-enhanced')) {
                this.closeAllDropdowns();
            }
        };
        document.addEventListener('click', this.globalClickHandler);
        
        // Global escape key handler (same as parent)
        this.escapeListener = (event) => {
            if (event.key === 'Escape') {
                if (this.currentDropdown) {
                    this.closeAllDropdowns();
                }
            }
        };
        document.addEventListener('keydown', this.escapeListener);
        
        // Set up global paste detection for WKT/GeoJSON
        this.setupEnhancedPasteDetection();
        
        console.log('🚀 Enhanced event listeners set up');
    }
    
    /**
     * Set up field handlers for the enhanced inline interface
     */
    setupEnhancedInlineFieldHandlers() {
        // Collection field
        const collectionField = document.getElementById('ai-field-collection-inline');
        if (collectionField) {
            collectionField.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showMinimalistDropdown('collection', collectionField, this.createCollectionDropdown());
            });
        }
        
        // Location field
        const locationField = document.getElementById('ai-field-location-inline');
        if (locationField) {
            locationField.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showMinimalistDropdown('location', locationField, this.createLocationDropdown());
            });
        }
        
        // Date field
        const dateField = document.getElementById('ai-field-date-inline');
        if (dateField) {
            dateField.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showMinimalistDropdown('date', dateField, this.createDateDropdown());
            });
        }
        
        // Parameters field
        const paramsField = document.getElementById('ai-field-params-inline');
        if (paramsField) {
            paramsField.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showMinimalistDropdown('params', paramsField, this.createParametersDropdown());
            });
        }
    }
    
    /**
     * Toggle fullscreen mode by showing the AISmartSearchEnhanced component
     */
    toggleFullscreen() {
        try {
            console.log('🔄 Toggling to fullscreen AI Smart Search...');
            
            // Access the fullscreen AI Smart Search Enhanced component
            const aiSmartSearchEnhanced = window.stacExplorer?.aiSmartSearch;
            
            if (aiSmartSearchEnhanced && typeof aiSmartSearchEnhanced.showMinimalistSearch === 'function') {
                // Transfer current parameters to the fullscreen version
                this.transferParametersToFullscreen(aiSmartSearchEnhanced);
                
                // Show the fullscreen interface
                aiSmartSearchEnhanced.showMinimalistSearch();
                
                console.log('✅ Successfully opened fullscreen AI Smart Search');
                this.notificationService.showNotification('🚀 AI Smart Search expanded to fullscreen!', 'info');
            } else {
                console.error('❌ Fullscreen AI Smart Search component not available');
                this.notificationService.showNotification('Fullscreen mode not available', 'error');
            }
            
        } catch (error) {
            console.error('❌ Error toggling fullscreen:', error);
            this.notificationService.showNotification('Error opening fullscreen mode', 'error');
        }
    }
    
    /**
     * Transfer current parameters to the fullscreen component
     * @param {Object} fullscreenComponent - The fullscreen AI Smart Search component
     */
    transferParametersToFullscreen(fullscreenComponent) {
        try {
            // Transfer all current parameters
            fullscreenComponent.selectedCollection = this.selectedCollection;
            fullscreenComponent.selectedCollectionSource = this.selectedCollectionSource;
            fullscreenComponent.selectedLocation = this.selectedLocation;
            fullscreenComponent.selectedLocationResult = this.selectedLocationResult;
            fullscreenComponent.selectedDate = { ...this.selectedDate };
            fullscreenComponent.cloudCover = this.cloudCover;
            fullscreenComponent.allAvailableCollections = this.allAvailableCollections;
            
            console.log('✅ Parameters transferred to fullscreen component:', {
                collection: this.selectedCollection,
                location: this.selectedLocation,
                date: this.selectedDate,
                cloudCover: this.cloudCover
            });
            
        } catch (error) {
            console.error('❌ Error transferring parameters:', error);
        }
    }
    
    /**
     * Enhanced execute search with visual feedback
     */
    async executeEnhancedSearch() {
        try {
            console.log('🔍 Executing enhanced AI search...');
            
            // Show loading state
            this.showLoadingState();
            
            // Update stats before search
            this.updateExecuteStats();
            
            // Use parent's execute search logic
            await this.executeSearch();
            
            // Show success state
            this.showSuccessState();
            
        } catch (error) {
            console.error('❌ Error executing enhanced search:', error);
            this.showErrorState();
            this.notificationService.showNotification('Error executing search', 'error');
        }
    }
    
    /**
     * Show loading state in the interface
     */
    showLoadingState() {
        const container = this.inlineContainer.querySelector('.ai-inline-enhanced-container');
        const statusDiv = document.getElementById('ai-status-enhanced');
        const executeBtn = document.getElementById('ai-execute-search-inline');
        
        if (container) {
            container.classList.add('loading');
        }
        
        if (statusDiv) {
            statusDiv.style.display = 'flex';
            statusDiv.querySelector('.ai-status-text').textContent = 'Processing your search...';
        }
        
        if (executeBtn) {
            executeBtn.disabled = true;
            executeBtn.classList.add('loading');
        }
    }
    
    /**
     * Show success state after search completion
     */
    showSuccessState() {
        const container = this.inlineContainer.querySelector('.ai-inline-enhanced-container');
        const statusDiv = document.getElementById('ai-status-enhanced');
        const executeBtn = document.getElementById('ai-execute-search-inline');
        
        if (container) {
            container.classList.remove('loading');
            container.classList.add('success');
        }
        
        if (statusDiv) {
            statusDiv.style.display = 'flex';
            statusDiv.querySelector('.ai-status-text').textContent = 'Search completed successfully!';
            
            // Hide status after 3 seconds
            setTimeout(() => {
                statusDiv.style.display = 'none';
                if (container) {
                    container.classList.remove('success');
                }
            }, 3000);
        }
        
        if (executeBtn) {
            executeBtn.disabled = false;
            executeBtn.classList.remove('loading');
        }
    }
    
    /**
     * Show error state if search fails
     */
    showErrorState() {
        const container = this.inlineContainer.querySelector('.ai-inline-enhanced-container');
        const statusDiv = document.getElementById('ai-status-enhanced');
        const executeBtn = document.getElementById('ai-execute-search-inline');
        
        if (container) {
            container.classList.remove('loading');
            container.classList.add('error');
        }
        
        if (statusDiv) {
            statusDiv.style.display = 'flex';
            statusDiv.querySelector('.ai-status-text').textContent = 'Search failed. Please try again.';
            
            // Hide status after 5 seconds
            setTimeout(() => {
                statusDiv.style.display = 'none';
                if (container) {
                    container.classList.remove('error');
                }
            }, 5000);
        }
        
        if (executeBtn) {
            executeBtn.disabled = false;
            executeBtn.classList.remove('loading');
        }
    }
    
    /**
     * Update execute stats based on current parameters
     */
    updateExecuteStats() {
        const statsText = document.querySelector('.ai-stats-text');
        if (!statsText) return;
        
        let text = 'Ready to search';
        
        // Collection info
        if (this.selectedCollection) {
            const collectionName = this.getCollectionDisplayName(this.selectedCollection);
            text = `Ready to search ${collectionName}`;
        } else {
            const collectionsCount = this.allAvailableCollections ? this.allAvailableCollections.length : 'all';
            text = `Ready to search across ${collectionsCount} collections`;
        }
        
        // Add location info
        if (this.selectedLocation && this.selectedLocation !== 'everywhere') {
            if (this.selectedLocationResult && this.selectedLocationResult.shortName) {
                text += ` in ${this.selectedLocationResult.shortName}`;
            } else {
                text += ' in custom area';
            }
        }
        
        // Add date info
        if (this.selectedDate.type !== 'anytime') {
            if (this.selectedDate.type === 'thismonth') {
                text += ' for this month';
            } else if (this.selectedDate.start && this.selectedDate.end) {
                text += ` from ${this.selectedDate.start} to ${this.selectedDate.end}`;
            }
        }
        
        statsText.textContent = text;
    }
    
    /**
     * Enhanced paste detection for the inline interface
     */
    setupEnhancedPasteDetection() {
        this.pasteHandler = (event) => {
            // Only process paste events when inline interface is visible
            if (!this.inlineContainer || this.inlineContainer.style.display === 'none') return;
            
            // Get pasted text
            const pastedText = (event.clipboardData || window.clipboardData).getData('text');
            
            if (pastedText && pastedText.trim()) {
                // Try to parse as geometry
                const geometryResult = this.parseGeometry(pastedText.trim());
                
                if (geometryResult) {
                    this.handlePastedGeometry(geometryResult, pastedText);
                    event.preventDefault(); // Prevent normal paste behavior
                    
                    // Update the location field
                    this.updateInlineLocationField('Custom Geometry');
                }
            }
        };
        
        // Add paste listener to document
        document.addEventListener('paste', this.pasteHandler);
        console.log('📋 Enhanced paste detection enabled for inline interface');
    }
    
    /**
     * Update location field in the inline interface
     * @param {string} locationText - Text to display
     */
    updateInlineLocationField(locationText) {
        const locationField = document.getElementById('ai-field-location-inline');
        if (locationField) {
            locationField.textContent = locationText;
            locationField.classList.remove('empty');
            
            // Add updated animation
            locationField.classList.add('updated');
            setTimeout(() => {
                locationField.classList.remove('updated');
            }, 600);
        }
    }
    
    /**
     * Update collection field in the inline interface
     * @param {string} collectionText - Text to display
     * @param {boolean} isEmpty - Whether this is an empty/default value
     */
    updateInlineCollectionField(collectionText, isEmpty = false) {
        const collectionField = document.getElementById('ai-field-collection-inline');
        if (collectionField) {
            collectionField.textContent = collectionText;
            collectionField.classList.toggle('empty', isEmpty);
            
            // Add updated animation
            collectionField.classList.add('updated');
            setTimeout(() => {
                collectionField.classList.remove('updated');
            }, 600);
        }
    }
    
    /**
     * Update date field in the inline interface
     * @param {string} dateText - Text to display
     * @param {boolean} isEmpty - Whether this is an empty/default value
     */
    updateInlineDateField(dateText, isEmpty = false) {
        const dateField = document.getElementById('ai-field-date-inline');
        if (dateField) {
            dateField.textContent = dateText;
            dateField.classList.toggle('empty', isEmpty);
            
            // Add updated animation
            dateField.classList.add('updated');
            setTimeout(() => {
                dateField.classList.remove('updated');
            }, 600);
        }
    }
    
    /**
     * Update parameters field in the inline interface
     * @param {string} paramsText - Text to display
     */
    updateInlineParamsField(paramsText) {
        const paramsField = document.getElementById('ai-field-params-inline');
        if (paramsField) {
            paramsField.textContent = paramsText;
            
            // Add updated animation
            paramsField.classList.add('updated');
            setTimeout(() => {
                paramsField.classList.remove('updated');
            }, 600);
        }
    }
    
    /**
     * Override dropdown field selection to update inline fields
     */
    handleCollectionSelection(collectionId, collectionSource) {
        // Update parent state
        this.selectedCollection = collectionId;
        this.selectedCollectionSource = collectionSource;
        
        // Update inline interface
        if (collectionId === '') {
            this.updateInlineCollectionField('EVERYTHING', true);
        } else {
            const displayName = this.getCollectionDisplayName(collectionId);
            this.updateInlineCollectionField(displayName, false);
        }
        
        // Update stats
        this.updateExecuteStats();
        
        this.closeAllDropdowns();
    }
    
    /**
     * Override location selection to update inline fields
     */
    handleLocationSelection(locationData) {
        // Update parent state
        this.selectedLocation = locationData.location;
        this.selectedLocationResult = locationData.result;
        
        // Update inline interface
        if (locationData.location === 'everywhere') {
            this.updateInlineLocationField('THE WORLD');
        } else {
            this.updateInlineLocationField(locationData.displayName || 'Custom Location');
        }
        
        // Update stats
        this.updateExecuteStats();
    }
    
    /**
     * Override date selection to update inline fields
     */
    handleDateSelection(dateData) {
        // Update parent state
        this.selectedDate = dateData;
        
        // Update inline interface
        const displayText = this.getEnhancedDateDisplayText();
        this.updateInlineDateField(displayText, dateData.type === 'anytime');
        
        // Update stats
        this.updateExecuteStats();
    }
    
    /**
     * Override parameters selection to update inline fields
     */
    handleParamsSelection(cloudCover) {
        // Update parent state
        this.cloudCover = cloudCover;
        
        // Update inline interface
        this.updateInlineParamsField(`≤${cloudCover}% CLOUDS`);
        
        // Update stats
        this.updateExecuteStats();
    }
    
    /**
     * Enhanced cleanup method
     */
    cleanup() {
        // Call parent cleanup
        super.cleanup();
        
        // Remove enhanced event listeners
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
        
        console.log('🧹 Enhanced AI Smart Search Inline cleaned up');
    }
}
