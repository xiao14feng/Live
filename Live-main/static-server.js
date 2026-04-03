// Minimal static file server for Live-main frontend
// Serves admin panel and static assets
// All API calls go to the gateway (configured in config/server-mode.js)

const express = require('express');
const path = require('path');
const app = express();

const port = process.env.PORT || 3000;

// Serve all static files from this directory
app.use(express.static(path.join(__dirname)));

// Explicit routes for clean URLs
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

// Fallback
app.get('*', (req, res) => {
    res.status(404).send('Not found');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Frontend server running on port ${port}`);
});
