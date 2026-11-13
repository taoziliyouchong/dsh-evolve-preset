/**
 * 用户画像面板宿主半边。
 *
 * 画像文件：`$DSH_HOME/evolve/user-profile.md`（通用）与 `$DSH_HOME/evolve/user-profile.d/<slug>.md`（任务）。
 * 设置文件：`$DSH_HOME/evolve/user-profile.settings.json`（灌注开关、模式、上限、任务画像绑定、跳过范围）。
 *
 * 浏览器半边（dsh-profile-panel）只通过下面这些 HTTP 路由读写，浏览器从不传路径：
 *   GET  /dsh-profile-panel/api/list               名册
 *   GET  /dsh-profile-panel/api/read?id=…          读一份
 *   POST /dsh-profile-panel/api/write              整篇写回（写前 .bak）
 *   POST /dsh-profile-panel/api/create             新建任务画像
 *   POST /dsh-profile-panel/api/rename             改名（标题＋文件名）
 *   POST /dsh-profile-panel/api/delete             删除（改名归档，可找回）
 *   GET/POST /dsh-profile-panel/api/settings       设置
 *   GET  /dsh-profile-panel/api/presets            模式清单（勾选用）
 *   GET  /dsh-profile-panel/api/workspaces         工作空间清单（绑定用）
 *   GET  /dsh-profile-panel/api/session-state      本会话是否静音
 *   POST /dsh-profile-panel/api/session-mute       开／关本会话
 *
 * 注入（dsh-profile-inject）读同一份设置文件；设置的默认值＝改造前的行为（上限默认 0＝不截断）。
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/** Cordis 插件名。 */
export const name = 'dsh-profile-panel'
/** 显式声明空 inject：webServer 不是硬依赖，拿不到就只在非 web 组合里不注册路由。 */
export const inject = []

const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const DATA_HOME = join(DSH_HOME, 'evolve')
const PROFILE_FILE = join(DATA_HOME, 'user-profile.md')
const PROFILE_DIR = join(DATA_HOME, 'user-profile.d')
const SETTINGS_FILE = join(DATA_HOME, 'user-profile.settings.json')
const API_PREFIX = '/dsh-profile-panel/api'
const MAX_CONTENT_BYTES = 128 * 1024
const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/
const BACKUP_SUFFIX = '.bak'

/** 设置的默认值：只对 evolve 模式注入；用户可在面板改。 */
export const DEFAULT_SETTINGS = {
  enabled: true,
  presets: ['evolve'],
  maxChars: 0,
  injectTaskProfile: false,
  bindings: {},
  skipWorkspaces: [],
  skipSessions: [],
}

function readText(file) {
  try {
    return existsSync(file) ? readFileSync(file, 'utf8') : ''
  } catch {
    return ''
  }
}

function backup(file) {
  if (existsSync(file)) copyFileSync(file, file + BACKUP_SUFFIX)
}

/** id → 文件路径；id 只允许 general 与小写 slug，路径不外泄给浏览器。 */
export function profilePath(id) {
  return id === 'general' ? PROFILE_FILE : join(PROFILE_DIR, `${id}.md`)
}

/** 文档标题：第一行 `# `；没有就是 id。 */
function titleOf(id, text) {
  const m = /^#\s+(.+)$/m.exec(text || '')
  if (m && m[1].trim() !== '') return m[1].trim()
  return id === 'general' ? '通用画像' : id
}

/** 条目数：按「行首数字.」数（与面板解析同口径，不读文件正文结构）。 */
function countEntries(text) {
  const m = String(text || '').match(/^\s*\d+\./gm)
  return m ? m.length : 0
}

