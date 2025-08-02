/**
 * VirtualizedList Component - High-performance virtual scrolling for large datasets
 * Renders only visible items for smooth performance with thousands of items
 *
 * @author STAC Explorer Team
 * @version 1.0.0
 */

import { BaseUIComponent } from '../base/BaseUIComponent.js';

export class VirtualizedList extends BaseUIComponent {
  /**
   * Create a new VirtualizedList component
   * @param {HTMLElement|string} container - Container element or selector
   * @param {Object} options - Virtualized list configuration options
   */
  constructor(container, options = {}) {
    super(container, options);

    // Virtual scrolling properties
    this.items = [];
    this.visibleItems = [];
    this.renderedItems = new Map();

    // Measurements
    this.itemHeight = 0;
    this.containerHeight = 0;
    this.scrollTop = 0;
    this.totalHeight = 0;

    // Virtual window
    this.startIndex = 0;
    this.endIndex = 0;
    this.visibleCount = 0;
    this.buffer = this.options.buffer;

    // Performance optimization
    this.isScrolling = false;
    this.scrollTimeout = null;
    this.resizeObserver = null;
    this.intersectionObserver = null;

    // Cached elements
    this.scrollContainer = null;
    this.viewport = null;
    this.spacer = null;

    // Event handlers
    this.boundHandleScroll = this.handleScroll.bind(this);
    this.boundHandleResize = this.handleResize.bind(this);
  }

  /**
   * Get default options
   * @returns {Object} Default options
   */
  getDefaultOptions() {
    return {
      ...super.getDefaultOptions(),
      className: 'virtualized-list',

      // Virtual scrolling
      itemHeight: 60,
      estimatedItemHeight: 60,
      dynamicHeight: false,
      buffer: 5,

      // Rendering
      renderItem: null,
      keyExtractor: (item, index) => item.id || index,
      threshold: 100,

      // Performance
      debounceMs: 16, // ~60fps
      reuseItems: true,
      lazyLoad: false,

      // Accessibility
      role: 'list',
      ariaLabel: 'Virtual list',
      announceItems: false,

      // Callbacks
      onScroll: null,
      onItemsRendered: null,
      onLoadMore: null,

      // Styling
      scrollbarWidth: 17,
      direction: 'vertical', // vertical, horizontal
    };
  }

  /**
   * Get initial state
   * @returns {Object} Initial state
   */
  getInitialState() {
    return {
      ...super.getInitialState(),
      isScrolling: false,
      scrollTop: 0,
      scrollLeft: 0,
      itemCount: 0,
      renderedCount: 0,
    };
  }

  /**
   * Component-specific initialization
   */
  onInit() {
    this.setupVirtualScrolling();
    this.setupAccessibility();
    this.measureContainer();

    if (this.options.items) {
      this.setItems(this.options.items);
    }
  }

