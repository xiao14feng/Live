// Debate topic + flow config management
// Persists to PostgreSQL so data survives restarts
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { broadcast } = require('./websocket');
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:8000';

// ── PostgreSQL client ──
let pool = null;
try {
    const { Pool } = require('pg');
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
        pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
        // Ensure UTF-8 encoding
        pool.on('connect', client => client.query("SET client_encoding = 'UTF8'"));
        // Create tables if not exist
        pool.query(`CREATE TABLE IF NOT EXISTS gw_debates (
                id TEXT PRIMARY KEY,
                stream_id TEXT UNIQUE,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                left_position TEXT NOT NULL,
                right_position TEXT NOT NULL,
                is_active BOOLEAN DEFAULT true,
                flow_segments JSONB DEFAULT '[]',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `).catch(e => console.error('Failed to create gw_debates table:', e));
        console.log('Debates: PostgreSQL persistence enabled');
    }
} catch (e) {
    console.warn('Debates: pg not available, using in-memory only');
}

// In-memory fallback
const memDebates = {};      // id -> debate
const memStreamMap = {};    // streamId -> id

async function dbGet(streamId) {
    if (!pool) return memStreamMap[streamId] ? memDebates[memStreamMap[streamId]] : null;
    try {
        const r = await pool.query('SELECT * FROM gw_debates WHERE stream_id = $1', [streamId]);
        if (!r.rows[0]) return null;
        const row = r.rows[0];
        return {
            id: row.id, streamId: row.stream_id, title: row.title,
            description: row.description, leftPosition: row.left_position,
            rightPosition: row.right_position, isActive: row.is_active,
            flowSegments: row.flow_segments || [],
            createdAt: row.created_at, updatedAt: row.updated_at
        };
    } catch (e) { console.error('dbGet error:', e.message); return null; }
}

async function dbGetById(id) {
    if (!pool) return memDebates[id] || null;
    try {
        const r = await pool.query('SELECT * FROM gw_debates WHERE id = $1', [id]);
        if (!r.rows[0]) return null;
        const row = r.rows[0];
        return {
            id: row.id, streamId: row.stream_id, title: row.title,
            description: row.description, leftPosition: row.left_position,
            rightPosition: row.right_position, isActive: row.is_active,
            flowSegments: row.flow_segments || [],
            createdAt: row.created_at, updatedAt: row.updated_at
        };
    } catch (e) { return null; }
}

async function dbSave(debate) {
    if (!pool) {
        memDebates[debate.id] = debate;
        if (debate.streamId) memStreamMap[debate.streamId] = debate.id;
        return;
    }
    try {
        await pool.query(`
            INSERT INTO gw_debates (id, stream_id, title, description, left_position, right_position, is_active, flow_segments, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
            ON CONFLICT (id) DO UPDATE SET
                title=$3, description=$4, left_position=$5, right_position=$6,
                is_active=$7, flow_segments=$8, updated_at=NOW()
        `, [debate.id, debate.streamId || null, debate.title, debate.description,
            debate.leftPosition, debate.rightPosition, debate.isActive,
            JSON.stringify(debate.flowSegments || [])]);
    } catch (e) { console.error('dbSave error:', e.message); }
}

async function dbUpdateFlow(streamId, segments) {
    if (!pool) {
        const id = memStreamMap[streamId];
        if (id && memDebates[id]) memDebates[id].flowSegments = segments;
        return;
    }
    try {
        await pool.query('UPDATE gw_debates SET flow_segments=$1, updated_at=NOW() WHERE stream_id=$2',
            [JSON.stringify(segments), streamId]);
    } catch (e) { console.error('dbUpdateFlow error:', e.message); }
}

// ── Routes ──

// GET /api/v1/admin/debates/:id
router.get('/api/v1/admin/debates/:id', async (req, res) => {
    const debate = await dbGetById(req.params.id);
    if (!debate) return res.status(404).json({ success: false, message: 'Debate not found' });
    res.json({ success: true, data: debate });
});

