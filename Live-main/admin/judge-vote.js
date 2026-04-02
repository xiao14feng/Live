/**
 * 评委/用户投票页面模块
 */

let currentVoteStreamId = null;
let currentVoteUser = null;
let voteStatus = {
	isAssignedJudge: false,
	hasVoted: false,
	votedSide: null,
	slot: null,
	judgeName: null
};

/**
 * 初始化投票页面
 */
function initJudgeVotePage() {
	console.log('🗳️ 初始化投票页面');
	
	// 获取当前登录用户
	currentVoteUser = getCurrentAdminUser();
	if (!currentVoteUser) {
		showNotification('请先登录', 'error');
		updateVoteStatusText('请先登录');
		updateVoteButtonsState(false);
		return;
	}
	
	// 兼容不同的用户ID字段名
	const userId = currentVoteUser.userId || currentVoteUser.openid || currentVoteUser.id || currentVoteUser.username;
	
	if (!userId) {
		showNotification('用户信息不完整，请重新登录', 'error');
		updateVoteStatusText('用户信息不完整，请重新登录');
		updateVoteButtonsState(false);
		return;
	}
	
	// 统一使用 userId 字段
	currentVoteUser.userId = userId;
	
	console.log('👤 当前用户信息:');
	console.log('   - 用户名:', currentVoteUser.username || '未设置');
	console.log('   - 角色:', currentVoteUser.role || '未设置');
	console.log('   - 用户ID:', userId);
	console.log('   - 完整信息:', currentVoteUser);
	
	// 在页面上显示当前用户ID（调试用）
	const statusText = document.getElementById('judge-vote-status-text');
	if (statusText) {
		statusText.innerHTML = `
			<div style="background: #e3f2fd; padding: 10px; border-radius: 4px; margin-bottom: 10px; font-size: 13px;">
				<strong>当前登录用户:</strong><br>
				用户名: ${currentVoteUser.username || userId}<br>
				角色: ${currentVoteUser.role || '未知'}<br>
				用户ID: <code style="background: #fff; padding: 2px 6px; border-radius: 3px;">${userId}</code>
			</div>
			<div style="color: #64748b;">正在加载直播流列表...</div>
		`;
	}
	
	// 加载直播流列表
	loadStreamsForVote();
	
	// 绑定事件
	bindVoteEvents();
	
	// 初始化按钮状态
	updateVoteButtonsState(false);
}

/**
 * 绑定投票页面事件
 */
function bindVoteEvents() {
	// 直播流选择
	const streamSelect = document.getElementById('judge-vote-stream-select');
	if (streamSelect && !streamSelect.dataset.voteBound) {
		streamSelect.addEventListener('change', handleVoteStreamChange);
		streamSelect.dataset.voteBound = 'true';
	}
	
	// 刷新流列表按钮
	const refreshBtn = document.getElementById('judge-vote-refresh-streams-btn');
	if (refreshBtn && !refreshBtn.dataset.voteBound) {
		refreshBtn.addEventListener('click', loadStreamsForVote);
		refreshBtn.dataset.voteBound = 'true';
	}
	
	// 投票按钮
	const leftBtn = document.getElementById('judge-vote-left-btn');
	const rightBtn = document.getElementById('judge-vote-right-btn');
	
	if (leftBtn && !leftBtn.dataset.voteBound) {
		leftBtn.addEventListener('click', () => submitVote('left'));
		leftBtn.dataset.voteBound = 'true';
	}
	
	if (rightBtn && !rightBtn.dataset.voteBound) {
		rightBtn.addEventListener('click', () => submitVote('right'));
		rightBtn.dataset.voteBound = 'true';
	}
}

/**
 * 加载直播流列表并检查每个流的投票状态
 */
