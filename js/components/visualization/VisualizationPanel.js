/**
 * VisualizationPanel.js - Interactive UI for STAC raster visualization
 * 
 * Provides a beautiful, intuitive interface for users to:
 * - Select band combinations (RGB, NDVI, monochrome, etc.)
 * - Adjust opacity and blend modes
 * - Preview different visualizations
 * - Manage multiple layers
 */

import { defaultBandEngine } from './BandCombinationEngine.js';

export class VisualizationPanel {
    constructor(container, rasterManager, bandEngine = defaultBandEngine, notificationService = null) {
        this.container = container;
        this.rasterManager = rasterManager;
        this.bandEngine = bandEngine;
        this.notificationService = notificationService;
        
        // Current state
        this.currentItem = null;
        this.currentLayerId = null;
        this.currentPreset = 'true-color';
        this.isVisible = false;
        
        // UI elements (will be populated during render)
        this.elements = {};
        
        // Loading states
        this.isLoading = false;
        
        // Debounce timer for scale inputs
        this.scaleDebounceTimer = null;
        
        this.init();
    }

    init() {
        // Add base classes to container
        this.container.className = 'visualization-panel';
        
        // Listen for raster visualization events
        this.setupEventListeners();
        
        console.log('🎨 VisualizationPanel initialized');
    }

    /**
     * Show the visualization panel for a STAC item
     * @param {Object} stacItem - STAC item to visualize
     * @param {Object} options - Display options
     */
    async show(stacItem, options = {}) {
        this.currentItem = stacItem;
        this.currentPreset = options.defaultPreset || null; // Don't auto-select
        
        try {
            this.render();
            this.container.classList.add('active');
            this.isVisible = true;
            
            // Don't auto-load - let user choose first
            console.log(`🎨 Visualization panel shown for ${stacItem.id} - ready for user selection`);
            
        } catch (error) {
            console.error('❌ Error showing visualization panel:', error);
            this.showError('Failed to load visualization panel');
        }
    }

    /**
     * Hide the visualization panel
     */
    hide() {
        this.container.classList.remove('active');
        this.isVisible = false;
        
        // Show thumbnails again when visualization panel is closed
        this.showThumbnailsForAllItems();
        
        // Keep the high resolution preview layer visible on map
        // Don't remove the layer when hiding the panel
        
        // Clear any pending scale updates
        this.clearScaleDebounce();
        
        console.log('🎨 Visualization panel hidden - preserving layer on map');
    }

    /**
     * Render the complete UI
     */
    render() {
        if (!this.currentItem) return;

        const allPresets = this.bandEngine.getPresetsForCollection(this.currentItem.collection);
        const presets = this.filterAvailablePresets(allPresets);
        const assetAnalysis = this.bandEngine.analyzeAssets(this.currentItem);
        
        this.container.innerHTML = `
            <div class="viz-panel-content">
                ${this.renderHeader()}
                ${this.renderItemInfo()}
                ${this.renderTabs()}
                ${this.renderTabContent(presets)}
                ${this.renderLoadingOverlay()}
            </div>
        `;

        this.cacheElements();
        this.attachEventHandlers();
        
        // Update preset categories
        this.updatePresetCategories(presets);
    }

    renderHeader() {
        return `
            <div class="viz-header">
                <div class="viz-title">
                    <i class="material-icons">palette</i>
                    <h3>Visualization</h3>
                </div>
                <button class="viz-close-btn" title="Close visualization panel">
                    <i class="material-icons">close</i>
                </button>
            </div>
        `;
    }

    renderItemInfo() {
        const item = this.currentItem;
        const date = new Date(item.properties.datetime || item.properties.start_datetime || Date.now());
        
        return `
            <div class="viz-item-info">
                <div class="item-title">${item.properties.title || item.id}</div>
                <div class="item-details">
                    <span class="item-collection">${item.collection}</span>
                    <span class="item-date">${this.formatDate(date)}</span>
                </div>
                ${item.properties['eo:cloud_cover'] !== undefined ? 
                    `<div class="item-cloud-cover">☁️ ${Math.round(item.properties['eo:cloud_cover'])}% cloud cover</div>` : 
                    ''
                }
            </div>
        `;
    }

    renderTabs() {
        return `
            <div class="viz-tabs">
                <button class="viz-tab active" data-tab="data">
                    <i class="material-icons">layers</i>
                    Data
                </button>
                <button class="viz-tab" data-tab="settings">
                    <i class="material-icons">settings</i>
                    Settings
                </button>
            </div>
        `;
    }

    renderTabContent(presets) {
        return `
            <div class="viz-tab-content">
                <div class="viz-tab-panel active" data-panel="data">
                    ${this.renderPresetSelector(presets)}
                </div>
                <div class="viz-tab-panel" data-panel="settings">
                    ${this.renderControls()}
                    ${this.renderActions()}
                </div>
            </div>
        `;
    }

