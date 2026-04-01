from pathlib import Path

p = Path(r'd:\Desktop\project\live-gateway-main\gateway.js')
s = p.read_text(encoding='utf-8')
start = s.index("// 管理API - 直播流管理（本地兼容实现）")
end = s.index("// 管理API - 辩论设置")
replacement = """// 管理API - 直播流管理（代理 Python 后端）
app.get('/api/admin/streams', async (req, res) => {
	try {
		const searchParams = new URLSearchParams();
		if (req.query.status) searchParams.set('status', req.query.status);
		if (req.query.skip) searchParams.set('skip', req.query.skip);
		if (req.query.limit) searchParams.set('limit', req.query.limit);
		const queryString = searchParams.toString();
		const response = await fetch(`${BACKEND_BASE_URL}/api/admin/streams${queryString ? `?${queryString}` : ''}`);
		const payload = await response.json();
		if (!response.ok) {
			return res.status(response.status).json(payload);
		}
		res.json(payload);
	} catch (error) {
		console.error('获取直播流列表失败:', error);
		res.status(500).json({ success: false, error: '获取直播流列表失败' });
	}
});

app.get('/api/v1/admin/streams', async (req, res) => {
	try {
		const searchParams = new URLSearchParams();
		if (req.query.status) searchParams.set('status', req.query.status);
		if (req.query.skip) searchParams.set('skip', req.query.skip);
		if (req.query.limit) searchParams.set('limit', req.query.limit);
		const queryString = searchParams.toString();
		const response = await fetch(`${BACKEND_BASE_URL}/api/admin/streams${queryString ? `?${queryString}` : ''}`);
		const payload = await response.json();
		if (!response.ok) {
			return res.status(response.status).json(payload);
		}
		res.json(payload);
	} catch (error) {
		console.error('获取直播流列表失败:', error);
		res.status(500).json({ success: false, error: '获取直播流列表失败' });
	}
});

app.post('/api/admin/streams', async (req, res) => {
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
});

app.post('/api/v1/admin/streams', async (req, res) => {
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
});

app.put('/api/admin/streams/:id', async (req, res) => {
	try {
		const response = await fetch(`${BACKEND_BASE_URL}/api/admin/streams/${req.params.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: req.body.name || req.body.title,
				title: req.body.title || req.body.name,
				url: req.body.url || req.body.streamUrl,
				streamUrl: req.body.streamUrl || req.body.url,
				type: req.body.type,
				enabled: req.body.enabled,
				description: req.body.description,
				coverUrl: req.body.coverUrl,
				debateId: req.body.debateId,
				hostName: req.body.hostName
			})
		});
		const payload = await response.json();
		if (!response.ok) {
			return res.status(response.status).json(payload);
		}
		res.json(payload);
	} catch (error) {
		console.error('更新直播流失败:', error);
		res.status(500).json({ success: false, error: '更新直播流失败' });
	}
});

app.delete('/api/admin/streams/:id', async (req, res) => {
	try {
		const response = await fetch(`${BACKEND_BASE_URL}/api/admin/streams/${req.params.id}`, {
			method: 'DELETE'
		});
		const payload = await response.json();
		if (!response.ok) {
			return res.status(response.status).json(payload);
		}
		res.json(payload);
	} catch (error) {
		console.error('删除直播流失败:', error);
		res.status(500).json({ success: false, error: '删除直播流失败' });
	}
});

app.post('/api/admin/streams/:id/toggle', async (req, res) => {
	try {
		const getResponse = await fetch(`${BACKEND_BASE_URL}/api/admin/streams?skip=0&limit=1000`);
		const getPayload = await getResponse.json();
		if (!getResponse.ok) {
			return res.status(getResponse.status).json(getPayload);
		}
		const streams = getPayload?.data?.streams || [];
		const current = streams.find((item) => item.id === req.params.id);
		if (!current) {
			return res.status(404).json({ success: false, error: '直播流不存在' });
		}
		const response = await fetch(`${BACKEND_BASE_URL}/api/admin/streams/${req.params.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: current.name || current.title,
				title: current.title || current.name,
				url: current.url || current.streamUrl,
				streamUrl: current.streamUrl || current.url,
				type: current.type,
				enabled: !current.enabled,
				description: current.description,
				coverUrl: current.coverUrl,
				debateId: current.debateId,
				hostName: current.hostName
			})
		});
		const payload = await response.json();
		if (!response.ok) {
			return res.status(response.status).json(payload);
		}
		res.json(payload);
	} catch (error) {
		console.error('切换直播流状态失败:', error);
		res.status(500).json({ success: false, error: '切换直播流状态失败' });
	}
});

"""
s = s[:start] + replacement + s[end:]
p.write_text(s, encoding='utf-8')
print('patched-gateway-stream-proxy')
