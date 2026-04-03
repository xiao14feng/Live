// ── module: 04_admin_votes  |  original lines 1049–1148 of gateway.js ──
// ==================== 票数管理 API ====================
app.get('/api/admin/votes', (req, res) => {
	try {
		res.json({
			success: true,
			data: {
				leftVotes: currentVotes.leftVotes,
				rightVotes: currentVotes.rightVotes,
				totalVotes: currentVotes.leftVotes + currentVotes.rightVotes,
				leftPercentage: currentVotes.leftVotes + currentVotes.rightVotes > 0
					? Math.round((currentVotes.leftVotes / (currentVotes.leftVotes + currentVotes.rightVotes)) * 100)
					: 50,
				rightPercentage: currentVotes.leftVotes + currentVotes.rightVotes > 0
					? Math.round((currentVotes.rightVotes / (currentVotes.leftVotes + currentVotes.rightVotes)) * 100)
					: 50
			}
		});
	} catch (error) {
		res.status(500).json({ error: '获取票数失败' });
	}
});

app.put('/api/admin/votes', (req, res) => {
	try {
		const { leftVotes, rightVotes } = req.body;
		
		if (typeof leftVotes !== 'undefined' && typeof leftVotes !== 'number') {
			return res.status(400).json({ error: 'leftVotes 必须是数�? });
		}
		if (typeof rightVotes !== 'undefined' && typeof rightVotes !== 'number') {
			return res.status(400).json({ error: 'rightVotes 必须是数�? });
		}
		if ((typeof leftVotes !== 'undefined' && leftVotes < 0) || (typeof rightVotes !== 'undefined' && rightVotes < 0)) {
			return res.status(400).json({ error: '票数不能为负�? });
		}
		
		if (typeof leftVotes !== 'undefined') {
			currentVotes.leftVotes = leftVotes;
		}
		if (typeof rightVotes !== 'undefined') {
			currentVotes.rightVotes = rightVotes;
		}
		
		// 广播票数更新
		const totalVotes = currentVotes.leftVotes + currentVotes.rightVotes;
		broadcast('vote-updated', {
			votes: {
				leftVotes: currentVotes.leftVotes,
				rightVotes: currentVotes.rightVotes,
				totalVotes: totalVotes,
				leftPercentage: totalVotes > 0
					? Math.round((currentVotes.leftVotes / totalVotes) * 100)
					: 50,
				rightPercentage: totalVotes > 0
					? Math.round((currentVotes.rightVotes / totalVotes) * 100)
					: 50
			},
			updatedBy: 'admin'
		});
		
		res.json({
			success: true,
			data: {
				leftVotes: currentVotes.leftVotes,
				rightVotes: currentVotes.rightVotes,
				totalVotes: totalVotes
			}
		});
	} catch (error) {
		res.status(500).json({ error: '修改票数失败' });
	}
});

app.post('/api/admin/votes/reset', (req, res) => {
	try {
		currentVotes.leftVotes = 0;
		currentVotes.rightVotes = 0;
		
		// 广播票数重置
		broadcast('vote-updated', {
			votes: {
				leftVotes: 0,
				rightVotes: 0,
				totalVotes: 0,
				leftPercentage: 50,
				rightPercentage: 50
			},
			updatedBy: 'admin',
			action: 'reset'
		});
		
		res.json({
			success: true,
			message: '票数已重�?
		});
	} catch (error) {
		res.status(500).json({ error: '重置票数失败' });
	}
});
