#!/usr/bin/env node
/**
 * gate-check.mjs —— 关卡勾稽校验
 *
 * 一件事：把「关卡」从自报数字变成可核的条目。
 * 用法：
 *   node gate-check.mjs --init --session <id>      生成/重置模板（$DSH_HOME/gate/<id>.md）
 *   node gate-check.mjs --file <模板.md>            校验模板（不删文件）
 *
 * 每节判三条：① 正文非空白字符 ≥ 10；② 有一行 EVID: 指针；③ 指针合法且文件类真实存在。
 * 只靠 SKIP 凑数的：SKIP 超过 2 节判整轮没做；全过才退出码 0。
 * 文件留档：校验不删；下一次 --init 覆盖清掉。
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const GATE_DIR = join(HOME, 'gate')
const MIN_CHARS = 10
const MIN_SKIP_REASON = 10
const MAX_SKIP = 2
const PLACEHOLDER = '回帖前补'
const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦']
const TO_NO = new Map(CIRCLED.map((c, i) => [c, String(i + 1).padStart(2, '0')]))

const SECTIONS = [
  ['01', '原件'],
  ['02', '五问'],
  ['03', '对得上原有'],
  ['04', '画像与词条'],
  ['05', '目标与需求'],
  ['06', '落盘'],
  ['07', '升级与归纳'],
]

function arg(name, def) {
  const i = process.argv.indexOf('--' + name)
  if (i < 0) return def
  const v = process.argv[i + 1]
  return v && !v.startsWith('--') ? v : true
}

function template(sessionId) {
  const head = `# 关卡勾稽 · ${sessionId}\n\n> 节名照下：## 01 原件 … ## 07 升级与归纳。每节：正文 ≥ ${MIN_CHARS} 个非空白字符 + 一行 EVID: 指针（文件:行 / tool:名字{参数} / cmd:命令 / SKIP:理由）。\n> 前五节动手前写完，落盘、升级与归纳先写「${PLACEHOLDER}」，回帖前补成实据再校验。校验不删文件，下一次 init 覆盖。\n\n`
  const body = SECTIONS.map(([no, title]) => `## ${no} ${title}\nEVID:\n结论：\n`).join('\n')
  return head + body
}

function countChars(s) {
  // 只算实质内容：去掉 EVID 行与「结论：」这类空标签，避免模板自带的字凑数
  const kept = (s || '')
    .split(/\r?\n/)
    .filter((l) => !/^\s*EVID[:：]/i.test(l))
    .map((l) => l.replace(/^\s*结论[:：]\s*$/, ''))
    .join('')
  return kept.replace(/\s/g, '').length
}

function checkEvid(evid) {
  const e = (evid || '').trim()
  if (!e) return { ok: false, why: '缺 EVID 指针' }
  if (/^SKIP/i.test(e)) {
    const reason = e.replace(/^SKIP[:：]?\s*/i, '')
    return reason.length >= MIN_SKIP_REASON
      ? { ok: true, skip: true, why: 'SKIP' }
      : { ok: false, why: `SKIP 要写具体理由（≥${MIN_SKIP_REASON} 字）` }
  }
  if (/^tool:/i.test(e)) {
    return /^tool:[\w-]+\{.*\}$/i.test(e) ? { ok: true, why: '工具指针' } : { ok: false, why: '工具指针格式应为 tool:名字{...}' }
  }
  if (/^cmd:/i.test(e)) {
    return e.length > 6 ? { ok: true, why: '命令指针' } : { ok: false, why: '命令指针太短' }
  }
  const m = e.match(/^([A-Za-z]:\\[^:]+?)(?::(\d+)(?:-(\d+))?)?$/)
  if (m) {
    const p = m[1]
    if (!existsSync(p)) return { ok: false, why: '文件不存在: ' + p }
    return { ok: true, why: '文件指针' }
  }
  return { ok: false, why: '指针要多写成 路径 / tool: / cmd: / SKIP:' }
}

const file = arg('file')

if (arg('init')) {
  const sid = arg('session') || 'session-unknown'
  mkdirSync(GATE_DIR, { recursive: true })
  const p = join(GATE_DIR, String(sid) + '.md')
  // 每次 init 都重建：上一轮的文档在这里被清掉，为这一轮让位。
  if (existsSync(p)) rmSync(p, { force: true })
  writeFileSync(p, template(String(sid)), 'utf8')
  console.log('模板: ' + p)
  process.exit(0)
}

// 清掉本会话的临时件（会话结束时用）
if (arg('clean')) {
  const sid = String(arg('session') || '')
  if (!sid) { console.error('--clean 需要 --session <id>'); process.exit(2) }
  let n = 0
  for (const ext of ['.md', '.log']) {
    const p = join(GATE_DIR, sid + ext)
    if (existsSync(p)) { rmSync(p); n++ }
  }
  console.log('已删除 ' + n + ' 个临时件: ' + sid)
  process.exit(0)
}

if (!file || typeof file !== 'string') {
  console.error('用法: --file <模板.md> 或 --init --session <id>')
  process.exit(2)
}
if (!existsSync(file)) {
  console.error('模板不存在: ' + file)
  process.exit(2)
}

const text = readFileSync(file, 'utf8')
const lines = text.split(/\r?\n/)
const found = new Map()
let cur = null
for (const line of lines) {
  const m = line.match(/^##\s+([0-9]{1,2}|[①②③④⑤⑥⑦⑧⑨⑩])\s*(.*)$/)
  if (m) {
    const no = /^\d+$/.test(m[1]) ? m[1].padStart(2, '0') : TO_NO.get(m[1])
    if (!no) continue
    cur = { no, title: m[2] || '', body: [], evid: '' }
    found.set(no, cur)
    continue
  }
  if (!cur) continue
  const e = line.match(/^EVID[:：]\s*(.*)$/i)
  if (e) cur.evid = e[1]
  cur.body.push(line)
}

const total = SECTIONS.length
let pass = 0
let skip = 0
const failed = []
const rows = []
for (const [no, title] of SECTIONS) {
  const s = found.get(no)
  if (!s) { rows.push(`${no} ${title}\t—\t缺这一节\t✗`); failed.push(no); continue }
  const body = s.body.join('\n')
  if (body.includes(PLACEHOLDER)) { rows.push(`${no} ${title}\t—\t还是前置占位「${PLACEHOLDER}」\t✗`); failed.push(no); continue }
  const chars = countChars(body)
  const ev = checkEvid(s.evid)
  if (ev.skip) skip++
  const okChars = chars >= MIN_CHARS
  const ok = okChars && ev.ok
  if (ok) pass++
  else failed.push(no)
  rows.push(`${no} ${title}\t${chars}字\t${okChars ? ev.why : '正文不足 ' + MIN_CHARS + ' 字'}\t${ok ? '✓' : '✗'}`)
}

const skipHeavy = skip > MAX_SKIP
const failedLabel = failed.map((n) => CIRCLED[Number(n) - 1]).join('')
const verdict = skipHeavy
  ? `未做（SKIP 超过 ${MAX_SKIP} 节）`
  : `${pass}/${total}${pass === total ? ' ✅' : `（${failedLabel}未过）`}`

console.log(rows.join('\n'))
console.log('---')
console.log('关卡：' + verdict)
const allPass = pass === total && !skipHeavy
// 校验不删文件：这一轮的文档留到下一次对话，下一次 init 时覆盖清掉。
console.log('关卡文件保留：' + file)
process.exit(allPass ? 0 : 1)
