// WeChat login route
const express = require('express');
const router = express.Router();
const https = require('https');

function callWechatAPI(appid, secret, code) {
    return new Promise((resolve, reject) => {
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('Failed to parse WeChat API response: ' + e.message)); }
            });
        }).on('error', e => reject(new Error('WeChat API call failed: ' + e.message)));
    });
}

module.exports = (currentConfig) => {
    const WECHAT_CONFIG = {
        appid:   currentConfig.wechat.appid,
        secret:  process.env.WECHAT_SECRET || currentConfig.wechat.secret,
        useMock: currentConfig.wechat.useMock
    };

    router.post('/api/wechat-login', async (req, res) => {
        const { code, userInfo } = req.body;
        if (!code) return res.status(400).json({ success: false, message: 'code required' });

        try {
            let wechatData = null;

            if (WECHAT_CONFIG.useMock) {
                console.log('Using mock WeChat login (dev mode)');
                wechatData = {
                    openid:      'mock_openid_' + Date.now(),
                    session_key: 'mock_session_key_' + Math.random().toString(36).substr(2, 9)
                };
            } else {
                console.log('Calling real WeChat API, AppID:', WECHAT_CONFIG.appid);
                console.log('Secret:', WECHAT_CONFIG.secret ? WECHAT_CONFIG.secret.substring(0, 8) + '...' : 'not set');
                console.log('Code:', code ? code.substring(0, 20) + '...' : 'not provided');

                const apiResult = await callWechatAPI(WECHAT_CONFIG.appid, WECHAT_CONFIG.secret, code);

                if (apiResult.errcode) {
                    let errorMessage = `WeChat API error: ${apiResult.errmsg || 'unknown'}, code: ${apiResult.errcode}`;
                    if (apiResult.errcode === 40029) errorMessage = 'WeChat API error: invalid code (expired or already used)';
                    if (apiResult.errcode === 40163) errorMessage = 'WeChat API error: code already used';
                    console.error('WeChat API error:', apiResult);
                    return res.status(400).json({ success: false, message: errorMessage });
                }

                wechatData = { openid: apiResult.openid, session_key: apiResult.session_key, unionid: apiResult.unionid || null };
                console.log('WeChat API success, openid:', wechatData.openid);
            }

            res.json({
                success: true,
                data: {
                    openid:      wechatData.openid,
                    session_key: wechatData.session_key,
                    unionid:     wechatData.unionid || null,
                    userInfo:    userInfo || { nickName: 'WeChat User', avatarUrl: '/static/logo.png' },
                    loginTime:   new Date().toISOString(),
                    isMock:      WECHAT_CONFIG.useMock || WECHAT_CONFIG.secret === 'YOUR_APP_SECRET_HERE'
                }
            });
        } catch (error) {
            console.error('WeChat login error:', error);
            res.status(500).json({ success: false, message: 'WeChat login failed: ' + error.message });
        }
    });

    return router;
};
