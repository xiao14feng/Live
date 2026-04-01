from pathlib import Path

p = Path(r'd:\Desktop\project\live-gateway-main\gateway.js')
s = p.read_text(encoding='utf-8')
old = """// 管理API - 用户管理
app.get('/api/admin/users', async (req, res) => {
\ttry {
\t\tconst users = db.users.getAll();
\t\tres.json(users);
\t} catch (error) {
\t\tconsole.error('获取用户列表失败:', error);
\t\tres.status(500).json({ error: '获取失败' });
\t}
});

app.get('/api/admin/users/:id', async (req, res) => {
\ttry {
\t\tconst user = db.users.getById(req.params.id);
\t\tif (!user) {
\t\t\treturn res.status(404).json({ error: '用户不存在' });
\t\t}
\t\tres.json(user);
\t} catch (error) {
\t\tconsole.error('获取用户失败:', error);
\t\tres.status(500).json({ error: '获取失败' });
\t}
});"""
new = """// 管理API - 用户管理
app.get('/api/admin/users', async (req, res) => {
\ttry {
\t\tconst searchParams = new URLSearchParams();
\t\tif (req.query.status) searchParams.set('status', req.query.status);
\t\tif (req.query.skip) searchParams.set('skip', req.query.skip);
\t\tif (req.query.limit) searchParams.set('limit', req.query.limit);

\t\tconst queryString = searchParams.toString();
\t\tconst backendUrl = `${BACKEND_BASE_URL}/api/admin/users${queryString ? `?${queryString}` : ''}`;
\t\tconst response = await fetch(backendUrl);
\t\tconst payload = await response.json();

\t\tif (!response.ok) {
\t\t\treturn res.status(response.status).json(payload);
\t\t}

\t\tconst data = payload?.data || {};
\t\tconst users = Array.isArray(data.users) ? data.users.map((user) => ({
\t\t\tid: user.id,
\t\t\tnickName: user.nickname,
\t\t\tavatarUrl: user.avatar_url,
\t\t\tcreatedAt: user.created_at,
\t\t\tupdatedAt: user.updated_at,
\t\t\ttotalVotes: user.total_votes,
\t\t\tjoinedDebates: user.joined_debates,
\t\t\tstatus: user.status,
\t\t\topenid: user.openid,
\t\t\tlastLoginAt: user.last_login_at,
\t\t})) : [];
\t\tres.json(users);
\t} catch (error) {
\t\tconsole.error('获取用户列表失败:', error);
\t\tres.status(500).json({ error: '获取失败' });
\t}
});

app.get('/api/admin/users/:id', async (req, res) => {
\ttry {
\t\tconst response = await fetch(`${BACKEND_BASE_URL}/api/admin/users/${req.params.id}`);
\t\tconst payload = await response.json();

\t\tif (!response.ok) {
\t\t\treturn res.status(response.status).json(payload);
\t\t}

\t\tconst user = payload?.data;
\t\tif (!user) {
\t\t\treturn res.status(404).json({ error: '用户不存在' });
\t\t}
\t\tres.json({
\t\t\tid: user.id,
\t\t\tnickName: user.nickname,
\t\t\tavatarUrl: user.avatar_url,
\t\t\tcreatedAt: user.created_at,
\t\t\tupdatedAt: user.updated_at,
\t\t\ttotalVotes: user.total_votes,
\t\t\tjoinedDebates: user.joined_debates,
\t\t\tstatus: user.status,
\t\t\topenid: user.openid,
\t\t\tlastLoginAt: user.last_login_at,
\t\t});
\t} catch (error) {
\t\tconsole.error('获取用户失败:', error);
\t\tres.status(500).json({ error: '获取失败' });
\t}
});"""
if old not in s:
    raise SystemExit('old block not found')
p.write_text(s.replace(old, new, 1), encoding='utf-8')
print('patched')
