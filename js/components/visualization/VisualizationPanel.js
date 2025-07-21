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
            
            // Remove any preview layer created by mapManager.displayItemOnMap
            if (newLayerId && this.rasterManager.mapManager && typeof this.rasterManager.mapManager.removeCurrentLayer === 'function') {
                console.log(`🗑️ [LOADING] Removing preview layer`);
                this.rasterManager.mapManager.removeCurrentLayer();
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
}