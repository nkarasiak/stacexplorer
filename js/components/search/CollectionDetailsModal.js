/**
 * CollectionDetailsModal.js - Enhanced modal for displaying detailed collection information
 * Shows comprehensive metadata when collections are clicked or selected
 */

export class CollectionDetailsModal {
  /**
   * Create a new CollectionDetailsModal
   * @param {Object} apiClient - STAC API client
   * @param {Object} notificationService - Notification service
   */
  constructor(apiClient, notificationService) {
    this.apiClient = apiClient;
    this.notificationService = notificationService;
    this.modal = null;
    this.currentCollection = null;

    // Create modal element
    this.createModal();

    // Setup global event listeners
    this.setupEventListeners();
  }

  /**
   * Create the modal dialog element
   */
  createModal() {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'collection-details-modal-overlay';
    modalOverlay.id = 'collection-details-modal';

    // Create modal dialog with enhanced layout
    modalOverlay.innerHTML = `
            <div class="collection-details-modal-dialog">
                <div class="collection-details-modal-header">
                    <div class="collection-header-content">
                        <h3 class="collection-modal-title">
                            <i class="material-icons">dataset</i>
                            <span id="collection-title">Collection Details</span>
                        </h3>
                        <div class="collection-source-badge" id="collection-source-badge">
                            Unknown Source
                        </div>
                    </div>
                    <button class="collection-modal-close" aria-label="Close">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                
                <div class="collection-details-modal-body">
                    <div class="collection-loading" id="collection-loading">
                        <i class="material-icons spinning">refresh</i>
                        <span>Loading collection details...</span>
                    </div>
                    
                    <div class="collection-content" id="collection-content" style="display: none;">
                        <!-- Basic Information Section -->
                        <div class="collection-section">
                            <h4 class="collection-section-title">
                                <i class="material-icons">info</i>
                                Basic Information
                            </h4>
                            <div class="collection-info-grid" id="basic-info">
                                <!-- Content populated dynamically -->
                            </div>
                        </div>
                        
                        <!-- Spatial & Temporal Extent Section -->
                        <div class="collection-section">
                            <h4 class="collection-section-title">
                                <i class="material-icons">place</i>
                                Coverage & Extent
                            </h4>
                            <div class="collection-extent-info" id="extent-info">
                                <!-- Content populated dynamically -->
                            </div>
                            <div class="collection-mini-map-container" id="mini-map-container" style="display: none;">
                                <h5><i class="material-icons">map</i> Geometry Preview</h5>
                                <div class="mini-map" id="collection-mini-map"></div>
                            </div>
                        </div>
                        
                        <!-- Providers Section -->
                        <div class="collection-section" id="providers-section" style="display: none;">
                            <h4 class="collection-section-title">
                                <i class="material-icons">business</i>
                                Providers
                            </h4>
                            <div class="collection-providers" id="providers-info">
                                <!-- Content populated dynamically -->
                            </div>
                        </div>
                        
                        <!-- Assets & Links Section -->
                        <div class="collection-section" id="assets-section" style="display: none;">
                            <h4 class="collection-section-title">
                                <i class="material-icons">link</i>
                                Assets & Links
                            </h4>
                            <div class="collection-assets" id="assets-info">
                                <!-- Content populated dynamically -->
                            </div>
                        </div>
                        
                        <!-- Properties Section -->
                        <div class="collection-section" id="properties-section" style="display: none;">
                            <h4 class="collection-section-title">
                                <i class="material-icons">tune</i>
                                Properties & Summaries
                            </h4>
                            <div class="collection-properties" id="properties-info">
                                <!-- Content populated dynamically -->
                            </div>
                        </div>
                        
                        <!-- Full JSON Section -->
                        <div class="collection-section">
                            <h4 class="collection-section-title">
                                <i class="material-icons">code</i>
                                Full JSON Data
                                <button class="collection-toggle-json" id="toggle-json">
                                    <i class="material-icons">expand_more</i>
                                    Show JSON
                                </button>
                            </h4>
                            <div class="collection-json-container" id="json-container" style="display: none;">
                                <div class="collection-json-controls">
                                    <button class="md-btn md-btn-secondary" id="copy-json-btn">
                                        <i class="material-icons">content_copy</i>
                                        Copy JSON
                                    </button>
                                    <button class="md-btn md-btn-secondary" id="download-json-btn">
                                        <i class="material-icons">download</i>
                                        Download JSON
                                    </button>
                                </div>
                                <pre class="collection-json-content" id="json-content"></pre>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="collection-details-modal-footer">
                    <div class="footer-actions-left">
                        <button class="md-btn md-btn-secondary" id="copy-collection-btn">
                            <i class="material-icons">content_copy</i>
                            Copy Collection Info
                        </button>
                        <button class="md-btn md-btn-secondary" id="share-collection-btn">
                            <i class="material-icons">share</i>
                            Share URL
                        </button>
                        <button class="md-btn md-btn-secondary" id="show-on-map-btn" style="display: none;">
                            <i class="material-icons">map</i>
                            Show on Map
                        </button>
                    </div>
                    <div class="footer-actions-right">
                        <button class="md-btn md-btn-secondary" id="collection-close-btn">
                            Close
                        </button>
                        <button class="md-btn md-btn-primary" id="select-collection-btn">
                            <i class="material-icons">check</i>
                            Select This Collection
                        </button>
                    </div>
                </div>
            </div>
        `;

    // Add modal to body
    document.body.appendChild(modalOverlay);

    // Store modal elements
    this.modal = {
      overlay: modalOverlay,
      dialog: modalOverlay.querySelector('.collection-details-modal-dialog'),
      loading: modalOverlay.querySelector('#collection-loading'),
      content: modalOverlay.querySelector('#collection-content'),
      title: modalOverlay.querySelector('#collection-title'),
      sourceBadge: modalOverlay.querySelector('#collection-source-badge'),
      closeBtn: modalOverlay.querySelector('.collection-modal-close'),
      closeBtnFooter: modalOverlay.querySelector('#collection-close-btn'),
      selectBtn: modalOverlay.querySelector('#select-collection-btn'),
      toggleJsonBtn: modalOverlay.querySelector('#toggle-json'),
      jsonContainer: modalOverlay.querySelector('#json-container'),
      jsonContent: modalOverlay.querySelector('#json-content'),
      copyJsonBtn: modalOverlay.querySelector('#copy-json-btn'),
      downloadJsonBtn: modalOverlay.querySelector('#download-json-btn'),
      miniMapContainer: modalOverlay.querySelector('#mini-map-container'),
      miniMap: modalOverlay.querySelector('#collection-mini-map'),
      copyCollectionBtn: modalOverlay.querySelector('#copy-collection-btn'),
      shareCollectionBtn: modalOverlay.querySelector('#share-collection-btn'),
      showOnMapBtn: modalOverlay.querySelector('#show-on-map-btn'),
    };

    // Initialize mini map
    this.miniMapInstance = null;

    // Setup modal event listeners
    this.setupModalEventListeners();
  }

