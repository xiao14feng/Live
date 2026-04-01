from sqlalchemy import create_engine, text
engine = create_engine('sqlite:///d:/Desktop/project/live-debate-backend/live_debate.db', connect_args={'check_same_thread': False})
with engine.connect() as conn:
    result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='users'"))
    print(result.fetchone())
