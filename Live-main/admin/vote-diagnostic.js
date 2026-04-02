/**
 * 投票功能诊断工具
 * 在浏览器控制台运行这些函数来排查问题
 */

/**
 * 诊断当前用户和评委分配的匹配情况
 */
async function diagnosticVoteIssue(streamId) {
	console.log('🔍 开始诊断投票问题...\n');
	
	// 1. 检查当前用户
	const user = getCurrentAdminUser();
	if (!user) {
		console.error('❌ 未登录');
		return;
	}
	
	const userId = user.userId || user.openid || user.id || user.username;
	console.log('👤 当前用户信息:');
	console.log('   用户名:', user.username);
	console.log('   角色:', user.role);
	console.log('   用户ID:', userId);
	console.log('   完整信息:', user);
	console.log('');
	
	// 2. 获取评委分配
	if (!streamId) {
		console.warn('⚠️ 未指定 streamId，请提供直播流ID');
		console.log('使用方法: diagnosticVoteIssue("your_stream_id")');
		return;
	}
	
	try {
		const response = await fetch(`${SERVER_CONFIG.BASE_URL}/api/v1/admin/judges?stream_id=${streamId}`);
		const result = await response.json();
		
		if (!response.ok || !result.success) {
			console.error('❌ 获取评委分配失败:', result.message);
			return;
		}
		
		console.log(`📋 直播流 "${streamId}" 的评委分配:`);
		const judges = result.data.judges || [];
		judges.forEach((judge, index) => {
			console.log(`   席位 ${index + 1}:`);
			console.log(`      姓名: ${judge.name || '未设置'}`);
			console.log(`      用户ID: ${judge.userId || '未设置'}`);
			console.log(`      角色: ${judge.role || '未设置'}`);
		});
		console.log('');
		
		// 3. 检查匹配
		const matchedJudge = judges.find(j => j.userId === userId);
		if (matchedJudge) {
			console.log('✅ 匹配成功！');
			console.log(`   您是席位 ${matchedJudge.slot} 的评委`);
			console.log(`   姓名: ${matchedJudge.name}`);
		} else {
			console.log('❌ 未匹配！');
			console.log(`   您的用户ID "${userId}" 不在评委列表中`);
			console.log('');
			console.log('💡 可能的原因:');
			console.log('   1. 管理员还没有为这个直播流分配您为评委');
			console.log('   2. 分配评委时使用的用户ID与您登录的用户ID不一致');
			console.log('');
			console.log('🔧 解决方法:');
			console.log('   方法1: 让管理员重新分配评委，使用您的用户ID:', userId);
			console.log('   方法2: 使用评委列表中的用户ID重新登录');
			console.log('');
			console.log('📝 评委列表中的用户ID:');
			judges.forEach((judge, index) => {
				if (judge.userId) {
					console.log(`   席位 ${index + 1}: ${judge.userId}`);
				}
			});
		}
		console.log('');
		
		// 4. 检查投票状态
		const statusResponse = await fetch(
			`${SERVER_CONFIG.BASE_URL}/api/v1/judge-vote/status?stream_id=${streamId}&user_id=${userId}`
		);
		const statusResult = await statusResponse.json();
		
		if (statusResponse.ok && statusResult.success) {
			console.log('📊 投票状态:');
			const status = statusResult.data;
			console.log(`   是否是评委: ${status.isAssignedJudge ? '是' : '否'}`);
			console.log(`   是否已投票: ${status.hasVoted ? '是' : '否'}`);
			if (status.hasVoted) {
				console.log(`   投票方向: ${status.votedSide === 'left' ? '正方' : '反方'}`);
			}
			if (status.slot) {
				console.log(`   席位编号: ${status.slot}`);
			}
		}
		
	} catch (error) {
		console.error('❌ 诊断过程出错:', error);
	}
	
	console.log('\n✅ 诊断完成');
}

/**
 * 列出所有直播流及其评委分配
 */
