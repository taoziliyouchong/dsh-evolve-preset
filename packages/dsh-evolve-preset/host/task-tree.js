/**
 * dsh-evolve-task-tree —— 会话任务树（个人插件）
 *
 * 定义（与用户的任务树想法对齐）：
 *   任务树＝把一个任务摆成**能看懂、也能打断纠正**的方向图：
 *     · 下一级替上一级完成目标里的某一条（serves），上一级是下一级的目的；验收留在父身上；
 *     · 左右是平级——同一个父下的 ①②③ 并列摊开，合起来把上一级做成。
 *   它只为一件事存在：一眼看清「现在做到哪、这活替谁做、旁边还有哪几件」。
 *   树按需立：一个步骤一个节点——能单独验收（做完能单独说一句「这件事完了」）就立一支；不能单独验收的，归在它所属的那一步里，不另立。
 *   挂之前先走三问（2026-11-01）：①它是当前这层要完成的目标之一吗？是就挂这层；②不是就往上问一层，一层层问到根，哪层认它是目标就挂哪层（两层都认，挂低的那层）；③一路都没有哪层认它是目标、只是这件事带出来的问题——不挂成子：源不是根就挂成它的平级（add from=<源id>），源是根就另立一棵并列的（new unrelated=true from=<根id>），图上用一根横线连到源。父没有目标不许挂子。
 *
 * 存储（一个会话一棵树）：
 *   `$DSH_HOME/task-trees/sessions/<会话id>.json`
 *   树跟着会话走：会话在，树在；不跨会话共享，没有工作区映射。
 *
 * 借鉴的现有机制：
 *   · todo_write：整树提交式写入。
 *   · systemPrompt.section：每轮把本会话的树注入提示。
 *
 * 三件套：
 *   · 工具 `task-tree`：read / new / add / move / set / drop / unplaced / check / export / list
 *   · 命令 `/task-tree [--all|--check]`
 *   · 技能 `task-tree-workflow`（正文在 assets/）
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, openSync, readSync, closeSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { zstdDecompressSync } from 'node:zlib'
import { readSettings } from './settings.js'

/** Cordis 插件名。 */
export const name = 'dsh-evolve-task-tree'
/** 需要的服务。2026-11-03：技能 provider 挪进了 preset 层（skill-filesystem 扫 assets/），不再用 skills。 */
export const inject = ['tools', 'commands']

/* ───────────────────────── 常量 ───────────────────────── */

const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const ROOT_DIR = join(DSH_HOME, 'task-trees')
const SESSIONS_DIR = join(ROOT_DIR, 'sessions')
const ARCHIVED_DIR = join(ROOT_DIR, 'archived')

const NODE_STATUS = { active: '运行中', pending: '排队中', done: '已定', obsolete: '已废', dropped: '已否' }
const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳']
const UNPLACED_LIMIT = 2
const INJECT_NODE_CAP = 14

/**
 * 只有「进化模式」定义了「对齐栏」（本层目标／基本点／硬需求／软需求）这套字段；
 * 官方模式（standard / minimal / ptc / cordis）都没有它，注入对齐栏只会让模型硬凑格式。
 * 判定读 Session 投影 agentPreset——header 只是创建时的快照，切过模式后就不准了。
 */
const ALIGN_PRESET = 'evolve'
/** 本插件注册的工具名（非进化模式的会话要从工具表里摘掉它）。 */
const TOOL_NAME = 'task-tree'

/* ───────────────────────── 基础 ───────────────────────── */

function ensureDir() {
  if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true })
}

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
  } catch {
    return fallback
  }
}

function writeJson(file, value) {
  ensureDir()
  writeFileSync(file, JSON.stringify(value, null, 2), 'utf8')
}

/** 同级序号：① ② ③ … */
function mark(index) {
  return CIRCLED[index - 1] ?? `(${index})`
}

