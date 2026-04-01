from pathlib import Path

p = Path(r'd:\Desktop\project\Live-main\admin\index.html')
s = p.read_text(encoding='utf-8')
old = """\t<script>\n\t\t// 初始化直播流管理模块\n\t\tdocument.addEventListener('DOMContentLoaded', () => {\n\t\t\tinitStreamManagement();\n\t\t\tinitJudgesManagement();\n\t\t});\n\t</script>"""
new = """\t<script>\n\t\t// 初始化直播流管理模块\n\t\tdocument.addEventListener('DOMContentLoaded', () => {\n\t\t\tinitStreamManagement();\n\t\t\tinitJudgesManagement();\n\t\t\tinitDebateFlowManagement();\n\t\t});\n\t</script>"""
if old not in s:
    raise SystemExit('init script block not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
print('patched-debate-flow-init')
