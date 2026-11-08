#!/usr/bin/env node
// 加载测试：逐包 import index.js，用桩 ctx 执行 apply，统计注册的工具/命令/技能。
// 目的：证明每个包能独立加载、注册面不炸；缺服务或 API 用法不对会在这里暴露。
//
// 前提：仓库根 node_modules/@deepseek-ai 能解析到 harness 的官方包（本地开发用 junction）；
// 外部使用者从 npm 安装时由 profile 的 node_modules 提供。

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const packagesDir = join(repo, 'packages');

function makeCtx() {
  const tools = [];
  const commands = [];
  const skills = [];
  const events = [];
  const ctx = {
    tools: {
      register: (t) => { tools.push(t); return t; },
      restrict: () => {},
      list: () => tools,
    },
    commands: { register: (c) => { commands.push(c); } },
    skills: {
      registerProvider: (p) => {
        const resolved = typeof p === 'function' ? p() : p;
        if (resolved) skills.push(resolved);
      },
    },
    on: (name) => { events.push(name); },
    get: () => undefined,
    effect: (fn) => { try { if (typeof fn === 'function') fn(); } catch { /* 桩里不执行真逻辑 */ } },
    shell: {
      execute: async () => ({
        result: async () => ({ exitCode: 0, stdout: { text: '' }, stderr: { text: '' } }),
      }),
      resolve: (spec) => spec,
    },
    sandboxPolicy: { resolve: () => undefined },
    webServer: { register: () => {}, route: () => {} },
    invariants: { register: () => {} },
    logger: { info() {}, warn() {}, error() {} },
    logger2: undefined,
  };
  return { ctx, tools, commands, skills, events };
}

const rows = [];
let failed = 0;
for (const d of readdirSync(packagesDir)) {
  const dir = join(packagesDir, d);
  if (!statSync(dir).isDirectory()) continue;
  const idx = join(dir, 'index.js');
  if (!existsSync(idx)) { rows.push([d, 'SKIP', '无 index.js（纯资源包？）', '']); continue; }
  try {
    const mod = await import(pathToFileURL(idx).href);
    if (typeof mod.apply !== 'function') { rows.push([d, 'SKIP', '无 apply 导出', '']); continue; }
    const { ctx, tools, commands, skills } = makeCtx();
    await mod.apply(ctx);
    rows.push([d, 'OK', `${tools.length} 工具 / ${commands.length} 命令 / ${skills.length} 技能提供者`, '']);
  } catch (error) {
    failed += 1;
    rows.push([d, 'FAIL', String(error && error.message ? error.message : error).slice(0, 160), error && error.stack ? error.stack.split('\n')[1]?.trim() ?? '' : '']);
  }
}

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('包', 28) + pad('结果', 6) + '注册面');
for (const [name, status, detail, where] of rows) {
  console.log(pad(name, 28) + pad(status, 6) + detail + (where ? `\n${' '.repeat(34)}${where}` : ''));
}
console.log(`\n共 ${rows.length} 个包，失败 ${failed} 个`);
process.exit(failed ? 1 : 0);
