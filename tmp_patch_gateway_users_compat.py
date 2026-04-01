from pathlib import Path

p = Path(r'd:\Desktop\project\live-gateway-main\gateway.js')
s = p.read_text(encoding='utf-8')
old = """		const data = payload?.data || {};
		const users = Array.isArray(data.users) ? data.users.map((user) => ({"""
new = """		const data = payload?.data;
		const userList = Array.isArray(data) ? data : data?.users;
		const users = Array.isArray(userList) ? userList.map((user) => ({"""
if old not in s:
    raise SystemExit('old snippet not found')
p.write_text(s.replace(old, new, 1), encoding='utf-8')
print('patched-list-compat')
