/**
 * BasePath utility for handling GitHub Pages base path consistently
 */

/**
 * Get the application base path for GitHub Pages deployment
 * @returns {string} Base path (e.g., '/stacexplorer' on GitHub Pages, '' locally)
 */
export function getBasePath() {
    // Check if we're running on GitHub Pages
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    // Detect GitHub Pages by hostname pattern and path structure
    if (hostname.endsWith('.github.io') && pathname.startsWith('/stacexplorer/')) {
        return '/stacexplorer';
    }
    
    // For local development or other deployments
    return '';
}

/**
 * Create a full path with the correct base path
 * @param {string} path - The path to prefix with base path
 * @returns {string} Full path with base path
 */
export function createPath(path) {
    return getBasePath() + path;
}

/**
 * Create a full URL with the correct base path
 * @param {string} path - The path to prefix with base path and origin
 * @returns {string} Full URL with base path
 */
export function createUrl(path) {
    return window.location.origin + createPath(path);
}