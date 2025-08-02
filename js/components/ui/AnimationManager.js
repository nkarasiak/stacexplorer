/**
 * AnimationManager - Physics-based animations with performance optimization
 * Provides smooth, natural animations with spring physics and easing functions
 *
 * @author STAC Explorer Team
 * @version 1.0.0
 */

import { BaseUIComponent } from '../base/BaseUIComponent.js';
import { globalMemoryManager } from '../performance/MemoryManager.js';

export class AnimationManager extends BaseUIComponent {
  /**
   * Create a new AnimationManager
   * @param {Object} options - Animation manager configuration options
   */
  constructor(options = {}) {
    super(document.body, options);

    this.animations = new Map();
    this.sequences = new Map();
    this.timelines = new Map();

    // Performance tracking
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.fps = 60;
    this.isRafRunning = false;
    this.rafId = null;

    // Animation defaults
    this.defaults = {
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'both',
      iterations: 1,
    };

    // Physics defaults
    this.physicsDefaults = {
      mass: 1,
      stiffness: 100,
      damping: 10,
      velocity: 0,
    };

    // Performance monitoring
    this.performanceObserver = null;
    this.setupPerformanceMonitoring();

    this.log('AnimationManager initialized');
  }

  /**
   * Get default options
   * @returns {Object} Default options
   */
  getDefaultOptions() {
    return {
      ...super.getDefaultOptions(),
      className: 'animation-manager',

      // Performance
      preferredFrameRate: 60,
      enablePerformanceMonitoring: true,
      adaptiveQuality: true,
      maxConcurrentAnimations: 20,

      // Features
      useWebAnimations: true,
      fallbackToCSS: true,
      enableGPUAcceleration: true,
      respectReducedMotion: true,

      // Debugging
      debugMode: false,
      visualizeAnimations: false,
    };
  }

  /**
   * Set up performance monitoring
   */
  setupPerformanceMonitoring() {
    if (!this.options.enablePerformanceMonitoring) {
      return;
    }

    try {
      if ('PerformanceObserver' in window) {
        this.performanceObserver = new PerformanceObserver(list => {
          this.handlePerformanceEntries(list.getEntries());
        });

        this.performanceObserver.observe({
          entryTypes: ['measure', 'navigation', 'paint'],
        });

        globalMemoryManager.registerComponent(this, () => {
          if (this.performanceObserver) {
            this.performanceObserver.disconnect();
          }
        });
      }
    } catch (error) {
      this.log('Performance monitoring setup failed:', error);
    }
  }

  /**
   * Handle performance entries
   * @param {Array} entries - Performance entries
   */
  handlePerformanceEntries(entries) {
    for (const entry of entries) {
      if (entry.entryType === 'measure' && entry.name.startsWith('animation-')) {
        this.trackAnimationPerformance(entry);
      }
    }
  }

  /**
   * Track animation performance
   * @param {PerformanceEntry} entry - Performance entry
   */
  trackAnimationPerformance(entry) {
    if (this.options.adaptiveQuality && entry.duration > 16.67) {
      // Slower than 60fps
      this.log('Slow animation detected:', entry.name, `${entry.duration}ms`);
      this.adaptQuality();
    }
  }

  /**
   * Adapt animation quality based on performance
   */
  adaptQuality() {
    // Reduce concurrent animations
    if (this.animations.size > 10) {
      this.pauseLowPriorityAnimations();
    }

    // Switch to CSS animations for better performance
    this.options.useWebAnimations = false;

    setTimeout(() => {
      this.options.useWebAnimations = true;
    }, 5000); // Reset after 5 seconds
  }

  /**
   * Pause low priority animations
   */
  pauseLowPriorityAnimations() {
    for (const [id, animation] of this.animations) {
      if (animation.priority === 'low' && animation.state !== 'paused') {
        this.pauseAnimation(id);
      }
    }
  }

