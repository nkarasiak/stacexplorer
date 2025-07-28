// Test script to debug the route pattern matching
const routes = {
    viewCatalogCollectionItem: /^\/viewer\/([^\/]+)\/([^\/]+)\/([^\/]+)\/?$/, 
    viewCatalogCollection: /^\/viewer\/([^\/]+)\/([^\/]+)\/?$/ 
};

const testUrl = '/viewer/microsoft-pc/sentinel-1-rtc/S1A_IW_GRDH_1SDV_20250713T092822_20250713T092849_060063_rtc';

console.log('Testing URL:', testUrl);

for (const [routeName, pattern] of Object.entries(routes)) {
    const match = testUrl.match(pattern);
    if (match) {
        console.log(`✅ Matched route: ${routeName}`);
        console.log('  Matches:', match.slice(1));
        console.log('  catalogId:', match[1]);
        console.log('  collectionId:', match[2]);
        console.log('  itemId:', match[3]);
    } else {
        console.log(`❌ No match for route: ${routeName}`);
    }
}

// Test catalog ID resolution
const catalogId = 'microsoft-pc';
const legacyAliases = {
    'copernicus': 'cdse-stac',
    'element84': 'earth-search-aws', 
    'planetary': 'microsoft-pc'
};

console.log('\nCatalog ID resolution:');
console.log('Input catalogId:', catalogId);
console.log('Legacy mapping exists for "planetary":', legacyAliases['planetary']);
console.log('Legacy mapping exists for "microsoft-pc":', legacyAliases['microsoft-pc']);

// Check the item ID format
const itemId = 'S1A_IW_GRDH_1SDV_20250713T092822_20250713T092849_060063_rtc';
console.log('\nItem ID analysis:');
console.log('Item ID:', itemId);
console.log('Length:', itemId.length);
console.log('Contains special chars:', /[^a-zA-Z0-9_-]/.test(itemId));