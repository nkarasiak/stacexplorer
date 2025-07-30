/**
 * CollectionGridSelector.js - Beautiful grid-based collection selector inspired by Microsoft Planetary Computer
 * Displays collections as cards with images, descriptions, and search functionality
 */

import { loadAllCollections } from '../../utils/CollectionConfig.js';

export class CollectionGridSelector {
    /**
     * Create a new CollectionGridSelector
     * @param {Object} apiClient - STAC API client
     * @param {Object} notificationService - Notification service
     * @param {Object} config - Application configuration
     */
    constructor(apiClient, notificationService, config) {
        this.apiClient = apiClient;
        this.notificationService = notificationService;
        this.config = config;
        this.collections = [];
        this.filteredCollections = [];
        this.selectedCollection = null;
        this.isLoading = false;
        this.searchTerm = '';
        this.selectedSource = 'all';
        this.collectionsLoaded = false;
        
        // Create the selector UI
        this.createUI();
        this.setupEventListeners();
    }
    
    /**
     * Create the collection grid selector UI
     */
    createUI() {
        // Find or create container
        let container = document.getElementById('collection-grid-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'collection-grid-container';
            
            // Insert after the existing collection select or in the search panel
            const existingSelect = document.getElementById('collection-select');
            if (existingSelect?.parentNode) {
                existingSelect.parentNode.insertBefore(container, existingSelect.nextSibling);
                // Hide the old dropdown
                existingSelect.style.display = 'none';
            } else {
                // Fallback to search panel
                const searchPanel = document.querySelector('.search-panel') || document.body;
                searchPanel.appendChild(container);
            }
        }
        
        container.innerHTML = `
            <div class="collection-grid-selector">
                
                <!-- Loading state -->
                <div class="collection-loading-state" id="collection-loading-state">
                    <div class="loading-spinner">
                        <i class="material-icons spinning">refresh</i>
                    </div>
                    <p>Loading collections...</p>
                </div>
                
                <!-- Empty state -->
                <div class="collection-empty-state" id="collection-empty-state" style="display: none;">
                    <div class="empty-state-icon">
                        <i class="material-icons">search_off</i>
                    </div>
                    <h4>No collections found</h4>
                    <p>Try adjusting your search or filter criteria</p>
                </div>
                
                <!-- Collections stats with integrated search -->
                <div class="collection-stats" id="collection-stats" style="display: none;">
                    <span class="stats-text">
                        <span id="collection-count">0</span> collections found
                        <span id="search-results-text" style="display: none;">
                            for "<span id="search-term-display"></span>"
                        </span>
                    </span>
                    <div class="stats-controls">
                        <div class="collection-search-container">
                            <div class="search-input-wrapper">
                                <i class="material-icons search-icon">search</i>
                                <input 
                                    type="text" 
                                    id="collection-search" 
                                    placeholder="Search collections..." 
                                    class="collection-search-input"
                                >
                                <button class="clear-search-btn" id="clear-collection-search" style="display: none;">
                                    <i class="material-icons">close</i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="collection-source-filter">
                            <select id="collection-source-filter" class="source-filter-select" disabled>
                                <option value="all">Loading sources...</option>
                            </select>
                        </div>
                        
                        <button class="clear-selection-btn" id="clear-selection-btn" style="display: none;">
                            <i class="material-icons">close</i>
                            Clear Selection
                        </button>
                    </div>
                </div>
                
                <!-- Collections grid -->
                <div class="collections-grid" id="collections-grid">
                    <!-- Collection cards will be inserted here -->
                </div>
                
                <!-- Load more button -->
                <div class="load-more-container" id="load-more-container" style="display: none;">
                    <button class="load-more-btn" id="load-more-btn">
                        <i class="material-icons">expand_more</i>
                        Load More Collections
                    </button>
                </div>
            </div>
        `;
        
        this.container = container;
        this.elements = {
            searchInput: container.querySelector('#collection-search'),
            clearSearchBtn: container.querySelector('#clear-collection-search'),
            sourceFilter: container.querySelector('#collection-source-filter'),
            viewToggle: container.querySelectorAll('.view-toggle-btn'),
            loadingState: container.querySelector('#collection-loading-state'),
            emptyState: container.querySelector('#collection-empty-state'),
            stats: container.querySelector('#collection-stats'),
            grid: container.querySelector('#collections-grid'),
            countDisplay: container.querySelector('#collection-count'),
            searchResultsText: container.querySelector('#search-results-text'),
            searchTermDisplay: container.querySelector('#search-term-display'),
            clearSelectionBtn: container.querySelector('#clear-selection-btn'),
            loadMoreContainer: container.querySelector('#load-more-container'),
            loadMoreBtn: container.querySelector('#load-more-btn')
        };
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input
        this.elements.searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.updateSearchUI();
            this.filterCollections();
        });
        
        // Clear search
        this.elements.clearSearchBtn.addEventListener('click', () => {
            this.clearSearch();
        });
        
        // Source filter
        this.elements.sourceFilter.addEventListener('change', (e) => {
            // Only process if collections are loaded
            if (!this.collectionsLoaded) {
                console.warn('Collections not yet loaded, ignoring source filter change');
                return;
            }
            this.selectedSource = e.target.value;
            this.filterCollections();
        });
        
        // View toggle
        this.elements.viewToggle.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });
        
        // Clear selection
        this.elements.clearSelectionBtn.addEventListener('click', () => {
            this.clearSelection();
        });
        
        // Load more
        this.elements.loadMoreBtn.addEventListener('click', () => {
            this.loadMoreCollections();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.elements.searchInput.focus();
            }
        });
    }
    
    /**
     * Load collections from the collection manager
     * @param {Array} collections - Array of collection objects
     */
    async loadCollections(collections = []) {
        try {
            this.showLoading();
            
            if (collections.length === 0) {
                // Load from API if not provided
                this.notificationService.showNotification('Loading collections...', 'info');
                // This would integrate with your existing CollectionManagerEnhanced
                // For now, we'll assume collections are passed in
            }
            
            this.collections = collections.map(collection => ({
                ...collection,
                // Add computed properties for UI
                searchableText: this.buildSearchableText(collection),
                thumbnailUrl: this.getThumbnailUrl(collection),
                shortDescription: this.getShortDescription(collection),
                badges: this.getBadges(collection),
                isPriority: this.isPriorityCollection(collection),
                sortOrder: this.getCollectionSortOrder(collection)
            }));
            
            // Sort collections by priority and order
            this.collections = this.sortCollections(this.collections);
            
            this.filteredCollections = [...this.collections];
            this.renderCollections();
            this.updateStats();
            this.hideLoading();
            
            
        } catch (error) {
            console.error('❌ Error loading collections:', error);
            this.showError(error.message);
        }
    }
    
    /**
     * Build searchable text for a collection
     * @param {Object} collection - Collection object
     * @returns {string} Searchable text
     */
    buildSearchableText(collection) {
        const parts = [
            collection.id,
            collection.title,
            collection.description,
            (collection.keywords || []).join(' '),
            collection.sourceLabel
        ];
        return parts.filter(Boolean).join(' ').toLowerCase();
    }
    
    /**
     * Get thumbnail URL for a collection
     * @param {Object} collection - Collection object
     * @returns {string} Thumbnail URL
     */
    getThumbnailUrl(collection) {
        // Try to find a thumbnail or preview image
        if (collection.assets) {
            if (collection.assets.thumbnail) {
                return collection.assets.thumbnail.href;
            }
            if (collection.assets.preview) {
                return collection.assets.preview.href;
            }
        }
        
        // Check links for preview images
        if (collection.links) {
            const previewLink = collection.links.find(link => 
                link.rel === 'preview' || 
                link.type?.includes('image') ||
                link.href?.includes('preview') ||
                link.href?.includes('thumbnail')
            );
            if (previewLink) {
                return previewLink.href;
            }
        }
        
        // Default placeholder based on collection type or source
        return this.getDefaultThumbnail(collection);
    }
    
    /**
     * Get default thumbnail based on collection characteristics
     * @param {Object} collection - Collection object
     * @returns {string} Default thumbnail URL
     */
    getDefaultThumbnail(collection) {
        const title = collection.title || collection.id || 'Collection';
        const encodedTitle = encodeURIComponent(title);
        
        // Use placehold.co service with collection name
        return `https://placehold.co/600x300?text=${encodedTitle}`;
    }
    
    /**
     * Get short description for a collection
     * @param {Object} collection - Collection object
     * @returns {string} Short description
     */
    getShortDescription(collection) {
        const description = collection.description || '';
        if (description.length <= 150) {
            return description;
        }
        return description.substring(0, 147) + '...';
    }
    
    /**
     * Get badges for a collection
     * @param {Object} collection - Collection object
     * @returns {Array} Array of badge objects
     */
    getBadges(collection) {
        const badges = [];
        
        // Only include source badge to optimize space
        badges.push({
            text: collection.sourceLabel || collection.source,
            type: 'source',
            color: this.getSourceColor(collection.source)
        });
        
        return badges;
    }
    
    /**
     * Get color for source
     * @param {string} source - Source name
     * @returns {string} Color hex code
     */
    getSourceColor(source) {
        const colors = {
            copernicus: '#667eea',
            element84: '#f093fb',
            planetary: '#4facfe',
            planetlabs: '#00c9ff'
        };
        return colors[source] || '#6B7280';
    }
    
    /**
     * Check if a collection is a priority/recommended collection
     * @param {Object} collection - Collection object
     * @returns {boolean} True if priority collection
     */
    isPriorityCollection(collection) {
        const priorityCollections = {
            'sentinel-1-rtc': 'microsoft-pc',
            'sentinel-2-c1-l2a': 'earth-search-aws',
            'sentinel-3-olci-1-efr-nrt': 'cdse-stac',
            'cop-dem-glo-30': 'microsoft-pc'
        };
        
        // Only mark as priority if it's the correct collection from the preferred provider
        return priorityCollections[collection.id] === collection.source;
    }
    
    /**
     * Get sort order for a collection (lower numbers = higher priority)
     * @param {Object} collection - Collection object
     * @returns {number} Sort order
     */
    getCollectionSortOrder(collection) {
        const priorityOrder = {
            'sentinel-1-rtc': { order: 1, source: 'microsoft-pc' },
            'sentinel-2-c1-l2a': { order: 2, source: 'earth-search-aws' },
            'sentinel-3-olci-1-efr-nrt': { order: 3, source: 'cdse-stac' },
            'cop-dem-glo-30': { order: 4, source: 'microsoft-pc' }
        };
        
        const priorityInfo = priorityOrder[collection.id];
        if (priorityInfo && priorityInfo.source === collection.source) {
            return priorityInfo.order;
        }
        
        // Non-priority collections get sorted alphabetically after priority ones
        return 1000 + (collection.title || collection.id).toLowerCase().charCodeAt(0);
    }
    
    /**
     * Sort collections by priority and alphabetical order
     * @param {Array} collections - Array of collections
     * @returns {Array} Sorted collections
     */
    sortCollections(collections) {
        return collections.sort((a, b) => {
            // First sort by priority (priority collections first)
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;
            
            // Then sort by sort order
            if (a.sortOrder !== b.sortOrder) {
                return a.sortOrder - b.sortOrder;
            }
            
            // Finally sort alphabetically by title
            const titleA = (a.title || a.id).toLowerCase();
            const titleB = (b.title || b.id).toLowerCase();
            return titleA.localeCompare(titleB);
        });
    }
    
    /**
     * Filter collections based on search and source
     */
    filterCollections() {
        let filtered = [...this.collections];
        
        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(collection => 
                collection.searchableText.includes(this.searchTerm)
            );
        }
        
        // Apply source filter
        if (this.selectedSource !== 'all') {
            filtered = filtered.filter(collection => 
                collection.source === this.selectedSource
            );
        }
        
        // Re-sort filtered collections to maintain priority order
        this.filteredCollections = this.sortCollections(filtered);
        this.renderCollections();
        this.updateStats();
    }
    
    /**
     * Render collections in the grid
     */
    renderCollections() {
        const grid = this.elements.grid;
        
        if (this.filteredCollections.length === 0) {
            this.showEmptyState();
            return;
        }
        
        this.hideEmptyState();
        
        // Render collection cards
        grid.innerHTML = this.filteredCollections.map(collection => 
            this.renderCollectionCard(collection)
        ).join('');
        
        // Add click handlers to cards
        grid.querySelectorAll('.collection-card').forEach((card, index) => {
            const collectionId = card.dataset.collectionId;
            const collection = this.filteredCollections.find(c => c.id === collectionId);
            
            if (!collection) {
                console.warn('⚠️ No collection found for card:', collectionId);
                return;
            }
            
            card.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event from bubbling to modal overlay
                this.selectCollection(collection);
            });
            
            // Details button
            const detailsBtn = card.querySelector('.collection-details-btn');
            if (detailsBtn) {
                detailsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showCollectionDetails(collection);
                });
            }
        });
    }
    
    /**
     * Render a single collection card
     * @param {Object} collection - Collection object
     * @returns {string} HTML string for the card
     */
    renderCollectionCard(collection) {
        const isSelected = this.selectedCollection?.id === collection.id;
        const isPriority = collection.isPriority;
        
        return `
            <div class="collection-card ${isSelected ? 'selected' : ''} ${isPriority ? 'priority-collection' : ''}" data-collection-id="${collection.id}">
                ${isPriority ? '<div class="priority-badge"><i class="material-icons">star</i></div>' : ''}
                
                <div class="collection-card-image">
                    <img 
                        src="${collection.thumbnailUrl}" 
                        alt="${collection.title || collection.id}"
                        loading="lazy"
                        onerror="this.src='${this.getDefaultThumbnail(collection)}'"
                    >
                    <div class="collection-card-overlay">
                        <button class="collection-details-btn" title="View Details">
                            <i class="material-icons">info</i>
                        </button>
                    </div>
                </div>
                
                <div class="collection-card-content">
                    <div class="collection-card-header">
                        <h4 class="collection-card-title" title="${collection.title || collection.id}">
                            ${isPriority ? '⭐ ' : ''}${collection.title || collection.id}
                        </h4>
                        ${isSelected ? '<i class="material-icons selected-icon">check_circle</i>' : ''}
                    </div>
                    
                    <div class="collection-card-badges">
                        ${isPriority ? '<span class="collection-badge priority-badge-inline" style="background-color: #4ade80;">Recommended</span>' : ''}
                        ${collection.badges.map(badge => `
                            <span class="collection-badge" style="background-color: ${badge.color};">
                                ${badge.text}
                            </span>
                        `).join('')}
                    </div>
                    
                    <p class="collection-card-description">
                        ${collection.shortDescription}
                    </p>
                    
                    <div class="collection-card-meta">
                        ${collection.extent?.temporal?.interval?.[0]?.[0] ? `
                            <span class="meta-item">
                                <i class="material-icons">schedule</i>
                                ${new Date(collection.extent.temporal.interval[0][0]).getFullYear()}
                            </span>
                        ` : ''}
                        
                        ${collection.extent?.spatial?.bbox?.[0] ? `
                            <span class="meta-item">
                                <i class="material-icons">public</i>
                                Global
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Select a collection
     * @param {Object} collection - Collection to select
     */
    selectCollection(collection) {
        
        // Check modal state before and after each operation
        const checkModalState = (step) => {
            const modalOverlay = document.querySelector('.collection-browser-modal-overlay.open');
        };
        
        checkModalState('BEFORE setting selectedCollection');
        this.selectedCollection = collection;
        
        checkModalState('BEFORE renderCollections()');
        // Update UI
        this.renderCollections();
        checkModalState('AFTER renderCollections()');;
        this.elements.clearSelectionBtn.style.display = 'inline-flex';
        
        // Update the original collection select for backward compatibility
        const originalSelect = document.getElementById('collection-select');
        if (originalSelect) {
            originalSelect.value = collection.id;
            originalSelect.dispatchEvent(new Event('change'));
        }
        
        // Get current catalog ID for the URL generation
        let catalogId = null;
        if (window.stacExplorer?.apiClient?.endpoints?.root) {
            // Try to determine catalog ID from current API endpoint
            const currentEndpoint = window.stacExplorer.apiClient.endpoints.root;
            const legacyMapping = {
                'https://stac.dataspace.copernicus.eu/v1': 'cdse-stac',
                'https://earth-search.aws.element84.com/v1': 'earth-search-aws',
                'https://planetarycomputer.microsoft.com/api/stac/v1': 'microsoft-pc'
            };
            catalogId = legacyMapping[currentEndpoint];
        }
        
        // Dispatch selection event
        document.dispatchEvent(new CustomEvent('collectionSelected', {
            detail: {
                collection: collection,
                source: collection.source,
                catalogId: catalogId  // Add catalog ID for URL generation
            }
        }));
        
        // Note: Notification is shown by CollectionBrowserModal to avoid duplicates
    }
    
    /**
     * Clear collection selection
     */
    clearSelection() {
        this.selectedCollection = null;
        this.renderCollections();
        this.elements.clearSelectionBtn.style.display = 'none';
        
        // Update original select
        const originalSelect = document.getElementById('collection-select');
        if (originalSelect) {
            originalSelect.value = '';
            originalSelect.dispatchEvent(new Event('change'));
        }
        
        // Dispatch clear event
        document.dispatchEvent(new CustomEvent('collectionCleared'));
        
        this.notificationService.showNotification('Collection selection cleared', 'info');
    }
    
    /**
     * Show collection details modal
     * @param {Object} collection - Collection to show details for
     */
    showCollectionDetails(collection) {
        // Dispatch event for collection details modal
        document.dispatchEvent(new CustomEvent('showCollectionDetails', {
            detail: { collection }
        }));
    }
    
    /**
     * Update search UI
     */
    updateSearchUI() {
        const hasSearch = this.searchTerm.length > 0;
        this.elements.clearSearchBtn.style.display = hasSearch ? 'block' : 'none';
        this.elements.searchResultsText.style.display = hasSearch ? 'inline' : 'none';
        this.elements.searchTermDisplay.textContent = this.searchTerm;
    }
    
    /**
     * Clear search
     */
    clearSearch() {
        this.searchTerm = '';
        this.elements.searchInput.value = '';
        this.updateSearchUI();
        this.filterCollections();
    }
    
    /**
     * Switch view mode
     * @param {string} view - View mode ('grid' or 'list')
     */
    switchView(view) {
        this.elements.viewToggle.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        this.elements.grid.classList.toggle('list-view', view === 'list');
    }
    
    /**
     * Update statistics display
     */
    updateStats() {
        const count = this.filteredCollections.length;
        this.elements.countDisplay.textContent = count.toLocaleString();
        this.elements.stats.style.display = 'flex';
    }
    
    /**
     * Enable source filter after collections are loaded
     */
    async enableSourceFilter() {
        // Populate source filter from collections.json
        await this.populateSourceFilter();
        
        this.elements.sourceFilter.disabled = false;
        this.elements.sourceFilter.querySelector('option[value="all"]').textContent = 'All Sources';
        this.collectionsLoaded = true;
    }
    
    /**
     * Populate source filter with collections from collections.json
     */
    async populateSourceFilter() {
        const collections = await loadAllCollections();
        const sourceFilter = this.elements.sourceFilter;
        
        // Clear existing options except 'all'
        const allOption = sourceFilter.querySelector('option[value="all"]');
        sourceFilter.innerHTML = '';
        sourceFilter.appendChild(allOption);
        
        // Add options for each collection
        collections.forEach(collection => {
            const option = document.createElement('option');
            option.value = collection.id;
            option.textContent = collection.name;
            sourceFilter.appendChild(option);
        });
    }
    
    /**
     * Disable source filter while collections are loading
     */
    disableSourceFilter() {
        this.elements.sourceFilter.disabled = true;
        this.elements.sourceFilter.querySelector('option[value="all"]').textContent = 'Loading sources...';
        this.collectionsLoaded = false;
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.elements.loadingState.style.display = 'flex';
        this.elements.grid.style.display = 'none';
        this.elements.stats.style.display = 'none';
        this.disableSourceFilter();
    }
    
    /**
     * Hide loading state
     */
    hideLoading() {
        this.elements.loadingState.style.display = 'none';
        this.elements.grid.style.display = 'grid';
        this.enableSourceFilter();
    }
    
    /**
     * Show empty state
     */
    showEmptyState() {
        this.elements.emptyState.style.display = 'flex';
        this.elements.grid.style.display = 'none';
    }
    
    /**
     * Hide empty state
     */
    hideEmptyState() {
        this.elements.emptyState.style.display = 'none';
        this.elements.grid.style.display = 'grid';
    }
    
    /**
     * Show error state
     * @param {string} message - Error message
     */
    showError(message) {
        this.hideLoading();
        this.disableSourceFilter(); // Keep disabled on error
        this.notificationService.showNotification(`Error: ${message}`, 'error');
    }
    
    /**
     * Load more collections (for pagination)
     */
    loadMoreCollections() {
        // Implement pagination if needed
    }
    
    /**
     * Get currently selected collection
     * @returns {Object|null} Selected collection or null
     */
    getSelectedCollection() {
        return this.selectedCollection;
    }
    
    /**
     * Set selected collection programmatically
     * @param {string} collectionId - Collection ID to select
     * @param {string} source - Source of the collection
     */
    setSelectedCollection(collectionId, source = null) {
        const collection = this.collections.find(c => 
            c.id === collectionId && (source ? c.source === source : true)
        );
        
        if (collection) {
            this.selectCollection(collection);
        }
    }
    
    /**
     * Refresh collections
     */
    async refresh() {
        // This would typically reload from the collection manager
        this.showLoading();
        
        // Trigger collection reload
        document.dispatchEvent(new CustomEvent('reloadCollections'));
    }
}