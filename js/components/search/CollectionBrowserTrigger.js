/**
 * CollectionBrowserTrigger.js - Trigger button component for opening the collection browser modal
 * Replaces the existing dropdown-based collection selection
 */

export class CollectionBrowserTrigger {
    /**
     * Create a new CollectionBrowserTrigger
     * @param {Object} modal - CollectionBrowserModal instance
     * @param {Object} inlineDropdownManager - InlineDropdownManager instance to replace
     */
    constructor(modal, inlineDropdownManager = null) {
        this.modal = modal;
        this.inlineDropdownManager = inlineDropdownManager;
        this.triggerButton = null;
        this.currentSelection = null;
        
        this.createTriggerButton();
        this.setupEventListeners();
    }
    
    /**
     * Create the trigger button that makes the existing SOURCE card clickable
     */
    createTriggerButton() {
        // Use a more robust approach with multiple retries and better logging
        this.attemptToFindAndSetupTrigger(0);
    }
    
    /**
     * Attempt to find and setup the trigger with retry logic
     * @param {number} attemptCount - Current attempt number
     */
    attemptToFindAndSetupTrigger(attemptCount = 0) {
        const maxAttempts = 5;
        const retryDelay = [500, 1000, 2000, 3000, 5000]; // Progressive delays
        
        const summarySource = document.getElementById('summary-source');
        
        if (summarySource) {
            this.setupTrigger(summarySource);
            return;
        }
        
        if (attemptCount < maxAttempts) {
            console.warn(`⚠️ summary-source element not found (attempt ${attemptCount + 1}/${maxAttempts}), retrying in ${retryDelay[attemptCount]}ms...`);
            
            // Debug: List all elements with summary in ID
            const summaryElements = document.querySelectorAll('[id*="summary"]');
            console.log('Available summary elements:', Array.from(summaryElements).map(el => el.id));
            
            setTimeout(() => {
                this.attemptToFindAndSetupTrigger(attemptCount + 1);
            }, retryDelay[attemptCount]);
        } else {
            console.error('❌ summary-source element not found after all retries');
            console.log('Available elements with "summary" in ID:', 
                Array.from(document.querySelectorAll('[id*="summary"]')).map(el => el.id)
            );
            console.log('Available elements with "source" in class:', 
                Array.from(document.querySelectorAll('[class*="source"]')).map(el => ({ id: el.id, class: el.className }))
            );
        }
    }
    
    /**
     * Setup the trigger on the found element
     * @param {HTMLElement} summarySource - The source element to make clickable
     */
    setupTrigger(summarySource) {
        
        // Make the existing card clickable
        summarySource.style.cursor = 'pointer';
        summarySource.classList.add('collection-browser-trigger');
        summarySource.setAttribute('role', 'button');
        summarySource.setAttribute('tabindex', '0');
        summarySource.setAttribute('title', 'Click to browse collections');
        
        // Remove data-field attribute to prevent inline dropdown interference
        summarySource.removeAttribute('data-field');
        
        // Add a flag to indicate this is handled by browse collections
        summarySource.setAttribute('data-browse-collections', 'true');
        
        // Store reference to the existing element
        this.triggerButton = summarySource;
        
        // Find the value element to update later
        this.valueElement = summarySource.querySelector('.search-summary-value');
        
        // Add enhanced styling
        this.addTriggerStyles();
        
    }
    
    /**
     * Add CSS styles for the trigger button
     */
    addTriggerStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Collection Browser Trigger Styles - Enhanced existing SOURCE card */
            .collection-browser-trigger {
                transition: all 0.3s ease !important;
                position: relative;
            }
            
