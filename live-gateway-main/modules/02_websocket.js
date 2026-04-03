// ── module: 02_websocket  |  original lines 166–207 of gateway.js ──
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));
app.use(express.json());

// ==================== 后台管理路由（必须在代理之前�?====================
const path = require('path');
// 支持本地和Railway两种环境
const frontendRoot = process.env.FRONTEND_ROOT 
	? path.resolve(process.env.FRONTEND_ROOT)
	: path.resolve(__dirname, '..', 'Live-main');
const frontendAdminDir = path.join(frontendRoot, 'admin');
// 网关自带的db.js（用于生产环境）
const fs = require('fs');
const frontendStaticDir = path.join(frontendRoot, 'static');

// 提供主页面（根路由）
app.get('/', (req, res) => {
	const _idx = path.join(frontendRoot, 'index.html'); if (fs.existsSync(_idx)) { res.sendFile(_idx); } else { res.json({ status: 'ok', message: 'Live Debate Gateway API' }); }
});

// 提供后台管理页面
app.get('/admin', (req, res) => {
	const _adm = path.join(frontendAdminDir, 'index.html'); if (fs.existsSync(_adm)) { res.sendFile(_adm); } else { res.json({ status: 'ok' }); }
});

// 提供后台管理静态资�?
if (fs.existsSync(frontendAdminDir)) { app.use('/admin', express.static(frontendAdminDir)); }

// 提供静态资源（图标、动画等�?
if (fs.existsSync(frontendStaticDir)) { app.use('/static', express.static(frontendStaticDir)); }

// 提供所有其他静态文件（CSS、JS等）
if (fs.existsSync(frontendRoot)) { app.use(express.static(frontendRoot)); }
// ==================== 后台管理路由结束 ====================

// ==================== 内存存储 ====================
let liveSchedule = { streamId: null, scheduledStartTime: null, scheduledEndTime: null };
