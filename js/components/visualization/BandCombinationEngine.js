/**
 * BandCombinationEngine.js - Smart band combination presets for STAC visualization
 * 
 * Provides intelligent band combinations and expressions for different satellite data types
 * Compatible with TiTiler.xyz for dynamic raster visualization
 */

import { STACApiClient } from '../api/StacApiClient.js';

export class BandCombinationEngine {
    constructor() {
        this.presets = new Map();
        this.tilerBaseUrl = 'https://titiler.xyz';
        this.stacClient = new STACApiClient();
        this.initializePresets();
    }

    initializePresets() {
        // Landsat/Sentinel-2 optical presets
        this.presets.set('optical', {
            // RGB Composites
            'true-color': {
                name: '🌍 True Color',
                description: 'Natural color as seen by human eye',
                assets: ['red', 'green', 'blue'],
                rescale: '0,4000',
                resampling: 'bilinear',
                color_formula: 'sigmoidal RGB 7 0.65',
                category: 'composite'
            },
            'false-color': {
                name: '🌿 False Color (Vegetation)',
                description: 'Vegetation appears red, healthy plants bright red',
                assets: ['nir', 'red', 'green'], 
                rescale: '0,4000',
                resampling: 'bilinear',
                color_formula: 'sigmoidal RGB 7 0.65',
                category: 'composite'
            },
            'swir-composite': {
                name: '🔥 SWIR Composite',
                description: 'Enhanced for fire detection and burn scars',
                assets: ['swir22', 'nir', 'red'],
                rescale: '0,4000',
                resampling: 'bilinear',
                color_formula: 'sigmoidal RGB 7 0.65',
                category: 'composite'
            },
            'urban': {
                name: '🏙️ Urban Enhancement',
                description: 'Enhanced urban features and infrastructure',
                assets: ['swir22', 'swir11', 'red'],
                rescale: '0,4000',
                resampling: 'bilinear',
                color_formula: 'sigmoidal RGB 7 0.65',
                category: 'composite'
            },
            'geology': {
                name: '🗻 Geology',
                description: 'Geological features and rock type variations',
                assets: ['swir22', 'swir11', 'blue'],
                rescale: '0,4000',
                resampling: 'bilinear',
                color_formula: 'sigmoidal RGB 7 0.65',
                category: 'composite'
            },
            'agriculture': {
                name: '🚜 Agriculture',
                description: 'Optimized for crop health and field boundaries',
                assets: ['swir11', 'nir', 'red'],
                rescale: '0,4000',
                resampling: 'bilinear',
                color_formula: 'sigmoidal RGB 7 0.65',
                category: 'composite'
            },

            // Single Band (Monochrome)
            'red-mono': {
                name: '🔴 Red Band',
                description: 'Red wavelength only (monochrome)',
                assets: ['red'],
                rescale: '0,4000',
                colormap_name: 'gray',
                resampling: 'bilinear',
                category: 'monochrome'
            },
            'green-mono': {
                name: '🟢 Green Band',
                description: 'Green wavelength only (monochrome)',
                assets: ['green'],
                rescale: '0,4000',
                colormap_name: 'gray',
                resampling: 'bilinear',
                category: 'monochrome'
            },
            'blue-mono': {
                name: '🔵 Blue Band',
                description: 'Blue wavelength only (monochrome)',
                assets: ['blue'],
                rescale: '0,4000',
                colormap_name: 'gray',
                resampling: 'bilinear',
                category: 'monochrome'
            },
            'nir-mono': {
                name: '⚫ Near Infrared',
                description: 'NIR wavelength only (vegetation bright)',
                assets: ['nir'],
                rescale: '0,4000',
                colormap_name: 'gray',
                resampling: 'bilinear',
                category: 'monochrome'
            },
            'swir11-mono': {
                name: '🟤 SWIR 1 (1.6μm)',
                description: 'Short Wave Infrared 1 (monochrome)',
                assets: ['swir11'],
                rescale: '0,4000',
                colormap_name: 'gray',
                resampling: 'bilinear',
                category: 'monochrome'
            },
            'swir22-mono': {
                name: '🟫 SWIR 2 (2.2μm)',
                description: 'Short Wave Infrared 2 (monochrome)',
                assets: ['swir22'],
                rescale: '0,4000',
                colormap_name: 'gray',
                resampling: 'bilinear',
                category: 'monochrome'
            },

            // Indices
            'ndvi': {
                name: '🌱 NDVI (Vegetation Health)',
                description: 'Green = healthy vegetation, red = stressed/bare soil',
                expression: '(nir-red)/(nir+red)',
                rescale: '-1,1',
                colormap_name: 'rdylgn',
                resampling: 'bilinear',
                category: 'index'
            },
            'ndwi': {
                name: '💧 NDWI (Water Index)',
                description: 'Blue = water bodies, red = dry land',
                expression: '(green-nir)/(green+nir)',
                rescale: '-1,1',
                colormap_name: 'blues',
                resampling: 'bilinear',
                category: 'index'
            },
            'evi': {
                name: '🌾 EVI (Enhanced Vegetation)',
                description: 'Enhanced vegetation index with atmospheric correction',
                expression: '2.5*((nir-red)/(nir+6*red-7.5*blue+1))',
                rescale: '-1,1',
                colormap_name: 'rdylgn',
                resampling: 'bilinear',
                category: 'index'
            },
            'savi': {
                name: '🏜️ SAVI (Soil Adjusted)',
                description: 'Vegetation index adjusted for soil brightness',
                expression: '1.5*((nir-red)/(nir+red+0.5))',
                rescale: '-1,1',
                colormap_name: 'rdylgn',
                resampling: 'bilinear',
                category: 'index'
            }
        });

        // SAR presets (Sentinel-1)
        this.presets.set('sar', {
            // Single Polarization (Monochrome)
            'vv-gray': {
                name: '📡 VV Polarization (Gray)',
                description: 'VV polarization in grayscale - general backscatter',
                assets: ['vv'],
                rescale: '0,1',
                colormap_name: 'gray',
                resampling: 'bilinear',
                category: 'monochrome'
            },
            'vh-gray': {
                name: '📡 VH Polarization (Gray)', 
                description: 'VH cross-polarization in grayscale - vegetation & roughness',
                assets: ['vh'],
                rescale: '0,1',
                colormap_name: 'gray',
                resampling: 'bilinear',
                category: 'monochrome'
            },
            'vv-colored': {
                name: '🌈 VV Polarization (Colored)',
                description: 'VV polarization with color enhancement',
                assets: ['vv'],
                rescale: '0,1',
                colormap_name: 'viridis',
                resampling: 'bilinear',
                category: 'monochrome'
            },
            'vh-colored': {
                name: '🌈 VH Polarization (Colored)',
                description: 'VH polarization with color enhancement',
                assets: ['vh'],
                rescale: '0,1',
                colormap_name: 'plasma',
                resampling: 'bilinear',
                category: 'monochrome'
            },

            // Multi-band Composites
            'dual-pol-rgb': {
                name: '📡 Dual Pol RGB',
                description: 'VV (red), VH (green), VV/VH ratio (blue)',
                assets: ['vv', 'vh', 'vv'],
                rescale: '0,1',
                resampling: 'bilinear',
                category: 'composite'
            },
            'vv-vh-composite': {
                name: '🔄 VV-VH Composite',
                description: 'False color: VV (red), VH (green), VV (blue)',
                assets: ['vv', 'vh', 'vv'],
                rescale: '0,1',
                resampling: 'bilinear',
                category: 'composite'
            },

            // Derived Products
            'pol-ratio': {
                name: '📊 Polarization Ratio',
                description: 'VV/VH ratio for surface characterization',
                expression: 'vv/vh',
                rescale: '0,10',
                colormap_name: 'viridis',
                resampling: 'bilinear',
                category: 'ratio'
            },
            'pol-difference': {
                name: '➖ Polarization Difference',
                description: 'VV - VH difference for texture analysis',
                expression: 'vv-vh',
                rescale: '-10,10',
                colormap_name: 'rdbu',
                resampling: 'bilinear',
                category: 'ratio'
            }
        });

        // Planet/High-resolution optical
        this.presets.set('planet', {
            'natural': {
                name: '🌍 Natural Color',
                description: 'True color composite',
                assets: ['red', 'green', 'blue'],
                rescale: '400,2000',
                resampling: 'bilinear'
            },
            'nir-enhanced': {
                name: '🌿 NIR Enhanced',
                description: 'Near-infrared enhanced for vegetation',
                assets: ['nir', 'red', 'green'],
                rescale: '400,2000',
                resampling: 'bilinear'
            }
        });

        // Thermal/Elevation data
        this.presets.set('thermal', {
            'temperature': {
                name: '🌡️ Surface Temperature',
                description: 'Land surface temperature',
                assets: ['thermal'],
                rescale: '280,320',
                colormap_name: 'thermal',
                resampling: 'bilinear'
            }
        });

        this.presets.set('elevation', {
            'elevation-terrain': {
                name: '🏔️ Elevation (Terrain)',
                description: 'Digital elevation model with terrain colors',
                assets: ['data'],
                rescale: '0,4000',
                colormap_name: 'terrain',
                resampling: 'bilinear',
                category: 'terrain'
            },
            'elevation-viridis': {
                name: '🌈 Elevation (Viridis)',
                description: 'Digital elevation model with viridis colormap',
                assets: ['data'],
                rescale: '0,4000',
                colormap_name: 'viridis',
                resampling: 'bilinear',
                category: 'terrain'
            },
            'elevation-plasma': {
                name: '🔥 Elevation (Plasma)',
                description: 'Digital elevation model with plasma colormap',
                assets: ['data'],
                rescale: '0,4000',
                colormap_name: 'plasma',
                resampling: 'bilinear',
                category: 'terrain'
            },
            'elevation-gray': {
                name: '⚫ Elevation (Grayscale)',
                description: 'Digital elevation model in grayscale',
                assets: ['data'],
                rescale: '0,4000',
                colormap_name: 'gray',
                resampling: 'bilinear',
                category: 'terrain'
            },
            'hillshade': {
                name: '⛰️ Hillshade',
                description: 'Terrain visualization with shadows',
                assets: ['data'],
                rescale: '0,4000',
                colormap_name: 'gray',
                resampling: 'bilinear',
                category: 'terrain'
            }
        });
    }

