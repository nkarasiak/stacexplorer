/**
 * SearchHistoryUI.js - User interface component for search history
 * Provides dropdown menu and interaction handling for search history
 */

import { searchHistoryManager } from '../../utils/SearchHistoryManager.js';

export class SearchHistoryUI {
    constructor() {
        this.isMenuOpen = false;
        this.isHeaderMenuOpen = false;
        this.init();
    }
    
    /**
     * Initialize the search history UI
     */
    init() {
        
        // Get UI elements for header search history (now the primary interface)
        this.headerHistoryContainer = document.getElementById('header-search-history');
        this.headerHistoryBtn = document.getElementById('header-search-history-btn');
        this.headerHistoryMenu = document.getElementById('header-search-history-menu');
        this.headerHistoryList = document.getElementById('header-search-history-list');
        this.headerClearBtn = document.getElementById('header-clear-history-btn');
        
        if (!this.headerHistoryBtn || !this.headerHistoryMenu || !this.headerHistoryList) {
            return;
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initial load of history
        this.updateHistoryList();
        this.updateHeaderVisibility();
        
    }
    
    /**
     * Setup event listeners for search history UI
     */
    setupEventListeners() {
        // Header history button click
        if (this.headerHistoryBtn) {
            this.headerHistoryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleHeaderMenu();
            });
        }
        
