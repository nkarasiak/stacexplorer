/**
 * LazyImageLoader - Optimized image loading for mobile performance
 * Uses Intersection Observer API for efficient lazy loading
 */

export class LazyImageLoader {
    constructor(options = {}) {
        this.options = {
            rootMargin: '50px 0px', // Load images 50px before they enter viewport
            threshold: 0.01,
            fadeInDuration: 300,
            retryAttempts: 2,
            retryDelay: 1000,
            placeholder: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PC9zdmc+',
            dataSaverMode: false, // Will be auto-detected
            ...options
        };
        
        this.observer = null;
        this.imageCache = new Map();
        this.retryQueue = new Map();
        this.dataSaverMode = this.detectDataSaverMode();
        
        this.init();
    }
    
    init() {
        // Check for Intersection Observer support
        if (!('IntersectionObserver' in window)) {
            // Fallback for older browsers - load all images immediately
            this.loadAllImages();
            return;
        }
        
        this.observer = new IntersectionObserver(
            this.handleIntersection.bind(this),
            this.options
        );
    }
    
    /**
     * Add images to be lazy loaded
     * @param {HTMLElement|NodeList|Array} elements - Image elements or containers
     */
    observe(elements) {
        if (!this.observer) return;
        
        const imageElements = this.getImageElements(elements);
        
        imageElements.forEach(img => {
            // Set up lazy loading attributes
            this.setupLazyImage(img);
            
            // Start observing
            this.observer.observe(img);
        });
    }
    
    /**
     * Stop observing specific elements
     * @param {HTMLElement|NodeList|Array} elements 
     */
    unobserve(elements) {
        if (!this.observer) return;
        
        const imageElements = this.getImageElements(elements);
        imageElements.forEach(img => {
            this.observer.unobserve(img);
            
            // Clean up blob URLs to prevent memory leaks
            if (img.src && img.src.startsWith('blob:')) {
                URL.revokeObjectURL(img.src);
            }
        });
    }
    
