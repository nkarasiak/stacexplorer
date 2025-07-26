/**
 * DropdownUIManager.js - Common UI operations for dropdowns
 * Handles positioning, animations, loading states, and lifecycle
 */

export class DropdownUIManager {
    /**
     * Position dropdown relative to trigger element
     * @param {HTMLElement} dropdown - Dropdown container
     * @param {HTMLElement} trigger - Trigger element
     */
    static positionDropdown(dropdown, trigger) {
        try {
            const triggerRect = trigger.getBoundingClientRect();
            const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
            const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : { left: 0, width: 360, right: 360 };
            
            // Viewport measurements
            const viewport = {
                width: window.innerWidth,
                height: window.innerHeight
            };
            
            // Get dropdown measurements (temporarily display for measurement)
            dropdown.style.visibility = 'hidden';
            dropdown.style.position = 'fixed';
            dropdown.style.display = 'block';
            dropdown.style.left = '-9999px';
            dropdown.style.maxWidth = '480px';
            dropdown.style.maxHeight = '70vh';
            
            const dropdownRect = dropdown.getBoundingClientRect();
            const preferredWidth = Math.min(Math.max(dropdownRect.width, 320), 480);
            const preferredHeight = Math.min(dropdownRect.height, viewport.height * 0.7);
            
            const gaps = { minimum: 8, preferred: 16 };
            
            // Try positioning to the right first (preferred for sidebar)
            let position = {
                left: sidebarRect.right + gaps.preferred,
                top: Math.max(
                    gaps.minimum,
                    Math.min(triggerRect.top, viewport.height - preferredHeight - gaps.minimum)
                ),
                width: preferredWidth,
                height: preferredHeight,
                strategy: 'right'
            };
            
            // If right doesn't fit, try below
            if (position.left + preferredWidth > viewport.width - gaps.minimum) {
                position = {
                    left: sidebarRect.left + gaps.minimum,
                    top: triggerRect.bottom + gaps.preferred,
                    width: Math.min(sidebarRect.width - gaps.minimum * 2, preferredWidth),
                    height: Math.min(
                        preferredHeight,
                        viewport.height - triggerRect.bottom - gaps.preferred - gaps.minimum
                    ),
                    strategy: 'below'
                };
            }
            
            // Apply positioning
            dropdown.style.position = 'fixed';
            dropdown.style.visibility = 'visible';
            dropdown.style.left = `${position.left}px`;
            dropdown.style.top = `${position.top}px`;
            dropdown.style.width = `${position.width}px`;
            dropdown.style.maxHeight = `${position.height}px`;
            dropdown.style.zIndex = '999999';
            dropdown.style.overflow = 'visible';
            dropdown.style.pointerEvents = 'auto';
            
            
        } catch (error) {
            console.error('❌ Error positioning dropdown:', error);
            this.applyEmergencyPositioning(dropdown);
        }
    }
    
    /**
     * Apply emergency center positioning when normal positioning fails
     * @param {HTMLElement} dropdown - Dropdown container
     */
    static applyEmergencyPositioning(dropdown) {
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        
        const width = Math.min(400, viewport.width - 32);
        const height = Math.min(500, viewport.height - 64);
        
        dropdown.style.position = 'fixed';
        dropdown.style.left = '50%';
        dropdown.style.top = '20%';
        dropdown.style.transform = 'translateX(-50%)';
        dropdown.style.width = `${width}px`;
        dropdown.style.maxWidth = 'calc(100vw - 32px)';
        dropdown.style.maxHeight = `${height}px`;
        dropdown.style.zIndex = '999999';
        dropdown.style.display = 'block';
        dropdown.style.visibility = 'visible';
        dropdown.style.opacity = '1';
        dropdown.style.pointerEvents = 'auto';
        dropdown.style.backgroundColor = 'var(--md-surface, #1e1e1e)';
        dropdown.style.border = '3px solid var(--md-primary, #2196F3)';
        dropdown.style.borderRadius = '12px';
        dropdown.style.boxShadow = '0 12px 48px rgba(0, 0, 0, 0.5)';
        
        console.warn('🚨 Applied emergency positioning for dropdown');
    }
    
