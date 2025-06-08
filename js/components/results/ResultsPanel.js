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
        
        // Create modal dialog
        modalOverlay.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Dataset Details</h3>
                    <button class="modal-close">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                <div class="modal-body">
                    <div id="modal-content"></div>
                </div>
                <div class="modal-footer">
                    <button class="md-btn md-btn-secondary" id="modal-close-btn">
                        Close
                    </button>
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
            content: modalOverlay.querySelector('#modal-content')
        };
    }
    
    /**
     * Show modal with item details
     * @param {Object} item - STAC item to display
     */
    showModal(item) {
        // Format the JSON for display
        const formattedJson = JSON.stringify(item, null, 2);
        
        // Create content
        const content = document.createElement('div');
        content.innerHTML = `
            <div class="metadata-field">
                <h4 class="mb-2">Basic Information</h4>
                <div class="info-group mb-3">
                    <div><strong>Title:</strong> ${item.properties?.title || item.id}</div>
                    <div><strong>ID:</strong> ${item.id}</div>
                    <div><strong>Collection:</strong> ${item.collection || 'N/A'}</div>
                    <div><strong>Date:</strong> ${item.properties?.datetime ? new Date(item.properties.datetime).toLocaleString() : 'N/A'}</div>
                </div>
                
                <h4 class="mb-2">Properties</h4>
                <div class="info-group mb-3">
                    ${item.properties?.['eo:cloud_cover'] !== undefined ? 
                        `<div><strong>Cloud Cover:</strong> ${item.properties['eo:cloud_cover']}%</div>` : ''}
                    ${item.properties?.['eo:gsd'] !== undefined ? 
                        `<div><strong>Ground Resolution:</strong> ${item.properties['eo:gsd']} m</div>` : ''}
                    ${item.properties?.provider ? 
                        `<div><strong>Provider:</strong> ${item.properties.provider}</div>` : ''}
                    ${item.properties?.constellation ? 
                        `<div><strong>Constellation:</strong> ${item.properties.constellation}</div>` : ''}
                </div>
                
                <h4 class="mb-2">Full JSON Data</h4>
                <pre class="json-content">${formattedJson}</pre>
            </div>
        `;
        
        // Update modal content
        this.modal.content.innerHTML = '';
        this.modal.content.appendChild(content);
        
        // Show modal
        this.modal.overlay.classList.add('active');
        
        // Add keyboard listener for Escape key
        document.addEventListener('keydown', this.handleEscapeKey);
    }
    
    /**
     * Close the modal
     */
    closeModal() {
        this.modal.overlay.classList.remove('active');
        document.removeEventListener('keydown', this.handleEscapeKey);
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
            if (item.assets.rendered_preview && item.assets.rendered_preview.href.includes('planetarycomputer')) {
                // Convert to presigned URL
                const presignedUrl = item.assets.rendered_preview.href.replace(
                    'https://planetarycomputer.microsoft.com/api/stac/v1',
                    'https://planetarycomputer.microsoft.com/api/data/v1'
                );
                thumbnailUrl = presignedUrl;
                hasThumbnail = true;
            } else if (item.assets.thumbnail) {
                // For Planetary Computer items, use the presigned URL
                if (item.assets.thumbnail.href.includes('planetarycomputer')) {
                    // Convert to presigned URL
                    const presignedUrl = item.assets.thumbnail.href.replace(
                        'https://planetarycomputer.microsoft.com/api/stac/v1',
                        'https://planetarycomputer.microsoft.com/api/data/v1'
                    );
                    thumbnailUrl = presignedUrl;
                } else {
                    thumbnailUrl = item.assets.thumbnail.href;
                }
                hasThumbnail = true;
            } else if (item.assets.preview) {
                thumbnailUrl = item.assets.preview.href;
                hasThumbnail = true;
            } else if (item.assets.overview) {
                thumbnailUrl = item.assets.overview.href;
                hasThumbnail = true;
            }
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
                <div class="dataset-content">
                    <div class="thumbnail-container">
                        <div class="dataset-metadata">
                            <div class="dataset-date"><i class="material-icons">event</i>${itemDate}${cloudIcon}</div>
                        </div>
                        <img src="${thumbnailUrl}" alt="Dataset thumbnail" class="dataset-thumbnail" onerror="this.handleThumbnailError(this)">
                        <div class="thumbnail-overlay">
                            <button class="info-btn details-btn" title="Show details">
                                <i class="material-icons">info</i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // No thumbnail available - show minimal info with thumbnail-overlay style buttons
            li.innerHTML = `
                <div class="dataset-content no-thumbnail">
                    <div class="dataset-info">
                        <div class="dataset-metadata">
                            <div class="dataset-date"><i class="material-icons">event</i>${itemDate}${cloudIcon}</div>
                        </div>
                        <div class="thumbnail-overlay">
                            <button class="info-btn view-map-btn" title="View geometry on map">
                                <i class="material-icons">map</i>
                            </button>
                            <button class="info-btn details-btn" title="Show details">
                                <i class="material-icons">info</i>
                            </button>
                        </div>
                        <div class="dataset-title" style="cursor: default; pointer-events: none;">${title}</div>
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
        // Add event listener to thumbnail (if exists)
        const thumbnail = element.querySelector('.dataset-thumbnail');
        const detailsBtn = element.querySelector('.details-btn'); // Select by specific class
        const viewMapBtn = element.querySelector('.view-map-btn');
        
        // Function to handle map display with loading indicator
        const displayOnMap = (useGeometry = false) => {
            // Show loading indicator
            document.getElementById('loading').style.display = 'flex';
            
            // Display item on map
            setTimeout(() => {
                const displayPromise = useGeometry ? 
                    this.mapManager.displayItemGeometry(item) :
                    this.mapManager.displayItemOnMap(item, 'thumbnail');
                    
                displayPromise
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
                                assetKey: useGeometry ? 'geometry' : 'thumbnail'
                            }
                        }));
                        
                        // Expand tools panel if collapsed
                        document.dispatchEvent(new CustomEvent('expandToolsPanel'));
                        
                        // Hide loading indicator
                        document.getElementById('loading').style.display = 'none';
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
        
        // Add click handler to thumbnail (if exists)
        if (thumbnail) {
            // Handle thumbnail error
            thumbnail.onerror = () => {
                // Hide the entire thumbnail container on error
                const thumbnailContainer = element.querySelector('.thumbnail-container');
                if (thumbnailContainer) {
                    thumbnailContainer.style.display = 'none';
                }
                // Add a replacement view geometry button
                this.addFallbackGeometryButton(element, item);
            };
            
            thumbnail.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                console.log('Thumbnail clicked for item:', item.id);
                displayOnMap(false);
            });
        }
        
        // Add click handler to view map button (for items without thumbnails)
        if (viewMapBtn) {
            viewMapBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                console.log('Map button clicked for item:', item.id);
                displayOnMap(true);
            });
        }
        
        // Add event listener to info/details button
        if (detailsBtn) {
            detailsBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                console.log('Details button clicked for item:', item.id);
                this.showModal(item);
            });
        }
    }
    
    /**
     * Add fallback geometry button when thumbnail fails to load
     * @param {HTMLElement} element - Dataset item element
     * @param {Object} item - STAC item data
     */
    addFallbackGeometryButton(element, item) {
        const content = element.querySelector('.dataset-content');
        if (content && !content.querySelector('.view-map-btn')) {
            const fallbackHtml = `
                <div class="fallback-geometry-view">
                    <div class="thumbnail-overlay">
                        <button class="info-btn view-map-btn" title="View geometry on map">
                            <i class="material-icons">map</i>
                        </button>
                    </div>
                </div>
            `;
            content.insertAdjacentHTML('beforeend', fallbackHtml);
            
            // Add event listener to the new button
            const newBtn = content.querySelector('.view-map-btn');
            if (newBtn) {
                newBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    console.log('Fallback map button clicked for item:', item.id);
                    // Show loading indicator
                    document.getElementById('loading').style.display = 'flex';
                    
                    // Display geometry on map
                    setTimeout(() => {
                        this.mapManager.displayItemGeometry(item)
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
                                        assetKey: 'geometry'
                                    }
                                }));
                                
                                // Expand tools panel if collapsed
                                document.dispatchEvent(new CustomEvent('expandToolsPanel'));
                                
                                // Hide loading indicator
                                document.getElementById('loading').style.display = 'none';
                            })
                            .catch(error => {
                                this.notificationService.showNotification(
                                    `Error displaying geometry on map: ${error.message}`, 
                                    'error'
                                );
                                document.getElementById('loading').style.display = 'none';
                            });
                    }, 100);
                });
            }
        }
    }
    
    /**
     * Handle when an asset is displayed on the map
     * @param {CustomEvent} event - The asset displayed event
     */
    handleAssetDisplayed(event) {
        if (event.detail && event.detail.assetKey) {
            this.currentAssetKey = event.detail.assetKey;
        }
    }
}