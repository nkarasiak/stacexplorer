const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 8000;

// Enable CORS for all routes
app.use(cors());

// Serve static files from the root directory
app.use(express.static(__dirname));

// Sample collections data
const collections = [
    {
        id: 'landsat-8',
        title: 'Landsat 8',
        description: 'Landsat 8 satellite imagery',
        provider: 'USGS'
    },
    {
        id: 'sentinel-2',
        title: 'Sentinel-2',
        description: 'Sentinel-2 satellite imagery',
        provider: 'ESA'
    },
    {
        id: 'naip',
        title: 'NAIP',
        description: 'National Agriculture Imagery Program',
        provider: 'USDA'
    }
];

// API endpoints
app.get('/api/collections', (req, res) => {
    res.json(collections);
});

app.get('/api/search', (req, res) => {
    // TODO: Implement search functionality
    res.json({
        results: [],
        total: 0
    });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 