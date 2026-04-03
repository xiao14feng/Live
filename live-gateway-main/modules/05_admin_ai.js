// ── module: 05_admin_ai  |  original lines 1149–1968 of gateway.js ──
// ==================== AI 内容管理 API ====================
app.get('/api/admin/ai-content', (req, res) => {
	try {
		res.json({
			success: true,
			data: aiDebateContent
		});
	} catch (error) {
		res.status(500).json({ error: '获取 AI 内容失败' });
	}
});

// ==================== 评委管理 API (代理到Python后端) ====================
// 获取评委分配
app.get('/api/v1/admin/judges', async (req, res) => {
	try {
		const streamId = req.query.stream_id;
		if (!streamId) {
			return res.status(400).json({ success: false, message: '缺少 stream_id 参数' });
		}
		
		const response = await fetch(`${BACKEND_BASE_URL}/api/v1/admin/judges?stream_id=${streamId}`);
		const payload = await response.json();
		
		if (!response.ok) {
			return res.status(response.status).json(payload);
		}
		
		res.json(payload);
	} catch (error) {
		console.error('获取评委分配失败:', error);
		res.status(500).json({ success: false, message: '获取评委分配失败' });
	}
});

// 保存评委分配
app.post('/api/v1/admin/judges', async (req, res) => {
	try {
		const response = await fetch(`${BACKEND_BASE_URL}/api/v1/admin/judges`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(req.body)
		});
		const payload = await response.json();
		
		if (!response.ok) {
			return res.status(response.status).json(payload);
		}
		
		res.json(payload);
	} catch (error) {
		console.error('保存评委分配失败:', error);
		res.status(500).json({ success: false, message: '保存评委分配失败' });
	}
});

