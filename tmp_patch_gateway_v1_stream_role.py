from pathlib import Path

p = Path(r'd:\Desktop\project\live-gateway-main\gateway.js')
s = p.read_text(encoding='utf-8')
old = """app.post('/api/v1/admin/streams', async (req, res) => {
	try {
		const response = await fetch(`${BACKEND_BASE_URL}/api/admin/streams`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: req.body.name || req.body.title,
				title: req.body.title || req.body.name,
				url: req.body.url || req.body.streamUrl,
				streamUrl: req.body.streamUrl || req.body.url,
				type: req.body.type || 'hls',
				enabled: req.body.enabled !== false,
				description: req.body.description,
				coverUrl: req.body.coverUrl,
				debateId: req.body.debateId,
				hostId: req.body.hostId,
				hostName: req.body.hostName
			})
		});
		const payload = await response.json();
		if (!response.ok) {
			return res.status(response.status).json(payload);
		}
		res.json(payload);
	} catch (error) {
		console.error('创建直播流失败:', error);
		res.status(500).json({ success: false, error: '创建直播流失败' });
	}
});"""
new = """app.post('/api/v1/admin/streams', async (req, res) => {
	try {
		const role = String(req.headers['x-user-role'] || req.query.role || req.body.role || '').toLowerCase();
		if (role && role !== 'admin') {
			return res.status(403).json({ success: false, error: '只有管理员可以创建直播间' });
		}
		const response = await fetch(`${BACKEND_BASE_URL}/api/admin/streams`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: req.body.name || req.body.title,
				title: req.body.title || req.body.name,
				url: req.body.url || req.body.streamUrl,
				streamUrl: req.body.streamUrl || req.body.url,
				type: req.body.type || 'hls',
				enabled: req.body.enabled !== false,
				description: req.body.description,
				coverUrl: req.body.coverUrl,
				debateId: req.body.debateId,
				hostId: req.body.hostId,
				hostName: req.body.hostName
			})
		});
		const payload = await response.json();
		if (!response.ok) {
			return res.status(response.status).json(payload);
		}
		res.json(payload);
	} catch (error) {
		console.error('创建直播流失败:', error);
		res.status(500).json({ success: false, error: '创建直播流失败' });
	}
});"""
if old not in s:
    raise SystemExit('target block not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
print('patched-v1-stream-role-guard')
