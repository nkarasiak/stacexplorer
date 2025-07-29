/**
 * SettingsPanel.js - Manages application settings including provider visibility
 */

export class SettingsPanel {
    constructor(config, notificationService) {
        this.config = config;
        this.notificationService = notificationService;
        this.isOpen = false;
        this.settings = {
            enabledProviders: [...(config.appSettings.enabledProviders || [])]
        };
        
        this.init();
    }
    
    /**
     * Initialize the settings panel
     */
    init() {
        // Create panel element
        this.panel = document.createElement('div');
        this.panel.className = 'settings-panel';
        this.panel.innerHTML = `
            <div class="settings-header">
                <div class="settings-title">
                    <i class="material-icons">settings</i>
                    Settings
                </div>
                <button class="settings-close" aria-label="Close settings">
                    <i class="material-icons">close</i>
                </button>
            </div>
            <div class="settings-content">
                <div class="settings-section">
                    <div class="settings-section-title">
                        <i class="material-icons">cloud</i>
                        Data Providers
                    </div>
                    <div class="provider-list" id="provider-list">
                        <!-- Provider items will be added here -->
                    </div>
                </div>
            </div>
            <div class="settings-footer">
                <button class="settings-button secondary" id="settings-cancel">Cancel</button>
                <button class="settings-button primary" id="settings-save">Save Changes</button>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(this.panel);
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Populate providers
        this.populateProviders();
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Close button
        this.panel.querySelector('.settings-close').addEventListener('click', () => {
            this.close();
        });
        
        // Cancel button
        this.panel.querySelector('#settings-cancel').addEventListener('click', () => {
            this.close();
        });
        
        // Save button
        this.panel.querySelector('#settings-save').addEventListener('click', () => {
            this.saveSettings();
        });
        
        // ESC key to close settings
        this.escKeyHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        };
        document.addEventListener('keydown', this.escKeyHandler);
        
        // Provider toggles
        this.panel.querySelector('#provider-list').addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const provider = e.target.dataset.provider;
                if (e.target.checked) {
                    this.settings.enabledProviders.push(provider);
                } else {
                    this.settings.enabledProviders = this.settings.enabledProviders.filter(p => p !== provider);
                }
            }
        });
    }
    
    /**
     * Populate provider list
     */
    populateProviders() {
        const providerList = this.panel.querySelector('#provider-list');
        const providers = {
            copernicus: {
                name: 'Copernicus',
                icon: 'satellite'
            },
            element84: {
                name: 'Element84',
                icon: 'cloud'
            },
            planetary: {
                name: 'Microsoft Planetary Computer',
                icon: 'public'
            }
        };
        
        providerList.innerHTML = Object.entries(providers).map(([key, provider]) => `
            <div class="provider-item">
                <div class="provider-info">
                    <div class="provider-icon">
                        <i class="material-icons">${provider.icon}</i>
                    </div>
                    <div class="provider-name">${provider.name}</div>
                </div>
                <label class="provider-toggle">
                    <input type="checkbox" 
                           data-provider="${key}"
                           ${this.settings.enabledProviders.includes(key) ? 'checked' : ''}>
                    <span class="provider-toggle-slider"></span>
                </label>
            </div>
        `).join('');
    }
    
    /**
     * Open the settings panel
     */
    open() {
        this.panel.classList.add('open');
        this.isOpen = true;
    }
    
    /**
     * Close the settings panel
     */
    close() {
        this.panel.classList.remove('open');
        this.isOpen = false;
        // Reset settings to current config
        this.settings = {
            enabledProviders: [...(this.config.appSettings.enabledProviders || [])]
        };
        this.populateProviders();
    }
    
    /**
     * Cleanup event listeners (call when destroying the component)
     */
    destroy() {
        if (this.escKeyHandler) {
            document.removeEventListener('keydown', this.escKeyHandler);
        }
        if (this.panel && this.panel.parentNode) {
            this.panel.parentNode.removeChild(this.panel);
        }
    }
    
    /**
     * Save settings
     */
    saveSettings() {
        // Update config
        this.config.appSettings.enabledProviders = this.settings.enabledProviders;
        
        // Save to localStorage
        localStorage.setItem('stacExplorerSettings', JSON.stringify(this.settings));
        
        // Show success notification
        this.notificationService.showNotification('Settings saved successfully', 'success');
        
        // Close panel
        this.close();
        
        // Dispatch event for other components to react to settings change
        document.dispatchEvent(new CustomEvent('settingsChanged', {
            detail: this.settings
        }));
    }
    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('stacExplorerSettings');
            if (savedSettings) {
                this.settings = JSON.parse(savedSettings);
                this.config.appSettings.enabledProviders = this.settings.enabledProviders;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
} 