// Admin system control: live start/stop, vote updates, AI control, dashboard
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const state = require('./state');
const { broadcast } = require('./websocket');

// ── 1. Live control ──

router.post('/api/admin/live/start', (req, res) => {
    try {
        const { streamId, autoStartAI = false, notifyUsers = true } = req.body;
        const s = state.globalLiveStatus;

        // Stop all other active streams
        for (const [otherId, status] of Object.entries(state.streamLiveStatuses)) {
            if (otherId !== streamId && status.isLive) {
                console.log('Auto-stopping other stream:', otherId);
                state.streamLiveStatuses[otherId].isLive = false;
                state.streamLiveStatuses[otherId].stopTime = new Date().toISOString();
                broadcast('liveStatus', { streamId: otherId, isLive: false, stopTime: state.streamLiveStatuses[otherId].stopTime });
            }
        }

        const liveId    = uuidv4();
        const startTime = new Date().toISOString();

        if (streamId) {
            state.streamLiveStatuses[streamId] = { isLive: true, liveId, startTime, streamUrl: null, streamName: null };
        }

        s.isLive    = true;
        s.streamId  = streamId || s.streamId;
        s.liveId    = liveId;
        s.startTime = startTime;

        if (autoStartAI && state.globalAIStatus.status !== 'running') {
            state.globalAIStatus.status      = 'running';
            state.globalAIStatus.aiSessionId = uuidv4();
            state.globalAIStatus.startTime   = startTime;
            broadcast('aiStatus', { status: 'running', aiSessionId: state.globalAIStatus.aiSessionId });
        }

        if (notifyUsers) broadcast('liveStatus', { isLive: true, liveId, streamUrl: s.streamUrl, startTime });

        console.log('Live started:', liveId);
        res.json({ success: true, data: { liveId, streamUrl: s.streamUrl, status: 'started', startTime }, message: 'Live started', timestamp: Date.now() });
    } catch (error) {
        console.error('Failed to start live:', error);
        res.status(500).json({ success: false, message: 'Failed to start live: ' + error.message });
    }
});

router.post('/api/admin/live/stop', (req, res) => {
    try {
        const { streamId, notifyUsers = true } = req.body;
        const targetId = streamId || state.globalLiveStatus.streamId;
        const s = state.globalLiveStatus;

        if (!s.isLive && (!targetId || !state.streamLiveStatuses[targetId]?.isLive)) {
            return res.json({ success: true, data: { status: 'stopped', message: 'Live not running' }, timestamp: Date.now() });
        }

        const stopTime = new Date().toISOString();
        let duration = 0, liveId = null;

        if (targetId && state.streamLiveStatuses[targetId]?.isLive) {
            const st = state.streamLiveStatuses[targetId];
            duration = Math.floor((Date.now() - new Date(st.startTime).getTime()) / 1000);
            liveId   = st.liveId;
            state.streamLiveStatuses[targetId].isLive   = false;
            state.streamLiveStatuses[targetId].stopTime = stopTime;
        }

        if (targetId === s.streamId || !targetId) {
            liveId = liveId || s.liveId;
            duration = duration || (s.startTime ? Math.floor((Date.now() - new Date(s.startTime).getTime()) / 1000) : 0);
            s.isLive = false; s.streamUrl = null; s.streamId = null; s.liveId = null; s.startTime = null;
        }

        if (notifyUsers) broadcast('liveStatus', { streamId: targetId, isLive: false, liveId, stopTime });

        console.log('Live stopped:', liveId);
        res.json({ success: true, data: { liveId, status: 'stopped', stopTime, duration }, message: 'Live stopped', timestamp: Date.now() });
    } catch (error) {
        console.error('Failed to stop live:', error);
        res.status(500).json({ success: false, message: 'Failed to stop live: ' + error.message });
    }
});

// ── 2. Vote updates ──

