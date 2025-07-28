// Comprehensive diagnostic script for the viewer URL issue

// Step 1: Test if we can access the URL from the browser
console.log('=== Diagnostic Script for Viewer URL Issue ===');

// Test URL components
const testUrl = 'http://localhost:3000/viewer/microsoft-pc/sentinel-1-rtc/S1A_IW_GRDH_1SDV_20250713T092822_20250713T092849_060063_rtc';
const catalogId = 'microsoft-pc';
const collectionId = 'sentinel-1-rtc';
const itemId = 'S1A_IW_GRDH_1SDV_20250713T092822_20250713T092849_060063_rtc';

// Expected API endpoints
const expectedEndpoint = {
    root: 'https://planetarycomputer.microsoft.com/api/stac/v1',
    collections: 'https://planetarycomputer.microsoft.com/api/stac/v1/collections',
    search: 'https://planetarycomputer.microsoft.com/api/stac/v1/search'
};

async function diagnoseIssue() {
    console.log('1. Testing URL structure...');
    console.log('   URL:', testUrl);
    console.log('   Catalog ID:', catalogId);
    console.log('   Collection ID:', collectionId);
    console.log('   Item ID:', itemId);
    
    // Test route pattern
    const routePattern = /^\/viewer\/([^\/]+)\/([^\/]+)\/([^\/]+)\/?$/;
    const testPath = '/viewer/microsoft-pc/sentinel-1-rtc/S1A_IW_GRDH_1SDV_20250713T092822_20250713T092849_060063_rtc';
    
    const match = testPath.match(routePattern);
    if (match) {
        console.log('✅ Route pattern matches');
        console.log('   Extracted params:', match.slice(1));
    } else {
        console.log('❌ Route pattern does not match');
        return;
    }
    
    console.log('\n2. Testing API endpoints...');
    
    try {
        // Test catalog root
        console.log('   Testing catalog root...');
        const rootResponse = await fetch(expectedEndpoint.root);
        if (!rootResponse.ok) throw new Error(`Root API failed: ${rootResponse.status}`);
        const rootData = await rootResponse.json();
        console.log('   ✅ Catalog root accessible, ID:', rootData.id);
        
        // Test collections
        console.log('   Testing collections endpoint...');
        const collectionsResponse = await fetch(expectedEndpoint.collections);
        if (!collectionsResponse.ok) throw new Error(`Collections API failed: ${collectionsResponse.status}`);
        const collectionsData = await collectionsResponse.json();
        console.log('   ✅ Collections endpoint accessible, count:', collectionsData.collections?.length);
        
        // Check if our collection exists
        const targetCollection = collectionsData.collections?.find(c => c.id === collectionId);
        if (targetCollection) {
            console.log('   ✅ Target collection found:', targetCollection.title);
        } else {
            console.log('   ❌ Target collection not found');
            return;
        }
        
        // Test item endpoint
        console.log('   Testing item endpoint...');
        const itemUrl = `${expectedEndpoint.root}/collections/${collectionId}/items/${itemId}`;
        const itemResponse = await fetch(itemUrl);
        if (!itemResponse.ok) throw new Error(`Item API failed: ${itemResponse.status}`);
        const itemData = await itemResponse.json();
        console.log('   ✅ Item endpoint accessible, ID:', itemData.id);
        
        console.log('\n3. All API tests passed! ✅');
        console.log('\n4. Potential issues to check in browser console:');
        console.log('   - Check if UnifiedRouter is properly initialized');
        console.log('   - Check if stateManager.mapManager is available');
        console.log('   - Check for JavaScript errors during route processing');
        console.log('   - Look for console messages starting with "📍"');
        
        console.log('\n5. Browser debugging steps:');
        console.log('   1. Open browser dev tools (F12)');
        console.log('   2. Go to the viewer URL');
        console.log('   3. Check console for error messages');
        console.log('   4. Look for these specific log messages:');
        console.log('      - "📍 Processing path: /viewer/microsoft-pc/..."');
        console.log('      - "📍 Route match result: {name: \'viewCatalogCollectionItem\'}"');
        console.log('      - "📍 Handling view catalog+collection+item route:"');
        console.log('      - "📍 Found catalog for view mode:"');
        console.log('      - "📍 Setting API client endpoints to:"');
        console.log('      - Any error messages about map manager');
        
        console.log('\n6. Common issues and solutions:');
        console.log('   - If route not matched: Router initialization problem');
        console.log('   - If catalog not found: Catalog loading/config issue');
        console.log('   - If "map manager not available": Initialization order issue');
        console.log('   - If item fetch fails: API client endpoint configuration');
        
        // Test the exact workflow from the router
        console.log('\n7. Testing router workflow simulation...');
        await testRouterWorkflow();
        
    } catch (error) {
        console.log('❌ API test failed:', error.message);
    }
}

async function testRouterWorkflow() {
    try {
        console.log('   Simulating getCatalogConfig...');
        
        // Simulate the catalog lookup logic from UnifiedRouter
        const config = {
            stacEndpoints: {
                planetary: expectedEndpoint
            }
        };
        
        // Simulate getting available catalogs
        const catalogs = [];
        try {
            const response = await fetch(expectedEndpoint.root);
            const stacRoot = await response.json();
            
            catalogs.push({
                id: stacRoot.id || 'planetary',
                name: stacRoot.title || stacRoot.description || 'planetary',
                endpoint: expectedEndpoint,
                url: expectedEndpoint.root,
                configKey: 'planetary'
            });
        } catch (error) {
            catalogs.push({
                id: 'planetary',
                name: 'planetary',
                endpoint: expectedEndpoint,
                url: expectedEndpoint.root,
                configKey: 'planetary'
            });
        }
        
        console.log('   Available catalogs:', catalogs.map(c => c.id));
        
        // Test catalog lookup with microsoft-pc
        let catalog = catalogs.find(c => c.id === catalogId);
        
        if (!catalog) {
            const legacyAliases = {
                'copernicus': 'cdse-stac',
                'element84': 'earth-search-aws', 
                'planetary': 'microsoft-pc'
            };
            
            const realId = legacyAliases[catalogId];
            if (realId) {
                catalog = catalogs.find(c => c.id === realId);
            }
        }
        
        if (catalog) {
            console.log('   ✅ Catalog lookup successful:', catalog.name);
            console.log('   Catalog endpoints would be set to:', catalog.endpoint);
            
            // Test API client operations
            console.log('   Testing API client fetchItem simulation...');
            const itemUrl = `${catalog.endpoint.collections}/${collectionId}/items/${itemId}`;
            const itemResponse = await fetch(itemUrl);
            if (itemResponse.ok) {
                const itemData = await itemResponse.json();
                console.log('   ✅ fetchItem would succeed for item:', itemData.id);
                
                console.log('\n✅ Router workflow simulation completed successfully!');
                console.log('Issue is likely in the browser environment:');
                console.log('- Check if map manager is available when route handler runs');
                console.log('- Check for timing issues in state manager initialization');
                console.log('- Verify no JavaScript errors interrupt the flow');
                
            } else {
                console.log('   ❌ fetchItem would fail:', itemResponse.status);
            }
        } else {
            console.log('   ❌ Catalog lookup failed');
        }
        
    } catch (error) {
        console.log('   ❌ Router workflow simulation failed:', error.message);
    }
}

// Auto-run the diagnosis
diagnoseIssue();