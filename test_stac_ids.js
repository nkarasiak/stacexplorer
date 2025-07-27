// Test script to verify STAC catalog IDs
// This should show what IDs we expect to see in URLs

const endpoints = {
    'planetary': 'https://planetarycomputer.microsoft.com/api/stac/v1',
    'element84': 'https://earth-search.aws.element84.com/v1', 
    'copernicus': 'https://catalogue.dataspace.copernicus.eu/stac'
};

async function testEndpoint(name, url) {
    try {
        console.log(`\n=== Testing ${name} ===`);
        console.log(`URL: ${url}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log(`Real STAC ID: "${data.id}"`);
        console.log(`Real STAC Title: "${data.title}"`);
        console.log(`Expected URL pattern: /browser/${data.id}/collection-name`);
        
        return {
            configKey: name,
            realId: data.id,
            realTitle: data.title,
            endpoint: url
        };
    } catch (error) {
        console.error(`Error testing ${name}: ${error.message}`);
        return null;
    }
}

async function testAllEndpoints() {
    console.log('🧪 Testing STAC Catalog ID Detection');
    console.log('=====================================');
    
    const results = [];
    
    for (const [name, url] of Object.entries(endpoints)) {
        const result = await testEndpoint(name, url);
        if (result) {
            results.push(result);
        }
    }
    
    console.log('\n📋 Summary:');
    console.log('===========');
    results.forEach(r => {
        console.log(`${r.configKey} -> "${r.realId}" (${r.realTitle})`);
    });
    
    console.log('\n🔍 URLs should look like:');
    results.forEach(r => {
        console.log(`  /browser/${r.realId}/sentinel-2-l2a`);
    });
}

// Run the test
testAllEndpoints();