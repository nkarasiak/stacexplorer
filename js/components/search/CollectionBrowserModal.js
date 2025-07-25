/**
 * CollectionBrowserModal.js - Modal window for browsing and selecting collections
 * Replaces the SOURCE dropdown with a beautiful modal interface
 */

import { CollectionGridSelector } from './CollectionGridSelector.js';

export class CollectionBrowserModal {
    /**
     * Create a new CollectionBrowserModal
     * @param {Object} collectionManager - CollectionManagerEnhanced instance
     * @param {Object} apiClient - STAC API client
     * @param {Object} notificationService - Notification service
     * @param {Object} config - Application configuration
     */
    constructor(collectionManager, apiClient, notificationService, config) {
        this.collectionManager = collectionManager;
        this.apiClient = apiClient;
        this.notificationService = notificationService;
        this.config = config;
        
        this.modal = null;
        this.gridSelector = null;
        this.isOpen = false;
        this.currentSelection = null;
        
        this.createModal();
        this.setupEventListeners();
    }
    
    /**
     * Create the modal DOM structure
     */
    createModal() {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'collection-browser-modal-overlay';
        modalOverlay.id = 'collection-browser-modal';
        
        modalOverlay.innerHTML = `
            <div class="collection-browser-modal-dialog">
                <div class="collection-browser-modal-header">
                    <h2 class="modal-title">
                        <i class="material-icons">dataset</i>
                        Browse Collections
                    </h2>
                    <div class="modal-header-actions">
                        <button class="modal-expand-btn" aria-label="Expand to full screen">
                            <i class="material-icons">fullscreen</i>
                        </button>
                        <button class="modal-close-btn" aria-label="Close">
                            <i class="material-icons">close</i>
                        </button>
                    </div>
                </div>
                
                <div class="collection-browser-modal-body">
                    <!-- Collection grid selector will be inserted here -->
                    <div id="modal-collection-grid-container"></div>
                </div>
                
                <div class="collection-browser-modal-footer">
                    <div class="footer-actions-left">
                        <div class="current-selection" id="current-selection" style="display: none;">
                            <span class="selection-label">Selected:</span>
                            <span class="selection-value" id="selection-value"></span>
                        </div>
                    </div>
                    <div class="footer-actions-right">
                        <button class="modal-btn modal-btn-secondary" id="modal-cancel-btn">
                            Cancel
                        </button>
                        <button class="modal-btn modal-btn-primary" id="modal-apply-btn" disabled>
                            <i class="material-icons">check</i>
                            Apply Selection
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to body but keep hidden
        document.body.appendChild(modalOverlay);
        
        // Store references
        this.modal = {
            overlay: modalOverlay,
            dialog: modalOverlay.querySelector('.collection-browser-modal-dialog'),
            closeBtn: modalOverlay.querySelector('.modal-close-btn'),
            expandBtn: modalOverlay.querySelector('.modal-expand-btn'),
            cancelBtn: modalOverlay.querySelector('#modal-cancel-btn'),
            applyBtn: modalOverlay.querySelector('#modal-apply-btn'),
            currentSelection: modalOverlay.querySelector('#current-selection'),
            selectionValue: modalOverlay.querySelector('#selection-value'),
            gridContainer: modalOverlay.querySelector('#modal-collection-grid-container')
        };
        
        this.isExpanded = false;
        
        // Add CSS styles
        this.addModalStyles();
        
        console.log('✅ Collection browser modal created');
    }
    
    /**
     * Add CSS styles for the modal
     */
    addModalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Collection Browser Modal Styles */
            .collection-browser-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 2000;
                opacity: 0;
                transition: all 0.3s ease;
            }
            
            .collection-browser-modal-overlay.open {
                display: flex;
                opacity: 1;
            }
            
            .collection-browser-modal-dialog {
                background: var(--background-color, #ffffff);
                border-radius: 12px;
                width: 90%;
                max-width: 900px;
                height: 80vh;
                max-height: 700px;
                box-shadow: 0 16px 32px rgba(0, 0, 0, 0.2);
                display: flex;
                flex-direction: column;
                transform: scale(0.95);
                transition: transform 0.3s ease;
                overflow: hidden;
            }
            
            .collection-browser-modal-overlay.open .collection-browser-modal-dialog {
                transform: scale(1);
            }
            
            /* Header */
            .collection-browser-modal-header {
                padding: 0.75rem 1rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 12px 12px 0 0;
                min-height: 44px;
            }
            
            .modal-header-actions {
                display: flex;
                gap: 0.5rem;
                align-items: center;
            }
            
            .modal-expand-btn,
            .modal-close-btn {
                background: rgba(255, 255, 255, 0.1);
                border: none;
                color: white;
                border-radius: 50%;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .modal-expand-btn:hover,
            .modal-close-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(1.05);
            }
            
            /* Expanded modal state */
            .collection-browser-modal-overlay.expanded .collection-browser-modal-dialog {
                width: 100vw;
                height: 100vh;
                max-width: none;
                max-height: none;
                border-radius: 0;
            }
            
            .collection-browser-modal-overlay.expanded #modal-collection-grid-container .collections-grid {
                max-height: calc(100vh - 200px);
                min-height: calc(100vh - 200px);
            }
            
            /* Body */
            .collection-browser-modal-body {
                flex: 1;
                padding: 0;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            #modal-collection-grid-container {
                flex: 1;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                min-height: 0;
            }
            
            /* Override collection grid styles for modal */
            #modal-collection-grid-container .collection-grid-selector {
                margin: 0;
                border-radius: 0;
                box-shadow: none;
                height: 100%;
                display: flex;
                flex-direction: column;
                overflow: visible;
            }
            
            /* Modal collection grid styles - header removed */
            
            #modal-collection-grid-container .collections-grid {
                overflow-y: auto !important;
                overflow-x: hidden;
                max-height: 500px;
                min-height: 400px;
                display: grid !important;
            }
            
            /* Footer */
            .collection-browser-modal-footer {
                padding: 1rem 1.5rem;
                background: var(--background-secondary, #f8fafc);
                border-top: 1px solid var(--border-color, #e5e7eb);
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 0 0 12px 12px;
                min-height: 60px;
            }
            
            .footer-actions-left {
                flex: 1;
            }
            
            .current-selection {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.95rem;
            }
            
            .selection-label {
                color: var(--text-secondary, #6b7280);
                font-weight: 500;
            }
            
            .selection-value {
                color: var(--primary-color, #667eea);
                font-weight: 600;
                max-width: 300px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .footer-actions-right {
                display: flex;
                gap: 1rem;
            }
            
            .modal-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                font-size: 0.9rem;
                font-weight: 500;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.4rem;
                transition: all 0.2s ease;
                min-width: 100px;
                justify-content: center;
            }
            
            .modal-btn-secondary {
                background: var(--background-color, #ffffff);
                color: var(--text-secondary, #6b7280);
                border: 2px solid var(--border-color, #d1d5db);
            }
            
            .modal-btn-secondary:hover {
                background: var(--background-secondary, #f9fafb);
                border-color: var(--text-secondary, #6b7280);
            }
            
            .modal-btn-primary {
                background: var(--primary-color, #667eea);
                color: white;
                border: 2px solid var(--primary-color, #667eea);
            }
            
            .modal-btn-primary:hover:not(:disabled) {
                background: var(--primary-dark, #5a67d8);
                border-color: var(--primary-dark, #5a67d8);
                transform: translateY(-1px);
            }
            
            .modal-btn-primary:disabled {
                background: var(--text-muted, #9ca3af);
                border-color: var(--text-muted, #9ca3af);
                cursor: not-allowed;
                transform: none;
            }
            
            /* Responsive design */
            @media (max-width: 768px) {
                .collection-browser-modal-dialog {
                    width: 95%;
                    height: 85vh;
                    max-height: 500px;
                    border-radius: 8px;
                }
                
                .collection-browser-modal-header {
                    padding: 0.5rem 0.75rem;
                    min-height: 40px;
                }
                
                .modal-close-btn {
                    width: 28px;
                    height: 28px;
                }
                
                .collection-browser-modal-footer {
                    padding: 0.75rem 1rem;
                    flex-direction: column;
                    gap: 0.75rem;
                    align-items: stretch;
                    min-height: auto;
                }
                
                .footer-actions-right {
                    justify-content: stretch;
                    gap: 0.75rem;
                }
                
                .modal-btn {
                    flex: 1;
                    padding: 8px 16px;
                    font-size: 0.85rem;
                }
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .collection-browser-modal-dialog {
                    background: var(--background-dark, #1f2937);
                }
                
                .collection-browser-modal-footer {
                    background: var(--background-dark-secondary, #374151);
                    border-color: var(--border-dark, #4b5563);
                }
                
                .modal-btn-secondary {
                    background: var(--background-dark-secondary, #374151);
                    color: var(--text-dark-secondary, #d1d5db);
                    border-color: var(--border-dark, #4b5563);
                }
                
                .modal-btn-secondary:hover {
                    background: var(--background-dark, #1f2937);
                    border-color: var(--text-dark-secondary, #d1d5db);
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close button
        this.modal.closeBtn.addEventListener('click', () => {
            this.close();
        });
        
        // Expand button
        this.modal.expandBtn.addEventListener('click', () => {
            this.toggleExpanded();
        });
        
        // Cancel button
        this.modal.cancelBtn.addEventListener('click', () => {
            this.close();
        });
        
        // Apply button
        this.modal.applyBtn.addEventListener('click', () => {
            this.applySelection();
        });
        
        // Overlay click to close
        this.modal.overlay.addEventListener('click', (e) => {
            if (e.target === this.modal.overlay) {
                this.close();
            }
        });
        
        // Escape key to close
        this.escapeHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
        
        // Listen for collection selection from grid
        document.addEventListener('collectionSelected', (e) => {
            if (this.isOpen && e.detail && e.detail.collection) {
                this.onCollectionSelected(e.detail.collection);
            }
        });
        
        // Listen for collection cleared
        document.addEventListener('collectionCleared', () => {
            if (this.isOpen) {
                this.onCollectionCleared();
            }
        });
    }
    
    /**
     * Open the modal
     */
    async open() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        
        // Initialize grid selector if not already done
        if (!this.gridSelector) {
            await this.initializeGridSelector();
        }
        
        // Load collections
        const collections = this.collectionManager.getAllCollections();
        if (collections && collections.length > 0) {
            await this.gridSelector.loadCollections(collections);
            
            // Sync current selection
            const selectedId = this.collectionManager.getSelectedCollection();
            if (selectedId) {
                this.gridSelector.setSelectedCollection(selectedId);
                this.updateSelectionDisplay(selectedId);
            }
        } else {
            // Try to load collections
            try {
                await this.collectionManager.loadAllCollectionsOnStartup();
                const freshCollections = this.collectionManager.getAllCollections();
                if (freshCollections && freshCollections.length > 0) {
                    await this.gridSelector.loadCollections(freshCollections);
                }
            } catch (error) {
                console.error('Error loading collections for modal:', error);
            }
        }
        
        // Show modal with animation
        this.modal.overlay.classList.add('open');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        console.log('📖 Collection browser modal opened');
    }
    
    /**
     * Close the modal
     */
    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.isExpanded = false;
        this.modal.overlay.classList.remove('open', 'expanded');
        document.body.style.overflow = ''; // Restore scrolling
        
        // Reset expand button icon
        this.updateExpandIcon();
        
        // Reset selection display
        this.currentSelection = null;
        this.updateSelectionDisplay();
        
        console.log('📕 Collection browser modal closed');
    }
    
    /**
     * Toggle expanded/full screen mode
     */
    toggleExpanded() {
        this.isExpanded = !this.isExpanded;
        this.modal.overlay.classList.toggle('expanded', this.isExpanded);
        this.updateExpandIcon();
        
        console.log(`🔄 Modal ${this.isExpanded ? 'expanded to' : 'restored from'} full screen`);
    }
    
    /**
     * Update expand button icon based on state
     */
    updateExpandIcon() {
        const icon = this.modal.expandBtn.querySelector('.material-icons');
        const expandBtn = this.modal.expandBtn;
        
        if (this.isExpanded) {
            icon.textContent = 'fullscreen_exit';
            expandBtn.setAttribute('aria-label', 'Exit full screen');
        } else {
            icon.textContent = 'fullscreen';
            expandBtn.setAttribute('aria-label', 'Expand to full screen');
        }
    }
    
    /**
     * Initialize the grid selector within the modal
     */
    async initializeGridSelector() {
        try {
            // Create a temporary container for the grid selector
            const tempContainer = document.createElement('div');
            this.modal.gridContainer.appendChild(tempContainer);
            
            // Initialize grid selector
            this.gridSelector = new CollectionGridSelector(
                this.apiClient,
                this.notificationService,
                this.config
            );
            
            // Move the grid selector into our modal container
            const gridElement = document.getElementById('collection-grid-container');
            if (gridElement) {
                this.modal.gridContainer.appendChild(gridElement);
                tempContainer.remove();
            }
            
            console.log('✅ Grid selector initialized in modal');
        } catch (error) {
            console.error('❌ Error initializing grid selector in modal:', error);
            this.notificationService.showNotification(
                'Error initializing collection browser',
                'error'
            );
        }
    }
    
    /**
     * Handle collection selection from grid
     * @param {Object} collection - Selected collection
     */
    onCollectionSelected(collection) {
        this.currentSelection = collection;
        this.updateSelectionDisplay(collection.title || collection.id);
        this.modal.applyBtn.disabled = false;
    }
    
    /**
     * Handle collection cleared
     */
    onCollectionCleared() {
        this.currentSelection = null;
        this.updateSelectionDisplay();
        this.modal.applyBtn.disabled = true;
    }
    
    /**
     * Update the selection display in footer
     * @param {string} selectionText - Text to display
     */
    updateSelectionDisplay(selectionText = null) {
        if (selectionText) {
            this.modal.currentSelection.style.display = 'flex';
            this.modal.selectionValue.textContent = selectionText;
            this.modal.applyBtn.disabled = false;
        } else {
            this.modal.currentSelection.style.display = 'none';
            this.modal.applyBtn.disabled = true;
        }
    }
    
    /**
     * Apply the current selection and close modal
     */
    applySelection() {
        if (!this.currentSelection) return;
        
        // Update the collection manager with the selection
        this.collectionManager.setSelectedCollection(
            this.currentSelection.id, 
            this.currentSelection.source
        );
        
        // Update the trigger button text
        this.updateTriggerButton(this.currentSelection.title || this.currentSelection.id);
        
        // Dispatch global event
        document.dispatchEvent(new CustomEvent('modalCollectionSelected', {
            detail: {
                collection: this.currentSelection,
                source: this.currentSelection.source
            }
        }));
        
        this.notificationService.showNotification(
            `Selected: ${this.currentSelection.title || this.currentSelection.id}`,
            'success'
        );
        
        this.close();
    }
    
    /**
     * Update the trigger button text
     * @param {string} collectionName - Name of selected collection
     */
    updateTriggerButton(collectionName) {
        // Find and update the trigger button
        const triggerBtn = document.getElementById('collection-browser-trigger');
        if (triggerBtn) {
            const textSpan = triggerBtn.querySelector('.trigger-text');
            if (textSpan) {
                if (collectionName) {
                    textSpan.textContent = collectionName;
                    triggerBtn.classList.add('has-selection');
                } else {
                    textSpan.textContent = 'Browse Collections';
                    triggerBtn.classList.remove('has-selection');
                }
            }
        }
    }
    
    /**
     * Set selected collection programmatically
     * @param {string} collectionId - Collection ID
     * @param {string} source - Collection source
     */
    setSelectedCollection(collectionId, source = null) {
        if (this.gridSelector) {
            this.gridSelector.setSelectedCollection(collectionId, source);
        }
        
        // Update trigger button
        const collection = this.collectionManager.getCollectionById(collectionId, source);
        if (collection) {
            this.updateTriggerButton(collection.title || collection.id);
        }
    }
    
    /**
     * Clear selection
     */
    clearSelection() {
        if (this.gridSelector) {
            this.gridSelector.clearSelection();
        }
        this.currentSelection = null;
        this.updateSelectionDisplay();
        this.updateTriggerButton();
        
        // Update collection manager
        this.collectionManager.resetSelection();
    }
    
    /**
     * Get current selection
     * @returns {Object|null} Current selection
     */
    getCurrentSelection() {
        return this.currentSelection;
    }
    
    /**
     * Check if modal is open
     * @returns {boolean} True if open
     */
    isModalOpen() {
        return this.isOpen;
    }
    
    /**
     * Destroy the modal
     */
    destroy() {
        if (this.modal?.overlay && document.body.contains(this.modal.overlay)) {
            document.body.removeChild(this.modal.overlay);
        }
        
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
        }
        
        if (this.gridSelector && typeof this.gridSelector.destroy === 'function') {
            this.gridSelector.destroy();
        }
        
        this.modal = null;
        this.gridSelector = null;
        this.currentSelection = null;
        this.isOpen = false;
    }
}