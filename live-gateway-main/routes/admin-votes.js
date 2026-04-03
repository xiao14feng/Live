// Admin routes: votes management + judge votes (proxy to Python backend)
const express = require('express');
const router = express.Router();
const state = require('./state');
const { broadcast } = require('./websocket');
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:8000';

// ── In-memory votes (admin) ──

router.get('/api/admin/votes', (req, res) => {
    const { leftVotes, rightVotes } = state.currentVotes;
    const total = leftVotes + rightVotes;
    res.json({
        success: true,
        data: {
            leftVotes, rightVotes,
            totalVotes: total,
            leftPercentage:  total > 0 ? Math.round((leftVotes  / total) * 100) : 50,
            rightPercentage: total > 0 ? Math.round((rightVotes / total) * 100) : 50
        }
    });
});

router.put('/api/admin/votes', (req, res) => {
    try {
        const { leftVotes, rightVotes } = req.body;
        if (typeof leftVotes  !== 'undefined' && typeof leftVotes  !== 'number') return res.status(400).json({ error: 'leftVotes must be a number' });
        if (typeof rightVotes !== 'undefined' && typeof rightVotes !== 'number') return res.status(400).json({ error: 'rightVotes must be a number' });
        if ((leftVotes !== undefined && leftVotes < 0) || (rightVotes !== undefined && rightVotes < 0)) return res.status(400).json({ error: 'Votes cannot be negative' });
        if (typeof leftVotes  !== 'undefined') state.currentVotes.leftVotes  = leftVotes;
        if (typeof rightVotes !== 'undefined') state.currentVotes.rightVotes = rightVotes;
        const total = state.currentVotes.leftVotes + state.currentVotes.rightVotes;
        broadcast('vote-updated', {
            votes: {
                leftVotes: state.currentVotes.leftVotes, rightVotes: state.currentVotes.rightVotes,
                totalVotes: total,
                leftPercentage:  total > 0 ? Math.round((state.currentVotes.leftVotes  / total) * 100) : 50,
                rightPercentage: total > 0 ? Math.round((state.currentVotes.rightVotes / total) * 100) : 50
            },
            updatedBy: 'admin'
        });
        res.json({ success: true, data: { leftVotes: state.currentVotes.leftVotes, rightVotes: state.currentVotes.rightVotes, totalVotes: total } });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update votes' });
    }
});

router.post('/api/admin/votes/reset', (req, res) => {
    try {
        state.currentVotes.leftVotes  = 0;
        state.currentVotes.rightVotes = 0;
        broadcast('vote-updated', { votes: { leftVotes: 0, rightVotes: 0, totalVotes: 0, leftPercentage: 50, rightPercentage: 50 }, updatedBy: 'admin', action: 'reset' });
        res.json({ success: true, message: 'Votes reset' });
    } catch (error) {
        res.status(500).json({ error: 'Reset failed' });
    }
});

// ── Judge votes (proxy) ──

router.get('/api/v1/admin/judges', async (req, res) => {
    try {
        const streamId = req.query.stream_id;
        if (!streamId) return res.status(400).json({ success: false, message: 'stream_id required' });
        const response = await fetch(`${BACKEND_BASE_URL}/api/v1/admin/judges?stream_id=${streamId}`);
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        res.json(payload);
    } catch (error) {
        console.error('Failed to get judges:', error);
        res.status(500).json({ success: false, message: 'Failed to get judges' });
    }
});

router.post('/api/v1/admin/judges', async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/v1/admin/judges`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        res.json(payload);
    } catch (error) {
        console.error('Failed to save judges:', error);
        res.status(500).json({ success: false, message: 'Failed to save judges' });
    }
});

router.get('/api/v1/judge-vote/status', async (req, res) => {
    try {
        const { stream_id, user_id } = req.query;
        if (!stream_id || !user_id) return res.status(400).json({ success: false, message: 'stream_id and user_id required' });
        const response = await fetch(`${BACKEND_BASE_URL}/api/v1/judge-vote/status?stream_id=${stream_id}&user_id=${user_id}`);
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        res.json(payload);
    } catch (error) {
        console.error('Failed to get judge vote status:', error);
        res.status(500).json({ success: false, message: 'Failed to get judge vote status' });
    }
});

router.post('/api/v1/judge-vote', async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/v1/judge-vote`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        if (payload.success && payload.data?.aggregate) {
            broadcast('votes-updated', {
                streamId: req.body.stream_id || req.body.streamId,
                leftVotes: payload.data.aggregate.leftVotes,
                rightVotes: payload.data.aggregate.rightVotes,
                totalVotes: payload.data.aggregate.totalVotes
            });
        }
        res.json(payload);
    } catch (error) {
        console.error('Failed to submit judge vote:', error);
        res.status(500).json({ success: false, message: 'Failed to submit vote' });
    }
});

router.get('/api/v1/admin/judge-votes', async (req, res) => {
    try {
        const streamId = req.query.stream_id;
        if (!streamId) return res.status(400).json({ success: false, message: 'stream_id required' });
        const response = await fetch(`${BACKEND_BASE_URL}/api/v1/admin/judge-votes?stream_id=${streamId}`);
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        res.json(payload);
    } catch (error) {
        console.error('Failed to get judge votes:', error);
        res.status(500).json({ success: false, message: 'Failed to get judge votes' });
    }
});

router.get('/api/v1/admin/votes/all', async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/v1/admin/votes/all`);
        const payload = await response.json();
        res.json(payload);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get all votes' });
    }
});

router.get('/api/v1/admin/user-vote-stats', async (req, res) => {
    try {
        const streamId = req.query.stream_id;
        if (!streamId) return res.status(400).json({ success: false, message: 'stream_id required' });
        const response = await fetch(`${BACKEND_BASE_URL}/api/v1/admin/user-vote-stats?stream_id=${streamId}`);
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        res.json(payload);
    } catch (error) {
        console.error('Failed to get user vote stats:', error);
        res.status(500).json({ success: false, message: 'Failed to get user vote stats' });
    }
});

router.get('/api/v1/vote-count', async (req, res) => {
    try {
        const streamId = req.query.stream_id;
        if (!streamId) return res.status(400).json({ success: false, message: 'stream_id required' });
        const response = await fetch(`${BACKEND_BASE_URL}/api/v1/vote-count?stream_id=${streamId}`);
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        res.json(payload);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get vote count' });
    }
});

router.get('/api/v1/user-votes', async (req, res) => {
    try {
        const { stream_id, user_id } = req.query;
        if (!stream_id || !user_id) return res.status(400).json({ success: false, message: 'stream_id and user_id required' });
        const response = await fetch(`${BACKEND_BASE_URL}/api/v1/user-votes?stream_id=${stream_id}&user_id=${user_id}`);
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        res.json(payload);
    } catch (error) {
        console.error('Failed to get user votes:', error);
        res.status(500).json({ success: false, message: 'Failed to get user votes' });
    }
});

router.post('/api/v1/user-vote', async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/v1/user-vote`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        if (payload.success && payload.data) {
            const streamId = req.body.request?.streamId || req.body.streamId;
            if (streamId) {
                broadcast('votes-updated', {
                    streamId,
                    leftVotes:  payload.data.leftVotes  || 0,
                    rightVotes: payload.data.rightVotes || 0,
                    totalVotes: (payload.data.leftVotes || 0) + (payload.data.rightVotes || 0)
                });
            }
        }
        res.json(payload);
    } catch (error) {
        console.error('Failed to submit user vote:', error);
        res.status(500).json({ success: false, message: 'Failed to submit vote' });
    }
});

module.exports = router;
