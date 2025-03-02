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
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const html = document.documentElement;
        const themeToggleIcon = document.querySelector('#theme-toggle i');
        
        if (html.classList.contains('light-theme')) {
            // Switch to dark mode
            html.classList.remove('light-theme');
            html.classList.add('dark-theme');
            themeToggleIcon.textContent = 'light_mode';
        } else {
            // Switch to light mode
            html.classList.remove('dark-theme');
            html.classList.add('light-theme');
            themeToggleIcon.textContent = 'dark_mode';
        }
        
        // Dispatch theme change event for map to update
        document.dispatchEvent(new CustomEvent('themeChange', {
            detail: { theme: html.classList.contains('light-theme') ? 'Light' : 'Dark' }
        }));
    }
}