async function loadStreamsForVote() {
	try {
		console.log('📡 加载直播流列表...');
		const result = await getStreamsList();
		
		let streams = [];
		if (Array.isArray(result)) {
			streams = result;
		} else if (result?.streams) {
			streams = result.streams;
		} else if (result?.data?.streams) {
			streams = result.data.streams;
		} else if (result?.data && Array.isArray(result.data)) {
			streams = result.data;
		}
		
		const select = document.getElementById('judge-vote-stream-select');
		if (!select) return;
		
		select.innerHTML = '<option value="">请选择要投票的直播流</option>';
		
		// 只显示已启用的流
		const enabledStreams = streams.filter(s => s.enabled);
		
		if (enabledStreams.length === 0) {
			select.innerHTML = '<option value="">暂无可用的直播流</option>';
			showNotification('暂无可用的直播流', 'warning');
			return;
		}
		
		// 检查当前用户信息
		if (!currentVoteUser) {
			showNotification('请先登录', 'error');
			return;
		}
		
		// 确保有userId
		const userId = currentVoteUser.userId || currentVoteUser.openid || currentVoteUser.id || currentVoteUser.username;
		if (!userId) {
			showNotification('用户信息不完整，请重新登录', 'error');
			return;
		}
		
		const userRole = (currentVoteUser.role || '').toLowerCase();
		console.log(`🔍 检查各个直播流的投票状态... (用户ID: ${userId}, 角色: ${userRole})`);
		console.log(`📋 将检查 ${enabledStreams.length} 个直播流:`, enabledStreams.map(s => s.name));
		
		// 为每个流检查投票状态
		const streamStatuses = await Promise.all(
			enabledStreams.map(async (stream) => {
				try {
					let url;
					// 根据角色使用不同的API
					if (userRole === 'judge') {
						// 评委：检查是否分配
						url = `${SERVER_CONFIG.BASE_URL}/api/v1/judge-vote/status?stream_id=${stream.id}&user_id=${userId}`;
					} else {
						// 用户：检查是否已投票
						url = `${SERVER_CONFIG.BASE_URL}/api/v1/user-votes?stream_id=${stream.id}&user_id=${userId}`;
					}
					
					console.log(`   检查流: ${stream.name} (${stream.id})`);
					
					const response = await fetch(url);
					if (response.ok) {
						const result = await response.json();
						console.log(`   ✓ ${stream.name}:`, result.data);
						
						// 统一返回格式
						if (userRole === 'judge') {
							return {
								stream,
								status: result.data || {}
							};
						} else {
							// 用户投票状态转换为统一格式
							const hasVoted = result.data?.hasVoted || false;
							const leftVotes = result.data?.totalLeftVotes || result.data?.leftVotes || 0;
							const rightVotes = result.data?.totalRightVotes || result.data?.rightVotes || 0;
							return {
								stream,
								status: {
									isAssignedJudge: true, // 用户不需要分配，默认可以投
									hasVoted: hasVoted,
									votedSide: hasVoted ? (leftVotes > 0 ? 'left' : 'right') : null,
									userId: userId
								}
							};
						}
					} else {
						console.warn(`   ✗ ${stream.name}: HTTP ${response.status}`);
					}
				} catch (error) {
					console.warn(`   ✗ ${stream.name}: ${error.message}`);
				}
				
				// 默认状态：用户可以投票，评委需要检查分配
				if (userRole === 'judge') {
					// 评委：默认不能投票（需要分配）
					return { 
						stream, 
						status: {
							isAssignedJudge: false,
							hasVoted: false,
							votedSide: null
						}
					};
				} else {
					// 用户：默认可以投票
					return { 
						stream, 
						status: {
							isAssignedJudge: true, // 用户默认可以投票
							hasVoted: false,
							votedSide: null
						}
					};
				}
			})
		);
		
		// 渲染选项
		let canVoteCount = 0;
		let votedCount = 0;
		let notAssignedCount = 0;
		
		streamStatuses.forEach(({ stream, status }) => {
			const option = document.createElement('option');
			option.value = stream.id;
			
			const isAssigned = status.isAssignedJudge === true;
			const hasVoted = status.hasVoted === true;
			
			// 根据状态设置选项文本和样式
			if (hasVoted) {
				const sideText = status.votedSide === 'left' ? '正方' : (status.votedSide === 'right' ? '反方' : '');
				option.textContent = `${stream.name} - 已投票${sideText ? '(' + sideText + ')' : ''}`;
				option.disabled = true;
				option.style.color = '#95a5a6';
				option.style.background = '#ecf0f1';
				votedCount++;
			} else if (!isAssigned && userRole === 'judge') {
				// 只有评委才会显示"未分配"
				option.textContent = `${stream.name} - 未分配评委`;
				option.disabled = true;
				option.style.color = '#95a5a6';
				option.style.background = '#ecf0f1';
				notAssignedCount++;
			} else {
				// 已分配且未投票 - 可以投票
				option.textContent = `${stream.name} ⭐ 待投票`;
				option.style.color = '#27ae60';
				option.style.fontWeight = '600';
				canVoteCount++;
			}
			
			select.appendChild(option);
		});
		
		console.log(`✅ 加载了 ${enabledStreams.length} 个直播流`);
		console.log(`   - 可投票: ${canVoteCount} 个`);
		console.log(`   - 已投票: ${votedCount} 个`);
		console.log(`   - 未分配: ${notAssignedCount} 个`);
		
		// 更新状态文本
		const statusText = document.getElementById('judge-vote-status-text');
		if (statusText) {
			const roleText = userRole === 'judge' ? '评委' : '观众';
			statusText.innerHTML = `
				<div style="background: #e3f2fd; padding: 10px; border-radius: 4px; margin-bottom: 10px; font-size: 13px;">
					<strong>当前登录用户:</strong><br>
					用户名: ${currentVoteUser.username || userId}<br>
					角色: ${roleText}<br>
					用户ID: <code style="background: #fff; padding: 2px 6px; border-radius: 3px;">${userId}</code>
				</div>
				<div style="padding: 10px; background: ${canVoteCount > 0 ? '#d4edda' : '#fff3cd'}; border-radius: 4px; font-size: 13px;">
					<strong>投票状态:</strong><br>
					✅ 可投票: ${canVoteCount} 个<br>
					⏸️ 已投票: ${votedCount} 个<br>
					${userRole === 'judge' ? `❌ 未分配: ${notAssignedCount} 个` : ''}
				</div>
				${canVoteCount === 0 ? `<div style="margin-top: 10px; color: #e74c3c; font-weight: 600;">⚠️ ${userRole === 'judge' ? '您没有可投票的直播流，请联系管理员分配评委席位' : '您已投过票或暂无可投票的直播流'}</div>` : '<div style="margin-top: 10px; color: #27ae60;">请从上方下拉框选择直播流进行投票</div>'}
			`;
		}
		
		// 如果没有可投票的流，显示提示
		if (canVoteCount === 0) {
			const msg = userRole === 'judge' ? '您没有可投票的直播流，请联系管理员分配评委席位' : '您已投过票或暂无可投票的直播流';
			showNotification(msg, 'warning');
		}
	} catch (error) {
		console.error('❌ 加载直播流列表失败:', error);
		showNotification('加载直播流列表失败', 'error');
	}
}