router.post(['/api/admin/live/update-votes', '/api/v1/admin/live/update-votes'], async (req, res) => {
    try {
        const { action, leftVotes, rightVotes, notifyUsers = true, streamId } = req.body;
        if (!['set', 'add', 'reset'].includes(action)) return res.status(400).json({ success: false, message: 'action must be set/add/reset' });
        const before = { leftVotes: state.currentVotes.leftVotes, rightVotes: state.currentVotes.rightVotes };
        switch (action) {
            case 'set':   state.currentVotes.leftVotes  = parseInt(leftVotes)  || 0; state.currentVotes.rightVotes = parseInt(rightVotes) || 0; break;
            case 'add':   state.currentVotes.leftVotes += parseInt(leftVotes)  || 0; state.currentVotes.rightVotes += parseInt(rightVotes) || 0; break;
            case 'reset': state.currentVotes.leftVotes  = 0; state.currentVotes.rightVotes = 0; break;
        }
        const total = state.currentVotes.leftVotes + state.currentVotes.rightVotes;
        const after = { leftVotes: state.currentVotes.leftVotes, rightVotes: state.currentVotes.rightVotes, leftPercentage: total > 0 ? Math.round((state.currentVotes.leftVotes / total) * 100) : 50, rightPercentage: total > 0 ? Math.round((state.currentVotes.rightVotes / total) * 100) : 50 };
        if (notifyUsers) broadcast('votes-updated', after);

        // Sync to Python backend + clear vote records so users/judges can re-vote
        const sid = streamId || 'default';
        try {
            if (action === 'set' || action === 'reset') {
                // Set votes in backend
                await fetch(`${process.env.BACKEND_BASE_URL || 'http://localhost:8000'}/api/admin/votes`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leftVotes: state.currentVotes.leftVotes, rightVotes: state.currentVotes.rightVotes, stream_id: sid })
                });
                // Clear vote records so users/judges can vote again
                await fetch(`${process.env.BACKEND_BASE_URL || 'http://localhost:8000'}/api/admin/votes/reset`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ streamId: sid, stream_id: sid })
                });
                // Re-set to desired values after reset
                if (action === 'set') {
                    await fetch(`${process.env.BACKEND_BASE_URL || 'http://localhost:8000'}/api/admin/votes`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ leftVotes: state.currentVotes.leftVotes, rightVotes: state.currentVotes.rightVotes, stream_id: sid })
                    });
                }
            } else if (action === 'add') {
                await fetch(`${process.env.BACKEND_BASE_URL || 'http://localhost:8000'}/api/admin/votes`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leftVotes: state.currentVotes.leftVotes, rightVotes: state.currentVotes.rightVotes, stream_id: sid })
                });
            }
        } catch (syncErr) { console.warn('Backend sync failed (non-fatal):', syncErr.message); }

        console.log('Votes updated (' + action + '):', after);
        res.json({ success: true, data: { beforeUpdate: before, afterUpdate: after, updateTime: new Date().toISOString() }, message: 'Votes updated', timestamp: Date.now() });
    } catch (error) {
        console.error('Failed to update votes:', error);
        res.status(500).json({ success: false, message: 'Failed to update votes: ' + error.message });
    }
});

router.post(['/api/admin/live/reset-votes', '/api/v1/admin/live/reset-votes'], async (req, res) => {
    try {
        const { resetTo, saveBackup = true, notifyUsers = true, streamId } = req.body;
        const backup = saveBackup ? { backupId: uuidv4(), leftVotes: state.currentVotes.leftVotes, rightVotes: state.currentVotes.rightVotes, timestamp: new Date().toISOString() } : null;
        state.currentVotes.leftVotes  = parseInt(resetTo?.leftVotes)  || 0;
        state.currentVotes.rightVotes = parseInt(resetTo?.rightVotes) || 0;
        if (notifyUsers) broadcast('votes-updated', { leftVotes: state.currentVotes.leftVotes, rightVotes: state.currentVotes.rightVotes, leftPercentage: 50, rightPercentage: 50 });

        // Sync to Python backend + clear vote records
        const sid = streamId || 'default';
        try {
            await fetch(`${process.env.BACKEND_BASE_URL || 'http://localhost:8000'}/api/admin/votes/reset`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ streamId: sid, stream_id: sid })
            });
            if (state.currentVotes.leftVotes > 0 || state.currentVotes.rightVotes > 0) {
                await fetch(`${process.env.BACKEND_BASE_URL || 'http://localhost:8000'}/api/admin/votes`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leftVotes: state.currentVotes.leftVotes, rightVotes: state.currentVotes.rightVotes, stream_id: sid })
                });
            }
        } catch (syncErr) { console.warn('Backend sync failed (non-fatal):', syncErr.message); }

        console.log('Votes reset');
        res.json({ success: true, data: { backup, currentVotes: { leftVotes: state.currentVotes.leftVotes, rightVotes: state.currentVotes.rightVotes } }, message: 'Votes reset', timestamp: Date.now() });
    } catch (error) {
        console.error('Failed to reset votes:', error);
        res.status(500).json({ success: false, message: 'Failed to reset votes: ' + error.message });
    }
});

