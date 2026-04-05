/**
 * 评委管理模块
 */

let currentJudgeIndex = null;
let currentStreamId = null;
let judgesData = [
	{ id: 'judge-slot-1', slot: 1, userId: null, name: '', role: '', avatar: '', votes: 0 },
	{ id: 'judge-slot-2', slot: 2, userId: null, name: '', role: '', avatar: '', votes: 0 },
	{ id: 'judge-slot-3', slot: 3, userId: null, name: '', role: '', avatar: '', votes: 0 }
];

function initJudgesManagement() {
	loadStreamsForJudges();
	bindJudgesEvents();
	renderJudgeSelectionSlots();
	renderVotesTable();
}

function bindJudgesEvents() {
	const streamSelect = document.getElementById('judges-stream-select');
	if (streamSelect && !streamSelect.dataset.bound) {
		streamSelect.addEventListener('change', handleStreamChange);
		streamSelect.dataset.bound = 'true';
	}

	const refreshBtn = document.getElementById('judges-refresh-streams-btn');
	if (refreshBtn && !refreshBtn.dataset.bound) {
		refreshBtn.addEventListener('click', loadStreamsForJudges);
		refreshBtn.dataset.bound = 'true';
	}

	const saveBtn = document.getElementById('save-judges-btn');
	if (saveBtn && !saveBtn.dataset.bound) {
		saveBtn.addEventListener('click', saveJudgesData);
		saveBtn.dataset.bound = 'true';
	}

	const closeModalBtn = document.getElementById('close-user-modal');
	if (closeModalBtn && !closeModalBtn.dataset.bound) {
		closeModalBtn.addEventListener('click', closeUserSelectionModal);
		closeModalBtn.dataset.bound = 'true';
	}

	const modal = document.getElementById('select-user-modal');
	if (modal && !modal.dataset.bound) {
		modal.addEventListener('click', (e) => {
			if (e.target === modal) closeUserSelectionModal();
		});
		modal.dataset.bound = 'true';
	}

	const userSearch = document.getElementById('modal-user-search');
	if (userSearch && !userSearch.dataset.bound) {
		userSearch.placeholder = '输入评委昵称或用户ID快速筛选...';
		userSearch.addEventListener('input', (e) => filterUsers(e.target.value));
		userSearch.dataset.bound = 'true';
	}
}

async function loadStreamsForJudges() {
	try {
		const result = await getStreamsList();
		let streams = [];
		if (Array.isArray(result)) streams = result;
		else if (result?.streams) streams = result.streams;
		else if (result?.data?.streams) streams = result.data.streams;
		else if (result?.data && Array.isArray(result.data)) streams = result.data;

		const select = document.getElementById('judges-stream-select');
		if (!select) return;

		select.innerHTML = '<option value="">请选择要管理的直播流</option>';
		streams.filter(s => s.enabled).forEach(stream => {
			const option = document.createElement('option');
			option.value = stream.id;
			option.textContent = `${stream.name} (${(stream.type || 'hls').toUpperCase()})`;
			select.appendChild(option);
		});
	} catch (error) {
		console.error('❌ 加载直播流列表失败:', error);
		showNotification('加载直播流列表失败', 'error');
	}
}

function handleStreamChange(e) {
	const streamId = e.target.value;
	currentStreamId = streamId;

	const selectedOption = e.target.options[e.target.selectedIndex];
	const streamName = selectedOption ? selectedOption.textContent : '-';
	const infoDiv = document.getElementById('judges-current-stream-info');
	const nameSpan = document.getElementById('judges-current-stream-name');

	if (streamId && infoDiv && nameSpan) {
		nameSpan.textContent = streamName;
		infoDiv.style.display = 'block';
	} else if (infoDiv) {
		infoDiv.style.display = 'none';
	}

	if (streamId) {
		// 检查辩题
		const API_BASE = window.SERVER_CONFIG?.BASE_URL || 'https://determined-ambition-production-a3c3.up.railway.app';
		fetch(`${API_BASE}/api/v1/admin/streams/${streamId}/debate`)
			.then(r => r.json())
			.then(data => {
				if (!data.hasDebate) {
					if (typeof showToast === 'function') showToast('该直播间尚未设置辩题，请先在"直播流管理"中创建辩题后再管理评委', 'warning');
					e.target.value = '';
					currentStreamId = null;
					if (infoDiv) infoDiv.style.display = 'none';
					return;
				}
				loadJudgesDataForStream(streamId);
			})
			.catch(() => loadJudgesDataForStream(streamId));
	}
}

