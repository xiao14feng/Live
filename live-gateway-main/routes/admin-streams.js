// Admin routes: stream management, live control, live schedule
const express = require('express');
const router = express.Router();
const state = require('./state');
const { broadcast } = require('./websocket');
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:8000';

// ── Stream CRUD (proxy to Python backend) ──

router.get('/api/admin/streams', async (req, res) => {
    try {
        const searchParams = new URLSearchParams();
        if (req.query.status) searchParams.set('status', req.query.status);
        if (req.query.skip)   searchParams.set('skip',   req.query.skip);
        if (req.query.limit)  searchParams.set('limit',  req.query.limit);
        const qs = searchParams.toString();
        const response = await fetch(`${BACKEND_BASE_URL}/api/admin/streams${qs ? `?${qs}` : ''}`);
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        res.json(payload);
    } catch (error) {
        console.error('Failed to get streams:', error);
        res.status(500).json({ success: false, error: 'Failed to get streams' });
    }
});

router.get('/api/v1/admin/streams', async (req, res) => {
    try {
        const searchParams = new URLSearchParams();
        if (req.query.status) searchParams.set('status', req.query.status);
        if (req.query.skip)   searchParams.set('skip',   req.query.skip);
        if (req.query.limit)  searchParams.set('limit',  req.query.limit);
        const qs = searchParams.toString();
        const response = await fetch(`${BACKEND_BASE_URL}/api/admin/streams${qs ? `?${qs}` : ''}`);
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        res.json(payload);
    } catch (error) {
        console.error('Failed to get streams:', error);
        res.status(500).json({ success: false, error: 'Failed to get streams' });
    }
});

function streamBody(body) {
    return {
        name: body.name || body.title,
        title: body.title || body.name,
        url: body.url || body.streamUrl,
        streamUrl: body.streamUrl || body.url,
        type: body.type || 'hls',
        enabled: body.enabled !== false,
        description: body.description,
        coverUrl: body.coverUrl,
        debateId: body.debateId,
        hostId: body.hostId,
        hostName: body.hostName
    };
}

router.post('/api/admin/streams', async (req, res) => {
    try {
        const role = String(req.headers['x-user-role'] || req.query.role || req.body.role || '').toLowerCase();
        if (role && role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
        const response = await fetch(`${BACKEND_BASE_URL}/api/admin/streams`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(streamBody(req.body))
        });
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        res.json(payload);
    } catch (error) {
        console.error('Failed to create stream:', error);
        res.status(500).json({ success: false, error: 'Failed to create stream' });
    }
});

router.post('/api/v1/admin/streams', async (req, res) => {
    try {
        const role = String(req.headers['x-user-role'] || req.query.role || req.body.role || '').toLowerCase();
        if (role && role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
        const response = await fetch(`${BACKEND_BASE_URL}/api/admin/streams`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(streamBody(req.body))
        });
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        res.json(payload);
    } catch (error) {
        console.error('Failed to create stream:', error);
        res.status(500).json({ success: false, error: 'Failed to create stream' });
    }
});

router.put('/api/admin/streams/:id', async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/admin/streams/${req.params.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(streamBody(req.body))
        });
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        res.json(payload);
    } catch (error) {
        console.error('Failed to update stream:', error);
        res.status(500).json({ success: false, error: 'Failed to update stream' });
    }
});

router.delete('/api/admin/streams/:id', async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/admin/streams/${req.params.id}`, { method: 'DELETE' });
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        res.json(payload);
    } catch (error) {
        console.error('Failed to delete stream:', error);
        res.status(500).json({ success: false, error: 'Failed to delete stream' });
    }
});

router.post('/api/admin/streams/:id/toggle', async (req, res) => {
    try {
        const getResponse = await fetch(`${BACKEND_BASE_URL}/api/admin/streams?skip=0&limit=1000`);
        const getPayload = await getResponse.json();
        if (!getResponse.ok) return res.status(getResponse.status).json(getPayload);
        const streams = getPayload?.data?.streams || [];
        const current = streams.find(s => s.id === req.params.id);
        if (!current) return res.status(404).json({ success: false, error: 'Stream not found' });
        const response = await fetch(`${BACKEND_BASE_URL}/api/admin/streams/${req.params.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...streamBody(current), enabled: !current.enabled })
        });
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        res.json(payload);
    } catch (error) {
        console.error('Failed to toggle stream:', error);
        res.status(500).json({ success: false, error: 'Failed to toggle stream' });
    }
});

// ── Debate settings ──

router.get('/api/admin/debate', (req, res) => {
    res.json(state.debateTopic);
});

router.put('/api/admin/debate', (req, res) => {
    try {
        const debate = req.body;
        state.debateTopic.title = debate.title;
        state.debateTopic.description = debate.description;
        broadcast('debate-updated', { debate, timestamp: Date.now() });
        res.json(debate);
    } catch (error) {
        console.error('Failed to update debate:', error);
        res.status(500).json({ error: 'Update failed' });
    }
});

