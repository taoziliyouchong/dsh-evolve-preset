#!/usr/bin/env node
// 合包客户端组装：把各块的 factory 正文抽出来，各套一层 IIFE、把导出收进 __panels，
// 再由本包导出的 apply(ctx) 依次挂上——客户端加载器只调用本包这一个 apply，
// 各块的 apply 不会自己跑。
//
// 用法：node scripts/build-preset-client.mjs
// 前置：任务树 / 画像 / 字号密度三个分包的 lib/client.js 已各自构建好；
//       设置面板先跑 node scripts/build-settings-client.mjs。
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = dirname(dirname(fileURLToPath(import.meta.url)))
const out = join(repo, 'lib/client.js')

const parts = [
  ['任务树面板', 'legacy/dsh-evolve-task-tree/lib/client.js'],
  ['画像面板', 'legacy/dsh-profile-panel/lib/client.js'],
  ['对齐栏与收尾检测的字号密度（含 40 秒草稿的替换）', 'legacy/dsh-chat-density/lib/client.js'],
  ['进化模式设置页', 'build/settings-client.js'],
]

const HEAD = 'window.__ModuleLoader__.load({\n\tid: "dsh-evolve-preset",\n\tfactory: (require) => {\n\t\tconst __panels = [];\n'

const TAIL = [
  '\t\tconst __ready = __panels.filter((m) => m && typeof m.apply === "function");',
  '\t\treturn {',
  '\t\t\tinject: ["slots"],',
  '\t\t\tapply(ctx) {',
  '\t\t\t\tfor (const m of __ready) {',
  '\t\t\t\t\ttry { m.apply(ctx) } catch (error) { console.warn("[dsh-evolve-preset] 客户端面板未挂上", error) }',
  '\t\t\t\t}',
  '\t\t\t},',
  '\t\t};',
  '\t}',
  '});',
  '',
].join('\n')

function body(file) {
  const src = readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
  const startMark = '\tfactory: (require) => {\n'
  const endMark = '\n\t\treturn module.exports;'
  const s = src.indexOf(startMark)
  const e = src.lastIndexOf(endMark)
  if (s < 0 || e < 0) throw new Error('外壳不符：' + file)
  return src.slice(s + startMark.length, e).replace(/\n$/, '')
}

let text = HEAD
for (const [label, rel] of parts) {
  text += `// ${label}\n__panels.push((function () {\n\n${body(join(repo, rel))}\n\n\t\treturn module.exports;\n})());\n`
}
text += TAIL

// 语法自检：只解析不执行
try {
  // eslint-disable-next-line no-new-func
  new Function(text)
} catch (error) {
  console.error('产物语法检查失败：' + error.message)
  process.exit(1)
}

writeFileSync(out, '\uFEFF' + text, 'utf8')
console.log('已写出 ' + out + '（' + Buffer.byteLength(text, 'utf8') + ' 字节，含 ' + parts.length + ' 块面板）')
