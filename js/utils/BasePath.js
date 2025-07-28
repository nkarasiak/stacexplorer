/**
 * BasePath.js - A utility to determine the base path of the application.
 * This is useful for applications hosted in a subdirectory, such as on GitHub Pages.
 */

/**
 * Gets the base path of the application.
 * @returns {string} The base path, which is either an empty string or a path like '/reponame'.
 */
export function getBasePath() {
    // Logic to determine base path, e.g., for GitHub Pages hosting
    if (window.location.hostname.endsWith('.github.io')) {
        const pathParts = window.location.pathname.split('/').filter(part => part.length > 0);
        if (pathParts.length > 0) {
            return `/${pathParts[0]}`;
        }
    }
    return '';
}