async function listAllStreamsAndJudges() {
	console.log('📋 获取所有直播流和评委分配...\n');
	
	try {
		// 获取直播流列表
		const streamsResponse = await fetch(`${SERVER_CONFIG.BASE_URL}/api/v1/admin/streams`);
		const streamsResult = await streamsResponse.json();
		
		let streams = [];
		if (Array.isArray(streamsResult)) {
			streams = streamsResult;
		} else if (streamsResult?.streams) {
			streams = streamsResult.streams;
		} else if (streamsResult?.data?.streams) {
			streams = streamsResult.data.streams;
		} else if (streamsResult?.data && Array.isArray(streamsResult.data)) {
			streams = streamsResult.data;
		}
		
		const enabledStreams = streams.filter(s => s.enabled);
		
		console.log(`找到 ${enabledStreams.length} 个已启用的直播流:\n`);
		
		for (const stream of enabledStreams) {
			console.log(`📺 ${stream.name}`);
			console.log(`   ID: ${stream.id}`);
			console.log(`   类型: ${stream.type || 'hls'}`);
			
			// 获取评委分配
			try {
				const judgesResponse = await fetch(
					`${SERVER_CONFIG.BASE_URL}/api/v1/admin/judges?stream_id=${stream.id}`
				);
				const judgesResult = await judgesResponse.json();
				
				if (judgesResponse.ok && judgesResult.success) {
					const judges = judgesResult.data.judges || [];
					console.log(`   评委 (${judges.filter(j => j.userId).length}/3):`);
					judges.forEach((judge, index) => {
						if (judge.userId) {
							console.log(`      席位 ${index + 1}: ${judge.name} (ID: ${judge.userId})`);
						} else {
							console.log(`      席位 ${index + 1}: 未分配`);
						}
					});
				}
			} catch (error) {
				console.log(`   评委: 获取失败`);
			}
			
			console.log('');
		}
		
		console.log('✅ 列表完成');
		
	} catch (error) {
		console.error('❌ 获取列表失败:', error);
	}
}

/**
 * 快速修复：使用评委列表中的ID重新登录
 */
function loginAsJudge(judgeUserId, judgeName) {
	const userData = {
		userId: judgeUserId,
		username: judgeName || judgeUserId,
		role: 'judge',
		openid: judgeUserId,
		loginTime: new Date().toISOString()
	};
	
	localStorage.setItem('user', JSON.stringify(userData));
	console.log('✅ 已设置用户信息:', userData);
	console.log('🔄 正在刷新页面...');
	setTimeout(() => location.reload(), 500);
}

/**
 * 显示帮助信息
 */
function showVoteDiagnosticHelp() {
	console.log(`
🔧 投票功能诊断工具

使用方法:

1. 诊断特定直播流的投票问题:
   diagnosticVoteIssue("stream_id")
   
2. 列出所有直播流和评委分配:
   listAllStreamsAndJudges()
   
3. 使用评委ID重新登录:
   loginAsJudge("judge_user_id", "评委姓名")
   
4. 查看当前用户:
   getCurrentUser()

示例:
> listAllStreamsAndJudges()  // 先查看所有流和评委
> diagnosticVoteIssue("admin-allowed-stream")  // 诊断特定流
> loginAsJudge("b75cf2d4-6b62-4c34-bac6-6a225b683f8", "Judge Chen")  // 使用评委ID登录
	`);
}

// 自动显示帮助
console.log('%c🔧 投票诊断工具已加载', 'color: #e74c3c; font-size: 14px; font-weight: bold;');
console.log('%c输入 showVoteDiagnosticHelp() 查看使用说明', 'color: #95a5a6; font-size: 12px;');

// 导出到全局
if (typeof window !== 'undefined') {
	window.diagnosticVoteIssue = diagnosticVoteIssue;
	window.listAllStreamsAndJudges = listAllStreamsAndJudges;
	window.loginAsJudge = loginAsJudge;
	window.showVoteDiagnosticHelp = showVoteDiagnosticHelp;
}
