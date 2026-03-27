# 直播辩论后端API

基于FastAPI开发的直播辩论小程序后端服务，支持本地开发和Cloudflare Workers部署。

## 功能特性

- ✅ 微信登录认证 (支持真实API和Mock模式)
- ✅ 用户管理系统
- ✅ JWT令牌认证
- ✅ 自动API文档生成
- ✅ 支持本地SQLite和Cloudflare D1
- ✅ 完整的错误处理
- ✅ CORS跨域支持

## 技术栈

- **Web框架**: FastAPI 0.104+
- **数据库**: SQLite (本地) / Cloudflare D1 (生产)
- **认证**: JWT + 微信登录
- **数据验证**: Pydantic
- **HTTP客户端**: httpx
- **密码加密**: passlib + bcrypt

## 快速开始

### 1. 环境准备

```bash
# 克隆项目
cd live-debate-backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 2. 配置环境

```bash
# 复制环境配置文件
cp .env.example .env

# 编辑配置文件
# 修改微信AppID、Secret等配置
```

### 3. 启动服务

```bash
# 开发模式启动
python -m app.main

# 或使用uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. 访问API文档

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- API根路径: http://localhost:8000/

## API接口

### 用户认证模块

#### 微信登录
```http
POST /api/wechat-login
Content-Type: application/json

{
  "code": "微信登录code",
  "userInfo": {
    "nickName": "用户昵称",
    "avatarUrl": "头像URL"
  }
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "openid": "mock_openid_1234567890",
    "session_key": "mock_session_key_abcdef",
    "userInfo": {
      "nickName": "微信用户",
      "avatarUrl": "/static/logo.png"
    },
    "loginTime": "2024-01-01T12:00:00.000Z",
    "isMock": true,
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  },
  "message": "登录成功"
}
```

#### 获取用户列表 (管理员)
```http
GET /api/admin/users?page=1&page_size=20
```

#### 获取用户详情 (管理员)
```http
GET /api/admin/users/{user_id}
```

#### 获取用户统计 (管理员)
```http
GET /api/admin/miniprogram/users
```

## 项目结构

```
live-debate-backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI应用入口
│   ├── config.py            # 配置文件
│   ├── database.py          # 数据库连接
│   ├── models/              # SQLAlchemy模型
│   │   ├── __init__.py
│   │   └── user.py          # 用户模型
│   ├── schemas/             # Pydantic模型
│   │   ├── __init__.py
│   │   └── user.py          # 用户Schema
│   ├── api/                 # API路由
│   │   ├── __init__.py
│   │   └── auth.py          # 认证路由
│   ├── services/            # 业务逻辑
│   │   ├── __init__.py
│   │   └── wechat.py        # 微信服务
│   └── utils/               # 工具函数
│       ├── __init__.py
│       └── security.py      # 安全工具
├── requirements.txt         # 依赖包
├── .env.example            # 环境配置示例
└── README.md               # 项目文档
```

## 开发指南

### 添加新的API接口

1. 在 `app/models/` 中定义数据模型
2. 在 `app/schemas/` 中定义请求/响应模型
3. 在 `app/services/` 中实现业务逻辑
4. 在 `app/api/` 中定义API路由
5. 在 `app/main.py` 中注册路由

### 数据库迁移

```bash
# 生成迁移文件
alembic revision --autogenerate -m "描述"

# 执行迁移
alembic upgrade head
```

### 运行测试

```bash
# 运行所有测试
pytest

# 运行特定测试
pytest tests/test_auth.py

# 生成覆盖率报告
pytest --cov=app tests/
```

## 部署

### Cloudflare Workers部署

详见 [Cloudflare部署指南.md](../Cloudflare部署指南.md)

### 传统服务器部署

```bash
# 使用gunicorn部署
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `ENVIRONMENT` | 运行环境 | `development` |
| `DEBUG` | 调试模式 | `true` |
| `WECHAT_APPID` | 微信小程序AppID | - |
| `WECHAT_SECRET` | 微信小程序Secret | - |
| `WECHAT_USE_MOCK` | 使用微信Mock模式 | `true` |
| `JWT_SECRET` | JWT密钥 | - |
| `DATABASE_URL` | 数据库连接URL | `sqlite:///./live_debate.db` |

## 注意事项

1. **生产环境配置**: 
   - 修改 `JWT_SECRET` 为强密码
   - 设置正确的微信 `WECHAT_SECRET`
   - 限制 `CORS_ORIGINS` 为实际域名

2. **微信登录配置**:
   - 开发环境可使用 `WECHAT_USE_MOCK=true`
   - 生产环境需要真实的微信AppID和Secret

3. **数据库**:
   - 本地开发使用SQLite
   - Cloudflare部署使用D1数据库

## 许可证

MIT License