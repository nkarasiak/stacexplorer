/**
 * FilterManager.js - Extensible filter system for STAC search
 * Handles dynamic filter creation and management based on collection types
 */

export class FilterManager {
    constructor(container, notificationService) {
        this.container = container;
        this.notificationService = notificationService;
        this.filters = new Map();
        this.activeFilters = {};
        
        // Filter definitions - focused on cloud cover only
        this.filterDefinitions = {
            'cloud_cover': {
                id: 'cloud_cover',
                name: 'Cloud Cover',
                icon: '☁️',
                type: 'range',
                min: 0,
                max: 100,
                default: 20,
                unit: '%',
                description: 'Maximum cloud coverage percentage',
                applicableTo: ['optical', 'multispectral'],
                stacProperty: 'eo:cloud_cover'
            }
        };
        
        this.init();
    }
    
    init() {
        this.createFilterContainer();
        this.setupEventListeners();
        this.setupModalHandlers();
        
        // For debugging - show button initially if no collections
        // Remove this after fixing the collection detection
        console.log('🔍 FilterManager initialized');
        
        // Show filter button immediately for testing while collections load
        this.showFilterButton();
    }
    
    /**
     * Create the main filter container
     */
    createFilterContainer() {
        const filterSection = document.createElement('div');
        filterSection.id = 'filter-section';
        filterSection.className = 'filter-section';
        filterSection.innerHTML = `
            <div class="filter-content" id="filter-content">
                <div class="filter-hint">
                    <i class="material-icons">info</i>
                    <span>Filters will appear based on selected collections</span>
                </div>
                <div id="filter-list" class="filter-list"></div>
            </div>
        `;
        
        this.container.appendChild(filterSection);
        this.filterContent = document.getElementById('filter-content');
        this.filterList = document.getElementById('filter-list');
        
        // Get references to modal elements
        this.filterButton = document.getElementById('smart-filters-btn');
        this.filterModal = document.getElementById('smart-filters-modal');
        this.filterBadge = document.getElementById('filter-count-badge');
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for collection changes
        document.addEventListener('collectionsChanged', (event) => {
            console.log('🔍 Received collectionsChanged event');
            this.updateFiltersForCollections(event.detail.collections);
        });
        
        // Also listen for collection dropdown changes
        const collectionSelect = document.getElementById('collection-select');
        if (collectionSelect) {
            collectionSelect.addEventListener('change', (event) => {
                console.log('🔍 Collection dropdown changed:', event.target.value);
                // Get all collections from global state if available
                if (window.stacExplorer?.collectionManager?.allCollections) {
                    this.updateFiltersForCollections(window.stacExplorer.collectionManager.allCollections);
                }
            });
        }
    }
    
