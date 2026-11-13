#!/usr/bin/env node
// 把一个 profile 接到本仓库的 legacy/* 历史包：写入 dependencies（link: 本地路径）与 dsh.profile.bundles。
// 发布件本身在仓库根，按 npm 安装即可，不需要本脚本。
// 用法：node scripts/install.mjs --profile desktop
//       node scripts/install.mjs --profile-dir <DSH_HOME>/profiles/<name>
// 改前备份 profile/package.json，改完提示重启与 pnpm install。

import { readFileSync, writeFileSync, existsSync, copyFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const packagesDir = join(repo, 'packages');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const profileName = arg('profile', 'desktop');
const explicitDir = arg('profile-dir', '');
const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh');
const profileDir = explicitDir ? resolve(explicitDir) : join(dshHome, 'profiles', profileName);

if (!existsSync(join(profileDir, 'package.json'))) {
  console.error(`找不到 profile：${profileDir}`);
  console.error('用 --profile <名字> 或 --profile-dir <目录> 指定；DSH_HOME 可用环境变量覆盖。');
  process.exit(1);
}

// 收包清单：每个含 package.json 的 packages/* 子目录。
// 默认只装「进化模式本体」这 8 个；--all 装全部（工具与领域包按需可后装）。
const CORE = new Set([
  'dsh-evolve-preset',
  'dsh-evolve-task-tree',
  'dsh-term-dict',
  'dsh-profile-inject',
  'dsh-profile-panel',
  'dsh-chat-density',
  'dsh-check',
  'dsh-plan-enter',
]);
const all = process.argv.includes('--all');
const names = [];
for (const d of readdirSync(packagesDir)) {
  const pj = join(packagesDir, d, 'package.json');
  if (existsSync(pj)) {
    const j = JSON.parse(readFileSync(pj, 'utf8'));
    if (!j.private && (all || CORE.has(j.name))) names.push({ name: j.name, dir: join(packagesDir, d) });
  }
}
// CORE 里可能有不在本仓库的包（如 dsh-term-dict 独立发布）：提示先装，不中断接线。
const missingCore = [...CORE].filter((n) => !names.some((p) => p.name === n));
if (missingCore.length) {
  console.log(`注意：这些本体包不在本仓库，需先单独装：${missingCore.join(', ')}`);
  console.log('  例：dsh plugin --profile <profile> add dsh-term-dict');
}

const pkgPath = join(profileDir, 'package.json');
const bak = `${pkgPath}.bak-install-${new Date().toISOString().replace(/[:.]/g, '-')}`;
copyFileSync(pkgPath, bak);

const profile = JSON.parse(readFileSync(pkgPath, 'utf8'));
profile.dependencies = profile.dependencies || {};
profile.dsh = profile.dsh || {};
profile.dsh.profile = profile.dsh.profile || {};
const bundles = new Set(profile.dsh.profile.bundles || []);

for (const { name, dir } of names) {
  profile.dependencies[name] = `link:${dir.replace(/\\/g, '/')}`;
  // dsh-plan-enter 由 preset 的 planning 组挂载，别再写进 bundles（否则挂两次）
  if (name !== 'dsh-plan-enter') bundles.add(name);
}
profile.dsh.profile.bundles = [...bundles];

writeFileSync(pkgPath, `${JSON.stringify(profile, null, 2)}\n`, 'utf8');

console.log(`已接线 ${names.length} 个包到 ${profileDir}`);
for (const { name } of names) console.log(`  + ${name}`);
console.log(`已备份原文件：${bak}`);
console.log('\n下一步：');
console.log(`  1) cd "${profileDir}" && pnpm install`);
console.log('  2) 重启 DSH');
console.log('  3) 在 设置 → 模式 里选「进化模式」开新会话');
