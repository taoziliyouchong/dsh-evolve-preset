/**
 * dsh-evolve-settings —— 进化模式设置（合包宿主半边）
 *
 * 两件事：
 *   1) 设置页读写的 JSON：$DSH_HOME/evolve/evolution-settings.json
 *      { "lateBarSeconds": 40, "lateBarEnabled": true, "lateBarContent": "goal",
 *        "lateBarRetrySeconds": 10, "allowCrossSessionQuery": true,
 *        "closingCheck": true }
 *      closingCheck 关掉时：任务树每轮注入一行 [收尾检测：关]，模型据此不做五项、不出第三块。
 *   2) 工具守卫：allowCrossSessionQuery 为 false 时，拒绝跨回合查询三件套。
 *
 * 思考提醒的起始秒数、复查间隔由 host/task-tree.js 读同一份设置，
 * 这里只负责写，任务树负责用。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/** 本模块名（合包内只是一段，按预设注册）。 */
export const name = 'dsh-evolve-settings'
/** 需要的服务：tools 用来挂守卫；webServer 在 apply 里按需注入。 */
export const inject = ['tools']

const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
export const SETTINGS_FILE = join(DSH_HOME, 'evolve', 'evolution-settings.json')
const API_PATH = '/dsh-evolution-settings/api/settings'
const BILLION_API_PATH = '/dsh-evolution-settings/api/billion-context'
const BILLION_STATE_FILE = join(DSH_HOME, 'evolve', 'billion-context-notice.json')

const MIN_LATE_BAR_SECONDS = 5
const MAX_LATE_BAR_SECONDS = 600
/** 质询间隔：到点四样还没齐，就隔这么多秒再看一次。 */
const MIN_LATE_BAR_RETRY_SECONDS = 5
const MAX_LATE_BAR_RETRY_SECONDS = 120
const DEFAULTS = {
  lateBarSeconds: 40,
  lateBarEnabled: true,
  lateBarContent: 'goal',
  lateBarRetrySeconds: 10,
  allowCrossSessionQuery: true,
  closingCheck: true,
}

/** 关掉跨回合查询时要拒绝的工具。 */
const CROSS_SESSION_TOOLS = new Set([
  'session-search',
  'session-dump',
  'session-recover',
])

export function clampSeconds(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return DEFAULTS.lateBarSeconds
  return Math.min(MAX_LATE_BAR_SECONDS, Math.max(MIN_LATE_BAR_SECONDS, Math.round(n)))
}

export function clampRetrySeconds(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return DEFAULTS.lateBarRetrySeconds
  return Math.min(MAX_LATE_BAR_RETRY_SECONDS, Math.max(MIN_LATE_BAR_RETRY_SECONDS, Math.round(n)))
}

/** 读设置；文件不存在、JSON 坏了、字段缺失都退回默认值。 */
export function readSettings() {
  try {
    const raw = JSON.parse(readFileSync(SETTINGS_FILE, 'utf8'))
    return {
      lateBarSeconds: clampSeconds(raw && raw.lateBarSeconds),
      lateBarEnabled: raw && raw.lateBarEnabled !== false,
      lateBarContent: raw && raw.lateBarContent === 'full' ? 'full' : 'goal',
      lateBarRetrySeconds: clampRetrySeconds(raw && raw.lateBarRetrySeconds),
      allowCrossSessionQuery: raw && raw.allowCrossSessionQuery !== false,
      closingCheck: raw && raw.closingCheck !== false,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

/** 写设置。 */
function writeSettings(settings) {
  mkdirSync(dirname(SETTINGS_FILE), { recursive: true })
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n', 'utf8')
}

/** 运行中的 profile 目录：环境变量给名字，进程参数给绝对路径，两路都认。 */
function profileDir() {
  const name = process.env.DSH_PROFILE
  if (name) {
    const dir = join(DSH_HOME, 'profiles', name)
    try { if (existsSync(join(dir, 'package.json'))) return dir } catch { /* 忽略 */ }
  }
  for (const arg of process.argv) {
    const text = String(arg || '')
    if (!/[\\/]profiles[\\/]/.test(text)) continue
    try { if (existsSync(join(text, 'package.json'))) return text } catch { /* 忽略 */ }
  }
  return ''
}

/** billion-context 是否装在这个 profile 里（依赖声明或 node_modules 有一处即可）。 */
function billionInstalled() {
  const dir = profileDir()
  if (!dir) return false
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    for (const field of ['dependencies', 'devDependencies']) {
      if (pkg && pkg[field] && Object.prototype.hasOwnProperty.call(pkg[field], 'billion-context')) return true
    }
  } catch { /* 包文件坏了就退回 node_modules 判断 */ }
  try { return existsSync(join(dir, 'node_modules', 'billion-context', 'package.json')) } catch { return false }
}

/** 补丁里某一行是否被显式 disabled: true（只看这一行自己的字段，不跨到下一行）。 */
function rowDisabled(patch, id) {
  const lines = String(patch || '').split(/\r?\n/)
  for (let i = 0; i < lines.length; i += 1) {
    if (!new RegExp(`^\\s*-?\\s*id:\\s*['"]?${id}['"]?\\s*$`).test(lines[i])) continue
    for (let j = i + 1; j < lines.length; j += 1) {
      if (/^\s*-\s+(id|name|insert):/.test(lines[j])) break
      if (/^\s*disabled:\s*true\b/.test(lines[j])) return true
    }
    return false
  }
  return false
}

/** billion-context 是否真的在跑：bundle 在组合里且两条压缩行没有被显式关掉。 */
function billionEnabled() {
  const dir = profileDir()
  if (!dir) return false
  let bundleOn = false
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    const bundles = pkg && pkg.dsh && pkg.dsh.profile && pkg.dsh.profile.bundles
    bundleOn = Array.isArray(bundles) && bundles.includes('billion-context')
  } catch { /* 读不到 bundle 清单就当没开 */ }
  let patch = ''
  try { patch = readFileSync(join(dir, 'cordis.patch.yml'), 'utf8') } catch { /* 没有补丁文件不拦 */ }
  if (rowDisabled(patch, 'bili-native') || rowDisabled(patch, 'bili-compaction-gate')) return false
  return bundleOn
}

/** 提示的两个状态：弹窗看过一次、设置顶部横幅关掉。 */
function readBillionState() {
  try {
    const raw = JSON.parse(readFileSync(BILLION_STATE_FILE, 'utf8'))
    return { popupSeen: raw && raw.popupSeen === true, bannerDismissed: raw && raw.bannerDismissed === true }
  } catch {
    return { popupSeen: false, bannerDismissed: false }
  }
}

function writeBillionState(state) {
  mkdirSync(dirname(BILLION_STATE_FILE), { recursive: true })
  writeFileSync(BILLION_STATE_FILE, JSON.stringify(state, null, 2) + '\n', 'utf8')
}

/** GET 读安装与关闭状态；POST 记「弹窗看过」或「横幅关掉」。 */
async function handleBillionContext(req, res) {
  if (!isLocal(req)) {
    sendJson(res, 403, { ok: false, error: 'forbidden' })
    return
  }
  if (req.method === 'GET') {
    sendJson(res, 200, { ok: true, installed: billionInstalled(), enabled: billionEnabled(), ...readBillionState() })
    return
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'method not allowed' })
    return
  }
  let body
  try {
    body = JSON.parse((await readBody(req)) || '{}')
  } catch {
    sendJson(res, 400, { ok: false, error: 'invalid json' })
    return
  }
  const state = readBillionState()
  const action = body && body.action
  if (action === 'popupSeen') state.popupSeen = true
  else if (action === 'dismissBanner') state.bannerDismissed = true
  else {
    sendJson(res, 400, { ok: false, error: 'unknown action' })
    return
  }
  writeBillionState(state)
  sendJson(res, 200, { ok: true, installed: billionInstalled(), enabled: billionEnabled(), ...state })
}