// ── 3. AI control ──

router.post('/api/admin/ai/start', (req, res) => {
    try {
        const { settings, notifyUsers = true } = req.body;
        if (state.globalAIStatus.status === 'running') return res.status(409).json({ success: false, message: 'AI already running' });
        if (settings) Object.assign(state.globalAIStatus.settings, settings);
        state.globalAIStatus.status      = 'running';
        state.globalAIStatus.aiSessionId = uuidv4();
        state.globalAIStatus.startTime   = new Date().toISOString();
        state.globalAIStatus.statistics  = { totalContents: 0, totalWords: 0, averageConfidence: 0 };
        if (notifyUsers) broadcast('aiStatus', { status: 'running', aiSessionId: state.globalAIStatus.aiSessionId });
        console.log('AI started:', state.globalAIStatus.aiSessionId);
        res.json({ success: true, data: { aiSessionId: state.globalAIStatus.aiSessionId, status: 'running', startTime: state.globalAIStatus.startTime, settings: state.globalAIStatus.settings }, message: 'AI started', timestamp: Date.now() });
    } catch (error) {
        console.error('Failed to start AI:', error);
        res.status(500).json({ success: false, message: 'Failed to start AI: ' + error.message });
    }
});

router.post('/api/admin/ai/stop', (req, res) => {
    try {
        const { notifyUsers = true } = req.body;
        if (state.globalAIStatus.status === 'stopped') return res.status(400).json({ success: false, message: 'AI not running' });
        const stopTime    = new Date().toISOString();
        const duration    = state.globalAIStatus.startTime ? Math.floor((Date.now() - new Date(state.globalAIStatus.startTime).getTime()) / 1000) : 0;
        const aiSessionId = state.globalAIStatus.aiSessionId;
        const summary     = { ...state.globalAIStatus.statistics };
        state.globalAIStatus.status = 'stopped'; state.globalAIStatus.aiSessionId = null; state.globalAIStatus.startTime = null;
        if (notifyUsers) broadcast('aiStatus', { status: 'stopped', aiSessionId });
        console.log('AI stopped:', aiSessionId);
        res.json({ success: true, data: { aiSessionId, status: 'stopped', stopTime, duration, summary }, message: 'AI stopped', timestamp: Date.now() });
    } catch (error) {
        console.error('Failed to stop AI:', error);
        res.status(500).json({ success: false, message: 'Failed to stop AI: ' + error.message });
    }
});

router.post('/api/admin/ai/toggle', (req, res) => {
    try {
        const { action, notifyUsers = true } = req.body;
        if (!['pause', 'resume'].includes(action)) return res.status(400).json({ success: false, message: 'action must be pause/resume' });
        if (action === 'pause'  && state.globalAIStatus.status !== 'running') return res.status(400).json({ success: false, message: 'AI not running' });
        if (action === 'resume' && state.globalAIStatus.status !== 'paused')  return res.status(400).json({ success: false, message: 'AI not paused' });
        state.globalAIStatus.status = action === 'pause' ? 'paused' : 'running';
        if (notifyUsers) broadcast('aiStatus', { status: state.globalAIStatus.status });
        console.log('AI status changed:', state.globalAIStatus.status);
        res.json({ success: true, data: { aiSessionId: state.globalAIStatus.aiSessionId, status: state.globalAIStatus.status, actionTime: new Date().toISOString() }, message: state.globalAIStatus.status === 'paused' ? 'AI paused' : 'AI resumed', timestamp: Date.now() });
    } catch (error) {
        console.error('Failed to toggle AI:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle AI: ' + error.message });
    }
});

