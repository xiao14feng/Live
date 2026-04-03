// ── module: 03_admin_streams  |  original lines 208–1048 of gateway.js ──
// ==================== 后台管理 API ====================


// 管理API - 直播流管理（代理 Python 后端�?
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
		console.error('获取直播流列表失�?', error);
		res.status(500).json({ success: false, error: '获取直播流列表失�? });
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
		console.error('获取直播流列表失�?', error);
		res.status(500).json({ success: false, error: '获取直播流列表失�? });
	}
});

app.post('/api/admin/streams', async (req, res) => {
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
		console.error('创建直播流失�?', error);
		res.status(500).json({ success: false, error: '创建直播流失�? });
	}
});

app.post('/api/v1/admin/streams', async (req, res) => {
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
		console.error('创建直播流失�?', error);
		res.status(500).json({ success: false, error: '创建直播流失�? });
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
		console.error('更新直播流失�?', error);
		res.status(500).json({ success: false, error: '更新直播流失�? });
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
		console.error('删除直播流失�?', error);
		res.status(500).json({ success: false, error: '删除直播流失�? });
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
		console.error('切换直播流状态失�?', error);
		res.status(500).json({ success: false, error: '切换直播流状态失�? });
	}
});

// 管理API - 辩论设置
app.get('/api/admin/debate', (req, res) => {
	try {
		const debate = { title: '', leftPosition: '', rightPosition: '' } /* use backend API */;
		res.json(debate);
	} catch (error) {
		console.error('获取辩论设置失败:', error);
		res.status(500).json({ error: '获取失败' });
	}
});

app.put('/api/admin/debate', (req, res) => {
	try {
		const debate = req.body /* use backend API */;
		// 同步更新内存中的辩题
		debateTopic.title = debate.title;
		debateTopic.description = debate.description;
		
		// 广播辩论设置更新给所有客户端（包括小程序�?
		broadcast('debate-updated', {
			debate: debate,
			timestamp: Date.now()
		});
		
		res.json(debate);
	} catch (error) {
		console.error('更新辩论设置失败:', error);
		res.status(500).json({ error: '更新失败' });
	}
});

// 管理API - 用户管理
app.get('/api/admin/users', async (req, res) => {
	try {
		const searchParams = new URLSearchParams();
		if (req.query.status) searchParams.set('status', req.query.status);
		if (req.query.skip) searchParams.set('skip', req.query.skip);
		if (req.query.limit) searchParams.set('limit', req.query.limit);

		const queryString = searchParams.toString();
		const backendUrl = `${BACKEND_BASE_URL}/api/admin/users${queryString ? `?${queryString}` : ''}`;
		const response = await fetch(backendUrl);
		const payload = await response.json();

		if (!response.ok) {
			return res.status(response.status).json(payload);
		}

		const data = payload?.data;
		const userList = Array.isArray(data) ? data : data?.users;
		const users = Array.isArray(userList) ? userList.map((user) => ({
			id: user.id,
			nickName: user.nickname,
			avatarUrl: user.avatar_url,
			createdAt: user.created_at,
			updatedAt: user.updated_at,
			totalVotes: user.total_votes,
			joinedDebates: user.joined_debates,
			status: user.status,
			role: user.role || (String(user.openid || '').startsWith('admin_') ? 'admin' : (String(user.openid || '').startsWith('judge_') ? 'judge' : 'user')),
			openid: user.openid,
			lastLoginAt: user.last_login_at,
		})) : [];
		res.json(users);
	} catch (error) {
		console.error('获取用户列表失败:', error);
		res.status(500).json({ error: '获取失败' });
	}
});

app.get('/api/admin/users/:id', async (req, res) => {
	try {
		const response = await fetch(`${BACKEND_BASE_URL}/api/admin/users/${req.params.id}`);
		const payload = await response.json();

		if (!response.ok) {
			return res.status(response.status).json(payload);
		}

		const user = payload?.data;
		if (!user) {
			return res.status(404).json({ error: '用户不存�? });
		}
		res.json({
			id: user.id,
			nickName: user.nickname,
			avatarUrl: user.avatar_url,
			createdAt: user.created_at,
			updatedAt: user.updated_at,
			totalVotes: user.total_votes,
			joinedDebates: user.joined_debates,
			status: user.status,
			role: user.role || (String(user.openid || '').startsWith('admin_') ? 'admin' : (String(user.openid || '').startsWith('judge_') ? 'judge' : 'user')),
			openid: user.openid,
			lastLoginAt: user.last_login_at,
		});
	} catch (error) {
		console.error('获取用户失败:', error);
		res.status(500).json({ error: '获取失败' });
	}
});

// 添加用户
app.post('/api/admin/users', async (req, res) => {
	try {
		const response = await fetch(`${BACKEND_BASE_URL}/api/admin/users`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(req.body)
		});
		const payload = await response.json();
		if (!response.ok) return res.status(response.status).json(payload);
		res.json(payload);
	} catch (error) {
		res.status(500).json({ success: false, message: '添加用户失败' });
	}
});

// 修改用户�?
app.put('/api/admin/users/:id', async (req, res) => {
	try {
		const response = await fetch(`${BACKEND_BASE_URL}/api/admin/users/${req.params.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ nickname: req.body.nickname })
		});
		const payload = await response.json();
		if (!response.ok) return res.status(response.status).json(payload);
		res.json({ success: true, message: '用户名修改成�? });
	} catch (error) {
		res.status(500).json({ success: false, message: '修改失败' });
	}
});

// 删除用户
app.delete('/api/admin/users/:id', async (req, res) => {
	try {
		const response = await fetch(`${BACKEND_BASE_URL}/api/admin/users/${req.params.id}`, {
			method: 'DELETE'
		});
		if (response.ok || response.status === 204) {
			return res.json({ success: true, message: '用户已删�? });
		}
		const payload = await response.json();
		res.status(response.status).json(payload);
	} catch (error) {
		res.status(500).json({ success: false, message: '删除失败' });
	}
});

// 获取当前辩题（小程序调用�? 完整实现见下�?API路由 部分

// 添加直播状态控�?API
let globalLiveStatus = {
	isLive: false,
	streamUrl: null,
	scheduledStartTime: null,
	scheduledEndTime: null,
	streamId: null,
	isScheduled: false,
	liveId: null,
	startTime: null
};

// 每个流的独立直播状态（支持多流同时管理�?
// 格式: { streamId: { isLive: true/false, liveId: 'xxx', startTime: 'xxx', streamUrl: 'xxx' } }
let streamLiveStatuses = {};

// 添加AI识别状态管�?
let globalAIStatus = {
	status: 'stopped',  // stopped / running / paused
	aiSessionId: null,
	startTime: null,
	settings: {
		mode: 'realtime',
		interval: 5000,
		sensitivity: 'high',
		minConfidence: 0.7
	},
	statistics: {
		totalContents: 0,
		totalWords: 0,
		averageConfidence: 0
	}
};

// 定时检查直播计�?
let liveScheduleTimer = null;

function checkLiveSchedule() {
	
	const schedule = liveSchedule;
	const now = Date.now();
	
	if (schedule.isScheduled && schedule.scheduledStartTime) {
		const startTime = new Date(schedule.scheduledStartTime).getTime();
		
		// 如果到了开始时间且还未开�?
		if (now >= startTime && !globalLiveStatus.isLive) {
			console.log('�?定时开始直�?);
			startScheduledLive(schedule);
		}
		
		// 如果有结束时间且已到结束时间
		if (schedule.scheduledEndTime && globalLiveStatus.isLive) {
			const endTime = new Date(schedule.scheduledEndTime).getTime();
			if (now >= endTime) {
				console.log('�?定时结束直播');
				stopLive();
			}
		}
	}
}

// 启动定时检查（每分钟检查一次）
function startScheduleCheck() {
	if (liveScheduleTimer) {
		clearInterval(liveScheduleTimer);
	}
	liveScheduleTimer = setInterval(checkLiveSchedule, 60000); // 每分钟检查一�?
}

// 启动计划的直�?
function startScheduledLive(schedule) {
	
	
	try {
		let streamUrl = null;
		
		// 获取直播�?
		if (schedule.streamId) {
			const stream = null /* use backend API */;
			if (stream && stream.enabled) {
				streamUrl = stream.url;
			}
		}
		
		if (!streamUrl) {
			const activeStream = null /* use backend API */;
			if (activeStream) {
				streamUrl = activeStream.url;
			}
		}
		
		if (!streamUrl) {
			console.error('�?没有可用的直播流');
			return;
		}
		
		globalLiveStatus.isLive = true;
		globalLiveStatus.streamUrl = streamUrl;
		globalLiveStatus.streamId = schedule.streamId;
		
		// 广播直播状态变�?
		broadcast('live-status-changed', {
			status: 'started',
			streamUrl: globalLiveStatus.streamUrl,
			timestamp: Date.now(),
			scheduled: true
		});
		
		console.log('�?直播已开�?', streamUrl);
	} catch (error) {
		console.error('启动计划直播失败:', error);
	}
}

// 停止直播
function stopLive() {
	globalLiveStatus.isLive = false;
	globalLiveStatus.streamUrl = null;
	globalLiveStatus.streamId = null;
	
	// 清除计划
	
	liveSchedule = { streamId: null, scheduledStartTime: null, scheduledEndTime: null };
	globalLiveStatus.isScheduled = false;
	globalLiveStatus.scheduledStartTime = null;
	globalLiveStatus.scheduledEndTime = null;
	
	// 广播直播状态变�?
	broadcast('live-status-changed', {
		status: 'stopped',
		timestamp: Date.now()
	});
	
		console.log('🛑 直播已停�?);
}

// 管理端直播控制接口（管理员专用）
app.post('/api/admin/live/control', (req, res) => {
	try {
		const { action, streamUrl } = req.body;
		
		if (action === 'start') {
			if (!streamUrl) {
				
				const activeStream = null /* use backend API */;
				if (!activeStream) {
					return res.status(400).json({ error: '没有可用的直播流' });
				}
				globalLiveStatus.streamUrl = activeStream.url;
			} else {
				globalLiveStatus.streamUrl = streamUrl;
			}
			globalLiveStatus.isLive = true;
			
			// 广播直播状态变�?
			broadcast('live-status-changed', {
				status: 'started',
				streamUrl: globalLiveStatus.streamUrl,
				timestamp: Date.now()
			});
			
			res.json({ success: true, status: 'started', streamUrl: globalLiveStatus.streamUrl });
		} else if (action === 'stop') {
			stopLive();
			res.json({ success: true, status: 'stopped' });
		} else {
			res.status(400).json({ error: '无效的操�? });
		}
	} catch (error) {
		console.error('控制直播状态失�?', error);
		res.status(500).json({ error: '操作失败' });
	}
});

// 公开的直播控制接口（用户可直接调用）
app.post('/api/live/control', (req, res) => {
	try {
		const { action, streamId } = req.body;
		
		if (action === 'start') {
			
			let selectedStream = null;
			
			// 如果指定了streamId，使用指定的直播�?
			if (streamId) {
				selectedStream = null /* use backend API */;
				if (!selectedStream) {
					return res.status(400).json({ 
						success: false,
						message: '指定的直播流不存�? 
					});
				}
				if (!selectedStream.enabled) {
					return res.status(400).json({ 
						success: false,
						message: '指定的直播流未启�? 
					});
				}
			} else {
				// 否则使用启用的直播流
				selectedStream = null /* use backend API */;
				if (!selectedStream) {
					return res.status(400).json({ 
						success: false,
						message: '没有可用的直播流，请先在后台管理系统中配置直播流' 
					});
				}
			}
			
			// 开始直�?
			globalLiveStatus.isLive = true;
			globalLiveStatus.streamUrl = selectedStream.url;
			globalLiveStatus.streamId = selectedStream.id;
			globalLiveStatus.isScheduled = false;
			globalLiveStatus.scheduledStartTime = null;
			globalLiveStatus.scheduledEndTime = null;
			
			// 清除之前的计�?
			liveSchedule = { streamId: null, scheduledStartTime: null, scheduledEndTime: null };
			
			// 广播直播状态变�?
			broadcast('live-status-changed', {
				status: 'started',
				streamUrl: globalLiveStatus.streamUrl,
				timestamp: Date.now(),
				startedBy: 'user'
			});
			
			console.log('�?用户启动直播:', selectedStream.name, selectedStream.url);
			
			res.json({ 
				success: true, 
				message: '直播已开�?,
				data: {
					status: 'started',
					streamUrl: globalLiveStatus.streamUrl,
					streamId: selectedStream.id,
					streamName: selectedStream.name
				}
			});
		} else if (action === 'stop') {
			stopLive();
			console.log('�?用户停止直播');
			res.json({ 
				success: true, 
				message: '直播已停�?,
				data: {
					status: 'stopped'
				}
			});
		} else {
			res.status(400).json({ 
				success: false,
				message: '无效的操作，action 必须�?"start" �?"stop"' 
			});
		}
	} catch (error) {
		console.error('用户控制直播状态失�?', error);
		res.status(500).json({ 
			success: false,
			message: '操作失败: ' + error.message 
		});
	}
});

// 设置直播计划
app.post('/api/admin/live/schedule', (req, res) => {
	try {
		
		const { scheduledStartTime, scheduledEndTime, streamId } = req.body;
		
		if (!scheduledStartTime) {
			return res.status(400).json({ error: '请设置直播开始时�? });
		}
		
		const startTime = new Date(scheduledStartTime).getTime();
		const now = Date.now();
		
		if (startTime <= now) {
			return res.status(400).json({ error: '开始时间必须晚于当前时�? });
		}
		
		// 验证直播�?
		if (streamId) {
			const stream = null /* use backend API */;
			if (!stream) {
				return res.status(400).json({ error: '指定的直播流不存�? });
			}
			if (!stream.enabled) {
				return res.status(400).json({ error: '指定的直播流未启�? });
			}
		} else {
			const activeStream = null /* use backend API */;
			if (!activeStream) {
				return res.status(400).json({ error: '没有可用的直播流' });
			}
		}
		
		// 保存计划
		const schedule = Object.assign(liveSchedule, {
			scheduledStartTime,
			scheduledEndTime: scheduledEndTime || null,
			streamId: streamId || null,
			isScheduled: true
		});
		
		globalLiveStatus.scheduledStartTime = scheduledStartTime;
		globalLiveStatus.scheduledEndTime = scheduledEndTime || null;
		globalLiveStatus.streamId = streamId || null;
		globalLiveStatus.isScheduled = true;
		
		// 启动定时检�?
		startScheduleCheck();
		
		// 广播计划更新
		broadcast('live-schedule-updated', {
			schedule: schedule,
			timestamp: Date.now()
		});
		
		res.json({
			success: true,
			message: '直播计划已设�?,
			data: schedule
		});
	} catch (error) {
		console.error('设置直播计划失败:', error);
		res.status(500).json({ error: '设置失败' });
	}
});

// 获取直播计划
app.get('/api/admin/live/schedule', (req, res) => {
	try {
		
		const schedule = liveSchedule;
		res.json({
			success: true,
			data: schedule
		});
	} catch (error) {
		res.status(500).json({ error: '获取失败' });
	}
});

// 取消直播计划
app.post('/api/admin/live/schedule/cancel', (req, res) => {
	try {
		
		liveSchedule = { streamId: null, scheduledStartTime: null, scheduledEndTime: null };
		
		globalLiveStatus.isScheduled = false;
		globalLiveStatus.scheduledStartTime = null;
		globalLiveStatus.scheduledEndTime = null;
		
		// 广播计划取消
		broadcast('live-schedule-cancelled', {
			timestamp: Date.now()
		});
		
		res.json({
			success: true,
			message: '直播计划已取�?
		});
	} catch (error) {
		res.status(500).json({ error: '取消失败' });
	}
});

app.get('/api/admin/live/status', (req, res) => {
	try {
		
		const schedule = liveSchedule;
		
		// 获取启用的直播流（即使直播未开始，也返回启用的流地址�?
		let activeStream = null;
		try {
			activeStream = null /* use backend API */;
		} catch (error) {
			console.warn('获取启用直播流失�?', error);
		}
		
		res.json({
			...globalLiveStatus,
			schedule: schedule,
			// 如果直播未开始但有启用的流，返回流地址以便小程序使�?
			activeStreamUrl: activeStream ? activeStream.url : null,
			activeStreamId: activeStream ? activeStream.id : null,
			activeStreamName: activeStream ? activeStream.name : null
		});
	} catch (error) {
		res.json(globalLiveStatus);
	}
});

// 一次性设置并开始直播（整合API�?
app.post('/api/admin/live/setup-and-start', (req, res) => {
	try {
		
		const { streamId, scheduledStartTime, scheduledEndTime, startNow } = req.body;
		
		// 验证直播�?
		let selectedStream = null;
		if (streamId) {
			selectedStream = null /* use backend API */;
			if (!selectedStream) {
				return res.status(400).json({ error: '指定的直播流不存�? });
			}
			if (!selectedStream.enabled) {
				return res.status(400).json({ error: '指定的直播流未启�? });
			}
		} else {
			selectedStream = null /* use backend API */;
			if (!selectedStream) {
				return res.status(400).json({ error: '没有可用的直播流' });
			}
		}
		
		if (startNow) {
			// 立即开始直�?
			globalLiveStatus.isLive = true;
			globalLiveStatus.streamUrl = selectedStream.url;
			globalLiveStatus.streamId = selectedStream.id;
			globalLiveStatus.isScheduled = false;
			globalLiveStatus.scheduledStartTime = null;
			globalLiveStatus.scheduledEndTime = null;
			
			// 清除之前的计�?
			liveSchedule = { streamId: null, scheduledStartTime: null, scheduledEndTime: null };
			
			// 广播直播状态变�?
			broadcast('live-status-changed', {
				status: 'started',
				streamUrl: globalLiveStatus.streamUrl,
				timestamp: Date.now(),
				startedBy: 'admin'
			});
			
			res.json({
				success: true,
				message: '直播已开�?,
				data: {
					isLive: true,
					streamUrl: globalLiveStatus.streamUrl,
					streamId: selectedStream.id
				}
			});
		} else {
			// 设置定时开�?
			if (!scheduledStartTime) {
				return res.status(400).json({ error: '请设置直播开始时�? });
			}
			
			const startTime = new Date(scheduledStartTime).getTime();
			const now = Date.now();
			
			if (startTime <= now) {
				return res.status(400).json({ error: '开始时间必须晚于当前时�? });
			}
			
			// 保存计划
			const schedule = Object.assign(liveSchedule, {
				scheduledStartTime,
				scheduledEndTime: scheduledEndTime || null,
				streamId: selectedStream.id,
				isScheduled: true
			});
			
			globalLiveStatus.scheduledStartTime = scheduledStartTime;
			globalLiveStatus.scheduledEndTime = scheduledEndTime || null;
			globalLiveStatus.streamId = selectedStream.id;
			globalLiveStatus.isScheduled = true;
			
			// 启动定时检�?
			startScheduleCheck();
			
			// 广播计划更新
			broadcast('live-schedule-updated', {
				schedule: schedule,
				timestamp: Date.now()
			});
			
			res.json({
				success: true,
				message: '直播计划已设�?,
				data: schedule
			});
		}
	} catch (error) {
		console.error('设置并开始直播失�?', error);
		res.status(500).json({ error: '操作失败' });
	}
});
