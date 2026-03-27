"""
应用配置文件
支持Cloudflare Workers环境和本地开发环境
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置类"""
    
    # 基础配置
    app_name: str = "直播辩论后端API"
    app_version: str = "1.0.0"
    environment: str = "development"
    debug: bool = True
    
    # 微信配置
    wechat_appid: str = "wx94289b0d2ca7a802"
    wechat_secret: str = "10409c1193a326a7b328f675b1776195"
    wechat_use_mock: bool = True  # 开发环境使用mock
    
    # JWT配置
    jwt_secret: str = "your-jwt-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24 * 7  # 7天
    
    # 数据库配置
    database_url: Optional[str] = None  # Cloudflare D1 或本地SQLite
    
    # Redis配置 (Cloudflare KV)
    redis_url: Optional[str] = None
    
    # CORS配置
    cors_origins: list = ["*"]  # 生产环境需要限制
    
    # API配置
    api_prefix: str = "/api"
    docs_url: str = "/docs"
    redoc_url: str = "/redoc"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# 全局配置实例
settings = Settings()


def get_settings() -> Settings:
    """获取配置实例"""
    return settings


def is_cloudflare_env() -> bool:
    """检查是否在Cloudflare环境中运行"""
    return os.getenv("CF_WORKER") is not None


def get_database_url() -> str:
    """获取数据库连接URL"""
    if is_cloudflare_env():
        # Cloudflare D1 通过绑定访问，不需要URL
        return "cloudflare-d1"
    else:
        # 本地开发使用SQLite
        return settings.database_url or "sqlite:///./live_debate.db"