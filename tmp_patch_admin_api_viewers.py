from pathlib import Path

p = Path(r'd:\Desktop\project\Live-main\admin\admin-api.js')
s = p.read_text(encoding='utf-8')
old = """async function getAllViewersCount() {
\tconsole.log('📡 [getAllViewersCount] 查询所有流的观看人数...');
\t
\tconst result = await apiRequest('/api/v1/admin/live/viewers', {
\t\tmethod: 'GET'
\t});
\t
\tif (result?.data?.streams) {
\t\tconst total = Object.values(result.data.streams).reduce((sum, count) => sum + count, 0);
\t\tconsole.log(`👥 [getAllViewersCount] 总观看人数: ${total}`, result.data.streams);
\t}
\t
\treturn result;
}"""
new = """async function getAllViewersCount() {
\tconsole.log('📡 [getAllViewersCount] 查询所有流的观看人数...');
\t
\tconst result = await apiRequest('/api/v1/admin/live/viewers', {
\t\tmethod: 'GET'
\t});
\tif (!result) {
\t\treturn null;
\t}
\t
\tif (result?.data?.streams) {
\t\tconst total = Object.values(result.data.streams).reduce((sum, count) => sum + count, 0);
\t\tconsole.log(`👥 [getAllViewersCount] 总观看人数: ${total}`, result.data.streams);
\t}
\t
\treturn result;
}"""
if old in s:
    s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
print('patched-admin-api-viewers-fallback')
