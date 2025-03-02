/**
 * ShareManager.js - Handles sharing functionality for the application
 */

export class ShareManager {
    /**
     * Create a new ShareManager
     * @param {Object} stateManager - Reference to the StateManager
     * @param {Object} notificationService - Reference to the NotificationService
     */
    constructor(stateManager, notificationService) {
        this.stateManager = stateManager;
        this.notificationService = notificationService;
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Copy URL button
        const copyUrlBtn = document.getElementById('copy-url-btn');
        if (copyUrlBtn) {
            copyUrlBtn.addEventListener('click', this.copyCurrentUrl.bind(this));
        }
    }
    
    /**
     * Copy the current URL to the clipboard
     */
    async copyCurrentUrl() {
        try {
            // Make sure the URL is up to date with the current state
            this.stateManager.updateUrl();
            
            // Get the current URL
            const currentUrl = window.location.href;
            
            // Copy to clipboard
            await navigator.clipboard.writeText(currentUrl);
            
            // Show success message
            const messageEl = document.getElementById('url-copied-message');
            if (messageEl) {
                messageEl.style.display = 'block';
                
                // Hide after 3 seconds
                setTimeout(() => {
                    messageEl.style.display = 'none';
                }, 3000);
            }
            
            // Also show notification
            if (this.notificationService) {
                this.notificationService.showNotification('View URL copied to clipboard!', 'success');
            }
            
            console.log('URL copied to clipboard:', currentUrl);
        } catch (error) {
            console.error('Failed to copy URL:', error);
            
            // Show error notification
            if (this.notificationService) {
                this.notificationService.showNotification('Failed to copy URL: ' + error.message, 'error');
            }
        }
    }
} 