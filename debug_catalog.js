// Test script to debug catalog loading
const config = {
    stacEndpoints: {
        copernicus: {
            root: 'https://stac.dataspace.copernicus.eu/v1',
            collections: 'https://stac.dataspace.copernicus.eu/v1/collections',
            search: 'https://stac.dataspace.copernicus.eu/v1/search'
        },
        element84: {
            root: 'https://earth-search.aws.element84.com/v1',
            collections: 'https://earth-search.aws.element84.com/v1/collections',
            search: 'https://earth-search.aws.element84.com/v1/search'
        },
        planetary: {
            root: 'https://planetarycomputer.microsoft.com/api/stac/v1',
            collections: 'https://planetarycomputer.microsoft.com/api/stac/v1/collections',
            search: 'https://planetarycomputer.microsoft.com/api/stac/v1/search'
        }
    }
};

async function testCatalogLoading() {
    console.log('Testing catalog loading...');
    
    for (const [key, endpoint] of Object.entries(config.stacEndpoints)) {
        console.log(`\n--- Testing ${key} ---`);
        console.log('Root URL:', endpoint.root);
        
        try {
            console.log('Fetching STAC root...');
            const response = await fetch(endpoint.root);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const stacRoot = await response.json();
            console.log('✅ Success!');
            console.log('  STAC ID:', stacRoot.id);
            console.log('  Title:', stacRoot.title);
            console.log('  Description:', stacRoot.description);
            
            // Check if this is the microsoft-pc catalog
            if (stacRoot.id === 'microsoft-pc' || key === 'planetary') {
                console.log('🎯 This is the Microsoft Planetary Computer catalog!');
                console.log('  Full STAC root response:', JSON.stringify(stacRoot, null, 2));
            }
            
        } catch (error) {
            console.log('❌ Failed:', error.message);
        }
    }
}

// Test the specific catalog lookup
async function testCatalogLookup() {
    console.log('\n=== Testing catalog lookup for "microsoft-pc" ===');
    
    const catalogs = [];
    
    // Simulate the getAvailableCatalogs logic
    for (const [key, endpoint] of Object.entries(config.stacEndpoints)) {
        try {
            const response = await fetch(endpoint.root);
            const stacRoot = await response.json();
            
            const catalog = {
                id: stacRoot.id || key,
                name: stacRoot.title || stacRoot.description || key,
                endpoint: endpoint,
                url: endpoint.root,
                configKey: key
            };
            
            catalogs.push(catalog);
        } catch (error) {
            console.warn(`Failed to fetch ${key}:`, error.message);
            catalogs.push({
                id: key,
                name: key,
                endpoint: endpoint,
                url: endpoint.root,
                configKey: key
            });
        }
    }
    
    console.log('Available catalogs:', catalogs.map(c => ({ id: c.id, name: c.name, configKey: c.configKey })));
    
    // Test lookup
    const targetCatalogId = 'microsoft-pc';
    console.log(`\nLooking for catalog with ID: "${targetCatalogId}"`);
    
    let catalog = catalogs.find(c => c.id === targetCatalogId);
    
    if (!catalog) {
        console.log('Not found by direct ID lookup, trying legacy aliases...');
        const legacyAliases = {
            'copernicus': 'cdse-stac',
            'element84': 'earth-search-aws', 
            'planetary': 'microsoft-pc'
        };
        
        const realId = legacyAliases[targetCatalogId];
        if (realId) {
            console.log(`Legacy alias found: ${targetCatalogId} -> ${realId}`);
            catalog = catalogs.find(c => c.id === realId);
        }
    }
    
    if (catalog) {
        console.log('✅ Catalog found:', catalog);
    } else {
        console.log('❌ Catalog not found!');
    }
}

testCatalogLoading().then(() => testCatalogLookup()).catch(console.error);