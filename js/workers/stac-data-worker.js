/**
 * STAC Data Processing Web Worker
 * Handles CPU-intensive data operations off the main thread
 */

class STACDataWorker {
  constructor() {
    this.initializeMessageHandlers();
  }

  initializeMessageHandlers() {
    self.addEventListener('message', event => {
      const { type, id, data } = event.data;

      try {
        switch (type) {
          case 'PROCESS_SEARCH_RESULTS':
            this.processSearchResults(id, data);
            break;
          case 'FILTER_ITEMS':
            this.filterItems(id, data);
            break;
          case 'SORT_ITEMS':
            this.sortItems(id, data);
            break;
          case 'PROCESS_COLLECTION_DATA':
            this.processCollectionData(id, data);
            break;
          case 'CALCULATE_STATISTICS':
            this.calculateStatistics(id, data);
            break;
          case 'PARSE_LARGE_JSON':
            this.parseLargeJSON(id, data);
            break;
          case 'PROCESS_GEOMETRY':
            this.processGeometry(id, data);
            break;
          default:
            this.sendError(id, `Unknown task type: ${type}`);
        }
      } catch (error) {
        this.sendError(id, error.message);
      }
    });
  }

  sendResult(id, result) {
    self.postMessage({
      id,
      success: true,
      data: result,
    });
  }

  sendError(id, error) {
    self.postMessage({
      id,
      success: false,
      error: error,
    });
  }

  sendProgress(id, progress) {
    self.postMessage({
      id,
      progress: progress,
    });
  }

  /**
   * Process search results - parse, validate, and enhance STAC items
   */
  processSearchResults(id, { items, options = {} }) {
    const processedItems = [];
    const total = items.length;

    for (let i = 0; i < total; i++) {
      const item = items[i];

      // Validate STAC item structure
      if (!this.validateSTACItem(item)) {
        continue;
      }

      // Enhance item with additional metadata
      const processedItem = this.enhanceSTACItem(item, options);
      processedItems.push(processedItem);

      // Send progress updates for large datasets
      if (total > 100 && i % 10 === 0) {
        this.sendProgress(id, Math.round((i / total) * 100));
      }
    }

    this.sendResult(id, processedItems);
  }

  /**
   * Filter items based on complex criteria
   */
  filterItems(id, { items, filters }) {
    const filtered = items.filter(item => {
      return this.applyFilters(item, filters);
    });

    this.sendResult(id, filtered);
  }

  /**
   * Sort items by various criteria
   */
  sortItems(id, { items, sortBy, sortOrder = 'asc' }) {
    const sorted = [...items].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison =
            new Date(a.properties?.datetime || 0) - new Date(b.properties?.datetime || 0);
          break;
        case 'cloud_cover':
          comparison =
            (a.properties?.['eo:cloud_cover'] || 100) - (b.properties?.['eo:cloud_cover'] || 100);
          break;
        case 'collection':
          comparison = (a.collection || '').localeCompare(b.collection || '');
          break;
        case 'area':
          comparison = this.calculateItemArea(a) - this.calculateItemArea(b);
          break;
        default:
          comparison = (a.id || '').localeCompare(b.id || '');
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    this.sendResult(id, sorted);
  }

  /**
   * Process collection metadata
   */
  processCollectionData(id, { collections }) {
    const processed = collections.map(collection => {
      return {
        ...collection,
        itemCount: collection.extent?.spatial?.bbox?.length || 0,
        temporalExtent: this.parseTemporalExtent(collection.extent?.temporal),
        spatialExtent: this.parseSpatialExtent(collection.extent?.spatial),
        keywords: this.extractKeywords(collection),
      };
    });

    this.sendResult(id, processed);
  }

