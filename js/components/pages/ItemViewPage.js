/**
 * ItemViewPage.js - Full-page view component for individual STAC items
 * Provides a page-based alternative to the modal viewer UI
 */

export class ItemViewPage {
  constructor(apiClient, notificationService, config) {
    this.apiClient = apiClient;
    this.notificationService = notificationService;
    this.config = config;
    this.currentItem = null;
    this.page = null;
    this.isVisible = false;

    this.init();
  }

  init() {
    this.createPage();
    this.setupEventListeners();
  }

  createPage() {
    const page = document.createElement('div');
    page.id = 'item-view-page';
    page.className = 'item-view-page hidden';

    page.innerHTML = `
            <!-- Page Header -->
            <header class="item-view-header">
                <div class="header-navigation">
                    <button id="back-to-browser" class="back-btn" title="Back to Browser">
                        <i class="material-icons">arrow_back</i>
                        <span>Back</span>
                    </button>
                    <div class="breadcrumb">
                        <span id="catalog-breadcrumb"></span>
                        <i class="material-icons">chevron_right</i>
                        <span id="collection-breadcrumb"></span>
                        <i class="material-icons">chevron_right</i>
                        <span id="item-breadcrumb">Item</span>
                    </div>
                </div>
                <div class="header-actions">
                    <button id="copy-item-url" class="action-btn" title="Copy Item URL">
                        <i class="material-icons">link</i>
                    </button>
                    <button id="copy-item-json" class="action-btn" title="Copy Item JSON">
                        <i class="material-icons">content_copy</i>
                    </button>
                    <button id="close-item-view" class="action-btn" title="Close">
                        <i class="material-icons">close</i>
                    </button>
                </div>
            </header>
            
            <!-- Main Content -->
            <main class="item-view-main">
                <div class="item-view-container">
                    
                    <!-- Item Header Section -->
                    <section class="item-header-section">
                        <div class="item-title-area">
                            <h1 id="item-title">Loading...</h1>
                            <div class="item-metadata">
                                <span class="item-id" id="item-id"></span>
                                <span class="item-collection" id="item-collection"></span>
                                <span class="item-date" id="item-date"></span>
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="primary-btn" id="add-to-map-btn">
                                <i class="material-icons">map</i>
                                Add to Map
                            </button>
                        </div>
                    </section>
                    
                    <!-- Two-column layout -->
                    <div class="item-content-grid">
                        
                        <!-- Left Column: Preview and Assets -->
                        <div class="item-preview-column">
                            
                            <!-- Preview Section -->
                            <section class="preview-section">
                                <h2>
                                    <i class="material-icons">image</i>
                                    Preview
                                </h2>
                                <div class="preview-container" id="preview-container">
                                    <div class="preview-loading">
                                        <div class="loading-spinner"></div>
                                        <span>Loading preview...</span>
                                    </div>
                                </div>
                            </section>
                            
                            <!-- Assets Section -->
                            <section class="assets-section">
                                <h2>
                                    <i class="material-icons">folder</i>
                                    Assets
                                </h2>
                                <div class="assets-grid" id="assets-grid">
                                    <!-- Assets will be populated here -->
                                </div>
                            </section>
                            
                        </div>
                        
                        <!-- Right Column: Details and Properties -->
                        <div class="item-details-column">
                            
                            <!-- Properties Section -->
                            <section class="properties-section">
                                <h2>
                                    <i class="material-icons">info</i>
                                    Properties
                                </h2>
                                <div class="properties-grid" id="properties-grid">
                                    <!-- Properties will be populated here -->
                                </div>
                            </section>
                            
                            <!-- Geometry Section -->
                            <section class="geometry-section">
                                <h2>
                                    <i class="material-icons">location_on</i>
                                    Location
                                </h2>
                                <div class="geometry-container" id="geometry-container">
                                    <!-- Geometry info will be populated here -->
                                </div>
                            </section>
                            
                            <!-- Links Section -->
                            <section class="links-section">
                                <h2>
                                    <i class="material-icons">link</i>
                                    Links
                                </h2>
                                <div class="links-list" id="links-list">
                                    <!-- Links will be populated here -->
                                </div>
                            </section>
                            
                        </div>
                    </div>
                </div>
            </main>
        `;

    // Append to map container instead of body to work within app layout
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) {
      mapContainer.appendChild(page);
    } else {
      // Fallback to body if map container not found
      document.body.appendChild(page);
    }
    this.page = page;
  }

  setupEventListeners() {
    // Back button
    document.getElementById('back-to-browser').addEventListener('click', () => {
      this.navigateBack();
    });

    // Close button
    document.getElementById('close-item-view').addEventListener('click', () => {
      this.navigateBack();
    });

    // Copy URL button
    document.getElementById('copy-item-url').addEventListener('click', () => {
      this.copyItemUrl();
    });

    // Copy JSON button
    document.getElementById('copy-item-json').addEventListener('click', () => {
      this.copyItemJson();
    });

    // Add to map button
    document.getElementById('add-to-map-btn').addEventListener('click', () => {
      this.addToMap();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (this.isVisible) {
        if (e.key === 'Escape') {
          this.navigateBack();
        } else if (e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
          this.navigateBack();
        }
      }
    });
  }

  /**
   * Show the item view page with the specified item
   */
  async show(item, catalogId, collectionId) {
    try {
      this.currentItem = item;
      this.catalogId = catalogId;
      this.collectionId = collectionId;

      this.isVisible = true;
      this.page.classList.remove('hidden');

      // Update breadcrumb
      this.updateBreadcrumb(catalogId, collectionId);

      // Populate content
      await this.populateContent(item);

      // Scroll to top
      this.page.scrollTop = 0;
    } catch (error) {
      console.error('Error in ItemViewPage.show():', error);
      this.showError(`Failed to display item: ${error.message}`);
    }
  }

  /**
   * Hide the item view page
   */
  hide() {
    this.isVisible = false;
    this.page.classList.add('hidden');
    this.currentItem = null;
  }

  /**
   * Update the breadcrumb navigation
   */
  updateBreadcrumb(catalogId, collectionId) {
    const catalogBreadcrumb = document.getElementById('catalog-breadcrumb');
    const collectionBreadcrumb = document.getElementById('collection-breadcrumb');

    if (catalogBreadcrumb) {
      catalogBreadcrumb.textContent = catalogId || 'Catalog';
    }

    if (collectionBreadcrumb) {
      collectionBreadcrumb.textContent = collectionId || 'Collection';
    }
  }

  /**
   * Populate the page content with item data
   */
  async populateContent(item) {
    try {
      // Update title and metadata
      this.updateHeader(item);

      // Load preview
      await this.loadPreview(item);

      // Populate assets
      this.populateAssets(item);

      // Populate properties
      this.populateProperties(item);

      // Populate geometry
      this.populateGeometry(item);

      // Populate links
      this.populateLinks(item);
    } catch (error) {
      console.error('Error populating item content:', error);
      this.showError(`Failed to load item details: ${error.message}`);
    }
  }

  /**
   * Update the header section
   */
  updateHeader(item) {
    const title = item.properties?.title || item.id;
    const itemDate = item.properties?.datetime
      ? new Date(item.properties.datetime).toLocaleDateString()
      : 'No date';

    document.getElementById('item-title').textContent = title;
    document.getElementById('item-id').textContent = item.id;
    document.getElementById('item-collection').textContent = item.collection || 'Unknown';
    document.getElementById('item-date').textContent = itemDate;
  }

  /**
   * Load and display preview image
   */
  loadPreview(item) {
    const previewContainer = document.getElementById('preview-container');
    const thumbnailUrl = this.getThumbnailUrl(item);

    if (thumbnailUrl) {
      previewContainer.innerHTML = `
                <img src="${thumbnailUrl}" alt="Item preview" class="preview-image" 
                     onerror="this.parentElement.innerHTML='<div class=&quot;preview-error&quot;><i class=&quot;material-icons&quot;>broken_image</i><span>Preview failed to load</span></div>'">
            `;
    } else {
      previewContainer.innerHTML = `
                <div class="no-preview">
                    <i class="material-icons">image_not_supported</i>
                    <span>No preview available</span>
                </div>
            `;
    }
  }

  /**
   * Populate the assets section
   */
  populateAssets(item) {
    const assetsGrid = document.getElementById('assets-grid');

    if (!item.assets || Object.keys(item.assets).length === 0) {
      assetsGrid.innerHTML = '<div class="no-assets">No assets available</div>';
      return;
    }

    const assetsHtml = Object.entries(item.assets)
      .map(([key, asset]) => {
        const type = asset.type || 'Unknown type';
        const title = asset.title || key;
        const size = asset.file_size ? this.formatFileSize(asset.file_size) : '';

        return `
                <div class="asset-card" data-asset-key="${key}">
                    <div class="asset-header">
                        <span class="asset-title">${title}</span>
                        <span class="asset-type">${type}</span>
                    </div>
                    <div class="asset-meta">
                        ${size ? `<span class="asset-size">${size}</span>` : ''}
                        <a href="${asset.href}" target="_blank" class="asset-link" title="Open asset">
                            <i class="material-icons">open_in_new</i>
                        </a>
                    </div>
                </div>
            `;
      })
      .join('');

    assetsGrid.innerHTML = assetsHtml;
  }

  /**
   * Populate the properties section
   */
  populateProperties(item) {
    const propertiesGrid = document.getElementById('properties-grid');

    if (!item.properties || Object.keys(item.properties).length === 0) {
      propertiesGrid.innerHTML = '<div class="no-properties">No properties available</div>';
      return;
    }

    const propertiesHtml = Object.entries(item.properties)
      .filter(([_key, value]) => value !== null && value !== '')
      .map(([key, value]) => {
        const displayKey = this.formatPropertyKey(key);
        const displayValue = this.formatPropertyValue(key, value);

        return `
                    <div class="property-row">
                        <span class="property-key">${displayKey}</span>
                        <span class="property-value">${displayValue}</span>
                    </div>
                `;
      })
      .join('');

    propertiesGrid.innerHTML = propertiesHtml;
  }

  /**
   * Populate the geometry section
   */
  populateGeometry(item) {
    const geometryContainer = document.getElementById('geometry-container');

    if (!item.geometry) {
      geometryContainer.innerHTML = '<div class="no-geometry">No geometry information</div>';
      return;
    }

    const type = item.geometry.type;
    const coordinates = item.geometry.coordinates;

    let bbox = null;
    if (item.bbox) {
      bbox = item.bbox;
    } else if (type === 'Polygon' && coordinates[0]) {
      // Calculate bbox from polygon coordinates
      const coords = coordinates[0];
      const lons = coords.map(c => c[0]);
      const lats = coords.map(c => c[1]);
      bbox = [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
    }

    geometryContainer.innerHTML = `
            <div class="geometry-info">
                <div class="geometry-row">
                    <span class="geometry-key">Type</span>
                    <span class="geometry-value">${type}</span>
                </div>
                ${
                  bbox
                    ? `
                    <div class="geometry-row">
                        <span class="geometry-key">Bounding Box</span>
                        <span class="geometry-value">${bbox.map(n => n.toFixed(4)).join(', ')}</span>
                    </div>
                `
                    : ''
                }
            </div>
        `;
  }

  /**
   * Populate the links section
   */
  populateLinks(item) {
    const linksList = document.getElementById('links-list');

    if (!item.links || item.links.length === 0) {
      linksList.innerHTML = '<div class="no-links">No links available</div>';
      return;
    }

    const linksHtml = item.links
      .map(link => {
        const title = link.title || link.rel || 'Link';
        const rel = link.rel || 'related';

        return `
                <div class="link-item">
                    <div class="link-info">
                        <span class="link-title">${title}</span>
                        <span class="link-rel">${rel}</span>
                    </div>
                    <a href="${link.href}" target="_blank" class="link-url" title="Open link">
                        <i class="material-icons">open_in_new</i>
                    </a>
                </div>
            `;
      })
      .join('');

    linksList.innerHTML = linksHtml;
  }

  /**
   * Navigate back to the browser
   */
  navigateBack() {
    // Hide the item view first
    this.hide();

    // Navigate back to the collection view in the browser
    const backUrl = `/browser/${this.catalogId}/${this.collectionId}`;
    window.history.pushState({}, '', backUrl);

    // Use the router to handle the navigation instead of page reload
    if (window.stacExplorer?.router) {
      window.stacExplorer.router.handleRoute();
    } else {
      window.location.href = backUrl;
    }
  }

  /**
   * Copy item URL to clipboard
   */
  copyItemUrl() {
    const url = window.location.href;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        this.notificationService?.showNotification('Item URL copied to clipboard', 'success');
      })
      .catch(err => {
        console.error('Failed to copy URL:', err);
        this.notificationService?.showNotification('Failed to copy URL', 'error');
      });
  }

  /**
   * Copy item JSON to clipboard
   */
  copyItemJson() {
    if (this.currentItem) {
      const json = JSON.stringify(this.currentItem, null, 2);
      navigator.clipboard
        .writeText(json)
        .then(() => {
          this.notificationService?.showNotification('Item JSON copied to clipboard', 'success');
        })
        .catch(err => {
          console.error('Failed to copy JSON:', err);
          this.notificationService?.showNotification('Failed to copy JSON', 'error');
        });
    }
  }

  /**
   * Add item to map (navigate to viewer)
   */
  addToMap() {
    // Get current URL and replace /browser/ with /viewer/
    const currentUrl = window.location.href;
    const viewerUrl = currentUrl.replace('/browser/', '/viewer/');
    window.location.href = viewerUrl;
  }

  /**
   * Show error message
   */
  showError(message) {
    const container = document.querySelector('.item-view-container');
    container.innerHTML = `
            <div class="error-state">
                <i class="material-icons">error</i>
                <h2>Error</h2>
                <p>${message}</p>
                <button onclick="window.history.back()" class="retry-btn">Go Back</button>
            </div>
        `;
  }

  // === Utility Methods ===

  getThumbnailUrl(item) {
    // Use the exact same logic as CatalogBrowserPanel for consistency
    const isUsableUrl = url => {
      if (!url) {
        return false;
      }
      // Skip S3 URLs as they often have CORS issues in browser
      if (url.includes('s3.amazonaws.com') || url.includes('.s3.')) {
        return false;
      }
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
    if (
      !hasThumbnail &&
      item.assets &&
      item.assets.rendered_preview &&
      isUsableUrl(item.assets.rendered_preview.href)
    ) {
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

  formatFileSize(bytes) {
    if (bytes === 0) {
      return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  }

  formatPropertyKey(key) {
    return key.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  formatPropertyValue(key, value) {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    if (key.includes('date') || key.includes('time')) {
      try {
        return new Date(value).toLocaleString();
      } catch {
        return value;
      }
    }
    return String(value);
  }
}
