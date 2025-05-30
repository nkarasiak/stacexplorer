# AI Smart Search - Enhanced Functionality

## What Was Fixed

The AI Smart Search interface had broken placeholder editing functionality. Now it features a **hybrid interaction model** that provides the best user experience for each field type.

## New Hybrid Interaction Model

### Field-Specific Interactions

#### 1. **DATA Field** - Collection Dropdown 🗂️
- **Interaction**: Click to show dropdown list
- **Purpose**: Select from available datasets/collections
- **Why Dropdown**: Collections are finite, complex IDs, better to browse
- **Features**:
  - Searchable list of all available collections
  - Shows collection title and ID
  - Auto-filters as you type in search box

#### 2. **EVERYWHERE Field** - Direct Editing 🌍
- **Interaction**: Click to edit directly
- **Purpose**: Define area of interest
- **Why Direct Edit**: Locations are infinite, natural language input works better
- **Examples**: 
  - "everywhere" or "global" → Sets to global search
  - Location names → Custom location
  - WKT/GeoJSON → Geometry data (shows as "Custom Geometry")
- **Features**: Also supports "Draw on Map" functionality

#### 3. **ANYTIME Field** - Direct Editing 📅
- **Interaction**: Click to edit directly  
- **Purpose**: Set time period
- **Why Direct Edit**: Natural language date expressions are intuitive
- **Examples**:
  - "anytime" → No date restriction
  - "last week" or "7 days" → Last 7 days
  - "last month" or "30 days" → Last 30 days
  - "last 3 months" or "90 days" → Last 3 months
- **Features**: Smart parsing converts natural language to date ranges

#### 4. **PARAMETERS Field** - Direct Editing ⚙️
- **Interaction**: Click to edit directly
- **Purpose**: Set search parameters like cloud cover
- **Why Direct Edit**: Parameters benefit from quick text input
- **Examples**: "20%" or "20" → Sets cloud cover to 20%
- **Features**: Smart extraction of parameter values

## Usage Instructions

1. **Open AI Smart Search**: Click the brain icon (🧠) in the search panel header
2. **Select Collection**: Click on **DATA** → Browse and click a collection from the dropdown
3. **Set Location** (optional): Click on **EVERYWHERE** → Type location description or "everywhere"
4. **Set Time** (optional): Click on **ANYTIME** → Type date expression or "anytime"
5. **Set Parameters** (optional): Click on **PARAMETERS** → Type "20%" for cloud cover
6. **Execute**: Click the Search button to run your query

## Visual Feedback

- **DATA field**: Hover shows "(click to select)" - indicates dropdown
- **Other fields**: Hover shows "(click to edit)" - indicates direct editing
- **Active dropdown**: Collection field shows search box and scrollable list
- **Editing mode**: Other fields become highlighted and editable

## Technical Improvements

### Enhanced Collection Dropdown
- Fixed event handling for collection selection
- Better error handling and logging
- Improved search and filtering functionality
- Proper cleanup of event listeners

### Smart Text Processing
- **Location parsing**: Recognizes "everywhere", geometry data, place names
- **Date parsing**: Converts "last week", "30 days", etc. to actual date ranges
- **Parameter parsing**: Extracts percentages and numeric values

### User Experience
- Field-specific interaction hints
- Better visual feedback during interaction
- Consistent behavior across different field types
- Intuitive interaction model matching field purpose

## Why This Hybrid Approach?

This design provides the optimal user experience for each field type:

- **Collections**: Finite list, complex IDs → **Dropdown selection**
- **Location/Time/Params**: Infinite possibilities → **Natural language input**

Users get structured selection where it helps, and flexible input where it's needed.

## Testing the Fix

To verify functionality:

1. Open STAC Explorer and click the AI Smart Search button (🧠)
2. Test **DATA field**: Click and verify dropdown shows collections
3. Test **EVERYWHERE field**: Click and type "everywhere" or location
4. Test **ANYTIME field**: Click and type "last week" 
5. Test **PARAMETERS field**: Click and type "15%"
6. Execute search to ensure parameters are applied correctly

## Backwards Compatibility

- All existing functionality preserved
- Map drawing integration still works
- Search execution unchanged
- Collection management unchanged