/**
 * 处理直播流选择变化
 */
async function handleVoteStreamChange(e) {
	const streamId = e.target.value;
	currentVoteStreamId = streamId;
	
	if (!streamId) {
		hideTodoBox();
		updateVoteStatusText('请选择直播流后再投票');
		updateVoteButtonsState(false);
		return;
	}
	
	console.log(`🎯 选择了直播流: ${streamId}`);
	
	// 查询当前用户在该流的投票状态
	await checkVoteStatus(streamId);
}

/**
 * 检查投票状态
 */
async function checkVoteStatus(streamId) {
	if (!currentVoteUser) {
		showNotification('请先登录', 'error');
		return;
	}
	
	// 获取用户ID和角色
	const userId = currentVoteUser.userId || currentVoteUser.openid || currentVoteUser.id || currentVoteUser.username;
	if (!userId) {
		showNotification('用户信息不完整，请重新登录', 'error');
		return;
	}
	
	const userRole = (currentVoteUser.role || '').toLowerCase();
	
	try {
		console.log(`🔍 查询投票状态: streamId=${streamId}, userId=${userId}, role=${userRole}`);
		
		let response, result;
		
		if (userRole === 'judge') {
			// 评委：查询评委投票状态
			response = await fetch(
				`${SERVER_CONFIG.BASE_URL}/api/v1/judge-vote/status?stream_id=${streamId}&user_id=${userId}`
			);
		} else {
			// 用户：查询用户投票状态
			response = await fetch(
				`${SERVER_CONFIG.BASE_URL}/api/v1/user-votes?stream_id=${streamId}&user_id=${userId}`
			);
		}
		
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}
		
		result = await response.json();
		console.log('📊 投票状态:', result);
		
		if (result.success && result.data) {
			if (userRole === 'judge') {
				// 评委状态
				voteStatus = result.data;
				updateUIBasedOnStatus(result.data);
			} else {
				// 用户状态 - 转换为统一格式
				const hasVoted = result.data.hasVoted || false;
				const leftVotes = result.data.totalLeftVotes || result.data.leftVotes || 0;
				const rightVotes = result.data.totalRightVotes || result.data.rightVotes || 0;
				
				voteStatus = {
					isAssignedJudge: true, // 用户默认可以投票
					hasVoted: hasVoted,
					votedSide: hasVoted ? (leftVotes > 0 ? 'left' : 'right') : null,
					userId: userId
				};
				updateUIBasedOnStatus(voteStatus);
			}
		} else {
			throw new Error(result.message || '查询失败');
		}
	} catch (error) {
		console.error('❌ 查询投票状态失败:', error);
		showNotification('查询投票状态失败', 'error');
		updateVoteStatusText('查询状态失败，请刷新重试');
		updateVoteButtonsState(false);
	}
}

