#!/usr/bin/env node
// 依赖与包结构审查：对仓库根这一个发布包查
//   ① package.json 可解析；name/version/engines/files 齐
//   ② files 每项存在；exports 每个目标存在
//   ③ 源码里 import 的裸包名都在 dependencies ∪ peerDependencies（node: 与相对路径不算）
//   ④ 声明了 dsh.bundle.patch 的文件存在
//   ⑤ 有 dsh.client 的包：exports["./client"] 存在、产物存在、外壳 id 等于包名
// 退出码：0 全绿；1 有失败。

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const fails = [];
const warns = [];

function bareImports(file) {
  const out = new Set();
  let text = '';
  try { text = readFileSync(file, 'utf8'); } catch { return out; }
  // 只扫文件头部 160 行：真实 import 都在头部；再往后的行可能落在模板字符串里
  // （例如插件工坊的生成模板里写着 `import ... from 'react'`），扫全会误报。
  text = text.split(/\r?\n/).slice(0, 160).join('\n');
  for (const m of text.matchAll(/(?:^|\n)\s*(?:import|export)(?!\s+type)\s+[^'"\n]*?from\s+['"]([^'"]+)['"]/g)) {
    const spec = m[1];
    if (spec.startsWith('.') || spec.startsWith('node:') || spec.startsWith('file:')) continue;
    const parts = spec.split('/');
    out.add(spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]);
  }
  for (const m of text.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const spec = m[1];
    if (spec.startsWith('.') || spec.startsWith('node:') || spec.startsWith('file:')) continue;
    const parts = spec.split('/');
    out.add(spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]);
  }
  return out;
}

for (const dir of [repo]) {
  const d = basename(dir);
  if (!statSync(dir).isDirectory()) continue;
  const pjPath = join(dir, 'package.json');
  if (!existsSync(pjPath)) { fails.push(`${d}: 缺 package.json`); continue; }
  let pkg;
  try { pkg = JSON.parse(readFileSync(pjPath, 'utf8')); } catch (e) { fails.push(`${d}: package.json 不可解析（${e.message}）`); continue; }
  if (pkg.name !== d) fails.push(`${d}: 包名 ${pkg.name} 与目录名不一致`);
  if (!pkg.version) fails.push(`${d}: 缺 version`);
  if (!pkg.engines?.dsh) warns.push(`${d}: 未声明 engines.dsh`);
  if (!pkg.files?.length) fails.push(`${d}: files 为空`);

  for (const f of pkg.files || []) {
    if (!existsSync(join(dir, f))) fails.push(`${d}: files 里的 ${f} 不存在`);
  }
  for (const [key, target] of Object.entries(pkg.exports || {})) {
    const rel = typeof target === 'string' ? target : target?.default;
    if (typeof rel === 'string' && !existsSync(join(dir, rel))) fails.push(`${d}: exports["${key}"] 指向的 ${rel} 不存在`);
  }

  const declared = new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})]);
  const used = new Set();
  const scanFiles = (p) => {
    if (!existsSync(p)) return;
    const st = statSync(p);
    if (st.isDirectory()) { for (const e of readdirSync(p)) scanFiles(join(p, e)); return; }
    if (!/\.(m?js|cjs|jsx|ts)$/.test(p) || p.endsWith('lib/client.js') || p.endsWith('.min.js')) return;
    for (const n of bareImports(p)) used.add(n);
  };
  scanFiles(join(dir, 'index.js'));
  if (existsSync(join(dir, 'lib'))) scanFiles(join(dir, 'lib'));
  for (const n of used) {
    if (!declared.has(n)) fails.push(`${d}: import 了 ${n}，但 dependencies/peerDependencies 没声明`);
  }
  for (const n of declared) {
    if (!used.has(n)) warns.push(`${d}: 声明了 ${n}，但源码没 import（可能多余）`);
  }
  for (const [name, range] of Object.entries(pkg.dependencies || {})) {
    if (range !== '*') warns.push(`${d}: 依赖 ${name} 写的是 ${range}，默认应为 *（写下限需在变更记录说明依据）`);
  }

  if (pkg.dsh?.bundle?.patch) {
    const rels = Array.isArray(pkg.dsh.bundle.patch) ? pkg.dsh.bundle.patch : [pkg.dsh.bundle.patch];
    for (const rel of rels) if (!existsSync(join(dir, rel))) fails.push(`${d}: dsh.bundle.patch 指向的 ${rel} 不存在`);
  }
  if (pkg.dsh?.client) {
    const clientRel = pkg.exports?.['./client'];
    if (!clientRel) fails.push(`${d}: 声明了 dsh.client 但没有 exports["./client"]`);
    else {
      const clientPath = join(dir, typeof clientRel === 'string' ? clientRel : clientRel.default);
      if (existsSync(clientPath)) {
        const text = readFileSync(clientPath, 'utf8');
        if (!/id:\s*["']/.test(text) || !text.includes(`"${pkg.name}"`) && !text.includes(`'${pkg.name}'`)) {
          fails.push(`${d}: lib/client.js 外壳 id 不等于包名`);
        }
      }
    }
  }
}

console.log(`审查 1 个发布包（仓库根）`);
if (warns.length) {
  console.log(`\n提示 ${warns.length} 条：`);
  for (const w of warns) console.log(`  ! ${w}`);
}
if (fails.length) {
  console.log(`\n失败 ${fails.length} 条：`);
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('\n依赖与包结构：全绿');