// ── User management (proxy) ──

router.get('/api/admin/users', async (req, res) => {
    try {
        const searchParams = new URLSearchParams();
        if (req.query.status) searchParams.set('status', req.query.status);
        if (req.query.skip)   searchParams.set('skip',   req.query.skip);
        if (req.query.limit)  searchParams.set('limit',  req.query.limit);
        const qs = searchParams.toString();
        const response = await fetch(`${BACKEND_BASE_URL}/api/admin/users${qs ? `?${qs}` : ''}`);
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        const data = payload?.data;
        const userList = Array.isArray(data) ? data : data?.users;
        const users = Array.isArray(userList) ? userList.map(u => ({
            id: u.id, nickName: u.nickname, avatarUrl: u.avatar_url,
            createdAt: u.created_at, updatedAt: u.updated_at,
            totalVotes: u.total_votes, joinedDebates: u.joined_debates,
            status: u.status, openid: u.openid, lastLoginAt: u.last_login_at,
            role: u.role || (String(u.openid||'').startsWith('admin_') ? 'admin' : String(u.openid||'').startsWith('judge_') ? 'judge' : 'user')
        })) : [];
        res.json(users);
    } catch (error) {
        console.error('Failed to get users:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

router.get('/api/admin/users/:id', async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/admin/users/${req.params.id}`);
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        const u = payload?.data;
        if (!u) return res.status(404).json({ error: 'User not found' });
        res.json({
            id: u.id, nickName: u.nickname, avatarUrl: u.avatar_url,
            createdAt: u.created_at, updatedAt: u.updated_at,
            totalVotes: u.total_votes, joinedDebates: u.joined_debates,
            status: u.status, openid: u.openid, lastLoginAt: u.last_login_at,
            role: u.role || (String(u.openid||'').startsWith('admin_') ? 'admin' : String(u.openid||'').startsWith('judge_') ? 'judge' : 'user')
        });
    } catch (error) {
        console.error('Failed to get user:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

router.post('/api/admin/users', async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/admin/users`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        res.json(payload);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add user' });
    }
});

router.put('/api/admin/users/:id', async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/admin/users/${req.params.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: req.body.nickname })
        });
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        res.json({ success: true, message: 'Nickname updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Update failed' });
    }
});