/**
 * 根据状态更新UI
 */
function updateUIBasedOnStatus(status) {
	const { isAssignedJudge, hasVoted, votedSide, slot, judgeName, todoRequired } = status;
	const userRole = (currentVoteUser?.role || '').toLowerCase();
	
	// 更新待办提示框
	if (todoRequired && userRole === 'judge') {
		showTodoBox(`您是评委席位 ${slot} (${judgeName || ''}), 请尽快投票！`);
	} else {
		hideTodoBox();
	}
	
	// 更新状态文本
	if (!isAssignedJudge && userRole === 'judge') {
		// 评委未分配
		updateVoteStatusText('您不是该直播流的评委，无法投票');
		updateVoteButtonsState(false);
	} else if (hasVoted) {
		// 已投票
		const sideText = votedSide === 'left' ? '正方' : '反方';
		updateVoteStatusText(`您已投票给 ${sideText}，不能重复投票`);
		updateVoteButtonsState(false);
		highlightVotedButton(votedSide);
	} else {
		// 可以投票
		if (userRole === 'judge') {
			updateVoteStatusText(`您是评委席位 ${slot}，请选择投票方向`);
		} else {
			updateVoteStatusText('请选择投票方向');
		}
		updateVoteButtonsState(true);
	}
}

/**
 * 显示待办提示框
 */
function showTodoBox(message) {
	const todoBox = document.getElementById('judge-vote-todo-box');
	if (todoBox) {
		todoBox.innerHTML = `
			<div style="display: flex; align-items: center; gap: 10px;">
				<span class="iconfont icon-warning" style="font-size: 20px; color: #f39c12;"></span>
				<div>
					<strong style="color: #856404;">待办事项</strong>
					<div style="margin-top: 4px; color: #856404;">${message}</div>
				</div>
			</div>
		`;
		todoBox.style.display = 'block';
	}
}

/**
 * 隐藏待办提示框
 */
function hideTodoBox() {
	const todoBox = document.getElementById('judge-vote-todo-box');
	if (todoBox) {
		todoBox.style.display = 'none';
	}
}

/**
 * 更新状态文本
 */
function updateVoteStatusText(text) {
	const statusText = document.getElementById('judge-vote-status-text');
	if (statusText) {
		statusText.textContent = text;
	}
}

/**
 * 更新投票按钮状态
 */
function updateVoteButtonsState(enabled) {
	const leftBtn = document.getElementById('judge-vote-left-btn');
	const rightBtn = document.getElementById('judge-vote-right-btn');
	
	if (leftBtn) {
		leftBtn.disabled = !enabled;
		leftBtn.style.opacity = enabled ? '1' : '0.5';
		leftBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
	}
	
	if (rightBtn) {
		rightBtn.disabled = !enabled;
		rightBtn.style.opacity = enabled ? '1' : '0.5';
		rightBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
	}
}

/**
 * 高亮已投票的按钮
 */
function highlightVotedButton(side) {
	const leftBtn = document.getElementById('judge-vote-left-btn');
	const rightBtn = document.getElementById('judge-vote-right-btn');
	
	if (side === 'left' && leftBtn) {
		leftBtn.style.background = '#27ae60';
		leftBtn.style.border = '2px solid #1e8449';
		leftBtn.innerHTML = '✓ 已投给正方';
	} else if (side === 'right' && rightBtn) {
		rightBtn.style.background = '#2980b9';
		rightBtn.style.border = '2px solid #1f618d';
		rightBtn.innerHTML = '✓ 已投给反方';
	}
}

