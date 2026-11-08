#!/usr/bin/env node
/**
 * gate-check.mjs —— 关卡勾稽校验
 *
 * 一件事：把「关卡」从自报数字变成可核的条目。
 * 用法：
 *   node gate-check.mjs --init --session <id>      生成空白模板（$DSH_HOME/gate/<id>.md）
 *   node gate-check.mjs --file <模板.md>            校验模板，逐节给结论
 *
 * 每节判三条：① 正文非空白字符 ≥ 10；② 有一行 EVID: 指针；③ 指针合法且文件类真实存在。
 * 第四节起 SKIP 超过 8 节判整轮没做。
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

const HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const GATE_DIR = join(HOME, 'gate')
const MIN_CHARS = 10
const MIN_SKIP_REASON = 10

const SECTIONS = [
  ['01', '真实语义分析'],
  ['02', '成不成立'],
  ['03', '对得上原有'],
  ['04', '画像判别'],
  ['05', '先看树'],
  ['06', '任务'],
  ['07', '接续'],
  ['08', '归位与改枝'],
  ['09', '本层目标'],
  ['10', '硬需求'],
  ['11', '反推'],
  ['12', '基本点'],
  ['13', '软需求'],
  ['14', '对齐检查'],
  ['15', '落盘与交接'],
  ['16', '机器校验'],
]

function arg(name, def) {
  const i = process.argv.indexOf('--' + name)
  if (i < 0) return def
  const v = process.argv[i + 1]
  return v && !v.startsWith('--') ? v : true
}

function template(sessionId) {
  const head = `# 关卡勾稽 · ${sessionId}\n\n> 每节：正文 ≥ ${MIN_CHARS} 个非空白字符 + 一行 EVID: 指针（文件:行 / tool:名字{参数} / cmd:命令 / SKIP:理由）。\n> 指针要能被核：文件路径必须真实存在。SKIP 要给具体理由（≥10 字）；16 节全 SKIP 判未做。\n\n`
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
  if (!existsSync(p)) writeFileSync(p, template(String(sid)), 'utf8')
  console.log('模板: ' + p)
  process.exit(0)
}

// 刪除本会话的临时件（会话结束时用）
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
  const m = line.match(/^##\s+(\d{2})\s+(.+?)\s*$/)
  if (m) {
    cur = { no: m[1], title: m[2], body: [], evid: '' }
    found.set(m[1], cur)
    continue
  }
  if (!cur) continue
  const e = line.match(/^EVID[:：]\s*(.*)$/i)
  if (e) cur.evid = e[1]
  cur.body.push(line)
}

let pass = 0
let skip = 0
const rows = []
for (const [no, title] of SECTIONS) {
  const s = found.get(no)
  if (!s) { rows.push(`${no} ${title}\t—\t缺这一节\t✗`); continue }
  const chars = countChars(s.body.join('\n'))
  const ev = checkEvid(s.evid)
  if (ev.skip) skip++
  const okChars = chars >= MIN_CHARS
  const ok = okChars && ev.ok
  if (ok) pass++
  rows.push(`${no} ${title}\t${chars}字\t${okChars ? ev.why : '正文不足 ' + MIN_CHARS + ' 字'}\t${ok ? '✓' : '✗'}`)
}

const allSkip = pass === 0 && skip === total
const total = SECTIONS.length
const verdict = allSkip ? '✗ 未做（16 节全 SKIP）' : `${pass}/${total} ${pass === total ? '✅' : '✗'}`

console.log(rows.join('\n'))
console.log('---')
console.log('关卡：' + verdict)
const allPass = pass === total && !allSkip
// 不论过没过，正文发出前这一轮就作废：记一行日志，删掉模板。
// 没过的红项已经打在工具输出里，下一轮要改就重新 init，不能靠旧文件复用。
if (arg('finalize')) {
  const sid = String(arg('session') || '')
  if (sid) appendFileSync(join(GATE_DIR, sid + '.log'), `${new Date().toISOString()}\t${allPass ? '通过' : '未过'}\t${pass}/${total}\n`, 'utf8')
  rmSync(file, { force: true })
  console.log('本轮临时件已删除' + (sid ? '，日志: ' + join(GATE_DIR, sid + '.log') : ''))
}
process.exit(allPass ? 0 : 1)
