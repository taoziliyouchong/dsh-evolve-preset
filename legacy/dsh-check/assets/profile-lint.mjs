// profile-lint.mjs — 画像文件体检（只读，不改任何文件）
// 用途：改完 $DSH_HOME/evolve/user-profile.md 或 user-profile.d/*.md 后跑一次，
//       拦住两类复发问题：① 设置栏是纯文本框、不渲染 markdown → 加粗/引用块是字面噪音，
//       行首缩进则让整篇参差不齐（要求：左对齐、一条一行）；
//       ② 同一条内容在通用画像与任务画像里各写一份 → 改一处漏一处（跨层重复）。
// 用法：node profile-lint.mjs
// 退出码：0 = 无 FAIL；1 = 有 FAIL。

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { homedir } from 'node:os'

const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh')
const home = join(dshHome, 'evolve')
const MAX_BYTES = 64 * 1024

const targets = []
const general = join(home, 'user-profile.md')
if (existsSync(general)) targets.push(general)
const dir = join(home, 'user-profile.d')
if (existsSync(dir)) {
  for (const name of readdirSync(dir).filter(n => n.endsWith('.md')).sort()) targets.push(join(dir, name))
}
if (targets.length === 0) {
  console.log(`未找到画像文件（${home}）`)
  process.exit(1)
}

/** 条目指纹：去掉 markdown 痕迹与标点后取前 14 字，用于跨层重复比对。 */
function fingerprint(line) {
  const body = line
    .replace(/^\s*(?:[-*+]|\d+[.、)]|[（(]?\d+[）)])\s*/, '')
    .replace(/[*_`>#]/g, '')
    .replace(/[，。；：、,.;:!?！？"'“”‘’()（）\s]/g, '')
  return body.length >= 10 ? body.slice(0, 14) : null
}

// 规则手册味检测：画像的用途是给「基本点」当素材——讲「他是什么样、要什么效果」，
// 不是第二套规则。这些是最早冒头的信号，只提示不改判（WARN，不影响退出码）。
const RULE_WORDS = ['必须', '不得', '禁止', '一律', '务必', '严禁', '不应']
const MECH_WORDS = ['模式第', '门禁', '规则见', '机制见', '见模式', '第五条', '第十条']
const ITEM_SOFT_MAX = 110 // 字符：超过就不是「一条一行」了
const fingerprints = new Map()
let failed = false

for (const file of targets) {
  const label = file === general ? 'user-profile.md（通用）' : `user-profile.d/${basename(file)}`
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch (error) {
    console.log(`✗ ${label} 读取失败：${error.message}`)
    failed = true
    continue
  }
  const lines = text.split(/\r?\n/)
  const bytes = Buffer.byteLength(text, 'utf8')
  const bold = lines.filter(l => l.includes('**')).length
  const quote = lines.filter(l => /^\s*>/.test(l)).length
  const indent = lines.filter(l => /^[ \t]+\S/.test(l)).length
  const heading = /^#\s+\S/.test(lines[0] ?? '')

  const ruleTone = lines.filter(l => {
    const t = l.trim()
    if (t === '' || t.startsWith('#')) return false
    if (RULE_WORDS.some(w => t.includes(w))) return true
    return MECH_WORDS.some(w => t.includes(w)) && !t.includes('技能')
  })
  const overlong = lines.filter(l => fingerprint(l) !== null && l.trim().length > ITEM_SOFT_MAX)

  const problems = []
  if (!heading) problems.push('首行不是 `# 标题`（设置栏侧栏会显示成 slug）')
  if (bold > 0) problems.push(`${bold} 行含 ** 加粗（纯文本框里是字面噪音）`)
  if (quote > 0) problems.push(`${quote} 行是引用块（> 开头，纯文本框里是字面噪音）`)
  if (indent > 0) problems.push(`${indent} 行行首有缩进（要全部左对齐、一条一行）`)
  if (bytes > MAX_BYTES) problems.push(`体积 ${bytes} 字节，超过上限 ${MAX_BYTES}`)

  const warnings = []
  if (bytes > 8000) warnings.push(`体积 ${bytes} 字节（软上限 8000）——画像超过这个量通常是长成规则手册了，先看有没有整条能删`)
  if (ruleTone.length > 0) warnings.push(`${ruleTone.length} 行带规则/命令口吻或机制条文（画像该写「你要什么」，不写「必须怎么做」；机制归模式与技能）`)
  if (overlong.length > 0) warnings.push(`${overlong.length} 条超过 ${ITEM_SOFT_MAX} 字（一条一行读得完才算素材，长条文通常是从别处搬来的）`)

  fingerprints.set(label, { file: label, items: new Map() })
  for (const line of lines) {
    const fp = fingerprint(line)
    if (fp === null) continue
    const bucket = fingerprints.get(label).items
    if (!bucket.has(fp)) bucket.set(fp, line.trim().slice(0, 30))
  }

  if (problems.length === 0) {
    console.log(`✓ ${label} — ${lines.length} 行 / ${bytes} 字节，格式合格`)
  } else {
    failed = true
    console.log(`✗ ${label} — ${problems.length} 个问题`)
    for (const p of problems) console.log(`   - ${p}`)
  }
  for (const w of warnings) console.log(`   ! ${w}`)
  for (const l of ruleTone.slice(0, 3)) console.log(`     · ${l.trim().slice(0, 52)}`)
  for (const l of overlong.slice(0, 2)) console.log(`     · 长条 ${l.trim().length} 字：${l.trim().slice(0, 44)}…`)
}

// 跨层重复条目：只比「通用画像 ↔ 各任务画像」——任务内容躺进通用画像才是真问题。
const seen = new Map()
for (const { file, items } of fingerprints.values()) {
  for (const [fp, sample] of items) {
    if (!seen.has(fp)) seen.set(fp, [])
    seen.get(fp).push({ file, sample })
  }
}
const generalLabel = 'user-profile.md（通用）'
const dupes = [...seen.values()].filter(hits =>
  hits.some(h => h.file === generalLabel) && hits.some(h => h.file !== generalLabel))
if (dupes.length > 0) {
  failed = true
  console.log(`✗ 跨层重复条目 ${dupes.length} 条（同一条内容写在两层，改一处必漏一处）`)
  for (const hits of dupes) {
    console.log(`   - 「${hits[0].sample}…」出现在：${hits.map(h => h.file).join(' / ')}`)
  }
} else {
  console.log('✓ 跨层无重复条目')
}

process.exit(failed ? 1 : 0)