async function loadJudgesDataForStream(streamId) {
	try {
		console.log(`📡 加载评委数据: streamId=${streamId}`);
		
		// 从后端加载评委分配数据
		const response = await fetch(`${SERVER_CONFIG.BASE_URL}/api/v1/admin/judges?stream_id=${streamId}`);
		const result = await response.json();
		
		if (response.ok && result.success && result.data) {
			const { judges, judgeVotes } = result.data;
			
			// 更新本地数据
			if (judges && judges.length === 3) {
				judgesData = judges.map((j, index) => ({
					id: `judge-slot-${index + 1}`,
					slot: j.slot || (index + 1),
					userId: j.userId || null,
					name: j.name || '',
					role: j.role || 'judge',
					avatar: j.avatar || '',
					votes: j.votes || 0
				}));
			}
			
			console.log('✅ 评委数据加载成功:', judgesData);
		}
		
		renderJudgeSelectionSlots();
		renderVotesTable();
		
		// 加载评委投票结果
		await loadJudgeVoteResults();
	} catch (error) {
		console.error('❌ 加载评委数据失败:', error);
		showNotification('加载评委数据失败', 'error');
	}
}

function renderJudgeSelectionSlots() {
	const slotCards = document.querySelectorAll('.judge-slot-card');
	slotCards.forEach((card, index) => {
		const judge = judgesData[index] || {};
		const status = card.querySelector('span');
		const avatar = card.querySelector('.judge-avatar-preview');
		const nameText = card.querySelector('.judge-name-text');
		const userIdText = card.querySelector('.judge-userid-text');
		const roleText = card.querySelector('.judge-role-text');
		const selectBtn = card.querySelector('.select-from-users-btn');

		if (status) status.textContent = judge.userId ? '已选择' : '未选择';
		if (avatar) avatar.style.backgroundImage = judge.avatar ? `url('${judge.avatar}')` : 'none';
		if (nameText) nameText.textContent = judge.name || '-';
		if (userIdText) userIdText.textContent = judge.userId || '-';
		if (roleText) roleText.textContent = judge.role || '-';

		if (selectBtn && !selectBtn.dataset.bound) {
			selectBtn.addEventListener('click', () => openUserSelectionModal(index));
			selectBtn.dataset.bound = 'true';
		}
	});
}

function renderVotesTable() {
	const tbody = document.getElementById('judges-votes-table-body');
	if (!tbody) return;

	tbody.innerHTML = judgesData.map((judge, index) => `
		<div style="display: grid; grid-template-columns: 1fr 1fr 150px; padding: 12px 14px; border-bottom: 1px solid #eef2f7; align-items: center;">
			<div style="font-weight: 600; color: #334155;">评委席位 ${index + 1}</div>
			<div style="color: #0f172a;">${judge.name || '未选择'}</div>
			<div>
				<input type="number" class="form-input judge-votes-input" data-judge-index="${index}" value="${Number(judge.votes || 0)}" min="0" style="width: 120px; padding: 6px 10px;">
			</div>
		</div>
	`).join('');
}

async function openUserSelectionModal(judgeIndex) {
	currentJudgeIndex = judgeIndex;
	const modal = document.getElementById('select-user-modal');
	if (modal) {
		modal.style.display = 'flex';
		await loadUsersForSelection();
	}
}

function closeUserSelectionModal() {
	const modal = document.getElementById('select-user-modal');
	if (modal) modal.style.display = 'none';
	currentJudgeIndex = null;
}

async function loadUsersForSelection() {
	try {
		const result = await fetchUserList(1, 100, {});
		const users = (result?.users || []).filter(user => String(user.role || '').toLowerCase() === 'judge');
		renderUsersList(users);
	} catch (error) {
		console.error('❌ 加载用户列表失败:', error);
		const listDiv = document.getElementById('modal-users-list');
		if (listDiv) listDiv.innerHTML = '<div style="text-align: center; padding: 40px; color: #e74c3c;">加载失败,请重试</div>';
	}
}

