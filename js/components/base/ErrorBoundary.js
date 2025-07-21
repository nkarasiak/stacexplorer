/**
 * Error Boundary Component - Graceful error handling and recovery
 * Provides user-friendly error states and debugging information
 * 
 * @author STAC Explorer Team
 * @version 1.0.0
 */

import { BaseUIComponent } from './BaseUIComponent.js';
import { focusManager } from './FocusManager.js';

export class ErrorBoundary extends BaseUIComponent {
    /**
     * Create a new ErrorBoundary component
     * @param {HTMLElement|string} container - Container element or selector
     * @param {Object} options - Error boundary configuration options
     */
    constructor(container, options = {}) {
        super(container, options);
        
        this.errorStack = [];
        this.errorCount = 0;
        this.lastErrorTime = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Bind error handlers
        this.boundHandleError = this.handleError.bind(this);
        this.boundHandleUnhandledRejection = this.handleUnhandledRejection.bind(this);
        this.boundHandleResourceError = this.handleResourceError.bind(this);
        
        // Set up global error handlers
        this.setupGlobalErrorHandlers();
    }
    
    /**
     * Get default options
     * @returns {Object} Default options
     */
    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            className: 'error-boundary',
            
            // Error handling behavior
            showTechnicalDetails: false,
            allowRetry: true,
            autoRetry: false,
            maxRetries: 3,
            retryDelay: 1000,
            
            // Error reporting
            reportErrors: true,
            reportUrl: null,
            includeUserAgent: true,
            includeUrl: true,
            includeTimestamp: true,
            
            // UI behavior
            showErrorOverlay: true,
            allowDismiss: true,
            focusOnError: true,
            announceErrors: true,
            
            // Recovery
            fallbackContent: null,
            onError: null,
            onRecover: null,
            onRetry: null,
            
            // Error categories
            ignoredErrors: [
                'ResizeObserver loop limit exceeded',
                'Script error.',
                'Network request failed'
            ],
            
