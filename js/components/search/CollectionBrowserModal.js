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
        this.modalId = 'modal_' + Math.random().toString(36).substr(2, 9);
        
        console.log('🏗️ CollectionBrowserModal created with ID:', this.modalId);
        
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
                
                <!-- Footer removed - immediate selection on click -->
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
            
            /* No footer - immediate selection design */
            
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
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .collection-browser-modal-dialog {
                    background: var(--background-dark, #1f2937);
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
        
        // Overlay click to close
        this.modal.overlay.addEventListener('click', (e) => {
            console.log(`🖱️ Modal ${this.modalId} overlay clicked:`, {
                target: e.target.tagName + (e.target.className ? '.' + e.target.className : ''),
                isOverlay: e.target === this.modal.overlay,
                willClose: e.target === this.modal.overlay
            });
            
            if (e.target === this.modal.overlay) {
                console.log(`🚪 Modal ${this.modalId} closing due to overlay click`);
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
            console.log(`🔍 Modal ${this.modalId} received collectionSelected event:`, {
                modalId: this.modalId,
                isOpen: this.isOpen,
                hasDetail: !!e.detail,
                hasCollection: !!(e.detail && e.detail.collection),
                collectionId: e.detail?.collection?.id
            });
            
            // Process selection immediately, even if modal thinks it's not open
            if (e.detail && e.detail.collection) {
                console.log(`✅ Modal ${this.modalId} processing collection selection (forcing)`);
                
                // Force the modal to be open if it's not already
                if (!this.isOpen) {
                    console.warn(`⚠️ Modal ${this.modalId} was closed, forcing it to be open for selection processing`);
                    this.isOpen = true;
                }
                
                this.onCollectionSelected(e.detail.collection);
            } else {
                console.warn(`⚠️ Modal ${this.modalId} ignoring collection selection - missing data`);
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
        console.log('🔍 Attempting to open modal. Current state:', { isOpen: this.isOpen });
        
        if (this.isOpen) {
            console.warn('⚠️ Modal already open, aborting open attempt');
            return;
        }
        
        console.log('✅ Opening modal...');
        this.isOpen = true;
        console.log('📊 Modal state set to OPEN:', this.isOpen);
        
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
                console.log('✅ Synced current selection:', selectedId);
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
        console.log('🔍 Attempting to close modal. Current state:', { isOpen: this.isOpen });
        
        if (!this.isOpen) {
            console.warn('⚠️ Modal already closed, aborting close attempt');
            return;
        }
        
        console.log('✅ Closing modal...');
        console.trace('📍 MODAL CLOSE STACK TRACE:'); // This will show us what's calling close()
        this.isOpen = false;
        console.log('📊 Modal state set to CLOSED:', this.isOpen);
        this.isExpanded = false;
        this.modal.overlay.classList.remove('open', 'expanded');
        document.body.style.overflow = ''; // Restore scrolling
        
        // Reset expand button icon
        this.updateExpandIcon();
        
        // Reset selection
        this.currentSelection = null;
        
        console.log('📕 Collection browser modal closed successfully');
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
     * Handle collection selection from grid - immediately apply and close
     * @param {Object} collection - Selected collection
     */
    onCollectionSelected(collection) {
        console.log('🎯 onCollectionSelected called with:', collection?.id || collection);
        this.currentSelection = collection;
        
        // Immediately apply selection and close modal
        console.log('🚀 Applying selection and closing modal...');
        this.applySelectionAndClose(collection);
    }
    
    /**
     * Handle collection cleared
     */
    onCollectionCleared() {
        this.currentSelection = null;
        // No need for UI updates since there's no footer
    }
    
    /**
     * Apply selection and close modal immediately
     * @param {Object} collection - Collection to apply
     */
    applySelectionAndClose(collection) {
        if (!collection) return;
        
        // Update the collection manager with the selection
        this.collectionManager.setSelectedCollection(
            collection.id, 
            collection.source
        );
        
        // Update the trigger button text
        this.updateTriggerButton(collection.title || collection.id);
        
        // Dispatch global event
        document.dispatchEvent(new CustomEvent('modalCollectionSelected', {
            detail: {
                collection: collection,
                source: collection.source
            }
        }));
        
        this.notificationService.showNotification(
            `Selected: ${collection.title || collection.id}`,
            'success'
        );
        
        // Close modal immediately
        this.close();
        
        console.log('✅ Collection selected and modal closed:', collection.id);
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