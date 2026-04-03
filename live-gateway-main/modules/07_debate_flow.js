// ── module: 07_debate_flow  |  original lines 2114–2210 of gateway.js ──
// ==================== 辩论流程配置 ====================
const DEBATE_FLOW_FILE = path.join(__dirname, 'data', 'debate-flow.json');

// 从文件加载配�?
function loadDebateFlowFromFile() {
	try {
		if (require('fs').existsSync(DEBATE_FLOW_FILE)) {
			return JSON.parse(require('fs').readFileSync(DEBATE_FLOW_FILE, 'utf8'));
		}
	} catch (e) {}
	return {};
}

// 保存配置到文�?
function saveDebateFlowToFile(configs) {
	try {
		const dir = path.dirname(DEBATE_FLOW_FILE);
		if (!require('fs').existsSync(dir)) require('fs').mkdirSync(dir, { recursive: true });
		require('fs').writeFileSync(DEBATE_FLOW_FILE, JSON.stringify(configs, null, 2));
	} catch (e) {
		console.error('保存辩论流程配置失败:', e);
	}
}

const debateFlowConfigs = loadDebateFlowFromFile();

app.get('/api/admin/debate-flow', (req, res) => {
	const streamId = req.query.stream_id;
	if (!streamId) return res.status(400).json({ success: false, message: '缺少 stream_id 参数' });
	const config = debateFlowConfigs[streamId] || {
		streamId, currentSegment: 0, status: 'idle',
		segments: [
			{ name: '正方发言', duration: 180, side: 'left' },
			{ name: '反方质问', duration: 120, side: 'right' },
			{ name: '反方发言', duration: 180, side: 'right' },
			{ name: '正方质问', duration: 120, side: 'left' },
			{ name: '自由辩论', duration: 300, side: 'both' },
			{ name: '正方总结', duration: 120, side: 'left' },
			{ name: '反方总结', duration: 120, side: 'right' }
		]
	};
	res.json({ success: true, data: config });
});

app.post('/api/admin/debate-flow', (req, res) => {
	const { stream_id, segments } = req.body;
	if (!stream_id) return res.status(400).json({ success: false, message: '缺少 stream_id 参数' });
	debateFlowConfigs[stream_id] = { ...(debateFlowConfigs[stream_id] || {}), streamId: stream_id, segments: segments || [], updatedAt: new Date().toISOString() };
	saveDebateFlowToFile(debateFlowConfigs);
	broadcast('debate-flow-updated', { streamId: stream_id, segments });
	res.json({ success: true, message: '辩论流程配置已保�?, data: debateFlowConfigs[stream_id] });
});

app.post('/api/admin/debate-flow/control', (req, res) => {
	const { stream_id, action } = req.body;
	if (!stream_id || !action) return res.status(400).json({ success: false, message: '缺少参数' });
	const config = debateFlowConfigs[stream_id] || { currentSegment: 0, status: 'idle', segments: [] };
	const total = config.segments?.length || 0;
	switch (action) {
		case 'start': config.status = 'running'; config.currentSegment = 0; config.startTime = new Date().toISOString(); break;
		case 'pause': config.status = 'paused'; break;
		case 'resume': config.status = 'running'; break;
		case 'reset': config.status = 'idle'; config.currentSegment = 0; config.startTime = null; break;
		case 'next': if (config.currentSegment < total - 1) config.currentSegment++; break;
		case 'prev': if (config.currentSegment > 0) config.currentSegment--; break;
	}
	debateFlowConfigs[stream_id] = config;
	broadcast('debate-flow-control', { streamId: stream_id, action, config });
	res.json({ success: true, message: `操作 ${action} 成功`, data: config });
});

// 添加请求日志中间件（调试用）
app.use((req, res, next) => {
	if (req.path.startsWith('/api')) {
		console.log(`📥 API请求: ${req.method} ${req.path}`);
	}
	next();
});

// 404处理器（API 路由�?
app.use((req, res) => {
	// 如果�?API 请求，返�?JSON 格式错误
	if (req.path.startsWith('/api')) {
		console.log(`⚠️  API路由未找�? ${req.method} ${req.path}`);
		res.status(404).json({
			success: false,
			error: 'Not Found',
			path: req.path,
			message: `API路由 ${req.path} 未定义`
		});
	} else {
		// 其他请求返回 404
		console.log(`⚠️  路由未找�? ${req.method} ${req.url}`);
		res.status(404).json({
			error: 'Not Found',
			path: req.url,
			message: `路由 ${req.url} 未定义`