/**
 * GeometryUtils.js - Utility functions for handling geometric data formats
 *
 * This utility provides functions for detecting and converting between
 * different geometric formats (WKT, GeoJSON) and extracting information
 * from them such as bounding boxes.
 */

/**
 * Check if a string appears to be a valid WKT (Well-Known Text) format
 *
 * @param {string} text - Text to check for WKT format
 * @returns {boolean} - True if the text appears to be WKT
 */
export function isWKT(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // Trim and normalize whitespace
  text = text.trim().replace(/\s+/g, ' ');

  // Check for common WKT types
  const wktPattern =
    /^(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|GEOMETRYCOLLECTION)\s*\(.+\)$/i;
  return wktPattern.test(text);
}

/**
 * Convert a WKT (Well-Known Text) string to GeoJSON format
 *
 * @param {string} wkt - Well-Known Text string
 * @returns {Object|null} - GeoJSON object or null if parsing fails
 */
export function wktToGeoJSON(wkt) {
  if (!wkt || typeof wkt !== 'string') {
    return null;
  }

  // Trim and normalize whitespace
  wkt = wkt.trim().replace(/\s+/g, ' ');

  try {
    // Extract the geometry type and coordinates part
    const matches = wkt.match(
      /^(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|GEOMETRYCOLLECTION)\s*\((.+)\)$/i
    );

    if (!matches || matches.length < 3) {
      console.error('Invalid WKT format:', wkt);
      return null;
    }

    const type = matches[1].toUpperCase();
    const coordsText = matches[2];

    // Initialize the GeoJSON object
    const geojson = {
      type: 'Feature',
      geometry: {
        type: null,
        coordinates: null,
      },
      properties: {},
    };

    // Parse coordinates based on geometry type
    switch (type) {
      case 'POINT':
        geojson.geometry.type = 'Point';
        geojson.geometry.coordinates = parsePointCoordinates(coordsText);
        break;

      case 'LINESTRING':
        geojson.geometry.type = 'LineString';
        geojson.geometry.coordinates = parseLineStringCoordinates(coordsText);
        break;

      case 'POLYGON':
        geojson.geometry.type = 'Polygon';
        geojson.geometry.coordinates = parsePolygonCoordinates(coordsText);
        break;

      case 'MULTIPOINT':
        geojson.geometry.type = 'MultiPoint';
        geojson.geometry.coordinates = parseMultiPointCoordinates(coordsText);
        break;

      case 'MULTILINESTRING':
        geojson.geometry.type = 'MultiLineString';
        geojson.geometry.coordinates = parseMultiLineStringCoordinates(coordsText);
        break;

      case 'MULTIPOLYGON':
        geojson.geometry.type = 'MultiPolygon';
        geojson.geometry.coordinates = parseMultiPolygonCoordinates(coordsText);
        break;

      case 'GEOMETRYCOLLECTION':
        // GeometryCollection is more complex and not fully implemented
        console.warn('GeometryCollection WKT is not fully supported');
        return null;

      default:
        console.error('Unsupported WKT type:', type);
        return null;
    }

    return geojson;
  } catch (error) {
    console.error('Error parsing WKT:', error);
    return null;
  }
}

/**
 * Parse a WKT point coordinate string into GeoJSON format
 *
 * @param {string} coordsText - Coordinate text from WKT (e.g. "30 10")
 * @returns {Array} - GeoJSON coordinates [longitude, latitude]
 */
function parsePointCoordinates(coordsText) {
  const coords = coordsText.trim().split(/\s+/);

  if (coords.length < 2) {
    throw new Error(`Invalid point coordinates: ${coordsText}`);
  }

  // WKT format is typically "X Y" (longitude latitude)
  return [parseFloat(coords[0]), parseFloat(coords[1])];
}

/**
 * Parse a WKT linestring coordinate string into GeoJSON format
 *
 * @param {string} coordsText - Coordinate text from WKT
 * @returns {Array} - Array of GeoJSON coordinates
 */
function parseLineStringCoordinates(coordsText) {
  const points = coordsText.split(',').map(point => point.trim());

  return points.map(point => {
    const coords = point.split(/\s+/);
    return [parseFloat(coords[0]), parseFloat(coords[1])];
  });
}

