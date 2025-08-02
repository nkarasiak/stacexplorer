/**
 * MemoryManager - Comprehensive memory leak prevention and monitoring
 * Manages observers, intervals, event listeners, and memory usage tracking
 *
 * @author STAC Explorer Team
 * @version 1.0.0
 */

export class MemoryManager {
  /**
   * Create a new MemoryManager
   * @param {Object} options - Memory manager configuration options
   */
  constructor(options = {}) {
    this.options = {
      enableMonitoring: true,
      monitoringInterval: 30000, // 30 seconds
      memoryThreshold: 100 * 1024 * 1024, // 100MB
      enableWarnings: true,
      enableCleanup: true,
      debugMode: false,
      ...options,
    };

    // Resource tracking
    this.observers = new Map();
    this.intervals = new Set();
    this.timeouts = new Set();
    this.eventListeners = new Map();
    this.abortControllers = new Set();
    this.objectUrls = new Set();
    this.webWorkers = new Set();
    this.animationFrames = new Set();

    // Memory monitoring
    this.memorySnapshots = [];
    this.monitoringTimer = null;
    this.isMonitoring = false;

    // Cleanup tracking
    this.cleanupCallbacks = new Set();
    this.componentRegistry = new WeakMap();

    // Performance metrics
    this.metrics = {
      observersCreated: 0,
      observersDestroyed: 0,
      intervalsCreated: 0,
      intervalsCleared: 0,
      timeoutsCreated: 0,
      timeoutsCleared: 0,
      listenersAdded: 0,
      listenersRemoved: 0,
      memoryLeaksDetected: 0,
      cleanupOperations: 0,
    };

    // Initialize
    this.init();

    this.log('MemoryManager initialized');
  }

  /**
   * Initialize memory manager
   */
  init() {
    if (this.options.enableMonitoring) {
      this.startMemoryMonitoring();
    }

    // Set up global error handling for unhandled promise rejections
    this.setupGlobalErrorHandling();

    // Set up page visibility change handling
    this.setupVisibilityHandling();

    // Set up beforeunload cleanup
    this.setupPageUnloadCleanup();
  }

  /**
   * Set up global error handling
   */
  setupGlobalErrorHandling() {
    window.addEventListener('unhandledrejection', event => {
      this.log('Unhandled promise rejection detected:', event.reason);

      if (this.options.enableWarnings) {
        console.warn(
          'MemoryManager: Unhandled promise rejection could cause memory leaks',
          event.reason
        );
      }
    });
  }

