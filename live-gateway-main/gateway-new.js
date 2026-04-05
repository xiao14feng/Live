// gateway-new.js — modular entry point
// After verifying this works, rename to gateway.js

const express  = require('express');
const cors     = require('cors');
const http     = require('http');
const path     = require('path');
const fs       = require('fs');

const { getCurrentServerConfig, printConfig } = require('./config/server-mode.node.js');
const currentConfig = getCurrentServerConfig();
const port = process.env.PORT || currentConfig.port;

// Set backend URL — routes read process.env.BACKEND_BASE_URL with fallback to localhost:8000
// Override here or via environment variable BACKEND_BASE_URL
if (!process.env.BACKEND_BASE_URL) {
    process.env.BACKEND_BASE_URL = 'https://live-production-50f1.up.railway.app';
}

const app    = express();
const server = http.createServer(app);

// ── WebSocket ──
const { setupWebSocket, broadcast, wss } = require('./routes/websocket');
setupWebSocket(server);

// ── Middleware ──
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-user-role', 'X-User-Role'], credentials: true }));
app.use(express.json());

// ── Static files ──
const frontendRoot      = process.env.FRONTEND_ROOT ? path.resolve(process.env.FRONTEND_ROOT) : path.resolve(__dirname, '..', 'Live-main');
const frontendAdminDir  = path.join(frontendRoot, 'admin');
const frontendStaticDir = path.join(frontendRoot, 'static');

app.get('/',      (req, res) => { const f = path.join(frontendRoot, 'index.html');       fs.existsSync(f) ? res.sendFile(f) : res.json({ status: 'ok', message: 'Live Debate Gateway API' }); });
app.get('/admin', (req, res) => { const f = path.join(frontendAdminDir, 'index.html');   fs.existsSync(f) ? res.sendFile(f) : res.json({ status: 'ok' }); });
if (fs.existsSync(frontendAdminDir))  app.use('/admin',   express.static(frontendAdminDir));
if (fs.existsSync(frontendStaticDir)) app.use('/static',  express.static(frontendStaticDir));
if (fs.existsSync(frontendRoot))      app.use(express.static(frontendRoot));

// ── Health check ──
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Routes ──
const { router: adminStreamsRouter, startScheduleCheck } = require('./routes/admin-streams');
app.use(adminStreamsRouter);
app.use(require('./routes/admin-votes'));
app.use(require('./routes/admin-ai'));
app.use(require('./routes/stats'));
app.use(require('./routes/public'));
app.use(require('./routes/wechat')(currentConfig));
app.use(require('./routes/admin-system'));
app.use(require('./routes/ai-summarize'));
app.use(require('./routes/debates').router);

// ── Optional: local db routes ──
try {
    const db = require('./db');
    const { registerDbRoutes } = require('./routes/admin-system');
    if (registerDbRoutes) registerDbRoutes(app, db);
} catch (e) {
    // db.js not available or not needed
}

// ── Request logging ──
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) console.log(`API request: ${req.method} ${req.path}`);
    next();
});

// ── 404 handler ──
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        console.log(`API route not found: ${req.method} ${req.path}`);
        return res.status(404).json({ success: false, error: 'Not Found', path: req.path, message: `API route ${req.path} not defined` });
    }
    res.status(404).json({ error: 'Not Found', path: req.url });
});

// ── Simulate data (mock mode only) ──
const state = require('./routes/state');
const { v4: uuidv4 } = require('uuid');

function simulateVoteChanges() {
    setInterval(() => {
        if (!state.globalLiveStatus.isLive) return;
        state.currentVotes.leftVotes  += Math.floor(Math.random() * 5) + 1;
        state.currentVotes.rightVotes += Math.floor(Math.random() * 5) + 1;
    }, 3000);
}

function simulateNewAIContent() {
    const pool = [
        { text: 'Left: Pain enables growth and empathy.', side: 'left' },
        { text: 'Right: Modern medicine already eliminates pain — this button is just an extension.', side: 'right' },
        { text: 'Left: Without pain, how would we understand others suffering?', side: 'left' },
        { text: 'Right: Everyone has the right to choose — no one should be forced to suffer.', side: 'right' }
    ];
    setInterval(() => {
        if (!state.globalLiveStatus.isLive) return;
        const item = pool[Math.floor(Math.random() * pool.length)];
        state.aiDebateContent.push({ id: uuidv4(), debate_id: state.debateTopic.id, text: item.text, side: item.side, timestamp: Date.now(), comments: [], likes: Math.floor(Math.random() * 20) + 10 });
    }, 15000);
}

// ── Start server ──
server.listen(port, '0.0.0.0', () => {
    console.log('');
    printConfig();
    console.log(`Debate topic: ${state.debateTopic.title}`);
    console.log(`Server running on port ${port}`);
    if (wss) console.log(`WebSocket ready: ws://localhost:${port}/ws`);
    console.log('══════════════════════════════════════');

    if (currentConfig.mode === 'mock') {
        simulateVoteChanges();
        simulateNewAIContent();
        console.log('Mock data simulator started');
    }

    startScheduleCheck();
    console.log('Live schedule checker started');
});

module.exports = app;
