from pathlib import Path

p = Path(r'd:\Desktop\project\Live-main\admin\index.html')
s = p.read_text(encoding='utf-8')
old = """\t\t\t<header class=\"topbar\">\n\t\t\t\t<h1 class=\"page-title\"></h1>\n\t\t\t\t<div class=\"topbar-actions\">\n\t\t\t\t\t<button class=\"btn btn-sm\" id=\"control-live-btn\" style=\"margin-right: 15px;\">开始直播</button>\n\t\t\t\t\t<span class=\"status-indicator\">\n\t\t\t\t\t\t<span class=\"status-dot\"></span>\n\t\t\t\t\t\t<span id=\"live-status-text\">未开播</span>\n\t\t\t\t\t</span>\n\t\t\t\t</div>\n\t\t\t</header>"""
new = """\t\t\t<header class=\"topbar\">\n\t\t\t\t<h1 class=\"page-title\"></h1>\n\t\t\t\t<div class=\"topbar-actions\">\n\t\t\t\t\t<div id=\"current-user-info\" style=\"display: inline-flex; align-items: center; gap: 8px; margin-right: 12px; padding: 6px 12px; border-radius: 999px; background: #f5f7fb; color: #34495e; font-size: 13px; border: 1px solid #e1e8f0;\">\n\t\t\t\t\t\t<span id=\"current-user-name\">未登录</span>\n\t\t\t\t\t\t<span id=\"current-user-role\" style=\"padding: 2px 8px; border-radius: 999px; background: #e9eef7; font-size: 12px; color: #4a5b7a;\">-</span>\n\t\t\t\t\t</div>\n\t\t\t\t\t<button class=\"btn btn-sm btn-secondary\" id=\"logout-btn\" style=\"margin-right: 15px;\">退出登录</button>\n\t\t\t\t\t<button class=\"btn btn-sm\" id=\"control-live-btn\" style=\"margin-right: 15px;\">开始直播</button>\n\t\t\t\t\t<span class=\"status-indicator\">\n\t\t\t\t\t\t<span class=\"status-dot\"></span>\n\t\t\t\t\t\t<span id=\"live-status-text\">未开播</span>\n\t\t\t\t\t</span>\n\t\t\t\t</div>\n\t\t\t</header>"""
if old not in s:
    raise SystemExit('topbar block not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
print('patched-admin-topbar-logout')