  /**
   * Setup modal event listeners
   */
  setupModalEventListeners() {
    // Close button handlers
    this.modal.closeBtn.addEventListener('click', () => this.close());
    this.modal.closeBtnFooter.addEventListener('click', () => this.close());

    // Close on overlay click
    this.modal.overlay.addEventListener('click', e => {
      if (e.target === this.modal.overlay) {
        this.close();
      }
    });

    // Select collection button
    this.modal.selectBtn.addEventListener('click', () => {
      this.selectCollection();
    });

    // JSON toggle button
    this.modal.toggleJsonBtn.addEventListener('click', () => {
      this.toggleJsonDisplay();
    });

    // Copy JSON button
    this.modal.copyJsonBtn.addEventListener('click', () => {
      this.copyJsonToClipboard();
    });

    // Download JSON button
    this.modal.downloadJsonBtn.addEventListener('click', () => {
      this.downloadJson();
    });

    // Copy collection button
    this.modal.copyCollectionBtn.addEventListener('click', () => {
      this.copyCollectionInfo();
    });

    // Share collection button
    this.modal.shareCollectionBtn.addEventListener('click', () => {
      this.shareCollection();
    });

    // Show on map button
    this.modal.showOnMapBtn.addEventListener('click', () => {
      this.showOnMap();
    });
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Escape key handler
    this.escapeHandler = event => {
      if (event.key === 'Escape' && this.modal.overlay.classList.contains('active')) {
        this.close();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);

    // Listen for collection selection events from other components
    document.addEventListener('showCollectionDetails', event => {
      if (event.detail?.collection) {
        this.showCollection(event.detail.collection);
      }
    });
  }

  /**
   * Show collection details in modal
   * @param {Object} collection - Collection object
   */
  async showCollection(collection) {
    try {
      this.currentCollection = collection;

      // Show modal and loading state
      this.modal.overlay.classList.add('active');
      this.modal.loading.style.display = 'flex';
      this.modal.content.style.display = 'none';

      // Update header
      this.modal.title.textContent = collection.title || collection.id;
      this.updateSourceBadge(collection.source);

      // Load detailed collection information
      const detailedCollection = await this.loadDetailedCollection(collection);

      // Populate content
      this.populateCollectionDetails(detailedCollection);

      // Show content, hide loading
      this.modal.loading.style.display = 'none';
      this.modal.content.style.display = 'block';
    } catch (error) {
      console.error('❌ Error showing collection details:', error);
      this.notificationService.showNotification(
        `Error loading collection details: ${error.message}`,
        'error'
      );
      this.close();
    }
  }

  /**
   * Load detailed collection information from API
   * @param {Object} collection - Basic collection object
   * @returns {Promise<Object>} Detailed collection object
   */
  async loadDetailedCollection(collection) {
    try {
      // If we already have detailed info, use it
      if (collection.extent || collection.providers || collection.summaries) {
        return collection;
      }

      // Otherwise, fetch detailed info from API

      // Set API client to correct source if needed
      if (collection.source && window.stacExplorer?.config?.stacEndpoints?.[collection.source]) {
        const endpoints = window.stacExplorer.config.stacEndpoints[collection.source];
        this.apiClient.setEndpoints(endpoints);
      }

      // Fetch detailed collection info
      const detailedCollection = await this.apiClient.fetchCollection(collection.id);

      // Merge with original collection to preserve source info
      return {
        ...collection,
        ...detailedCollection,
      };
    } catch (error) {
      console.error('❌ Error loading detailed collection:', error);
      // Return original collection if detailed fetch fails
      return collection;
    }
  }

  /**
   * Update source badge styling and text
   * @param {string} source - Data source name
   */
  updateSourceBadge(source) {
    if (!source) {
      this.modal.sourceBadge.textContent = 'Unknown Source';
      this.modal.sourceBadge.className = 'collection-source-badge';
      return;
    }

    const sourceLabels = {
      copernicus: 'Copernicus',
      element84: 'Element84',
      local: 'Local',
      custom: 'Custom',
    };

    this.modal.sourceBadge.textContent = sourceLabels[source] || source;
    this.modal.sourceBadge.className = `collection-source-badge source-${source}`;
  }

  /**
   * Populate collection details in the modal
   * @param {Object} collection - Detailed collection object
   */
  populateCollectionDetails(collection) {
    this.populateBasicInfo(collection);
    this.populateExtentInfo(collection);
    this.populateMiniMap(collection);
    this.populateProvidersInfo(collection);
    this.populateAssetsInfo(collection);
    this.populatePropertiesInfo(collection);
    this.populateJsonContent(collection);
    this.updateActionButtons(collection);
  }

  /**
   * Populate basic information section
   * @param {Object} collection - Collection object
   */
  populateBasicInfo(collection) {
    const basicInfo = document.getElementById('basic-info');

    const infoItems = [
      { label: 'ID', value: collection.id, icon: 'fingerprint' },
      { label: 'Title', value: collection.title || 'N/A', icon: 'title' },
      {
        label: 'Description',
        value: collection.description || 'N/A',
        icon: 'description',
        multiline: true,
      },
      { label: 'License', value: collection.license || 'N/A', icon: 'gavel' },
      {
        label: 'Keywords',
        value: collection.keywords ? collection.keywords.join(', ') : 'N/A',
        icon: 'label',
      },
    ];

    basicInfo.innerHTML = infoItems
      .map(
        item => `
            <div class="collection-info-item ${item.multiline ? 'multiline' : ''}">
                <div class="info-label">
                    <i class="material-icons">${item.icon}</i>
                    ${item.label}
                </div>
                <div class="info-value">${item.value}</div>
            </div>
        `
      )
      .join('');
  }

  /**
   * Populate extent information section
   * @param {Object} collection - Collection object
   */
  populateExtentInfo(collection) {
    const extentInfo = document.getElementById('extent-info');

    if (!collection.extent) {
      extentInfo.innerHTML = '<div class="no-data">No extent information available</div>';
      return;
    }

    let extentHTML = '';

    // Spatial extent
    if (collection.extent.spatial?.bbox) {
      const bbox = collection.extent.spatial.bbox[0]; // Get first bbox
      extentHTML += `
                <div class="extent-item">
                    <h5><i class="material-icons">place</i> Spatial Extent</h5>
                    <div class="extent-details">
                        <div class="bbox-info">
                            <strong>Bounding Box:</strong><br>
                            West: ${bbox[0]?.toFixed(6)}, South: ${bbox[1]?.toFixed(6)}<br>
                            East: ${bbox[2]?.toFixed(6)}, North: ${bbox[3]?.toFixed(6)}
                        </div>
                    </div>
                </div>
            `;
    }

    // Temporal extent
    if (collection.extent.temporal?.interval) {
      const interval = collection.extent.temporal.interval[0]; // Get first interval
      const startDate = interval[0] ? new Date(interval[0]).toLocaleString() : 'Open';
      const endDate = interval[1] ? new Date(interval[1]).toLocaleString() : 'Ongoing';

      extentHTML += `
                <div class="extent-item">
                    <h5><i class="material-icons">schedule</i> Temporal Extent</h5>
                    <div class="extent-details">
                        <div class="temporal-info">
                            <strong>From:</strong> ${startDate}<br>
                            <strong>To:</strong> ${endDate}
                        </div>
                    </div>
                </div>
            `;
    }

    extentInfo.innerHTML =
      extentHTML || '<div class="no-data">No extent information available</div>';
  }

  /**
   * Populate mini map with collection geometry
   * @param {Object} collection - Collection object
   */
  populateMiniMap(collection) {
    const miniMapContainer = this.modal.miniMapContainer;
    const miniMapElement = this.modal.miniMap;

    // Clean up existing map
    if (this.miniMapInstance) {
      this.miniMapInstance.remove();
      this.miniMapInstance = null;
    }

    // Check if we have spatial extent
    if (!collection.extent?.spatial?.bbox?.[0]) {
      miniMapContainer.style.display = 'none';
      return;
    }

    try {
      miniMapContainer.style.display = 'block';

      // Clear any existing content
      miniMapElement.innerHTML = '';

      // Create map with minimal controls
      this.miniMapInstance = L.map(miniMapElement, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
      });

      // Add a simple tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(this.miniMapInstance);

      // Get bounding box
      const bbox = collection.extent.spatial.bbox[0];
      const bounds = [
        [bbox[1], bbox[0]],
        [bbox[3], bbox[2]],
      ];

      // Create rectangle for the extent
      L.rectangle(bounds, {
        color: '#667eea',
        weight: 2,
        fillColor: '#667eea',
        fillOpacity: 0.2,
      }).addTo(this.miniMapInstance);

      // Fit map to bounds
      this.miniMapInstance.fitBounds(bounds, { padding: [10, 10] });

      // Add click handler to open full map view
      this.miniMapInstance.on('click', () => {
        this.showOnMap();
      });
    } catch (error) {
      console.error('❌ Error creating mini map:', error);
      miniMapContainer.style.display = 'none';
    }
  }

