const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const app = express();

// Enable CORS for all routes
app.use(cors());

// Serve static files from the current directory
app.use(express.static(__dirname));

// Proxy endpoint
app.get('/proxy', async (req, res) => {
    try {
        const url = req.query.url;
        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        console.log('Proxying request to:', url);

        const response = await fetch(url, {
            headers: {
                'Accept': 'image/jpeg,image/png,*/*'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Forward the content type
        res.set('Content-Type', response.headers.get('content-type'));

        // Pipe the response directly to the client
        response.body.pipe(res);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Catch-all route to serve index.html for any other requests
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Try to start the server on the preferred port, or use alternative ports if busy
const startServer = (port) => {
    const server = app.listen(port)
        .on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`Port ${port} is busy, trying port ${port + 1}...`);
                startServer(port + 1);
            } else {
                console.error('Server error:', err);
            }
        })
        .on('listening', () => {
            const actualPort = server.address().port;
            console.log(`Server running on port ${actualPort}`);
            console.log(`Open http://localhost:${actualPort} in your browser`);
        });
};

// Start with preferred port
const PORT = process.env.PORT || 3000;
startServer(PORT); 