  /**
   * Animate element with keyframes
   * @param {HTMLElement} element - Element to animate
   * @param {Array|Object} keyframes - Animation keyframes
   * @param {Object} options - Animation options
   * @returns {Promise} Animation promise
   */
  async animate(element, keyframes, options = {}) {
    if (!element) {
      throw new Error('AnimationManager: Element is required');
    }

    // Check reduced motion preference
    if (this.options.respectReducedMotion && this.prefersReducedMotion()) {
      return this.handleReducedMotion(element, keyframes, options);
    }

    const config = { ...this.defaults, ...options };
    const id = this.generateAnimationId();

    // Performance marking
    performance.mark(`animation-${id}-start`);

    let animation;

    try {
      if (this.options.useWebAnimations && 'animate' in element) {
        animation = await this.createWebAnimation(element, keyframes, config);
      } else if (this.options.fallbackToCSS) {
        animation = await this.createCSSAnimation(element, keyframes, config);
      } else {
        animation = await this.createJSAnimation(element, keyframes, config);
      }

      // Store animation reference
      this.animations.set(id, {
        id,
        element,
        animation,
        keyframes,
        options: config,
        state: 'running',
        priority: config.priority || 'normal',
        startTime: performance.now(),
        progress: 0,
      });

      // Set up animation completion
      const promise = this.handleAnimationCompletion(id, animation);

      // GPU optimization
      if (this.options.enableGPUAcceleration) {
        this.optimizeForGPU(element);
      }

      // Emit start event
      this.emit('animationStart', { id, element, keyframes, options: config });

      return promise;
    } catch (error) {
      this.log('Animation failed:', error);
      this.emit('animationError', { id, error, element });
      throw error;
    }
  }

  /**
   * Create Web Animation
   * @param {HTMLElement} element - Element to animate
   * @param {Array|Object} keyframes - Animation keyframes
   * @param {Object} config - Animation configuration
   * @returns {Animation} Web Animation instance
   */
  createWebAnimation(element, keyframes, config) {
    const animation = element.animate(keyframes, {
      duration: config.duration,
      easing: config.easing,
      fill: config.fill,
      iterations: config.iterations,
      direction: config.direction,
      delay: config.delay || 0,
      endDelay: config.endDelay || 0,
    });

    this.log('Web Animation created:', animation);
    return animation;
  }

  /**
   * Create CSS Animation
   * @param {HTMLElement} element - Element to animate
   * @param {Array|Object} keyframes - Animation keyframes
   * @param {Object} config - Animation configuration
   * @returns {Object} CSS Animation object
   */
  createCSSAnimation(element, keyframes, config) {
    const animationName = `anim-${this.generateAnimationId()}`;

    // Create keyframes CSS
    const keyframesCSS = this.createKeyframesCSS(animationName, keyframes);

    // Inject CSS
    this.injectCSS(keyframesCSS);

    // Apply animation
    element.style.animation = `${animationName} ${config.duration}ms ${config.easing} ${config.delay || 0}ms ${config.iterations} ${config.direction || 'normal'} ${config.fill}`;

    // Create animation-like object
    const animationObject = {
      element,
      animationName,
      startTime: performance.now(),
      duration: config.duration,
      cancel: () => {
        element.style.animation = '';
        this.removeCSS(animationName);
      },
      pause: () => {
        element.style.animationPlayState = 'paused';
      },
      play: () => {
        element.style.animationPlayState = 'running';
      },
    };

    this.log('CSS Animation created:', animationName);
    return animationObject;
  }

  /**
   * Create JavaScript Animation
   * @param {HTMLElement} element - Element to animate
   * @param {Array|Object} keyframes - Animation keyframes
   * @param {Object} config - Animation configuration
   * @returns {Object} JS Animation object
   */
  createJSAnimation(element, keyframes, config) {
    const id = this.generateAnimationId();
    let startTime = null;
    let isRunning = true;
    let isPaused = false;
    let pauseTime = 0;
    let totalPauseTime = 0;

    const animate = timestamp => {
      if (!isRunning) {
        return;
      }

      if (!startTime) {
        startTime = timestamp;
      }

      if (isPaused) {
        pauseTime = timestamp;
        globalMemoryManager.createAnimationFrame(animate);
        return;
      }

      if (pauseTime > 0) {
        totalPauseTime += timestamp - pauseTime;
        pauseTime = 0;
      }

      const elapsed = timestamp - startTime - totalPauseTime;
      const progress = Math.min(elapsed / config.duration, 1);

      // Apply keyframes
      this.applyKeyframesToElement(element, keyframes, progress, config);

      if (progress < 1) {
        globalMemoryManager.createAnimationFrame(animate);
      } else {
        this.emit('animationComplete', { id, element });
      }
    };

    globalMemoryManager.createAnimationFrame(animate);

    const animationObject = {
      element,
      id,
      startTime,
      duration: config.duration,
      cancel: () => {
        isRunning = false;
      },
      pause: () => {
        isPaused = true;
      },
      play: () => {
        isPaused = false;
      },
    };

    this.log('JS Animation created:', id);
    return animationObject;
  }

