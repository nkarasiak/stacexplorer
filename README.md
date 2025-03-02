# STAC Explorer

A modern, user-friendly web application for searching and visualizing Earth observation data using STAC APIs. This application provides an intuitive interface for discovering satellite imagery and related Earth observation datasets.

## Features

- 🗺️ Interactive Map Interface
  - Visual area selection using drawing tools
  - Real-time bounding box coordinate display
  - Dynamic map updates based on search results

- 🔍 Advanced Search Capabilities
  - Full-text search across titles and descriptions
  - Date range filtering with calendar integration
  - Cloud cover percentage filtering with slider control
  - Bounding box spatial filtering
  - Collection-specific searches

- 📊 Results Visualization
  - Thumbnail previews of datasets
  - Cloud cover indicators with intuitive icons
  - Dataset metadata display
  - Quick-view information modal

- 💫 Modern User Experience
  - Responsive design
  - Material Design styling
  - Real-time search updates
  - URL state management for shareable searches

## Getting Started

See you on : http://nkarasiak.github.io/stacexplorer

## Usage

### Basic Search

1. Enter search terms in the search box to find datasets by title or description
2. Use the date picker to filter results by time range
3. Adjust the cloud cover slider to filter images based on cloud percentage

### Spatial Search

1. Use the drawing tools on the map to define a search area
2. The bounding box coordinates will automatically update
3. You can also manually enter coordinates in the format: `west,south,east,north`

### Managing Results

- Click the information icon (ℹ️) on any dataset to view detailed metadata
- Cloud cover percentage is displayed with intuitive icons:
  - ☀️ 0-10% clouds
  - 🌤️ 11-30% clouds
  - ⛅ 31-60% clouds
  - 🌥️ 61-90% clouds
  - ☁️ 91-100% clouds

### URL Parameters

The application supports the following URL parameters for sharing searches:

- `cloudCover`: Maximum cloud cover percentage
- `collections`: Comma-separated list of collection IDs
- `bbox`: Bounding box coordinates (west,south,east,north)
- `datetime`: Date range in ISO format

## Project Structure

```
eds/
├── index.html          # Main application entry point
├── control-panel.html  # Search controls and filters
├── css/               # Stylesheets
│   └── styles.css     # Main stylesheet
├── js/                # JavaScript modules
│   ├── components/    # UI components
│   └── api/          # API integration
└── README.md         # This file
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.