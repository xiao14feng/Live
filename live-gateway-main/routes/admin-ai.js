// Admin routes: AI content management
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const state = require('./state');
const { broadcast } = require('./websocket');

// Helper: paginate + filter aiDebateContent
function getFilteredContent(query) {
    const page     = parseInt(query.page)     || 1;
    const pageSize = Math.min(parseInt(query.pageSize) || 20, 100);
    let items = [...state.aiDebateContent];
    if (query.stream_id) items = items.filter(i => !i.streamId || i.streamId === query.stream_id);
    if (query.startTime) items = items.filter(i => new Date(i.timestamp || i.createdAt || 0) >= new Date(query.startTime));
    if (query.endTime)   items = items.filter(i => new Date(i.timestamp || i.createdAt || 0) <= new Date(query.endTime));
    const total = items.length;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return { total, page, pageSize, items: paged };
}

function toISO(ts) {
    if (!ts) return new Date().toISOString();
    return new Date(ts).toISOString();
}

// GET /api/admin/ai-content
router.get('/api/admin/ai-content', (req, res) => {
    res.json({ success: true, data: state.aiDebateContent });
});

// GET /api/v1/admin/ai-content/list  (must be before /:id)
router.get('/api/v1/admin/ai-content/list', (req, res) => {
    try {
        const { total, page, items } = getFilteredContent(req.query);
        const formatted = items.map(item => ({
            id: item.id,
            content: item.content || item.text || '',
            type: 'summary',
            timestamp: toISO(item.timestamp || item.createdAt),
            position: item.position || item.side || 'left',
            confidence: item.confidence || 0.95,
            statistics: {
                views:    item.statistics?.views    || item.views    || 0,
                likes:    item.statistics?.likes    || item.likes    || 0,
                comments: Array.isArray(item.comments) ? item.comments.length : 0
            }
        }));
        res.json({ success: true, data: { total, page, items: formatted } });
    } catch (error) {
        console.error('Failed to get AI content list:', error);
        res.status(500).json({ success: false, message: 'Failed to get AI content list: ' + error.message });
    }
});

// GET /api/admin/ai-content/list  (must be before /:id)
router.get('/api/admin/ai-content/list', (req, res) => {
    try {
        const { total, page, pageSize, items } = getFilteredContent(req.query);
        res.json({ success: true, data: { total, page, pageSize, items }, timestamp: Date.now() });
    } catch (error) {
        console.error('Failed to get AI content list:', error);
        res.status(500).json({ success: false, message: 'Failed to get AI content list: ' + error.message });
    }
});

// GET /api/admin/ai-content/:id
router.get('/api/admin/ai-content/:id', (req, res) => {
    const content = state.aiDebateContent.find(i => i.id === req.params.id);
    if (!content) return res.status(404).json({ error: 'Content not found' });
    res.json({ success: true, data: content });
});

// GET /api/admin/ai-content/:id/comments
router.get('/api/admin/ai-content/:id/comments', (req, res) => {
    try {
        const content = state.aiDebateContent.find(i => i.id === req.params.id);
        if (!content) return res.status(404).json({ success: false, message: 'Content not found' });
        const page     = parseInt(req.query.page)     || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const comments = Array.isArray(content.comments) ? content.comments : [];
        const total    = comments.length;
        const paged    = comments.slice((page - 1) * pageSize, page * pageSize);
        res.json({ success: true, data: { contentId: req.params.id, contentText: content.content || content.text || '', total, page, pageSize, comments: paged }, timestamp: Date.now() });
    } catch (error) {
        console.error('Failed to get comments:', error);
        res.status(500).json({ success: false, message: 'Failed to get comments: ' + error.message });
    }
});

// DELETE /api/admin/ai-content/:id/comments/:commentId
router.delete('/api/admin/ai-content/:id/comments/:commentId', (req, res) => {
    try {
        const { id, commentId } = req.params;
        const { reason = '' } = req.body;
        const content = state.aiDebateContent.find(i => i.id === id);
        if (!content) return res.status(404).json({ success: false, message: 'Content not found' });
        const comments = Array.isArray(content.comments) ? content.comments : [];
        const idx = comments.findIndex(c => (c.commentId || c.id) === commentId);
        if (idx === -1) return res.status(404).json({ success: false, message: 'Comment not found' });
        comments.splice(idx, 1);
        content.comments = comments;
        if (content.statistics) content.statistics.comments = Math.max(0, (content.statistics.comments || 0) - 1);
        console.log(`Deleted comment ${commentId}, reason: ${reason || 'admin'}`);
        res.json({ success: true, data: { contentId: id, commentId, deleted: true }, message: 'Comment deleted', timestamp: Date.now() });
    } catch (error) {
        console.error('Failed to delete comment:', error);
        res.status(500).json({ success: false, message: 'Failed to delete comment: ' + error.message });
    }
});