            // Development mode
            developmentMode: false
        };
    }
    
    /**
     * Get initial state
     * @returns {Object} Initial state
     */
    getInitialState() {
        return {
            ...super.getInitialState(),
            hasError: false,
            errorInfo: null,
            isRetrying: false,
            showDetails: false
        };
    }
    
    /**
     * Component-specific initialization
     */
    onInit() {
        // Initially hide error boundary
        this.container.style.display = 'none';
        this.container.setAttribute('role', 'alert');
        this.container.setAttribute('aria-live', 'assertive');
        this.container.setAttribute('aria-atomic', 'true');
    }
    
    /**
     * Set up global error handlers
     */
    setupGlobalErrorHandlers() {
        // JavaScript errors
        window.addEventListener('error', this.boundHandleError);
        
        // Promise rejections
        window.addEventListener('unhandledrejection', this.boundHandleUnhandledRejection);
        
        // Resource loading errors
        window.addEventListener('error', this.boundHandleResourceError, true);
        
        this.log('Global error handlers set up');
    }
    
    /**
     * Handle JavaScript errors
     * @param {ErrorEvent} event - Error event
     */
    handleError(event) {
        const error = event.error || new Error(event.message);
        const errorInfo = {
            type: 'javascript',
            message: error.message || event.message,
            stack: error.stack,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            componentStack: this.getComponentStack()
        };
        
        this.catchError(error, errorInfo);
    }
    
    /**
     * Handle unhandled promise rejections
     * @param {PromiseRejectionEvent} event - Promise rejection event
     */
    handleUnhandledRejection(event) {
        const error = event.reason instanceof Error ? 
            event.reason : 
            new Error(String(event.reason));
            
        const errorInfo = {
            type: 'promise_rejection',
            message: error.message || String(event.reason),
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            componentStack: this.getComponentStack()
        };
        
        this.catchError(error, errorInfo);
        
        // Prevent default browser handling
        event.preventDefault();
    }
    
    /**
     * Handle resource loading errors
     * @param {Event} event - Resource error event
     */
    handleResourceError(event) {
        // Only handle actual resource errors
        if (!event.target || event.target === window) return;
        
        const target = event.target;
        const errorInfo = {
            type: 'resource',
            message: `Failed to load resource: ${target.src || target.href || 'unknown'}`,
            resourceType: target.tagName.toLowerCase(),
            resourceUrl: target.src || target.href,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        const error = new Error(errorInfo.message);
        this.catchError(error, errorInfo);
    }
    
    /**
     * Catch and process errors
     * @param {Error} error - Error object
     * @param {Object} errorInfo - Additional error information
     */
    catchError(error, errorInfo = {}) {
        // Check if error should be ignored
        if (this.shouldIgnoreError(error, errorInfo)) {
            return;
        }
        
        // Prevent error loops
        if (this.isDuplicateError(error, errorInfo)) {
            return;
        }
        
        this.log('Error caught:', error, errorInfo);
        
        // Update error tracking
        this.errorCount++;
        this.lastErrorTime = Date.now();
        
        // Create comprehensive error info
        const fullErrorInfo = {
            ...errorInfo,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            context: this.getErrorContext(),
            id: this.generateErrorId(),
            count: this.errorCount,
            timestamp: errorInfo.timestamp || new Date().toISOString()
        };
        
        // Add to error stack
        this.errorStack.push(fullErrorInfo);
        
        // Limit error stack size
        if (this.errorStack.length > 10) {
            this.errorStack.shift();
        }
        
        // Update state
        this.setState({
            hasError: true,
            errorInfo: fullErrorInfo
        });
        
        // Report error if enabled
        if (this.options.reportErrors) {
            this.reportError(fullErrorInfo);
        }
        
        // Call custom error handler
        if (this.options.onError) {
            try {
                this.options.onError(error, fullErrorInfo);
            } catch (handlerError) {
                console.error('Error in custom error handler:', handlerError);
            }
        }
        
        // Show error UI
        this.showError(fullErrorInfo);
        
        // Auto-retry if enabled
        if (this.options.autoRetry && this.retryCount < this.maxRetries) {
            this.scheduleRetry();
        }
        
        // Announce to screen readers
        if (this.options.announceErrors) {
            focusManager.announceToScreenReader(
                `An error occurred: ${this.getSafeErrorMessage(error.message)}`,
                'assertive'
            );
        }
        
        // Focus management
        if (this.options.focusOnError) {
            this.focusErrorElement();
        }
        
        // Emit error event
        this.emit('error', { error, errorInfo: fullErrorInfo });
    }
    
    /**
     * Check if error should be ignored
     * @param {Error} error - Error object
     * @param {Object} errorInfo - Error information
     * @returns {boolean} Whether to ignore the error
     */
    shouldIgnoreError(error, errorInfo) {
        const message = error.message || errorInfo.message || '';
        
        return this.options.ignoredErrors.some(ignored => 
            message.includes(ignored)
        );
    }
    
    /**
     * Check if this is a duplicate error
     * @param {Error} error - Error object
     * @param {Object} errorInfo - Error information
     * @returns {boolean} Whether this is a duplicate
     */
    isDuplicateError(error, errorInfo) {
        if (this.errorStack.length === 0) return false;
        
        const lastError = this.errorStack[this.errorStack.length - 1];
        const timeDiff = Date.now() - new Date(lastError.timestamp).getTime();
        
        // Consider duplicate if same message within 1 second
        return timeDiff < 1000 && 
               lastError.error.message === error.message;
    }
    
    /**
     * Get component stack for debugging
     * @returns {string} Component stack trace
     */
    getComponentStack() {
        // Try to get component stack from DOM
        const components = [];
        let element = this.container;
        
        while (element && element !== document.body) {
            if (element._componentInstance) {
                components.push(element._componentInstance.constructor.name);
            }
            element = element.parentElement;
        }
        
        return components.length > 0 ? components.join(' -> ') : 'Unknown';
    }
    
    /**
     * Get error context information
     * @returns {Object} Error context
     */
    getErrorContext() {
        return {
            url: window.location.href,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            timestamp: new Date().toISOString(),
            memoryUsage: this.getMemoryUsage(),
            connectionType: this.getConnectionType(),
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            onlineStatus: navigator.onLine
        };
    }
    
    /**
     * Get memory usage information
     * @returns {Object|null} Memory usage data
     */
    getMemoryUsage() {
        if ('memory' in performance) {
            return {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }
    
    /**
     * Get connection type information
     * @returns {string} Connection type
     */
    getConnectionType() {
        if ('connection' in navigator) {
            return navigator.connection.effectiveType || 'unknown';
        }
        return 'unknown';
    }
    
    /**
     * Generate unique error ID
     * @returns {string} Error ID
     */
    generateErrorId() {
        return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Get safe error message for display
     * @param {string} message - Original error message
     * @returns {string} Safe error message
     */
    getSafeErrorMessage(message) {
        if (!message) return 'An unexpected error occurred';
        
        // Remove potentially sensitive information
        return message
            .replace(/https?:\/\/[^\s]+/g, '[URL]')
            .replace(/\b\d{4,}\b/g, '[NUMBER]')
            .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
    }
    
    /**
     * Show error UI
     * @param {Object} errorInfo - Error information
     */
    showError(errorInfo) {
        if (!this.options.showErrorOverlay) return;
        
        this.container.style.display = 'block';
        this.renderErrorUI(errorInfo);
        
        // Focus first interactive element
        setTimeout(() => {
            this.focusErrorElement();
        }, 100);
    }
    
    /**
     * Render error UI
     * @param {Object} errorInfo - Error information
     */
    renderErrorUI(errorInfo) {
        const isDevelopment = this.options.developmentMode;
        const showDetails = this.state.showDetails || isDevelopment;
        
        this.container.innerHTML = `
            <div class="error-boundary__overlay">
                <div class="error-boundary__dialog" role="dialog" aria-labelledby="error-title" aria-describedby="error-description">
                    <div class="error-boundary__header">
                        <div class="error-boundary__icon">
                            <i class="material-icons">error</i>
                        </div>
                        <div class="error-boundary__title-group">
                            <h2 id="error-title" class="error-boundary__title">Something went wrong</h2>
                            <p id="error-description" class="error-boundary__description">
                                ${this.getSafeErrorMessage(errorInfo.error.message)}
                            </p>
                        </div>
                    </div>
                    
                    <div class="error-boundary__body">
                        ${this.options.allowRetry ? `
                            <div class="error-boundary__actions">
                                <button type="button" class="btn btn--primary error-boundary__retry" ${this.state.isRetrying ? 'disabled' : ''}>
                                    ${this.state.isRetrying ? 
                                        '<i class="material-icons">refresh</i> Retrying...' : 
                                        '<i class="material-icons">refresh</i> Try Again'
                                    }
                                </button>
                                <button type="button" class="btn btn--secondary error-boundary__reload">
                                    <i class="material-icons">replay</i> Reload Page
                                </button>
                                ${this.options.allowDismiss ? `
                                    <button type="button" class="btn btn--ghost error-boundary__dismiss">
                                        <i class="material-icons">close</i> Dismiss
                                    </button>
                                ` : ''}
                            </div>
                        ` : ''}
                        
                        ${this.options.showTechnicalDetails || isDevelopment ? `
                            <div class="error-boundary__details">
                                <button type="button" class="error-boundary__details-toggle" aria-expanded="${showDetails}">
                                    <i class="material-icons">${showDetails ? 'expand_less' : 'expand_more'}</i>
                                    Technical Details
                                </button>
                                <div class="error-boundary__details-content" ${showDetails ? '' : 'style="display: none;"'}>
                                    <div class="error-boundary__error-info">
                                        <h4>Error Information</h4>
                                        <dl class="error-boundary__info-list">
                                            <dt>Type:</dt>
                                            <dd>${errorInfo.type || 'javascript'}</dd>
                                            <dt>Timestamp:</dt>
                                            <dd>${new Date(errorInfo.timestamp).toLocaleString()}</dd>
                                            <dt>Error ID:</dt>
                                            <dd><code>${errorInfo.id}</code></dd>
                                            ${errorInfo.componentStack ? `
                                                <dt>Component Stack:</dt>
                                                <dd><code>${errorInfo.componentStack}</code></dd>
                                            ` : ''}
                                        </dl>
                                    </div>
                                    ${errorInfo.error.stack ? `
                                        <div class="error-boundary__stack-trace">
                                            <h4>Stack Trace</h4>
                                            <pre><code>${errorInfo.error.stack}</code></pre>
                                        </div>
                                    ` : ''}
                                    <div class="error-boundary__context">
                                        <h4>Context</h4>
                                        <pre><code>${JSON.stringify(errorInfo.context, null, 2)}</code></pre>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Set up event listeners
        this.setupErrorUIEventListeners();
    }
    
    /**
     * Set up event listeners for error UI
     */
    setupErrorUIEventListeners() {
        const retryBtn = this.container.querySelector('.error-boundary__retry');
        const reloadBtn = this.container.querySelector('.error-boundary__reload');
        const dismissBtn = this.container.querySelector('.error-boundary__dismiss');
        const detailsToggle = this.container.querySelector('.error-boundary__details-toggle');
        
        if (retryBtn) {
            this.addEventListener(retryBtn, 'click', this.handleRetry);
        }
        
        if (reloadBtn) {
            this.addEventListener(reloadBtn, 'click', this.handleReload);
        }
        
        if (dismissBtn) {
            this.addEventListener(dismissBtn, 'click', this.handleDismiss);
        }
        
        if (detailsToggle) {
            this.addEventListener(detailsToggle, 'click', this.handleToggleDetails);
        }
    }
    
    /**
     * Focus error element
     */
    focusErrorElement() {
        const firstButton = this.container.querySelector('button');
        if (firstButton) {
            firstButton.focus();
        }
    }
    
    /**
     * Handle retry action
     */
    handleRetry() {
        this.retryCount++;
        this.setState({ isRetrying: true });
        
        // Call custom retry handler
        if (this.options.onRetry) {
            try {
                this.options.onRetry();
            } catch (retryError) {
                console.error('Error in custom retry handler:', retryError);
            }
        }
        
        // Attempt recovery
        this.addTimer(() => {
            this.recover();
        }, this.options.retryDelay);
        
        this.emit('retry', { retryCount: this.retryCount });
    }
    
    /**
     * Handle reload action
     */
    handleReload() {
        window.location.reload();
    }
    
    /**
     * Handle dismiss action
     */
    handleDismiss() {
        this.recover();
    }
    
    /**
     * Handle toggle details action
     */
    handleToggleDetails() {
        this.setState({ showDetails: !this.state.showDetails });
        
        const toggle = this.container.querySelector('.error-boundary__details-toggle');
        const content = this.container.querySelector('.error-boundary__details-content');
        
        if (toggle && content) {
            const isExpanded = this.state.showDetails;
            toggle.setAttribute('aria-expanded', isExpanded.toString());
            toggle.querySelector('.material-icons').textContent = 
                isExpanded ? 'expand_less' : 'expand_more';
            content.style.display = isExpanded ? 'block' : 'none';
        }
    }
    
    /**
     * Schedule auto-retry
     */
    scheduleRetry() {
        this.addTimer(() => {
            if (this.retryCount < this.maxRetries) {
                this.handleRetry();
            }
        }, this.options.retryDelay * (this.retryCount + 1));
    }
    
    /**
     * Recover from error
     */
    recover() {
        this.setState({
            hasError: false,
            errorInfo: null,
            isRetrying: false,
            showDetails: false
        });
        
        this.container.style.display = 'none';
        this.retryCount = 0;
        
        // Call custom recovery handler
        if (this.options.onRecover) {
            try {
                this.options.onRecover();
            } catch (recoverError) {
                console.error('Error in custom recovery handler:', recoverError);
            }
        }
        
        this.emit('recover');
        this.log('Recovered from error');
    }
    
    /**
     * Report error to external service
     * @param {Object} errorInfo - Error information
     */
    async reportError(errorInfo) {
        if (!this.options.reportUrl) {
            // Just log to console if no reporting URL
            console.error('Error Report:', errorInfo);
            return;
        }
        
        try {
            const response = await fetch(this.options.reportUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...errorInfo,
                    reportedAt: new Date().toISOString(),
                    userAgent: this.options.includeUserAgent ? navigator.userAgent : undefined,
                    url: this.options.includeUrl ? window.location.href : undefined
                })
            });
            
            if (!response.ok) {
                console.warn('Failed to report error:', response.statusText);
            }
        } catch (reportingError) {
            console.error('Error reporting failed:', reportingError);
        }
    }
    
    /**
     * Get error statistics
     * @returns {Object} Error statistics
     */
    getErrorStats() {
        return {
            totalErrors: this.errorCount,
            uniqueErrors: this.errorStack.length,
            lastErrorTime: this.lastErrorTime,
            retryCount: this.retryCount,
            hasError: this.state.hasError,
            errorTypes: this.getErrorTypes()
        };
    }
    
    /**
     * Get error types breakdown
     * @returns {Object} Error types count
     */
    getErrorTypes() {
        const types = {};
        this.errorStack.forEach(error => {
            const type = error.type || 'unknown';
            types[type] = (types[type] || 0) + 1;
        });
        return types;
    }
    
    /**
     * Clear error history
     */
    clearErrors() {
        this.errorStack = [];
        this.errorCount = 0;
        this.lastErrorTime = null;
        this.retryCount = 0;
        
        if (this.state.hasError) {
            this.recover();
        }
        
        this.log('Error history cleared');
    }
    
    /**
     * Component cleanup
     */
    onDestroy() {
        // Remove global error handlers
        window.removeEventListener('error', this.boundHandleError);
        window.removeEventListener('unhandledrejection', this.boundHandleUnhandledRejection);
        window.removeEventListener('error', this.boundHandleResourceError, true);
        
        this.log('Error boundary destroyed');
    }
}