// POST /api/v1/admin/debates
router.post('/api/v1/admin/debates', async (req, res) => {
    const { title, description, leftPosition, rightPosition, isActive } = req.body;
    if (!title || !leftPosition || !rightPosition)
        return res.status(400).json({ success: false, message: 'title, leftPosition, rightPosition required' });
    const debate = {
        id: uuidv4(), streamId: null,
        title: title.trim(), description: (description || '').trim(),
        leftPosition: leftPosition.trim(), rightPosition: rightPosition.trim(),
        isActive: isActive !== false, flowSegments: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    await dbSave(debate);
    res.json({ success: true, data: debate });
});

// PUT /api/v1/admin/debates/:id
router.put('/api/v1/admin/debates/:id', async (req, res) => {
    const debate = await dbGetById(req.params.id);
    if (!debate) return res.status(404).json({ success: false, message: 'Debate not found' });
    const { title, description, leftPosition, rightPosition, isActive } = req.body;
    if (title)         debate.title         = title.trim();
    if (description !== undefined) debate.description = description.trim();
    if (leftPosition)  debate.leftPosition  = leftPosition.trim();
    if (rightPosition) debate.rightPosition = rightPosition.trim();
    if (isActive !== undefined) debate.isActive = isActive;
    debate.updatedAt = new Date().toISOString();
    await dbSave(debate);
    broadcast('debate-updated', { debate });
    res.json({ success: true, data: debate });
});

// PUT /api/v1/admin/streams/:streamId/debate — associate debate to stream
router.put('/api/v1/admin/streams/:streamId/debate', async (req, res) => {
    try {
        const { streamId } = req.params;
        const { debate_id } = req.body;
        if (!debate_id) return res.status(400).json({ success: false, message: 'debate_id required' });
        const debate = await dbGetById(debate_id);
        if (!debate) return res.status(404).json({ success: false, message: 'Debate not found' });

        debate.streamId = streamId;
        await dbSave(debate);

        // Update backend stream's debateId
        try {
            await fetch(`${BACKEND_BASE_URL}/api/admin/streams/${streamId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ debateId: debate_id })
            });
        } catch (e) { /* non-critical */ }

        res.json({ success: true, data: { streamId, debateId: debate_id, debate } });
    } catch (error) {
        console.error('Failed to associate debate:', error);
        res.status(500).json({ success: false, message: 'Failed to associate debate: ' + error.message });
    }
});

// DELETE /api/v1/admin/streams/:streamId/debate
router.delete('/api/v1/admin/streams/:streamId/debate', async (req, res) => {
    try {
        const { streamId } = req.params;
        if (pool) {
            await pool.query('UPDATE gw_debates SET stream_id=NULL WHERE stream_id=$1', [streamId]);
        } else {
            const id = memStreamMap[streamId];
            if (id && memDebates[id]) memDebates[id].streamId = null;
            delete memStreamMap[streamId];
        }
        res.json({ success: true, message: 'Debate removed from stream' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to remove debate: ' + error.message });
    }
});

// GET /api/v1/admin/streams/:streamId/debate
router.get('/api/v1/admin/streams/:streamId/debate', async (req, res) => {
    const debate = await dbGet(req.params.streamId);
    if (!debate) return res.json({ success: true, data: null, hasDebate: false });
    res.json({ success: true, data: debate, hasDebate: true });
});

// GET /api/admin/debate-flow?stream_id=xxx  (override stats.js route)
router.get('/api/admin/debate-flow', async (req, res) => {
    const { stream_id } = req.query;
    if (!stream_id) return res.status(400).json({ success: false, message: 'stream_id required' });
    const debate = await dbGet(stream_id);
    const segments = debate?.flowSegments?.length ? debate.flowSegments : [
        { name: '正方发言', duration: 180, side: 'left' },
        { name: '反方质问', duration: 120, side: 'right' },
        { name: '反方发言', duration: 180, side: 'right' },
        { name: '正方质问', duration: 120, side: 'left' },
        { name: '自由辩论', duration: 300, side: 'both' },
        { name: '正方总结', duration: 120, side: 'left' },
        { name: '反方总结', duration: 120, side: 'right' }
    ];
    res.json({ success: true, data: { streamId: stream_id, segments, status: 'idle', currentSegment: 0 } });
});

// POST /api/admin/debate-flow  (override stats.js route)
router.post('/api/admin/debate-flow', async (req, res) => {
    const { stream_id, segments } = req.body;
    if (!stream_id) return res.status(400).json({ success: false, message: 'stream_id required' });
    await dbUpdateFlow(stream_id, segments || []);
    broadcast('debate-flow-updated', { streamId: stream_id, segments });
    res.json({ success: true, message: 'Debate flow saved', data: { streamId: stream_id, segments } });
});

module.exports = { router };
