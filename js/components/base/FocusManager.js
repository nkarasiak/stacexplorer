/**
 * Focus Manager - Comprehensive focus management for accessibility
 * Handles focus trapping, restoration, keyboard navigation, and accessibility features
 * 
 * @author STAC Explorer Team
 * @version 1.0.0
 */

export class FocusManager {
    constructor() {
        this.focusStack = [];
        this.trapStack = [];
        this.focusableSelector = this.getFocusableSelector();
        this.lastFocusedElement = null;
        
        // Keyboard navigation settings
        this.keyboardNavigation = {
            enabled: true,
            skipLinks: true,
            roving: false // For components with roving tabindex
        };
        
        // Initialize global keyboard handlers
        this.initGlobalKeyboardHandlers();
        
    }
    
    /**
     * Get selector for focusable elements
     * @returns {string} CSS selector for focusable elements
     */
    getFocusableSelector() {
        return [
            'button:not([disabled]):not([aria-hidden="true"])',
            '[href]:not([disabled]):not([aria-hidden="true"])',
            'input:not([disabled]):not([type="hidden"]):not([aria-hidden="true"])',
            'select:not([disabled]):not([aria-hidden="true"])',
            'textarea:not([disabled]):not([aria-hidden="true"])',
            '[tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-hidden="true"])',
            '[contenteditable="true"]:not([disabled]):not([aria-hidden="true"])',
            'audio[controls]:not([disabled]):not([aria-hidden="true"])',
            'video[controls]:not([disabled]):not([aria-hidden="true"])',
            'details:not([disabled]):not([aria-hidden="true"])',
            'summary:not([disabled]):not([aria-hidden="true"])'
        ].join(', ');
    }
    
    /**
     * Get all focusable elements within a container
     * @param {HTMLElement} container - Container element
     * @returns {HTMLElement[]} Array of focusable elements
     */
    getFocusableElements(container = document) {
        if (!container) return [];
        
        const elements = Array.from(container.querySelectorAll(this.focusableSelector));
        
        // Filter out elements that are not actually focusable
        return elements.filter(element => {
            // Check if element is visible
            if (!this.isElementVisible(element)) return false;
            
            // Check computed tabindex
            const tabindex = element.getAttribute('tabindex');
            if (tabindex === '-1') return false;
            
            // Check if element is in a disabled fieldset
            const fieldset = element.closest('fieldset');
            if (fieldset && fieldset.disabled) return false;
            
            return true;
        });
    }
    
    /**
     * Check if element is visible and focusable
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} Whether element is visible
     */
    isElementVisible(element) {
        if (!element || !element.offsetParent) return false;
        
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || 
            style.visibility === 'hidden' || 
            style.opacity === '0') {
            return false;
        }
        