function pick(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/** 基本点参数：多条用「｜」或换行分隔；也收数组（侧栏写接口用）。 */
function pointsFromArg(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter((v) => v !== '')
  const raw = pick(value)
  if (!raw) return []
  return raw.split(/[｜|\n]/).map((s) => s.trim()).filter((s) => s !== '')
}

function cwdFromAny(source) {
  try {
    const c = source?.agent?.session?.header?.cwd
      ?? source?.session?.header?.cwd
      ?? source?.exec?.agent?.session?.header?.cwd
    return typeof c === 'string' && c.length > 0 ? c : undefined
  } catch {
    return undefined
  }
}

function sessionIdFromAny(source) {
  try {
    const id = source?.agent?.session?.id ?? source?.session?.id ?? source?.exec?.agent?.session?.id
    return typeof id === 'string' && id.length > 0 ? id : undefined
  } catch {
    return undefined
  }
}

/**
 * 本会话当前跑的是哪个 preset（读 Session 投影 agentPreset）。
 * 拿不到就返回 undefined——按「不是进化模式」处理：宁可不注入，也不把模式规则漏给别的模式。
 */
function presetFromAny(source, projections) {
  try {
    const session = source?.agent?.session ?? source?.session ?? source?.exec?.agent?.session
    if (!session) return undefined
    // DSH 0.2.2 起的官方入口：agentPresets.presetForSession（注册表级 stateOf 已弃用）。
    try {
      const ctx = source?.agent?.ctx ?? source?.ctx ?? source?.exec?.agent?.ctx
      const presets = ctx && typeof ctx.get === 'function' ? ctx.get('agentPresets') : undefined
      if (presets && typeof presets.presetForSession === 'function') {
        const got = presets.presetForSession(session)
        const value = typeof got === 'string' ? got : (got && typeof got.id === 'string' ? got.id : undefined)
        if (typeof value === 'string' && value.length > 0) return value
      }
    } catch {
      /* 没有 agentPresets：退回投影 */
    }
    if (!projections || typeof projections.stateOf !== 'function') return undefined
    const preset = projections.stateOf(session, 'agentPreset')
    return typeof preset === 'string' && preset.length > 0 ? preset : undefined
  } catch {
    return undefined
  }
}

/* ───────────────────────── 存储：一会话一文件 ───────────────────────── */

function sessionFile(sessionId) {
  return join(SESSIONS_DIR, `${sessionId}.json`)
}

/**
 * 读本会话的记录（没有则 null）。
 * 记录可以只有对齐栏、还没有树（会话不开树时，侧栏仍能显示当前对齐栏）：
 * 有 root 或 align 两者之一即算有效。
 */
function loadTree(sessionId) {
  if (!sessionId) return null
  const rec = readJson(sessionFile(sessionId), null)
  if (!rec || rec.version !== 3) return null
  if (!rec.root && !rec.align && !(Array.isArray(rec.roots) && rec.roots.length)) return null
  return normalizeRecord(rec)
}

/**
 * 一个会话可以挂几棵互不隶属的树（rev 2026-10-17：并行任务不再互相顶掉）。
 * rec.roots 是全部根；rec.root 是"当前这棵"（旧代码按单根写的路径都用它），
 * 只在一处换算：读盘与落盘时同步，别处不各自推导。
 */
function rootsOf(rec) {
  if (!rec) return []
  if (!Array.isArray(rec.roots)) rec.roots = rec.root ? [rec.root] : []
  return rec.roots
}

/** 老记录（只有 root）就地升级成 roots[]，并确定当前根。 */
function normalizeRecord(rec) {
  if (!rec) return rec
  const roots = rootsOf(rec)
  if (rec.root && !roots.some((r) => r.id === rec.root.id)) roots.push(rec.root)
  // 同 id 只留一棵（老文件里 root 与 roots[] 各存一份会重复长出来）
  const seen = new Set()
  const uniq = []
  for (const r of roots) {
    if (!r || seen.has(r.id)) continue
    seen.add(r.id)
    uniq.push(r)
  }
  if (uniq.length !== roots.length) rec.roots = uniq
  const list = uniq
  if (list.length > 0) {
    if (!list.some((r) => r.id === rec.currentRootId)) rec.currentRootId = list[list.length - 1].id
    rec.root = list.find((r) => r.id === rec.currentRootId) || list[0]
  } else {
    rec.root = null
    rec.currentRootId = null
  }
  return rec
}

/** 跨所有根找一个节点（对齐栏回写、卡片编辑用：id 全局唯一）。 */
function findNodeAny(rec, id) {
  if (!rec || !id) return null
  for (const root of rootsOf(rec)) {
    const hit = findNode(root, id)
    if (hit) return hit
  }
  return null
}

/** 所有根的节点（id 分配、体检、统计用）。 */
function walkAll(rec) {
  return rootsOf(rec).flatMap((root) => walkNodes(root))
}

/** 本会话下一个空闲节点 id（跨所有根编号，id 全局唯一）。 */
function allocId(rec) {
  const used = new Set(walkAll(rec).map((w) => w.node.id))
  let n = 1
  while (used.has(`n${n}`)) n++
  return `n${n}`
}

/** 某个节点住在哪棵树下（跨根改挂、切当前根用）。 */
function rootOfNode(rec, id) {
  for (const root of rootsOf(rec)) if (findNode(root, id)) return root
  return null
}

/** 找某节点的父节点（跨根）。根节点返回 null。 */
function findParentOf(rec, id) {
  let hit = null
  const scan = (node) => {
    if (hit) return
    for (const c of (node.children || [])) {
      if (c.id === id) { hit = node; return }
      scan(c)
    }
  }
  for (const root of rootsOf(rec)) {
    if (root.id === id) return null
    scan(root)
    if (hit) return hit
  }
  return hit
}

/** 同一父下只留一支进行中：把指定节点设 active 时，兄弟退回排队。 */
function demoteSiblingActive(rec, nodeId) {
  const parent = findParentOf(rec, nodeId)
  if (!parent) return
  for (const c of (parent.children || [])) if (c.id !== nodeId && c.status === 'active') c.status = 'pending'
}

/** 跨根摘下一个节点（它自己所属的那棵）。 */
function detachAny(rec, id) {
  for (const root of rootsOf(rec)) {
    const node = detach(root, id)
    if (node) return node
  }
  return null
}

/** 会话开场自动长出来的根节点占位标题（第一次 align / new 时换成真实任务）。 */
const AUTO_ROOT_TITLE = '本会话任务'

/** 是不是自动长出来的占位根：还没长出子节点、也没被显式立过树，可被第一次 new 直接替换。 */
function isAutoRoot(rec) {
  const root = rec && rec.root
  return !!(root && root.auto === true && (root.children || []).length === 0)
}

/**
 * 分支会话继承父会话的任务树（2026-11-08）：DSH 分支＝复制父会话档到新 id，
 * 树按会话存，不搬就等于分支从零开始。父 id 从档里认，父树整份搬过来。
 * 没有父树、或本会话不是分支，返回 null（调用方退回建占位根）。
 */
function inheritTreeFromBranchSource(sessionId, cwd) {
  try {
    const from = sourceSessionIdOf(sessionId)
    if (!from || from === sessionId) return null
    const src = loadTree(from)
    if (!src || !src.root) return null
    src.sessionId = sessionId
    if (cwd) src.cwd = cwd
    src.inheritedFrom = from
    // 连续修改次数归属原会话：分支从 0 起算。
    delete src.guard
    saveTree(src)
    return loadTree(sessionId) || src
  } catch {
    return null
  }
}

/**
 * 会话第一次被看到时就把根节点长出来：侧栏面板「没树」时只显示一句提示，
 * 自动建根让本会话从第一轮起就有卡片；真实目标由第一次 align 或 new 填进来。
 */
function autoCreateRoot(sessionId, cwd) {
  if (!sessionId) return null
  const existing = loadTree(sessionId)
  if (existing && existing.root) {
    // 分支会话：占位根还在、用户还没在侧栏动过 → 换成父会话那棵树（分支不该从零开始）。
    if (isAutoRoot(existing) && !existing.inheritedFrom && (!existing.align || existing.align.source !== 'user')) {
      const adopted = inheritTreeFromBranchSource(sessionId, cwd)
      if (adopted && adopted.root) return adopted
    }
    return existing
  }
  const adopted = inheritTreeFromBranchSource(sessionId, cwd)
  if (adopted && adopted.root) return adopted
  const titleOf = (goal) => (goal
    ? (goal.length > 30 ? `${goal.slice(0, 30)}…` : goal)
    : AUTO_ROOT_TITLE)
  if (existing) {
    // 只有对齐栏的老记录：补一根根节点，目标取已同步的那一版
    const align = normalizeAlign(existing.align) || { goal: '', points: [], hard: '', soft: '' }
    existing.root = {
      id: 'n1',
      title: titleOf(align.goal),
      serves: '',
      goal: align.goal,
      accept: align.accept || '',
      points: align.points,
      hard: align.hard,
      soft: align.soft,
      status: 'active',
      auto: true,
      children: [],
    }
    if (!existing.cwd && cwd) existing.cwd = cwd
    saveTree(existing)
    return existing
  }
  const rec = {
    version: 3,
    sessionId,
    cwd: cwd || '',
    root: { id: 'n1', title: AUTO_ROOT_TITLE, serves: '', goal: '', accept: '', points: [], hard: '', soft: '', status: 'active', auto: true, children: [] },
    dropped: [],
    unplaced: [],
  }
  saveTree(rec)
  return rec
}

/** 落盘（盘上只存 roots[]＋currentRootId；root 是加载时算出来的当前根，不落盘）。 */
function saveTree(rec) {
  const roots = rootsOf(rec)
  if (rec.root && !roots.some((r) => r.id === rec.root.id)) roots.push(rec.root)
  if (roots.length > 0) {
    if (!roots.some((r) => r.id === rec.currentRootId)) rec.currentRootId = roots[roots.length - 1].id
    rec.root = roots.find((r) => r.id === rec.currentRootId) || roots[0]
  } else {
    rec.root = null
    rec.currentRootId = null
  }
  rec.roots = roots
  rec.version = 3
  rec.updatedAt = new Date().toISOString()
  const out = { ...rec }
  delete out.root
  writeJson(sessionFile(rec.sessionId), out)
  return rec
}

/** 读—改—写一次（改完必落盘）。 */
function mutate(sessionId, fn) {
  const rec = loadTree(sessionId)
  if (!rec) throw new Error('本会话还没有任务树：要把任务摆成方向图时再立——action=new title=<根任务>')
  if (!rec.root) throw new Error('本会话只有对齐栏、还没有树：先 action=new title=<根任务> 立树')
  const out = fn(rec)
  saveTree(rec)
  return out
}

/* ───────────────── 连续修改护栏（2026-11-09） ───────────────── */

/**
 * 连续修改节点、期间没有建立新目标（new/add）时的写入护栏（用户 2026-11-09 要求）：
 *   · 连续第 1、2 次修改：放行；
 *   · 第 3 次：报提示并禁止写入；
 *   · 第 4 次：放行但仍报；第 5 次禁止；第 6 次放行仍报——从第 3 次起单数拦、双数放。
 *   · 任何一次 new/add 成功（建立新目标）→ 计数清零。
 * 次数按「写入尝试」算：被拦下的那次也推进一次，否则下一次仍停在同一条上、永远拦死。
 * 只算工具写入（align/set/move/drop）；侧栏卡片里用户改的、每轮自动抄回上一轮对齐栏都不计数。
 */
const GUARD_ACTIONS = new Set(['align', 'set', 'move', 'drop'])
const GUARD_FROM = 3

/** 记录里的连续修改次数（没有就是 0）。 */
function guardCountOf(rec) {
  const g = rec && rec.guard
  return g && Number.isSafeInteger(g.count) && g.count > 0 ? g.count : 0
}

/** 把次数写回会话记录（只动 guard 一个字段）。 */
function persistGuard(sessionId, count, action) {
  const rec = loadTree(sessionId)
  if (!rec) return
  rec.guard = { count, lastAction: action, lastAt: new Date().toISOString() }
  saveTree(rec)
}

/** 建立新目标（new/add 成功）→ 清零。 */
function resetGuard(sessionId) {
  const rec = loadTree(sessionId)
  if (!rec || !rec.guard) return
  rec.guard = { count: 0, lastAction: 'reset', lastAt: new Date().toISOString() }
  saveTree(rec)
}

/**
 * 写入前过一次护栏：被拦的那一次当场把计数推进（并落盘）；
 * 放行的返回 settle——调用方写入成功后再 settle()，写失败的这一次不算修改。
 */
function guardBefore(sessionId, action) {
  if (!GUARD_ACTIONS.has(action)) return null
  const rec = loadTree(sessionId)
  if (!rec) return null // 还没有树记录：没有节点可改，不计数（第一次 align 会建记录）
  const next = guardCountOf(rec) + 1
  const blocked = next >= GUARD_FROM && next % 2 === 1
  if (blocked) {
    persistGuard(sessionId, next, action)
    return { blocked: true, count: next, action, warn: '', settle: () => {} }
  }
  const warn = next >= GUARD_FROM
    ? `连续第 ${next} 次修改节点、期间没有建立新的目标——这次放行，下一次（第 ${next + 1} 次）会被拦下。要解除：action=new 立根或 action=add 挂一支新目标，计数即清零。`
    : ''
  return { blocked: false, count: next, action, warn, settle: () => persistGuard(sessionId, next, action) }
}

/** 被拦时的错误文案（直接抛给模型看）。 */
function guardBlockText(count, action) {
  return `任务树写入被拦下：连续第 ${count} 次修改节点（这次是 ${action}）、期间没有建立新的目标——第 ${count} 次不允许写入。`
    + `下一次（第 ${count + 1} 次）会放行但仍提示，第 ${count + 2} 次再拦，如此交替。`
    + `解除办法：建立一个新目标——action=new title=<根任务> 立根，或 action=add parent=<父 id> serves=<…> title=<…> 挂一支；成功即清零。`
}

/** 列出所有会话的树（/… --all 用）。 */
function listAll() {
  if (!existsSync(SESSIONS_DIR)) return '还没有任何会话树。'
  const files = readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.json'))
  if (files.length === 0) return `还没有任何会话树（目录：${SESSIONS_DIR}）。`
  const rows = files.map((f) => {
    const rec = readJson(join(SESSIONS_DIR, f), null)
    return rec && (rec.root || rec.align) ? rec : null
  }).filter(Boolean)
  if (rows.length === 0) return `还没有任何会话树（目录：${SESSIONS_DIR}）。`
  const lines = [`会话记录共 ${rows.length} 棵（目录：${SESSIONS_DIR}）`]
  rows.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  for (const rec of rows) {
    const shortId = String(rec.sessionId || '').replace(/^session-/, '').slice(0, 8)
    const roots = rootsOf(rec).length > 0 ? rootsOf(rec) : (rec.root ? [rec.root] : [])
    const nodes = walkAll(rec).length
    const head = roots.length > 0
      ? `${roots.length > 1 ? `${roots.length} 棵：` : ''}${roots.map((r) => `${r.title}（${NODE_STATUS[r.status] || r.status}）`).join('＋')}，共 ${nodes} 个节点`
      : `（未立树，只有对齐栏）${alignLine(alignOf(rec) || { goal: '', points: [], hard: '', soft: '' })}`
    lines.push(`· ${shortId}…｜${head}｜${rec.cwd || ''}`)
  }
  return escapeDoubleBraces(lines.join('\n'))
}

/* ───────────────────────── 树/节点工具 ───────────────────────── */

function walkNodes(node, depth = 1, out = []) {
  if (!node) return out
  out.push({ node, depth })
  for (const c of node.children || []) walkNodes(c, depth + 1, out)
  return out
}

function findNode(root, id) {
  if (!root) return null
  if (root.id === id) return root
  for (const c of root.children || []) {
    const hit = findNode(c, id)
    if (hit) return hit
  }
  return null
}

function findParent(root, id) {
  if (!root) return null
  for (const c of root.children || []) {
    if (c.id === id) return root
    const hit = findParent(c, id)
    if (hit) return hit
  }
  return null
}

function subtree(node, out = []) {
  out.push(node)
  for (const c of node.children || []) subtree(c, out)
  return out
}

function detach(root, id) {
  const parent = findParent(root, id)
  if (!parent) return null
  const node = (parent.children || []).find((c) => c.id === id)
  if (!node) return null
  parent.children = parent.children.filter((c) => c.id !== id)
  return node
}

/* ───────────────────────── 对齐栏（本层目标／基本点／硬需求／软需求） ───────────────────────── */

/**
 * 对齐栏＝会话这一轮的对齐快照，侧栏顶部常驻显示它。
 * 与树的关系：树节点各自带同名字段（goal/points/hard/soft＝那一层的对齐栏）；
 * 会话级的 align 是"我现在正在讲的那一层"的副本，写一次两处同口径。
 */
function normalizeAlign(raw) {
  if (!raw) return null
  const goal = pick(raw.goal)
  const points = Array.isArray(raw.points)
    ? raw.points.map((p) => String(p).trim()).filter((p) => p !== '')
    : pointsFromArg(raw.points)
  const hard = pick(raw.hard)
  const soft = pick(raw.soft)
  const accept = pick(raw.accept)
  if (!goal && points.length === 0 && !hard && !soft) return null
  const source = raw.source === 'user' ? 'user' : (raw.source === 'agent' ? 'agent' : '')
  return { goal, accept, points, hard, soft, source, updatedAt: pick(raw.updatedAt) }
}

/**
 * 反推闸门（2026-11-05）：新立或纠偏时，硬需求里必须留下走过「从目标反推」的痕迹——
 * 要么带〔反推…〕标记，要么写「反推无新增」。没有硬需求的层不拦。
 * 只在这两个时机拦：平时每轮 align 都校验会把「这一轮没改硬需求」的正常推进全堵死。
 */
function assertReverseDerivation(hard, where) {
  const h = pick(hard)
  if (!h || h === '无') return
  if (h.includes('反推')) return
  throw new Error(`${where}的硬需求里既没有〔反推〕标记，也没有「反推无新增」：先对本层目标走一遍从目标反推（逐条撤项，看塌成什么、有没有第二条路），把结果标进硬需求，或写明「反推无新增」，再重交。`)
}

/**
 * 根只装一件事（2026-11-08）：根目标里用「；」并列两段及以上，基本是把两件事塞进一个根。
 * 这种根一旦立下，之后每轮 align 都落它，两件事的进度就永远混在一条线上——所以写入时就拒。
 * 只拦 agent 写的（用户自己改根不受限）。
 */
function assertSingleEffectGoal(goal, where) {
  const g = pick(goal)
  if (!g) return
  const parts = g.split(/[；;。]/).map((s) => s.trim()).filter((s) => s !== '')
  if (parts.length > 1) {
    throw new Error(`${where}里用「；」或句号并列了 ${parts.length} 段效果：根只装一件事——两件事请各立一棵（action=new unrelated=true），或压成一句不带并列的效果句再交。`)
  }
}

/**
 * 写对齐栏（工具与侧栏写接口共用一份逻辑）：
 * 会话记录存快照；有树时同步到当前层节点（可用 id 指定节点）。
 * source 区分谁写的：'agent'（工具同步）／'user'（用户在侧栏直接改，注入会提醒下一轮以它为准）。
 */
function applyAlign(sessionId, patch, source, cwd) {
  const existing = loadTree(sessionId)
  const prev = normalizeAlign(existing && existing.align) || { goal: '', accept: '', points: [], hard: '', soft: '' }

  const next = {
    goal: patch.goal !== undefined ? pick(patch.goal) : prev.goal,
    accept: patch.accept !== undefined ? pick(patch.accept) : prev.accept,
    points: patch.points !== undefined ? pointsFromArg(patch.points) : prev.points,
    hard: patch.hard !== undefined ? pick(patch.hard) : prev.hard,
    soft: patch.soft !== undefined ? pick(patch.soft) : prev.soft,
  }
  if (!next.goal && next.points.length === 0 && !next.hard && !next.soft) {
    throw new Error('对齐栏至少要有一项：本层目标／基本点／硬需求／软需求')
  }
  // 用户刚在侧栏改过的版本优先：会话侧重新思考后要写回覆盖，带 force=true（先向用户复述理解）。
  const sameAsPrev = prev.goal === next.goal
    && prev.accept === next.accept
    && prev.points.length === next.points.length
    && prev.points.every((p, i) => p === next.points[i])
    && prev.hard === next.hard
    && prev.soft === next.soft
  const wantId = pick(patch.id)
  const layerNode = existing && existing.root ? currentLayerNode(existing.root, existing.currentId) : null
  const targetId = wantId || (layerNode ? layerNode.id : null)
  // 保护只针对同一个节点的用户版本（旧数据没记 nodeId 时按同节点处理）
  const prevIsSameNode = !!(existing && existing.align)
    && (!existing.align.nodeId || existing.align.nodeId === targetId)
  if (source !== 'user' && existing && existing.align && existing.align.source === 'user'
    && prevIsSameNode && !sameAsPrev && patch.force !== true) {
    throw new Error('对齐栏是用户刚在侧栏改过的版本：重新思考后写回覆盖要带 force=true（先复述你理解成什么）')
  }
  const rec = existing || {
    version: 3,
    sessionId,
    cwd: cwd || '',
    root: null,
    dropped: [],
    unplaced: [],
  }
  if (!rec.cwd && cwd) rec.cwd = cwd
  let target = null
  let rootChanged = false
  if (rec.root) {
    target = wantId ? findNodeAny(rec, wantId) : currentLayerNode(rec.root, rec.currentId)
    if (wantId && !target) throw new Error(`找不到节点 ${wantId}`)
    if (target) {
      // 根是整棵树的目的，不许逐轮拿它换活：改根的目标＝换根，要显式 force。
      // 没子支时也一样拦——本会话实测过：只有根时每轮 align 都落在根上，根目标被逐轮改成当轮的子目标。
      const isRootTarget = rootsOf(rec).some((r) => r.id === target.id)
      const autoRootTarget = isRootTarget && isAutoRoot(rec)
      const rootHasChildren = isRootTarget && Array.isArray(target.children) && target.children.length > 0
      const goalChanges = !!next.goal && !!target.goal && next.goal !== target.goal
      // 根只装一件事：并列写成「；」的根目标当场拒（用户在侧栏自己改的不拦）。
      if (isRootTarget && source !== 'user') assertSingleEffectGoal(next.goal, '根目标')
      if (isRootTarget && !autoRootTarget && goalChanges && patch.force !== true) {
        throw new Error(
          `对齐栏落在根 [${target.id}] 上，且新目标与根现目标不同：根是整棵树的目的，不许逐轮换活（那是把当轮子目标顶掉根，越走越偏）。`
          + `日常推进别落在根上——先 align 到实际在做的那一支。`
          + `确认是目标写偏了要纠回来，就显式带上 align id=${target.id} force=true why=<偏在哪>：改正后各支照旧，只是提法跟不上的改措辞，不拆支。`
          + (rootHasChildren ? '' : '（当前根下还没有子支；注意别每轮把根改成当轮的子目标。）'),
        )
      }
      // 目标修正留痕（2026-11-01 改口径）：换根是「同一条任务的目标写偏了，纠回来」，不是换任务。
      // 记的是「原来偏成什么样、偏在哪」，不是「曾有过另一个方向」——所以文案叫「目标修正前」。
      if (isRootTarget && goalChanges && patch.force === true && !autoRootTarget) {
        const hist = Array.isArray(rec.rootHistory) ? rec.rootHistory : []
        rec.rootHistory = [...hist, {
          goal: String(target.goal || ''),
          accept: String(target.accept || ''),
          at: new Date().toISOString(),
          why: pick(patch.why),
        }].slice(-3)
        rootChanged = true
      }
      target.goal = next.goal
      target.accept = next.accept
      target.points = next.points
      target.hard = next.hard
      target.soft = next.soft
    }
  }
  if (rec.root && next.goal && isAutoRoot(rec)) {
    rec.root.goal = next.goal
    rec.root.accept = next.accept
    rec.root.title = next.goal.length > 30 ? `${next.goal.slice(0, 30)}…` : next.goal
    rec.root.auto = false
  }
  rec.align = {
    ...next,
    source: source === 'user' ? 'user' : 'agent',
    updatedAt: new Date().toISOString(),
    nodeId: target ? target.id : null,
  }
  saveTree(rec)
  return { rec, target, align: rec.align, rootChanged }
}

/**
 * 改一个节点（工具 set 与侧栏卡片编辑共用）：
 * 字段与状态都可改；改的是当前层节点时，顶部对齐栏同步成这一版（source 跟调用方走：侧栏卡片＝user，工具 set＝agent）。
 */
function updateNode(sessionId, patch) {
  const rec = loadTree(sessionId)
  if (!rec) throw new Error('本会话还没有任务树')
  if (rootsOf(rec).length === 0) throw new Error('本会话只有对齐栏、还没有树：先 action=new 立树')
  const id = pick(patch.id)
  if (!id) throw new Error('需要节点 id')
  const node = findNodeAny(rec, id)
  if (!node) throw new Error(`找不到节点 ${id}`)
  if (patch.title !== undefined && pick(patch.title)) node.title = pick(patch.title)
  // 改根的目标＝目标纠偏（2026-11-01 改口径）：`set` 与侧栏卡片都走这里，原来偏成什么样同样留一行。
  if (patch.goal !== undefined) {
    const nextGoal = pick(patch.goal)
    const isRootNode = rootsOf(rec).some((r) => r.id === node.id)
    // 根目标改动的后门（2026-11-01）：`set` 原来能绕过 align 的防漂移保护悄悄改根，
    // 走过这里就统一要求走纠偏语义（force；卡片里用户改的除外）。
    if (isRootNode && patch.source !== 'user' && nextGoal && node.goal && nextGoal !== node.goal && patch.force !== true) {
      throw new Error(`改根目标要走纠偏：align id=${node.id} force=true why=<偏在哪>（或 set 带 force=true，卡片里你改不受限）——根是整棵树的目的，不许逐轮换活。改正后各支照旧，不拆支。`)
    }
    if (isRootNode && patch.source !== 'user') assertSingleEffectGoal(nextGoal, '根目标')
    if (isRootNode && nextGoal && node.goal && nextGoal !== node.goal) {
      const hist = Array.isArray(rec.rootHistory) ? rec.rootHistory : []
      rec.rootHistory = [...hist, {
        goal: String(node.goal || ''),
        accept: String(node.accept || ''),
        at: new Date().toISOString(),
        why: pick(patch.why) || (patch.source === 'user' ? '用户在侧栏卡片里改的' : ''),
      }].slice(-3)
    }
    node.goal = nextGoal
  }
  if (patch.accept !== undefined) node.accept = pick(patch.accept)
  if (patch.points !== undefined) node.points = pointsFromArg(patch.points)
  if (patch.hard !== undefined) node.hard = pick(patch.hard)
  if (patch.soft !== undefined) node.soft = pick(patch.soft)
  if (patch.serves !== undefined) {
    const s = pick(patch.serves)
    if (!rootsOf(rec).some((r) => r.id === node.id) && !s && !node.from) throw new Error('serves 不能置空：非根节点必须写清替父拿下父目标里的哪一条（衍生节点除外）')
    node.serves = s
  }
  const prevLayer = currentLayerNode(rec.root, rec.currentId)
  if (patch.status !== undefined && pick(patch.status)) {
    const status = pick(patch.status)
    if (!['active', 'pending', 'done', 'obsolete'].includes(status)) {
      throw new Error('status 只能是 active 运行中／pending 排队中／done 已定／obsolete 已废（要移除整支用 action=drop）')
    }
    node.status = status
    if (status === 'active') demoteSiblingActive(rec, node.id)
  }
  const isUser = patch.source === 'user'
  // 用户点「进行中」＝把当前层切到这张卡；下一轮注入要告诉会话「任务有变动」
  if (isUser && node.status === 'active') {
    rec.currentId = node.id
    const home = rootOfNode(rec, node.id)
    if (home) rec.currentRootId = home.id
    rec.userNotice = { at: new Date().toISOString(), id: node.id, title: node.title || node.goal || node.id }
  } else if (isUser && node.status !== 'active' && prevLayer && prevLayer.id === node.id) {
    rec.currentId = null
    rec.userNotice = { at: new Date().toISOString(), id: node.id, title: node.title || node.goal || node.id }
    rec.align = null
  }
  // 当前层改了就跟着变：仍是进行中→同步成这一版；改成已定/已废→让顶部对齐栏回退到新的当前层
  const layer = currentLayerNode(rec.root, rec.currentId)
  if (layer && layer.id === node.id) {
    if (node.status === 'active') {
      rec.align = {
        ...(normalizeAlign(rec.align) || {}),
        goal: String(node.goal || ''),
        accept: String(node.accept || ''),
        points: Array.isArray(node.points) ? node.points : pointsFromArg(node.points),
        hard: String(node.hard || ''),
        soft: String(node.soft || ''),
        source: isUser ? 'user' : 'agent',
        updatedAt: new Date().toISOString(),
        nodeId: node.id,
      }
    } else {
      rec.align = null
    }
  }
  saveTree(rec)
  return { rec, node }
}

/** 从树节点取对齐栏（节点字段本身就是那一层的对齐栏）。 */
function alignFromNode(node) {
  if (!node) return null
  return normalizeAlign({ goal: node.goal, accept: node.accept, points: node.points, hard: node.hard, soft: node.soft })
}

/**
 * 记录里的有效对齐栏：优先用会话当前出示的那一套（align 快照），
 * 它所属的节点还在且仍进行中才算数；否则回退当前层节点、根节点（没树时只剩快照）。
 */
function alignOf(rec) {
  if (!rec) return null
  const meta = normalizeAlign(rec.align)
  if (meta) {
    const nodeId = rec.align && rec.align.nodeId
    if (!nodeId || !rec.root) return meta
    const node = findNodeAny(rec, nodeId)
    if (node && node.status === 'active') return meta
    return alignFromNode(currentLayerNode(rec.root, rec.currentId)) || alignFromNode(rec.root) || meta
  }
  if (rec.root) {
    return alignFromNode(currentLayerNode(rec.root, rec.currentId)) || alignFromNode(rec.root)
  }
  return null
}

/** 当前层：进行中链的末端节点（没有进行中就用根）；给了 preferredId 且它仍在进行中，就以它为准。 */
function currentLayerNode(root, preferredId) {
  if (!root) return null
  if (preferredId) {
    const preferred = findNode(root, preferredId)
    if (preferred && preferred.status === 'active') return preferred
  }
  const paths = activePaths(root)
  if (paths.length > 0) {
    const last = paths[paths.length - 1]
    if (last.length > 1) return last[last.length - 1] || root
    // 只剩根这一条进行中链：若树里还有更深的进行中节点（父级被标排队／已定的不一致情形），以它为准。
    // 否则 align 会落回根上，逐轮把第一层改掉——本会话实测踩到过。
    const deep = deepestActive(root)
    return deep || root
  }
  const deep = deepestActive(root)
  return deep || root
}

/** 树里最深的进行中节点（不含根；同级取遍历里的最后一个）。 */
function deepestActive(root) {
  let best = null
  let bestDepth = 0
  const walk = (node, depth) => {
    if (!node || depth === 0) return
    if (node.status === 'active' && depth >= bestDepth) {
      best = node
      bestDepth = depth
    }
    for (const child of node.children || []) walk(child, depth + 1)
  }
  for (const child of root.children || []) walk(child, 1)
  return best
}

/** 现在真在跑的那颗节点：当前树进行中链的末端（与对齐栏、侧栏面板同一口径）。 */
function runningIdOf(rec) {
  if (!rec || !rec.root) return ''
  const node = currentLayerNode(rec.root, rec.currentId)
  // currentLayerNode 在没有进行中节点时会回退到根（那是给 align 找落点用的），
  // 显示层不能跟着回退——否则全部做完的根也会被渲染成「运行中」。
  if (!node || node.status !== 'active') return ''
  return node.id
}

/**
 * 卡面状态：全树只有一个「运行中」（当前在跑的那颗），其余没做完的（active／pending）一律「排队中」。
 * 底层 status 仍是 active／pending（工具与数据不动），只有显示口径统一到「谁在跑、谁在等」。
 */
function displayStatus(node, runningId) {
  if (!node) return ''
  if (runningId && node.id === runningId) return '运行中'
  if (node.status === 'active' || node.status === 'pending') return '排队中'
  return NODE_STATUS[node.status] || node.status
}

/** 对齐栏的一行文本（注入与工具 read 共用）；upper＝上一级的目标，有就放第一行。 */
/** 对齐栏的一行文本（注入与工具 read 共用）。2026-11-03：去掉根本目标行与验收，只出四样。 */
function alignLine(align) {
  const parts = []
  const aim = String(align.goal || '').trim()
  if (aim) parts.push(`本层目标：${aim}`)
  if (align.points && align.points.length > 0) parts.push(`基本点：${align.points.map((p, i) => `${ALIGN_MARKS[i] || i + 1}${p}`).join('｜')}`)
  if (align.hard) parts.push(`硬需求：${align.hard}`)
  if (align.soft) parts.push(`软需求：${align.soft}`)
  return parts.join('｜')
}

/** 节点在树里的层数（根＝1）；不在树上或没有树＝1。 */
function depthOf(root, id) {
  const walk = (node, depth) => {
    if (!node) return 0
    if (node.id === id) return depth
    for (const c of node.children || []) {
      const hit = walk(c, depth + 1)
      if (hit) return hit
    }
    return 0
  }
  return walk(root, 1) || 1
}

const ALIGN_MARKS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

/** 层号的写法：「第一层」「第二层」……（与 align 返回块同一套）。 */
function layerText(depth) {
  return `第${CN_NUM[depth - 1] || depth}层`
}

/** 某个节点在它所在那棵树里的层数（根＝1；找不到树就算第 1 层）。 */
function nodeDepth(rec, node) {
  if (!rec || !node) return 1
  const home = rootOfNode(rec, node.id) || rec.root
  return home ? depthOf(home, node.id) : 1
}

/**
 * 对齐栏这一版所在的层数（根＝1）：取与 alignOf 同一个节点——
 * 先认 align.nodeId（还在进行中才算），否则当前层节点；没有树＝第 1 层。
 * 注入与 align 返回块的层号同源：未变的轮次也能照它写，不会沿用上一轮的层号。
 */
function alignDepth(rec) {
  if (!rec) return 1
  const nodeId = rec.align && rec.align.nodeId
  const node = nodeId ? findNodeAny(rec, nodeId) : null
  if (node && node.status === 'active') return nodeDepth(rec, node)
  if (!rec.root) return 1
  const cur = currentLayerNode(rec.root, rec.currentId)
  return cur ? nodeDepth(rec, cur) : 1
}

/**
 * 宿主构建 prompt 时把 ASCII 双花括号当变量引用解析（变量名必须 ^[a-z][a-z0-9_]*$）；
 * 任务树/对齐栏文本里出现模板语法（中文名、等号、省略号）会让整轮 prompt 构建失败，
 * 表现为每轮「本次运行失败 malformed prompt variable reference」。
 * 输出给模型之前统一换成全角花括号：显示仍是花括号，但不会被宿主解析。
 */
function escapeDoubleBraces(text) {
  return String(text == null ? '' : text)
    .replace(/\{\{/g, '｛｛')
    .replace(/\}\}/g, '｝｝')
}

/**
 * 回帖用的对齐栏块（2026-11-03 改版）：本层目标一行；基本点／硬需求／软需求各是一列，
 * 标签只出现一次，续行缩到与第一条左缘对齐；一项都没有的写「无」。
 */
function renderAlignBlock(rec, target, align) {
  const aim = String(align.goal || '')
  const lines = []
  lines.push(`**本层目标**：${aim || '（待填）'}`)
  const pad = '　'.repeat(4)
  const list = (label, raw) => {
    const src = Array.isArray(raw) ? raw.join('｜') : String(raw || '')
    const items = src
      .split('｜')
      .map((x) => x.trim().replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, ''))
      .filter(Boolean)
    if (items.length === 0 || (items.length === 1 && items[0] === '无')) {
      lines.push(`**${label}**：无`)
      return
    }
    items.forEach((x, i) => {
      const mark = ALIGN_MARKS[i] || `${i + 1}`
      lines.push(i === 0 ? `**${label}**：${mark}${x}` : `${pad}${mark}${x}`)
    })
  }
  list('基本点', align.points)
  list('硬需求', align.hard)
  list('软需求', align.soft)
  return escapeDoubleBraces(lines.join('\n'))
}