  /**
   * Update action buttons based on collection capabilities
   * @param {Object} collection - Collection object
   */
  updateActionButtons(collection) {
    const showOnMapBtn = this.modal.showOnMapBtn;

    // Show 'Show on Map' button if collection has spatial extent
    if (collection.extent?.spatial?.bbox?.[0]) {
      showOnMapBtn.style.display = 'inline-flex';
    } else {
      showOnMapBtn.style.display = 'none';
    }
  }

  /**
   * Populate providers information section
   * @param {Object} collection - Collection object
   */
  populateProvidersInfo(collection) {
    const providersSection = document.getElementById('providers-section');
    const providersInfo = document.getElementById('providers-info');

    if (!collection.providers || collection.providers.length === 0) {
      providersSection.style.display = 'none';
      return;
    }

    providersSection.style.display = 'block';

    const providersHTML = collection.providers
      .map(
        provider => `
            <div class="provider-item">
                <div class="provider-header">
                    <h5>${provider.name || 'Unknown Provider'}</h5>
                    <span class="provider-roles">${(provider.roles || []).join(', ')}</span>
                </div>
                ${provider.description ? `<p class="provider-description">${provider.description}</p>` : ''}
                ${
                  provider.url
                    ? `<a href="${provider.url}" target="_blank" class="provider-link">
                    <i class="material-icons">open_in_new</i> Visit Website
                </a>`
                    : ''
                }
            </div>
        `
      )
      .join('');

    providersInfo.innerHTML = providersHTML;
  }

