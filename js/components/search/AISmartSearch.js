/**
 * AISmartSearch.js - Component for AI-powered natural language search
 * Allows users to describe what they want in natural language
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
        
        this.selectedDatePreset = null;
        this.modalElement = null;
        this.escapeListener = null;
        
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
        if (this.modalElement && document.body.contains(this.modalElement)) {
            document.body.removeChild(this.modalElement);
        }
        
        if (this.escapeListener) {
            document.removeEventListener('keydown', this.escapeListener);
        }
    }
    
    /**
     * Initialize AI button event listener
     */
    initAIButton() {
        const aiButton = document.getElementById('ai-search-btn');
        if (aiButton) {
            aiButton.addEventListener('click', () => {
                this.showAIModal();
            });
            console.log('AI Smart Search button initialized');
        } else {
            console.error('AI Smart Search button not found');
        }
    }
    
    /**
     * Create and show the AI search modal
     */
    showAIModal() {
        try {
            // Create modal element
            this.modalElement = document.createElement('div');
            this.modalElement.className = 'ai-modal';
            
            // Get all available collections
            const collections = this.collectionManager.collections;
            const collectionOptions = collections.map(collection => 
                `<option value="${collection.id}">${collection.title || collection.id}</option>`
            ).join('');
            
            // Build modal content
            this.modalElement.innerHTML = `
                <div class="ai-modal-content">
                    <div class="ai-modal-header">
                        <h3><i class="material-icons">psychology</i> AI Smart Search</h3>
                        <button class="ai-modal-close"><i class="material-icons">close</i></button>
                    </div>
                    <div class="ai-modal-body">
                        <p class="ai-help-text">
                            Describe what you're looking for in natural language, and I'll help you find it.
                        </p>
                        <div class="ai-query-form">
                            <div class="ai-query-input">
                                <textarea id="ai-query-text" placeholder="I want Sentinel-2 imagery from the last 30 days over New York with less than 20% cloud cover..."></textarea>
                            </div>
                            
                            <div class="ai-query-examples">
                                <h4>Examples:</h4>
                                <div class="example-queries">
                                    <div class="example-query">Sentinel-2 images from last month over Paris</div>
                                    <div class="example-query">Landsat imagery with low cloud cover in California</div>
                                    <div class="example-query">All collections from 2023 in the Amazon rainforest</div>
                                    <div class="example-query">Recent Sentinel-1 radar data for flood monitoring</div>
                                </div>
                            </div>
                            
                            <div class="ai-query-filters">
                                <div class="filter-section">
                                    <h4><i class="material-icons">calendar_today</i> Time Range</h4>
                                    <div class="date-presets">
                                        <div class="date-preset" data-days="7">Last 7 days</div>
                                        <div class="date-preset" data-days="30">Last 30 days</div>
                                        <div class="date-preset" data-days="90">Last 3 months</div>
                                        <div class="date-preset" data-days="365">Last year</div>
                                        <div class="date-preset" data-days="custom">Custom range</div>
                                    </div>
                                    <div id="custom-date-inputs" style="display: none; margin-top: 10px;">
                                        <div class="date-range-inline">
                                            <input type="date" id="ai-date-start" class="form-control">
                                            <span class="date-separator">to</span>
                                            <input type="date" id="ai-date-end" class="form-control">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="filter-section">
                                    <h4><i class="material-icons">layers</i> Collections</h4>
                                    <select id="ai-collection-select" class="form-control">
                                        <option value="">All available collections</option>
                                        ${collectionOptions}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="ai-modal-footer">
                        <button id="ai-search-execute" class="md-btn md-btn-primary">
                            <i class="material-icons">search</i> Search
                        </button>
                        <button id="ai-search-cancel" class="md-btn md-btn-secondary">
                            Cancel
                        </button>
                    </div>
                </div>
            `;
            
            // Add modal to document
            document.body.appendChild(this.modalElement);
            
            // Set up event listeners for the modal
            this.setupModalEventListeners();
            
            // Focus the query input
            setTimeout(() => {
                document.getElementById('ai-query-text').focus();
            }, 100);
            
            console.log('AI Smart Search modal displayed');
        } catch (error) {
            console.error('Error showing AI modal:', error);
            this.notificationService.showNotification('Error showing AI search interface', 'error');
        }
    }
    
    /**
     * Set up event listeners for the modal
     */
    setupModalEventListeners() {
        // Close button
        const closeButton = this.modalElement.querySelector('.ai-modal-close');
        closeButton.addEventListener('click', () => this.closeModal());
        
        // Cancel button
        const cancelButton = this.modalElement.querySelector('#ai-search-cancel');
        cancelButton.addEventListener('click', () => this.closeModal());
        
        // Execute search button
        const searchButton = this.modalElement.querySelector('#ai-search-execute');
        searchButton.addEventListener('click', () => this.executeAISearch());
        
        // Example queries
        const exampleQueries = this.modalElement.querySelectorAll('.example-query');
        exampleQueries.forEach(example => {
            example.addEventListener('click', () => {
                document.getElementById('ai-query-text').value = example.textContent;
            });
        });
        
        // Date presets
        const datePresets = this.modalElement.querySelectorAll('.date-preset');
        datePresets.forEach(preset => {
            preset.addEventListener('click', () => {
                // Remove selected class from all presets
                datePresets.forEach(p => p.classList.remove('selected'));
                
                // Add selected class to clicked preset
                preset.classList.add('selected');
                this.selectedDatePreset = preset.dataset.days;
                
                // Handle custom date range
                const customDateInputs = document.getElementById('custom-date-inputs');
                if (preset.dataset.days === 'custom') {
                    customDateInputs.style.display = 'block';
                } else {
                    customDateInputs.style.display = 'none';
                }
            });
        });
        
        // Close modal when clicking outside
        this.modalElement.addEventListener('click', (event) => {
            if (event.target === this.modalElement) {
                this.closeModal();
            }
        });
        
        // Handle keyboard shortcuts
        const queryTextarea = document.getElementById('ai-query-text');
        queryTextarea.addEventListener('keydown', (event) => {
            // Ctrl+Enter to execute search
            if (event.key === 'Enter' && event.ctrlKey) {
                event.preventDefault();
                this.executeAISearch();
            }
        });
        
        // Global escape key handler for modal
        this.escapeListener = (event) => {
            if (event.key === 'Escape' && this.modalElement) {
                this.closeModal();
            }
        };
        document.addEventListener('keydown', this.escapeListener);
    }
    
    /**
     * Close the AI modal
     */
    closeModal() {
        if (this.modalElement && document.body.contains(this.modalElement)) {
            // Remove escape key listener
            if (this.escapeListener) {
                document.removeEventListener('keydown', this.escapeListener);
                this.escapeListener = null;
            }
            
            // Remove the modal from the DOM
            document.body.removeChild(this.modalElement);
            this.modalElement = null;
            
            // Reset any selections
            this.selectedDatePreset = null;
        }
    }
    
    /**
     * Execute the AI search based on natural language query and selected filters
     */
    executeAISearch() {
        try {
            // Get query text
            const queryText = document.getElementById('ai-query-text').value.trim();
            
            if (!queryText) {
                this.notificationService.showNotification('Please enter a search query', 'warning');
                return;
            }
            
            // Collect parameters from UI
            const params = this.extractSearchParameters();
            
            // Show notification that we're processing the query
            this.notificationService.showNotification('Processing your natural language query...', 'info');
            
            // Log the query
            console.log('AI Smart Search Query:', queryText);
            console.log('Search Parameters:', params);
            
            // Close the modal
            this.closeModal();
            
            // Apply extracted parameters to the search form
            this.applySearchParameters(params);
            
            // Execute the search
            if (this.searchPanel) {
                this.searchPanel.performSearch();
            }
            
            // Show success notification
            this.notificationService.showNotification('AI Smart Search executed successfully', 'success');
        } catch (error) {
            console.error('Error executing AI search:', error);
            this.notificationService.showNotification('Error processing your search query', 'error');
        }
    }
    
    /**
     * Extract search parameters from the natural language query and UI controls
     * @returns {Object} Search parameters
     */
    extractSearchParameters() {
        // Get the raw query text
        const queryText = document.getElementById('ai-query-text').value.trim();
        
        // Initialize parameters object
        const params = {
            query: queryText,
            collections: [],
            dateRange: null,
            bbox: null,
            cloudCover: null
        };
        
        // Extract collection selection from dropdown
        const collectionSelect = document.getElementById('ai-collection-select');
        if (collectionSelect && collectionSelect.value) {
            params.collections.push(collectionSelect.value);
        }
        
        // Extract date range based on selected preset
        if (this.selectedDatePreset) {
            if (this.selectedDatePreset === 'custom') {
                const startDate = document.getElementById('ai-date-start').value;
                const endDate = document.getElementById('ai-date-end').value;
                
                if (startDate || endDate) {
                    params.dateRange = {
                        start: startDate,
                        end: endDate
                    };
                }
            } else {
                // Calculate date range based on preset days
                const days = parseInt(this.selectedDatePreset);
                if (!isNaN(days)) {
                    const endDate = new Date();
                    const startDate = new Date();
                    startDate.setDate(startDate.getDate() - days);
                    
                    params.dateRange = {
                        start: this.formatDate(startDate),
                        end: this.formatDate(endDate)
                    };
                }
            }
        }
        
        // Simple natural language parsing for additional parameters
        
        // Check for collection mentions
        const collectionTypes = [
            { keywords: ['sentinel-2', 'sentinel 2', 's2', 's-2'], id: 'sentinel-s2-l2a-cogs' },
            { keywords: ['sentinel-1', 'sentinel 1', 's1', 's-1', 'radar'], id: 'sentinel-s1-grd' },
            { keywords: ['landsat'], id: 'landsat-c2-l2' }
        ];
        
        // Only add collection if not already selected in dropdown
        if (params.collections.length === 0) {
            for (const collection of collectionTypes) {
                if (collection.keywords.some(keyword => 
                    queryText.toLowerCase().includes(keyword))) {
                    params.collections.push(collection.id);
                    break; // Only add the first matching collection
                }
            }
        }
        
        // Check for cloud cover mentions
        const cloudMatch = queryText.match(/(?:less than|<|under|max|maximum|up to)\s*(\d+)(?:\s*%|\s*percent)?\s*cloud/i);
        if (cloudMatch && cloudMatch[1]) {
            const cloudCover = parseInt(cloudMatch[1]);
            if (!isNaN(cloudCover) && cloudCover >= 0 && cloudCover <= 100) {
                params.cloudCover = cloudCover;
            }
        }
        
        // For more complex location parsing, we would need a geocoding service
        // But we can look for some common location names
        const locationMatch = queryText.match(/over\s+([A-Za-z\s]+)(?:[,.]|$)/i);
        if (locationMatch && locationMatch[1]) {
            params.locationName = locationMatch[1].trim();
            // In a real implementation, we would use a geocoding service to convert the name to coordinates
        }
        
        return params;
    }
    
    /**
     * Apply extracted search parameters to the search form
     * @param {Object} params - Search parameters
     */
    applySearchParameters(params) {
        try {
            // Apply date range if provided
            if (params.dateRange) {
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
            if (params.cloudCover !== null) {
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
            
            // If we have a location name but no coordinates, we would need to handle this
            // In a real implementation, we would use a geocoding service
            
            console.log('Applied search parameters:', params);
        } catch (error) {
            console.error('Error applying search parameters:', error);
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
}