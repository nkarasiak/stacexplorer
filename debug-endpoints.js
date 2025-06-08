/**
 * Debug script for testing STAC endpoints directly
 * Run this in the browser console to test each endpoint
 */

// Test function to check STAC endpoints
async function debugSTACEndpoints() {
    const endpoints = {
        copernicus: {
            collections: 'https://stac.dataspace.copernicus.eu/v1/collections?limit=5',
            search: 'https://stac.dataspace.copernicus.eu/v1/search'
        },
        element84: {
            collections: 'https://earth-search.aws.element84.com/v1/collections?limit=5',
            search: 'https://earth-search.aws.element84.com/v1/search'
        }
    };
    
    console.log('🔍 Testing STAC endpoints...');
    
    for (const [source, urls] of Object.entries(endpoints)) {
        console.log(`\n📡 Testing ${source}:`);
        
        try {
            console.log(`🔗 Fetching: ${urls.collections}`);
            
            const response = await fetch(urls.collections);
            console.log(`📊 Response status: ${response.status} ${response.statusText}`);
            console.log(`📝 Response headers:`, [...response.headers.entries()]);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ ${source} error:`, errorText);
                continue;
            }
            
            const data = await response.json();
            console.log(`📋 ${source} response structure:`, Object.keys(data));
            
            if (data.collections) {
                console.log(`✅ ${source}: Found ${data.collections.length} collections`);
                console.log(`📄 First collection:`, data.collections[0]?.id || 'No collections');
            } else if (Array.isArray(data)) {
                console.log(`✅ ${source}: Found ${data.length} collections (direct array)`);
                console.log(`📄 First collection:`, data[0]?.id || 'No collections');
            } else {
                console.log(`⚠️ ${source}: Unexpected response format`, data);
            }
            
        } catch (error) {
            console.error(`❌ ${source} fetch error:`, error);
        }
    }
    
    console.log('\n🏁 Endpoint testing complete!');
}

// Run the debug function
debugSTACEndpoints();