    /**
     * Setup modal handlers
     */
    setupModalHandlers() {
        // Filter button click
        if (this.filterButton) {
            this.filterButton.addEventListener('click', () => {
                this.showFilterModal();
            });
        }
        
        // Modal close button
        const closeBtn = document.getElementById('filters-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideFilterModal();
            });
        }
        
        // Close modal when clicking outside
        if (this.filterModal) {
            this.filterModal.addEventListener('click', (e) => {
                if (e.target === this.filterModal) {
                    this.hideFilterModal();
                }
            });
        }
    }
    
    /**
     * Show filter modal
     */
    showFilterModal() {
        if (this.filterModal) {
            this.filterModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
    
    /**
     * Hide filter modal
     */
    hideFilterModal() {
        if (this.filterModal) {
            this.filterModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    /**
     * Update filters based on selected collections
     */
    updateFiltersForCollections(collections) {
        console.log('🔍 FilterManager received collections:', collections?.length || 0, collections);
        
        if (!collections || collections.length === 0) {
            console.log('⚠️ No collections provided to FilterManager');
            this.hideFilterButton();
            return;
        }
        
        const collectionTypes = this.analyzeCollectionTypes(collections);
        console.log('🔍 Detected collection types:', collectionTypes);
        
        // Clear existing filters
        this.clearFilters();
        
        // Add relevant filters
        const relevantFilters = this.getRelevantFilters(collectionTypes);
        console.log('🔍 Relevant filters found:', relevantFilters.length, relevantFilters.map(f => f.name));
        
        if (relevantFilters.length > 0) {
            this.showFilters(relevantFilters);
            this.showFilterHint(`Found ${relevantFilters.length} applicable filter(s) for ${collectionTypes.join(', ')} data`);
            this.showFilterButton();
            
            // Restore filters from URL after showing filters
            setTimeout(() => {
                this.restoreFiltersFromURL();
            }, 100);
        } else {
            this.showFilterHint('No specific filters available for selected collections');
            this.hideFilterButton();
        }
    }
    
    /**
     * Analyze collection types from STAC collection metadata
     */
    analyzeCollectionTypes(collections) {
        const types = new Set();
        
        collections.forEach(collection => {
            const collectionId = collection.id.toLowerCase();
            const title = (collection.title || '').toLowerCase();
            const description = (collection.description || '').toLowerCase();
            const keywords = (collection.keywords || []).map(k => k.toLowerCase());
            
            // Specific optical collections that need cloud cover filter
            const opticalCollections = [
                'sentinel-2',
                'sentinel2',
                's2',
                'landsat',
                'l8',
                'l9',
                'landsat-8',
                'landsat-9',
                'venus',
                'venus-l2a',
                'modis',
                'viirs'
            ];
            
            // Check for specific optical collections
            const isOptical = opticalCollections.some(opt => 
                collectionId.includes(opt) || 
                title.includes(opt) || 
                description.includes(opt)
            );
            
            if (isOptical) {
                types.add('optical');
                console.log(`🛰️ Detected optical collection: ${collection.id}`);
            }
            
            // Additional optical/multispectral indicators
            if (keywords.some(k => k.includes('optical') || k.includes('multispectral')) || 
                description.includes('optical') || description.includes('multispectral') ||
                title.includes('optical') || title.includes('multispectral')) {
                types.add('optical');
            }
            
            // Radar indicators
            if (keywords.some(k => k.includes('radar') || k.includes('sar')) || 
                description.includes('radar') || description.includes('sar') ||
                title.includes('radar') || title.includes('sar') ||
                collectionId.includes('sar') || collectionId.includes('sentinel-1')) {
                types.add('radar');
            }
            
            // Check summaries for EO extension (strong indicator of optical data)
            if (collection.summaries && (
                collection.summaries['eo:cloud_cover'] ||
                collection.summaries['eo:bands'] ||
                collection.summaries['eo:snow_cover'])) {
                types.add('optical');
                console.log(`🌥️ Collection has EO properties: ${collection.id}`);
            }
        });
        
        // If we have collections but no specific type detected, assume optical as default
        if (collections.length > 0 && types.size === 0) {
            types.add('optical');
            console.log('📡 No specific type detected, defaulting to optical');
        }
        
        return Array.from(types);
    }
    
    /**
     * Get relevant filters for collection types
     */
    getRelevantFilters(collectionTypes) {
        const relevant = [];
        
        Object.values(this.filterDefinitions).forEach(filter => {
            if (filter.applicableTo.some(type => collectionTypes.includes(type))) {
                relevant.push(filter);
            }
        });
        
        return relevant;
    }
    
    /**
     * Show filters in UI
     */
    showFilters(filters) {
        this.filterList.innerHTML = '';
        
        filters.forEach(filter => {
            const filterElement = this.createFilterElement(filter);
            this.filterList.appendChild(filterElement);
            this.filters.set(filter.id, filter);
        });
        
        // Show filter section
        document.getElementById('filter-section').classList.add('has-filters');
        
        // Enable filter button
        this.showFilterButton();
    }
    
    /**
     * Create individual filter element
     */
    createFilterElement(filter) {
        const element = document.createElement('div');
        element.className = 'filter-item';
        element.id = `filter-${filter.id}`;
        
        if (filter.type === 'range') {
            element.innerHTML = `
                <div class="filter-header-item">
                    <label class="filter-label">
                        <span class="filter-icon">${filter.icon}</span>
                        <span class="filter-name">${filter.name}</span>
                    </label>
                    <div class="filter-controls">
                        <button class="filter-enable-btn" id="enable-${filter.id}" title="Enable ${filter.name} filter">
                            <i class="material-icons">check_box_outline_blank</i>
                        </button>
                    </div>
                </div>
                <div class="filter-content-item collapsed" id="content-${filter.id}">
                    <div class="filter-description">${filter.description}</div>
                    <div class="filter-range-control">
                        <input type="range" 
                               id="range-${filter.id}" 
                               min="${filter.min}" 
                               max="${filter.max}" 
                               value="${filter.default}"
                               class="filter-range">
                        <div class="filter-value-display">
                            <span class="filter-value" id="value-${filter.id}">${filter.default}</span>
                            <span class="filter-unit">${filter.unit}</span>
                        </div>
                    </div>
                    <div class="filter-actions">
                        <button class="filter-apply-btn" id="apply-${filter.id}" title="Apply ${filter.name} filter">
                            <i class="material-icons">check</i>
                            <span>Apply Filter</span>
                        </button>
                    </div>
                </div>
            `;
            
            this.setupRangeFilter(filter, element);
        }
        
        return element;
    }
    
    /**
     * Setup range filter interactions
     */
    setupRangeFilter(filter, element) {
        const enableBtn = element.querySelector(`#enable-${filter.id}`);
        const content = element.querySelector(`#content-${filter.id}`);
        const range = element.querySelector(`#range-${filter.id}`);
        const valueDisplay = element.querySelector(`#value-${filter.id}`);
        const applyBtn = element.querySelector(`#apply-${filter.id}`);
        const label = element.querySelector('.filter-label');
        
        // Make label clickable to toggle filter
        label.addEventListener('click', () => {
            toggleFilter();
        });
        
        // Enable/disable toggle
        const toggleFilter = () => {
            const isEnabled = !element.classList.contains('enabled');
            
            if (isEnabled) {
                element.classList.add('enabled');
                content.classList.remove('collapsed');
                enableBtn.querySelector('i').textContent = 'check_box';
                enableBtn.title = `Disable ${filter.name} filter`;
            } else {
                element.classList.remove('enabled');
                content.classList.add('collapsed');
                enableBtn.querySelector('i').textContent = 'check_box_outline_blank';
                enableBtn.title = `Enable ${filter.name} filter`;
                // Remove from active filters when disabled
                delete this.activeFilters[filter.id];
                this.onFiltersChanged();
            }
        };
        
        enableBtn.addEventListener('click', toggleFilter);
        
        // Range value updates (just update display, don't apply immediately)
        range.addEventListener('input', () => {
            valueDisplay.textContent = range.value;
        });
        
        // Apply button - this is where the filter actually gets applied
        applyBtn.addEventListener('click', () => {
            if (element.classList.contains('enabled')) {
                this.activeFilters[filter.id] = {
                    ...filter,
                    value: range.value
                };
                this.onFiltersChanged();
                
                // Visual feedback
                applyBtn.innerHTML = '<i class="material-icons">check_circle</i><span>Applied!</span>';
                applyBtn.classList.add('applied');
                
                // Close the modal after applying
                setTimeout(() => {
                    this.hideFilterModal();
                }, 500);
                
                // Reset button appearance after modal closes
                setTimeout(() => {
                    applyBtn.innerHTML = '<i class="material-icons">check</i><span>Apply Filter</span>';
                    applyBtn.classList.remove('applied');
                }, 2000);
            }
        });
    }
    
    /**
     * Clear all filters
     */
    clearFilters() {
        this.filterList.innerHTML = '';
        this.filters.clear();
        this.activeFilters = {};
        document.getElementById('filter-section').classList.remove('has-filters');
        this.hideFilterButton();
        this.updateFilterBadge();
    }
    
    /**
     * Show filter hint message
     */
    showFilterHint(message) {
        const hint = this.filterContent.querySelector('.filter-hint span');
        if (hint) {
            hint.textContent = message;
        }
    }
    
    /**
     * Get active filters for search query
     */
    getActiveFilters() {
        return this.activeFilters;
    }
    
    /**
     * Get STAC query parameters from active filters
     */
    getSTACQueryParameters() {
        const queryParams = {};
        
        Object.values(this.activeFilters).forEach(filter => {
            const property = filter.stacProperty;
            const value = parseFloat(filter.value);
            
            console.log(`🔍 Processing filter: ${filter.id} = ${value} (property: ${property})`);
            
            if (filter.id === 'cloud_cover') {
                // Maximum cloud cover filter (less than or equal)
                queryParams[property] = { lte: value };
                console.log(`🌥️ Added ${property} constraint: <= ${value}`);
            }
        });
        
        console.log('🔍 Final STAC query parameters from FilterManager:', queryParams);
        return queryParams;
    }
    
    /**
     * Callback when filters change
     */
    onFiltersChanged() {
        console.log('🔍 Active filters:', this.activeFilters);
        
        // Update filter badge
        this.updateFilterBadge();
        
        // Update URL with filter parameters
        this.updateURLWithFilters();
        
        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('filtersChanged', {
            detail: {
                activeFilters: this.activeFilters,
                stacQuery: this.getSTACQueryParameters()
            }
        }));
    }
    
    /**
     * Update URL with current filter values
     */
    updateURLWithFilters() {
        console.log('🔗 Attempting to update URL with filters...');
        console.log('🔗 UnifiedStateManager available:', !!window.stacExplorer?.unifiedStateManager);
        console.log('🔗 Active filters:', this.activeFilters);
        
        if (window.stacExplorer?.unifiedStateManager) {
            // Call updateURL directly - it will read the current filter state from FilterManager
            window.stacExplorer.unifiedStateManager.updateURL();
            console.log('✅ Called updateURL() to refresh URL with current filter state');
        } else {
            console.error('❌ UnifiedStateManager not available for URL updates');
        }
    }
    
    /**
     * Reset all filters
     */
    resetFilters() {
        Object.keys(this.activeFilters).forEach(filterId => {
            const element = document.getElementById(`filter-${filterId}`);
            if (element) {
                const enableBtn = element.querySelector(`#enable-${filterId}`);
                if (enableBtn) {
                    enableBtn.click(); // This will disable the filter
                }
            }
        });
    }
    
    /**
     * Show filter button
     */
    showFilterButton() {
        console.log('🔍 Attempting to show filter button:', !!this.filterButton);
        if (this.filterButton) {
            this.filterButton.style.display = 'block';
            console.log('✅ Filter button shown');
        } else {
            console.error('❌ Filter button element not found!');
        }
    }
    
    /**
     * Hide filter button
     */
    hideFilterButton() {
        if (this.filterButton) {
            this.filterButton.style.display = 'none';
        }
    }
    
    /**
     * Update filter badge with active filter count
     */
    updateFilterBadge() {
        const activeCount = Object.keys(this.activeFilters).length;
        
        if (this.filterBadge && this.filterButton) {
            if (activeCount > 0) {
                this.filterBadge.textContent = activeCount;
                this.filterBadge.style.display = 'flex';
                this.filterButton.classList.add('has-active-filters');
                this.filterButton.title = `Data Filters (${activeCount} active)`;
            } else {
                this.filterBadge.style.display = 'none';
                this.filterButton.classList.remove('has-active-filters');
                this.filterButton.title = 'Data Filters';
            }
        }
    }
    
    /**
     * Restore filters from URL parameters
     */
    restoreFiltersFromURL() {
        const params = new URLSearchParams(window.location.search);
        
        // Check for cloud cover in URL using the correct URL key
        if (params.has('cc')) { // 'cc' is the URL key for cloudCover from UnifiedStateManager
            const cloudCoverValue = parseInt(params.get('cc'));
            
            // Find and activate cloud cover filter
            const cloudCoverFilter = this.filters.get('cloud_cover');
            if (cloudCoverFilter && cloudCoverValue >= 0 && cloudCoverValue <= 100) {
                console.log('🔗 Restoring cloud cover filter from URL:', cloudCoverValue);
                
                // Enable the filter
                const filterElement = document.getElementById('filter-cloud_cover');
                if (filterElement) {
                    // Set the range value
                    const rangeInput = filterElement.querySelector('#range-cloud_cover');
                    const valueDisplay = filterElement.querySelector('#value-cloud_cover');
                    
                    if (rangeInput && valueDisplay) {
                        rangeInput.value = cloudCoverValue;
                        valueDisplay.textContent = cloudCoverValue;
                        
                        // Enable the filter
                        filterElement.classList.add('enabled');
                        const content = filterElement.querySelector('#content-cloud_cover');
                        if (content) content.classList.remove('collapsed');
                        
                        const enableBtn = filterElement.querySelector('#enable-cloud_cover');
                        if (enableBtn) {
                            enableBtn.querySelector('i').textContent = 'check_box';
                            enableBtn.title = 'Disable Cloud Cover filter';
                        }
                        
                        // Set active filter
                        this.activeFilters.cloud_cover = {
                            ...cloudCoverFilter,
                            value: cloudCoverValue
                        };
                        
                        // Update badge
                        this.updateFilterBadge();
                    }
                }
            }
        }
    }
}