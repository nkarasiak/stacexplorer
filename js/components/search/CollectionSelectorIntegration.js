/**
 * CollectionSelectorIntegration.js - Integration layer for the new modal-based collection browser
 * Replaces the old dropdown with a beautiful modal interface
 */

import { CollectionBrowserModal } from './CollectionBrowserModal.js';
import { CollectionBrowserTrigger } from './CollectionBrowserTrigger.js';

export class CollectionSelectorIntegration {
  /**
   * Create a new CollectionSelectorIntegration
   * @param {Object} collectionManager - Existing CollectionManagerEnhanced instance
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
    this.trigger = null;
    this.originalDropdown = null;
    this.inlineDropdownManager = null;

    this.init();
  }

  /**
   * Initialize the integration
   */
  init() {
    this.originalDropdown = document.getElementById('collection-select');

    // Get reference to inline dropdown manager if it exists
    this.inlineDropdownManager = window.stacExplorer?.inlineDropdownManager;

    this.initializeModal();
    this.setupEventListeners();
  }

  /**
   * Initialize the modal and trigger components
   */
  initializeModal() {
    try {
      // Create the modal
      this.modal = new CollectionBrowserModal(
        this.collectionManager,
        this.apiClient,
        this.notificationService,
        this.config
      );

      // Create the trigger button (this will replace the collection summary element)
      this.trigger = new CollectionBrowserTrigger(this.modal, this.inlineDropdownManager);

      // Hide the original dropdown elements
      this.hideOriginalElements();
    } catch (error) {
      console.error('❌ Error initializing modal components:', error);
      console.error('Error details:', error.stack);
      this.notificationService.showNotification('Error initializing collection browser', 'error');
    }
  }

  /**
   * Hide original dropdown elements that are being replaced
   */
  hideOriginalElements() {
    // Hide the original collection select dropdown
    if (this.originalDropdown) {
      this.originalDropdown.style.display = 'none';
    }

    // Hide the collection info button since the modal has its own details view
    const collectionInfoBtn = document.getElementById('collection-info-btn');
    if (collectionInfoBtn) {
      collectionInfoBtn.style.display = 'none';
    }

    // Hide the view toggle that was created by the old integration if it exists
    const oldToggle = document.querySelector('.collection-view-toggle-container');
    if (oldToggle) {
      oldToggle.style.display = 'none';
    }
  }

  /**
   * Add CSS styles for the view toggle (legacy method, keeping for compatibility)
   */
  addToggleStyles() {
    const style = document.createElement('style');
    style.textContent = `
            .collection-view-toggle-container {
                margin-bottom: 1rem;
                padding: 0.75rem;
                background: var(--background-secondary, #f8fafc);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 8px;
            }
            
            .collection-view-toggle-wrapper {
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .collection-view-label {
                font-weight: 500;
                color: var(--text-color, #374151);
                font-size: 0.9rem;
            }
            
            .view-toggle-buttons {
                display: flex;
                background: white;
                border: 1px solid var(--border-color, #d1d5db);
                border-radius: 6px;
                overflow: hidden;
            }
            
            .view-toggle-btn {
                padding: 8px 16px;
                background: none;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.85rem;
                color: var(--text-secondary, #6b7280);
                transition: all 0.2s ease;
                border-right: 1px solid var(--border-color, #d1d5db);
            }
            
            .view-toggle-btn:last-child {
                border-right: none;
            }
            
            .view-toggle-btn:hover {
                background: var(--background-secondary, #f9fafb);
                color: var(--text-color, #374151);
            }
            
            .view-toggle-btn.active {
                background: var(--primary-color, #667eea);
                color: white;
            }
            
            .view-toggle-btn .material-icons {
                font-size: 1.1rem;
            }
            
            @media (max-width: 768px) {
                .collection-view-toggle-wrapper {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.5rem;
                }
                
                .view-toggle-btn span {
                    display: none;
                }
                
                .view-toggle-btn {
                    padding: 8px 12px;
                }
            }
        `;
    document.head.appendChild(style);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for collections loaded from the collection manager
    document.addEventListener('collectionsChanged', event => {
      if (event.detail?.collections) {
        this.onCollectionsLoaded(event.detail.collections);
      }
    });

    // Listen for collection selection from modal
    document.addEventListener('modalCollectionSelected', event => {
      if (event.detail?.collection) {
        this.onModalCollectionSelected(event.detail.collection, event.detail.source);
      }
    });

    // Listen for collection cleared
    document.addEventListener('collectionCleared', () => {
      this.onCollectionCleared();
    });

    // Listen for external collection selection (e.g., from AI search or URL params)
    document.addEventListener('externalCollectionSelected', event => {
      if (event.detail) {
        this.setSelectedCollection(event.detail.collectionId, event.detail.source);
      }
    });
  }

