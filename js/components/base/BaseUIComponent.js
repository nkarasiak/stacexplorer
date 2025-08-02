/**
 * Base UI Component - Foundation class for all UI components
 * Provides consistent lifecycle management, state handling, and event cleanup
 *
 * @author STAC Explorer Team
 * @version 1.0.0
 */

export class BaseUIComponent {
  /**
   * Create a new BaseUIComponent
   * @param {HTMLElement|string} container - Container element or selector
   * @param {Object} options - Component configuration options
   */
  constructor(container, options = {}) {
    // Handle container as string selector or element
    this.container = typeof container === 'string' ? document.querySelector(container) : container;

    if (!this.container) {
      throw new Error(`BaseUIComponent: Container not found: ${container}`);
    }

    // Merge options with defaults
    this.options = { ...this.getDefaultOptions(), ...options };

    // Component state management
    this.state = this.getInitialState();
    this.previousState = {};

    // Event management for cleanup
    this.eventListeners = new Map();
    this.observers = new Set();
    this.timers = new Set();

    // Component lifecycle flags
    this.isInitialized = false;
    this.isDestroyed = false;

    // Unique component ID for debugging
    this.componentId = this.generateComponentId();

    // Accessibility support
    this.focusableElements = [];
    this.restoreFocusElement = null;

    // Initialize component
    this.init();
  }

  /**
   * Get default options - Override in subclasses
   * @returns {Object} Default options
   */
  getDefaultOptions() {
    return {
      className: 'ui-component',
      ariaLabel: null,
      role: null,
      focusable: true,
      debug: false,
    };
  }

  /**
   * Get initial state - Override in subclasses
   * @returns {Object} Initial state
   */
  getInitialState() {
    return {
      isVisible: true,
      isDisabled: false,
      isLoading: false,
    };
  }

