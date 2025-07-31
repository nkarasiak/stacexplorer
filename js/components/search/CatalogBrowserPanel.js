/**
 * CatalogBrowserPanel.js - Hierarchical catalog browser similar to STAC Browser
 * Provides tree-style navigation through Catalogs -> Collections -> Items
 */

export class CatalogBrowserPanel {
    constructor(apiClient, notificationService, config) {
        this.apiClient = apiClient;
        this.notificationService = notificationService;
        this.config = config;
        
        this.currentPath = [];
        this.currentItems = [];
        this.isVisible = false;
        this.onItemSelect = null;
        this.onCollectionSelect = null;
        
        this.init();
    }
    
    /**
     * Create application path with correct base path for GitHub Pages
     */
    createAppPath(path) {
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        
        if (hostname.endsWith('.github.io') && pathname.startsWith('/stacexplorer/')) {
            return '/stacexplorer' + path;
        }
        
        return path;
    }
    
    init() {
        this.createPanel();
        this.setupEventListeners();
    }
    
    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'catalog-browser-panel';
        panel.className = 'catalog-browser-panel hidden';
        
        panel.innerHTML = `
            <!-- Sidebar - Matching Main App Layout -->
            <aside class="catalog-browser-sidebar">
                <div class="sidebar-header">
                    <h1 id="app-logo" style="cursor: pointer;" title="Return to Homepage">
                        <i class="material-icons">satellite_alt</i> 
                        <span>STAC Explorer</span>
                    </h1>
                    <div class="header-actions">
                        <button id="catalog-browser-close" title="Close Browser">
                            <i class="material-icons">close</i>
                        </button>
                    </div>
                </div>
                <div class="browser-section-header">
                    <h2>
                        <i class="material-icons">folder_open</i>
                        <span>Browser</span>
                    </h2>
                </div>
                
                <div class="catalog-breadcrumb">
                    <div id="breadcrumb-container"></div>
                </div>
                
                <div class="catalog-browser-sidebar-content">
                    <!-- Search Interface Card -->
                    <div class="catalog-card-container" id="search-card" style="display: none;">
                        <div class="catalog-card-header">
                            <h2>
                                <i class="material-icons">search</i>
                                Search Collections
                            </h2>
                        </div>
                        <div class="catalog-card-body">
                            <div class="catalog-search-interface">
                                <div class="search-input-container">
                                    <i class="material-icons">search</i>
                                    <input 
                                        type="text" 
                                        id="collections-search" 
                                        placeholder="Search collections..." 
                                    >
                                    <button class="clear-search-btn" id="clear-collections-search" style="display: none;">
                                        <i class="material-icons">close</i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Collections Card -->
                    <div class="catalog-card-container" id="collections-card" style="display: none;">
                        <div class="catalog-card-header">
                            <h2>
                                <i class="material-icons">layers</i>
                                <span id="collections-title">Collections</span>
                            </h2>
                        </div>
                        <div class="catalog-card-body">
                            <div id="collections-count-display">0 collections</div>
                        </div>
                    </div>
                    
                    <!-- Items Card -->
                    <div class="catalog-card-container" id="items-card" style="display: none;">
                        <div class="catalog-card-header">
                            <h2>
                                <i class="material-icons">image</i>
                                Items
                            </h2>
                            <div class="catalog-view-controls">
                                <select id="items-sort" class="form-control">
                                    <option value="datetime">Sort by Date</option>
                                    <option value="id">Sort by ID</option>
                                    <option value="properties.title">Sort by Title</option>
                                </select>
                            </div>
                        </div>
                        <div class="catalog-card-body">
                            <div id="items-count-display">0 items</div>
                        </div>
                    </div>
                </div>
            </aside>
            
            <!-- Main Content Area -->
            <main class="catalog-browser-main">
                <div class="catalog-content-container">
                    <!-- Loading State -->
                    <div id="catalog-loading" class="loading-state hidden">
                        <div class="loading-spinner"></div>
                        <span>Loading catalog...</span>
                    </div>
                    
                    <!-- Main Content -->
                    <div id="catalog-tree-view">
                        <!-- Collections will be rendered here -->
                    </div>
                    
                    <!-- Error State -->
                    <div id="catalog-error" class="error-state hidden">
                        <i class="material-icons">error</i>
                        <span id="error-message">Failed to load catalog</span>
                        <button id="retry-catalog" class="catalog-connect-btn">Retry</button>
                    </div>
                </div>
            </main>
        `;
        
