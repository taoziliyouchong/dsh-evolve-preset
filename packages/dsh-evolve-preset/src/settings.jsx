/**
 * 进化模式设置（浏览器半边源码，随 dsh-evolve-preset 的客户端产物一起发布）
 *
 * 设置页里的「进化模式」一节：思考提醒的起始秒数、复查间隔、内容、开关，
 * 以及跨回合查询开关与上下文压缩插件提醒。
 * 数据走宿主路由 /dsh-evolution-settings/api/settings（GET 读、POST 存）。
 */
import { useEffect, useState } from 'react'

const ROUTE_PREFIX = '/dsh-evolution-settings/api'

/** 把路由拼成当前页面挂载点下的路径（锚 document.baseURI，兼容子路径部署）。 */
function api(path) {
  const relative = String(path).replace(/^\/+/, '')
  if (typeof document === 'undefined') return '/' + relative
  return new URL(relative, document.baseURI).pathname
}

/** GET 一个 JSON 接口；宿主按 { ok, ... } 回包，ok === false 时抛出 error 字段。 */
async function getJson(path) {
  const res = await fetch(api(path), { headers: { accept: 'application/json' } })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status))
  return data
}

/** POST 一个 JSON 接口。 */
async function postJson(path, body) {
  const res = await fetch(api(path), {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status))
  return data
}

const S = {
  pane: { display: 'flex', flexDirection: 'column', width: '100%', fontSize: '13px' },
  row: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px',
    padding: '14px 0', borderBottom: '1px solid rgba(127,127,127,.22)',
  },
  label: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 },
  title: { fontWeight: 600 },
  desc: { margin: 0, fontSize: '12px', opacity: 0.65, lineHeight: 1.55 },
  control: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flex: 'none', flexWrap: 'wrap' },
  block: {
    display: 'flex', flexDirection: 'column', gap: '10px',
    padding: '16px 0', borderBottom: '1px solid rgba(127,127,127,.22)',
  },
  blockHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' },
  fieldRow: { display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' },
  field: { display: 'flex', alignItems: 'center', gap: '6px' },
  input: {
    width: '84px', padding: '5px 8px', border: '1px solid rgba(127,127,127,.45)',
    borderRadius: '6px', background: 'transparent', color: 'inherit', font: 'inherit',
  },
  select: {
    padding: '5px 8px', border: '1px solid rgba(127,127,127,.45)',
    borderRadius: '6px', background: 'transparent', color: 'inherit', font: 'inherit',
  },
  check: { width: '16px', height: '16px', margin: 0, accentColor: 'currentColor' },
  actions: { display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '14px' },
  button: {
    padding: '6px 14px', border: '1px solid currentColor', borderRadius: '6px',
    background: 'transparent', color: 'inherit', font: 'inherit', cursor: 'pointer',
  },
  status: { fontSize: '12px', opacity: 0.65 },
  error: { margin: 0, fontSize: '12px', color: '#d94848', wordBreak: 'break-all' },
  note: { margin: 0, paddingTop: '10px', fontSize: '12px', opacity: 0.5 },
  notice: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
    marginBottom: '14px', padding: '12px 14px',
    border: '1px solid rgba(240,160,32,.35)', borderLeft: '3px solid #f0a020',
    borderRadius: '8px', background: 'rgba(240,160,32,.08)',
  },
  noticeTitle: { fontWeight: 600, marginBottom: '4px' },
  noticeText: { margin: 0, fontSize: '12px', opacity: 0.72, lineHeight: 1.6 },
  noticeClose: {
    flex: 'none', width: '24px', height: '24px', padding: 0, border: 0, borderRadius: '6px',
    background: 'transparent', color: 'inherit', fontSize: '16px', lineHeight: 1, cursor: 'pointer', opacity: 0.6,
  },
}

