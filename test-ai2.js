const https = require('https');

const payload = JSON.stringify({
    model: 'gpt-4o',
    messages: [{
        role: 'user',
        content: `分析以下辩论内容，提取正反方观点，返回JSON格式：{"left":["观点1"],"right":["观点1"]}
辩论内容：正方认为消除痛苦让人更幸福，反方认为痛苦是成长的必要经历。`
    }],
    max_tokens: 300
});

const req = https.request({
    hostname: 'jeniya.top',
    path: '/v1/chat/completions',
    method: 'POST',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-BH58SeqaUzp3f6BAXlLOz8uRxVbhZqiVXvaNfiUXyZI7hZbh',
        'Content-Length': Buffer.byteLength(payload)
    }
}, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            const j = JSON.parse(data);
            console.log('AI reply:', j.choices?.[0]?.message?.content || JSON.stringify(j.error));
        } catch(e) { console.log('Raw:', data.substring(0, 300)); }
        process.exit(0);
    });
});
req.on('timeout', () => { console.log('Timeout'); req.destroy(); process.exit(1); });
req.on('error', e => { console.log('Error:', e.message); process.exit(1); });
req.write(payload);
req.end();
