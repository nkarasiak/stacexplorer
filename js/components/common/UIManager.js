/**
 * UIManager.js - Core UI functionality handling global UI interactions
 */

import { loadCollections, getCollectionName } from '../../utils/CollectionConfig.js';

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
        console.log('🔧 Setting up event listeners...');
        
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
            console.log('🔧 Theme toggle listener added');
        } else {
            console.warn('🔧 Theme toggle button not found');
        }
        
        // Theme selector in settings modal
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) {
            themeSelector.addEventListener('change', (e) => {
                this.handleThemeSelection(e.target.value);
            });
        } else {
            console.warn('🔧 Theme selector not found');
        }
        
        // Settings panel
        const settingsToggle = document.getElementById('settings-toggle');
        const settingsPanel = document.getElementById('settings-panel');
        const settingsCloseBtn = document.getElementById('settings-close-btn');
        
        console.log('🔧 Settings elements found:', {
            settingsToggle: !!settingsToggle,
            settingsPanel: !!settingsPanel,
            settingsCloseBtn: !!settingsCloseBtn,
            settingsToggleEl: settingsToggle,
            settingsPanelEl: settingsPanel
        });
        
        if (settingsToggle && settingsPanel) {
            console.log('🔧 Adding settings button click listener');
            // Mark that we've added the main listener
            settingsToggle.setAttribute('data-main-listener-added', 'true');
            settingsToggle.addEventListener('click', (e) => {
                console.log('🔧 Settings button clicked!');
                e.preventDefault();
                e.stopPropagation();
                this.showSettingsPanel();
            });
            console.log('🔧 Settings button listener added successfully');
            
            if (settingsCloseBtn) {
                settingsCloseBtn.addEventListener('click', () => {
                    console.log('🔧 Settings close button clicked');
                    this.hideSettingsPanel();
                });
            } else {
                console.warn('🔧 Settings close button not found');
            }
            
            // Close panel with Escape key
            this.handleSettingsPanelEscape = (e) => {
                if (e.key === 'Escape') {
                    this.hideSettingsPanel();
                }
            };
            document.addEventListener('keydown', this.handleSettingsPanelEscape);
        }
        
        // Initialize dynamic UI elements from collections.json
        this.initializeDynamicUI();
        
        // Browse Collections panel
        const browseCollectionsCloseBtn = document.getElementById('browse-collections-close-btn');
        if (browseCollectionsCloseBtn) {
            browseCollectionsCloseBtn.addEventListener('click', () => {
                console.log('🔧 Browse Collections close button clicked');
                this.hideBrowseCollectionsPanel();
            });
        } else {
            console.warn('🔧 Browse Collections close button not found');
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
            console.warn('Tools panel not found');
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
        console.log('🎨 System prefers dark mode:', prefersDark);
        
        let themeToApply;
        
        if (savedTheme) {
            // Use saved preference
            themeToApply = savedTheme;
            console.log('🎨 Using saved theme preference:', savedTheme);
        } else {
            // Default to system preference (Auto mode)
            themeToApply = prefersDark ? 'dark' : 'light';
            console.log('🎨 Using system theme preference (Auto):', themeToApply, '(system prefers dark:', prefersDark + ')');
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
                console.log('🎨 System theme changed to:', newTheme);
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
        
        console.log(`🎨 Theme set to: ${theme}, event dispatched:`, themeChangeEvent.detail);
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
        console.log('💾 Saved theme preference:', newTheme);
        
        // Apply the new theme
        this.setTheme(newTheme);
    }
    
    /**
     * Handle theme selection from dropdown
     * @param {string} themeChoice - 'auto', 'dark', or 'light'
     */
    handleThemeSelection(themeChoice) {
        console.log('🎨 Theme selection changed to:', themeChoice);
        
        if (themeChoice === 'auto') {
            // Remove saved preference to use system preference
            localStorage.removeItem('stac-explorer-theme');
            
            // Apply system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const systemTheme = prefersDark ? 'dark' : 'light';
            this.setTheme(systemTheme);
            
            console.log('🎨 Auto theme - using system preference:', systemTheme);
        } else {
            // Save explicit preference and apply it
            localStorage.setItem('stac-explorer-theme', themeChoice);
            this.setTheme(themeChoice);
            
            console.log('💾 Saved explicit theme preference:', themeChoice);
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
            console.warn('Error checking GPU status:', error);
            gpuStatusText.textContent = 'Unable to determine GPU status';
        }
    }
    
    /**
     * Show settings panel
     */
    showSettingsPanel() {
        console.log('🔧 showSettingsPanel called');
        const settingsPanel = document.getElementById('settings-panel');
        const mapDiv = document.getElementById('map');
        
        if (settingsPanel && mapDiv) {
            console.log('🔧 Showing settings panel');
            
            // Hide map and show settings panel
            mapDiv.style.display = 'none';
            settingsPanel.style.display = 'block';
            
            // Update theme selector when panel opens
            this.updateThemeSelector('panel');
            
            // Update GPU status when panel opens
            this.updateGPUStatus('panel');
            
            // Initialize catalog toggles for panel
            this.populateCatalogToggles('panel');
            
            console.log('🔧 Settings panel shown');
        } else {
            console.error('🔧 Settings panel or map element not found!');
        }
    }
    
    /**
     * Hide settings panel
     */
    hideSettingsPanel() {
        console.log('🔧 hideSettingsPanel called');
        
        const settingsPanel = document.getElementById('settings-panel');
        const mapDiv = document.getElementById('map');
        
        if (settingsPanel && mapDiv) {
            // Hide settings panel and show map
            settingsPanel.style.display = 'none';
            mapDiv.style.display = 'block';
            
            console.log('🔧 Settings panel hidden, map restored');
        }
    }
    
    /**
     * Hide Browse Collections panel
     */
    hideBrowseCollectionsPanel() {
        console.log('🔧 hideBrowseCollectionsPanel called');
        
        const browsePanel = document.getElementById('browse-collections-panel');
        
        if (browsePanel) {
            // Hide browse collections panel
            browsePanel.style.display = 'none';
            
            console.log('🔧 Browse Collections panel hidden');
        } else {
            console.warn('🔧 Browse Collections panel not found');
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
        console.log('🔧 showBrowseCollectionsPanel called');
        const browseCollectionsPanel = document.getElementById('browse-collections-panel');
        const mapDiv = document.getElementById('map');
        
        if (browseCollectionsPanel && mapDiv) {
            console.log('🔧 Showing browse collections panel');
            
            // Hide map and show browse collections panel
            mapDiv.style.display = 'none';
            browseCollectionsPanel.style.display = 'block';
            
            console.log('🔧 Browse collections panel shown');
        } else {
            console.error('🔧 Browse collections panel or map element not found!');
        }
    }
    
    /**
     * Hide browse collections panel
     */
    hideBrowseCollectionsPanel() {
        console.log('🔧 hideBrowseCollectionsPanel called');
        
        const browseCollectionsPanel = document.getElementById('browse-collections-panel');
        const mapDiv = document.getElementById('map');
        
        if (browseCollectionsPanel && mapDiv) {
            // Hide browse collections panel and show map
            browseCollectionsPanel.style.display = 'none';
            mapDiv.style.display = 'block';
            
            console.log('🔧 Browse collections panel hidden, map restored');
            
            // Ensure trigger button is properly reset
            const trigger = document.querySelector('.collection-browser-trigger');
            if (trigger) {
                trigger.classList.remove('loading');
                console.log('🔧 Trigger button reset after panel close');
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
        
        console.log(`📊 Catalog ${catalogKey} ${isEnabled ? 'enabled' : 'disabled'}`);
        
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
}