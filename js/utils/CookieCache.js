/**
 * CookieCache.js - Cookie-based caching utility with compression and expiration
 * Handles large data storage in cookies with automatic compression and cleanup
 */

export class CookieCache {
    constructor() {
        this.maxCookieSize = 4000; // Safe cookie size limit
        this.compressionThreshold = 1000; // Compress data larger than this
    }

    /**
     * Set cached data with expiration
     * @param {string} key - Cache key
     * @param {*} data - Data to cache
     * @param {number} expirationDays - Days until expiration (default: 30)
     */
    set(key, data, expirationDays = 30) {
        try {
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + expirationDays);
            
            const cacheEntry = {
                data: data,
                timestamp: Date.now(),
                expires: expirationDate.getTime(),
                version: '1.0' // For future compatibility
            };

            let serializedData = JSON.stringify(cacheEntry);
            
            // For large data (like collections), use localStorage instead of cookies
            if (serializedData.length > this.maxCookieSize || key.includes('collections_cache')) {
                try {
                    localStorage.setItem(`stac_${key}`, serializedData);
                    return;
                } catch (localStorageError) {
                    console.warn('[CACHE] localStorage failed, trying cookie fallback:', localStorageError.message);
                    // Fall through to cookie logic below
                }
            }
            
            // If data is large, try to compress it
            if (serializedData.length > this.compressionThreshold) {
                serializedData = this.compressData(serializedData);
            }

            // Check if data fits in cookie size limit
            if (serializedData.length > this.maxCookieSize) {
                // Split into multiple cookies if needed
                this.setLargeData(key, serializedData, expirationDate);
                return;
            }

            // Set single cookie
            document.cookie = `${key}=${encodeURIComponent(serializedData)}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
            
            
        } catch (error) {
            console.error('[CACHE] Error setting cache:', error);
        }
    }

    /**
     * Get cached data if not expired
     * @param {string} key - Cache key
     * @returns {*} Cached data or null if not found/expired
     */
    get(key) {
        try {
            let serializedData = null;
            
            // First try localStorage for collections or large data
            if (key.includes('collections_cache')) {
                try {
                    serializedData = localStorage.getItem(`stac_${key}`);
                    if (serializedData) {
                        const parsedData = JSON.parse(serializedData);
                        return parsedData;
                    }
                } catch (localStorageError) {
                    console.warn('[CACHE] localStorage read failed:', localStorageError.message);
                }
            }
            
            // If not found in localStorage, try single cookie
            if (!serializedData) {
                serializedData = this.getCookieValue(key);
            }
            
            // If not found, try multi-part cookies
            if (!serializedData) {
                serializedData = this.getLargeData(key);
            }
            
            if (!serializedData) {
                return null;
            }

            // Decompress if needed
            if (serializedData.startsWith('LZ77:')) {
                serializedData = this.decompressData(serializedData);
            }

            const cacheEntry = JSON.parse(serializedData.startsWith('%') ? decodeURIComponent(serializedData) : serializedData);
            
            // Check expiration
            if (Date.now() > cacheEntry.expires) {
                this.remove(key);
                return null;
            }

            return cacheEntry.data;
            
        } catch (error) {
            console.error('[CACHE] Error getting cache:', error);
            this.remove(key); // Remove corrupted cache
            return null;
        }
    }

    /**
     * Remove cached data
     * @param {string} key - Cache key
     */
    remove(key) {
        try {
            // Remove from localStorage if collections cache
            if (key.includes('collections_cache')) {
                try {
                    localStorage.removeItem(`stac_${key}`);
                } catch (localStorageError) {
                    console.warn('[CACHE] localStorage remove failed:', localStorageError.message);
                }
            }
            
            // Remove main cookie
            document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
            
            // Remove any multi-part cookies
            let partIndex = 0;
            while (this.getCookieValue(`${key}_part${partIndex}`)) {
                document.cookie = `${key}_part${partIndex}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
                partIndex++;
            }
            
        } catch (error) {
            console.error('[CACHE] Error removing cache:', error);
        }
    }

    /**
     * Check if cached data exists and is valid
     * @param {string} key - Cache key
     * @returns {boolean} True if valid cache exists
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Clear all cached data
     */
    clearAll() {
        try {
            // Clear localStorage items
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('stac_') || key.includes('collections_cache'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
            
            // Clear cookies
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name] = cookie.trim().split('=');
                if (name.includes('stac_cache_') || name.includes('collections_cache')) {
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
                }
            }
        } catch (error) {
            console.error('[CACHE] Error clearing cache:', error);
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        const stats = {
            totalCookies: 0,
            totalLocalStorage: 0,
            totalSize: 0,
            localStorageSize: 0,
            cacheKeys: [],
            localStorageKeys: []
        };

        try {
            // Count localStorage items
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('stac_') || key.includes('collections_cache'))) {
                    const value = localStorage.getItem(key);
                    stats.totalLocalStorage++;
                    stats.localStorageSize += (value || '').length;
                    stats.localStorageKeys.push(key);
                }
            }
            
            // Count cookies
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name.includes('stac_cache_') || name.includes('collections_cache')) {
                    stats.totalCookies++;
                    stats.totalSize += (value || '').length;
                    if (!name.includes('_part')) {
                        stats.cacheKeys.push(name);
                    }
                }
            }
            
            stats.totalSize += stats.localStorageSize;
        } catch (error) {
            console.error('[CACHE] Error getting stats:', error);
        }

        return stats;
    }

    // Private helper methods

    /**
     * Get cookie value by name
     * @param {string} name - Cookie name
     * @returns {string|null} Cookie value or null
     */
    getCookieValue(name) {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [cookieName, cookieValue] = cookie.trim().split('=');
            if (cookieName === name) {
                return cookieValue || null;
            }
        }
        return null;
    }

    /**
     * Store large data across multiple cookies
     * @param {string} key - Cache key
     * @param {string} data - Serialized data
     * @param {Date} expirationDate - Expiration date
     */
    setLargeData(key, data, expirationDate) {
        try {
            const chunkSize = this.maxCookieSize - 100; // Leave room for cookie metadata
            const chunks = [];
            
            for (let i = 0; i < data.length; i += chunkSize) {
                chunks.push(data.slice(i, i + chunkSize));
            }

            // Store each chunk
            chunks.forEach((chunk, index) => {
                const chunkKey = `${key}_part${index}`;
                document.cookie = `${chunkKey}=${encodeURIComponent(chunk)}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
            });

            // Store metadata about the chunks
            const metadata = { chunks: chunks.length };
            document.cookie = `${key}=${encodeURIComponent(JSON.stringify(metadata))}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
            
            
        } catch (error) {
            console.error('[CACHE] Error storing large data:', error);
        }
    }

    /**
     * Retrieve large data from multiple cookies
     * @param {string} key - Cache key
     * @returns {string|null} Reconstructed data or null
     */
    getLargeData(key) {
        try {
            const metadataStr = this.getCookieValue(key);
            if (!metadataStr) return null;

            const metadata = JSON.parse(decodeURIComponent(metadataStr));
            if (!metadata.chunks) return null;

            let reconstructedData = '';
            for (let i = 0; i < metadata.chunks; i++) {
                const chunkKey = `${key}_part${i}`;
                const chunk = this.getCookieValue(chunkKey);
                if (!chunk) {
                    return null;
                }
                reconstructedData += decodeURIComponent(chunk);
            }

            return reconstructedData;
            
        } catch (error) {
            console.error('[CACHE] Error retrieving large data:', error);
            return null;
        }
    }

    /**
     * Simple LZ77-like compression for JSON data
     * @param {string} data - Data to compress
     * @returns {string} Compressed data with prefix
     */
    compressData(data) {
        try {
            // Simple compression: remove redundant JSON structure
            let compressed = data;
            
            // Replace common JSON patterns
            compressed = compressed.replace(/"id":/g, '"i":');
            compressed = compressed.replace(/"title":/g, '"t":');
            compressed = compressed.replace(/"description":/g, '"d":');
            compressed = compressed.replace(/"source":/g, '"s":');
            compressed = compressed.replace(/"sourceLabel":/g, '"sl":');
            compressed = compressed.replace(/"displayTitle":/g, '"dt":');
            compressed = compressed.replace(/"timestamp":/g, '"ts":');
            compressed = compressed.replace(/"expires":/g, '"e":');
            compressed = compressed.replace(/"version":/g, '"v":');
            compressed = compressed.replace(/"data":/g, '"da":');
            
            // Only return compressed if it's actually smaller
            if (compressed.length < data.length) {
                return `LZ77:${compressed}`;
            }
            
            return data;
        } catch (error) {
            console.error('[CACHE] Compression failed:', error);
            return data;
        }
    }

    /**
     * Decompress LZ77-like compressed data
     * @param {string} compressedData - Compressed data with prefix
     * @returns {string} Decompressed data
     */
    decompressData(compressedData) {
        try {
            if (!compressedData.startsWith('LZ77:')) {
                return compressedData;
            }

            let decompressed = compressedData.slice(5); // Remove 'LZ77:' prefix
            
            // Restore JSON patterns
            decompressed = decompressed.replace(/"i":/g, '"id":');
            decompressed = decompressed.replace(/"t":/g, '"title":');
            decompressed = decompressed.replace(/"d":/g, '"description":');
            decompressed = decompressed.replace(/"s":/g, '"source":');
            decompressed = decompressed.replace(/"sl":/g, '"sourceLabel":');
            decompressed = decompressed.replace(/"dt":/g, '"displayTitle":');
            decompressed = decompressed.replace(/"ts":/g, '"timestamp":');
            decompressed = decompressed.replace(/"e":/g, '"expires":');
            decompressed = decompressed.replace(/"v":/g, '"version":');
            decompressed = decompressed.replace(/"da":/g, '"data":');
            
            return decompressed;
        } catch (error) {
            console.error('[CACHE] Decompression failed:', error);
            return compressedData;
        }
    }
}

// Create and export a singleton instance
export const cookieCache = new CookieCache();