/**
 * merge-gateway.js
 * 将 modules/ 下的文件按顺序合并回 gateway.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const modDir = path.join(__dirname, 'live-gateway-main', 'modules');
const outPath = path.join(__dirname, 'live-gateway-main', 'gateway.js');

const files = fs.readdirSync(modDir)
  .filter(f => f.endsWith('.js'))
  .sort();

const merged = files.map(f => {
  const content = fs.readFileSync(path.join(modDir, f), 'utf8');
  // Strip the header comment added by split-gateway.js
  return content.replace(/^\/\/ ── module:.*\n/, '');
}).join('\n');

// Syntax check before overwriting
const tmpPath = path.join(__dirname, 'live-gateway-main', 'gateway_merged_check.js');
fs.writeFileSync(tmpPath, merged, 'utf8');

try {
  execSync(`node --check "${tmpPath}"`, { stdio: 'pipe' });
  console.log('✅ Syntax OK');
  fs.copyFileSync(outPath, outPath + '.bak');
  fs.renameSync(tmpPath, outPath);
  console.log('✅ gateway.js updated. Backup: gateway.js.bak');
} catch (e) {
  const err = e.stderr ? e.stderr.toString() : e.message;
  console.error('❌ Syntax error in merged file:');
  const m = err.match(/gateway_merged_check\.js:(\d+)/);
  if (m) {
    const n = parseInt(m[1]);
    const ctx = merged.split('\n');
    console.error(`  Near line ${n}:`);
    for (let i = Math.max(0, n - 3); i < Math.min(ctx.length, n + 2); i++) {
      console.error(`  ${i + 1}: ${ctx[i]}`);
    }
  }
  console.error(err.split('\n').slice(0, 4).join('\n'));
  fs.unlinkSync(tmpPath);
}