  /**
   * Generate unique component ID
   * @returns {string} Component ID
   */
  generateComponentId() {
    const className = this.constructor.name;
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${className.toLowerCase()}-${timestamp}-${random}`;
  }

  /**
   * Initialize component - Called once during construction
   */
  init() {
    if (this.isInitialized) {
      return;
    }

    this.log('Initializing component');

    // Set up container
    this.setupContainer();

    // Set up accessibility
    this.setupAccessibility();

    // Initial render
    this.render();

    // Set up event listeners
    this.setupEventListeners();

    // Component-specific initialization
    this.onInit();

    this.isInitialized = true;
    this.log('Component initialized');

    // Emit initialized event
    this.emit('initialized');
  }

  /**
   * Set up container element
   */
  setupContainer() {
    // Add component class
    this.container.classList.add(this.options.className);

    // Add component ID for debugging
    if (this.options.debug) {
      this.container.setAttribute('data-component-id', this.componentId);
    }

    // Store reference to component instance
    this.container._componentInstance = this;
  }

  /**
   * Set up accessibility attributes
   */
  setupAccessibility() {
    if (this.options.ariaLabel) {
      this.container.setAttribute('aria-label', this.options.ariaLabel);
    }

    if (this.options.role) {
      this.container.setAttribute('role', this.options.role);
    }

    // Update focusable elements
    this.updateFocusableElements();
  }

  /**
   * Update focusable elements list
   */
  updateFocusableElements() {
    this.focusableElements = Array.from(
      this.container.querySelectorAll(
        'button:not([disabled]), ' +
          '[href]:not([disabled]), ' +
          'input:not([disabled]), ' +
          'select:not([disabled]), ' +
          'textarea:not([disabled]), ' +
          '[tabindex]:not([tabindex="-1"]):not([disabled]), ' +
          '[contenteditable="true"]:not([disabled])'
      )
    );
  }

  /**
   * Component-specific initialization - Override in subclasses
   */
  onInit() {
    // Override in subclasses
  }

  /**
   * Set up event listeners - Override in subclasses
   */
  setupEventListeners() {
    // Override in subclasses
  }

  /**
   * Render component - Override in subclasses
   */
  render() {
    // Override in subclasses
    this.onRender();
  }

  /**
   * Component-specific render logic - Override in subclasses
   */
  onRender() {
    // Override in subclasses
  }

  /**
   * Update component state
   * @param {Object} newState - New state values
   * @param {boolean} shouldRender - Whether to trigger re-render
   */
  setState(newState, shouldRender = true) {
    if (this.isDestroyed) {
      return;
    }

    this.previousState = { ...this.state };
    this.state = { ...this.state, ...newState };

    this.log('State updated', {
      previous: this.previousState,
      current: this.state,
    });

    // Trigger state change callback
    this.onStateChange(newState, this.previousState);

    // Re-render if needed
    if (shouldRender) {
      this.render();
    }

    // Emit state change event
    this.emit('stateChange', { newState, previousState: this.previousState });
  }

  /**
   * State change callback - Override in subclasses
   * @param {Object} newState - New state values
   * @param {Object} previousState - Previous state values
   */
  onStateChange(_newState, _previousState) {
    // Override in subclasses
  }

  /**
   * Alias for setState - for compatibility
   * @param {Object} newState - New state values
   * @param {boolean} shouldRender - Whether to trigger re-render
   */
  updateState(newState, shouldRender = true) {
    return this.setState(newState, shouldRender);
  }

  /**
   * Get current state
   * @returns {Object} Current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Add event listener with automatic cleanup
   * @param {EventTarget} target - Event target
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object|boolean} options - Event options
   */
  addEventListener(target, event, handler, options = {}) {
    if (this.isDestroyed) {
      return;
    }

    // Bind handler to component context
    const boundHandler = handler.bind(this);

    // Add event listener
    target.addEventListener(event, boundHandler, options);

    // Store for cleanup
    if (!this.eventListeners.has(target)) {
      this.eventListeners.set(target, []);
    }

    this.eventListeners.get(target).push({
      event,
      handler: boundHandler,
      originalHandler: handler,
      options,
    });

    this.log(`Added event listener: ${event}`);
  }

  /**
   * Remove specific event listener
   * @param {EventTarget} target - Event target
   * @param {string} event - Event name
   * @param {Function} handler - Original event handler
   */
  removeEventListener(target, event, handler) {
    const listeners = this.eventListeners.get(target);
    if (!listeners) {
      return;
    }

    const index = listeners.findIndex(l => l.event === event && l.originalHandler === handler);

    if (index !== -1) {
      const listener = listeners[index];
      target.removeEventListener(event, listener.handler, listener.options);
      listeners.splice(index, 1);

      if (listeners.length === 0) {
        this.eventListeners.delete(target);
      }

      this.log(`Removed event listener: ${event}`);
    }
  }

  /**
   * Add timer with automatic cleanup
   * @param {Function} callback - Timer callback
   * @param {number} delay - Delay in milliseconds
   * @param {boolean} repeat - Whether to repeat (setInterval vs setTimeout)
   * @returns {number} Timer ID
   */
  addTimer(callback, delay, repeat = false) {
    const timerFunction = repeat ? setInterval : setTimeout;
    const timerId = timerFunction(callback.bind(this), delay);

    this.timers.add(timerId);

    // Auto-cleanup for setTimeout
    if (!repeat) {
      setTimeout(() => {
        this.timers.delete(timerId);
      }, delay);
    }

    return timerId;
  }

  /**
   * Clear specific timer
   * @param {number} timerId - Timer ID
   */
  clearTimer(timerId) {
    clearTimeout(timerId);
    clearInterval(timerId);
    this.timers.delete(timerId);
  }

  /**
   * Add observer with automatic cleanup
   * @param {*} observer - Observer instance (MutationObserver, ResizeObserver, etc.)
   */
  addObserver(observer) {
    this.observers.add(observer);
  }

  /**
   * Emit custom event
   * @param {string} eventName - Event name
   * @param {*} detail - Event detail data
   */
  emit(eventName, detail = null) {
    const event = new CustomEvent(`component:${eventName}`, {
      detail: {
        componentId: this.componentId,
        component: this,
        data: detail,
      },
      bubbles: true,
      cancelable: true,
    });

    this.container.dispatchEvent(event);
    this.log(`Emitted event: ${eventName}`, detail);
  }

  /**
   * Show component
   */
  show() {
    this.setState({ isVisible: true });
    this.container.style.display = '';
    this.container.setAttribute('aria-hidden', 'false');
    this.emit('show');
  }

  /**
   * Hide component
   */
  hide() {
    this.setState({ isVisible: false });
    this.container.style.display = 'none';
    this.container.setAttribute('aria-hidden', 'true');
    this.emit('hide');
  }

  /**
   * Enable component
   */
  enable() {
    this.setState({ isDisabled: false });
    this.container.removeAttribute('disabled');
    this.container.setAttribute('aria-disabled', 'false');
    this.emit('enable');
  }

  /**
   * Disable component
   */
  disable() {
    this.setState({ isDisabled: true });
    this.container.setAttribute('disabled', 'true');
    this.container.setAttribute('aria-disabled', 'true');
    this.emit('disable');
  }

  /**
   * Set loading state
   * @param {boolean} isLoading - Loading state
   */
  setLoading(isLoading = true) {
    this.setState({ isLoading });

    if (isLoading) {
      this.container.classList.add('loading');
      this.container.setAttribute('aria-busy', 'true');
    } else {
      this.container.classList.remove('loading');
      this.container.setAttribute('aria-busy', 'false');
    }

    this.emit('loadingChange', isLoading);
  }

  /**
   * Focus first focusable element
   */
  focus() {
    this.updateFocusableElements();
    const firstFocusable = this.focusableElements[0];

    if (firstFocusable) {
      // Store current focus for restoration
      if (document.activeElement && document.activeElement !== document.body) {
        this.restoreFocusElement = document.activeElement;
      }

      firstFocusable.focus();
      this.emit('focus');
    }
  }

  /**
   * Restore focus to previous element
   */
  restoreFocus() {
    if (this.restoreFocusElement && typeof this.restoreFocusElement.focus === 'function') {
      this.restoreFocusElement.focus();
      this.restoreFocusElement = null;
      this.emit('focusRestored');
    }
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {*} data - Additional data
   */
  log(_message, _data = null) {
    if (this.options.debug) {
      // Debug logging removed (prefix removed as unused)
    }
  }

  /**
   * Cleanup and destroy component
   */
  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.log('Destroying component');

    // Call component-specific cleanup
    this.onDestroy();

    // Remove all event listeners
    for (const [target, listeners] of this.eventListeners) {
      for (const listener of listeners) {
        target.removeEventListener(listener.event, listener.handler, listener.options);
      }
    }
    this.eventListeners.clear();

    // Clear all timers
    for (const timerId of this.timers) {
      this.clearTimer(timerId);
    }
    this.timers.clear();

    // Disconnect all observers
    for (const observer of this.observers) {
      if (typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    }
    this.observers.clear();

    // Restore focus if needed
    this.restoreFocus();

    // Clean up container
    if (this.container) {
      this.container.classList.remove(this.options.className);
      delete this.container._componentInstance;
    }

    // Mark as destroyed
    this.isDestroyed = true;

    this.log('Component destroyed');
    this.emit('destroyed');
  }

  /**
   * Component-specific cleanup - Override in subclasses
   */
  onDestroy() {
    // Override in subclasses
  }

  /**
   * Get component info for debugging
   * @returns {Object} Component information
   */
  getDebugInfo() {
    return {
      id: this.componentId,
      className: this.constructor.name,
      isInitialized: this.isInitialized,
      isDestroyed: this.isDestroyed,
      state: this.state,
      options: this.options,
      eventListenerCount: Array.from(this.eventListeners.values()).reduce(
        (total, listeners) => total + listeners.length,
        0
      ),
      timerCount: this.timers.size,
      observerCount: this.observers.size,
      focusableElementCount: this.focusableElements.length,
    };
  }
}

/**
 * Component registry for global component management
 */
export class ComponentRegistry {
  constructor() {
    this.components = new Map();
  }

  /**
   * Register a component
   * @param {BaseUIComponent} component - Component instance
   */
  register(component) {
    if (component instanceof BaseUIComponent) {
      this.components.set(component.componentId, component);
    }
  }

  /**
   * Unregister a component
   * @param {string|BaseUIComponent} componentOrId - Component or ID
   */
  unregister(componentOrId) {
    const id = typeof componentOrId === 'string' ? componentOrId : componentOrId.componentId;

    this.components.delete(id);
  }

  /**
   * Get component by ID
   * @param {string} componentId - Component ID
   * @returns {BaseUIComponent|null} Component instance
   */
  get(componentId) {
    return this.components.get(componentId) || null;
  }

  /**
   * Get all components of a specific type
   * @param {Function} componentClass - Component class
   * @returns {BaseUIComponent[]} Component instances
   */
  getByType(componentClass) {
    return Array.from(this.components.values()).filter(
      component => component instanceof componentClass
    );
  }

  /**
   * Destroy all components
   */
  destroyAll() {
    for (const component of this.components.values()) {
      component.destroy();
    }
    this.components.clear();
  }

  /**
   * Get registry debug info
   * @returns {Object} Registry information
   */
  getDebugInfo() {
    return {
      componentCount: this.components.size,
      components: Array.from(this.components.values()).map(c => c.getDebugInfo()),
    };
  }
}

// Global component registry
export const componentRegistry = new ComponentRegistry();

// Global cleanup on page unload
window.addEventListener('beforeunload', () => {
  componentRegistry.destroyAll();
});