/**
 * Global Error Boundary Manager
 */
export class ErrorBoundaryManager {
    constructor() {
        this.boundaries = new Map();
        this.globalBoundary = null;
    }
    
    /**
     * Create global error boundary
     * @param {Object} options - Error boundary options
     * @returns {ErrorBoundary} Global error boundary instance
     */
    createGlobal(options = {}) {
        if (this.globalBoundary) {
            console.warn('Global error boundary already exists');
            return this.globalBoundary;
        }
        
        // Create container for global error boundary
        const container = document.createElement('div');
        container.id = 'global-error-boundary';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 999999;
            pointer-events: none;
        `;
        
        document.body.appendChild(container);
        
        this.globalBoundary = new ErrorBoundary(container, {
            developmentMode: process?.env?.NODE_ENV === 'development',
            showTechnicalDetails: true,
            allowRetry: true,
            reportErrors: true,
            ...options
        });
        
        return this.globalBoundary;
    }
    
    /**
     * Register error boundary
     * @param {ErrorBoundary} boundary - Error boundary instance
     */
    register(boundary) {
        if (boundary instanceof ErrorBoundary) {
            this.boundaries.set(boundary.componentId, boundary);
        }
    }
    
    /**
     * Unregister error boundary
     * @param {string|ErrorBoundary} boundaryOrId - Boundary or ID
     */
    unregister(boundaryOrId) {
        const id = typeof boundaryOrId === 'string' 
            ? boundaryOrId 
            : boundaryOrId.componentId;
        
        this.boundaries.delete(id);
    }
    
    /**
     * Get all error statistics
     * @returns {Object} Combined error statistics
     */
    getAllStats() {
        const stats = {
            totalBoundaries: this.boundaries.size,
            totalErrors: 0,
            boundaries: {}
        };
        
        for (const [id, boundary] of this.boundaries) {
            const boundaryStats = boundary.getErrorStats();
            stats.boundaries[id] = boundaryStats;
            stats.totalErrors += boundaryStats.totalErrors;
        }
        
        if (this.globalBoundary) {
            stats.global = this.globalBoundary.getErrorStats();
            stats.totalErrors += stats.global.totalErrors;
        }
        
        return stats;
    }
    
    /**
     * Clear all errors
     */
    clearAllErrors() {
        for (const boundary of this.boundaries.values()) {
            boundary.clearErrors();
        }
        
        if (this.globalBoundary) {
            this.globalBoundary.clearErrors();
        }
    }
}

// Global error boundary manager
export const errorBoundaryManager = new ErrorBoundaryManager();

export default ErrorBoundary;