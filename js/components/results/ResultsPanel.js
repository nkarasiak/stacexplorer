/**
 * ResultsPanel.js - Handles displaying search results with pagination
 */

import { lazyImageLoader } from '../../utils/LazyImageLoader.js';

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
        
        // Map view state management for hover functionality
        this.savedMapView = null;
        this.currentHoveredItem = null;
        this.hoverTimeout = null;
        this.restoreTimeout = null;
        this.currentBboxLayer = null;
        
        // Center/map functionality state
        this.centeredItem = null;
        this.previousMapView = null;
        
        // Debug methods for testing restore functionality
        window.testMapRestore = () => {
            if (this.savedMapView) {
                this.restoreMapView();
            } else {
            }
        };
        
        window.clearHoverState = () => this.clearHoverState();
        window.forceRestoreMapView = () => this.forceRestoreMapView();
        
        window.debugHoverState = () => {
        };
        
        // Initialize pagination controls
        this.initPagination();
        
        // Create modal element
        this.createModal();
        
        // Listen for asset displayed events
        document.addEventListener('assetDisplayed', this.handleAssetDisplayed.bind(this));
        
        // Listen for item activated events to display single items in results panel
        document.addEventListener('itemActivated', this.handleItemActivated.bind(this));
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
                        <button class="md-btn md-btn-primary" id="view-on-map-btn">
                            <i class="material-icons">map</i>
                            View on Map
                        </button>
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
            if (e.target === modalOverlay && !this.temporarilyDisableOverlayClick) {
                this.closeModal();
            }
        });
        
        // Add escape key handler
        document.addEventListener('keydown', this.handleEscapeKey);
        
        // Store modal elements
        this.modal = {
            overlay: modalOverlay,
            content: modalOverlay.querySelector('#modal-content'),
            title: modalOverlay.querySelector('#item-title'),
            collectionBadge: modalOverlay.querySelector('#item-collection-badge'),
            copyItemBtn: modalOverlay.querySelector('#copy-item-btn'),
            viewOnMapBtn: modalOverlay.querySelector('#view-on-map-btn')
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
        
        // View on Map button
        this.modal.viewOnMapBtn.addEventListener('click', () => {
            this.viewItemOnMap();
        });
    }
    
    /**
     * Show modal with item details
     * @param {Object} item - STAC item to display
     */
    showModal(item) {
        this.currentItem = item;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('stac-item-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Detect current theme
        const isDarkTheme = document.documentElement.classList.contains('dark-theme') || 
                           document.body.classList.contains('dark-theme') ||
                           document.querySelector('.dark-theme') !== null;
        
        
        // Theme-aware colors
        const themeColors = isDarkTheme ? {
            modalBg: '#1e1e1e',
            modalBorder: '#333333',
            textPrimary: '#ffffff',
            textSecondary: '#cccccc',
            textMuted: '#888888',
            borderColor: '#333333',
            headerBg: '#2a2a2a',
            footerBg: '#2a2a2a',
            buttonSecondaryBg: '#333333',
            buttonSecondaryText: '#ffffff',
            buttonSecondaryBorder: '#444444',
            buttonSecondaryHover: '#444444'
        } : {
            modalBg: '#ffffff',
            modalBorder: '#dddddd',
            textPrimary: '#1f2937',
            textSecondary: '#374151',
            textMuted: '#6b7280',
            borderColor: '#e5e7eb',
            headerBg: '#ffffff',
            footerBg: '#ffffff',
            buttonSecondaryBg: '#f3f4f6',
            buttonSecondaryText: '#374151',
            buttonSecondaryBorder: '#d1d5db',
            buttonSecondaryHover: '#e5e7eb'
        };
        
        // Create completely new modal overlay that bypasses all CSS
        const freshOverlay = document.createElement('div');
        freshOverlay.id = 'stac-item-modal';
        freshOverlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background: rgba(0, 0, 0, 0.6) !important;
            backdrop-filter: blur(4px) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 10000 !important;
            opacity: 1 !important;
            visibility: visible !important;
        `;
        
        // Create complete modal dialog structure with theme-aware inline styles
        const workingDialog = document.createElement('div');
        workingDialog.style.cssText = `
            background: ${themeColors.modalBg} !important;
            border: 1px solid ${themeColors.modalBorder} !important;
            border-radius: 12px !important;
            max-width: 900px !important;
            width: 90% !important;
            max-height: 80vh !important;
            position: relative !important;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5) !important;
            color: ${themeColors.textPrimary} !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            display: flex !important;
            flex-direction: column !important;
        `;
        
        // Create modal header
        const modalHeader = document.createElement('div');
        modalHeader.style.cssText = `
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 20px 24px !important;
            border-bottom: 1px solid ${themeColors.borderColor} !important;
            flex-shrink: 0 !important;
            background: ${themeColors.headerBg} !important;
            border-top-left-radius: 12px !important;
            border-top-right-radius: 12px !important;
        `;
        
        modalHeader.innerHTML = `
            <div style="display: flex; align-items: center; flex: 1;">
                <h3 style="margin: 0; display: flex; align-items: center; font-size: 18px; font-weight: 600; color: ${themeColors.textPrimary};">
                    <i class="material-icons" style="margin-right: 8px; color: #3b82f6;">dataset</i>
                    <span>${item.properties?.title || item.id}</span>
                </h3>
                <div style="
                    background: #e0e7ff; 
                    color: #3730a3; 
                    padding: 4px 12px; 
                    border-radius: 12px; 
                    font-size: 12px; 
                    font-weight: 500; 
                    margin-left: 16px;
                ">
                    ${item.collection || 'Unknown Collection'}
                </div>
            </div>
            <button id="fresh-modal-close" style="
                background: none !important;
                border: none !important;
                font-size: 24px !important;
                cursor: pointer !important;
                color: ${themeColors.textMuted} !important;
                width: 32px !important;
                height: 32px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 50% !important;
                transition: all 0.2s !important;
            ">
                <i class="material-icons">close</i>
            </button>
        `;
        
        // Create modal body
        const modalBody = document.createElement('div');
        modalBody.style.cssText = `
            flex: 1 !important;
            padding: 24px !important;
            overflow-y: auto !important;
            color: ${themeColors.textPrimary} !important;
            background: ${themeColors.modalBg} !important;
        `;
        
        // Create enhanced content with better organization - reusing the good structure
        const content = this.createEnhancedItemContent(item);
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = content;
        
        // Apply theme styles to content elements
        contentDiv.style.color = themeColors.textPrimary;
        
        // Update specific elements within the content to match theme
        const updateContentTheme = (element) => {
            // Update all text colors
            element.querySelectorAll('*').forEach(el => {
                const styles = window.getComputedStyle(el);
                if (styles.color === 'rgb(0, 0, 0)' || styles.color === 'black') {
                    el.style.color = themeColors.textPrimary;
                }
                if (styles.backgroundColor === 'rgb(255, 255, 255)' || styles.backgroundColor === 'white') {
                    el.style.backgroundColor = isDarkTheme ? '#2a2a2a' : 'white';
                }
                if (styles.borderColor === 'rgb(229, 231, 235)') {
                    el.style.borderColor = themeColors.borderColor;
                }
            });
        };
        
        setTimeout(() => updateContentTheme(contentDiv), 0);
        modalBody.appendChild(contentDiv);
        
        // Create modal footer
        const modalFooter = document.createElement('div');
        modalFooter.style.cssText = `
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 16px 24px !important;
            border-top: 1px solid ${themeColors.borderColor} !important;
            flex-shrink: 0 !important;
            background: ${themeColors.footerBg} !important;
            border-bottom-left-radius: 12px !important;
            border-bottom-right-radius: 12px !important;
        `;
        
        modalFooter.innerHTML = `
            <div>
                <button id="fresh-copy-btn" style="
                    background: ${themeColors.buttonSecondaryBg} !important;
                    color: ${themeColors.buttonSecondaryText} !important;
                    border: 1px solid ${themeColors.buttonSecondaryBorder} !important;
                    padding: 8px 16px !important;
                    border-radius: 6px !important;
                    cursor: pointer !important;
                    display: flex !important;
                    align-items: center !important;
                    font-size: 14px !important;
                    font-weight: 500 !important;
                    transition: all 0.2s !important;
                ">
                    <i class="material-icons" style="margin-right: 6px; font-size: 18px; color: ${themeColors.buttonSecondaryText};">content_copy</i>
                    Copy Item Info
                </button>
            </div>
            <div>
                <button id="fresh-close-btn" style="
                    background: #3b82f6 !important;
                    color: white !important;
                    border: none !important;
                    padding: 8px 16px !important;
                    border-radius: 6px !important;
                    cursor: pointer !important;
                    font-size: 14px !important;
                    font-weight: 500 !important;
                    transition: all 0.2s !important;
                ">
                    Close
                </button>
            </div>
        `;
        
        // Assemble the modal
        workingDialog.appendChild(modalHeader);
        workingDialog.appendChild(modalBody);
        workingDialog.appendChild(modalFooter);
        
        // Prevent clicks on the modal dialog from bubbling to overlay
        workingDialog.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        freshOverlay.appendChild(workingDialog);
        document.body.appendChild(freshOverlay);
        
        
        // Setup event listeners
        const closeBtn = document.getElementById('fresh-modal-close');
        const closeBtnFooter = document.getElementById('fresh-close-btn');
        const copyBtn = document.getElementById('fresh-copy-btn');
        
        const closeFreshModal = () => {
            const modal = document.getElementById('stac-item-modal');
            if (modal) {
                modal.remove();
            }
            document.removeEventListener('keydown', escapeHandler);
            this.currentItem = null;
        };
        
        closeBtn.addEventListener('click', closeFreshModal);
        closeBtnFooter.addEventListener('click', closeFreshModal);
        copyBtn.addEventListener('click', () => this.copyItemInfo());
        
        // Add theme-aware hover effects
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = isDarkTheme ? '#444444' : '#f3f4f6';
            closeBtn.style.color = themeColors.textPrimary;
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'none';
            closeBtn.style.color = themeColors.textMuted;
        });
        
        copyBtn.addEventListener('mouseenter', () => {
            copyBtn.style.background = themeColors.buttonSecondaryHover;
        });
        copyBtn.addEventListener('mouseleave', () => {
            copyBtn.style.background = themeColors.buttonSecondaryBg;
        });
        
        closeBtnFooter.addEventListener('mouseenter', () => {
            closeBtnFooter.style.background = '#2563eb';
        });
        closeBtnFooter.addEventListener('mouseleave', () => {
            closeBtnFooter.style.background = '#3b82f6';
        });
        
        // Overlay click to close
        freshOverlay.addEventListener('click', (e) => {
            if (e.target === freshOverlay) {
                closeFreshModal();
            }
        });
        
        // Store reference to close method
        this.closeFreshModal = closeFreshModal;
        
        // Setup tab switching for the modal body
        this.setupSimpleTabSwitching(modalBody);
        
        // Add keyboard listener for Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeFreshModal();
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
    }
    
    /**
     * Close the modal
     */
    closeModal() {
        this.modal.overlay.classList.remove('active');
        this.modal.overlay.style.display = 'none';
        this.modal.overlay.style.opacity = '0';
        this.modal.overlay.style.visibility = 'hidden';
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
                
                <!-- Simple Reliable Tabs -->
                <div class="simple-tabs">
                    <div class="tab-headers">
                        <button class="tab-header active" data-target="temporal-content">
                            <i class="material-icons">schedule</i> Temporal
                        </button>
                        <button class="tab-header" data-target="sensor-content">
                            <i class="material-icons">camera_alt</i> Sensor
                        </button>
                        ${qualityInfo ? `<button class="tab-header" data-target="quality-content">
                            <i class="material-icons">assessment</i> Quality
                        </button>` : ''}
                        <button class="tab-header" data-target="assets-content">
                            <i class="material-icons">storage</i> Assets (${Object.keys(item.assets || {}).length})
                        </button>
                        <button class="tab-header" data-target="properties-content">
                            <i class="material-icons">tune</i> Properties
                        </button>
                    </div>
                    <div class="tab-contents">
                        <div class="tab-content-pane active" id="temporal-content">
                            ${temporalInfo}
                        </div>
                        <div class="tab-content-pane" id="sensor-content">
                            ${sensorInfo}
                        </div>
                        ${qualityInfo ? `<div class="tab-content-pane" id="quality-content">
                            ${qualityInfo}
                        </div>` : ''}
                        <div class="tab-content-pane" id="assets-content">
                            ${assetInfo}
                        </div>
                        <div class="tab-content-pane" id="properties-content">
                            ${this.createPropertiesTab(item.properties || {})}
                        </div>
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
                    <div class="no-data">
                        <i class="material-icons">schedule</i>
                        <p>No temporal information available for this item.</p>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="tab-section">
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
                    <div class="no-data">
                        <i class="material-icons">camera_alt</i>
                        <p>No sensor or platform information available for this item.</p>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="tab-section">
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
     * Setup simple tab switching functionality
     */
    setupSimpleTabSwitching(content) {
        const tabHeaders = content.querySelectorAll('.tab-header');
        const tabPanes = content.querySelectorAll('.tab-content-pane');
        
        
        tabHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const targetId = header.getAttribute('data-target');
                
                // Remove active class from all headers and panes
                tabHeaders.forEach(h => h.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked header
                header.classList.add('active');
                
                // Add active class to target pane
                const targetPane = content.querySelector(`#${targetId}`);
                if (targetPane) {
                    targetPane.classList.add('active');
                } else {
                    console.error('❌ Target pane not found:', targetId);
                }
            });
        });
    }
    
    /**
     * Legacy tab switching functionality (kept for compatibility)
     */
    setupTabSwitching(content) {
        const tabButtons = content.querySelectorAll('.tab-btn');
        const tabPanes = content.querySelectorAll('.tab-pane');
        
        
        // Log all available panes
        tabPanes.forEach((pane, index) => {
        });
        
        tabButtons.forEach((button, index) => {
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
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
                    
                    // Scroll to top of tab content
                    targetPane.scrollTop = 0;
                } else {
                    console.error('❌ Target pane not found:', `#${tabId}-tab`);
                }
            });
        });
        
        // Ensure first tab is properly active
        if (tabButtons.length > 0 && tabPanes.length > 0) {
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
        
        // Dispatch event for satellite animation
        document.dispatchEvent(new CustomEvent('resultsUpdated', {
            detail: { count: items.length, items: items }
        }));
        
        // Render first page
        this.renderPage();
    }
    
    /**
     * Clear all results
     */
    clearResults() {
        // Clean up LazyImageLoader observers before clearing DOM
        const datasetList = document.getElementById('dataset-list');
        if (datasetList) {
            const existingImages = datasetList.querySelectorAll('img');
            if (existingImages.length > 0) {
                lazyImageLoader.unobserve(existingImages);
            }
        }
        
        this.items = [];
        this.currentPage = 1;
        this.totalPages = 1;
        
        // Update results count
        document.getElementById('results-count').textContent = '0';
        
        // Update pagination display
        document.getElementById('current-page').textContent = this.currentPage;
        document.getElementById('total-pages').textContent = this.totalPages;
        
        // Dispatch event for satellite animation
        document.dispatchEvent(new CustomEvent('resultsCleared'));
        
        // Clear the dataset list
        datasetList.innerHTML = '';
        
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
        
        // Initialize lazy loading for newly added images
        const newImages = datasetList.querySelectorAll('img.lazy-loading');
        if (newImages.length > 0) {
            lazyImageLoader.observe(newImages);
        }
        
        // Update pagination info
        document.getElementById('current-page').textContent = this.currentPage;
        
        // Enable/disable pagination buttons
        const prevBtn = document.querySelector('.pagination-prev');
        const nextBtn = document.querySelector('.pagination-next');
        
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === this.totalPages;
    }
    
    /**
     * Check if we should show collection ID in search results
     * @returns {boolean} True if collection ID should be shown
     */
    shouldShowCollectionInResults() {
        // Show collection ID when no specific collection is selected
        const collectionSelect = document.getElementById('collection-select');
        if (!collectionSelect) return true; // Default to showing if we can't determine
        
        // If "All datasets" is selected (empty value) or no specific collection, show collection ID
        return !collectionSelect.value || collectionSelect.value === '';
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
        
        // Helper function to check if URL is usable (not S3 scheme)
        const isUsableUrl = (url) => {
            return url && !url.startsWith('s3://') && (url.startsWith('http://') || url.startsWith('https://'));
        };
        
        // PRIORITY 1: Check for thumbnail sources with rendered_preview prioritized
        
        // PRIORITY 1a: Check links.thumbnail first (highest priority)
        if (item.links && Array.isArray(item.links)) {
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
        if (!hasThumbnail && item.links && Array.isArray(item.links)) {
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
            }
            // Add specific checks for Landsat assets
            else if (item.assets.visual && isUsableUrl(item.assets.visual.href)) {
                thumbnailUrl = item.assets.visual.href;
                hasThumbnail = true;
            } else if (item.assets.true_color && isUsableUrl(item.assets.true_color.href)) {
                thumbnailUrl = item.assets.true_color.href;
                hasThumbnail = true;
            }
            
            if (!hasThumbnail) {
            }
        }
        
        // PRIORITY 3: Generate TiTiler preview for collections that don't have thumbnails in links or assets
        if (!hasThumbnail) {
            if (item.collection === 'cop-dem-glo-30' || item.collection === 'cop-dem-glo-90') {
                thumbnailUrl = this.generateDEMThumbnailUrl(item);
                hasThumbnail = !!thumbnailUrl;
            } else if (item.collection && item.collection.includes('landsat')) {
                thumbnailUrl = this.generateLandsatThumbnailUrl(item);
                hasThumbnail = !!thumbnailUrl;
            }
        }
        
        // Get the date from the item - try multiple date fields
        let itemDate = 'Unknown date';
        if (item.properties) {
            if (item.properties.datetime) {
                itemDate = new Date(item.properties.datetime).toLocaleDateString();
            } else if (item.properties.start_datetime) {
                itemDate = new Date(item.properties.start_datetime).toLocaleDateString();
            } else if (item.properties.end_datetime) {
                itemDate = new Date(item.properties.end_datetime).toLocaleDateString();
            } else if (item.properties.date) {
                itemDate = new Date(item.properties.date).toLocaleDateString();
            }
        } else if (item.date) {
            itemDate = item.date;
        } else if (item.datetime) {
            itemDate = new Date(item.datetime).toLocaleDateString();
        }
        
        // Get cloud cover icon if available - try multiple cloud cover fields
        let cloudIcon = '';
        let cloudCover = null;
        if (item.properties) {
            if (item.properties['eo:cloud_cover'] !== undefined) {
                cloudCover = item.properties['eo:cloud_cover'];
            } else if (item.properties.cloud_cover !== undefined) {
                cloudCover = item.properties.cloud_cover;
            } else if (item.properties.cloudCover !== undefined) {
                cloudCover = item.properties.cloudCover;
            } else if (item.properties['landsat:cloud_cover_land'] !== undefined) {
                cloudCover = item.properties['landsat:cloud_cover_land'];
            }
        }
        
        if (cloudCover !== null) {
            const cloudCoverRounded = Math.round(cloudCover, 0);
                        
            if (cloudCoverRounded > 75) {
                cloudIcon = ' • ☁️ ' + cloudCoverRounded + '%'; // Very cloudy
            } else if (cloudCoverRounded > 50) {
                cloudIcon = ' • 🌥️ ' + cloudCoverRounded + '%'; // Mostly cloudy
            } else if (cloudCoverRounded > 25) {
                cloudIcon = ' • ⛅ ' + cloudCoverRounded + '%'; // Partly cloudy
            } else if (cloudCoverRounded > 5) {
                cloudIcon = ' • 🌤️ ' + cloudCoverRounded + '%'; // Mostly sunny
            } else {
                cloudIcon = ' • ☀️ ' + cloudCoverRounded + '%'; // Sunny
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
        
        // Check if we should show collection ID (when no specific collection is selected)
        const shouldShowCollection = this.shouldShowCollectionInResults();
        
        // Prepare collection display for bottom layer
        let collectionBottomLayer = '';
        if (shouldShowCollection && collectionId !== 'Unknown') {
            collectionBottomLayer = `
                <div class="dataset-metadata bottom-left" style="
                    position: absolute;
                    bottom: 8px;
                    left: 8px;
                    z-index: 10;
                ">
                    <div class="dataset-collection">
                        <span class="collection-id" style="
                            background: rgba(59, 130, 246, 0.9);
                            color: white;
                            padding: 3px 8px;
                            border-radius: 4px;
                            font-size: 0.7rem;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
                        ">${collectionId}</span>
                    </div>
                </div>
            `;
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
                        <img data-src="${thumbnailUrl}" alt="Dataset thumbnail" class="dataset-thumbnail lazy-loading">
                        ${collectionBottomLayer}
                        <div class="thumbnail-overlay">
                            <button class="info-btn details-btn" title="Show details">
                                <i class="material-icons">info</i>
                            </button>
                            <button class="info-btn viz-btn" title="High Resolution Preview">
                                <i class="material-icons">visibility</i>
                            </button>
                            <button class="info-btn center-map-btn" title="Center map on this item">
                                <i class="material-icons">my_location</i>
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
                            <button class="info-btn center-map-btn" title="Center map on this item">
                                <i class="material-icons">my_location</i>
                            </button>
                        </div>
                        <div class="dataset-title">${title}</div>
                        ${shouldShowCollection && collectionId !== 'Unknown' ? `
                            <div class="dataset-collection-no-thumb" style="margin-top: 8px;">
                                <span class="collection-id" style="
                                    background: rgba(59, 130, 246, 0.9);
                                    color: white;
                                    padding: 3px 8px;
                                    border-radius: 4px;
                                    font-size: 0.7rem;
                                    font-weight: 600;
                                    text-transform: uppercase;
                                    letter-spacing: 0.5px;
                                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
                                ">${collectionId}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        // Handle thumbnail error (if exists) - must be done before attachItemEventListeners
        const thumbnail = li.querySelector('.dataset-thumbnail');
        if (thumbnail) {
            thumbnail.onerror = () => {
                
                // Replace the entire card content with no-thumbnail layout
                const clickableCard = li.querySelector('.clickable-card');
                if (clickableCard) {
                    clickableCard.innerHTML = `
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
                                <button class="info-btn center-map-btn" title="Center map on this item">
                                    <i class="material-icons">my_location</i>
                                </button>
                            </div>
                            <div class="dataset-title">${title}</div>
                            ${shouldShowCollection && collectionId !== 'Unknown' ? `
                                <div class="dataset-collection-no-thumb" style="margin-top: 8px;">
                                    <span class="collection-id" style="
                                        background: rgba(59, 130, 246, 0.9);
                                        color: white;
                                        padding: 3px 8px;
                                        border-radius: 4px;
                                        font-size: 0.7rem;
                                        font-weight: 600;
                                        text-transform: uppercase;
                                        letter-spacing: 0.5px;
                                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
                                    ">${collectionId}</span>
                                </div>
                            ` : ''}
                        </div>
                    `;
                    
                    // Add the no-thumbnail class
                    clickableCard.classList.add('no-thumbnail');
                    
                    // Attach event listeners to the new buttons
                    const newDetailsBtn = clickableCard.querySelector('.details-btn');
                    const newVizBtn = clickableCard.querySelector('.viz-btn');
                    
                    if (newDetailsBtn) {
                        newDetailsBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.showModal(item);
                        });
                    }
                    
                    if (newVizBtn) {
                        newVizBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.showVisualizationPanel(item);
                        });
                    }
                    
                    // Add click handler to the entire card
                    clickableCard.addEventListener('click', (e) => {
                        // Don't trigger if clicking on a button
                        if (e.target.closest('.details-btn') || e.target.closest('.viz-btn')) {
                            return;
                        }
                        
                        
                        // Show loading indicator
                        document.getElementById('loading').style.display = 'flex';
                        
                        // Mark the item as active
                        document.querySelectorAll('.dataset-item').forEach(el => {
                            el.classList.remove('active');
                        });
                        li.classList.add('active');
                        
                        // Use the new method that dispatches itemActivated event
                        this.displayItemWithEvent(item, null);
                        
                        // Hide loading indicator after a short delay
                        setTimeout(() => {
                            document.getElementById('loading').style.display = 'none';
                        }, 500);
                    });
                }
            };
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
        const centerMapBtn = element.querySelector('.center-map-btn');
        const thumbnail = element.querySelector('.dataset-thumbnail');
        
        // Function to handle map display with loading indicator
        const displayOnMap = () => {
            // Show loading indicator
            document.getElementById('loading').style.display = 'flex';
            
            // Display item on map using best available preview asset
            setTimeout(() => {
                this.mapManager.displayItemOnMap(item, null, true)
                    .then(() => {
                        // Mark the item as active
                        document.querySelectorAll('.dataset-item').forEach(el => {
                            el.classList.remove('active');
                        });
                        element.classList.add('active');
                        
                        // Dispatch item activated event with catalog and collection context
                        const catalogId = this.getCurrentCatalogId();
                        const collectionId = this.getCurrentCollectionId();
                        
                        document.dispatchEvent(new CustomEvent('itemActivated', {
                            detail: { 
                                itemId: item.id,
                                assetKey: 'thumbnail',
                                item: item,
                                catalogId: catalogId,
                                collectionId: collectionId
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
        
        // Track if item was clicked to disable hover zoom
        let itemWasClicked = false;
        
        // Add click handler to the entire card for permanent display
        if (clickableCard) {
            clickableCard.addEventListener('click', (e) => {
                // Don't trigger if clicking on button controls
                if (e.target.closest('.details-btn') || e.target.closest('.viz-btn') || e.target.closest('.center-map-btn')) {
                    return;
                }
                
                // Clear any hover preview state
                this.clearHoverState();
                itemWasClicked = true;
                
                // Display item permanently on map (no zoom/pan, just display the image)
                displayOnMap();
            });
            
            // Add mouseenter handler for hover-to-zoom preview
            clickableCard.addEventListener('mouseenter', () => {
                // Visual hover effect
                clickableCard.style.transform = 'translateY(-2px)';
                clickableCard.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                
                // Skip hover zoom if item was clicked (permanent display mode)
                if (itemWasClicked) {
                    return;
                }
                
                // Clear any existing timeouts
                if (this.hoverTimeout) {
                    clearTimeout(this.hoverTimeout);
                }
                if (this.restoreTimeout) {
                    clearTimeout(this.restoreTimeout);
                }
                
                // Skip hover preview if center-map button is active for any item
                if (this.centeredItem) {
                    return;
                }
                
                // Small delay to prevent rapid firing on mouse movement
                this.hoverTimeout = setTimeout(async () => {
                    // Double-check that item wasn't clicked during timeout
                    if (itemWasClicked) {
                        return;
                    }
                    
                    // Check if map is available before proceeding
                    if (!this.mapManager) {
                        console.warn('⚠️ MapManager not available for hover preview, skipping zoom');
                        return;
                    }
                    
                    const map = this.mapManager.getMap();
                    if (!map) {
                        console.warn('⚠️ Map not initialized for hover preview, skipping zoom', {
                            mapManager: !!this.mapManager,
                            mapFromGetMap: !!map,
                            hasIsMapReady: typeof this.mapManager?.isMapReady === 'function',
                            hasGetMap: typeof this.mapManager?.getMap === 'function'
                        });
                        return;
                    }
                    
                    // Check if map is ready using the mapManager's method
                    if (typeof this.mapManager.isMapReady === 'function' && !this.mapManager.isMapReady()) {
                        console.warn('⚠️ Map not ready for hover preview, waiting...', {
                            mapReady: this.mapManager.isMapReady()
                        });
                        
                        // Wait a bit more for map to be ready
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        // Check again
                        if (!this.mapManager.isMapReady()) {
                            console.warn('⚠️ Map still not ready after waiting, skipping hover preview');
                            return;
                        }
                        
                        // Double-check that item wasn't clicked during wait
                        if (itemWasClicked) {
                            return;
                        }
                    }
                    
                    // Save current map view if not already saved or if different item
                    if (!this.savedMapView || this.currentHoveredItem !== item.id) {
                        const saved = this.saveMapView();
                        if (!saved) {
                            console.warn('⚠️ Failed to save map view, skipping hover preview');
                            return;
                        }
                        this.currentHoveredItem = item.id;
                    }
                    
                    // Zoom to item bbox for preview
                    const zoomed = this.zoomToItemBbox(item);
                    if (!zoomed) {
                        console.warn('⚠️ Failed to zoom to item, skipping hover preview');
                        return;
                    }
                    
                    // Add visual feedback to indicate hover preview mode
                    clickableCard.classList.add('hover-preview-active');
                    
                    console.log('✅ Hover preview activated for item:', item.id);
                    
                }, 300); // 300ms delay to prevent rapid triggering
            });
            
            // Add mouseleave handler to restore view when mouse leaves
            clickableCard.addEventListener('mouseleave', (e) => {
                // Visual hover effect reset
                clickableCard.style.transform = '';
                clickableCard.style.boxShadow = '';
                
                // Don't restore view if item was clicked (permanent display mode)
                if (itemWasClicked) {
                    return;
                }
                
                // Clear hover timeout if mouse leaves quickly
                if (this.hoverTimeout) {
                    clearTimeout(this.hoverTimeout);
                    this.hoverTimeout = null;
                }
                
                // Clear any existing restore timeout
                if (this.restoreTimeout) {
                    clearTimeout(this.restoreTimeout);
                    this.restoreTimeout = null;
                }
                
                // Remove visual feedback immediately
                clickableCard.classList.remove('hover-preview-active');
                
                // Only restore if we actually have a saved view and this was the active item
                // AND center-map button is not active AND item wasn't clicked
                if (this.savedMapView && this.currentHoveredItem === item.id && !this.centeredItem && !itemWasClicked) {
                    
                    // Restore view with slight delay
                    this.restoreTimeout = setTimeout(() => {
                        const restored = this.restoreMapView();
                        this.removeBboxFromMap();
                        
                        if (restored) {
                            this.currentHoveredItem = null;
                        }
                    }, 300); // 300ms delay to allow smooth transitions
                }
            });
        }
        
        
        // Add event listener to info/details button (stops propagation)
        if (detailsBtn) {
            detailsBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click
                this.showModal(item);
            });
        }

        // Add event listener to visualization button
        if (vizBtn) {
            vizBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click
                this.showVisualizationPanel(item);
            });
        }

        // Add event listener to center map button
        if (centerMapBtn) {
            centerMapBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click
                this.centerMapOnItem(item, element);
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

    /**
     * Center map on item with toggle functionality
     * @param {Object} item - STAC item to center on
     * @param {HTMLElement} element - The item card element
     */
    async centerMapOnItem(item, element) {
        try {
            if (!this.mapManager || !this.mapManager.isMapReady()) {
                this.notificationService?.showNotification('Map not available', 'warning');
                return;
            }

            const centerMapBtn = element.querySelector('.center-map-btn');
            const isCurrentlyCentered = this.centeredItem && this.centeredItem.id === item.id;

            if (isCurrentlyCentered) {
                // Toggle OFF - restore previous view
                
                // Update button appearance
                centerMapBtn.classList.remove('active');
                centerMapBtn.title = 'Center map on this item';
                
                // Restore previous view if saved
                if (this.previousMapView) {
                    const map = this.mapManager.getMap();
                    map.setCenter(this.previousMapView.center);
                    map.setZoom(this.previousMapView.zoom);
                    map.setBearing(this.previousMapView.bearing || 0);
                    map.setPitch(this.previousMapView.pitch || 0);
                }
                
                // Clear centered state
                this.centeredItem = null;
                this.previousMapView = null;
                
                // Clear hover-related state to prevent conflicts
                this.savedMapView = null;
                this.currentHoveredItem = null;
                
                // Remove active state from all items
                document.querySelectorAll('.dataset-item').forEach(el => {
                    el.classList.remove('map-centered');
                });
                
                this.notificationService?.showNotification('Map view restored', 'info');
                
            } else {
                // Toggle ON - center on item
                
                // Save current view before centering (only if not already saved)
                if (!this.centeredItem) {
                    const map = this.mapManager.getMap();
                    this.previousMapView = {
                        center: map.getCenter(),
                        zoom: map.getZoom(),
                        bearing: map.getBearing(),
                        pitch: map.getPitch()
                    };
                }
                
                // Clear hover-related state to prevent conflicts
                this.clearHoverState();
                
                // Get item bounding box and center map
                const bbox = this.mapManager.mapLayers.getBoundingBox(item);
                if (bbox) {
                    // Use fitBounds to center on the item
                    this.mapManager.getMap().fitBounds(
                        [[bbox[0], bbox[1]], [bbox[2], bbox[3]]], 
                        { 
                            padding: 50,
                            maxZoom: 12 
                        }
                    );
                } else {
                    this.notificationService?.showNotification('Unable to determine item location', 'warning');
                    return;
                }
                
                // Update button states - remove active from all, add to current
                document.querySelectorAll('.center-map-btn').forEach(btn => {
                    btn.classList.remove('active');
                    btn.title = 'Center map on this item';
                });
                document.querySelectorAll('.dataset-item').forEach(el => {
                    el.classList.remove('map-centered');
                });
                
                // Set current button as active
                centerMapBtn.classList.add('active');
                centerMapBtn.title = 'Restore previous view';
                element.classList.add('map-centered');
                
                // Update centered state
                this.centeredItem = item;
                
                this.notificationService?.showNotification(
                    `Centered map on ${item.properties?.title || item.id}`, 
                    'success'
                );
            }
            
        } catch (error) {
            console.error('❌ Error centering map on item:', error);
            this.notificationService?.showNotification(
                'Error centering map on item', 
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
     * View current item on map by navigating to viewer URL
     */
    async viewItemOnMap() {
        try {
            if (!this.currentItem) {
                console.warn('No current item to display on map');
                return;
            }

            
            // Get current URL and replace /browser/ with /viewer/
            const currentUrl = window.location.href;
            const viewerUrl = currentUrl.replace('/browser/', '/viewer/');
            
            
            // Navigate to the viewer URL
            window.location.href = viewerUrl;
            
        } catch (error) {
            console.error('❌ Error navigating to viewer:', error);
            this.notificationService.showNotification(
                'Failed to navigate to viewer', 
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
                return null;
            }

            const assetUrl = item.assets.data.href;

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
                    return pcUrl;
                }
            } else {
                // For non-PC DEM data (like Element84), we can't generate thumbnails
                // because public TiTiler instances don't have access to private S3 buckets
                return null;
            }

            return null;

        } catch (error) {
            console.error('❌ [DEM-THUMB] Error generating DEM thumbnail:', error);
            return null;
        }
    }

    /**
     * Generate a thumbnail URL for Landsat items using TiTiler
     * @param {Object} item - STAC item
     * @returns {string|null} Thumbnail URL or null if not possible
     */
    generateLandsatThumbnailUrl(item) {
        try {
            // Check if item has red, green, blue assets for true color composite
            if (!item.assets) {
                return null;
            }

            // Look for common Landsat asset names
            const redAsset = item.assets.red || item.assets.B04 || item.assets.SR_B4;
            const greenAsset = item.assets.green || item.assets.B03 || item.assets.SR_B3;
            const blueAsset = item.assets.blue || item.assets.B02 || item.assets.SR_B2;

            if (!redAsset || !greenAsset || !blueAsset) {
                return null;
            }


            // Use Element84's TiTiler for Element84 hosted Landsat data
            const assetUrl = redAsset.href;
            if (assetUrl && assetUrl.includes('amazonaws.com')) {
                const bbox = item.bbox || this.extractBboxFromGeometry(item.geometry);
                if (bbox) {
                    // Use Element84's TiTiler instance
                    const params = new URLSearchParams();
                    params.set('assets', 'red,green,blue');
                    params.set('width', '256');
                    params.set('height', '256');
                    params.set('rescale', '0,30000');
                    
                    const tiTilerUrl = `https://titiler.xyz/stac/preview?url=${encodeURIComponent(item.links?.find(l => l.rel === 'self')?.href || '')}&${params.toString()}&bbox=${bbox.join(',')}`;
                    return tiTilerUrl;
                }
            }

            return null;

        } catch (error) {
            console.error('❌ [LANDSAT-THUMB] Error generating Landsat thumbnail:', error);
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
    
    /**
     * Save current map view state
     */
    saveMapView() {
        if (!this.mapManager) {
            console.warn('⚠️ Cannot save map view - mapManager not available');
            return false;
        }
        
        const map = this.mapManager.getMap();
        if (!map) {
            console.warn('⚠️ Cannot save map view - map not available');
            return false;
        }
        
        // Check if map is ready
        if (typeof this.mapManager.isMapReady === 'function' && !this.mapManager.isMapReady()) {
            console.warn('⚠️ Cannot save map view - map not ready');
            return false;
        }
        
        try {
            
            const center = map.getCenter();
            const zoom = map.getZoom();
            
            this.savedMapView = {
                center: center,
                zoom: zoom,
                lat: center.lat,
                lng: center.lng,
                mapType: map.constructor.name
            };
            
            return true;
            
        } catch (error) {
            console.error('❌ Error saving map view:', error);
            return false;
        }
    }
    
    /**
     * Restore saved map view state
     */
    restoreMapView() {
        
        if (!this.mapManager) {
            console.warn('⚠️ Cannot restore map view - mapManager not available');
            return false;
        }
        
        const map = this.mapManager.getMap();
        if (!map) {
            console.warn('⚠️ Cannot restore map view - map not available');
            return false;
        }
        
        if (!this.savedMapView) {
            console.warn('⚠️ No saved map view to restore');
            return false;
        }
        
        try {
            const currentCenter = map.getCenter();
            const currentZoom = map.getZoom();
            
            
            
            // Detect map type and use appropriate API
            
            let restored = false;
            
            // Try different restoration methods based on available APIs
            if (typeof map.flyTo === 'function') {
                // MapLibre GL JS API
                map.flyTo({
                    center: [this.savedMapView.lng, this.savedMapView.lat], // MapLibre uses [lng, lat]
                    zoom: this.savedMapView.zoom,
                    duration: 600 // Duration in milliseconds for MapLibre
                });
                restored = true;
                
            } else if (typeof map.jumpTo === 'function') {
                // MapLibre instant jump (no animation)
                map.jumpTo({
                    center: [this.savedMapView.lng, this.savedMapView.lat], // MapLibre uses [lng, lat]
                    zoom: this.savedMapView.zoom
                });
                restored = true;
                
            } else if (typeof map.setCenter === 'function' && typeof map.setZoom === 'function') {
                // Split center and zoom for MapLibre
                map.setCenter([this.savedMapView.lng, this.savedMapView.lat]);
                map.setZoom(this.savedMapView.zoom);
                restored = true;
                
            } else if (typeof map.setView === 'function') {
                // Standard Leaflet API (fallback)
                map.setView([this.savedMapView.lat, this.savedMapView.lng], this.savedMapView.zoom, {
                    animate: true,
                    duration: 0.6
                });
                restored = true;
                
            } else if (typeof map.panTo === 'function' && typeof map.setZoom === 'function') {
                // Split pan and zoom (Leaflet fallback)
                map.panTo([this.savedMapView.lat, this.savedMapView.lng]);
                map.setZoom(this.savedMapView.zoom);
                restored = true;
                
            } else if (this.mapManager.fitToBounds) {
                // Use MapManager's fitToBounds as fallback
                const buffer = 0.001; // Small buffer around the point
                this.mapManager.fitToBounds([
                    this.savedMapView.lng - buffer,
                    this.savedMapView.lat - buffer,
                    this.savedMapView.lng + buffer,
                    this.savedMapView.lat + buffer
                ]);
                restored = true;
                
            } else {
                console.error('❌ No compatible map restoration API found');
                return false;
            }
            
            if (restored) {
                
                // Verify the restore worked after animation
                setTimeout(() => {
                    try {
                        const newCenter = map.getCenter();
                        const newZoom = map.getZoom();
                    } catch (e) {
                    }
                }, 700);
            }
            
            return restored;
            
        } catch (error) {
            console.error('❌ Error restoring map view:', error);
            return false;
        }
    }
    
    /**
     * Zoom to item's bounding box with smooth animation
     * @param {Object} item - STAC item with bbox or geometry
     */
    zoomToItemBbox(item) {
        
        if (!this.mapManager) {
            console.warn('⚠️ Cannot zoom - mapManager not available');
            return false;
        }
        
        const map = this.mapManager.getMap();
        if (!map) {
            console.warn('⚠️ Cannot zoom - map not available');
            return false;
        }
        
        // Check if map is ready
        if (typeof this.mapManager.isMapReady === 'function' && !this.mapManager.isMapReady()) {
            console.warn('⚠️ Cannot zoom - map not ready');
            return false;
        }
        
        // Get bbox from item
        let bbox = item.bbox;
        if (!bbox && item.geometry) {
            bbox = this.extractBboxFromGeometry(item.geometry);
        }
        
        if (bbox && bbox.length >= 4) {
            const [west, south, east, north] = bbox;
            
            // Add visual indicator on map for the bbox first
            this.showBboxOnMap(bbox);
            
            // Then fit map to bbox with padding
            try {
                
                if (typeof map.fitBounds === 'function') {
                    // Check if it's MapLibre (uses [lng, lat] order)
                    if (typeof map.addSource === 'function') {
                        map.fitBounds(
                            [west, south, east, north], // MapLibre uses [west, south, east, north]
                            { 
                                padding: 40,
                                maxZoom: 14,
                                duration: 400 // milliseconds for MapLibre
                            }
                        );
                    } else {
                        map.fitBounds(
                            [[south, west], [north, east]], // Leaflet uses [[lat, lng], [lat, lng]]
                            { 
                                padding: 40,
                                maxZoom: 14,
                                animate: true,
                                duration: 0.4
                            }
                        );
                    }
                } else if (this.mapManager.fitToBounds) {
                    this.mapManager.fitToBounds([west, south, east, north]);
                } else {
                    console.warn('⚠️ No fitBounds method available');
                }
                
            } catch (error) {
                console.error('❌ Error fitting map to bbox:', error);
            }
        } else {
            console.warn('⚠️ No valid bbox available for item:', item.id, {
                hasBbox: !!item.bbox,
                hasGeometry: !!item.geometry,
                bbox: bbox
            });
            return false;
        }
        
        return true;
    }
    
    /**
     * Show bounding box rectangle on map
     * @param {Array} bbox - [west, south, east, north]
     */
    showBboxOnMap(bbox) {
        
        // Check if map manager is available
        if (!this.mapManager) {
            console.warn('⚠️ Map manager not available');
            return;
        }
        
        const map = this.mapManager.getMap();
        if (!map) {
            console.warn('⚠️ Map not available');
            return;
        }
        
        // Remove existing bbox layer
        this.removeBboxFromMap();
        
        const [west, south, east, north] = bbox;
        
        try {
            // Check if this is MapLibre (has addSource method)
            if (typeof map.addSource === 'function' && typeof map.addLayer === 'function') {
                
                // Create unique source ID
                const sourceId = `bbox-source-${Date.now()}`;
                const layerId = `bbox-layer-${Date.now()}`;
                
                // Create GeoJSON for the bbox rectangle
                const bboxGeoJSON = {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            [west, south],
                            [east, south],
                            [east, north],
                            [west, north],
                            [west, south]
                        ]]
                    },
                    properties: {}
                };
                
                // Add source
                map.addSource(sourceId, {
                    type: 'geojson',
                    data: bboxGeoJSON
                });
                
                // Add layer for stroke
                map.addLayer({
                    id: layerId,
                    type: 'line',
                    source: sourceId,
                    paint: {
                        'line-color': '#667eea',
                        'line-width': 3,
                        'line-opacity': 0.8,
                        'line-dasharray': [5, 5]
                    }
                });
                
                // Add layer for fill
                map.addLayer({
                    id: layerId + '-fill',
                    type: 'fill',
                    source: sourceId,
                    paint: {
                        'fill-color': '#667eea',
                        'fill-opacity': 0.1
                    }
                });
                
                // Store layer info for removal
                this.currentBboxLayer = {
                    sourceId: sourceId,
                    layerId: layerId,
                    fillLayerId: layerId + '-fill',
                    mapType: 'maplibre'
                };
                
                
            } else if (window.L) {
                
                // Create bounds in [lat, lng] format for Leaflet
                const bounds = [[south, west], [north, east]];
                
                // Create a rectangle overlay
                this.currentBboxLayer = window.L.rectangle(bounds, {
                    color: '#667eea',
                    weight: 3,
                    fillColor: '#667eea',
                    fillOpacity: 0.2,
                    opacity: 0.8,
                    dashArray: '5, 5',
                    className: 'item-bbox-highlight',
                    mapType: 'leaflet'
                });
                
                this.currentBboxLayer.addTo(map);
                this.currentBboxLayer.bringToFront();
                
                
            } else {
                console.warn('⚠️ No supported mapping library found for bbox display');
            }
            
        } catch (error) {
            console.error('❌ Error creating bbox rectangle:', error);
        }
    }
    
    /**
     * Remove bbox rectangle from map
     */
    removeBboxFromMap() {
        if (!this.currentBboxLayer) {
            return;
        }
        
        if (!this.mapManager) {
            console.warn('⚠️ Cannot remove bbox - mapManager not available');
            return;
        }
        
        const map = this.mapManager.getMap();
        if (!map) {
            console.warn('⚠️ Cannot remove bbox - map not available');
            return;
        }
        
        try {
            // Handle MapLibre layers
            if (this.currentBboxLayer.mapType === 'maplibre') {
                
                // Remove layers first
                if (map.getLayer(this.currentBboxLayer.layerId)) {
                    map.removeLayer(this.currentBboxLayer.layerId);
                }
                if (map.getLayer(this.currentBboxLayer.fillLayerId)) {
                    map.removeLayer(this.currentBboxLayer.fillLayerId);
                }
                
                // Remove source
                if (map.getSource(this.currentBboxLayer.sourceId)) {
                    map.removeSource(this.currentBboxLayer.sourceId);
                }
                
                
            } else {
                // Handle Leaflet layers
                map.removeLayer(this.currentBboxLayer);
            }
            
            this.currentBboxLayer = null;
            
        } catch (error) {
            console.error('❌ Error removing bbox rectangle:', error);
            // Still reset the reference
            this.currentBboxLayer = null;
        }
    }
    
    /**
     * Clear all hover-related timeouts and reset state (for debugging)
     */
    clearHoverState() {
        
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }
        
        if (this.restoreTimeout) {
            clearTimeout(this.restoreTimeout);
            this.restoreTimeout = null;
        }
        
        this.removeBboxFromMap();
        this.currentHoveredItem = null;
        this.savedMapView = null;
        
        // Remove visual feedback from all cards
        document.querySelectorAll('.map-preview-active').forEach(card => {
            card.classList.remove('map-preview-active');
        });
        
        document.querySelectorAll('.hover-preview-active').forEach(card => {
            card.classList.remove('hover-preview-active');
        });
        
    }
    
    /**
     * Show brief instruction tooltip for hover preview mode
     * @param {HTMLElement} card - The card element to show instruction on
     */
    showHoverPreviewInstructions(card) {
        try {
            // Remove any existing instruction tooltips
            document.querySelectorAll('.hover-preview-instruction').forEach(el => el.remove());
            
            // Create instruction tooltip
            const instruction = document.createElement('div');
            instruction.className = 'hover-preview-instruction';
            instruction.innerHTML = `
                <div style="
                    position: absolute;
                    top: -40px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0,0,0,0.8);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    white-space: nowrap;
                    z-index: 1000;
                    pointer-events: none;
                    animation: fadeInOut 2.5s ease-out forwards;
                ">
                    Move mouse away to restore view
                </div>
            `;
            
            // Add CSS animation if not already present
            if (!document.querySelector('#hover-preview-styles')) {
                const style = document.createElement('style');
                style.id = 'hover-preview-styles';
                style.textContent = `
                    @keyframes fadeInOut {
                        0% { opacity: 0; transform: translateX(-50%) translateY(5px); }
                        20% { opacity: 1; transform: translateX(-50%) translateY(0px); }
                        80% { opacity: 1; transform: translateX(-50%) translateY(0px); }
                        100% { opacity: 0; transform: translateX(-50%) translateY(-5px); }
                    }
                    
                    .hover-preview-active {
                        border: 2px solid #667eea !important;
                        box-shadow: 0 0 15px rgba(102, 126, 234, 0.3) !important;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Position relative to card
            card.style.position = 'relative';
            card.appendChild(instruction);
            
            // Auto-remove after animation
            setTimeout(() => {
                if (instruction.parentNode) {
                    instruction.remove();
                }
            }, 2500);
            
        } catch (error) {
            console.error('❌ Error showing click preview instructions:', error);
        }
    }
    
    /**
     * Force restore map view (for debugging)
     */
    forceRestoreMapView() {
        this.clearHoverState();
        if (this.savedMapView) {
            this.restoreMapView();
        } else {
        }
    }
    
    /**
     * Get current catalog ID from the API client or state
     */
    getCurrentCatalogId() {
        try {
            // Try to get from API client endpoints
            if (this.apiClient && this.apiClient.endpoints) {
                const currentEndpoint = this.apiClient.endpoints.root;
                
                // Map endpoints to catalog IDs
                const endpointMappings = {
                    'https://planetarycomputer.microsoft.com/api/stac/v1': 'microsoft-pc',
                    'https://earth-search.aws.element84.com/v1': 'earth-search-aws',
                    'https://stac.dataspace.copernicus.eu/v1': 'cdse-stac'
                };
                
                const catalogId = endpointMappings[currentEndpoint];
                if (catalogId) {
                    return catalogId;
                }
            }
            
            // Try to get from global state manager if available
            if (window.stacExplorer?.stateManager?.getCurrentCatalogId) {
                const catalogId = window.stacExplorer.stateManager.getCurrentCatalogId();
                if (catalogId) {
                    return catalogId;
                }
            }
            
            return null;
        } catch (error) {
            console.warn('📍 Error getting current catalog ID:', error);
            return null;
        }
    }
    
    /**
     * Get current collection ID from the UI state
     */
    getCurrentCollectionId() {
        try {
            // Try to get from collection selector
            const collectionSelect = document.getElementById('collection-select');
            if (collectionSelect && collectionSelect.value) {
                return collectionSelect.value;
            }
            
            // Try to get from global state manager if available
            if (window.stacExplorer?.stateManager?.getCurrentCollectionId) {
                const collectionId = window.stacExplorer.stateManager.getCurrentCollectionId();
                if (collectionId) {
                    return collectionId;
                }
            }
            
            return null;
        } catch (error) {
            console.warn('📍 Error getting current collection ID:', error);
            return null;
        }
    }
    
    /**
     * Display item with proper itemActivated event dispatch
     */
    displayItemWithEvent(item, assetKey = null) {
        
        // Get current catalog and collection context
        const catalogId = this.getCurrentCatalogId();
        const collectionId = this.getCurrentCollectionId();
        
        
        // Dispatch itemActivated event with proper context
        document.dispatchEvent(new CustomEvent('itemActivated', {
            detail: { 
                itemId: item.id, 
                assetKey: assetKey,
                item: item,
                catalogId: catalogId,
                collectionId: collectionId
            }
        }));
    }
    
    /**
     * Handle item activated event to display single item in results panel
     * @param {CustomEvent} event - The itemActivated event
     */
    handleItemActivated(event) {
        const { item } = event.detail;
        if (item) {
            // Display the single item in the results panel
            this.setItems([item]);
            this.renderPage();
        }
    }
    
}