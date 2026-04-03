// config/server-mode.node.js (Node.js后端专用)
const USE_MOCK_SERVER = false; // 改为 false 使用真实服务器
const LOCAL_SERVER_URL = 'http://localhost:8080';
const REAL_SERVER_URL = 'http://192.168.31.249:8080'; // 中间层服务器地址
const REAL_SERVER_PORT = process.env.PORT || 8080;
const REAL_WECHAT_CONFIG = {
    appid: 'wx94289b0d2ca7a802',
    secret: '10409c1193a326a7b328f675b1776195'
};
const getLocalIP = () => '192.168.31.189';
const MOCK_SERVER_CONFIG = {
    host: getLocalIP(),
    port: 8080,
    url: `http://${getLocalIP()}:8080`
};
const getCurrentServerConfig = () => {
    if (USE_MOCK_SERVER) {
        return {
            mode: 'mock',
            url: MOCK_SERVER_CONFIG.url,
            host: MOCK_SERVER_CONFIG.host,
            port: MOCK_SERVER_CONFIG.port,
            wechat: {
                useMock: true,
                appid: 'wx94289b0d2ca7a802',
                secret: '10409c1193a326a7b328f675b1776195'
            }
        };
    } else {
        // 使用真实服务器，直接连接中间层
        return {
            mode: 'real',
            url: REAL_SERVER_URL,
            port: REAL_SERVER_PORT,  // 使用8080端口，与前端配置保持一致
            wechat: {
                useMock: false,
                appid: REAL_WECHAT_CONFIG.appid,
                secret: REAL_WECHAT_CONFIG.secret
            }
        };
    }
};
const printConfig = () => {
    const config = getCurrentServerConfig();
    console.log('═══════════════════════════════════════');
    console.log('📋 服务器配置信息');
    console.log('═══════════════════════════════════════');
    console.log(`模式: ${config.mode === 'mock' ? '🧪 模拟服务器' : '🌐 真实服务器'}`);
    console.log(`地址: ${config.url}`);
    if (config.mode === 'mock') {
        console.log(`本地访问: http://localhost:${config.port}`);
        console.log(`局域网访问: ${config.url}`);
    }
    console.log(`微信登录: ${config.wechat.useMock ? '模拟模式' : '真实模式'}`);
    if (!config.wechat.useMock) {
        console.log(`微信 AppID: ${config.wechat.appid}`);
        console.log(`微信 Secret: ${config.wechat.secret ? config.wechat.secret.substring(0, 8) + '...' : '未设置'}`);
    }
    console.log('═══════════════════════════════════════');
};
module.exports = {
    USE_MOCK_SERVER,
    MOCK_SERVER_CONFIG,
    REAL_SERVER_URL,
    REAL_SERVER_PORT,
    REAL_WECHAT_CONFIG,
    getCurrentServerConfig,
    printConfig,
    LOCAL_SERVER_URL,
};
