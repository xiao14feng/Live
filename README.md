# 直播辩论系统

## 📌 基本信息

**项目名称**：Live Debate System — 实时直播辩论平台

一个支持实时投票、AI内容识别、评委管理、WebSocket实时推送的直播辩论系统，包含前端小程序/H5、Node.js网关、Python后端三个服务。

---

## 🚀 演示地址

| 服务 | 地址 |
| --- | --- |
| 前端（管理后台） | https://gregarious-success-production-e40e.up.railway.app/admin |
| 前端（主页） | https://gregarious-success-production-e40e.up.railway.app |
| 网关 API | https://determined-ambition-production-a3c3.up.railway.app |
| 后端 API | https://live-production-50f1.up.railway.app |
| 后端 API 文档 | https://live-production-50f1.up.railway.app/docs |

**管理员登录**：用户名 `Admin`，角色选 `admin`

---

## 🧱 技术栈说明

### 后端（`live-debate-backend/`）
- **框架**：FastAPI (Python)
- **数据库**：PostgreSQL（Railway 托管），SQLAlchemy ORM
- **认证**：JWT
- **Mock 数据**：启动时通过 `seed_db.py` 写入初始数据，接口返回真实 DB 数据

### 网关（`live-gateway-main/`）
- **框架**：Node.js + Express
- **WebSocket**：ws 库，路径 `/ws`
- **职责**：CORS 处理、请求代理到 Python 后端、实时状态广播、静态文件 serve

### 前端（`Live-main/`）
- **框架**：UniApp（支持微信小程序 + H5）
- **管理后台**：纯 HTML/JS，通过网关 API 交互
- **部署**：Railway 静态服务（`static-server.js`）

### 部署平台
- 全部部署在 **Railway**，三个独立服务 + 一个 PostgreSQL 数据库

---

## 🔗 项目结构

```
/
├── Live-main/              # 前端（UniApp + 管理后台 HTML）
│   ├── admin/              # 后台管理页面
│   ├── pages/              # 小程序页面
│   ├── config/             # API 地址配置
│   ├── static-server.js    # Railway 部署入口
│   └── railway.json
├── live-gateway-main/      # Node.js 网关
│   ├── gateway-new.js      # 主入口
│   ├── routes/             # 模块化路由
│   │   ├── state.js        # 共享内存状态
│   │   ├── websocket.js    # WebSocket
│   │   ├── admin-streams.js
│   │   ├── admin-votes.js
│   │   ├── admin-ai.js
│   │   ├── stats.js
│   │   ├── public.js
│   │   ├── wechat.js
│   │   └── admin-system.js
│   └── railway.json
├── live-debate-backend/    # Python FastAPI 后端
│   ├── app/
│   │   ├── api/            # 路由（auth, votes, streams, users...）
│   │   ├── models/         # SQLAlchemy 模型
│   │   ├── schemas/        # Pydantic 校验
│   │   ├── services/       # 业务逻辑
│   │   └── database.py     # DB 连接
│   ├── requirements.txt
│   └── railway.json
└── README.md
```

---

## 📡 主要接口

### 网关接口（`https://determined-ambition-production-a3c3.up.railway.app`）

| 功能 | 方法 | 路径 | 描述 |
| --- | --- | --- | --- |
| 健康检查 | GET | `/health` | 服务状态 |
| 获取票数 | GET | `/api/votes` | 当前正反方票数 |
| 用户投票 | POST | `/api/user-vote` | 100票分配制投票 |
| 获取辩题 | GET | `/api/debate-topic` | 当前辩题信息 |
| 获取AI内容 | GET | `/api/ai-content` | AI识别的辩论内容 |
| 添加评论 | POST | `/api/comment` | 对AI内容评论 |
| 点赞 | POST | `/api/like` | 内容/评论点赞 |
| 微信登录 | POST | `/api/wechat-login` | 微信小程序登录 |
| 直播状态 | GET | `/api/admin/live/status` | 当前直播状态 |
| 控制直播 | POST | `/api/admin/live/control` | 开始/停止直播 |
| 直播流列表 | GET | `/api/admin/streams` | 代理到Python后端 |
| 用户列表 | GET | `/api/admin/users` | 代理到Python后端 |
| 票数管理 | PUT | `/api/admin/votes` | 管理员修改票数 |
| WebSocket | WS | `/ws` | 实时数据推送 |