/**
 * Parse a WKT polygon coordinate string into GeoJSON format
 *
 * @param {string} coordsText - Coordinate text from WKT
 * @returns {Array} - Array of arrays of GeoJSON coordinates
 */
function parsePolygonCoordinates(coordsText) {
  // Handle multiple rings (outer ring and holes)
  const rings = coordsText.split(/\)\s*,\s*\(/);

  // Clean up the first and last ring's parentheses
  rings[0] = rings[0].replace(/^\(\s*/, '');
  rings[rings.length - 1] = rings[rings.length - 1].replace(/\s*\)$/, '');

  return rings.map(ring => {
    const points = ring.split(',').map(point => point.trim());

    return points.map(point => {
      const coords = point.split(/\s+/);
      return [parseFloat(coords[0]), parseFloat(coords[1])];
    });
  });
}

/**
 * Parse a WKT multipoint coordinate string into GeoJSON format
 *
 * @param {string} coordsText - Coordinate text from WKT
 * @returns {Array} - Array of GeoJSON coordinates
 */
function parseMultiPointCoordinates(coordsText) {
  // MultiPoint can be in two formats:
  // 1. (10 40, 40 30, 20 20, 30 10) - without parentheses around each point
  // 2. ((10 40), (40 30), (20 20), (30 10)) - with parentheses around each point

  if (coordsText.includes('(')) {
    // Format 2: With parentheses around each point
    const points = coordsText.split(/\)\s*,\s*\(/);

    // Clean up the first and last point's parentheses
    points[0] = points[0].replace(/^\(\s*/, '');
    points[points.length - 1] = points[points.length - 1].replace(/\s*\)$/, '');

    return points.map(point => {
      const coords = point.trim().split(/\s+/);
      return [parseFloat(coords[0]), parseFloat(coords[1])];
    });
  } else {
    // Format 1: Without parentheses around each point
    return parseLineStringCoordinates(coordsText);
  }
}

/**
 * Parse a WKT multilinestring coordinate string into GeoJSON format
 *
 * @param {string} coordsText - Coordinate text from WKT
 * @returns {Array} - Array of arrays of GeoJSON coordinates
 */
function parseMultiLineStringCoordinates(coordsText) {
  const lineStrings = coordsText.split(/\)\s*,\s*\(/);

  // Clean up the first and last linestring's parentheses
  lineStrings[0] = lineStrings[0].replace(/^\(\s*/, '');
  lineStrings[lineStrings.length - 1] = lineStrings[lineStrings.length - 1].replace(/\s*\)$/, '');

  return lineStrings.map(lineString => {
    return parseLineStringCoordinates(lineString);
  });
}

/**
 * Parse a WKT multipolygon coordinate string into GeoJSON format
 *
 * @param {string} coordsText - Coordinate text from WKT
 * @returns {Array} - Array of arrays of arrays of GeoJSON coordinates
 */
function parseMultiPolygonCoordinates(coordsText) {
  // Split by ))), which separates polygons in a multipolygon
  const polygons = coordsText.split(/\)\s*\)\s*,\s*\(\s*\(/);

  // Clean up the first and last polygon's parentheses
  polygons[0] = polygons[0].replace(/^\(\s*\(\s*/, '');
  polygons[polygons.length - 1] = polygons[polygons.length - 1].replace(/\s*\)\s*\)$/, '');

  return polygons.map(polygon => {
    return parsePolygonCoordinates(polygon);
  });
}

/**
 * Check if a string appears to be a valid GeoJSON format
 *
 * @param {string} text - Text to check for GeoJSON format
 * @returns {boolean} - True if the text appears to be GeoJSON
 */
