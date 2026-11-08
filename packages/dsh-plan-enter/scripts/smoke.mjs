#!/usr/bin/env node
// dsh-plan-enter 冒烟：结构、语法、私有痕迹。

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fails = [];
const ok = (m) => console.log(`  ok  ${m}`);
const bad = (m) => { fails.push(m); console.log(`  FAIL ${m}`); };

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.name === 'dsh-plan-enter') ok('包名');
else bad(`包名不对：${pkg.name}`);
if (pkg.dsh?.bundle?.patch === './cordis.patch.yml') ok('bundle patch 已声明');
else bad('dsh.bundle.patch 缺失');

const idx = readFileSync(join(root, 'index.js'), 'utf8');
if (idx.includes("export const name = 'dsh-plan-enter'")) ok('插件名');
else bad('插件名不是 dsh-plan-enter');
if (idx.includes("const TOOL = 'enter_plan_mode'")) ok('工具名 enter_plan_mode');
else bad('工具名不对');
if (idx.includes("inject = ['tools', 'planMode']")) ok('注入 tools + planMode');
else bad('inject 不对');
if (idx.includes('zzuser')) bad('index.js 含 zzuser 残留');
else ok('无私有痕迹');
if (!existsSync(join(root, 'cordis.patch.yml'))) bad('cordis.patch.yml 缺失');

console.log(fails.length ? `\nFAIL：${fails.length} 项` : '\n冒烟通过');
process.exit(fails.length ? 1 : 0);