  /**
   * Set up virtual scrolling structure
   */
  setupVirtualScrolling() {
    // Create scroll container
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.className = 'virtualized-list__scroll-container';
    this.scrollContainer.style.cssText = `
            height: 100%;
            overflow: auto;
            position: relative;
        `;

    // Create viewport for rendered items
    this.viewport = document.createElement('div');
    this.viewport.className = 'virtualized-list__viewport';
    this.viewport.style.cssText = `
            position: relative;
            will-change: transform;
        `;

    // Create spacer to maintain scroll height
    this.spacer = document.createElement('div');
    this.spacer.className = 'virtualized-list__spacer';
    this.spacer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            pointer-events: none;
        `;

    // Assemble structure
    this.scrollContainer.appendChild(this.spacer);
    this.scrollContainer.appendChild(this.viewport);
    this.container.appendChild(this.scrollContainer);

    this.log('Virtual scrolling structure created');
  }

  /**
   * Set up accessibility attributes
   */
  setupAccessibility() {
    this.container.setAttribute('role', this.options.role);

    if (this.options.ariaLabel) {
      this.container.setAttribute('aria-label', this.options.ariaLabel);
    }

    this.scrollContainer.setAttribute('tabindex', '0');
    this.scrollContainer.setAttribute('aria-live', 'polite');
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Scroll event with debouncing
    this.addEventListener(this.scrollContainer, 'scroll', this.boundHandleScroll, {
      passive: true,
    });

    // Resize observer for container size changes
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(this.boundHandleResize);
      this.resizeObserver.observe(this.container);
      this.addObserver(this.resizeObserver);
    }

    // Intersection observer for lazy loading
    if (this.options.lazyLoad && 'IntersectionObserver' in window) {
      this.setupIntersectionObserver();
    }

    // Keyboard navigation
    this.addEventListener(this.scrollContainer, 'keydown', this.handleKeyDown);
  }

  /**
   * Set up intersection observer for lazy loading
   */
  setupIntersectionObserver() {
    this.intersectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && this.options.onLoadMore) {
            this.options.onLoadMore();
          }
        });
      },
      { rootMargin: '100px' }
    );

    this.addObserver(this.intersectionObserver);
  }

  /**
   * Measure container dimensions
   */
  measureContainer() {
    const rect = this.container.getBoundingClientRect();
    this.containerHeight = rect.height;

    if (this.options.dynamicHeight) {
      this.itemHeight = this.options.estimatedItemHeight;
    } else {
      this.itemHeight = this.options.itemHeight;
    }

    this.visibleCount = Math.ceil(this.containerHeight / this.itemHeight) + 2 * this.buffer;

    this.log('Container measured:', {
      height: this.containerHeight,
      itemHeight: this.itemHeight,
      visibleCount: this.visibleCount,
    });
  }

  /**
   * Set items to render
   * @param {Array} items - Array of items to virtualize
   */
  setItems(items) {
    this.items = items || [];
    this.totalHeight = this.items.length * this.itemHeight;

    // Update spacer height
    this.spacer.style.height = `${this.totalHeight}px`;

    // Update state
    this.setState({ itemCount: this.items.length });

    // Calculate and render initial items
    this.calculateVisibleRange();
    this.renderItems();

    // Announce to screen readers
    if (this.options.announceItems) {
      this.announceItemCount();
    }

    this.emit('itemsSet', { itemCount: this.items.length });

    this.log('Items set:', this.items.length);
  }

  /**
   * Add items to the list
   * @param {Array} newItems - Items to add
   * @param {boolean} prepend - Whether to prepend instead of append
   */
  addItems(newItems, prepend = false) {
    if (!Array.isArray(newItems) || newItems.length === 0) {
      return;
    }

    if (prepend) {
      this.items = [...newItems, ...this.items];
      // Adjust scroll position to maintain visual position
      const addedHeight = newItems.length * this.itemHeight;
      this.scrollContainer.scrollTop += addedHeight;
    } else {
      this.items = [...this.items, ...newItems];
    }

    this.totalHeight = this.items.length * this.itemHeight;
    this.spacer.style.height = `${this.totalHeight}px`;

    this.setState({ itemCount: this.items.length });
    this.calculateVisibleRange();
    this.renderItems();

    this.emit('itemsAdded', {
      count: newItems.length,
      total: this.items.length,
      prepend,
    });
  }

  /**
   * Remove item by index
   * @param {number} index - Index to remove
   */
  removeItem(index) {
    if (index < 0 || index >= this.items.length) {
      return;
    }

    this.items.splice(index, 1);
    this.totalHeight = this.items.length * this.itemHeight;
    this.spacer.style.height = `${this.totalHeight}px`;

    this.setState({ itemCount: this.items.length });
    this.calculateVisibleRange();
    this.renderItems();

    this.emit('itemRemoved', { index, total: this.items.length });
  }

  /**
   * Update item at index
   * @param {number} index - Index to update
   * @param {*} newItem - New item data
   */
  updateItem(index, newItem) {
    if (index < 0 || index >= this.items.length) {
      return;
    }

    this.items[index] = newItem;

    // Re-render if item is currently visible
    if (index >= this.startIndex && index <= this.endIndex) {
      this.renderItems();
    }

    this.emit('itemUpdated', { index, item: newItem });
  }

  /**
   * Calculate visible range based on scroll position
   */
  calculateVisibleRange() {
    const scrollTop = this.scrollContainer.scrollTop;
    const containerHeight = this.containerHeight;

    // Calculate start and end indices with buffer
    this.startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.buffer);
    this.endIndex = Math.min(
      this.items.length - 1,
      Math.floor((scrollTop + containerHeight) / this.itemHeight) + this.buffer
    );

    // Update state
    this.setState({
      scrollTop,
      renderedCount: this.endIndex - this.startIndex + 1,
    });

    this.log('Visible range calculated:', {
      startIndex: this.startIndex,
      endIndex: this.endIndex,
      scrollTop,
      renderedCount: this.state.renderedCount,
    });
  }

  /**
   * Render visible items
   */
  renderItems() {
    if (!this.options.renderItem) {
      console.warn('VirtualizedList: renderItem function not provided');
      return;
    }

    // Clear viewport
    this.viewport.innerHTML = '';
    this.renderedItems.clear();

    // Calculate offset for viewport positioning
    const offsetY = this.startIndex * this.itemHeight;
    this.viewport.style.transform = `translateY(${offsetY}px)`;

    // Render visible items
    const fragment = document.createDocumentFragment();

    for (let i = this.startIndex; i <= this.endIndex; i++) {
      if (i < 0 || i >= this.items.length) {
        continue;
      }

      const item = this.items[i];
      const itemElement = this.renderItem(item, i);

      if (itemElement) {
        fragment.appendChild(itemElement);
        this.renderedItems.set(i, itemElement);
      }
    }

    this.viewport.appendChild(fragment);

    // Callback for items rendered
    if (this.options.onItemsRendered) {
      this.options.onItemsRendered({
        startIndex: this.startIndex,
        endIndex: this.endIndex,
        totalCount: this.items.length,
      });
    }

    this.emit('itemsRendered', {
      startIndex: this.startIndex,
      endIndex: this.endIndex,
      renderedCount: this.state.renderedCount,
    });
  }

  /**
   * Render individual item
   * @param {*} item - Item data
   * @param {number} index - Item index
   * @returns {HTMLElement} Rendered item element
   */
  renderItem(item, index) {
    const itemElement = document.createElement('div');
    itemElement.className = 'virtualized-list__item';
    itemElement.style.cssText = `
            height: ${this.itemHeight}px;
            overflow: hidden;
        `;

    // Set accessibility attributes
    itemElement.setAttribute('role', 'listitem');
    itemElement.setAttribute('aria-posinset', index + 1);
    itemElement.setAttribute('aria-setsize', this.items.length);

    // Get key for the item
    const key = this.options.keyExtractor(item, index);
    itemElement.dataset.key = key;
    itemElement.dataset.index = index;

    // Render item content using provided render function
    try {
      const content = this.options.renderItem(item, index);

      if (typeof content === 'string') {
        itemElement.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        itemElement.appendChild(content);
      } else {
        console.warn('VirtualizedList: renderItem must return string or HTMLElement');
      }
    } catch (error) {
      console.error('VirtualizedList: Error rendering item:', error);
      itemElement.innerHTML = `<div class="error">Error rendering item ${index}</div>`;
    }

    return itemElement;
  }

  /**
   * Handle scroll events
   * @param {Event} event - Scroll event
   */
  handleScroll(_event) {
    // Debounce scroll handling for performance
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    if (!this.isScrolling) {
      this.isScrolling = true;
      this.setState({ isScrolling: true });
      this.container.classList.add('virtualized-list--scrolling');
    }

    // Calculate new visible range
    this.calculateVisibleRange();
    this.renderItems();

    // Custom scroll callback
    if (this.options.onScroll) {
      this.options.onScroll({
        scrollTop: this.scrollContainer.scrollTop,
        scrollLeft: this.scrollContainer.scrollLeft,
        startIndex: this.startIndex,
        endIndex: this.endIndex,
      });
    }

    // Reset scrolling state after delay
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
      this.setState({ isScrolling: false });
      this.container.classList.remove('virtualized-list--scrolling');
    }, 150);
  }

  /**
   * Handle resize events
   */
  handleResize() {
    this.measureContainer();
    this.calculateVisibleRange();
    this.renderItems();

    this.emit('resize', {
      containerHeight: this.containerHeight,
      visibleCount: this.visibleCount,
    });
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyDown(event) {
    const { key } = event;

    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        this.scrollToIndex(this.getCurrentFocusIndex() + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.scrollToIndex(this.getCurrentFocusIndex() - 1);
        break;
      case 'Home':
        event.preventDefault();
        this.scrollToIndex(0);
        break;
      case 'End':
        event.preventDefault();
        this.scrollToIndex(this.items.length - 1);
        break;
      case 'PageDown':
        event.preventDefault();
        this.scrollToIndex(this.getCurrentFocusIndex() + this.visibleCount);
        break;
      case 'PageUp':
        event.preventDefault();
        this.scrollToIndex(this.getCurrentFocusIndex() - this.visibleCount);
        break;
    }
  }

  /**
   * Get currently focused item index
   * @returns {number} Focused item index
   */
  getCurrentFocusIndex() {
    const focusedElement = document.activeElement;
    if (focusedElement?.dataset.index) {
      return parseInt(focusedElement.dataset.index, 10);
    }
    return this.startIndex;
  }

  /**
   * Scroll to specific index
   * @param {number} index - Index to scroll to
   * @param {string} align - Alignment: 'start', 'center', 'end', 'auto'
   */
  scrollToIndex(index, align = 'auto') {
    if (index < 0 || index >= this.items.length) {
      return;
    }

    let scrollTop;

    switch (align) {
      case 'start':
        scrollTop = index * this.itemHeight;
        break;
      case 'center':
        scrollTop = index * this.itemHeight - this.containerHeight / 2 + this.itemHeight / 2;
        break;
      case 'end':
        scrollTop = index * this.itemHeight - this.containerHeight + this.itemHeight;
        break;
      default: {
        const currentScrollTop = this.scrollContainer.scrollTop;
        const itemTop = index * this.itemHeight;
        const itemBottom = itemTop + this.itemHeight;
        const visibleTop = currentScrollTop;
        const visibleBottom = currentScrollTop + this.containerHeight;

        if (itemTop < visibleTop) {
          scrollTop = itemTop;
        } else if (itemBottom > visibleBottom) {
          scrollTop = itemBottom - this.containerHeight;
        } else {
          return; // Item is already visible
        }
        break;
      }
    }

    // Clamp scroll position
    scrollTop = Math.max(0, Math.min(scrollTop, this.totalHeight - this.containerHeight));

    this.scrollContainer.scrollTop = scrollTop;

    this.emit('scrollToIndex', { index, align, scrollTop });
  }

  /**
   * Scroll to specific item by key
   * @param {*} key - Item key
   * @param {string} align - Alignment
   */
  scrollToKey(key, align = 'auto') {
    const index = this.items.findIndex((item, i) => this.options.keyExtractor(item, i) === key);

    if (index !== -1) {
      this.scrollToIndex(index, align);
    }
  }

  /**
   * Get item at index
   * @param {number} index - Item index
   * @returns {*} Item data
   */
  getItem(index) {
    return this.items[index];
  }

  /**
   * Get rendered item element by index
   * @param {number} index - Item index
   * @returns {HTMLElement|null} Item element
   */
  getItemElement(index) {
    return this.renderedItems.get(index) || null;
  }

  /**
   * Refresh the list (re-render all items)
   */
  refresh() {
    this.calculateVisibleRange();
    this.renderItems();
    this.emit('refresh');
  }

  /**
   * Clear all items
   */
  clear() {
    this.items = [];
    this.totalHeight = 0;
    this.spacer.style.height = '0px';
    this.viewport.innerHTML = '';
    this.renderedItems.clear();

    this.setState({
      itemCount: 0,
      renderedCount: 0,
      scrollTop: 0,
    });

    this.emit('cleared');
  }

  /**
   * Announce item count to screen readers
   */
  announceItemCount() {
    const message = `List contains ${this.items.length} items`;

    // Create or update announcement element
    let announcer = this.container.querySelector('.sr-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.className = 'sr-announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.cssText = `
                position: absolute;
                left: -10000px;
                width: 1px;
                height: 1px;
                overflow: hidden;
            `;
      this.container.appendChild(announcer);
    }

    announcer.textContent = message;
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      totalItems: this.items.length,
      renderedItems: this.state.renderedCount,
      visibleRange: `${this.startIndex}-${this.endIndex}`,
      scrollTop: this.scrollContainer.scrollTop,
      containerHeight: this.containerHeight,
      totalHeight: this.totalHeight,
      itemHeight: this.itemHeight,
      isScrolling: this.isScrolling,
      renderingRatio:
        this.items.length > 0
          ? `${((this.state.renderedCount / this.items.length) * 100).toFixed(1)}%`
          : '0%',
    };
  }

  /**
   * Component cleanup
   */
  onDestroy() {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    this.renderedItems.clear();
    this.items = [];
  }
}

/**
 * VirtualizedList Factory - Create lists with common configurations
 */
export class VirtualizedListFactory {
  /**
   * Create a STAC items list
   * @param {HTMLElement|string} container - Container element
   * @param {Object} options - List options
   * @returns {VirtualizedList} VirtualizedList instance
   */
  static createSTACItemsList(container, options = {}) {
    return new VirtualizedList(container, {
      itemHeight: 120,
      buffer: 3,
      ariaLabel: 'STAC items list',
      announceItems: true,
      renderItem: (item, _index) => `
                <div class="stac-item" data-id="${item.id}">
                    <div class="stac-item__thumbnail">
                        ${
                          item.assets?.thumbnail
                            ? `<img src="${item.assets.thumbnail.href}" alt="${item.id}" loading="lazy">`
                            : '<div class="stac-item__placeholder"></div>'
                        }
                    </div>
                    <div class="stac-item__content">
                        <h3 class="stac-item__title">${item.id}</h3>
                        <p class="stac-item__description">${item.properties?.description || 'No description'}</p>
                        <div class="stac-item__meta">
                            <span class="stac-item__date">${item.properties?.datetime || 'Unknown date'}</span>
                            <span class="stac-item__collection">${item.collection || 'Unknown collection'}</span>
                        </div>
                    </div>
                </div>
            `,
      ...options,
    });
  }

  /**
   * Create a collections list
   * @param {HTMLElement|string} container - Container element
   * @param {Object} options - List options
   * @returns {VirtualizedList} VirtualizedList instance
   */
  static createCollectionsList(container, options = {}) {
    return new VirtualizedList(container, {
      itemHeight: 80,
      buffer: 5,
      ariaLabel: 'Collections list',
      renderItem: (collection, _index) => `
                <div class="collection-item" data-id="${collection.id}">
                    <div class="collection-item__content">
                        <h3 class="collection-item__title">${collection.title || collection.id}</h3>
                        <p class="collection-item__description">${collection.description || 'No description'}</p>
                        <div class="collection-item__meta">
                            <span class="collection-item__provider">${collection.providers?.[0]?.name || 'Unknown provider'}</span>
                            <span class="collection-item__license">${collection.license || 'Unknown license'}</span>
                        </div>
                    </div>
                </div>
            `,
      ...options,
    });
  }
}

export default VirtualizedList;
