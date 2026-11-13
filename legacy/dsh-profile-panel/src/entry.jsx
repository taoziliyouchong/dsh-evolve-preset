/**
 * 用户画像设置面板（浏览器半边源码）。
 * 打包成 lib/client.js（window.__ModuleLoader__.load({id,factory}) 格式，id 等于包名）。
 * 数据走宿主 dsh-profile-panel 的 HTTP 路由（list/read/write/create/rename/delete/settings/presets/workspaces），
 * 面板与文件之间只有这一个接口；画像文件始终是真身，面板只做「解析 → 改 → 整篇写回」。
 *
 * 版式（2026-11-08 第二版，按实际体验改）：
 *   左栏名册（通用／任务画像分组；进设置页时收起）→ 标题行（画像名 · 设置）；加条目在每一节标题行的「＋」
 *   → 搜索 ＋ 条目/原文 ＋ 全部展开 → 按节分组：节标题（可收）＋条目行（默认显示全文前 3 行，
 *   点一下展开全文，展开后才出现编辑／收起）→ 编辑卡 → 底部文件与保存状态。
 */
import { Fragment, useEffect, useRef, useState } from 'react'
import {
  addItem, docTitle, moveItem, moveItemToSection, parse, preamble, removeItem,
  removeParagraph, sections, serialize, setItemBody,
  setTextBody, setTitle, stats,
} from './profile-text.js'

/** 把路由拼成当前页面挂载点下的路径（锚 document.baseURI，保留查询串）。 */
function api(path) {
  const relative = String(path).replace(/^\/+/, '')
  if (typeof document === 'undefined') return '/' + relative
  const url = new URL(relative, document.baseURI)
  return url.pathname + url.search
}

async function getJson(path) {
  const res = await fetch(api(path), { headers: { accept: 'application/json' } })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status))
  return data
}

async function postJson(path, body) {
  const res = await fetch(api(path), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status))
  return data
}

/** 宿主路由还没加载时 getJson 会拿到 HTTP 404；翻成人话。 */
function friendlyHostError(e) {
  const s = String((e && e.message) || e)
  if (s.indexOf('HTTP 404') !== -1) return '宿主还没加载新路由（HTTP 404）：重启 dsh 后再进这一页'
  return s
}

const API = '/dsh-profile-panel/api'

