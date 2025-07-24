/**
 * SatelliteAnimation.js - Animated satellite that flies across the screen when no search results are shown
 */

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
        
        this.init();
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
        if (this.isActive || this.hasResults) {
            console.log('🛰️ Animation not started - isActive:', this.isActive, 'hasResults:', this.hasResults);
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
        if (!this.isActive || this.hasResults) {
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
        if (!this.isActive || this.hasResults) {
            console.log('🛰️ Flight cancelled - isActive:', this.isActive, 'hasResults:', this.hasResults);
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
     * Destroy the satellite animation
     */
    destroy() {
        console.log('🛰️ Destroying satellite animation');
        this.stopAnimation();
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        this.container = null;
        this.satellite = null;
    }
}