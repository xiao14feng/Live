// 直播流管理模块

/**
 * 初始化直播流管理功能
 */
function initStreamManagement() {
	console.log('📡 初始化直播流管理模块...');
	bindStreamManagementEvents();
}

/**
 * 绑定直播流管理相关事件
 */
function bindStreamManagementEvents() {
	// 添加直播流按钮
	const addStreamBtn = document.getElementById('add-stream-btn');
	if (addStreamBtn) {
		addStreamBtn.addEventListener('click', openAddStreamModal);
	}
	
	// 关闭弹窗按钮
	const closeModalBtn = document.getElementById('close-stream-modal');
	if (closeModalBtn) {
		closeModalBtn.addEventListener('click', closeStreamModal);
	}
	
	// 取消按钮
	const cancelBtn = document.getElementById('cancel-stream-btn');
	if (cancelBtn) {
		cancelBtn.addEventListener('click', closeStreamModal);
	}
	
	// 表单提交
	const streamForm = document.getElementById('stream-form');
	if (streamForm) {
		streamForm.addEventListener('submit', handleStreamFormSubmit);
	}
	
	// 点击弹窗外部关闭
	const modal = document.getElementById('stream-modal');
	if (modal) {
		modal.addEventListener('click', (e) => {
			if (e.target === modal) {
				closeStreamModal();
			}
		});
	}
	
	// ==================== 辩题弹窗事件 ====================
	
	// 关闭辩题弹窗按钮
	const closeDebateModalBtn = document.getElementById('close-debate-modal');
	if (closeDebateModalBtn) {
		closeDebateModalBtn.addEventListener('click', closeDebateModal);
	}
	
	// 取消辩题按钮
	const cancelDebateBtn = document.getElementById('cancel-debate-btn');
	if (cancelDebateBtn) {
		cancelDebateBtn.addEventListener('click', closeDebateModal);
	}
	
	// 辩题表单提交
	const debateForm = document.getElementById('debate-form');
	if (debateForm) {
		debateForm.addEventListener('submit', handleDebateFormSubmit);
	}
	
	// 删除辩题按钮
	const deleteDebateBtn = document.getElementById('delete-debate-btn');
	if (deleteDebateBtn) {
		deleteDebateBtn.addEventListener('click', handleDeleteDebate);
	}
	
	// 点击辩题弹窗外部关闭
	const debateModal = document.getElementById('debate-modal');
	if (debateModal) {
		debateModal.addEventListener('click', (e) => {
			if (e.target === debateModal) {
				closeDebateModal();
			}
		});
	}
	
	console.log('✅ 直播流管理事件绑定完成');
}

/**
 * 加载直播流列表（增强版：为每个流获取辩题信息）
 */
async function loadStreamsList() {
	try {
		console.log('📡 加载直播流列表...');
		
	// 尝试获取包含辩题信息的列表
	// 注意：如果后端接口支持 includeDebateTopic 参数，可以在这里添加
	const result = await getStreamsList();
	console.log('📦 API返回数据:', result);
	
	// 处理返回数据，API 返回格式: {streams: Array, total: 6} 或 {data: {streams: Array, total: 6}}
	let streams = [];
	if (Array.isArray(result)) {
		streams = result;
	} else if (result?.data?.streams) {
		streams = result.data.streams;
	} else if (result?.streams) {
		streams = result.streams;
	} else if (result?.data && Array.isArray(result.data)) {
		streams = result.data;
	} else if (result && typeof result === 'object') {
		// 兼容其他格式
		streams = result.items || result.list || [];
	}
		
		// 确保 streams 是数组
		if (!Array.isArray(streams)) {
			console.warn('⚠️ 返回数据不是数组格式，转换为空数组:', streams);
			streams = [];
		}
		
		// 🔧 增强：为每个流获取辩题信息（如果列表中没有）
		if (streams.length > 0) {
			console.log('📡 为每个流获取辩题信息...');
			const streamsWithDebates = await Promise.all(streams.map(async (stream) => {
				// 如果流数据中已经有 debateTopic，直接使用
				if (stream.debateTopic) {
					return stream;
				}
				
				// 否则，尝试获取辩题信息
				try {
					const debateResponse = await getStreamDebateTopic(stream.id);
					const debateData = debateResponse?.data || debateResponse;
					
					if (debateData && debateData.id) {
						stream.debateTopic = debateData;
					}
				} catch (error) {
					// 获取失败，说明没有设置辩题，保持原样
					console.log(`流 ${stream.id} 没有设置辩题`);
				}
				
				return stream;
			}));
			
			renderStreamsTable(streamsWithDebates);
		} else {
			renderStreamsTable(streams);
		}
		
		console.log('✅ 直播流列表加载完成，共', streams.length, '个');
		
	} catch (error) {
		console.error('❌ 加载直播流列表失败:', error);
		showToast('加载直播流列表失败：' + error.message, 'error');
		// 显示空列表
		renderStreamsTable([]);
	}
}