function listProfiles() {
  const out = []
  const general = readText(PROFILE_FILE)
  out.push({
    id: 'general',
    kind: 'general',
    title: titleOf('general', general),
    exists: existsSync(PROFILE_FILE),
    path: PROFILE_FILE,
    chars: Array.from(general).length,
    entries: countEntries(general),
  })
  let names = []
  try {
    names = readdirSync(PROFILE_DIR)
  } catch {
    names = []
  }
  const ids = names
    .filter((n) => n.endsWith('.md') && !n.includes('.bak-') && !n.includes('.deleted-'))
    .map((n) => n.slice(0, -3))
    .filter((id) => ID_RE.test(id))
    .sort()
  for (const id of ids) {
    const text = readText(profilePath(id))
    out.push({
      id,
      kind: 'task',
      title: titleOf(id, text),
      exists: true,
      path: profilePath(id),
      chars: Array.from(text).length,
      entries: countEntries(text),
    })
  }
  return out
}

function cleanList(value) {
  if (!Array.isArray(value)) return []
  const out = []
  for (const item of value) {
    const s = String(item == null ? '' : item).trim()
    if (s && out.indexOf(s) === -1) out.push(s)
  }
  return out
}

function clampInt(value, min, max, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n)))
}

function cleanBindings(value, fallback) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback
  const out = {}
  for (const key of Object.keys(value)) {
    if (!ID_RE.test(key)) continue
    out[key] = cleanList(value[key])
  }
  return out
}

/** 读设置；文件缺省或坏掉就退回默认值（绝不因设置坏掉影响画像读取）。 */
export function loadSettings() {
  let raw = null
  try {
    raw = JSON.parse(readText(SETTINGS_FILE) || 'null')
  } catch {
    raw = null
  }
  const src = raw && typeof raw === 'object' ? raw : {}
  return {
    enabled: src.enabled === undefined ? DEFAULT_SETTINGS.enabled : Boolean(src.enabled),
    presets: src.presets === undefined ? DEFAULT_SETTINGS.presets.slice() : cleanList(src.presets),
    maxChars: clampInt(src.maxChars, 0, 200000, DEFAULT_SETTINGS.maxChars),
    injectTaskProfile: src.injectTaskProfile === undefined ? DEFAULT_SETTINGS.injectTaskProfile : Boolean(src.injectTaskProfile),
    bindings: cleanBindings(src.bindings, {}),
    skipWorkspaces: cleanList(src.skipWorkspaces),
    skipSessions: cleanList(src.skipSessions),
  }
}

/** 写设置（只覆盖传进来的字段，其余沿用现值）。 */
export function saveSettings(patch) {
  const cur = loadSettings()
  const next = {
    enabled: patch && patch.enabled !== undefined ? Boolean(patch.enabled) : cur.enabled,
    presets: patch && patch.presets !== undefined ? cleanList(patch.presets) : cur.presets,
    maxChars: patch && patch.maxChars !== undefined ? clampInt(patch.maxChars, 0, 200000, cur.maxChars) : cur.maxChars,
    injectTaskProfile: patch && patch.injectTaskProfile !== undefined ? Boolean(patch.injectTaskProfile) : cur.injectTaskProfile,
    bindings: patch && patch.bindings !== undefined ? cleanBindings(patch.bindings, cur.bindings) : cur.bindings,
    skipWorkspaces: patch && patch.skipWorkspaces !== undefined ? cleanList(patch.skipWorkspaces) : cur.skipWorkspaces,
    skipSessions: patch && patch.skipSessions !== undefined ? cleanList(patch.skipSessions) : cur.skipSessions,
  }
  mkdirSync(dirname(SETTINGS_FILE), { recursive: true })
  writeFileSync(SETTINGS_FILE + '.tmp', JSON.stringify(next, null, 2) + '\n', 'utf8')
  renameSync(SETTINGS_FILE + '.tmp', SETTINGS_FILE)
  return next
}

function isLocal(req) {
  const addr = (req.socket && req.socket.remoteAddress) || ''
  return addr === '' || addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1'
}

function sendJson(res, code, value) {
  const body = JSON.stringify(value)
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_CONTENT_BYTES) {
        reject(new Error('内容超过上限'))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', (error) => reject(error))
  })
}

/** 从中文名或 slug 推一个可用 slug。 */
function slugOf(name, slug) {
  const given = String(slug || '').trim().toLowerCase()
  if (given) return given
  const ascii = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  return ascii || 'task-' + Date.now().toString(36)
}

