#!/usr/bin/env node
/**
 * 构建设置面板的浏览器半边：src/settings.jsx → build/settings-client.js
 *
 * 产物不单独发布，只作为 dsh-evolve-preset 客户端包的一块，由
 * scripts/build-preset-client.mjs 抽 factory 正文拼进 lib/client.js。
 * 外壳仍按客户端模块表格式写，方便拼接脚本按同一套标记抽取。
 *
 * 用法：node scripts/build-settings-client.mjs [--check]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

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

const esbuildDir = findEsbuild(root)
if (!esbuildDir) {
  console.error('找不到 esbuild：在仓库或任一发布包目录 npm install 后重试')
  process.exit(2)
}
const { build } = await import(pathToFileURL(join(esbuildDir, 'lib', 'main.js')).href)
const entry = join(root, 'src', 'settings.jsx')
const out = join(root, 'build', 'settings-client.js')
const check = process.argv.includes('--check')
const id = 'dsh-evolution-settings'

if (!existsSync(entry)) {
  console.error('找不到设置面板源码：' + entry)
  process.exit(2)
}

const bundled = await build({
  entryPoints: [entry],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  jsx: 'automatic',
  target: ['chrome120'],
  // react 由 DSH 客户端模块表提供，不能打进产物
  external: ['react', 'react/jsx-runtime'],
  write: false,
  logLevel: 'warning',
  legalComments: 'none',
})

const code = bundled.outputFiles[0].text.replace(/\s*\/\/# sourceMappingURL=.*$/m, '')
const envelope = 'window.__ModuleLoader__.load({\n'
  + '\tid: ' + JSON.stringify(id) + ',\n'
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
  if (!existsSync(out)) {
    console.error('缺少构建产物：' + out)
    process.exit(1)
  }
  if (readFileSync(out, 'utf8') !== envelope) {
    console.error('build/settings-client.js 与 src/settings.jsx 不一致：先重新构建')
    process.exit(1)
  }
  console.log('ok  settings-client 与源码一致（' + Buffer.byteLength(envelope, 'utf8') + ' 字节）')
  process.exit(0)
}

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, envelope, 'utf8')
console.log('ok  已写出 ' + out + '（' + Buffer.byteLength(envelope, 'utf8') + ' 字节）')
