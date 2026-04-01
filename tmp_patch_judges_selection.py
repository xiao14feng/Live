from pathlib import Path

p = Path(r'd:\Desktop\project\Live-main\admin\judges-management.js')
s = p.read_text(encoding='utf-8')
old_func = """async function loadUsersForSelection() {
	try {
		const response = await fetch(`${getAPIBase()}/api/v1/admin/users`);
		const result = await response.json();

		const users = result?.data?.users || result?.users || [];
		renderUsersList(users);
	} catch (error) {
		console.error('❌ 加载用户列表失败:', error);
		const listDiv = document.getElementById('modal-users-list');
		if (listDiv) {
			listDiv.innerHTML = '<div style="text-align: center; padding: 40px; color: #e74c3c;">加载失败,请重试</div>';
		}
	}
}"""
new_func = """async function loadUsersForSelection() {
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
}"""
if old_func in s:
    s = s.replace(old_func, new_func, 1)
s = s.replace('暂无用户数据', '暂无评委用户数据')
p.write_text(s, encoding='utf-8')
print('patched-judge-selection-source')