  /**
   * Set up page visibility change handling
   */
  setupVisibilityHandling() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseNonEssentialOperations();
      } else {
        this.resumeOperations();
      }
    });
  }

  /**
   * Set up page unload cleanup
   */
  setupPageUnloadCleanup() {
    window.addEventListener('beforeunload', () => {
      this.cleanupAll();
    });

    window.addEventListener('pagehide', () => {
      this.cleanupAll();
    });
  }

  /**
   * Create and track ResizeObserver
   * @param {Function} callback - Resize callback
   * @param {Object} options - Observer options
   * @returns {ResizeObserver} Observer instance
   */
  createResizeObserver(callback, options = {}) {
    const observer = new ResizeObserver(callback);
    const id = this.generateId();

    this.observers.set(id, {
      type: 'ResizeObserver',
      instance: observer,
      created: Date.now(),
      targets: new Set(),
      callback,
      options,
    });

    this.metrics.observersCreated++;

    this.log('ResizeObserver created:', id);
    return this.createObserverProxy(observer, id);
  }

  /**
   * Create and track IntersectionObserver
   * @param {Function} callback - Intersection callback
   * @param {Object} options - Observer options
   * @returns {IntersectionObserver} Observer instance
   */
  createIntersectionObserver(callback, options = {}) {
    const observer = new IntersectionObserver(callback, options);
    const id = this.generateId();

    this.observers.set(id, {
      type: 'IntersectionObserver',
      instance: observer,
      created: Date.now(),
      targets: new Set(),
      callback,
      options,
    });

    this.metrics.observersCreated++;

    this.log('IntersectionObserver created:', id);
    return this.createObserverProxy(observer, id);
  }

  /**
   * Create and track MutationObserver
   * @param {Function} callback - Mutation callback
   * @returns {MutationObserver} Observer instance
   */
  createMutationObserver(callback) {
    const observer = new MutationObserver(callback);
    const id = this.generateId();

    this.observers.set(id, {
      type: 'MutationObserver',
      instance: observer,
      created: Date.now(),
      targets: new Set(),
      callback,
    });

    this.metrics.observersCreated++;

    this.log('MutationObserver created:', id);
    return this.createObserverProxy(observer, id);
  }

  /**
   * Create observer proxy for tracking
   * @param {*} observer - Observer instance
   * @param {string} id - Observer ID
   * @returns {Proxy} Observer proxy
   */
  createObserverProxy(observer, id) {
    const self = this;

    return new Proxy(observer, {
      get(target, prop) {
        if (prop === 'observe') {
          return (element, options) => {
            const observerData = self.observers.get(id);
            if (observerData) {
              observerData.targets.add(element);
            }
            return target.observe(element, options);
          };
        }

        if (prop === 'unobserve') {
          return element => {
            const observerData = self.observers.get(id);
            if (observerData) {
              observerData.targets.delete(element);
            }
            return target.unobserve(element);
          };
        }

        if (prop === 'disconnect') {
          return () => {
            self.destroyObserver(id);
            return target.disconnect();
          };
        }

        // Add tracking ID for reference
        if (prop === '_memoryManagerId') {
          return id;
        }

        return target[prop];
      },
    });
  }

  /**
   * Destroy observer
   * @param {string} id - Observer ID
   */
  destroyObserver(id) {
    const observerData = this.observers.get(id);
    if (observerData) {
      observerData.instance.disconnect();
      observerData.targets.clear();
      this.observers.delete(id);
      this.metrics.observersDestroyed++;

      this.log('Observer destroyed:', id, observerData.type);
    }
  }

  /**
   * Create and track interval
   * @param {Function} callback - Interval callback
   * @param {number} delay - Delay in milliseconds
   * @returns {number} Interval ID
   */
  createInterval(callback, delay) {
    const intervalId = setInterval(callback, delay);

    this.intervals.add({
      id: intervalId,
      created: Date.now(),
      delay,
      callback: callback.toString().substring(0, 100), // Store first 100 chars for debugging
    });

    this.metrics.intervalsCreated++;

    this.log('Interval created:', intervalId, `${delay}ms`);
    return intervalId;
  }

  /**
   * Clear and untrack interval
   * @param {number} intervalId - Interval ID
   */
  clearInterval(intervalId) {
    clearInterval(intervalId);

    for (const interval of this.intervals) {
      if (interval.id === intervalId) {
        this.intervals.delete(interval);
        this.metrics.intervalsCleared++;

        this.log('Interval cleared:', intervalId);
        break;
      }
    }
  }

  /**
   * Create and track timeout
   * @param {Function} callback - Timeout callback
   * @param {number} delay - Delay in milliseconds
   * @returns {number} Timeout ID
   */
  createTimeout(callback, delay) {
    const timeoutId = setTimeout(() => {
      callback();
      this.clearTimeout(timeoutId);
    }, delay);

    this.timeouts.add({
      id: timeoutId,
      created: Date.now(),
      delay,
      callback: callback.toString().substring(0, 100),
    });

    this.metrics.timeoutsCreated++;

    this.log('Timeout created:', timeoutId, `${delay}ms`);
    return timeoutId;
  }

  /**
   * Clear and untrack timeout
   * @param {number} timeoutId - Timeout ID
   */
  clearTimeout(timeoutId) {
    clearTimeout(timeoutId);

    for (const timeout of this.timeouts) {
      if (timeout.id === timeoutId) {
        this.timeouts.delete(timeout);
        this.metrics.timeoutsCleared++;

        this.log('Timeout cleared:', timeoutId);
        break;
      }
    }
  }

  /**
   * Add and track event listener
   * @param {EventTarget} target - Event target
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object|boolean} options - Event options
   * @returns {Function} Cleanup function
   */
  addEventListener(target, event, handler, options = {}) {
    target.addEventListener(event, handler, options);

    if (!this.eventListeners.has(target)) {
      this.eventListeners.set(target, []);
    }

    const listenerData = {
      event,
      handler,
      options,
      created: Date.now(),
    };

    this.eventListeners.get(target).push(listenerData);
    this.metrics.listenersAdded++;

    this.log('Event listener added:', event, 'on', target.constructor.name);

    // Return cleanup function
    return () => {
      this.removeEventListener(target, event, handler);
    };
  }

  /**
   * Remove and untrack event listener
   * @param {EventTarget} target - Event target
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  removeEventListener(target, event, handler) {
    target.removeEventListener(event, handler);

    const listeners = this.eventListeners.get(target);
    if (listeners) {
      const index = listeners.findIndex(l => l.event === event && l.handler === handler);

      if (index !== -1) {
        listeners.splice(index, 1);
        this.metrics.listenersRemoved++;

        this.log('Event listener removed:', event, 'from', target.constructor.name);

        if (listeners.length === 0) {
          this.eventListeners.delete(target);
        }
      }
    }
  }

  /**
   * Create and track AbortController
   * @returns {AbortController} AbortController instance
   */
  createAbortController() {
    const controller = new AbortController();
    const id = this.generateId();

    this.abortControllers.add({
      id,
      instance: controller,
      created: Date.now(),
      aborted: false,
    });

    // Proxy to track abort calls
    const originalAbort = controller.abort.bind(controller);
    controller.abort = () => {
      for (const controllerData of this.abortControllers) {
        if (controllerData.instance === controller) {
          controllerData.aborted = true;
          break;
        }
      }
      originalAbort();
    };

    this.log('AbortController created:', id);
    return controller;
  }

  /**
   * Create and track object URL
   * @param {Blob|File} object - Object to create URL for
   * @returns {string} Object URL
   */
  createObjectURL(object) {
    const url = URL.createObjectURL(object);

    this.objectUrls.add({
      url,
      created: Date.now(),
      object: object.constructor.name,
      size: object.size || 0,
    });

    this.log('Object URL created:', url, object.constructor.name);
    return url;
  }

  /**
   * Revoke and untrack object URL
   * @param {string} url - Object URL
   */
  revokeObjectURL(url) {
    URL.revokeObjectURL(url);

    for (const urlData of this.objectUrls) {
      if (urlData.url === url) {
        this.objectUrls.delete(urlData);
        this.log('Object URL revoked:', url);
        break;
      }
    }
  }

  /**
   * Create and track Web Worker
   * @param {string} scriptURL - Worker script URL
   * @param {Object} options - Worker options
   * @returns {Worker} Worker instance
   */
  createWebWorker(scriptURL, options = {}) {
    const worker = new Worker(scriptURL, options);
    const id = this.generateId();

    this.webWorkers.add({
      id,
      instance: worker,
      scriptURL,
      created: Date.now(),
      terminated: false,
    });

    // Proxy to track terminate calls
    const originalTerminate = worker.terminate.bind(worker);
    worker.terminate = () => {
      for (const workerData of this.webWorkers) {
        if (workerData.instance === worker) {
          workerData.terminated = true;
          this.webWorkers.delete(workerData);
          break;
        }
      }
      originalTerminate();
    };

    this.log('Web Worker created:', id, scriptURL);
    return worker;
  }

  /**
   * Create and track animation frame
   * @param {Function} callback - Animation callback
   * @returns {number} Animation frame ID
   */
  createAnimationFrame(callback) {
    const frameId = requestAnimationFrame(timestamp => {
      this.cancelAnimationFrame(frameId);
      callback(timestamp);
    });

    this.animationFrames.add({
      id: frameId,
      created: Date.now(),
      callback: callback.toString().substring(0, 100),
    });

    this.log('Animation frame created:', frameId);
    return frameId;
  }

  /**
   * Cancel and untrack animation frame
   * @param {number} frameId - Animation frame ID
   */
  cancelAnimationFrame(frameId) {
    cancelAnimationFrame(frameId);

    for (const frame of this.animationFrames) {
      if (frame.id === frameId) {
        this.animationFrames.delete(frame);
        this.log('Animation frame cancelled:', frameId);
        break;
      }
    }
  }

  /**
   * Register component for cleanup tracking
   * @param {*} component - Component instance
   * @param {Function} cleanupCallback - Cleanup callback
   */
  registerComponent(component, cleanupCallback) {
    this.componentRegistry.set(component, {
      cleanup: cleanupCallback,
      registered: Date.now(),
    });

    this.log('Component registered for cleanup:', component.constructor?.name || 'Unknown');
  }

  /**
   * Unregister component
   * @param {*} component - Component instance
   */
  unregisterComponent(component) {
    const componentData = this.componentRegistry.get(component);
    if (componentData) {
      this.componentRegistry.delete(component);
      this.log('Component unregistered:', component.constructor?.name || 'Unknown');
    }
  }

  /**
   * Add cleanup callback
   * @param {Function} callback - Cleanup callback
   * @returns {Function} Remove callback function
   */
  addCleanupCallback(callback) {
    this.cleanupCallbacks.add(callback);

    return () => {
      this.cleanupCallbacks.delete(callback);
    };
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    this.monitoringTimer = this.createInterval(() => {
      this.captureMemorySnapshot();
      this.checkMemoryUsage();
    }, this.options.monitoringInterval);

    this.log('Memory monitoring started');
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringTimer) {
      this.clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    this.log('Memory monitoring stopped');
  }

  /**
   * Capture memory snapshot
   */
  captureMemorySnapshot() {
    if (!('memory' in performance)) {
      return;
    }

    const snapshot = {
      timestamp: Date.now(),
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      resourceCounts: this.getResourceCounts(),
    };

    this.memorySnapshots.push(snapshot);

    // Keep only last 100 snapshots
    if (this.memorySnapshots.length > 100) {
      this.memorySnapshots.shift();
    }

    this.log('Memory snapshot captured:', `${snapshot.usedJSHeapSize / 1024 / 1024}MB`);
  }

  /**
   * Check memory usage and detect leaks
   */
  checkMemoryUsage() {
    if (this.memorySnapshots.length < 3) {
      return;
    }

    const recent = this.memorySnapshots.slice(-3);
    const trend = this.calculateMemoryTrend(recent);

    // Check for consistent memory growth
    if (trend.isIncreasing && trend.averageIncrease > 5 * 1024 * 1024) {
      // 5MB
      this.metrics.memoryLeaksDetected++;

      if (this.options.enableWarnings) {
        console.warn('MemoryManager: Potential memory leak detected', {
          trend,
          currentUsage: recent[recent.length - 1].usedJSHeapSize,
          resourceCounts: this.getResourceCounts(),
        });
      }

      if (this.options.enableCleanup) {
        this.performAutomaticCleanup();
      }
    }

    // Check absolute threshold
    const currentUsage = recent[recent.length - 1].usedJSHeapSize;
    if (currentUsage > this.options.memoryThreshold) {
      if (this.options.enableWarnings) {
        console.warn('MemoryManager: Memory threshold exceeded', {
          current: `${currentUsage / 1024 / 1024}MB`,
          threshold: `${this.options.memoryThreshold / 1024 / 1024}MB`,
        });
      }
    }
  }

  /**
   * Calculate memory trend
   * @param {Array} snapshots - Memory snapshots
   * @returns {Object} Trend analysis
   */
  calculateMemoryTrend(snapshots) {
    if (snapshots.length < 2) {
      return { isIncreasing: false, averageIncrease: 0 };
    }

    let totalIncrease = 0;
    let increases = 0;

    for (let i = 1; i < snapshots.length; i++) {
      const increase = snapshots[i].usedJSHeapSize - snapshots[i - 1].usedJSHeapSize;
      if (increase > 0) {
        totalIncrease += increase;
        increases++;
      }
    }

    return {
      isIncreasing: increases === snapshots.length - 1,
      averageIncrease: increases > 0 ? totalIncrease / increases : 0,
      consistentGrowth: increases / (snapshots.length - 1) >= 0.8,
    };
  }

  /**
   * Perform automatic cleanup
   */
  performAutomaticCleanup() {
    this.log('Performing automatic cleanup...');

    // Clean up old timeouts and intervals
    this.cleanupOldResources();

    // Revoke old object URLs
    this.cleanupOldObjectURLs();

    // Disconnect inactive observers
    this.cleanupInactiveObservers();

    // Force garbage collection if available
    if (window.gc && typeof window.gc === 'function') {
      window.gc();
    }

    this.metrics.cleanupOperations++;

    this.log('Automatic cleanup completed');
  }

  /**
   * Clean up old resources
   */
  cleanupOldResources() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    // Clean up old timeouts (shouldn't exist but just in case)
    for (const timeout of this.timeouts) {
      if (now - timeout.created > maxAge) {
        this.clearTimeout(timeout.id);
      }
    }

    // Clean up old animation frames
    for (const frame of this.animationFrames) {
      if (now - frame.created > 1000) {
        // 1 second
        this.cancelAnimationFrame(frame.id);
      }
    }
  }

  /**
   * Clean up old object URLs
   */
  cleanupOldObjectURLs() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const urlData of this.objectUrls) {
      if (now - urlData.created > maxAge) {
        this.revokeObjectURL(urlData.url);
      }
    }
  }

  /**
   * Clean up inactive observers
   */
  cleanupInactiveObservers() {
    for (const [id, observerData] of this.observers) {
      if (observerData.targets.size === 0) {
        this.destroyObserver(id);
      }
    }
  }

  /**
   * Pause non-essential operations
   */
  pauseNonEssentialOperations() {
    this.log('Pausing non-essential operations (page hidden)');

    // Stop memory monitoring temporarily
    if (this.isMonitoring) {
      this.stopMemoryMonitoring();
      this._wasMonitoring = true;
    }
  }

  /**
   * Resume operations
   */
  resumeOperations() {
    this.log('Resuming operations (page visible)');

    // Resume memory monitoring if it was running
    if (this._wasMonitoring) {
      this.startMemoryMonitoring();
      this._wasMonitoring = false;
    }
  }

  /**
   * Get resource counts
   * @returns {Object} Resource counts
   */
  getResourceCounts() {
    return {
      observers: this.observers.size,
      intervals: this.intervals.size,
      timeouts: this.timeouts.size,
      eventListeners: Array.from(this.eventListeners.values()).reduce(
        (total, listeners) => total + listeners.length,
        0
      ),
      abortControllers: this.abortControllers.size,
      objectUrls: this.objectUrls.size,
      webWorkers: this.webWorkers.size,
      animationFrames: this.animationFrames.size,
    };
  }

  /**
   * Get memory statistics
   * @returns {Object} Memory statistics
   */
  getMemoryStats() {
    const stats = {
      resourceCounts: this.getResourceCounts(),
      metrics: { ...this.metrics },
      memorySnapshots: this.memorySnapshots.length,
      isMonitoring: this.isMonitoring,
    };

    if ('memory' in performance) {
      stats.memory = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        usedMB: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        totalMB: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
      };
    }

    return stats;
  }

  /**
   * Clean up all resources
   */
  cleanupAll() {
    this.log('Cleaning up all resources...');

    // Stop monitoring
    this.stopMemoryMonitoring();

    // Clean up observers
    for (const [id] of this.observers) {
      this.destroyObserver(id);
    }

    // Clear intervals and timeouts
    for (const interval of this.intervals) {
      clearInterval(interval.id);
    }
    this.intervals.clear();

    for (const timeout of this.timeouts) {
      clearTimeout(timeout.id);
    }
    this.timeouts.clear();

    // Remove event listeners
    for (const [target, listeners] of this.eventListeners) {
      for (const listener of listeners) {
        target.removeEventListener(listener.event, listener.handler);
      }
    }
    this.eventListeners.clear();

    // Abort controllers
    for (const controllerData of this.abortControllers) {
      if (!controllerData.aborted) {
        controllerData.instance.abort();
      }
    }
    this.abortControllers.clear();

    // Revoke object URLs
    for (const urlData of this.objectUrls) {
      URL.revokeObjectURL(urlData.url);
    }
    this.objectUrls.clear();

    // Terminate workers
    for (const workerData of this.webWorkers) {
      if (!workerData.terminated) {
        workerData.instance.terminate();
      }
    }
    this.webWorkers.clear();

    // Cancel animation frames
    for (const frame of this.animationFrames) {
      cancelAnimationFrame(frame.id);
    }
    this.animationFrames.clear();

    // Run cleanup callbacks
    for (const callback of this.cleanupCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error('MemoryManager: Error in cleanup callback:', error);
      }
    }
    this.cleanupCallbacks.clear();

    // Clean up registered components
    // Note: WeakMap doesn't have clear() method, but references will be cleaned up by GC

    this.log('All resources cleaned up');
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `mm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log debug message
   * @param {...any} args - Log arguments
   */
  log(..._args) {
    if (this.options.debugMode) {
      // Intentionally empty - debug logging disabled in production for performance
    }
  }
}

// Global memory manager instance
export const globalMemoryManager = new MemoryManager({
  enableMonitoring: true,
  enableWarnings: true,
  enableCleanup: true,
  debugMode: false,
});

export default MemoryManager;