  /**
   * Populate assets and links information section
   * @param {Object} collection - Collection object
   */
  populateAssetsInfo(collection) {
    const assetsSection = document.getElementById('assets-section');
    const assetsInfo = document.getElementById('assets-info');

    const hasAssets = collection.assets && Object.keys(collection.assets).length > 0;
    const hasLinks = collection.links && collection.links.length > 0;

    if (!hasAssets && !hasLinks) {
      assetsSection.style.display = 'none';
      return;
    }

    assetsSection.style.display = 'block';

    let assetsHTML = '';

    // Assets
    if (hasAssets) {
      assetsHTML += '<h5><i class="material-icons">attachment</i> Assets</h5>';
      assetsHTML += '<div class="assets-grid">';

      Object.entries(collection.assets).forEach(([key, asset]) => {
        assetsHTML += `
                    <div class="asset-item">
                        <div class="asset-header">
                            <strong>${key}</strong>
                            ${asset.type ? `<span class="asset-type">${asset.type}</span>` : ''}
                        </div>
                        ${asset.title ? `<div class="asset-title">${asset.title}</div>` : ''}
                        <a href="${asset.href}" target="_blank" class="asset-link">
                            <i class="material-icons">open_in_new</i> Open
                        </a>
                    </div>
                `;
      });

      assetsHTML += '</div>';
    }

    // Links
    if (hasLinks) {
      const relevantLinks = collection.links.filter(
        link => !['self', 'parent', 'root'].includes(link.rel)
      );

      if (relevantLinks.length > 0) {
        assetsHTML += '<h5><i class="material-icons">link</i> Related Links</h5>';
        assetsHTML += '<div class="links-list">';

        relevantLinks.forEach(link => {
          assetsHTML += `
                        <div class="link-item">
                            <div class="link-header">
                                <strong>${link.rel}</strong>
                                ${link.type ? `<span class="link-type">${link.type}</span>` : ''}
                            </div>
                            ${link.title ? `<div class="link-title">${link.title}</div>` : ''}
                            <a href="${link.href}" target="_blank" class="link-url">
                                <i class="material-icons">open_in_new</i> ${link.href}
                            </a>
                        </div>
                    `;
        });

        assetsHTML += '</div>';
      }
    }

    assetsInfo.innerHTML = assetsHTML;
  }

