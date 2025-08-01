/**
 * SettingsPanel.js - Manages application settings including provider visibility
 */

export class SettingsPanel {
  constructor(config, notificationService) {
    this.config = config;
    this.notificationService = notificationService;
    this.isOpen = false;
    this.settings = {
      enabledProviders: [...(config.appSettings.enabledProviders || [])],
      customCatalogUrl: config.appSettings.customCatalogUrl || '',
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
                        <i class="material-icons">link</i>
                        Custom Catalog
                    </div>
                    <div class="settings-section-content">
                        <div class="input-group">
                            <label for="custom-catalog-url">STAC Catalog/API URL:</label>
                            <input type="url" 
                                   id="custom-catalog-url" 
                                   placeholder="https://example.com/stac"
                                   value="${this.settings.customCatalogUrl}"
                                   class="settings-input">
                            <small class="input-hint">Enter the root URL of a STAC catalog or API endpoint</small>
                        </div>
                    </div>
                </div>
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

    // Update custom catalog input
    this.updateCustomCatalogInput();
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

    // ESC key handler (will be added when panel opens)
    this.escKeyHandler = e => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    };

    // Provider toggles
    this.panel.querySelector('#provider-list').addEventListener('change', e => {
      if (e.target.type === 'checkbox') {
        const provider = e.target.dataset.provider;
        if (e.target.checked) {
          this.settings.enabledProviders.push(provider);
        } else {
          this.settings.enabledProviders = this.settings.enabledProviders.filter(
            p => p !== provider
          );
        }
      }
    });

    // Custom catalog URL input
    this.panel.querySelector('#custom-catalog-url').addEventListener('input', e => {
      this.settings.customCatalogUrl = e.target.value.trim();
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
        icon: 'satellite',
      },
      element84: {
        name: 'Element84',
        icon: 'cloud',
      },
      planetary: {
        name: 'Microsoft Planetary Computer',
        icon: 'public',
      },
    };

    providerList.innerHTML = Object.entries(providers)
      .map(
        ([key, provider]) => `
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
        `
      )
      .join('');
  }

  /**
   * Open the settings panel (legacy - see enhanced version below)
   */
  openLegacy() {
    this.panel.classList.add('open');
    this.isOpen = true;
    this.updateCustomCatalogInput();
  }

  /**
   * Close the settings panel (legacy - see enhanced version below)
   */
  closeLegacy() {
    this.panel.classList.remove('open');
    this.isOpen = false;
    // Reset settings to current config
    this.settings = {
      enabledProviders: [...(this.config.appSettings.enabledProviders || [])],
      customCatalogUrl: this.config.appSettings.customCatalogUrl || '',
    };
    this.populateProviders();
    this.updateCustomCatalogInput();
  }

  /**
   * Cleanup event listeners (call when destroying the component)
   */
  destroy() {
    if (this.escKeyHandler) {
      document.removeEventListener('keydown', this.escKeyHandler);
    }
    if (this.panel?.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
  }

  /**
   * Save settings
   */
  saveSettings() {
    // Update config
    this.config.appSettings.enabledProviders = this.settings.enabledProviders;
    this.config.appSettings.customCatalogUrl = this.settings.customCatalogUrl;

    // Save custom catalog URL and validate it
    if (this.settings.customCatalogUrl) {
      localStorage.setItem('stacExplorer-customCatalogUrl', this.settings.customCatalogUrl);

      // Dispatch event to trigger validation by UIManager
      document.dispatchEvent(
        new CustomEvent('customCatalogUrlChanged', {
          detail: { url: this.settings.customCatalogUrl },
        })
      );
    } else {
      // Remove custom catalog if URL is empty
      localStorage.removeItem('stacExplorer-customCatalogUrl');
      localStorage.removeItem('stacExplorer-customCatalog');
      localStorage.removeItem('catalog-custom-catalog-enabled');
    }

    // Save to localStorage
    localStorage.setItem('stacExplorerSettings', JSON.stringify(this.settings));

    // Show success notification
    this.notificationService.showNotification('Settings saved successfully', 'success');

    // Close panel
    this.close();

    // Dispatch event for other components to react to settings change
    document.dispatchEvent(
      new CustomEvent('settingsChanged', {
        detail: this.settings,
      })
    );
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
        this.config.appSettings.customCatalogUrl = this.settings.customCatalogUrl || '';
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  /**
   * Update the custom catalog URL input field
   */
  updateCustomCatalogInput() {
    const input = this.panel.querySelector('#custom-catalog-url');
    if (input) {
      input.value = this.settings.customCatalogUrl || '';
    }
  }

  /**
   * Close the settings panel
   */
  close() {
    if (this.isOpen) {
      this.panel.classList.remove('open');
      this.isOpen = false;

      // Remove focus trap
      document.removeEventListener('keydown', this.escKeyHandler);

      // Dispatch event to notify other components
      document.dispatchEvent(new CustomEvent('settingsPanelClosed'));
    }
  }

  /**
   * Open the settings panel
   */
  open() {
    if (!this.isOpen) {
      this.panel.classList.add('open');
      this.isOpen = true;

      // Add focus trap
      document.addEventListener('keydown', this.escKeyHandler);

      // Dispatch event to notify other components
      document.dispatchEvent(new CustomEvent('settingsPanelOpened'));
    }
  }
}