const CSS = `
.pp-root, .pp-root * { box-sizing:border-box; }
.pp-root { display:flex; gap:26px; align-items:flex-start; width:100%; font-size:13px; line-height:1.55;
  color:var(--dsw-alias-label-primary); }
.pp-roster { flex:0 0 190px; display:flex; flex-direction:column; gap:1px; }
.pp-grouplabel { margin:16px 0 5px 10px; font-size:11px; color:var(--dsw-alias-label-secondary); }
.pp-grouplabel:first-child { margin-top:2px; }
.pp-row { display:flex; align-items:center; gap:2px; width:100%;
  padding:0 6px 0 0; border:0; border-radius:6px; background:none; color:inherit;
  font:inherit; text-align:left; }
.pp-row:hover { background:var(--dsw-alias-bg-layer-1); }
.pp-row[aria-current="true"] { background:var(--dsw-alias-bg-layer-2); }
.pp-row[aria-current="true"] .pp-rowmain { font-weight:600; }
.pp-rowmain { flex:1 1 auto; min-width:0; display:flex; justify-content:space-between; align-items:center; gap:8px;
  padding:5px 6px 5px 10px; border:0; border-radius:6px; background:none; color:inherit;
  font:inherit; text-align:left; cursor:pointer; }
.pp-rowdel { flex:0 0 auto; padding:0 3px; border:0; background:none; color:var(--dsw-alias-label-secondary);
  font:inherit; font-size:13px; line-height:1; cursor:pointer; opacity:0; }
.pp-row:hover .pp-rowdel, .pp-row[aria-current="true"] .pp-rowdel { opacity:.6; }
.pp-rowdel:hover { color:var(--dsw-alias-state-error-primary); opacity:1; }
.pp-rname { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pp-rnum { font-size:11px; font-weight:400; color:var(--dsw-alias-label-secondary); }
.pp-newlayer { display:flex; flex-direction:column; gap:5px; padding:4px 6px; }
.pp-newlayerbtn { margin:2px 4px; padding:2px 0; text-align:left; }
.pp-pane { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; gap:12px; }
.pp-head { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
.pp-titlewrap { min-width:0; }
.pp-titlebtn { display:block; margin:0; padding:0; border:0; border-radius:4px; background:none; color:inherit;
  font:inherit; font-size:15px; font-weight:600; line-height:1.3; text-align:left; cursor:pointer; }
.pp-titlebtn:hover { text-decoration:underline dotted var(--dsw-alias-border-l2); text-underline-offset:3px; }
.pp-titleinput { width:260px; max-width:100%; padding:2px 6px; border:1px solid var(--dsw-alias-border-l1);
  border-radius:6px; background:var(--dsw-alias-bg-base); color:inherit; font:inherit; font-size:15px; font-weight:600; }
.pp-titleinput:focus { outline:none; border-color:var(--dsw-alias-brand-primary); }
.pp-sub { margin:3px 0 0; font-size:12px; color:var(--dsw-alias-label-secondary); word-break:break-all; }
.pp-headacts { display:flex; gap:14px; align-items:center; padding-top:3px; }
.pp-link { padding:0; border:0; background:none; color:var(--dsw-alias-label-primary);
  font:inherit; font-size:12px; cursor:pointer; white-space:nowrap; }
.pp-link.primary { color:var(--dsw-alias-brand-primary); }
.pp-link.danger { color:var(--dsw-alias-state-error-primary); }
.pp-link:disabled { opacity:.45; cursor:default; }
.pp-toolbar { display:flex; gap:14px; align-items:center; border-bottom:1px solid var(--dsw-alias-border-l1);
  padding-bottom:6px; }
.pp-search { flex:1 1 auto; min-width:0; padding:3px 0; border:0;
  border-bottom:1px solid var(--dsw-alias-border-l1); background:none; color:inherit;
  font:inherit; font-size:12px; }
.pp-search:focus { outline:none; border-bottom-color:var(--dsw-alias-brand-primary); }
.pp-tabs { display:flex; flex:0 0 auto; border:1px solid var(--dsw-alias-border-l1); border-radius:6px; overflow:hidden; }
.pp-tab { padding:2px 9px; border:0; background:none; color:inherit; font:inherit; font-size:11px; cursor:pointer; }
.pp-tab + .pp-tab { border-left:1px solid var(--dsw-alias-border-l1); }
.pp-tab[aria-selected="true"] { background:var(--dsw-alias-bg-layer-2); font-weight:500; }
.pp-list { display:flex; flex-direction:column; border:1px solid var(--dsw-alias-border-l1);
  border-radius:8px; overflow:hidden; background:var(--dsw-alias-bg-base); }
.pp-sec { display:flex; justify-content:space-between; align-items:center; gap:8px; width:100%;
  padding:8px 10px; border-top:1px solid var(--dsw-alias-border-l1);
  border-bottom:1px solid var(--dsw-alias-border-l1);
  background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary);
  font:inherit; font-size:14px; font-weight:700; letter-spacing:0; }
.pp-sec:first-child { border-top:0; }
.pp-secbtn { flex:1 1 auto; min-width:0; display:flex; align-items:center; gap:6px; padding:0; border:0;
  background:none; color:inherit; font:inherit; text-align:left; cursor:pointer; }
.pp-secbtn:hover { color:var(--dsw-alias-brand-primary); }
.pp-secright { display:flex; align-items:center; gap:8px; }
.pp-seccount { font-size:11px; font-weight:400; padding:0 6px; border-radius:999px;
  background:var(--dsw-alias-bg-layer-1); letter-spacing:0; color:var(--dsw-alias-label-secondary); }
.pp-secadd { width:22px; height:22px; padding:0; border:1px solid var(--dsw-alias-border-l1);
  border-radius:4px; background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-secondary);
  font:inherit; font-size:14px; line-height:20px; text-align:center; cursor:pointer; }
.pp-wsopt { display:flex; align-items:center; gap:8px; padding:3px 0; font-size:12px; cursor:pointer; }
.pp-wsname { flex:0 1 auto; max-width:46%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pp-wspath { flex:1 1 auto; min-width:0; font-size:11px; color:var(--dsw-alias-label-secondary);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pp-secadd:hover { border-color:var(--dsw-alias-brand-primary); color:var(--dsw-alias-brand-primary); }
.pp-item { position:relative; display:flex; flex-direction:column; border-bottom:1px solid var(--dsw-alias-border-l1); }
.pp-item:last-child { border-bottom:0; }
.pp-itemmain { display:flex; gap:8px; width:100%; padding:5px 64px 5px 10px; border:0;
  background:none; color:inherit; font:inherit; text-align:left; cursor:pointer; }
.pp-itemmain:hover { background:var(--dsw-alias-bg-layer-1); }
.pp-itemmain.open { background:var(--dsw-alias-bg-layer-1); }
.pp-num { flex:0 0 24px; padding:1px 8px 0 0; margin-right:2px; text-align:right;
  border-right:1px solid var(--dsw-alias-border-l1); font-size:11px; color:var(--dsw-alias-label-secondary); }
.pp-text { flex:1 1 auto; min-width:0; font-size:13px; line-height:1.6; white-space:pre-wrap;
  word-break:break-word; }
.pp-pre { display:flex; flex-direction:column; border:1px solid var(--dsw-alias-border-l1);
  border-radius:8px; overflow:hidden; background:var(--dsw-alias-bg-base); margin-bottom:10px; }
.pp-prehead { padding:7px 10px; border-bottom:1px solid var(--dsw-alias-border-l1);
  background:var(--dsw-alias-bg-layer-2); font-size:12px; font-weight:700; }
.pp-quick { position:absolute; right:8px; top:2px; display:none; gap:10px; align-items:center; padding:3px 6px;
  border-radius:4px; background:var(--dsw-alias-bg-base); }
.pp-item:hover .pp-quick { display:flex; }
.pp-quick .pp-link { font-size:11px; color:var(--dsw-alias-label-secondary); }
.pp-quick .pp-link:hover { color:var(--dsw-alias-label-primary); }
.pp-itemacts { display:flex; gap:14px; align-items:center; padding:0 10px 8px 42px; }
.pp-itemacts .pp-link { font-size:11px; color:var(--dsw-alias-label-secondary); }
.pp-itemacts .pp-link:hover { color:var(--dsw-alias-label-primary); }
.pp-card { display:flex; flex-direction:column; gap:8px; margin:4px 0 10px 30px; padding:10px 12px;
  border:1px solid var(--dsw-alias-border-l1); border-radius:8px; background:var(--dsw-alias-bg-layer-1); }
.pp-textarea { width:100%; box-sizing:border-box; min-height:110px; padding:8px 10px;
  border:1px solid var(--dsw-alias-border-l1); border-radius:6px; background:var(--dsw-alias-bg-base);
  color:inherit; font:inherit; font-size:13px; line-height:1.7; resize:vertical; }
.pp-textarea:focus { outline:none; border-color:var(--dsw-alias-brand-primary); }
.pp-raw { min-height:420px; }
.pp-cardrow { display:flex; gap:10px; align-items:center; flex-wrap:wrap; font-size:12px; }
.pp-cardrow label { display:flex; gap:6px; align-items:center; }
.pp-select { padding:4px 8px; border:1px solid var(--dsw-alias-border-l1); border-radius:6px;
  background:var(--dsw-alias-bg-base); color:inherit; font:inherit; font-size:12px; }
.pp-btn { padding:4px 12px; border:1px solid var(--dsw-alias-border-l1); border-radius:6px;
  background:var(--dsw-alias-bg-base); color:inherit; font:inherit; font-size:13px; cursor:pointer; }
.pp-btn:hover:not(:disabled) { border-color:var(--dsw-alias-brand-primary); }
.pp-btn.primary { border-color:var(--dsw-alias-brand-primary); background:var(--dsw-alias-brand-primary); color:#fff; }
.pp-btn:disabled { opacity:.45; cursor:default; }
.pp-btn.small { padding:2px 9px; font-size:12px; }
.pp-btn.danger { color:var(--dsw-alias-state-error-primary); }
.pp-hint { margin:0; font-size:12px; line-height:1.6; color:var(--dsw-alias-label-primary); }
.pp-error { font-size:12px; color:var(--dsw-alias-state-error-primary); }
.pp-confirm { display:flex; flex-direction:column; gap:6px; margin-top:2px; padding:8px 10px;
  border:1px solid var(--dsw-alias-state-error-primary); border-radius:6px;
  background:var(--dsw-alias-bg-layer-1); font-size:11px; line-height:1.7; }
.pp-confirm-title { font-size:12px; font-weight:600; }
.pp-confirmrow { display:flex; gap:10px; align-items:center; }
.pp-footer { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;
  border-top:1px solid var(--dsw-alias-border-l1); padding-top:8px; }
.pp-path { font-size:11px; color:var(--dsw-alias-label-secondary); word-break:break-all; }
.pp-badge { font-size:11px; padding:0 6px; border-radius:999px; background:var(--dsw-alias-bg-layer-2); }
.pp-badge.dirty { color:var(--dsw-alias-state-error-primary); }

.pp-settings { display:flex; flex-direction:column; gap:10px; max-width:640px; }
.pp-h { margin:0; padding:0 0 6px; border-bottom:1px solid var(--dsw-alias-border-l1);
  font-size:12px; font-weight:700; color:var(--dsw-alias-label-primary); letter-spacing:.02em; }
.pp-sect { margin:12px 0 0; font-size:12px; color:var(--dsw-alias-label-primary); }
.pp-sgrid, .pp-srow { display:grid; grid-template-columns:84px minmax(0,1fr); gap:12px; align-items:center; }
.pp-srow-top { align-items:start; }
.pp-slabel { font-size:12px; color:var(--dsw-alias-label-primary); white-space:nowrap;
  overflow:hidden; text-overflow:ellipsis; line-height:1.6; }
.pp-srow-top .pp-slabel { padding-top:7px; }
.pp-sfield { display:flex; align-items:center; gap:8px; min-width:0; }
.pp-sfield-col { flex-direction:column; align-items:stretch; gap:5px; }
.pp-check { display:flex; align-items:center; gap:4px; min-width:0; font-size:12px;
  color:var(--dsw-alias-label-primary); }
.pp-check input { flex:0 0 auto; }
.pp-checkname { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pp-area { width:100%; box-sizing:border-box; min-height:44px; resize:vertical; padding:6px 8px;
  border:1px solid var(--dsw-alias-border-l1); border-radius:6px; background:var(--dsw-alias-bg-base);
  color:var(--dsw-alias-label-primary); font-family:inherit; font-size:13px; line-height:1.6; }
.pp-area:focus { outline:none; border-color:var(--dsw-alias-brand-primary); }
.pp-numinput { width:96px; }
.pp-unit { font-size:12px; color:var(--dsw-alias-label-primary); }
.pp-input { width:140px; max-width:100%; padding:5px 8px; border:1px solid var(--dsw-alias-border-l1);
  border-radius:6px; background:var(--dsw-alias-bg-base); color:inherit; font:inherit; font-size:13px; }
.pp-input.wide { width:100%; box-sizing:border-box; }
.pp-input:focus { outline:none; border-color:var(--dsw-alias-brand-primary); }
.pp-inline { display:flex; gap:8px; align-items:center; font-size:12px; }
.pp-chips { display:flex; flex-wrap:wrap; gap:6px 14px; align-items:center; }
.pp-chip { display:flex; gap:5px; align-items:center; font-size:12px; }
.pp-wsline { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:5px; }
.pp-rlabel { font-size:12px; color:var(--dsw-alias-label-secondary); white-space:nowrap; }
.pp-wscombo { position:relative; display:inline-flex; align-items:center; }
.pp-wsbtn { display:inline-flex; align-items:center; gap:6px; max-width:420px; padding:2px 8px;
  border:1px solid var(--dsw-alias-border-l1); border-radius:6px; background:var(--dsw-alias-bg-base);
  color:inherit; font:inherit; font-size:12px; cursor:pointer; }
.pp-wsbtn:hover { border-color:var(--dsw-alias-brand-primary); }
.pp-wssummary { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pp-wsdropdown { position:absolute; top:100%; left:0; z-index:30; width:320px; max-height:260px; overflow:auto;
  margin-top:4px; padding:6px; display:flex; flex-direction:column; gap:2px;
  border:1px solid var(--dsw-alias-border-l1); border-radius:8px; background:var(--dsw-alias-bg-base);
  box-shadow:0 8px 24px rgba(0,0,0,.16); }
.pp-lock { font-size:11px; color:var(--dsw-alias-label-primary); padding:0 2px; }
.pp-sfooter { display:flex; gap:10px; align-items:center; flex-wrap:wrap;
  border-top:1px solid var(--dsw-alias-border-l1); padding-top:10px; }
.pp-empty { padding:14px 2px; font-size:12px; color:var(--dsw-alias-label-secondary); }
.pp-toolbar .pp-link { font-size:11px; }
`

