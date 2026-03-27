"""
数据库连接和会话管理
支持本地SQLite和Cloudflare D1
"""
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import os

from .config import get_database_url, is_cloudflare_env

# 数据库引擎
engine = None
SessionLocal = None
Base = declarative_base()


def init_database():
    """初始化数据库连接"""
    global engine, SessionLocal
    
    database_url = get_database_url()
    
    if is_cloudflare_env():
        # Cloudflare D1 环境
        # 注意：实际使用时需要通过Cloudflare绑定访问D1
        # 这里只是示例，实际实现需要使用Cloudflare的D1客户端
        engine = None  # D1不使用SQLAlchemy引擎
        SessionLocal = None
    else:
        # 本地开发环境
        engine = create_engine(
            database_url,
            connect_args={"check_same_thread": False} if "sqlite" in database_url else {},
            echo=True  # 开发环境显示SQL
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_tables():
    """创建数据库表"""
    if engine:
        # 导入所有模型以确保表被创建
        from .models.user import User
        # 使用User模型的Base来创建表
        User.metadata.create_all(bind=engine)


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
        """
        初始化Cloudflare D1数据库
        
        Args:
            d1_binding: Cloudflare D1绑定对象
        """
        self.db = d1_binding
    
    async def execute(self, query: str, params: list = None):
        """
        执行SQL查询
        
        Args:
            query: SQL查询语句
            params: 查询参数
            
        Returns:
            查询结果
        """
        if params:
            return await self.db.prepare(query).bind(*params).all()
        else:
            return await self.db.exec(query)
    
    async def get_user_by_openid(self, openid: str):
        """根据openid获取用户"""
        result = await self.execute(
            "SELECT * FROM users WHERE openid = ?",
            [openid]
        )
        return result[0] if result else None
    
    async def create_user(self, user_data: dict):
        """创建用户"""
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
            user_data.get("status", "active")
        ])
        return await self.get_user_by_openid(user_data["openid"])
    
    async def update_user(self, openid: str, user_data: dict):
        """更新用户信息"""
        set_clauses = []
        params = []
        
        for key, value in user_data.items():
            if key != "openid":  # openid不能更新
                set_clauses.append(f"{key} = ?")
                params.append(value)
        
        if set_clauses:
            set_clauses.append("updated_at = datetime('now')")
            params.append(openid)
            
            query = f"UPDATE users SET {', '.join(set_clauses)} WHERE openid = ?"
            await self.execute(query, params)
        
        return await self.get_user_by_openid(openid)
    
    async def get_users_list(self, page: int = 1, page_size: int = 20):
        """获取用户列表"""
        offset = (page - 1) * page_size
        
        # 获取总数
        count_result = await self.execute("SELECT COUNT(*) as count FROM users")
        total = count_result[0]["count"] if count_result else 0
        
        # 获取用户列表
        users = await self.execute(
            "SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
            [page_size, offset]
        )
        
        return {
            "users": users,
            "total": total,
            "page": page,
            "page_size": page_size
        }


# 初始化数据库
init_database()

# 如果是本地环境，创建表
if not is_cloudflare_env():
    create_tables()