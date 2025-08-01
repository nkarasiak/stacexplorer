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
    this.modalId = `modal_${Math.random().toString(36).substr(2, 9)}`;

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
      gridContainer: modalOverlay.querySelector('#modal-collection-grid-container'),
    };

    this.isExpanded = false;

    // Add CSS styles
    this.addModalStyles();
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
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 2000;
                opacity: 0;
                transition: opacity 0.2s ease;
                pointer-events: auto;
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
                transition: transform 0.2s ease;
                overflow: hidden;
                color: var(--text-color, #1f2937);
                will-change: transform;
            }
            
            .collection-browser-modal-overlay.open .collection-browser-modal-dialog {
                transform: scale(1);
            }
            
            /* Header */
            .collection-browser-modal-header {
                padding: 0.75rem 1rem;
                background: var(--header-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%));
                color: var(--header-text-color, white);
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
                background: var(--header-button-bg, rgba(255, 255, 255, 0.1));
                border: none;
                color: var(--header-text-color, white);
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
                background: var(--header-button-hover-bg, rgba(255, 255, 255, 0.2));
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
            
            /* Light theme */
            [data-theme="light"] .collection-browser-modal-dialog {
                --header-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                --header-text-color: white;
                --header-button-bg: rgba(255, 255, 255, 0.1);
                --header-button-hover-bg: rgba(255, 255, 255, 0.2);
            }
            
            /* Dark theme */
            [data-theme="dark"] .collection-browser-modal-dialog,
            @media (prefers-color-scheme: dark) {
                .collection-browser-modal-dialog {
                    background: var(--background-dark, #1f2937);
                    --header-gradient: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                    --header-text-color: white;
                    --header-button-bg: rgba(255, 255, 255, 0.15);
                    --header-button-hover-bg: rgba(255, 255, 255, 0.25);
                }
            }
        `;

    document.head.appendChild(style);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Close button - ensure it works
    this.modal.closeBtn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      this.close();
    });

    // Expand button
    this.modal.expandBtn.addEventListener('click', () => {
      this.toggleExpanded();
    });

    // Overlay click to close or focus search
    this.modal.overlay.addEventListener('click', e => {
      if (e.target === this.modal.overlay) {
        this.close();
      } else if (
        e.target === this.modal.dialog ||
        e.target.closest('.collection-browser-modal-body')
      ) {
        // Don't auto-focus if clicking on form controls
        if (
          e.target.tagName === 'SELECT' ||
          e.target.tagName === 'OPTION' ||
          e.target.closest('select') ||
          e.target.closest('.collection-source-filter')
        ) {
          return;
        }

        // If clicking inside the modal body, focus the search input
        this.focusSearchInput();
      }
    });

    // Escape key to close - with higher priority
    this.escapeHandler = e => {
      if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    };
    // Use capture phase to get priority over other handlers
    document.addEventListener('keydown', this.escapeHandler, true);

    // Listen for collection selection from grid
    document.addEventListener('collectionSelected', e => {
      // Process selection immediately, even if modal thinks it's not open
      if (e.detail?.collection) {
        // Force the modal to be open if it's not already
        if (!this.isOpen) {
          console.warn(
            `⚠️ Modal ${this.modalId} was closed, forcing it to be open for selection processing`
          );
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
    // Force reset modal state if it's stuck
    if (this.isOpen) {
      console.warn('⚠️ Modal state was stuck open, forcing reset...');
      this.close();
      // Brief delay to ensure clean state
      await new Promise(resolve => setTimeout(resolve, 50));
    }

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
    this.modal.overlay.style.display = 'flex'; // Ensure it's visible
    this.modal.overlay.classList.add('open');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling

    // Focus the search input after everything is loaded
    // Use multiple attempts to ensure it works
    setTimeout(() => {
      this.focusSearchInput();
    }, 100); // First attempt quickly

    setTimeout(() => {
      this.focusSearchInput();
    }, 500); // Second attempt after animation
  }

  /**
   * Close the modal
   */
  close() {
    // Always close regardless of state to ensure it works
    console.warn('📍 MODAL CLOSE STACK TRACE:'); // This will show us what's calling close()

    this.isOpen = false;
    this.isExpanded = false;

    // Ensure modal is actually hidden
    if (this.modal?.overlay) {
      this.modal.overlay.classList.remove('open', 'expanded');
      this.modal.overlay.style.display = 'none';
    }

    document.body.style.overflow = ''; // Restore scrolling

    // Reset expand button icon
    this.updateExpandIcon();

    // Reset selection
    this.currentSelection = null;
  }

  /**
   * Toggle expanded/full screen mode
   */
  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
    this.modal.overlay.classList.toggle('expanded', this.isExpanded);
    this.updateExpandIcon();
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
  initializeGridSelector() {
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

      // Try to focus the search input immediately after initialization
      setTimeout(() => {
        if (this.gridSelector?.elements?.searchInput) {
          this.focusSearchInput();
        }
      }, 50);
    } catch (error) {
      console.error('❌ Error initializing grid selector in modal:', error);
      this.notificationService.showNotification('Error initializing collection browser', 'error');
    }
  }

  /**
   * Handle collection selection from grid - immediately apply and close
   * @param {Object} collection - Selected collection
   */
  onCollectionSelected(collection) {
    this.currentSelection = collection;

    // Immediately apply selection and close modal
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
    if (!collection) {
      return;
    }

    // Update the collection manager with the selection
    this.collectionManager.setSelectedCollection(collection.id, collection.source);

    // Update the trigger button text
    this.updateTriggerButton(collection.title || collection.id);

    // Dispatch global event
    document.dispatchEvent(
      new CustomEvent('modalCollectionSelected', {
        detail: {
          collection: collection,
          source: collection.source,
        },
      })
    );

    this.notificationService.showNotification(
      `Selected: ${collection.title || collection.id}`,
      'success'
    );

    // Close panel instead of modal
    const uiManager = window.stacExplorer?.uiManager;
    if (uiManager) {
      uiManager.hideBrowseCollectionsPanel();
      // Ensure modal state is reset even when using panel
      this.close();
    } else {
      // Fallback to closing modal if UIManager not available
      this.close();
    }
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
   * Focus the search input in the collection grid
   */
  focusSearchInput() {
    try {
      // Method 1: Look for the search input in the modal
      const searchInput = this.modal.overlay.querySelector('#collection-search');
      if (searchInput && searchInput.offsetParent !== null) {
        searchInput.focus();
        searchInput.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return true;
      }

      // Method 2: Try to focus via grid selector
      if (this.gridSelector?.elements?.searchInput) {
        const gridSearchInput = this.gridSelector.elements.searchInput;
        if (gridSearchInput.offsetParent !== null) {
          gridSearchInput.focus();
          gridSearchInput.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth',
          });
          return true;
        }
      }

      // Method 3: Global search for any collection search input that's visible
      const globalSearch = document.querySelector(
        '#collection-search:not([style*="display: none"])'
      );
      if (globalSearch && globalSearch.offsetParent !== null) {
        globalSearch.focus();
        globalSearch.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return true;
      }

      console.warn('⚠️ Search input not found or not visible');

      return false;
    } catch (error) {
      console.error('❌ Error focusing search input:', error);
      return false;
    }
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
      document.removeEventListener('keydown', this.escapeHandler, true);
    }

    if (this.gridSelector && typeof this.gridSelector.destroy === 'function') {
      this.gridSelector.destroy();
    }

    this.modal = null;
    this.gridSelector = null;
    this.currentSelection = null;
    this.isOpen = false;
  }

  /**
   * Force close any collection browser modals (for debugging)
   * This is a static method that can be called globally
   */
  static forceCloseAll() {
    const modals = document.querySelectorAll('.collection-browser-modal-overlay');
    modals.forEach(modal => {
      modal.classList.remove('open', 'expanded');
      modal.style.display = 'none';
    });
    document.body.style.overflow = '';
  }

  /**
   * Focus the search input in any open collection browser modal (for debugging/command palette)
   * This is a static method that can be called globally
   */
  static focusSearchInOpenModal() {
    const openModal = document.querySelector('.collection-browser-modal-overlay.open');
    if (openModal) {
      const searchInput = openModal.querySelector('#collection-search');
      if (searchInput && searchInput.offsetParent !== null) {
        searchInput.focus();
        searchInput.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return true;
      } else {
        console.warn('⚠️ Search input found but not visible');
        // Try alternative approach
        const allSearchInputs = document.querySelectorAll('#collection-search');
        for (const input of allSearchInputs) {
          if (input.offsetParent !== null) {
            input.focus();
            input.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            return true;
          }
        }
      }
    }
    console.warn('⚠️ No open modal or search input found');
    return false;
  }
}
