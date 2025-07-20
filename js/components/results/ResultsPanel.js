/**
 * ResultsPanel.js - Handles displaying search results with pagination
 */

export class ResultsPanel {
    /**
     * Create a new ResultsPanel
     * @param {Object} apiClient - STAC API client
     * @param {Object} mapManager - Map manager for displaying items on map
     * @param {Object} notificationService - Notification service
     */
    constructor(apiClient, mapManager, notificationService) {
        this.apiClient = apiClient;
        this.mapManager = mapManager;
        this.notificationService = notificationService;
        this.items = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.modal = null;
        this.currentAssetKey = null;
        
        // Initialize pagination controls
        this.initPagination();
        
        // Create modal element
        this.createModal();
        
        // Listen for asset displayed events
        document.addEventListener('assetDisplayed', this.handleAssetDisplayed.bind(this));
    }
    
    /**
     * Initialize pagination controls
     */
    initPagination() {
        document.querySelector('.pagination-prev').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderPage();
            }
        });
        
        document.querySelector('.pagination-next').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.renderPage();
            }
        });
    }
    
    /**
     * Create modal dialog element
     */
    createModal() {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.id = 'details-modal';
        
        // Create modal dialog with enhanced layout
        modalOverlay.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-header">
                    <div class="modal-header-content">
                        <h3 class="modal-title">
                            <i class="material-icons">dataset</i>
                            <span id="item-title">Dataset Details</span>
                        </h3>
                        <div class="item-collection-badge" id="item-collection-badge">
                            Unknown Collection
                        </div>
                    </div>
                    <button class="modal-close">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                <div class="modal-body">
                    <div id="modal-content"></div>
                </div>
                <div class="modal-footer">
                    <div class="footer-actions-left">
                        <button class="md-btn md-btn-secondary" id="copy-item-btn">
                            <i class="material-icons">content_copy</i>
                            Copy Item Info
                        </button>
                    </div>
                    <div class="footer-actions-right">
                        <button class="md-btn md-btn-secondary" id="modal-close-btn">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body
        document.body.appendChild(modalOverlay);
        
        // Add event listeners
        const closeBtn = modalOverlay.querySelector('.modal-close');
        const closeBtnFooter = modalOverlay.querySelector('#modal-close-btn');
        
        closeBtn.addEventListener('click', () => this.closeModal());
        closeBtnFooter.addEventListener('click', () => this.closeModal());
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                this.closeModal();
            }
        });
        
        // Store modal elements
        this.modal = {
            overlay: modalOverlay,
            content: modalOverlay.querySelector('#modal-content'),
            title: modalOverlay.querySelector('#item-title'),
            collectionBadge: modalOverlay.querySelector('#item-collection-badge'),
            copyItemBtn: modalOverlay.querySelector('#copy-item-btn')
        };
        
        // Setup enhanced event listeners
        this.setupEnhancedEventListeners();
    }
    
    /**
     * Setup enhanced event listeners for new modal features
     */
    setupEnhancedEventListeners() {
        // Copy item button
        this.modal.copyItemBtn.addEventListener('click', () => {
            this.copyItemInfo();
        });
    }
    
    /**
     * Show modal with item details
     * @param {Object} item - STAC item to display
     */
    showModal(item) {
        console.log('📋 showModal called with item:', item.id);
        this.currentItem = item;
        
        // Update header
        this.modal.title.textContent = item.properties?.title || item.id;
        this.modal.collectionBadge.textContent = item.collection || 'Unknown Collection';
        
        // Format the JSON for display
        const formattedJson = JSON.stringify(item, null, 2);
        
        // Create enhanced content with better organization
        const content = document.createElement('div');
        content.innerHTML = this.createEnhancedItemContent(item, formattedJson);
        
        // Update modal content
        this.modal.content.innerHTML = '';
        this.modal.content.appendChild(content);
        
        console.log('📋 Modal content created');
        
        // Action buttons are now static (just copy button)
        
        // Show modal
        this.modal.overlay.classList.add('active');
        console.log('📋 Modal should now be visible');
        
        // Add keyboard listener for Escape key
        document.addEventListener('keydown', this.handleEscapeKey);
    }
    
    /**
     * Close the modal
     */
    closeModal() {
        this.modal.overlay.classList.remove('active');
        document.removeEventListener('keydown', this.handleEscapeKey);
        
        // Reset current item
        this.currentItem = null;
    }
    
    /**
     * Create enhanced item content with better organization
     */
    createEnhancedItemContent(item, formattedJson) {
        // Extract key information sections
        const basicInfo = this.extractBasicInfo(item);
        const spatialInfo = this.extractSpatialInfo(item);
        const temporalInfo = this.extractTemporalInfo(item);
        const sensorInfo = this.extractSensorInfo(item);
        const qualityInfo = this.extractQualityInfo(item);
        const assetInfo = this.extractAssetInfo(item);
        
        return `
            <div class="item-details-enhanced">
                <!-- Overview Cards -->
                <div class="details-overview">
                    <div class="overview-card main-info">
                        <div class="overview-header">
                            <i class="material-icons">info</i>
                            <span>Overview</span>
                        </div>
                        <div class="overview-content">
                            ${basicInfo}
                        </div>
                    </div>
                    <div class="overview-card spatial-info">
                        <div class="overview-header">
                            <i class="material-icons">place</i>
                            <span>Location</span>
                        </div>
                        <div class="overview-content">
                            ${spatialInfo}
                        </div>
                    </div>
                </div>
                
                <!-- Simple Sections -->
                <div class="details-sections">
                    <div class="detail-section">
                        <h3 class="section-title">
                            <i class="material-icons">schedule</i>
                            Temporal Information
                        </h3>
                        ${temporalInfo}
                    </div>
                    
                    <div class="detail-section">
                        <h3 class="section-title">
                            <i class="material-icons">camera_alt</i>
                            Sensor Information
                        </h3>
                        ${sensorInfo}
                    </div>
                    
${qualityInfo ? `
                    <div class="detail-section">
                        <h3 class="section-title">
                            <i class="material-icons">assessment</i>
                            Quality & Viewing
                        </h3>
                        ${qualityInfo}
                    </div>` : ''}
                    
                    <div class="detail-section">
                        <h3 class="section-title">
                            <i class="material-icons">storage</i>
                            Assets (${Object.keys(item.assets || {}).length})
                        </h3>
                        ${assetInfo}
                    </div>
                    
                    <div class="detail-section">
                        <h3 class="section-title">
                            <i class="material-icons">tune</i>
                            Properties
                        </h3>
                        ${this.createPropertiesTab(item.properties || {})}
                    </div>
                    
                </div>
            </div>
        `;
    }
    
    extractBasicInfo(item) {
        const props = item.properties || {};
        return `
            <div class="info-row">
                <span class="info-label">ID:</span>
                <span class="info-value">${item.id}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Collection:</span>
                <span class="info-value">${item.collection || 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Title:</span>
                <span class="info-value">${props.title || 'N/A'}</span>
            </div>
            ${props.description ? `
            <div class="info-row">
                <span class="info-label">Description:</span>
                <span class="info-value">${props.description}</span>
            </div>
            ` : ''}
        `;
    }
    
    extractSpatialInfo(item) {
        const bbox = item.bbox;
        const geometry = item.geometry;
        const props = item.properties || {};
        
        let bboxInfo = 'N/A';
        if (bbox && bbox.length >= 4) {
            const [west, south, east, north] = bbox;
            bboxInfo = `${west.toFixed(4)}, ${south.toFixed(4)}, ${east.toFixed(4)}, ${north.toFixed(4)}`;
        }
        
        return `
            <div class="info-row">
                <span class="info-label">Geometry:</span>
                <span class="info-value">${geometry?.type || 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Bounding Box:</span>
                <span class="info-value" style="font-family: monospace; font-size: 11px;">${bboxInfo}</span>
            </div>
            ${props['proj:epsg'] ? `
            <div class="info-row">
                <span class="info-label">EPSG:</span>
                <span class="info-value">${props['proj:epsg']}</span>
            </div>
            ` : ''}
        `;
    }
    
    extractTemporalInfo(item) {
        const props = item.properties || {};
        const datetime = props.datetime || props.start_datetime;
        const endTime = props.end_datetime;
        const created = props.created;
        const updated = props.updated;
        
        const hasAnyTemporalData = datetime || endTime || created || updated;
        
        if (!hasAnyTemporalData) {
            return `
                <div class="tab-section">
                    <h4>Temporal Information</h4>
                    <div class="no-data">
                        <i class="material-icons">schedule</i>
                        <p>No temporal information available for this item.</p>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="tab-section">
                <h4>Temporal Information</h4>
                <div class="info-grid">
                    ${datetime ? `
                    <div class="info-item">
                        <div class="info-label">
                            <i class="material-icons">event</i>
                            Acquisition Date & Time
                        </div>
                        <div class="info-value">${new Date(datetime).toLocaleString()}</div>
                    </div>
                    ` : ''}
                    ${endTime ? `
                    <div class="info-item">
                        <div class="info-label">
                            <i class="material-icons">event_available</i>
                            End Time
                        </div>
                        <div class="info-value">${new Date(endTime).toLocaleString()}</div>
                    </div>
                    ` : ''}
                    ${created ? `
                    <div class="info-item">
                        <div class="info-label">
                            <i class="material-icons">add_circle</i>
                            Created
                        </div>
                        <div class="info-value">${new Date(created).toLocaleString()}</div>
                    </div>
                    ` : ''}
                    ${updated ? `
                    <div class="info-item">
                        <div class="info-label">
                            <i class="material-icons">update</i>
                            Last Updated
                        </div>
                        <div class="info-value">${new Date(updated).toLocaleString()}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    extractSensorInfo(item) {
        const props = item.properties || {};
        const platform = props.platform || props['sat:platform_international_designator'];
        const instruments = props.instruments || props['sat:instruments'];
        const constellation = props.constellation;
        const mission = props.mission;
        const orbitDirection = props['sat:orbit_state'] || props['sat:relative_orbit'];
        
        const hasAnySensorData = platform || instruments || constellation || mission || orbitDirection;
        
        if (!hasAnySensorData) {
            return `
                <div class="tab-section">
                    <h4>Sensor & Platform Information</h4>
                    <div class="no-data">
                        <i class="material-icons">camera_alt</i>
                        <p>No sensor or platform information available for this item.</p>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="tab-section">
                <h4>Sensor & Platform Information</h4>
                <div class="info-grid">
                    ${platform ? `
                    <div class="info-item">
                        <div class="info-label">
                            <i class="material-icons">satellite</i>
                            Platform
                        </div>
                        <div class="info-value">${platform}</div>
                    </div>
                    ` : ''}
                    ${instruments ? `
                    <div class="info-item">
                        <div class="info-label">
                            <i class="material-icons">camera</i>
                            Instruments
                        </div>
                        <div class="info-value">${Array.isArray(instruments) ? instruments.join(', ') : instruments}</div>
                    </div>
                    ` : ''}
                    ${constellation ? `
                    <div class="info-item">
                        <div class="info-label">
                            <i class="material-icons">group_work</i>
                            Constellation
                        </div>
                        <div class="info-value">${constellation}</div>
                    </div>
                    ` : ''}
                    ${mission ? `
                    <div class="info-item">
                        <div class="info-label">
                            <i class="material-icons">rocket_launch</i>
                            Mission
                        </div>
                        <div class="info-value">${mission}</div>
                    </div>
                    ` : ''}
                    ${orbitDirection ? `
                    <div class="info-item">
                        <div class="info-label">
                            <i class="material-icons">sync</i>
                            Orbit Info
                        </div>
                        <div class="info-value">${orbitDirection}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    extractQualityInfo(item) {
        const props = item.properties || {};
        const cloudCover = props['eo:cloud_cover'];
        const sunAzimuth = props['view:sun_azimuth'];
        const sunElevation = props['view:sun_elevation'];
        const snowCover = props['eo:snow_cover'];
        const offNadir = props['view:off_nadir'];
        const azimuth = props['view:azimuth'];
        const gsd = props.gsd;
        
        const hasAnyQualityData = cloudCover !== undefined || sunAzimuth !== undefined || 
                                sunElevation !== undefined || snowCover !== undefined || 
                                offNadir !== undefined || azimuth !== undefined || gsd !== undefined;
        
        if (!hasAnyQualityData) {
            return ''; // Return empty string to skip this section entirely
        }
        
        return `
            <div class="tab-section">
                <h4>Quality & Viewing Information</h4>
                <div class="info-grid">
                    ${cloudCover !== undefined ? `
                    <div class="info-item">
                        <div class="info-label">
                            <i class="material-icons">cloud</i>
                            Cloud Cover
                        </div>
                        <div class="info-value">${cloudCover.toFixed(1)}%</div>
                    </div>
                    ` : ''}
                    ${snowCover !== undefined ? `
                    <div class="info-item">
                        <div class="info-label">
                            <i class="material-icons">ac_unit</i>
                            Snow Cover
                        </div>
                        <div class="info-value">${snowCover.toFixed(1)}%</div>
                    </div>
                    ` : ''}
                    ${sunAzimuth !== undefined ? `
                    <div class="info-item">
                        <div class="info-label">
                            <i class="material-icons">wb_sunny</i>
                            Sun Azimuth
                        </div>
                        <div class="info-value">${sunAzimuth.toFixed(1)}°</div>
                    </div>
                    ` : ''}
                    ${sunElevation !== undefined ? `
                    <div class="info-item">
                        <div class="info-label">
                            <i class="material-icons">height</i>
                            Sun Elevation
                        </div>
                        <div class="info-value">${sunElevation.toFixed(1)}°</div>
                    </div>
                    ` : ''}
                    ${offNadir !== undefined ? `
                    <div class="info-item">
                        <div class="info-label">
                            <i class="material-icons">straighten</i>
                            Off Nadir
                        </div>
                        <div class="info-value">${offNadir.toFixed(1)}°</div>
                    </div>
                    ` : ''}
                    ${azimuth !== undefined ? `
                    <div class="info-item">
                        <div class="info-label">
                            <i class="material-icons">explore</i>
                            View Azimuth
                        </div>
                        <div class="info-value">${azimuth.toFixed(1)}°</div>
                    </div>
                    ` : ''}
                    ${gsd !== undefined ? `
                    <div class="info-item">
                        <div class="info-label">
                            <i class="material-icons">grid_on</i>
                            Ground Sample Distance
                        </div>
                        <div class="info-value">${gsd.toFixed(2)}m</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    extractAssetInfo(item) {
        const assets = item.assets || {};
        
        if (Object.keys(assets).length === 0) {
            return '<div class="no-data">No assets available</div>';
        }
        
        return `
            <div class="tab-section">
                <h4>Available Assets</h4>
                <div class="assets-grid">
                    ${Object.entries(assets).map(([key, asset]) => `
                        <div class="asset-card">
                            <div class="asset-header">
                                <div class="asset-name">
                                    <i class="material-icons">${this.getAssetIcon(key, asset)}</i>
                                    ${key}
                                </div>
                                <div class="asset-type">${asset.type || 'N/A'}</div>
                            </div>
                            <div class="asset-details">
                                ${asset.title ? `<div class="asset-title">${asset.title}</div>` : ''}
                                <div class="asset-url">
                                    <a href="${asset.href}" target="_blank" title="Open asset">
                                        <i class="material-icons">open_in_new</i>
                                        View Asset
                                    </a>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    getAssetIcon(key, asset) {
        const type = asset.type || '';
        const keyLower = key.toLowerCase();
        
        if (type.startsWith('image/')) return 'image';
        if (keyLower.includes('thumbnail')) return 'photo';
        if (keyLower.includes('metadata')) return 'description';
        if (type === 'application/json') return 'code';
        return 'insert_drive_file';
    }
    
    createPropertiesTab(props) {
        if (Object.keys(props).length === 0) {
            return '<div class="no-data">No properties available</div>';
        }
        
        return `
            <div class="tab-section">
                <h4>All Properties</h4>
                <div class="properties-list">
                    ${Object.entries(props).map(([key, value]) => `
                        <div class="property-row">
                            <div class="property-key">${key}</div>
                            <div class="property-value">${this.formatPropertyValue(value)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    formatPropertyValue(value) {
        if (value === null || value === undefined) {
            return '<span class="null-value">null</span>';
        }
        if (typeof value === 'boolean') {
            return `<span class="boolean-value">${value}</span>`;
        }
        if (typeof value === 'number') {
            return `<span class="number-value">${value}</span>`;
        }
        if (Array.isArray(value)) {
            // Show actual array values, joined with commas
            if (value.length <= 10) {
                return `<span class="array-value">[${value.join(', ')}]</span>`;
            } else {
                return `<span class="array-value">[${value.slice(0, 10).join(', ')}, ... +${value.length - 10} more]</span>`;
            }
        }
        if (typeof value === 'object') {
            return `<span class="object-value">{object}</span>`;
        }
        
        const stringValue = String(value);
        if (stringValue.length > 100) {
            return `<span class="long-text" title="${stringValue}">${stringValue.substring(0, 100)}...</span>`;
        }
        return stringValue;
    }
    
    /**
     * Setup tab switching functionality
     */
    setupTabSwitching(content) {
        const tabButtons = content.querySelectorAll('.tab-btn');
        const tabPanes = content.querySelectorAll('.tab-pane');
        
        console.log('🔍 Setting up tab switching');
        console.log('🔍 Found', tabButtons.length, 'tab buttons');
        console.log('🔍 Found', tabPanes.length, 'tab panes');
        
        // Log all available panes
        tabPanes.forEach((pane, index) => {
            console.log(`🔍 Pane ${index}:`, pane.id, 'content length:', pane.innerHTML.length);
        });
        
        tabButtons.forEach((button, index) => {
            console.log(`🔍 Button ${index}:`, button.dataset.tab, button.textContent.trim());
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔥 Tab clicked:', button.dataset.tab);
                const tabId = button.dataset.tab;
                
                // Update button states with visual feedback
                tabButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.style.background = '';
                });
                button.classList.add('active');
                
                // Update pane visibility with debugging
                tabPanes.forEach(pane => {
                    pane.classList.remove('active');
                    pane.style.display = 'none'; // Force hide
                });
                
                const targetPane = content.querySelector(`#${tabId}-tab`);
                if (targetPane) {
                    targetPane.classList.add('active');
                    targetPane.style.display = 'block'; // Force show
                    console.log('✅ Switched to tab:', tabId, 'pane content length:', targetPane.innerHTML.length);
                    
                    // Scroll to top of tab content
                    targetPane.scrollTop = 0;
                } else {
                    console.error('❌ Target pane not found:', `#${tabId}-tab`);
                    console.log('Available panes:', Array.from(tabPanes).map(p => p.id));
                }
            });
        });
        
        // Ensure first tab is properly active
        if (tabButtons.length > 0 && tabPanes.length > 0) {
            console.log('🔧 Ensuring first tab is active');
            tabButtons[0].click();
        }
    }
    
    /**
     * Handle Escape key press
     * @param {KeyboardEvent} event
     */
    handleEscapeKey = (event) => {
        if (event.key === 'Escape') {
            this.closeModal();
        }
    }
    
    /**
     * Set items and render first page
     * @param {Array} items - Array of STAC items
     */
    setItems(items) {
        this.items = items;
        this.currentPage = 1;
        this.totalPages = Math.ceil(items.length / this.itemsPerPage) || 1;
        
        // Update results count
        document.getElementById('results-count').textContent = items.length;
        
        // Update pagination display
        document.getElementById('current-page').textContent = this.currentPage;
        document.getElementById('total-pages').textContent = this.totalPages;
        
        // Render first page
        this.renderPage();
    }
    
    /**
     * Clear all results
     */
    clearResults() {
        this.items = [];
        this.currentPage = 1;
        this.totalPages = 1;
        
        // Update results count
        document.getElementById('results-count').textContent = '0';
        
        // Update pagination display
        document.getElementById('current-page').textContent = this.currentPage;
        document.getElementById('total-pages').textContent = this.totalPages;
        
        // Clear the dataset list
        document.getElementById('dataset-list').innerHTML = '';
        
        // Disable pagination buttons
        document.querySelector('.pagination-prev').disabled = true;
        document.querySelector('.pagination-next').disabled = true;
    }
    
    /**
     * Render current page of results
     */
    renderPage() {
        const datasetList = document.getElementById('dataset-list');
        datasetList.innerHTML = '';
        
        // Calculate start and end indices for current page
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.items.length);
        
        // Get items for current page
        const pageItems = this.items.slice(startIndex, endIndex);
        
        if (pageItems.length === 0) {
            datasetList.innerHTML = '<li class="dataset-item"><div class="dataset-content">No datasets found</div></li>';
            return;
        }
        
        // Render each item
        pageItems.forEach(item => {
            const li = this.createDatasetItem(item);
            datasetList.appendChild(li);
        });
        
        // Update pagination info
        document.getElementById('current-page').textContent = this.currentPage;
        
        // Enable/disable pagination buttons
        const prevBtn = document.querySelector('.pagination-prev');
        const nextBtn = document.querySelector('.pagination-next');
        
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === this.totalPages;
    }
    
    /**
     * Create a dataset item element
     * @param {Object} item - STAC item
     * @returns {HTMLElement} List item element
     */
    createDatasetItem(item) {
        const li = document.createElement('li');
        li.className = 'dataset-item';
        li.dataset.id = item.id;
        li.setAttribute('data-id', item.id);
        
        // Extract thumbnail URL - no placeholder fallback
        let thumbnailUrl = null;
        let hasThumbnail = false;
        
        // Check various potential thumbnail locations in the STAC item
        if (item.assets) {
            // For Planetary Computer items, check rendered_preview first
            if (item.assets.rendered_preview) {
                thumbnailUrl = item.assets.rendered_preview.href;
                hasThumbnail = true;
            } else if (item.assets.thumbnail) {
                thumbnailUrl = item.assets.thumbnail.href;
                hasThumbnail = true;
            } else if (item.assets.preview) {
                thumbnailUrl = item.assets.preview.href;
                hasThumbnail = true;
            } else if (item.assets.overview) {
                thumbnailUrl = item.assets.overview.href;
                hasThumbnail = true;
            }
        }
        
        // Generate TiTiler preview for DEM collections that don't have thumbnails
        if (!hasThumbnail && (item.collection === 'cop-dem-glo-30' || item.collection === 'cop-dem-glo-90')) {
            thumbnailUrl = this.generateDEMThumbnailUrl(item);
            hasThumbnail = !!thumbnailUrl;
        }
        
        // Get the date from the item
        let itemDate = 'Unknown date';
        if (item.properties && item.properties.datetime) {
            itemDate = new Date(item.properties.datetime).toLocaleDateString();
        } else if (item.date) {
            itemDate = item.date;
        }
        
        // Get cloud cover icon if available
        let cloudIcon = '';
        if (item.properties && item.properties['eo:cloud_cover'] !== undefined) {
            const cloudCover = Math.round(item.properties['eo:cloud_cover'],0);
                        
            if (cloudCover > 75) {
                cloudIcon = ' • ☁️ ' + cloudCover + '%'; // Very cloudy
            } else if (cloudCover > 50) {
                cloudIcon = ' • 🌥️ ' + cloudCover + '%'; // Mostly cloudy
            } else if (cloudCover > 25) {
                cloudIcon = ' • ⛅ ' + cloudCover + '%'; // Partly cloudy
            } else if (cloudCover > 5) {
                cloudIcon = ' • 🌤️ ' + cloudCover + '%'; // Mostly sunny
            } else {
                cloudIcon = ' • ☀️ ' + cloudCover + '%'; // Sunny
            }
        }
        
        // Get the collection ID
        let collectionId = 'Unknown';
        if (item.collection) {
            collectionId = item.collection;
        } else if (item.links) {
            const collectionLink = item.links.find(link => link.rel === 'collection');
            if (collectionLink) {
                collectionId = collectionLink.href.split('/').pop();
            }
        }
        
        // Get the title
        const title = item.properties && item.properties.title ? 
            item.properties.title : (item.title || item.id);
        
        // Get the description
        const description = item.properties && item.properties.description ? 
            item.properties.description : (item.description || 'No description available');
        
        // Prepare metadata fields
        const metadataFields = [];
        
        metadataFields.push({
            label: 'Collection',
            value: collectionId
        });
        
        metadataFields.push({
            label: 'Date',
            value: itemDate
        });
        
        if (cloudIcon) {
            metadataFields.push({
                label: 'Cloud Cover',
                value: cloudIcon
            });
        }
        
        // Construct html based on thumbnail availability
        if (hasThumbnail && thumbnailUrl) {
            li.innerHTML = `
                <div class="dataset-content clickable-card" title="Click to view on map">
                    <div class="thumbnail-container">
                        <div class="dataset-metadata">
                            <div class="dataset-date"><i class="material-icons">event</i>${itemDate}${cloudIcon}</div>
                        </div>
                        <img src="${thumbnailUrl}" alt="Dataset thumbnail" class="dataset-thumbnail">
                        <div class="thumbnail-overlay">
                            <button class="info-btn details-btn" title="Show details">
                                <i class="material-icons">info</i>
                            </button>
                            <button class="info-btn viz-btn" title="High Resolution Preview">
                                <i class="material-icons">visibility</i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // No thumbnail available - show minimal info as clickable card
            li.innerHTML = `
                <div class="dataset-content clickable-card no-thumbnail" title="Click to view on map">
                    <div class="dataset-info">
                        <div class="dataset-metadata">
                            <div class="dataset-date"><i class="material-icons">event</i>${itemDate}${cloudIcon}</div>
                        </div>
                        <div class="thumbnail-overlay">
                            <button class="info-btn details-btn" title="Show details">
                                <i class="material-icons">info</i>
                            </button>
                            <button class="info-btn viz-btn" title="High Resolution Preview">
                                <i class="material-icons">visibility</i>
                            </button>
                        </div>
                        <div class="dataset-title">${title}</div>
                    </div>
                </div>
            `;
        }
        
        // Add event listeners after creating the element
        this.attachItemEventListeners(li, item);
        
        return li;
    }
    
    /**
     * Attach event listeners to dataset item
     * @param {HTMLElement} element - Dataset item element
     * @param {Object} item - STAC item data
     */
    attachItemEventListeners(element, item) {
        const clickableCard = element.querySelector('.clickable-card');
        const detailsBtn = element.querySelector('.details-btn');
        const vizBtn = element.querySelector('.viz-btn');
        const thumbnail = element.querySelector('.dataset-thumbnail');
        
        // Function to handle map display with loading indicator
        const displayOnMap = () => {
            // Show loading indicator
            document.getElementById('loading').style.display = 'flex';
            
            // Display item thumbnail on map (reverted back to thumbnail display)
            setTimeout(() => {
                this.mapManager.displayItemOnMap(item, 'thumbnail')
                    .then(() => {
                        // Mark the item as active
                        document.querySelectorAll('.dataset-item').forEach(el => {
                            el.classList.remove('active');
                        });
                        element.classList.add('active');
                        
                        // Dispatch item activated event
                        document.dispatchEvent(new CustomEvent('itemActivated', {
                            detail: { 
                                itemId: item.id,
                                assetKey: 'thumbnail'
                            }
                        }));
                        
                        // Expand tools panel if collapsed
                        document.dispatchEvent(new CustomEvent('expandToolsPanel'));
                        
                        // Hide loading indicator
                        document.getElementById('loading').style.display = 'none';
                        
                        // Show success notification
                        this.notificationService.showNotification(
                            `Viewing ${item.properties?.title || item.id} on map`, 
                            'success'
                        );
                    })
                    .catch(error => {
                        this.notificationService.showNotification(
                            `Error displaying item on map: ${error.message}`, 
                            'error'
                        );
                        document.getElementById('loading').style.display = 'none';
                    });
            }, 100); // Small delay to allow loading indicator to appear
        };
        
        // Add click handler to the entire card
        if (clickableCard) {
            clickableCard.addEventListener('click', (e) => {
                // Don't trigger if clicking on the details button
                if (e.target.closest('.details-btn')) {
                    return;
                }
                
                console.log('Card clicked for item:', item.id);
                displayOnMap();
            });
            
            // Add hover effects
            clickableCard.addEventListener('mouseenter', () => {
                clickableCard.style.transform = 'translateY(-2px)';
                clickableCard.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
            });
            
            clickableCard.addEventListener('mouseleave', () => {
                clickableCard.style.transform = '';
                clickableCard.style.boxShadow = '';
            });
        }
        
        // Handle thumbnail error (if exists)
        if (thumbnail) {
            thumbnail.onerror = () => {
                // Hide the entire thumbnail container on error
                const thumbnailContainer = element.querySelector('.thumbnail-container');
                if (thumbnailContainer) {
                    thumbnailContainer.style.display = 'none';
                }
                // Card will still be clickable for geometry display
                console.log('Thumbnail failed to load for item:', item.id);
            };
        }
        
        // Add event listener to info/details button (stops propagation)
        if (detailsBtn) {
            detailsBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click
                console.log('Details button clicked for item:', item.id);
                this.showModal(item);
            });
        }

        // Add event listener to visualization button
        if (vizBtn) {
            vizBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click
                console.log('Visualization button clicked for item:', item.id);
                this.showVisualizationPanel(item);
            });
        }
    }

    /**
     * Show visualization panel for STAC item
     * @param {Object} item - STAC item to visualize
     */
    showVisualizationPanel(item) {
        try {
            // Check if visualization panel is available
            if (window.stacExplorer?.visualizationPanel) {
                window.stacExplorer.visualizationPanel.show(item);
            } else {
                console.warn('⚠️ Visualization panel not available');
                this.notificationService?.showNotification(
                    'Visualization feature not available', 
                    'warning'
                );
            }
        } catch (error) {
            console.error('❌ Error showing visualization panel:', error);
            this.notificationService?.showNotification(
                'Error opening visualization panel', 
                'error'
            );
        }
    }
    
    // Removed addFallbackGeometryButton method - no longer needed since entire card is clickable
    
    /**
     * Handle when an asset is displayed on the map
     * @param {CustomEvent} event - The asset displayed event
     */
    handleAssetDisplayed(event) {
        if (event.detail && event.detail.assetKey) {
            this.currentAssetKey = event.detail.assetKey;
        }
    }
    
    
    
    /**
     * Copy item information to clipboard
     */
    async copyItemInfo() {
        try {
            if (!this.currentItem) return;
            
            // Copy the complete raw item
            const itemText = JSON.stringify(this.currentItem, null, 2);
            await navigator.clipboard.writeText(itemText);
            
            this.notificationService.showNotification(
                'Complete item JSON copied to clipboard!', 
                'success'
            );
        } catch (error) {
            console.error('❌ Error copying item info:', error);
            this.notificationService.showNotification(
                'Failed to copy item information', 
                'error'
            );
        }
    }

    /**
     * Generate TiTiler COG preview URL for DEM items
     * @param {Object} item - STAC item for DEM data
     * @returns {string|null} TiTiler preview URL or null if not possible
     */
    generateDEMThumbnailUrl(item) {
        try {
            // Check if item has a data asset
            if (!item.assets || !item.assets.data || !item.assets.data.href) {
                console.log('🚫 [DEM-THUMB] No data asset found for DEM thumbnail');
                return null;
            }

            const assetUrl = item.assets.data.href;
            console.log(`🏔️ [DEM-THUMB] Generating thumbnail for: ${item.id}`);

            // Only generate thumbnails for Planetary Computer DEM data
            if (this.apiClient && assetUrl.includes('blob.core.windows.net')) {
                // Use PC TiTiler API for presigned PC data
                const params = new URLSearchParams();
                params.set('collection', item.collection);
                params.set('item', item.id);
                params.set('assets', 'data');
                params.set('rescale', '0,4000');
                params.set('colormap_name', 'terrain');
                params.set('width', '256');
                params.set('height', '256');

                const bbox = item.bbox || this.extractBboxFromGeometry(item.geometry);
                if (bbox) {
                    const pcUrl = `https://planetarycomputer.microsoft.com/api/data/v1/item/crop/${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}.png?${params.toString()}`;
                    console.log(`🏔️ [DEM-THUMB] Generated PC TiTiler preview: ${pcUrl}`);
                    return pcUrl;
                }
            } else {
                // For non-PC DEM data (like Element84), we can't generate thumbnails
                // because public TiTiler instances don't have access to private S3 buckets
                console.log(`🚫 [DEM-THUMB] Cannot generate thumbnail for non-PC DEM data: ${assetUrl.substring(0, 50)}...`);
                return null;
            }

            console.log('🚫 [DEM-THUMB] Could not extract bbox for thumbnail generation');
            return null;

        } catch (error) {
            console.error('❌ [DEM-THUMB] Error generating DEM thumbnail:', error);
            return null;
        }
    }

    /**
     * Extract bbox from STAC item geometry
     * @param {Object} geometry - GeoJSON geometry
     * @returns {Array|null} [west, south, east, north] bbox or null
     */
    extractBboxFromGeometry(geometry) {
        if (!geometry || !geometry.coordinates) {
            return null;
        }

        try {
            // Handle Polygon geometry (most common for STAC items)
            if (geometry.type === 'Polygon') {
                const coords = geometry.coordinates[0]; // Outer ring
                const lons = coords.map(coord => coord[0]);
                const lats = coords.map(coord => coord[1]);
                
                return [
                    Math.min(...lons), // west
                    Math.min(...lats), // south
                    Math.max(...lons), // east
                    Math.max(...lats)  // north
                ];
            }
            
            // Handle other geometry types if needed
            console.warn('🔍 [BBOX] Unsupported geometry type for bbox extraction:', geometry.type);
            return null;
            
        } catch (error) {
            console.error('❌ [BBOX] Error extracting bbox from geometry:', error);
            return null;
        }
    }
    
}