  /**
   * Handle collections loaded from collection manager
   * @param {Array} collections - Array of collection objects
   */
  onCollectionsLoaded(_collections) {
    // The modal will load collections when opened
  }

  /**
   * Handle collection selected from modal
   * @param {Object} collection - Selected collection
   * @param {string} source - Collection source
   */
  onModalCollectionSelected(collection, source) {
    // Update the collection manager's selection
    this.collectionManager.setSelectedCollection(collection.id, source);

    // Update the trigger button
    if (this.trigger) {
      this.trigger.setSelection(collection);
    }
  }

  /**
   * Handle collection cleared
   */
  onCollectionCleared() {
    // Clear the collection manager selection
    this.collectionManager.resetSelection();

    // Clear the trigger button
    if (this.trigger) {
      this.trigger.clearSelection();
    }
  }

  /**
   * Set selected collection (for external integrations)
   * @param {string} collectionId - Collection ID to select
   * @param {string} source - Source of the collection
   */
  setSelectedCollection(collectionId, source) {
    // Update collection manager
    this.collectionManager.setSelectedCollection(collectionId, source);

    // Update modal if it exists
    if (this.modal) {
      this.modal.setSelectedCollection(collectionId, source);
    }

    // Update trigger button
    if (this.trigger) {
      const collection = this.collectionManager.getCollectionById(collectionId, source);
      if (collection) {
        this.trigger.setSelection(collection);
      }
    }
  }

  /**
   * Get currently selected collection
   * @returns {string} Selected collection ID
   */
  getSelectedCollection() {
    return this.collectionManager.getSelectedCollection();
  }

  /**
   * Open the collection browser modal
   */
  async openModal() {
    if (this.modal) {
      await this.modal.open();
    }
  }

  /**
   * Close the collection browser modal
   */
  closeModal() {
    if (this.modal) {
      this.modal.close();
    }
  }

  /**
   * Refresh collections
   */
  async refresh() {
    try {
      await this.collectionManager.forceRefresh();
    } catch (error) {
      console.error('❌ Error refreshing collections:', error);
      this.notificationService.showNotification('Error refreshing collections', 'error');
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.collectionManager.clearCache();
    this.notificationService.showNotification('Collections cache cleared', 'info');
  }

  /**
   * Check if modal is open
   * @returns {boolean} True if modal is open
   */
  isModalOpen() {
    return this.modal ? this.modal.isModalOpen() : false;
  }

  // Duplicate methods removed - keeping the newer modal-based versions above

  /**
   * Load collections from all sources
   */
  async loadAllCollections() {
    try {
      await this.collectionManager.loadAllCollectionsOnStartup();
    } catch (error) {
      console.error('❌ Error loading collections:', error);
      this.notificationService.showNotification('Error loading collections', 'error');
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  applySavedViewPreference() {
    // No longer needed with modal approach
  }

  /**
   * Destroy the integration
   */
  destroy() {
    if (this.modal && typeof this.modal.destroy === 'function') {
      this.modal.destroy();
    }

    if (this.trigger && typeof this.trigger.destroy === 'function') {
      this.trigger.destroy();
    }

    this.modal = null;
    this.trigger = null;
    this.originalDropdown = null;
    this.inlineDropdownManager = null;
  }
}
