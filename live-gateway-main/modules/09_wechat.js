// ── module: 09_wechat  |  original lines 2605–2922 of gateway.js ──
// ==================== 微信登录辅助函数 ====================

/**
 * 调用微信API获取openid和session_key
 * @param {string} appid - 微信小程序AppID
 * @param {string} secret - 微信小程序AppSecret
 * @param {string} code - 微信登录code
 * @returns {Promise<Object>} 微信API响应数据
 */
function callWechatAPI(appid, secret, code) {
    return new Promise((resolve, reject) => {
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (error) {
                    reject(new Error('解析微信API响应失败: ' + error.message));
                }
            });
        }).on('error', (error) => {
            reject(new Error('调用微信API失败: ' + error.message));
        });
    });
}

// 微信配置（从统一配置文件获取�?
const WECHAT_CONFIG = {
    appid: currentConfig.wechat.appid,
    secret: process.env.WECHAT_SECRET || currentConfig.wechat.secret,
    useMock: currentConfig.wechat.useMock
};

// 微信登录接口
app.post('/api/wechat-login', async (req, res) => {
    const { code, userInfo, encryptedData, iv } = req.body;

    // 参数验证
    if (!code) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数: code"
        });
    }

    try {
        console.log('══════════════════════════════════════�?);
        console.log('微信登录请求收到');
        console.log('══════════════════════════════════════�?);
        console.log('Code:', code);
        console.log('UserInfo:', userInfo?.nickName);
        console.log('useMock 配置:', WECHAT_CONFIG.useMock);
        console.log('══════════════════════════════════════�?);
        
        let wechatData = null;
        
        // 根据配置决定使用模拟模式还是真实微信API
        if (WECHAT_CONFIG.useMock) {
            // 使用模拟模式（用于开发测试或 H5 环境�?
            console.log('�?使用模拟微信登录响应（开发模式）');
            
            // 模拟微信API响应
            wechatData = {
                openid: 'mock_openid_' + Date.now(),
                session_key: 'mock_session_key_' + Math.random().toString(36).substr(2, 9),
                // 注意：真实API不会返回unionid，除非用户已绑定开放平�?
            };
            
            console.log('模拟数据生成成功:', {
                openid: wechatData.openid,
                session_key: wechatData.session_key.substring(0, 10) + '...'
            });
        } else {
            // 使用真实微信API
            console.log('🌐 调用真实微信登录API');
            console.log('AppID:', WECHAT_CONFIG.appid);
            
            try {
                console.log('📋 微信登录配置信息:');
                console.log('  - AppID:', WECHAT_CONFIG.appid);
                console.log('  - Secret:', WECHAT_CONFIG.secret ? WECHAT_CONFIG.secret.substring(0, 8) + '...' : '未设�?);
                console.log('  - Code:', code ? code.substring(0, 20) + '...' : '未提�?);
                
                const apiResult = await callWechatAPI(WECHAT_CONFIG.appid, WECHAT_CONFIG.secret, code);
                
                // 检查微信API返回的错�?
                if (apiResult.errcode) {
                    console.error('�?微信API返回错误:');
                    console.error('  - 错误�?', apiResult.errcode);
                    console.error('  - 错误信息:', apiResult.errmsg);
                    console.error('  - 完整响应:', JSON.stringify(apiResult, null, 2));
                    
                    // 特殊处理常见错误
                    let errorMessage = `微信API错误: ${apiResult.errmsg || '未知错误'}, rid: ${apiResult.errcode || 'N/A'}`;
                    if (apiResult.errcode === 40029) {
                        errorMessage = '微信API错误: invalid code (code无效或已过期), rid: ' + apiResult.errcode;
                    } else if (apiResult.errcode === 40163) {
                        errorMessage = '微信API错误: code been used (code已被使用), rid: ' + apiResult.errcode;
                    }
                    
                    return res.status(400).json({
                        success: false,
                        message: errorMessage
                    });
                }
                
                // 成功获取微信数据
                wechatData = {
                    openid: apiResult.openid,
                    session_key: apiResult.session_key,
                    unionid: apiResult.unionid || null
                };
                
                console.log('真实微信API调用成功:', {
                    openid: wechatData.openid,
                    hasSessionKey: !!wechatData.session_key,
                    hasUnionId: !!wechatData.unionid
                });
            } catch (error) {
                console.error('调用真实微信API失败:', error);
                return res.status(500).json({
                    success: false,
                    message: `调用微信API失败: ${error.message}`
                });
            }
        }
        
        // 保存用户到数据库（在管理系统中显示）
        
        const userId = wechatData.openid; // 使用openid作为用户ID
        if (userId) {
            db.users.createOrUpdate({
                id: userId,
                nickName: userInfo?.nickName || '微信用户',
                avatarUrl: userInfo?.avatarUrl || '/static/logo.png'
            });
        }
        
        // 返回统一的响应格�?
        const response = {
            success: true,
            data: {
                openid: wechatData.openid,
                session_key: wechatData.session_key,
                unionid: wechatData.unionid || null, // 如果有开放平台，会返回unionid
                userInfo: userInfo || {
                    nickName: '微信用户',
                    avatarUrl: '/static/logo.png'
                },
                loginTime: new Date().toISOString(),
                isMock: WECHAT_CONFIG.useMock || WECHAT_CONFIG.secret === 'YOUR_APP_SECRET_HERE'
            }
        };
        
        console.log('返回登录响应:', { 
            openid: response.data.openid,
            hasUserInfo: !!userInfo,
            isMock: response.data.isMock
        });
        
        res.json(response);
        
    } catch (error) {
        console.error('微信登录处理错误:', error);
        res.status(500).json({
            success: false,
            message: "服务器处理微信登录时出错: " + error.message
        });
    }
});

// 用户投票（支�?00票分配制�?
app.post('/api/user-vote', (req, res) => {
    console.log('══════════════════════════════════════�?);
    console.log('�?/api/user-vote 路由被调�?);
    console.log('📥 请求来源:', req.headers.origin || req.headers.referer || '未知');
    console.log('📥 请求方法:', req.method);
    console.log('📥 请求参数:', req.body);
    console.log('📥 请求�?', {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
    });
    console.log('══════════════════════════════════════�?);
    
    const { side, votes, leftVotes, rightVotes, userId } = req.body;

    // 支持两种格式�?
    // 格式1（增量投票）: { side: "left"|"right", votes: number }
    // 格式2�?00票分配）: { leftVotes: number, rightVotes: number }
    
    let userLeftVotes = 0;
    let userRightVotes = 0;
    let voteMode = '';
    
    // 检测并解析不同格式
    if (leftVotes !== undefined && rightVotes !== undefined) {
        // 格式2�?00票分配制
        voteMode = '100票分配制';
        userLeftVotes = parseInt(leftVotes) || 0;
        userRightVotes = parseInt(rightVotes) || 0;
        
        // 验证总票数是否为100
        const total = userLeftVotes + userRightVotes;
        if (total !== 100) {
            return res.status(400).json({
                success: false,
                message: `票数分配错误: 正方 ${userLeftVotes} + 反方 ${userRightVotes} = ${total}，必须等�?00`
            });
        }
        
        if (userLeftVotes < 0 || userLeftVotes > 100 || userRightVotes < 0 || userRightVotes > 100) {
            return res.status(400).json({
                success: false,
                message: "参数错误: 票数必须�?0-100 之间"
            });
        }
        
        console.log(`📊 100票分配制投票: 正方 ${userLeftVotes} �? 反方 ${userRightVotes} 票`);
        
        // 100票分配制：直接累加用户的票数
        currentVotes.leftVotes += userLeftVotes;
        currentVotes.rightVotes += userRightVotes;
        
    } else if (side && (votes !== undefined || votes === null)) {
        // 格式1：增量投票（兼容旧版本）
        voteMode = '增量投票';
        
        if (side !== 'left' && side !== 'right') {
            return res.status(400).json({
                success: false,
                message: "参数错误: side 必须�?'left' �?'right'"
            });
        }

        const voteCount = parseInt(votes) || 10;
        if (voteCount < 1 || voteCount > 1000) {
            return res.status(400).json({
                success: false,
                message: "参数错误: 投票数量必须�?1-1000 之间"
            });
        }
        
        console.log(`📊 增量投票: ${side === 'left' ? '正方' : '反方'} +${voteCount} 票`);
        
        if (side === 'left') {
            currentVotes.leftVotes += voteCount;
            userLeftVotes = voteCount;
        } else {
            currentVotes.rightVotes += voteCount;
            userRightVotes = voteCount;
        }
        
    } else {
        return res.status(400).json({
            success: false,
            message: "参数错误: 请提�?{ leftVotes, rightVotes } �?{ side, votes }"
        });
    }

    // 更新数据库统计（如果已加载）
    try {
        
        if (userId) {
            const totalUserVotes = userLeftVotes + userRightVotes;
            db.users.updateStats(userId, { votes: totalUserVotes });
        }
        db.statistics.incrementVotes(userLeftVotes + userRightVotes);
    } catch (error) {
        // 如果数据库模块未加载，忽略错�?
        console.log('统计数据更新跳过（开发模式）');
    }

    const total = currentVotes.leftVotes + currentVotes.rightVotes;
    const responseData = {
        success: true,
        data: {
            leftVotes: currentVotes.leftVotes,
            rightVotes: currentVotes.rightVotes,
            totalVotes: total,
            leftPercentage: total > 0
                ? Math.round((currentVotes.leftVotes / total) * 100)
                : 50,
            rightPercentage: total > 0
                ? Math.round((currentVotes.rightVotes / total) * 100)
                : 50
        },
        message: `投票成功 (${voteMode})`
    };
    
    console.log(`�?投票成功！当前总票�? 正方 ${currentVotes.leftVotes} (${responseData.data.leftPercentage}%), 反方 ${currentVotes.rightVotes} (${responseData.data.rightPercentage}%)`);

    // 广播投票更新给所�?WebSocket 客户端（包括后台管理系统�?
    broadcast('votes-updated', {
        leftVotes: currentVotes.leftVotes,
        rightVotes: currentVotes.rightVotes,
        leftPercentage: responseData.data.leftPercentage,
        rightPercentage: responseData.data.rightPercentage,
        totalVotes: total,
        userVote: {
            userId: userId || 'anonymous',
            leftVotes: userLeftVotes,
            rightVotes: userRightVotes,
            mode: voteMode
        },
        timestamp: new Date().toISOString()
    });

    res.json(responseData);
});