  /**
   * Apply keyframes to element based on progress
   * @param {HTMLElement} element - Element to animate
   * @param {Array|Object} keyframes - Animation keyframes
   * @param {number} progress - Animation progress (0-1)
   * @param {Object} config - Animation configuration
   */
  applyKeyframesToElement(element, keyframes, progress, config) {
    // Handle different keyframe formats
    if (Array.isArray(keyframes)) {
      this.applyArrayKeyframes(element, keyframes, progress, config);
    } else {
      this.applyObjectKeyframes(element, keyframes, progress, config);
    }
  }

  /**
   * Apply array-format keyframes
   * @param {HTMLElement} element - Element to animate
   * @param {Array} keyframes - Keyframes array
   * @param {number} progress - Animation progress (0-1)
   * @param {Object} config - Animation configuration
   */
  applyArrayKeyframes(element, keyframes, progress, config) {
    const easedProgress = this.applyEasing(progress, config.easing);

    // Find current keyframe segment
    const segmentCount = keyframes.length - 1;
    const segmentProgress = easedProgress * segmentCount;
    const segmentIndex = Math.floor(segmentProgress);
    const localProgress = segmentProgress - segmentIndex;

    const fromFrame = keyframes[Math.min(segmentIndex, segmentCount)];
    const toFrame = keyframes[Math.min(segmentIndex + 1, segmentCount)];

    // Interpolate between keyframes
    this.interpolateKeyframes(element, fromFrame, toFrame, localProgress);
  }

  /**
   * Apply object-format keyframes
   * @param {HTMLElement} element - Element to animate
   * @param {Object} keyframes - Keyframes object
   * @param {number} progress - Animation progress (0-1)
   * @param {Object} config - Animation configuration
   */
  applyObjectKeyframes(element, keyframes, progress, config) {
    const easedProgress = this.applyEasing(progress, config.easing);

    for (const property in keyframes) {
      const values = keyframes[property];
      if (Array.isArray(values)) {
        const value = this.interpolateValues(values, easedProgress);
        this.setElementProperty(element, property, value);
      }
    }
  }

  /**
   * Interpolate between keyframes
   * @param {HTMLElement} element - Element to animate
   * @param {Object} fromFrame - From keyframe
   * @param {Object} toFrame - To keyframe
   * @param {number} progress - Local progress (0-1)
   */
  interpolateKeyframes(element, fromFrame, toFrame, progress) {
    for (const property in fromFrame) {
      const fromValue = fromFrame[property];
      const toValue = toFrame[property];

      const interpolatedValue = this.interpolateValue(fromValue, toValue, progress);
      this.setElementProperty(element, property, interpolatedValue);
    }
  }

  /**
   * Interpolate between two values
   * @param {*} from - From value
   * @param {*} to - To value
   * @param {number} progress - Progress (0-1)
   * @returns {*} Interpolated value
   */
  interpolateValue(from, to, progress) {
    // Handle different value types
    if (typeof from === 'number' && typeof to === 'number') {
      return from + (to - from) * progress;
    }

    if (typeof from === 'string' && typeof to === 'string') {
      return this.interpolateStringValues(from, to, progress);
    }

    // Fallback to discrete interpolation
    return progress < 0.5 ? from : to;
  }

