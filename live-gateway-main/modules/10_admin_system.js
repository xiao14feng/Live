// ── module: 10_admin_system  |  original lines 2923–3695 of gateway.js ──
// ==================== 后台管理系统控制接口 ====================

// 一、直播控制接�?

// 1.1 开始直�?
app.post('/api/admin/live/start', (req, res) => {
	try {
		const { streamId, autoStartAI = false, notifyUsers = true } = req.body;
		
		// 获取直播�?
		
		let stream = null;
		
		if (streamId) {
			stream = null /* use backend API */;
			if (!stream) {
				return res.status(404).json({
					success: false,
					message: '指定的直播流不存�?
				});
			}
		} else {
			stream = null /* use backend API */;
			if (!stream) {
				return res.status(400).json({
					success: false,
					message: '没有可用的直播流，请先配置直播流'
				});
			}
		}
		
		// 检查该流是否已经在直播
		if (streamLiveStatuses[stream.id] && streamLiveStatuses[stream.id].isLive) {
			return res.status(409).json({
				success: false,
				message: '该直播流已经在进行中'
			});
		}
		
		// ⚠️ 重要：停止所有其他正在直播的�?
		for (const [otherStreamId, status] of Object.entries(streamLiveStatuses)) {
			if (otherStreamId !== stream.id && status.isLive) {
				console.log(`🛑 自动停止其他直播�? ${otherStreamId}`);
				streamLiveStatuses[otherStreamId].isLive = false;
				streamLiveStatuses[otherStreamId].stopTime = new Date().toISOString();
				
				// 广播其他流停止的消息
				broadcast('liveStatus', {
					streamId: otherStreamId,
					isLive: false,
					stopTime: streamLiveStatuses[otherStreamId].stopTime
				});
			}
		}
		
		// 生成直播ID
		const liveId = uuidv4();
		const startTime = new Date().toISOString();
		
		// 更新该流的直播状�?
		streamLiveStatuses[stream.id] = {
			isLive: true,
			liveId: liveId,
			startTime: startTime,
			streamUrl: stream.url,
			streamName: stream.name
		};
		
		// 更新全局直播状态（当前活跃的流�?
		globalLiveStatus.isLive = true;
		globalLiveStatus.streamUrl = stream.url;
		globalLiveStatus.streamId = stream.id;
		globalLiveStatus.liveId = liveId;
		globalLiveStatus.startTime = startTime;
		
		// 如果需要自动启动AI
		if (autoStartAI && globalAIStatus.status !== 'running') {
			globalAIStatus.status = 'running';
			globalAIStatus.aiSessionId = uuidv4();
			globalAIStatus.startTime = startTime;
			
			// 推送AI启动消息
			broadcast('aiStatus', {
				status: 'running',
				aiSessionId: globalAIStatus.aiSessionId
			});
		}
		
		// 推送直播开始消息到小程�?
		if (notifyUsers) {
			broadcast('liveStatus', {
				isLive: true,
				liveId: liveId,
				streamUrl: stream.url,
				startTime: startTime
			});
		}
		
		console.log(`�?直播已开�? ${liveId}, 流地址: ${stream.url}`);
		
		res.json({
			success: true,
			data: {
				liveId: liveId,
				streamUrl: stream.url,
				status: 'started',
				startTime: startTime,
				notifiedUsers: wsClients.size
			},
			message: '直播已开�?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('开始直播失�?', error);
		res.status(500).json({
			success: false,
			message: '开始直播失�? ' + error.message
		});
	}
});

// 1.2 停止直播
app.post('/api/admin/live/stop', (req, res) => {
	try {
		const { streamId, saveStatistics = true, notifyUsers = true } = req.body;
		
		// 确定要停止的流ID
		const targetStreamId = streamId || globalLiveStatus.streamId;
		
		// 如果指定了streamId，检查该流是否在直播
		if (targetStreamId && streamLiveStatuses[targetStreamId] && !streamLiveStatuses[targetStreamId].isLive) {
			return res.json({
				success: true,
				data: {
					status: 'stopped',
					message: '该直播流未在直播，无需停止'
				},
				message: '该直播流未在直播，无需停止',
				timestamp: Date.now()
			});
		}
		
		// 如果没有指定streamId且全局直播未开始，直接返回成功
		if (!targetStreamId && !globalLiveStatus.isLive) {
			return res.json({
				success: true,
				data: {
					status: 'stopped',
					message: '直播未开始，无需停止'
				},
				message: '直播未开始，无需停止',
				timestamp: Date.now()
			});
		}
		
		const stopTime = new Date().toISOString();
		let startTime = null;
		let duration = 0;
		let liveId = null;
		
		// 如果指定了streamId，停止该�?
		if (targetStreamId && streamLiveStatuses[targetStreamId]) {
			const streamStatus = streamLiveStatuses[targetStreamId];
			if (streamStatus.isLive) {
				startTime = new Date(streamStatus.startTime);
				duration = Math.floor((Date.now() - startTime.getTime()) / 1000);
				liveId = streamStatus.liveId;
				
				// 更新该流的状�?
				streamLiveStatuses[targetStreamId].isLive = false;
				streamLiveStatuses[targetStreamId].stopTime = stopTime;
			}
		} else if (globalLiveStatus.isLive) {
			// 停止全局直播状�?
			startTime = new Date(globalLiveStatus.startTime);
			duration = Math.floor((Date.now() - startTime.getTime()) / 1000);
			liveId = globalLiveStatus.liveId;
		}
		
		// 如果停止的是当前活跃的流，重置全局状�?
		if (targetStreamId === globalLiveStatus.streamId || !targetStreamId) {
			globalLiveStatus.isLive = false;
			globalLiveStatus.streamUrl = null;
			globalLiveStatus.streamId = null;
			globalLiveStatus.liveId = null;
			globalLiveStatus.startTime = null;
		}
		
		// 统计数据
		const summary = {
			totalViewers: wsClients.size,
			peakViewers: wsClients.size,
			totalVotes: currentVotes.leftVotes + currentVotes.rightVotes,
			totalComments: 0,
			totalLikes: 0
		};
		
		// 保存统计数据到数据库
		if (saveStatistics && duration > 0) {
			
			/* stats update skipped */;
		}
		
		// 推送直播停止消�?
		if (notifyUsers) {
			broadcast('liveStatus', {
				streamId: targetStreamId,
				isLive: false,
				liveId: liveId,
				stopTime: stopTime
			});
		}
		
		console.log(`⏹️  直播已停�? ${liveId}`);
		
		res.json({
			success: true,
			data: {
				liveId: liveId,
				status: 'stopped',
				stopTime: stopTime,
				duration: duration,
				summary: summary,
				notifiedUsers: wsClients.size
			},
			message: '直播已停�?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('停止直播失败:', error);
		res.status(500).json({
			success: false,
			message: '停止直播失败: ' + error.message
		});
	}
});

// 1.3 更新投票数据
app.post('/api/admin/live/update-votes', (req, res) => {
	try {
		const { action, leftVotes, rightVotes, reason, notifyUsers = true } = req.body;
		
		if (!action || !['set', 'add', 'reset'].includes(action)) {
			return res.status(400).json({
				success: false,
				message: 'action参数必须�? set / add / reset'
			});
		}
		
		const beforeUpdate = {
			leftVotes: currentVotes.leftVotes,
			rightVotes: currentVotes.rightVotes
		};
		
		// 执行操作
		switch (action) {
			case 'set':
				currentVotes.leftVotes = parseInt(leftVotes) || 0;
				currentVotes.rightVotes = parseInt(rightVotes) || 0;
				break;
			case 'add':
				currentVotes.leftVotes += parseInt(leftVotes) || 0;
				currentVotes.rightVotes += parseInt(rightVotes) || 0;
				break;
			case 'reset':
				currentVotes.leftVotes = 0;
				currentVotes.rightVotes = 0;
				break;
		}
		
		const total = currentVotes.leftVotes + currentVotes.rightVotes;
		const afterUpdate = {
			leftVotes: currentVotes.leftVotes,
			rightVotes: currentVotes.rightVotes,
			leftPercentage: total > 0 ? Math.round((currentVotes.leftVotes / total) * 100) : 50,
			rightPercentage: total > 0 ? Math.round((currentVotes.rightVotes / total) * 100) : 50
		};
		
		// 推送更�?
		if (notifyUsers) {
			broadcast('votes-updated', afterUpdate);
		}
		
		console.log(`📊 投票数据已更�?(${action}):`, afterUpdate);
		
		res.json({
			success: true,
			data: {
				beforeUpdate,
				afterUpdate,
				updateTime: new Date().toISOString()
			},
			message: '投票数据已更�?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('更新投票数据失败:', error);
		res.status(500).json({
			success: false,
			message: '更新投票数据失败: ' + error.message
		});
	}
});

// 1.4 重置投票数据
app.post('/api/admin/live/reset-votes', (req, res) => {
	try {
		const { resetTo, saveBackup = true, notifyUsers = true } = req.body;
		
		// 备份当前数据
		const backup = saveBackup ? {
			backupId: uuidv4(),
			leftVotes: currentVotes.leftVotes,
			rightVotes: currentVotes.rightVotes,
			timestamp: new Date().toISOString()
		} : null;
		
		// 重置票数
		if (resetTo) {
			currentVotes.leftVotes = parseInt(resetTo.leftVotes) || 0;
			currentVotes.rightVotes = parseInt(resetTo.rightVotes) || 0;
		} else {
			currentVotes.leftVotes = 0;
			currentVotes.rightVotes = 0;
		}
		
		// 推送更�?
		if (notifyUsers) {
			broadcast('votes-updated', {
				leftVotes: currentVotes.leftVotes,
				rightVotes: currentVotes.rightVotes,
				leftPercentage: 50,
				rightPercentage: 50
			});
		}
		
		console.log('🔄 投票数据已重�?);
		
		res.json({
			success: true,
			data: {
				backup,
				currentVotes: {
					leftVotes: currentVotes.leftVotes,
					rightVotes: currentVotes.rightVotes
				}
			},
			message: '投票数据已重�?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('重置投票数据失败:', error);
		res.status(500).json({
			success: false,
			message: '重置投票数据失败: ' + error.message
		});
	}
});

// 二、AI控制接口

// 2.1 启动AI识别
app.post('/api/admin/ai/start', (req, res) => {
	try {
		const { settings, notifyUsers = true } = req.body;
		
		if (globalAIStatus.status === 'running') {
			return res.status(409).json({
				success: false,
				message: 'AI识别已在运行�?
			});
		}
		
		// 更新设置
		if (settings) {
			globalAIStatus.settings = {
				...globalAIStatus.settings,
				...settings
			};
		}
		
		// 启动AI
		globalAIStatus.status = 'running';
		globalAIStatus.aiSessionId = uuidv4();
		globalAIStatus.startTime = new Date().toISOString();
		globalAIStatus.statistics = {
			totalContents: 0,
			totalWords: 0,
			averageConfidence: 0
		};
		
		// 推送AI启动消息
		if (notifyUsers) {
			broadcast('aiStatus', {
				status: 'running',
				aiSessionId: globalAIStatus.aiSessionId
			});
		}
		
		console.log(`🤖 AI识别已启�? ${globalAIStatus.aiSessionId}`);
		
		res.json({
			success: true,
			data: {
				aiSessionId: globalAIStatus.aiSessionId,
				status: 'running',
				startTime: globalAIStatus.startTime,
				settings: globalAIStatus.settings
			},
			message: 'AI识别已启�?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('启动AI识别失败:', error);
		res.status(500).json({
			success: false,
			message: '启动AI识别失败: ' + error.message
		});
	}
});

// 2.2 停止AI识别
app.post('/api/admin/ai/stop', (req, res) => {
	try {
		const { saveHistory = true, notifyUsers = true } = req.body;
		
		if (globalAIStatus.status === 'stopped') {
			return res.status(400).json({
				success: false,
				message: 'AI识别未运�?
			});
		}
		
		const stopTime = new Date().toISOString();
		const startTime = new Date(globalAIStatus.startTime);
		const duration = Math.floor((Date.now() - startTime.getTime()) / 1000);
		
		const aiSessionId = globalAIStatus.aiSessionId;
		const summary = { ...globalAIStatus.statistics };
		
		// 重置状�?
		globalAIStatus.status = 'stopped';
		globalAIStatus.aiSessionId = null;
		globalAIStatus.startTime = null;
		
		// 推送AI停止消息
		if (notifyUsers) {
			broadcast('aiStatus', {
				status: 'stopped',
				aiSessionId: aiSessionId
			});
		}
		
		console.log(`⏹️  AI识别已停�? ${aiSessionId}`);
		
		res.json({
			success: true,
			data: {
				aiSessionId: aiSessionId,
				status: 'stopped',
				stopTime: stopTime,
				duration: duration,
				summary: summary
			},
			message: 'AI识别已停�?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('停止AI识别失败:', error);
		res.status(500).json({
			success: false,
			message: '停止AI识别失败: ' + error.message
		});
	}
});

// 2.3 暂停/恢复AI识别
app.post('/api/admin/ai/toggle', (req, res) => {
	try {
		const { action, notifyUsers = true } = req.body;
		
		if (!action || !['pause', 'resume'].includes(action)) {
			return res.status(400).json({
				success: false,
				message: 'action参数必须�? pause / resume'
			});
		}
		
		if (action === 'pause') {
			if (globalAIStatus.status !== 'running') {
				return res.status(400).json({
					success: false,
					message: 'AI识别未运行，无法暂停'
				});
			}
			globalAIStatus.status = 'paused';
		} else if (action === 'resume') {
			if (globalAIStatus.status !== 'paused') {
				return res.status(400).json({
					success: false,
					message: 'AI识别未暂停，无法恢复'
				});
			}
			globalAIStatus.status = 'running';
		}
		
		// 推送状态变�?
		if (notifyUsers) {
			broadcast('aiStatus', {
				status: globalAIStatus.status
			});
		}
		
		console.log(`🤖 AI识别状态已变更: ${globalAIStatus.status}`);
		
		res.json({
			success: true,
			data: {
				aiSessionId: globalAIStatus.aiSessionId,
				status: globalAIStatus.status,
				actionTime: new Date().toISOString()
			},
			message: globalAIStatus.status === 'paused' ? 'AI识别已暂�? : 'AI识别已恢�?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('切换AI状态失�?', error);
		res.status(500).json({
			success: false,
			message: '切换AI状态失�? ' + error.message
		});
	}
});

// 2.4 删除AI内容
app.delete('/api/admin/ai/content/:contentId', (req, res) => {
	try {
		const { contentId } = req.params;
		const { reason, notifyUsers = true } = req.body;
		
		if (!contentId) {
			return res.status(400).json({
				success: false,
				message: '缺少内容ID'
			});
		}
		
		// 这里应该从数据库删除AI内容
		// 暂时模拟删除成功
		
		// 推送删除消�?
		if (notifyUsers) {
			broadcast('aiContentDeleted', {
				contentId: contentId
			});
		}
		
		console.log(`🗑�? AI内容已删�? ${contentId}`);
		
		res.json({
			success: true,
			data: {
				contentId: contentId,
				deleteTime: new Date().toISOString(),
				reason: reason || '管理员删�?
			},
			message: '内容已删�?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('删除AI内容失败:', error);
		res.status(500).json({
			success: false,
			message: '删除AI内容失败: ' + error.message
		});
	}
});

// 三、数据查询接�?

// 3.1 实时数据概览
app.get('/api/admin/dashboard', (req, res) => {
	try {
		
		const users = [] /* use backend API */;
		const debate = { title: '', leftPosition: '', rightPosition: '' } /* use backend API */;
		
		const totalVotes = currentVotes.leftVotes + currentVotes.rightVotes;
		const leftPercentage = totalVotes > 0 ? Math.round((currentVotes.leftVotes / totalVotes) * 100) : 50;
		const rightPercentage = totalVotes > 0 ? Math.round((currentVotes.rightVotes / totalVotes) * 100) : 50;
		
		// 计算直播时长
		let liveDuration = 0;
		if (globalLiveStatus.isLive && globalLiveStatus.startTime) {
			const startTime = new Date(globalLiveStatus.startTime);
			liveDuration = Math.floor((Date.now() - startTime.getTime()) / 1000);
		}
		
		// 获取启用的直播流（从数据库查询，即使直播未开始也会返回）
		let activeStream = null;
		try {
			activeStream = null /* use backend API */;
		} catch (error) {
			console.warn('获取启用直播流失�?', error);
		}
		
		const data = {
			totalUsers: users.length,
			activeUsers: wsClients.size,
			isLive: globalLiveStatus.isLive,
			liveStreamUrl: globalLiveStatus.streamUrl,
			streamId: globalLiveStatus.streamId || null, // 当前直播使用的流ID
			// 添加启用的直播流信息（从数据库查询，方便小程序获取测试流地址�?
			activeStreamUrl: activeStream ? activeStream.url : null,
			activeStreamId: activeStream ? activeStream.id : null,
			activeStreamName: activeStream ? activeStream.name : null,
			totalVotes: totalVotes,
			leftVotes: currentVotes.leftVotes,
			rightVotes: currentVotes.rightVotes,
			leftPercentage: leftPercentage,
			rightPercentage: rightPercentage,
			totalComments: 0,  // 可从数据库获�?
			totalLikes: 0,     // 可从数据库获�?
			aiStatus: globalAIStatus.status,
			debateTopic: {
				title: debate.title,
				leftSide: debate.leftPosition,
				rightSide: debate.rightPosition,
				description: debate.description
			},
			liveStartTime: globalLiveStatus.startTime,
			liveDuration: liveDuration
		};
		
		res.json({
			success: true,
			data: data,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('获取数据概览失败:', error);
		res.status(500).json({
			success: false,
			message: '获取数据概览失败: ' + error.message
		});
	}
});

// 3.2 用户列表
app.get('/api/admin/miniprogram/users', (req, res) => {
	try {
		
		const users = [] /* use backend API */;
		
		const page = parseInt(req.query.page) || 1;
		const pageSize = parseInt(req.query.pageSize) || 20;
		const status = req.query.status || 'all';
		const orderBy = req.query.orderBy || 'joinTime';
		
		// 过滤用户
		let filteredUsers = users;
		if (status === 'online') {
			// 简化处理：假设所有WebSocket连接的用户都是在�?
			filteredUsers = users.filter(u => wsClients.size > 0);
		}
		
		// 排序
		filteredUsers.sort((a, b) => {
			if (orderBy === 'votes') {
				return (b.statistics?.totalVotes || 0) - (a.statistics?.totalVotes || 0);
			}
			return new Date(b.joinTime) - new Date(a.joinTime);
		});
		
		// 分页
		const total = filteredUsers.length;
		const start = (page - 1) * pageSize;
		const end = start + pageSize;
		const paginatedUsers = filteredUsers.slice(start, end);
		
		res.json({
			success: true,
			data: {
				total: total,
				page: page,
				pageSize: pageSize,
				users: paginatedUsers.map(u => ({
					userId: u.id,
					nickname: u.nickname,
					avatar: u.avatar,
					status: 'online',  // 简化处�?
					lastActiveTime: new Date().toISOString(),
					statistics: u.statistics || {
						totalVotes: 0,
						totalComments: 0,
						totalLikes: 0,
						currentPosition: 'neutral'
					},
					joinTime: u.createdAt || new Date().toISOString()
				}))
			},
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('获取用户列表失败:', error);
		res.status(500).json({
			success: false,
			message: '获取用户列表失败: ' + error.message
		});
	}
});

// 3.3 投票统计
app.get('/api/admin/votes/statistics', (req, res) => {
	try {
		const timeRange = req.query.timeRange || '1h';
		
		const totalVotes = currentVotes.leftVotes + currentVotes.rightVotes;
		const leftPercentage = totalVotes > 0 ? Math.round((currentVotes.leftVotes / totalVotes) * 100) : 50;
		const rightPercentage = totalVotes > 0 ? Math.round((currentVotes.rightVotes / totalVotes) * 100) : 50;
		
		// 简化：生成模拟时间轴数�?
		const timeline = [];
		const now = new Date();
		for (let i = 0; i < 10; i++) {
			const time = new Date(now.getTime() - i * 60000);  // 每分钟一个点
			timeline.unshift({
				timestamp: time.toISOString(),
				leftVotes: Math.floor(currentVotes.leftVotes * (10 - i) / 10),
				rightVotes: Math.floor(currentVotes.rightVotes * (10 - i) / 10),
				totalVotes: Math.floor(totalVotes * (10 - i) / 10),
				activeUsers: wsClients.size
			});
		}
		
		res.json({
			success: true,
			data: {
				summary: {
					totalVotes: totalVotes,
					leftVotes: currentVotes.leftVotes,
					rightVotes: currentVotes.rightVotes,
					leftPercentage: leftPercentage,
					rightPercentage: rightPercentage,
					growthRate: 5.2
				},
				timeline: timeline,
				topVoters: []  // 可从数据库获�?
			},
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('获取投票统计失败:', error);
		res.status(500).json({
			success: false,
			message: '获取投票统计失败: ' + error.message
		});
	}
});

// 3.4 AI内容列表（已在上面定义，此处删除重复定义�?
