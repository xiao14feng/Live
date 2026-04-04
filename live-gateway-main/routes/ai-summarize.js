// AI summarize route — calls gpt-4o to analyze debate text
const express = require('express');
const router = express.Router();
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const state = require('./state');
const { broadcast } = require('./websocket');

const API_KEY = process.env.OPENAI_API_KEY || 'sk-BH58SeqaUzp3f6BAXlLOz8uRxVbhZqiVXvaNfiUXyZI7hZbh';
const API_HOST = 'jeniya.top';
const MODEL = 'gpt-4o';

function callAI(messages) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({ model: MODEL, messages, max_tokens: 1500, temperature: 0.7 });
        const req = https.request({
            hostname: API_HOST,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) return reject(new Error(json.error.message));
                    resolve(json.choices[0].message.content);
                } catch (e) {
                    reject(new Error('Failed to parse AI response'));
                }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// POST /api/admin/ai/summarize
// Body: { text: "辩论内容...", debateId?: string }
router.post('/api/admin/ai/summarize', async (req, res) => {
    const { text, debateId } = req.body;
    if (!text || !text.trim()) {
        return res.status(400).json({ success: false, message: 'text is required' });
    }

    try {
        const prompt = `你是一个辩论内容分析助手。请分析以下辩论内容，提取出正方和反方的核心观点，每方提取2-4条，每条观点简洁有力（30字以内）。

辩论内容：
${text}

请严格按照以下JSON格式返回，不要有其他文字：
{
  "left": ["正方观点1", "正方观点2", "正方观点3"],
  "right": ["反方观点1", "反方观点2", "反方观点3"]
}`;

        const aiResponse = await callAI([{ role: 'user', content: prompt }]);

        // Parse JSON from AI response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('AI did not return valid JSON');
        const parsed = JSON.parse(jsonMatch[0]);

        const leftPoints = Array.isArray(parsed.left) ? parsed.left : [];
        const rightPoints = Array.isArray(parsed.right) ? parsed.right : [];

        // Add to aiDebateContent and broadcast
        const newItems = [];
        const did = debateId || state.debateTopic.id;

        [...leftPoints.map(t => ({ t, side: 'left' })), ...rightPoints.map(t => ({ t, side: 'right' }))].forEach(({ t, side }) => {
            const item = {
                id: uuidv4(),
                debate_id: did,
                text: t,
                side,
                timestamp: Date.now(),
                comments: [],
                likes: 0,
                confidence: 0.92
            };
            state.aiDebateContent.push(item);
            newItems.push(item);
        });

        // Broadcast each new item
        newItems.forEach(item => broadcast('newAIContent', item));

        res.json({
            success: true,
            message: `AI analyzed: ${leftPoints.length} left points, ${rightPoints.length} right points`,
            data: { left: leftPoints, right: rightPoints, items: newItems }
        });

    } catch (error) {
        console.error('AI summarize error:', error.message);
        res.status(500).json({ success: false, message: 'AI analysis failed: ' + error.message });
    }
});

module.exports = router;