    renderPresetSelector(presets) {
        // Check if any presets are available
        if (Object.keys(presets).length === 0) {
            return `
                <div class="viz-presets">
                    <div class="no-presets-message">
                        <i class="material-icons">info</i>
                        <p>No visualization presets available for this item.</p>
                        <p>Required assets may not be present.</p>
                    </div>
                </div>
            `;
        }

        // Group presets by category
        const grouped = this.groupPresetsByCategory(presets);
        
        return `
            <div class="viz-presets">
                <div class="preset-categories">
                    ${Object.keys(grouped).map(category => `
                        <button class="category-tab ${category === 'composite' ? 'active' : ''}" 
                                data-category="${category}">
                            ${this.getCategoryIcon(category)} ${this.getCategoryName(category)}
                        </button>
                    `).join('')}
                </div>
                
                <div class="preset-groups">
                    ${Object.entries(grouped).map(([category, categoryPresets]) => `
                        <div class="preset-group" data-category="${category}" 
                             style="display: ${category === 'composite' ? 'block' : 'none'}">
                            <div class="preset-grid">
                                ${Object.entries(categoryPresets).map(([key, preset]) => `
                                    <div class="preset-card" 
                                         data-preset="${key}"
                                         title="${preset.description}">
                                        <div class="preset-icon">${preset.name.split(' ')[0]}</div>
                                        <div class="preset-info">
                                            <div class="preset-name">${preset.name.substring(2)}</div>
                                            <div class="preset-desc">${this.truncateText(preset.description, 40)}</div>
                                        </div>
                                        <div class="preset-loading" style="display: none;">
                                            <div class="loading-spinner"></div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    getScaleRange() {
        if (!this.currentItem || !this.currentItem.assets) {
            return { min: 0, max: 0.3, step: 0.01 };
        }

        // Check if current preset is an index (always -1 to 1)
        if (this.currentPreset) {
            const presets = this.bandEngine.getPresetsForCollection(this.currentItem.collection);
            const currentPresetConfig = presets[this.currentPreset];
            
            if (currentPresetConfig && currentPresetConfig.category === 'index') {
                return { min: -1, max: 1, step: 0.1 };
            }
        }

        // Check raster:bands metadata for scale information
        for (const assetKey in this.currentItem.assets) {
            const asset = this.currentItem.assets[assetKey];
            if (asset['raster:bands']) {
                for (const band of asset['raster:bands']) {
                    if (band.scale) {
                        if (band.scale === 0.0001) {
                            return { min: 0, max: 1000, step: 10 }; // More reasonable range for reflectance data
                        } else if (band.scale === 1 || band.scale === null || band.scale === undefined) {
                            return { min: 0, max: 0.3, step: 0.01 };
                        }
                    }
                }
            }
        }

        // Default scale range
        return { min: 0, max: 0.3, step: 0.01 };
    }

    filterAvailablePresets(allPresets) {
        if (!this.currentItem || !this.currentItem.assets) {
            return {};
        }

        const availablePresets = {};
        
        for (const [presetKey, preset] of Object.entries(allPresets)) {
            if (this.isPresetAvailable(preset)) {
                availablePresets[presetKey] = preset;
            } else {
                console.log(`🚫 [PRESET] Skipping ${preset.name} - required assets not available`);
            }
        }

        return availablePresets;
    }

    isPresetAvailable(preset) {
        if (!preset.assets || preset.assets.length === 0) {
            return true; // No specific assets required
        }

        // Check if all required assets are available (after mapping)
        const mappedAssets = this.bandEngine.mapGenericToActualAssets 
            ? this.bandEngine.mapGenericToActualAssets(preset.assets, this.currentItem)
            : preset.assets;

        const availableAssets = Object.keys(this.currentItem.assets || {});
        
        console.log(`🔍 [PRESET] Checking ${preset.name}:`);
        console.log(`  Required assets: ${preset.assets.join(', ')}`);
        console.log(`  Mapped assets: ${mappedAssets.join(', ')}`);
        console.log(`  Available assets: ${availableAssets.join(', ')}`);

        for (const assetName of mappedAssets) {
            if (!this.currentItem.assets[assetName]) {
                console.log(`🚫 [PRESET] Missing asset: ${assetName} for preset ${preset.name}`);
                return false;
            }
        }

        console.log(`✅ [PRESET] ${preset.name} is available`);
        return true;
    }

    renderControls() {
        const scaleRange = this.getScaleRange();
        return `
            <div class="viz-controls">
                <div class="control-group">
                    <label class="control-label">
                        <i class="material-icons">tune</i>
                        Scale Range:
                    </label>
                    <div class="scale-inputs">
                        <input type="number" class="scale-input scale-min" 
                               value="${scaleRange.min}" 
                               step="${scaleRange.step}" 
                               placeholder="Min">
                        <span class="scale-separator">to</span>
                        <input type="number" class="scale-input scale-max" 
                               value="${scaleRange.max}" 
                               step="${scaleRange.step}" 
                               placeholder="Max">
                    </div>
                    <div class="scale-hint">
                        <small>Press Enter to apply or wait 3 seconds</small>
                    </div>
                </div>
                
                <div class="control-group">
                    <label class="control-label">
                        <i class="material-icons">layers</i>
                        Blend Mode:
                    </label>
                    <select class="blend-mode-select">
                        <option value="normal">Normal</option>
                        <option value="multiply">Multiply</option>
                        <option value="overlay">Overlay</option>
                        <option value="screen">Screen</option>
                        <option value="soft-light">Soft Light</option>
                        <option value="hard-light">Hard Light</option>
                        <option value="color-dodge">Color Dodge</option>
                        <option value="color-burn">Color Burn</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <button class="control-btn layer-visibility-btn" title="Toggle layer visibility">
                        <i class="material-icons">visibility</i>
                        <span>Visible</span>
                    </button>
                </div>
            </div>
        `;
    }

    renderActions() {
        return `
            <div class="viz-actions">
                <button class="viz-btn secondary" id="download-view-btn" title="Download current view">
                    <i class="material-icons">download</i>
                    Download
                </button>
                <button class="viz-btn secondary" id="share-viz-btn" title="Share visualization">
                    <i class="material-icons">share</i>
                    Share
                </button>
                <button class="viz-btn secondary" id="layer-manager-btn" title="Manage all layers">
                    <i class="material-icons">layers</i>
                    Layers (${this.rasterManager.currentLayers.size})
                </button>
            </div>
        `;
    }

    renderLoadingOverlay() {
        return `
            <div class="viz-loading-overlay" style="display: none;">
                <div class="loading-content">
                    <div class="loading-spinner large"></div>
                    <div class="loading-text">Loading visualization...</div>
                    <div class="loading-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <div class="progress-text">0%</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Cache frequently used DOM elements
     */
    cacheElements() {
        this.elements = {
            closeBtn: this.container.querySelector('.viz-close-btn'),
            mainTabs: this.container.querySelectorAll('.viz-tab'),
            tabPanels: this.container.querySelectorAll('.viz-tab-panel'),
            presetCards: this.container.querySelectorAll('.preset-card'),
            categoryTabs: this.container.querySelectorAll('.category-tab'),
            presetGroups: this.container.querySelectorAll('.preset-group'),
            scaleMinInput: this.container.querySelector('.scale-min'),
            scaleMaxInput: this.container.querySelector('.scale-max'),
            blendModeSelect: this.container.querySelector('.blend-mode-select'),
            layerVisibilityBtn: this.container.querySelector('.layer-visibility-btn'),
            downloadBtn: this.container.querySelector('#download-view-btn'),
            shareBtn: this.container.querySelector('#share-viz-btn'),
            layerManagerBtn: this.container.querySelector('#layer-manager-btn'),
            loadingOverlay: this.container.querySelector('.viz-loading-overlay'),
            progressFill: this.container.querySelector('.progress-fill'),
            progressText: this.container.querySelector('.progress-text')
        };
    }

    /**
     * Attach event handlers to UI elements
     */
    attachEventHandlers() {
        // Close button
        this.elements.closeBtn?.addEventListener('click', () => this.hide());

        // Main tabs (Data/Settings)
        this.elements.mainTabs?.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Category tabs
        this.elements.categoryTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const category = tab.dataset.category;
                this.switchCategory(category);
            });
        });

        // Preset selection
        this.elements.presetCards.forEach(card => {
            card.addEventListener('click', async () => {
                const preset = card.dataset.preset;
                // Always load the selected preset (no current preset check)
                await this.loadPreset(preset);
            });
        });