    /**
     * Handle intersection events
     * @param {IntersectionObserverEntry[]} entries 
     */
    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                this.loadImage(img);
                this.observer.unobserve(img);
            }
        });
    }
    
    /**
     * Set up lazy loading for an image element
     * @param {HTMLImageElement} img 
     */
    setupLazyImage(img) {
        const originalSrc = img.src || img.dataset.src;
        
        if (!originalSrc) return;
        
        // Store original src in data attribute
        img.dataset.src = originalSrc;
        
        // Set placeholder
        img.src = this.options.placeholder;
        
        // Add loading class
        img.classList.add('lazy-loading');
        
        // Add error handling
        img.addEventListener('error', () => this.handleImageError(img));
        
        // Add load success handling
        img.addEventListener('load', () => this.handleImageLoad(img));
    }
    
    /**
     * Load an image with caching and retry logic
     * @param {HTMLImageElement} img 
     */
    async loadImage(img) {
        const src = img.dataset.src;
        if (!src) return;
        
        try {
            // Check cache first
            if (this.imageCache.has(src)) {
                const cachedBlob = this.imageCache.get(src);
                if (cachedBlob === 'failed') {
                    // Previously failed, try direct loading
                    this.loadImageDirect(img, src);
                    return;
                }
                if (cachedBlob === 'direct') {
                    // Previously loaded directly, try direct loading again
                    this.loadImageDirect(img, src);
                    return;
                }
                // Try to use cached blob with error handling
                try {
                    if (cachedBlob instanceof Blob) {
                        img.src = URL.createObjectURL(cachedBlob);
                        return;
                    }
                } catch (urlError) {
                    console.warn('Failed to use cached blob, trying direct loading:', urlError.message);
                    this.loadImageDirect(img, src);
                    return;
                }
            }
            
            // Try fetch first (for caching), fall back to direct loading if CORS fails
            try {
                const blob = await this.fetchImageWithTimeout(src, 10000);
                
                // Validate blob before using it
                if (!blob || blob.size === 0 || !blob.type.startsWith('image/')) {
                    console.warn('Invalid blob received, trying direct loading:', src);
                    this.loadImageDirect(img, src);
                    return;
                }
                
                // Cache the blob
                this.imageCache.set(src, blob);
                
                // Set image source with error handling for createObjectURL
                try {
                    img.src = URL.createObjectURL(blob);
                } catch (urlError) {
                    console.warn('Failed to create object URL, trying direct loading:', urlError.message);
                    this.loadImageDirect(img, src);
                    return;
                }
                
            } catch (fetchError) {
                // If fetch fails (likely CORS), try direct image loading
                console.warn('Fetch failed, trying direct image loading:', fetchError.message);
                this.loadImageDirect(img, src);
            }
            
        } catch (error) {
            console.warn('Failed to load image:', src, error);
            this.handleImageError(img);
        }
    }
    
    /**
     * Load image directly without fetch (fallback for CORS issues)
     * @param {HTMLImageElement} img 
     * @param {string} src 
     */
    loadImageDirect(img, src) {
        // Set up error handling before setting src
        const errorHandler = () => {
            console.warn('Direct image loading also failed:', src);
            this.imageCache.set(src, 'failed'); // Mark as failed in cache
            this.handleImageError(img);
        };
        
        const loadHandler = () => {
            // Successfully loaded directly
            this.imageCache.set(src, 'direct'); // Mark as loaded directly
            img.removeEventListener('error', errorHandler);
            img.removeEventListener('load', loadHandler);
            this.handleImageLoad(img);
        };
        
        img.addEventListener('error', errorHandler, { once: true });
        img.addEventListener('load', loadHandler, { once: true });
        
        // Set the source directly
        img.src = src;
    }
    
    /**
     * Fetch image with timeout and retry logic
     * @param {string} url 
     * @param {number} timeout 
     */
    async fetchImageWithTimeout(url, timeout = 10000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                mode: 'cors',
                cache: 'force-cache' // Use browser cache when available
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            
            // Validate blob
            if (!blob || blob.size === 0) {
                throw new Error('Empty or invalid blob received');
            }
            
            return blob;
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    /**
     * Handle successful image load
     * @param {HTMLImageElement} img 
     */
    handleImageLoad(img) {
        img.classList.remove('lazy-loading');
        img.classList.add('lazy-loaded');
        
        // Fade in animation
        if (this.options.fadeInDuration > 0) {
            img.style.opacity = '0';
            img.style.transition = `opacity ${this.options.fadeInDuration}ms ease-in-out`;
            
            // Trigger fade in on next frame
            requestAnimationFrame(() => {
                img.style.opacity = '1';
            });
        }
    }
    
    /**
     * Handle image load errors with retry logic
     * @param {HTMLImageElement} img 
     */
    handleImageError(img) {
        const src = img.dataset.src;
        const retryCount = this.retryQueue.get(src) || 0;
        
        if (retryCount < this.options.retryAttempts) {
            // Schedule retry
            this.retryQueue.set(src, retryCount + 1);
            
            setTimeout(() => {
                console.log(`Retrying image load (attempt ${retryCount + 1}):`, src);
                this.loadImage(img);
            }, this.options.retryDelay * (retryCount + 1)); // Exponential backoff
            
        } else {
            // Max retries reached - show error state
            img.classList.remove('lazy-loading');
            img.classList.add('lazy-error');
            
            // Show fallback image or hide
            const container = img.closest('.thumbnail-container');
            if (container) {
                container.style.display = 'none';
            }
        }
    }
    
    /**
     * Get image elements from various input types
     * @param {HTMLElement|NodeList|Array} elements 
     */
    getImageElements(elements) {
        let imageElements = [];
        
        if (elements instanceof HTMLImageElement) {
            imageElements = [elements];
        } else if (elements instanceof HTMLElement) {
            // Find images within the element
            imageElements = Array.from(elements.querySelectorAll('img[src], img[data-src]'));
        } else if (elements instanceof NodeList || Array.isArray(elements)) {
            elements.forEach(el => {
                if (el instanceof HTMLImageElement) {
                    imageElements.push(el);
                } else if (el instanceof HTMLElement) {
                    imageElements.push(...el.querySelectorAll('img[src], img[data-src]'));
                }
            });
        }
        
        return imageElements;
    }
    
    /**
     * Fallback for browsers without Intersection Observer
     */
    loadAllImages() {
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => {
            img.src = img.dataset.src;
        });
    }
    
    /**
     * Detect data saver mode and network conditions
     */
    detectDataSaverMode() {
        // Check for Save-Data header support
        if ('connection' in navigator) {
            const connection = navigator.connection;
            
            // Data saver is explicitly enabled
            if (connection.saveData) {
                console.log('📡 Data saver mode detected - reducing image quality');
                return true;
            }
            
            // Slow connection detected
            if (connection.effectiveType && 
                (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
                console.log('📡 Slow connection detected - enabling data saver mode');
                return true;
            }
        }
        
        // Check user agent for mobile browsers
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile && window.innerWidth <= 768) {
            console.log('📱 Mobile device detected - optimizing for mobile');
            return true;
        }
        
        return false;
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        // Clean up cached blobs
        this.imageCache.forEach(cached => {
            if (cached instanceof Blob) {
                URL.revokeObjectURL(cached);
            }
            // String values ('failed', 'direct') don't need cleanup
        });
        
        this.imageCache.clear();
        this.retryQueue.clear();
    }
    
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            cacheSize: this.imageCache.size,
            retryQueueSize: this.retryQueue.size
        };
    }
}

// Create and export a default instance
export const lazyImageLoader = new LazyImageLoader({
    rootMargin: '100px 0px', // Load images 100px before entering viewport
    fadeInDuration: 200,
    retryAttempts: 3,
    retryDelay: 1000
});

// Auto-initialize for images with data-lazy attribute
document.addEventListener('DOMContentLoaded', () => {
    const lazyImages = document.querySelectorAll('img[data-lazy]');
    if (lazyImages.length > 0) {
        lazyImageLoader.observe(lazyImages);
    }
});