const INITIAL_DOC = {
  loading: false, error: null, content: '', draft: '', saving: false, saveError: null,
  savedAt: null, path: '',
}

function charsOf(text) {
  return Array.from(String(text || '')).length
}

/** 工作空间候选（路径＋标题）。 */
function workspaceCandidates(list) {
  const out = []
  for (const ws of list || []) {
    const path = String(ws.path || '')
    if (!path) continue
    const title = String(ws.title || '')
    out.push({ path, title, label: title ? `${title}（${path}）` : path })
  }
  return out
}

/** 随内容长高的多行输入（编辑卡用）。 */
function GrowTextarea(props) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight + 2, 460) + 'px'
  }, [props.value])
  return <textarea ref={ref} {...props} />
}

/** 用户画像设置页。 */
export function ProfilePanel() {
  const [roster, setRoster] = useState({ status: 'loading', error: null, home: '', profiles: [], settings: null })
  const [activeId, setActiveId] = useState('general')
  const [docs, setDocs] = useState({})
  const [view, setView] = useState('entries')
  const [filter, setFilter] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const [expanded, setExpanded] = useState(null)
  const [editing, setEditing] = useState(null)
  const [nameEditing, setNameEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleteProfile, setDeleteProfile] = useState(false)
  const [deleteEntry, setDeleteEntry] = useState(false)
  const [settingsDraft, setSettingsDraft] = useState(null)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsError, setSettingsError] = useState(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [presets, setPresets] = useState([])
  const [presetsNote, setPresetsNote] = useState('')
  const [workspaces, setWorkspaces] = useState([])
  const [workspacesNote, setWorkspacesNote] = useState('')
  const [wsOpen, setWsOpen] = useState(false)
  const [bindSaving, setBindSaving] = useState(false)
  const [bindError, setBindError] = useState(null)

  const doc = docs[activeId] || INITIAL_DOC
  const profile = roster.profiles.find((p) => p.id === activeId) || null
  const parsed = doc.error ? null : parse(doc.draft)
  const secs = parsed ? sections(parsed.paras) : []
  const st = parsed ? stats(parsed.paras) : { chars: 0, entries: 0, sections: 0 }
  const dirty = doc.draft !== doc.content
  const maxChars = roster.settings ? roster.settings.maxChars : 0

  const patchDoc = (id, patch) => {
    setDocs((cur) => ({ ...cur, [id]: { ...(cur[id] || INITIAL_DOC), ...patch } }))
  }

  const loadRoster = async () => {
    setRoster((cur) => ({ ...cur, status: 'loading', error: null }))
    try {
      const data = await getJson(API + '/list')
      const profiles = Array.isArray(data.profiles) ? data.profiles : []
      const nextActive = profiles.some((p) => p.id === activeId) ? activeId : 'general'
      setRoster({ status: 'ready', error: null, home: data.home || '', profiles, settings: data.settings || null })
      setActiveId(nextActive)
      setSettingsDraft(data.settings ? JSON.parse(JSON.stringify(data.settings)) : null)
      return data
    } catch (error) {
      setRoster((cur) => ({ ...cur, status: 'error', error: friendlyHostError(error) }))
      return null
    }
  }

  const loadDoc = async (id) => {
    patchDoc(id, { loading: true, error: null })
    try {
      const data = await getJson(API + '/read?id=' + encodeURIComponent(id))
      patchDoc(id, {
        loading: false,
        content: data.content || '',
        draft: data.content || '',
        path: data.path || '',
        savedAt: null,
        saveError: null,
      })
    } catch (error) {
      patchDoc(id, { loading: false, error: friendlyHostError(error) })
    }
  }

  useEffect(() => { void loadRoster() }, [])

  useEffect(() => {
    const entry = docs[activeId]
    if (entry && !entry.loading && entry.path !== '') return
    void loadDoc(activeId)
    setExpanded(null)
    setEditing(null)
  }, [activeId])

  useEffect(() => {
    let alive = true
    getJson(API + '/workspaces').then((data) => {
      if (!alive) return
      setWorkspaces(Array.isArray(data.workspaces) ? data.workspaces : [])
      setWorkspacesNote('')
    }).catch((error) => { if (alive) setWorkspacesNote(friendlyHostError(error)) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (view !== 'settings' || presets.length > 0) return undefined
    let alive = true
    getJson(API + '/presets').then((data) => {
      if (!alive) return
      setPresets(Array.isArray(data.presets) ? data.presets : [])
      setPresetsNote(data.unavailable || '')
    }).catch((error) => { if (alive) setPresetsNote(friendlyHostError(error)) })
    return () => { alive = false }
  }, [view])

  if (roster.status === 'loading') {
    return <div className="pp-root"><div className="pp-pane"><p className="pp-hint">正在读画像名册…</p></div></div>
  }
  if (roster.status === 'error') {
    return (
      <div className="pp-root">
        <div className="pp-pane">
          <p className="pp-error" role="alert">无法读取画像名册：{roster.error}</p>
          <button type="button" className="pp-btn" onClick={() => void loadRoster()}>{'重试'}</button>
        </div>
      </div>
    )
  }

  const general = roster.profiles.find((p) => p.kind === 'general')
  const tasks = roster.profiles.filter((p) => p.kind === 'task')

  const reloadActive = async (id) => {
    const data = await loadRoster()
    if (data) await loadDoc(id)
  }

  const saveDoc = async () => {
    if (doc.saving || !dirty) return
    patchDoc(activeId, { saving: true, saveError: null })
    try {
      await postJson(API + '/write', { id: activeId, content: doc.draft })
      patchDoc(activeId, { saving: false, content: doc.draft, savedAt: Date.now(), saveError: null })
      const nextTitle = docTitle(parse(doc.draft).paras)
      setRoster((cur) => ({
        ...cur,
        profiles: cur.profiles.map((p) => (p.id === activeId
          ? { ...p, chars: charsOf(doc.draft), title: nextTitle || p.title }
          : p)),
      }))
    } catch (error) {
      patchDoc(activeId, { saving: false, saveError: friendlyHostError(error) })
    }
  }

  const mutateDraft = (mutate) => {
    const current = docs[activeId]
    if (!current) return
    const docCopy = parse(current.draft)
    mutate(docCopy.paras)
    patchDoc(activeId, { draft: serialize(docCopy), saveError: null })
  }

  const setTitleInDraft = (title) => {
    const next = title.trim()
    if (!next) return
    mutateDraft((paras) => { setTitle(paras, next) })
  }

  const startEdit = (entry, sectionIndex) => {
    setDeleteEntry(false)
    setExpanded(entry.index)
    setEditing({ ...entry, body: entry.body, sectionIndex })
  }

  const closeEditing = () => {
    setEditing(null)
    setDeleteEntry(false)
  }

  const toggleSection = (index) => {
    const next = !(collapsed[index] === true)
    setCollapsed((cur) => ({ ...cur, [index]: next }))
    if (next) {
      if (editing) closeEditing()
      setExpanded(null)
    }
  }

  const saveEdit = () => {
    if (!editing) return
    if (editing.isNew) {
      if (!editing.body.trim()) { closeEditing(); return }
      const secIndex = editing.sectionIndex
      mutateDraft((paras) => { addItem(paras, secIndex, editing.body.trim(), ' ', true) })
      closeEditing()
      return
    }
    const target = editing
    mutateDraft((paras) => {
      const para = paras[target.index]
      if (!para) return
      if (target.kind === 'item') {
        setItemBody(para, target.body)
        const owner = sections(paras).find((s) => s.items.some((e) => e.index === target.index))
        if (owner && target.sectionIndex !== owner.index) moveItemToSection(paras, target.index, target.sectionIndex)
      } else {
        setTextBody(para, target.body)
      }
    })
    closeEditing()
  }

  const removeEntry = () => {
    if (!editing) return
    const target = editing
    mutateDraft((paras) => {
      if (target.kind === 'item') removeItem(paras, target.index)
      else removeParagraph(paras, target.index)
    })
    closeEditing()
    setExpanded(null)
  }

  const moveEntry = (delta) => {
    if (!editing || editing.isNew) return
    const index = editing.index
    let next = index
    mutateDraft((paras) => { next = moveItem(paras, index, delta) })
    setEditing((cur) => (cur ? { ...cur, index: next } : cur))
    setExpanded(next)
  }

  const createTask = async () => {
    const name = newName.trim()
    if (!name || busy) return
    setBusy(true)
    try {
      const data = await postJson(API + '/create', { name })
      setCreating(false)
      setNewName('')
      await reloadActive(data.id)
    } catch (error) {
      setRoster((cur) => ({ ...cur, error: friendlyHostError(error) }))
    } finally {
      setBusy(false)
    }
  }

  const renameTask = async () => {
    const name = nameDraft.trim()
    if (!name || busy) return
    if (!profile || profile.kind !== 'task') {
      setTitleInDraft(name)
      setNameEditing(false)
      return
    }
    setBusy(true)
    try {
      const data = await postJson(API + '/rename', { id: profile.id, name, slug: profile.id })
      setNameEditing(false)
      await reloadActive(data.id)
    } catch (error) {
      setRoster((cur) => ({ ...cur, error: friendlyHostError(error) }))
    } finally {
      setBusy(false)
    }
  }

  const removeTask = async () => {
    if (busy || !profile || profile.kind !== 'task') return
    setBusy(true)
    try {
      await postJson(API + '/delete', { id: profile.id })
      setDeleteProfile(false)
      setActiveId('general')
      await reloadActive('general')
    } catch (error) {
      setRoster((cur) => ({ ...cur, error: friendlyHostError(error) }))
    } finally {
      setBusy(false)
    }
  }

  const saveSettings = async () => {
    if (!settingsDraft || savingSettings) return
    setSavingSettings(true)
    setSettingsError(null)
    try {
      const data = await postJson(API + '/settings', settingsDraft)
      setRoster((cur) => ({ ...cur, settings: data.settings }))
      setSettingsDraft(JSON.parse(JSON.stringify(data.settings)))
      setSettingsSaved(true)
      window.setTimeout(() => setSettingsSaved(false), 1600)
    } catch (error) {
      setSettingsError(friendlyHostError(error))
    } finally {
      setSavingSettings(false)
    }
  }

  const patchSettings = (patch) => {
    setSettingsDraft((cur) => (cur ? { ...cur, ...patch } : cur))
    setSettingsSaved(false)
  }

  const boundOf = (id) => {
    const all = (roster.settings && roster.settings.bindings) || {}
    return Array.isArray(all[id]) ? all[id] : []
  }

  /** 任务画像的工作空间绑定：改一处就把 bindings 整份写回设置（只提交 bindings，不动别的草稿）。 */
  const saveBindings = async (id, list) => {
    if (bindSaving) return
    setBindSaving(true)
    setBindError(null)
    try {
      const all = { ...((roster.settings && roster.settings.bindings) || {}) }
      if (list.length > 0) all[id] = list
      else delete all[id]
      const data = await postJson(API + '/settings', { bindings: all })
      setRoster((cur) => ({ ...cur, settings: data.settings }))
      setSettingsDraft((cur) => (cur ? { ...cur, bindings: data.settings.bindings } : cur))
    } catch (error) {
      setBindError(friendlyHostError(error))
    } finally {
      setBindSaving(false)
    }
  }

  const toggleBound = (id, value) => {
    const cur = boundOf(id).slice()
    const at = cur.indexOf(value)
    if (at === -1) cur.push(value)
    else cur.splice(at, 1)
    void saveBindings(id, cur)
  }

  const sectionOptions = secs.map((s) => ({ index: s.index, label: s.title || '(未命名节)' }))
  const settingsDirty = settingsDraft && roster.settings
    && JSON.stringify(settingsDraft) !== JSON.stringify(roster.settings)

  const matchesFilter = (body) => {
    const needle = filter.trim().toLowerCase()
    if (!needle) return true
    return String(body || '').toLowerCase().indexOf(needle) !== -1
  }

  const renderCard = () => {
    if (!editing) return null
    return (
      <div
        className="pp-card"
        ref={(el) => {
          if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' })
        }}
      >
        <GrowTextarea
          className="pp-textarea"
          value={editing.body}
          autoFocus
          spellCheck={false}
          placeholder={editing.kind === 'text' ? '说明段正文' : '条目正文'}
          onChange={(e) => setEditing((cur) => (cur ? { ...cur, body: e.target.value } : cur))}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); closeEditing() }
            else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEdit() }
          }}
        />
        <div className="pp-cardrow">
          {editing.kind === 'item' && editing.sectionIndex >= 0 ? (
            <label>
              {'所属节'}
              <select
                className="pp-select"
                value={editing.sectionIndex}
                onChange={(e) => setEditing((cur) => (cur ? { ...cur, sectionIndex: Number(e.target.value) } : cur))}
              >
                {sectionOptions.map((opt) => <option key={opt.index} value={opt.index}>{opt.label}</option>)}
              </select>
            </label>
          ) : null}
          <span style={{ flex: '1 1 auto' }} />
          {!editing.isNew && editing.kind === 'item' ? (
            <Fragment>
              <button type="button" className="pp-link" onClick={() => moveEntry(-1)}>{'上移'}</button>
              <button type="button" className="pp-link" onClick={() => moveEntry(1)}>{'下移'}</button>
              <button type="button" className="pp-link danger" onClick={() => setDeleteEntry(true)}>{'删除'}</button>
            </Fragment>
          ) : null}
          {!editing.isNew && editing.kind === 'text' ? (
            <button type="button" className="pp-link danger" onClick={() => setDeleteEntry(true)}>{'删除'}</button>
          ) : null}
          <button type="button" className="pp-link" onClick={() => closeEditing()}>{'取消'}</button>
          <button
            type="button"
            className="pp-btn small primary"
            disabled={editing.kind === 'item' && !String(editing.body).trim()}
            onClick={() => saveEdit()}
          >
            {editing.isNew ? '加入' : '应用'}
          </button>
        </div>
        {deleteEntry ? (
          <div className="pp-confirm">
            <span className="pp-confirm-title">{'删除这一条？'}</span>
            <span>{'删除后本节编号会重排；文件仍可凭 .bak 找回。'}</span>
            <span className="pp-confirmrow">
              <button type="button" className="pp-btn small danger" onClick={() => removeEntry()}>{'删除'}</button>
              <button type="button" className="pp-btn small" onClick={() => setDeleteEntry(false)}>{'取消'}</button>
            </span>
          </div>
        ) : null}
      </div>
    )
  }

  const renderItem = (entry, sectionIndex) => {
    const isEditing = editing && !editing.isNew && editing.index === entry.index
    return (
      <div className="pp-item" key={'e' + entry.index}>
        <button
          type="button"
          className="pp-itemmain"
          title={'点一下编辑'}
          onClick={() => {
            if (isEditing) { closeEditing(); return }
            setDeleteEntry(false)
            startEdit(entry, sectionIndex)
          }}
        >
          <span className="pp-num">{entry.kind === 'item' ? entry.num : '·'}</span>
          <span className="pp-text">{entry.body}</span>
        </button>
        {isEditing ? null : (
          <span className="pp-quick">
            <button type="button" className="pp-link" onClick={() => startEdit(entry, sectionIndex)}>{'编辑'}</button>
          </span>
        )}
        {isEditing ? renderCard() : null}
      </div>
    )
  }

  const renderEntries = () => {
    if (!parsed) return <p className="pp-error">{doc.error}</p>
    if (doc.loading) return <p className="pp-hint">{'正在读这份画像…'}</p>
    const rows = []
    if (secs.length === 0) {
      rows.push(<div className="pp-empty" key="empty">{'这份画像里还没有「一、…」这样的节。直接在原文视图里写（标题下的「原文」）。'}</div>)
    }
    for (const sec of secs) {
      const items = sec.items.map((e) => ({ index: e.index, num: e.num, body: e.body, kind: 'item', sectionIndex: sec.index }))
      const texts = sec.texts.map((e) => ({ index: e.index, body: e.body, kind: 'text', sectionIndex: sec.index }))
      const entries = [...items, ...texts].sort((a, b) => a.index - b.index).filter((e) => matchesFilter(e.body))
      if (filter.trim() && entries.length === 0) continue
      const open = filter.trim() ? true : collapsed[sec.index] !== true
      rows.push(
        <div className="pp-sec" key={'s' + sec.index}>
          <button type="button" className="pp-secbtn" onClick={() => toggleSection(sec.index)}>
            <span>{open ? '▾ ' : '▸ '}{sec.title || '(未命名节)'}</span>
          </button>
          <span className="pp-secright">
            <span className="pp-seccount">{entries.length}</span>
            <button
              type="button"
              className="pp-secadd"
              title={'在这一节加一条'}
              onClick={() => {
                setCollapsed((cur) => ({ ...cur, [sec.index]: false }))
                setDeleteEntry(false)
                setExpanded(null)
                setEditing({ isNew: true, kind: 'item', body: '', sectionIndex: sec.index })
              }}
            >
              {'＋'}
            </button>
          </span>
        </div>,
      )
      if (editing && editing.isNew && editing.sectionIndex === sec.index) {
        rows.push(<Fragment key={'new' + sec.index}>{renderCard()}</Fragment>)
      }
      if (open) {
        for (const entry of entries) rows.push(renderItem(entry, sec.index))
      }
    }
    const preRows = preamble(parsed.paras).map((e) => (
      <Fragment key={'p' + e.index}>{renderItem({ index: e.index, body: e.body, kind: 'text', sectionIndex: -1 }, -1)}</Fragment>
    ))
    return (
      <div>
        {preRows.length ? (
          <div className="pp-pre">
            <div className="pp-prehead">{'这张画像管什么任务'}</div>
            {preRows}
          </div>
        ) : null}
        <div className="pp-list">{rows}</div>
      </div>
    )
  }

  const renderRaw = () => (
    <Fragment>
      <textarea
        className="pp-textarea pp-raw"
        value={doc.draft}
        spellCheck={false}
        onChange={(e) => patchDoc(activeId, { draft: e.target.value, saveError: null })}
      />
      <p className="pp-hint">
        {'这是整篇原文：条目视图认不出的写法在这里直接改。保存写回同一份文件。' +
          `　当前 ${st.chars} 字（灌注${maxChars > 0 ? `上限 ${maxChars} 字` : '不截断'}）`}
      </p>
    </Fragment>
  )

  const renderSettings = () => {
    if (!settingsDraft) return <p className="pp-hint">{'正在读设置…'}</p>
    const presetIds = presets.map((p) => p.id)
    const presetChecked = (id) => (settingsDraft.presets || []).indexOf(id) !== -1
    const allPresets = presetIds.length > 0 && presetIds.every((id) => presetChecked(id))
    const togglePreset = (id) => {
      const cur = settingsDraft.presets || []
      const next = cur.indexOf(id) === -1 ? [...cur, id] : cur.filter((x) => x !== id)
      patchSettings({ presets: next })
    }
    const extraPresets = (settingsDraft.presets || []).filter((id) => presetIds.indexOf(id) === -1)
    return (
      <div className="pp-settings">
        <p className="pp-sect">{'灌注'}</p>
        <div className="pp-srow">
          <span className="pp-slabel">{'开关'}</span>
          <span className="pp-sfield">
            <label className="pp-check">
              <input
                type="checkbox"
                checked={settingsDraft.enabled !== false}
                onChange={(e) => patchSettings({ enabled: e.target.checked })}
              />
              <span className="pp-checkname">{'开场把画像注入会话'}</span>
            </label>
          </span>
        </div>
        <div className="pp-srow">
          <span className="pp-slabel">{'上限'}</span>
          <span className="pp-sfield">
            <input
              className="pp-input pp-numinput"
              type="number"
              min="0"
              max="200000"
              value={settingsDraft.maxChars}
              onChange={(e) => patchSettings({ maxChars: Number(e.target.value) })}
            />
            <span className="pp-unit">{'字（0＝不截断；大于 0 时超出截断，并告诉模型完整版在哪）'}</span>
          </span>
        </div>

        <p className="pp-sect">{'灌注的模式'}</p>
        <div className="pp-srow pp-srow-top">
          <span className="pp-slabel">{'限定模式'}</span>
          <span className="pp-sfield pp-sfield-col">
            <span className="pp-hint">
              {'全不勾＝所有模式都灌注（默认）；勾了就只在这些模式里灌注——其余模式（含新建的）既不注入画像，也看不到画像开关。'}
            </span>
            {presetIds.length > 0
              ? (
                <span className="pp-chips">
                  <label className="pp-check">
                    <input
                      type="checkbox"
                      checked={allPresets}
                      onChange={(e) => patchSettings({ presets: e.target.checked ? presetIds.slice() : [] })}
                    />
                    <span className="pp-checkname">{'全选'}</span>
                  </label>
                  {presets.map((p) => (
                    <label
                      className="pp-check"
                      key={p.id}
                      title={p.broken ? ('这个模式现在装不起来：' + p.broken) : (p.description || p.id)}
                    >
                      <input type="checkbox" checked={presetChecked(p.id)} onChange={() => togglePreset(p.id)} />
                      <span className="pp-checkname">{p.name || p.id}</span>
                      {p.name && p.name !== p.id ? <span className="pp-lock">{p.id}</span> : null}
                      {p.isDefault ? <span className="pp-lock">{'默认'}</span> : null}
                      {p.broken ? <span className="pp-lock">{'坏'}</span> : null}
                    </label>
                  ))}
                </span>
              )
              : (
                <textarea
                  className="pp-area"
                  rows={2}
                  value={(settingsDraft.presets || []).join('\n')}
                  spellCheck={false}
                  placeholder={'一行一个模式的 agentPreset id；留空＝所有模式都灌注'}
                  onChange={(e) => patchSettings({ presets: e.target.value.split('\n') })}
                />
              )}
            {presetsNote ? <span className="pp-hint">{'拿不到本机模式清单（' + presetsNote + '），可手填 id。'}</span> : null}
            {extraPresets.length > 0
              ? (
                <span className="pp-hint">
                  {'已保存、但本机清单里没有的模式：'}
                  {extraPresets.map((id) => (
                    <button type="button" className="pp-link" key={id} onClick={() => togglePreset(id)}>{id + ' ×'}</button>
                  ))}
                </span>
              )
              : null}
          </span>
        </div>

        <p className="pp-sect">{'不灌注的范围'}</p>
        <div className="pp-srow pp-srow-top">
          <span className="pp-slabel">{'工作空间'}</span>
          <span className="pp-sfield pp-sfield-col">
            {(() => {
              const skipList = settingsDraft.skipWorkspaces || []
              const wss = workspaceCandidates(workspaces)
              const wssPaths = wss.map((w) => w.path)
              const extras = skipList.filter((p) => wssPaths.indexOf(p) === -1)
              const patchSkip = (next) => patchSettings({ skipWorkspaces: next })
              return (
                <Fragment>
                  <span className="pp-hint">
                    {'勾上的工作空间不自动注入画像。判定按路径子串（不分大小写）：勾了上层目录，它下面的工作空间也会一起命中。'}
                  </span>
                  <label className="pp-check">
                    <input
                      type="checkbox"
                      checked={wss.length > 0 && wss.every((w) => skipList.indexOf(w.path) !== -1)}
                      onChange={(e) => {
                        if (e.target.checked) patchSkip(Array.from(new Set([...skipList, ...wssPaths])))
                        else patchSkip(skipList.filter((p) => wssPaths.indexOf(p) === -1))
                      }}
                    />
                    <span className="pp-checkname">{'全选'}</span>
                  </label>
                  {wss.length > 0
                    ? (
                      <span className="pp-chips">
                        {wss.map((ws) => (
                          <label className="pp-check" key={ws.path} title={ws.path}>
                            <input
                              type="checkbox"
                              checked={skipList.indexOf(ws.path) !== -1}
                              onChange={() => {
                                if (skipList.indexOf(ws.path) !== -1) patchSkip(skipList.filter((p) => p !== ws.path))
                                else patchSkip([...skipList, ws.path])
                              }}
                            />
                            <span className="pp-checkname">{ws.title || ws.path}</span>
                            {ws.title && ws.path ? <span className="pp-lock">{ws.path}</span> : null}
                          </label>
                        ))}
                      </span>
                    )
                    : null}
                  <textarea
                    className="pp-area"
                    rows={2}
                    value={extras.join('\n')}
                    spellCheck={false}
                    placeholder={'另加路径片段：一行一条，会话的工作目录含它就整个会话不灌注'}
                    onChange={(e) => {
                      const next = e.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean)
                      patchSkip([...skipList.filter((p) => wssPaths.indexOf(p) !== -1), ...next])
                    }}
                  />
                </Fragment>
              )
            })()}
            {workspacesNote ? <span className="pp-hint">{'拿不到本机工作空间清单（' + workspacesNote + '），只能手填路径片段。'}</span> : null}
            {(settingsDraft.skipSessions || []).length > 0 ? (
              <span className="pp-hint">
                {'已按会话关掉 ' + settingsDraft.skipSessions.length + ' 个'}
                <button type="button" className="pp-link" style={{ marginLeft: '8px' }} onClick={() => patchSettings({ skipSessions: [] })}>
                  {'全部恢复'}
                </button>
              </span>
            ) : null}
          </span>
        </div>

        <div className="pp-sfooter">
          <button
            type="button"
            className="pp-btn primary"
            disabled={!settingsDirty || savingSettings}
            onClick={() => void saveSettings()}
          >
            {savingSettings ? '保存中…' : (settingsDirty ? '保存设置' : '已保存')}
          </button>
          {settingsSaved ? <span className="pp-hint">{'已保存，下一次开会话起生效'}</span> : null}
          {settingsError ? <span className="pp-error" role="alert">{settingsError}</span> : null}
          <span className="pp-hint">{'写在 ' + (roster.home || '$DSH_HOME') + '\\user-profile.settings.json'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="pp-root">
      <style>{CSS}</style>
      {view !== 'settings' ? (
      <aside className="pp-roster" aria-label={'画像名册'}>
        <p className="pp-grouplabel">{'通用画像'}</p>
        {general ? (
          <div className="pp-row" aria-current={activeId === 'general' ? 'true' : undefined}>
            <button
              type="button"
              className="pp-rowmain"
              onClick={() => { setActiveId('general'); setEditing(null); setExpanded(null); setDeleteProfile(false); setWsOpen(false); setBindError(null); setView('entries') }}
            >
              <span className="pp-rname">{general.title}</span>
              <span className="pp-rnum">{general.entries || 0}</span>
            </button>
          </div>
        ) : null}
        <p className="pp-grouplabel">{'任务画像'}</p>
        {tasks.map((p) => (
          <div className="pp-row" key={p.id} aria-current={activeId === p.id ? 'true' : undefined}>
            <button
              type="button"
              className="pp-rowmain"
              onClick={() => { setActiveId(p.id); setEditing(null); setExpanded(null); setDeleteProfile(false); setWsOpen(false); setBindError(null); setView('entries') }}
            >
              <span className="pp-rname">{p.title}</span>
              <span className="pp-rnum">{p.entries || 0}</span>
            </button>
            <button
              type="button"
              className="pp-rowdel"
              title={'删除任务画像（文件改名归档，可找回）'}
              onClick={() => {
                setActiveId(p.id)
                setEditing(null)
                setExpanded(null)
                setWsOpen(false)
                setBindError(null)
                setView('entries')
                setDeleteProfile(true)
              }}
            >
              {'×'}
            </button>
          </div>
        ))}
        <div className="pp-newlayer">
          {creating ? (
            <Fragment>
              <input
                className="pp-input"
                autoFocus
                spellCheck={false}
                placeholder={'任务画像名（如：DSH 维护）'}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void createTask() }}
              />
              <span className="pp-cardrow">
                <button type="button" className="pp-btn small primary" disabled={!newName.trim() || busy} onClick={() => void createTask()}>{'创建'}</button>
                <button type="button" className="pp-btn small" onClick={() => { setCreating(false); setNewName('') }}>{'取消'}</button>
              </span>
            </Fragment>
          ) : (
            <button type="button" className="pp-link pp-newlayerbtn" onClick={() => setCreating(true)}>{'＋ 新建任务画像'}</button>
          )}
        </div>
      </aside>
      ) : null}

      <div className="pp-pane">
        <div className="pp-head">
          <div className="pp-titlewrap">
            {nameEditing ? (
              <span className="pp-cardrow">
                <input
                  className="pp-titleinput"
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void renameTask()
                    if (e.key === 'Escape') setNameEditing(false)
                  }}
                />
                <button type="button" className="pp-btn small primary" disabled={busy || !nameDraft.trim()} onClick={() => void renameTask()}>{'改'}</button>
                <button type="button" className="pp-btn small" onClick={() => setNameEditing(false)}>{'取消'}</button>
              </span>
            ) : (
              <button
                type="button"
                className="pp-titlebtn"
                title={profile && profile.kind === 'task' ? '点一下改名（标题与文件名一起改）' : '点一下改标题'}
                onClick={() => {
                  setNameDraft(profile ? profile.title : docTitle(parsed ? parsed.paras : []))
                  setNameEditing(true)
                }}
              >
                {profile ? profile.title : '通用画像'}
              </button>
            )}
            <p className="pp-sub">
              {st.entries} 条 · {st.sections} 节 · {st.chars} 字
              {doc.path ? '　' + doc.path : ''}
            </p>
            {profile && profile.kind === 'task' ? (() => {
              const bound = boundOf(profile.id)
              const titleOf = (path) => {
                const hit = workspaces.find((w) => w.path === path)
                return (hit && (hit.title || hit.path)) || path
              }
              const summary = bound.length === 0 ? '所有工作空间（不绑定）' : bound.map(titleOf).join('、')
              const extras = bound.filter((p) => !workspaces.some((w) => w.path === p))
              const pathOptions = workspaceCandidates(workspaces)
              const allBound = pathOptions.length > 0 && pathOptions.every((w) => bound.indexOf(w.path) !== -1)
              return (
                <p className="pp-sub pp-wsline">
                  <span className="pp-rlabel">{'工作空间'}</span>
                  <span className="pp-wscombo">
                    <button
                      type="button"
                      className="pp-wsbtn"
                      aria-expanded={wsOpen}
                      title={bound.length > 0 ? bound.join('\n') : '所有工作空间都生效'}
                      onClick={() => { setWsOpen((v) => !v); setBindError(null) }}
                    >
                      <span className="pp-wssummary">{summary}</span>
                      <span aria-hidden="true">{'▾'}</span>
                    </button>
                    {wsOpen ? (
                      <span className="pp-wsdropdown">
                        {bindError ? <span className="pp-error">{bindError}</span> : null}
                        <label className="pp-wsopt">
                          <input
                            type="checkbox"
                            checked={allBound}
                            onChange={(e) => void saveBindings(profile.id, e.target.checked ? pathOptions.map((w) => w.path) : [])}
                          />
                          <span className="pp-wsname">{'全选'}</span>
                        </label>
                        <label className="pp-wsopt">
                          <input
                            type="checkbox"
                            checked={bound.length === 0}
                            onChange={() => void saveBindings(profile.id, [])}
                          />
                          <span className="pp-wsname">{'所有工作空间（不绑定）'}</span>
                        </label>
                        {pathOptions.length === 0
                          ? <span className="pp-hint">{workspacesNote || '没有工作空间清单，手填路径片段。'}</span>
                          : pathOptions.map((ws) => (
                            <label className="pp-wsopt" key={ws.path} title={ws.path}>
                              <input
                                type="checkbox"
                                checked={bound.indexOf(ws.path) !== -1}
                                onChange={() => toggleBound(profile.id, ws.path)}
                              />
                              <span className="pp-wsname">{ws.title || ws.path}</span>
                              <span className="pp-wspath">{ws.title ? ws.path : ''}</span>
                            </label>
                          ))}
                        {extras.map((p) => (
                          <label className="pp-wsopt" key={'extra:' + p} title={p}>
                            <input type="checkbox" checked onChange={() => toggleBound(profile.id, p)} />
                            <span className="pp-wsname">{'已绑定的片段'}</span>
                            <span className="pp-wspath">{p}</span>
                          </label>
                        ))}
                        <input
                          className="pp-input wide"
                          placeholder={'手填路径片段，回车加入'}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter') return
                            const value = e.currentTarget.value.trim()
                            if (!value) return
                            e.currentTarget.value = ''
                            if (bound.indexOf(value) === -1) toggleBound(profile.id, value)
                          }}
                        />
                        <span className="pp-hint">{'不绑定时，这份任务画像不随会话注入（只在类别清单里列名）。'}</span>
                        {bindSaving ? <span className="pp-hint">{'保存中…'}</span> : null}
                      </span>
                    ) : null}
                  </span>
                </p>
              )
            })() : null}
          </div>
          <div className="pp-headacts">
            {view === 'settings' ? (
              <button
                type="button"
                className="pp-link primary"
                onClick={() => { setView('entries'); setEditing(null); setExpanded(null) }}
              >
                {'返回'}
              </button>
            ) : (
              <Fragment>
                <button type="button" className="pp-link" onClick={() => { setView('settings'); setEditing(null); setExpanded(null); setDeleteProfile(false) }}>{'设置'}</button>
              </Fragment>
            )}
          </div>
        </div>

        {deleteProfile ? (
          <div className="pp-confirm">
            <span className="pp-confirm-title">{'删除任务画像「' + (profile ? profile.title : '') + '」？'}</span>
            <span>{'文件会改名归档（.deleted-时间戳），找回只需改回名字；设置里的绑定一并移除。'}</span>
            <span className="pp-confirmrow">
              <button type="button" className="pp-btn small danger" disabled={busy} onClick={() => void removeTask()}>{'删除'}</button>
              <button type="button" className="pp-btn small" onClick={() => setDeleteProfile(false)}>{'取消'}</button>
            </span>
          </div>
        ) : null}

        {(view === 'entries' || view === 'raw') ? (
          <div className="pp-toolbar">
            {view === 'entries' ? (
              <input
                className="pp-search"
                placeholder={'搜这份画像里的条目…'}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            ) : <span className="pp-search" aria-hidden="true" />}
            {view === 'entries' ? (
              <button
                type="button"
                className="pp-link"
                onClick={() => {
                  const allOpen = secs.every((s) => collapsed[s.index] !== true)
                  const next = {}
                  secs.forEach((s) => { next[s.index] = allOpen })
                  setCollapsed(next)
                  if (allOpen) { setExpanded(null); setEditing(null) }
                }}
              >
                {secs.every((s) => collapsed[s.index] !== true) ? '全部收起' : '全部展开'}
              </button>
            ) : null}
            <span className="pp-tabs">
              <button type="button" className="pp-tab" aria-selected={view === 'entries'} onClick={() => setView('entries')}>{'条目'}</button>
              <button type="button" className="pp-tab" aria-selected={view === 'raw'} onClick={() => { setView('raw'); setEditing(null); setExpanded(null) }}>{'原文'}</button>
            </span>
          </div>
        ) : null}

        {view === 'entries' ? renderEntries() : null}
        {view === 'raw' ? renderRaw() : null}
        {view === 'settings' ? renderSettings() : null}

        {view !== 'settings' ? (
          <div className="pp-footer">
            <span className="pp-path">
              {doc.path || (roster.home ? roster.home + '\\user-profile.md' : '')}
            </span>
            <span className="pp-cardrow">
              {doc.saveError ? <span className="pp-error">{'保存失败：' + doc.saveError}</span> : null}
              {dirty ? <span className="pp-badge dirty">{'未保存'}</span> : (doc.savedAt ? <span className="pp-badge">{'已保存'}</span> : null)}
              <button type="button" className="pp-btn primary" disabled={!dirty || doc.saving} onClick={() => void saveDoc()}>
                {doc.saving ? '保存中…' : '保存'}
              </button>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

const MUTE_CSS = `.pp-mutebtn { padding:2px 8px; border:1px solid var(--dsw-alias-border-l1); border-radius:999px; min-width:58px; text-align:center;
  background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary); font:inherit; font-size:11px;
  line-height:1.4; cursor:pointer; white-space:nowrap; }
.pp-mutebtn:hover { border-color:var(--dsw-alias-brand-primary); }
.pp-mutebtn[data-muted="true"] { color:var(--dsw-alias-state-error-primary); border-color:currentColor; }
.pp-mutebtn:disabled { opacity:.6; cursor:default; }`

/** apply 里注入：拿客户端的 sessions 服务。 */
let getSessionsService = () => undefined

/** 当前会话的 preset：订阅 session projection，切模式就跟着变（不用轮询）。 */
function useAgentPreset(sessionId) {
  const [preset, setPreset] = useState(undefined)
  useEffect(() => {
    if (!sessionId) return undefined
    let alive = true
    let face
    try {
      const service = getSessionsService()
      const binding = service && typeof service.binding === 'function' ? service.binding(sessionId) : undefined
      face = binding && binding.session && binding.session.projections
        ? binding.session.projections.faceOf('agentPreset')
        : undefined
    } catch {
      face = undefined
    }
    if (!face) return undefined
    const read = () => { if (alive) setPreset(face.getSnapshot()) }
    read()
    const off = typeof face.subscribe === 'function' ? face.subscribe(read) : undefined
    return () => {
      alive = false
      if (typeof off === 'function') off()
    }
  }, [sessionId])
  return preset
}

const MUTE_CACHE = new Map()

/** 会话里的小开关：本会话画像注／禁；当前模式不在灌注名单里就显示「禁」、点不动。 */
export function SessionProfileToggle(props) {
  const sessionId = props && props.sessionId ? String(props.sessionId) : ''
  const preset = useAgentPreset(sessionId)
  const [muted, setMuted] = useState(() => (sessionId && MUTE_CACHE.has(sessionId) ? MUTE_CACHE.get(sessionId) : null))
  const [presets, setPresets] = useState(null)
  const [serverAllowed, setServerAllowed] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!sessionId) return undefined
    let alive = true
    const read = () => {
      getJson(API + '/session-state?id=' + encodeURIComponent(sessionId))
        .then((data) => {
          if (!alive) return
          const next = Boolean(data.muted)
          MUTE_CACHE.set(sessionId, next)
          setMuted(next)
          setPresets(Array.isArray(data.presets) ? data.presets : null)
          setServerAllowed(data.allowed === undefined ? null : Boolean(data.allowed))
        })
        .catch(() => {})
    }
    read()
    window.addEventListener('focus', read)
    return () => {
      alive = false
      window.removeEventListener('focus', read)
    }
  }, [sessionId])

  if (!sessionId) return null
  const blocked = typeof preset === 'string' && preset !== ''
    ? (Array.isArray(presets) && presets.length > 0 && presets.indexOf(preset) === -1)
    : serverAllowed === false
  const label = blocked ? '画像·禁' : (busy ? '画像…' : (muted === null ? '画像…' : (muted ? '画像·禁' : '画像·注')))
  const toggle = async () => {
    if (busy || muted === null || blocked) return
    setBusy(true)
    try {
      const data = await postJson(API + '/session-mute', { id: sessionId, muted: !muted })
      const next = Boolean(data.muted)
      MUTE_CACHE.set(sessionId, next)
      setMuted(next)
    } catch {
      /* 失败保持原状态 */
    } finally {
      setBusy(false)
    }
  }
  return (
    <Fragment>
      <style>{MUTE_CSS}</style>
      <button
        type="button"
        className="pp-mutebtn"
        data-muted={blocked || muted === true ? 'true' : 'false'}
        disabled={busy || muted === null || blocked}
        title={blocked ? '当前模式不在画像灌注名单里（设置 → 用户画像 → 灌注）' : '用户画像：本会话是否灌注画像'}
        onClick={() => void toggle()}
      >
        {label}
      </button>
    </Fragment>
  )
}
/** 需要的客户端服务：设置页与会话输入栏的插槽。 */
export const inject = ['slots']

/**
 * 把面板挂进设置页，并在输入栏右侧放「画像·注／禁」。
 * 设置页用内置那页的 id（user-profile）：list 槽同 id 是「占位替换」，不会并排出现两页。
 * @param ctx - 客户端根上下文。
 */
export function apply(ctx) {
  getSessionsService = () => { try { return ctx.get('sessions') } catch { return undefined } }

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'user-profile',
    order: 30,
    label: '用户画像',
  }, ProfilePanel))

  try {
    ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
      name: 'conversation.input.right',
      id: 'profile-session-toggle',
      order: 22,
      label: '画像灌注',
    }, SessionProfileToggle))
  } catch {
    try {
      ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
        name: 'conversation.session.header.actions',
        id: 'profile-session-toggle',
        order: 16,
        label: '画像灌注',
      }, SessionProfileToggle))
    } catch {
      /* 没有可用座位：只留设置页 */
    }
  }
}