router.delete('/api/admin/ai/content/:contentId', (req, res) => {
    try {
        const { contentId } = req.params;
        const { reason, notifyUsers = true } = req.body;
        if (!contentId) return res.status(400).json({ success: false, message: 'contentId required' });
        if (notifyUsers) broadcast('aiContentDeleted', { contentId });
        console.log('AI content deleted:', contentId);
        res.json({ success: true, data: { contentId, deleteTime: new Date().toISOString(), reason: reason || 'admin' }, message: 'Content deleted', timestamp: Date.now() });
    } catch (error) {
        console.error('Failed to delete AI content:', error);
        res.status(500).json({ success: false, message: 'Failed to delete AI content: ' + error.message });
    }
});

// ── 4. Dashboard & stats ──

router.get('/api/admin/dashboard', (req, res) => {
    try {
        const total = state.currentVotes.leftVotes + state.currentVotes.rightVotes;
        const leftPct  = total > 0 ? Math.round((state.currentVotes.leftVotes  / total) * 100) : 50;
        const rightPct = total > 0 ? Math.round((state.currentVotes.rightVotes / total) * 100) : 50;
        const duration = state.globalLiveStatus.isLive && state.globalLiveStatus.startTime
            ? Math.floor((Date.now() - new Date(state.globalLiveStatus.startTime).getTime()) / 1000) : 0;
        res.json({
            success: true,
            data: {
                totalUsers: 0, activeUsers: 0,
                isLive: state.globalLiveStatus.isLive,
                liveStreamUrl: state.globalLiveStatus.streamUrl,
                streamId: state.globalLiveStatus.streamId,
                totalVotes: total, leftVotes: state.currentVotes.leftVotes, rightVotes: state.currentVotes.rightVotes,
                leftPercentage: leftPct, rightPercentage: rightPct,
                totalComments: 0, totalLikes: 0,
                aiStatus: state.globalAIStatus.status,
                debateTopic: { title: state.debateTopic.title, description: state.debateTopic.description },
                liveStartTime: state.globalLiveStatus.startTime, liveDuration: duration
            },
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Failed to get dashboard:', error);
        res.status(500).json({ success: false, message: 'Failed to get dashboard: ' + error.message });
    }
});

router.get('/api/admin/miniprogram/users', (req, res) => {
    res.json({ success: true, data: { total: 0, page: 1, pageSize: 20, users: [] }, timestamp: Date.now() });
});

router.get('/api/admin/votes/statistics', (req, res) => {
    const total = state.currentVotes.leftVotes + state.currentVotes.rightVotes;
    const leftPct  = total > 0 ? Math.round((state.currentVotes.leftVotes  / total) * 100) : 50;
    const rightPct = total > 0 ? Math.round((state.currentVotes.rightVotes / total) * 100) : 50;
    res.json({ success: true, data: { summary: { totalVotes: total, leftVotes: state.currentVotes.leftVotes, rightVotes: state.currentVotes.rightVotes, leftPercentage: leftPct, rightPercentage: rightPct }, timeline: [], topVoters: [] }, timestamp: Date.now() });
});

module.exports = router;

// ── 5. Local stream management (uses local db, separate from proxy routes) ──

function generatePlayUrls(stream) {
    const serverIP       = process.env.SERVER_IP        || '192.168.31.249';
    const hlsServerPort  = process.env.HLS_SERVER_PORT  || '8086';
    const rtmpServerPort = process.env.RTMP_SERVER_PORT || '1935';
    const getStreamName  = (url) => { try { const p = new URL(url).pathname.split('/').filter(Boolean); return p[p.length - 1] || 'stream'; } catch (e) { const m = url.match(/([^/]+)(?:\.[^.]+)?$/); return m ? m[1] : 'stream'; } };
    const playUrls = { hls: null, flv: null, rtmp: null };
    switch (stream.type) {
        case 'hls':  playUrls.hls = stream.url; if (stream.url.includes('.m3u8')) playUrls.flv = stream.url.replace('.m3u8', '.flv'); break;
        case 'rtmp': { const n = getStreamName(stream.url); playUrls.hls = `http://${serverIP}:${hlsServerPort}/live/${n}.m3u8`; playUrls.flv = `http://${serverIP}:${hlsServerPort}/live/${n}.flv`; playUrls.rtmp = stream.url; break; }
        case 'flv':  playUrls.flv = stream.url; if (stream.url.includes('.flv')) { const n = getStreamName(stream.url); playUrls.hls = `http://${serverIP}:${hlsServerPort}/live/${n}.m3u8`; } break;
        default:     playUrls.hls = stream.url;
    }
    if (!playUrls.hls) playUrls.hls = stream.url;
    return playUrls;
}

// These routes use the local db module (live-gateway-main/db.js)
// They are registered only when db is available
module.exports.registerDbRoutes = (app, db) => {
    app.get('/api/admin/live-streams', (req, res) => {
        try {
            const streams = db.streams.getAll ? db.streams.getAll() : [];
            const streamsWithStatus = streams.map(stream => ({
                ...stream,
                playUrls: generatePlayUrls(stream),
                liveStatus: state.streamLiveStatuses[stream.id] || { isLive: false, liveId: null, startTime: null }
            }));
            res.json({ success: true, data: { streams: streamsWithStatus, total: streams.length }, timestamp: Date.now() });
        } catch (error) {
            console.error('Failed to get live streams:', error);
            res.status(500).json({ success: false, message: 'Failed to get live streams: ' + error.message });
        }
    });

    app.post('/api/admin/live-streams', (req, res) => {
        try {
            const { name, url, type, description, enabled } = req.body;
            if (!name || !url || !type) return res.status(400).json({ success: false, message: 'name, url, type required' });
            try { new URL(url); } catch (e) { return res.status(400).json({ success: false, message: 'Invalid URL format' }); }
            if (!['hls', 'rtmp', 'flv'].includes(type)) return res.status(400).json({ success: false, message: 'type must be hls/rtmp/flv' });
            const newStream = { id: `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, name: name.trim(), url: url.trim(), type, description: description ? description.trim() : '', enabled: enabled !== false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            db.streams.add(newStream);
            console.log('Stream added:', newStream.name, newStream.url);
            res.json({ success: true, data: newStream, message: 'Stream added', timestamp: Date.now() });
        } catch (error) {
            console.error('Failed to add stream:', error);
            res.status(500).json({ success: false, message: 'Failed to add stream: ' + error.message });
        }
    });

    app.put('/api/admin/live-streams/:id', (req, res) => {
        try {
            const { name, url, type, description, enabled } = req.body;
            if (url) { try { new URL(url); } catch (e) { return res.status(400).json({ success: false, message: 'Invalid URL format' }); } }
            if (type && !['hls', 'rtmp', 'flv'].includes(type)) return res.status(400).json({ success: false, message: 'type must be hls/rtmp/flv' });
            const updates = {};
            if (name        !== undefined) updates.name        = name.trim();
            if (url         !== undefined) updates.url         = url.trim();
            if (type        !== undefined) updates.type        = type;
            if (description !== undefined) updates.description = description.trim();
            if (enabled     !== undefined) updates.enabled     = enabled;
            updates.updatedAt = new Date().toISOString();
            const updated = db.streams.update(req.params.id, updates);
            console.log('Stream updated:', req.params.id, updates);
            res.json({ success: true, data: updated, message: 'Stream updated', timestamp: Date.now() });
        } catch (error) {
            console.error('Failed to update stream:', error);
            res.status(500).json({ success: false, message: 'Failed to update stream: ' + error.message });
        }
    });

    app.delete('/api/admin/live-streams/:id', (req, res) => {
        try {
            const streamId = req.params.id;
            if (state.globalLiveStatus.streamId === streamId) return res.status(400).json({ success: false, message: 'Stream is currently live, stop it first' });
            db.streams.delete(streamId);
            console.log('Stream deleted:', streamId);
            res.json({ success: true, data: { id: streamId }, message: 'Stream deleted', timestamp: Date.now() });
        } catch (error) {
            console.error('Failed to delete stream:', error);
            res.status(500).json({ success: false, message: 'Failed to delete stream: ' + error.message });
        }
    });
};
