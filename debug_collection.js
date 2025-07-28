// Test script to debug collection and item fetching
async function testCollectionAndItem() {
    const catalogEndpoint = {
        root: 'https://planetarycomputer.microsoft.com/api/stac/v1',
        collections: 'https://planetarycomputer.microsoft.com/api/stac/v1/collections',
        search: 'https://planetarycomputer.microsoft.com/api/stac/v1/search'
    };
    
    const collectionId = 'sentinel-1-rtc';
    const itemId = 'S1A_IW_GRDH_1SDV_20250713T092822_20250713T092849_060063_rtc';
    
    console.log('=== Testing collection and item fetching ===');
    console.log('Catalog:', catalogEndpoint.root);
    console.log('Collection ID:', collectionId);
    console.log('Item ID:', itemId);
    
    try {
        // 1. Test getting collections
        console.log('\n1. Fetching collections...');
        const collectionsResponse = await fetch(catalogEndpoint.collections);
        if (!collectionsResponse.ok) {
            throw new Error(`Collections fetch failed: ${collectionsResponse.status}`);
        }
        
        const collectionsData = await collectionsResponse.json();
        console.log('✅ Collections fetched successfully');
        console.log('Total collections:', collectionsData.collections.length);
        
        // Check if sentinel-1-rtc exists
        const sentinelCollection = collectionsData.collections.find(c => c.id === collectionId);
        if (sentinelCollection) {
            console.log('✅ Found collection:', sentinelCollection.title);
            console.log('Collection description:', sentinelCollection.description);
        } else {
            console.log('❌ Collection not found!');
            console.log('Available collections:', collectionsData.collections.map(c => c.id).slice(0, 10));
            return;
        }
        
        // 2. Test searching for items in the collection
        console.log('\n2. Searching for items in collection...');
        const searchParams = {
            collections: [collectionId],
            limit: 10
        };
        
        const searchResponse = await fetch(catalogEndpoint.search, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(searchParams)
        });
        
        if (!searchResponse.ok) {
            throw new Error(`Search failed: ${searchResponse.status}`);
        }
        
        const searchData = await searchResponse.json();
        console.log('✅ Search successful');
        console.log('Items found:', searchData.features?.length || 0);
        
        if (searchData.features && searchData.features.length > 0) {
            console.log('Sample item IDs:', searchData.features.slice(0, 5).map(f => f.id));
            
            // Check if our specific item exists
            const targetItem = searchData.features.find(f => f.id === itemId);
            if (targetItem) {
                console.log('✅ Target item found!');
                console.log('Item properties:', targetItem.properties);
            } else {
                console.log('❌ Target item not found in search results');
                console.log('Looking for:', itemId);
            }
        }
        
        // 3. Try to fetch the specific item directly
        console.log('\n3. Trying to fetch specific item...');
        const itemUrl = `${catalogEndpoint.root}/collections/${collectionId}/items/${itemId}`;
        console.log('Item URL:', itemUrl);
        
        const itemResponse = await fetch(itemUrl);
        if (itemResponse.ok) {
            const itemData = await itemResponse.json();
            console.log('✅ Item fetched directly!');
            console.log('Item ID:', itemData.id);
            console.log('Item datetime:', itemData.properties?.datetime);
        } else {
            console.log('❌ Direct item fetch failed:', itemResponse.status, itemResponse.statusText);
            
            // Try with URL encoding
            const encodedItemId = encodeURIComponent(itemId);
            const encodedItemUrl = `${catalogEndpoint.root}/collections/${collectionId}/items/${encodedItemId}`;
            console.log('Trying encoded URL:', encodedItemUrl);
            
            const encodedResponse = await fetch(encodedItemUrl);
            if (encodedResponse.ok) {
                const encodedItemData = await encodedResponse.json();
                console.log('✅ Item fetched with encoding!');
                console.log('Item ID:', encodedItemData.id);
            } else {
                console.log('❌ Encoded item fetch also failed:', encodedResponse.status);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testCollectionAndItem();