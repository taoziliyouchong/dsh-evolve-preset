/**
 * dsh-profile-inject —— 用户画像注入（按会话实时模式收口）
 *
 * 画像注入放在宿主插件里而不是外部 hook：判据直接读 Session 投影（内存真值），
 * 只有等于配置里允许的模式才注入；判不出就不注（宁缺不漏）。
 *
 * 设置文件 `$DSH_HOME/evolve/user-profile.settings.json`（画像面板的「设置」页写）。
 * 文件缺失或坏掉＝默认值：所有模式都灌、不截断（上限 0）、任务画像只列类别名。
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { createUserMessage } from '@deepseek-ai/dsh-llm'

/** Cordis 插件名。 */
export const name = 'dsh-profile-inject'
/** 需要的服务（sessionProjections 走可选获取，缺了就不注，不拦加载）。 */
export const inject = []

const HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const DATA_HOME = join(HOME, 'evolve')
const PROFILE = join(DATA_HOME, 'user-profile.md')
const DIR = join(DATA_HOME, 'user-profile.d')
const SETTINGS = join(DATA_HOME, 'user-profile.settings.json')

/** 默认值：只对 evolve 模式注入；用户可在设置文件或面板里改。 */
const DEFAULT_SETTINGS = {
  enabled: true,
  presets: ['evolve'],
  maxChars: 0,
  injectTaskProfile: false,
  bindings: {},
  skipWorkspaces: [],
  skipSessions: [],
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

/** 读设置；文件缺省／坏掉就退回默认值（绝不让设置坏掉影响注入判据）。 */
function loadSettings() {
  let raw = null
  try {
    raw = JSON.parse(readFileSync(SETTINGS, 'utf8') || 'null')
  } catch {
    raw = null
  }
  const src = raw && typeof raw === 'object' ? raw : {}
  const bindings = {}
  if (src.bindings && typeof src.bindings === 'object' && !Array.isArray(src.bindings)) {
    for (const key of Object.keys(src.bindings)) bindings[key] = cleanList(src.bindings[key])
  }
  return {
    enabled: src.enabled === undefined ? DEFAULT_SETTINGS.enabled : Boolean(src.enabled),
    presets: src.presets === undefined ? DEFAULT_SETTINGS.presets.slice() : cleanList(src.presets),
    maxChars: Number.isFinite(Number(src.maxChars)) ? Math.max(0, Math.round(Number(src.maxChars))) : DEFAULT_SETTINGS.maxChars,
    injectTaskProfile: src.injectTaskProfile === undefined ? DEFAULT_SETTINGS.injectTaskProfile : Boolean(src.injectTaskProfile),
    bindings,
    skipWorkspaces: cleanList(src.skipWorkspaces),
    skipSessions: cleanList(src.skipSessions),
  }
}

/** 本会话当前跑的是哪个 preset：只读 Session 投影（内存真值），判不出返回 ''。 */
function livePreset(ctx, agent) {
  try {
    if (!agent || !agent.session) return ''
    // DSH 0.2.2 起的官方入口优先：agentPresets.presetForSession（注册表级 stateOf 已弃用）
    try {
      const presets = typeof ctx.get === 'function' ? ctx.get('agentPresets') : undefined
      if (presets && typeof presets.presetForSession === 'function') {
        const got = presets.presetForSession(agent.session)
        const value = typeof got === 'string' ? got : (got && typeof got.id === 'string' ? got.id : '')
        if (typeof value === 'string' && value.length > 0) return value
      }
    } catch {
      /* 没有 agentPresets：退回投影 */
    }
    const projections = typeof ctx.get === 'function' ? ctx.get('sessionProjections') : undefined
    const value = projections && typeof projections.stateOf === 'function'
      ? projections.stateOf(agent.session, 'agentPreset')
      : undefined
    return typeof value === 'string' ? value : ''
  } catch {
    return ''
  }
}

/** 会话身份与工作目录：身份来自 session.id，cwd 来自档头（判不出就空）。 */
function sessionInfo(agent) {
  try {
    const session = agent && agent.session
    const id = session && typeof session.id === 'string' ? session.id : ''
    const cwd = session && session.header && typeof session.header.cwd === 'string' ? session.header.cwd : ''
    return { id, cwd }
  } catch {
    return { id: '', cwd: '' }
  }
}

/** 任务画像类别清单：slug 后带首行标题（去掉末尾「画像」），判断时看得到每类管什么。 */
function taskKinds() {
  try {
    return readdirSync(DIR)
      .filter((f) => f.endsWith('.md') && !f.includes('.bak-') && !f.includes('.deleted-'))
      .map((f) => {
        const slug = f.replace(/\.md$/, '')
        const title = taskTitle(slug).replace(/画像$/, '')
        return title && title !== slug ? `${slug}（${title}）` : slug
      })
      .join('/')
  } catch {
    return ''
  }
}

/** 某份任务画像的标题（第一行 `# `），取不到就用 slug。 */
function taskTitle(slug) {
  try {
    const text = readFileSync(join(DIR, slug + '.md'), 'utf8')
    const m = /^#\s+(.+)$/m.exec(text)
    return m && m[1].trim() ? m[1].trim() : slug
  } catch {
    return slug
  }
}

/** 绑定里命中本会话工作目录的任务画像 slug（顺序按 settings 里的键顺序）。 */
function matchedTasks(settings, cwd) {
  const c = String(cwd || '').toLowerCase()
  if (!c) return []
  const out = []
  for (const slug of Object.keys(settings.bindings)) {
    const list = settings.bindings[slug] || []
    if (list.length === 0) continue
    if (list.some((w) => c.indexOf(String(w).toLowerCase()) !== -1)) out.push(slug)
  }
  return out
}

/** 开场／恢复要注入的那段：通用画像正文 + 任务画像类别清单（+ 绑定的任务画像正文）。 */
function profileText(settings, cwd) {
  let profile = ''
  try {
    profile = readFileSync(PROFILE, 'utf8').trim()
  } catch {
    return ''
  }
  const maxChars = settings.maxChars
  let truncated = false
  if (maxChars > 0 && profile.length > maxChars) {
    profile = profile.slice(0, maxChars)
    truncated = true
  }
  const kinds = taskKinds()
  let text = '【对齐时刻·开场/恢复】你的通用画像正文如下（已确认的要求与边界，按它判断；不用再 read 通用画像）：\n'
    + profile
    + (truncated ? `\n（画像超过 ${maxChars} 字，已截断；完整版：${PROFILE}）` : '')
    + (kinds ? `\n任务画像：属 ${join(DIR, '<类别>.md')} 之一才读（现有类别：${kinds}）。` : '')
  // 任务画像正文：绑了工作空间就随会话注入，没绑＝不注入。
  for (const slug of matchedTasks(settings, cwd)) {
    let body = ''
    try {
      body = readFileSync(join(DIR, slug + '.md'), 'utf8').trim()
    } catch {
      body = ''
    }
    if (!body) continue
    const limited = maxChars > 0 && body.length > maxChars ? body.slice(0, maxChars) + '…' : body
    text += `\n\n【任务画像·${taskTitle(slug)}】（按工作空间绑定注入）\n${limited}`
  }
  return text
}

/** 每个 agent 只注一次（恢复会话会换新 agent，等于「开场/恢复」再注一次）。 */
const injected = new WeakSet()

/** 把实时模式写一份给外部进程（hook 之类）用；值没变就不重写。 */
const published = new Map()
function publishLive(session, preset) {
  try {
    if (!session || !session.id || !preset) return
    if (published.get(session.id) === preset) return
    const dir = join(DATA_HOME, 'codex-hooks', 'state')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, session.id + '.preset-live'), preset, 'utf8')
    published.set(session.id, preset)
  } catch {
    /* 写不上就退回档案判据，不拦主流程 */
  }
}