export function isGeoJSON(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  try {
    const json = JSON.parse(text);

    // Check for GeoJSON type property
    if (!json.type) {
      return false;
    }

    // Check for common GeoJSON types (including Geometry objects)
    const validTypes = [
      'Feature',
      'FeatureCollection', // Feature types
      'Point',
      'LineString',
      'Polygon', // Geometry types
      'MultiPoint',
      'MultiLineString', // Multi-geometry types
      'MultiPolygon',
      'GeometryCollection', // Collection types
    ];

    if (!validTypes.includes(json.type)) {
      return false;
    }

    // For Feature objects, check for geometry
    if (json.type === 'Feature' && !json.geometry) {
      return false;
    }

    // For FeatureCollection, check for features array
    if (json.type === 'FeatureCollection' && !json.features) {
      return false;
    }

    // For Geometry objects, check for coordinates (except GeometryCollection)
    if (
      ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'].includes(
        json.type
      ) &&
      !json.coordinates
    ) {
      return false;
    }

    // For GeometryCollection, check for geometries array
    if (json.type === 'GeometryCollection' && !json.geometries) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Parse GeoJSON string to object
 *
 * @param {string} text - GeoJSON string
 * @returns {Object|null} - GeoJSON object or null if parsing fails
 */
export function parseGeoJSON(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  try {
    const json = JSON.parse(text);

    // Ensure it's a valid GeoJSON object
    if (!isGeoJSON(text)) {
      return null;
    }

    // If it's a Geometry object (not wrapped in Feature), wrap it
    if (
      [
        'Point',
        'LineString',
        'Polygon',
        'MultiPoint',
        'MultiLineString',
        'MultiPolygon',
        'GeometryCollection',
      ].includes(json.type)
    ) {
      // Convert Geometry to Feature for consistent handling
      return {
        type: 'Feature',
        geometry: json,
        properties: {},
      };
    }

    // Return as-is for Feature or FeatureCollection
    return json;
  } catch (error) {
    console.error('Error parsing GeoJSON:', error);
    return null;
  }
}

/**
 * Extract a bounding box from a GeoJSON object
 *
 * @param {Object} geojson - GeoJSON object
 * @returns {Array|null} - Bounding box [west, south, east, north] or null if extraction fails
 */
export function geojsonToBbox(geojson) {
  if (!geojson) {
    return null;
  }

  try {
    let coordinates = [];

    // Extract coordinates based on GeoJSON type
    if (geojson.type === 'Feature') {
      if (!geojson.geometry) {
        return null;
      }
      return geojsonToBbox(geojson.geometry);
    } else if (geojson.type === 'FeatureCollection') {
      if (!geojson.features || !geojson.features.length) {
        return null;
      }

      // Combine bboxes from all features
      const bboxes = geojson.features
        .map(feature => geojsonToBbox(feature))
        .filter(bbox => bbox !== null);

      if (!bboxes.length) {
        return null;
      }

      // Find the enclosing bbox
      return [
        Math.min(...bboxes.map(bbox => bbox[0])),
        Math.min(...bboxes.map(bbox => bbox[1])),
        Math.max(...bboxes.map(bbox => bbox[2])),
        Math.max(...bboxes.map(bbox => bbox[3])),
      ];
    } else if (geojson.type === 'GeometryCollection') {
      if (!geojson.geometries || !geojson.geometries.length) {
        return null;
      }

      // Combine bboxes from all geometries
      const bboxes = geojson.geometries
        .map(geometry => geojsonToBbox(geometry))
        .filter(bbox => bbox !== null);

      if (!bboxes.length) {
        return null;
      }

      // Find the enclosing bbox
      return [
        Math.min(...bboxes.map(bbox => bbox[0])),
        Math.min(...bboxes.map(bbox => bbox[1])),
        Math.max(...bboxes.map(bbox => bbox[2])),
        Math.max(...bboxes.map(bbox => bbox[3])),
      ];
    }

    // Handle different geometry types
    switch (geojson.type) {
      case 'Point':
        coordinates = [geojson.coordinates];
        break;

      case 'LineString':
      case 'MultiPoint':
        coordinates = geojson.coordinates;
        break;

      case 'Polygon':
      case 'MultiLineString':
        coordinates = geojson.coordinates.flat();
        break;

      case 'MultiPolygon':
        coordinates = geojson.coordinates.flat(2);
        break;

      default:
        return null;
    }

    // Calculate bbox from coordinates
    if (!coordinates.length) {
      return null;
    }

    const xs = coordinates.map(coord => coord[0]);
    const ys = coordinates.map(coord => coord[1]);

    return [
      Math.min(...xs), // west
      Math.min(...ys), // south
      Math.max(...xs), // east
      Math.max(...ys), // north
    ];
  } catch (error) {
    console.error('Error extracting bbox from GeoJSON:', error);
    return null;
  }
}
