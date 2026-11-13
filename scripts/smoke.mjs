#!/usr/bin/env node
// dsh-evolve-preset 冒烟：不起 DSH、不发网络请求。
// 查包结构、preset 声明、persona 正文的关键段、技能目录自解析、环境残留。
// 任一条失败退出码 1。

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fails = [];
const ok = (msg) => console.log(`  ok  ${msg}`);
const bad = (msg) => { fails.push(msg); console.log(`  FAIL ${msg}`); };
const read = (rel) => readFileSync(join(root, rel), 'utf8');

// 1. package.json
let pkg;
try {
  pkg = JSON.parse(read('package.json'));
  ok('package.json 可解析');
} catch (e) {
  bad(`package.json 不可解析：${e.message}`);
}

if (pkg) {
  if (pkg.name === 'dsh-evolve-preset') ok('包名 = dsh-evolve-preset');
  else bad(`包名不对：${pkg.name}`);
  if (pkg.dsh?.bundle?.patch === './cordis.patch.yml') ok('dsh.bundle.patch 已声明');
  else bad('dsh.bundle.patch 缺失或路径不对');
  for (const f of ['cordis.patch.yml', 'skills']) {
    if (!pkg.files?.includes(f)) bad(`files 缺 ${f}`);
  }
  if (pkg.files?.includes('skills')) ok('files 含 cordis.patch.yml 与 skills');
  if (pkg.engines?.dsh) ok(`engines.dsh = ${pkg.engines.dsh}`);
  else bad('engines.dsh 缺失');
  if (pkg.dependencies?.['dsh-term-dict'] === '*') ok('依赖 dsh-term-dict = *');
  else bad('dsh-term-dict 依赖缺失或不是 *');

  if (pkg.main === 'index.js') ok('main = index.js');
  else bad(`main 应为 index.js，实际 ${pkg.main}`);
  if (pkg.exports?.['./client'] === './lib/client.js') ok('exports 声明客户端入口');
  else bad('exports["./client"] 缺失');
  if (pkg.dsh?.client?.platform === 'web') ok('dsh.client 已声明');
  else bad('dsh.client 缺失');
  for (const f of ['index.js', 'host', 'lib/client.js', 'assets']) {
    if (!pkg.files?.includes(f)) bad(`files 缺 ${f}`);
  }
  if (['index.js', 'host', 'lib/client.js', 'assets'].every((f) => pkg.files?.includes(f))) ok('files 含宿主、客户端与 assets');
}

// 2. preset 声明与组合行
const yml = read('cordis.patch.yml');
const must = [
  ['preset 行', '- id: preset-evolve'],
  ['preset id', 'id: evolve'],
  ['显示名', 'name: "进化模式"'],
  ['order', 'order: 5'],
  ['persona 正文', 'prefix: |-'],
  ['四段工序', '# ① 动手前'],
  ['收尾', '# ④ 收尾'],
  ['技能自解析', "createRequire(baseUrl).resolve('dsh-evolve-preset/package.json')"],
];
for (const [label, needle] of must) {
  if (yml.includes(needle)) ok(label);
  else bad(`组合文件缺：${label}（${needle}）`);
}
for (const needle of ['- id: dsh-evolve-preset', 'name: dsh-evolve-preset']) {
  if (yml.includes(needle)) ok(`组合行挂本包：${needle}`);
  else bad(`组合文件缺本包宿主行：${needle}`);
}
for (const name of ['dsh-plan-enter', 'dsh-task-tree', 'dsh-term-dict', 'dsh-profile-inject']) {
  if (yml.includes(`name: ${name}`)) bad(`组合文件不应引用外部插件 ${name}`);
  else ok(`组合行不含 ${name}`);
}

// 2.5 合包结构：host 模块与客户端外壳
for (const f of ['settings', 'task-tree', 'profile-inject', 'profile-panel', 'chat-density', 'check', 'plan-enter']) {
  if (existsSync(join(root, 'host', `${f}.js`))) ok(`host/${f}.js 存在`);
  else bad(`缺 host/${f}.js`);
}
const client = read('lib/client.js');
if (client.includes('window.__ModuleLoader__.load(') && client.includes('id: "dsh-evolve-preset"')) ok('客户端外壳 id = 本包名');
else bad('客户端外壳 id 不是本包名');
if (client.includes('__panels') && client.includes('typeof m.apply')) ok('客户端多面板统一 apply');
else bad('客户端面板没有统一 apply（面板不会挂上）');
if (client.includes('dsh-evolution-settings/api')) ok('客户端含设置面板');
else bad('客户端缺设置面板');
for (const f of ['net-clean-check.mjs', 'profile-lint.mjs', 'gate-check.mjs']) {
  if (existsSync(join(root, 'assets', f))) ok(`assets/${f} 存在`);
  else bad(`缺 assets/${f}`);
}

// 3. 残留扫描（词表拆开写，避免本文件自己命中）
const scan = ['zz' + 'user-', 'E:' + '\\chajian', 'D:' + '\\DSH', 'a' + '1835', '工作' + '站'];
for (const s of scan) {
  if (yml.includes(s)) bad(`组合文件出现私有痕迹：${s}`);
}

// 4. 技能
const skillRel = 'skills/evolve-maintenance/SKILL.md';
if (existsSync(join(root, skillRel))) {
  const sk = read(skillRel);
  if (/^---\nname: evolve-maintenance\n/.test(sk)) ok('技能 frontmatter name');
  else bad('技能 frontmatter name 不是 evolve-maintenance');
  if (/^description: .+/m.test(sk)) ok('技能 frontmatter description');
  else bad('技能缺 description');
  for (const s of ['zz' + 'user-', 'E:' + '\\chajian', 'D:' + '\\DSH']) {
    if (sk.includes(s)) bad(`技能出现私有痕迹：${s}`);
  }
} else {
  bad(`缺技能文件：${skillRel}`);
}

// 5. 目录里不留备份
const junk = readdirSync(root).filter((n) => n.includes('.bak'));
if (junk.length) bad(`目录里有备份文件：${junk.join(', ')}`);
else ok('无 .bak 残留');

console.log(fails.length ? `\nFAIL：${fails.length} 项` : '\n冒烟通过');
process.exit(fails.length ? 1 : 0);
