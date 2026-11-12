#!/usr/bin/env node
// 构建某个分包（或任意带 src/entry.jsx 的目录）的浏览器半边：src/entry.jsx → lib/client.js
//
// 用法：node scripts/build-subpackage-client.mjs packages/dsh-chat-density [--check]
// 外壳与打包参数同其它面板：window.__ModuleLoader__.load({ id, factory })，
// react 保持 external（由 DSH 客户端模块表提供）。
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repo = dirname(dirname(fileURLToPath(import.meta.url)))

/** esbuild 定位：本仓库没装时，往上找兄弟发布包目录里的 esbuild（避免为一次构建改依赖）。 */
function findEsbuild(start) {
  let dir = start
  for (let i = 0; i < 8; i += 1) {
    const local = join(dir, 'node_modules', 'esbuild')
    if (existsSync(local)) return local
    try {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (!e.isDirectory() || e.name === 'node_modules') continue
        const p = join(dir, e.name, 'node_modules', 'esbuild')
        if (existsSync(p)) return p
      }
    } catch { /* 目录读不了就往上走 */ }
    const up = dirname(dir)
    if (up === dir) break
    dir = up
  }
  return ''
}

const esbuildDir = findEsbuild(repo)
if (!esbuildDir) {
  console.error('找不到 esbuild：在本目录或任一发布包目录 npm install 后重试')
  process.exit(2)
}
const { build } = await import(pathToFileURL(join(esbuildDir, 'lib', 'main.js')).href)
const rel = process.argv[2]
const check = process.argv.includes('--check')
if (!rel) {
  console.error('用法：node scripts/build-subpackage-client.mjs <包目录> [--check]')
  process.exit(2)
}
const root = resolve(repo, rel)
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const entry = join(root, 'src', 'entry.jsx')
const out = join(root, 'lib', 'client.js')
if (!existsSync(entry)) {
  console.error('找不到浏览器半边源码：' + entry)
  process.exit(2)
}

const bundled = await build({
  entryPoints: [entry],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  jsx: 'automatic',
  target: ['chrome120'],
  external: ['react', 'react/jsx-runtime'],
  write: false,
  logLevel: 'warning',
  legalComments: 'none',
})

const code = bundled.outputFiles[0].text.replace(/\s*\/\/# sourceMappingURL=.*$/m, '')
const envelope = 'window.__ModuleLoader__.load({\n'
  + '\tid: ' + JSON.stringify(pkg.name) + ',\n'
  + '\tfactory: (require) => {\n'
  + '\t\tvar module = { exports: {} };\n'
  + '\t\tvar exports = module.exports;\n'
  + '\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });\n'
  + code
  + '\n\t\treturn module.exports;\n'
  + '\t}\n'
  + '});\n'

try {
  // eslint-disable-next-line no-new-func
  new Function(envelope)
} catch (error) {
  console.error('产物语法检查失败：' + error.message)
  process.exit(1)
}

if (check) {
  if (!existsSync(out) || readFileSync(out, 'utf8') !== envelope) {
    console.error(pkg.name + '：lib/client.js 与 src/entry.jsx 不一致')
    process.exit(1)
  }
  console.log('ok  ' + pkg.name + ' 客户端产物与源码一致')
  process.exit(0)
}

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, envelope, 'utf8')
console.log('ok  已写出 ' + out + '（' + Buffer.byteLength(envelope, 'utf8') + ' 字节，id=' + pkg.name + '）')