/**
 * 回帖可直接照抄的整块（2026-11-06）：引用块前缀 + 行末反斜杠 + 关卡行。
 * 回帖不再手工拼「>」和「\」——手拼一次错一次，对齐栏格式漂移就出在这里。
 */
function replyAlignBlock(block, gate) {
  const lines = String(block).split('\n').filter((l) => l.trim() !== '')
  const quoted = lines.map((l) => `> ${l}\\`)
  quoted.push(`> **关卡**：${String(gate).trim()}\\`)
  return quoted.join('\n')
}

/* ───────────────── 长思考 40 秒先交一版对齐栏（2026-11-09） ───────────────── */

/**
 * 用户要求（2026-11-09）：任务思考到 40 秒时，由任务树在这条回复里先给出一版当前对齐栏，
 * 模型照常继续想。模型没有「想一半停下再继续」的能力，所以只有一条真路子：插件包住这次
 * 模型输出流（llm/stream），到点后往里插一个文本块——对话里立刻能看到，模型不受影响。
 * 副作用（用户已知并选了这个做法）：这一版会留在最终回复里，正文里模型还会再给最终版；
 * 自动回写因此改成只认正文最后一版（parseAlignBlockLast）。
 */
const LATE_BAR_INDEX = 900000
const LATE_BAR_ARM_TTL = 5 * 60 * 1000

/** 每个会话当前这一轮的挂载点：{ turn, at }；turn 开始时挂上，插过一版就置 fired。 */
const lateBarArms = new Map()

/** 思考提醒的起始秒数（设置页可改，默认 40 秒，夹在 5–600）。 */
function lateBarSeconds() {
  return readSettings().lateBarSeconds
}

/** 四样没齐时的复查间隔（默认 10 秒，夹在 5–120）。 */
function lateBarRetrySeconds() {
  return readSettings().lateBarRetrySeconds
}

/** 思考提醒总开关：关掉后这一轮不挂、不插。 */
function lateBarEnabled() {
  return readSettings().lateBarEnabled
}

/** 提醒内容：goal＝只报一句状态；full＝完整对齐栏。 */
function lateBarContent() {
  return readSettings().lateBarContent
}

/**
 * 这一层四样还缺哪几项：空着就是缺；四样齐了才发 40 秒质询。
 * 「无」是写明的「一项都没有」，算写齐（捕获回路会原样保留它）。
 */
function alignGaps(align) {
  const gaps = []
  if (!String((align && align.goal) || '').trim()) gaps.push('本层目标')
  const pts = align && Array.isArray(align.points) ? align.points.filter((p) => String(p || '').trim()) : []
  if (pts.length === 0) gaps.push('基本点')
  if (!String((align && align.hard) || '').trim()) gaps.push('硬需求')
  if (!String((align && align.soft) || '').trim()) gaps.push('软需求')
  return gaps
}

/**
 * 40 秒质询：四样（本层目标／基本点／硬需求／软需求）全齐了才发。
 * 缺任何一项都返回空串，由 lateBarStream 隔「复查间隔」再看一次——直到齐了，
 * 或模型的正文/工具调用先出来。这样从不摆「（待填）／无」这种半成品。
 */
function draftAlignText(sessionId, elapsedSec) {
  const rec = loadTree(sessionId)
  const align = rec ? alignOf(rec) : null
  if (alignGaps(align).length > 0) return ''
  const sec = Number.isFinite(elapsedSec) ? Math.round(elapsedSec) : lateBarSeconds()
  if (lateBarContent() === 'goal') {
    return '> ⏳ 思考超过 ' + sec + ' 秒 · 自动插入 · 这一版对齐栏四样已在（正文随后）。\n\n'
  }
  const block = renderAlignBlock(rec, null, align)
  // 与正式回复的对齐栏同款：引用块 + 行末反斜杠。
  // 纯文本单换行会被 Markdown 当软换行拼成一行（实测），必须靠引用块与硬换行保住分行。
  const quoted = block
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => `> ${l}\\`)
    .join('\n')
  // 两头标「自动插入」——这块不是正文，模型别照着再写一张，人也要一眼分出哪版是插的。
  return `> ⏳ 思考超过 ${sec} 秒 · 自动插入 · 先把这一版对齐栏交给你（正文随后）\\\n${quoted}\n> —— 自动插入结束，正文继续 ——\\\n\n`
}

/**
 * 一轮开始时挂上（同一轮只挂一次）。
 * 2026-11-11：挂载不再要求「此刻已有对齐栏」——那正是这个提示要覆盖的情形；非进化模式不挂
 * （标记在 agent/created 时写：'other' 才是判出来的非进化模式，''＝判不出，放行）。
 * 树在首轮 prompt 构建时才长出来（injectTextForSession），所以挂载时没有树不算错：
 * 到 llm/stream 那一刻树已经在了，draftAlignText 会现读。
 */
function armLateBar(sessionId, turn) {
  if (!sessionId || !Number.isSafeInteger(turn)) return
  if (!lateBarEnabled()) return
  const current = lateBarArms.get(sessionId)
  if (current && current.turn === turn && !current.done) return
  if (presetMarkerOf(sessionId) === 'other') return
  lateBarArms.set(sessionId, { turn, at: Date.now(), fired: false, done: false })
}

/**
 * 包住一条模型输出流：到检查点（起始秒数起，每隔「复查间隔」一次）现读树里的对齐栏——
 * 四样齐了才插一版；没齐就等下一个检查点，直到插过、或模型先吐出正文/工具调用。
 * 注入块用独立序号；模型自己的块序号不变。onInject 在真的插进去时回调一次（挂载点置 fired）。
 */
