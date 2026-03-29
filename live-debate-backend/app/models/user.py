"""
用户数据模型
"""
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
import uuid
from enum import Enum as PyEnum

# 创建独立的Base
Base = declarative_base()


class UserRole(str, PyEnum):
    """用户角色枚举"""
    USER = "user"      # 普通用户
    JUDGE = "judge"    # 评委
    ADMIN = "admin"    # 管理员


class User(Base):
    """用户模型"""
    __tablename__ = "users"
    
    # 主键，使用UUID
    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 微信相关字段
    openid = Column(String(100), unique=True, nullable=False, index=True)
    unionid = Column(String(100), nullable=True, index=True)  # 开放平台unionid
    
    # 用户信息
    nickname = Column(String(100), nullable=True)
    avatar_url = Column(Text, nullable=True)
    
    # 角色字段 - 新增
    role = Column(String(20), default=UserRole.USER, nullable=False)  # user, judge, admin
    
    # 统计字段
    total_votes = Column(Integer, default=0, nullable=False)
    joined_debates = Column(Integer, default=0, nullable=False)
    
    # 状态字段
    status = Column(String(20), default="active", nullable=False)  # active, inactive, banned
    
    # 时间字段
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<User(id={self.id}, nickname={self.nickname}, role={self.role}, openid={self.openid[:10]}...)>"
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            "id": self.id,
            "openid": self.openid,
            "unionid": self.unionid,
            "nickname": self.nickname,
            "avatar_url": self.avatar_url,
            "role": self.role,
            "total_votes": self.total_votes,
            "joined_debates": self.joined_debates,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
        }
    
    def is_active(self) -> bool:
        """检查用户是否活跃"""
        return self.status == "active"
    
    def is_admin(self) -> bool:
        """检查是否是管理员"""
        return self.role == UserRole.ADMIN
    
    def is_judge(self) -> bool:
        """检查是否是评委"""
        return self.role == UserRole.JUDGE
    
    def is_user(self) -> bool:
        """检查是否是普通用户"""
        return self.role == UserRole.USER
    
    def update_login_time(self):
        """更新最后登录时间"""
        self.last_login_at = func.now()
    
    def add_votes(self, count: int):
        """增加投票数"""
        self.total_votes += count
    
    def join_debate(self):
        """参与辩论计数"""
        self.joined_debates += 1
