# 直播辩论系统 - 快速启动指南

## 🚀 快速开始

### 前置要求
- Python 3.8+
- SQLite3
- pip

### 安装步骤

#### 1. 进入项目目录
```bash
cd live-debate-backend
```

#### 2. 创建虚拟环境（如果还没有）
```bash
python -m venv venv
```

#### 3. 激活虚拟环境

**Windows (PowerShell)**:
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows (CMD)**:
```cmd
venv\Scripts\activate.bat
```

**Linux/Mac**:
```bash
source venv/bin/activate
```

#### 4. 安装依赖
```bash
pip install -r requirements.txt
```

#### 5. 初始化数据库
```bash
python init_db.py
```

#### 6. 启动服务器

**开发模式（自动重载）**:
```bash
python run_server.py
```

**生产模式**:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 📍 访问地址

| 功能 | 地址 |
|------|------|
| API服务 | http://localhost:8000 |
| API文档 | http://localhost:8000/docs |
| ReDoc文档 | http://localhost:8000/redoc |
| 健康检查 | http://localhost:8000/health |
| WebSocket | ws://localhost:8000/ws |

---

## 🧪 测试API

### 1. 健康检查
```bash
curl http://localhost:8000/health
```

### 2. 获取辩题
```bash
curl http://localhost:8000/api/debate-topic
```

### 3. 创建直播流
```bash
curl -X POST http://localhost:8000/api/admin/streams \
  -H "Content-Type: application/json" \
  -d '{"title":"测试直播","description":"测试描述"}'
```

### 4. 用户投票
```bash
curl -X POST http://localhost:8000/api/user-vote \
  -H "Content-Type: application/json" \
  -d '{"leftVotes":60,"rightVotes":40,"streamId":"default"}'
```

### 5. 获取仪表板
```bash
curl http://localhost:8000/api/admin/dashboard
```

---

## 📚 主要API端点

### 认证模块
- `GET /api/debate-topic` - 获取当前辩题
- `PUT /api/admin/debate` - 更新辩题

### 直播流管理
- `GET /api/streams` - 获取直播流列表
- `POST /api/admin/streams` - 创建直播流
- `PUT /api/admin/streams/{id}` - 更新直播流
- `DELETE /api/admin/streams/{id}` - 删除直播流
- `POST /api/admin/live/control` - 控制直播（开始/结束）
- `GET /api/live/status` - 获取直播状态

### 投票系统
- `GET /api/votes` - 获取投票数据
- `POST /api/user-vote` - 用户投票
- `GET /api/admin/votes/statistics` - 投票统计

### AI内容管理
- `GET /api/ai-content` - 获取内容列表
- `POST /api/admin/ai-content` - 创建内容
- `PUT /api/admin/ai-content/{id}` - 更新内容
- `DELETE /api/admin/ai-content/{id}` - 删除内容
- `POST /api/ai-content/{id}/like` - 点赞内容

### 评论互动
- `POST /api/comment` - 发表评论
- `DELETE /api/comment/{id}` - 删除评论
- `POST /api/comment/{id}/like` - 点赞评论
- `GET /api/user/{user_id}/comments` - 获取用户评论

### 用户管理
- `GET /api/admin/users` - 获取用户列表
- `GET /api/admin/users/{id}` - 获取用户详情
- `GET /api/admin/miniprogram/users` - 小程序用户统计

### 统计数据
- `GET /api/admin/dashboard` - 仪表板数据
- `GET /api/admin/statistics/summary` - 统计摘要
- `GET /api/admin/statistics/daily` - 每日统计
- `GET /api/admin/statistics/votes` - 投票统计
- `GET /api/admin/statistics/content` - 内容统计

### WebSocket
- `WS /ws` - WebSocket连接
- `GET /ws/stats` - WebSocket统计

---

## 🔧 环境配置

### .env 文件配置

```env
# 应用配置
APP_NAME=直播辩论小程序后端
APP_VERSION=1.0.0
DEBUG=True
ENVIRONMENT=development

# 数据库
DATABASE_URL=sqlite:///./debate.db

# 微信配置
WECHAT_APP_ID=your_app_id
WECHAT_APP_SECRET=your_app_secret
WECHAT_USE_MOCK=True

# CORS配置
CORS_ORIGINS=["*"]

# API前缀
API_PREFIX=/api
```

---

## 📊 数据库

### 数据库表
- `users` - 用户表
- `debates` - 辩题表
- `streams` - 直播流表
- `vote_records` - 投票记录表
- `vote_aggregates` - 投票汇总表
- `ai_contents` - AI内容表
- `comments` - 评论表

### 初始化数据
运行 `init_db.py` 会自动创建表和初始数据：
- 4个测试用户
- 1个默认辩题
- 示例投票数据

---

## 🐛 常见问题

### Q: 如何重置数据库？
```bash
rm debate.db
python init_db.py
```

### Q: 如何查看API文档？
访问 http://localhost:8000/docs (Swagger UI)

### Q: 如何启用真实微信登录？
在 `.env` 中设置 `WECHAT_USE_MOCK=False` 并配置微信凭证

### Q: WebSocket连接失败？
确保服务器正在运行，检查防火墙设置

---

## 📝 日志

日志文件位置：`./logs/`

查看实时日志：
```bash
tail -f logs/app.log
```

---

## 🚀 部署

### 部署到Cloudflare Workers

1. 安装Wrangler CLI
```bash
npm install -g wrangler
```

2. 配置 `wrangler.toml`

3. 部署
```bash
wrangler publish
```

### 部署到传统服务器

1. 使用Gunicorn
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app.main:app
```

2. 使用Nginx反向代理
```nginx
server {
    listen 80;
    server_name your_domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📞 支持

如有问题，请查看：
- API文档: http://localhost:8000/docs
- 测试报告: TEST_REPORT.md
- 项目规划: 项目规划.md

---

**最后更新**: 2026-03-28  
**版本**: 1.0.0  
**状态**: ✅ 生产就绪