        document.body.appendChild(panel);
        this.panel = panel;
    }
    
    setupEventListeners() {
        document.getElementById('catalog-browser-close').addEventListener('click', () => {
            this.hide();
        });
        
        // Add click handler for the STAC Explorer logo to return to homepage
        document.getElementById('app-logo').addEventListener('click', () => {
            window.location.href = this.createAppPath('/viewer');
        });
        
        // Add click handler for Browser header to navigate to root
        const browserHeader = document.querySelector('.browser-section-header h2');
        if (browserHeader) {
            browserHeader.style.cursor = 'pointer';
            browserHeader.title = 'Return to Catalogs';
            browserHeader.addEventListener('click', () => {
                this.navigateToRoot();
            });
        }
        
        document.getElementById('retry-catalog').addEventListener('click', () => {
            this.loadCurrentLevel();
        });
        
        // Items sort might not exist initially, so check for it
        const itemsSort = document.getElementById('items-sort');
        if (itemsSort) {
            itemsSort.addEventListener('change', (e) => {
                this.sortItems(e.target.value);
            });
        }
    }
    
    show(skipAutoLoad = false) {
        this.isVisible = true;
        this.panel.classList.remove('hidden');
        
        // Allow normal page scrolling for catalog browser
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        
        // Force clear any stuck loading states
        this.forceResetLoadingStates();
        
        // Only load root catalogs if not skipping auto-load (for direct deep links)
        if (!skipAutoLoad) {
            // Check if we have API endpoints configured
            if (!this.apiClient.endpoints.collections && !this.apiClient.endpoints.root) {
                // Show catalog selection immediately if no endpoints
                this.showCatalogSelection();
            } else {
                this.loadRootCatalogs();
            }
        }
        
        this.notifyStateChange();
    }
    
    forceResetLoadingStates() {
        
        const loadingEl = document.getElementById('catalog-loading');
        const treeEl = document.getElementById('catalog-tree-view');
        const errorEl = document.getElementById('catalog-error');
        
        // Force remove any stuck states with aggressive CSS
        if (loadingEl) {
            loadingEl.classList.add('hidden');
            loadingEl.style.display = 'none';
        }
        if (treeEl) {
            treeEl.style.display = 'block';
        }
        if (errorEl) {
            errorEl.classList.add('hidden');
            errorEl.style.display = 'none';
        }
        
        // Force DOM repaint
        if (loadingEl) loadingEl.offsetHeight;
        if (treeEl) treeEl.offsetHeight;
        if (errorEl) errorEl.offsetHeight;
        
    }
    
    hide() {
        this.isVisible = false;
        this.panel.classList.add('hidden');
        
        // Allow normal scrolling when hidden
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        
        this.notifyStateChange();
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    async loadRootCatalogs() {
        try {
            this.showLoading();
            
            
            if (!this.apiClient.endpoints.collections && !this.apiClient.endpoints.root) {
                this.showCatalogSelection();
                return; // showCatalogSelection() handles hideLoading()
            }
            
            const collections = await this.apiClient.getCollections();
            
            // Only reset path if we don't have a catalog selected
            // Keep catalog in path if it exists
            const catalogInPath = this.currentPath.find(p => p.type === 'catalog');
            if (!catalogInPath) {
                this.currentPath = [];
            } else {
                // Keep only the catalog in the path, remove collections/items
                this.currentPath = this.currentPath.filter(p => p.type === 'catalog');
            }
            
            this.displayCollections(collections);
            this.updateBreadcrumb();
            
            // hideLoading() is called in displayCollections()
        } catch (error) {
            console.error('Failed to load root catalogs:', error);
            this.showError(error.message || 'Failed to load catalogs');
        }
    }
    
    displayCollections(collections) {
        // Ensure we're showing the tree view and hiding loading/error
        this.hideLoading();
        
        // Initialize collection state
        this.allCollections = collections || [];
        this.filteredCollections = [...this.allCollections];
        this.searchTerm = '';
        
        
        // Show sidebar cards and update counts
        document.getElementById('search-card').style.display = 'block';
        document.getElementById('collections-card').style.display = 'block';
        
        const collectionsTitle = document.getElementById('collections-title');
        const collectionsCountDisplay = document.getElementById('collections-count-display');
        if (collectionsTitle && collectionsCountDisplay) {
            collectionsTitle.textContent = 'Collections';
            collectionsCountDisplay.textContent = `${this.allCollections.length} collections available`;
        }
        
        // Create collections grid in main content area
        const catalogTree = document.getElementById('catalog-tree-view');
        catalogTree.innerHTML = `
            <div class="collections-grid" id="collections-grid">
                <!-- Collections will be rendered here -->
            </div>
        `;
        
        // Setup collections search
        this.setupCollectionsSearch();
        
        // Render all collections
        this.renderAllCollections();
    }
    
    
    /**
     * Render all collections (fallback method)
     */
    renderAllCollections() {
        const grid = document.getElementById('collections-grid');
        
        if (!grid) {
            console.error('Collections grid element not found!');
            return;
        }
        
        
        // Ensure grid has proper classes
        grid.className = `collections-grid ${this.viewMode}-view`;
        
        // Render collections
        if (this.filteredCollections.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <p>No collections found${this.searchTerm ? ' matching your search' : ''}</p>
                    ${this.searchTerm ? '<button onclick="document.getElementById(\'collections-search\').value = \'\'; document.getElementById(\'collections-search\').dispatchEvent(new Event(\'input\'));">Clear Search</button>' : ''}
                </div>
            `;
        } else {
            grid.innerHTML = this.filteredCollections.map(collection => this.renderCollectionCard(collection)).join('');
            
            // Attach event listeners
            this.attachCollectionCardEventListeners(this.filteredCollections);
        }
        
        // Update header count in the main header
        const collectionsTitle = document.getElementById('collections-title');
        if (collectionsTitle) {
            const count = this.searchTerm ? this.filteredCollections.length : this.allCollections.length;
            const total = this.allCollections.length;
            collectionsTitle.textContent = this.searchTerm ? `${count} of ${total} Collections` : `${total} Collections Available`;
        }
        
        // Debug info
    }

    
    /**
     * Setup collections search functionality
     */
    setupCollectionsSearch() {
        const searchInput = document.getElementById('collections-search');
        const clearBtn = document.getElementById('clear-collections-search');
        
        if (!searchInput) return;
        
        // Debounced search
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchTerm = e.target.value.toLowerCase().trim();
                this.filterCollections();
                
                // Show/hide clear button
                if (clearBtn) {
                    clearBtn.style.display = this.searchTerm ? 'block' : 'none';
                }
            }, 300);
        });
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                this.searchTerm = '';
                this.filterCollections();
                clearBtn.style.display = 'none';
                searchInput.focus();
            });
        }
    }
    
    /**
     * Setup view toggle functionality
     */
    setupViewToggle() {
        const gridBtn = document.getElementById('grid-view');
        const listBtn = document.getElementById('list-view');
        
        if (!gridBtn || !listBtn) return;
        
        gridBtn.addEventListener('click', () => {
            this.setViewMode('grid');
        });
        
        listBtn.addEventListener('click', () => {
            this.setViewMode('list');
        });
    }
    
    /**
     * Set view mode (grid or list)
     */
    setViewMode(mode) {
        this.viewMode = mode;
        
        const gridBtn = document.getElementById('grid-view');
        const listBtn = document.getElementById('list-view');
        const grid = document.getElementById('collections-grid');
        
        if (!gridBtn || !listBtn || !grid) {
            console.warn('View toggle elements not found!');
            return;
        }
        
        // Update button states
        gridBtn.classList.toggle('active', mode === 'grid');
        listBtn.classList.toggle('active', mode === 'list');
        
        // Update grid class completely
        grid.className = `collections-grid ${mode}-view`;
        
    }
    
    /**
     * Filter collections based on search term
     */
    filterCollections() {
        if (!this.searchTerm) {
            this.filteredCollections = [...this.allCollections];
        } else {
            this.filteredCollections = this.allCollections.filter(collection => {
                const searchText = [
                    collection.id,
                    collection.title,
                    collection.description,
                    ...(collection.keywords || [])
                ].join(' ').toLowerCase();
                
                return searchText.includes(this.searchTerm);
            });
        }
        
        // Re-render all collections
        this.renderAllCollections();
        
    }
    
    
    
    /**
     * Scroll to top of page
     */
    scrollToTop() {
        const grid = document.getElementById('collections-grid');
        if (grid) {
            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    /**
     * Setup lazy loading for collection images
     */
    setupImageLazyLoading() {
        if (!('IntersectionObserver' in window)) return;
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px' // Start loading images 50px before they come into view
        });
        
        // Observe all lazy-loadable images
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => imageObserver.observe(img));
    }
    
    /**
     * Scroll to top of collections grid
     */
    scrollToTop() {
        const statsSection = document.getElementById('collections-stats');
        if (statsSection) {
            statsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * Render collections in modern grid layout (now used by renderCollectionsPage)
     */
    renderCollectionsGrid(collections) {
        if (!collections || collections.length === 0) {
            return `
                <div class="collections-empty-state">
                    <div class="empty-state-icon">
                        <i class="material-icons">layers_clear</i>
                    </div>
                    <h4>No collections found</h4>
                    <p>This catalog doesn't contain any collections</p>
                </div>
            `;
        }
        
        return collections.map(collection => this.renderCollectionCard(collection)).join('');
    }
    
    /**
     * Render a single collection card similar to Browse Collections
     */
    renderCollectionCard(collection) {
        const title = collection.title || collection.id;
        const description = collection.description || 'No description available';
        
        
        // Get temporal extent
        let temporalInfo = '';
        if (collection.extent?.temporal?.interval?.[0]?.[0]) {
            const startYear = new Date(collection.extent.temporal.interval[0][0]).getFullYear();
            const endDate = collection.extent.temporal.interval[0][1];
            const endYear = endDate ? new Date(endDate).getFullYear() : 'present';
            temporalInfo = `${startYear} - ${endYear}`;
        }
        
        // Get spatial extent
        let spatialInfo = '';
        if (collection.extent?.spatial?.bbox?.[0]) {
            spatialInfo = 'Global';
        }
        
        // Get thumbnail URL
        const thumbnailUrl = this.getCollectionThumbnailUrl(collection);
        
        // Get collection badges
        const badges = this.getCollectionBadges(collection);
        
        return `
            <div class="collection-card" data-collection-id="${collection.id}">
                <div class="collection-card-image">
                    <img 
                        src="${thumbnailUrl}" 
                        alt="${title}"
                        loading="lazy"
                        onerror="this.src='${this.getDefaultCollectionThumbnail()}'"
                    >
                    <div class="collection-card-overlay">
                        <button class="browse-btn" title="Browse Collection">
                            <i class="material-icons">arrow_forward</i>
                        </button>
                    </div>
                    <div class="collection-title-overlay">
                        <h3 class="collection-card-title" title="${title}">
                            ${title || collection.id || 'Untitled Collection'}
                        </h3>
                    </div>
                </div>
                
                <div class="collection-card-content">
                    
                    <div class="collection-card-meta">
                        ${temporalInfo ? `
                            <span class="meta-item">
                                <i class="material-icons">schedule</i>
                                ${temporalInfo}
                            </span>
                        ` : ''}
                        <span class="meta-item">
                            <i class="material-icons">fingerprint</i>
                            ${collection.id}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Get thumbnail URL for a collection
     */
    getCollectionThumbnailUrl(collection) {
        // Try different thumbnail sources
        if (collection.assets?.thumbnail?.href) {
            return collection.assets.thumbnail.href;
        }
        
        if (collection.assets?.preview?.href) {
            return collection.assets.preview.href;
        }
        
        // Look for any image asset
        if (collection.assets) {
            for (const [key, asset] of Object.entries(collection.assets)) {
                if (asset.type?.includes('image') || key.includes('thumbnail') || key.includes('preview')) {
                    return asset.href;
                }
            }
        }
        
        // Return default thumbnail
        return this.getDefaultCollectionThumbnail();
    }
    
    /**
     * Get default thumbnail for collections
     */
    getDefaultCollectionThumbnail() {
        // Modern gradient placeholder with better visual appeal
        return 'data:image/svg+xml;base64,' + btoa(`
            <svg width="400" height="240" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#667eea;stop-opacity:0.8" />
                        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:0.6" />
                    </linearGradient>
                    <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.2)" />
                    </pattern>
                </defs>
                <rect width="400" height="240" fill="url(#grad)" />
                <rect width="400" height="240" fill="url(#dots)" />
                <g transform="translate(200,120)">
                    <circle cx="0" cy="-20" r="24" fill="rgba(255,255,255,0.3)" />
                    <path d="M-12,-20 L0,-32 L12,-20 L8,-20 L8,-8 L-8,-8 L-8,-20 Z" fill="rgba(255,255,255,0.8)" />
                </g>
                <text x="200" y="160" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
                      font-size="16" font-weight="500" fill="rgba(255,255,255,0.9)" text-anchor="middle">
                    Collection Preview
                </text>
            </svg>
        `);
    }
    
    /**
     * Format item count for display
     */
    formatItemCount(collection) {
        // Try to estimate item count from collection metadata
        if (collection.summaries?.['eo:bands']?.length) {
            return `${collection.summaries['eo:bands'].length} bands`;
        }
        if (collection.keywords?.includes('satellite')) {
            return 'Satellite data';
        }
        return 'Multiple items';
    }
    
    /**
     * Format spatial extent for display
     */
    formatSpatialExtent(collection) {
        if (collection.extent?.spatial?.bbox?.[0]) {
            const bbox = collection.extent.spatial.bbox[0];
            const width = Math.abs(bbox[2] - bbox[0]);
            const height = Math.abs(bbox[3] - bbox[1]);
            
            if (width > 180 || height > 90) {
                return 'Global';
            } else if (width > 90 || height > 45) {
                return 'Continental';
            } else if (width > 10 || height > 10) {
                return 'Regional';
            } else {
                return 'Local';
            }
        }
        return 'Unknown extent';
    }
    
    /**
     * Get badges for a collection
     */
    getCollectionBadges(collection) {
        const badges = [];
        
        // Add license badge with better colors
        if (collection.license) {
            let color = 'linear-gradient(135deg, #667eea, #764ba2)';
            let text = collection.license.toUpperCase();
            
            if (collection.license.toLowerCase().includes('cc') || collection.license.toLowerCase().includes('creative')) {
                color = 'linear-gradient(135deg, #10b981, #059669)';
                text = 'OPEN';
            } else if (collection.license.toLowerCase().includes('proprietary')) {
                color = 'linear-gradient(135deg, #f59e0b, #d97706)';
                text = 'COMMERCIAL';
            } else if (collection.license.toLowerCase().includes('public')) {
                color = 'linear-gradient(135deg, #06b6d4, #0891b2)';
                text = 'PUBLIC';
            }
            
            badges.push({ text, color });
        }
        
        // Add data type badges with modern gradients
        if (collection.summaries?.['eo:bands'] || collection.summaries?.['raster:bands']) {
            badges.push({
                text: 'OPTICAL',
                color: 'linear-gradient(135deg, #ec4899, #be185d)'
            });
        }
        
        if (collection.summaries?.['sar:bands'] || collection.id.toLowerCase().includes('sar')) {
            badges.push({
                text: 'SAR',
                color: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
            });
        }
        
        // Add provider/mission badges
        if (collection.id.toLowerCase().includes('sentinel')) {
            badges.push({
                text: 'SENTINEL',
                color: 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
            });
        } else if (collection.id.toLowerCase().includes('landsat')) {
            badges.push({
                text: 'LANDSAT',
                color: 'linear-gradient(135deg, #059669, #047857)'
            });
        } else if (collection.id.toLowerCase().includes('modis')) {
            badges.push({
                text: 'MODIS',
                color: 'linear-gradient(135deg, #dc2626, #b91c1c)'
            });
        }
        
        // Add resolution badge
        if (collection.summaries?.gsd) {
            const gsd = Array.isArray(collection.summaries.gsd) ? collection.summaries.gsd[0] : collection.summaries.gsd;
            if (gsd <= 10) {
                badges.push({
                    text: 'HIGH-RES',
                    color: 'linear-gradient(135deg, #f59e0b, #d97706)'
                });
            }
        }
        
        // Add frequency badge for time series
        if (collection.extent?.temporal?.interval?.[0]) {
            const start = new Date(collection.extent.temporal.interval[0][0]);
            const end = collection.extent.temporal.interval[0][1] ? new Date(collection.extent.temporal.interval[0][1]) : new Date();
            const yearsDiff = (end - start) / (1000 * 60 * 60 * 24 * 365);
            
            if (yearsDiff > 10) {
                badges.push({
                    text: 'ARCHIVE',
                    color: 'linear-gradient(135deg, #6b7280, #4b5563)'
                });
            } else if (yearsDiff < 1) {
                badges.push({
                    text: 'RECENT',
                    color: 'linear-gradient(135deg, #10b981, #059669)'
                });
            }
        }
        
        return badges.slice(0, 4); // Limit to 4 badges for clean layout
    }
    
    /**
     * Setup search functionality for collections
     */
    setupCollectionsSearch(collections) {
        const searchInput = document.getElementById('collections-search');
        const clearBtn = document.getElementById('clear-collections-search');
        
        if (!searchInput) return;
        
        let searchTimeout;
        
        // Search functionality with debouncing
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterCollections(collections, searchTerm);
                
                // Show/hide clear button
                if (searchTerm) {
                    clearBtn.style.display = 'block';
                } else {
                    clearBtn.style.display = 'none';
                }
            }, 300);
        });
        
        // Clear search
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearBtn.style.display = 'none';
                this.filterCollections(collections, '');
                searchInput.focus();
            });
        }
        
        // Keyboard navigation
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                clearBtn.style.display = 'none';
                this.filterCollections(collections, '');
                searchInput.blur();
            }
        });
    }
    
    /**
     * Filter collection cards based on search term
     */
    filterCollections(collections, searchTerm) {
        const collectionsGrid = document.getElementById('collections-grid');
        const collectionCards = collectionsGrid.querySelectorAll('.collection-card');
        let visibleCount = 0;
        
        if (!searchTerm) {
            // Show all collections
            collectionCards.forEach(card => {
                card.style.display = 'block';
                visibleCount++;
            });
        } else {
            // Filter collections
            collectionCards.forEach(card => {
                const title = card.querySelector('.collection-card-title')?.textContent?.toLowerCase() || '';
                const description = card.querySelector('.collection-card-description')?.textContent?.toLowerCase() || '';
                const collectionId = card.dataset.collectionId?.toLowerCase() || '';
                
                const searchText = `${title} ${description} ${collectionId}`;
                const isMatch = searchText.includes(searchTerm);
                
                if (isMatch) {
                    card.style.display = 'block';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });
        }
        
        // Update count display
        const countDisplay = document.getElementById('collections-count');
        if (countDisplay) {
            countDisplay.textContent = visibleCount;
        }
        
        // Show/hide empty state
        if (visibleCount === 0 && searchTerm) {
            collectionsGrid.innerHTML = `
                <div class="collections-empty-state">
                    <div class="empty-state-icon">
                        <i class="material-icons">search_off</i>
                    </div>
                    <h4>No collections match your search</h4>
                    <p>Try a different search term or clear the search to see all collections.</p>
                </div>
            `;
        } else if (visibleCount === 0 && !searchTerm) {
            collectionsGrid.innerHTML = `
                <div class="collections-empty-state">
                    <div class="empty-state-icon">
                        <i class="material-icons">layers_clear</i>
                    </div>
                    <h4>No collections found</h4>
                    <p>This catalog doesn't contain any collections</p>
                </div>
            `;
        } else if (searchTerm && visibleCount > 0) {
            // Re-render filtered results
            const filteredCollections = collections.filter(collection => {
                const title = collection.title?.toLowerCase() || '';
                const description = collection.description?.toLowerCase() || '';
                const id = collection.id?.toLowerCase() || '';
                const searchText = `${title} ${description} ${id}`;
                return searchText.includes(searchTerm);
            });
            
            collectionsGrid.innerHTML = this.renderCollectionsGrid(filteredCollections);
            this.attachCollectionCardEventListeners(filteredCollections);
        }
    }
    
    /**
     * Attach event listeners to collection cards
     */
    attachCollectionCardEventListeners(collections) {
        const collectionCards = document.querySelectorAll('.collection-card');
        
        collectionCards.forEach((card, index) => {
            const collectionId = card.dataset.collectionId;
            const collection = collections.find(c => c.id === collectionId);
            
            if (!collection) return;
            
            // Set animation delay for staggered entrance
            card.style.setProperty('--card-index', index);
            
            // Add click handler for the entire card
            card.addEventListener('click', (e) => {
                // Prevent event if clicking on browse button
                if (!e.target.closest('.browse-btn')) {
                    this.browseCollection(collection);
                }
            });
            
            // Add specific handler for the browse button in overlay
            const browseBtn = card.querySelector('.browse-btn');
            if (browseBtn) {
                browseBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.browseCollection(collection);
                });
            }
            
            // Enhanced keyboard support
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', `Browse collection: ${collection.title || collection.id}`);
            
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.browseCollection(collection);
                } else if (e.key === 'i' || e.key === 'I') {
                    e.preventDefault();
                    this.showCollectionDetails(collection);
                }
            });
            
            // Enhanced mouse tracking for dynamic lighting effect
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                
                card.style.setProperty('--mouse-x', `${x}%`);
                card.style.setProperty('--mouse-y', `${y}%`);
            });
            
            // Add hover effects with improved performance
            let hoverTimeout;
            card.addEventListener('mouseenter', () => {
                clearTimeout(hoverTimeout);
                card.classList.add('collection-card-hover');
            });
            
            card.addEventListener('mouseleave', () => {
                hoverTimeout = setTimeout(() => {
                    card.classList.remove('collection-card-hover');
                }, 100);
            });
            
            // Add focus management for better accessibility
            card.addEventListener('focus', () => {
                card.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest',
                    inline: 'nearest'
                });
            });
        });
    }
    
    /**
     * Show collection details (placeholder for future implementation)
     */
    showCollectionDetails(collection) {
        // TODO: Implement collection details modal
        this.notificationService?.showNotification(
            `Collection details: ${collection.title || collection.id}`, 
            'info'
        );
    }
    
    createCollectionItem(collection) {
        const item = document.createElement('div');
        item.className = 'catalog-item collection-item';
        item.setAttribute('tabindex', '0');
        item.setAttribute('role', 'button');
        item.setAttribute('aria-label', `Collection: ${collection.title || collection.id}`);
        
        const title = collection.title || collection.id;
        const description = collection.description || 'No description available';
        const spatialExtent = collection.extent?.spatial?.bbox?.length;
        const temporalExtent = collection.extent?.temporal?.interval?.[0];
        const license = collection.license;
        const keywords = collection.keywords?.slice(0, 3)?.join(', ');
        
        // Calculate approximate item count if available
        let itemCountText = '';
        if (spatialExtent) {
            itemCountText = `${spatialExtent} spatial extent${spatialExtent > 1 ? 's' : ''}`;
        }
        
        // Format temporal extent
        let temporalText = '';
        if (temporalExtent && temporalExtent[0] && temporalExtent[1]) {
            const start = new Date(temporalExtent[0]).getFullYear();
            const end = temporalExtent[1] === null ? 'present' : new Date(temporalExtent[1]).getFullYear();
            temporalText = `${start} - ${end}`;
        }
        
        item.innerHTML = `
            <div class="catalog-item-icon">
                <i class="material-icons">layers</i>
            </div>
            <div class="catalog-item-content">
                <div class="catalog-item-title">${title}</div>
                <div class="catalog-item-description">${description}</div>
                <div class="catalog-item-meta">
                    <span class="collection-id"><i class="material-icons">fingerprint</i>${collection.id}</span>
                    ${temporalText ? `<span class="temporal-extent"><i class="material-icons">schedule</i>${temporalText}</span>` : ''}
                    ${itemCountText ? `<span class="spatial-extent"><i class="material-icons">place</i>${itemCountText}</span>` : ''}
                    ${license ? `<span class="license"><i class="material-icons">gavel</i>${license}</span>` : ''}
                    ${keywords ? `<span class="keywords"><i class="material-icons">label</i>${keywords}</span>` : ''}
                </div>
            </div>
            <div class="catalog-item-actions">
                <button class="btn-icon browse-collection" title="Browse Items" aria-label="Browse items in ${title}">
                    <i class="material-icons">arrow_forward</i>
                </button>
            </div>
        `;
        
        // Set data attributes for event handling
        item.dataset.collectionId = collection.id;
        item.dataset.collectionData = JSON.stringify(collection);
        
        // Enhanced keyboard navigation
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.browseCollection(collection);
            }
        });
        
        return item;
    }
    
    attachCollectionEventListeners(collections) {
        
        collections.forEach(collection => {
            const collectionElement = document.querySelector(`[data-collection-id="${collection.id}"]`);
            if (!collectionElement) {
                console.warn('❌ Collection element not found for:', collection.id);
                return;
            }
            
            const browseButton = collectionElement.querySelector('.browse-collection');
            
            if (browseButton) {
                browseButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.browseCollection(collection);
                });
            }
            
            // Also make the whole collection item clickable to browse
            collectionElement.addEventListener('click', () => {
                this.browseCollection(collection);
            });
        });
    }
    
    async browseCollection(collection) {
        try {
            this.loadStartTime = performance.now();
            this.showLoading();
            
            
            // Show loading feedback specific to collection
            const loadingEl = document.getElementById('catalog-loading');
            if (loadingEl) {
                loadingEl.innerHTML = `
                    <div class="loading-spinner"></div>
                    <span>Loading items from <strong>${collection.title || collection.id}</strong>...</span>
                    <small>This may take a moment for large collections</small>
                `;
            }
            
            const searchParams = {
                collections: [collection.id],
                limit: 10 // Default query limit for collection browsing
            };
            
            
            let items;
            try {
                items = await this.apiClient.searchItems(searchParams);
            } catch (searchError) {
                console.error('❌ Search API error:', searchError);
                throw new Error(`Search API failed: ${searchError.message}`);
            }
            
            // Handle different API response formats
            let itemsArray = [];
            if (Array.isArray(items)) {
                // Direct array response (like Element84)
                itemsArray = items;
            } else if (items?.features && Array.isArray(items.features)) {
                // GeoJSON FeatureCollection response
                itemsArray = items.features;
            } else {
            }
            
            // Remove any existing collection or item from path and add the new collection
            this.currentPath = this.currentPath.filter(p => p.type === 'catalog');
            this.currentPath.push({
                type: 'collection',
                data: collection
            });
            
            this.displayCollectionWithItems(collection, itemsArray);
            this.updateBreadcrumb();
            this.notifyStateChange();
            
            // Show success notification
            if (this.notificationService && itemsArray.length > 0) {
                this.notificationService.showNotification(
                    `Loaded ${itemsArray.length} items from ${collection.title || collection.id}`, 
                    'success'
                );
            }
            
            this.hideLoading();
        } catch (error) {
            console.error('❌ Failed to load collection items:', error);
            this.showError(`Failed to load items from ${collection.title || collection.id}: ${error.message}`);
            
            // Show error notification
            if (this.notificationService) {
                this.notificationService.showNotification(
                    `Failed to load collection: ${error.message}`, 
                    'error'
                );
            }
        }
    }
    
    displayItems(items) {
        // Hide collections card, show items card
        document.getElementById('collections-card').style.display = 'none';
        document.getElementById('items-card').style.display = 'block';
        
        const countDisplay = document.getElementById('items-count-display');
        
        // Enhanced item count display with performance info
        const loadTime = performance.now() - (this.loadStartTime || performance.now());
        if (countDisplay) {
            countDisplay.innerHTML = `${items.length} items loaded in ${Math.round(loadTime)}ms`;
        }
        
        if (!items || items.length === 0) {
            // Get the current collection info for better error message
            const currentCollection = this.currentPath.find(p => p.type === 'collection');
            const collectionName = currentCollection?.data?.title || currentCollection?.data?.id || 'this collection';
            
            console.warn('⚠️ No items to display for collection:', collectionName);
            
            const catalogTree = document.getElementById('catalog-tree-view');
            catalogTree.innerHTML = `
                <div class="loading-state">
                    <i class="material-icons">search_off</i>
                    <p>No items found in ${collectionName}</p>
                    <small>This collection may be empty, or there might be an issue with the API request.</small>
                </div>
            `;
            return;
        }
        
        this.currentItems = items;
        
        // Create items grid in main content area
        const catalogTree = document.getElementById('catalog-tree-view');
        catalogTree.innerHTML = `
            <ul class="results-list" id="items-list">
                <!-- Items will be rendered here -->
            </ul>
        `;
        
        // Progressive loading for better performance with large collections
        if (items.length > 50) {
            this.renderItemsProgressively(items);
        } else {
            this.renderItems(items);
        }
    }
    
    /**
     * Display collection header information followed by first 10 items
     */
    displayCollectionWithItems(collection, items) {
        // Hide collections card, show items card
        document.getElementById('collections-card').style.display = 'none';
        document.getElementById('items-card').style.display = 'block';
        
        const countDisplay = document.getElementById('items-count-display');
        
        // Enhanced item count display with performance info
        const loadTime = performance.now() - (this.loadStartTime || performance.now());
        if (countDisplay) {
            countDisplay.innerHTML = `${items.length} items loaded in ${Math.round(loadTime)}ms`;
        }
        
        this.currentItems = items;
        
        // Create collection header and items display
        const catalogTree = document.getElementById('catalog-tree-view');
        
        // Get collection metadata
        const title = collection.title || collection.id;
        const fullDescription = collection.description || 'No description available';
        // Limit description to 200 characters
        const description = fullDescription.length > 200 ? 
            fullDescription.substring(0, 200) + '...' : fullDescription;
        const thumbnailUrl = this.getCollectionThumbnailUrl(collection);
        
        // Get temporal extent
        let temporalInfo = '';
        if (collection.extent?.temporal?.interval?.[0]?.[0]) {
            const startDate = collection.extent.temporal.interval[0][0];
            const endDate = collection.extent.temporal.interval[0][1];
            const startYear = new Date(startDate).getFullYear();
            const endYear = endDate ? new Date(endDate).getFullYear() : 'present';
            temporalInfo = `${startYear} - ${endYear}`;
        }
        
        // Get spatial extent info
        let spatialInfo = 'Global';
        if (collection.extent?.spatial?.bbox?.[0]) {
            const bbox = collection.extent.spatial.bbox[0];
            spatialInfo = `${bbox[1].toFixed(1)}°N, ${bbox[0].toFixed(1)}°W to ${bbox[3].toFixed(1)}°N, ${bbox[2].toFixed(1)}°E`;
        }
        
        // Get additional metadata
        const license = collection.license || 'Not specified';
        
        catalogTree.innerHTML = `
            <div class="collection-detail-header">
                <div class="collection-hero">
                    <div class="collection-hero-image">
                        <img 
                            src="${thumbnailUrl}" 
                            alt="${title}"
                            onerror="this.src='${this.getDefaultCollectionThumbnail()}'"
                        >
                    </div>
                    <div class="collection-hero-content">
                        <h1 class="collection-title">${title}</h1>
                        <p class="collection-description">${description}</p>
                        
                        <div class="collection-metadata">
                            <div class="metadata-grid">
                                <div class="metadata-item">
                                    <i class="material-icons">schedule</i>
                                    <div>
                                        <strong>Temporal Coverage</strong>
                                        <span>${temporalInfo || 'Not specified'}</span>
                                    </div>
                                </div>
                                <div class="metadata-item">
                                    <i class="material-icons">public</i>
                                    <div>
                                        <strong>Spatial Coverage</strong>
                                        <span>${spatialInfo}</span>
                                    </div>
                                </div>
                                <div class="metadata-item">
                                    <i class="material-icons">fingerprint</i>
                                    <div>
                                        <strong>Collection ID</strong>
                                        <span>${collection.id}</span>
                                    </div>
                                </div>
                                <div class="metadata-item">
                                    <i class="material-icons">gavel</i>
                                    <div>
                                        <strong>License</strong>
                                        <span>${license}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="collection-items-section">
                <div class="section-header">
                    <h2>
                        <i class="material-icons">image</i>
                        Recent Items
                        <span class="item-count">(${Math.min(items.length, 10)} of ${items.length})</span>
                    </h2>
                </div>
                <ul class="results-list" id="items-list">
                    <!-- Items will be rendered here -->
                </ul>
            </div>
        `;
        
        if (!items || items.length === 0) {
            const itemsList = document.getElementById('items-list');
            itemsList.innerHTML = `
                <div class="empty-state">
                    <i class="material-icons">search_off</i>
                    <p>No items found in this collection</p>
                    <small>This collection may be empty, or there might be an issue with the API request.</small>
                </div>
            `;
            return;
        }
        
        // Display first 10 items
        const itemsToShow = items.slice(0, 10);
        this.renderItemsList(itemsToShow);
    }
    
    /**
     * Render items in the items list (used by displayCollectionWithItems)
     */
    renderItemsList(items) {
        const itemsList = document.getElementById('items-list');
        if (!itemsList) return;
        
        itemsList.innerHTML = '';
        
        items.forEach(item => {
            const itemElement = this.createItemElement(item);
            itemsList.appendChild(itemElement);
        });
        
        // Setup lazy loading for images
        this.setupLazyLoading(itemsList);
    }
    
    renderItemsProgressively(items) {
        const itemsList = document.getElementById('items-list');
        const batchSize = 20;
        let currentIndex = 0;
        
        const renderBatch = () => {
            const batch = items.slice(currentIndex, currentIndex + batchSize);
            
            batch.forEach(item => {
                const itemElement = this.createItemElement(item);
                itemsList.appendChild(itemElement);
            });
            
            currentIndex += batchSize;
            
            if (currentIndex < items.length) {
                // Show loading indicator for next batch
                const loadingMore = document.createElement('div');
                loadingMore.className = 'loading-more';
                loadingMore.innerHTML = `
                    <div class="loading-spinner-small"></div>
                    <span>Loading more items... (${currentIndex}/${items.length})</span>
                `;
                itemsList.appendChild(loadingMore);
                
                // Load next batch after a short delay
                setTimeout(() => {
                    loadingMore.remove();
                    renderBatch();
                }, 100);
            } else {
                // All items loaded, show completion message
                const completion = document.createElement('div');
                completion.className = 'items-loaded-complete';
                completion.innerHTML = `
                    <i class="material-icons">check_circle</i>
                    <span>All ${items.length} items loaded</span>
                `;
                itemsList.appendChild(completion);
                
                // Remove completion message after 2 seconds
                setTimeout(() => completion.remove(), 2000);
            }
        };
        
        renderBatch();
    }
    
    renderItems(items) {
        const itemsList = document.getElementById('items-list');
        itemsList.innerHTML = '';
        
        // Add search and filter controls if not present
        this.addSearchAndFilter();
        
        // Batch render items for better performance
        const batchSize = 20;
        let currentIndex = 0;
        
        const renderBatch = () => {
            const fragment = document.createDocumentFragment();
            const endIndex = Math.min(currentIndex + batchSize, items.length);
            
            for (let i = currentIndex; i < endIndex; i++) {
                const itemElement = this.createItemElement(items[i]);
                fragment.appendChild(itemElement);
            }
            
            itemsList.appendChild(fragment);
            currentIndex = endIndex;
            
            if (currentIndex < items.length) {
                // Continue rendering remaining items in next frame
                requestAnimationFrame(renderBatch);
            } else {
                // Add intersection observer for lazy loading optimization
                this.setupLazyLoading(itemsList);
            }
        };
        
        renderBatch();
    }
    
    setupLazyLoading(container) {
        if (!('IntersectionObserver' in window)) return;
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });
        
        // Observe all images with data-src
        container.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
    
    // Enhanced search and filter functionality
    addSearchAndFilter() {
        const itemsSection = document.getElementById('items-section');
        if (!itemsSection || itemsSection.querySelector('.catalog-search-filter')) return;
        
        const searchFilterHTML = `
            <div class="catalog-search-filter">
                <div class="search-input-container">
                    <i class="material-icons">search</i>
                    <input type="text" id="catalog-search" placeholder="Search items..." autocomplete="off">
                    <button id="clear-search" class="btn-icon" title="Clear search">
                        <i class="material-icons">clear</i>
                    </button>
                </div>
                <div class="filter-controls">
                    <select id="cloud-cover-filter">
                        <option value="">All cloud cover</option>
                        <option value="0-10">0-10%</option>
                        <option value="10-25">10-25%</option>
                        <option value="25-50">25-50%</option>
                        <option value="50-100">50-100%</option>
                    </select>
                    <select id="date-range-filter">
                        <option value="">All dates</option>
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 3 months</option>
                        <option value="1y">Last year</option>
                    </select>
                </div>
            </div>
        `;
        
        // Insert after the h3 or h4 title
        const titleElement = itemsSection.querySelector('h3') || itemsSection.querySelector('h4');
        if (titleElement) {
            titleElement.insertAdjacentHTML('afterend', searchFilterHTML);
        } else {
            // If no title found, insert at the beginning of items section
            itemsSection.insertAdjacentHTML('afterbegin', searchFilterHTML);
        }
        
        this.setupSearchAndFilterHandlers();
    }
    
    setupSearchAndFilterHandlers() {
        const searchInput = document.getElementById('catalog-search');
        const clearBtn = document.getElementById('clear-search');
        const cloudFilter = document.getElementById('cloud-cover-filter');
        const dateFilter = document.getElementById('date-range-filter');
        
        let searchTimeout;
        
        // Search functionality with debouncing
        searchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterItems(e.target.value, cloudFilter?.value, dateFilter?.value);
            }, 300);
        });
        
        // Clear search
        clearBtn?.addEventListener('click', () => {
            searchInput.value = '';
            this.filterItems('', cloudFilter?.value, dateFilter?.value);
        });
        
        // Filter controls
        cloudFilter?.addEventListener('change', (e) => {
            this.filterItems(searchInput?.value, e.target.value, dateFilter?.value);
        });
        
        dateFilter?.addEventListener('change', (e) => {
            this.filterItems(searchInput?.value, cloudFilter?.value, e.target.value);
        });
    }
    
    filterItems(searchTerm = '', cloudCover = '', dateRange = '') {
        if (!this.currentItems) return;
        
        let filteredItems = [...this.currentItems];
        
        // Text search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredItems = filteredItems.filter(item => 
                (item.properties?.title || item.id).toLowerCase().includes(term) ||
                (item.properties?.description || '').toLowerCase().includes(term) ||
                item.id.toLowerCase().includes(term)
            );
        }
        
        // Cloud cover filter
        if (cloudCover) {
            const [min, max] = cloudCover.split('-').map(Number);
            filteredItems = filteredItems.filter(item => {
                const cc = item.properties?.['eo:cloud_cover'];
                return cc !== undefined && cc >= min && cc <= max;
            });
        }
        
        // Date range filter
        if (dateRange) {
            const now = new Date();
            const cutoff = new Date();
            
            switch(dateRange) {
                case '7d': cutoff.setDate(now.getDate() - 7); break;
                case '30d': cutoff.setDate(now.getDate() - 30); break;
                case '90d': cutoff.setDate(now.getDate() - 90); break;
                case '1y': cutoff.setFullYear(now.getFullYear() - 1); break;
            }
            
            filteredItems = filteredItems.filter(item => {
                const itemDate = new Date(item.properties?.datetime);
                return itemDate >= cutoff;
            });
        }
        
        // Update display
        this.renderItemsFiltered(filteredItems);
        
        // Update count display
        const countDisplay = document.getElementById('items-count-display');
        if (countDisplay) {
            const total = this.currentItems.length;
            const filtered = filteredItems.length;
            countDisplay.innerHTML = `
                <span class="items-count-number">${filtered}</span> of ${total} items
                ${filtered !== total ? '<span class="filtered-indicator">(filtered)</span>' : ''}
            `;
        }
    }
    
    renderItemsFiltered(items) {
        const itemsList = document.getElementById('items-list');
        
        // Clear existing items but preserve search/filter controls
        const searchFilter = itemsList.parentElement.querySelector('.catalog-search-filter');
        itemsList.innerHTML = '';
        
        items.forEach(item => {
            const itemElement = this.createItemElement(item);
            itemsList.appendChild(itemElement);
        });
        
        this.setupLazyLoading(itemsList);
    }
    
    createItemElement(item) {
        const element = document.createElement('li');
        element.className = 'dataset-item';
        element.setAttribute('tabindex', '0');
        element.setAttribute('role', 'button');
        element.setAttribute('aria-label', `STAC Item: ${item.properties?.title || item.id}`);
        
        const title = item.properties?.title || item.id;
        const datetime = item.properties?.datetime ? 
            new Date(item.properties.datetime).toLocaleDateString() : 'No date';
        
        const thumbnailUrl = this.getThumbnailUrl(item);
        const hasThumbnail = !!thumbnailUrl;
        const cloudCover = item.properties?.['eo:cloud_cover'];
        
        // Format date and cloud cover (same as ResultsPanel)
        const itemDate = datetime;
        const cloudIcon = cloudCover !== undefined ? 
            ` <span class="cloud-info" title="Cloud cover: ${Math.round(cloudCover)}%">
                <i class="material-icons">cloud</i>${Math.round(cloudCover)}%
             </span>` : '';
        
        // Use the same card structure as ResultsPanel with additional ID info
        if (hasThumbnail && thumbnailUrl) {
            element.innerHTML = `
                <div class="dataset-content clickable-card" title="Click to view on map">
                    <div class="thumbnail-container">
                        <div class="dataset-metadata">
                            <div class="dataset-date"><i class="material-icons">event</i>${itemDate}${cloudIcon}</div>
                        </div>
                        <img data-src="${thumbnailUrl}" alt="Dataset thumbnail" class="dataset-thumbnail lazy-loading">
                        <div class="thumbnail-overlay">
                            <button class="info-btn details-btn" title="View item page">
                                <i class="material-icons">open_in_new</i>
                            </button>
                            <button class="info-btn viz-btn" title="High Resolution Preview">
                                <i class="material-icons">visibility</i>
                            </button>
                        </div>
                    </div>
                    <div class="dataset-info-bottom">
                        <div class="dataset-title" title="${title}">${title}</div>
                    </div>
                </div>
            `;
        } else {
            // No thumbnail available - show minimal info as clickable card
            element.innerHTML = `
                <div class="dataset-content clickable-card no-thumbnail" title="Click to view on map">
                    <div class="dataset-info">
                        <div class="dataset-metadata">
                            <div class="dataset-date"><i class="material-icons">event</i>${itemDate}${cloudIcon}</div>
                        </div>
                        <div class="thumbnail-overlay">
                            <button class="info-btn details-btn" title="View item page">
                                <i class="material-icons">open_in_new</i>
                            </button>
                            <button class="info-btn viz-btn" title="High Resolution Preview">
                                <i class="material-icons">visibility</i>
                            </button>
                        </div>
                        <div class="dataset-title" title="${title}">${title}</div>
                    </div>
                </div>
            `;
        }
        
        // Handle thumbnail error (similar to ResultsPanel)
        const thumbnailImg = element.querySelector('.dataset-thumbnail');
        if (thumbnailImg) {
            thumbnailImg.onerror = () => {
                
                // Replace the entire card content with no-thumbnail layout (same as ResultsPanel)
                const clickableCard = element.querySelector('.clickable-card');
                if (clickableCard) {
                    clickableCard.innerHTML = `
                        <div class="dataset-info">
                            <div class="dataset-metadata">
                                <div class="dataset-date"><i class="material-icons">event</i>${itemDate}${cloudIcon}</div>
                            </div>
                            <div class="thumbnail-overlay">
                                <button class="info-btn details-btn" title="View item page">
                                    <i class="material-icons">open_in_new</i>
                                </button>
                                <button class="info-btn viz-btn" title="High Resolution Preview">
                                    <i class="material-icons">visibility</i>
                                </button>
                            </div>
                            <div class="dataset-title" title="${title}">${title}</div>
                        </div>
                    `;
                    
                    // Add the no-thumbnail class
                    clickableCard.classList.add('no-thumbnail');
                    
                    // Re-attach event listeners to the new buttons
                    this.attachItemEventListeners(element, item);
                }
            };
        }

        // Attach event listeners using the new card structure
        this.attachItemEventListeners(element, item);
        
        // Keyboard navigation
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.viewItem(item);
            }
        });
        
        // Enhanced hover effects for thumbnail
        const thumbnail_el = element.querySelector('.thumbnail-container');
        if (thumbnail_el) {
            thumbnail_el.addEventListener('mouseenter', () => {
                const img = thumbnail_el.querySelector('img');
                if (img && !img.complete) {
                    thumbnail_el.classList.add('loading');
                }
            });
        }
        
        return element;
    }
    
    /**
     * Attach event listeners to item cards (same as ResultsPanel)
     */
    attachItemEventListeners(element, item) {
        const clickableCard = element.querySelector('.clickable-card');
        const detailsBtn = element.querySelector('.details-btn');
        const vizBtn = element.querySelector('.viz-btn');
        
        // Main card click - view item page
        if (clickableCard) {
            clickableCard.addEventListener('click', (e) => {
                // Don't trigger if clicking on buttons
                if (e.target.closest('.info-btn')) {
                    return;
                }
                
                this.viewItem(item);
            });
        }
        
        // Details button
        if (detailsBtn) {
            detailsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewItem(item);
            });
        }
        
        // Visualization button - same as details for now
        if (vizBtn) {
            vizBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.onItemSelect) {
                    this.onItemSelect(item);
                    
                    // Visual feedback
                    const originalIcon = vizBtn.innerHTML;
                    vizBtn.innerHTML = '<i class="material-icons">check</i>';
                    vizBtn.style.background = 'var(--success-color)';
                    setTimeout(() => {
                        vizBtn.innerHTML = originalIcon;
                        vizBtn.style.background = '';
                    }, 1500);
                }
            });
        }
    }
    
    getThumbnailUrl(item) {
        // Helper function to check if URL is usable (same as ResultsPanel)
        const isUsableUrl = (url) => {
            if (!url) return false;
            // Skip S3 URLs as they often have CORS issues in browser
            if (url.includes('s3.amazonaws.com') || url.includes('.s3.')) return false;
            return true;
        };

        let thumbnailUrl = null;
        let hasThumbnail = false;

        // PRIORITY 1: Check for thumbnail sources with rendered_preview prioritized (same as ResultsPanel)
        
        // PRIORITY 1a: Check links.thumbnail first (highest priority)
        if (item.links) {
            const thumbnailLink = item.links.find(link => link.rel === 'thumbnail');
            if (thumbnailLink && isUsableUrl(thumbnailLink.href)) {
                thumbnailUrl = thumbnailLink.href;
                hasThumbnail = true;
            }
        }

        // PRIORITY 1b: Check assets.rendered_preview (prioritized over links.preview)
        if (!hasThumbnail && item.assets && item.assets.rendered_preview && isUsableUrl(item.assets.rendered_preview.href)) {
            thumbnailUrl = item.assets.rendered_preview.href;
            hasThumbnail = true;
        }

        // PRIORITY 1c: Check links.preview (after rendered_preview)
        if (!hasThumbnail && item.links) {
            const previewLink = item.links.find(link => link.rel === 'preview');
            if (previewLink && isUsableUrl(previewLink.href)) {
                thumbnailUrl = previewLink.href;
                hasThumbnail = true;
            }
        }

        // PRIORITY 2: Check remaining assets only if no thumbnail found yet
        if (!hasThumbnail && item.assets) {
            if (item.assets.thumbnail && isUsableUrl(item.assets.thumbnail.href)) {
                thumbnailUrl = item.assets.thumbnail.href;
                hasThumbnail = true;
            } else if (item.assets.preview && isUsableUrl(item.assets.preview.href)) {
                thumbnailUrl = item.assets.preview.href;
                hasThumbnail = true;
            } else if (item.assets.overview && isUsableUrl(item.assets.overview.href)) {
                thumbnailUrl = item.assets.overview.href;
                hasThumbnail = true;
            } else if (item.assets.visual && isUsableUrl(item.assets.visual.href)) {
                thumbnailUrl = item.assets.visual.href;
                hasThumbnail = true;
            } else if (item.assets.true_color && isUsableUrl(item.assets.true_color.href)) {
                thumbnailUrl = item.assets.true_color.href;
                hasThumbnail = true;
            }
        }

        return thumbnailUrl;
    }
    
    viewItem(item) {
        // Navigate to the item page instead of updating breadcrumb
        
        const catalogId = this.getCurrentCatalogId();
        const collectionId = this.getCurrentCollectionId();
        
        
        if (catalogId && collectionId) {
            const viewerUrl = this.createAppPath(`/viewer/${catalogId}/${collectionId}/${item.id}`);
            window.location.href = viewerUrl;
        } else {
            console.warn('❌ Cannot navigate to item page - missing catalog or collection ID');
            console.warn('  catalogId:', catalogId);
            console.warn('  collectionId:', collectionId);
            console.warn('  currentPath:', this.currentPath);
            
            // Fallback to current behavior
            if (this.onItemSelect) {
                this.onItemSelect(item);
            }
        }
    }
    
    sortItems(sortBy) {
        if (!this.currentItems) return;
        
        const sorted = [...this.currentItems].sort((a, b) => {
            let aVal, bVal;
            
            switch (sortBy) {
                case 'datetime':
                    aVal = new Date(a.properties?.datetime || 0);
                    bVal = new Date(b.properties?.datetime || 0);
                    return bVal - aVal;
                    
                case 'id':
                    aVal = a.id;
                    bVal = b.id;
                    return aVal.localeCompare(bVal);
                    
                case 'properties.title':
                    aVal = a.properties?.title || a.id;
                    bVal = b.properties?.title || b.id;
                    return aVal.localeCompare(bVal);
                    
                default:
                    return 0;
            }
        });
        
        this.renderItems(sorted);
    }
    
    updateBreadcrumb() {
        const container = document.getElementById('breadcrumb-container');
        container.innerHTML = '';
        
        
        // No home breadcrumb - Browser icon handles root navigation
        
        // Build breadcrumb based on current path
        this.currentPath.forEach((pathItem, index) => {
            // Add separator before each item except the first
            if (index > 0) {
                const separator = document.createElement('span');
                separator.className = 'breadcrumb-separator';
                separator.textContent = '>';
                container.appendChild(separator);
            }
            
            const crumb = document.createElement('button');
            crumb.className = 'breadcrumb-item';
            
            // Format breadcrumb text based on type
            let breadcrumbText = '';
            let icon = '';
            
            switch (pathItem.type) {
                case 'catalog':
                    icon = '<i class="material-icons">cloud</i>';
                    breadcrumbText = pathItem.data.name || pathItem.data.title || pathItem.data.id;
                    break;
                case 'collection':
                    icon = '<i class="material-icons">layers</i>';
                    breadcrumbText = pathItem.data.title || pathItem.data.id;
                    break;
                case 'item':
                    icon = '<i class="material-icons">image</i>';
                    breadcrumbText = pathItem.data.properties?.title || pathItem.data.id;
                    break;
                default:
                    breadcrumbText = pathItem.data.title || pathItem.data.id;
            }
            
            crumb.innerHTML = `${icon} ${breadcrumbText}`;
            crumb.addEventListener('click', () => {
                this.navigateToPath(index);
            });
            container.appendChild(crumb);
        });
    }
    
    navigateToRoot() {
        
        // Always go back to catalog selection when clicking "Catalogs"
        this.currentPath = [];
        this.showCatalogSelection();
        this.updateBreadcrumb();
        this.notifyStateChange();
    }
    
    navigateToPath(index) {
        this.currentPath = this.currentPath.slice(0, index + 1);
        this.loadCurrentLevel();
        this.updateBreadcrumb();
        this.notifyStateChange();
    }
    
    loadCurrentLevel() {
        if (this.currentPath.length === 0) {
            // Back to catalog selection
            this.loadRootCatalogs();
        } else {
            const lastItem = this.currentPath[this.currentPath.length - 1];
            
            switch (lastItem.type) {
                case 'catalog':
                    // Show collections for this catalog
                    this.loadRootCatalogs();
                    break;
                case 'collection':
                    // Show items for this collection
                    this.browseCollection(lastItem.data);
                    break;
                case 'item':
                    // Navigate back to the collection containing this item
                    const collectionPath = this.currentPath.find(p => p.type === 'collection');
                    if (collectionPath) {
                        this.browseCollection(collectionPath.data);
                    }
                    break;
                default:
                    this.loadRootCatalogs();
            }
        }
    }
    
    showLoading() {
        const loadingEl = document.getElementById('catalog-loading');
        const treeEl = document.getElementById('catalog-tree-view');
        const errorEl = document.getElementById('catalog-error');
        
        if (loadingEl) {
            loadingEl.classList.remove('hidden');
            loadingEl.style.display = 'flex';
        }
        if (treeEl) {
            treeEl.style.display = 'none';
        }
        if (errorEl) {
            errorEl.classList.add('hidden');
            errorEl.style.display = 'none';
        }
    }
    
    hideLoading() {
        const loadingEl = document.getElementById('catalog-loading');
        const treeEl = document.getElementById('catalog-tree-view');
        const errorEl = document.getElementById('catalog-error');
        
        
        if (loadingEl) {
            loadingEl.classList.add('hidden');
            loadingEl.style.display = 'none';
        }
        if (treeEl) {
            treeEl.style.display = 'flex';
        }
        if (errorEl) {
            errorEl.classList.add('hidden');
            errorEl.style.display = 'none';
        }
        
        // Force a repaint to ensure the changes take effect
        if (loadingEl) {
            loadingEl.offsetHeight; // Trigger reflow
        }
    }
    
    showError(message) {
        const errorMsgEl = document.getElementById('error-message');
        const loadingEl = document.getElementById('catalog-loading');
        const treeEl = document.getElementById('catalog-tree-view');
        const errorEl = document.getElementById('catalog-error');
        
        if (errorMsgEl) errorMsgEl.textContent = message;
        if (loadingEl) loadingEl.classList.add('hidden');
        if (treeEl) treeEl.classList.add('hidden');
        if (errorEl) errorEl.classList.remove('hidden');
    }
    
    clearStates() {
        // Force clear all loading and error states
        const loadingEl = document.getElementById('catalog-loading');
        const errorEl = document.getElementById('catalog-error');
        const treeEl = document.getElementById('catalog-tree-view');
        
        if (loadingEl) loadingEl.classList.add('hidden');
        if (errorEl) errorEl.classList.add('hidden');
        if (treeEl) treeEl.classList.remove('hidden');
    }
    
    setItemSelectHandler(handler) {
        this.onItemSelect = handler;
    }
    
    setCollectionSelectHandler(handler) {
        this.onCollectionSelect = handler;
    }
    
    // State Manager Integration
    getState() {
        return {
            isVisible: this.isVisible,
            currentPath: this.currentPath,
            selectedCatalog: this.apiClient.endpoints?.root || null
        };
    }
    
    setState(state) {
        if (state.isVisible !== undefined && state.isVisible !== this.isVisible) {
            if (state.isVisible) {
                this.show();
            } else {
                this.hide();
            }
        }
        
        if (state.currentPath) {
            this.currentPath = state.currentPath;
            this.updateBreadcrumb();
        }
    }
    
    // Notify state manager of catalog browser state changes
    notifyStateChange() {
        
        // Extract individual IDs from current path
        const catalogId = this.getCurrentCatalogId();
        const collectionId = this.getCurrentCollectionId();
        const itemId = this.getCurrentItemId();
        const state = this.getState();
        
        const stateChangeDetail = {
            viewMode: state.isVisible ? 'browser' : 'map',
            catalogId: catalogId,
            collectionId: collectionId,
            itemId: itemId
        };
        
        
        // Emit event for PathRouter
        document.dispatchEvent(new CustomEvent('catalogBrowserStateChanged', {
            detail: stateChangeDetail
        }));
        
        // Notify unified state manager (existing behavior)
        if (window.stacExplorer?.unifiedStateManager) {
            const stateManager = window.stacExplorer.unifiedStateManager;
            
            // Don't update URL during restoration process
            if (stateManager.isRestoringFromUrl || stateManager.isUpdatingFromURL || stateManager.isApplyingState) {
                return;
            }
            
            // Don't update URL if UnifiedRouter is handling URLs (it uses clean paths)
            if (window.stacExplorer?.unifiedRouter) {
                // Only notify the state manager for non-URL state updates
                // The UnifiedRouter handles URL updates via the 'catalogBrowserStateChanged' event
                return;
            }
            
            stateManager.updateURLFromState(stateChangeDetail);
        }
    }
    
    // Get current catalog ID from current path or API client
    getCurrentCatalogId() {
        // First try to get from current path (most reliable) 
        const catalogInPath = this.currentPath.find(p => p.type === 'catalog');
        if (catalogInPath && catalogInPath.data.id) {
            return catalogInPath.data.id;
        }
        
        // If no catalog in path, we don't have enough info for a reliable ID
        // Return null rather than making async calls that could be unreliable
        return null;
    }
    
    // Get current catalog name
    getCurrentCatalogName() {
        // First try to get from current path (most reliable)
        const catalogInPath = this.currentPath.find(p => p.type === 'catalog');
        if (catalogInPath && catalogInPath.data.name) {
            return catalogInPath.data.name;
        }
        
        // If no catalog in path, return null rather than attempting unreliable async calls
        const catalogId = this.getCurrentCatalogId();
        return catalogId || 'Unknown Catalog';
    }
    
    // Get current collection ID from path
    getCurrentCollectionId() {
        const collectionPath = this.currentPath.find(p => p.type === 'collection');
        return collectionPath?.data?.id || null;
    }
    
    // Get current item ID from path
    getCurrentItemId() {
        const itemPath = this.currentPath.find(p => p.type === 'item');
        return itemPath?.data?.id || null;
    }
    
    async showCatalogSelection() {
        // Show loading while fetching catalog data
        this.showLoading();
        
        try {
            // Hide sidebar cards for catalog selection
            document.getElementById('search-card').style.display = 'none';
            document.getElementById('collections-card').style.display = 'none';
            document.getElementById('items-card').style.display = 'none';
            
            const catalogTree = document.getElementById('catalog-tree-view');
            
            // Get available catalogs with real STAC IDs
            const availableCatalogs = await this.getAvailableCatalogs();
            
            
            const catalogsHTML = availableCatalogs.map((catalog, index) => {
                return this.createCatalogSelectionItem(catalog);
            }).join('');
            
            
            catalogTree.innerHTML = `
                <!-- Catalogs grid -->
                <div class="catalog-grid" id="catalog-grid">
                    ${catalogsHTML}
                </div>
            `;
            
            // Add event listeners for catalog selection
            availableCatalogs.forEach(catalog => {
                const cardElement = document.getElementById(`catalog-${catalog.id}`);
                if (cardElement) {
                    // Add click handler for the entire card
                    cardElement.addEventListener('click', (e) => {
                        // Prevent card selection if clicking on the URL link
                        if (!e.target.closest('.catalog-url')) {
                            this.selectCatalog(catalog);
                        }
                    });
                    
                    // Add keyboard support
                    cardElement.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            this.selectCatalog(catalog);
                        }
                    });
                }
            });
            
            this.hideLoading();
            
            
            // Load live metadata for each catalog
            this.loadCatalogMetadata(availableCatalogs);
            
        } catch (error) {
            console.error('❌ Failed to load catalog selection:', error);
            this.showError('Failed to load available catalogs: ' + error.message);
        }
    }
    
    async getAvailableCatalogs() {
        const catalogs = [];
        
        
        // First, load custom catalogs from localStorage
        try {
            const customCatalogData = localStorage.getItem('stacExplorer-customCatalog');
            if (customCatalogData) {
                const customCatalog = JSON.parse(customCatalogData);
                
                // Create endpoint structure for custom catalog
                const customEndpoint = {
                    root: customCatalog.url,
                    collections: customCatalog.url.endsWith('/') ? customCatalog.url + 'collections' : customCatalog.url + '/collections',
                    search: customCatalog.url.endsWith('/') ? customCatalog.url + 'search' : customCatalog.url + '/search',
                    type: customCatalog.type || 'api'
                };
                
                const catalogItem = {
                    id: customCatalog.id,
                    name: customCatalog.name,
                    description: customCatalog.description,
                    endpoint: customEndpoint,
                    url: customCatalog.url,
                    configKey: 'custom-catalog',
                    isCustom: true
                };
                
                catalogs.push(catalogItem);
            }
        } catch (error) {
            console.warn('⚠️ Failed to load custom catalog from localStorage:', error);
        }
        
        // Load STAC endpoints from config (async method)
        let stacEndpoints = null;
        try {
            if (this.config?.getStacEndpoints) {
                stacEndpoints = await this.config.getStacEndpoints();
            }
        } catch (error) {
            console.warn('⚠️ Failed to load STAC endpoints from config:', error);
        }
        
        if (stacEndpoints) {
            const entries = Object.entries(stacEndpoints);
            
            // Process all catalogs with Promise.all for parallel fetching
            const catalogPromises = entries.map(async ([key, endpoint], index) => {
                
                if (endpoint.collections || endpoint.root) {
                    try {
                        // Fetch real catalog metadata from STAC API
                        const response = await fetch(endpoint.root);
                        const stacRoot = await response.json();
                        
                        const catalog = {
                            id: stacRoot.id || key, // Use real STAC ID
                            name: stacRoot.title || stacRoot.description || this.getCatalogDisplayName(key), // Use real STAC title
                            description: stacRoot.description || this.getCatalogDescription(key),
                            endpoint: endpoint,
                            url: endpoint.root,
                            configKey: key // Keep reference to original config key for debugging
                        };
                        
                        return catalog;
                        
                    } catch (error) {
                        console.warn(`⚠️ Failed to fetch STAC metadata for ${key}, using fallback:`, error);
                        
                        // Fallback to config-based catalog
                        const catalog = {
                            id: key,
                            name: this.getCatalogDisplayName(key),
                            description: this.getCatalogDescription(key),
                            endpoint: endpoint,
                            url: endpoint.root,
                            configKey: key
                        };
                        
                        return catalog;
                    }
                } else {
                    return null;
                }
            });
            
            // Wait for all catalogs to be processed
            const results = await Promise.all(catalogPromises);
            catalogs.push(...results.filter(catalog => catalog !== null));
            
        } else {
            console.warn('[BROWSER] Warning: No STAC endpoints found in config!');
        }
        
        if (catalogs.length === 0) {
            console.warn('[BROWSER] Warning: No catalogs returned! This will cause empty display.');
        }
        return catalogs;
    }
    
    getCatalogDisplayName(key) {
        const names = {
            copernicus: 'Copernicus Dataspace',
            element84: 'Earth Search (AWS)',
            planetary: 'Microsoft Planetary Computer',
            planetlabs: 'Planet Labs'
        };
        return names[key] || key.charAt(0).toUpperCase() + key.slice(1);
    }
    
    getCatalogDescription(key) {
        const descriptions = {
            copernicus: 'Sentinel satellite data from ESA',
            element84: 'Landsat & Sentinel data on AWS',
            planetary: 'Petabyte-scale geospatial data',
            planetlabs: 'High-resolution Planet satellite imagery'
        };
        return descriptions[key] || 'STAC catalog';
    }
    
    createCatalogSelectionItem(catalog) {
        
        // Get catalog-specific icon
        const icon = this.getCatalogIcon(catalog.id);
        const statusBadge = this.getCatalogStatusBadge(catalog);
        
        // Create enhanced card layout with dynamic metadata
        const html = `
            <div id="catalog-${catalog.id}" class="catalog-card" role="button" tabindex="0" 
                 aria-label="Connect to ${catalog.name}" data-catalog-id="${catalog.id}">
                ${statusBadge}
                
                <div class="catalog-card-content">
                    <h3 class="catalog-title">${catalog.name}</h3>
                    <p class="catalog-description">${catalog.description}</p>
                    
                    <div class="catalog-metadata">
                        <div class="catalog-meta-row">
                            <div class="catalog-meta-item">
                                <span class="catalog-collections" id="collections-count-${catalog.id}">
                                    <span class="loading-dots">Loading...</span>
                                </span>
                            </div>
                            <div class="catalog-meta-item">
                                <span class="catalog-id">${catalog.id}</span>
                            </div>
                        </div>
                        <div class="catalog-meta-item catalog-url-item">
                            <a href="${catalog.url}" target="_blank" rel="noopener noreferrer" class="catalog-url" 
                               title="Open ${catalog.url} in new tab">
                                ${this.formatUrlForDisplay(catalog.url)}
                            </a>
                        </div>
                    </div>
                </div>
                
            </div>
        `;
        
        return html;
    }
    
    getCatalogIcon(catalogId) {
        const icons = {
            'cdse-stac': 'satellite',
            'copernicus': 'satellite', 
            'earth-search-aws': 'public',
            'element84': 'public',
            'microsoft-pc': 'computer',
            'planetary': 'computer',
            'planetlabs': 'camera_alt',
            'planet': 'camera_alt'
        };
        return icons[catalogId] || 'cloud_queue';
    }
    
    getCatalogStatusBadge(catalog) {
        const badges = {
            'cdse-stac': '<div class="catalog-badge european"><span>European Space Agency</span></div>',
            'copernicus': '<div class="catalog-badge european"><span>European Space Agency</span></div>',
            'earth-search-aws': '<div class="catalog-badge commercial"><span>AWS Open Data</span></div>',
            'element84': '<div class="catalog-badge commercial"><span>AWS Open Data</span></div>',
            'microsoft-pc': '<div class="catalog-badge microsoft"><span>Microsoft</span></div>',
            'planetary': '<div class="catalog-badge microsoft"><span>Microsoft</span></div>',
            'planetlabs': '<div class="catalog-badge planet"><span>Planet Labs</span></div>',
            'planet': '<div class="catalog-badge planet"><span>Planet Labs</span></div>'
        };
        return badges[catalog.id] || '<div class="catalog-badge generic"><span>STAC API</span></div>';
    }
    
    /**
     * Load live metadata for all catalogs (collections count, status)
     */
    async loadCatalogMetadata(catalogs) {
        
        // Load metadata for each catalog in parallel
        const metadataPromises = catalogs.map(catalog => this.loadSingleCatalogMetadata(catalog));
        await Promise.allSettled(metadataPromises);
    }
    
    /**
     * Load metadata for a single catalog
     */
    async loadSingleCatalogMetadata(catalog) {
        try {
            
            // Set up temporary API client for this catalog
            const tempApiClient = {
                setEndpoints: (endpoints) => {
                    tempApiClient.endpoints = endpoints;
                },
                async getCollections() {
                    const response = await fetch(tempApiClient.endpoints.collections || tempApiClient.endpoints.root + '/collections');
                    const data = await response.json();
                    return data.collections || [];
                }
            };
            
            tempApiClient.setEndpoints(catalog.endpoint);
            
            // Fetch collections count
            const collections = await tempApiClient.getCollections();
            
            // Update collections count
            const collectionsEl = document.getElementById(`collections-count-${catalog.id}`);
            if (collectionsEl) {
                collectionsEl.innerHTML = `${collections.length} collections`;
                collectionsEl.classList.add('loaded');
            }
            
            
        } catch (error) {
            console.warn('[BROWSER] Failed to load metadata for', catalog.name, ':', error.message);
            
            // Update with error state
            const collectionsEl = document.getElementById(`collections-count-${catalog.id}`);
            if (collectionsEl) {
                collectionsEl.innerHTML = '<span class="error">Unable to load</span>';
                collectionsEl.classList.add('error');
            }
        }
    }
    
    /**
     * Format URL for display (truncate if too long)
     */
    formatUrlForDisplay(url) {
        if (url.length > 40) {
            const parts = url.split('/');
            return parts[0] + '//' + parts[2] + '/.../' + parts[parts.length - 1];
        }
        return url;
    }
    
    /**
     * Setup search functionality for catalog selection
     */
    setupCatalogSearch() {
        const searchInput = document.getElementById('catalog-search');
        const clearBtn = document.getElementById('clear-catalog-search');
        
        if (!searchInput) return;
        
        let searchTimeout;
        
        // Search functionality with debouncing
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterCatalogs(searchTerm);
                
                // Show/hide clear button
                if (searchTerm) {
                    clearBtn.style.display = 'block';
                } else {
                    clearBtn.style.display = 'none';
                }
            }, 300);
        });
        
        // Clear search
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearBtn.style.display = 'none';
                this.filterCatalogs('');
                searchInput.focus();
            });
        }
        
        // Keyboard navigation
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                clearBtn.style.display = 'none';
                this.filterCatalogs('');
                searchInput.blur();
            }
        });
    }
    
    /**
     * Filter catalog cards based on search term
     */
    filterCatalogs(searchTerm) {
        const catalogCards = document.querySelectorAll('.catalog-card');
        let visibleCount = 0;
        
        catalogCards.forEach(card => {
            const title = card.querySelector('.catalog-title')?.textContent?.toLowerCase() || '';
            const description = card.querySelector('.catalog-description')?.textContent?.toLowerCase() || '';
            const id = card.querySelector('.catalog-id')?.textContent?.toLowerCase() || '';
            const url = card.querySelector('.catalog-url')?.textContent?.toLowerCase() || '';
            
            const searchText = `${title} ${description} ${id} ${url}`;
            const isMatch = !searchTerm || searchText.includes(searchTerm);
            
            if (isMatch) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        // Update count display
        const countDisplay = document.getElementById('catalog-count');
        if (countDisplay) {
            countDisplay.textContent = visibleCount;
        }
        
        // Show/hide empty state
        const emptyState = document.getElementById('catalog-empty-state');
        const catalogGrid = document.getElementById('catalog-grid');
        
        if (visibleCount === 0 && searchTerm) {
            emptyState.style.display = 'block';
            catalogGrid.style.display = 'none';
            emptyState.querySelector('h4').textContent = 'No catalogs match your search';
            emptyState.querySelector('p').textContent = `Try a different search term or clear the search to see all catalogs.`;
        } else {
            emptyState.style.display = 'none';
            catalogGrid.style.display = 'grid';
        }
    }
    
    async selectCatalog(catalog) {
        try {
            this.showLoading();
            
            
            // Set the API client endpoints
            this.apiClient.setEndpoints(catalog.endpoint);
            
            
            // Notify about the connection
            this.notificationService.showNotification(`Connected to ${catalog.name}`, 'success');
            
            // Add catalog to path for proper breadcrumb
            this.currentPath = [{
                type: 'catalog',
                data: catalog
            }];
            
            
            // Load collections from the newly connected catalog
            await this.loadRootCatalogs();
            
            this.notifyStateChange();
            
        } catch (error) {
            console.error('❌ Failed to connect to catalog:', error);
            console.error('❌ Error stack:', error.stack);
            this.showError(`Failed to connect to ${catalog.name}: ${error.message}`);
        }
    }
}