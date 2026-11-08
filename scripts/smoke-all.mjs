#!/usr/bin/env node
// 逐包跑各自的 smoke 脚本；没有 smoke 的包跳过并报出来。
// 用法：node scripts/smoke-all.mjs

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const packagesDir = join(repo, 'packages');

let failed = 0;
let ran = 0;
const skipped = [];

for (const d of readdirSync(packagesDir)) {
  const pj = join(packagesDir, d, 'package.json');
  if (!existsSync(pj)) continue;
  const pkg = JSON.parse(readFileSync(pj, 'utf8'));
  if (!pkg.scripts?.smoke) {
    skipped.push(pkg.name || d);
    continue;
  }
  ran += 1;
  console.log(`\n=== ${pkg.name} ===`);
  const r = spawnSync(process.execPath, ['scripts/smoke.mjs'], {
    cwd: join(packagesDir, d),
    stdio: 'inherit',
  });
  if (r.status !== 0) failed += 1;
}

console.log(`\n共跑 ${ran} 个包，失败 ${failed} 个`);
if (skipped.length) console.log(`无 smoke 脚本：${skipped.join(', ')}`);
process.exit(failed ? 1 : 0);
