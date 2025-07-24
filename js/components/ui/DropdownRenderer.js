/**
 * DropdownRenderer.js - Handles dropdown HTML generation and rendering
 * Creates and manages dropdown UI components
 */

export class DropdownRenderer {
    constructor() {
        this.dropdownContainer = null;
    }
    
    /**
     * Create and show a dropdown
     * @param {string} fieldType - Type of dropdown ('collection', 'location', 'date')
     * @param {HTMLElement} triggerElement - Element that triggered the dropdown
     * @param {string} content - HTML content for the dropdown
     * @returns {HTMLElement} Created dropdown element
     */
    createDropdown(fieldType, triggerElement, content) {
        // Remove any existing dropdown
        this.removeExistingDropdown();
        
        // Create dropdown container
        this.dropdownContainer = document.createElement('div');
        this.dropdownContainer.className = 'ai-dropdown-overlay';
        this.dropdownContainer.innerHTML = content;
        
        // Add to DOM
        document.body.appendChild(this.dropdownContainer);
        
        // Position dropdown
        this.positionDropdown(triggerElement);
        
        // Show with animation
        setTimeout(() => {
            this.dropdownContainer.classList.add('visible');
        }, 10);
        
        return this.dropdownContainer.querySelector('.ai-dropdown-container');
    }
    
    /**
     * Position dropdown relative to trigger element
     * @param {HTMLElement} triggerElement - Element that triggered the dropdown
     */
    positionDropdown(triggerElement) {
        if (!this.dropdownContainer || !triggerElement) return;
        
        const dropdown = this.dropdownContainer.querySelector('.ai-dropdown-container');
        if (!dropdown) return;
        
        const triggerRect = triggerElement.getBoundingClientRect();
        const dropdownRect = dropdown.getBoundingClientRect();
        
        // Calculate position
        let top = triggerRect.bottom + 5;
        let left = triggerRect.left;
        
        // Adjust for viewport boundaries
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Adjust horizontal position if dropdown would overflow
        if (left + dropdownRect.width > viewportWidth) {
            left = viewportWidth - dropdownRect.width - 10;
        }
        
        // Adjust vertical position if dropdown would overflow
        if (top + dropdownRect.height > viewportHeight) {
            top = triggerRect.top - dropdownRect.height - 5;
        }
        
        // Ensure minimum margins
        left = Math.max(10, left);
        top = Math.max(10, top);
        
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${top}px`;
        dropdown.style.left = `${left}px`;
        dropdown.style.zIndex = '10000';
    }
    
    /**
     * Remove existing dropdown
     */
    removeExistingDropdown() {
        if (this.dropdownContainer) {
            this.dropdownContainer.remove();
            this.dropdownContainer = null;
        }
        
        // Also remove any other dropdown overlays
        const existingOverlays = document.querySelectorAll('.ai-dropdown-overlay');
        existingOverlays.forEach(overlay => overlay.remove());
    }
    
    /**
     * Close current dropdown with animation
     */
    closeDropdown() {
        if (this.dropdownContainer) {
            this.dropdownContainer.classList.remove('visible');
            setTimeout(() => {
                this.removeExistingDropdown();
            }, 200);
        }
    }
    
    /**
     * Check if dropdown is currently open
     * @returns {boolean} True if dropdown is open
     */
    isDropdownOpen() {
        return this.dropdownContainer !== null;
    }
    
    /**
     * Get current dropdown element
     * @returns {HTMLElement|null} Current dropdown element
     */
    getCurrentDropdown() {
        return this.dropdownContainer?.querySelector('.ai-dropdown-container') || null;
    }
    
    /**
     * Create loading spinner HTML
     * @returns {string} Loading spinner HTML
     */
    createLoadingSpinner() {
        return `
            <div class="ai-loading-spinner">
                <i class="material-icons spinning">refresh</i>
                <span>Loading...</span>
            </div>
        `;
    }
    
    /**
     * Create error message HTML
     * @param {string} message - Error message to display
     * @returns {string} Error message HTML
     */
    createErrorMessage(message) {
        return `
            <div class="ai-error-message">
                <i class="material-icons">error</i>
                <span>${message}</span>
            </div>
        `;
    }
    
    /**
     * Create empty state HTML
     * @param {string} message - Empty state message
     * @returns {string} Empty state HTML
     */
    createEmptyState(message) {
        return `
            <div class="ai-empty-state">
                <i class="material-icons">search_off</i>
                <span>${message}</span>
            </div>
        `;
    }
}