        // Clear history button (header)
        if (this.headerClearBtn) {
            this.headerClearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearHistory();
            });
        }
        
        // Close menus when clicking outside
        document.addEventListener('click', (e) => {
            if (this.headerHistoryMenu && !this.headerHistoryMenu.contains(e.target) && 
                this.headerHistoryBtn && !this.headerHistoryBtn.contains(e.target)) {
                this.closeHeaderMenu();
            }
        });
        
        // Listen for search history updates
        document.addEventListener('searchHistoryUpdated', () => {
            this.updateHistoryList();
            this.updateHeaderVisibility();
        });
        
        // Listen for search history cleared
        document.addEventListener('searchHistoryCleared', () => {
            this.updateHistoryList();
            this.closeHeaderMenu();
            this.updateHeaderVisibility();
        });
        
        // Listen for new searches being executed
        document.addEventListener('searchExecuted', () => {
            // Small delay to allow history to be saved first
            setTimeout(() => {
                this.updateHistoryList();
                this.updateHeaderVisibility();
            }, 100);
        });
        
        // Handle window resize to reposition dropdown
        window.addEventListener('resize', () => {
            if (this.isHeaderMenuOpen && this.headerHistoryMenu && this.headerHistoryBtn) {
                const buttonRect = this.headerHistoryBtn.getBoundingClientRect();
                this.headerHistoryMenu.style.top = `${buttonRect.bottom + 5}px`;
                this.headerHistoryMenu.style.left = `${buttonRect.left}px`;
            }
        });
    }
    
    /**
     * Toggle the header history menu visibility (main method)
     */
    toggleMenu() {
        this.toggleHeaderMenu();
    }
    
    /**
     * Open the header history menu (main method)
     */
    openMenu() {
        this.openHeaderMenu();
    }
    
    /**
     * Close the header history menu (main method)
     */
    closeMenu() {
        this.closeHeaderMenu();
    }
    
    /**
     * Update the history list display
     */
    updateHistoryList() {
        const recentSearches = searchHistoryManager.getRecentSearches(10);
        
        if (recentSearches.length === 0) {
            if (this.headerHistoryList) {
                this.headerHistoryList.innerHTML = '<div class="history-empty">No search history yet</div>';
            }
            return;
        }
        
        // Generate HTML for history items
        const historyHTML = recentSearches.map(search => {
            const timeAgo = this.getTimeAgo(search.timestamp);
            return `
                <div class="history-item" data-search-id="${search.id}">
                    <div class="history-content">
                        <div class="history-title">${search.title}</div>
                        <div class="history-meta">
                            <span><i class="material-icons" style="font-size: 10px;">access_time</i> ${timeAgo}</span>
                            <span><i class="material-icons" style="font-size: 10px;">data_usage</i> ${search.resultCount} results</span>
                        </div>
                    </div>
                    <button class="history-remove-btn" data-search-id="${search.id}" title="Remove this search">
                        <i class="material-icons">delete</i>
                    </button>
                </div>
            `;
        }).join('');
        
        if (this.headerHistoryList) {
            this.headerHistoryList.innerHTML = historyHTML;
        }
        
        // Add click handlers to history items (header)
        if (this.headerHistoryList) {
            this.headerHistoryList.querySelectorAll('.history-item').forEach(item => {
                // Add click handler for the history content (re-execute search)
                const historyContent = item.querySelector('.history-content');
                if (historyContent) {
                    historyContent.addEventListener('click', () => {
                        const searchId = item.dataset.searchId;
                        this.reExecuteSearch(searchId);
                    });
                }
                
                // Add click handler for the remove button
                const removeBtn = item.querySelector('.history-remove-btn');
                if (removeBtn) {
                    removeBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent triggering the parent click
                        const searchId = removeBtn.dataset.searchId;
                        this.removeSearch(searchId);
                    });
                }
            });
        }
    }
    
    /**
     * Re-execute a search from history
     * @param {string} searchId - ID of the search to re-execute
     */
    reExecuteSearch(searchId) {
        try {
            searchHistoryManager.reExecuteSearch(searchId);
            this.closeMenu();
        } catch (error) {
        }
    }
    
    /**
     * Remove a specific search from history
     * @param {string} searchId - ID of the search to remove
     */
    removeSearch(searchId) {
        try {
            searchHistoryManager.removeFromHistory(searchId);
        } catch (error) {
        }
    }
    
    /**
     * Clear all search history
     */
    clearHistory() {
        if (confirm('Are you sure you want to clear all search history?')) {
            searchHistoryManager.clearHistory();
        }
    }
    
    /**
     * Get human-readable time ago string
     * @param {number} timestamp - Timestamp in milliseconds
     * @returns {string} Time ago string
     */
    getTimeAgo(timestamp) {
        const now = Date.now();
        const diffMs = now - timestamp;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMinutes < 1) {
            return 'just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else {
            return new Date(timestamp).toLocaleDateString();
        }
    }
    
    /**
     * Get the count of stored searches
     * @returns {number} Number of searches in history
     */
    getHistoryCount() {
        return searchHistoryManager.getHistory().length;
    }
    
    /**
     * Update the history button badge with count (optional feature)
     */
    updateHistoryBadge() {
        const count = this.getHistoryCount();
        if (count > 0) {
            if (this.headerHistoryBtn) {
                this.headerHistoryBtn.setAttribute('title', `Recent Searches (${count} searches)`);
            }
        } else {
            if (this.headerHistoryBtn) {
                this.headerHistoryBtn.setAttribute('title', 'Recent Searches');
            }
        }
    }
    
    /**
     * Toggle the header history menu visibility
     */
    toggleHeaderMenu() {
        if (this.isHeaderMenuOpen) {
            this.closeHeaderMenu();
        } else {
            this.openHeaderMenu();
        }
    }
    
    /**
     * Open the header history menu
     */
    openHeaderMenu() {
        if (this.headerHistoryMenu && this.headerHistoryBtn) {
            // Position the menu relative to the button
            const buttonRect = this.headerHistoryBtn.getBoundingClientRect();
            this.headerHistoryMenu.style.top = `${buttonRect.bottom + 5}px`;
            this.headerHistoryMenu.style.left = `${buttonRect.left}px`;
            
            this.headerHistoryMenu.classList.add('active');
            this.isHeaderMenuOpen = true;
            this.updateHistoryList(); // Refresh when opening
        }
    }
    
    /**
     * Close the header history menu
     */
    closeHeaderMenu() {
        if (this.headerHistoryMenu) {
            this.headerHistoryMenu.classList.remove('active');
            this.isHeaderMenuOpen = false;
        }
    }
    
    /**
     * Update header visibility based on search history
     */
    updateHeaderVisibility() {
        if (this.headerHistoryContainer) {
            const hasHistory = this.getHistoryCount() > 0;
            this.headerHistoryContainer.style.display = hasHistory ? 'block' : 'none';
        }
    }
}

// Create and export a singleton instance
export const searchHistoryUI = new SearchHistoryUI();