/** 任务画像文件改名（含 .bak），并把设置里的绑定键迁移过去。 */
function renameTask(id, name, slug) {
  const oldPath = profilePath(id)
  const nextSlug = slugOf(name, slug)
  if (!ID_RE.test(nextSlug)) throw new Error('slug 只能用小写字母、数字和短横线')
  const newPath = profilePath(nextSlug)
  if (nextSlug !== id && existsSync(newPath)) throw new Error('已有同名的任务画像：' + nextSlug)
  backup(oldPath)
  const text = readText(oldPath)
  const titled = /^#\s/m.test(text) ? text.replace(/^#\s+.*$/m, '# ' + String(name).trim()) : '# ' + String(name).trim() + '\n\n' + text
  writeFileSync(oldPath, titled, 'utf8')
  if (nextSlug !== id) {
    mkdirSync(dirname(newPath), { recursive: true })
    renameSync(oldPath, newPath)
    if (existsSync(oldPath + BACKUP_SUFFIX)) {
      try { renameSync(oldPath + BACKUP_SUFFIX, newPath + BACKUP_SUFFIX) } catch { /* 备份搬不动不影响正文 */ }
    }
    const settings = loadSettings()
    if (settings.bindings[id] !== undefined) {
      const bindings = { ...settings.bindings, [nextSlug]: settings.bindings[id] }
      delete bindings[id]
      saveSettings({ bindings })
    }
  }
  return { id: nextSlug, path: newPath, title: String(name).trim() }
}

function workspacesFromStorage() {
  try {
    const raw = JSON.parse(readFileSync(join(DSH_HOME, 'storages', 'workspace.json'), 'utf8'))
    const table = raw && raw.tables && raw.tables.workspaces
    if (!table || typeof table !== 'object') return []
    return Object.keys(table).map((id) => ({
      id,
      title: String(table[id].title || ''),
      path: String(table[id].path || ''),
    })).filter((w) => w.path)
  } catch {
    return []
  }
}

/** 注册路由：webServer 不是硬依赖，apply 期常常还拿不到，走 ctx.inject 等到位。 */
function registerRoutes(ctx) {
  const direct = typeof ctx.get === 'function' ? ctx.get('webServer') : undefined
  if (direct && typeof direct.register === 'function') {
    registerOn(ctx, direct)
    return
  }
  if (typeof ctx.inject === 'function') {
    ctx.inject(['webServer'], (hostCtx) => {
      const webServer = hostCtx && (hostCtx.webServer || (typeof hostCtx.get === 'function' ? hostCtx.get('webServer') : undefined))
      if (!webServer || typeof webServer.register !== 'function') return
      registerOn(hostCtx, webServer)
    })
  }
}

