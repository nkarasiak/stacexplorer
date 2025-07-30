/**
 * SettingsPageManager.js - Manages the dedicated settings page
 */

export class SettingsPageManager {
    constructor() {
        this.customCatalogUrl = '';
        this.providers = {};
    }

    /**
     * Initialize the settings page
     */
    async initialize() {
        console.log('🔧 Initializing settings page');
        
        // Load collections first
        await this.loadCollections();
        
        // Load saved settings
        this.loadSettings();
        
        // Render the settings page
        this.renderSettingsPage();
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('🔧 Settings page initialized');
    }

    /**
     * Load collections from collections.json
     */
    async loadCollections() {
        try {
            // Use base path for GitHub Pages compatibility
            const basePath = window.location.hostname.endsWith('.github.io') && 
                            window.location.pathname.startsWith('/stacexplorer/') ? '/stacexplorer' : '';
            const response = await fetch(basePath + '/collections.json');
            if (!response.ok) {
                throw new Error(`Failed to load collections: ${response.status}`);
            }
            
            const data = await response.json();
            const collections = data.collections || [];
            
            // Convert collections to providers format
            collections.forEach(collection => {
                this.providers[collection.id] = {
                    name: collection.name,
                    icon: this.getProviderIcon(collection.id),
                    enabled: collection.enabled !== false // Default to true unless explicitly false
                };
            });
            
            // Add custom catalog if it exists
            try {
                const customCatalogData = localStorage.getItem('stacExplorer-customCatalog');
                if (customCatalogData) {
                    const customCatalog = JSON.parse(customCatalogData);
                    this.providers['custom-catalog'] = {
                        name: customCatalog.name,
                        icon: this.getProviderIcon('custom-catalog'),
                        enabled: true // Default to enabled when added
                    };
                    console.log('🔧 Added custom catalog to providers:', customCatalog.name);
                }
            } catch (error) {
                console.warn('🔧 Error loading custom catalog for providers:', error);
            }
            
            console.log('🔧 Loaded collections as providers:', this.providers);
            
        } catch (error) {
            console.error('🔧 Error loading collections:', error);
            // Fallback to hardcoded providers
            this.providers = {
                'cdse-stac': {
                    name: 'Copernicus Data Space',
                    icon: 'satellite',
                    enabled: true
                },
                'earth-search-aws': {
                    name: 'Element84 Earth Search',
                    icon: 'cloud',
                    enabled: true
                },
                'microsoft-pc': {
                    name: 'Microsoft Planetary Computer',
                    icon: 'public',
                    enabled: true
                }
            };
        }
    }

    /**
     * Get appropriate icon for provider
     */
    getProviderIcon(providerId) {
        const iconMap = {
            'cdse-stac': 'satellite',
            'copernicus': 'satellite',
            'earth-search-aws': 'cloud',
            'element84': 'cloud',
            'microsoft-pc': 'public',
            'planetary': 'public',
            'planetlabs': 'language',
            'gee': 'terrain',
            'custom-catalog': 'link'
        };
        return iconMap[providerId] || 'storage';
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            // Load custom catalog URL
            this.customCatalogUrl = localStorage.getItem('stacExplorer-customCatalogUrl') || '';
            
            // Load provider settings from localStorage
            const savedSettings = localStorage.getItem('stacExplorerSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                if (settings.enabledProviders && Array.isArray(settings.enabledProviders)) {
                    // Update provider enabled status based on saved settings
                    Object.keys(this.providers).forEach(key => {
                        this.providers[key].enabled = settings.enabledProviders.includes(key);
                    });
                }
            }
            
