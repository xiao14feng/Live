import sqlite3

conn = sqlite3.connect(r'd:\Desktop\project\live-debate-backend\live_debate.db')
cur = conn.cursor()
rows = cur.execute("select id, title, type, url, enabled from streams order by created_at desc limit 5").fetchall()
for row in rows:
    print(row)
