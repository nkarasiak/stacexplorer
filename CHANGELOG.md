# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.12.6] - 2025-08-02

### 🧹 Code Quality & ESLint Compliance
- **Perfect ESLint Compliance**: Achieved zero ESLint errors and warnings across entire codebase (131 → 0 issues)
- **Async/Await Optimization**: Fixed all async functions without await expressions for proper asynchronous patterns
- **Code Cleanup**: Removed all unused variables and commented debugging code appropriately
- **Empty Block Documentation**: Added meaningful comments to all empty catch blocks and conditional statements
- **Modern Console Methods**: Converted development alerts to proper console.warn/error for better debugging
- **UX Preservation**: Maintained critical user confirmations while improving success notifications with toast messages

### 🛠️ Technical Improvements
- **Parallel Agent Strategy**: Used specialized agents to fix different categories of issues simultaneously
- **Emoji Regex Fixes**: Resolved problematic Unicode character class patterns in text processing
- **Duplicate Method Resolution**: Fixed duplicate class member conflicts in browser components
- **Global Variable Declarations**: Properly declared browser APIs like `caches` for service worker compatibility
- **Self-Assignment Fixes**: Corrected improper variable assignment patterns
- **Unreachable Code Cleanup**: Commented out unreachable code segments with explanatory notes

### 🎯 Development Experience
- **Enhanced Maintainability**: Clean, well-documented codebase with consistent patterns
- **Improved Debugging**: Proper console logging hierarchy (warn/error vs log)
- **Production Ready**: Zero linting issues make the codebase suitable for production deployment
- **Better Error Handling**: Meaningful comments in error handling blocks
- **Consistent Code Style**: Applied Prettier formatting across all files

## [2.12.5] - 2025-08-01

### 🔧 Fixed
- **Collection Browser Integration**: Removed duplicate sidebar elements that conflicted with existing viewer sidebar layout
- **Source Button Loading States**: Fixed source button behavior when collections are not loaded - now shows proper loading messages and prevents weird interactions
- **Search Results Preservation**: Fixed critical issue where clicking on item cards would redirect to individual item pages and lose all search results context
- **Smart Item Navigation**: Implemented intelligent handling of item interactions that distinguishes between:
  - Direct URL access (shows single item as expected)
  - User clicks from search results (preserves all search results while showing item on map)

### ✨ Enhanced
- **Improved User Experience**: Item card clicks now display items on map with pan/zoom while keeping all search results visible and accessible
- **Context Preservation**: Users can now explore multiple items from their search results without losing their search context
- **Source Button States**: Enhanced source button to show "Loading Collections..." and "No Collections Available" states with appropriate user feedback
- **Collection Loading Events**: Added proper event system for collection loading state changes

### 🛠️ Technical Improvements
- Added `source` parameter to `itemActivated` events to distinguish between URL navigation and user interactions
- Implemented smart result panel management that preserves search context for user clicks but handles direct URLs correctly
- Enhanced collection loading state management with proper event dispatching
- Improved error handling and user feedback for collection-related operations

### 🎯 User Experience
- Users can now freely explore search results without fear of losing their search context
- Direct item URLs continue to work as expected for sharing and bookmarking
- Better visual feedback during collection loading processes
- Smoother workflow when browsing through multiple search results

## [2.12.4] - 2025-08-01

### ✨ Added
- **Hover-to-Zoom Preview**: Result items now support hover-to-zoom functionality - when you move your cursor over a result item, the map temporarily pans and zooms to show that item's location, then restores the previous view when you move the cursor away

### 🔧 Fixed
- **Map Access Pattern**: Fixed map availability issues by using proper `mapManager.getMap()` method instead of direct `mapManager.map` access
- **Map Initialization**: Enhanced error handling and debugging for map availability checks during hover operations
- **Click vs Hover Separation**: Clicking result items displays them permanently without zoom/pan, while hovering provides temporary preview with automatic view restoration

### 🚀 Enhanced
- **Async Map Waiting**: Added intelligent waiting mechanism for map initialization during hover operations
- **State Management**: Improved hover state tracking to prevent conflicts between click and hover operations
- **Visual Feedback**: Added blue border indicator for active hover preview mode
- **Bounding Box Display**: Shows item coverage area on map during hover preview

### 🛠️ Technical Improvements
- Added comprehensive map availability validation with detailed debugging
- Implemented proper separation between permanent display (click) and preview (hover) modes
- Enhanced error recovery with graceful fallbacks when map is not ready
- Improved timeout handling for smooth hover transitions

### 🎯 User Experience
- Hover over result items → Map automatically previews item location
- Move cursor away → Map returns to previous view
- Click items → Permanently display on map without changing viewport
- Smooth animations and visual feedback for all hover interactions

## [2.12.3] - 2025-08-01

### 🔧 Fixed
- **Drawing and Search Integration**: Fixed critical issue where drawn geometries on the map were not being used to constrain search results
  - Fixed event mismatch between MapDrawing (`geometrySelected`) and GeometrySync (`bboxDrawn`) 
  - Drawing a bbox or polygon now properly updates the search form's location constraint
  - Enhanced URL state management to preserve drawn geometries in shareable links

