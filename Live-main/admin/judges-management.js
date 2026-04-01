/**
 * 评委管理模块
 */

// 全局状态
let currentJudgeIndex = null; // 当前正在编辑的评委索引
let currentStreamId = null; // 当前选中的直播流ID
let judgesData = [
	{
		id: 'judge-slot-1',
		userId: null,
		name: '待选择评委',
		role: '评委',
		avatar: '',
		votes: 0
	},
	{
		id: 'judge-slot-2',
		userId: null,
		name: '待选择评委',
		role: '评委',
		avatar: '',
		votes: 0
	},
	{
		id: 'judge-slot-3',
		userId: null,
		name: '待选择评委',
		role: '评委',
		avatar: '',
		votes: 0
	}
];

/**
 * 初始化评委管理模块
 */
function initJudgesManagement() {
	console.log('🎯 初始化评委管理模块');

	// 加载直播流列表
	loadStreamsForJudges();

	// 先把界面收成“只从用户选择”的模式
	prepareJudgeCardsForSelectionMode();
	updateJudgesUI();

	// 绑定直播流选择事件
	const streamSelect = document.getElementById('judges-stream-select');
	if (streamSelect && !streamSelect.dataset.bound) {
		streamSelect.addEventListener('change', handleStreamChange);
		streamSelect.dataset.bound = 'true';
	}

	// 刷新直播流列表按钮
	const refreshBtn = document.getElementById('judges-refresh-streams-btn');
	if (refreshBtn && !refreshBtn.dataset.bound) {
		refreshBtn.addEventListener('click', loadStreamsForJudges);
		refreshBtn.dataset.bound = 'true';
	}

	// 绑定“从评委用户选择”按钮
	document.querySelectorAll('.select-from-users-btn').forEach((btn, index) => {
		if (!btn.dataset.bound) {
			btn.textContent = '从评委用户选择';
			btn.addEventListener('click', () => openUserSelectionModal(index));
			btn.dataset.bound = 'true';
		}
	});

	// 头像区只做 hover 提示，不再触发上传
	document.querySelectorAll('.judge-avatar-preview').forEach((preview) => {
		const overlay = preview.querySelector('.avatar-overlay');
		if (!preview.dataset.bound) {
			preview.addEventListener('mouseenter', () => {
				if (overlay) overlay.style.display = 'flex';
			});
			preview.addEventListener('mouseleave', () => {
				if (overlay) overlay.style.display = 'none';
			});
			preview.dataset.bound = 'true';
		}
	});

	// 绑定保存按钮
	const saveBtn = document.getElementById('save-judges-btn');
	if (saveBtn && !saveBtn.dataset.bound) {
		saveBtn.addEventListener('click', saveJudgesData);
		saveBtn.dataset.bound = 'true';
	}

	// 关闭弹窗按钮
	const closeModalBtn = document.getElementById('close-user-modal');
	if (closeModalBtn && !closeModalBtn.dataset.bound) {
		closeModalBtn.addEventListener('click', closeUserSelectionModal);
		closeModalBtn.dataset.bound = 'true';
	}

	// 点击弹窗背景关闭
	const modal = document.getElementById('select-user-modal');
	if (modal && !modal.dataset.bound) {
		modal.addEventListener('click', (e) => {
			if (e.target === modal) {
				closeUserSelectionModal();
			}
		});
		modal.dataset.bound = 'true';
	}

	// 用户搜索
	const userSearch = document.getElementById('modal-user-search');
	if (userSearch && !userSearch.dataset.bound) {
		userSearch.addEventListener('input', (e) => {
			filterUsers(e.target.value);
		});
		userSearch.dataset.bound = 'true';
	}

	console.log('✅ 评委管理模块初始化完成');
}

function prepareJudgeCardsForSelectionMode() {
	document.querySelectorAll('.judge-edit-card').forEach((card, index) => {
		const titleEl = card.querySelector('h4');
		const nameInput = card.querySelector('.judge-name-input');
		const roleInput = card.querySelector('.judge-role-input');
		const uploadBtn = card.querySelector('.upload-avatar-btn');
		const fileInput = card.querySelector('.judge-avatar-upload');
		const avatarPreview = card.querySelector('.judge-avatar-preview');
		const overlay = card.querySelector('.avatar-overlay');

		if (titleEl) titleEl.textContent = `评委席位 ${index + 1}`;
		if (nameInput) {
			nameInput.readOnly = true;
			nameInput.placeholder = '请从评委用户中选择';
			nameInput.style.background = '#eef2f7';
		}
		if (roleInput) {
			roleInput.readOnly = true;
			roleInput.value = '评委';
			roleInput.style.background = '#eef2f7';
		}
		if (uploadBtn) {
			uploadBtn.style.display = 'none';
		}
		if (fileInput) {
			fileInput.disabled = true;
		}
		if (avatarPreview) {
			avatarPreview.style.cursor = 'default';
		}
		if (overlay) {
			overlay.textContent = '从用户选择';
		}
	});
}

