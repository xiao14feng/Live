/**
 * 快速设置测试用户 - 在浏览器控制台运行
 */

// 设置评委1
function setJudge1() {
	localStorage.setItem('user', JSON.stringify({
		userId: 'judge_001',
		username: '评委张三',
		role: 'judge',
		openid: 'judge_001'
	}));
	console.log('✅ 已设置为评委1 (judge_001)');
	location.reload();
}

// 设置评委2
function setJudge2() {
	localStorage.setItem('user', JSON.stringify({
		userId: 'judge_002',
		username: '评委李四',
		role: 'judge',
		openid: 'judge_002'
	}));
	console.log('✅ 已设置为评委2 (judge_002)');
	location.reload();
}

// 设置评委3
function setJudge3() {
	localStorage.setItem('user', JSON.stringify({
		userId: 'judge_003',
		username: '评委王五',
		role: 'judge',
		openid: 'judge_003'
	}));
	console.log('✅ 已设置为评委3 (judge_003)');
	location.reload();
}

// 设置管理员
function setAdmin() {
	localStorage.setItem('user', JSON.stringify({
		userId: 'admin_001',
		username: '管理员',
		role: 'admin',
		openid: 'admin_001'
	}));
	console.log('✅ 已设置为管理员 (admin_001)');
	location.reload();
}

// 设置普通用户
function setUser() {
	localStorage.setItem('user', JSON.stringify({
		userId: 'user_001',
		username: '普通用户',
		role: 'user',
		openid: 'user_001'
	}));
	console.log('✅ 已设置为普通用户 (user_001)');
	location.reload();
}

// 查看当前用户
function getCurrentUser() {
	const user = localStorage.getItem('user');
	if (user) {
		const parsed = JSON.parse(user);
		console.log('👤 当前用户:', parsed);
		return parsed;
	} else {
		console.log('❌ 未登录');
		return null;
	}
}

// 清除用户信息
function clearUser() {
	localStorage.removeItem('user');
	console.log('✅ 已清除用户信息');
	location.reload();
}

// 显示帮助
function showHelp() {
	console.log(`
🔧 快速设置测试用户

使用方法（在浏览器控制台运行）:

1. 设置评委1: setJudge1()
2. 设置评委2: setJudge2()
3. 设置评委3: setJudge3()
4. 设置管理员: setAdmin()
5. 设置普通用户: setUser()
6. 查看当前用户: getCurrentUser()
7. 清除用户: clearUser()
8. 显示帮助: showHelp()

示例:
> setJudge1()  // 切换到评委1身份
> getCurrentUser()  // 查看当前用户
> clearUser()  // 退出登录
	`);
}

// 自动显示帮助
console.log('%c🔧 测试用户快速设置工具已加载', 'color: #3498db; font-size: 14px; font-weight: bold;');
console.log('%c输入 showHelp() 查看使用说明', 'color: #95a5a6; font-size: 12px;');

// 导出到全局
if (typeof window !== 'undefined') {
	window.setJudge1 = setJudge1;
	window.setJudge2 = setJudge2;
	window.setJudge3 = setJudge3;
	window.setAdmin = setAdmin;
	window.setUser = setUser;
	window.getCurrentUser = getCurrentUser;
	window.clearUser = clearUser;
	window.showHelp = showHelp;
}
