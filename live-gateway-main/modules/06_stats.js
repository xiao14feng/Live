// ── module: 06_stats  |  original lines 1969–2113 of gateway.js ──

// ==================== 统计 API（只读） ====================
app.get('/api/admin/statistics/summary', (req, res) => {
    try {
        
        const stats = { totalVotes: 0, dailyStats: [] };
        const users = [] /* use backend API */;
        const streams = [] /* use backend API */;
        const totalVotes = stats.totalVotes || 0;
        const totalUsers = users.length;
        const totalStreams = streams.length;
        const totalLiveDays = Array.isArray(stats.dailyStats) ? stats.dailyStats.length : 0;
        res.json({
            success: true,
            data: {
                totalVotes,
                totalUsers,
                totalStreams,
                totalLiveDays
            }
        });
    } catch (error) {
        res.status(500).json({ error: '获取统计汇总失�? });
    }
});

app.get('/api/admin/statistics/daily', (req, res) => {
    try {
        
        const stats = { totalVotes: 0, dailyStats: [] };
        const daily = Array.isArray(stats.dailyStats) ? stats.dailyStats : [];
        res.json({ success: true, data: daily });
    } catch (error) {
        res.status(500).json({ error: '获取每日统计失败' });
    }
});

// v1版本：支持按stream_id查询
app.get('/api/v1/admin/dashboard', async (req, res) => {
	try {
		const streamId = req.query.stream_id;
		
		if (!streamId) {
			return res.status(400).json({
				success: false,
				message: '缺少 stream_id 参数'
			});
		}
		
		// 从后端获取该流的投票数据
		const response = await fetch(`${BACKEND_BASE_URL}/api/v1/votes?stream_id=${streamId}`);
		const voteData = await response.json();
		
		
		const users = [] /* use backend API */;
		const debate = { title: '', leftPosition: '', rightPosition: '' } /* use backend API */;
		const streams = [] /* use backend API */;
		const stream = streams.find(s => s.id === streamId);
		
		const leftVotes = voteData.data?.leftVotes || 0;
		const rightVotes = voteData.data?.rightVotes || 0;
		const totalVotes = leftVotes + rightVotes;
		const leftPercentage = totalVotes > 0 ? Math.round((leftVotes / totalVotes) * 100) : 50;
		const rightPercentage = totalVotes > 0 ? Math.round((rightVotes / totalVotes) * 100) : 50;
		
		// 检查该流是否正在直�?
		const isLive = globalLiveStatus.isLive && globalLiveStatus.streamId === streamId;
		
		// 计算直播时长
		let liveDuration = 0;
		if (isLive && globalLiveStatus.startTime) {
			const startTime = new Date(globalLiveStatus.startTime);
			liveDuration = Math.floor((Date.now() - startTime.getTime()) / 1000);
		}
		
		const data = {
			totalUsers: users.length,
			activeUsers: wsClients.size,
			isLive: isLive,
			liveStreamUrl: stream ? stream.url : null,
			streamId: streamId,
			streamName: stream ? stream.name : null,
			totalVotes: totalVotes,
			leftVotes: leftVotes,
			rightVotes: rightVotes,
			leftPercentage: leftPercentage,
			rightPercentage: rightPercentage,
			totalComments: 0,
			totalLikes: 0,
			aiStatus: globalAIStatus.status,
			debateTopic: {
				title: debate.title,
				leftSide: debate.leftPosition,
				rightSide: debate.rightPosition,
				description: debate.description
			},
			liveStartTime: isLive ? globalLiveStatus.startTime : null,
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

// 获取所有流的观看人�?
app.get('/api/v1/admin/live/viewers', (req, res) => {
	try {
		
		const streams = [] /* use backend API */;
		
		// 返回所有流的观看人数（目前简化为返回WebSocket连接数）
		const viewers = streams.map(stream => ({
			streamId: stream.id,
			streamName: stream.name,
			viewerCount: stream.id === globalLiveStatus.streamId ? wsClients.size : 0,
			isLive: stream.id === globalLiveStatus.streamId && globalLiveStatus.isLive
		}));
		
		res.json({
			success: true,
			data: {
				viewers: viewers,
				totalViewers: wsClients.size
			}
		});
	} catch (error) {
		console.error('获取观看人数失败:', error);
		res.status(500).json({
			success: false,
			message: '获取观看人数失败: ' + error.message
		});
	}
});