  /**
   * Calculate statistics from item datasets
   */
  calculateStatistics(id, { items }) {
    const stats = {
      totalItems: items.length,
      collections: new Set(),
      dateRange: { min: null, max: null },
      cloudCoverStats: { min: 100, max: 0, avg: 0 },
      spatialCoverage: { minBbox: null, maxBbox: null },
    };

    let cloudCoverSum = 0;
    let cloudCoverCount = 0;

    items.forEach(item => {
      // Collection stats
      if (item.collection) {
        stats.collections.add(item.collection);
      }

      // Date range stats
      const date = new Date(item.properties?.datetime);
      if (!isNaN(date)) {
        if (!stats.dateRange.min || date < stats.dateRange.min) {
          stats.dateRange.min = date;
        }
        if (!stats.dateRange.max || date > stats.dateRange.max) {
          stats.dateRange.max = date;
        }
      }

      // Cloud cover stats
      const cloudCover = item.properties?.['eo:cloud_cover'];
      if (typeof cloudCover === 'number') {
        stats.cloudCoverStats.min = Math.min(stats.cloudCoverStats.min, cloudCover);
        stats.cloudCoverStats.max = Math.max(stats.cloudCoverStats.max, cloudCover);
        cloudCoverSum += cloudCover;
        cloudCoverCount++;
      }
    });

    // Calculate averages
    stats.cloudCoverStats.avg = cloudCoverCount > 0 ? cloudCoverSum / cloudCoverCount : 0;
    stats.collectionsArray = Array.from(stats.collections);

    this.sendResult(id, stats);
  }

  /**
   * Parse large JSON files safely
   */
  parseLargeJSON(id, { jsonString, options = {} }) {
    try {
      const data = JSON.parse(jsonString);

      if (options.validate) {
        if (options.type === 'stac-catalog' && !this.validateSTACCatalog(data)) {
          throw new Error('Invalid STAC catalog structure');
        }
      }

      this.sendResult(id, data);
    } catch (error) {
      this.sendError(id, `JSON parsing failed: ${error.message}`);
    }
  }

  /**
   * Process geometry operations
   */
  processGeometry(id, { operation, geometry, options = {} }) {
    let result;

    switch (operation) {
      case 'simplify':
        result = this.simplifyGeometry(geometry, options.tolerance);
        break;
      case 'bounds':
        result = this.calculateBounds(geometry);
        break;
      case 'area':
        result = this.calculateGeometryArea(geometry);
        break;
      case 'intersects':
        result = this.checkIntersection(geometry, options.target);
        break;
      default:
        throw new Error(`Unknown geometry operation: ${operation}`);
    }

    this.sendResult(id, result);
  }

  // Helper methods

  validateSTACItem(item) {
    return (
      item &&
      typeof item === 'object' &&
      item.type === 'Feature' &&
      item.id &&
      item.properties &&
      item.geometry
    );
  }

  enhanceSTACItem(item, options) {
    const enhanced = { ...item };

    // Add computed properties
    enhanced.computed = {
      area: this.calculateItemArea(item),
      centroid: this.calculateCentroid(item.geometry),
      thumbnailUrl: this.extractThumbnailUrl(item),
      previewUrl: this.extractPreviewUrl(item),
    };

    // Add search relevance score if search terms provided
    if (options.searchTerms) {
      enhanced.computed.relevance = this.calculateRelevance(item, options.searchTerms);
    }

    return enhanced;
  }

  applyFilters(item, filters) {
    // Date filter
    if (filters.dateRange) {
      const itemDate = new Date(item.properties?.datetime);
      if (itemDate < filters.dateRange.start || itemDate > filters.dateRange.end) {
        return false;
      }
    }

    // Cloud cover filter
    if (filters.cloudCover !== undefined) {
      const cloudCover = item.properties?.['eo:cloud_cover'];
      if (cloudCover === undefined || cloudCover > filters.cloudCover) {
        return false;
      }
    }

    // Collection filter
    if (filters.collections && filters.collections.length > 0) {
      if (!filters.collections.includes(item.collection)) {
        return false;
      }
    }

    // Spatial filter
    if (filters.geometry) {
      if (!this.checkIntersection(item.geometry, filters.geometry)) {
        return false;
      }
    }

    return true;
  }

  calculateItemArea(item) {
    if (!item.geometry || !item.geometry.coordinates) {
      return 0;
    }
    return this.calculateGeometryArea(item.geometry);
  }

  calculateGeometryArea(geometry) {
    // Simplified area calculation for polygons
    if (geometry.type === 'Polygon') {
      const coords = geometry.coordinates[0];
      let area = 0;
      for (let i = 0; i < coords.length - 1; i++) {
        area += coords[i][0] * coords[i + 1][1];
        area -= coords[i + 1][0] * coords[i][1];
      }
      return Math.abs(area) / 2;
    }
    return 0;
  }