    /**
     * Get appropriate presets for a STAC collection
     * @param {string} collectionId - STAC collection identifier
     * @returns {Object} Available presets for this collection
     */
    getPresetsForCollection(collectionId) {
        const id = collectionId.toLowerCase();
        
        // Landsat collections
        if (id.includes('landsat')) {
            return this.presets.get('optical');
        }
        
        // Sentinel-2 optical
        if (id.includes('sentinel-2') || id.includes('sentinel2')) {
            return this.presets.get('optical');
        }
        
        // Sentinel-1 SAR
        if (id.includes('sentinel-1') || id.includes('sentinel1')) {
            return this.presets.get('sar');
        }
        
        // Planet data
        if (id.includes('planet')) {
            return this.presets.get('planet');
        }
        
        // Elevation data (DEM, SRTM, elevation models)
        if (id.includes('dem') || id.includes('elevation') || id.includes('srtm') || id.includes('cop-dem')) {
            return this.presets.get('elevation');
        }
        
        // Thermal data
        if (id.includes('thermal') || id.includes('lst')) {
            return this.presets.get('thermal');
        }
        
        // Default to optical presets
        return this.presets.get('optical');
    }

    /**
     * Get a presigned URL for Planetary Computer blob storage
     * @param {string} url - Original blob storage URL
     * @returns {Promise<string>} - Presigned URL
     */
    async getPresignedUrl(url) {
        try {
            console.log(`🔗 [PRESIGN-ENGINE] Attempting to presign: ${url.substring(0, 80)}...`);
            
            // Extract collection from URL to determine the correct SAS token endpoint
            const collection = this.extractCollectionFromUrl(url);
            if (!collection) {
                console.warn(`🔗 [PRESIGN-ENGINE] Could not extract collection from URL: ${url}`);
                return url;
            }
            
            console.log(`🔗 [PRESIGN-ENGINE] Extracted collection: ${collection}`);
            
            // Use the correct SAS token endpoint for the specific collection
            const tokenEndpoint = `https://planetarycomputer.microsoft.com/api/sas/v1/token/${collection}`;
            console.log(`🔗 [PRESIGN-ENGINE] Requesting SAS token from: ${tokenEndpoint}`);
            
            const tokenResponse = await fetch(tokenEndpoint);
            
            console.log(`🔗 [PRESIGN-ENGINE] Response status: ${tokenResponse.status}`);
            
            if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                console.log(`🔗 [PRESIGN-ENGINE] Got SAS token:`, tokenData);
                
                if (tokenData.token) {
                    const presignedUrl = `${url}?${tokenData.token}`;
                    console.log(`🔗 [PRESIGN-ENGINE] Created presigned URL:`, presignedUrl);
                    return presignedUrl;
                }
            } else {
                const errorText = await tokenResponse.text();
                console.warn(`🔗 [PRESIGN-ENGINE] Token request failed:`, {
                    status: tokenResponse.status,
                    statusText: tokenResponse.statusText,
                    responseText: errorText
                });
            }
            
        } catch (error) {
            console.warn('🔗 [PRESIGN-ENGINE] Error during presigning:', error);
        }
        