/**
 * 加载直播流列表
 */
async function loadStreamsForJudges() {
	try {
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

		const select = document.getElementById('judges-stream-select');
		if (!select) return;

		select.innerHTML = '<option value="">请选择要管理的直播流</option>';

		streams.filter(stream => stream.enabled).forEach(stream => {
			const option = document.createElement('option');
			option.value = stream.id;
			option.textContent = `${stream.name} (${(stream.type || 'hls').toUpperCase()})`;
			select.appendChild(option);
		});

		console.log('✅ 评委管理直播流列表加载成功，共', streams.length, '个');
	} catch (error) {
		console.error('❌ 加载直播流列表失败:', error);
		showNotification('加载直播流列表失败', 'error');
	}
}

/**
 * 处理直播流选择变化
 */
function handleStreamChange(e) {
	const streamId = e.target.value;
	currentStreamId = streamId;

	const select = e.target;
	const selectedOption = select.options[select.selectedIndex];
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
		loadJudgesDataForStream(streamId);
	}
}

/**
 * 加载指定直播流的评委数据
 */
async function loadJudgesDataForStream(streamId) {
	try {
		// TODO: 调用后端API获取评委数据
		// const response = await fetch(`${getAPIBase()}/api/v1/admin/judges?stream_id=${streamId}`);
		// const result = await response.json();
		// judgesData = result.data || judgesData;

		console.log('📝 加载评委数据 (当前使用本地数据)');
		prepareJudgeCardsForSelectionMode();
		updateJudgesUI();
	} catch (error) {
		console.error('❌ 加载评委数据失败:', error);
		showNotification('加载评委数据失败', 'error');
	}
}

/**
 * 更新评委UI显示
 */
function updateJudgesUI() {
	document.querySelectorAll('.judge-edit-card').forEach((card, index) => {
		const judge = judgesData[index];
		if (!judge) return;

		const nameInput = card.querySelector('.judge-name-input');
		const roleInput = card.querySelector('.judge-role-input');
		const votesInput = card.querySelector('.judge-votes-input');
		const avatarPreview = card.querySelector('.judge-avatar-preview');

		if (nameInput) nameInput.value = judge.name || '待选择评委';
		if (roleInput) roleInput.value = '评委';
		if (votesInput) votesInput.value = judge.votes || 0;
		if (avatarPreview) {
			avatarPreview.style.backgroundImage = judge.avatar ? `url('${judge.avatar}')` : 'none';
		}
	});
}

/**
 * 打开用户选择弹窗
 */
async function openUserSelectionModal(judgeIndex) {
	currentJudgeIndex = judgeIndex;

	const modal = document.getElementById('select-user-modal');
	if (modal) {
		modal.style.display = 'flex';
		await loadUsersForSelection();
	}
}

/**
 * 关闭用户选择弹窗
 */
function closeUserSelectionModal() {
	const modal = document.getElementById('select-user-modal');
	if (modal) {
		modal.style.display = 'none';
	}
	currentJudgeIndex = null;
}

/**
 * 加载用户列表供选择
 */
async function loadUsersForSelection() {
	try {
		const result = await fetchUserList(1, 100, {});
		const users = (result?.users || []).filter(user => String(user.role || '').toLowerCase() === 'judge');
		renderUsersList(users);
	} catch (error) {
		console.error('❌ 加载用户列表失败:', error);
		const listDiv = document.getElementById('modal-users-list');
		if (listDiv) {
			listDiv.innerHTML = '<div style="text-align: center; padding: 40px; color: #e74c3c;">加载失败,请重试</div>';
		}
	}
}