  /**
   * Interpolate between array values
   * @param {Array} values - Array of values
   * @param {number} progress - Progress (0-1)
   * @returns {*} Interpolated value
   */
  interpolateValues(values, progress) {
    if (values.length === 0) {
      return null;
    }
    if (values.length === 1) {
      return values[0];
    }

    const segmentCount = values.length - 1;
    const segmentProgress = progress * segmentCount;
    const segmentIndex = Math.floor(segmentProgress);
    const localProgress = segmentProgress - segmentIndex;

    const fromValue = values[Math.min(segmentIndex, segmentCount)];
    const toValue = values[Math.min(segmentIndex + 1, segmentCount)];

    return this.interpolateValue(fromValue, toValue, localProgress);
  }

  /**
   * Interpolate string values (supports colors, transforms, etc.)
   * @param {string} from - From string value
   * @param {string} to - To string value
   * @param {number} progress - Progress (0-1)
   * @returns {string} Interpolated string value
   */
  interpolateStringValues(from, to, progress) {
    // Handle color values
    if (this.isColor(from) && this.isColor(to)) {
      return this.interpolateColors(from, to, progress);
    }

    // Handle transform values
    if (from.includes('translate') || from.includes('scale') || from.includes('rotate')) {
      return this.interpolateTransforms(from, to, progress);
    }

    // Handle numeric values with units
    const fromMatch = from.match(/^(-?\d*\.?\d+)(.*)$/);
    const toMatch = to.match(/^(-?\d*\.?\d+)(.*)$/);

    if (fromMatch && toMatch && fromMatch[2] === toMatch[2]) {
      const fromNum = parseFloat(fromMatch[1]);
      const toNum = parseFloat(toMatch[1]);
      const unit = fromMatch[2];

      return fromNum + (toNum - fromNum) * progress + unit;
    }

    // Fallback to discrete interpolation
    return progress < 0.5 ? from : to;
  }

  /**
   * Check if value is a color
   * @param {string} value - Value to check
   * @returns {boolean} Whether value is a color
   */
  isColor(value) {
    return (
      /^#[0-9a-f]{3,8}$/i.test(value) ||
      /^rgb\(/i.test(value) ||
      /^rgba\(/i.test(value) ||
      /^hsl\(/i.test(value) ||
      /^hsla\(/i.test(value)
    );
  }

  /**
   * Interpolate between colors
   * @param {string} from - From color
   * @param {string} to - To color
   * @param {number} progress - Progress (0-1)
   * @returns {string} Interpolated color
   */
  interpolateColors(from, to, progress) {
    const fromRGB = this.parseColor(from);
    const toRGB = this.parseColor(to);

    if (!fromRGB || !toRGB) {
      return progress < 0.5 ? from : to;
    }

    const r = Math.round(fromRGB.r + (toRGB.r - fromRGB.r) * progress);
    const g = Math.round(fromRGB.g + (toRGB.g - fromRGB.g) * progress);
    const b = Math.round(fromRGB.b + (toRGB.b - fromRGB.b) * progress);
    const a = fromRGB.a + (toRGB.a - fromRGB.a) * progress;

    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  /**
   * Parse color string to RGB values
   * @param {string} color - Color string
   * @returns {Object|null} RGB values or null
   */
  parseColor(color) {
    // Simple color parsing - could be enhanced
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b, a: 1 };
    }

    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3]),
        a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
      };
    }

