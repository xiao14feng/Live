from sqlalchemy import create_engine, text
engine = create_engine('sqlite:///d:/Desktop/project/live-debate-backend/live_debate.db', connect_args={'check_same_thread': False})
with engine.connect() as conn:
    rows = conn.execute(text("SELECT openid, nickname, role, status FROM users ORDER BY created_at DESC LIMIT 10")).fetchall()
    print(rows)