        // Opacity removed - always use 100%

        // Scale controls with debounce
        this.elements.scaleMinInput?.addEventListener('input', () => {
            this.debouncedUpdateLayerScale();
        });
        this.elements.scaleMaxInput?.addEventListener('input', () => {
            this.debouncedUpdateLayerScale();
        });
        
        // Allow immediate update on Enter key
        this.elements.scaleMinInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.clearScaleDebounce();
                this.updateLayerScale();
            }
        });
        this.elements.scaleMaxInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.clearScaleDebounce();
                this.updateLayerScale();
            }
        });

        // Blend mode control
        this.elements.blendModeSelect?.addEventListener('change', (e) => {
            this.updateLayerBlendMode(e.target.value);
        });

        // Layer visibility toggle
        this.elements.layerVisibilityBtn?.addEventListener('click', () => {
            this.toggleLayerVisibility();
        });

        // Action buttons
        this.elements.downloadBtn?.addEventListener('click', () => this.downloadView());
        this.elements.shareBtn?.addEventListener('click', () => this.shareVisualization());
        this.elements.layerManagerBtn?.addEventListener('click', () => this.showLayerManager());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isVisible && e.key === 'Escape') {
                this.hide();
            }
        });
    }

    /**
     * Set up event listeners for raster visualization events
     */
    setupEventListeners() {
        // Listen for layer events
        document.addEventListener('rasterVisualization:layerLoadProgress', (e) => {
            console.log(`📊 [PROGRESS] Received progress event:`, e.detail);
            if (e.detail.layerId === this.currentLayerId) {
                console.log(`📊 [PROGRESS] Updating progress for current layer ${this.currentLayerId}: ${e.detail.progress}%`);
                this.updateLoadingProgress(e.detail.progress);
            } else {
                console.log(`📊 [PROGRESS] Ignoring progress for different layer: ${e.detail.layerId} (current: ${this.currentLayerId})`);
            }
        });

        document.addEventListener('rasterVisualization:layerLoaded', (e) => {
            console.log(`✅ [PROGRESS] Received layer loaded event:`, e.detail);
            if (e.detail.layerId === this.currentLayerId) {
                console.log(`✅ [PROGRESS] Hiding loading for current layer ${this.currentLayerId}`);
                this.hideLoading();
            } else {
                console.log(`✅ [PROGRESS] Ignoring loaded event for different layer: ${e.detail.layerId} (current: ${this.currentLayerId})`);
            }
        });
    }

    /**
     * Load a visualization preset
     * @param {string} presetKey - Preset identifier
     * @param {Object} options - Additional options like scale range
     */
    async loadPreset(presetKey, options = {}) {
        try {
            console.log(`🔄 [LOADING] Starting to load preset: ${presetKey}`);
            this.showLoading();
            this.showPresetLoading(presetKey);
            
            // Hide thumbnail when visualization is selected
            this.hideThumbnailForCurrentItem();
            
            // Remove thumbnail/preview layers from both MapLibre and Deck.gl
            console.log(`🎨 [PRESET] Removing thumbnail/preview layers (MapLibre + Deck.gl) before loading ${presetKey}`);
            this.removeOnlyThumbnailLayers();
            this.removeDeckGLThumbnailLayers();

            console.log(`📡 [LOADING] Adding STAC item layer for item: ${this.currentItem.id}`);
            console.log(`📡 [LOADING] Collection: ${this.currentItem.collection}`);
            console.log(`📡 [LOADING] Preset: ${presetKey}`);

            // Add new layer with selected preset first
            const newLayerId = await this.rasterManager.addSTACItemLayer(
                this.currentItem, 
                presetKey,
                {
                    opacity: 1.0,
                    blendMode: this.elements.blendModeSelect?.value || 'normal',
                    minScale: options.minScale,
                    maxScale: options.maxScale,
                    zoomTo: false
                }
            );

            // Remove existing visualization layer after new layer is successfully created
            if (this.currentLayerId && newLayerId) {
                console.log(`🗑️ [LOADING] Removing existing layer: ${this.currentLayerId}`);
                this.rasterManager.removeLayer(this.currentLayerId);
            }
            
            // Don't remove thumbnail layers - instead ensure high-res layer is on top
            if (newLayerId) {
                console.log(`🎨 [PRESET] Ensuring high-resolution layer ${newLayerId} is rendered above thumbnails`);
                this.ensureHighResLayerOnTop(newLayerId);
            }

            this.currentLayerId = newLayerId;

            console.log(`✅ [LOADING] Layer created with ID: ${this.currentLayerId}`);

            // Update UI state
            this.currentPreset = presetKey;
            this.updateActivePreset(presetKey);

            console.log(`🎨 Loaded preset: ${presetKey}`);

            if (this.notificationService) {
                const presets = this.bandEngine.getPresetsForCollection(this.currentItem.collection);
                const presetName = presets[presetKey]?.name || presetKey;
                this.notificationService.showNotification(
                    `🎨 Applied ${presetName} visualization`, 
                    'success'
                );
            }

            // Add timeout fallback to hide loading if event doesn't fire
            setTimeout(() => {
                if (this.isLoading) {
                    console.log(`⏰ [TIMEOUT] Layer loading timeout, hiding loading indicator`);
                    this.hideLoading();
                }
            }, 10000); // 10 second timeout

        } catch (error) {
            console.error('❌ [LOADING] Error loading preset:', error);
            console.error('❌ [LOADING] Error details:', error.message);
            console.error('❌ [LOADING] Error stack:', error.stack);
            this.showError(`Failed to load ${presetKey} visualization: ${error.message}`);
            this.hideLoading();
        } finally {
            console.log(`🏁 [LOADING] Finished loading preset: ${presetKey}`);
            this.hidePresetLoading(presetKey);
        }
    }

    /**
     * Update layer opacity
     * @param {number} opacity - Opacity value (0-1)
     */
    updateLayerOpacity(opacity) {
        if (this.currentLayerId) {
            this.rasterManager.setLayerOpacity(this.currentLayerId, opacity);
        }
    }

    /**
     * Update layer blend mode
     * @param {string} blendMode - CSS blend mode
     */
    updateLayerBlendMode(blendMode) {
        if (this.currentLayerId) {
            this.rasterManager.setLayerBlendMode(this.currentLayerId, blendMode);
        }
    }

    /**
     * Update layer scale range
     */
    updateLayerScale() {
        if (this.currentLayerId && this.currentItem && this.currentPreset) {
            const minScale = parseFloat(this.elements.scaleMinInput.value) || 0;
            const maxScale = parseFloat(this.elements.scaleMaxInput.value) || 0.3;
            
            // Reload the current preset with new scale values
            this.loadPreset(this.currentPreset, { minScale, maxScale });
        }
    }

    /**
     * Debounced version of updateLayerScale
     */
    debouncedUpdateLayerScale() {
        this.clearScaleDebounce();
        this.scaleDebounceTimer = setTimeout(() => {
            this.updateLayerScale();
        }, 3000); // Wait 3 seconds
    }

    /**
     * Clear the scale debounce timer
     */
    clearScaleDebounce() {
        if (this.scaleDebounceTimer) {
            clearTimeout(this.scaleDebounceTimer);
            this.scaleDebounceTimer = null;
        }
    }

    /**
     * Toggle layer visibility
     */
    toggleLayerVisibility() {
        if (this.currentLayerId) {
            const layerInfo = this.rasterManager.getLayer(this.currentLayerId);
            const newVisibility = !layerInfo.visible;
            
            this.rasterManager.setLayerVisibility(this.currentLayerId, newVisibility);
            
            // Update button state
            const btn = this.elements.layerVisibilityBtn;
            const icon = btn.querySelector('.material-icons');
            const text = btn.querySelector('span');
            
            if (newVisibility) {
                icon.textContent = 'visibility';
                text.textContent = 'Visible';
                btn.classList.remove('disabled');
            } else {
                icon.textContent = 'visibility_off';
                text.textContent = 'Hidden';
                btn.classList.add('disabled');
            }
        }
    }

    /**
     * Switch between preset categories
     * @param {string} category - Category to switch to
     */
    switchCategory(category) {
        // Update tab states
        this.elements.categoryTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });

        // Show/hide preset groups
        this.elements.presetGroups.forEach(group => {
            group.style.display = group.dataset.category === category ? 'block' : 'none';
        });
    }

    /**
     * Switch between main tabs (Data/Settings)
     * @param {string} tabName - Tab name to switch to
     */
    switchTab(tabName) {
        // Update tab states
        this.elements.mainTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Show/hide tab panels
        this.elements.tabPanels.forEach(panel => {
            panel.classList.toggle('active', panel.dataset.panel === tabName);
        });
    }

    /**
     * Update active preset in UI
     * @param {string} presetKey - Active preset key
     */
    updateActivePreset(presetKey) {
        this.elements.presetCards.forEach(card => {
            card.classList.toggle('active', card.dataset.preset === presetKey);
        });
        
        // Update scale inputs when preset changes
        this.updateScaleInputs();
    }
    
    /**
     * Update scale inputs with current preset's appropriate range
     */
    updateScaleInputs() {
        const scaleRange = this.getScaleRange();
        if (this.elements.scaleMinInput) {
            this.elements.scaleMinInput.value = scaleRange.min;
            this.elements.scaleMinInput.step = scaleRange.step;
        }
        if (this.elements.scaleMaxInput) {
            this.elements.scaleMaxInput.value = scaleRange.max;
            this.elements.scaleMaxInput.step = scaleRange.step;
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.isLoading = true;
        this.elements.loadingOverlay.style.display = 'flex';
        this.updateLoadingProgress(0);
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.isLoading = false;
        this.elements.loadingOverlay.style.display = 'none';
    }

    /**
     * Update loading progress
     * @param {number} progress - Progress percentage (0-100)
     */
    updateLoadingProgress(progress) {
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${progress}%`;
        }
        if (this.elements.progressText) {
            this.elements.progressText.textContent = `${Math.round(progress)}%`;
        }
    }

    /**
     * Show loading state for specific preset
     * @param {string} presetKey - Preset being loaded
     */
    showPresetLoading(presetKey) {
        const card = this.container.querySelector(`[data-preset="${presetKey}"]`);
        if (card) {
            const loader = card.querySelector('.preset-loading');
            if (loader) loader.style.display = 'flex';
        }
    }

    /**
     * Hide loading state for specific preset
     * @param {string} presetKey - Preset that finished loading
     */
    hidePresetLoading(presetKey) {
        const card = this.container.querySelector(`[data-preset="${presetKey}"]`);
        if (card) {
            const loader = card.querySelector('.preset-loading');
            if (loader) loader.style.display = 'none';
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        if (this.notificationService) {
            this.notificationService.showNotification(message, 'error');
        } else {
            console.error(message);
        }
    }

    // Utility methods for UI rendering

    groupPresetsByCategory(presets) {
        const grouped = {};
        Object.entries(presets).forEach(([key, preset]) => {
            const category = preset.category || 'other';
            if (!grouped[category]) grouped[category] = {};
            grouped[category][key] = preset;
        });
        return grouped;
    }

    getCategoryIcon(category) {
        const icons = {
            composite: '🎨',
            monochrome: '⚫',
            index: '📊',
            ratio: '📈',
            other: '🔧'
        };
        return icons[category] || '🔧';
    }

    getCategoryName(category) {
        const names = {
            composite: 'Composites',
            monochrome: 'Single Bands',
            index: 'Indices',
            ratio: 'Ratios',
            other: 'Other'
        };
        return names[category] || 'Other';
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Action handlers (to be implemented based on requirements)
    
    downloadView() {
        console.log('📥 Download view functionality - to be implemented');
        // TODO: Implement download functionality
    }

    shareVisualization() {
        console.log('🔗 Share visualization functionality - to be implemented');
        // TODO: Implement sharing functionality
    }

    showLayerManager() {
        console.log('📋 Layer manager functionality - to be implemented');
        // TODO: Implement layer management panel
    }

    updatePresetCategories(presets) {
        // Hide category tabs that have no presets
        this.elements.categoryTabs.forEach(tab => {
            const category = tab.dataset.category;
            const hasPresets = Object.values(presets).some(preset => 
                (preset.category || 'composite') === category
            );
            tab.style.display = hasPresets ? 'block' : 'none';
        });
    }
    
    /**
     * Hide thumbnail for the current item when visualization is selected
     */
    hideThumbnailForCurrentItem() {
        if (!this.currentItem || !this.currentItem.id) {
            return;
        }
        
        // Find the result item by ID and hide its thumbnail
        const resultItems = document.querySelectorAll('.result-item');
        
        resultItems.forEach(item => {
            // Get the item data from the element (usually stored in a data attribute or can be found by context)
            const itemCard = item.querySelector('.clickable-card');
            const thumbnail = item.querySelector('.dataset-thumbnail');
            
            if (thumbnail && itemCard) {
                // Check if this is the current item by looking for the item ID in the content
                // Since we can't easily match by ID, we'll hide all thumbnails when any visualization is active
                // This is a simpler approach that ensures thumbnails are hidden during visualization
                thumbnail.style.display = 'none';
                
                // Add a class to indicate thumbnail is hidden for styling
                itemCard.classList.add('thumbnail-hidden');
            }
        });
        
        console.log(`🖼️ Thumbnails hidden for visualization of item: ${this.currentItem.id}`);
    }
    
    /**
     * Show thumbnails again (call when visualization panel is closed)
     */
    showThumbnailsForAllItems() {
        const resultItems = document.querySelectorAll('.result-item');
        
        resultItems.forEach(item => {
            const thumbnail = item.querySelector('.dataset-thumbnail');
            const itemCard = item.querySelector('.clickable-card');
            
            if (thumbnail && itemCard) {
                thumbnail.style.display = '';
                itemCard.classList.remove('thumbnail-hidden');
            }
        });
        
        console.log('🖼️ Thumbnails restored for all items');
    }
    
    /**
     * Remove ONLY thumbnail/preview layers, preserve high-resolution visualization layers
     */
    removeOnlyThumbnailLayers() {
        if (!this.rasterManager.mapManager || !this.rasterManager.mapManager.map) {
            return;
        }
        
        const map = this.rasterManager.mapManager.map;
        
        try {
            console.log('🗑️ [TARGETED] Removing only thumbnail/preview layers from map');
            
            const style = map.getStyle();
            if (!style || !style.layers) {
                console.log('🗑️ [TARGETED] No map style or layers found');
                return;
            }
            
            const layersToRemove = [];
            const sourcesToRemove = [];
            
            console.log('🔍 [TARGETED] Analyzing layers for thumbnail/preview removal:');
            
            // Check ALL layers but only remove thumbnail/preview ones
            style.layers.forEach((layer, index) => {
                const layerId = layer.id;
                const sourceId = layer.source;
                const layerType = layer.type;
                
                console.log(`  ${index + 1}. ${layerId} (type: ${layerType}, source: ${sourceId})`);
                
                // Identify thumbnail/preview layers (but NOT high-resolution visualization layers)
                const isThumbnailLayer = (
                    // Image overlay layers (thumbnails/previews from MapManager)
                    (layerId.includes('image-overlay-') && layerId.endsWith('-layer')) ||
                    (sourceId && sourceId.includes('image-overlay-')) ||
                    layerId === 'thumbnail-layer' ||
                    layerId === 'image-overlay-layer' ||
                    
                    // Geometry layers (item boundaries)
                    layerId === 'item-geometry-layer' ||
                    layerId === 'item-geometry-layer-stroke' ||
                    layerId.includes('item-geometry') ||
                    
                    // Other potential thumbnail patterns
                    layerId.includes('preview-') ||
                    layerId.includes('thumbnail-')
                );
                
                // Preserve high-resolution layers (from RasterVisualizationManager)
                const isHighResLayer = (
                    layerId.includes('stac-') ||  // High-res layers from RasterVisualizationManager
                    (sourceId && sourceId.includes('stac-')) ||
                    layerId.includes('raster-viz-') ||
                    layerId.includes('visualization-')
                );
                
                if (isThumbnailLayer && !isHighResLayer) {
                    console.log(`    → REMOVING: Thumbnail/preview layer`);
                    layersToRemove.push(layerId);
                    
                    if (sourceId) {
                        sourcesToRemove.push(sourceId);
                    }
                } else if (isHighResLayer) {
                    console.log(`    → KEEPING: High-resolution visualization layer`);
                } else {
                    console.log(`    → KEEPING: Base map or other layer`);
                }
            });
            
            // Also check sources for thumbnail patterns
            Object.keys(style.sources || {}).forEach(sourceId => {
                const isThumbnailSource = (
                    sourceId.includes('image-overlay-') ||
                    sourceId === 'thumbnail-source' ||
                    sourceId === 'image-overlay-source' ||
                    sourceId === 'item-geometry' ||
                    sourceId.includes('preview-') ||
                    sourceId.includes('thumbnail-')
                );
                
                const isHighResSource = (
                    sourceId.includes('stac-') ||
                    sourceId.includes('raster-viz-') ||
                    sourceId.includes('visualization-')
                );
                
                if (isThumbnailSource && !isHighResSource && !sourcesToRemove.includes(sourceId)) {
                    console.log(`🔍 [TARGETED] Found additional thumbnail source: ${sourceId}`);
                    sourcesToRemove.push(sourceId);
                }
            });
            
            console.log(`🗑️ [TARGETED] Will remove ${layersToRemove.length} thumbnail layers:`, layersToRemove);
            console.log(`🗑️ [TARGETED] Will remove ${[...new Set(sourcesToRemove)].length} thumbnail sources:`, [...new Set(sourcesToRemove)]);
            
            // Remove layers first
            layersToRemove.forEach(layerId => {
                try {
                    if (map.getLayer(layerId)) {
                        console.log(`🗑️ [TARGETED] Removing thumbnail layer: ${layerId}`);
                        map.removeLayer(layerId);
                    }
                } catch (error) {
                    console.warn(`⚠️ [TARGETED] Error removing layer ${layerId}:`, error);
                }
            });
            
            // Remove sources
            [...new Set(sourcesToRemove)].forEach(sourceId => {
                try {
                    if (map.getSource(sourceId)) {
                        console.log(`🗑️ [TARGETED] Removing thumbnail source: ${sourceId}`);
                        map.removeSource(sourceId);
                    }
                } catch (error) {
                    console.warn(`⚠️ [TARGETED] Error removing source ${sourceId}:`, error);
                }
            });
            
            console.log(`✅ [TARGETED] Removed ${layersToRemove.length} thumbnail layers and ${[...new Set(sourcesToRemove)].length} sources`);
            
            // Show remaining layers
            const remainingStyle = map.getStyle();
            console.log('🔍 [TARGETED] Remaining layers after thumbnail cleanup:');
            remainingStyle.layers.forEach((layer, index) => {
                if (!layer.id.includes('mapbox-') && !layer.id.includes('background') && 
                    !layer.id.includes('land') && !layer.id.includes('water')) {
                    console.log(`  ${index + 1}. ${layer.id} (type: ${layer.type}, source: ${layer.source})`);
                }
            });
            
        } catch (error) {
            console.error('❌ [TARGETED] Error in targeted thumbnail removal:', error);
        }
    }
    
    /**
     * Remove thumbnail/preview layers from Deck.gl
     */
    removeDeckGLThumbnailLayers() {
        if (!this.rasterManager.mapManager || !this.rasterManager.mapManager.deckGLIntegration) {
            console.log('🗑️ [DECKGL] No Deck.gl integration found');
            return;
        }
        
        const deckGLIntegration = this.rasterManager.mapManager.deckGLIntegration;
        
        try {
            console.log('🗑️ [DECKGL] Removing Deck.gl thumbnail/preview layers');
            
            // Check if Deck.gl is available and has layers
            if (!deckGLIntegration.isAvailable()) {
                console.log('🗑️ [DECKGL] Deck.gl not available');
                return;
            }
            
            // Remove STAC item layers from Deck.gl (these are likely the thumbnails)
            if (typeof deckGLIntegration.removeStacLayer === 'function') {
                console.log('🗑️ [DECKGL] Removing STAC layers from Deck.gl');
                deckGLIntegration.removeStacLayer();
            }
            
            // If there's a method to remove all layers, use it
            if (typeof deckGLIntegration.removeAllLayers === 'function') {
                console.log('🗑️ [DECKGL] Removing all Deck.gl layers');
                deckGLIntegration.removeAllLayers();
            }
            
            // If there's a method to clear Deck.gl, use it
            if (typeof deckGLIntegration.clear === 'function') {
                console.log('🗑️ [DECKGL] Clearing Deck.gl');
                deckGLIntegration.clear();
            }
            
            console.log('✅ [DECKGL] Deck.gl thumbnail removal completed');
            
        } catch (error) {
            console.warn('⚠️ [DECKGL] Error removing Deck.gl layers:', error);
        }
    }
    
    /**
     * AGGRESSIVE: Remove ALL overlay layers (thumbnails, previews, etc.) from the map
     * This ensures a clean slate before adding high-resolution visualizations
     */
    removeAllOverlayLayers() {
        if (!this.rasterManager.mapManager || !this.rasterManager.mapManager.map) {
            return;
        }
        
        const map = this.rasterManager.mapManager.map;
        
        try {
            console.log('🗑️ [AGGRESSIVE] Removing ALL overlay layers from map');
            
            const style = map.getStyle();
            if (!style || !style.layers) {
                console.log('🗑️ [AGGRESSIVE] No map style or layers found');
                return;
            }
            
            // Get base map layer patterns that we should NOT remove
            const basemapPatterns = [
                /^mapbox-/,           // Mapbox base layers
                /^background$/,       // Background layer
                /^land$/,            // Land layer
                /^water$/,           // Water layer
                /^admin-/,           // Admin boundaries
                /^road-/,            // Road layers
                /^building/,         // Building layers
                /^label-/,           // Label layers
                /^poi-/,             // Points of interest
                /^transit-/,         // Transit layers
                /^landuse-/,         // Land use layers
                /^waterway-/,        // Waterway layers
                /^tunnel-/,          // Tunnel layers
                /^bridge-/,          // Bridge layers
                /^hillshade/,        // Hillshade layers
                /^contour/,          // Contour layers
                /^satellite$/,       // Satellite base layer
                /^raster-source$/    // Base raster source
            ];
            
            const layersToRemove = [];
            const sourcesToRemove = [];
            
            console.log('🔍 [AGGRESSIVE] Analyzing all layers:');
            
            // Check ALL layers
            style.layers.forEach((layer, index) => {
                const layerId = layer.id;
                const sourceId = layer.source;
                const layerType = layer.type;
                
                console.log(`  ${index + 1}. ${layerId} (type: ${layerType}, source: ${sourceId})`);
                
                // Check if this is a base map layer we should keep
                const isBasemapLayer = basemapPatterns.some(pattern => pattern.test(layerId));
                
                if (!isBasemapLayer) {
                    // This looks like an overlay layer - remove it
                    console.log(`    → REMOVING: Not a base map layer`);
                    layersToRemove.push(layerId);
                    
                    if (sourceId && !basemapPatterns.some(pattern => pattern.test(sourceId))) {
                        sourcesToRemove.push(sourceId);
                    }
                } else {
                    console.log(`    → KEEPING: Base map layer`);
                }
            });
            
            // Also check all sources for non-basemap sources
            Object.keys(style.sources || {}).forEach(sourceId => {
                const isBasemapSource = basemapPatterns.some(pattern => pattern.test(sourceId)) || 
                                       sourceId === 'mapbox' || 
                                       sourceId.startsWith('mapbox://');
                
                if (!isBasemapSource && !sourcesToRemove.includes(sourceId)) {
                    console.log(`🔍 [AGGRESSIVE] Found additional non-basemap source: ${sourceId}`);
                    sourcesToRemove.push(sourceId);
                }
            });
            
            console.log(`🗑️ [AGGRESSIVE] Will remove ${layersToRemove.length} layers:`, layersToRemove);
            console.log(`🗑️ [AGGRESSIVE] Will remove ${[...new Set(sourcesToRemove)].length} sources:`, [...new Set(sourcesToRemove)]);
            
            // Remove layers first
            layersToRemove.forEach(layerId => {
                try {
                    if (map.getLayer(layerId)) {
                        console.log(`🗑️ [AGGRESSIVE] Removing layer: ${layerId}`);
                        map.removeLayer(layerId);
                    }
                } catch (error) {
                    console.warn(`⚠️ [AGGRESSIVE] Error removing layer ${layerId}:`, error);
                }
            });
            
            // Remove sources
            [...new Set(sourcesToRemove)].forEach(sourceId => {
                try {
                    if (map.getSource(sourceId)) {
                        console.log(`🗑️ [AGGRESSIVE] Removing source: ${sourceId}`);
                        map.removeSource(sourceId);
                    }
                } catch (error) {
                    console.warn(`⚠️ [AGGRESSIVE] Error removing source ${sourceId}:`, error);
                }
            });
            
            console.log(`✅ [AGGRESSIVE] Removed ${layersToRemove.length} layers and ${[...new Set(sourcesToRemove)].length} sources`);
            
            // Show remaining layers
            const remainingStyle = map.getStyle();
            console.log('🔍 [AGGRESSIVE] Remaining layers after cleanup:');
            remainingStyle.layers.forEach((layer, index) => {
                console.log(`  ${index + 1}. ${layer.id} (type: ${layer.type}, source: ${layer.source})`);
            });
            
        } catch (error) {
            console.error('❌ [AGGRESSIVE] Error in aggressive layer removal:', error);
        }
    }
    
    /**
     * Ensure thumbnail layers stay below high-resolution layers
     */
    ensureThumbnailLayersBelow() {
        if (!this.rasterManager.mapManager || !this.rasterManager.mapManager.map) {
            return;
        }
        
        const map = this.rasterManager.mapManager.map;
        
        try {
            console.log('🎨 [LAYER-ORDER] Preparing thumbnail layers to stay below high-resolution');
            
            // Get all layers on the map
            const style = map.getStyle();
            if (!style || !style.layers) {
                return;
            }
            
            // Find thumbnail/preview layers
            const thumbnailLayers = [];
            style.layers.forEach(layer => {
                const layerId = layer.id;
                const layerType = layer.type;
                const sourceId = layer.source;
                
                // Identify thumbnail/preview layers
                if ((layerType === 'raster' && sourceId && 
                     (layerId.includes('image-overlay-') || 
                      sourceId.includes('image-overlay-') ||
                      layerId === 'thumbnail-layer' ||
                      layerId === 'image-overlay-layer')) ||
                    layerId === 'item-geometry-layer' ||
                    layerId === 'item-geometry-layer-stroke') {
                    
                    thumbnailLayers.push(layerId);
                }
            });
            
            console.log(`🎨 [LAYER-ORDER] Found ${thumbnailLayers.length} thumbnail layers:`, thumbnailLayers);
            
            // Store reference for later use
            this.thumbnailLayerIds = thumbnailLayers;
            
        } catch (error) {
            console.warn('⚠️ [LAYER-ORDER] Error identifying thumbnail layers:', error);
        }
    }
    
    /**
     * Ensure high-resolution layer is rendered on top of thumbnail layers
     */
    ensureHighResLayerOnTop(highResLayerId) {
        if (!this.rasterManager.mapManager || !this.rasterManager.mapManager.map) {
            return;
        }
        
        const map = this.rasterManager.mapManager.map;
        
        try {
            console.log(`🎨 [LAYER-ORDER] Ensuring high-res layer ${highResLayerId} is on top`);
            
            // Get current layer order
            const style = map.getStyle();
            if (!style || !style.layers) {
                return;
            }
            
            // Find the high-res layer
            const highResLayer = style.layers.find(layer => layer.id === highResLayerId);
            if (!highResLayer) {
                console.warn(`⚠️ [LAYER-ORDER] High-res layer ${highResLayerId} not found`);
                return;
            }
            
            // Check if there are any layers above the high-res layer that look like thumbnails
            const layerIndex = style.layers.findIndex(layer => layer.id === highResLayerId);
            const layersAbove = style.layers.slice(layerIndex + 1);
            
            // Find thumbnail layers that are above the high-res layer
            const thumbnailLayersAbove = layersAbove.filter(layer => {
                const layerId = layer.id;
                const layerType = layer.type;
                const sourceId = layer.source;
                
                return (layerType === 'raster' && sourceId && 
                        (layerId.includes('image-overlay-') || 
                         sourceId.includes('image-overlay-') ||
                         layerId === 'thumbnail-layer' ||
                         layerId === 'image-overlay-layer')) ||
                       layerId === 'item-geometry-layer' ||
                       layerId === 'item-geometry-layer-stroke';
            });
            
            if (thumbnailLayersAbove.length > 0) {
                console.log(`🎨 [LAYER-ORDER] Found ${thumbnailLayersAbove.length} thumbnail layers above high-res, moving high-res to top`);
                
                // Remove and re-add the high-res layer to put it on top
                const highResSource = map.getSource(highResLayer.source);
                const layerConfig = {
                    id: highResLayer.id,
                    type: highResLayer.type,
                    source: highResLayer.source,
                    paint: highResLayer.paint,
                    layout: highResLayer.layout
                };
                
                // Remove the layer
                map.removeLayer(highResLayerId);
                
                // Re-add it (this puts it on top)
                map.addLayer(layerConfig);
                
                console.log(`✅ [LAYER-ORDER] Moved high-res layer ${highResLayerId} to top`);
            } else {
                console.log(`✅ [LAYER-ORDER] High-res layer ${highResLayerId} is already on top`);
            }
            
        } catch (error) {
            console.warn('⚠️ [LAYER-ORDER] Error ensuring high-res layer on top:', error);
        }
    }
    
    /**
     * Remove thumbnail/preview layer from the basemap
     */
    removeThumbnailFromBasemap() {
        if (!this.rasterManager.mapManager || !this.rasterManager.mapManager.map) {
            return;
        }
        
        const map = this.rasterManager.mapManager.map;
        
        try {
            console.log('🗑️ [THUMBNAIL] Removing thumbnail/preview layers from basemap');
            
            // Get all layers and sources on the map
            const style = map.getStyle();
            if (!style || !style.layers) {
                console.log('🗑️ [THUMBNAIL] No map style or layers found');
                return;
            }
            
            // DEBUG: List all current layers and sources
            console.log('🔍 [DEBUG] All current layers on map:', style.layers.map(l => `${l.id} (source: ${l.source}, type: ${l.type})`));
            console.log('🔍 [DEBUG] All current sources on map:', Object.keys(style.sources || {}));
            
            // Find and remove all image overlay layers (they have dynamic IDs like image-overlay-123456789-layer)
            const layersToRemove = [];
            const sourcesToRemove = [];
            
            // Check all layers for thumbnail/preview patterns
            style.layers.forEach(layer => {
                const layerId = layer.id;
                const sourceId = layer.source;
                const layerType = layer.type;
                
                // Match patterns for thumbnail/preview layers
                if (layerId.includes('image-overlay-') && layerId.endsWith('-layer') ||
                    layerId === 'thumbnail-layer' ||
                    layerId === 'image-overlay-layer' ||
                    layerId === 'item-geometry-layer' ||
                    layerId === 'item-geometry-layer-stroke') {
                    
                    layersToRemove.push(layerId);
                    
                    // Also track corresponding sources
                    if (sourceId && sourceId.includes('image-overlay-')) {
                        sourcesToRemove.push(sourceId);
                    }
                }
                
                // AGGRESSIVE APPROACH: Remove ALL raster layers that aren't base map layers
                // This catches any thumbnail/preview layers we might have missed
                if (layerType === 'raster' && sourceId && 
                    !layerId.includes('mapbox://') && 
                    !layerId.includes('basemap') &&
                    !sourceId.includes('mapbox://') &&
                    !sourceId.includes('raster-source') &&
                    !sourceId.includes('basemap')) {
                    
                    console.log(`🔍 [DEBUG] Found raster layer that might be thumbnail: ${layerId} (source: ${sourceId})`);
                    layersToRemove.push(layerId);
                    sourcesToRemove.push(sourceId);
                }
            });
            
            // Also check for common source patterns
            Object.keys(map.getStyle().sources || {}).forEach(sourceId => {
                if (sourceId.includes('image-overlay-') ||
                    sourceId === 'thumbnail-source' ||
                    sourceId === 'image-overlay-source' ||
                    sourceId === 'item-geometry') {
                    sourcesToRemove.push(sourceId);
                }
            });
            
            // Remove layers first
            layersToRemove.forEach(layerId => {
                if (map.getLayer(layerId)) {
                    console.log(`🗑️ [THUMBNAIL] Removing layer: ${layerId}`);
                    map.removeLayer(layerId);
                } else {
                    console.log(`🗑️ [THUMBNAIL] Layer not found: ${layerId}`);
                }
            });
            
            // Remove sources
            [...new Set(sourcesToRemove)].forEach(sourceId => {
                if (map.getSource(sourceId)) {
                    console.log(`🗑️ [THUMBNAIL] Removing source: ${sourceId}`);
                    map.removeSource(sourceId);
                } else {
                    console.log(`🗑️ [THUMBNAIL] Source not found: ${sourceId}`);
                }
            });
            
            console.log(`✅ [THUMBNAIL] Removed ${layersToRemove.length} layers and ${[...new Set(sourcesToRemove)].length} sources from basemap`);
            
            // DEBUG: List remaining layers after removal
            const remainingStyle = map.getStyle();
            console.log('🔍 [DEBUG] Remaining layers after removal:', remainingStyle.layers.map(l => `${l.id} (source: ${l.source}, type: ${l.type})`));
            console.log('🔍 [DEBUG] Remaining sources after removal:', Object.keys(remainingStyle.sources || {}));
            
        } catch (error) {
            console.warn('⚠️ [THUMBNAIL] Error removing thumbnail layers:', error);
        }
    }
}

// Global helper functions for debugging layer ordering
window.debugLayerOrder = function() {
    if (window.stacExplorer && window.stacExplorer.mapManager && window.stacExplorer.mapManager.map) {
        const map = window.stacExplorer.mapManager.map;
        const style = map.getStyle();
        console.log('🔧 [DEBUG] Current layer order (bottom to top):');
        style.layers.forEach((layer, index) => {
            console.log(`  ${index + 1}. ${layer.id} (type: ${layer.type}, source: ${layer.source})`);
        });
        
        // Identify thumbnail and high-res layers
        const thumbnailLayers = [];
        const highResLayers = [];
        
        style.layers.forEach(layer => {
            if (layer.type === 'raster' && layer.source) {
                if (layer.id.includes('image-overlay-') || layer.source.includes('image-overlay-')) {
                    thumbnailLayers.push(layer.id);
                } else if (layer.id.includes('stac-')) {
                    highResLayers.push(layer.id);
                }
            }
        });
        
        console.log('🔧 [DEBUG] Thumbnail layers:', thumbnailLayers);
        console.log('🔧 [DEBUG] High-res layers:', highResLayers);
    } else {
        console.error('🔧 [DEBUG] Map not available');
    }
};

window.debugThumbnailRemoval = function() {
    if (window.stacExplorer && window.stacExplorer.visualizationPanel) {
        const vizPanel = window.stacExplorer.visualizationPanel;
        console.log('🔧 [DEBUG] Testing targeted thumbnail removal (preserves high-res)');
        
        // Show layers before removal
        console.log('🔧 [DEBUG] BEFORE removal:');
        window.debugLayerOrder();
        
        // Test targeted removal
        vizPanel.removeOnlyThumbnailLayers();
        
        // Show layers after removal
        console.log('🔧 [DEBUG] AFTER removal:');
        window.debugLayerOrder();
    } else {
        console.error('🔧 [DEBUG] Visualization panel not available');
        window.debugLayerOrder();
    }
};

// Additional debug function for aggressive removal (removes everything)
window.debugAggressiveRemoval = function() {
    if (window.stacExplorer && window.stacExplorer.visualizationPanel) {
        const vizPanel = window.stacExplorer.visualizationPanel;
        console.log('🔧 [DEBUG] Testing aggressive removal (removes ALL overlays)');
        
        // Show layers before removal
        console.log('🔧 [DEBUG] BEFORE removal:');
        window.debugLayerOrder();
        
        // Test aggressive removal
        vizPanel.removeAllOverlayLayers();
        
        // Show layers after removal
        console.log('🔧 [DEBUG] AFTER removal:');
        window.debugLayerOrder();
    } else {
        console.error('🔧 [DEBUG] Visualization panel not available');
        window.debugLayerOrder();
    }
};

// Debug function to simulate clicking on a result item
window.simulateItemClick = function() {
    console.log('🔧 [DEBUG] Simulating item click to see what layers are created...');
    
    // Find the first result item and simulate clicking it
    const firstItem = document.querySelector('.dataset-item .clickable-card');
    if (firstItem) {
        console.log('🔧 [DEBUG] Found result item, simulating click...');
        
        // Show layers before click
        console.log('🔧 [DEBUG] BEFORE item click:');
        window.debugLayerOrder();
        
        // Simulate click
        firstItem.click();
        
        // Show layers after click (with a delay to let the async operation complete)
        setTimeout(() => {
            console.log('🔧 [DEBUG] AFTER item click (thumbnail should be visible):');
            window.debugLayerOrder();
        }, 2000);
    } else {
        console.error('🔧 [DEBUG] No result items found - search for some items first');
    }
};

// Debug function to inspect Deck.gl layers
window.debugDeckGLLayers = function() {
    console.log('🔧 [DEBUG] Inspecting Deck.gl layers...');
    
    if (window.stacExplorer && window.stacExplorer.mapManager && window.stacExplorer.mapManager.deckGLIntegration) {
        const deckGL = window.stacExplorer.mapManager.deckGLIntegration;
        
        console.log('🔧 [DEBUG] Deck.gl integration found:', deckGL);
        console.log('🔧 [DEBUG] Deck.gl available:', deckGL.isAvailable ? deckGL.isAvailable() : 'unknown');
        
        // Try to get layer information
        if (deckGL.deck) {
            console.log('🔧 [DEBUG] Deck.gl instance:', deckGL.deck);
            console.log('🔧 [DEBUG] Deck.gl layers:', deckGL.deck.props.layers);
        }
        
        // Try to get performance stats or other info
        if (typeof deckGL.getPerformanceStats === 'function') {
            console.log('🔧 [DEBUG] Deck.gl performance stats:', deckGL.getPerformanceStats());
        }
        
    } else {
        console.log('🔧 [DEBUG] No Deck.gl integration found');
    }
};

// Combined debug function to test Deck.gl removal
window.debugDeckGLRemoval = function() {
    console.log('🔧 [DEBUG] Testing Deck.gl thumbnail removal');
    
    // Show Deck.gl state before
    console.log('🔧 [DEBUG] BEFORE Deck.gl removal:');
    window.debugDeckGLLayers();
    
    // Test Deck.gl removal
    if (window.stacExplorer && window.stacExplorer.visualizationPanel) {
        const vizPanel = window.stacExplorer.visualizationPanel;
        vizPanel.removeDeckGLThumbnailLayers();
    }
    
    // Show Deck.gl state after
    setTimeout(() => {
        console.log('🔧 [DEBUG] AFTER Deck.gl removal:');
        window.debugDeckGLLayers();
    }, 500);
};