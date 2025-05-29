/**
 * Test setup file for STAC Explorer
 */

// Mock fetch for testing
global.fetch = jest.fn();

// Mock maplibre-gl
global.maplibregl = {
    Map: jest.fn(() => ({
        on: jest.fn(),
        addControl: jest.fn(),
        remove: jest.fn(),
        getCanvas: jest.fn(() => ({ width: 800, height: 600 }))
    })),
    NavigationControl: jest.fn(),
    Marker: jest.fn(() => ({
        setLngLat: jest.fn(() => ({ addTo: jest.fn() }))
    }))
};

// Mock window.alert
global.alert = jest.fn();

// Mock console methods to reduce test noise
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};
