/**
 * SatelliteAnimation.js - Animated satellite that flies across the screen when no search results are shown
 */

import { offlineManager } from '../../utils/OfflineManager.js';

export class SatelliteAnimation {
    constructor() {
        this.container = null;
        this.satellite = null;
        this.animationInterval = null;
        this.isActive = false;
        this.currentColumn = 0;
        this.maxColumns = 5; // Number of columns to animate across
        this.columnWidth = 0;
        this.hasResults = false;
        this.isOffline = false;
        this.offlineUnsubscribe = null;
        
        this.init();
        this.setupOfflineHandling();
    }
    
    /**
     * Initialize the satellite animation
     */
    init() {
        console.log('🛰️ Initializing satellite animation...');
        this.createSatelliteElements();
        this.calculateLayout();
        this.bindEvents();
        
        // Start animation if no results are present
        setTimeout(() => {
            this.checkResultsAndStart();
        }, 1000); // Wait 1 second for DOM to be fully ready
    }
    
    /**
     * Setup offline status handling
     */
    setupOfflineHandling() {
        this.isOffline = offlineManager.getOfflineStatus();
        
        // Listen for offline/online status changes
        this.offlineUnsubscribe = offlineManager.onStatusChange((status, isOffline) => {
            console.log('🛰️ Offline status changed:', status, isOffline);
            this.isOffline = isOffline;
            this.updateSatelliteAppearance();
            
            // In offline mode, always show satellite animation (no search results possible)
            if (isOffline) {
                this.hasResults = false;
                this.startAnimation();
            } else {
                // When back online, check actual results state
                this.checkResultsAndStart();
            }
        });
        
        // Initial appearance update
        this.updateSatelliteAppearance();
    }
    
    /**
     * Update satellite appearance based on offline status
     */
    updateSatelliteAppearance() {
        if (!this.satellite) return;
        
        if (this.isOffline) {
            this.satellite.classList.add('satellite-offline');
            this.satellite.title = '📡 Satellite offline - Need internet connection';
            this.addOfflineMessage();
        } else {
            this.satellite.classList.remove('satellite-offline');
            this.satellite.title = '🛰️ Satellite online';
            this.removeOfflineMessage();
        }
    }
    
    /**
     * Add offline message bubble to satellite
     */
    addOfflineMessage() {
        // Remove existing message if any
        this.removeOfflineMessage();
        
        if (!this.container) return;
        
        const message = document.createElement('div');
        message.className = 'satellite-offline-message';
        message.id = 'satellite-offline-message';
        message.innerHTML = '📡 Link offline, please connect';
        
        // Position the message above the satellite
        message.style.top = '-40px';
        message.style.left = '50%';
        message.style.transform = 'translateX(-50%)';
        
        this.container.appendChild(message);
        console.log('🛰️ Added offline message bubble to satellite');
    }
    
    /**
     * Remove offline message bubble from satellite
     */
    removeOfflineMessage() {
        const existingMessage = document.getElementById('satellite-offline-message');
        if (existingMessage) {
            existingMessage.remove();
            console.log('🛰️ Removed offline message bubble from satellite');
        }
    }
    
    /**
     * Create the satellite DOM elements
     */
    createSatelliteElements() {
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'satellite-container';
        this.container.id = 'satellite-container';
        
        // Create satellite image
        this.satellite = document.createElement('img');
        this.satellite.src = 'static/images/earthdaily_satellite.webp';
        this.satellite.className = 'satellite hidden';
        this.satellite.alt = 'Satellite';
        
        // Add satellite to container
        this.container.appendChild(this.satellite);
        
        // Add container to body
        document.body.appendChild(this.container);
        
        // Update appearance based on offline status
        this.updateSatelliteAppearance();
        
        console.log('🛰️ Satellite elements created');
    }
    
    /**
     * Calculate layout based on screen size
     */
    calculateLayout() {
        this.columnWidth = window.innerWidth / this.maxColumns;
    }
    
    /**
     * Bind window resize event
     */
    bindEvents() {
        window.addEventListener('resize', () => {
            this.calculateLayout();
        });
        
        // Listen for search result changes
        document.addEventListener('resultsUpdated', (event) => {
            this.onResultsUpdated(event.detail);
        });
        
        // Listen for search cleared
        document.addEventListener('resultsCleared', () => {
            this.onResultsCleared();
        });
    }
    
    /**
     * Handle results updated event
     * @param {Object} detail - Event detail with results info
     */
    onResultsUpdated(detail) {
        const hasResults = detail && detail.count > 0;
        console.log('🛰️ Results updated, has results:', hasResults);
        
        this.hasResults = hasResults;
        
        if (hasResults) {
            this.stopAnimation();
            document.body.classList.add('has-results');
        } else {
            this.startAnimation();
            document.body.classList.remove('has-results');
        }
    }
    
    /**
     * Handle results cleared event
     */
    onResultsCleared() {
        console.log('🛰️ Results cleared');
        this.hasResults = false;
        document.body.classList.remove('has-results');
        this.startAnimation();
    }
    
    /**
     * Check current results state and start animation if needed
     */
    checkResultsAndStart() {
        // Check if there are any results currently displayed
        const resultsCount = document.getElementById('results-count');
        const count = resultsCount ? parseInt(resultsCount.textContent) || 0 : 0;
        
        console.log('🛰️ Initial results check, count:', count);
        console.log('🛰️ Results count element:', resultsCount);
        console.log('🛰️ Results count text:', resultsCount ? resultsCount.textContent : 'not found');
        
        this.hasResults = count > 0;
        
        if (!this.hasResults) {
            console.log('🛰️ No results found, starting animation...');
            // Start animation after a short delay to ensure page is loaded
            setTimeout(() => {
                this.startAnimation();
            }, 2000);
        } else {
            console.log('🛰️ Results found, not starting animation');
            document.body.classList.add('has-results');
        }
    }
    
