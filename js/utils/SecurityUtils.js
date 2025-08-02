/**
 * Security utilities for input validation and sanitization
 */

export class SecurityUtils {
  /**
   * Sanitize HTML content to prevent XSS attacks
   * @param {string} input - Raw HTML input
   * @returns {string} Sanitized HTML
   */
  static sanitizeHtml(input) {
    if (typeof input !== 'string') {
      return '';
    }

    // Create temporary element to parse HTML
    const temp = document.createElement('div');
    temp.textContent = input;
    return temp.innerHTML;
  }

  /**
   * Sanitize URL to prevent malicious redirects
   * @param {string} url - URL to sanitize
   * @returns {string|null} Sanitized URL or null if invalid
   */
  static sanitizeUrl(url) {
    if (typeof url !== 'string') {
      return null;
    }

    try {
      const parsedUrl = new URL(url);

      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return null;
      }

      // Prevent data: and javascript: URLs
      if (parsedUrl.protocol === 'data:' || parsedUrl.protocol === 'javascript:') {
        return null;
      }

      return parsedUrl.toString();
    } catch {
      return null;
    }
  }

  /**
   * Validate STAC catalog URL
   * @param {string} url - STAC catalog URL
   * @returns {boolean} Whether URL is valid for STAC
   */
  static validateStacUrl(url) {
    const sanitized = SecurityUtils.sanitizeUrl(url);
    if (!sanitized) {
      return false;
    }

    try {
      const parsedUrl = new URL(sanitized);

      // Check for common STAC patterns
      const validPatterns = [
        /\/stac\/?$/,
        /\/catalog\.json$/,
        /\/v1\/?$/,
        /api\/stac/,
        /stac\..*\.(com|org|gov|edu)/,
      ];

      const urlString = parsedUrl.toString();
      return validPatterns.some(pattern => pattern.test(urlString));
    } catch {
      return false;
    }
  }

  /**
   * Sanitize search query input
   * @param {string} query - Search query
   * @returns {string} Sanitized query
   */
  static sanitizeSearchQuery(query) {
    if (typeof query !== 'string') {
      return '';
    }

    return query
      .trim()
      .replace(/[<>"'&]/g, '') // Remove potentially dangerous characters
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate and sanitize coordinates
   * @param {number|string} lat - Latitude
   * @param {number|string} lon - Longitude
   * @returns {object|null} Validated coordinates or null
   */
  static validateCoordinates(lat, lon) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null;
    }

    if (latitude < -90 || latitude > 90) {
      return null;
    }

    if (longitude < -180 || longitude > 180) {
      return null;
    }

    return { lat: latitude, lon: longitude };
  }

  /**
   * Validate WKT geometry string
   * @param {string} wkt - WKT string
   * @returns {boolean} Whether WKT is valid
   */
  static validateWkt(wkt) {
    if (typeof wkt !== 'string') {
      return false;
    }

    // Basic WKT validation patterns
    const wktPatterns = [
      /^POINT\s*\(/i,
      /^LINESTRING\s*\(/i,
      /^POLYGON\s*\(\(/i,
      /^MULTIPOINT\s*\(/i,
      /^MULTILINESTRING\s*\(\(/i,
      /^MULTIPOLYGON\s*\(\(\(/i,
      /^GEOMETRYCOLLECTION\s*\(/i,
    ];

    return wktPatterns.some(pattern => pattern.test(wkt.trim()));
  }

  /**
   * Validate GeoJSON object
   * @param {object} geojson - GeoJSON object
   * @returns {boolean} Whether GeoJSON is valid
   */
  static validateGeoJson(geojson) {
    if (typeof geojson !== 'object' || geojson === null) {
      return false;
    }

    const validTypes = [
      'Point',
      'LineString',
      'Polygon',
      'MultiPoint',
      'MultiLineString',
      'MultiPolygon',
      'GeometryCollection',
      'Feature',
      'FeatureCollection',
    ];

    return validTypes.includes(geojson.type);
  }

  /**
   * Sanitize filename for downloads
   * @param {string} filename - Original filename
   * @returns {string} Sanitized filename
   */
  static sanitizeFilename(filename) {
    if (typeof filename !== 'string') {
      return 'download';
    }

    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .substring(0, 255); // Limit length
  }

  /**
   * Generate Content Security Policy header value
   * @returns {string} CSP header value
   */
  static generateCSP() {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https:",
      "worker-src 'self' blob:",
      "child-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ];

    return directives.join('; ');
  }

  /**
   * Set security headers for responses
   * @param {Response} response - Response object
   */
  static setSecurityHeaders(response) {
    if (!response || !response.headers) {
      return;
    }

    const headers = {
      'Content-Security-Policy': SecurityUtils.generateCSP(),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    };

    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  /**
   * Rate limiting helper
   */
  static createRateLimiter(maxRequests = 100, windowMs = 60000) {
    const requests = new Map();

    return {
      isAllowed(identifier) {
        const now = Date.now();
        const windowStart = now - windowMs;

        // Get existing requests for this identifier
        const userRequests = requests.get(identifier) || [];

        // Filter out old requests
        const recentRequests = userRequests.filter(time => time > windowStart);

        // Check if limit exceeded
        if (recentRequests.length >= maxRequests) {
          return false;
        }

        // Add current request
        recentRequests.push(now);
        requests.set(identifier, recentRequests);

        return true;
      },

      getRemainingRequests(identifier) {
        const now = Date.now();
        const windowStart = now - windowMs;
        const userRequests = requests.get(identifier) || [];
        const recentRequests = userRequests.filter(time => time > windowStart);

        return Math.max(0, maxRequests - recentRequests.length);
      },
    };
  }

  /**
   * Generate nonce for inline scripts/styles
   * @returns {string} Random nonce
   */
  static generateNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }
}

/**
 * Input validation decorator
 * @param {Function} validator - Validation function
 * @returns {Function} Decorator function
 */
export function validateInput(validator) {
  return (_target, propertyName, descriptor) => {
    const method = descriptor.value;

    descriptor.value = function (...args) {
      // Validate each argument
      for (const arg of args) {
        if (!validator(arg)) {
          throw new Error(`Invalid input for ${propertyName}: ${arg}`);
        }
      }

      return method.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Security middleware for API calls
 */
export class SecurityMiddleware {
  constructor(options = {}) {
    this.rateLimiter = SecurityUtils.createRateLimiter(
      options.maxRequests || 100,
      options.windowMs || 60000
    );
  }

  /**
   * Apply security checks to request
   * @param {Request} request - Request object
   * @param {string} identifier - User identifier (IP, session, etc.)
   * @returns {boolean} Whether request is allowed
   */
  checkRequest(request, identifier) {
    // Rate limiting
    if (!this.rateLimiter.isAllowed(identifier)) {
      throw new Error('Rate limit exceeded');
    }

    // URL validation
    if (request.url && !SecurityUtils.sanitizeUrl(request.url)) {
      throw new Error('Invalid URL');
    }

    return true;
  }
}

export default SecurityUtils;