        return true;
    }
    
    /**
     * Set focus with restoration capability
     * @param {HTMLElement} element - Element to focus
     * @param {HTMLElement} restoreElement - Element to restore focus to later
     * @param {Object} options - Focus options
     */
    setFocus(element, restoreElement = null, options = {}) {
        const config = {
            preventScroll: false,
            restoreFocus: true,
            ...options
        };
        
        if (!element || typeof element.focus !== 'function') {
            console.warn('[FocusManager] Invalid element for focus:', element);
            return false;
        }
        
        // Store restore element
        if (config.restoreFocus) {
            const currentFocus = restoreElement || document.activeElement;
            if (currentFocus && currentFocus !== document.body) {
                this.focusStack.push(currentFocus);
            }
        }
        
        // Set focus
        try {
            element.focus({ preventScroll: config.preventScroll });
            this.lastFocusedElement = element;
            
            // Announce to screen readers if specified
            if (config.announce) {
                this.announceToScreenReader(config.announce);
            }
            
            return true;
        } catch (error) {
            console.error('[FocusManager] Failed to set focus:', error);
            return false;
        }
    }
    
    /**
     * Restore focus to previous element
     * @returns {boolean} Whether focus was restored
     */
    restoreFocus() {
        const previousElement = this.focusStack.pop();
        
        if (previousElement && typeof previousElement.focus === 'function') {
            // Check if element is still in document and focusable
            if (document.contains(previousElement) && this.isElementVisible(previousElement)) {
                previousElement.focus();
                return true;
            }
        }
        
        // Fallback to last known focusable element
        const fallbackElements = this.getFocusableElements();
        if (fallbackElements.length > 0) {
            fallbackElements[0].focus();
            return true;
        }
        
        return false;
    }
    
    /**
     * Create focus trap for modal dialogs
     * @param {HTMLElement} container - Container element to trap focus within
     * @param {Object} options - Trap options
     * @returns {Object} Trap control object
     */
    trapFocus(container, options = {}) {
        if (!container) {
            console.warn('[FocusManager] No container provided for focus trap');
            return null;
        }
        
        const config = {
            focusOnActivate: true,
            returnFocusOnDeactivate: true,
            escapeDeactivates: true,
            allowOutsideClick: false,
            ...options
        };
        
        const focusableElements = this.getFocusableElements(container);
        
        if (focusableElements.length === 0) {
            console.warn('[FocusManager] No focusable elements found in trap container');
            return null;
        }
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // Store current focus for restoration
        const previousFocus = document.activeElement;
        
        // Tab trap handler
        const handleTab = (event) => {
            if (event.key !== 'Tab') return;
            
            if (event.shiftKey) {
                // Shift + Tab (backward)
                if (document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab (forward)
                if (document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement.focus();
                }
            }
        };
        
        // Escape key handler
        const handleEscape = (event) => {
            if (event.key === 'Escape' && config.escapeDeactivates) {
                trapControl.deactivate();
            }
        };
        
        // Click outside handler
        const handleOutsideClick = (event) => {
            if (!config.allowOutsideClick && !container.contains(event.target)) {
                event.preventDefault();
                // Return focus to first element
                if (focusableElements.length > 0) {
                    focusableElements[0].focus();
                }
            }
        };
        
        // Trap control object
        const trapControl = {
            container,
            isActive: false,
            
            activate() {
                if (this.isActive) return;
                
                // Add event listeners
                document.addEventListener('keydown', handleTab);
                document.addEventListener('keydown', handleEscape);
                
                if (!config.allowOutsideClick) {
                    document.addEventListener('click', handleOutsideClick, true);
                }
                
                // Focus first element
                if (config.focusOnActivate && focusableElements.length > 0) {
                    firstElement.focus();
                }
                
                this.isActive = true;
                
                // Add to trap stack
                this.trapStack.push(this);
                
                // Add ARIA attributes
                container.setAttribute('aria-modal', 'true');
                container.setAttribute('role', container.getAttribute('role') || 'dialog');
                
            },
            
            deactivate() {
                if (!this.isActive) return;
                
                // Remove event listeners
                document.removeEventListener('keydown', handleTab);
                document.removeEventListener('keydown', handleEscape);
                document.removeEventListener('click', handleOutsideClick, true);
                
                // Restore focus
                if (config.returnFocusOnDeactivate && previousFocus && 
                    document.contains(previousFocus)) {
                    previousFocus.focus();
                }
                
                this.isActive = false;
                
                // Remove from trap stack
                const index = this.trapStack.indexOf(this);
                if (index > -1) {
                    this.trapStack.splice(index, 1);
                }
                
                // Remove ARIA attributes
                container.removeAttribute('aria-modal');
                
            },
            
            updateElements() {
                // Refresh focusable elements (useful for dynamic content)
                const newElements = this.getFocusableElements(container);
                focusableElements.length = 0;
                focusableElements.push(...newElements);
                
                if (newElements.length > 0) {
                    firstElement = newElements[0];
                    lastElement = newElements[newElements.length - 1];
                }
            }
        };
        
        // Bind this context to updateElements
        trapControl.updateElements = trapControl.updateElements.bind(this);
        trapControl.trapStack = this.trapStack;
        
        return trapControl;
    }
    
    /**
     * Move focus within a container (for arrow key navigation)
     * @param {HTMLElement} container - Container element
     * @param {string} direction - Direction: 'forward', 'backward', 'up', 'down', 'first', 'last'
     * @param {HTMLElement} currentElement - Currently focused element
     * @returns {boolean} Whether focus was moved
     */
    moveFocus(container, direction, currentElement = document.activeElement) {
        const focusableElements = this.getFocusableElements(container);
        
        if (focusableElements.length === 0) return false;
        
        const currentIndex = focusableElements.indexOf(currentElement);
        let nextIndex;
        
        switch (direction) {
            case 'forward':
            case 'down':
                nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
                break;
            case 'backward':
            case 'up':
                nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
                break;
            case 'first':
                nextIndex = 0;
                break;
            case 'last':
                nextIndex = focusableElements.length - 1;
                break;
            default:
                return false;
        }
        
        const nextElement = focusableElements[nextIndex];
        if (nextElement) {
            nextElement.focus();
            return true;
        }
        
        return false;
    }
    
    /**
     * Initialize global keyboard navigation handlers
     */
    initGlobalKeyboardHandlers() {
        document.addEventListener('keydown', (event) => {
            // Skip if keyboard navigation is disabled
            if (!this.keyboardNavigation.enabled) return;
            
            // Alt + Shift + M: Show skip links
            if (event.altKey && event.shiftKey && event.key === 'M') {
                this.showSkipLinks();
                event.preventDefault();
            }
            
            // F6: Cycle through main landmarks
            if (event.key === 'F6' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
                this.cycleLandmarks(event.shiftKey);
                event.preventDefault();
            }
        });
        
        // Track last focused element for restoration
        document.addEventListener('focusout', (event) => {
            if (event.target && event.target !== document.body) {
                this.lastFocusedElement = event.target;
            }
        });
    }
    
    /**
     * Show skip links for keyboard navigation
     */
    showSkipLinks() {
        // Create skip links if they don't exist
        let skipLinksContainer = document.getElementById('skip-links');
        
        if (!skipLinksContainer) {
            skipLinksContainer = document.createElement('div');
            skipLinksContainer.id = 'skip-links';
            skipLinksContainer.className = 'skip-links';
            skipLinksContainer.setAttribute('role', 'navigation');
            skipLinksContainer.setAttribute('aria-label', 'Skip links');
            
            // Add skip links
            const skipLinks = [
                { href: '#main', text: 'Skip to main content' },
                { href: '#sidebar', text: 'Skip to navigation' },
                { href: '#map', text: 'Skip to map' },
                { href: '#results', text: 'Skip to results' }
            ];
            
            skipLinksContainer.innerHTML = skipLinks
                .map(link => `<a href="${link.href}" class="skip-link">${link.text}</a>`)
                .join('');
            
            document.body.insertBefore(skipLinksContainer, document.body.firstChild);
            
            // Add styles
            if (!document.getElementById('skip-links-styles')) {
                const styles = document.createElement('style');
                styles.id = 'skip-links-styles';
                styles.textContent = `
                    .skip-links {
                        position: absolute;
                        top: -1000px;
                        left: -1000px;
                        z-index: 999999;
                        background: var(--surface-elevated, #000);
                        padding: 10px;
                        border-radius: 4px;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                    }
                    .skip-links:focus-within {
                        position: fixed;
                        top: 20px;
                        left: 20px;
                    }
                    .skip-link {
                        display: block;
                        color: var(--text-primary, #fff);
                        text-decoration: none;
                        padding: 8px 12px;
                        margin: 2px 0;
                        border-radius: 3px;
                        transition: background-color 0.2s;
                    }
                    .skip-link:hover,
                    .skip-link:focus {
                        background: var(--primary-500, #2196F3);
                        outline: 2px solid var(--primary-300, #64B5F6);
                        outline-offset: 2px;
                    }
                `;
                document.head.appendChild(styles);
            }
        }
        
        // Focus first skip link
        const firstSkipLink = skipLinksContainer.querySelector('a');
        if (firstSkipLink) {
            firstSkipLink.focus();
        }
    }
    
    /**
     * Cycle through main page landmarks
     * @param {boolean} reverse - Whether to cycle in reverse
     */
    cycleLandmarks(reverse = false) {
        const landmarks = [
            'main',
            'nav',
            '[role="navigation"]',
            '[role="banner"]',
            '[role="contentinfo"]',
            'aside',
            'section'
        ];
        
        const landmarkElements = [];
        for (const selector of landmarks) {
            const elements = document.querySelectorAll(selector);
            landmarkElements.push(...elements);
        }
        
        if (landmarkElements.length === 0) return;
        
        const currentFocus = document.activeElement;
        let currentIndex = -1;
        
        // Find current landmark
        for (let i = 0; i < landmarkElements.length; i++) {
            if (landmarkElements[i].contains(currentFocus)) {
                currentIndex = i;
                break;
            }
        }
        
        // Calculate next index
        let nextIndex;
        if (reverse) {
            nextIndex = currentIndex <= 0 ? landmarkElements.length - 1 : currentIndex - 1;
        } else {
            nextIndex = currentIndex >= landmarkElements.length - 1 ? 0 : currentIndex + 1;
        }
        
        const nextLandmark = landmarkElements[nextIndex];
        if (nextLandmark) {
            // Find first focusable element in landmark
            const focusableInLandmark = this.getFocusableElements(nextLandmark);
            const target = focusableInLandmark.length > 0 ? focusableInLandmark[0] : nextLandmark;
            
            if (target.tabIndex === -1) {
                target.tabIndex = 0;
            }
            
            target.focus();
            this.announceToScreenReader(`Navigated to ${this.getLandmarkLabel(nextLandmark)}`);
        }
    }
    
    /**
     * Get descriptive label for landmark
     * @param {HTMLElement} element - Landmark element
     * @returns {string} Landmark label
     */
    getLandmarkLabel(element) {
        const role = element.getAttribute('role');
        const ariaLabel = element.getAttribute('aria-label');
        const tagName = element.tagName.toLowerCase();
        
        if (ariaLabel) return ariaLabel;
        if (role) return role;
        
        switch (tagName) {
            case 'main': return 'main content';
            case 'nav': return 'navigation';
            case 'aside': return 'sidebar';
            case 'section': return 'section';
            case 'header': return 'header';
            case 'footer': return 'footer';
            default: return 'landmark';
        }
    }
    
    /**
     * Announce text to screen readers
     * @param {string} text - Text to announce
     * @param {string} priority - Priority: 'polite' or 'assertive'
     */
    announceToScreenReader(text, priority = 'polite') {
        let announcer = document.getElementById('sr-announcer');
        
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'sr-announcer';
            announcer.setAttribute('aria-live', priority);
            announcer.setAttribute('aria-atomic', 'true');
            announcer.style.cssText = `
                position: absolute;
                left: -10000px;
                width: 1px;
                height: 1px;
                overflow: hidden;
            `;
            document.body.appendChild(announcer);
        }
        
        announcer.setAttribute('aria-live', priority);
        announcer.textContent = text;
        
        // Clear after announcement
        setTimeout(() => {
            if (announcer.textContent === text) {
                announcer.textContent = '';
            }
        }, 1000);
    }
    
    /**
     * Release all focus traps
     */
    releaseAllTraps() {
        while (this.trapStack.length > 0) {
            const trap = this.trapStack.pop();
            if (trap && trap.deactivate) {
                trap.deactivate();
            }
        }
    }
    
    /**
     * Get debug information
     * @returns {Object} Debug info
     */
    getDebugInfo() {
        return {
            focusStackLength: this.focusStack.length,
            activeTrapCount: this.trapStack.length,
            lastFocusedElement: this.lastFocusedElement,
            keyboardNavigationEnabled: this.keyboardNavigation.enabled,
            focusableElementsInDocument: this.getFocusableElements().length
        };
    }
}

// Global focus manager instance
export const focusManager = new FocusManager();

// Export for individual use
export default FocusManager;