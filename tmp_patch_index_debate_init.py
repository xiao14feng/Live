from pathlib import Path

p = Path(r'd:\Desktop\project\Live-main\admin\index.html')
s = p.read_text(encoding='utf-8')
s = s.replace('initDebateFlowManagement();', 'initDebateFlowEvents();')
p.write_text(s, encoding='utf-8')
print('patched-index-debate-flow-init')
