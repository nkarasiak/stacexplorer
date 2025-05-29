/**
 * Tests for STACApiClient
 */

import { STACApiClient } from '../js/components/api/StacApiClient.js';

describe('STACApiClient', () => {
    let client;
    const mockEndpoints = {
        root: 'https://example.com/stac',
        collections: 'https://example.com/stac/collections',
        search: 'https://example.com/stac/search'
    };

    beforeEach(() => {
        client = new STACApiClient(mockEndpoints);
        fetch.mockClear();
    });

    describe('constructor', () => {
        test('should initialize with endpoints', () => {
            expect(client.endpoints).toEqual(mockEndpoints);
        });
    });

    describe('fetchCollections', () => {
        test('should fetch collections successfully', async () => {
            const mockCollections = [
                { id: 'collection1', title: 'Test Collection 1' },
                { id: 'collection2', title: 'Test Collection 2' }
            ];

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ collections: mockCollections })
            });

            const result = await client.fetchCollections();

            expect(fetch).toHaveBeenCalledWith(mockEndpoints.collections);
            expect(result).toEqual(mockCollections);
        });

        test('should handle fetch error', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(client.fetchCollections()).rejects.toThrow('Failed to fetch collections');
        });

        test('should handle HTTP error', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            });

            await expect(client.fetchCollections()).rejects.toThrow('Failed to fetch collections');
        });
    });

    describe('searchItems', () => {
        test('should search items successfully', async () => {
            const mockItems = [
                { id: 'item1', properties: { title: 'Test Item 1' } },
                { id: 'item2', properties: { title: 'Test Item 2' } }
            ];

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ features: mockItems })
            });

            const searchParams = { limit: 10 };
            const result = await client.searchItems(searchParams);

            expect(fetch).toHaveBeenCalledWith(mockEndpoints.search, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchParams)
            });
            expect(result).toEqual(mockItems);
        });
    });

    describe('connectToCustomCatalog', () => {
        test('should connect to valid STAC catalog', async () => {
            const mockCatalog = {
                stac_version: '1.0.0',
                links: [
                    { rel: 'collections', href: '/collections' },
                    { rel: 'search', href: '/search' }
                ]
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockCatalog
            });

            const result = await client.connectToCustomCatalog('https://custom.stac.com');

            expect(result).toEqual(mockCatalog);
            expect(client.endpoints.root).toBe('https://custom.stac.com');
        });

        test('should reject invalid STAC catalog', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ invalid: 'catalog' })
            });

            await expect(client.connectToCustomCatalog('https://invalid.com'))
                .rejects.toThrow('Invalid STAC catalog');
        });
    });
});
