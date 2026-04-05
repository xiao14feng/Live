// Debate topic management routes
// Stores debates in memory, keyed by streamId
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { broadcast } = require('./websocket');
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:8000';

// In-memory debate store: { [debateId]: debateObj }
const debates = {};
// streamId -> debateId mapping
const streamDebateMap = {};

function getDebateByStream(streamId) {
    const debateId = streamDebateMap[streamId];
    return debateId ? debates[debateId] : null;
}

// GET /api/v1/admin/debates/:id
router.get('/api/v1/admin/debates/:id', (req, res) => {
    const debate = debates[req.params.id];
    if (!debate) return res.status(404).json({ success: false, message: 'Debate not found' });
    res.json({ success: true, data: debate });
});

// POST /api/v1/admin/debates — create debate
router.post('/api/v1/admin/debates', (req, res) => {
    const { title, description, leftPosition, rightPosition, isActive } = req.body;
    if (!title || !leftPosition || !rightPosition) {
        return res.status(400).json({ success: false, message: 'title, leftPosition, rightPosition required' });
    }
    const debate = {
        id: uuidv4(),
        title: title.trim(),
        description: (description || '').trim(),
        leftPosition: leftPosition.trim(),
        rightPosition: rightPosition.trim(),
        isActive: isActive !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    debates[debate.id] = debate;
    res.json({ success: true, data: debate });
});

// PUT /api/v1/admin/debates/:id — update debate
router.put('/api/v1/admin/debates/:id', (req, res) => {
    const debate = debates[req.params.id];
    if (!debate) return res.status(404).json({ success: false, message: 'Debate not found' });
    const { title, description, leftPosition, rightPosition, isActive } = req.body;
    if (title)         debate.title         = title.trim();
    if (description !== undefined) debate.description = description.trim();
    if (leftPosition)  debate.leftPosition  = leftPosition.trim();
    if (rightPosition) debate.rightPosition = rightPosition.trim();
    if (isActive !== undefined) debate.isActive = isActive;
    debate.updatedAt = new Date().toISOString();
    broadcast('debate-updated', { debate });
    res.json({ success: true, data: debate });
});

// PUT /api/v1/admin/streams/:streamId/debate — associate debate to stream
router.put('/api/v1/admin/streams/:streamId/debate', async (req, res) => {
    try {
        const { streamId } = req.params;
        const { debate_id } = req.body;
        if (!debate_id) return res.status(400).json({ success: false, message: 'debate_id required' });
        if (!debates[debate_id]) return res.status(404).json({ success: false, message: 'Debate not found' });

        // Update backend stream's debateId
        const response = await fetch(`${BACKEND_BASE_URL}/api/admin/streams/${streamId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ debateId: debate_id })
        });
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);

        streamDebateMap[streamId] = debate_id;
        res.json({ success: true, data: { streamId, debateId: debate_id, debate: debates[debate_id] } });
    } catch (error) {
        console.error('Failed to associate debate:', error);
        res.status(500).json({ success: false, message: 'Failed to associate debate: ' + error.message });
    }
});

// DELETE /api/v1/admin/streams/:streamId/debate — remove debate from stream
router.delete('/api/v1/admin/streams/:streamId/debate', async (req, res) => {
    try {
        const { streamId } = req.params;
        delete streamDebateMap[streamId];
        const response = await fetch(`${BACKEND_BASE_URL}/api/admin/streams/${streamId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ debateId: null })
        });
        const payload = await response.json();
        if (!response.ok) return res.status(response.status).json(payload);
        res.json({ success: true, message: 'Debate removed from stream' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to remove debate: ' + error.message });
    }
});

// GET /api/v1/admin/streams/:streamId/debate — get debate for stream
router.get('/api/v1/admin/streams/:streamId/debate', (req, res) => {
    const debate = getDebateByStream(req.params.streamId);
    if (!debate) return res.json({ success: true, data: null, hasDebate: false });
    res.json({ success: true, data: debate, hasDebate: true });
});

module.exports = { router, getDebateByStream };
