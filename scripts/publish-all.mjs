#!/usr/bin/env node
// 按依赖顺序发布 packages/* 到 npm。
// 默认只列清单；加 --publish 才真的发。
// 顺序：依赖别人的包先发，preset 最后（它的 dependencies 指向这些版本）。

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const packagesDir = join(repo, 'packages');
const publish = process.argv.includes('--publish');

const packages = [];
for (const d of readdirSync(packagesDir)) {
  const pj = join(packagesDir, d, 'package.json');
  if (!existsSync(pj)) continue;
  const pkg = JSON.parse(readFileSync(pj, 'utf8'));
  if (pkg.private) continue;
  packages.push({ dir: join(packagesDir, d), pkg });
}

// 拓扑排序：按 dependencies 里出现的内部包名排在前面
const byName = new Map(packages.map((p) => [p.pkg.name, p]));
const ordered = [];
const visiting = new Set();
function visit(p) {
  if (ordered.includes(p)) return;
  if (visiting.has(p)) return;
  visiting.add(p);
  for (const dep of Object.keys(p.pkg.dependencies || {})) {
    const q = byName.get(dep);
    if (q) visit(q);
  }
  ordered.push(p);
}
for (const p of packages) visit(p);

console.log(`发布顺序（${ordered.length} 个包）：`);
ordered.forEach((p, i) => console.log(`  ${i + 1}. ${p.pkg.name}@${p.pkg.version}`));

if (!publish) {
  console.log('\n只列清单。要真发：node scripts/publish-all.mjs --publish');
  process.exit(0);
}

let failed = 0;
for (const p of ordered) {
  console.log(`\n=== npm publish ${p.pkg.name}@${p.pkg.version} ===`);
  const r = spawnSync('npm', ['publish', '--access', 'public'], {
    cwd: p.dir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    failed += 1;
    console.error(`发布失败：${p.pkg.name}`);
    break;
  }
}
process.exit(failed ? 1 : 0);
