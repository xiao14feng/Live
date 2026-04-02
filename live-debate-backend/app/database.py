"""
数据库连接和会话管理
支持本地SQLite和Cloudflare D1
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import os

from .config import get_database_url, is_cloudflare_env

# 数据库引擎
engine = None
SessionLocal = None


def init_database():
    """初始化数据库连接"""
    global engine, SessionLocal

    database_url = get_database_url()

    if is_cloudflare_env():
        engine = None
        SessionLocal = None
    else:
        connect_args = {}
        if "sqlite" in database_url:
            connect_args["check_same_thread"] = False

        engine = create_engine(
            database_url,
            connect_args=connect_args,
            echo=False,  # 关闭SQL日志
        )

        # 强制 SQLite 使用 UTF-8
        if "sqlite" in database_url:
            @event.listens_for(engine, "connect")
            def set_sqlite_pragma(dbapi_connection, connection_record):
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA encoding = 'UTF-8'")
                cursor.close()

        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_tables():
    """创建数据库表"""
    if engine:
        # 导入user模型的Base（它包含所有其他模型）
        from .models.user import Base as UserBase
        from .models.user import User
        from .models.vote import VoteRecord, VoteAggregate, JudgeAssignment, JudgeVote
        from .models.debate import Debate
        from .models.stream import Stream
        from .models.ai_content import AIContent, Comment
        
        # 使用user.py中的Base来创建所有表
        UserBase.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    获取数据库会话
    用于FastAPI依赖注入
    """
    if not SessionLocal:
        raise Exception("数据库未初始化")

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class CloudflareDatabase:
    """Cloudflare D1数据库操作类"""

    def __init__(self, d1_binding):
        self.db = d1_binding

    async def execute(self, query: str, params: list = None):
        if params:
            return await self.db.prepare(query).bind(*params).all()
        else:
            return await self.db.exec(query)

    async def get_user_by_openid(self, openid: str):
        result = await self.execute(
            "SELECT * FROM users WHERE openid = ?", [openid]
        )
        return result[0] if result else None

    async def create_user(self, user_data: dict):
        query = """
        INSERT INTO users (id, openid, unionid, nickname, avatar_url, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """
        await self.execute(query, [
            user_data["id"],
            user_data["openid"],
            user_data.get("unionid"),
            user_data.get("nickname"),
            user_data.get("avatar_url"),
            user_data.get("status", "active"),
        ])
        return await self.get_user_by_openid(user_data["openid"])

    async def get_users_list(self, page: int = 1, page_size: int = 20):
        offset = (page - 1) * page_size
        count_result = await self.execute("SELECT COUNT(*) as count FROM users")
        total = count_result[0]["count"] if count_result else 0
        users = await self.execute(
            "SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
            [page_size, offset],
        )
        return {"users": users, "total": total, "page": page, "page_size": page_size}


# 初始化数据库
init_database()

# 如果是本地环境，创建表
if not is_cloudflare_env():
    create_tables()