  calculateCentroid(geometry) {
    if (geometry.type === 'Polygon') {
      const coords = geometry.coordinates[0];
      let x = 0,
        y = 0;
      for (const coord of coords) {
        x += coord[0];
        y += coord[1];
      }
      return [x / coords.length, y / coords.length];
    }
    return [0, 0];
  }

  extractThumbnailUrl(item) {
    const thumbnail = item.assets?.thumbnail;
    return thumbnail?.href || null;
  }

  extractPreviewUrl(item) {
    const preview = item.assets?.preview;
    return preview?.href || null;
  }

  calculateRelevance(item, searchTerms) {
    let score = 0;
    const searchText = searchTerms.toLowerCase();

    // Check title and description
    const title = (item.properties?.title || '').toLowerCase();
    const description = (item.properties?.description || '').toLowerCase();

    if (title.includes(searchText)) {
      score += 2;
    }
    if (description.includes(searchText)) {
      score += 1;
    }

    return score;
  }

  parseTemporalExtent(temporal) {
    if (!temporal || !temporal.interval) {
      return null;
    }
    return {
      start: temporal.interval[0][0],
      end: temporal.interval[0][1],
    };
  }

  parseSpatialExtent(spatial) {
    if (!spatial || !spatial.bbox) {
      return null;
    }
    return {
      bbox: spatial.bbox[0],
    };
  }

  extractKeywords(collection) {
    const keywords = [];
    if (collection.keywords) {
      keywords.push(...collection.keywords);
    }
    if (collection.properties?.keywords) {
      keywords.push(...collection.properties.keywords);
    }
    return [...new Set(keywords)];
  }

  calculateBounds(geometry) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    const processCoordinates = coords => {
      if (typeof coords[0] === 'number') {
        minX = Math.min(minX, coords[0]);
        maxX = Math.max(maxX, coords[0]);
        minY = Math.min(minY, coords[1]);
        maxY = Math.max(maxY, coords[1]);
      } else {
        coords.forEach(processCoordinates);
      }
    };

    processCoordinates(geometry.coordinates);
    return [minX, minY, maxX, maxY];
  }

  simplifyGeometry(geometry, tolerance = 0.01) {
    // Simplified Douglas-Peucker algorithm implementation
    if (geometry.type !== 'Polygon') {
      return geometry;
    }

    const simplified = {
      ...geometry,
      coordinates: geometry.coordinates.map(ring => this.simplifyRing(ring, tolerance)),
    };

    return simplified;
  }

  simplifyRing(ring, tolerance) {
    if (ring.length <= 2) {
      return ring;
    }

    // Find the point with maximum distance
    let maxDistance = 0;
    let maxIndex = 0;

    const start = ring[0];
    const end = ring[ring.length - 1];

    for (let i = 1; i < ring.length - 1; i++) {
      const distance = this.pointToLineDistance(ring[i], start, end);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    if (maxDistance > tolerance) {
      const left = this.simplifyRing(ring.slice(0, maxIndex + 1), tolerance);
      const right = this.simplifyRing(ring.slice(maxIndex), tolerance);
      return left.slice(0, -1).concat(right);
    } else {
      return [start, end];
    }
  }

  pointToLineDistance(point, lineStart, lineEnd) {
    const [px, py] = point;
    const [x1, y1] = lineStart;
    const [x2, y2] = lineEnd;

    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
      return Math.sqrt(A * A + B * B);
    }

    const param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  checkIntersection(geometry1, geometry2) {
    // Simplified bounding box intersection check
    const bounds1 = this.calculateBounds(geometry1);
    const bounds2 = this.calculateBounds(geometry2);

    return !(
      bounds1[2] < bounds2[0] ||
      bounds2[2] < bounds1[0] ||
      bounds1[3] < bounds2[1] ||
      bounds2[3] < bounds1[1]
    );
  }

  validateSTACCatalog(catalog) {
    return (
      catalog &&
      typeof catalog === 'object' &&
      catalog.type === 'Catalog' &&
      catalog.id &&
      catalog.description &&
      Array.isArray(catalog.links)
    );
  }
}

// Initialize the worker
new STACDataWorker();
