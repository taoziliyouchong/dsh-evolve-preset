#!/usr/bin/env node
// dsh-check 冒烟：结构、工具名、包内脚本存在与语法、私有痕迹。

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fails = [];
const ok = (m) => console.log(`  ok  ${m}`);
const bad = (m) => { fails.push(m); console.log(`  FAIL ${m}`); };

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.name === 'dsh-check') ok('包名');
else bad(`包名不对：${pkg.name}`);
if (pkg.dsh?.bundle?.patch === './cordis.patch.yml') ok('bundle patch 已声明');
else bad('dsh.bundle.patch 缺失');
if (pkg.files?.includes('assets')) ok('files 含 assets');
else bad('files 缺 assets');

const idx = readFileSync(join(root, 'index.js'), 'utf8');
if (idx.includes("name: 'net-clean-check'")) ok('工具 net-clean-check');
else bad('缺工具 net-clean-check');
if (idx.includes("name: 'profile-lint'")) ok('工具 profile-lint');
else bad('缺工具 profile-lint');
if (idx.includes("name: 'gate-check'")) ok('工具 gate-check');
else bad('缺工具 gate-check');
if (idx.includes("from 'node:url'")) ok('脚本路径按包内解析');
else bad('脚本路径没按包内解析');
if (idx.includes('zzuser')) bad('index.js 含 zzuser 残留');
else ok('index.js 无私有痕迹');
if (/[A-Z]:\\\\/.test(idx)) bad('index.js 含本机盘符路径');
else ok('index.js 无本机路径');

for (const f of ['assets/net-clean-check.mjs', 'assets/profile-lint.mjs', 'assets/gate-check.mjs']) {
  const p = join(root, f);
  if (!existsSync(p)) { bad(`缺 ${f}`); continue; }
  const text = readFileSync(p, 'utf8');
  if (text.includes('zzuser') || text.includes('E:\\\\chajian')) bad(`${f} 含私有痕迹`);
  else ok(`${f} 无私有痕迹`);
  if (f.endsWith('profile-lint.mjs')) {
    if (text.includes("homedir()")) ok('profile-lint 默认 home 跨平台');
    else bad('profile-lint 默认 home 仍是写死路径');
  }
  const r = spawnSync(process.execPath, ['--check', p], { stdio: 'inherit' });
  if (r.status === 0) ok(`${f} 语法`);
  else bad(`${f} 语法错误`);
}

console.log(fails.length ? `\nFAIL：${fails.length} 项` : '\n冒烟通过');
process.exit(fails.length ? 1 : 0);