function renderUsersList(users) {
	const listDiv = document.getElementById('modal-users-list');
	if (!listDiv) return;

	if (!users || users.length === 0) {
		listDiv.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">暂无评委用户数据</div>';
		return;
	}

	listDiv.innerHTML = `
		<div style="border: 1px solid #e9ecef; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 6px 20px rgba(15, 23, 42, 0.06);">
			<div style="display: grid; grid-template-columns: 80px 1.4fr 1.6fr 0.8fr 110px; gap: 0; padding: 14px 16px; background: linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%); border-bottom: 1px solid #dbe7f3; font-size: 13px; font-weight: 700; color: #486581;">
				<div>头像</div>
				<div>昵称</div>
				<div>用户 ID</div>
				<div>角色</div>
				<div style="text-align: center;">操作</div>
			</div>
			<div>
				${users.map(user => {
					const userId = user.userId || user.id || '';
					const nickname = user.nickname || user.nickName || user.name || '未命名评委';
					const avatar = user.avatarUrl || user.avatar || '/static/default-avatar.png';
					const role = String(user.role || 'judge').toLowerCase();
					return `
						<div class="user-select-item" data-user-id="${userId}" style="display: grid; grid-template-columns: 80px 1.4fr 1.6fr 0.8fr 110px; align-items: center; gap: 0; padding: 14px 16px; border-bottom: 1px solid #eef2f7; cursor: pointer; transition: background 0.2s ease, transform 0.2s ease;">
							<div><img src="${avatar}" alt="${nickname}" style="width: 46px; height: 46px; border-radius: 50%; object-fit: cover; border: 2px solid #e9eef5; background: #f8fafc;"></div>
							<div style="font-weight: 600; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 12px;">${nickname}</div>
							<div style="font-size: 12px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 12px;">${userId}</div>
							<div><span style="display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; background: #e0f2fe; color: #0369a1; font-size: 12px; font-weight: 700;">${role}</span></div>
							<div style="text-align: center;"><button class="btn btn-sm btn-primary select-this-user-btn" style="padding: 6px 14px; min-width: 72px;">选择</button></div>
						</div>
					`;
				}).join('')}
			</div>
		</div>
	`;

	listDiv.querySelectorAll('.select-this-user-btn').forEach(btn => {
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			const item = btn.closest('.user-select-item');
			const userId = item.dataset.userId;
			const user = users.find(u => String(u.userId || u.id || '') === String(userId));
			if (user) selectUserAsJudge(user);
		});
	});

	listDiv.querySelectorAll('.user-select-item').forEach(item => {
		item.addEventListener('mouseenter', () => {
			item.style.background = '#f8fbff';
			item.style.transform = 'translateX(2px)';
		});
		item.addEventListener('mouseleave', () => {
			item.style.background = 'transparent';
			item.style.transform = 'translateX(0)';
		});
		item.addEventListener('click', () => {
			const userId = item.dataset.userId;
			const user = users.find(u => String(u.userId || u.id || '') === String(userId));
			if (user) selectUserAsJudge(user);
		});
	});
}

function selectUserAsJudge(user) {
	if (currentJudgeIndex === null) return;
	const judgeName = user.nickname || user.nickName || user.name || `评委${currentJudgeIndex + 1}`;
	const judgeAvatar = user.avatarUrl || user.avatar || '';
	const judgeUserId = user.userId || user.id || null;

	judgesData[currentJudgeIndex] = {
		...(judgesData[currentJudgeIndex] || {}),
		id: judgesData[currentJudgeIndex]?.id || `judge-slot-${currentJudgeIndex + 1}`,
		slot: currentJudgeIndex + 1,
		userId: judgeUserId,
		name: judgeName,
		role: 'judge',
		avatar: judgeAvatar,
		votes: judgesData[currentJudgeIndex]?.votes || 0
	};

	renderJudgeSelectionSlots();
	renderVotesTable();
	showNotification(`已选择 ${judgeName} 作为评委`, 'success');
	closeUserSelectionModal();
}

function filterUsers(keyword) {
	const items = document.querySelectorAll('.user-select-item');
	items.forEach(item => {
		const text = item.textContent.toLowerCase();
		item.style.display = text.includes(keyword.toLowerCase()) ? 'grid' : 'none';
	});
}

