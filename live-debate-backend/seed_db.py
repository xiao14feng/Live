# -*- coding: utf-8 -*-
"""
数据库初始化种子脚本
"""
import sys
import os
import uuid

# 强制 stdout 使用 UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine
from app.models.user import Base, User
from app.models.vote import VoteRecord, VoteAggregate
from app.models.debate import Debate

# 创建所有表
Base.metadata.create_all(bind=engine)
print("[OK] 数据库表创建完成")

db = SessionLocal()

# 检查是否已有辩题
existing = db.query(Debate).first()
if not existing:
    debate = Debate(
        id=str(uuid.uuid4()),
        title="如果有一个能一键消除痛苦的按钮，你会按吗？",
        description="这是一个关于痛苦、成长与人性选择的深度辩论",
        left_position="会按",
        right_position="不会按",
        is_active=True,
    )
    db.add(debate)
    db.commit()
    print("[OK] 默认辩题已插入")
else:
    print("[SKIP] 辩题已存在")

# 插入示例用户
sample_users = [
    {"openid": "mock_openid_admin_001", "nickname": "管理员", "avatar_url": "/static/admin-avatar.png"},
    {"openid": "mock_openid_user_001", "nickname": "测试用户1", "avatar_url": "/static/user1-avatar.png", "total_votes": 150},
    {"openid": "mock_openid_user_002", "nickname": "测试用户2", "avatar_url": "/static/user2-avatar.png", "total_votes": 89},
    {"openid": "mock_openid_user_003", "nickname": "辩论爱好者", "avatar_url": "/static/user3-avatar.png", "total_votes": 267},
]

for u in sample_users:
    existing_user = db.query(User).filter(User.openid == u["openid"]).first()
    if not existing_user:
        user = User(
            id=str(uuid.uuid4()),
            openid=u["openid"],
            nickname=u["nickname"],
            avatar_url=u["avatar_url"],
            total_votes=u.get("total_votes", 0),
            status="active",
        )
        db.add(user)

db.commit()
print("[OK] 示例用户已插入")
db.close()
print("[DONE] 数据库初始化完成")
