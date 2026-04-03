// Public-facing routes: votes, debate-topic, ai-content, comment, like, user-vote
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const state = require('./state');
const { broadcast } = require('./websocket');

// GET /api/votes
router.get('/api/votes', (req, res) => {
    const { leftVotes, rightVotes } = state.currentVotes;
    const total = leftVotes + rightVotes;
    res.json({
        success: true,
        data: {
            leftVotes, rightVotes, totalVotes: total,
            leftPercentage:  total > 0 ? Math.round((leftVotes  / total) * 100) : 50,
            rightPercentage: total > 0 ? Math.round((rightVotes / total) * 100) : 50
        }
    });
});

// GET /api/debate-topic
router.get('/api/debate-topic', (req, res) => {
    res.json({ success: true, data: { id: state.debateTopic.id, title: state.debateTopic.title, description: state.debateTopic.description } });
});

// GET /api/ai-content
router.get('/api/ai-content', (req, res) => {
    res.json({ success: true, data: state.aiDebateContent });
});

// POST /api/comment
router.post('/api/comment', (req, res) => {
    const { contentId, user, text, avatar } = req.body;
    if (!contentId || !text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ success: false, message: 'contentId and text required' });
    }
    const content = state.aiDebateContent.find(i => i.id === String(contentId));
    if (!content) return res.status(404).json({ success: false, message: 'Content not found' });
    const newComment = { id: uuidv4(), user: user || 'Anonymous', text: text.trim(), time: 'just now', avatar: avatar || '👤', likes: 0 };
    content.comments.push(newComment);
    res.json({ success: true, data: newComment });
});

// DELETE /api/comment/:commentId
router.delete('/api/comment/:commentId', (req, res) => {
    const { commentId } = req.params;
    const { contentId } = req.body;
    if (!commentId || !contentId) return res.status(400).json({ success: false, message: 'commentId and contentId required' });
    const content = state.aiDebateContent.find(i => i.id === String(contentId));
    if (!content) return res.status(404).json({ success: false, message: 'Content not found' });
    const idx = content.comments.findIndex(c => c.id === String(commentId));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Comment not found' });
    const deleted = content.comments.splice(idx, 1)[0];
    res.json({ success: true, data: { message: 'Comment deleted', deletedComment: deleted } });
});

// POST /api/like
router.post('/api/like', (req, res) => {
    const { contentId, commentId } = req.body;
    if (!contentId) return res.status(400).json({ success: false, message: 'contentId required' });
    const content = state.aiDebateContent.find(i => i.id === contentId);
    if (!content) return res.status(404).json({ success: false, message: 'Content not found' });
    if (commentId !== undefined && commentId !== null) {
        const comment = content.comments.find(c => c.id === commentId);
        if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
        comment.likes += 1;
        return res.json({ success: true, data: { likes: comment.likes } });
    }
    content.likes += 1;
    res.json({ success: true, data: { likes: content.likes } });
});

// POST /api/user-vote
router.post('/api/user-vote', (req, res) => {
    const { side, votes, leftVotes, rightVotes, userId } = req.body;
    let userLeftVotes = 0, userRightVotes = 0, voteMode = '';

    if (leftVotes !== undefined && rightVotes !== undefined) {
        voteMode = '100-vote allocation';
        userLeftVotes  = parseInt(leftVotes)  || 0;
        userRightVotes = parseInt(rightVotes) || 0;
        const total = userLeftVotes + userRightVotes;
        if (total !== 100) return res.status(400).json({ success: false, message: `Vote total must be 100, got ${total}` });
        if (userLeftVotes < 0 || userRightVotes < 0) return res.status(400).json({ success: false, message: 'Votes must be 0-100' });
        state.currentVotes.leftVotes  += userLeftVotes;
        state.currentVotes.rightVotes += userRightVotes;
    } else if (side) {
        voteMode = 'incremental';
        if (side !== 'left' && side !== 'right') return res.status(400).json({ success: false, message: 'side must be "left" or "right"' });
        const voteCount = parseInt(votes) || 10;
        if (voteCount < 1 || voteCount > 1000) return res.status(400).json({ success: false, message: 'votes must be 1-1000' });
        if (side === 'left') { state.currentVotes.leftVotes  += voteCount; userLeftVotes  = voteCount; }
        else                 { state.currentVotes.rightVotes += voteCount; userRightVotes = voteCount; }
    } else {
        return res.status(400).json({ success: false, message: 'Provide { leftVotes, rightVotes } or { side, votes }' });
    }

    const total = state.currentVotes.leftVotes + state.currentVotes.rightVotes;
    const leftPct  = total > 0 ? Math.round((state.currentVotes.leftVotes  / total) * 100) : 50;
    const rightPct = total > 0 ? Math.round((state.currentVotes.rightVotes / total) * 100) : 50;

    broadcast('votes-updated', {
        leftVotes: state.currentVotes.leftVotes, rightVotes: state.currentVotes.rightVotes,
        leftPercentage: leftPct, rightPercentage: rightPct, totalVotes: total,
        userVote: { userId: userId || 'anonymous', leftVotes: userLeftVotes, rightVotes: userRightVotes, mode: voteMode },
        timestamp: new Date().toISOString()
    });

    res.json({
        success: true,
        data: { leftVotes: state.currentVotes.leftVotes, rightVotes: state.currentVotes.rightVotes, totalVotes: total, leftPercentage: leftPct, rightPercentage: rightPct },
        message: `Vote recorded (${voteMode})`
    });
});

module.exports = router;
