/**
 * split-gateway.js
 * 将 gateway.js 按功能模块拆分到 live-gateway-main/modules/ 目录
 * 每个模块文件顶部标注对应原始行号，方便修复后合并
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'live-gateway-main', 'gateway.js');
const outDir = path.join(__dirname, 'live-gateway-main', 'modules');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const all = fs.readFileSync(src, 'utf8').split('\n');

// [name, startLine(1-based), endLine(1-based)]
const modules = [
  ['01_init',          1,    165],
  ['02_websocket',     166,  207],
  ['03_admin_streams', 208,  1048],
  ['04_admin_votes',   1049, 1148],
  ['05_admin_ai',      1149, 1968],
  ['06_stats',         1969, 2113],
  ['07_debate_flow',   2114, 2210],
  ['08_public_api',    2211, 2604],
  ['09_wechat',        2605, 2922],
  ['10_admin_system',  2923, 3695],
  ['11_live_streams',  3696, 4027],
];

modules.forEach(([name, start, end]) => {
  const chunk = all.slice(start - 1, end);
  const header = `// ── module: ${name}  |  original lines ${start}–${end} of gateway.js ──\n`;
  const outPath = path.join(outDir, `${name}.js`);
  fs.writeFileSync(outPath, header + chunk.join('\n'), 'utf8');
  console.log(`✓ ${name}.js  (${chunk.length} lines, L${start}–${end})`);
});

console.log(`\nDone. ${modules.length} files in live-gateway-main/modules/`);
console.log('\nTo merge back after fixing:');
console.log('  node merge-gateway.js');