async function* lateBarStream(source, sessionId, dueIn, startedAt, onInject, retryMs) {
  const iter = source[Symbol.asyncIterator]()
  const baseAt = Number.isFinite(startedAt) ? startedAt : Date.now()
  const retry = Number.isFinite(retryMs) && retryMs > 0 ? retryMs : lateBarRetrySeconds() * 1000
  let nextAt = Date.now() + Math.max(0, dueIn)
  let stop = false
  let pending = null
  let timer = null
  let timerWait = new Promise(() => {})
  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  const halt = () => {
    stop = true
    clearTimer()
    timerWait = new Promise(() => {})
  }
  const schedule = () => {
    if (stop) return
    clearTimer()
    timerWait = new Promise((resolve) => {
      timer = setTimeout(resolve, Math.max(0, nextAt - Date.now()))
      if (timer && typeof timer.unref === 'function') timer.unref()
    })
  }
  const emitDraft = function* (text) {
    if (typeof onInject === 'function') onInject()
    yield { type: 'block-start', index: LATE_BAR_INDEX, blockType: 'text' }
    yield { type: 'text-delta', index: LATE_BAR_INDEX, text }
    yield { type: 'block-end', index: LATE_BAR_INDEX, block: { type: 'text', text } }
  }
  try {
    // 已经过了 40 秒（例如后面的步骤才接上）：先当场看一次，有草稿就插。
    if (dueIn <= 0) {
      const first = draftAlignText(sessionId, (Date.now() - baseAt) / 1000)
      if (first) {
        halt()
        yield* emitDraft(first)
      } else {
        nextAt = Date.now() + retry
      }
    }
    schedule()
    for (;;) {
      if (!pending) pending = iter.next()
      const raced = await Promise.race([
        pending.then((v) => ({ v })),
        timerWait.then(() => ({ timeout: true })),
      ])
      if (raced.timeout) {
        if (stop) continue
        // 有草稿才插；没有就往后挪一个检查点。
        const text = draftAlignText(sessionId, (Date.now() - baseAt) / 1000)
        if (text) {
          halt()
          yield* emitDraft(text)
        } else {
          nextAt += retry
          schedule()
        }
        continue
      }
      const { value, done } = raced.v
      pending = null
      if (done) return
      // 模型开始吐正文：不再插。出过工具调用也不能插——注入块落在 tool_use 后面
      // 会把整条请求判成 INVALID_REQUEST（服务端要求 tool_use 紧跟 tool_result）。
      if (value && value.type === 'text-delta' && typeof value.text === 'string' && value.text.trim() !== '') halt()
      if (value && value.type === 'block-start' && value.blockType === 'tool-call') halt()
      yield value
    }
  } finally {
    clearTimer()
  }
}

/** 挂上一个会话的「思考提醒」；返回摘除函数（宿主事件注册用）。 */
function installLateBar(ctx) {
  try {
    ctx.on('llm/stream', (options, next) => {
      const purpose = options && options.purpose
      const sid = options && options.sessionId ? String(options.sessionId) : ''
      if (!sid || purpose) return next()
      if (!lateBarEnabled()) return next()
      const arm = lateBarArms.get(sid)
      if (!arm || arm.fired || arm.done) return next()
      if (Date.now() - arm.at > LATE_BAR_ARM_TTL) {
        lateBarArms.delete(sid)
        return next()
      }
      // 不在这里取内容：到点后由 lateBarStream 现读树里的草稿；没草稿就等下一个检查点。
      const dueIn = arm.at + lateBarSeconds() * 1000 - Date.now()
      return lateBarStream(next(), sid, dueIn, arm.at, () => { arm.fired = true })
    })
  } catch {
    /* 挂不上：功能不生效，不影响树的其余部分 */
  }
  // 一轮只挂一次：pre-step 每个 step 都会触发，按步挂会让同一轮注入多次。
  // 改成轮边界：turn/start 挂、turn/end 清。
  try {
    ctx.on('session/event', (session, event) => {
      const sid = session && session.id ? String(session.id) : ''
      if (!sid || !event || typeof event.type !== 'string') return
      if (event.type === 'turn/start') {
        const turn = event.data && event.data.turn
        armLateBar(sid, turn)
      } else if (event.type === 'turn/end') {
        lateBarArms.delete(sid)
      }
    })
  } catch {
    /* 没有会话事件：退回每步检查（llm/stream 里仍会判 fired） */
  }
}

/* ───────────────────────── 渲染 ───────────────────────── */

/** 衍生节点的来路：解析 from 指向的节点标题（源被删就报原 id）。 */
function fromLabel(rec, node) {
  if (!node || !node.from) return ''
  const src = findNodeAny(rec, node.from)
  if (src) return `衍生自「${src.title || src.goal || src.id}」`
  return `衍生自 ${node.from}（源已不在）`
}

function nodeHead(rec, node, depth, indexInParent, runningId = '') {
  const indent = '  '.repeat(Math.max(0, depth - 1))
  const bullet = indexInParent > 0 ? `${mark(indexInParent)} ` : ''
  const rootMark = depth === 1 ? '·根' : ''
  const status = displayStatus(node, runningId)
  const serve = depth === 1
    ? ''
    : (node.from ? ` → ${fromLabel(rec, node)}` : ` → 替父：${String(node.serves || '').trim() || '（未写）'}`)
  const goal = node.goal ? `｜目标：${node.goal}` : ''
  const from = depth === 1 && node.from ? `（${fromLabel(rec, node)}）` : ''
  return `${indent}${bullet}[${node.id}${rootMark}] ${node.title}${from}（${status}）${serve}${goal}`
}

/** 现在做到哪：进行中且没有进行中子节点的路径（根 → …）。 */
function activePaths(root) {
  const out = []
  const walk = (node, path) => {
    const p = [...path, node]
    const actKids = (node.children || []).filter((c) => c.status === 'active')
    if (node.status === 'active' && actKids.length === 0) out.push(p)
    else for (const c of actKids) walk(c, p)
  }
  walk(root, [])
  return out
}

/** 全量文本（工具 read / 命令用）：只答三问——现在做到哪、替谁做、旁边还有哪几件。 */
function renderTree(rec) {
  const lines = []
  const align = alignOf(rec)
  if (align) {
    const alignNode = rec.align && rec.align.nodeId ? findNodeAny(rec, rec.align.nodeId) : null
    const alignParent = alignNode && !alignNode.from ? findParentOf(rec, alignNode.id) : null
    lines.push(`对齐栏｜${alignLine(align, alignParent ? alignParent.goal : '')}`)
  }
  // 目标修正留痕：工具 read 与注入同一口径，看得到原来偏成什么样。
  const hist = Array.isArray(rec.rootHistory) ? rec.rootHistory.slice(-1) : []
  if (hist.length > 0 && hist[0].goal) lines.push(`目标修正前：${hist[0].goal}${hist[0].why ? `（偏在：${hist[0].why}）` : ''}`)
  const roots = rootsOf(rec)
  if (roots.length === 0) {
    lines.push('本会话还没有任务树（对齐栏已同步到侧栏；要把方向摆开时 action=new title=<根任务>）')
    return escapeDoubleBraces(lines.join('\n'))
  }
  if (roots.length === 1) lines.push(`任务树「${roots[0].title}」`)
  else lines.push(`任务树 ${roots.length} 棵（并列，互不隶属，谁也不顶掉谁）`)
  const pathText = roots.map((r) => {
    const paths = activePaths(r)
    const body = paths.length > 0
      ? paths.map((p) => p.map((n) => (n.from ? `${n.title}（衍生）` : n.title)).join(' → ')).join('｜')
      : '没有进行中的节点（全部已定／已否）'
    return roots.length > 1 ? `${r.title}：${body}` : body
  }).join('｜')
  lines.push('现在做到哪：' + pathText)
  const runningId = runningIdOf(rec)
  const walk = (node, depth, indexInParent) => {
    if (!node) return
    lines.push(nodeHead(rec, node, depth, indexInParent, runningId))
    ;(node.children || []).forEach((c, i) => walk(c, depth + 1, i + 1))
  }
  roots.forEach((root, i) => {
    if (roots.length > 1) lines.push(`【第 ${i + 1} 棵】`)
    walk(root, 1, 0)
  })
  const dropped = rec.dropped || []
  if (dropped.length > 0) lines.push('已否（不再提）：' + dropped.map((d) => d.title).join('｜'))
  return escapeDoubleBraces(lines.join('\n'))
}

/** 节点四样缺项（2026-11-05）：基本点／硬需求／软需求哪一个空着，注入里就标出来，漏了看得见。 */
function missingLabels(node) {
  if (!node || node.auto) return ''
  const miss = []
  const pts = Array.isArray(node.points) ? node.points.filter((p) => String(p || '').trim()) : []
  if (pts.length === 0) miss.push('基本点')
  if (!String(node.hard || '').trim()) miss.push('硬需求')
  if (!String(node.soft || '').trim()) miss.push('软需求')
  return miss.length ? `（缺${miss.join('／')}）` : ''
}

/** 系统提示注入用的紧凑文本。 */
function renderInject(rec, alignMode = true) {
  const lines = []
  if (rec.userNotice && rec.root) {
    const cur = currentLayerNode(rec.root, rec.currentId)
    const now = cur ? (cur.title || cur.goal) : rec.userNotice.title
    lines.push(`[任务有变动（用户刚在侧栏改的）] 当前进行的是「${now}」；以这一版为准，按它重推下一步，别沿旧任务往下做。`)
  }
  // 2026-11-03：开头硬提示——动手前先回顾上一轮的进度、基本点与需求（思维正文的「先看树」配套）。
  if (alignMode) {
    lines.push('[先回顾] 动手前先看下面这段：上一轮做到哪、基本点与软硬需求是什么、当前在第几层哪一支——据此再动手；不是重新设计，是先认清现在的位置。')
  }
  const align = alignOf(rec)
  if (align && alignMode) {
    // 整块给（2026-10-19）：注入直接给目标行与三需求，序号与缩进同回帖块（2026-10-20 去掉层号）。
    const block = renderAlignBlock(rec, null, align).split('\n')
    if (align.source === 'user') {
      lines.push('[对齐栏（用户刚在侧栏直接改过，以这一版为准）｜回帖第一块照抄下面这段，别重排]')
      lines.push(...block)
      lines.push('（下一轮动作：先复述你理解成什么，再按这一版重推对齐栏与树——本层目标变了，基本点／硬需求／软需求／当前层节点跟着重推；要覆盖用 action=align force=true 写回，并说清改了哪几句）')
    } else {
      lines.push('[对齐栏（侧栏卡片显示同一套）｜下面这版是树里现在的几行]')
      lines.push(...block)
      lines.push('（回帖开头照样出齐；本层目标写这一层，方向没变就按这版写、序号缩进不变；方向变了当轮重写，并用 action=align（goal 写本层目标）同步。落笔前先判一句：这一轮的活还是原来那个节点的活吗？不是——先 action=add 立一支（替父写清它拿下哪条验收），再按那一支写）')
    }
  }
  const roots = rootsOf(rec)
  if (roots.length === 0) {
    // 非对齐模式：本会话没有树就什么都不注入（不留「去立树」的引导）。
    if (!alignMode) return ''
    lines.push('[任务树] 本会话还没有树：要把方向摆开时 task-tree action=new title=<根任务>。')
    return lines.join('\n')
  }
  // 目标修正留痕（2026-11-01 改口径）：同一条任务里目标写偏了、纠回来——不是换个任务。
  const hist = Array.isArray(rec.rootHistory) ? rec.rootHistory.slice(-1) : []
  if (hist.length > 0 && hist[0].goal) {
    lines.push(`[目标已修正] 原目标「${hist[0].goal}」${hist[0].why ? `（偏在：${hist[0].why}）` : ''}——同一条任务的纠偏，不是换任务；各支照旧，serves 提法跟不上的改措辞，不拆支。`)
  }
  lines.push('[任务树（本会话）]')
  const autoRoot = roots.find((r) => r.auto === true)
  if (!alignMode) {
    // 非对齐模式：只剩自动占位根（没填目标、没挂子节点）时视为没树，什么都不注入。
    const meaningful = roots.some((r) => r.auto !== true || (r.children || []).length > 0)
    if (!meaningful) return ''
  }
  if (autoRoot) {
    lines.push(alignMode
      ? `  ⚠ 根还是占位「${autoRoot.title}」：还没写目标就先 action=align（或 action=new）把这一轮的目标写进树，再调别的工具——40 秒草稿只读树，树空着就没有可显示的内容。`
      : `  ⚠ 根还是占位「${autoRoot.title}」：要立树就 action=align 写目标，或 action=new 换成本次任务。`)
  }
  let count = 0
  const runningId = runningIdOf(rec)
  const walk = (node, depth, indexInParent) => {
    if (!node || count >= INJECT_NODE_CAP) return
    count++
    const bullet = indexInParent > 0 ? `${mark(indexInParent)} ` : ''
    const serve = depth === 1
      ? ''
      : (node.from ? ` → ${fromLabel(rec, node)}` : ` → 替父：${String(node.serves || '').trim() || '（未写）'}`)
    const from = depth === 1 && node.from ? `（${fromLabel(rec, node)}）` : ''
    const miss = missingLabels(node)
    lines.push('  '.repeat(Math.max(0, depth - 1)) + `${bullet}[${node.id}] ${node.title}${from}（${displayStatus(node, runningId)}）${serve}${miss}`)
    ;(node.children || []).forEach((c, i) => walk(c, depth + 1, i + 1))
  }
  roots.forEach((root, i) => {
    if (count >= INJECT_NODE_CAP) return
    if (roots.length > 1) lines.push(`  ── 第 ${i + 1} 棵${rec.root && root.id === rec.root.id ? '·当前' : ''} ──`)
    walk(root, 1, 0)
  })
  const dropped = rec.dropped || []
  if (dropped.length > 0) lines.push('已否（不再提）：' + dropped.slice(-8).map((d) => d.title).join('｜'))
  lines.push('（①②③＝同一个父下的平级几件事，合起来把上一级做成。挂新活之前先走三问：①它是当前这层要完成的目标之一吗？不是就往上一层问，一层层问到根，哪层认它是目标就挂哪层；②两层都认就挂低的那层；③一路都不是、只是这件事带出来的问题——不挂成子：源不是根就 add from=<源id> 挂成它的平级（图上横线连过去），源是根就 new unrelated=true from=<根id> 另立一棵。说不清挂哪就问用户）')
  return lines.join('\n')
}

/** 本会话没树时的注入引导（一行，轻；树按需立，不强制）。 */
function noTreeHint() {
  return '[任务树] 树按需立：本会话的活能单独验收时，task-tree action=new title=<根任务>。'
}

/** 本会话当前跑的是哪个 preset（供 profile-reminder hook 判断要不要发「对齐栏」提醒）。
 *  运行态标记，写在树目录旁的 <会话id>.preset；切过模式的会话以它为准（会话档头只是创建时的快照）。
 *  `known=false`（投影读不到、判不出模式）时一个字节都不写：写 'other' 会把「判不出」冒充成
 *  「不是进化模式」，hook 读到就整会话静默，且会盖掉档头这个唯一兜底。 */
function markPresetMode(sessionId, alignMode, known = true) {
  if (!known) return
  try {
    const file = join(SESSIONS_DIR, `${sessionId}.preset`)
    const want = alignMode ? ALIGN_PRESET : 'other'
    let old = ''
    try { old = readFileSync(file, 'utf8') } catch { /* 还没有标记 */ }
    if (old === want) return
    mkdirSync(SESSIONS_DIR, { recursive: true })
    writeFileSync(file, want, 'utf8')
  } catch {
    /* 标记写不进：hook 那边退回看会话档头，不影响注入 */
  }
}

/** 读本会话的模式标记：'evolve'／'other'／''（还没写过，判不出）。 */
function presetMarkerOf(sessionId) {
  if (!sessionId) return ''
  try {
    return readFileSync(join(SESSIONS_DIR, `${sessionId}.preset`), 'utf8').trim()
  } catch {
    return ''
  }
}