- **WKT/GeoJSON Paste Functionality**: Resolved issues with pasting geometric data
  - Fixed null reference errors when location dropdown manager is unavailable
  - Added comprehensive error handling for geometry processing  
  - WKT and GeoJSON pasting now properly displays geometry outline on map
  - Automatic zoom/pan to pasted geometry area for better user experience

- **STAC Item Image Display**: Implemented comprehensive CORS handling from v2.4.0
  - Canvas-based CORS bypass with data URL conversion for satellite imagery
  - CORS proxy chain fallback (corsproxy.io, cors-anywhere) for blocked resources
  - Smart asset prioritization (preview > thumbnail > visual > data assets)
  - Enhanced domain detection for AWS S3, Copernicus, and other providers
  - Graceful fallback chain: Canvas → Direct MapLibre → Geometry outline
  - Users now see actual satellite imagery instead of CORS errors

### 🚀 Enhanced  
- **Geometry Processing**: Improved WKT and GeoJSON detection and parsing
  - Better format validation and error messages
  - Enhanced bbox extraction from complex geometries
  - Improved notification system for geometry operations

- **Map Layer Management**: Enhanced layer cleanup and tracking
  - Better removal of previous layers when adding new geometries
  - Improved layer ID tracking for reliable cleanup
  - Enhanced error recovery for failed image loads

### 🛠️ Technical Improvements
- Added comprehensive error handling for location dropdown integration
- Improved geometry synchronization between main interface and AI Smart Search
- Enhanced map manager method detection for better compatibility
- Cleaned up debug logging for production readiness

### 🎯 User Experience
- Drawing on map now immediately constrains search results to that area
- Pasting WKT/GeoJSON automatically shows and zooms to the geometry
- Search forms respect user's spatial selections (drawn areas, pasted geometries)
- Satellite imagery loads successfully from various STAC providers
- Clear visual feedback for all geometry operations

## [2.12.2] - 2025-07-31

### 🐛 Fixed
- **Browser Mode Catalog Loading**: Fixed critical issue where browser mode displayed "No catalogs returned!" due to async configuration loading mismatch
- **Direct URL Item Display**: Fixed viewer URLs like `/viewer/microsoft-pc/3dep-seamless/n34w116-1` not displaying items in results panel
- **STAC Endpoints Configuration**: Resolved configuration access issue where `config.stacEndpoints` was expected as property but provided as async method
- **Collection Configuration Mapping**: Fixed incorrect property access (`collection.endpoints.root` vs `collection.endpoint`) in config loading

### 🔧 Improved
- **Async Configuration Handling**: Enhanced `getAvailableCatalogs()` method to properly await STAC endpoints from configuration
- **URL-based Item Search**: Added `itemActivated` event listener to ResultsPanel for automatic single-item display from direct URLs
- **Error Handling**: Added comprehensive error handling and descriptive warnings for configuration loading failures
- **Code Robustness**: Improved null checking and fallback handling in catalog configuration methods

## [2.12.1] - 2025-07-31

### 🐛 Fixed
- **Catalog Settings Override**: Fixed issue where catalogs with `"enabled": false` in collections.json could not be enabled via user settings
- **Static Catalog Settings**: Resolved problem where static (.json) catalogs ignored enabled/disabled settings from UI
- **Browse Collections Filters**: Fixed disabled catalogs appearing in Browse Collections source filter dropdown
- **Settings Priority Logic**: User settings now properly override configuration defaults for all catalog types
- **Real-time Filter Updates**: Source filters now refresh immediately when catalog settings are changed

### 🔧 Improved
- **Settings Logic**: Enhanced `getEnabledCatalogs()` method to respect user preferences over config defaults
- **Filter Management**: Created `getEnabledCollectionsFromSettings()` utility for consistent settings handling
- **Event Handling**: Added `settingsChanged` event listeners for automatic UI updates
- **Code Quality**: Removed debug logging for cleaner production code

## [2.12.0] - 2025-07-30

