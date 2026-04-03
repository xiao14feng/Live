// Stats, dashboard, debate-flow routes
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const state = require('./state');
const { broadcast } = require('./websocket');
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:8000';

// ── Statistics ──

router.get('/api/admin/statistics/summary', (req, res) => {
    res.json({ success: true, data: { totalVotes: 0, totalUsers: 0, totalStreams: 0, totalLiveDays: 0 } });
});

router.get('/api/admin/statistics/daily', (req, res) => {
    res.json({ success: true, data: [] });
});

router.get('/api/v1/admin/dashboard', async (req, res) => {
    try {
        const streamId = req.query.stream_id;
        if (!streamId) return res.status(400).json({ success: false, message: 'stream_id required' });
        const response = await fetch(`${BACKEND_BASE_URL}/api/v1/votes?stream_id=${streamId}`);
        const voteData = await response.json();
        const leftVotes  = voteData.data?.leftVotes  || 0;
        const rightVotes = voteData.data?.rightVotes || 0;
        const totalVotes = leftVotes + rightVotes;
        const isLive = state.globalLiveStatus.isLive && state.globalLiveStatus.streamId === streamId;
        res.json({
            success: true,
            data: {
                totalUsers: 0, activeUsers: 0, isLive,
                streamId, totalVotes, leftVotes, rightVotes,
                leftPercentage:  totalVotes > 0 ? Math.round((leftVotes  / totalVotes) * 100) : 50,
                rightPercentage: totalVotes > 0 ? Math.round((rightVotes / totalVotes) * 100) : 50,
                totalComments: 0, totalLikes: 0,
                aiStatus: state.globalAIStatus.status,
                debateTopic: { title: state.debateTopic.title, description: state.debateTopic.description },
                liveStartTime: isLive ? state.globalLiveStatus.startTime : null
            },
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Failed to get dashboard:', error);
        res.status(500).json({ success: false, message: 'Failed to get dashboard: ' + error.message });
    }
});

router.get('/api/v1/admin/live/viewers', (req, res) => {
    res.json({ success: true, data: { viewers: [], totalViewers: 0 } });
});

// ── Debate flow ──

const DEBATE_FLOW_FILE = path.join(__dirname, '..', 'data', 'debate-flow.json');

function loadDebateFlow() {
    try {
        if (fs.existsSync(DEBATE_FLOW_FILE)) return JSON.parse(fs.readFileSync(DEBATE_FLOW_FILE, 'utf8'));
    } catch (e) {}
    return {};
}

function saveDebateFlow(configs) {
    try {
        const dir = path.dirname(DEBATE_FLOW_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(DEBATE_FLOW_FILE, JSON.stringify(configs, null, 2));
    } catch (e) {
        console.error('Failed to save debate flow config:', e);
    }
}

// Load on startup
Object.assign(state.debateFlowConfigs, loadDebateFlow());

const DEFAULT_SEGMENTS = [
    { name: 'Left speech',    duration: 180, side: 'left'  },
    { name: 'Right question', duration: 120, side: 'right' },
    { name: 'Right speech',   duration: 180, side: 'right' },
    { name: 'Left question',  duration: 120, side: 'left'  },
    { name: 'Free debate',    duration: 300, side: 'both'  },
    { name: 'Left summary',   duration: 120, side: 'left'  },
    { name: 'Right summary',  duration: 120, side: 'right' }
];

router.get('/api/admin/debate-flow', (req, res) => {
    const streamId = req.query.stream_id;
    if (!streamId) return res.status(400).json({ success: false, message: 'stream_id required' });
    const config = state.debateFlowConfigs[streamId] || { streamId, currentSegment: 0, status: 'idle', segments: DEFAULT_SEGMENTS };
    res.json({ success: true, data: config });
});

router.post('/api/admin/debate-flow', (req, res) => {
    const { stream_id, segments } = req.body;
    if (!stream_id) return res.status(400).json({ success: false, message: 'stream_id required' });
    state.debateFlowConfigs[stream_id] = { ...(state.debateFlowConfigs[stream_id] || {}), streamId: stream_id, segments: segments || [], updatedAt: new Date().toISOString() };
    saveDebateFlow(state.debateFlowConfigs);
    broadcast('debate-flow-updated', { streamId: stream_id, segments });
    res.json({ success: true, message: 'Debate flow saved', data: state.debateFlowConfigs[stream_id] });
});

router.post('/api/admin/debate-flow/control', (req, res) => {
    const { stream_id, action } = req.body;
    if (!stream_id || !action) return res.status(400).json({ success: false, message: 'stream_id and action required' });
    const config = state.debateFlowConfigs[stream_id] || { currentSegment: 0, status: 'idle', segments: [] };
    const total = config.segments?.length || 0;
    switch (action) {
        case 'start':  config.status = 'running'; config.currentSegment = 0; config.startTime = new Date().toISOString(); break;
        case 'pause':  config.status = 'paused';  break;
        case 'resume': config.status = 'running'; break;
        case 'reset':  config.status = 'idle'; config.currentSegment = 0; config.startTime = null; break;
        case 'next':   if (config.currentSegment < total - 1) config.currentSegment++; break;
        case 'prev':   if (config.currentSegment > 0) config.currentSegment--; break;
    }
    state.debateFlowConfigs[stream_id] = config;
    broadcast('debate-flow-control', { streamId: stream_id, action, config });
    res.json({ success: true, message: `Action ${action} applied`, data: config });
});

module.exports = router;