// 查询评委投票状�?
app.get('/api/v1/judge-vote/status', async (req, res) => {
	try {
		const streamId = req.query.stream_id;
		const userId = req.query.user_id;
		
		if (!streamId || !userId) {
			return res.status(400).json({ success: false, message: '缺少 stream_id �?user_id 参数' });
		}
		
		const response = await fetch(`${BACKEND_BASE_URL}/api/v1/judge-vote/status?stream_id=${streamId}&user_id=${userId}`);
		const payload = await response.json();
		
		if (!response.ok) {
			return res.status(response.status).json(payload);
		}
		
		res.json(payload);
	} catch (error) {
		console.error('查询投票状态失�?', error);
		res.status(500).json({ success: false, message: '查询投票状态失�? });
	}
});

// 提交评委投票
app.post('/api/v1/judge-vote', async (req, res) => {
	try {
		const response = await fetch(`${BACKEND_BASE_URL}/api/v1/judge-vote`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(req.body)
		});
		const payload = await response.json();
		
		if (!response.ok) {
			return res.status(response.status).json(payload);
		}
		
		// 广播投票更新
		if (payload.success && payload.data && payload.data.aggregate) {
			broadcast('votes-updated', {
				streamId: req.body.stream_id || req.body.streamId,
				leftVotes: payload.data.aggregate.leftVotes,
				rightVotes: payload.data.aggregate.rightVotes,
				totalVotes: payload.data.aggregate.totalVotes
			});
		}
		
		res.json(payload);
	} catch (error) {
		console.error('提交投票失败:', error);
		res.status(500).json({ success: false, message: '提交投票失败' });
	}
});

// 获取评委投票记录
app.get('/api/v1/admin/judge-votes', async (req, res) => {
	try {
		const streamId = req.query.stream_id;
		if (!streamId) {
			return res.status(400).json({ success: false, message: '缺少 stream_id 参数' });
		}
		
		const response = await fetch(`${BACKEND_BASE_URL}/api/v1/admin/judge-votes?stream_id=${streamId}`);
		const payload = await response.json();
		
		if (!response.ok) {
			return res.status(response.status).json(payload);
		}
		
		res.json(payload);
	} catch (error) {
		console.error('获取投票记录失败:', error);
		res.status(500).json({ success: false, message: '获取投票记录失败' });
	}
});

// 全部流投票汇�?
app.get('/api/v1/admin/votes/all', async (req, res) => {
	try {
		const response = await fetch(`${BACKEND_BASE_URL}/api/v1/admin/votes/all`);
		const payload = await response.json();
		res.json(payload);
	} catch (error) {
		res.status(500).json({ success: false, message: '获取全部投票数据失败' });
	}
});

// 用户投票统计（按人数�?
app.get('/api/v1/admin/user-vote-stats', async (req, res) => {
	try {
		const streamId = req.query.stream_id;
		if (!streamId) {
			return res.status(400).json({ success: false, message: '缺少 stream_id 参数' });
		}
		const response = await fetch(`${BACKEND_BASE_URL}/api/v1/admin/user-vote-stats?stream_id=${streamId}`);
		const payload = await response.json();
		if (!response.ok) {
			return res.status(response.status).json(payload);
		}
		res.json(payload);
	} catch (error) {
		console.error('获取用户投票统计失败:', error);
		res.status(500).json({ success: false, message: '获取用户投票统计失败' });
	}
});

// 获取投票人数（大屏幕用）
app.get('/api/v1/vote-count', async (req, res) => {
	try {
		const streamId = req.query.stream_id;
		if (!streamId) {
			return res.status(400).json({ success: false, message: '缺少 stream_id 参数' });
		}
		const response = await fetch(`${BACKEND_BASE_URL}/api/v1/vote-count?stream_id=${streamId}`);
		const payload = await response.json();
		if (!response.ok) return res.status(response.status).json(payload);
		res.json(payload);
	} catch (error) {
		res.status(500).json({ success: false, message: '获取投票人数失败' });
	}
});

// 查询用户投票状�?
app.get('/api/v1/user-votes', async (req, res) => {
	try {
		const streamId = req.query.stream_id;
		const userId = req.query.user_id;
		
		if (!streamId || !userId) {
			return res.status(400).json({ success: false, message: '缺少 stream_id �?user_id 参数' });
		}
		
		const response = await fetch(`${BACKEND_BASE_URL}/api/v1/user-votes?stream_id=${streamId}&user_id=${userId}`);
		const payload = await response.json();
		
		if (!response.ok) {
			return res.status(response.status).json(payload);
		}
		
		res.json(payload);
	} catch (error) {
		console.error('查询用户投票状态失�?', error);
		res.status(500).json({ success: false, message: '查询用户投票状态失�? });
	}
});

// 用户投票
app.post('/api/v1/user-vote', async (req, res) => {
	try {
		const response = await fetch(`${BACKEND_BASE_URL}/api/v1/user-vote`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(req.body)
		});
		const payload = await response.json();
		
		if (!response.ok) {
			return res.status(response.status).json(payload);
		}
		
		// 广播投票更新
		if (payload.success && payload.data) {
			const streamId = req.body.request?.streamId || req.body.streamId;
			if (streamId) {
				broadcast('votes-updated', {
					streamId: streamId,
					leftVotes: payload.data.leftVotes || 0,
					rightVotes: payload.data.rightVotes || 0,
					totalVotes: (payload.data.leftVotes || 0) + (payload.data.rightVotes || 0)
				});
			}
		}
		
		res.json(payload);
	} catch (error) {
		console.error('用户投票失败:', error);
		res.status(500).json({ success: false, message: '用户投票失败' });
	}
});

// ==================== v1 API 路由（兼容新版本前端�?====================
// 这些路由与上面的路由功能相同，但使用 /api/v1 前缀，支持认证token

// v1: 获取AI内容列表（必须在 /api/admin/ai-content/:id 之前定义，避免路由冲突）
app.get('/api/v1/admin/ai-content/list', (req, res) => {
	console.log('�?v1 AI内容列表路由被调�?', req.query);
	try {
		const page = parseInt(req.query.page) || 1;
		const pageSize = parseInt(req.query.pageSize) || 20;
		const startTime = req.query.startTime || null;
		const endTime = req.query.endTime || null;
		
		// 验证pageSize最大�?
		if (pageSize > 100) {
			return res.status(400).json({
				success: false,
				message: 'pageSize最大值为100'
			});
		}
		
		// �?aiDebateContent 数组中获取数�?
		let filteredContent = [...aiDebateContent];
		
		// 按时间过滤（如果有提供）
		if (startTime) {
			filteredContent = filteredContent.filter(item => {
				const itemTime = item.timestamp || item.createdAt || 0;
				return new Date(itemTime) >= new Date(startTime);
			});
		}
		if (endTime) {
			filteredContent = filteredContent.filter(item => {
				const itemTime = item.timestamp || item.createdAt || 0;
				return new Date(itemTime) <= new Date(endTime);
			});
		}
		
		// 计算总数
		const total = filteredContent.length;
		
		// 分页
		const start = (page - 1) * pageSize;
		const end = start + pageSize;
		const paginatedContent = filteredContent.slice(start, end);
		
		// 转换为文档格�?
		const items = paginatedContent.map(item => {
			// 计算评论�?
			const commentCount = (item.comments && Array.isArray(item.comments)) ? item.comments.length : 0;
			
			// 转换timestamp为ISO格式
			let timestampISO = '';
			if (item.timestamp) {
				// 如果是时间戳（数字），转换为ISO格式
				if (typeof item.timestamp === 'number') {
					timestampISO = new Date(item.timestamp).toISOString();
				} else {
					timestampISO = new Date(item.timestamp).toISOString();
				}
			} else if (item.createdAt) {
				timestampISO = new Date(item.createdAt).toISOString();
			} else {
				timestampISO = new Date().toISOString();
			}
			
			return {
				id: item.id,
				content: item.content || item.text || '', // 优先使用content，如果没有则使用text
				type: 'summary', // 固定�?
				timestamp: timestampISO,
				position: item.position || item.side || 'left', // side转换为position
				confidence: item.confidence || 0.95, // 默认置信�?
				statistics: {
					views: item.statistics?.views || item.views || 0,
					likes: item.statistics?.likes || item.likes || 0,
					comments: commentCount // 只返回数量，不返回详细评�?
				}
			};
		});
		
		res.json({
			success: true,
			data: {
				total: total,
				page: page,
				items: items
			}
		});
		
	} catch (error) {
		console.error('获取AI内容列表失败:', error);
		res.status(500).json({
			success: false,
			message: '获取AI内容列表失败: ' + error.message
		});
	}
});

// AI内容列表（必须在 /api/admin/ai-content/:id 之前定义，避免路由冲突）
app.get('/api/admin/ai-content/list', (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const pageSize = parseInt(req.query.pageSize) || 20;
		const startTime = req.query.startTime || null;
		const endTime = req.query.endTime || null;
		
		// �?aiDebateContent 数组中获取数�?
		let filteredContent = [...aiDebateContent];
		
		// 按时间过滤（如果有提供）
		if (startTime) {
			filteredContent = filteredContent.filter(item => 
				new Date(item.timestamp || item.createdAt || 0) >= new Date(startTime)
			);
		}
		if (endTime) {
			filteredContent = filteredContent.filter(item => 
				new Date(item.timestamp || item.createdAt || 0) <= new Date(endTime)
			);
		}
		
		// 计算总数
		const total = filteredContent.length;
		
		// 分页
		const start = (page - 1) * pageSize;
		const end = start + pageSize;
		const items = filteredContent.slice(start, end);
		
		res.json({
			success: true,
			data: {
				total: total,
				page: page,
				pageSize: pageSize,
				items: items
			},
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('获取AI内容列表失败:', error);
		res.status(500).json({
			success: false,
			message: '获取AI内容列表失败: ' + error.message
		});
	}
});

app.get('/api/admin/ai-content/:id', (req, res) => {
	try {
		const { id } = req.params;
		const content = aiDebateContent.find(item => item.id === id);
		
		if (!content) {
			return res.status(404).json({ error: '内容不存�? });
		}
		
		res.json({
			success: true,
			data: content
		});
	} catch (error) {
		res.status(500).json({ error: '获取 AI 内容失败' });
	}
});

// 获取AI内容评论列表（必须在 /api/admin/ai-content/:id/comments/:commentId 之前定义�?
app.get('/api/admin/ai-content/:id/comments', (req, res) => {
	try {
		const { id } = req.params;
		const page = parseInt(req.query.page) || 1;
		const pageSize = parseInt(req.query.pageSize) || 20;
		
		// 查找AI内容
		const content = aiDebateContent.find(item => item.id === id);
		
		if (!content) {
			return res.status(404).json({
				success: false,
				message: 'AI内容不存�?
			});
		}
		
		// 获取评论列表（从 content.comments �?content.items.comments�?
		let comments = [];
		if (content.comments && Array.isArray(content.comments)) {
			comments = content.comments;
		} else if (content.items && Array.isArray(content.items)) {
			// 如果评论�?items 数组�?
			const contentItem = content.items.find(item => item.id === id);
			if (contentItem && contentItem.comments) {
				comments = contentItem.comments;
			}
		}
		
		// 分页
		const total = comments.length;
		const start = (page - 1) * pageSize;
		const end = start + pageSize;
		const paginatedComments = comments.slice(start, end);
		
		res.json({
			success: true,
			data: {
				contentId: id,
				contentText: content.content || content.text || '',
				total: total,
				page: page,
				pageSize: pageSize,
				comments: paginatedComments
			},
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('获取AI内容评论列表失败:', error);
		res.status(500).json({
			success: false,
			message: '获取评论列表失败: ' + error.message
		});
	}
});

// 删除AI内容评论
app.delete('/api/admin/ai-content/:id/comments/:commentId', (req, res) => {
	try {
		const { id, commentId } = req.params;
		const { reason = '', notifyUsers = true } = req.body;
		
		// 查找AI内容
		const content = aiDebateContent.find(item => item.id === id);
		
		if (!content) {
			return res.status(404).json({
				success: false,
				message: 'AI内容不存�?
			});
		}
		
		// 获取评论列表
		let comments = [];
		if (content.comments && Array.isArray(content.comments)) {
			comments = content.comments;
		}
		
		// 查找评论
		const commentIndex = comments.findIndex(c => (c.commentId || c.id) === commentId);
		
		if (commentIndex === -1) {
			return res.status(404).json({
				success: false,
				message: '评论不存�?
			});
		}
		
		// 删除评论
		const deletedComment = comments.splice(commentIndex, 1)[0];
		
		// 更新内容中的评论数组
		content.comments = comments;
		
		// 更新统计数据
		if (content.statistics) {
			content.statistics.comments = (content.statistics.comments || 0) - 1;
		}
		
		// 如果通知用户，可以在这里发送WebSocket消息
		if (notifyUsers) {
			// broadcast('comment-deleted', { contentId: id, commentId: commentId });
		}
		
		console.log(`🗑�? 已删除评�? ${commentId}, 原因: ${reason || '管理员删�?}`);
		
		res.json({
			success: true,
			data: {
				contentId: id,
				commentId: commentId,
				deleted: true
			},
			message: '评论已删�?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('删除评论失败:', error);
		res.status(500).json({
			success: false,
			message: '删除评论失败: ' + error.message
		});
	}
});

// v1: 获取AI内容评论列表
app.get('/api/v1/admin/ai-content/:id/comments', (req, res) => {
	try {
		const { id } = req.params;
		const page = parseInt(req.query.page) || 1;
		const pageSize = parseInt(req.query.pageSize) || 20;
		
		// 验证pageSize最大�?
		if (pageSize > 100) {
			return res.status(400).json({
				success: false,
				message: 'pageSize最大值为100'
			});
		}
		
		// 查找AI内容
		const content = aiDebateContent.find(item => item.id === id);
		
		if (!content) {
			return res.status(404).json({
				success: false,
				message: 'AI内容不存�?
			});
		}
		
		// 获取评论列表（从 content.comments�?
		let comments = [];
		if (content.comments && Array.isArray(content.comments)) {
			comments = content.comments;
		}
		
		// 按时间倒序排序（最新的在前�?
		comments.sort((a, b) => {
			const timeA = a.timestamp || a.time || 0;
			const timeB = b.timestamp || b.time || 0;
			// 如果是时间戳，直接比较；如果是ISO字符串，转换为时间戳比较
			const tsA = typeof timeA === 'number' ? timeA : new Date(timeA).getTime();
			const tsB = typeof timeB === 'number' ? timeB : new Date(timeB).getTime();
			return tsB - tsA; // 降序
		});
		
		// 分页
		const total = comments.length;
		const start = (page - 1) * pageSize;
		const end = start + pageSize;
		const paginatedComments = comments.slice(start, end);
		
		// 转换为文档格�?
		const formattedComments = paginatedComments.map(comment => {
			// 转换timestamp为ISO格式
			let timestampISO = '';
			if (comment.timestamp) {
				if (typeof comment.timestamp === 'number') {
					timestampISO = new Date(comment.timestamp).toISOString();
				} else {
					timestampISO = new Date(comment.timestamp).toISOString();
				}
			} else if (comment.time) {
				// 如果只有time字段（如"刚刚"�?3分钟�?），使用当前时间
				timestampISO = new Date().toISOString();
			} else {
				timestampISO = new Date().toISOString();
			}
			
			// 判断是否为匿名用�?
			const userId = comment.userId || 
				(comment.user === '匿名用户' || !comment.user ? 'anonymous' : null) || 
				'anonymous';
			
			return {
				commentId: comment.commentId || comment.id || '',
				userId: userId,
				nickname: comment.nickname || comment.user || '匿名用户',
				avatar: comment.avatar || '👤',
				content: comment.content || comment.text || '',
				likes: comment.likes || 0,
				timestamp: timestampISO
			};
		});
		
		res.json({
			success: true,
			data: {
				contentId: id,
				contentText: content.content || content.text || '',
				total: total,
				page: page,
				pageSize: pageSize,
				comments: formattedComments
			}
		});
		
	} catch (error) {
		console.error('获取AI内容评论列表失败:', error);
		res.status(500).json({
			success: false,
			message: '获取评论列表失败: ' + error.message
		});
	}
});

// v1: 删除AI内容评论
app.delete('/api/v1/admin/ai-content/:id/comments/:commentId', (req, res) => {
	try {
		const { id, commentId } = req.params;
		const { reason = '', notifyUsers = true } = req.body;
		
		// 查找AI内容
		const content = aiDebateContent.find(item => item.id === id);
		
		if (!content) {
			return res.status(404).json({
				success: false,
				message: 'AI内容不存�?
			});
		}
		
		// 获取评论列表
		let comments = [];
		if (content.comments && Array.isArray(content.comments)) {
			comments = content.comments;
		}
		
		// 查找评论（支持commentId或id字段�?
		const commentIndex = comments.findIndex(c => {
			const cId = c.commentId || c.id;
			return cId === commentId || String(cId) === String(commentId);
		});
		
		if (commentIndex === -1) {
			return res.status(404).json({
				success: false,
				message: `评论ID ${commentId} 不存在或不属于内容ID ${id}`
			});
		}
		
		// 删除评论
		const deletedComment = comments.splice(commentIndex, 1)[0];
		
		// 更新内容中的评论数组
		content.comments = comments;
		
		// 更新统计数据
		if (content.statistics) {
			content.statistics.comments = (content.statistics.comments || 0) - 1;
		} else {
			content.statistics = {
				views: content.statistics?.views || 0,
				likes: content.statistics?.likes || content.likes || 0,
				comments: comments.length
			};
		}
		
		// 如果通知用户，通过WebSocket广播删除通知
		if (notifyUsers) {
			broadcast('comment-deleted', {
				contentId: id,
				commentId: commentId,
				timestamp: Date.now()
			});
		}
		
		console.log(`🗑�? 已删除评�? ${commentId}, 原因: ${reason || '管理员删�?}`);
		
		// 按照文档格式返回响应
		res.json({
			success: true,
			data: {
				commentId: commentId,
				contentId: id,
				deleteTime: null // 由前端填充当前时�?
			},
			message: '评论已删�?
		});
		
	} catch (error) {
		console.error('删除评论失败:', error);
		res.status(500).json({
			success: false,
			message: '删除评论失败: ' + error.message
		});
	}
});

app.post('/api/admin/ai-content', (req, res) => {
	try {
		const { text, side, debate_id } = req.body;
		
		if (!text || !side) {
			return res.status(400).json({ error: '缺少必要参数: text, side' });
		}
		
		if (side !== 'left' && side !== 'right') {
			return res.status(400).json({ error: 'side 必须�?"left" �?"right"' });
		}
		
		const newContent = {
			id: uuidv4(),
			debate_id: debate_id || debateTopic.id,
			text: text.trim(),
			side: side,
			timestamp: new Date().getTime(),
			comments: [],
			likes: 0
		};
		
		aiDebateContent.push(newContent);
		
		// 广播新内容添�?
		broadcast('newAIContent', {
			...newContent,
			updatedBy: 'admin'
		});
		
		res.json({
			success: true,
			data: newContent
		});
	} catch (error) {
		res.status(500).json({ error: '添加 AI 内容失败' });
	}
});

app.put('/api/admin/ai-content/:id', (req, res) => {
	try {
		const { id } = req.params;
		const { text, side, debate_id } = req.body;
		
		const index = aiDebateContent.findIndex(item => item.id === id);
		if (index === -1) {
			return res.status(404).json({ error: '内容不存�? });
		}
		
		if (text !== undefined) {
			aiDebateContent[index].text = text.trim();
		}
		if (side !== undefined) {
			if (side !== 'left' && side !== 'right') {
				return res.status(400).json({ error: 'side 必须�?"left" �?"right"' });
			}
			aiDebateContent[index].side = side;
		}
		if (debate_id !== undefined) {
			aiDebateContent[index].debate_id = debate_id;
		}
		
		// 广播内容更新
		broadcast('ai-content-updated', {
			content: aiDebateContent[index],
			updatedBy: 'admin'
		});
		
		res.json({
			success: true,
			data: aiDebateContent[index]
		});
	} catch (error) {
		res.status(500).json({ error: '更新 AI 内容失败' });
	}
});

app.delete('/api/admin/ai-content/:id', (req, res) => {
	try {
		const { id } = req.params;
		const index = aiDebateContent.findIndex(item => item.id === id);
		
		if (index === -1) {
			return res.status(404).json({ error: '内容不存�? });
		}
		
		const deletedContent = aiDebateContent.splice(index, 1)[0];
		
		// 广播内容删除
		broadcast('aiContentDeleted', {
			contentId: id,
			updatedBy: 'admin'
		});
		
		res.json({
			success: true,
			message: '删除成功',
			data: deletedContent
		});
	} catch (error) {
		res.status(500).json({ error: '删除 AI 内容失败' });
	}
});

// ==================== 后台管理 API 结束 ====================