        // Fallback to original URL if presigning fails
        console.log(`🔗 [PRESIGN-ENGINE] Using fallback URL: ${url}`);
        return url;
    }

    /**
     * Check if a URL needs Planetary Computer presigning
     * @param {string} url - URL to check
     * @returns {boolean} - Whether the URL needs presigning
     */
    needsPlanetaryComputerPresigning(url) {
        // List of Azure blob storage domains used by Planetary Computer
        const pcBlobDomains = [
            'sentinel1euwestrtc.blob.core.windows.net',
            'sentinel2l2a01.blob.core.windows.net',
            'modiseuwest.blob.core.windows.net',
            'landsateuwest.blob.core.windows.net',
            'naipeuwest.blob.core.windows.net',
            'ecmwfeuwest.blob.core.windows.net',
            'copernicusdem.blob.core.windows.net',
            // Add other PC blob domains as needed
        ];
        
        const needsPresigning = pcBlobDomains.some(domain => url.includes(domain));
        console.log(`🔍 [DOMAIN-CHECK] URL: ${url} | Needs presigning: ${needsPresigning}`);
        return needsPresigning;
    }

    /**
     * Extract collection name from Planetary Computer blob storage URL
     * @param {string} url - Blob storage URL
     * @returns {string|null} - Collection name or null if not found
     */
    extractCollectionFromUrl(url) {
        try {
            // Map blob storage containers to their corresponding collection names
            const containerToCollection = {
                'sentinel1euwestrtc': 'sentinel-1-rtc',
                'sentinel2l2a01': 'sentinel-2-l2a', 
                'modiseuwest': 'modis',
                'landsateuwest': 'landsat-c2-l2',
                'naipeuwest': 'naip',
                'ecmwfeuwest': 'era5-pds',
                'copernicusdem': 'cop-dem-glo-30'
            };
            
            // Extract container name from URL
            for (const [container, collection] of Object.entries(containerToCollection)) {
                if (url.includes(`${container}.blob.core.windows.net`)) {
                    return collection;
                }
            }
            
            // Fallback: try to extract from URL path patterns
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            
            // Extract container name from hostname (e.g., sentinel1euwestrtc.blob.core.windows.net)
            const containerMatch = hostname.match(/^([^.]+)\.blob\.core\.windows\.net$/);
            if (containerMatch) {
                const container = containerMatch[1];
                return containerToCollection[container] || container;
            }
            
            return null;
        } catch (error) {
            console.warn('🔗 [PRESIGN-ENGINE] Error extracting collection from URL:', error);
            return null;
        }
    }

    /**
     * Map generic band names (red, green, blue, nir, etc.) to actual asset names
     * using eo:bands metadata from STAC item
     * @param {Array} genericAssets - Array of generic asset names
     * @param {Object} stacItem - STAC item object  
     * @returns {Array} Array of actual asset names
     */
    mapGenericToActualAssets(genericAssets, stacItem) {
        if (!stacItem || !stacItem.assets) {
            console.warn('⚠️ [ASSET-MAP] No STAC item or assets provided, using generic names');
            return genericAssets;
        }

        const mappedAssets = [];
        
        for (const genericAsset of genericAssets) {
            const actualAsset = this.findAssetByBandCharacteristics(genericAsset, stacItem);
            if (actualAsset) {
                mappedAssets.push(actualAsset);
                console.log(`🔗 [ASSET-MAP] Mapped ${genericAsset} → ${actualAsset}`);
            } else {
                console.warn(`⚠️ [ASSET-MAP] Could not map ${genericAsset}, using as-is`);
                mappedAssets.push(genericAsset);
            }
        }
        
        return mappedAssets;
    }

    /**
     * Find actual asset name by analyzing eo:bands metadata
     * @param {string} genericName - Generic band name (red, green, blue, nir, etc.)
     * @param {Object} stacItem - STAC item object
     * @returns {string|null} Actual asset name or null if not found
     */
    findAssetByBandCharacteristics(genericName, stacItem) {
        const targetWavelengths = {
            'blue': { center: 490, range: [450, 520] },
            'green': { center: 560, range: [520, 600] },
            'red': { center: 665, range: [630, 700] },
            'nir': { center: 842, range: [760, 900] },
            'swir11': { center: 1610, range: [1550, 1750] },
            'swir22': { center: 2190, range: [2100, 2300] }
        };

        const target = targetWavelengths[genericName.toLowerCase()];
        if (!target) {
            console.warn(`⚠️ [ASSET-MAP] Unknown generic band: ${genericName}`);
            return null;
        }

        console.log(`🔍 [ASSET-MAP] Looking for ${genericName} band (${target.center}nm ±${target.range[1] - target.center}nm)`);

        // First try: Look through all assets for eo:bands metadata
        for (const [assetName, assetData] of Object.entries(stacItem.assets)) {
            if (assetData['eo:bands'] && Array.isArray(assetData['eo:bands'])) {
                for (const band of assetData['eo:bands']) {
                    if (band.center_wavelength) {
                        const wavelength = band.center_wavelength * 1000; // Convert to nm if needed
                        if (wavelength >= target.range[0] && wavelength <= target.range[1]) {
                            console.log(`✅ [ASSET-MAP] Found ${genericName} match: ${assetName} (${wavelength}nm)`);
                            return assetName;
                        }
                    }
                }
            }
        }

        // Second try: Direct name match (common case when assets are already named generically)
        if (stacItem.assets && stacItem.assets[genericName]) {
            console.log(`✅ [ASSET-MAP] Found direct match: ${genericName}`);
            return genericName;
        }

        // Third try: Common naming variations
        const variations = {
            'red': ['Red', 'RED', 'B04', 'B4', 'band_red', 'red_band'],
            'green': ['Green', 'GREEN', 'B03', 'B3', 'band_green', 'green_band'],
            'blue': ['Blue', 'BLUE', 'B02', 'B2', 'band_blue', 'blue_band'],
            'nir': ['NIR', 'near_infrared', 'near-infrared', 'B08', 'B8', 'band_nir', 'nir_band'],
            'swir11': ['SWIR11', 'swir1', 'SWIR1', 'B11', 'band_swir11'],
            'swir22': ['SWIR22', 'swir2', 'SWIR2', 'B12', 'band_swir22']
        };

        const possibleNames = variations[genericName.toLowerCase()] || [];
        for (const variation of possibleNames) {
            if (stacItem.assets && stacItem.assets[variation]) {
                console.log(`✅ [ASSET-MAP] Found variation match: ${genericName} → ${variation}`);
                return variation;
            }
        }

        console.log(`❌ [ASSET-MAP] No ${genericName} band found in eo:bands metadata, direct match, or variations`);
        console.log(`🔍 [ASSET-MAP] Available assets: ${Object.keys(stacItem.assets || {}).join(', ')}`);
        return null;
    }


    /**
     * Check if a URL is accessible for TiTiler (simple existence check)
     * @param {string} url - URL to check
     * @returns {Promise<boolean>} True if accessible, false otherwise
     */
    async checkUrlAccessibility(url) {
        try {
            console.log(`🔍 [URL-CHECK] Checking accessibility: ${url.substring(0, 80)}...`);
            
            // Check if URL looks valid (supports both HTTP/HTTPS and S3 URLs)
            const isValidUrl = url.startsWith('https://') || url.startsWith('http://') || url.startsWith('s3://');
            
            if (isValidUrl) {
                console.log(`✅ [URL-CHECK] URL appears valid: ${url.substring(0, 80)}...`);
                return true;
            } else {
                console.log(`❌ [URL-CHECK] Invalid URL format: ${url.substring(0, 80)}...`);
                return false;
            }
            
        } catch (error) {
            console.log(`❌ [URL-CHECK] URL check failed: ${url.substring(0, 80)}...`);
            console.log(`❌ [URL-CHECK] Error: ${error.message}`);
            return false;
        }
    }

    /**
     * Check if STAC item assets are accessible for TiTiler
     * @param {Object} stacItem - STAC item object
     * @param {Array} assetNames - Array of asset names to check
     * @returns {Promise<Object>} Object with accessibility results
     */
    async checkAssetsAccessibility(stacItem, assetNames) {
        const results = {
            accessible: [],
            inaccessible: [],
            allAccessible: false
        };

        if (!stacItem.assets) {
            console.log(`❌ [ASSETS-CHECK] No assets found in STAC item`);
            return results;
        }

        console.log(`🔍 [ASSETS-CHECK] Checking accessibility for assets: ${assetNames.join(', ')}`);

        // Check each asset
        for (const assetName of assetNames) {
            const asset = stacItem.assets[assetName];
            if (!asset || !asset.href) {
                console.log(`❌ [ASSETS-CHECK] Asset ${assetName} not found or has no href`);
                results.inaccessible.push(assetName);
                continue;
            }

            const isAccessible = await this.checkUrlAccessibility(asset.href);
            if (isAccessible) {
                results.accessible.push(assetName);
            } else {
                results.inaccessible.push(assetName);
            }
        }

        results.allAccessible = results.accessible.length === assetNames.length;
        
        console.log(`📊 [ASSETS-CHECK] Results: ${results.accessible.length}/${assetNames.length} accessible`);
        console.log(`✅ [ASSETS-CHECK] Accessible: ${results.accessible.join(', ')}`);
        if (results.inaccessible.length > 0) {
            console.log(`❌ [ASSETS-CHECK] Inaccessible: ${results.inaccessible.join(', ')}`);
        }

        return results;
    }

    /**
     * Get preset by key across all categories
     * @param {string} presetKey - Preset key to find
     * @returns {Object|null} Preset object or null if not found
     */
    getPresetByKey(presetKey) {
        for (const [category, presets] of this.presets) {
            if (presets[presetKey]) {
                return presets[presetKey];
            }
        }
        return null;
    }

    /**
     * Check if a STAC item can use TiTiler (has accessible data)
     * @param {Object} stacItem - STAC item object
     * @param {string} presetKey - Preset key to check (optional, checks all assets if not provided)
     * @returns {Promise<boolean>} True if TiTiler can be used, false otherwise
     */
    async canUseTiTiler(stacItem, presetKey = null) {
        if (!stacItem || !stacItem.assets) {
            console.log(`❌ [TITILER-CHECK] No STAC item or assets provided`);
            return false;
        }

        // If preset is specified, check only those assets
        if (presetKey) {
            const preset = this.getPresetByKey(presetKey);
            if (!preset || !preset.assets) {
                console.log(`❌ [TITILER-CHECK] Invalid preset or no assets in preset: ${presetKey}`);
                return false;
            }

            const mappedAssets = this.mapGenericToActualAssets ? 
                this.mapGenericToActualAssets(preset.assets, stacItem) : preset.assets;
            
            const results = await this.checkAssetsAccessibility(stacItem, mappedAssets);
            return results.allAccessible;
        }

        // Check all assets if no preset specified
        const allAssetNames = Object.keys(stacItem.assets);
        const results = await this.checkAssetsAccessibility(stacItem, allAssetNames);
        
        // Return true if at least some assets are accessible
        return results.accessible.length > 0;
    }


    /**
     * Build TiTiler URL for STAC item visualization with accessibility check
     * @param {string} stacItemUrl - URL to the STAC item JSON
     * @param {Object} preset - Visualization preset configuration
     * @param {number} z - Tile zoom level
     * @param {number} x - Tile X coordinate
     * @param {number} y - Tile Y coordinate
     * @param {Object} stacItem - STAC item object (optional)
     * @param {Object} scaleOptions - Scale options (optional)
     * @param {boolean} checkAccessibility - Whether to check URL accessibility (default: true)
     * @returns {Promise<string|null>} Complete TiTiler tile URL or null if not accessible
     */
    async buildTileUrlWithAccessibilityCheck(stacItemUrl, preset, z, x, y, stacItem = null, scaleOptions = {}, checkAccessibility = false) {
        console.log(`🌐 [TITILER] Building tile URL for preset: ${preset.name}`);
        console.log(`🌐 [TITILER] STAC item provided:`, !!stacItem);
        console.log(`🌐 [TITILER] Accessibility check enabled:`, checkAccessibility);
        
        // Check accessibility if requested and stacItem is provided
        if (checkAccessibility && stacItem && preset.assets) {
            const mappedAssets = this.mapGenericToActualAssets ? 
                this.mapGenericToActualAssets(preset.assets, stacItem) : preset.assets;
            
            const accessibilityResults = await this.checkAssetsAccessibility(stacItem, mappedAssets);
            
            if (!accessibilityResults.allAccessible) {
                console.log(`❌ [TITILER] Not all assets accessible, cannot use TiTiler`);
                return null;
            }
            
            console.log(`✅ [TITILER] All assets accessible, proceeding with TiTiler`);
        }
        
        // Call the original buildTileUrl function
        return await this.buildTileUrl(stacItemUrl, preset, z, x, y, stacItem, scaleOptions);
    }

    /**
     * Build TiTiler URL for STAC item visualization
     * @param {string} stacItemUrl - URL to the STAC item JSON
     * @param {Object} preset - Visualization preset configuration
     * @param {number} z - Tile zoom level
     * @param {number} x - Tile X coordinate
     * @param {number} y - Tile Y coordinate
     * @returns {string} Complete TiTiler tile URL
     */
    async buildTileUrl(stacItemUrl, preset, z, x, y, stacItem = null, scaleOptions = {}) {
        console.log(`🌐 [TITILER] Building tile URL for preset: ${preset.name}`);
        console.log(`🌐 [TITILER] STAC item provided:`, !!stacItem);
        
        // For single asset presets (not expressions) OR when stacItemUrl is null, use direct COG endpoint
        if ((preset.assets && preset.assets.length === 1 && !preset.expression && stacItem) || (stacItemUrl === null && stacItem && !preset.expression)) {
            const assetName = preset.assets[0];
            const actualAssetName = this.mapGenericToActualAssets ? 
                this.mapGenericToActualAssets([assetName], stacItem)[0] : assetName;
            
            if (stacItem.assets && stacItem.assets[actualAssetName]) {
                const assetUrl = stacItem.assets[actualAssetName].href;
                console.log(`🔗 [TITILER] Using direct URL: ${assetUrl}`);
                const params = new URLSearchParams();
                params.set('url', assetUrl);
                
                // Use scale options if provided, otherwise use preset rescale
                const rescaleValue = (scaleOptions.minScale !== undefined && scaleOptions.maxScale !== undefined) 
                    ? `${scaleOptions.minScale},${scaleOptions.maxScale}` 
                    : preset.rescale;
                if (rescaleValue) params.set('rescale', rescaleValue);
                if (preset.colormap_name) params.set('colormap_name', preset.colormap_name);
                if (preset.resampling) params.set('resampling_method', preset.resampling);
                // Only apply color_formula to RGB/3-band compositions
                if (preset.color_formula && preset.assets && preset.assets.length === 3) {
                    params.set('color_formula', preset.color_formula);
                }
                
                // Use correct TiTiler format: /cog/tiles/{tileMatrixSetId}/{z}/{x}/{y}.{format}
                const tileUrl = `${this.tilerBaseUrl}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?${params.toString()}`;
                console.log(`🌐 [TITILER] Using direct COG endpoint (single asset)`);
                console.log(`🌐 [TITILER] Asset URL: ${assetUrl.substring(0, 80)}...`);
                console.log(`🌐 [TITILER] Tile URL: ${tileUrl}`);
                return tileUrl;
            } else {
                console.error(`❌ [TITILER] Asset '${actualAssetName}' not found in STAC item`);
                console.error(`❌ [TITILER] Available assets:`, Object.keys(stacItem.assets || {}));
                console.error(`❌ [TITILER] Looking for asset name: ${assetName} -> ${actualAssetName}`);
            }
        }
        
        // For RGB composites with Planetary Computer assets, use PC's own TiTiler API
        if (preset.assets && preset.assets.length > 1 && !preset.expression && stacItem) {
            // Check if this is a Planetary Computer item that needs presigning
            let needsPresigning = false;
            if (stacItem.assets) {
                for (const [assetKey, asset] of Object.entries(stacItem.assets)) {
                    if (asset.href && this.needsPlanetaryComputerPresigning(asset.href)) {
                        needsPresigning = true;
                        break;
                    }
                }
            }
            
            if (needsPresigning) {
                console.log(`🔗 [TITILER] Using Planetary Computer's TiTiler API for RGB composite`);
                
                // Get mapped assets
                const mappedAssets = this.mapGenericToActualAssets ? 
                    this.mapGenericToActualAssets(preset.assets, stacItem) : preset.assets;
                
                // Use Planetary Computer's TiTiler API with item/tiles endpoint
                const params = new URLSearchParams();
                params.set('collection', stacItem.collection);
                params.set('item', stacItem.id);
                
                // Add each asset
                mappedAssets.forEach(asset => {
                    params.append('assets', asset);
                });
                
                // Use scale options if provided, otherwise use preset rescale
                const rescaleValue = (scaleOptions.minScale !== undefined && scaleOptions.maxScale !== undefined) 
                    ? `${scaleOptions.minScale},${scaleOptions.maxScale}` 
                    : preset.rescale;
                if (rescaleValue) params.set('rescale', rescaleValue);
                if (preset.resampling) params.set('resampling_method', preset.resampling);
                // Only apply color_formula to RGB/3-band compositions
                if (preset.color_formula && preset.assets && preset.assets.length === 3) {
                    params.set('color_formula', preset.color_formula);
                }
                
                // Use Planetary Computer's TiTiler API
                const pcTilerUrl = `https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}.png?${params.toString()}`;
                console.log(`🌐 [TITILER] Using Planetary Computer TiTiler API for RGB composite`);
                console.log(`🌐 [TITILER] Assets: ${mappedAssets.join(', ')}`);
                console.log(`🌐 [TITILER] Tile URL: ${pcTilerUrl}`);
                return pcTilerUrl;
            }
        }
        
        
        // Skip STAC endpoint if stacItemUrl is null and not an expression
        if (stacItemUrl === null && !preset.expression) {
            console.error(`❌ [TITILER] Cannot use STAC endpoint with null stacItemUrl and no valid single asset found`);
            console.error(`❌ [TITILER] Preset:`, preset);
            console.error(`❌ [TITILER] STAC item assets:`, Object.keys(stacItem?.assets || {}));
            throw new Error(`No valid asset found for visualization preset '${preset.name}'. Available assets: ${Object.keys(stacItem?.assets || {}).join(', ')}`);
        }
        
        // For expressions without stacItemUrl, we need the STAC item URL
        if (stacItemUrl === null && preset.expression) {
            console.error(`❌ [TITILER] Expression preset requires STAC item URL but none provided`);
            throw new Error(`Expression preset '${preset.name}' requires STAC item URL`);
        }
        
        // For non-Planetary Computer data, use standard STAC endpoint
        const params = new URLSearchParams();
        params.set('url', stacItemUrl);
        
        // Add visualization parameters with intelligent asset mapping
        if (preset.assets && !preset.expression) {
            let mappedAssets;
            if (typeof this.mapGenericToActualAssets === 'function' && stacItem) {
                mappedAssets = this.mapGenericToActualAssets(preset.assets, stacItem);
                console.log(`🌐 [TITILER] Mapped assets: ${mappedAssets.join(',')}`);
            } else {
                mappedAssets = preset.assets;
            }
            
            // Add individual asset parameters (not comma-separated)
            mappedAssets.forEach(asset => {
                params.append('assets', asset);
            });
            
            // Add asset band indexing
            mappedAssets.forEach(asset => {
                params.append('asset_bidx', `${asset}|1`);
            });
        }
        
        if (preset.expression) params.set('expression', preset.expression);
        
        // Use scale options if provided, otherwise use preset rescale
        const rescaleValue = (scaleOptions.minScale !== undefined && scaleOptions.maxScale !== undefined) 
            ? `${scaleOptions.minScale},${scaleOptions.maxScale}` 
            : preset.rescale;
        if (rescaleValue) params.set('rescale', rescaleValue);
        
        if (preset.colormap_name) params.set('colormap_name', preset.colormap_name);
        if (preset.resampling) params.set('resampling_method', preset.resampling);
        // Only apply color_formula to RGB/3-band compositions
        if (preset.color_formula && preset.assets && preset.assets.length === 3) {
            params.set('color_formula', preset.color_formula);
        }
        
        // Add required parameters for STAC endpoint
        params.set('asset_as_band', 'true');

        // Use STAC endpoint
        const tileUrl = `${this.tilerBaseUrl}/stac/tiles/WebMercatorQuad/${z}/${x}/${y}.png?${params.toString()}`;
        console.log(`🌐 [TITILER] Using STAC endpoint: ${tileUrl}`);
        return tileUrl;
    }

    /**
     * Build preview URL for a preset (smaller tile for thumbnails)
     * @param {string} stacItemUrl - URL to the STAC item JSON
     * @param {Object} preset - Visualization preset
     * @param {Array} bbox - Bounding box [west, south, east, north]
     * @param {number} width - Preview width in pixels
     * @param {number} height - Preview height in pixels
     * @param {Object} stacItem - STAC item object (optional, for presigning)
     * @returns {Promise<string>} TiTiler preview URL
     */
    async buildPreviewUrl(stacItemUrl, preset, bbox, width = 256, height = 256, stacItem = null) {
        // For PC data, use PC TiTiler API for preview
        if (stacItem && this.stacClient) {
            let needsPresigning = false;
            if (stacItem.assets) {
                for (const [assetKey, asset] of Object.entries(stacItem.assets)) {
                    if (asset.href && this.stacClient.needsPlanetaryComputerPresigning(asset.href)) {
                        needsPresigning = true;
                        break;
                    }
                }
            }
            
            if (needsPresigning) {
                console.log(`🔗 [PREVIEW] Using PC TiTiler API for preview`);
                
                const params = new URLSearchParams();
                params.set('collection', stacItem.collection);
                params.set('item', stacItem.id);
                params.set('width', width.toString());
                params.set('height', height.toString());
                
                // Get mapped assets
                if (preset.assets && !preset.expression) {
                    const mappedAssets = this.mapGenericToActualAssets ? 
                        this.mapGenericToActualAssets(preset.assets, stacItem) : preset.assets;
                    
                    mappedAssets.forEach(asset => {
                        params.append('assets', asset);
                    });
                }
                
                if (preset.expression) {
                    params.set('expression', preset.expression);
                }
                
                if (preset.rescale) {
                    params.set('rescale', preset.rescale);
                }
                
                if (preset.colormap_name) {
                    params.set('colormap_name', preset.colormap_name);
                }
                
                // Only apply color_formula to RGB/3-band compositions
                if (preset.color_formula && preset.assets && preset.assets.length === 3) {
                    params.set('color_formula', preset.color_formula);
                }

                return `https://planetarycomputer.microsoft.com/api/data/v1/item/crop/${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}.png?${params.toString()}`;
            }
        }
        
        // Fallback to standard TiTiler for non-PC data
        const params = new URLSearchParams();
        params.set('url', stacItemUrl);
        params.set('width', width.toString());
        params.set('height', height.toString());
        
        if (preset.assets && !preset.expression) {
            params.set('assets', preset.assets.join(','));
        }
        
        if (preset.expression) {
            params.set('expression', preset.expression);
        }
        
        if (preset.rescale) {
            params.set('rescale', preset.rescale);
        }
        
        if (preset.colormap_name) {
            params.set('colormap_name', preset.colormap_name);
        }
        
        // Only apply color_formula to RGB/3-band compositions
        if (preset.color_formula && preset.assets && preset.assets.length === 3) {
            params.set('color_formula', preset.color_formula);
        }

        return `${this.tilerBaseUrl}/stac/crop/${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}.png?${params.toString()}`;
    }

    /**
     * Get asset information for a STAC item
     * @param {Object} stacItem - STAC item object
     * @returns {Object} Available assets and their properties
     */
    analyzeAssets(stacItem) {
        const assets = stacItem.assets || {};
        const analysis = {
            hasOptical: false,
            hasSAR: false,
            hasThermal: false,
            availableBands: [],
            opticalBands: {},
            suggestions: []
        };

        // Analyze available assets
        Object.entries(assets).forEach(([key, asset]) => {
            const name = key.toLowerCase();
            const title = (asset.title || '').toLowerCase();
            
            // Optical bands
            if (name.includes('red') || title.includes('red')) {
                analysis.opticalBands.red = key;
                analysis.hasOptical = true;
            }
            if (name.includes('green') || title.includes('green')) {
                analysis.opticalBands.green = key;
                analysis.hasOptical = true;
            }
            if (name.includes('blue') || title.includes('blue')) {
                analysis.opticalBands.blue = key;
                analysis.hasOptical = true;
            }
            if (name.includes('nir') || title.includes('near infrared')) {
                analysis.opticalBands.nir = key;
                analysis.hasOptical = true;
            }
            if (name.includes('swir')) {
                analysis.opticalBands[key] = key;
                analysis.hasOptical = true;
            }

            // SAR bands
            if (name.includes('vv') || name.includes('vh')) {
                analysis.hasSAR = true;
            }

            // Thermal
            if (name.includes('thermal') || name.includes('tir')) {
                analysis.hasThermal = true;
            }

            analysis.availableBands.push(key);
        });

        return analysis;
    }

    /**
     * Get recommended presets based on asset analysis
     * @param {Object} stacItem - STAC item
     * @returns {Array} Recommended preset keys in priority order
     */
    getRecommendedPresets(stacItem) {
        const analysis = this.analyzeAssets(stacItem);
        const collectionPresets = this.getPresetsForCollection(stacItem.collection);
        const recommended = [];

        if (analysis.hasOptical) {
            recommended.push('true-color', 'false-color', 'ndvi');
            
            if (analysis.opticalBands.swir22 || analysis.opticalBands.swir11) {
                recommended.push('swir-composite', 'urban');
            }
        }

        if (analysis.hasSAR) {
            recommended.push('vv-single', 'vh-single', 'dual-pol-rgb');
        }

        if (analysis.hasThermal) {
            recommended.push('temperature');
        }

        // Filter to only include available presets
        return recommended.filter(preset => collectionPresets[preset]);
    }
}

/**
 * Default instance for immediate use
 */
export const defaultBandEngine = new BandCombinationEngine();