/** 侧栏路由的写闸：判出不是进化模式时，树与对齐栏都不许再写。
 *  2026-11-03：插件已挪进 preset 层，标准等模式的会话不再由本插件写 .preset 标记
 *  （原来靠宿主层每步自检写 'other'）；判据以会话档里的 agent-preset/selected 为准，标记只兜底。 */
function refuseWhenNotAlignMode(sessionId) {
  const mode = presetFromArchive(sessionId) || presetMarkerOf(sessionId)
  if (mode !== '' && mode !== ALIGN_PRESET) return '本会话不是进化模式：任务树与对齐栏只在这个模式里用'
  return ''
}

/* ───────────────── 对齐栏自动落盘（从上一轮回复抄回树/侧栏，2026-10-19） ───────────────── */

const HOME_SESSIONS_DIR = join(DSH_HOME, 'sessions')
const CAPTURE_SUFFIX = '.capture'
const ZSTD_MAGIC = 0xfd2fb528

/** 找本会话的存档文件（同目录多代次取最高）。找不到返回 null。 */
function findSessionLog(sessionId) {
  try {
    for (const ent of readdirSync(HOME_SESSIONS_DIR, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue
      const dir = join(HOME_SESSIONS_DIR, ent.name, sessionId)
      if (!existsSync(dir)) continue
      let best = null
      let bestGen = -1
      for (const f of readdirSync(dir)) {
        const m = /^session(?:\.v(\d+))?\.jsonl\.zstd$/.exec(f)
        if (!m) continue
        const gen = m[1] ? Number(m[1]) : 0
        if (gen > bestGen) {
          bestGen = gen
          best = join(dir, f)
        }
      }
      if (best) return best
    }
  } catch {
    /* 目录读不到就按没有存档处理 */
  }
  return null
}

/** 扫一段 buffer 里的完整 zstd 帧：返回帧范围与尾部残帧起点（残帧下次再读）。 */
function scanFrames(buf) {
  const frames = []
  let o = 0
  while (o < buf.length) {
    const start = o
    if (buf.length - o < 4) return { frames, tornStart: start }
    if (buf.readUInt32LE(o) !== ZSTD_MAGIC) return { frames, tornStart: start }
    o += 4
    if (o === buf.length) return { frames, tornStart: start }
    const fhd = buf[o]
    o += 1
    if (fhd & 0x08) return { frames, tornStart: start }
    const fcsFlag = fhd >> 6
    const singleSegment = (fhd >> 5) & 1
    const checksum = (fhd >> 2) & 1
    const dictFlag = fhd & 3
    if (!singleSegment) o += 1
    o += [0, 1, 2, 4][dictFlag]
    o += [singleSegment ? 1 : 0, 2, 4, 8][fcsFlag]
    for (;;) {
      if (buf.length - o < 3) return { frames, tornStart: start }
      const bh = buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16)
      o += 3
      const last = bh & 1
      const btype = (bh >> 1) & 3
      const size = bh >> 3
      const payload = btype === 1 ? 1 : size
      if (buf.length - o < payload) return { frames, tornStart: start }
      o += payload
      if (last) break
    }
    if (checksum) {
      if (buf.length - o < 4) return { frames, tornStart: start }
      o += 4
    }
    frames.push([start, o])
  }
  return { frames }
}

/**
 * 分支会话的父会话 id（2026-11-08）：DSH 的会话分支＝把父会话档整份复制到新 id 下继续写，
 * 档里事件帧的 data.sessionId 还带着父会话 id。任务树按会话存，不认这一步分支就拿不到父树。
 * 只认「有任务树文件」的 id，且只看帧里的结构字段（正文里引用的会话 id 不算）。
 */
function sourceSessionIdOf(sessionId) {
  if (!sessionId) return ''
  try {
    const file = findSessionLog(sessionId)
    if (!file) return ''
    const buf = readFileSync(file)
    const { frames } = scanFrames(buf)
    const tried = new Set()
    for (let i = 0; i < frames.length && i < 12; i++) {
      const [s, e] = frames[i]
      let text = ''
      try {
        text = zstdDecompressSync(buf.subarray(s, e)).toString('utf8')
      } catch {
        continue
      }
      for (const line of text.split('\n')) {
        if (!line.trim()) continue
        let j = null
        try {
          j = JSON.parse(line)
        } catch {
          continue
        }
        const sid = j && j.data && typeof j.data.sessionId === 'string' ? j.data.sessionId : ''
        if (!sid || sid === sessionId || tried.has(sid)) continue
        tried.add(sid)
        if (existsSync(sessionFile(sid))) return sid
      }
    }
  } catch {
    /* 读不了就当不是分支 */
  }
  return ''
}

/** 会话档里 DSH 自己写的最新模式选择（最后一个 agent-preset/selected）与档头。
 *  2026-11-04：投影（Session projection）在切模式/新建会话的首轮会滞后一步——实测标准模式
 *  会话首轮 pre-step 里投影还是创建时默认值 evolve，工具表里因此带着本插件与
 *  dsh-term-dict，到 step 2 才摘。档里的 selected 帧是 DSH 在切换/发布 Agent 前追加的，最准。
 *  增量缓存：帧边界照扫（便宜），只解压上次之后的新帧，长会话每步读档也不会更贵。 */
const presetArchiveCache = new Map() // sessionId → { file, frameCount, last, header }

function presetDetailFromArchive(sessionId) {
  const empty = { last: '', header: '' }
  if (!sessionId) return empty
  try {
    const file = findSessionLog(sessionId)
    if (!file) return empty
    const buf = readFileSync(file)
    const { frames } = scanFrames(buf)
    const cached = presetArchiveCache.get(sessionId)
    const same = cached && cached.file === file && cached.frameCount <= frames.length
    let last = same ? cached.last : ''
    let header = same ? cached.header : ''
    for (let i = same ? cached.frameCount : 0; i < frames.length; i++) {
      const [s, e] = frames[i]
      let text = ''
      try {
        text = zstdDecompressSync(buf.subarray(s, e)).toString('utf8')
      } catch {
        continue
      }
      for (const line of text.split('\n')) {
        if (!line.trim()) continue
        let j = null
        try {
          j = JSON.parse(line)
        } catch {
          continue
        }
        if (j.type === 'session' && typeof j.agentPreset === 'string') header = j.agentPreset
        else if (j.type === 'agent-preset/selected' && typeof j.data?.agentPreset === 'string') last = j.data.agentPreset
      }
    }
    presetArchiveCache.set(sessionId, { file, frameCount: frames.length, last, header })
    return { last, header }
  } catch {
    return empty
  }
}

/** 从会话档读最新 preset：档内最后一个 agent-preset/selected（切模式/恢复时 DSH 自己追加），
 *  其次档头 session 帧的 agentPreset。读不出返回 ''。 */
function presetFromArchive(sessionId) {
  const detail = presetDetailFromArchive(sessionId)
  return detail.last || detail.header
}

/** 本会话当前模式：档里最后 selected（DSH 写、最准）→ Session 投影（可能滞后一步）→ 档头
 *  （创建默认值）→ task-tree 标记。判不出返回 undefined。 */
function resolvePreset(sessionId, source, projections) {
  const detail = presetDetailFromArchive(sessionId)
  if (detail.last) return detail.last
  const projected = presetFromAny(source, projections)
  if (projected !== undefined) return projected
  if (detail.header) return detail.header
  const marker = presetMarkerOf(sessionId)
  return marker !== '' ? marker : undefined
}

/** 从一段回复正文里抽对齐栏那几行（目标优先读「本层目标」）。抽不到返回 null。 */
function parseAlignBlock(text) {
  // 行名加粗（2026-11-01）：新格式是 `> **本层目标**：…`，旧格式是 `> 本层目标：…`。
  // 解析前只把「行首标签的 ** 」剥掉，正文里的加粗原样保留；两种格式都吃。
  const stripLabelBold = (line) => String(line).replace(
    /^(\s*>?\s*)\*\*\s*([^*]{1,16}?)\s*\*\*(\s*[：:])/,
    '$1$2$3',
  )
  const lines = String(text).replace(/\r/g, '').split('\n').map(stripLabelBold)
  const clean = (s) => String(s).replace(/^[>\s]+/, '').replace(/\\+\s*$/, '').replace(/\s{2,}$/, '').trim()
  const grab = (re) => {
    for (const l of lines) {
      const m = re.exec(l)
      if (m) return clean(m[1])
    }
    return ''
  }
  // 有新写法的「本层目标」就用它（那是当前节点的目标）；只有根上才退回「根本目标」。
  let goal = grab(/^\s*>?\s*本层目标[：:]\s*(.+)$/) || grab(/^\s*>?\s*根本目标[：:]\s*(.+)$/)
  // 捕获回路去序号：回复里的硬需求/软需求带 ①② 前缀，原样存回会被渲染再加一次（侧栏出现 ①①）；
  // 「无」表示一项都没有，存空串，渲染才会写成「无」而不是「①无」。
  const stripMark = (s) => String(s).replace(/^[①-⑳]\s*/, '').trim()
  // 硬需求／软需求在回帖里是「一行一条」：首行带标签、续行以 ②③… 开头。
  // 2026-11-08 修：原来只抓标签那一行，续行全丢——捕获回路每轮回写会把硬/软需求截成只剩第一条，
  // 卡片与对齐栏跟着只剩一条。这里按「块」收，直到下一个标签（基本点/关卡/目标）为止。
  const hardItems = []
  const softItems = []
  let want = ''
  for (const l of lines) {
    if (/^\s*>?\s*(根本目标|本层目标|基本点|关卡)[：:]/.test(l)) { want = ''; continue }
    const hm = /^\s*>?\s*硬需求[：:]\s*(.+)$/.exec(l)
    if (hm) { want = 'hard'; hardItems.push(...pointsFromArg(clean(hm[1]))); continue }
    const sm = /^\s*>?\s*软需求[：:]\s*(.+)$/.exec(l)
    if (sm) { want = 'soft'; softItems.push(...pointsFromArg(clean(sm[1]))); continue }
    if (!want) continue
    const t = clean(l)
    if (!t || !/^[①-⑳]/.test(t)) continue
    const item = stripMark(t)
    if (!item) continue
    if (want === 'hard') hardItems.push(item)
    else softItems.push(item)
  }
  const joinItems = (list) => list.map(stripMark).filter((s) => s !== '' && s !== '无').join('｜')
  let hard = joinItems(hardItems)
  let soft = joinItems(softItems)
  const points = []
  let inPoints = false
  for (const raw of lines) {
    const l = raw.replace(/\r/g, '')
    if (/^\s*>?\s*(根本目标|本层目标)[：:]/.test(l)) {
      inPoints = false
      continue
    }
    const head = /^\s*>?\s*基本点[：:]\s*(.+)$/.exec(l)
    if (head) {
      inPoints = true
      points.push(...pointsFromArg(clean(head[1])))
      continue
    }
    if (/^\s*>?\s*(硬需求|软需求)[：:]/.test(l)) {
      inPoints = false
      continue
    }
    if (!inPoints) continue
    const t = clean(l)
    if (!t) continue
    if (/^[①-⑳]/.test(t)) points.push(t.replace(/^[①-⑳]\s*/, ''))
    else if (/^\d+[.、]/.test(t)) points.push(t.replace(/^\d+[.、]\s*/, ''))
  }
  goal = goal.replace(/^（第[一二三四五六七八九十\d]+层）\s*/, '').replace(/^\(第[一二三四五六七八九十\d]+层\)\s*/, '').trim()
  // 验收跟本层目标同一行：拆进独立字段。留在 goal 里的话，渲染时还会再追加一次，变成两遍。
  let accept = ''
  const acc = /(?:^|[；;。])\s*验收\s*[＝=]\s*(.+)$/.exec(goal)
  if (acc) {
    const part = acc[1].trim().replace(/[。；;]\s*$/, '').trim()
    const rest = goal.slice(0, acc.index).trim()
    if (part && rest.length >= 4) {
      accept = part
      goal = rest
    }
  }
  if (!goal || goal.length < 4 || goal.length > 400) return null
  const pts = points
    .map((p) => String(p).trim().replace(/^[①-⑳]\s*/, '').replace(/^\d+[.、]\s*/, '').trim())
    .filter((p) => p !== '' && p.length <= 200)
    .slice(0, 6)
  if (pts.length === 0 && !hard && !soft) return null
  return { goal, accept, points: pts, hard, soft }
}

/**
 * 只认回复里**最后一版**对齐栏（2026-11-09）：长思考 40 秒时插件会先插一版草稿，
 * 正文里模型还会再写最终版——按第一版解析会把树回退成草稿那版。抓最后一个「本层目标」起头。
 */
function parseAlignBlockLast(text) {
  const raw = String(text || '')
  const re = /^\s*>?\s*(?:\*\*\s*)?本层目标\s*(?:\*\*)?\s*[：:]/gm
  let last = -1
  for (const m of raw.matchAll(re)) last = m.index
  if (last < 0) return parseAlignBlock(raw)
  return parseAlignBlock(raw.slice(last))
}

/**
 * 把上一轮回复里的对齐栏落盘（会话级快照＋当前层节点）。
 * 每轮注入前跑一次，只读会话档新增的帧（偏移存 <会话id>.capture 侧车），
 * 用户刚在侧栏改过（align.source === 'user'）就一个字节都不写。
 * 返回 {ok, error}：error 非空＝写盘被拒（如根保护），这行要出现在注入里——
 * 原来失败被静默吞掉，树没更新但下一轮照旧注入旧版，看起来像已经生效。
 */
function captureAlignFromReply(sessionId, cwd) {
  const miss = { ok: false, error: '' }
  if (!sessionId || typeof zstdDecompressSync !== 'function') return miss
  const side = join(SESSIONS_DIR, `${sessionId}${CAPTURE_SUFFIX}`)
  const prev = readJson(side, null)
  const file = prev && prev.file && existsSync(prev.file) ? prev.file : findSessionLog(sessionId)
  if (!file) return miss
  let size = 0
  try {
    size = statSync(file).size
  } catch {
    return miss
  }
  const sameFile = !!(prev && prev.file === file)
  let offset = sameFile && Number.isInteger(prev.offset) && prev.offset >= 0 && prev.offset <= size ? prev.offset : 0
  let tail = sameFile && typeof prev.tail === 'string' ? prev.tail : ''
  if (offset >= size) return miss
  let buf = null
  try {
    const fd = openSync(file, 'r')
    try {
      buf = Buffer.alloc(size - offset)
      readSync(fd, buf, 0, buf.length, offset)
    } finally {
      closeSync(fd)
    }
  } catch {
    return miss
  }
  if (!buf || buf.length === 0) return miss
  const { frames, tornStart } = scanFrames(buf)
  let text = ''
  for (const [s, e] of frames) {
    try {
      text += zstdDecompressSync(buf.subarray(s, e)).toString('utf8')
    } catch {
      /* 坏帧跳过，不影响其余 */
    }
  }
  const nextOffset = offset + (frames.length > 0 ? frames[frames.length - 1][1] : (tornStart ?? 0))
  const merged = tail + text
  const lines = merged.split('\n')
  tail = lines.pop() ?? ''
  let reply = ''
  for (const line of lines) {
    if (!line.includes('"type":"assistant/message"')) continue
    let o = null
    try {
      o = JSON.parse(line)
    } catch {
      continue
    }
    const c = o && o.data && o.data.message && o.data.message.content
    if (!Array.isArray(c)) continue
    const t = c.filter((b) => b && b.type === 'text').map((b) => b.text || '').join('\n')
    if (t.trim()) reply = t
  }
  try {
    writeJson(side, { file, offset: nextOffset, tail })
  } catch {
    /* 侧车写不进就下次重扫，不影响落盘结果 */
  }
  if (!reply) return miss
  const parsed = parseAlignBlockLast(reply)
  if (!parsed) return miss
  const rec = loadTree(sessionId)
  if (rec && rec.align && rec.align.source === 'user') return miss
  const prevAlign = rec && rec.align ? normalizeAlign(rec.align) : null
  if (prevAlign
    && prevAlign.goal === parsed.goal
    && prevAlign.accept === parsed.accept
    && prevAlign.hard === parsed.hard
    && prevAlign.soft === parsed.soft
    && prevAlign.points.length === parsed.points.length
    && prevAlign.points.every((p, i) => p === parsed.points[i])) {
    return miss
  }
  try {
    applyAlign(sessionId, parsed, 'agent', cwd)
    return { ok: true, error: '' }
  } catch (error) {
    return { ok: false, error: String((error && error.message) || error) }
  }
}