/**
 * 渲染用户列表
 */
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
							<div>
								<img src="${avatar}" alt="${nickname}" style="width: 46px; height: 46px; border-radius: 50%; object-fit: cover; border: 2px solid #e9eef5; background: #f8fafc;">
							</div>
							<div style="font-weight: 600; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 12px;">${nickname}</div>
							<div style="font-size: 12px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 12px;">${userId}</div>
							<div>
								<span style="display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; background: #e0f2fe; color: #0369a1; font-size: 12px; font-weight: 700;">${role}</span>
							</div>
							<div style="text-align: center;">
								<button class="btn btn-sm btn-primary select-this-user-btn" style="padding: 6px 14px; min-width: 72px;">选择</button>
							</div>
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
			if (user) {
				selectUserAsJudge(user);
			}
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
			if (user) {
				selectUserAsJudge(user);
			}
		});
	});
}

/**
 * 选择用户作为评委
 */
function selectUserAsJudge(user) {
	if (currentJudgeIndex === null) return;

	const judgeName = user.nickname || user.nickName || user.name || `评委${currentJudgeIndex + 1}`;
	const judgeAvatar = user.avatarUrl || user.avatar || '';
	const judgeUserId = user.userId || user.id || null;

	judgesData[currentJudgeIndex] = {
		...(judgesData[currentJudgeIndex] || {}),
		id: judgesData[currentJudgeIndex]?.id || `judge-slot-${currentJudgeIndex + 1}`,
		userId: judgeUserId,
		name: judgeName,
		role: '评委',
		avatar: judgeAvatar,
		votes: judgesData[currentJudgeIndex]?.votes || 0
	};

	updateJudgesUI();
	showNotification(`已选择 ${judgeName} 作为评委`, 'success');
	closeUserSelectionModal();
}

/**
 * 过滤用户列表
 */
function filterUsers(keyword) {
	const items = document.querySelectorAll('.user-select-item');
	items.forEach(item => {
		const text = item.textContent.toLowerCase();
		if (text.includes(keyword.toLowerCase())) {
			item.style.display = 'flex';
		} else {
			item.style.display = 'none';
		}
	});
}

/**
 * 保存评委数据
 */
async function saveJudgesData() {
	if (!currentStreamId) {
		showNotification('请先选择直播流', 'warning');
		return;
	}

	const cards = document.querySelectorAll('.judge-edit-card');
	const updatedJudges = [];

	cards.forEach((card, index) => {
		const votesInput = card.querySelector('.judge-votes-input');
		updatedJudges.push({
			id: judgesData[index]?.id || `judge-slot-${index + 1}`,
			userId: judgesData[index]?.userId || null,
			name: judgesData[index]?.name || '待选择评委',
			role: '评委',
			avatar: judgesData[index]?.avatar || '',
			votes: parseInt(votesInput?.value) || 0
		});
	});

	const selectedCount = updatedJudges.filter(judge => judge.userId).length;
	if (selectedCount === 0) {
		showNotification('请先从评委用户中选择至少一位评委', 'warning');
		return;
	}

	try {
		// TODO: 调用后端API保存数据
		// const response = await fetch(`${getAPIBase()}/api/v1/admin/judges`, {
		// 	method: 'POST',
		// 	headers: { 'Content-Type': 'application/json' },
		// 	body: JSON.stringify({
		// 		stream_id: currentStreamId,
		// 		judges: updatedJudges
		// 	})
		// });

		judgesData = updatedJudges;
		console.log('💾 保存评委数据:', judgesData);
		showNotification('评委信息保存成功', 'success');
		notifyVoteDisplayUpdate();
	} catch (error) {
		console.error('❌ 保存评委数据失败:', error);
		showNotification('保存失败,请重试', 'error');
	}
}

/**
 * 通知大屏幕更新评委信息
 */
function notifyVoteDisplayUpdate() {
	console.log('📢 通知大屏幕更新评委信息');
}

/**
 * 显示通知消息
 */
function showNotification(message, type = 'info') {
	console.log(`📢 [${type.toUpperCase()}] ${message}`);
	alert(message);
}

/**
 * 获取API基础地址
 */
function getAPIBase() {
	if (window.SERVER_CONFIG && window.SERVER_CONFIG.BASE_URL) {
		return window.SERVER_CONFIG.BASE_URL;
	}
	return 'http://localhost:8081';
}

// 导出函数供外部使用
if (typeof window !== 'undefined') {
	window.initJudgesManagement = initJudgesManagement;
	window.judgesData = judgesData;
}
