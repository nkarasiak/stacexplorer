/**
 * Performance monitoring and optimization utilities
 */

export class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = new Map();
        this.isEnabled = process.env.NODE_ENV === 'development';
    }
    
    /**
     * Start performance measurement
     * @param {string} name - Measurement name
     */
    mark(name) {
        if (!this.isEnabled) return;
        
        performance.mark(`${name}-start`);
    }
    
    /**
     * End performance measurement
     * @param {string} name - Measurement name
     */
    measure(name) {
        if (!this.isEnabled) return;
        
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        
        const measure = performance.getEntriesByName(name)[0];
        this.metrics.set(name, measure.duration);
        
        console.log(`⏱️ ${name}: ${measure.duration.toFixed(2)}ms`);
    }
    
    /**
     * Monitor Core Web Vitals
     */
    observeWebVitals() {
        if (!this.isEnabled || typeof PerformanceObserver === 'undefined') return;
        
        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            console.log('🎨 LCP:', lastEntry.startTime.toFixed(2) + 'ms');
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        
        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                console.log('👆 FID:', entry.processingStart - entry.startTime + 'ms');
            });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        
        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
            let clsValue = 0;
            list.getEntries().forEach((entry) => {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            });
            console.log('📏 CLS:', clsValue.toFixed(4));
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
    
    /**
     * Monitor memory usage
     */
    logMemoryUsage() {
        if (!this.isEnabled || !performance.memory) return;
        
        const memory = performance.memory;
        console.log('🧠 Memory:', {
            used: Math.round(memory.usedJSHeapSize / 1048576) + 'MB',
            total: Math.round(memory.totalJSHeapSize / 1048576) + 'MB',
            limit: Math.round(memory.jsHeapSizeLimit / 1048576) + 'MB'
        });
    }
    
    /**
     * Get performance summary
     */
    getSummary() {
        return Object.fromEntries(this.metrics);
    }
}

/**
 * Debounce utility for performance optimization
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle utility for performance optimization
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Lazy loading utility for images
 * @param {string} selector - CSS selector for images to lazy load
 */
export function setupLazyLoading(selector = 'img[data-src]') {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll(selector).forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// Initialize performance monitoring
export const performanceMonitor = new PerformanceMonitor();
