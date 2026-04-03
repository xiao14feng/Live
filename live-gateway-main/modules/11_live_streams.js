// ── module: 11_live_streams  |  original lines 3696–4027 of gateway.js ──
// ==================== 直播流管理接�?====================

// 获取所有直播流列表
/**
 * 生成播放地址（playUrls�?
 * 根据流类型自动生�?HLS、FLV、RTMP 播放地址
 */
function generatePlayUrls(stream) {
	const playUrls = {
		hls: null,
		flv: null,
		rtmp: null
	};
	
	try {
		// 获取服务器IP地址（用于生成转换后的播放地址�?
		const serverIP = process.env.SERVER_IP || '192.168.31.249';
		const hlsServerPort = process.env.HLS_SERVER_PORT || '8086';
		const rtmpServerPort = process.env.RTMP_SERVER_PORT || '1935';
		
		// 从原URL中提取流名称（用于RTMP转HLS�?
		const getStreamName = (url) => {
			try {
				const urlObj = new URL(url);
				const path = urlObj.pathname;
				// 提取路径的最后一部分作为流名�?
				// 例如: rtmp://localhost/live/stream1 -> stream1
				const parts = path.split('/').filter(p => p);
				return parts[parts.length - 1] || 'stream';
			} catch (e) {
				// 如果URL解析失败，尝试从字符串中提取
				const match = url.match(/([^\/]+)(?:\.[^\.]+)?$/);
				return match ? match[1] : 'stream';
			}
		};
		
		switch (stream.type) {
			case 'hls':
				// HLS流直接使用原地址
				playUrls.hls = stream.url;
				// 尝试从HLS地址生成FLV地址（如果可能）
				if (stream.url.includes('.m3u8')) {
					playUrls.flv = stream.url.replace('.m3u8', '.flv');
				}
				break;
				
			case 'rtmp':
				// RTMP流需要转换为HLS
				const streamName = getStreamName(stream.url);
				// 生成HLS播放地址（通过流媒体服务器转换�?
				playUrls.hls = `http://${serverIP}:${hlsServerPort}/live/${streamName}.m3u8`;
				playUrls.flv = `http://${serverIP}:${hlsServerPort}/live/${streamName}.flv`;
				playUrls.rtmp = stream.url.replace('localhost', serverIP).replace(/^rtmp:\/\//, `rtmp://${serverIP}:${rtmpServerPort}/`);
				break;
				
			case 'flv':
				// FLV�?
				playUrls.flv = stream.url;
				// 尝试从FLV地址生成HLS地址
				if (stream.url.includes('.flv')) {
					const streamName = getStreamName(stream.url);
					playUrls.hls = `http://${serverIP}:${hlsServerPort}/live/${streamName}.m3u8`;
				}
				break;
				
			default:
				// 未知类型，尝试使用原地址
				playUrls.hls = stream.url;
				break;
		}
		
		// 确保至少有一个播放地址
		if (!playUrls.hls && stream.url) {
			playUrls.hls = stream.url;
		}
		
	} catch (error) {
		console.error('生成播放地址失败:', error);
		// 如果生成失败，至少使用原URL作为HLS地址
		playUrls.hls = stream.url;
	}
	
	return playUrls;
}

app.get('/api/admin/streams', (req, res) => {
	try {
		const streams = [] /* use backend API */;
		
		// 为每个流添加直播状态和播放地址
		const streamsWithStatus = streams.map(stream => {
			const status = streamLiveStatuses[stream.id] || { isLive: false };
			
			// 生成播放地址（playUrls�?
			const playUrls = generatePlayUrls(stream);
			
			return {
				...stream,
				// �?新增：播放地址字段
				playUrls: playUrls,
				liveStatus: {
					isLive: status.isLive || false,
					liveId: status.liveId || null,
					startTime: status.startTime || null,
					stopTime: status.stopTime || null,
					streamUrl: status.streamUrl || stream.url
				}
			};
		});
		
		res.json({
			success: true,
			data: {
				streams: streamsWithStatus,
				total: streams.length
			},
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('获取直播流列表失�?', error);
		res.status(500).json({
			success: false,
			message: '获取直播流列表失�? ' + error.message
		});
	}
});

// 添加新的直播�?
app.post('/api/admin/streams', (req, res) => {
	try {
		const { name, url, type, description, enabled } = req.body;
		
		// 参数验证
		if (!name || !url || !type) {
			return res.status(400).json({
				success: false,
				message: '缺少必要参数: name, url, type 必填'
			});
		}
		
		// 验证URL格式
		try {
			new URL(url);
		} catch (e) {
			return res.status(400).json({
				success: false,
				message: '流地址格式不正确，请输入有效的URL'
			});
		}
		
		// 验证type
		if (!['hls', 'rtmp', 'flv'].includes(type)) {
			return res.status(400).json({
				success: false,
				message: 'type 必须�?hls, rtmp �?flv'
			});
		}
		
		// 创建新流
		const newStream = {
			id: `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			name: name.trim(),
			url: url.trim(),
			type,
			description: description ? description.trim() : '',
			enabled: enabled !== false, // 默认启用
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		
		// 保存到数据库
		db.streams.add(newStream);
		
		console.log('�?新增直播�?', newStream.name, newStream.url);
		
		res.json({
			success: true,
			data: newStream,
			message: '直播流添加成�?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('添加直播流失�?', error);
		res.status(500).json({
			success: false,
			message: '添加直播流失�? ' + error.message
		});
	}
});

// 更新直播�?
app.put('/api/admin/streams/:id', (req, res) => {
	try {
		const streamId = req.params.id; // 统一使用 :id 参数�?
		const { name, url, type, description, enabled } = req.body;
		
		// 查找�?
		const stream = null /* use backend API */;
		if (!stream) {
			return res.status(404).json({
				success: false,
				message: '直播流不存在'
			});
		}
		
		// 验证URL格式（如果有更新�?
		if (url) {
			try {
				new URL(url);
			} catch (e) {
				return res.status(400).json({
					success: false,
					message: '流地址格式不正确，请输入有效的URL'
				});
			}
		}
		
		// 验证type（如果有更新�?
		if (type && !['hls', 'rtmp', 'flv'].includes(type)) {
			return res.status(400).json({
				success: false,
				message: 'type 必须�?hls, rtmp �?flv'
			});
		}
		
		// 更新字段
		const updates = {};
		if (name !== undefined) updates.name = name.trim();
		if (url !== undefined) updates.url = url.trim();
		if (type !== undefined) updates.type = type;
		if (description !== undefined) updates.description = description.trim();
		if (enabled !== undefined) updates.enabled = enabled;
		updates.updatedAt = new Date().toISOString();
		
		// 保存更新
		const updatedStream = db.streams.update(streamId, updates);
		
		console.log('�?更新直播�?', streamId, updates);
		
		res.json({
			success: true,
			data: updatedStream,
			message: '直播流更新成�?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('更新直播流失�?', error);
		res.status(500).json({
			success: false,
			message: '更新直播流失�? ' + error.message
		});
	}
});

// 删除直播�?
app.delete('/api/admin/streams/:id', (req, res) => {
	try {
		const streamId = req.params.id; // 统一使用 :id 参数�?
		
		// 查找�?
		const stream = null /* use backend API */;
		if (!stream) {
			return res.status(404).json({
				success: false,
				message: '直播流不存在'
			});
		}
		
		// 检查是否正在使�?
		if (globalLiveStatus && globalLiveStatus.streamId === streamId) {
			return res.status(400).json({
				success: false,
				message: '该直播流正在使用中，请先停止直播'
			});
		}
		
		// 删除
		db.streams.delete(streamId);
		
		console.log('�?删除直播�?', streamId, stream.name);
		
		res.json({
			success: true,
			data: {
				id: streamId,
				name: stream.name
			},
			message: '直播流删除成�?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('删除直播流失�?', error);
		res.status(500).json({
			success: false,
			message: '删除直播流失�? ' + error.message
		});
	}
});

// 启动服务�?
server.listen(port, '0.0.0.0', () => {
    console.log('');
    printConfig();
    console.log(`辩题: ${debateTopic.title}`);
    console.log(`状�? �?服务器运行中`);
    if (wss) {
        console.log(`🌐 WebSocket 服务已启�? ws://localhost:${port}/ws`);
    }
    console.log('══════════════════════════════════════�?);
    console.log('');
    
    // 只在模拟模式下启动模拟数�?
    if (currentConfig.mode === 'mock') {
        simulateVoteChanges();
        simulateNewAIContent();
        console.log('🤖 模拟数据生成器已启动');
    }
    
    // 启动直播计划检�?
    startScheduleCheck();
    console.log('�?直播计划定时检查已启动');
});

module.exports = app;