    /**
     * Show loading state in dropdown
     * @param {HTMLElement} dropdown - Dropdown container
     * @param {string} message - Loading message
     */
    static showLoadingState(dropdown, message = 'Loading...') {
        const content = dropdown.querySelector('.ai-dropdown-content');
        if (content) {
            content.innerHTML = `
                <div class="ai-loading-state" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    text-align: center;
                    color: var(--text-secondary, #888);
                ">
                    <div class="ai-spinner" style="
                        width: 24px;
                        height: 24px;
                        border: 2px solid var(--border-color, #333);
                        border-top: 2px solid var(--primary-color, #2196F3);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 16px;
                    "></div>
                    <span>${message}</span>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
        }
    }
    
    /**
     * Create dropdown HTML structure
     * @param {string} fieldType - Type of dropdown
     * @param {string} title - Dropdown title
     * @param {string} icon - Material icon name
     * @param {string} content - Dropdown content HTML
     * @returns {HTMLElement} Dropdown element
     */
    static createDropdownElement(fieldType, title, icon, content) {
        const dropdownEl = document.createElement('div');
        dropdownEl.className = `ai-dropdown-container ai-${fieldType}-dropdown`;
        dropdownEl.style.display = 'none';
        
        dropdownEl.innerHTML = `
            <div class="ai-dropdown-header">
                <span class="ai-dropdown-title">
                    <i class="material-icons">${icon}</i>
                    ${title}
                </span>
                <button class="ai-dropdown-close" type="button">
                    <i class="material-icons">close</i>
                </button>
            </div>
            <div class="ai-dropdown-content">
                ${content}
            </div>
        `;
        
        return dropdownEl;
    }
    
    /**
     * Animate dropdown entrance
     * @param {HTMLElement} dropdown - Dropdown container
     * @param {string} strategy - Positioning strategy ('right', 'below', 'above')
     */
    static animateEntrance(dropdown, strategy = 'below') {
        dropdown.style.opacity = '0';
        dropdown.style.transform = this.getEntryTransform(strategy);
        dropdown.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        dropdown.style.display = 'block';
        
        // Force reflow
        dropdown.offsetHeight;
        
        // Trigger animation
        requestAnimationFrame(() => {
            dropdown.style.opacity = '1';
            dropdown.style.transform = 'translateY(0) scale(1)';
        });
    }
    
    /**
     * Get appropriate entry transform based on positioning strategy
     * @param {string} strategy - Positioning strategy
     * @returns {string} CSS transform
     */
    static getEntryTransform(strategy) {
        switch (strategy) {
            case 'right':
                return 'translateX(-20px) scale(0.95)';
            case 'above':
                return 'translateY(10px) scale(0.95)';
            case 'below':
            default:
                return 'translateY(-10px) scale(0.95)';
        }
    }
    
    /**
     * Animate dropdown exit and remove
     * @param {HTMLElement} dropdown - Dropdown container
     * @param {Function} callback - Optional callback after animation
     */
    static animateExit(dropdown, callback) {
        if (!dropdown) return;
        
        dropdown.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px) scale(0.95)';
        
        setTimeout(() => {
            if (dropdown.parentNode) {
                dropdown.parentNode.removeChild(dropdown);
            }
            if (callback) callback();
        }, 200);
    }
    
    /**
     * Update dropdown content without destroying the container
     * @param {HTMLElement} dropdown - Dropdown container
     * @param {string} newContent - New content HTML
     */
    static updateContent(dropdown, newContent) {
        const contentEl = dropdown.querySelector('.ai-dropdown-content');
        if (contentEl) {
            contentEl.innerHTML = newContent;
        }
    }
    
    /**
     * Add keyboard navigation to dropdown options
     * @param {HTMLElement} dropdown - Dropdown container
     * @param {string} optionSelector - CSS selector for options
     */
    static addKeyboardNavigation(dropdown, optionSelector = '.ai-option') {
        let currentIndex = -1;
        const options = dropdown.querySelectorAll(optionSelector);
        
        dropdown.addEventListener('keydown', (e) => {
            if (options.length === 0) return;
            
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    currentIndex = Math.min(currentIndex + 1, options.length - 1);
                    this.updateSelection(options, currentIndex);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    currentIndex = Math.max(currentIndex - 1, -1);
                    this.updateSelection(options, currentIndex);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (currentIndex >= 0 && options[currentIndex]) {
                        options[currentIndex].click();
                    }
                    break;
            }
        });
    }
    
    /**
     * Update visual selection for keyboard navigation
     * @param {NodeList} options - Option elements
     * @param {number} currentIndex - Currently selected index
     */
    static updateSelection(options, currentIndex) {
        options.forEach((option, index) => {
            option.classList.toggle('keyboard-selected', index === currentIndex);
        });
        
        // Scroll selected option into view
        if (currentIndex >= 0 && options[currentIndex]) {
            options[currentIndex].scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }
}