/**
 * 提交投票
 */
async function submitVote(side) {
	if (!currentVoteStreamId) {
		showNotification('请先选择直播流', 'warning');
		return;
	}
	
	if (!currentVoteUser) {
		showNotification('请先登录', 'error');
		return;
	}
	
	// 获取用户ID和角色
	const userId = currentVoteUser.userId || currentVoteUser.openid || currentVoteUser.id || currentVoteUser.username;
	if (!userId) {
		showNotification('用户信息不完整，请重新登录', 'error');
		return;
	}
	
	const userRole = (currentVoteUser.role || '').toLowerCase();
	
	// 二次确认
	const sideText = side === 'left' ? '正方' : '反方';
	const confirmed = confirm(`确认投票给 ${sideText} 吗？\n\n投票后不能修改！`);
	if (!confirmed) {
		return;
	}
	
	try {
		console.log(`🗳️ 提交投票: streamId=${currentVoteStreamId}, userId=${userId}, side=${side}, role=${userRole}`);
		
		// 禁用按钮，防止重复提交
		updateVoteButtonsState(false);
		updateVoteStatusText('正在提交投票...');
		
		let response, result;
		
		if (userRole === 'judge') {
			// 评委投票
			response = await fetch(`${SERVER_CONFIG.BASE_URL}/api/v1/judge-vote`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					stream_id: currentVoteStreamId,
					user_id: userId,
					side: side
				})
			});
		} else {
			// 用户投票
			response = await fetch(`${SERVER_CONFIG.BASE_URL}/api/v1/user-vote`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					request: {
						streamId: currentVoteStreamId,
						userId: userId,
						leftVotes: side === 'left' ? 1 : 0,
						rightVotes: side === 'right' ? 1 : 0
					}
				})
			});
		}
		
		result = await response.json();
		console.log('📊 投票结果:', result);
		
		if (response.ok && result.success) {
			showNotification(`投票成功！您投给了${sideText}`, 'success');
			
			// 更新状态
			voteStatus.hasVoted = true;
			voteStatus.votedSide = side;
			
			// 更新UI
			updateVoteStatusText(`您已投票给 ${sideText}，不能重复投票`);
			highlightVotedButton(side);
			hideTodoBox();
			
			// 通知其他页面更新（如果有WebSocket）
			if (typeof notifyVotesUpdate === 'function') {
				notifyVotesUpdate(currentVoteStreamId);
			}
		} else {
			throw new Error(result.message || '投票失败');
		}
	} catch (error) {
		console.error('❌ 投票失败:', error);
		showNotification(error.message || '投票失败，请重试', 'error');
		
		// 重新检查状态
		await checkVoteStatus(currentVoteStreamId);
	}
}

/**
 * 通知投票更新（可选，用于WebSocket推送）
 */
function notifyVotesUpdate(streamId) {
	console.log(`📢 通知投票更新: streamId=${streamId}`);
	// 如果有WebSocket连接，可以在这里发送消息
	if (window.ws && window.ws.readyState === WebSocket.OPEN) {
		try {
			window.ws.send(JSON.stringify({
				type: 'vote-updated',
				streamId: streamId
			}));
		} catch (error) {
			console.warn('WebSocket发送失败:', error);
		}
	}
}

/**
 * 显示通知（使用全局通知函数或alert）
 */
function showNotification(message, type = 'info') {
	console.log(`📢 [${type.toUpperCase()}] ${message}`);
	
	// 如果全局有 showNotification 函数,使用它
	if (typeof window.showNotification === 'function' && window.showNotification !== showNotification) {
		window.showNotification(message, type);
		return;
	}
	
	// 否则使用简单的alert
	const icons = {
		success: '✅',
		error: '❌',
		warning: '⚠️',
		info: 'ℹ️'
	};
	alert(`${icons[type] || ''} ${message}`);
}

// 导出函数到全局
if (typeof window !== 'undefined') {
	window.initJudgeVotePage = initJudgeVotePage;
	window.submitVote = submitVote;
	window.checkVoteStatus = checkVoteStatus;
}