function isLocal(req) {
  const addr = req && req.socket && req.socket.remoteAddress
  return typeof addr === 'string' && /^(::1|127\.|::ffff:127\.)/.test(addr)
}

function sendJson(res, status, value) {
  const text = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(text)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 100000) {
        reject(new Error('body too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

/** GET 读设置；POST 保存设置。 */
async function handleSettings(req, res) {
  if (!isLocal(req)) {
    sendJson(res, 403, { ok: false, error: 'forbidden' })
    return
  }
  if (req.method === 'GET') {
    sendJson(res, 200, { ok: true, settings: readSettings() })
    return
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'method not allowed' })
    return
  }
  let body
  try {
    body = JSON.parse((await readBody(req)) || '{}')
  } catch {
    sendJson(res, 400, { ok: false, error: 'invalid json' })
    return
  }
  const current = readSettings()
  const next = {
    lateBarSeconds: body && body.lateBarSeconds !== undefined
      ? clampSeconds(body.lateBarSeconds)
      : current.lateBarSeconds,
    lateBarEnabled: body && body.lateBarEnabled !== undefined
      ? body.lateBarEnabled === true
      : current.lateBarEnabled,
    lateBarContent: body && (body.lateBarContent === 'goal' || body.lateBarContent === 'full')
      ? body.lateBarContent
      : current.lateBarContent,
    lateBarRetrySeconds: body && body.lateBarRetrySeconds !== undefined
      ? clampRetrySeconds(body.lateBarRetrySeconds)
      : current.lateBarRetrySeconds,
    allowCrossSessionQuery: body && body.allowCrossSessionQuery !== undefined
      ? body.allowCrossSessionQuery === true
      : current.allowCrossSessionQuery,
    closingCheck: body && body.closingCheck !== undefined
      ? body.closingCheck === true
      : current.closingCheck,
  }
  writeSettings(next)
  sendJson(res, 200, { ok: true, settings: next })
}

function registerRoutes(ctx) {
  const mount = (hostCtx, webServer) => {
    const register = () => {
      webServer.register({
        kind: 'exact',
        path: API_PATH,
        handler: handleSettings,
      })
      webServer.register({
        kind: 'exact',
        path: BILLION_API_PATH,
        handler: handleBillionContext,
      })
    }
    if (typeof hostCtx.effect === 'function') hostCtx.effect(register)
    else register()
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

function installGuard(ctx) {
  const tools = (typeof ctx.get === 'function' ? ctx.get('tools') : undefined) || ctx.tools
  if (!tools || typeof tools.guard !== 'function') return
  const dispose = tools.guard((execution) => {
    if (!execution || !CROSS_SESSION_TOOLS.has(execution.name)) return undefined
    if (readSettings().allowCrossSessionQuery !== false) return undefined
    return '跨回合查询已在设置 → 进化模式里关闭'
  })
  if (typeof ctx.effect === 'function') {
    try {
      ctx.effect(() => dispose)
    } catch {
      /* 清理不了也不影响拒绝语义 */
    }
  }
}

/** 注册工具守卫与设置路由。 */
export function apply(ctx) {
  try {
    installGuard(ctx)
  } catch {
    /* 守卫挂不上不影响设置页 */
  }
  try {
    registerRoutes(ctx)
  } catch {
    /* 没有 webServer 的宿主跳过设置路由 */
  }
}
