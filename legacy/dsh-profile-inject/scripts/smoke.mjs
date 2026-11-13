#!/usr/bin/env node
// dsh-profile-inject 冒烟：结构、注入判据与默认值、私有痕迹。

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fails = [];
const ok = (m) => console.log(`  ok  ${m}`);
const bad = (m) => { fails.push(m); console.log(`  FAIL ${m}`); };

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.name === 'dsh-profile-inject') ok('包名');
else bad(`包名不对：${pkg.name}`);
if (pkg.dsh?.bundle?.patch === './cordis.patch.yml') ok('bundle patch 已声明');
else bad('dsh.bundle.patch 缺失');
if (pkg.peerDependencies?.['@deepseek-ai/dsh-llm']) ok('peer 依赖声明 dsh-llm');
else bad('缺 @deepseek-ai/dsh-llm peer 依赖');

const idx = readFileSync(join(root, 'index.js'), 'utf8');
if (idx.includes("export const name = 'dsh-profile-inject'")) ok('插件名');
else bad('插件名不对');
if (idx.includes("homedir()")) ok('默认 home 跨平台');
else bad('默认 home 仍是写死路径');
if (idx.includes("stateOf(agent.session, 'agentPreset')")) ok('按实时模式收口');
else bad('模式判据未保留');
if (idx.includes('user-profile.settings.json')) ok('设置文件路径');
else bad('设置文件路径缺失');
if (idx.includes('zzuser')) bad('index.js 含 zzuser 残留');
else ok('无私有痕迹');
if (/[A-Z]:\\\\DSH/.test(idx)) bad('index.js 含本机路径');
else ok('无本机路径');

console.log(fails.length ? `\nFAIL：${fails.length} 项` : '\n冒烟通过');
process.exit(fails.length ? 1 : 0);