  /**
   * Populate properties and summaries section
   * @param {Object} collection - Collection object
   */
  populatePropertiesInfo(collection) {
    const propertiesSection = document.getElementById('properties-section');
    const propertiesInfo = document.getElementById('properties-info');

    if (!collection.summaries || Object.keys(collection.summaries).length === 0) {
      propertiesSection.style.display = 'none';
      return;
    }

    propertiesSection.style.display = 'block';

    const summariesHTML = Object.entries(collection.summaries)
      .map(([key, summary]) => {
        let valueDisplay = '';

        if (Array.isArray(summary)) {
          if (summary.length <= 10) {
            valueDisplay = summary.join(', ');
          } else {
            valueDisplay = `${summary.slice(0, 10).join(', ')} ... (+${summary.length - 10} more)`;
          }
        } else if (typeof summary === 'object' && summary !== null) {
          if (summary.minimum !== undefined && summary.maximum !== undefined) {
            valueDisplay = `${summary.minimum} - ${summary.maximum}`;
          } else {
            valueDisplay = JSON.stringify(summary);
          }
        } else {
          valueDisplay = String(summary);
        }

        return `
                <div class="property-item">
                    <div class="property-key">${key}</div>
                    <div class="property-value">${valueDisplay}</div>
                </div>
            `;
      })
      .join('');

    propertiesInfo.innerHTML = summariesHTML;
  }