function injectTextForSession(sessionId, cwd, alignMode = false, presetKnown = true) {
  if (!sessionId) return ''
  markPresetMode(sessionId, alignMode, presetKnown)
  // 任务树与对齐栏只属于进化模式：别的模式一个字都不注入（2026-10-20）。
  // 原来非对齐模式仍会把「已经存在的树」注入进去——那等于把本模式的东西漏给官方模式会话。
  if (!alignMode) return ''
  try {
    let rec = autoCreateRoot(sessionId, cwd)
    if (!rec) return noTreeHint()
    // 本模式的活：先把上一轮回复里的对齐栏抄回树/侧栏，再据此注入（抽不到就按原样注入）。
    // 写盘被拒（根保护等）不再静默吞掉：注入顶部报一行，免得树没更新却被当成已更新。
    let captureError = ''
    try {
      const cap = captureAlignFromReply(sessionId, cwd)
      if (cap && cap.ok) rec = loadTree(sessionId) || rec
      else if (cap && cap.error) captureError = cap.error
    } catch {
      /* 落盘失败不影响注入 */
    }
    const text = escapeDoubleBraces(renderInject(rec, alignMode))
    // 「任务有变动」只提醒一次：注入后清掉，免得每轮都重复
    if (rec.userNotice) {
      rec.userNotice = null
      saveTree(rec)
    }
    return captureError
      ? `[上一轮对齐栏没落盘：${captureError}] 树里还是旧的，别当它已经更新。\n${text}`
      : text
  } catch {
    return ''
  }
}

/* ───────────────────────── 体检 ───────────────────────── */

function checkTree(rec) {
  const issues = []
  const roots = rootsOf(rec)
  if (roots.length === 0) return issues
  const seen = new Set()
  roots.forEach((root) => {
    const walk = (node, depth, indexInParent) => {
      if (!node) return
      if (seen.has(node.id)) issues.push(`id 撞车：[${node.id}] ${node.title}（节点 id 在几棵树之间必须唯一）`)
      seen.add(node.id)
      if (node.id !== root.id && !String(node.serves || '').trim() && !node.from) {
        issues.push(`断链：${mark(indexInParent)}[${node.id}] ${node.title} 没写"替父拿下哪条"`)
      }
      if (node.from && !findNodeAny(rec, node.from)) {
        const tag = indexInParent > 0 ? `${mark(indexInParent)} ` : ''
        issues.push(`来路断了：${tag}[${node.id}] ${node.title} 的源 [${node.from}] 已经不在（被 drop 或移走了）——重挂一次，或改成普通子任务`)
      }
      if (node.status === 'done' && (node.children || []).some((c) => c.status === 'active' && !c.from)) {
        issues.push(`状态倒挂：[${node.id}] ${node.title} 已定，但子节点还在做`)
      }
      // 父目标（2026-11-01）：有子支却没有目标 → 子节点认领不到东西，三问的第一问没有对象。
      // 衍生节点不认领父目标，不算在里面。
      const claimKids = (node.children || []).filter((c) => !c.from)
      if (claimKids.length > 0 && !String(node.goal || '').trim()) {
        const tag = indexInParent > 0 ? `${mark(indexInParent)} ` : ''
        issues.push(`无目标：${tag}[${node.id}] ${node.title} 下挂了 ${claimKids.length} 支，但它自己没有目标——子节点认领不到东西，先补父的目标`)
      }
      // 同父重复（2026-11-01）：目标或标题一字不差，基本是复制串了或同一件事挂了两遍。
      const seenGoal = []
      const seenTitle = []
      ;(node.children || []).forEach((c, i) => {
        const g = String(c.goal || '').trim()
        const t = String(c.title || '').trim()
        if (g) {
          const hit = seenGoal.find((x) => x.goal === g)
          if (hit) issues.push(`重复：${mark(i + 1)}[${c.id}] ${t} 的目标与 ${mark(hit.i + 1)}[${hit.id}] 一字不差（挂重了或复制串了）`)
          else seenGoal.push({ goal: g, i, id: c.id })
        }
        if (t) {
          const hit = seenTitle.find((x) => x.title === t)
          if (hit) issues.push(`重复：${mark(i + 1)}[${c.id}] 与 ${mark(hit.i + 1)}[${hit.id}] 标题一字不差`)
          else seenTitle.push({ title: t, i, id: c.id })
        }
      })
      ;(node.children || []).forEach((c, i) => walk(c, depth + 1, i + 1))
      // 缺中间层（2026-11-07）：根下直接挂一堆步骤、而这些步骤又都没有下一级——
      // 大概率是「把可单独验收的步骤直接挂到根上」，跳过了子任务那一层。
      const directKids = (node.children || []).filter((c) => !c.from)
      if (node.id === root.id && directKids.length >= 4
        && directKids.every((c) => (c.children || []).length === 0)) {
        issues.push(`层级嫌疑：根 [${node.id}] 下直接挂了 ${directKids.length} 个步骤，且都没有下一级——这些步骤多半属于某几件子任务：先把它们按「替根拿哪一段验收」归成几块，步骤挂到块下面`)
      }
      // 子步骤全部已定、父还在做：多半是忘了把父标已定（状态倒挂的反向）。
      if (node.status !== 'done' && (node.children || []).length > 0
        && (node.children || []).every((c) => c.status === 'done')) {
        const tag = indexInParent > 0 ? `${mark(indexInParent)} ` : ''
        issues.push(`待收口：${tag}[${node.id}] ${node.title} 的子步骤全部已定，它自己还是「${node.status}」——该标已定，或补一条没做完的子步骤`)
      }
    }
    walk(root, 1, 0)
  })
  const unplaced = rec.unplaced || []
  if (unplaced.length > 0) issues.push(`未归位 ${unplaced.length} 条：${unplaced.map((u) => u.title).join('、')}`)
  return issues
}

function unplacedLine(rec) {
  const list = rec.unplaced || []
  if (list.length === 0) return ''
  const head = `未归位：${list.map((u) => u.title).join('、')}（不进任何树`
  if (list.length >= UNPLACED_LIMIT) return `${head}——先归位再开新活）`
  return `${head}；可挂到某个父节点，或跟我说单开）`
}

/* ───────────────────────── 宿主数据口（浏览器半边只读它） ───────────────────────── */

const API_PREFIX = '/dsh-evolve-task-tree/api'

/** 是否本机请求。 */
function isLocal(req) {
  const addr = req.socket && req.socket.remoteAddress
  return typeof addr === 'string' && /^(::1|127\.|::ffff:127\.)/.test(addr)
}

/** 回一个 JSON。 */
function sendJson(res, code, body) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

/** 读请求体（写接口用；限 64KB）。 */
function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('请求体过大'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/**
 * 挂两条路由：GET /tree 只读取树与对齐栏；POST /align 写对齐栏（侧栏直接改后用）。
 * 面板只负责画，判读口径仍在渲染函数里，不另造一份。
 */
function registerRoutes(ctx) {
  const mount = (hostCtx, webServer) => {
    hostCtx.effect(() => webServer.register({
      kind: 'exact',
      path: API_PREFIX + '/tree',
      handler: (req, res) => {
        if (!isLocal(req)) return sendJson(res, 403, { ok: false, error: '只接受本机请求' })
        if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: '只支持 GET' })
        try {
          const url = new URL(String(req.url || '/'), 'http://127.0.0.1')
          const sessionId = String(url.searchParams.get('sessionId') || '')
          // 会话 id 的实际形态是裸 UUID（文件名＝id），历史上有过 session- 前缀形态：两种都收，
          // 只挡路径符号与穿越。
          if (!/^[A-Za-z0-9][A-Za-z0-9-]{5,79}$/.test(sessionId)) {
            return sendJson(res, 400, { ok: false, error: '会话 id 不合法' })
          }
          // 模式以会话档为准（标记只兜底）：非本模式的会话不把树送出侧栏。
          const mode = presetFromArchive(sessionId) || presetMarkerOf(sessionId)
          const rec = mode === ALIGN_PRESET ? loadTree(sessionId) : null
          sendJson(res, 200, {
            ok: true,
            // 模式随数据一起给浏览器半边：官方模式会话里侧栏不画树、不画对齐卡。
            mode,
            tree: rec
              ? {
                sessionId: rec.sessionId,
                cwd: rec.cwd || '',
                root: rec.root || null,
                roots: rootsOf(rec),
                // 唯一「运行中」的那颗：与对齐栏、注入同一口径（进行中链末端）。
                runningId: runningIdOf(rec),
                currentId: rec.currentId || '',
                align: alignOf(rec),
                dropped: rec.dropped || [],
                unplaced: rec.unplaced || [],
              }
              : null,
          })
        } catch (error) {
          sendJson(res, 500, { ok: false, error: String((error && error.message) || error) })
        }
      },
    }), 'dsh-evolve-task-tree: tree route')

    hostCtx.effect(() => webServer.register({
      kind: 'exact',
      path: API_PREFIX + '/align',
      handler: async (req, res) => {
        if (!isLocal(req)) return sendJson(res, 403, { ok: false, error: '只接受本机请求' })
        if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: '只支持 POST' })
        try {
          const body = JSON.parse((await readBody(req)) || '{}')
          const sessionId = String(body.sessionId || '')
          if (!/^[A-Za-z0-9][A-Za-z0-9-]{5,79}$/.test(sessionId)) {
            return sendJson(res, 400, { ok: false, error: '会话 id 不合法' })
          }
          const refuse = refuseWhenNotAlignMode(sessionId)
          if (refuse) return sendJson(res, 409, { ok: false, error: refuse })
          // 用户在侧栏改的：写进会话记录（source=user），下一轮注入会提醒以它为准。
          const out = applyAlign(sessionId, {
            goal: body.goal,
            accept: body.accept,
            points: body.points,
            hard: body.hard,
            soft: body.soft,
            id: body.id,
            force: body.force === true,
          }, 'user')
          sendJson(res, 200, { ok: true, align: out.align, node: out.target ? out.target.id : null })
        } catch (error) {
          sendJson(res, 400, { ok: false, error: String((error && error.message) || error) })
        }
      },
    }), 'dsh-evolve-task-tree: align route')

    hostCtx.effect(() => webServer.register({
      kind: 'exact',
      path: API_PREFIX + '/node',
      handler: async (req, res) => {
        if (!isLocal(req)) return sendJson(res, 403, { ok: false, error: '只接受本机请求' })
        if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: '只支持 POST' })
        try {
          const body = JSON.parse((await readBody(req)) || '{}')
          const sessionId = String(body.sessionId || '')
          if (!/^[A-Za-z0-9][A-Za-z0-9-]{5,79}$/.test(sessionId)) {
            return sendJson(res, 400, { ok: false, error: '会话 id 不合法' })
          }
          const refuse = refuseWhenNotAlignMode(sessionId)
          if (refuse) return sendJson(res, 409, { ok: false, error: refuse })
          // 侧栏卡片里改的：写节点字段与状态；改的是当前层时顶部对齐栏跟着走。
          const out = updateNode(sessionId, {
            id: body.id,
            title: body.title,
            goal: body.goal,
            accept: body.accept,
            points: body.points,
            hard: body.hard,
            soft: body.soft,
            status: body.status,
            source: 'user',
          })
          sendJson(res, 200, { ok: true, node: out.node, align: normalizeAlign(out.rec.align) })
        } catch (error) {
          sendJson(res, 400, { ok: false, error: String((error && error.message) || error) })
        }
      },
    }), 'dsh-evolve-task-tree: node route')
  }

  const direct = typeof ctx.get === 'function' ? ctx.get('webServer') : undefined
  if (direct && typeof direct.register === 'function') {
    mount(ctx, direct)
    return
  }
  if (typeof ctx.inject === 'function') {
    ctx.inject(['webServer'], (hostCtx) => {
      const webServer = hostCtx
        && (hostCtx.webServer || (typeof hostCtx.get === 'function' ? hostCtx.get('webServer') : undefined))
      if (!webServer || typeof webServer.register !== 'function') return
      mount(hostCtx, webServer)
    })
  }
}

/* ───────────────────────── 工具 / 命令 / 技能 / 注入 ───────────────────────── */

