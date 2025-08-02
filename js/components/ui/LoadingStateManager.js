/**
 * LoadingStateManager - Professional loading states with skeleton screens
 * Provides consistent loading experiences across the application
 *
 * @author STAC Explorer Team
 * @version 1.0.0
 */

import { BaseUIComponent } from '../base/BaseUIComponent.js';

export class LoadingStateManager extends BaseUIComponent {
  /**
   * Create a new LoadingStateManager
   * @param {HTMLElement|string} container - Container element or selector
   * @param {Object} options - Loading manager configuration options
   */
  constructor(container, options = {}) {
    super(container, options);

    this.loadingStates = new Map();
    this.progressTrackers = new Map();
    this.skeletonCache = new Map();

    // Global loading overlay
    this.globalOverlay = null;
    this.createGlobalOverlay();
  }

  /**
   * Get default options
   * @returns {Object} Default options
   */
  getDefaultOptions() {
    return {
      ...super.getDefaultOptions(),
      className: 'loading-manager',

      // Default loading type
      defaultType: 'skeleton',

      // Timing
      minDisplayTime: 300,
      fadeInDuration: 200,
      fadeOutDuration: 300,

      // Skeleton configuration
      skeletonAnimation: 'wave',
      skeletonColor: 'rgba(255, 255, 255, 0.1)',
      skeletonHighlightColor: 'rgba(255, 255, 255, 0.2)',

      // Progress configuration
      progressColor: '#2196F3',
      progressHeight: 4,

      // Messages
      defaultMessage: 'Loading...',
      defaultProgressMessage: 'Loading data...',

      // Accessibility
      announceLoading: true,
      focusManagement: true,
    };
  }

  /**
   * Get initial state
   * @returns {Object} Initial state
   */
  getInitialState() {
    return {
      ...super.getInitialState(),
      activeLoadingStates: 0,
      globalLoading: false,
    };
  }

  /**
   * Component-specific initialization
   */
  onInit() {
    this.setupAccessibility();
  }

  /**
   * Set up accessibility attributes
   */
  setupAccessibility() {
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-atomic', 'false');
  }

