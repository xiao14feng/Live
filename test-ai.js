const https = require('https');

const payload = JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Say "ok" in one word.' }],
    max_tokens: 10
});

const options = {
    hostname: 'jeniya.top',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-BH58SeqaUzp3f6BAXlLOz8uRxVbhZqiVXvaNfiUXyZI7hZbh',
        'Content-Length': Buffer.byteLength(payload)
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            const json = JSON.parse(data);
            console.log('Response:', json.choices?.[0]?.message?.content || JSON.stringify(json));
        } catch (e) {
            console.log('Raw:', data.substring(0, 200));
        }
    });
});
req.on('error', e => console.log('Error:', e.message));
req.write(payload);
req.end();