  /**
   * Populate JSON content section
   * @param {Object} collection - Collection object
   */
  populateJsonContent(collection) {
    const jsonContent = this.modal.jsonContent;
    const formattedJson = JSON.stringify(collection, null, 2);
    jsonContent.textContent = formattedJson;
  }

  /**
   * Toggle JSON display
   */
  toggleJsonDisplay() {
    const container = this.modal.jsonContainer;
    const button = this.modal.toggleJsonBtn;
    // const _icon = button.querySelector('i'); // Unused variable - icon is updated via innerHTML

    if (container.style.display === 'none') {
      container.style.display = 'block';
      button.innerHTML = '<i class="material-icons">expand_less</i> Hide JSON';
    } else {
      container.style.display = 'none';
      button.innerHTML = '<i class="material-icons">expand_more</i> Show JSON';
    }
  }

  /**
   * Copy JSON to clipboard
   */
  async copyJsonToClipboard() {
    try {
      const jsonText = this.modal.jsonContent.textContent;
      await navigator.clipboard.writeText(jsonText);
      this.notificationService.showNotification('JSON copied to clipboard!', 'success');
    } catch (error) {
      console.error('❌ Error copying JSON:', error);
      this.notificationService.showNotification('Failed to copy JSON', 'error');
    }
  }