### 后端接口（`https://live-production-50f1.up.railway.app`）

| 功能 | 方法 | 路径 | 描述 |
| --- | --- | --- | --- |
| 用户登录 | POST | `/api/auth/login` | JWT 认证 |
| 直播流列表 | GET | `/api/admin/streams` | 分页查询 |
| 创建直播流 | POST | `/api/admin/streams` | 新增直播流 |
| 用户列表 | GET | `/api/admin/users` | 分页查询 |
| 提交投票 | POST | `/api/v1/user-vote` | 用户投票记录 |
| 评委分配 | GET/POST | `/api/v1/admin/judges` | 评委管理 |
| 投票统计 | GET | `/api/v1/admin/dashboard` | 数据概览 |

完整接口文档见：https://live-production-50f1.up.railway.app/docs

---

## 🧠 项目开发过程笔记

### 实现思路

项目采用三层架构：
- **前端**负责展示和用户交互
- **网关**统一处理 CORS、WebSocket、部分内存状态（票数、直播状态）
- **后端**负责持久化数据（用户、直播流、投票记录）

网关同时承担两个职责：一是代理转发到 Python 后端，二是维护实时状态并通过 WebSocket 广播给所有连接的客户端。

### 遇到的问题与解决方案

**1. gateway.js 编码损坏**
原始文件存在 GBK/UTF-8 混合编码问题，大量中文字符串损坏导致 SyntaxError。解决方案：将文件按功能模块拆分重写（`routes/` 目录），彻底绕开编码问题，同时实现了模块化。

**2. Railway WebSocket 不通**
Railway 的反向代理需要后端监听 `process.env.PORT`，原来硬编码 `8080` 导致 WebSocket 升级请求无法路由。修复：`const port = process.env.PORT || 8080`。

**3. CORS 预检失败**
前端发送带 `x-user-role` 自定义头的请求，网关 CORS 配置的 `allowedHeaders` 没有包含该字段。修复：在 `allowedHeaders` 中添加 `x-user-role`。

**4. 数据重启丢失**
SQLite 文件在 Railway 每次部署时重置。解决：接入 Railway PostgreSQL，通过环境变量 `DATABASE_URL` 切换，代码无需修改（SQLAlchemy 自动适配）。

**5. PowerShell Set-Content 编码问题**
用 PowerShell 替换文件内容时产生 BOM/GBK 编码，导致 Railway Nixpacks 构建失败（`stream did not contain valid UTF-8`）。解决：改用 Node.js `fs.writeFileSync(path, content, 'utf8')` 进行文件操作。

### 部署步骤

1. Railway 新建 Project，添加三个 GitHub 服务（分别指向 `Live-main`、`live-gateway-main`、`live-debate-backend` 子目录）
2. 添加 PostgreSQL 数据库服务
3. Python 后端服务设置环境变量 `DATABASE_URL`
4. 网关服务设置环境变量 `BACKEND_BASE_URL`（指向 Python 后端域名）
5. 各服务 `railway.json` 配置正确的 `startCommand`

---

## 🧍 个人介绍

全栈开发方向，主要使用 JavaScript/TypeScript（Node.js、Vue/UniApp）和 Python（FastAPI、Django）。熟悉 RESTful API 设计、WebSocket 实时通信、小程序开发。目前在学习云原生部署和微服务架构，这个项目是实践 Railway 多服务部署和前后端分离架构的一次完整练习。