function registerOn(ctx, webServer) {
  const route = (path, handler) => {
    ctx.effect(() => webServer.register({ kind: 'exact', path: API_PREFIX + path, handler }), 'dsh-profile-panel: ' + path)
  }

  route('/list', (req, res) => {
    if (!isLocal(req)) return sendJson(res, 403, { ok: false, error: '只接受本机请求' })
    if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: '只支持 GET' })
    sendJson(res, 200, { ok: true, home: DATA_HOME, profiles: listProfiles(), settings: loadSettings() })
  })

  route('/read', (req, res) => {
    if (!isLocal(req)) return sendJson(res, 403, { ok: false, error: '只接受本机请求' })
    if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: '只支持 GET' })
    const id = new URL(req.url || '/', 'http://localhost').searchParams.get('id') || 'general'
    if (id !== 'general' && !ID_RE.test(id)) return sendJson(res, 400, { ok: false, error: 'id 不合法：' + id })
    const path = profilePath(id)
    sendJson(res, 200, { ok: true, id, path, exists: existsSync(path), content: readText(path) })
  })

  route('/write', async (req, res) => {
    if (!isLocal(req)) return sendJson(res, 403, { ok: false, error: '只接受本机请求' })
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: '只支持 POST' })
    try {
      const body = JSON.parse((await readBody(req)) || '{}')
      const id = String(body.id || '')
      if (id !== 'general' && !ID_RE.test(id)) return sendJson(res, 400, { ok: false, error: 'id 不合法：' + id })
      const content = String(body.content == null ? '' : body.content)
      const bytes = Buffer.byteLength(content, 'utf8')
      if (bytes > MAX_CONTENT_BYTES) return sendJson(res, 413, { ok: false, error: `内容超过 ${MAX_CONTENT_BYTES} 字节上限` })
      const path = profilePath(id)
      backup(path)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, content, 'utf8')
      sendJson(res, 200, { ok: true, id, path, bytes })
    } catch (error) {
      sendJson(res, 400, { ok: false, error: String((error && error.message) || error) })
    }
  })

  route('/create', async (req, res) => {
    if (!isLocal(req)) return sendJson(res, 403, { ok: false, error: '只接受本机请求' })
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: '只支持 POST' })
    try {
      const body = JSON.parse((await readBody(req)) || '{}')
      const title = String(body.name || '').trim().slice(0, 40)
      if (!title) return sendJson(res, 400, { ok: false, error: '名称不能为空' })
      const slug = slugOf(title, body.slug)
      if (!ID_RE.test(slug)) return sendJson(res, 400, { ok: false, error: 'slug 只能用小写字母、数字和短横线' })
      let unique = slug
      let n = 2
      while (existsSync(profilePath(unique))) { unique = slug + '-' + n; n += 1 }
      const path = profilePath(unique)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, `# ${title}\n\n`, 'utf8')
      sendJson(res, 200, { ok: true, id: unique, path, title })
    } catch (error) {
      sendJson(res, 400, { ok: false, error: String((error && error.message) || error) })
    }
  })

  route('/rename', async (req, res) => {
    if (!isLocal(req)) return sendJson(res, 403, { ok: false, error: '只接受本机请求' })
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: '只支持 POST' })
    try {
      const body = JSON.parse((await readBody(req)) || '{}')
      const id = String(body.id || '')
      if (id === 'general') return sendJson(res, 400, { ok: false, error: '通用画像只有一份，标题在面板里改' })
      if (!ID_RE.test(id) || !existsSync(profilePath(id))) return sendJson(res, 404, { ok: false, error: '没有这份任务画像：' + id })
      const name = String(body.name || '').trim()
      if (!name) return sendJson(res, 400, { ok: false, error: '名称不能为空' })
      const renamed = renameTask(id, name, body.slug)
      sendJson(res, 200, { ok: true, ...renamed })
    } catch (error) {
      sendJson(res, 400, { ok: false, error: String((error && error.message) || error) })
    }
  })

  route('/delete', async (req, res) => {
    if (!isLocal(req)) return sendJson(res, 403, { ok: false, error: '只接受本机请求' })
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: '只支持 POST' })
    try {
      const body = JSON.parse((await readBody(req)) || '{}')
      const id = String(body.id || '')
      if (id === 'general') return sendJson(res, 400, { ok: false, error: '通用画像不能删除' })
      if (!ID_RE.test(id) || !existsSync(profilePath(id))) return sendJson(res, 404, { ok: false, error: '没有这份任务画像：' + id })
      const path = profilePath(id)
      const archived = `${path}.deleted-${Date.now()}`
      renameSync(path, archived)
      const settings = loadSettings()
      if (settings.bindings[id] !== undefined) {
        const bindings = { ...settings.bindings }
        delete bindings[id]
        saveSettings({ bindings })
      }
      sendJson(res, 200, { ok: true, id, archived })
    } catch (error) {
      sendJson(res, 400, { ok: false, error: String((error && error.message) || error) })
    }
  })

  route('/settings', async (req, res) => {
    if (!isLocal(req)) return sendJson(res, 403, { ok: false, error: '只接受本机请求' })
    if (req.method === 'GET') return sendJson(res, 200, { ok: true, settings: loadSettings(), defaults: DEFAULT_SETTINGS })
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: '只支持 GET／POST' })
    try {
      const body = JSON.parse((await readBody(req)) || '{}')
      sendJson(res, 200, { ok: true, settings: saveSettings(body) })
    } catch (error) {
      sendJson(res, 400, { ok: false, error: String((error && error.message) || error) })
    }
  })

  route('/presets', async (req, res) => {
    if (!isLocal(req)) return sendJson(res, 403, { ok: false, error: '只接受本机请求' })
    if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: '只支持 GET' })
    let service
    try {
      service = typeof ctx.get === 'function' ? ctx.get('agentPresets') : undefined
    } catch {
      service = undefined
    }
    if (!service || typeof service.remoteExportList !== 'function') {
      return sendJson(res, 200, { ok: true, presets: [], unavailable: '宿主没有 agentPresets 服务（这个 profile 没装 agent-presets）' })
    }
    try {
      const roster = await service.remoteExportList()
      const rows = roster && Array.isArray(roster.presets) ? roster.presets : []
      const presets = rows
        .map((row) => ({
          id: String(row.id || ''),
          name: typeof row.name === 'string' ? row.name : '',
          description: typeof row.description === 'string' ? row.description : '',
          broken: typeof row.broken === 'string' ? row.broken : '',
          isDefault: Boolean(row.isDefault),
        }))
        .filter((row) => row.id !== '')
      sendJson(res, 200, { ok: true, presets })
    } catch (error) {
      sendJson(res, 200, { ok: true, presets: [], unavailable: String((error && error.message) || error) })
    }
  })

  route('/workspaces', (req, res) => {
    if (!isLocal(req)) return sendJson(res, 403, { ok: false, error: '只接受本机请求' })
    if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: '只支持 GET' })
    let list = []
    try {
      const registry = typeof ctx.get === 'function' ? ctx.get('workspaceRegistry') : undefined
      if (registry && typeof registry.list === 'function') {
        for (const ws of registry.list()) {
          list.push({ id: String(ws.id || ''), title: String(ws.title || ''), path: String(ws.path || '') })
        }
      }
    } catch {
      /* 注册表不可用就退回文件 */
    }
    if (list.length === 0) list = workspacesFromStorage()
    sendJson(res, 200, { ok: true, workspaces: list })
  })

  route('/session-state', (req, res) => {
    if (!isLocal(req)) return sendJson(res, 403, { ok: false, error: '只接受本机请求' })
    if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: '只支持 GET' })
    const id = new URL(req.url || '/', 'http://localhost').searchParams.get('id') || ''
    const settings = loadSettings()
    const preset = presetLive(id)
    const allowed = settings.presets.length === 0
      || preset === ''
      || settings.presets.indexOf(preset) !== -1
    sendJson(res, 200, {
      ok: true,
      id,
      muted: id !== '' && settings.skipSessions.indexOf(id) !== -1,
      mutedCount: settings.skipSessions.length,
      enabled: settings.enabled,
      preset,
      allowed,
      presets: settings.presets,
    })
  })

  route('/session-mute', async (req, res) => {
    if (!isLocal(req)) return sendJson(res, 403, { ok: false, error: '只接受本机请求' })
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: '只支持 POST' })
    try {
      const body = JSON.parse((await readBody(req)) || '{}')
      const id = String(body.id || '').trim()
      if (!id) return sendJson(res, 400, { ok: false, error: '缺 session id' })
      const cur = loadSettings()
      const list = cur.skipSessions.slice()
      const at = list.indexOf(id)
      const muted = body.muted === undefined ? at === -1 : Boolean(body.muted)
      if (muted && at === -1) list.push(id)
      if (!muted && at !== -1) list.splice(at, 1)
      const next = saveSettings({ skipSessions: list })
      sendJson(res, 200, { ok: true, id, muted: next.skipSessions.indexOf(id) !== -1, mutedCount: next.skipSessions.length })
    } catch (error) {
      sendJson(res, 400, { ok: false, error: String((error && error.message) || error) })
    }
  })
}

/** 本会话当前 preset：发布版不落运行态文件，判不出返回 ''（面板按「未限定」处理，不误禁）。 */
function presetLive(id) {
  return ''
}

/** 挂路由。 */
export function apply(ctx) {
  registerRoutes(ctx)
}