  /**
   * Download JSON as file
   */
  downloadJson() {
    try {
      const jsonText = this.modal.jsonContent.textContent;
      const collectionId = this.currentCollection?.id || 'collection';
      const filename = `${collectionId}-details.json`;

      const blob = new Blob([jsonText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.notificationService.showNotification(`Downloaded ${filename}`, 'success');
    } catch (error) {
      console.error('❌ Error downloading JSON:', error);
      this.notificationService.showNotification('Failed to download JSON', 'error');
    }
  }

  /**
   * Select the current collection
   */
  selectCollection() {
    if (!this.currentCollection) {
      return;
    }

    // Get current catalog ID for the URL generation
    let catalogId = null;
    if (window.stacExplorer?.apiClient?.endpoints?.root) {
      // Try to determine catalog ID from current API endpoint
      const currentEndpoint = window.stacExplorer.apiClient.endpoints.root;
      const legacyMapping = {
        'https://stac.dataspace.copernicus.eu/v1': 'cdse-stac',
        'https://earth-search.aws.element84.com/v1': 'earth-search-aws',
        'https://planetarycomputer.microsoft.com/api/stac/v1': 'microsoft-pc',
      };
      catalogId = legacyMapping[currentEndpoint];
    }

    // Dispatch collection selection event
    document.dispatchEvent(
      new CustomEvent('collectionSelected', {
        detail: {
          collection: this.currentCollection,
          source: this.currentCollection.source,
          catalogId: catalogId, // Add catalog ID for URL generation
        },
      })
    );

    this.notificationService.showNotification(
      `Selected collection: ${this.currentCollection.title || this.currentCollection.id}`,
      'success'
    );

    this.close();
  }

  /**
   * Copy collection information to clipboard
   */
  async copyCollectionInfo() {
    try {
      if (!this.currentCollection) {
        return;
      }

      const collection = this.currentCollection;
      const info = {
        id: collection.id,
        title: collection.title,
        description: collection.description,
        license: collection.license,
        keywords: collection.keywords,
        extent: collection.extent,
        providers: collection.providers,
        links: collection.links?.filter(link => ['self', 'items', 'data'].includes(link.rel)),
      };

      const infoText = JSON.stringify(info, null, 2);
      await navigator.clipboard.writeText(infoText);

      this.notificationService.showNotification(
        'Collection information copied to clipboard!',
        'success'
      );
    } catch (error) {
      console.error('❌ Error copying collection info:', error);
      this.notificationService.showNotification('Failed to copy collection information', 'error');
    }
  }

  /**
   * Share collection with a URL
   */
  async shareCollection() {
    try {
      if (!this.currentCollection) {
        return;
      }

      const collection = this.currentCollection;
      const baseUrl = window.location.origin + window.location.pathname;
      const params = new URLSearchParams({
        collection: collection.id,
        source: collection.source || 'unknown',
        action: 'details',
      });

      const shareUrl = `${baseUrl}?${params.toString()}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);

      this.notificationService.showNotification('Share URL copied to clipboard!', 'success');
    } catch (error) {
      console.error('❌ Error creating share URL:', error);
      this.notificationService.showNotification('Failed to create share URL', 'error');
    }
  }

  /**
   * Show collection extent on the main map
   */
  showOnMap() {
    try {
      if (!this.currentCollection?.extent?.spatial?.bbox?.[0]) {
        this.notificationService.showNotification(
          'No spatial extent available for this collection',
          'warning'
        );
        return;
      }

      const bbox = this.currentCollection.extent.spatial.bbox[0];
      const bounds = [
        [bbox[1], bbox[0]],
        [bbox[3], bbox[2]],
      ];

      // Dispatch event to show on main map
      document.dispatchEvent(
        new CustomEvent('showCollectionOnMap', {
          detail: {
            collection: this.currentCollection,
            bounds: bounds,
          },
        })
      );

      this.notificationService.showNotification('Collection extent shown on map', 'success');

      // Close modal to show map
      this.close();
    } catch (error) {
      console.error('❌ Error showing collection on map:', error);
      this.notificationService.showNotification('Failed to show collection on map', 'error');
    }
  }

  /**
   * Close the modal
   */
  close() {
    this.modal.overlay.classList.remove('active');
    this.currentCollection = null;

    // Clean up mini map
    if (this.miniMapInstance) {
      this.miniMapInstance.remove();
      this.miniMapInstance = null;
    }

    // Reset displays
    this.modal.jsonContainer.style.display = 'none';
    this.modal.toggleJsonBtn.innerHTML = '<i class="material-icons">expand_more</i> Show JSON';
    this.modal.miniMapContainer.style.display = 'none';
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.modal?.overlay && document.body.contains(this.modal.overlay)) {
      document.body.removeChild(this.modal.overlay);
    }

    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
    }

    // Clean up mini map
    if (this.miniMapInstance) {
      this.miniMapInstance.remove();
      this.miniMapInstance = null;
    }

    this.modal = null;
    this.currentCollection = null;
  }

  /**
   * Handle shared URLs on page load
   */
  static handleSharedUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const collectionId = urlParams.get('collection');
    const source = urlParams.get('source');
    const action = urlParams.get('action');

    if (collectionId && action === 'details') {
      // Wait for app to initialize, then show collection details
      setTimeout(() => {
        document.dispatchEvent(
          new CustomEvent('loadSharedCollection', {
            detail: {
              collectionId: collectionId,
              source: source,
            },
          })
        );
      }, 1000);
    }
  }
}