            .collection-browser-trigger:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15) !important;
                border-color: var(--primary-color, #667eea) !important;
            }
            
            .collection-browser-trigger:active {
                transform: translateY(0) !important;
            }
            
            .collection-browser-trigger.has-selection {
                border-color: var(--primary-color, #667eea) !important;
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%) !important;
            }
            
            .collection-browser-trigger.has-selection .search-summary-value {
                color: var(--primary-color, #667eea) !important;
                font-weight: 600 !important;
            }
            
            .collection-browser-trigger::after {
                content: '';
                position: absolute;
                top: 50%;
                right: 16px;
                transform: translateY(-50%);
                width: 0;
                height: 0;
                border-left: 6px solid var(--text-secondary, #6b7280);
                border-top: 4px solid transparent;
                border-bottom: 4px solid transparent;
                transition: all 0.2s ease;
                pointer-events: none;
            }
            
            .collection-browser-trigger:hover::after {
                border-left-color: var(--primary-color, #667eea);
                transform: translateY(-50%) scale(1.1);
            }
            
            /* Loading state */
            .collection-browser-trigger.loading {
                pointer-events: none;
                opacity: 0.7;
            }
            
            /* Focus styles for accessibility */
            .collection-browser-trigger:focus {
                outline: 2px solid var(--primary-color, #667eea) !important;
                outline-offset: 2px;
            }
            
            .collection-browser-trigger:focus:not(:focus-visible) {
                outline: none;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.triggerButton) return;
        
        // Main click handler to open panel
        const clickHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation(); // Prevent any other handlers from running
            
            // Force reset button state before processing click
            this.resetTriggerState();
            
            // Ensure button is not disabled
            if (this.triggerButton.classList.contains('loading')) {
                console.warn('⚠️ Button clicked while in loading state, ignoring');
                return;
            }
            
            // Prevent any inline dropdown from appearing
            this.preventInlineDropdown();
            
            this.openPanel();
        };
        
        this.triggerButton.addEventListener('click', clickHandler);
        
        // Also add event listeners for other interaction methods
        this.triggerButton.addEventListener('mousedown', (e) => {
            // Ensure button is ready for interaction
            this.resetTriggerState();
        });
        
        this.triggerButton.addEventListener('focus', (e) => {
            // Ensure button is ready when focused
            this.resetTriggerState();
        });
        
        // Keyboard support
        this.triggerButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openPanel();
            }
        });
        
        // Listen for collection selection from modal
        document.addEventListener('modalCollectionSelected', (e) => {
            if (e.detail && e.detail.collection) {
                this.updateSelection(e.detail.collection);
                
                // Ensure button is re-enabled after selection with multiple checks
                setTimeout(() => {
                    this.setLoadingState(false);
                    this.ensureButtonClickable();
                    
                    // Force reset any modal states that might be interfering
                    if (this.modal) {
                        this.modal.isOpen = false;
                    }
                    
                    // Double-check that the button is clickable
                    this.resetTriggerState();
                }, 100);
                
                // Additional check after a longer delay
                setTimeout(() => {
                    this.ensureButtonClickable();
                    this.resetTriggerState();
                }, 500);
            }
        });
        
        // Listen for external collection changes
        document.addEventListener('collectionSelected', (e) => {
            if (e.detail && e.detail.collection) {
                this.updateSelection(e.detail.collection);
            }
        });
        
        // Listen for collection cleared
        document.addEventListener('collectionCleared', () => {
            this.clearSelection();
        });
        
        // Listen for any modal or panel close events to reset trigger state
        document.addEventListener('browseCollectionsPanelClosed', () => {
            setTimeout(() => {
                this.ensureButtonClickable();
                this.resetTriggerState();
            }, 100);
        });
        
        // Also listen for generic modal close events
        document.addEventListener('modalClosed', () => {
            setTimeout(() => {
                this.ensureButtonClickable();
                this.resetTriggerState();
            }, 100);
        });
    }
    
    /**
     * Open the collection browser modal
     */
    async openPanel() {
        
        // Show loading state
        this.setLoadingState(true);
        
        try {
            // Always use modal to avoid panel/modal conflicts
            if (this.modal) {
                await this.modal.open();
            } else {
                console.error('❌ Modal not available');
            }
            
        } catch (error) {
            console.error('Error opening collection browser panel:', error);
        } finally {
            // Ensure loading state is cleared
            setTimeout(() => {
                this.setLoadingState(false);
            }, 100);
        }
    }
    
    /**
     * Initialize collection browser content in the panel
     */
    async initializeCollectionBrowserInPanel() {
        try {
            const panelContent = document.getElementById('browse-collections-content');
            if (!panelContent) {
                // Fall back to modal when panel structure is not available
                if (this.modal) {
                    await this.modal.open();
                }
                return;
            }
            
            // For panel mode, just show a simple message or basic interface
            // Avoid using modal methods which cause conflicts
            panelContent.innerHTML = `
                <div class="panel-collection-browser">
                    <div class="panel-message">
                        <h3>Browse Collections</h3>
                        <p>Collection browser is loading...</p>
                        <button onclick="location.reload()" class="retry-btn">Refresh Page</button>
                    </div>
                </div>
            `;
            
            // Since the modal/panel integration is causing conflicts,
            // let's just ensure the trigger button remains clickable
            // and rely on the modal fallback for now
            setTimeout(() => {
                this.resetTriggerState();
                this.ensureButtonClickable();
            }, 500);
            
        } catch (error) {
            console.error('❌ Error initializing collection browser in panel:', error);
        }
    }
    
    /**
     * Prevent inline dropdown from appearing
     */
    preventInlineDropdown() {
        try {
            // Remove any existing inline dropdown containers
            const existingDropdowns = document.querySelectorAll('.inline-dropdown-container[data-field="collection"]');
            existingDropdowns.forEach(dropdown => {
                if (dropdown.parentNode) {
                    dropdown.parentNode.removeChild(dropdown);
                }
            });
            
            // Temporarily disable inline dropdown manager if available
            const inlineDropdownManager = window.stacExplorer?.inlineDropdownManager;
            if (inlineDropdownManager && typeof inlineDropdownManager.temporarilyDisableClickOutside !== 'undefined') {
                inlineDropdownManager.temporarilyDisableClickOutside = true;
                setTimeout(() => {
                    inlineDropdownManager.temporarilyDisableClickOutside = false;
                }, 500);
            }
        } catch (error) {
            console.warn('⚠️ Error preventing inline dropdown:', error);
        }
    }
    
    /**
     * Update the trigger button with selected collection
     * @param {Object} collection - Selected collection object
     */
    updateSelection(collection) {
        this.currentSelection = collection;
        
        // Update the search summary value
        if (this.valueElement) {
            this.valueElement.textContent = collection.title || collection.id;
            this.triggerButton.classList.add('has-selection');
        }
        
        // Update the inline dropdown manager if it exists
        if (this.inlineDropdownManager) {
            this.inlineDropdownManager.updateSearchSummary('collection', 
                `📂 ${collection.title || collection.id}`.toUpperCase()
            );
        }
        
        // Ensure button remains clickable after selection
        this.ensureButtonClickable();
    }
    
    /**
     * Clear the selection
     */
    clearSelection() {
        this.currentSelection = null;
        
        // Reset the search summary value
        if (this.valueElement) {
            this.valueElement.textContent = 'Select Source';
            this.triggerButton.classList.remove('has-selection');
        }
        
        // Update the inline dropdown manager if it exists
        if (this.inlineDropdownManager) {
            this.inlineDropdownManager.updateSearchSummary('collection', '📂 Select Source');
        }
        
        // Ensure button remains clickable after clearing
        this.ensureButtonClickable();
    }
    
    /**
     * Set loading state
     * @param {boolean} loading - Whether to show loading state
     */
    setLoadingState(loading) {
        if (this.triggerButton) {
            this.triggerButton.classList.toggle('loading', loading);
        }
    }
    
    /**
     * Ensure the button is clickable and not stuck in any disabled state
     */
    ensureButtonClickable() {
        if (this.triggerButton) {
            // Remove any loading or disabled states
            this.triggerButton.classList.remove('loading');
            
            // Ensure modal state is also reset
            if (this.modal) {
                this.modal.isOpen = false;
            }
            this.triggerButton.disabled = false;
            this.triggerButton.style.pointerEvents = '';
            this.triggerButton.style.opacity = '';
            
            // Ensure cursor is set to pointer
            this.triggerButton.style.cursor = 'pointer';
            
        }
    }
    
    /**
     * Reset trigger state completely - more aggressive than ensureButtonClickable
     */
    resetTriggerState() {
        if (this.triggerButton) {
            // Remove all possible interfering classes and attributes
            this.triggerButton.classList.remove('loading', 'disabled', 'processing');
            this.triggerButton.removeAttribute('disabled');
            this.triggerButton.removeAttribute('aria-disabled');
            
            // Reset all styles that might interfere
            this.triggerButton.style.pointerEvents = 'auto';
            this.triggerButton.style.cursor = 'pointer';
            this.triggerButton.style.opacity = '1';
            this.triggerButton.style.filter = '';
            this.triggerButton.style.userSelect = '';
            
            // Ensure it's properly accessible
            this.triggerButton.tabIndex = 0;
            
            // Clear any timeouts or intervals that might be affecting it
            if (this.resetTimeout) {
                clearTimeout(this.resetTimeout);
            }
        }
    }
    
    /**
     * Get current selection
     * @returns {Object|null} Current selection
     */
    getCurrentSelection() {
        return this.currentSelection;
    }
    
    /**
     * Set selection programmatically
     * @param {Object} collection - Collection to select
     */
    setSelection(collection) {
        this.updateSelection(collection);
    }
    
    /**
     * Disable/enable the trigger button
     * @param {boolean} disabled - Whether to disable the button
     */
    setDisabled(disabled) {
        if (this.triggerButton) {
            this.triggerButton.disabled = disabled;
            this.triggerButton.style.pointerEvents = disabled ? 'none' : '';
            this.triggerButton.style.opacity = disabled ? '0.5' : '';
        }
    }
    
    /**
     * Show error state
     */
    showError() {
        if (this.triggerButton) {
            this.triggerButton.classList.add('error');
            setTimeout(() => {
                this.triggerButton.classList.remove('error');
            }, 3000);
        }
    }
    
    /**
     * Destroy the trigger button
     */
    destroy() {
        if (this.triggerButton && this.triggerButton.parentNode) {
            this.triggerButton.parentNode.removeChild(this.triggerButton);
        }
        this.triggerButton = null;
        this.currentSelection = null;
    }
}