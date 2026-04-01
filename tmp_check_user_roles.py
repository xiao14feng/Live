import sqlite3

conn = sqlite3.connect(r'd:\Desktop\project\live-debate-backend\live_debate.db')
cur = conn.cursor()
rows = cur.execute('select id, nickname, openid, role from users').fetchall()
for row in rows:
    print(row)