  /**
   * Create global loading overlay
   */
  createGlobalOverlay() {
    this.globalOverlay = document.createElement('div');
    this.globalOverlay.className = 'loading-global-overlay';
    this.globalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 999998;
            display: none;
            align-items: center;
            justify-content: center;
            pointer-events: none;
        `;

    document.body.appendChild(this.globalOverlay);
  }

  /**
   * Show loading state
   * @param {string} key - Unique key for this loading state
   * @param {Object} options - Loading configuration
   * @returns {Promise} Promise that resolves when loading is shown
   */
  async showLoading(key, options = {}) {
    const config = {
      type: this.options.defaultType,
      message: this.options.defaultMessage,
      container: this.container,
      overlay: false,
      global: false,
      cancellable: false,
      progress: false,
      skeletonTemplate: null,
      ...options,
    };

    // Check if already loading
    if (this.loadingStates.has(key)) {
      console.warn(`Loading state '${key}' already active`);
      return;
    }

    this.log(`Showing loading state: ${key}`, config);

    // Create loading state
    const loadingState = {
      key,
      config,
      startTime: Date.now(),
      element: null,
      container: config.container,
      isVisible: false,
    };

    // Create loading element based on type
    switch (config.type) {
      case 'skeleton':
        loadingState.element = this.createSkeletonLoader(config);
        break;
      case 'spinner':
        loadingState.element = this.createSpinnerLoader(config);
        break;
      case 'progress':
        loadingState.element = this.createProgressLoader(config);
        break;
      case 'dots':
        loadingState.element = this.createDotsLoader(config);
        break;
      case 'pulse':
        loadingState.element = this.createPulseLoader(config);
        break;
      default:
        loadingState.element = this.createSpinnerLoader(config);
    }

    // Store loading state
    this.loadingStates.set(key, loadingState);

    // Show loading element
    await this.showLoadingElement(loadingState);

    // Handle global loading
    if (config.global) {
      this.showGlobalLoading(loadingState);
    }

    // Update state
    this.setState({
      activeLoadingStates: this.loadingStates.size,
      globalLoading: config.global || this.state.globalLoading,
    });

    // Announce to screen readers
    if (this.options.announceLoading && config.message) {
      this.announceToScreenReader(config.message);
    }

    // Emit event
    this.emit('loadingShown', { key, config });

    return loadingState;
  }

  /**
   * Hide loading state
   * @param {string} key - Loading state key
   * @returns {Promise} Promise that resolves when loading is hidden
   */
  async hideLoading(key) {
    const loadingState = this.loadingStates.get(key);

    if (!loadingState) {
      console.warn(`Loading state '${key}' not found`);
      return;
    }

    this.log(`Hiding loading state: ${key}`);

    // Ensure minimum display time
    const elapsedTime = Date.now() - loadingState.startTime;
    const remainingTime = Math.max(0, this.options.minDisplayTime - elapsedTime);

    if (remainingTime > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingTime));
    }

    // Hide loading element
    await this.hideLoadingElement(loadingState);

    // Handle global loading
    if (loadingState.config.global) {
      this.hideGlobalLoading();
    }

    // Clean up
    this.loadingStates.delete(key);

    // Update state
    this.setState({
      activeLoadingStates: this.loadingStates.size,
      globalLoading: this.hasGlobalLoading(),
    });

    // Emit event
    this.emit('loadingHidden', { key });
  }

  /**
   * Update progress for progress-type loading
   * @param {string} key - Loading state key
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} message - Optional progress message
   */
  updateProgress(key, progress, message = null) {
    const loadingState = this.loadingStates.get(key);

    if (!loadingState || loadingState.config.type !== 'progress') {
      return;
    }

    const progressBar = loadingState.element.querySelector('.loading-progress__fill');
    const progressText = loadingState.element.querySelector('.loading-progress__text');
    const progressMessage = loadingState.element.querySelector('.loading-progress__message');

    if (progressBar) {
      progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
      progressBar.setAttribute('aria-valuenow', progress);
    }

    if (progressText) {
      progressText.textContent = `${Math.round(progress)}%`;
    }

    if (progressMessage && message) {
      progressMessage.textContent = message;
    }

    // Store progress value
    if (!this.progressTrackers.has(key)) {
      this.progressTrackers.set(key, {});
    }
    this.progressTrackers.get(key).progress = progress;

    this.emit('progressUpdated', { key, progress, message });
  }

  /**
   * Create skeleton loader
   * @param {Object} config - Configuration options
   * @returns {HTMLElement} Skeleton loader element
   */
  createSkeletonLoader(config) {
    // Check cache first
    const cacheKey = JSON.stringify(config.skeletonTemplate);
    if (this.skeletonCache.has(cacheKey)) {
      return this.skeletonCache.get(cacheKey).cloneNode(true);
    }

    const container = document.createElement('div');
    container.className = 'loading-skeleton';
    container.setAttribute('aria-label', config.message);
    container.setAttribute('role', 'status');

    if (config.skeletonTemplate) {
      // Use custom template
      container.innerHTML = this.processSkeletonTemplate(config.skeletonTemplate);
    } else {
      // Use default template based on context
      container.innerHTML = this.getDefaultSkeletonTemplate(config);
    }

    // Cache the template
    this.skeletonCache.set(cacheKey, container.cloneNode(true));

    return container;
  }

  /**
   * Process skeleton template
   * @param {string} template - Template string
   * @returns {string} Processed template
   */
  processSkeletonTemplate(template) {
    return template
      .replace(/{{skeleton-line}}/g, '<div class="skeleton-line"></div>')
      .replace(/{{skeleton-line-sm}}/g, '<div class="skeleton-line skeleton-line--sm"></div>')
      .replace(/{{skeleton-line-lg}}/g, '<div class="skeleton-line skeleton-line--lg"></div>')
      .replace(/{{skeleton-circle}}/g, '<div class="skeleton-circle"></div>')
      .replace(/{{skeleton-rect}}/g, '<div class="skeleton-rect"></div>')
      .replace(/{{skeleton-image}}/g, '<div class="skeleton-image"></div>')
      .replace(/{{skeleton-text}}/g, '<div class="skeleton-text"></div>');
  }

  /**
   * Get default skeleton template
   * @param {Object} config - Configuration options
   * @returns {string} Default template
   */
  getDefaultSkeletonTemplate(config) {
    // Detect context from container classes or data attributes
    const container = config.container;

    if (container?.classList.contains('dataset-list') || container?.dataset.type === 'stac-items') {
      return this.getSTACItemsSkeletonTemplate();
    }

    if (
      container?.classList.contains('collection-list') ||
      container?.dataset.type === 'collections'
    ) {
      return this.getCollectionsSkeletonTemplate();
    }

    if (container?.classList.contains('search-results')) {
      return this.getSearchResultsSkeletonTemplate();
    }

    // Generic template
    return this.getGenericSkeletonTemplate();
  }

  /**
   * Get STAC items skeleton template
   * @returns {string} Template HTML
   */
  getSTACItemsSkeletonTemplate() {
    return Array(3)
      .fill()
      .map(
        () => `
            <div class="skeleton-item stac-item-skeleton">
                <div class="skeleton-image"></div>
                <div class="skeleton-content">
                    <div class="skeleton-line skeleton-line--lg"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line skeleton-line--sm"></div>
                    <div class="skeleton-meta">
                        <div class="skeleton-rect skeleton-rect--sm"></div>
                        <div class="skeleton-rect skeleton-rect--sm"></div>
                    </div>
                </div>
            </div>
        `
      )
      .join('');
  }

  /**
   * Get collections skeleton template
   * @returns {string} Template HTML
   */
  getCollectionsSkeletonTemplate() {
    return Array(4)
      .fill()
      .map(
        () => `
            <div class="skeleton-item collection-skeleton">
                <div class="skeleton-content">
                    <div class="skeleton-line skeleton-line--lg"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-meta">
                        <div class="skeleton-rect skeleton-rect--sm"></div>
                        <div class="skeleton-rect skeleton-rect--sm"></div>
                    </div>
                </div>
            </div>
        `
      )
      .join('');
  }

  /**
   * Get search results skeleton template
   * @returns {string} Template HTML
   */
  getSearchResultsSkeletonTemplate() {
    return `
            <div class="skeleton-header">
                <div class="skeleton-line skeleton-line--lg"></div>
                <div class="skeleton-rect"></div>
            </div>
            ${Array(5)
              .fill()
              .map(
                () => `
                <div class="skeleton-item result-skeleton">
                    <div class="skeleton-circle"></div>
                    <div class="skeleton-content">
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line skeleton-line--sm"></div>
                    </div>
                </div>
            `
              )
              .join('')}
        `;
  }

  /**
   * Get generic skeleton template
   * @returns {string} Template HTML
   */
  getGenericSkeletonTemplate() {
    return Array(3)
      .fill()
      .map(
        () => `
            <div class="skeleton-item">
                <div class="skeleton-line skeleton-line--lg"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line skeleton-line--sm"></div>
            </div>
        `
      )
      .join('');
  }

  /**
   * Create spinner loader
   * @param {Object} config - Configuration options
   * @returns {HTMLElement} Spinner loader element
   */
  createSpinnerLoader(config) {
    const container = document.createElement('div');
    container.className = 'loading-spinner';
    container.setAttribute('aria-label', config.message);
    container.setAttribute('role', 'status');

    container.innerHTML = `
            <div class="loading-spinner__icon">
                <div class="loading-spinner__circle"></div>
            </div>
            ${config.message ? `<div class="loading-spinner__message">${config.message}</div>` : ''}
        `;

    return container;
  }

  /**
   * Create progress loader
   * @param {Object} config - Configuration options
   * @returns {HTMLElement} Progress loader element
   */
  createProgressLoader(config) {
    const container = document.createElement('div');
    container.className = 'loading-progress';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');

    container.innerHTML = `
            <div class="loading-progress__bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                <div class="loading-progress__fill"></div>
            </div>
            <div class="loading-progress__info">
                <div class="loading-progress__text">0%</div>
                ${config.message ? `<div class="loading-progress__message">${config.message}</div>` : ''}
            </div>
        `;

    return container;
  }

  /**
   * Create dots loader
   * @param {Object} config - Configuration options
   * @returns {HTMLElement} Dots loader element
   */
  createDotsLoader(config) {
    const container = document.createElement('div');
    container.className = 'loading-dots';
    container.setAttribute('aria-label', config.message);
    container.setAttribute('role', 'status');

    container.innerHTML = `
            <div class="loading-dots__container">
                <div class="loading-dots__dot"></div>
                <div class="loading-dots__dot"></div>
                <div class="loading-dots__dot"></div>
            </div>
            ${config.message ? `<div class="loading-dots__message">${config.message}</div>` : ''}
        `;

    return container;
  }

  /**
   * Create pulse loader
   * @param {Object} config - Configuration options
   * @returns {HTMLElement} Pulse loader element
   */
  createPulseLoader(config) {
    const container = document.createElement('div');
    container.className = 'loading-pulse';
    container.setAttribute('aria-label', config.message);
    container.setAttribute('role', 'status');

    container.innerHTML = `
            <div class="loading-pulse__icon">
                <div class="loading-pulse__circle"></div>
                <div class="loading-pulse__ring"></div>
            </div>
            ${config.message ? `<div class="loading-pulse__message">${config.message}</div>` : ''}
        `;

    return container;
  }

  /**
   * Show loading element
   * @param {Object} loadingState - Loading state object
   */
  showLoadingElement(loadingState) {
    const { element, container, config } = loadingState;

    // Add to container
    if (config.overlay) {
      this.createOverlay(container, element);
    } else {
      container.appendChild(element);
    }

    // Fade in animation
    element.style.opacity = '0';
    element.offsetHeight; // Force reflow
    element.style.transition = `opacity ${this.options.fadeInDuration}ms ease-out`;
    element.style.opacity = '1';

    loadingState.isVisible = true;

    return new Promise(resolve => {
      setTimeout(resolve, this.options.fadeInDuration);
    });
  }

  /**
   * Hide loading element
   * @param {Object} loadingState - Loading state object
   */
  hideLoadingElement(loadingState) {
    const { element } = loadingState;

    if (!element || !loadingState.isVisible) {
      return;
    }

    // Fade out animation
    element.style.transition = `opacity ${this.options.fadeOutDuration}ms ease-in`;
    element.style.opacity = '0';

    return new Promise(resolve => {
      setTimeout(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
        loadingState.isVisible = false;
        resolve();
      }, this.options.fadeOutDuration);
    });
  }

  /**
   * Create overlay for loading element
   * @param {HTMLElement} container - Container element
   * @param {HTMLElement} loadingElement - Loading element
   */
  createOverlay(container, loadingElement) {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

    overlay.appendChild(loadingElement);

    // Ensure container is positioned
    const containerStyle = window.getComputedStyle(container);
    if (containerStyle.position === 'static') {
      container.style.position = 'relative';
    }

    container.appendChild(overlay);
  }

  /**
   * Show global loading
   * @param {Object} loadingState - Loading state object
   */
  showGlobalLoading(loadingState) {
    this.globalOverlay.innerHTML = '';
    this.globalOverlay.appendChild(loadingState.element);
    this.globalOverlay.style.display = 'flex';
    this.globalOverlay.style.pointerEvents = 'auto';

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  /**
   * Hide global loading
   */
  hideGlobalLoading() {
    this.globalOverlay.style.display = 'none';
    this.globalOverlay.style.pointerEvents = 'none';

    // Restore body scroll
    document.body.style.overflow = '';
  }

  /**
   * Check if any global loading is active
   * @returns {boolean} Whether global loading is active
   */
  hasGlobalLoading() {
    for (const loadingState of this.loadingStates.values()) {
      if (loadingState.config.global) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if loading state is active
   * @param {string} key - Loading state key
   * @returns {boolean} Whether loading state is active
   */
  isLoading(key) {
    return this.loadingStates.has(key);
  }

  /**
   * Get all active loading states
   * @returns {Array} Array of active loading state keys
   */
  getActiveLoadingStates() {
    return Array.from(this.loadingStates.keys());
  }

  /**
   * Hide all loading states
   */
  async hideAllLoading() {
    const promises = Array.from(this.loadingStates.keys()).map(key => this.hideLoading(key));

    await Promise.all(promises);

    this.emit('allLoadingHidden');
  }

  /**
   * Announce to screen reader
   * @param {string} message - Message to announce
   */
  announceToScreenReader(message) {
    // Update aria-live region
    this.container.textContent = message;

    // Clear after short delay to allow for new announcements
    setTimeout(() => {
      if (this.container.textContent === message) {
        this.container.textContent = '';
      }
    }, 1000);
  }

  /**
   * Get loading metrics
   * @returns {Object} Loading metrics
   */
  getMetrics() {
    return {
      activeStates: this.loadingStates.size,
      globalLoading: this.state.globalLoading,
      activeKeys: this.getActiveLoadingStates(),
      cacheSize: this.skeletonCache.size,
      progressTrackers: this.progressTrackers.size,
    };
  }

  /**
   * Component cleanup
   */
  onDestroy() {
    // Hide all loading states
    this.hideAllLoading();

    // Clean up global overlay
    if (this.globalOverlay?.parentNode) {
      this.globalOverlay.parentNode.removeChild(this.globalOverlay);
    }

    // Clear caches
    this.loadingStates.clear();
    this.progressTrackers.clear();
    this.skeletonCache.clear();

    // Restore body scroll
    document.body.style.overflow = '';
  }
}

/**
 * LoadingStateManager Factory - Create managers with common configurations
 */
export class LoadingManagerFactory {
  /**
   * Create global loading manager
   * @param {Object} options - Manager options
   * @returns {LoadingStateManager} LoadingStateManager instance
   */
  static createGlobal(options = {}) {
    return new LoadingStateManager(document.body, {
      defaultType: 'spinner',
      announceLoading: true,
      ...options,
    });
  }

  /**
   * Create skeleton loading manager
   * @param {HTMLElement|string} container - Container element
   * @param {Object} options - Manager options
   * @returns {LoadingStateManager} LoadingStateManager instance
   */
  static createSkeleton(container, options = {}) {
    return new LoadingStateManager(container, {
      defaultType: 'skeleton',
      skeletonAnimation: 'wave',
      minDisplayTime: 500,
      ...options,
    });
  }

  /**
   * Create progress loading manager
   * @param {HTMLElement|string} container - Container element
   * @param {Object} options - Manager options
   * @returns {LoadingStateManager} LoadingStateManager instance
   */
  static createProgress(container, options = {}) {
    return new LoadingStateManager(container, {
      defaultType: 'progress',
      announceLoading: true,
      ...options,
    });
  }
}

// Global loading manager instance
export const globalLoadingManager = LoadingManagerFactory.createGlobal();

export default LoadingStateManager;
