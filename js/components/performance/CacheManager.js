import { BaseUIComponent } from '../base/BaseUIComponent.js';

export class CacheManager extends BaseUIComponent {
    constructor(options = {}) {
        super(null, options);
    }

    getDefaultOptions() {
        return {
            maxMemorySize: 50 * 1024 * 1024, // 50MB
            maxDiskSize: 200 * 1024 * 1024, // 200MB
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            cleanupInterval: 60 * 60 * 1000, // 1 hour
            compressionLevel: 6, // 1-9, higher = better compression
            enableDiskCache: true,
            enableMemoryCache: true,
            enableCompression: true,
            cacheStrategy: 'lru', // lru, lfu, fifo
            preloadStrategy: 'predictive', // predictive, aggressive, conservative
            enableMetrics: true,
            enableServiceWorker: true
        };
    }

    getInitialState() {
        return {
            memoryCache: new Map(),
            memoryCacheSize: 0,
            diskCacheSize: 0,
            accessCounts: new Map(),
            lastAccessed: new Map(),
            requestQueue: new Map(),
            prefetchQueue: [],
            metrics: {
                hits: 0,
                misses: 0,
                evictions: 0,
                compressionRatio: 0,
                averageResponseTime: 0,
                totalRequests: 0
            },
            cleanupInterval: null,
            serviceWorkerRegistration: null
        };
    }

    async init() {
        await this.initializeStorages();
        this.startCleanupTimer();
        await this.registerServiceWorker();
        this.attachPerformanceObserver();
        this.setupPreloadStrategies();
    }

    async initializeStorages() {
        if (this.options.enableDiskCache) {
            try {
                if ('storage' in navigator && 'estimate' in navigator.storage) {
                    const estimate = await navigator.storage.estimate();
                    this.diskQuota = estimate.quota;
                    this.diskUsed = estimate.usage;
                }

                this.db = await this.openIndexedDB();
            } catch (error) {
                console.warn('Disk cache initialization failed:', error);
                this.options.enableDiskCache = false;
            }
        }
    }

    openIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('STACExplorerCache', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('cache')) {
                    const store = db.createObjectStore('cache', { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp');
                    store.createIndex('size', 'size');
                    store.createIndex('type', 'type');
                }
                
                if (!db.objectStoreNames.contains('metadata')) {
                    const metaStore = db.createObjectStore('metadata', { keyPath: 'key' });
                    metaStore.createIndex('lastAccessed', 'lastAccessed');
                    metaStore.createIndex('accessCount', 'accessCount');
                }
            };
        });
    }

    async registerServiceWorker() {
        if (!this.options.enableServiceWorker || !('serviceWorker' in navigator)) {
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register('/sw-cache.js');
            this.state.serviceWorkerRegistration = registration;
            
            registration.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
        } catch (error) {
            console.warn('Service Worker registration failed:', error);
        }
    }

    handleServiceWorkerMessage(event) {
        const { type, data } = event.data;
        
        switch (type) {
            case 'cache-hit':
                this.updateMetrics('hit');
                break;
            case 'cache-miss':
                this.updateMetrics('miss');
                break;
            case 'prefetch-complete':
                this.handlePrefetchComplete(data);
                break;
        }
    }

    generateCacheKey(url, options = {}) {
        const params = new URLSearchParams(options.params || {});
        const sortedParams = Array.from(params.entries()).sort();
        const paramsString = new URLSearchParams(sortedParams).toString();
        
        return `${url}${paramsString ? '?' + paramsString : ''}`;
    }

    async get(url, options = {}) {
        const key = this.generateCacheKey(url, options);
        const startTime = performance.now();

        try {
            // Check memory cache first
            if (this.options.enableMemoryCache) {
                const memoryResult = this.getFromMemory(key);
                if (memoryResult) {
                    this.updateAccessPattern(key);
                    this.updateMetrics('hit', performance.now() - startTime);
                    return memoryResult;
                }
            }

            // Check disk cache
            if (this.options.enableDiskCache) {
                const diskResult = await this.getFromDisk(key);
                if (diskResult) {
                    // Promote to memory cache
                    if (this.options.enableMemoryCache) {
                        this.setInMemory(key, diskResult, { skipDisk: true });
                    }
                    this.updateAccessPattern(key);
                    this.updateMetrics('hit', performance.now() - startTime);
                    return diskResult;
                }
            }

            // Cache miss - fetch from network
            this.updateMetrics('miss', performance.now() - startTime);
            const networkResult = await this.fetchFromNetwork(url, options);
            
            // Cache the result
            await this.set(key, networkResult, options);
            
            return networkResult;

        } catch (error) {
            this.updateMetrics('miss', performance.now() - startTime);
            throw error;
        }
    }

    getFromMemory(key) {
        const entry = this.state.memoryCache.get(key);
        if (!entry) return null;

        if (this.isExpired(entry)) {
            this.removeFromMemory(key);
            return null;
        }

        return this.deserializeData(entry.data, entry.metadata.compressed);
    }

    async getFromDisk(key) {
        if (!this.db) return null;

        try {
            const transaction = this.db.transaction(['cache'], 'readonly');
            const store = transaction.objectStore('cache');
            const request = store.get(key);

            return new Promise((resolve) => {
                request.onsuccess = () => {
                    const entry = request.result;
                    if (!entry || this.isExpired(entry)) {
                        resolve(null);
                        return;
                    }

                    const data = this.deserializeData(entry.data, entry.metadata.compressed);
                    resolve(data);
                };
                request.onerror = () => resolve(null);
            });
        } catch (error) {
            console.warn('Disk cache read error:', error);
            return null;
        }
    }

    async fetchFromNetwork(url, options = {}) {
        // Check if request is already in flight
        if (this.state.requestQueue.has(url)) {
            return this.state.requestQueue.get(url);
        }

        const fetchPromise = this.performNetworkRequest(url, options);
        this.state.requestQueue.set(url, fetchPromise);

        try {
            const result = await fetchPromise;
            return result;
        } finally {
            this.state.requestQueue.delete(url);
        }
    }

    async performNetworkRequest(url, options = {}) {
        const fetchOptions = {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                ...options.headers
            },
            ...options.fetchOptions
        };

        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let data;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else if (contentType && contentType.startsWith('text/')) {
            data = await response.text();
        } else {
            data = await response.arrayBuffer();
        }

        return {
            data,
            metadata: {
                url,
                contentType,
                status: response.status,
                headers: Object.fromEntries(response.headers.entries()),
                timestamp: Date.now()
            }
        };
    }

    async set(key, data, options = {}) {
        const entry = {
            key,
            data: data.data,
            metadata: {
                ...data.metadata,
                timestamp: Date.now(),
                expires: Date.now() + (options.maxAge || this.options.maxAge),
                size: this.calculateSize(data.data),
                compressed: false,
                type: this.getDataType(data.data)
            }
        };

        // Compress if enabled and beneficial
        if (this.options.enableCompression && entry.metadata.size > 1024) {
            const compressed = await this.compressData(entry.data);
            if (compressed.length < entry.metadata.size * 0.8) {
                entry.data = compressed;
                entry.metadata.compressed = true;
                entry.metadata.compressionRatio = compressed.length / entry.metadata.size;
            }
        }

        // Store in memory cache
        if (this.options.enableMemoryCache && !options.skipMemory) {
            this.setInMemory(key, entry, options);
        }

        // Store in disk cache
        if (this.options.enableDiskCache && !options.skipDisk) {
            await this.setInDisk(key, entry);
        }

        this.updateAccessPattern(key);
    }

    setInMemory(key, entry, options = {}) {
        // Check if we need to make space
        while (this.state.memoryCacheSize + entry.metadata.size > this.options.maxMemorySize) {
            if (!this.evictFromMemory()) break;
        }

        this.state.memoryCache.set(key, entry);
        this.state.memoryCacheSize += entry.metadata.size;
    }

    async setInDisk(key, entry) {
        if (!this.db) return;

        try {
            // Check if we need to make space
            if (this.state.diskCacheSize + entry.metadata.size > this.options.maxDiskSize) {
                await this.evictFromDisk();
            }

            const transaction = this.db.transaction(['cache', 'metadata'], 'readwrite');
            const cacheStore = transaction.objectStore('cache');
            const metaStore = transaction.objectStore('metadata');

            await Promise.all([
                new Promise((resolve, reject) => {
                    const request = cacheStore.put(entry);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                }),
                new Promise((resolve, reject) => {
                    const metaRequest = metaStore.put({
                        key,
                        lastAccessed: Date.now(),
                        accessCount: 1,
                        size: entry.metadata.size
                    });
                    metaRequest.onsuccess = () => resolve();
                    metaRequest.onerror = () => reject(request.error);
                })
            ]);

            this.state.diskCacheSize += entry.metadata.size;
        } catch (error) {
            console.warn('Disk cache write error:', error);
        }
    }

    evictFromMemory() {
        if (this.state.memoryCache.size === 0) return false;

        let keyToEvict;
        
        switch (this.options.cacheStrategy) {
            case 'lru':
                keyToEvict = this.findLRUKey();
                break;
            case 'lfu':
                keyToEvict = this.findLFUKey();
                break;
            case 'fifo':
                keyToEvict = this.state.memoryCache.keys().next().value;
                break;
            default:
                keyToEvict = this.findLRUKey();
        }

        if (keyToEvict) {
            this.removeFromMemory(keyToEvict);
            this.state.metrics.evictions++;
            return true;
        }

        return false;
    }

    async evictFromDisk() {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['cache', 'metadata'], 'readwrite');
            const cacheStore = transaction.objectStore('cache');
            const metaStore = transaction.objectStore('metadata');

            // Find oldest entries to evict
            const index = metaStore.index('lastAccessed');
            const request = index.openCursor();

            let evictedSize = 0;
            const targetSize = this.options.maxDiskSize * 0.1; // Evict 10% of cache

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && evictedSize < targetSize) {
                    const key = cursor.value.key;
                    evictedSize += cursor.value.size;
                    
                    cacheStore.delete(key);
                    metaStore.delete(key);
                    
                    cursor.continue();
                } else {
                    this.state.diskCacheSize -= evictedSize;
                }
            };
        } catch (error) {
            console.warn('Disk cache eviction error:', error);
        }
    }

    findLRUKey() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key] of this.state.memoryCache) {
            const lastAccessed = this.state.lastAccessed.get(key) || 0;
            if (lastAccessed < oldestTime) {
                oldestTime = lastAccessed;
                oldestKey = key;
            }
        }

        return oldestKey;
    }

    findLFUKey() {
        let leastUsedKey = null;
        let leastCount = Infinity;

        for (const [key] of this.state.memoryCache) {
            const accessCount = this.state.accessCounts.get(key) || 0;
            if (accessCount < leastCount) {
                leastCount = accessCount;
                leastUsedKey = key;
            }
        }

        return leastUsedKey;
    }

    removeFromMemory(key) {
        const entry = this.state.memoryCache.get(key);
        if (entry) {
            this.state.memoryCache.delete(key);
            this.state.memoryCacheSize -= entry.metadata.size;
        }
    }

    updateAccessPattern(key) {
        const now = Date.now();
        this.state.lastAccessed.set(key, now);
        this.state.accessCounts.set(key, (this.state.accessCounts.get(key) || 0) + 1);
    }

    isExpired(entry) {
        return entry.metadata.expires && Date.now() > entry.metadata.expires;
    }

    calculateSize(data) {
        if (typeof data === 'string') {
            return new Blob([data]).size;
        } else if (data instanceof ArrayBuffer) {
            return data.byteLength;
        } else {
            return new Blob([JSON.stringify(data)]).size;
        }
    }

    getDataType(data) {
        if (typeof data === 'string') return 'text';
        if (data instanceof ArrayBuffer) return 'binary';
        if (Array.isArray(data)) return 'array';
        if (typeof data === 'object') return 'object';
        return 'unknown';
    }

    async compressData(data) {
        if (!('CompressionStream' in window)) {
            return data; // Fallback for browsers without compression support
        }

        try {
            const stream = new CompressionStream('gzip');
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();

            const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(dataStr);

            writer.write(uint8Array);
            writer.close();

            const compressed = [];
            let done = false;

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) compressed.push(value);
            }

            return new Uint8Array(compressed.reduce((acc, chunk) => [...acc, ...chunk], []));
        } catch (error) {
            console.warn('Compression failed:', error);
            return data;
        }
    }

    deserializeData(data, compressed = false) {
        if (!compressed) return data;

        if (!('DecompressionStream' in window)) {
            return data; // Fallback
        }

        try {
            // This is a simplified version - in practice you'd need to handle async decompression
            return data;
        } catch (error) {
            console.warn('Decompression failed:', error);
            return data;
        }
    }

    // Prefetching strategies
    setupPreloadStrategies() {
        if (this.options.preloadStrategy === 'predictive') {
            this.setupPredictivePreloading();
        } else if (this.options.preloadStrategy === 'aggressive') {
            this.setupAggressivePreloading();
        }
    }

    setupPredictivePreloading() {
        // Monitor user interactions to predict next requests
        document.addEventListener('mouseover', this.handlePredictiveHover.bind(this));
        window.addEventListener('scroll', this.handlePredictiveScroll.bind(this));
    }

    handlePredictiveHover(event) {
        const link = event.target.closest('a[href]');
        if (link) {
            const url = link.href;
            this.schedulePrefetch(url, { priority: 'low', delay: 100 });
        }
    }

    handlePredictiveScroll() {
        // Prefetch content that's about to come into view
        const viewportHeight = window.innerHeight;
        const scrollTop = window.scrollY;
        const documentHeight = document.documentElement.scrollHeight;
        
        const scrollPercentage = (scrollTop + viewportHeight) / documentHeight;
        
        if (scrollPercentage > 0.8) {
            this.prefetchNextPage();
        }
    }

    schedulePrefetch(url, options = {}) {
        const existing = this.state.prefetchQueue.find(item => item.url === url);
        if (existing) return;

        const prefetchItem = {
            url,
            priority: options.priority || 'low',
            delay: options.delay || 0,
            timestamp: Date.now()
        };

        this.state.prefetchQueue.push(prefetchItem);
        
        if (options.delay > 0) {
            setTimeout(() => {
                this.executePrefetch(prefetchItem);
            }, options.delay);
        } else {
            this.executePrefetch(prefetchItem);
        }
    }

    async executePrefetch(prefetchItem) {
        try {
            await this.get(prefetchItem.url, { prefetch: true });
            this.state.prefetchQueue = this.state.prefetchQueue.filter(item => item !== prefetchItem);
        } catch (error) {
            console.warn('Prefetch failed:', error);
        }
    }

    prefetchNextPage() {
        // Implementation depends on your STAC pagination strategy
        // This is a placeholder that would be customized for your app
    }

    updateMetrics(type, responseTime = 0) {
        if (!this.options.enableMetrics) return;

        this.state.metrics.totalRequests++;
        
        if (type === 'hit') {
            this.state.metrics.hits++;
        } else if (type === 'miss') {
            this.state.metrics.misses++;
        }

        // Update average response time
        const currentAvg = this.state.metrics.averageResponseTime;
        const totalRequests = this.state.metrics.totalRequests;
        this.state.metrics.averageResponseTime = (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;
    }

    attachPerformanceObserver() {
        if (!this.options.enableMetrics || !('PerformanceObserver' in window)) return;

        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'resource') {
                        this.analyzePerformanceEntry(entry);
                    }
                }
            });

            observer.observe({ entryTypes: ['resource'] });
        } catch (error) {
            console.warn('Performance observer setup failed:', error);
        }
    }

    analyzePerformanceEntry(entry) {
        // Analyze network requests and cache effectiveness
        if (entry.transferSize === 0 && entry.decodedBodySize > 0) {
            // Likely a cache hit
            this.updateMetrics('hit');
        }
    }

    startCleanupTimer() {
        this.state.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, this.options.cleanupInterval);
    }

    async performCleanup() {
        const now = Date.now();
        
        // Clean memory cache
        for (const [key, entry] of this.state.memoryCache) {
            if (this.isExpired(entry)) {
                this.removeFromMemory(key);
            }
        }

        // Clean disk cache
        if (this.options.enableDiskCache && this.db) {
            await this.cleanupDiskCache();
        }

        // Clean access patterns for removed entries
        for (const key of this.state.lastAccessed.keys()) {
            if (!this.state.memoryCache.has(key)) {
                this.state.lastAccessed.delete(key);
                this.state.accessCounts.delete(key);
            }
        }
    }

    async cleanupDiskCache() {
        try {
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const index = store.index('timestamp');
            
            const now = Date.now();
            const cutoff = now - this.options.maxAge;
            
            const range = IDBKeyRange.upperBound(cutoff);
            const request = index.openCursor(range);

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
        } catch (error) {
            console.warn('Disk cache cleanup error:', error);
        }
    }

    // Public API methods
    async clear(pattern) {
        if (pattern) {
            // Clear entries matching pattern
            const regex = new RegExp(pattern);
            for (const [key] of this.state.memoryCache) {
                if (regex.test(key)) {
                    this.removeFromMemory(key);
                }
            }
            
            if (this.options.enableDiskCache) {
                await this.clearDiskPattern(pattern);
            }
        } else {
            // Clear all
            this.state.memoryCache.clear();
            this.state.memoryCacheSize = 0;
            
            if (this.options.enableDiskCache && this.db) {
                const transaction = this.db.transaction(['cache', 'metadata'], 'readwrite');
                transaction.objectStore('cache').clear();
                transaction.objectStore('metadata').clear();
                this.state.diskCacheSize = 0;
            }
        }
    }

    async clearDiskPattern(pattern) {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const request = store.openCursor();
            const regex = new RegExp(pattern);

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (regex.test(cursor.value.key)) {
                        cursor.delete();
                    }
                    cursor.continue();
                }
            };
        } catch (error) {
            console.warn('Pattern-based disk cache clear error:', error);
        }
    }

    getStats() {
        const hitRate = this.state.metrics.totalRequests > 0 
            ? (this.state.metrics.hits / this.state.metrics.totalRequests * 100).toFixed(2)
            : 0;

        return {
            ...this.state.metrics,
            hitRate: `${hitRate}%`,
            memoryCacheSize: this.formatBytes(this.state.memoryCacheSize),
            diskCacheSize: this.formatBytes(this.state.diskCacheSize),
            memoryEntries: this.state.memoryCache.size,
            queuedPrefetches: this.state.prefetchQueue.length
        };
    }

    formatBytes(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    destroy() {
        if (this.state.cleanupInterval) {
            clearInterval(this.state.cleanupInterval);
        }

        if (this.state.serviceWorkerRegistration) {
            this.state.serviceWorkerRegistration.removeEventListener('message', this.handleServiceWorkerMessage);
        }

        if (this.db) {
            this.db.close();
        }

        super.destroy();
    }
}

export const cacheManager = new CacheManager();