/**
 * 渲染直播流表格
 */
function renderStreamsTable(streams) {
	const tbody = document.getElementById('streams-table-body');
	if (!tbody) {
		console.error('找不到直播流表格容器');
		return;
	}
	
	// 确保 streams 是数组
	if (!Array.isArray(streams)) {
		console.error('❌ renderStreamsTable: streams 不是数组:', streams);
		streams = [];
	}
	
	if (!streams || streams.length === 0) {
		tbody.innerHTML = `
			<tr>
				<td colspan="7" style="text-align: center; padding: 40px; color: #999;">
					暂无直播流，请点击"添加直播流"按钮
				</td>
			</tr>
		`;
		return;
	}
	
	tbody.innerHTML = streams.map(stream => {
		// 获取辩题信息
		const debateTopic = stream.debateTopic || null;
		const debateTitle = debateTopic ? escapeHtml(debateTopic.title) : '未设置';
		const debateBadge = debateTopic 
			? `<span class="badge badge-success" title="${escapeHtml(debateTopic.title)}">✓ 已设置</span>`
			: `<span class="badge badge-secondary">✗ 未设置</span>`;
		
		return `
		<tr>
			<td>${escapeHtml(stream.name)}</td>
			<td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(stream.url)}">
				${escapeHtml(stream.url)}
			</td>
			<td>
				<span class="badge badge-${stream.type === 'hls' ? 'success' : stream.type === 'rtmp' ? 'warning' : 'info'}">
					${stream.type.toUpperCase()}
				</span>
			</td>
			<td>
				${debateBadge}
				<div style="font-size: 12px; color: #666; margin-top: 4px;" title="${debateTitle}">
					${debateTitle.length > 20 ? debateTitle.substring(0, 20) + '...' : debateTitle}
				</div>
			</td>
			<td>
				<span class="badge badge-${stream.enabled ? 'success' : 'secondary'}">
					${stream.enabled ? '✓ 已启用' : '✗ 已禁用'}
				</span>
			</td>
			<td style="font-size: 12px; color: #666;">
				${formatDateTime(stream.createdAt)}
			</td>
			<td>
				<button class="btn btn-sm btn-primary" onclick="openEditStreamModal('${stream.id}')">
					✏️ 编辑
				</button>
				<button class="btn btn-sm btn-info" onclick="openDebateModal('${stream.id}')" style="margin-left: 5px;">
					💬 辩题
				</button>
				<button class="btn btn-sm btn-danger" onclick="handleDeleteStream('${stream.id}', '${escapeHtml(stream.name)}')" style="margin-left: 5px;">
					🗑️ 删除
				</button>
			</td>
		</tr>
		`;
	}).join('');
}

/**
 * 打开添加直播流弹窗
 */