/** 面板主体。 */
export function EvolutionSettingsSection() {
  const [seconds, setSeconds] = useState(40)
  const [retry, setRetry] = useState(10)
  const [enabled, setEnabled] = useState(true)
  const [content, setContent] = useState('goal')
  const [allow, setAllow] = useState(true)
  const [billion, setBillion] = useState({ installed: false, enabled: false, dismissed: true })
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await getJson(ROUTE_PREFIX + '/settings')
        if (!alive) return
        const settings = (data && data.settings) || {}
        setSeconds(Number(settings.lateBarSeconds) || 40)
        setRetry(Number(settings.lateBarRetrySeconds) || 10)
        setEnabled(settings.lateBarEnabled !== false)
        setContent(settings.lateBarContent === 'full' ? 'full' : 'goal')
        setAllow(settings.allowCrossSessionQuery !== false)
      } catch (e) {
        if (alive) setError(String((e && e.message) || e))
      }
      try {
        const info = await getJson(ROUTE_PREFIX + '/billion-context')
        if (alive) setBillion({
          installed: info.installed === true,
          enabled: info.enabled === true,
          dismissed: info.bannerDismissed === true,
        })
      } catch { /* 没这个接口就不显示横幅 */ }
    })()
    return () => { alive = false }
  }, [])

  async function save() {
    setBusy(true)
    setError(null)
    setStatus('')
    try {
      const data = await postJson(ROUTE_PREFIX + '/settings', {
        lateBarSeconds: Number(seconds),
        lateBarRetrySeconds: Number(retry),
        lateBarEnabled: enabled === true,
        lateBarContent: content === 'full' ? 'full' : 'goal',
        allowCrossSessionQuery: allow === true,
      })
      const settings = (data && data.settings) || {}
      setSeconds(Number(settings.lateBarSeconds) || 40)
      setRetry(Number(settings.lateBarRetrySeconds) || 10)
      setEnabled(settings.lateBarEnabled !== false)
      setContent(settings.lateBarContent === 'full' ? 'full' : 'goal')
      setAllow(settings.allowCrossSessionQuery !== false)
      setStatus('已保存；思考提醒从下一轮起生效。')
    } catch (e) {
      setError(String((e && e.message) || e))
    } finally {
      setBusy(false)
    }
  }

  async function dismissBillion() {
    setBillion((prev) => ({ ...prev, dismissed: true }))
    try {
      await postJson(ROUTE_PREFIX + '/billion-context', { action: 'dismissBanner' })
    } catch { /* 本地已收起，记不上也不影响这次 */ }
  }

  return (
    <div style={S.pane}>
      {billion.installed && billion.enabled && !billion.dismissed ? (
        <div style={S.notice}>
          <div>
            <div style={S.noticeTitle}>别用上下文压缩插件</div>
            <p style={S.noticeText}>billion-context（bili）会让 token 消耗更大，效果也更差。</p>
          </div>
          <button type="button" style={S.noticeClose} aria-label="关闭提醒" onClick={() => void dismissBillion()}>×</button>
        </div>
      ) : null}
      <div style={S.block}>
        <div style={S.blockHead}>
          <div style={S.title}>思考提醒</div>
          <label style={S.field}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              style={S.check}
              aria-label="启用思考提醒"
            />
            <span style={S.desc}>{enabled ? '开启' : '关闭'}</span>
          </label>
        </div>
        <p style={S.desc}>模型思考超过起始秒数时先插入一版质询——四样全齐才发；没齐就每隔「间隔」再看一次，直到齐了或正文先出来。这一版两头标「自动插入」，不是正文。</p>
        <div style={S.fieldRow}>
          <label style={S.field}>
            <span style={S.desc}>起始</span>
            <input
              type="number"
              min="5"
              max="600"
              step="1"
              value={seconds}
              disabled={!enabled}
              onChange={(e) => setSeconds(e.target.value)}
              style={{ ...S.input, opacity: enabled ? 1 : 0.5 }}
              aria-label="思考提醒秒数"
            />
            <span style={S.desc}>秒</span>
          </label>
          <label style={S.field}>
            <span style={S.desc}>间隔</span>
            <input
              type="number"
              min="5"
              max="120"
              step="1"
              value={retry}
              disabled={!enabled}
              onChange={(e) => setRetry(e.target.value)}
              style={{ ...S.input, width: '64px', opacity: enabled ? 1 : 0.5 }}
              aria-label="质询间隔秒数"
            />
            <span style={S.desc}>秒</span>
          </label>
          <label style={S.field}>
            <span style={S.desc}>内容</span>
            <select
              value={content}
              disabled={!enabled}
              onChange={(e) => setContent(e.target.value)}
              style={{ ...S.select, opacity: enabled ? 1 : 0.5 }}
              aria-label="提醒内容"
            >
              <option value="goal">只报一句状态</option>
              <option value="full">完整对齐栏</option>
            </select>
          </label>
        </div>
      </div>

      <div style={S.row}>
        <div style={S.label}>
          <div style={S.title}>跨回合查询</div>
          <p style={S.desc}>关闭后，会话检索、导出、恢复三件工具都不可调用。</p>
        </div>
        <label style={S.control}>
          <input
            type="checkbox"
            checked={allow}
            onChange={(e) => setAllow(e.target.checked)}
            style={S.check}
            aria-label="允许跨回合查询"
          />
          <span style={S.desc}>{allow ? '允许' : '禁止'}</span>
        </label>
      </div>

      <div style={S.actions}>
        <button type="button" style={S.button} disabled={busy} onClick={() => void save()}>
          {busy ? '保存中…' : '保存'}
        </button>
        {error
          ? <p style={S.error} role="alert">{error}</p>
          : status
            ? <span style={S.status}>{status}</span>
            : null}
      </div>

      <p style={S.note}>思考提醒只对进化模式生效；内容可选只质询本层目标或完整对齐栏。跨回合查询开关对本机全局生效。</p>
    </div>
  )
}

/** 需要的客户端服务（settings.section 挂在 slots 上）。 */
export const inject = ['slots']

/**
 * 把面板挂进设置页。
 * @param ctx - 客户端根上下文。
 */
export function apply(ctx) {
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'evolution-settings',
    order: 60,
    label: '进化模式',
  }, EvolutionSettingsSection))
}