// GET /api/v1/admin/ai-content/:id/comments
router.get('/api/v1/admin/ai-content/:id/comments', (req, res) => {
    try {
        const content = state.aiDebateContent.find(i => i.id === req.params.id);
        if (!content) return res.status(404).json({ success: false, message: 'Content not found' });
        const page     = parseInt(req.query.page)     || 1;
        const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100);
        const comments = Array.isArray(content.comments) ? [...content.comments] : [];
        comments.sort((a, b) => {
            const tsA = typeof (a.timestamp || a.time) === 'number' ? (a.timestamp || a.time) : new Date(a.timestamp || a.time || 0).getTime();
            const tsB = typeof (b.timestamp || b.time) === 'number' ? (b.timestamp || b.time) : new Date(b.timestamp || b.time || 0).getTime();
            return tsB - tsA;
        });
        const total  = comments.length;
        const paged  = comments.slice((page - 1) * pageSize, page * pageSize);
        const formatted = paged.map(c => ({
            commentId: c.commentId || c.id || '',
            userId:    c.userId || 'anonymous',
            nickname:  c.nickname || c.user || 'Anonymous',
            avatar:    c.avatar || '👤',
            content:   c.content || c.text || '',
            likes:     c.likes || 0,
            timestamp: toISO(c.timestamp || c.time)
        }));
        res.json({ success: true, data: { contentId: req.params.id, contentText: content.content || content.text || '', total, page, pageSize, comments: formatted } });
    } catch (error) {
        console.error('Failed to get comments:', error);
        res.status(500).json({ success: false, message: 'Failed to get comments: ' + error.message });
    }
});

// DELETE /api/v1/admin/ai-content/:id/comments/:commentId
router.delete('/api/v1/admin/ai-content/:id/comments/:commentId', (req, res) => {
    try {
        const { id, commentId } = req.params;
        const { reason = '', notifyUsers = true } = req.body;
        const content = state.aiDebateContent.find(i => i.id === id);
        if (!content) return res.status(404).json({ success: false, message: 'Content not found' });
        const comments = Array.isArray(content.comments) ? content.comments : [];
        const idx = comments.findIndex(c => String(c.commentId || c.id) === String(commentId));
        if (idx === -1) return res.status(404).json({ success: false, message: `Comment ${commentId} not found in content ${id}` });
        comments.splice(idx, 1);
        content.comments = comments;
        if (content.statistics) content.statistics.comments = Math.max(0, (content.statistics.comments || 0) - 1);
        if (notifyUsers) broadcast('comment-deleted', { contentId: id, commentId, timestamp: Date.now() });
        console.log(`Deleted comment ${commentId}, reason: ${reason || 'admin'}`);
        res.json({ success: true, data: { commentId, contentId: id, deleteTime: null }, message: 'Comment deleted' });
    } catch (error) {
        console.error('Failed to delete comment:', error);
        res.status(500).json({ success: false, message: 'Failed to delete comment: ' + error.message });
    }
});

// POST /api/admin/ai-content
router.post('/api/admin/ai-content', (req, res) => {
    try {
        const { text, side, debate_id } = req.body;
        if (!text || !side) return res.status(400).json({ error: 'text and side required' });
        if (side !== 'left' && side !== 'right') return res.status(400).json({ error: 'side must be "left" or "right"' });
        const newContent = { id: uuidv4(), debate_id: debate_id || state.debateTopic.id, text: text.trim(), side, timestamp: Date.now(), comments: [], likes: 0 };
        state.aiDebateContent.push(newContent);
        broadcast('newAIContent', { ...newContent, updatedBy: 'admin' });
        res.json({ success: true, data: newContent });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add AI content' });
    }
});

// PUT /api/admin/ai-content/:id
router.put('/api/admin/ai-content/:id', (req, res) => {
    try {
        const idx = state.aiDebateContent.findIndex(i => i.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Content not found' });
        const { text, side, debate_id } = req.body;
        if (text !== undefined) state.aiDebateContent[idx].text = text.trim();
        if (side !== undefined) {
            if (side !== 'left' && side !== 'right') return res.status(400).json({ error: 'side must be "left" or "right"' });
            state.aiDebateContent[idx].side = side;
        }
        if (debate_id !== undefined) state.aiDebateContent[idx].debate_id = debate_id;
        broadcast('ai-content-updated', { content: state.aiDebateContent[idx], updatedBy: 'admin' });
        res.json({ success: true, data: state.aiDebateContent[idx] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update AI content' });
    }
});

// DELETE /api/admin/ai-content/:id
router.delete('/api/admin/ai-content/:id', (req, res) => {
    try {
        const idx = state.aiDebateContent.findIndex(i => i.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Content not found' });
        const deleted = state.aiDebateContent.splice(idx, 1)[0];
        broadcast('aiContentDeleted', { contentId: req.params.id, updatedBy: 'admin' });
        res.json({ success: true, message: 'Deleted', data: deleted });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete AI content' });
    }
});

module.exports = router;
