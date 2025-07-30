/**
 * UIManager.js - Core UI functionality handling global UI interactions
 */

import { loadCollections, loadAllCollections, getCollectionName } from '../../utils/CollectionConfig.js';

export class UIManager {
    constructor() {
        this.sidebarCollapsed = false;
        this.toolsPanelCollapsed = true;
        this.cardStates = {
            'search-container': false,
            'results-card': false
        };
        this.modalJustOpened = false; // Flag to prevent immediate closure
        
        // Initialize theme system first
        this.initializeTheme();
        
        // Initialize UI event listeners
        this.initializeUI();
    }
    
    /**
     * Initialize UI components and event listeners
     */
    initializeUI() {
        // Wait for DOM to be fully ready
        if (document.readyState !== 'loading') {
            this.setupEventListeners();
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
            });
        }
    }
    
    setupEventListeners() {
        
        // Custom catalog URL changed event
        document.addEventListener('customCatalogUrlChanged', async (e) => {
            const url = e.detail.url;
            if (url) {
                await this.validateAndAddCustomCatalog(url);
            } else {
                this.removeCustomCatalog();
            }
        });
        
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        } else {
        }
        
        // Theme selector in settings modal
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) {
            themeSelector.addEventListener('change', (e) => {
                this.handleThemeSelection(e.target.value);
            });
        } else {
        }
        
        // Settings panel - now handled by routing to /settings page
        
        // Initialize dynamic UI elements from collections.json
        this.initializeDynamicUI();
        
        // Browse Collections panel
        const browseCollectionsCloseBtn = document.getElementById('browse-collections-close-btn');
        if (browseCollectionsCloseBtn) {
            browseCollectionsCloseBtn.addEventListener('click', () => {
                this.hideBrowseCollectionsPanel();
            });
        } else {
        }
        
        // ESC key to close Browse Collections panel
        this.handleBrowseCollectionsPanelEscape = (e) => {
            if (e.key === 'Escape') {
                const browsePanel = document.getElementById('browse-collections-panel');
                if (browsePanel && browsePanel.style.display !== 'none') {
                    this.hideBrowseCollectionsPanel();
                }
            }
        };
        document.addEventListener('keydown', this.handleBrowseCollectionsPanelEscape);
        
        // Sidebar toggle
        document.getElementById('sidebar-toggle').addEventListener('click', () => {
            this.toggleSidebar();
        });
        
        // Tools panel toggle
        const toolsHeader = document.getElementById('tools-header');
        if (toolsHeader) {
            toolsHeader.addEventListener('click', () => {
                this.toggleToolsPanel();
            });
        }
        
        // Initialize collapsible cards
        this.initializeCollapsibleCards();
        
        // Listen for custom events
        document.addEventListener('toggleCard', (event) => {
            if (event.detail && event.detail.cardId) {
                this.toggleCard(event.detail.cardId);
            }
        });
        
        // No fallback listeners needed - main listener should be sufficient
    }
    
    /**
     * Initialize collapsible cards
     */
    initializeCollapsibleCards() {
        // Set up click handlers for all card headers
        const cardIds = ['search-container', 'results-card'];
        
        cardIds.forEach(cardId => {
            const headerId = cardId === 'search-container' ? 'search-container-header' : 'results-header';
            const headerEl = document.getElementById(headerId);
            const cardEl = document.getElementById(cardId);
            
            headerEl.addEventListener('click', () => {
                this.toggleCard(cardId);
            });
        });
    }
    
    /**
     * Toggle card collapse state
     * @param {string} cardId - ID of the card to toggle
     */
    toggleCard(cardId) {
        const cardEl = document.getElementById(cardId);
        const isCollapsed = cardEl.classList.contains('collapsed');
        
        // Update state
        this.cardStates[cardId] = !isCollapsed;
        
        if (isCollapsed) {
            // Expand the card
            cardEl.classList.remove('collapsed');
            
            // Collapse all other cards
            const cardIds = Object.keys(this.cardStates);
            cardIds.forEach(otherId => {
                if (otherId !== cardId) {
                    const otherCard = document.getElementById(otherId);
                    if (otherCard && !otherCard.classList.contains('collapsed')) {
                        otherCard.classList.add('collapsed');
                        this.cardStates[otherId] = false;
                    }
                }
            });
        } else {
            // Collapse the card
            cardEl.classList.add('collapsed');
        }
    }
    
    /**
     * Toggle sidebar collapse state
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleIcon = document.querySelector('#sidebar-toggle i');
        this.sidebarCollapsed = !this.sidebarCollapsed;
        
        if (this.sidebarCollapsed) {
            sidebar.classList.add('collapsed');
            // Update icon for collapsed state
            toggleIcon.textContent = 'chevron_right';
        } else {
            sidebar.classList.remove('collapsed');
            // Update icon for expanded state
            toggleIcon.textContent = 'chevron_left';
        }
        
        // Trigger a window resize event to update map
        window.dispatchEvent(new Event('resize'));
    }
    
    /**
     * Toggle tools panel collapse state
     */
    toggleToolsPanel() {
        const toolsPanel = document.getElementById('tools-panel');
        if (!toolsPanel) {
            return;
        }

        const toggleIcon = document.querySelector('#tools-toggle i');
        this.toolsPanelCollapsed = !this.toolsPanelCollapsed;

        if (this.toolsPanelCollapsed) {
            toolsPanel.classList.add('collapsed');
        } else {
            toolsPanel.classList.remove('collapsed');
        }
    }
    
    /**
     * Initialize theme system with persistence and system preference detection
     */
    initializeTheme() {
        const html = document.documentElement;
        
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('stac-explorer-theme');
        
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        let themeToApply;
        
        if (savedTheme) {
            // Use saved preference
            themeToApply = savedTheme;
        } else {
            // Default to system preference (Auto mode)
            themeToApply = prefersDark ? 'dark' : 'light';
        }
        
        // Apply the theme
        this.setTheme(themeToApply);
        
        // Update theme selectors to reflect current setting
        this.updateThemeSelector('modal');
        this.updateThemeSelector('panel');
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only auto-switch if no user preference is saved
            if (!localStorage.getItem('stac-explorer-theme')) {
                const newTheme = e.matches ? 'dark' : 'light';
                this.setTheme(newTheme);
            }
        });
    }
    
    /**
     * Set theme and update UI
     * @param {string} theme - 'dark' or 'light'
     */
    setTheme(theme) {
        const html = document.documentElement;
        const themeToggleIcon = document.querySelector('#theme-toggle i');
        
        // Remove existing theme classes
        html.classList.remove('dark-theme', 'light-theme');
        
        // Add new theme class
        html.classList.add(`${theme}-theme`);
        
        // Update toggle icon
        if (themeToggleIcon) {
            themeToggleIcon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
        }
        
        // Dispatch theme change event for map and other components
        const themeChangeEvent = new CustomEvent('themeChange', {
            detail: { 
                theme: theme === 'light' ? 'Light' : 'Dark',
                themeMode: theme
            }
        });
        document.dispatchEvent(themeChangeEvent);
        
    }
    
    /**
     * Toggle between light and dark themes with persistence
     */
    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.classList.contains('light-theme') ? 'light' : 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        // Save theme preference
        localStorage.setItem('stac-explorer-theme', newTheme);
        
        // Apply the new theme
        this.setTheme(newTheme);
    }
    
    /**
     * Handle theme selection from dropdown
     * @param {string} themeChoice - 'auto', 'dark', or 'light'
     */
    handleThemeSelection(themeChoice) {
        
        if (themeChoice === 'auto') {
            // Remove saved preference to use system preference
            localStorage.removeItem('stac-explorer-theme');
            
            // Apply system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const systemTheme = prefersDark ? 'dark' : 'light';
            this.setTheme(systemTheme);
            
        } else {
            // Save explicit preference and apply it
            localStorage.setItem('stac-explorer-theme', themeChoice);
            this.setTheme(themeChoice);
            
        }
        
        // Update theme selectors to reflect the change
        this.updateThemeSelector('modal');
        this.updateThemeSelector('panel');
    }
    
    /**
     * Update theme selector dropdown to reflect current state
     */
    updateThemeSelector(context = 'modal') {
        const selectorId = context === 'panel' ? 'theme-selector-panel' : 'theme-selector';
        const themeSelector = document.getElementById(selectorId);
        if (!themeSelector) return;
        
        const savedTheme = localStorage.getItem('stac-explorer-theme');
        
        if (savedTheme) {
            // User has explicit preference
            themeSelector.value = savedTheme;
        } else {
            // No explicit preference - using system
            themeSelector.value = 'auto';
        }
        
        // Add event listener if not already added
        if (!themeSelector.hasAttribute('data-listener-added')) {
            themeSelector.addEventListener('change', (e) => {
                this.handleThemeSelection(e.target.value);
            });
            themeSelector.setAttribute('data-listener-added', 'true');
        }
    }
    
    /**
     * Get current theme
     * @returns {string} 'dark' or 'light'
     */
    getCurrentTheme() {
        return document.documentElement.classList.contains('light-theme') ? 'light' : 'dark';
    }
    
    /**
     * Get current theme preference setting
     * @returns {string} 'auto', 'dark', or 'light'
     */
    getThemePreference() {
        const savedTheme = localStorage.getItem('stac-explorer-theme');
        return savedTheme || 'auto';
    }
    
    /**
     * Update GPU status in settings modal or panel
     */
    updateGPUStatus(context = 'modal') {
        const statusId = context === 'panel' ? 'gpu-status-text-panel' : 'gpu-status-text';
        const gpuStatusText = document.getElementById(statusId);
        if (!gpuStatusText) return;
        
        try {
            // Check if we have access to a map manager instance (global or through window)
            let mapManager = null;
            if (window.mapManager) {
                mapManager = window.mapManager;
            } else if (window.app && window.app.mapManager) {
                mapManager = window.app.mapManager;
            }
            
            if (mapManager && mapManager.deckGLIntegration) {
                if (mapManager.deckGLIntegration.isAvailable()) {
                    const stats = mapManager.deckGLIntegration.getPerformanceStats();
                    if (stats && stats.isWebGL2) {
                        gpuStatusText.textContent = 'WebGL2 acceleration available';
                    } else {
                        gpuStatusText.textContent = 'GPU acceleration active';
                    }
                } else {
                    gpuStatusText.textContent = 'GPU acceleration unavailable - using CPU rendering';
                }
            } else {
                // Check for WebGL support manually
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                if (gl) {
                    gpuStatusText.textContent = 'WebGL available - GPU acceleration possible';
                } else {
                    gpuStatusText.textContent = 'WebGL not supported - CPU rendering only';
                }
            }
        } catch (error) {
            gpuStatusText.textContent = 'Unable to determine GPU status';
        }
    }
    
    /**
     * Show settings panel
     */
    showSettingsPanel() {
        const settingsPanel = document.getElementById('settings-panel');
        const mapDiv = document.getElementById('map');
        
        if (settingsPanel && mapDiv) {
            
            // Hide map and show settings panel
            mapDiv.style.display = 'none';
            settingsPanel.style.display = 'block';
            
            // Update theme selector when panel opens
            this.updateThemeSelector('panel');
            
            // Update GPU status when panel opens
            this.updateGPUStatus('panel');
            
            // Initialize catalog toggles for panel
            this.populateCatalogToggles('panel');
            
            // Load custom catalog URL
            this.loadCustomCatalogUrl();
            
        } else {
        }
    }
    
    /**
     * Hide settings panel
     */
    hideSettingsPanel() {
        
        const settingsPanel = document.getElementById('settings-panel');
        const mapDiv = document.getElementById('map');
        
        if (settingsPanel && mapDiv) {
            // Hide settings panel and show map
            settingsPanel.style.display = 'none';
            mapDiv.style.display = 'block';
            
        }
    }
    
    /**
     * Hide Browse Collections panel
     */
    hideBrowseCollectionsPanel() {
        
        const browsePanel = document.getElementById('browse-collections-panel');
        
        if (browsePanel) {
            // Hide browse collections panel
            browsePanel.style.display = 'none';
            
        } else {
        }
        
        // Remove escape key handler
        if (this.handleSettingsPanelEscape) {
            document.removeEventListener('keydown', this.handleSettingsPanelEscape);
        }
    }
    
    /**
     * Show browse collections panel
     */
    showBrowseCollectionsPanel() {
        const browseCollectionsPanel = document.getElementById('browse-collections-panel');
        const mapDiv = document.getElementById('map');
        
        if (browseCollectionsPanel && mapDiv) {
            
            // Hide map and show browse collections panel
            mapDiv.style.display = 'none';
            browseCollectionsPanel.style.display = 'block';
            
        } else {
        }
    }
    
    /**
     * Hide browse collections panel
     */
    hideBrowseCollectionsPanel() {
        
        const browseCollectionsPanel = document.getElementById('browse-collections-panel');
        const mapDiv = document.getElementById('map');
        
        if (browseCollectionsPanel && mapDiv) {
            // Hide browse collections panel and show map
            browseCollectionsPanel.style.display = 'none';
            mapDiv.style.display = 'block';
            
            
            // Ensure trigger button is properly reset
            const trigger = document.querySelector('.collection-browser-trigger');
            if (trigger) {
                trigger.classList.remove('loading');
            }
        }
    }
    
    /**
     * Initialize dynamic UI elements from collections.json
     */
    async initializeDynamicUI() {
        await this.populateCatalogDropdown();
        await this.populateCatalogToggles('modal');
    }
    
    /**
     * Populate catalog dropdown with collections from collections.json
     */
    async populateCatalogDropdown() {
        const collections = await loadCollections();
        const catalogSelect = document.getElementById('catalog-select');
        
        if (!catalogSelect) return;
        
        // Get existing options (auto-detect and custom)
        const autoDetectOption = catalogSelect.querySelector('option[value=""]');
        const customOption = catalogSelect.querySelector('option[value="custom"]');
        
        // Clear all options
        catalogSelect.innerHTML = '';
        
        // Re-add auto-detect option
        if (autoDetectOption) {
            catalogSelect.appendChild(autoDetectOption);
        }
        
        // Add collection options
        collections.forEach(collection => {
            const option = document.createElement('option');
            option.value = collection.id;
            
            // Add appropriate emoji/icon based on collection name
            const icons = {
                'cdse-stac': '🛰️',
                'earth-search-aws': '🌍',
                'microsoft-pc': '💻',
                'planetlabs': '🪐',
                'gee': '🌎'
            };
            
            const icon = icons[collection.id] || '📊';
            option.textContent = `${icon} ${collection.name}`;
            catalogSelect.appendChild(option);
        });
        
        // Re-add custom option
        if (customOption) {
            catalogSelect.appendChild(customOption);
        }
    }
    
    /**
     * Populate catalog toggles with collections from collections.json
     */
    async populateCatalogToggles(context = 'modal') {
        const suffix = context === 'panel' ? '-panel' : '';
        const containerId = `catalog-toggles-${context}-container`;
        const container = document.getElementById(containerId);
        
        if (!container) return;
        
        const collections = await loadCollections();
        
        // Clear existing content
        container.innerHTML = '';
        
        // Create toggle for each collection
        collections.forEach(collection => {
            const toggleId = `catalog-${collection.id}-toggle${suffix}`;
            const description = collection.description || 'STAC data catalog';
            
            // Create toggle HTML
            const toggleHTML = `
                <div class="setting-item">
                    <div class="setting-content">
                        <div class="setting-label">${collection.name}</div>
                        <div class="setting-description">${description}</div>
                    </div>
                    <div class="setting-control">
                        <label class="toggle-switch">
                            <input type="checkbox" id="${toggleId}" ${collection.enabled !== false ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            `;
            
            container.insertAdjacentHTML('beforeend', toggleHTML);
            
            // Add event listener
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                // Load saved state
                const savedState = localStorage.getItem(`catalog-${collection.id}-enabled`);
                const defaultState = collection.enabled !== false;
                const isEnabled = savedState !== null ? savedState === 'true' : defaultState;
                
                toggle.checked = isEnabled;
                
                toggle.addEventListener('change', (e) => {
                    this.handleCatalogToggle(collection.id, e.target.checked);
                });
            }
        });
    }
    
    /**
     * Handle catalog toggle change
     */
    handleCatalogToggle(catalogKey, isEnabled) {
        // Save to localStorage
        localStorage.setItem(`catalog-${catalogKey}-enabled`, isEnabled.toString());
        
        // Dispatch custom event for other components to listen to
        document.dispatchEvent(new CustomEvent('catalogToggled', {
            detail: {
                catalogKey: catalogKey,
                enabled: isEnabled
            }
        }));
        
        
        // Optional: Show a brief notification
        if (window.notificationService) {
            getCollectionName(catalogKey).then(catalogName => {
                const displayName = catalogName || catalogKey;
                const status = isEnabled ? 'enabled' : 'disabled';
                window.notificationService.show(`${displayName} ${status}`, 'info', 2000);
            });
        }
    }
    
    /**
     * Get current catalog enabled states
     */
    async getCatalogStates() {
        const states = {};
        const collections = await loadCollections();
        
        collections.forEach(collection => {
            const catalogKey = collection.id;
            const savedState = localStorage.getItem(`catalog-${catalogKey}-enabled`);
            const defaultState = collection.enabled !== false;
            states[catalogKey] = savedState !== null ? savedState === 'true' : defaultState;
        });
        
        return states;
    }
    
    /**
     * Load custom catalog URL from localStorage
     */
    loadCustomCatalogUrl() {
        const customCatalogInput = document.getElementById('custom-catalog-url');
        if (customCatalogInput) {
            const savedUrl = localStorage.getItem('stacExplorer-customCatalogUrl') || '';
            customCatalogInput.value = savedUrl;
            
            // Load existing custom catalog if present
            const savedCustomCatalog = localStorage.getItem('stacExplorer-customCatalog');
            if (savedCustomCatalog && savedUrl) {
                try {
                    const customCatalog = JSON.parse(savedCustomCatalog);
                    this.addCustomCatalogToUI(customCatalog);
                    this.showCustomCatalogStatus('✓ Custom catalog loaded', 'success');
                } catch (error) {
                }
            }
            
            // Add event listener to save changes (debounced)
            let saveTimeout;
            customCatalogInput.addEventListener('input', (e) => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    this.saveCustomCatalogUrl(e.target.value);
                }, 1000); // Wait 1 second after user stops typing
            });
            
            customCatalogInput.addEventListener('blur', (e) => {
                clearTimeout(saveTimeout);
                this.saveCustomCatalogUrl(e.target.value);
            });
            
            // Add button event listener
            const addCustomCatalogBtn = document.getElementById('add-custom-catalog-btn');
            if (addCustomCatalogBtn) {
                addCustomCatalogBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const url = customCatalogInput.value.trim();
                    if (url) {
                        this.saveCustomCatalogUrl(url);
                    } else {
                    }
                });
            } else {
            }
        }
    }
    
    /**
     * Save custom catalog URL to localStorage
     */
    async saveCustomCatalogUrl(url) {
        const trimmedUrl = url.trim();
        localStorage.setItem('stacExplorer-customCatalogUrl', trimmedUrl);
        
        if (trimmedUrl) {
            // Try to fetch catalog information
            await this.validateAndAddCustomCatalog(trimmedUrl);
        } else {
            // Remove custom catalog if URL is empty
            this.removeCustomCatalog();
        }
        
        // Dispatch event for other components to react to the change
        document.dispatchEvent(new CustomEvent('customCatalogUrlChanged', {
            detail: { url: trimmedUrl }
        }));
        
    }
    
    /**
     * Get custom catalog URL
     */
    getCustomCatalogUrl() {
        return localStorage.getItem('stacExplorer-customCatalogUrl') || '';
    }
    
    /**
     * Validate and add custom catalog
     */
    async validateAndAddCustomCatalog(url) {
        try {
            
            // Show loading indicator
            this.showCustomCatalogStatus('Validating catalog...', 'loading');
            
            // Disable the add button during validation
            const addBtn = document.getElementById('add-custom-catalog-btn');
            if (addBtn) {
                addBtn.disabled = true;
                addBtn.textContent = 'Validating...';
            }
            
            // Try to fetch the catalog
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const catalogData = await response.json();
            
            // Basic STAC catalog validation
            if (!catalogData.type || !['Catalog', 'Collection'].includes(catalogData.type)) {
                throw new Error('Not a valid STAC catalog or collection');
            }
            
            // Create custom catalog configuration
            const customCatalog = {
                id: 'custom-catalog',
                name: catalogData.title || catalogData.id || 'Custom Catalog',
                description: catalogData.description || 'User-provided STAC catalog',
                url: url,
                type: catalogData.type,
                enabled: true,
                isCustom: true
            };
            
            // Save custom catalog
            localStorage.setItem('stacExplorer-customCatalog', JSON.stringify(customCatalog));
            
            // Add to UI
            this.addCustomCatalogToUI(customCatalog);
            
            this.showCustomCatalogStatus('✓ Catalog validated successfully', 'success');
            
            
            // Trigger collections refresh to include the new custom catalog
            document.dispatchEvent(new CustomEvent('refreshCollections'));
            
            // Also dispatch a more general event for other components
            document.dispatchEvent(new CustomEvent('customCatalogAdded', {
                detail: customCatalog
            }));
            
        } catch (error) {
            this.showCustomCatalogStatus(`✗ Error: ${error.message}`, 'error');
        } finally {
            // Re-enable the add button
            const addBtn = document.getElementById('add-custom-catalog-btn');
            if (addBtn) {
                addBtn.disabled = false;
                addBtn.textContent = 'Add';
            }
        }
    }
    
    /**
     * Add custom catalog to the UI
     */
    addCustomCatalogToUI(catalog) {
        const container = document.getElementById('catalog-toggles-panel-container');
        if (!container) return;
        
        // Remove existing custom catalog if present
        const existingCustom = container.querySelector('[data-catalog="custom-catalog"]');
        if (existingCustom) {
            existingCustom.remove();
        }
        
        // Create toggle HTML for custom catalog
        const toggleHTML = `
            <div class="setting-item" data-catalog="custom-catalog">
                <div class="setting-content">
                    <div class="setting-label">
                        <i class="material-icons" style="font-size: 16px; margin-right: 6px; color: var(--primary-color, #667eea);">link</i>
                        ${catalog.name}
                    </div>
                    <div class="setting-description">${catalog.description}</div>
                    <div class="setting-url" style="font-size: 12px; color: var(--text-secondary, #6b7280); margin-top: 4px;">
                        ${catalog.url}
                    </div>
                </div>
                <div class="setting-control">
                    <label class="toggle-switch">
                        <input type="checkbox" id="catalog-custom-catalog-toggle-panel" data-catalog="custom-catalog" checked>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        `;
        
        // Add to the beginning of the container
        container.insertAdjacentHTML('afterbegin', toggleHTML);
        
        // Add event listener for the toggle
        const toggle = container.querySelector('#catalog-custom-catalog-toggle-panel');
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                const isEnabled = e.target.checked;
                catalog.enabled = isEnabled;
                localStorage.setItem('stacExplorer-customCatalog', JSON.stringify(catalog));
                localStorage.setItem('catalog-custom-catalog-enabled', isEnabled.toString());
            });
        }
    }
    
    /**
     * Remove custom catalog
     */
    removeCustomCatalog() {
        // Remove from localStorage
        localStorage.removeItem('stacExplorer-customCatalog');
        localStorage.removeItem('catalog-custom-catalog-enabled');
        
        // Remove from UI
        const container = document.getElementById('catalog-toggles-panel-container');
        if (container) {
            const existingCustom = container.querySelector('[data-catalog="custom-catalog"]');
            if (existingCustom) {
                existingCustom.remove();
            }
        }
        
        this.showCustomCatalogStatus('', 'hidden');
    }
    
    /**
     * Show status message for custom catalog
     */
    showCustomCatalogStatus(message, type = 'info') {
        let statusEl = document.getElementById('custom-catalog-status');
        
        if (!statusEl && type !== 'hidden') {
            // Create status element
            const customCatalogSection = document.querySelector('#custom-catalog-url').closest('.setting-item');
            if (customCatalogSection) {
                statusEl = document.createElement('div');
                statusEl.id = 'custom-catalog-status';
                statusEl.style.cssText = 'margin-top: 8px; padding: 6px 12px; border-radius: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;';
                customCatalogSection.appendChild(statusEl);
            }
        }
        
        if (statusEl) {
            if (type === 'hidden') {
                statusEl.style.display = 'none';
                return;
            }
            
            statusEl.style.display = 'flex';
            statusEl.textContent = message;
            
            // Style based on type
            switch (type) {
                case 'loading':
                    statusEl.style.background = 'var(--accent-50, #f0f9ff)';
                    statusEl.style.color = 'var(--accent-700, #0369a1)';
                    statusEl.style.border = '1px solid var(--accent-200, #bae6fd)';
                    break;
                case 'success':
                    statusEl.style.background = 'var(--success-50, #f0fdf4)';
                    statusEl.style.color = 'var(--success-700, #15803d)';
                    statusEl.style.border = '1px solid var(--success-200, #bbf7d0)';
                    break;
                case 'error':
                    statusEl.style.background = 'var(--danger-50, #fef2f2)';
                    statusEl.style.color = 'var(--danger-700, #b91c1c)';
                    statusEl.style.border = '1px solid var(--danger-200, #fecaca)';
                    break;
            }
        }
    }
}