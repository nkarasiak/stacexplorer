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
        
        // Initialize theme system first
        this.initializeTheme();
        
        // Initialize UI event listeners
        this.initializeUI();
    }
    
    /**
     * Initialize UI components and event listeners
     */
    initializeUI() {
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Theme selector in settings modal
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) {
            themeSelector.addEventListener('change', (e) => {
                this.handleThemeSelection(e.target.value);
            });
        }
        
        // Settings modal
        const settingsToggle = document.getElementById('settings-toggle');
        const settingsModal = document.getElementById('settings-modal');
        const settingsModalClose = document.getElementById('settings-modal-close');
        
        if (settingsToggle && settingsModal) {
            settingsToggle.addEventListener('click', () => {
                this.showSettingsModal();
            });
            
            settingsModalClose.addEventListener('click', () => {
                this.hideSettingsModal();
            });
            
            // Close modal when clicking outside
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    this.hideSettingsModal();
                }
            });
        }
        
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
        
        let themeToApply = 'dark'; // Default theme
        
        if (savedTheme) {
            // Use saved preference
            themeToApply = savedTheme;
            console.log('🎨 Using saved theme preference:', savedTheme);
        } else {
            // Always default to dark theme if no saved preference
            console.log('🎨 Using default theme: dark');
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
     * Show settings modal
     */
    showSettingsModal() {
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevent background scroll
            
            // Update theme selector when modal opens
            this.updateThemeSelector();
        }
    }
    
    /**
     * Hide settings modal
     */
    hideSettingsModal() {
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.style.display = 'none';
            document.body.style.overflow = ''; // Restore scroll
        }
    }
}