function openAddStreamModal() {
	if (window.getCurrentAdminRole && window.getCurrentAdminRole() !== 'admin') {
		showToast('只有管理员可以创建直播间', 'error');
		return;
	}

	const modal = document.getElementById('stream-modal');
	const title = document.getElementById('stream-modal-title');
	const form = document.getElementById('stream-form');
	
	if (!modal || !title || !form) {
		console.error('找不到弹窗元素');
		return;
	}
	
	// 设置标题
	title.textContent = '添加直播流';
	
	// 重置表单
	form.reset();
	document.getElementById('stream-id').value = '';
	document.getElementById('stream-enabled').checked = true;
	
	// 显示弹窗
	modal.style.display = 'flex';
	
	console.log('打开添加直播流弹窗');
}

/**
 * 打开编辑直播流弹窗
 */
async function openEditStreamModal(streamId) {
	try {
		console.log('打开编辑弹窗:', streamId);
		
		const modal = document.getElementById('stream-modal');
		const title = document.getElementById('stream-modal-title');
		
		if (!modal || !title) {
			console.error('找不到弹窗元素');
			return;
		}
		
		// 设置标题
		title.textContent = '编辑直播流';
		
	// 获取流列表，找到对应的流
	const result = await getStreamsList();
	// API 返回格式: {streams: Array, total: 6} 或 {data: {streams: Array, total: 6}}
	let streams = [];
	if (Array.isArray(result)) {
		streams = result;
	} else if (result?.data?.streams) {
		streams = result.data.streams;
	} else if (result?.streams) {
		streams = result.streams;
	} else if (result?.data) {
		streams = Array.isArray(result.data) ? result.data : [];
	}
	
	const stream = streams.find(s => s.id === streamId);
		
		if (!stream) {
			showToast('找不到指定的直播流', 'error');
			return;
		}
		
		// 填充表单
		document.getElementById('stream-id').value = stream.id;
		document.getElementById('stream-name').value = stream.name;
		document.getElementById('stream-url').value = stream.url;
		document.getElementById('stream-type').value = stream.type;
		document.getElementById('stream-description').value = stream.description || '';
		document.getElementById('stream-enabled').checked = stream.enabled;
		
		// 显示弹窗
		modal.style.display = 'flex';
		
	} catch (error) {
		console.error('❌ 打开编辑弹窗失败:', error);
		showToast('打开编辑弹窗失败：' + error.message, 'error');
	}
}

/**
 * 关闭直播流弹窗
 */
function closeStreamModal() {
	const modal = document.getElementById('stream-modal');
	if (modal) {
		modal.style.display = 'none';
	}
	console.log('关闭直播流弹窗');
}

/**
 * 处理直播流表单提交
 */
async function handleStreamFormSubmit(e) {
	e.preventDefault();
	e.stopPropagation(); // 阻止事件冒泡，防止重复触发

	if (window.getCurrentAdminRole && window.getCurrentAdminRole() !== 'admin') {
		showToast('只有管理员可以创建或编辑直播间', 'error');
		return;
	}
	
	// 🔧 修复：防重复提交 - 如果正在提交，直接返回
	if (window.streamFormSubmitting) {
		console.log('⚠️ 表单正在提交中，忽略重复提交');
		return;
	}
	
	// 标记为正在提交
	window.streamFormSubmitting = true;
	
	try {
		const streamId = document.getElementById('stream-id').value;
		const streamData = {
			name: document.getElementById('stream-name').value.trim(),
			url: document.getElementById('stream-url').value.trim(),
			type: document.getElementById('stream-type').value,
			description: document.getElementById('stream-description').value.trim(),
			enabled: document.getElementById('stream-enabled').checked
		};
		
		// 验证
		if (!streamData.name || !streamData.url || !streamData.type) {
			showToast('请填写所有必填项', 'error');
			window.streamFormSubmitting = false; // 🔧 修复：验证失败时也要清除提交标记
			return;
		}
		
		console.log('提交直播流表单:', streamId ? '更新' : '添加', streamData);
		
		// 禁用提交按钮
		const submitBtn = document.querySelector('#stream-form button[type="submit"]');
		const btnText = document.getElementById('save-stream-btn-text');
		if (submitBtn) submitBtn.disabled = true;
		if (btnText) btnText.textContent = '保存中...';
		
		try {
			if (streamId) {
				// 更新
				console.log('调用更新API:', streamId);
				await updateStream(streamId, streamData);
				showToast('直播流更新成功！', 'success');
			} else {
				// 添加
				console.log('调用添加API');
				await addStream(streamData);
				showToast('直播流添加成功！', 'success');
			}
			
			// 关闭弹窗
			closeStreamModal();
			
			// 重新加载列表
			await loadStreamsList();
			
		} finally {
			// 恢复按钮
			if (submitBtn) submitBtn.disabled = false;
			if (btnText) btnText.textContent = '保存';
			// 🔧 修复：清除提交标记
			window.streamFormSubmitting = false;
		}
		
	} catch (error) {
		console.error('❌ 保存直播流失败:', error);
		showToast('保存失败：' + error.message, 'error');
		// 🔧 修复：出错时也要清除提交标记
		window.streamFormSubmitting = false;
	}
}

