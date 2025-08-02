import cors from 'cors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 8000;

// Enable CORS for all routes
app.use(cors());

// Sample collections data
const collections = [
  {
    id: 'landsat-8',
    title: 'Landsat 8',
    description: 'Landsat 8 satellite imagery',
    provider: 'USGS',
  },
  {
    id: 'sentinel-2',
    title: 'Sentinel-2',
    description: 'Sentinel-2 satellite imagery',
    provider: 'ESA',
  },
  {
    id: 'naip',
    title: 'NAIP',
    description: 'National Agriculture Imagery Program',
    provider: 'USDA',
  },
];

// API endpoints
app.get('/api/collections', (req, res) => {
  res.json(collections);
});

app.get('/api/search', (req, res) => {
  // TODO: Implement search functionality
  res.json({
    results: [],
    total: 0,
  });
});

// Serve static files AFTER API routes but BEFORE catch-all
app.use(
  express.static(__dirname, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
    },
  })
);

// Serve index.html for all other routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
