#!/usr/bin/env node
// dsh-profile-panel 冒烟：结构、路由前缀、客户端外壳 id、私有痕迹。

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fails = [];
const ok = (m) => console.log(`  ok  ${m}`);
const bad = (m) => { fails.push(m); console.log(`  FAIL ${m}`); };

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.name === 'dsh-profile-panel') ok('包名');
else bad(`包名不对：${pkg.name}`);
if (pkg.dsh?.bundle?.patch === './cordis.patch.yml') ok('bundle patch 已声明');
else bad('dsh.bundle.patch 缺失');
if (pkg.dsh?.client?.platform === 'web') ok('client 平台 web');
else bad('dsh.client 缺失');

const host = readFileSync(join(root, 'index.js'), 'utf8');
if (host.includes("export const name = 'dsh-profile-panel'")) ok('插件名');
else bad('插件名不对');
if (host.includes("const API_PREFIX = '/dsh-profile-panel/api'")) ok('路由前缀');
else bad('路由前缀不对');
if (host.includes('codex-hooks')) bad('宿主仍引用 codex-hooks 私有目录');
else ok('无 hooks 私有目录引用');
if (host.includes('zzuser')) bad('宿主含 zzuser 残留');
else ok('宿主无私有痕迹');

const clientPath = join(root, 'lib/client.js');
if (existsSync(clientPath)) {
  const client = readFileSync(clientPath, 'utf8');
  if (client.startsWith('window.__ModuleLoader__.load({')) ok('客户端外壳');
  else bad('客户端外壳不对');
  if (client.includes('id: "dsh-profile-panel"')) ok('外壳 id = 包名');
  else bad('外壳 id 不对');
  if (client.includes('zzuser')) bad('客户端产物含 zzuser 残留');
  else ok('客户端无私有痕迹');
  if (client.includes('/dsh-profile-panel/api')) ok('客户端路由前缀一致');
  else bad('客户端路由前缀不一致');
} else {
  bad('lib/client.js 缺失');
}

const src = readFileSync(join(root, 'src/entry.jsx'), 'utf8');
if (src.includes('zzuser')) bad('源码含 zzuser 残留');
else ok('源码无私有痕迹');

console.log(fails.length ? `\nFAIL：${fails.length} 项` : '\n冒烟通过');
process.exit(fails.length ? 1 : 0);