            console.log('🔧 Settings loaded:', { customCatalogUrl: this.customCatalogUrl, providers: this.providers });
        } catch (error) {
            console.error('🔧 Error loading settings:', error);
        }
    }

    /**
     * Render the settings page content
     */
    renderSettingsPage() {
        // Hide main app elements
        this.hideMainAppElements();
        
        const mainContent = document.querySelector('main') || document.body;
        
        const settingsHTML = `
            <div class="settings-page">
                <div class="settings-header">
                    <div class="settings-title">
                        <i class="material-icons">settings</i>
                        Settings
                    </div>
                </div>
                
                <!-- Theme Section -->
                <div class="settings-section">
                    <div class="settings-section-title">
                        <i class="material-icons">palette</i>
                        Theme
                    </div>
                    <div class="setting-item">
                        <label class="setting-label" for="theme-selector">Appearance</label>
                        <div class="setting-description">
                            Choose how STAC Explorer looks to you.
                        </div>
                        <div class="setting-control">
                            <select id="theme-selector" class="settings-input" style="flex: none; width: 150px;">
                                <option value="auto">System</option>
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Data Providers Section -->
                <div class="settings-section">
                    <div class="settings-section-title">
                        <i class="material-icons">storage</i>
                        Data Providers
                    </div>
                    <div class="setting-description">
                        Enable or disable data providers. Changes will take effect immediately.
                    </div>
                    <div class="provider-list" id="provider-list">
                        ${this.renderProviders()}
                    </div>
                </div>
                
                <!-- Custom Catalog Section -->
                <div class="settings-section">
                    <div class="settings-section-title">
                        <i class="material-icons">link</i>
                        Custom Catalog
                    </div>
                    <div class="setting-item">
                        <label class="setting-label" for="custom-catalog-url">STAC Catalog/API URL</label>
                        <div class="setting-description">
                            Enter the root URL of a STAC catalog or API endpoint to add it as a data source.
                        </div>
                        <div class="setting-control">
                            <input type="url" 
                                   id="settings-custom-catalog-url" 
                                   class="settings-input"
                                   placeholder="https://example.com/stac"
                                   value="${this.customCatalogUrl}">
                            <button id="add-custom-catalog-btn" class="btn btn-primary">
                                <i class="material-icons">add</i>
                                Add Catalog
                            </button>
                        </div>
                        <div id="settings-custom-catalog-status" style="display: none;"></div>
                    </div>
                </div>
                
                <!-- Actions Section -->
                <div class="settings-section">
                    <div class="settings-section-title">
                        <i class="material-icons">build</i>
                        Actions
                    </div>
                    <div class="setting-item">
                        <div class="setting-control">
                            <button id="clear-cache-btn" class="btn btn-secondary">
                                <i class="material-icons">clear_all</i>
                                Clear Cache
                            </button>
                            <button id="reset-settings-btn" class="btn btn-secondary">
                                <i class="material-icons">restore</i>
                                Reset Settings
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Hidden elements required by collection browser -->
            <div id="browse-collections-panel" style="display: none;"></div>
            <div id="map" style="display: none;"></div>
        `;
        
        // Add settings page styles
        this.addSettingsStyles();
        
        // Replace main content
        mainContent.innerHTML = settingsHTML;
        
        // Set current theme selection
        this.loadThemeSelection();
    }

    /**
     * Render provider toggles
     */
    renderProviders() {
        return Object.entries(this.providers).map(([key, provider]) => `
            <div class="provider-item">
                <div class="provider-info" 
                     data-catalog="${key}" 
                     role="button" 
                     tabindex="0" 
                     title="Click to browse ${provider.name} collections"
                     style="cursor: pointer;">
                    <div class="provider-icon">
                        <i class="material-icons">${provider.icon}</i>
                    </div>
                    <div class="provider-name">${provider.name}</div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" 
                           data-provider="${key}"
                           ${provider.enabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        `).join('');
    }

    /**
     * Refresh the providers list by reloading collections and updating the UI
     */
    async refreshProviders() {
        console.log('🔧 Refreshing providers list...');
        
        // Reload collections including any new custom catalogs
        await this.loadCollections();
        
        // Update the providers list in the DOM
        const providerList = document.getElementById('provider-list');
        if (providerList) {
            providerList.innerHTML = this.renderProviders();
            
            // Re-attach event listeners for the new provider items
            this.attachProviderEventListeners();
            
            console.log('🔧 Providers list refreshed with', Object.keys(this.providers).length, 'providers');
        }
    }

    /**
     * Attach event listeners for provider items
     */
    attachProviderEventListeners() {
        const providerList = document.getElementById('provider-list');
        if (providerList) {
            // Remove existing event listeners by cloning the element
            const newProviderList = providerList.cloneNode(true);
            providerList.parentNode.replaceChild(newProviderList, providerList);
            
            // Handle toggle changes
            newProviderList.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    const provider = e.target.dataset.provider;
                    this.providers[provider].enabled = e.target.checked;
                    this.saveProviderSettings();
                }
            });
            
            // Handle provider info clicks for collection browsing
            newProviderList.addEventListener('click', (e) => {
                const providerInfo = e.target.closest('.provider-info');
                if (providerInfo) {
                    const catalogId = providerInfo.dataset.catalog;
                    if (catalogId) {
                        console.log('🔍 Opening collection browser for catalog:', catalogId);
                        // Navigate to browser mode for this catalog
                        window.location.href = `/browser/${catalogId}`;
                    }
                }
            });
        }
    }

    /**
     * Hide main app elements but keep sidebar visible
     */
    hideMainAppElements() {
        // Keep sidebar visible - don't hide it
        
        // Hide main content wrapper but not the main container itself
        const mainContentWrapper = document.querySelector('.main-content');
        if (mainContentWrapper) {
            mainContentWrapper.style.display = 'none';
        }
        
        // Hide map container
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            mapContainer.style.display = 'none';
        }
        
        // Hide search results and other panels
        const appElements = document.querySelectorAll('.search-results-panel, .loading-overlay, .catalog-browser-modal');
        appElements.forEach(el => {
            el.style.display = 'none';
        });
        
        // Reset body styles that might constrain layout
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
        
        console.log('🔧 Main app content hidden, sidebar kept visible for settings page');
    }

    /**
     * Add settings page styles to the document
     */
    addSettingsStyles() {
        if (document.getElementById('settings-page-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'settings-page-styles';
        style.textContent = `
            /* Ensure main container takes remaining space after sidebar */
            main {
                margin-left: var(--sidebar-width, 380px) !important;
                width: calc(100vw - var(--sidebar-width, 380px)) !important;
                height: 100vh !important;
                overflow-y: auto !important;
                padding: 0 !important;
                display: block !important;
                position: fixed !important;
                top: 0 !important;
                right: 0 !important;
                box-sizing: border-box !important;
            }
            
            .settings-page {
                width: 100%;
                max-width: none;
                margin: 0;
                padding: 2rem;
                background: var(--surface-primary);
                min-height: 100vh;
                box-sizing: border-box;
            }
            
            /* Ensure sections take full width */
            .settings-section {
                width: 100%;
                box-sizing: border-box;
            }
            
            .setting-control {
                width: 100%;
                box-sizing: border-box;
            }
            
            .settings-input {
                min-width: 0; /* Allow flex shrinking */
            }
            
            /* Remove the back button since we have sidebar navigation */
            .back-button {
                display: none;
            }
            
            .settings-header {
                display: flex;
                align-items: center;
                gap: 1rem;
                margin-bottom: 2rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid var(--border-primary);
            }
            
            .settings-title {
                font-size: 2rem;
                font-weight: 600;
                color: var(--text-primary);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .back-button {
                padding: 0.5rem 1rem;
                background: var(--surface-secondary);
                border: 1px solid var(--border-primary);
                border-radius: 0.5rem;
                color: var(--text-primary);
                text-decoration: none;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                transition: all 0.2s ease;
                margin-left: auto;
            }
            
            .back-button:hover {
                background: var(--surface-hover);
                color: var(--primary-color);
            }
            
            .settings-section {
                margin-bottom: 2rem;
                background: var(--surface-secondary);
                border-radius: 0.75rem;
                padding: 1.5rem;
                border: 1px solid var(--border-primary);
            }
            
            .settings-section-title {
                font-size: 1.25rem;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .setting-item {
                margin-bottom: 1.5rem;
            }
            
            .setting-item:last-child {
                margin-bottom: 0;
            }
            
            .setting-label {
                font-weight: 500;
                color: var(--text-primary);
                margin-bottom: 0.5rem;
                display: block;
            }
            
            .setting-description {
                font-size: 0.875rem;
                color: var(--text-secondary);
                margin-bottom: 0.75rem;
            }
            
            .setting-control {
                display: flex;
                gap: 0.5rem;
                align-items: center;
            }
            
            .settings-input {
                flex: 1;
                padding: 0.75rem;
                border: 1px solid var(--border-primary);
                border-radius: 0.5rem;
                font-size: 0.875rem;
                background: var(--surface-primary);
                color: var(--text-primary);
            }
            
            .settings-input:focus {
                outline: none;
                border-color: var(--primary-color);
                box-shadow: 0 0 0 3px var(--primary-color-alpha);
            }
            
            .btn {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 0.5rem;
                font-size: 0.875rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .btn-primary {
                background: var(--primary-color);
                color: white;
            }
            
            .btn-primary:hover {
                background: var(--primary-color-hover);
            }
            
            .btn-primary:disabled {
                background: var(--surface-disabled);
                color: var(--text-disabled);
                cursor: not-allowed;
            }
            
            .btn-secondary {
                background: var(--surface-secondary);
                color: var(--text-primary);
                border: 1px solid var(--border-primary);
            }
            
            .btn-secondary:hover {
                background: var(--surface-hover);
            }
            
            .status-message {
                margin-top: 0.5rem;
                padding: 0.5rem;
                border-radius: 0.375rem;
                font-size: 0.875rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .status-success {
                background: var(--success-bg, #dcfce7);
                color: var(--success-text, #166534);
                border: 1px solid var(--success-border, #bbf7d0);
            }
            
            .status-error {
                background: var(--error-bg, #fef2f2);
                color: var(--error-text, #dc2626);
                border: 1px solid var(--error-border, #fecaca);
            }
            
            .status-loading {
                background: var(--info-bg, #eff6ff);
                color: var(--info-text, #2563eb);
                border: 1px solid var(--info-border, #bfdbfe);
            }
            
            .provider-list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            
            .provider-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 1rem;
                background: var(--surface-primary);
                border: 1px solid var(--border-primary);
                border-radius: 0.5rem;
            }
            
            .provider-info {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            
            .provider-icon {
                width: 2rem;
                height: 2rem;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--primary-color-alpha, rgba(102, 126, 234, 0.1));
                border-radius: 0.375rem;
                color: var(--primary-color);
            }
            
            .provider-name {
                font-weight: 500;
                color: var(--text-primary);
            }
            
            .toggle-switch {
                position: relative;
                display: inline-block;
                width: 48px;
                height: 24px;
            }
            
            .toggle-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: var(--surface-disabled, #e5e7eb);
                transition: .4s;
                border-radius: 24px;
            }
            
            .toggle-slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
            }
            
            input:checked + .toggle-slider {
                background-color: var(--primary-color);
            }
            
            input:checked + .toggle-slider:before {
                transform: translateX(24px);
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Set up event listeners for the settings page
     */
    setupEventListeners() {
        console.log('🔧 Setting up event listeners for settings page');
        
        // Custom catalog add button
        const addBtn = document.getElementById('add-custom-catalog-btn');
        const urlInput = document.getElementById('settings-custom-catalog-url');
        
        console.log('🔧 Add button found:', !!addBtn);
        console.log('🔧 URL input found:', !!urlInput);
        
        if (addBtn) {
            console.log('🔧 Adding click listener to Add Catalog button');
            addBtn.addEventListener('click', async (e) => {
                console.log('🔧 Add Catalog button clicked!');
                e.preventDefault();
                
                // Find input field fresh each time to avoid stale references
                const currentInput = document.getElementById('settings-custom-catalog-url');
                console.log('🔧 Current input element:', currentInput);
                
                if (!currentInput) {
                    console.error('🔧 Could not find settings-custom-catalog-url input field!');
                    this.showStatus('Error: Input field not found', 'error');
                    return;
                }
                
                // Debug input field
                console.log('🔧 URL input value before trim:', `"${currentInput.value}"`);
                console.log('🔧 URL input value length:', currentInput.value.length);
                
                const url = currentInput.value.trim();
                console.log('🔧 URL after trim:', `"${url}"`);
                console.log('🔧 URL length after trim:', url.length);
                
                if (url) {
                    console.log('🔧 Calling addCustomCatalog with:', url);
                    await this.addCustomCatalog(url);
                } else {
                    console.log('🔧 No URL provided');
                    this.showStatus('Please enter a catalog URL', 'error');
                }
            });
            console.log('🔧 Event listener added successfully');
        } else {
            console.error('🔧 Add button not found!');
        }
        
        // Provider toggles and collection browsing
        const providerList = document.getElementById('provider-list');
        if (providerList) {
            // Handle toggle changes
            providerList.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    const provider = e.target.dataset.provider;
                    this.providers[provider].enabled = e.target.checked;
                    this.saveProviderSettings();
                }
            });
            
            // Handle provider info clicks for collection browsing
            providerList.addEventListener('click', (e) => {
                const providerInfo = e.target.closest('.provider-info');
                if (providerInfo) {
                    const catalogId = providerInfo.dataset.catalog;
                    if (catalogId) {
                        console.log('🔍 Opening collection browser for catalog:', catalogId);
                        // Navigate to browser mode for this catalog
                        window.location.href = `/browser/${catalogId}`;
                    }
                }
            });
        }
        
        // Theme selector
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) {
            themeSelector.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        }
        
        // Action buttons
        const clearCacheBtn = document.getElementById('clear-cache-btn');
        const resetSettingsBtn = document.getElementById('reset-settings-btn');
        
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                this.clearCache();
            });
        }
        
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', () => {
                this.resetSettings();
            });
        }
    }

    /**
     * Add custom catalog
     */
    async addCustomCatalog(url) {
        console.log('🔧 addCustomCatalog called with URL:', url);
        
        const addBtn = document.getElementById('add-custom-catalog-btn');
        const statusEl = document.getElementById('settings-custom-catalog-status');
        
        console.log('🔧 Add button element:', addBtn);
        console.log('🔧 Status element:', statusEl);
        
        try {
            console.log('🔧 Starting catalog validation for:', url);
            
            // Show loading state
            if (addBtn) {
                console.log('🔧 Setting button to loading state');
                addBtn.disabled = true;
                addBtn.innerHTML = '<i class="material-icons">hourglass_empty</i> Validating...';
            }
            
            console.log('🔧 Showing loading status');
            this.showStatus('Validating catalog...', 'loading');
            
            // Fetch and validate catalog
            console.log('🔧 Fetching catalog from:', url);
            const response = await fetch(url);
            console.log('🔧 Fetch response status:', response.status);
            console.log('🔧 Fetch response ok:', response.ok);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            console.log('🔧 Parsing catalog JSON');
            const catalogData = await response.json();
            console.log('🔧 Catalog data received:', catalogData);
            
            // Basic STAC validation
            console.log('🔧 Validating catalog type:', catalogData.type);
            if (!catalogData.type || !['Catalog', 'Collection'].includes(catalogData.type)) {
                throw new Error('Not a valid STAC catalog or collection');
            }
            console.log('🔧 Catalog validation passed');
            
            // Save custom catalog
            const customCatalog = {
                id: 'custom-catalog',
                name: catalogData.title || catalogData.id || 'Custom Catalog',
                description: catalogData.description || 'User-provided STAC catalog',
                url: url,
                type: catalogData.type,
                enabled: true,
                isCustom: true
            };
            
            console.log('🔧 Saving custom catalog to localStorage');
            localStorage.setItem('stacExplorer-customCatalogUrl', url);
            localStorage.setItem('stacExplorer-customCatalog', JSON.stringify(customCatalog));
            console.log('🔧 Custom catalog saved to localStorage');
            
            console.log('🔧 Showing success status');
            this.showStatus('✓ Catalog added successfully!', 'success');
            
            // Refresh providers list to include the new custom catalog
            await this.refreshProviders();
            
            // Trigger collections refresh
            console.log('🔧 Dispatching refreshCollections event');
            document.dispatchEvent(new CustomEvent('refreshCollections'));
            console.log('🔧 refreshCollections event dispatched');
            
            console.log('🔧 Custom catalog added successfully:', customCatalog);
            
        } catch (error) {
            console.error('🔧 Error adding custom catalog:', error);
            this.showStatus(`✗ Error: ${error.message}`, 'error');
        } finally {
            // Reset button
            if (addBtn) {
                addBtn.disabled = false;
                addBtn.innerHTML = '<i class="material-icons">add</i> Add Catalog';
            }
        }
    }

    /**
     * Show status message
     */
    showStatus(message, type) {
        const statusEl = document.getElementById('settings-custom-catalog-status');
        if (!statusEl) {
            console.warn('🔧 Status element not found: settings-custom-catalog-status');
            return;
        }
        
        statusEl.style.display = 'block';
        statusEl.className = `status-message status-${type}`;
        statusEl.innerHTML = message;
        
        if (type === 'success') {
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 3000);
        }
    }

    /**
     * Save provider settings
     */
    saveProviderSettings() {
        const enabledProviders = Object.entries(this.providers)
            .filter(([key, provider]) => provider.enabled)
            .map(([key]) => key);
        
        const settings = {
            enabledProviders,
            customCatalogUrl: this.customCatalogUrl
        };
        
        localStorage.setItem('stacExplorerSettings', JSON.stringify(settings));
        
        // Dispatch settings changed event
        document.dispatchEvent(new CustomEvent('settingsChanged', {
            detail: settings
        }));
        
        console.log('🔧 Provider settings saved:', enabledProviders);
    }

    /**
     * Load theme selection
     */
    loadThemeSelection() {
        const themeSelector = document.getElementById('theme-selector');
        if (!themeSelector) return;
        
        const savedTheme = localStorage.getItem('stac-explorer-theme') || 'auto';
        themeSelector.value = savedTheme;
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        localStorage.setItem('stac-explorer-theme', theme);
        
        const html = document.documentElement;
        
        if (theme === 'auto') {
            // Use system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            html.classList.toggle('light-theme', !prefersDark);
        } else {
            html.classList.toggle('light-theme', theme === 'light');
        }
        
        console.log('🔧 Theme set to:', theme);
    }

    /**
     * Clear cache
     */
    clearCache() {
        // Clear various caches
        const keysToRemove = Object.keys(localStorage).filter(key => 
            key.includes('cache') || key.includes('collections') || key.includes('stac')
        );
        
        keysToRemove.forEach(key => {
            if (!key.includes('Settings') && !key.includes('theme')) {
                localStorage.removeItem(key);
            }
        });
        
        alert('Cache cleared successfully!');
        console.log('🔧 Cache cleared');
    }

    /**
     * Reset settings
     */
    resetSettings() {
        if (confirm('Are you sure you want to reset all settings? This cannot be undone.')) {
            // Reset to defaults
            localStorage.removeItem('stacExplorerSettings');
            localStorage.removeItem('stacExplorer-customCatalogUrl');
            localStorage.removeItem('stacExplorer-customCatalog');
            localStorage.removeItem('stac-explorer-theme');
            
            alert('Settings reset successfully! Reloading page...');
            window.location.reload();
        }
    }

}