router.delete('/api/admin/users/:id', async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/admin/users/${req.params.id}`, { method: 'DELETE' });
        if (response.ok || response.status === 204) return res.json({ success: true, message: 'User deleted' });
        const payload = await response.json();
        res.status(response.status).json(payload);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Delete failed' });
    }
});

// ── Live control helpers ──

let liveScheduleTimer = null;

function stopLive() {
    const s = state.globalLiveStatus;
    s.isLive = false;
    s.streamUrl = null;
    s.streamId = null;
    s.isScheduled = false;
    s.scheduledStartTime = null;
    s.scheduledEndTime = null;
    state.liveSchedule = { streamId: null, scheduledStartTime: null, scheduledEndTime: null };
    broadcast('live-status-changed', { status: 'stopped', timestamp: Date.now() });
    console.log('Live stopped');
}

function startScheduleCheck() {
    if (liveScheduleTimer) clearInterval(liveScheduleTimer);
    liveScheduleTimer = setInterval(() => {
        const schedule = state.liveSchedule;
        const now = Date.now();
        if (schedule.isScheduled && schedule.scheduledStartTime) {
            const startTime = new Date(schedule.scheduledStartTime).getTime();
            if (now >= startTime && !state.globalLiveStatus.isLive) {
                console.log('Scheduled live starting');
                // start with stored streamId if available
                const s = state.globalLiveStatus;
                s.isLive = true;
                s.streamId = schedule.streamId;
                broadcast('live-status-changed', { status: 'started', timestamp: Date.now(), scheduled: true });
            }
            if (schedule.scheduledEndTime && state.globalLiveStatus.isLive) {
                if (now >= new Date(schedule.scheduledEndTime).getTime()) {
                    console.log('Scheduled live ending');
                    stopLive();
                }
            }
        }
    }, 60000);
}

// ── Live control routes ──

router.post('/api/admin/live/control', (req, res) => {
    try {
        const { action, streamUrl } = req.body;
        const s = state.globalLiveStatus;
        if (action === 'start') {
            s.streamUrl = streamUrl || s.streamUrl;
            s.isLive = true;
            broadcast('live-status-changed', { status: 'started', streamUrl: s.streamUrl, timestamp: Date.now() });
            res.json({ success: true, status: 'started', streamUrl: s.streamUrl });
        } else if (action === 'stop') {
            stopLive();
            res.json({ success: true, status: 'stopped' });
        } else {
            res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Failed to control live:', error);
        res.status(500).json({ error: 'Operation failed' });
    }
});

router.post('/api/live/control', (req, res) => {
    try {
        const { action, streamId } = req.body;
        const s = state.globalLiveStatus;
        if (action === 'start') {
            s.isLive = true;
            s.streamId = streamId || s.streamId;
            s.isScheduled = false;
            s.scheduledStartTime = null;
            s.scheduledEndTime = null;
            state.liveSchedule = { streamId: null, scheduledStartTime: null, scheduledEndTime: null };
            broadcast('live-status-changed', { status: 'started', streamUrl: s.streamUrl, timestamp: Date.now(), startedBy: 'user' });
            res.json({ success: true, message: 'Live started', data: { status: 'started', streamUrl: s.streamUrl, streamId: s.streamId } });
        } else if (action === 'stop') {
            stopLive();
            res.json({ success: true, message: 'Live stopped', data: { status: 'stopped' } });
        } else {
            res.status(400).json({ success: false, message: 'Invalid action' });
        }
    } catch (error) {
        console.error('Failed to control live:', error);
        res.status(500).json({ success: false, message: 'Operation failed: ' + error.message });
    }
});

router.post('/api/admin/live/schedule', (req, res) => {
    try {
        const { scheduledStartTime, scheduledEndTime, streamId } = req.body;
        if (!scheduledStartTime) return res.status(400).json({ error: 'scheduledStartTime required' });
        if (new Date(scheduledStartTime).getTime() <= Date.now()) return res.status(400).json({ error: 'Start time must be in the future' });
        const schedule = Object.assign(state.liveSchedule, { scheduledStartTime, scheduledEndTime: scheduledEndTime || null, streamId: streamId || null, isScheduled: true });
        const s = state.globalLiveStatus;
        s.scheduledStartTime = scheduledStartTime;
        s.scheduledEndTime = scheduledEndTime || null;
        s.streamId = streamId || null;
        s.isScheduled = true;
        startScheduleCheck();
        broadcast('live-schedule-updated', { schedule, timestamp: Date.now() });
        res.json({ success: true, message: 'Schedule set', data: schedule });
    } catch (error) {
        console.error('Failed to set schedule:', error);
        res.status(500).json({ error: 'Failed to set schedule' });
    }
});

router.get('/api/admin/live/schedule', (req, res) => {
    res.json({ success: true, data: state.liveSchedule });
});

router.post('/api/admin/live/schedule/cancel', (req, res) => {
    try {
        state.liveSchedule = { streamId: null, scheduledStartTime: null, scheduledEndTime: null };
        const s = state.globalLiveStatus;
        s.isScheduled = false;
        s.scheduledStartTime = null;
        s.scheduledEndTime = null;
        broadcast('live-schedule-cancelled', { timestamp: Date.now() });
        res.json({ success: true, message: 'Schedule cancelled' });
    } catch (error) {
        res.status(500).json({ error: 'Cancel failed' });
    }
});

router.get('/api/admin/live/status', (req, res) => {
    res.json({ ...state.globalLiveStatus, schedule: state.liveSchedule });
});

router.post('/api/admin/live/setup-and-start', (req, res) => {
    try {
        const { streamId, scheduledStartTime, scheduledEndTime, startNow } = req.body;
        const s = state.globalLiveStatus;
        if (startNow) {
            s.isLive = true;
            s.streamId = streamId || s.streamId;
            s.isScheduled = false;
            s.scheduledStartTime = null;
            s.scheduledEndTime = null;
            state.liveSchedule = { streamId: null, scheduledStartTime: null, scheduledEndTime: null };
            broadcast('live-status-changed', { status: 'started', streamUrl: s.streamUrl, timestamp: Date.now(), startedBy: 'admin' });
            res.json({ success: true, message: 'Live started', data: { isLive: true, streamUrl: s.streamUrl, streamId: s.streamId } });
        } else {
            if (!scheduledStartTime) return res.status(400).json({ error: 'scheduledStartTime required' });
            if (new Date(scheduledStartTime).getTime() <= Date.now()) return res.status(400).json({ error: 'Start time must be in the future' });
            const schedule = Object.assign(state.liveSchedule, { scheduledStartTime, scheduledEndTime: scheduledEndTime || null, streamId: streamId || null, isScheduled: true });
            s.scheduledStartTime = scheduledStartTime;
            s.scheduledEndTime = scheduledEndTime || null;
            s.streamId = streamId || null;
            s.isScheduled = true;
            startScheduleCheck();
            broadcast('live-schedule-updated', { schedule, timestamp: Date.now() });
            res.json({ success: true, message: 'Schedule set', data: schedule });
        }
    } catch (error) {
        console.error('Failed to setup and start live:', error);
        res.status(500).json({ error: 'Operation failed' });
    }
});

module.exports = { router, stopLive, startScheduleCheck };
