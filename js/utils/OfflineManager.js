/**
 * OfflineManager.js - Handles offline detection and UI state management
 */

export class OfflineManager {
    constructor() {
        this.isOffline = !navigator.onLine;
        this.callbacks = new Set();
        this.offlineIndicator = null;
        this.offlineOverlay = null;
        
        this.initializeEventListeners();
        this.createOfflineUI();
    }
    
    /**
     * Initialize online/offline event listeners
     */
    initializeEventListeners() {
        window.addEventListener('online', () => {
            console.log('🌐 Back online');
            this.isOffline = false;
            this.updateUI();
            this.notifyCallbacks('online');
        });
        
        window.addEventListener('offline', () => {
            console.log('📡 Gone offline');
            this.isOffline = true;
            this.updateUI();
            this.notifyCallbacks('offline');
        });
        
        // Also check for network connectivity with periodic tests
        this.startConnectivityCheck();
    }
    
    /**
     * Periodic connectivity check as fallback
     */
    startConnectivityCheck() {
        setInterval(async () => {
            const wasOffline = this.isOffline;
            this.isOffline = !(await this.checkConnectivity());
            
            if (wasOffline !== this.isOffline) {
                this.updateUI();
                this.notifyCallbacks(this.isOffline ? 'offline' : 'online');
            }
        }, 10000); // Check every 10 seconds
    }
    
    /**
     * Test actual connectivity by making a lightweight request
     */
    async checkConnectivity() {
        try {
            // Use a fast, lightweight endpoint
            const response = await fetch('https://httpbin.org/status/200', {
                method: 'GET',
                cache: 'no-cache',
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            return response.ok;
        } catch {
            return false;
        }
    }
    
    /**
     * Create offline UI elements
     */
    createOfflineUI() {
        // Create floating offline indicator
        this.offlineIndicator = document.createElement('div');
        this.offlineIndicator.id = 'offline-indicator';
        this.offlineIndicator.innerHTML = `
            <div class="offline-icon">📡</div>
            <div class="offline-text">Offline - Need Internet</div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #offline-indicator {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(255, 87, 51, 0.95);
                color: white;
                padding: 12px 20px;
                border-radius: 25px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                display: none;
                align-items: center;
                gap: 10px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                font-weight: 500;
                z-index: 10000;
                backdrop-filter: blur(10px);
                animation: offline-pulse 2s infinite;
            }
            
            #offline-indicator.show {
                display: flex;
            }
            
            @keyframes offline-pulse {
                0%, 100% { opacity: 0.8; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.02); }
            }
            
            .offline-icon {
                font-size: 16px;
                animation: offline-disconnect 1.5s infinite;
            }
            
            @keyframes offline-disconnect {
                0%, 70% { opacity: 1; }
                85% { opacity: 0.3; }
                100% { opacity: 1; }
            }
            
            .offline-text {
                font-weight: 600;
            }
            
            /* Satellite offline animation */
            .satellite-offline {
                filter: grayscale(30%) brightness(0.8);
            }
            
            /* Satellite offline message bubble */
            .satellite-offline-message {
                position: absolute;
                background: rgba(255, 87, 51, 0.95);
                color: white;
                padding: 8px 12px;
                border-radius: 15px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                pointer-events: none;
                z-index: 1000;
                animation: satellite-message-float 3s ease-in-out infinite;
                backdrop-filter: blur(5px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            
            .satellite-offline-message::before {
                content: '';
                position: absolute;
                bottom: -5px;
                left: 20px;
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 6px solid rgba(255, 87, 51, 0.95);
            }
            
            @keyframes satellite-message-float {
                0%, 100% { transform: translateY(0px); opacity: 0.9; }
                50% { transform: translateY(-5px); opacity: 1; }
            }
            
            /* Disable UI elements when offline */
            .offline-disabled {
                opacity: 0.5;
                pointer-events: none;
                position: relative;
            }
            
            .offline-disabled::after {
                content: "🚫 Requires Internet";
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(255, 87, 51, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 15px;
                font-size: 12px;
                white-space: nowrap;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s;
            }
            
            .offline-disabled:hover::after {
                opacity: 1;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(this.offlineIndicator);
        
        // Initial UI update
        this.updateUI();
    }
    
    /**
     * Update UI based on offline status
     */
    updateUI() {
        if (this.isOffline) {
            this.offlineIndicator.classList.add('show');
            this.disableNetworkFeatures();
            this.updateSatelliteAnimation();
        } else {
            this.offlineIndicator.classList.remove('show');
            this.enableNetworkFeatures();
            this.updateSatelliteAnimation();
        }
    }
    
    /**
     * Update satellite animation for offline state
     */
    updateSatelliteAnimation() {
        const satelliteElements = document.querySelectorAll('.satellite, .satellite-icon, [class*="satellite"]');
        
        satelliteElements.forEach(element => {
            if (this.isOffline) {
                element.classList.add('satellite-offline');
            } else {
                element.classList.remove('satellite-offline');
            }
        });
    }
    
    /**
     * Disable network-dependent features
     */
    disableNetworkFeatures() {
        const networkElements = [
            '#main-search-btn',
            '#catalog-select', 
            '.search-form',
            '.results-panel',
            '#smart-filters-container',
            '.collection-selector'
        ];
        
        networkElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.classList.add('offline-disabled');
            });
        });
    }
    
    /**
     * Re-enable network-dependent features
     */
    enableNetworkFeatures() {
        const disabledElements = document.querySelectorAll('.offline-disabled');
        disabledElements.forEach(element => {
            element.classList.remove('offline-disabled');
        });
    }
    
    /**
     * Register callback for offline/online events
     */
    onStatusChange(callback) {
        this.callbacks.add(callback);
        return () => this.callbacks.delete(callback);
    }
    
    /**
     * Notify all registered callbacks
     */
    notifyCallbacks(status) {
        this.callbacks.forEach(callback => {
            try {
                callback(status, this.isOffline);
            } catch (error) {
                console.error('Offline callback error:', error);
            }
        });
    }
    
    /**
     * Get current offline status
     */
    getOfflineStatus() {
        return this.isOffline;
    }
    
    /**
     * Manually trigger offline mode (for testing)
     */
    setOfflineMode(offline = true) {
        const wasOffline = this.isOffline;
        this.isOffline = offline;
        
        if (wasOffline !== this.isOffline) {
            console.log(`🔧 Manually set to ${offline ? 'offline' : 'online'} mode`);
            this.updateUI();
            this.notifyCallbacks(offline ? 'offline' : 'online');
        }
    }
    
    /**
     * Check if a network request should be blocked
     */
    shouldBlockRequest(url) {
        if (!this.isOffline) return false;
        
        // Allow basemap tiles (they're usually cached)
        if (url.includes('tile') || url.includes('map')) {
            return false;
        }
        
        // Block STAC API calls
        if (url.includes('/collections') || url.includes('/search') || url.includes('/items')) {
            return true;
        }
        
        // Block external APIs
        return true;
    }
}

// Create and export singleton instance
export const offlineManager = new OfflineManager();