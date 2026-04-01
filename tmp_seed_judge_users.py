from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pathlib import Path
import uuid
from datetime import datetime
import sys

ROOT = Path(r'd:\Desktop\project\live-debate-backend')
sys.path.insert(0, str(ROOT))

from app.models.user import User, UserRole

engine = create_engine('sqlite:///d:/Desktop/project/live-debate-backend/live_debate.db', connect_args={'check_same_thread': False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def ensure_user(db, openid, nickname, role, avatar_url):
    user = db.query(User).filter(User.openid == openid).first()
    if user:
        user.nickname = nickname
        user.role = role.value if hasattr(role, 'value') else role
        user.avatar_url = avatar_url
        user.status = 'active'
        user.updated_at = datetime.utcnow()
        return user, False

    user = User(
        id=str(uuid.uuid4()),
        openid=openid,
        nickname=nickname,
        avatar_url=avatar_url,
        role=role.value if hasattr(role, 'value') else role,
        status='active',
        total_votes=0,
        joined_debates=0,
    )
    db.add(user)
    return user, True

judge_users = [
    ('judge_test_li', '评委李青', UserRole.JUDGE, 'https://api.dicebear.com/7.x/adventurer/svg?seed=JudgeLi'),
    ('judge_test_wang', '评委王谨', UserRole.JUDGE, 'https://api.dicebear.com/7.x/adventurer/svg?seed=JudgeWang'),
    ('judge_test_chen', '评委陈诺', UserRole.JUDGE, 'https://api.dicebear.com/7.x/adventurer/svg?seed=JudgeChen'),
    ('judge_test_zhao', '评委赵宁', UserRole.JUDGE, 'https://api.dicebear.com/7.x/adventurer/svg?seed=JudgeZhao'),
]

db = SessionLocal()
created = 0
updated = 0
try:
    for openid, nickname, role, avatar_url in judge_users:
        _, is_created = ensure_user(db, openid, nickname, role, avatar_url)
        if is_created:
            created += 1
        else:
            updated += 1
    db.commit()
    print({'created': created, 'updated': updated, 'total_seeded': len(judge_users)})
finally:
    db.close()
