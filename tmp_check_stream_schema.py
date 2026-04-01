import sqlite3

conn = sqlite3.connect(r'd:\Desktop\project\live-debate-backend\live_debate.db')
cur = conn.cursor()
print(cur.execute("PRAGMA table_info(streams)").fetchall())