async function saveJudgesData() {
	if (!currentStreamId) {
		showNotification('请先选择直播流', 'warning');
		return;
	}

	document.querySelectorAll('.judge-votes-input').forEach((input) => {
		const idx = Number(input.dataset.judgeIndex);
		if (!Number.isNaN(idx) && judgesData[idx]) {
			judgesData[idx].votes = Number(input.value || 0);
		}
	});

	const selectedCount = judgesData.filter(j => j.userId).length;
	if (selectedCount === 0) {
		showNotification('请先选择至少一位评委', 'warning');
		return;
	}

	// 检查是否有重复选择的评委
	const selectedUserIds = judgesData.filter(j => j.userId).map(j => j.userId);
	const uniqueUserIds = [...new Set(selectedUserIds)];
	if (selectedUserIds.length !== uniqueUserIds.length) {
		showNotification('同一个评委不能重复选择', 'error');
		return;
	}

	try {
		console.log('💾 保存评委数据:', { streamId: currentStreamId, judges: judgesData });
		
		// 调用后端API保存评委分配
		const response = await fetch(`${SERVER_CONFIG.BASE_URL}/api/v1/admin/judges`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				stream_id: currentStreamId,
				judges: judgesData.map(j => ({
					slot: j.slot,
					userId: j.userId,
					name: j.name,
					avatar: j.avatar,
					role: j.role || 'judge',
					votes: j.votes || 0
				}))
			})
		});

		const result = await response.json();
		
		if (response.ok && result.success) {
			showNotification('评委信息保存成功', 'success');
			notifyVoteDisplayUpdate();
			
			// 刷新评委投票结果显示
			await loadJudgeVoteResults();
		} else {
			throw new Error(result.message || '保存失败');
		}
	} catch (error) {
		console.error('❌ 保存评委数据失败:', error);
		showNotification(error.message || '保存失败,请重试', 'error');
	}
}

function notifyVoteDisplayUpdate() {
	console.log('📢 通知大屏幕更新评委信息');
}

/**
 * 加载评委投票结果
 */
async function loadJudgeVoteResults() {
	if (!currentStreamId) return;
	
	try {
		const response = await fetch(`${SERVER_CONFIG.BASE_URL}/api/v1/admin/judge-votes?stream_id=${currentStreamId}`);
		const result = await response.json();
		
		if (response.ok && result.success && result.data) {
			renderJudgeVoteResults(result.data.votes || []);
		}
	} catch (error) {
		console.error('❌ 加载评委投票结果失败:', error);
	}
}

/**
 * 渲染评委投票结果
 */
function renderJudgeVoteResults(votes) {
	const tbody = document.getElementById('judges-vote-results-body');
	if (!tbody) return;
	
	if (!votes || votes.length === 0) {
		tbody.innerHTML = `
			<div style="padding: 20px; text-align: center; color: #94a3b8; grid-column: 1 / -1;">
				暂无评委投票记录
			</div>
		`;
		return;
	}
	
	tbody.innerHTML = votes.map(vote => {
		const sideText = vote.side === 'left' ? '正方' : '反方';
		const sideColor = vote.side === 'left' ? '#27ae60' : '#3498db';
		const timeText = vote.created_at ? new Date(vote.created_at).toLocaleString('zh-CN') : '-';
		
		return `
			<div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; padding: 12px 14px; border-bottom: 1px solid #eef2f7; align-items: center;">
				<div style="font-weight: 600; color: #334155;">${vote.judgeName || vote.judgeUserId || '未知评委'}</div>
				<div>
					<span style="display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 999px; background: ${sideColor}20; color: ${sideColor}; font-size: 13px; font-weight: 600;">
						${sideText}
					</span>
				</div>
				<div style="color: #64748b; font-size: 12px;">${timeText}</div>
			</div>
		`;
	}).join('');
}

function showNotification(message, type = 'info') {
	console.log(`📢 [${type.toUpperCase()}] ${message}`);
	
	// 如果全局有 showNotification 函数,使用它
	if (typeof window.showNotification === 'function' && window.showNotification !== showNotification) {
		window.showNotification(message, type);
		return;
	}
	
	// 否则使用简单的alert
	alert(message);
}

if (typeof window !== 'undefined') {
	window.initJudgesManagement = initJudgesManagement;
	window.judgesData = judgesData;
}