    return null;
  }

  /**
   * Interpolate transform values
   * @param {string} from - From transform
   * @param {string} to - To transform
   * @param {number} progress - Progress (0-1)
   * @returns {string} Interpolated transform
   */
  interpolateTransforms(from, to, progress) {
    // Simplified transform interpolation
    // This could be enhanced to handle more complex transforms
    return progress < 0.5 ? from : to;
  }

  /**
   * Set element property
   * @param {HTMLElement} element - Element to modify
   * @param {string} property - Property name
   * @param {*} value - Property value
   */
  setElementProperty(element, property, value) {
    if (property in element.style) {
      element.style[property] = value;
    } else {
      element.style.setProperty(property, value);
    }
  }

  /**
   * Apply easing function
   * @param {number} progress - Linear progress (0-1)
   * @param {string} easing - Easing function
   * @returns {number} Eased progress
   */
  applyEasing(progress, easing) {
    if (typeof easing === 'function') {
      return easing(progress);
    }

    switch (easing) {
      case 'linear':
        return progress;
      case 'ease':
        return this.cubicBezier(0.25, 0.1, 0.25, 1)(progress);
      case 'ease-in':
        return this.cubicBezier(0.42, 0, 1, 1)(progress);
      case 'ease-out':
        return this.cubicBezier(0, 0, 0.58, 1)(progress);
      case 'ease-in-out':
        return this.cubicBezier(0.42, 0, 0.58, 1)(progress);
      default:
        if (easing.startsWith('cubic-bezier')) {
          const values = easing.match(/cubic-bezier\(([^)]+)\)/);
          if (values) {
            const [x1, y1, x2, y2] = values[1].split(',').map(v => parseFloat(v.trim()));
            return this.cubicBezier(x1, y1, x2, y2)(progress);
          }
        }
        return progress;
    }
  }

  /**
   * Create cubic bezier easing function
   * @param {number} x1 - Control point 1 x
   * @param {number} y1 - Control point 1 y
   * @param {number} x2 - Control point 2 x
   * @param {number} y2 - Control point 2 y
   * @returns {Function} Easing function
   */
  cubicBezier(x1, y1, x2, y2) {
    return t => {
      if (t <= 0) {
        return 0;
      }
      if (t >= 1) {
        return 1;
      }

      // Simplified cubic bezier calculation
      const cx = 3 * x1;
      const bx = 3 * (x2 - x1) - cx;
      const ax = 1 - cx - bx;

      const cy = 3 * y1;
      const by = 3 * (y2 - y1) - cy;
      const ay = 1 - cy - by;

      const sampleCurveX = t => ((ax * t + bx) * t + cx) * t;
      const sampleCurveY = t => ((ay * t + by) * t + cy) * t;

      // Binary search to solve for t given x
      // const _t0 = 0; // Unused - bounds for binary search algorithm
      // const _t1 = 1;
      let t2 = t;

      for (let i = 0; i < 8; i++) {
        const x2 = sampleCurveX(t2) - t;
        if (Math.abs(x2) < 0.000001) {
          break;
        }

        const d2 = (3 * ax * t2 + 2 * bx) * t2 + cx;
        if (Math.abs(d2) < 0.000001) {
          break;
        }

        t2 = t2 - x2 / d2;
      }

      return sampleCurveY(t2);
    };
  }

  /**
   * Create spring animation
   * @param {HTMLElement} element - Element to animate
   * @param {Object} fromValues - Starting values
   * @param {Object} toValues - Target values
   * @param {Object} options - Spring options
   * @returns {Promise} Animation promise
   */
  spring(element, fromValues, toValues, options = {}) {
    const config = { ...this.physicsDefaults, ...options };
    const id = this.generateAnimationId();

    return new Promise(resolve => {
      const animate = () => {
        let allSettled = true;

        for (const property in toValues) {
          const current = parseFloat(element.style[property] || fromValues[property] || 0);
          const target = toValues[property];

          if (Math.abs(current - target) > 0.01) {
            allSettled = false;

            // Spring physics calculation
            const spring = this.calculateSpring(current, target, config);
            this.setElementProperty(
              element,
              property,
              spring.value + (toValues[property].toString().match(/[a-z%]+$/i)?.[0] || '')
            );
          }
        }

        if (allSettled) {
          this.animations.delete(id);
          this.emit('springComplete', { id, element });
          resolve();
        } else {
          globalMemoryManager.createAnimationFrame(animate);
        }
      };

      // Set initial values
      for (const property in fromValues) {
        this.setElementProperty(element, property, fromValues[property]);
      }

      this.animations.set(id, {
        id,
        element,
        type: 'spring',
        state: 'running',
        startTime: performance.now(),
      });

      globalMemoryManager.createAnimationFrame(animate);
    });
  }

  /**
   * Calculate spring physics
   * @param {number} current - Current value
   * @param {number} target - Target value
   * @param {Object} config - Spring configuration
   * @returns {Object} Spring calculation result
   */
  calculateSpring(current, target, config) {
    const displacement = target - current;
    const springForce = displacement * config.stiffness;
    const dampingForce = config.velocity * config.damping;

    const acceleration = (springForce - dampingForce) / config.mass;
    const newVelocity = config.velocity + acceleration * 0.016; // ~60fps
    const newValue = current + newVelocity * 0.016;

    return {
      value: newValue,
      velocity: newVelocity,
      settled: Math.abs(displacement) < 0.01 && Math.abs(newVelocity) < 0.01,
    };
  }

  /**
   * Stagger animations
   * @param {Array|NodeList} elements - Elements to animate
   * @param {Array|Object} keyframes - Animation keyframes
   * @param {Object} options - Animation options
   * @returns {Promise} Promise that resolves when all animations complete
   */
  stagger(elements, keyframes, options = {}) {
    const config = {
      delay: 100,
      direction: 'normal', // normal, reverse, center
      ...options,
    };

    const elementArray = Array.from(elements);
    const animations = [];

    elementArray.forEach((element, index) => {
      let staggerDelay;

      switch (config.direction) {
        case 'reverse':
          staggerDelay = (elementArray.length - 1 - index) * config.delay;
          break;
        case 'center': {
          const center = Math.floor(elementArray.length / 2);
          staggerDelay = Math.abs(index - center) * config.delay;
          break;
        }
        default:
          staggerDelay = index * config.delay;
      }

      const animationOptions = {
        ...options,
        delay: (options.delay || 0) + staggerDelay,
      };

      animations.push(this.animate(element, keyframes, animationOptions));
    });

    return Promise.all(animations);
  }

  /**
   * Create animation sequence
   * @param {Array} steps - Animation steps
   * @returns {Promise} Sequence promise
   */
  async sequence(steps) {
    const id = this.generateAnimationId();

    this.sequences.set(id, {
      id,
      steps,
      currentStep: 0,
      state: 'running',
    });

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        if (step.parallel) {
          // Run animations in parallel
          await Promise.all(
            step.animations.map(anim => this.animate(anim.element, anim.keyframes, anim.options))
          );
        } else {
          // Run animation sequentially
          await this.animate(step.element, step.keyframes, step.options);
        }

        // Update sequence progress
        const sequence = this.sequences.get(id);
        if (sequence) {
          sequence.currentStep = i + 1;
        }
      }

      this.sequences.delete(id);
      this.emit('sequenceComplete', { id });
    } catch (error) {
      this.sequences.delete(id);
      this.emit('sequenceError', { id, error });
      throw error;
    }
  }

  /**
   * Pause animation
   * @param {string} animationId - Animation ID
   */
  pauseAnimation(animationId) {
    const animationData = this.animations.get(animationId);
    if (animationData?.animation) {
      if (typeof animationData.animation.pause === 'function') {
        animationData.animation.pause();
        animationData.state = 'paused';
        this.emit('animationPaused', { id: animationId });
      }
    }
  }

  /**
   * Resume animation
   * @param {string} animationId - Animation ID
   */
  resumeAnimation(animationId) {
    const animationData = this.animations.get(animationId);
    if (animationData?.animation) {
      if (typeof animationData.animation.play === 'function') {
        animationData.animation.play();
        animationData.state = 'running';
        this.emit('animationResumed', { id: animationId });
      }
    }
  }

  /**
   * Cancel animation
   * @param {string} animationId - Animation ID
   */
  cancelAnimation(animationId) {
    const animationData = this.animations.get(animationId);
    if (animationData?.animation) {
      if (typeof animationData.animation.cancel === 'function') {
        animationData.animation.cancel();
      }
      this.animations.delete(animationId);
      this.emit('animationCancelled', { id: animationId });
    }
  }

  /**
   * Cancel all animations
   */
  cancelAllAnimations() {
    for (const [id] of this.animations) {
      this.cancelAnimation(id);
    }
  }

  /**
   * Handle animation completion
   * @param {string} id - Animation ID
   * @param {*} animation - Animation instance
   * @returns {Promise} Completion promise
   */
  handleAnimationCompletion(id, animation) {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.animations.delete(id);
        performance.mark(`animation-${id}-end`);
        performance.measure(`animation-${id}`, `animation-${id}-start`, `animation-${id}-end`);
      };

      if (animation.finished) {
        // Web Animation API
        animation.finished
          .then(() => {
            cleanup();
            this.emit('animationComplete', { id });
            resolve();
          })
          .catch(reject);
      } else if (animation.addEventListener) {
        // CSS Animation
        animation.addEventListener('animationend', () => {
          cleanup();
          this.emit('animationComplete', { id });
          resolve();
        });
      } else {
        // JavaScript animation - completion handled in createJSAnimation
        setTimeout(() => {
          cleanup();
          resolve();
        }, animation.duration || 300);
      }
    });
  }

  /**
   * Optimize element for GPU acceleration
   * @param {HTMLElement} element - Element to optimize
   */
  optimizeForGPU(element) {
    element.style.willChange = 'transform, opacity';
    element.style.transform = element.style.transform || 'translateZ(0)';
  }

  /**
   * Remove GPU optimization
   * @param {HTMLElement} element - Element to clean up
   */
  removeGPUOptimization(element) {
    element.style.willChange = 'auto';
    if (element.style.transform === 'translateZ(0)') {
      element.style.transform = '';
    }
  }

  /**
   * Check if user prefers reduced motion
   * @returns {boolean} Whether reduced motion is preferred
   */
  prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Handle reduced motion preference
   * @param {HTMLElement} element - Element to animate
   * @param {Array|Object} keyframes - Animation keyframes
   * @param {Object} options - Animation options
   * @returns {Promise} Reduced motion promise
   */
  handleReducedMotion(element, keyframes, _options) {
    // For reduced motion, apply final state immediately
    if (Array.isArray(keyframes) && keyframes.length > 0) {
      const finalFrame = keyframes[keyframes.length - 1];
      for (const property in finalFrame) {
        this.setElementProperty(element, property, finalFrame[property]);
      }
    } else if (typeof keyframes === 'object') {
      for (const property in keyframes) {
        const values = keyframes[property];
        if (Array.isArray(values)) {
          this.setElementProperty(element, property, values[values.length - 1]);
        }
      }
    }

    return Promise.resolve();
  }

  /**
   * Create keyframes CSS
   * @param {string} name - Animation name
   * @param {Array|Object} keyframes - Keyframes
   * @returns {string} CSS keyframes
   */
  createKeyframesCSS(name, keyframes) {
    let css = `@keyframes ${name} {\n`;

    if (Array.isArray(keyframes)) {
      keyframes.forEach((frame, index) => {
        const percentage = (index / (keyframes.length - 1)) * 100;
        css += `  ${percentage}% {\n`;
        for (const property in frame) {
          css += `    ${this.camelToKebab(property)}: ${frame[property]};\n`;
        }
        css += `  }\n`;
      });
    }

    css += `}\n`;
    return css;
  }

  /**
   * Inject CSS into document
   * @param {string} css - CSS to inject
   */
  injectCSS(css) {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Remove CSS animation
   * @param {string} animationName - Animation name to remove
   */
  removeCSS(animationName) {
    const styles = document.querySelectorAll('style');
    styles.forEach(style => {
      if (style.textContent.includes(`@keyframes ${animationName}`)) {
        style.remove();
      }
    });
  }

  /**
   * Convert camelCase to kebab-case
   * @param {string} str - CamelCase string
   * @returns {string} kebab-case string
   */
  camelToKebab(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Generate animation ID
   * @returns {string} Unique animation ID
   */
  generateAnimationId() {
    return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get animation statistics
   * @returns {Object} Animation statistics
   */
  getStats() {
    return {
      activeAnimations: this.animations.size,
      activeSequences: this.sequences.size,
      fps: this.fps,
      frameCount: this.frameCount,
      isUsingWebAnimations: this.options.useWebAnimations,
      prefersReducedMotion: this.prefersReducedMotion(),
    };
  }

  /**
   * Component cleanup
   */
  onDestroy() {
    this.cancelAllAnimations();

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    this.animations.clear();
    this.sequences.clear();
    this.timelines.clear();
  }
}

// Global animation manager instance
export const globalAnimationManager = new AnimationManager({
  enablePerformanceMonitoring: true,
  adaptiveQuality: true,
  respectReducedMotion: true,
});

export default AnimationManager;