export function apply(ctx) {
  // 可选依赖：Session 投影（读本会话当前 preset）。延迟取，避免本插件先于注册表加载时永远拿不到。
  const sessionProjections = () => {
    try {
      return typeof ctx.get === 'function' ? ctx.get('sessionProjections') : undefined
    } catch {
      return undefined
    }
  }

  // 模式收口（2026-11-07 改：宿主注册 → 按 agent 注册）：任务树工具与模式标记都按会话判。
  //   · 宿主级注册的工具默认每个会话的工具表里都有 —— 标准/精简/PTC/Cordis 会话第一步能看到，
  //     下一步才被 restrict 摘掉，界面留一条「工具已更新 · 移除」。改成只把工具注册进
  //     「判出是进化模式」的那个 agent 的作用域：别的会话里它从未注册过，第一步就看不到。
  //   · 判不出 preset 时不注册（宁可本模式晚一步，也不漏进别的模式），下一次 pre-step 再判；
  //     切模式时按判到的 preset 注册／注销，dispose 挂在 agent 作用域上，代理销毁自动回收。
  //   · 同时把模式写进 <会话id>.preset，给 hooks-codex 那边的 profile-reminder 判模式用
  //     （它挂得比本插件晚，同一个 agent/created 事件里排在本监听之后）。
  const toolGate = new WeakMap()
  const gateAgent = (agent, allowHeader) => {
    const session = agent && agent.session
    if (!session || !session.id) return undefined
    let preset = resolvePreset(session.id, { agent }, sessionProjections())
    // 新建/恢复时档可能还没写全：档头（创建时的 agentPreset）在这一步是准的，只在 agent/created 兜底；
    // pre-step 不兜——切过模式后档头是旧值，会把工具错注册回别的模式。
    if (preset === undefined && allowHeader === true) {
      const header = session.header
      if (header && typeof header.agentPreset === 'string' && header.agentPreset.length > 0) preset = header.agentPreset
    }
    if (preset === undefined) return undefined
    markPresetMode(session.id, preset === ALIGN_PRESET, true)
    const held = toolGate.get(agent)
    try {
      if (preset === ALIGN_PRESET) {
        if (!held) toolGate.set(agent, agent.ctx.tools.register(TASK_TREE_TOOL))
      } else if (held) {
        held()
        toolGate.delete(agent)
      }
    } catch {
      /* 注册不进去：保持现状；execute 里还有一道模式拒绝 */
    }
    return preset
  }
  try {
    ctx.on('agent/created', ({ agent }) => {
      try { gateAgent(agent, true) } catch { /* 拿不到就先放着 */ }
    })
    ctx.on('agent/pre-step', ({ agent, turn }, next) => {
      try {
        const presetNow = gateAgent(agent, false)
        // 40 秒草稿的挂载改到 turn/start（见 installLateBar）；这里只做模式门。
      } catch { /* 判不出就维持现状 */ }
      return next()
    })
  } catch {
    /* 组合里没有 agent 事件：工具不注册（模型看不到）；execute 里仍有一道模式拒绝 */
  }

  installLateBar(ctx)

  try {
    registerRoutes(ctx)
  } catch {
    /* 路由挂不上不该拦住工具与命令 */
  }

  try {
    const install = (c) => {
      try {
        const sp = c && c.systemPrompt
        if (!sp || typeof sp.section !== 'function') return
        sp.section({
          name: 'user:task-tree',
          order: 510,
          text: (context) => {
            let preset = resolvePreset(sessionIdFromAny(context), context, sessionProjections())
            // 新建／分支会话的首轮：档还没写、投影也滞后 → 用档头 agentPreset 兜底，
            // 否则这一轮不注入，上下文与侧栏都像「树没了」。只在这一步兜底：切过模式后档头是旧值。
            if (preset === undefined) {
              const header = context?.agent?.session?.header?.agentPreset
                ?? context?.session?.header?.agentPreset
              if (typeof header === 'string' && header.length > 0) preset = header
            }
            return injectTextForSession(
              sessionIdFromAny(context),
              cwdFromAny(context),
              preset === ALIGN_PRESET,
              preset !== undefined,
            )
          },
        })
      } catch {
        /* 注入失败不影响工具与命令 */
      }
    }
    if (typeof ctx.inject === 'function') ctx.inject(['systemPrompt'], install)
    else if (typeof ctx.get === 'function') install({ systemPrompt: ctx.get('systemPrompt') })
  } catch {
    /* 无 systemPrompt 服务的环境：跳过注入 */
  }

  // 工具定义只构造一次；注册动作在 gateAgent 里按 agent 作用域做（见上）。
  const TASK_TREE_TOOL = {
    name: TOOL_NAME,
    description: '会话任务树：把一个任务摆成你能看懂、也能打断纠正的方向图——'
      + '下一级替上一级拿验收，上一级是下一级的目的；左右是平级（同一个父下的①②③，合起来把上一级做成）。'
      + '只为一件事存在：一眼看清现在做到哪、这活替谁做、旁边还有哪几件。'
      + '树按需立：一个步骤一个节点——能单独验收（做完能单独说一句「这件事完了」）就 action=new 立一支；不能单独验收的，归在它所属的那一步里，不另立。'
      + '新任务挂之前先走三问：①它是当前这层要完成的目标之一吗？是就挂这层；②不是就往上问一层，一层层问到根，哪层认它是目标就挂哪层（两层都认，挂低的那层）；③一路都没有哪层认它是目标、只是这件事带出来的问题——不挂成子：源不是根就 add from=<源id>（挂成它的平级，图上横线连过去），源是根就 new unrelated=true from=<根id> 另立一棵并列的。'
      + '子节点认领的必须是父目标里的一条；父没有目标就判断不了，先补父的目标。'
      + '连续修改节点（align/set/move/drop）3 次而期间没有 new/add 新目标时，写入按「第 3 次拒写并报、第 4 次放行仍报、第 5 次拒写、第 6 次放行仍报」交替；new/add 成功即清零。'
      + '改挂 action=move；'
      + '用户这句话落在哪个节点就只答那个节点；说不清这件事挂哪就问用户，别默默不落盘。',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['read', 'new', 'add', 'move', 'set', 'drop', 'align', 'tail', 'unplaced', 'check', 'export', 'list'],
          description: 'read 读本会话的树（默认，含「现在做到哪」行）｜new 按需立树（已有树时只有确认无联系、或它是衍生出来的问题（带 from）才带 unrelated=true 另立）｜add 挂到某父下（parent/title/serves/goal/accept；父必须先有目标；带 from=<源id> 挂成源的平级、不写 serves）｜move 改挂父（id/parent/serves）｜set 改节点（id/title/goal/accept/serves/status）｜drop 整支移除（id，含子节点）｜align 同步对齐栏（goal＝本层目标/accept/points/hard/soft/gate；gate＝关卡行，必填；accept＝这一层的验收，跟本层目标同一行；默认写当前层＝进行中链末端，不是根；根目标只能是一件事（不许用「；」或句号并列两个效果），且默认不许逐轮改——要纠偏就显式 align id=<根id> force=true why=<偏在哪>，旧的那句留一行「目标修正前」；new／add／force 纠偏时硬需求须带〔反推〕标记或「反推无新增」，缺了拒收）｜unplaced 未归位清单（title 登记／id 序号清除）｜check 体检｜export 写 <工作区>\\任务树.md｜list 列出各会话的树',
        },
        id: { type: 'string', description: '节点 id，如 n3；align 时可传要同步到的节点 id（缺省＝当前进行中链的末端）；unplaced 时填序号' },
        parent: { type: 'string', description: '父节点 id（不填＝挂在根下）' },
        title: { type: 'string', description: '节点标题／新树的根任务标题／未归位条目标题' },
        serves: { type: 'string', description: '这个节点替父拿下父目标里的哪一条（非根必填；父必须先有目标；带 from 的衍生节点不写 serves，说不清就先问用户）' },
        goal: { type: 'string', description: '本层目标：这一层要拿到的效果（对齐栏里「本层目标：」那一行同一句；对齐栏只出本层目标一行；上一级的目标只在树里，不出这一行）' },
        accept: { type: 'string', description: '这一层的验收：一句能判真假的话（成没成有据可核，如"脚本全绿""你指出其中一条不成立"）。跟本层目标同一行显示，立层时写' },
        points: { type: 'string', description: '这一层的基本点，多条用「｜」分隔（对齐栏与卡片展开都显示它）' },
        hard: { type: 'string', description: '这一层的硬需求（不容更改的那几条，多条用「｜」分隔）' },
        soft: { type: 'string', description: '这一层的软需求（可换可弃的方向项，多条用「｜」分隔）' },
        gate: { type: 'string', description: '对齐栏「关卡」行（align 必填）：全过写「15/15 ✅」，有没过的写「13/15（③⑥未过）」；工具拿它把四样连关卡拼成回帖可直接照抄的整块' },
        force: { type: 'boolean', description: '仅 align 用：覆盖用户刚在侧栏改过的版本，或确认目标纠偏（根目标写偏了要改回，同一条任务不是换任务）——两种情况都带 true，并先复述你理解成什么；纠偏时原来那句会留一行（带 why 记偏在哪）' },
        items: { type: 'array', items: { type: 'string' }, description: 'tail 用：收尾检测的条目，一条一项（如「画像：无新增。」「词条：无。」「待确认：…」）' },
      status: { type: 'string', enum: ['active', 'pending', 'done', 'obsolete'], description: '节点状态：active 运行中（正在做的那一支；界面上全树只显示一个「运行中」，其余未完成的显示「排队中」）／pending 排队中（已列出、等轮到的）／done 已定（做完且验收）／obsolete 已废（留在树上、灰暗、不参与运行）' },
        note: { type: 'string', description: '备注（drop 时记原因）' },
        unrelated: { type: 'boolean', description: '仅 action=new 用：已确认与本会话现有任务没有联系（或衍生的源是根），另立一棵并列的新树（现有树保留，互不顶掉；同一会话可有多棵）' },
        from: { type: 'string', description: 'add／new 用：这件事由哪个节点带出来（填源节点 id）。add 带 from＝挂在源节点的父下与它平级（不写 serves，图上用横线连到源卡）；new 带 from＝源是根，另立一棵并列的树（图上用横线连过去）' },
        why: { type: 'string', description: 'align／set 改根目标时用：记一句原来偏在哪（写进「目标修正前」留痕）' },
        workspace: { type: 'string', description: '仅 export 用：导出目录（缺省取当前会话 cwd）' },
      },
      required: ['action'],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: { ok: { type: 'boolean' }, text: { type: 'string' } },
        required: ['ok', 'text'],
        additionalProperties: false,
      },
      render: (_args, value) => [{ type: 'text', text: value.text }],
    },
    async execute(args, exec) {
      const action = pick(args.action) || 'read'
      const sessionId = sessionIdFromAny(exec)
      if (!sessionId) throw new Error('拿不到本会话 id，任务树没法按会话存放')

      // 任务树与对齐栏只属于进化模式：判出是别的模式就整体拒绝（官方模式会话不建树、不写对齐栏）。
      // 判据：档里最后 selected（DSH 写、最准）→ 投影 → 档头 → 运行态标记；判不出时放行，
      // 避免把「判不出」当成「别的模式」而废掉本模式的功能。
      const preset = resolvePreset(sessionId, exec, sessionProjections())
      if (preset !== undefined && preset !== ALIGN_PRESET) {
        throw new Error(`本会话不是进化模式（当前 ${preset}）：任务树与对齐栏只在这个模式里用；要立树请在进化模式的新会话里做。`)
      }

      if (action === 'tail') {
        // 收尾检测块：与 align 同一套构造（引用块 + 每行行末反斜杠 + 块内不空行），
        // 让这一段也由工具拼、我只粘贴，不再手打。
        const items = Array.isArray(args.items)
          ? args.items.map((x) => String(x).replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean)
          : []
        if (items.length === 0) throw new Error('tail 需要 items：收尾检测的条目（字符串数组），一条一项')
        const lines = ['> **收尾检测**\\', ...items.map((it) => '> ' + it + '\\')]
        return { ok: true, text: `【回帖第三块原样用这段，别重排】\n${lines.join('\n')}` }
      }

      if (action === 'list') return { ok: true, text: listAll() }

      if (action === 'align') {
        // 纠偏（force）＝重推硬需求，正是该跑反推的时候：这里拦一道，平时轮次的推进不拦。
        if (args.force === true) assertReverseDerivation(args.hard, 'align')
        const gate = pick(args.gate)
        if (!gate) {
          throw new Error('align 需要 gate：对齐栏「关卡」行（全过写「15/15 ✅」，有没过的写「13/15（③⑥未过）」）。工具拿它把四样连关卡拼成回帖可直接照抄的整块；缺了就会少一行、格式漂移')
        }
        // 连续修改护栏：第 3 次报提示并拒写；第 4 次放行仍提示；第 5 次再拒——new/add 清零。
        const guard = guardBefore(sessionId, 'align')
        if (guard && guard.blocked) throw new Error(guardBlockText(guard.count, 'align'))
        const recBefore = loadTree(sessionId)
        const wasAutoRoot = !!(recBefore && isAutoRoot(recBefore))
        const out = applyAlign(sessionId, args, 'agent', cwdFromAny(exec))
        // 占位根第一次被填上目标＝建立新目标，不算一次「连续修改」。
        const filledAutoRoot = !!(wasAutoRoot && out.target && out.rec.root === out.target)
        if (filledAutoRoot) resetGuard(sessionId)
        else if (guard) guard.settle()
        const guardPrefix = guard && guard.warn && !filledAutoRoot ? `⚠ ${guard.warn}\n` : ''
        const block = replyAlignBlock(renderAlignBlock(out.rec, out.target, out.align), gate)
        // 换根了就说清：旧方向留着，下面各支的 serves 还是按旧根写的。
        const hist = Array.isArray(out.rec.rootHistory) ? out.rec.rootHistory.slice(-1) : []
        const rootChanged = out.rootChanged === true && hist.length > 0
        const hitRoot = !!(out.target && rootsOf(out.rec).some((r) => r.id === out.target.id))
        return {
          ok: true,
          text: `${guardPrefix}已同步对齐栏${out.target ? `到 [${out.target.id}] ${out.target.title}` : '（本会话还没立树：只存会话级对齐栏）'}\n【回帖第一块原样用这段，别重排——侧栏卡片就是同一份】\n${block}`
            + (rootChanged ? `\n\n根目标已修正（原来偏成「${hist[0].goal}」${hist[0].why ? `，偏在：${hist[0].why}` : ''}）。任务没换、树别动：逐支对照新目标，serves 只是提法跟不上的改措辞；真挂错的再问，不默认拆支。` : '')
            + (hitRoot ? '\n\n（本次落在根上：根只装一件事——这一轮要是另一件事，先 action=new/add 立支，再 align 到那一支。）' : ''),
        }
      }

      if (action === 'new') {
        const existing = loadTree(sessionId)
        const auto = existing ? isAutoRoot(existing) : false
        // 衍生的源是根时，跟它平级＝另立一棵并列的树，from 记源根 id（图上用横线连过去）。
        const fromId = pick(args.from)
        let source = null
        if (fromId) {
          if (!existing) throw new Error('本会话还没有树：from 要指向树里的一个节点；全新的事直接 new title=<根任务>')
          source = findNodeAny(existing, fromId)
          if (!source) throw new Error(`找不到源节点 ${fromId}`)
          if (!rootsOf(existing).some((r) => r.id === source.id)) {
            throw new Error(`源节点 [${source.id}] ${source.title} 不是根：衍生的要挂在它旁边平级——action=add title=<...> from=${source.id}`)
          }
        }
        if (existing && existing.root && !auto && !args.unrelated && !source) {
          throw new Error(`本会话已有树「${existing.root.title}」：与它有联系的新任务用 action=add parent=<父 id> serves=<替父拿下父目标里的哪一条> 挂进去；确认另一件事与它没有联系（两件平行的活），才带 unrelated=true 另立一棵；由树里某件事带出来的问题用 action=add title=<...> from=<源节点 id>（挂成源节点的平级，源是根时改用 new unrelated=true from=<根 id>）`)
        }
        const title = pick(args.title)
        if (!title) throw new Error('new 需要 title（根任务标题）')
        assertSingleEffectGoal(args.goal, '新树的根目标')
        assertReverseDerivation(args.hard, 'new')
        const base = existing || {
          version: 3,
          sessionId,
          cwd: cwdFromAny(exec) || '',
          align: null,
          roots: [],
          dropped: [],
          unplaced: [],
        }
        if (!base.cwd) base.cwd = cwdFromAny(exec) || ''
        const roots = rootsOf(base)
        const node = {
          id: '', title, serves: '', goal: pick(args.goal), accept: pick(args.accept), points: pointsFromArg(args.points),
          hard: pick(args.hard), soft: pick(args.soft), from: source ? source.id : '', status: 'active', children: [],
        }
        if (auto) {
          // 占位根直接被第一次立树替换（不新增一棵）
          node.id = base.root.id
          const i = roots.indexOf(base.root)
          if (i >= 0) roots[i] = node
          else roots.push(node)
        } else {
          node.id = allocId(base)
          roots.push(node)
        }
        base.roots = roots
        normalizeRecord(base)
        base.currentRootId = node.id
        base.root = node
        saveTree(base)
        // 立了新树（建立新目标）→ 连续修改计数清零。
        resetGuard(sessionId)
        const head = roots.length > 1
          ? `已在本会话立第 ${roots.length} 棵树，根＝「${title}」（与另 ${roots.length - 1} 棵并列，互不顶掉）`
          : `已立本会话的任务树，根＝「${title}」`
        return { ok: true, text: `${head}。子任务往下按级挂。\n\n${renderTree(base)}` }
      }

      if (action === 'add') {
        assertReverseDerivation(args.hard, 'add')
        const out = mutate(sessionId, (rec) => {
          const title = pick(args.title)
          if (!title) throw new Error('add 需要 title')
          // 衍生（2026-11-01）：带 from=<源节点 id> 就是「由那件事带出来的问题」——
          // 不挂成源节点的子，挂在源节点的父下做平级；不写 serves，靠图上横线标来路。
          const fromId = pick(args.from)
          let source = null
          if (fromId) {
            source = findNodeAny(rec, fromId)
            if (!source) throw new Error(`找不到源节点 ${fromId}`)
            if (rootsOf(rec).some((r) => r.id === source.id)) {
              throw new Error(`源节点 [${source.id}] ${source.title} 是根：跟它平级要另立一棵——action=new title=<...> unrelated=true from=${source.id}`)
            }
          }
          const askedParent = pick(args.parent)
          const parentId = source ? String((findParentOf(rec, source.id) || {}).id || rec.root.id) : (askedParent || rec.root.id)
          if (source && askedParent && askedParent !== parentId) {
            throw new Error(`带 from 时固定挂在源节点的父下 [${parentId}]：不要另指 parent=${askedParent}`)
          }
          const parent = findNodeAny(rec, parentId)
          if (!parent) throw new Error(`找不到父节点 ${parentId}`)
          const serves = pick(args.serves)
          if (source) {
            if (serves) {
              throw new Error('带 from 的节点不写 serves：它是衍生出来的，不认领父目标里的条目；要认领父目标就别带 from')
            }
          } else {
            if (!serves) {
              throw new Error('非根节点必须写 serves（这个节点替父拿下父目标里的哪一条）。说不清就先 action=unplaced title=<这件事> 登记，或直接问用户')
            }
            // 认领的目标必须先存在（2026-11-01）：三问里的第一问是「它是父要完成的目标之一吗」，
            // 父自己没写目标，这一问就没有对象——先补父的目标，再挂。
            const parentGoal = String(parent.goal || '').trim()
            if (!parentGoal) {
              throw new Error(
                `父节点 [${parent.id}] ${parent.title} 还没有目标：子节点要认领的是父目标里的一条，父没有目标就判断不了挂得对不对。`
                + `先给父写目标（action=align id=${parent.id} goal=<这一层要拿到的效果>，或 action=set id=${parent.id} goal=...），再来挂这一支。`,
              )
            }
          }
          // 状态：显式给了就按给的；没给时——父下已有别的进行中支，新支默认「排队」，
          // 否则才是「进行中」。这样并列摊开的几支只有一支在跑，其余标明等着轮。
          // 衍生节点默认排队：它是带出来的问题，不自动抢「运行中」。
          const askedStatus = pick(args.status)
          const siblingActive = (parent.children || []).some((c) => c.status === 'active')
          const status = ['active', 'pending', 'done', 'obsolete'].includes(askedStatus)
            ? askedStatus
            : (source ? 'pending' : (siblingActive ? 'pending' : 'active'))
          const node = {
            id: allocId(rec), title, serves: source ? '' : serves,
            goal: pick(args.goal), accept: pick(args.accept), points: pointsFromArg(args.points),
            hard: pick(args.hard), soft: pick(args.soft), from: source ? source.id : '',
            status, children: [],
          }
          // 显式把新支设成进行中时，同父下旧的进行中自动退回排队（同一父下只留一支在跑）
          if (status === 'active') for (const c of (parent.children || [])) if (c.status === 'active') c.status = 'pending'
          // 衍生的紧挨着源节点摆：横线短、一眼看得出它是从旁边那支带出来的。
          const kids = parent.children || []
          if (source) {
            const at = kids.findIndex((c) => c.id === source.id)
            parent.children = at >= 0 ? [...kids.slice(0, at + 1), node, ...kids.slice(at + 1)] : [...kids, node]
          } else {
            parent.children = [...kids, node]
          }
          if (parent.id === rec.root.id) rec.root.auto = false
          return { node, parent, source }
        })
        // 挂了一支新目标 → 连续修改计数清零。
        resetGuard(sessionId)
        const rec = loadTree(sessionId)
        const sub = out.source
          ? `（${NODE_STATUS[out.node.status] || out.node.status}；${fromLabel(rec, out.node)}——挂在 [${out.parent.id}] 的平级位，不替它拿目标，图上用横线连到源卡）`
          : `（${NODE_STATUS[out.node.status] || out.node.status}；替父：${out.node.serves}）`
        const next = out.source
          ? `它是单独一件事，不替父拿目标：轮到它时按它自己的目标写，别把父节点的目标当根本目标。`
          : `换到这一支干活时，回帖的对齐栏就按它写（它当本层目标、父节点的目标当根本目标）；轮到哪支就把那支设 active、其余设 pending。`
        return {
          ok: true,
          text: `已挂到 [${out.parent.id}] ${out.parent.title} 下 → [${out.node.id}] ${out.node.title}${sub}。${next}\n\n${renderTree(rec)}`,
        }
      }

      if (action === 'move') {
        const guard = guardBefore(sessionId, 'move')
        if (guard && guard.blocked) throw new Error(guardBlockText(guard.count, 'move'))
        const out = mutate(sessionId, (rec) => {
          const id = pick(args.id)
          const parentId = pick(args.parent)
          if (!id) throw new Error('move 需要 id')
          if (!parentId) throw new Error('move 需要 parent（新的父节点 id）')
          const node = findNodeAny(rec, id)
          if (!node) throw new Error(`找不到节点 ${id}`)
          if (rootsOf(rec).some((r) => r.id === node.id)) throw new Error('根节点不能改挂父')
          const newParent = findNodeAny(rec, parentId)
          if (!newParent) throw new Error(`找不到新的父节点 ${parentId}`)
          if (newParent.id === node.id || subtree(node).some((n) => n.id === newParent.id)) {
            throw new Error(`不能挂到自己的子孙 ${parentId} 下（会成环）`)
          }
          if (!node.from && !String(newParent.goal || '').trim()) {
            throw new Error(`新父节点 [${newParent.id}] ${newParent.title} 还没有目标：改挂前先补它的目标（action=set id=${newParent.id} goal=...），否则这支认领不到东西`)
          }
          const serves = args.serves !== undefined ? pick(args.serves) : String(node.serves || '').trim()
          if (!serves && !node.from) throw new Error('改挂后这个节点仍要写 serves（替新父拿下父目标里的哪一条）：带上 serves=<...>')
          detachAny(rec, id)
          node.serves = serves
          newParent.children = [...(newParent.children || []), node]
          return { node, newParent }
        })
        if (guard) guard.settle()
        const rec = loadTree(sessionId)
        const guardPrefix = guard && guard.warn ? `⚠ ${guard.warn}\n` : ''
        return { ok: true, text: `${guardPrefix}已改挂：[${out.node.id}] ${out.node.title} → 现在挂在 [${out.newParent.id}] ${out.newParent.title} 下（替父：${out.node.serves}）\n\n${renderTree(rec)}` }
      }

      if (action === 'set') {
        const guard = guardBefore(sessionId, 'set')
        if (guard && guard.blocked) throw new Error(guardBlockText(guard.count, 'set'))
        const out = updateNode(sessionId, { ...args, source: 'agent' })
        if (guard) guard.settle()
        const guardPrefix = guard && guard.warn ? `⚠ ${guard.warn}\n` : ''
        return { ok: true, text: `${guardPrefix}已更新 [${out.node.id}] ${out.node.title}\n\n${renderTree(out.rec)}` }
      }

      if (action === 'drop') {
        const guard = guardBefore(sessionId, 'drop')
        if (guard && guard.blocked) throw new Error(guardBlockText(guard.count, 'drop'))
        const out = mutate(sessionId, (rec) => {
          const id = pick(args.id)
          if (!id) throw new Error('drop 需要 id')
          const node = findNodeAny(rec, id)
          if (!node) throw new Error(`找不到节点 ${id}`)
          const isRoot = rootsOf(rec).some((r) => r.id === node.id)
          if (isRoot) {
            // 整棵移除：先落到 archived（可恢复），再从本会话挪走
            try {
              if (!existsSync(ARCHIVED_DIR)) mkdirSync(ARCHIVED_DIR, { recursive: true })
              writeJson(join(ARCHIVED_DIR, `${rec.sessionId}-${node.id}.json`), node)
            } catch {
              // 归档失败不挡移除：文件级问题不该让树上动不了
            }
            rec.roots = rootsOf(rec).filter((r) => r.id !== node.id)
            if (rec.currentRootId === node.id) {
              rec.currentRootId = rec.roots.length > 0 ? rec.roots[rec.roots.length - 1].id : null
            }
            normalizeRecord(rec)
            return { id, count: subtree(node).length, whole: true, title: node.title }
          }
          const branch = subtree(node)
          detachAny(rec, id)
          rec.dropped = [
            ...(rec.dropped || []),
            ...branch.map((n) => ({ title: n.title, note: pick(args.note), at: new Date().toISOString() })),
          ]
          return { id, count: branch.length }
        })
        if (guard) guard.settle()
        const rec = loadTree(sessionId)
        const guardPrefix = guard && guard.warn ? `⚠ ${guard.warn}\n` : ''
        if (out.whole) {
          return { ok: true, text: `${guardPrefix}已把整棵树「${out.title}」移出本会话（含 ${out.count} 个节点；原件留在 task-trees\\archived\\，要恢复说一声）\n\n${renderTree(rec)}` }
        }
        return { ok: true, text: `${guardPrefix}已移除 [${out.id}] 整支（含子节点共 ${out.count} 个），此后不再并列展示\n\n${renderTree(rec)}` }
      }

      if (action === 'unplaced') {
        const rec0 = loadTree(sessionId)
        const list = rec0 ? (rec0.unplaced || []) : []
        const idArg = pick(args.id)
        if (idArg) {
          const index = Number(idArg)
          if (!rec0 || !Number.isSafeInteger(index) || index < 1 || index > list.length) {
            throw new Error(`未归位序号 ${idArg} 不存在（现有 ${list.length} 条；action=unplaced 看清单）`)
          }
          const removed = list[index - 1]
          mutate(sessionId, (rec) => { rec.unplaced = list.filter((_u, i) => i !== index - 1) })
          return { ok: true, text: `已清掉未归位：${removed.title}（剩 ${list.length - 1} 条）` }
        }
        const title = pick(args.title)
        if (!title) {
          if (list.length === 0) return { ok: true, text: '本会话没有未归位项。' }
          return {
            ok: true,
            text: `未归位（${list.length} 条，不进任何树）：\n`
              + list.map((u, i) => `${i + 1}. ${u.title}${u.note ? `｜${u.note}` : ''}`).join('\n')
              + (list.length >= UNPLACED_LIMIT ? '\n提示：先归位再开新活（归位＝action=add 挂到某个父节点并写 serves）。' : ''),
          }
        }
        mutate(sessionId, (rec) => {
          rec.unplaced = [...(rec.unplaced || []), { title, note: pick(args.note), at: new Date().toISOString() }]
        })
        const next = list.length + 1
        return {
          ok: true,
          text: `已登记未归位：${title}（共 ${next} 条；不进任何树）`
            + (next >= UNPLACED_LIMIT ? `\n提示：满 ${UNPLACED_LIMIT} 条——先归位再开新活。` : ''),
        }
      }

      if (action === 'check') {
        const rec = loadTree(sessionId)
        if (!rec) return { ok: true, text: '本会话还没有任务树。' }
        const issues = checkTree(rec)
        return { ok: true, text: `体检：${issues.length === 0 ? '干净' : issues.length + ' 处待处理'}${issues.length > 0 ? '\n' + issues.map((i) => '· ' + i).join('\n') : ''}` }
      }

      if (action === 'export') {
        const rec = loadTree(sessionId)
        if (!rec) throw new Error('本会话还没有任务树。')
        if (rootsOf(rec).length === 0) throw new Error('本会话只有对齐栏、还没有树，先把方向摆开：action=new title=<根任务>')
        const ws = pick(args.workspace) || cwdFromAny(exec) || process.cwd()
        const out = join(ws, '任务树.md')
        const head = rootsOf(rec).map((r) => r.title).join('＋')
        writeFileSync(out, `# 任务树「${head}」\n\n\`\`\`\n${renderTree(rec)}\n\`\`\`\n`, 'utf8')
        return { ok: true, text: `已导出到 ${out}` }
      }

      // 默认 read
      const rec = loadTree(sessionId)
      if (!rec) {
        return { ok: true, text: '本会话还没有任务树，也没有同步过对齐栏。\n要把任务摆成方向图（要拆多级、要打断纠正）时：action=new title=<根任务>；只同步对齐栏用 action=align。' }
      }
      if (!rec.root) {
        const line = unplacedLine(rec)
        return { ok: true, text: renderTree(rec) + (line ? `\n${line}` : '') }
      }
      const issues = checkTree(rec)
      const line = unplacedLine(rec)
      return {
        ok: true,
        text: `${renderTree(rec)}\n\n体检：${issues.length === 0 ? '干净' : issues.length + ' 处待处理（action=check 看明细）'}`
          + (line ? `\n${line}` : ''),
      }
    },
  }

  ctx.commands.register({
    name: 'task-tree',
    description: '查看本会话的任务树（方向图：做到哪／替谁做／旁边还有谁）；--all 列各会话的树，--check 出体检',
    input: { hint: '[--all|--check]' },
    handler: async (params) => {
      try {
        const raw = pick(params && params.rawInput)
        if (raw === '--all' || raw === '-a') return { kind: 'success', text: listAll() }
        const sessionId = sessionIdFromAny(params)
        if (!sessionId) return { kind: 'error', text: '拿不到本会话 id。' }
        const mode = presetFromArchive(sessionId) || presetMarkerOf(sessionId)
        if (mode !== '' && mode !== ALIGN_PRESET) {
          return { kind: 'error', text: '本会话不是进化模式：任务树与对齐栏只在这个模式里用。' }
        }
        const rec = loadTree(sessionId)
        if (!rec) return { kind: 'success', text: '本会话还没有任务树。' }
        if (raw === '--check' || raw === '-c') {
          const issues = checkTree(rec)
          return { kind: 'success', text: `体检：${issues.length === 0 ? '干净' : issues.length + ' 处待处理'}${issues.length > 0 ? '\n' + issues.map((i) => '· ' + i).join('\n') : ''}` }
        }
        const issues = checkTree(rec)
        const line = unplacedLine(rec)
        return { kind: 'success', text: `${renderTree(rec)}\n\n体检：${issues.length === 0 ? '干净' : issues.length + ' 处待处理'}` + (line ? `\n${line}` : '') }
      } catch (error) {
        return { kind: 'error', text: error instanceof Error ? error.message : String(error) }
      }
    },
  })

}

/* 诊断/自检用内部导出（不参与 ctx 注册） */
export const _internals = {
  renderTree,
  renderInject,
  checkTree,
  loadTree,
  saveTree,
  autoCreateRoot,
  isAutoRoot,
  renderAlignBlock,
  parseAlignBlock,
  depthOf,
  nodeDepth,
  alignDepth,
  layerText,
  listAll,
  injectTextForSession,
  markPresetMode,
  presetMarkerOf,
  presetFromArchive,
  presetDetailFromArchive,
  resolvePreset,
  walkNodes,
  rootsOf,
  walkAll,
  rootOfNode,
  activePaths,
  mark,
  noTreeHint,
  normalizeAlign,
  alignFromNode,
  alignOf,
  alignLine,
  applyAlign,
  updateNode,
  guardCountOf,
  guardBefore,
  resetGuard,
  draftAlignText,
  armLateBar,
  lateBarStream,
  parseAlignBlockLast,
  lateBarArms,
  currentLayerNode,
  SESSIONS_DIR,
  ROOT_DIR,
}