/** 这一轮要不要注：开关、模式、会话静音、不灌注工作空间。 */
function shouldInject(settings, preset, info) {
  if (!settings.enabled) return false
  if (settings.presets.length > 0 && settings.presets.indexOf(preset) === -1) return false
  if (info.id && settings.skipSessions.indexOf(info.id) !== -1) return false
  const c = String(info.cwd || '').toLowerCase()
  if (c) {
    for (const word of settings.skipWorkspaces) {
      const w = String(word).toLowerCase()
      if (w && c.indexOf(w) !== -1) return false
    }
  }
  return true
}

export function apply(ctx) {
  // agent 一建出来就把实时模式写一份，给外部进程读「当前模式」。
  try {
    ctx.on('agent/created', ({ agent }) => {
      try {
        if (agent && agent.session) publishLive(agent.session, livePreset(ctx, agent))
      } catch { /* 拿不到就不写 */ }
    })
  } catch { /* 没有 agent 事件：只靠 pre-step */ }

  // 每步先算实时模式；满足设置且本 agent 还没注过，才把画像挂到这一步的入参上。
  try {
    ctx.on('agent/pre-step', async ({ agent }, next) => {
      const downstream = await next()
      try {
        if (!agent || !agent.session) return downstream
        const preset = livePreset(ctx, agent)
        publishLive(agent.session, preset)
        if (downstream.kind !== 'enter') return downstream
        const settings = loadSettings()
        const info = sessionInfo(agent)
        if (!shouldInject(settings, preset, info)) return downstream
        if (injected.has(agent)) return downstream
        const text = profileText(settings, info.cwd)
        if (!text) return downstream
        injected.add(agent)
        const message = createUserMessage({
          content: [{ type: 'text', text }],
          source: { kind: 'hooks-codex' },
        })
        return { ...downstream, messages: [...downstream.messages, message] }
      } catch {
        /* 注不进去就退回「没注」——不拦主流程 */
        return downstream
      }
    })
  } catch { /* 没有 agent 事件：不注 */ }
}