/**
 * 删除直播流
 */
async function handleDeleteStream(streamId, streamName) {
	console.log('请求删除直播流:', streamId, streamName);
	
	if (!confirm(`确定要删除直播流"${streamName}"吗？\n\n删除后将无法恢复！`)) {
		console.log('用户取消删除');
		return;
	}
	
	try {
		console.log('调用删除API:', streamId);
		await deleteStream(streamId);
		showToast('直播流删除成功！', 'success');
		
		// 重新加载列表
		await loadStreamsList();
		
	} catch (error) {
		console.error('❌ 删除直播流失败:', error);
		showToast('删除失败：' + error.message, 'error');
	}
}

// ==================== 辩题管理功能 ====================

/**
 * 打开设置辩题弹窗
 */
async function openDebateModal(streamId) {
	try {
		console.log('打开设置辩题弹窗:', streamId);
		
		const modal = document.getElementById('debate-modal');
		const title = document.getElementById('debate-modal-title');
		const deleteBtn = document.getElementById('delete-debate-btn');
		
		if (!modal || !title) {
			console.error('找不到辩题弹窗元素');
			return;
		}
		
		// 保存流ID（先设置，避免reset清除）
		document.getElementById('debate-stream-id').value = streamId;
		
		// 先尝试获取现有辩题，然后再决定是否重置表单
		let hasExistingDebate = false;
		try {
			const response = await getStreamDebateTopic(streamId);
			console.log('📡 获取辩题响应:', response);
			
			// 根据文档，返回格式可能是 {success: true, data: {...}} 或 {success: true, data: null}
			const debateData = response?.data || response;
			
			if (debateData && debateData.id) {
				hasExistingDebate = true;
				
				// 有辩题，填充表单（不重置，直接填充）
				document.getElementById('debate-title').value = debateData.title || '';
				document.getElementById('debate-description').value = debateData.description || '';
				document.getElementById('debate-left-position').value = debateData.leftPosition || '';
				document.getElementById('debate-right-position').value = debateData.rightPosition || '';
				const isActiveCheckbox = document.getElementById('debate-is-active');
				if (isActiveCheckbox) {
					isActiveCheckbox.checked = debateData.isActive === true || debateData.isActive === 'true';
				}
				
				// 保存辩题ID到隐藏字段
				document.getElementById('debate-stream-id').dataset.debateId = debateData.id;
				
				// 显示删除按钮
				if (deleteBtn) {
					deleteBtn.style.display = 'inline-block';
				}
				
				// 更新标题
				title.textContent = '编辑辩题';
				
				console.log('✅ 已加载辩题信息:', debateData);
			} else {
				// 没有辩题（data: null）
				console.log('该直播流尚未设置辩题');
				if (deleteBtn) {
					deleteBtn.style.display = 'none';
				}
				// 重置表单
				document.getElementById('debate-form').reset();
				// 重新设置流ID（因为reset会清除）
				document.getElementById('debate-stream-id').value = streamId;
				document.getElementById('debate-stream-id').dataset.debateId = '';
				// 设置标题
				title.textContent = '设置辩题';
			}
		} catch (error) {
			// 如果获取失败，说明没有辩题或出错
			console.log('获取辩题信息失败:', error);
			if (deleteBtn) {
				deleteBtn.style.display = 'none';
			}
			// 重置表单
			document.getElementById('debate-form').reset();
			// 重新设置流ID（因为reset会清除）
			document.getElementById('debate-stream-id').value = streamId;
			document.getElementById('debate-stream-id').dataset.debateId = '';
			// 设置标题
			title.textContent = '设置辩题';
		}
		
		// 显示弹窗
		modal.style.display = 'flex';
		
	} catch (error) {
		console.error('❌ 打开辩题弹窗失败:', error);
		showToast('打开辩题弹窗失败：' + error.message, 'error');
	}
}

