"""
FastAPI应用主入口
支持本地开发和Cloudflare Workers部署
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from datetime import datetime

from .config import settings, is_cloudflare_env
from .api import auth
from .api import votes
from .api import debate
from .database import init_database, create_tables


def create_app(env=None) -> FastAPI:
    """
    创建FastAPI应用实例
    """
    app = FastAPI(
        title=settings.app_name,
        description="直播辩论小程序后端API服务",
        version=settings.app_version,
        docs_url=settings.docs_url if settings.debug else None,
        redoc_url=settings.redoc_url if settings.debug else None,
    )

    # CORS配置
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
    )

    # 注入Cloudflare环境
    if env and is_cloudflare_env():
        app.state.env = env
        if hasattr(env, 'DB'):
            app.state.db = env.DB
        if hasattr(env, 'CACHE'):
            app.state.cache = env.CACHE
        if hasattr(env, 'LIVE_ROOM'):
            app.state.websocket = env.LIVE_ROOM

    # 注册路由
    app.include_router(auth.router, prefix=settings.api_prefix, tags=["用户认证"])
    app.include_router(votes.router, prefix=settings.api_prefix, tags=["投票系统"])
    app.include_router(debate.router, prefix=settings.api_prefix, tags=["辩题管理"])

    @app.get("/")
    async def root():
        return {
            "message": "直播辩论后端API服务运行中",
            "version": settings.app_version,
            "environment": settings.environment,
            "timestamp": datetime.now().isoformat(),
            "docs_url": settings.docs_url if settings.debug else None,
        }

    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "environment": settings.environment,
        }

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "服务器内部错误",
                "error": str(exc) if settings.debug else "Internal Server Error",
                "timestamp": datetime.now().isoformat(),
            },
        )

    @app.options("/{path:path}")
    async def options_handler(request: Request):
        return JSONResponse(
            content={},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age": "86400",
            },
        )

    return app


# 创建应用实例
app = create_app()


@app.on_event("startup")
async def startup_event():
    print(f"[启动] {settings.app_name} v{settings.app_version} 启动中...")
    print(f"[环境] {settings.environment}")
    print(f"[调试] {settings.debug}")
    if not is_cloudflare_env():
        print("[数据库] SQLite (本地开发)")
        print(f"[微信登录] {'Mock模式' if settings.wechat_use_mock else '真实API'}")
    else:
        print("[运行环境] Cloudflare Workers")


@app.on_event("shutdown")
async def shutdown_event():
    print("[关闭] 应用正在关闭...")


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