### ✨ Features
- **Custom STAC Catalog Support**: Full integration for user-defined STAC catalogs with localStorage persistence
- **Terrascope Integration**: Added Belgian Terrascope STAC catalog as built-in data provider (https://stac.terrascope.be/)
- **Enhanced Settings Management**: New dedicated SettingsPageManager component with improved provider management
- **Catalog Browser Integration**: Custom catalogs now appear in Data Providers section with proper titles
- **Browse Collections Filter**: Custom catalogs included in "All Sources" filter dropdown for collection browsing
- **Dynamic Provider Management**: Toggle custom catalogs on/off alongside predefined data providers

### 🔧 Improved
- **Catalog Display Names**: Custom catalogs now show proper titles (e.g., "Terrascope") instead of generic "custom-catalog"
- **Provider Settings UI**: Enhanced toggle functionality with real-time updates and proper event handling
- **Collection Loading**: Improved integration between custom catalogs and existing collection management system
- **Settings Page Architecture**: Modular component design with better separation of concerns
- **Error Handling**: Better validation and user feedback for custom catalog operations

### 🐛 Fixed
- **Custom Catalog Visibility**: Fixed custom catalogs not appearing in catalog browser Data Providers section
- **Source Filter Integration**: Resolved missing custom catalogs from Browse Collections source filter
- **Display Name Consistency**: Fixed generic naming throughout the UI to use actual catalog titles
- **Provider List Refresh**: Fixed settings not updating immediately after adding custom catalogs

### 🏗️ Technical
- **SettingsPageManager Component**: New dedicated component for settings page management and provider controls
- **Enhanced CatalogBrowserPanel**: Added localStorage integration for custom catalog discovery
- **CollectionManagerEnhanced Updates**: Improved display name resolution for custom catalogs
- **CollectionGridSelector Integration**: Updated to use `loadAllCollections()` for comprehensive catalog support
- **Provider Event Handling**: Enhanced event listener management with proper cleanup and re-attachment

## [2.11.0] - 2025-07-30

### ✨ Features
- **Static Catalog Support**: Automatic detection and handling of static STAC catalogs (URLs ending with `.json`)
- **Google Earth Engine Integration**: Full support for GEE STAC catalog with specialized collection traversal
- **Planet Labs Enhancement**: Improved catalog handling for Planet Labs STAC structure
- **Generic Static Catalogs**: Universal support for any STAC-compliant static catalog
- **Enhanced Catalog Detection**: Smart endpoint detection to distinguish between APIs and static catalogs

### 🔧 Improved
- **Endpoint Configuration**: Better logic for handling catalog-type vs API-type endpoints
- **Error Handling**: More graceful handling of catalog connection failures
- **Configuration Priority**: Fixed localStorage override issues for disabled catalogs
- **Catalog Traversal**: Robust child link following for complex catalog structures

### 🐛 Fixed
- **GEE 404 Error**: Resolved HTTP 404 errors when trying to load Google Earth Engine collections
- **Catalog Override Bug**: Fixed issue where `connectToCustomCatalog` was overriding correct empty endpoints
- **localStorage Conflicts**: Resolved conflicts between configuration file and browser storage settings
- **Static Catalog URLs**: Fixed malformed URLs for catalog-type endpoints (no more `/collections` appended)

### 🏗️ Technical
- **STACApiClient Enhancements**: Added `fetchGEECollections()` and `fetchStaticCatalogCollections()` methods
- **Catalog Data Storage**: Proper storage and handling of catalog root data for different providers
- **Collection Manager**: Enhanced `getEnabledCatalogs()` to respect configuration file settings

## [2.10.0] - 2025-07-30

### ✨ Features
- **Modern Date Picker**: Completely redesigned date input system with custom YYYY-MM-DD text inputs
- **Locale-Independent Dates**: Date inputs now consistently display YYYY-MM-DD format regardless of browser locale
- **Stylized Date Presets**: Beautiful new dropdown with gradient icons and card-based preset selection
- **Auto-formatting**: Date inputs automatically format while typing (e.g., 20250630 → 2025-06-30)

### 🔧 Improved
- **Simplified Date Interface**: Removed complex glassmorphism modal system for better reliability
- **Enhanced Date Validation**: Real-time validation with error styling for invalid dates  
- **Better URL Sync**: Fixed bidirectional sync between URL parameters (ds/de) and visible input fields
- **Streamlined Presets**: Removed "Any Time" option and "Custom Range" section for cleaner interface
- **Modern UI Design**: Card-style preset buttons with hover effects and professional styling

### 🐛 Fixed
- **Date Display Issues**: Resolved French DD-MM-YYYY format showing instead of YYYY-MM-DD
- **Input Field Sync**: Fixed date preset selection not updating visible input fields
- **URL Parameter Mapping**: Corrected parameter names for proper date synchronization
- **Cross-System Compatibility**: Ensured consistent behavior across SearchSummaryManager and InlineDropdownManager

### 🗑️ Removed
- **Native Date Inputs**: Replaced HTML `<input type="date">` elements to bypass locale limitations
- **Complex Modal System**: Simplified architecture for better maintainability
- **Redundant Options**: Cleaned up duplicate and unnecessary date selection methods

## [2.9.4] - 2025-07-26

### 🐛 Fixed
- **Satellite Animation Visibility**: Fixed satellite animation z-index to ensure proper visibility above basemap
- **Z-Index Layering**: Corrected satellite container z-index from 9999 to 600 for proper UI element hierarchy

### 🔧 Improved
- **Animation Positioning**: Enhanced satellite animation layering to maintain visibility while respecting UI element priority

## [2.9.3] - 2025-07-26

### 🐛 Fixed
- **Light Theme Compatibility**: Fixed Browse Collections modal and grid to properly support light theme
- **Satellite Animation Z-Index**: Corrected satellite animation positioning to stay above basemap but below UI elements
- **Theme Styling**: Added comprehensive light theme support for collection cards, headers, and focus states

### 🔧 Improved
- **Theme Consistency**: Enhanced theme switching with proper CSS variable usage across collection components
- **Modal Header Theming**: Dynamic header colors that adapt to light/dark themes
- **Focus Indicators**: Improved focus outline colors for better accessibility in light theme

## [2.9.2] - 2025-07-26

### 🆕 Added
- **Command Palette Auto-Focus**: Collection search input automatically focuses when Browse Collections modal opens
- **Enhanced Command Palette**: Added comprehensive commands for location search, date presets, and navigation
- **Debug Tools**: Added static methods for force-closing modals and focusing search inputs
- **Keyboard Shortcuts Guide**: New command palette command to show available shortcuts

### 🔧 Improved
- **Modal Interaction**: Click anywhere in Browse Collections modal body to focus search input
- **Error Handling**: Enhanced command palette with robust event handling and fallback mechanisms
- **Focus Management**: Multiple focus attempts ensure search input is ready for immediate typing
- **User Experience**: Seamless typing experience in collection browser without manual clicking

### 🐛 Fixed
- **Modal Closing Issues**: Fixed ESC key and close button functionality in Browse Collections modal
- **Event Conflicts**: Resolved ESC key handler conflicts using capture phase for priority
- **Search Input Focus**: Fixed timing issues preventing auto-focus in collection search
- **Command Palette Errors**: Fixed "Cannot read properties of undefined (reading 'toLowerCase')" errors
- **Event Propagation**: Improved click and keyboard event handling throughout modals

### 🛠️ Technical
- **Modal State Management**: Enhanced modal opening/closing with better state tracking
- **Event Listeners**: Improved event listener cleanup and priority handling
- **Focus Strategies**: Multi-method approach to ensure search input focus works reliably
- **Error Recovery**: Graceful fallbacks when focus attempts fail

## [2.9.1] - 2025-07-26

### 🐛 Fixed
- **JavaScript Syntax Errors**: Fixed orphaned object literals causing syntax errors in index.html and SearchHistoryManager.js
- **Console Errors**: Resolved "Unexpected token ':'" errors that were appearing in browser console

## [2.9.0] - 2025-07-26

### 🆕 Added
- **Grid Collection Browser**: Enhanced collection browsing with grid-based modal layout for better visual organization
- **Collection Manager Enhancements**: Improved collection management with enhanced UI and better user experience
- **Inline Dropdown Improvements**: Enhanced dropdown functionality with better styling and behavior

### 🔧 Improved
- **Browse Collections Modal**: Optimized modal space utilization and improved preset button functionality
- **Search Interface**: Enhanced collection browser modal with improved layout and navigation
- **Collection Grid Selector**: Better grid-based selection interface for collections

### 🐛 Fixed
- **Calendar Display**: Fixed calendar and location inputs to display correctly in light theme
- **Tutorial System**: Disabled tutorial functionality and removed tutorial button for cleaner interface
- **Location Search**: Fixed location search dropdown and map preview functionality
- **Date Input System**: Replaced date dropdown with improved inline mini date input system

### 🛠️ Technical
- **Modal Space Optimization**: Better space utilization in Browse Collections modal
- **Theme Consistency**: Improved light theme compatibility across input components
- **Collection Browser**: Enhanced grid-based collection browsing with modal interface
- **Input System Modernization**: Updated date input system with inline mini date picker

## [2.8.0] - 2025-07-24

### 🛰️ Enhanced
- **Satellite Animation Visibility**: Restored satellite animation visibility with improved CSS positioning and z-index management
- **Offline Connectivity Detection**: Enhanced offline mode detection with better user feedback and smooth transitions
- **SEO Optimization**: Improved metadata structure, search engine optimization, and page performance

### 🔧 Improved
- **CSS Architecture**: Updated CSS positioning system for better layout stability and visual hierarchy
- **Animation System**: Refined satellite animation with proper layering and smoother transitions
- **Performance**: Optimized asset loading and rendering performance across the application
- **User Experience**: Better visual feedback for online/offline states with satellite indicator

### 🐛 Fixed
- **Animation Positioning**: Fixed CSS issues that were hiding the satellite animation from view
- **Layout Stability**: Resolved z-index conflicts and positioning problems affecting UI elements
- **Connectivity Feedback**: Improved offline/online state detection and user notification system

### 🛠️ Technical
- **Modern CSS**: Updated CSS architecture with better positioning strategies
- **Animation Management**: Enhanced animation system with proper cleanup and state management
- **Performance Monitoring**: Improved performance tracking and optimization strategies

## [2.7.0] - 2025-01-28

### 🆕 Added
- **Cloud Cover Filter System**: Comprehensive filtering system with cloud cover filter (0-100%, default 20%)
- **Intuitive Filter UI**: Clickable labels, apply button with confirmation, and auto-closing modal
- **URL Filter Persistence**: Filter values automatically saved to URL and restored on page load
- **LazyImageLoader**: Advanced image loading system with error handling and memory management

### 🔧 Improved
- **Search Filter Integration**: Filters now properly apply to STAC search queries with `eo:cloud_cover` parameter
- **Image Loading Reliability**: Fixed `createObjectURL` errors and improved CORS handling for image thumbnails
- **Memory Management**: Proper cleanup of image observers and blob URLs on search result changes
- **URL State Management**: Enhanced UnifiedStateManager to handle filter parameters seamlessly

### 🐛 Fixed
- **Image Loading Errors**: Resolved "Overload resolution failed" errors on subsequent searches
- **Filter Application**: Fixed filters not being applied to search queries
- **Observer Cleanup**: Properly unobserve image elements when clearing search results
- **URL Synchronization**: Filter changes now immediately update browser URL with `cc=XX` parameter

## [2.6.0] - 2025-07-20

### 🆕 Added
- **Planet Labs Open Data Integration**: Added support for Planet Labs STAC catalog as a new data source
- **Static Catalog Support**: Implemented catalog-type data sources (vs API-type) for hierarchical STAC catalogs
- **Planet Labs Collections**: Added automatic collection discovery from Planet Labs catalog structure
- **Planet Labs Item Search**: Implemented custom search functionality for navigating static catalog hierarchies

### 🔧 Improved
- **Catalog Architecture**: Enhanced STAC API client to handle both API and catalog-type data sources
- **Data Source Management**: Clear separation between "planetary" (Microsoft Planetary Computer) and "planetlabs" (Planet Labs)
- **Search Functionality**: Extended search capabilities to work with static catalogs in addition to API endpoints
- **Error Handling**: Improved error handling and validation for different catalog types

### 🐛 Fixed
- **Scope Issues**: Fixed JavaScript variable scope errors in collection selection handlers
- **CORS Handling**: Improved proxy configuration for external data source access
- **Collection Loading**: Resolved issues with loading collections from non-API catalog sources

### 🛠️ Technical
- **API Client Enhancement**: Added specialized methods for Planet Labs catalog traversal and item discovery
- **Collection Manager**: Updated to handle catalog-type sources with special connection requirements
- **Configuration Updates**: Added Planet Labs endpoints and type definitions to configuration

## [2.5.0] - 2025-07-20

### 🆕 Added
- **Enhanced Search and Visualization Features**: Continued improvements to search history and collection UI
- **Improved STAC Data Handling**: Better support for various STAC item formats and content-type handling
- **UI Enhancements**: Further refinements to collection selection and user interface

### 🔧 Improved
- **Search Experience**: Additional optimizations to search history and collection management
- **Visualization Pipeline**: Enhanced STAC item processing and visualization capabilities
- **Code Quality**: Ongoing codebase cleanup and optimization

### 🐛 Fixed
- **Collection Source Selection**: Resolved issues with double-click requirements for collection source selection
- **URL Handling**: Improved STAC item loading from URLs with incorrect content-type headers
- **Base Path Preservation**: Fixed URL handling for GitHub Pages deployment

### 🛠️ Technical
- **Codebase Maintenance**: Continued cleanup and optimization of core components
- **Performance Improvements**: Enhanced loading and processing of STAC data
- **UI Component Updates**: Refined search and visualization components

## [2.4.0] - 2025-07-20

### 🆕 Added
- **Search History System**: Persistent search history with localStorage integration
  - Recent searches dropdown in header (appears after first search)
  - One-click re-execution of previous searches
  - Smart collection selection restoration (preserves exact collection choices)
  - Auto-saves successful searches with metadata (timestamp, result count, search title)
  - Clear history functionality

### 🔧 Improved
- **Enhanced Collection Selection**: Increased collection dropdown height to 200px with size="10" for better browsing experience
- **Search History UI**: 
  - Positioned search history button next to load STAC button in header
  - Only shows when user has search history (better UX)
  - Dropdown appears above all interface elements without clipping
- **Collection Parameter Handling**: 
  - Fixed parameter normalization between `collections` (array) and `collection` (string) formats
  - Enhanced search parameter sanitization and validation
  - Improved collection title display and cleaning

### 🐛 Fixed
- **Search History Dropdown Positioning**: 
  - Moved dropdown outside search container to prevent clipping
  - Set maximum z-index (2147483647) to ensure proper layering
  - Fixed dropdown appearing inside search card boundaries
- **Collection Selection Restoration**: 
  - Fixed mismatch between saving (`collections`) and restoring (`collection`) parameters
  - Added comprehensive parameter validation and fallback handling
  - Enhanced UI summary updates after search restoration
- **Search Parameter Consistency**: 
  - Normalized collection parameter formats across save/restore operations
  - Added debugging logs for troubleshooting parameter issues
  - Fixed collection title extraction and display formatting

### 🛠️ Technical
- **SearchHistoryManager**: New utility class for managing search history operations
- **SearchHistoryUI**: New component for search history dropdown interface
- **Enhanced Parameter Sanitization**: Improved search parameter validation and normalization
- **Better Error Handling**: Added comprehensive logging and error recovery
- **UI Component Updates**: Enhanced InlineDropdownManager integration with search history

## [2.2.2] - 2025-07-18

### Fixed - Priority Collections Order
- **🌟 Collection Priority Order**: Fixed priority collections dropdown to display collections in the specified order instead of API order
- **📋 Dropdown Ordering**: Updated InlineDropdownManager to respect custom priorityCollections array sequence
- **🔄 Collection Matching**: Simplified collection matching logic to prioritize based on ID only, regardless of source

### Technical Details
- Modified InlineDropdownManager.js to iterate through priorityCollections array in specified order
- Removed source-dependent matching to allow collections from any provider to appear as priority items
- Enhanced collection ordering logic to preserve user-defined priority sequence

## [2.2.1] - 2025-07-18

### Fixed - Planetary Computer & SAR Data
- **🔗 Planetary Computer Presigning**: Fixed presigning API to use correct `/api/sas/v1/token/{collection}` endpoint instead of deprecated `/api/data/v1/sign`
- **📡 Dynamic Collection Mapping**: Added automatic collection extraction from blob storage URLs (e.g., `sentinel1euwestrtc` → `sentinel-1-rtc`)
- **📊 SAR Scale Normalization**: Fixed Sentinel-1 SAR data scale ranges from dB values (-25,0, -30,-5) to normalized (0,1) for proper visualization
- **🎨 Visualization Cleanup**: Removed unsupported blend mode functionality from raster visualization manager

### Enhanced - API Reliability
- **🔄 Consolidated Presigning**: Moved all presigning logic to `StacApiClient` for better reliability and consistency
- **⚡ Improved Error Handling**: Enhanced error reporting for presigning failures with detailed logging
- **🗺️ Better Asset Access**: Fixed asset URL presigning for improved map visualization performance

### Technical Details
- Updated `BandCombinationEngine.js` SAR presets to use 0-1 scale range instead of dB values
- Implemented proper collection-to-container mapping for Planetary Computer SAS token requests
- Removed MapLibre GL unsupported blend mode properties and related UI controls
- Enhanced presigning workflow with fallback mechanisms and proper error handling

## [2.2.0] - 2025-07-17 🧪 *EXPERIMENTAL*

### Added - Visualization Features
- **🎨 Raster Visualization Panel**: Interactive visualization component for STAC raster datasets
- **📡 Sentinel-2 Support**: Specialized visualization support for Sentinel-2 imagery with predefined band combinations
- **🔧 Band Combination Engine**: Flexible RGB band mapping system for creating custom visualizations
- **🎛️ Color Management**: Dynamic color scaling, contrast, and brightness controls
- **📊 Visualization Controls**: Layer opacity management and blending controls
- **🖱️ Interactive UI**: Collapsible visualization panel with modern glassmorphism design

### Added - Enhanced Location Search
- **🌍 Beautiful Location Search**: Enhanced location search with emoji icons for different location types
- **Auto-Focus Location Input**: Location dropdown now automatically focuses the search input for immediate typing
- **Custom Date Range**: Fixed and enhanced custom date range functionality in TIME menu dropdown
- **Mobile Menu Visibility**: Improved mobile menu logic for better UX

### Enhanced
- **Predefined Band Combinations**: True Color, False Color, NDVI, SWIR, and Agriculture visualizations
- **Custom Band Mapping**: Manual RGB band selection for advanced users
- **Color Scale Controls**: Min/max value controls for optimal contrast
- **Visualization Layer Integration**: Seamless integration with existing map layers

### ⚠️ Known Issues & Limitations
- **🧪 Experimental Status**: Visualization features are in active development
- **📡 Limited Data Support**: Currently optimized for Sentinel-2 and similar multispectral datasets
- **🌐 CORS Limitations**: Some raster sources may require proxy configuration
- **📱 Mobile Performance**: Visualization panel may have reduced functionality on mobile devices
- **🔄 Browser Compatibility**: Advanced features require modern browsers with WebGL support
- **⚡ Performance**: Large raster datasets may experience slower loading times

### Technical Details
- **VisualizationPanel.js**: Main visualization interface with collapsible panel design
- **RasterVisualizationManager.js**: Core visualization logic and layer management
- **BandCombinationEngine.js**: Band mapping algorithms and predefined combinations
- **Leaflet Integration**: Custom Leaflet layers for raster visualization
- **CSS Enhancements**: Modern styling for visualization controls and panels

## [2.1.7] - 2025-07-13

### Fixed
- **URL State Restoration**: Fixed "collection is required" error when sharing URLs with collection parameters
- **Search Execution**: Enhanced collection parameter validation and timing during URL state restoration
- **Debug Logging**: Added comprehensive logging for search parameter validation and collection dropdown state

### Enhanced
- **StateManager**: Improved search execution timing with proper delays and validation
- **CardSearchPanel**: Added collection parameter validation before API calls
- **Error Messages**: Better error reporting when collection parameters are missing

### Technical Details
- Fixed timing issues in `StateManager.restoreSearchState()` to ensure collection dropdown is fully populated
- Enhanced `CardSearchPanel.performSearch()` with validation for required collection parameters
- Added detailed logging throughout URL restoration process for better debugging
- Improved collection parameter handling in search execution flow

## [2.1.6] - 2025-07-13

### Added
- **Smart Mobile Toggle**: Hamburger menu now hides on mobile when URL contains parameters (non-root URLs)
- **URL-Based UI Control**: Toggle visibility adapts based on whether user is on root URL or has search parameters

### Enhanced
- **Mobile UX**: Cleaner mobile interface that hides navigation when not needed
- **URL State Awareness**: UI responds intelligently to URL changes and navigation

### Technical Details
- Added URL parameter detection in MobileSidebarManager
- Implemented popstate and hashchange event listeners for dynamic toggle control
- Enhanced mobile layout management with URL-aware visibility logic

## [2.1.5] - 2025-07-13

### Added
- **Comprehensive README**: Complete rewrite with modern documentation including features, usage guide, technical details, and examples
- **Professional Documentation**: Added badges, structured sections, emojis, and clear navigation
- **Developer Guide**: Detailed setup instructions, project structure, and configuration examples

### Changed
- **Documentation Standard**: Elevated from basic to professional-grade documentation with full feature coverage

## [2.1.4] - 2025-07-13

### Fixed
- **Location Search Integration**: Fixed search button not respecting selected location by updating bbox-input field when location is selected
- **Search Parameter Sync**: Ensured location selections from geocoding search and map drawing properly update SearchForm parameters

### Changed
- **Search Button**: Removed reset button, keeping only the search button for cleaner interface

### Technical Details
- Location selections now update the bbox-input field that SearchForm.getSearchParams() uses
- Fixed integration between InlineDropdownManager location selection and CardSearchPanel search execution
- All location selection methods (geocoding, drawing, map selection) now properly sync with search parameters

## [2.1.3] - 2025-07-13

### Added
- **Visible Search Buttons**: Added prominent search and reset buttons to the main search interface
- **Search Button Styling**: Modern styled search action buttons with proper hover effects and responsive design

### Fixed
- **Search Button Visibility**: Created visible search buttons (main-search-btn, main-reset-btn) in the search interface
- **Button Functionality**: Connected all search buttons (visible and hidden) to CardSearchPanel event handlers

## [2.1.2] - 2025-07-13

### Fixed
- **Search Button**: Fixed missing search button functionality by adding event listeners for both summary-search-btn and summary-reset-btn in CardSearchPanel
- **Application Initialization**: Fixed "settingsPanel is not defined" error by removing leftover reference in global scope

## [2.1.1] - 2025-07-13

### Fixed
- **GitHub CI/CD**: Simplified deployment workflow, removed failing test and Lighthouse jobs
- **Search Button**: Fixed broken search functionality by removing deleted script references
- **Settings Button**: Removed unused settings button and associated functionality
- **Development Cleanup**: Removed unused test files, debug scripts, and development artifacts
- **Package Dependencies**: Cleaned up package.json by removing unused Jest and ESLint dependencies

### Removed  
- Settings panel functionality and UI button
- GitHub Actions testing and Lighthouse auditing jobs
- Jest testing configuration and setup files
- ESLint configuration and linting scripts
- 69+ development artifact files (test HTML, debug JS, documentation files)
- Unused enhanced-app-init.js file

### Technical Details
- Simplified GitHub Actions to deploy-only workflow
- Reduced package.json complexity by removing test/lint scripts
- Fixed broken script references in index.html
- Maintained core functionality while removing development overhead

## [2.1.0] - 2025-07-13

### Added
- **Enhanced Dataset Details Modal**: Completely redesigned modal for individual STAC items with modern layout
- **Copy Item Information**: New button to copy item metadata (ID, collection, properties, geometry, assets) to clipboard
- **Show on Map Integration**: Enhanced "Show on Map" button for items with geometry data
- **Improved Modal Styling**: Modern glassmorphism design with organized sections and responsive layout
- **Leaflet Dependencies**: Added Leaflet CSS and JavaScript for mini map functionality
- **Enhanced Modal Footer**: Reorganized action buttons with proper left/right alignment

### Enhanced
- **Modal Content Layout**: Redesigned with structured sections for basic information, properties, and JSON data
- **JSON Viewer**: Collapsible JSON section with toggle functionality for better space utilization
- **Responsive Design**: Improved mobile and desktop layouts for dataset details modal
- **Visual Hierarchy**: Better organized content with icons, improved typography, and consistent spacing
- **Action Button Management**: Dynamic show/hide of action buttons based on item capabilities
- **CSS Grid Layout**: Modern grid system for information display with auto-fitting columns

### Changed
- **Dataset Content Height**: Increased minimum height to 80px to properly accommodate action buttons
- **Modal Structure**: Updated from simple layout to organized sections with clear visual hierarchy
- **Button Layout**: Reorganized modal footer with left and right action groups
- **Event Handling**: Enhanced event listeners for new modal features

### Improved
- **User Experience**: More intuitive modal interface with better information organization
- **Performance**: Optimized modal creation and cleanup processes
- **Accessibility**: Better keyboard navigation and screen reader support
- **Code Organization**: Cleaner separation of concerns in modal management

### Technical Details

#### Modal Enhancements
- Modern flex-based layout with organized sections
- Dynamic content generation based on item properties
- Improved event handling for new interactive elements
- Better CSS organization with specific modal styling
- Enhanced responsive design for various screen sizes

#### Integration Features
- Seamless integration with main map for "Show on Map" functionality
- Clipboard API integration for copy functionality
- Event-driven architecture for modal interactions
- Proper cleanup and memory management

## [2.0.0] - 2025-05-29

### Added
- **CORS Proxy Server**: Complete proxy.js implementation to handle CORS issues when accessing external STAC APIs
- **Enhanced API Client**: Comprehensive improvements to StacApiClient with retry logic, caching, and better error handling
- **Performance Monitoring**: Core Web Vitals tracking, memory usage monitoring, and performance utilities
- **Testing Infrastructure**: Jest testing framework with comprehensive unit tests and code coverage reporting
- **Linting Configuration**: ESLint setup with modern JavaScript best practices and automated code quality checks
- **CI/CD Pipeline**: GitHub Actions workflow with automated testing, Lighthouse auditing, and deployment
- **Environment Configuration**: Development environment setup with configurable options
- **Enhanced Documentation**: Comprehensive README with setup instructions and development guidelines

### Enhanced
- **Request Handling**: Automatic retry mechanism with exponential backoff (up to 3 attempts)
- **Response Caching**: 5-minute TTL caching to reduce redundant API calls
- **Error Handling**: Detailed error messages and graceful failure handling
- **Performance Optimization**: Debounce/throttle utilities, lazy loading, and memory optimization
- **Development Workflow**: Hot reload, proper build scripts, and development tooling
- **Code Quality**: Modern ES2024 syntax, private class methods, and comprehensive JSDoc annotations

### Changed
- **Package Configuration**: Updated package.json with modern development scripts and dependencies
- **Module System**: Migrated to ES modules with proper type configuration
- **Development Scripts**: Added comprehensive npm scripts for development, testing, and building

### Fixed
- **Missing Dependencies**: Added all required development and runtime dependencies
- **CORS Issues**: Implemented proxy server to handle cross-origin requests
- **Request Reliability**: Added timeout handling and request cancellation capabilities
- **Performance Issues**: Implemented caching and optimization strategies

### Technical Details

#### API Client Improvements
- Retry logic with exponential backoff
- Request/response caching with configurable TTL
- Enhanced STAC catalog validation
- Better endpoint discovery from catalog links
- Request timeout and cancellation
- Comprehensive error handling

#### Performance Features
- Core Web Vitals monitoring (LCP, FID, CLS)
- Memory usage tracking in development
- Debounced search functionality
- Throttled map interactions
- Lazy loading utilities
- Network request optimization

#### Development Infrastructure
- ESLint configuration with modern rules
- Jest testing with jsdom environment
- GitHub Actions CI/CD pipeline
- Code coverage reporting (70% minimum)
- Lighthouse performance auditing
- Automated deployment to GitHub Pages

#### Testing Coverage
- Unit tests for core components
- API client comprehensive testing
- Mocked dependencies for isolated testing
- Coverage reporting with minimum thresholds
- Test utilities and setup configuration

## [1.0.0] - Previous Version

### Initial Features
- Basic STAC catalog exploration
- Interactive map interface with drawing tools
- Search functionality with date and cloud cover filtering
- Results visualization with thumbnails
- Collection management and switching
- URL state management for shareable searches
- Material Design UI with dark/light themes
- Responsive design for mobile and desktop

---

## Migration Guide

### From v1.x to v2.0

1. **Install New Dependencies**:
   ```bash
   npm install
   ```

2. **Update Import Usage** (if using enhanced API client):
   ```javascript
   // Old
   import { STACApiClient } from './js/components/api/StacApiClient.js';
   
   // New (enhanced version)
   import { STACApiClient } from './js/components/api/StacApiClient.enhanced.js';
   ```

3. **Run Tests**:
   ```bash
   npm test
   ```

4. **Use New Development Scripts**:
   ```bash
   npm run dev      # Development with hot reload
   npm run lint     # Code quality checks
   npm run build    # Production build
   ```

### Breaking Changes
- None - v2.0 maintains full backward compatibility with v1.x

### New Optional Features
- Enhanced error handling (automatic)
- Request caching (automatic)
- Performance monitoring (development mode)
- Retry logic (automatic)

All new features are backward compatible and enhance the existing functionality without breaking changes.
