// WebSocket setup and broadcast helpers

const http = require('http');
const state = require('./state');

let WebSocketServer;
try {
    const ws = require('ws');
    WebSocketServer = ws.WebSocketServer;
} catch (e) {
    console.warn('WebSocket module not installed. Run: npm install ws');
    WebSocketServer = null;
}

const wsClients = new Set();
let wss = null;

function broadcast(type, data) {
    if (!wss || wsClients.size === 0) return;
    const message = JSON.stringify({ type, data, timestamp: Date.now() });
    wsClients.forEach(client => {
        if (client.readyState === 1) {
            client.send(message);
        } else {
            wsClients.delete(client);
        }
    });
}

function broadcastCurrentState(ws) {
    if (!ws || ws.readyState !== 1) return;
    try {
        ws.send(JSON.stringify({
            type: 'state',
            data: {
                votes: state.currentVotes,
                liveStatus: state.globalLiveStatus
            },
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Failed to send current state:', error);
    }
}

function handleWebSocketMessage(ws, data) {
    switch (data.type) {
        case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        default:
            console.log('Unknown WebSocket message type:', data.type);
    }
}

function setupWebSocket(server) {
    if (!WebSocketServer) return null;
    // No path filter — Railway's Caddy proxy handles path routing externally
    wss = new WebSocketServer({ server, path: '/ws' });
    wss.on('headers', (headers) => {
        headers.push('X-WebSocket-Server: live-debate-gateway');
    });

    wss.on('connection', (ws, req) => {
        console.log('WebSocket client connected:', req.socket.remoteAddress);
        wsClients.add(ws);
        ws.send(JSON.stringify({ type: 'connected', message: 'Connected to live data service' }));
        broadcastCurrentState(ws);

        ws.on('message', (message) => {
            try {
                handleWebSocketMessage(ws, JSON.parse(message));
            } catch (error) {
                console.error('WebSocket message parse error:', error);
            }
        });
        ws.on('close', () => { wsClients.delete(ws); });
        ws.on('error', (error) => { console.error('WebSocket error:', error); wsClients.delete(ws); });
    });

    return wss;
}

module.exports = { setupWebSocket, broadcast, get wss() { return wss; } };