/**
 * 关闭辩题弹窗
 */
function closeDebateModal() {
	const modal = document.getElementById('debate-modal');
	if (modal) {
		modal.style.display = 'none';
	}
	console.log('关闭辩题弹窗');
}

/**
 * 处理辩题表单提交
 */
async function handleDebateFormSubmit(e) {
	e.preventDefault();
	
	try {
		const streamId = document.getElementById('debate-stream-id').value;
		const debateId = document.getElementById('debate-stream-id').dataset.debateId || '';
		
		const debateData = {
			title: document.getElementById('debate-title').value.trim(),
			description: document.getElementById('debate-description').value.trim(),
			leftPosition: document.getElementById('debate-left-position').value.trim(),
			rightPosition: document.getElementById('debate-right-position').value.trim(),
			isActive: document.getElementById('debate-is-active')?.checked || false
		};
		
		// 验证
		if (!debateData.title || !debateData.leftPosition || !debateData.rightPosition) {
			showToast('请填写所有必填项（辩题标题、正方立场、反方立场）', 'error');
			return;
		}
		
		console.log('提交辩题表单:', streamId, '辩题ID:', debateId || '新建', debateData);
		
		// 禁用提交按钮
		const submitBtn = document.querySelector('#debate-form button[type="submit"]');
		const btnText = document.getElementById('save-debate-btn-text');
		if (submitBtn) submitBtn.disabled = true;
		if (btnText) btnText.textContent = '保存中...';
		
		try {
			if (debateId) {
				// 已有辩题，更新辩题信息
				console.log('更新辩题:', debateId);
				const result = await updateDebate(debateId, debateData);
				
				if (result && (result.success !== false)) {
					const isActiveMsg = debateData.isActive ? '（已激活）' : '';
					showToast(`辩题更新成功！${isActiveMsg}`, 'success');
					// 关闭弹窗
					closeDebateModal();
					// 重新加载列表（延迟一点，确保后端数据已更新）
					setTimeout(async () => {
						await loadStreamsList();
					}, 300);
				} else {
					throw new Error(result?.message || result?.detail || '更新失败');
				}
			} else {
				// 没有辩题，需要创建新辩题并关联到流
				console.log('创建新辩题并关联到流:', streamId);
				
				// 先创建辩题
				const createResult = await createDebate(debateData);
				
				if (!createResult || (createResult.success === false)) {
					throw new Error(createResult?.message || createResult?.detail || '创建辩题失败');
				}
				
				const newDebateId = createResult.data?.id || createResult.id;
				if (!newDebateId) {
					throw new Error('创建辩题成功但未返回辩题ID');
				}
				
				console.log('辩题创建成功，ID:', newDebateId, '关联到流:', streamId);
				
				// 关联辩题到流
				const associateResult = await associateDebateToStream(streamId, newDebateId);
				
				if (associateResult && (associateResult.success !== false)) {
					const isActiveMsg = debateData.isActive ? '（已激活）' : '';
					showToast(`辩题创建并关联成功！${isActiveMsg}`, 'success');
					// 关闭弹窗
					closeDebateModal();
					// 重新加载列表（延迟一点，确保后端数据已更新）
					setTimeout(async () => {
						await loadStreamsList();
					}, 300);
				} else {
					throw new Error(associateResult?.message || associateResult?.detail || '关联辩题失败');
				}
			}
		} finally {
			// 恢复按钮
			if (submitBtn) submitBtn.disabled = false;
			if (btnText) btnText.textContent = '保存';
		}
		
	} catch (error) {
		console.error('❌ 保存辩题失败:', error);
		showToast('保存失败：' + error.message, 'error');
	}
}

