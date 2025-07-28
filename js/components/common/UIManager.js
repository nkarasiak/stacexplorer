/**
 * UIManager.js - Core UI functionality handling global UI interactions
 */

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
        
        // Settings modal
        const settingsToggle = document.getElementById('settings-toggle');
        const settingsModal = document.getElementById('settings-modal');
        const settingsModalClose = document.getElementById('settings-modal-close');
        
        console.log('🔧 Settings elements found:', {
            settingsToggle: !!settingsToggle,
            settingsModal: !!settingsModal,
            settingsModalClose: !!settingsModalClose,
            settingsToggleEl: settingsToggle,
            settingsModalEl: settingsModal
        });
        
        if (settingsToggle && settingsModal) {
            console.log('🔧 Adding settings button click listener');
            // Mark that we've added the main listener
            settingsToggle.setAttribute('data-main-listener-added', 'true');
            settingsToggle.addEventListener('click', (e) => {
                console.log('🔧 Settings button clicked!');
                e.preventDefault();
                e.stopPropagation();
                this.showSettingsModal();
            });
            console.log('🔧 Settings button listener added successfully');
            
            if (settingsModalClose) {
                settingsModalClose.addEventListener('click', () => {
                    console.log('🔧 Settings close button clicked');
                    this.hideSettingsModal();
                });
            } else {
                console.warn('🔧 Settings modal close button not found');
            }
            
            // Close modal when clicking outside (with proper event handling)
            settingsModal.addEventListener('click', (e) => {
                console.log('🔧 Modal clicked:', {
                    target: e.target,
                    isBackdrop: e.target === settingsModal,
                    modalJustOpened: this.modalJustOpened
                });
                
                if (e.target === settingsModal && !this.modalJustOpened) {
                    console.log('🔧 Clicked outside modal dialog - closing');
                    this.hideSettingsModal();
                } else if (this.modalJustOpened) {
                    console.log('🔧 Modal just opened - ignoring click');
                }
            });
            
            // Close modal with Escape key
            this.handleSettingsModalEscape = (e) => {
                if (e.key === 'Escape') {
                    this.hideSettingsModal();
                }
            };
            document.addEventListener('keydown', this.handleSettingsModalEscape);
        }
        
        // Initialize catalog toggles
        this.initializeCatalogToggles();
        
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
        
        let themeToApply = 'light'; // Default theme
        
        if (savedTheme) {
            // Use saved preference
            themeToApply = savedTheme;
            console.log('🎨 Using saved theme preference:', savedTheme);
        } else {
            // Always default to light theme if no saved preference
            console.log('🎨 Using default theme: light');
        }
        
        // Apply the theme
        this.setTheme(themeToApply);
        
        // Update theme selector to reflect current setting
        this.updateThemeSelector();
        
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
        document.dispatchEvent(new CustomEvent('themeChange', {
            detail: { 
                theme: theme === 'light' ? 'Light' : 'Dark',
                themeMode: theme
            }
        }));
        
        console.log(`🎨 Theme set to: ${theme}`);
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
        
        // Update theme selector to reflect the change
        this.updateThemeSelector();
    }
    
    /**
     * Update theme selector dropdown to reflect current state
     */
    updateThemeSelector() {
        const themeSelector = document.getElementById('theme-selector');
        if (!themeSelector) return;
        
        const savedTheme = localStorage.getItem('stac-explorer-theme');
        
        if (savedTheme) {
            // User has explicit preference
            themeSelector.value = savedTheme;
        } else {
            // No explicit preference - using system
            themeSelector.value = 'auto';
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
     * Update GPU status in settings modal
     */
    updateGPUStatus() {
        const gpuStatusText = document.getElementById('gpu-status-text');
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
     * Show settings modal
     */
    showSettingsModal() {
        console.log('🔧 showSettingsModal called');
        const settingsModal = document.getElementById('settings-modal');
        console.log('🔧 Settings modal element:', settingsModal);
        
        if (settingsModal) {
            // Check if modal is already visible/opening
            if (settingsModal.classList.contains('active') || settingsModal.style.display === 'flex' || this.modalJustOpened) {
                console.log('🔧 Modal already open or opening - ignoring duplicate call');
                return;
            }
            
            console.log('🔧 Current modal classes:', settingsModal.className);
            
            // Set flag to prevent immediate closure and duplicate opens
            this.modalJustOpened = true;
            
            // Add a small delay to prevent immediate closure from event bubbling
            setTimeout(() => {
                settingsModal.classList.add('active');
                settingsModal.style.display = 'flex'; // Fallback
                document.body.style.overflow = 'hidden'; // Prevent background scroll
                console.log('🔧 Modal shown with active class');
                
                // Debug modal visibility
                const modalDialog = settingsModal.querySelector('.modal-dialog');
                console.log('🔧 Modal dialog element:', modalDialog);
                
                if (modalDialog) {
                    const dialogStyle = window.getComputedStyle(modalDialog);
                    console.log('🔧 Modal dialog visibility:', {
                        display: dialogStyle.display,
                        visibility: dialogStyle.visibility,
                        opacity: dialogStyle.opacity,
                        zIndex: dialogStyle.zIndex,
                        width: dialogStyle.width,
                        height: dialogStyle.height,
                        background: dialogStyle.background,
                        transform: dialogStyle.transform
                    });
                    
                    // Force dialog visibility
                    modalDialog.style.display = 'block';
                    modalDialog.style.visibility = 'visible';
                    modalDialog.style.opacity = '1';
                    modalDialog.style.background = 'white';
                    modalDialog.style.border = '2px solid red';
                    console.log('🔧 Forced dialog visibility with red border');
                }
                
                // Update theme selector when modal opens
                this.updateThemeSelector();
                
                // Update GPU status when modal opens
                this.updateGPUStatus();
                
                // Test: Force modal to stay visible for debugging
                settingsModal.style.display = 'flex !important';
                settingsModal.style.visibility = 'visible';
                settingsModal.style.opacity = '1';
                settingsModal.style.zIndex = '99999';
                
                // Clear the flag after a longer delay to prevent immediate closure
                setTimeout(() => {
                    this.modalJustOpened = false;
                    console.log('🔧 Modal protection flag cleared - clicks outside will now close modal');
                    
                    // Check if modal is still visible
                    console.log('🔧 Modal status after timeout:', {
                        display: settingsModal.style.display,
                        classList: settingsModal.className,
                        visible: window.getComputedStyle(settingsModal).display
                    });
                }, 500);
            }, 10);
        } else {
            console.error('🔧 Settings modal element not found!');
        }
    }
    
    /**
     * Hide settings modal
     */
    hideSettingsModal() {
        console.log('🔧 hideSettingsModal called');
        console.trace('🔧 Hide modal called from:');
        
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.classList.remove('active');
            settingsModal.style.display = 'none'; // Fallback
            document.body.style.overflow = ''; // Restore scroll
            console.log('🔧 Modal hidden');
        }
        
        // Remove escape key handler
        if (this.handleSettingsModalEscape) {
            document.removeEventListener('keydown', this.handleSettingsModalEscape);
        }
        
        // Reset the flag
        this.modalJustOpened = false;
    }
    
    /**
     * Initialize catalog toggles with default states and event listeners
     */
    initializeCatalogToggles() {
        const catalogs = {
            'catalog-copernicus-toggle': { key: 'copernicus', default: true },
            'catalog-element84-toggle': { key: 'element84', default: true },
            'catalog-microsoft-toggle': { key: 'microsoft-pc', default: true },
            'catalog-planetlabs-toggle': { key: 'planetlabs', default: false }
        };
        
        // Load saved states or set defaults
        Object.keys(catalogs).forEach(toggleId => {
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                const catalogKey = catalogs[toggleId].key;
                const defaultState = catalogs[toggleId].default;
                
                // Load from localStorage or use default
                const savedState = localStorage.getItem(`catalog-${catalogKey}-enabled`);
                const isEnabled = savedState !== null ? savedState === 'true' : defaultState;
                
                toggle.checked = isEnabled;
                
                // Add event listener
                toggle.addEventListener('change', (e) => {
                    this.handleCatalogToggle(catalogKey, e.target.checked);
                });
            }
        });
        
        console.log('📊 Catalog toggles initialized with default states');
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
            const catalogNames = {
                'copernicus': 'Copernicus Data Space',
                'element84': 'Element84 Earth Search',
                'microsoft-pc': 'Microsoft Planetary Computer',
                'planetlabs': 'Planet Labs'
            };
            
            const catalogName = catalogNames[catalogKey] || catalogKey;
            const status = isEnabled ? 'enabled' : 'disabled';
            window.notificationService.show(`${catalogName} ${status}`, 'info', 2000);
        }
    }
    
    /**
     * Get current catalog enabled states
     */
    getCatalogStates() {
        const states = {};
        const catalogs = ['copernicus', 'element84', 'microsoft-pc', 'planetlabs'];
        
        catalogs.forEach(catalogKey => {
            const savedState = localStorage.getItem(`catalog-${catalogKey}-enabled`);
            const defaultState = catalogKey !== 'planetlabs'; // planetlabs default is false
            states[catalogKey] = savedState !== null ? savedState === 'true' : defaultState;
        });
        
        return states;
    }
}