    /**
     * Start the satellite animation
     */
    startAnimation() {
        // In offline mode, always show animation regardless of results
        if (this.isActive || (!this.isOffline && this.hasResults)) {
            console.log('🛰️ Animation not started - isActive:', this.isActive, 'hasResults:', this.hasResults, 'isOffline:', this.isOffline);
            return;
        }
        
        console.log('🛰️ Starting satellite animation');
        console.log('🛰️ Container:', this.container);
        console.log('🛰️ Satellite:', this.satellite);
        
        this.isActive = true;
        this.currentColumn = 0;
        
        // Show container
        this.container.style.display = 'block';
        
        // Start the animation cycle immediately
        this.executeFlight();
    }
    
    /**
     * Stop the satellite animation
     */
    stopAnimation() {
        console.log('🛰️ Stopping satellite animation');
        this.isActive = false;
        
        if (this.animationInterval) {
            clearTimeout(this.animationInterval);
            this.animationInterval = null;
        }
        
        // Hide satellite immediately
        this.satellite.classList.remove('visible', 'animate');
        this.satellite.classList.add('hidden');
        
        // Hide container after transition
        setTimeout(() => {
            if (!this.isActive) {
                this.container.style.display = 'none';
            }
        }, 500);
    }
    
    /**
     * Schedule the next satellite flight
     */
    scheduleNextFlight() {
        // In offline mode, ignore hasResults check
        if (!this.isActive || (!this.isOffline && this.hasResults)) {
            return;
        }
        
        // Wait 10 seconds between flights
        this.animationInterval = setTimeout(() => {
            this.executeFlight();
        }, 10000);
    }
    
    /**
     * Execute a single satellite flight
     */
    executeFlight() {
        // In offline mode, ignore hasResults check
        if (!this.isActive || (!this.isOffline && this.hasResults)) {
            console.log('🛰️ Flight cancelled - isActive:', this.isActive, 'hasResults:', this.hasResults, 'isOffline:', this.isOffline);
            return;
        }
        
        // Position satellite at bottom of current column (right to left)
        const rightToLeftColumn = (this.maxColumns - 1) - this.currentColumn; // Reverse the column order
        const columnCenter = (rightToLeftColumn * this.columnWidth) + (this.columnWidth / 2);
        this.satellite.style.left = columnCenter + 'px';
        
        // Reset position and show satellite (starting from right)
        this.satellite.style.transform = 'translateY(100vh) translateX(100px)';
        this.satellite.classList.remove('hidden');
        this.satellite.classList.add('visible');
        console.log('🛰️ Satellite classes after show:', this.satellite.className);
        
        // Start animation after a brief moment
        setTimeout(() => {
            this.satellite.classList.add('animate');
            console.log('🛰️ Animation class added:', this.satellite.className);
        }, 100);
        
        // Remove animation class and hide satellite after animation completes
        setTimeout(() => {
            this.satellite.classList.remove('animate', 'visible');
            this.satellite.classList.add('hidden');
            
            // Move to next column
            this.currentColumn = (this.currentColumn + 1) % this.maxColumns;
            console.log('🛰️ Flight completed, next column:', this.currentColumn);
            
            // Schedule next flight
            this.scheduleNextFlight();
        }, 10000);
    }
    
    /**
     * Test method to manually trigger a satellite flight
     */
    testFlight() {
        console.log('🛰️ TEST: Manually triggering satellite flight');
        this.hasResults = false;
        this.isActive = false;
        this.startAnimation();
    }
    
    /**
     * Force satellite animation to start regardless of results state
     */
    forceStart() {
        console.log('🛰️ FORCE: Starting satellite animation regardless of results');
        this.hasResults = false;
        this.isActive = false;
        this.startAnimation();
    }
    
    /**
     * Debug method to check satellite visibility and positioning
     */
    debugSatellite() {
        console.log('🛰️ DEBUG: Satellite element:', this.satellite);
        console.log('🛰️ DEBUG: Container element:', this.container);
        console.log('🛰️ DEBUG: Satellite computed style:', window.getComputedStyle(this.satellite));
        console.log('🛰️ DEBUG: Container computed style:', window.getComputedStyle(this.container));
        console.log('🛰️ DEBUG: Satellite classes:', this.satellite.className);
        console.log('🛰️ DEBUG: Container position:', this.container.getBoundingClientRect());
        console.log('🛰️ DEBUG: Satellite position:', this.satellite.getBoundingClientRect());
        
        // Make satellite very visible for testing
        this.satellite.style.cssText += `
            background: red !important;
            width: 100px !important;
            height: 100px !important;
            opacity: 1 !important;
            z-index: 100 !important;
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: none !important;
            border: 5px solid yellow !important;
        `;
        
        console.log('🛰️ DEBUG: Made satellite highly visible at center of screen');
    }
    
    /**
     * Destroy the satellite animation
     */
    destroy() {
        console.log('🛰️ Destroying satellite animation');
        this.stopAnimation();
        
        // Clean up offline message
        this.removeOfflineMessage();
        
        // Clean up offline event listener
        if (this.offlineUnsubscribe) {
            this.offlineUnsubscribe();
            this.offlineUnsubscribe = null;
        }
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        this.container = null;
        this.satellite = null;
    }
}