/**
 * 删除辩题
 */
async function handleDeleteDebate() {
	const streamId = document.getElementById('debate-stream-id').value;
	
	if (!streamId) {
		showToast('无法获取直播流ID', 'error');
		return;
	}
	
	if (!confirm('确定要删除该直播流的辩题吗？\n\n删除后，该直播流将使用全局辩题。')) {
		console.log('用户取消删除');
		return;
	}
	
	try {
		console.log('调用删除辩题API:', streamId);
		const result = await deleteStreamDebateTopic(streamId);
		
		if (result && (result.success !== false)) {
			showToast('辩题删除成功！', 'success');
			// 关闭弹窗
			closeDebateModal();
			// 重新加载列表（延迟一点，确保后端数据已更新）
			setTimeout(async () => {
				await loadStreamsList();
			}, 300);
		} else {
			throw new Error(result?.message || result?.detail || '删除失败');
		}
	} catch (error) {
		console.error('❌ 删除辩题失败:', error);
		showToast('删除失败：' + error.message, 'error');
	}
}

/**
 * HTML转义
 */
function escapeHtml(text) {
	if (!text) return '';
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

/**
 * 格式化日期时间
 */
function formatDateTime(dateString) {
	if (!dateString) return '-';
	
	try {
		const date = new Date(dateString);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		
		return `${year}-${month}-${day} ${hours}:${minutes}`;
	} catch (e) {
		return '-';
	}
}

/**
 * 显示Toast提示
 */
function showToast(message, type = 'info') {
	console.log(`[Toast ${type.toUpperCase()}]`, message);
	
	// 检查是否已有toast动画样式
	if (!document.getElementById('toast-style')) {
		const style = document.createElement('style');
		style.id = 'toast-style';
		style.textContent = `
			@keyframes toastSlideIn {
				from {
					transform: translateX(400px);
					opacity: 0;
				}
				to {
					transform: translateX(0);
					opacity: 1;
				}
			}
			@keyframes toastSlideOut {
				from {
					transform: translateX(0);
					opacity: 1;
				}
				to {
					transform: translateX(400px);
					opacity: 0;
				}
			}
		`;
		document.head.appendChild(style);
	}
	
	// Toast颜色
	const colors = {
		success: '#4caf50',
		error: '#f44336',
		warning: '#ff9800',
		info: '#2196f3'
	};
	
	const toast = document.createElement('div');
	toast.style.cssText = `
		position: fixed;
		top: 20px;
		right: 20px;
		background: ${colors[type] || colors.info};
		color: white;
		padding: 15px 25px;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.3);
		z-index: 10000;
		animation: toastSlideIn 0.3s ease;
		font-size: 14px;
		max-width: 400px;
	`;
	toast.textContent = message;
	
	document.body.appendChild(toast);
	
	setTimeout(() => {
		toast.style.animation = 'toastSlideOut 0.3s ease';
		setTimeout(() => {
			if (toast.parentNode) {
				document.body.removeChild(toast);
			}
		}, 300);
	}, 3000);
}

// 将函数暴露到全局作用域，供其他脚本调用
window.openEditStreamModal = openEditStreamModal;
window.openAddStreamModal = openAddStreamModal;
window.handleDeleteStream = handleDeleteStream;

console.log('✅ 直播流管理模块加载完成');

