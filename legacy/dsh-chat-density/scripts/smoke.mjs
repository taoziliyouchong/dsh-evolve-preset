#!/usr/bin/env node
// dsh-chat-density 冒烟：结构、客户端产物外壳 id、源码残留。不起 DSH、不发网络请求。

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fails = [];
const ok = (m) => console.log(`  ok  ${m}`);
const bad = (m) => { fails.push(m); console.log(`  FAIL ${m}`); };

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.name === 'dsh-chat-density') ok('包名');
else bad(`包名不对：${pkg.name}`);
if (pkg.dsh?.bundle?.patch === './cordis.patch.yml') ok('bundle patch 已声明');
else bad('dsh.bundle.patch 缺失');
if (pkg.dsh?.client?.platform === 'web') ok('client 平台 web');
else bad('dsh.client 缺失');
if (existsSync(join(root, 'cordis.patch.yml'))) ok('cordis.patch.yml 存在');
else bad('cordis.patch.yml 缺失');

const clientPath = join(root, 'lib/client.js');
if (existsSync(clientPath)) {
  const client = readFileSync(clientPath, 'utf8');
  if (client.startsWith('window.__ModuleLoader__.load({')) ok('客户端外壳');
  else bad('客户端外壳不对');
  if (client.includes('id: "dsh-chat-density"') || client.includes("id: 'dsh-chat-density'")) ok('外壳 id = 包名');
  else bad('外壳 id 不是 dsh-chat-density');
  if (client.includes('zzuser')) bad('客户端产物含 zzuser 残留');
  else ok('客户端无私有痕迹');
} else {
  bad('lib/client.js 缺失');
}

const src = readFileSync(join(root, 'src/entry.jsx'), 'utf8');
if (src.includes('zzuser')) bad('源码含 zzuser 残留');
else ok('源码无私有痕迹');
if (src.includes('dsh-chat-density-style')) ok('样式 id 已改名');
else bad('样式 id 未改');

const host = readFileSync(join(root, 'index.js'), 'utf8');
if (host.includes('zzuser')) bad('宿主半边含 zzuser 残留');
else ok('宿主半边无私有痕迹');

console.log(fails.length ? `\nFAIL：${fails.length} 项` : '\n冒烟通过');
process.exit(fails.length ? 1 : 0);
