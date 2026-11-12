/**
 * 聊天区紧凑显示（浏览器半边）。
 *
 * 一块样式、两块共用：对齐栏与收尾检测走**同一条**判定与同一套 CSS——
 * 命中就打 data-zz="quiet"，样式由这一个选择器生效。
 * 正文、代码块、输入框都不在范围内（只挑 blockquote，且排除代码块里的引用）。
 *
 * 判定靠块内文本（不依赖打包后的类名，也不用 CSS 的文本匹配）：
 *   · 对齐栏：块首是「本层目标：」（根上的回帖）或「根本目标：」（有上一层时），
 *     以及旧写法「我按哪个目标改：」「服务上层：」开头
 *   · 块内含「收尾检测」「本轮五项」「待确认：」等 → 收尾检测
 *
 * ⚠️ 只补标、不摘标。摘标是「一会儿对、一会儿又变回去」的根源：
 *    另一个还在跑的旧实例、或一次重渲染把标记拿掉，要等下一轮扫描才补回来，
 *    中间那段就是错的样式，看起来就像来回跳。
 *    宁可多标一个（只是小一号，不影响读），也不让已经对的块掉回原样。
 *
 * 打包：esbuild 打包
 */

const ATTR = 'data-zz'
const MARK = 'quiet'
/* 40 秒草稿单独一类：正文里的正式对齐栏一出现，它整块收起来，只留正式那份。 */
const LATE_MARK = 'late-bar'
const REPLACED = 'data-zz-replaced'
const STYLE_ID = 'dsh-chat-density-style'
const GLOBAL_KEY = '__dshChatDensity'
const VERSION = '7'

const ALIGN_PREFIXES = ['根本目标：', '本层目标：', '我按哪个目标改：', '服务上层：']
/* 旧写法曾以层号起头（第一层）做完你能……：现在对齐栏不写层号，正则留着兜旧回帖。 */
const ALIGN_HEAD = /^（第[0-9〇一二三四五六七八九十百]+层）/
const TAIL_KEYS = ['收尾检测', '本轮五项', '待确认：', '画像无更新', '可归纳项：']

/* 唯一一套样式：两块完全相同 */
const CSS = `
blockquote[${ATTR}="${MARK}"] {
  font-size: 12.5px !important;
  line-height: 1.32 !important;
  color: var(--dsw-alias-label-secondary) !important;
  padding: 3px 0 3px 8px !important;
  margin: 22px 0 !important;
  border-left-width: 2px !important;
}
blockquote[${ATTR}="${MARK}"] p { margin: 0 !important; }
blockquote[${ATTR}="${MARK}"] li { margin: 0 !important; }
blockquote[${ATTR}="${MARK}"] code { font-size: 0.94em !important; }
blockquote[${ATTR}="${LATE_MARK}"] {
  font-size: 12.5px !important;
  line-height: 1.32 !important;
  color: var(--dsw-alias-label-secondary) !important;
  padding: 3px 0 3px 8px !important;
  margin: 22px 0 !important;
  border-left-width: 2px !important;
  border-left-style: dashed !important;
}
blockquote[${ATTR}="${LATE_MARK}"] p { margin: 0 !important; }
blockquote[${ATTR}="${LATE_MARK}"][${REPLACED}="1"] { display: none !important; }
`

/** 样式版本变了就换掉旧 style 元素（重载后不必刷新整页也能拿到新样式）。 */
function ensureStyle() {
  const existing = document.getElementById(STYLE_ID)
  if (existing && existing.getAttribute('data-version') === VERSION) return
  if (existing) existing.remove()
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.setAttribute('data-version', VERSION)
  style.textContent = CSS
  document.head.appendChild(style)
}

/** 是不是这两块之一（两块同等对待，不区分样式）。 */
function isQuietBlock(text) {
  const head = text.trimStart().slice(0, 24)
  if (ALIGN_HEAD.test(head)) return true
  if (ALIGN_PREFIXES.some((prefix) => head.startsWith(prefix))) return true
  return TAIL_KEYS.some((key) => text.includes(key))
}

/** 40 秒那版草稿：任务树在长思考时插进来的过渡块，开头是沙漏。 */
function isLateBlock(text) {
  const head = text.trimStart()
  return head.startsWith('⏳') && head.includes('对齐栏草稿')
}

/** 正式对齐栏的收尾标记：草稿不带关卡行，正式版带。 */
function hasGateLine(text) {
  return /关卡[：:]/.test(text)
}

/** 只补标、不摘标（见文件头说明）。已经标过的直接跳过。 */
function scan() {
  for (const el of document.querySelectorAll('blockquote')) {
    if (el.closest('pre, code')) continue
    const text = (el.textContent ?? '').slice(0, 800)
    if (isLateBlock(text)) {
      if (el.getAttribute(ATTR) !== LATE_MARK) el.setAttribute(ATTR, LATE_MARK)
      continue
    }
    if (el.getAttribute(ATTR) === MARK) continue
    if (isQuietBlock(text)) el.setAttribute(ATTR, MARK)
  }
  // 草稿被正式对齐栏顶掉：只认「草稿之后」出现的正式栏。
  // 同一容器里上一轮回复的正式栏在文档顺序上位于草稿之前，不能拿来判——
  // 否则从第二轮起，草稿一出现就被上一轮的栏藏掉（2026-11-11 实测：40 秒草稿照发、页面上一片空白）。
  for (const el of document.querySelectorAll(`blockquote[${ATTR}="${LATE_MARK}"]`)) {
    let p = el.parentElement
    let replaced = false
    for (let depth = 0; p && depth < 10; depth++, p = p.parentElement) {
      const reals = Array.from(p.querySelectorAll(`blockquote[${ATTR}="${MARK}"]`))
      const later = reals.filter((b) => hasGateLine(b.textContent ?? '')
        && (el.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0)
      if (later.length > 0) { replaced = true; break }
    }
    if (replaced) el.setAttribute(REPLACED, '1')
    else el.removeAttribute(REPLACED)
  }
}

/* 首次安装／首次更新提示：上下文压缩插件 billion-context（bili）。
   预览期每次加载都弹、点「知道了」只关本次；正式版再按版本号记一次。 */
const NOTICE_ID = 'dsh-evolve-notice'
const NOTICE_STYLE_ID = 'dsh-evolve-notice-style'

const NOTICE_CSS = `
.zz-card {
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  overflow: hidden; box-sizing: border-box;
  width: 600px; max-width: calc(100vw - 40px);
  padding: 34px 38px 30px; border-radius: 20px;
  background: var(--dsw-alias-bg-overlay, #1e2026);
  color: var(--dsw-alias-label-primary, #f4f6fb);
  border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.14));
  box-shadow: 0 40px 120px rgba(0,0,0,.55);
  animation: zz-notice-pop .26s cubic-bezier(.18,.9,.32,1.15);
}
.zz-strip {
  position: absolute; top: 0; left: 0; right: 0; height: 4px;
  background: linear-gradient(90deg, var(--dsw-alias-brand-primary, #4d6bfe), rgba(139,92,246,.9) 45%, transparent);
}
.zz-head { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
.zz-icon {
  width: 44px; height: 44px; flex: none; display: flex; align-items: center; justify-content: center;
  border-radius: 12px; background: rgba(77,107,254,.14);
  color: var(--dsw-alias-brand-primary, #8ea2ff);
}
.zz-title { font-size: 16px; font-weight: 700; letter-spacing: .01em; }
.zz-sub { margin-top: 3px; font-size: 12.5px; color: var(--dsw-alias-label-secondary, rgba(255,255,255,.6)); }
.zz-lead { font-size: 17px; line-height: 1.6; font-weight: 500; }
.zz-name {
  padding: 1px 7px; border-radius: 6px; font-weight: 700;
  background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,.18));
}
.zz-cmd {
  margin-left: 2px; padding: 1px 6px; border-radius: 5px;
  background: rgba(127,127,127,.16); font-size: .86em;
  color: var(--dsw-alias-label-secondary, rgba(255,255,255,.72));
}
.zz-harm {
  margin-top: 18px; padding: 14px 16px; border-radius: 10px;
  border-left: 3px solid var(--dsw-alias-state-warn-primary, #f0a020);
  background: rgba(240,160,32,.10);
  font-size: 15.5px; line-height: 1.6;
}
.zz-harm b { color: var(--dsw-alias-state-warn-primary, #f0a020); font-weight: 700; }
.zz-actions { display: flex; justify-content: flex-end; margin-top: 26px; }
.zz-button {
  min-width: 132px; height: 44px; padding: 0 26px; border: 0; border-radius: 11px;
  background: var(--dsw-alias-brand-primary, #4d6bfe); color: #fff;
  font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;
  box-shadow: 0 10px 30px rgba(77,107,254,.35);
  transition: filter .15s ease, transform .15s ease;
}
.zz-button:hover { filter: brightness(1.08); }
.zz-button:active { transform: translateY(1px); }
@keyframes zz-notice-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes zz-notice-pop {
  from { opacity: 0; transform: translate(-50%, -50%) translateY(12px) scale(.96); }
  to { opacity: 1; transform: translate(-50%, -50%); }
}
`

function ensureNoticeStyle() {
  if (document.getElementById(NOTICE_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = NOTICE_STYLE_ID
  style.textContent = NOTICE_CSS
  document.head.appendChild(style)
}

function showCompressNotice() {
  if (!document.body) return
  const old = document.getElementById(NOTICE_ID)
  if (old) old.remove()
  ensureNoticeStyle()

  const host = document.createElement('div')
  host.id = NOTICE_ID
  const setImportant = (name, value) => host.style.setProperty(name, value, 'important')
  setImportant('position', 'fixed')
  setImportant('top', '0')
  setImportant('left', '0')
  setImportant('right', '0')
  setImportant('bottom', '0')
  setImportant('width', '100%')
  setImportant('height', '100%')
  setImportant('box-sizing', 'border-box')
  setImportant('z-index', '2147483000')
  setImportant('display', 'grid')
  setImportant('place-items', 'center')
  setImportant('margin', '0')
  setImportant('padding', '32px')
  setImportant('background', 'rgba(8,10,14,.58)')
  setImportant('backdrop-filter', 'blur(6px)')
  setImportant('-webkit-backdrop-filter', 'blur(6px)')
  host.innerHTML = `
    <div class="zz-card">
      <div class="zz-strip"></div>
      <div class="zz-head">
        <div class="zz-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3.2 22 20.4H2L12 3.2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="M12 9.2v4.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="12" cy="17.1" r="1.05" fill="currentColor"/>
          </svg>
        </div>
        <div>
          <div class="zz-title" id="${NOTICE_ID}-title">进化模式 · 使用提示</div>
          <div class="zz-sub">首次安装或更新后提示一次</div>
        </div>
      </div>
      <div class="zz-lead">不要使用上下文压缩插件 <strong class="zz-name">billion-context</strong>（命令名 <span class="zz-cmd">bili</span>）。</div>
      <div class="zz-harm">它不仅会让 <b>token 消耗更大</b>，<b>效果也没有那么好</b>。</div>
      <div class="zz-actions"><button type="button" class="zz-button">知道了</button></div>
    </div>
  `
  document.body.append(host)

  const close = () => {
    host.remove()
    document.removeEventListener('keydown', onKey)
  }
  const onKey = (event) => {
    if (event.key === 'Escape') close()
  }
  host.querySelector('.zz-button').addEventListener('click', close)
  document.addEventListener('keydown', onKey)
  host.querySelector('.zz-button').focus()
}

/* 提示的开关与「安装」判断在进化模式设置块的宿主路由里。 */
const BILLION_API = '/dsh-evolution-settings/api/billion-context'

/** 装了并且在跑才提示；每次打开都提示一次，关掉只关这次。 */
async function maybeShowCompressNotice() {
  try {
    const path = new URL(String(BILLION_API).replace(/^\/+/, ''), document.baseURI).pathname
    const res = await fetch(path, { headers: { accept: 'application/json' } })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data || data.ok === false) return
    if (data.installed !== true || data.enabled !== true) return
    showCompressNotice()
  } catch { /* 没装设置块或接口不可用：不提示 */ }
}

/* 依赖声明：与能正常加载的设置页插件同款。
   空的 inject 会让宿主判定该条目「未激活」→ web boot 报 1 entry did not activate，
   所以这里用 'slots'（客户端框架的内置服务，照设置页插件共用的写法）。 */
export const inject = ['slots']

/** 入口：注入样式，盯着 DOM 变更随时补标（流式追加、重渲染都算）。 */
export function apply() {
  /* 同一个页面里被加载第二次时，先把上一实例停手：
     两个扫描器各自 800ms 一轮，一个补一个摘，就会看到样式来回跳。 */
  const prev = window[GLOBAL_KEY]
  if (prev && typeof prev.stop === 'function') {
    try { prev.stop() } catch { /* 旧实例已失效，忽略 */ }
  }

  const boot = () => {
    ensureStyle()
    scan()
    void maybeShowCompressNotice()

    let raf = 0
    const schedule = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => { raf = 0; scan() })
    }

    /* attributes 一起盯：别人（旧实例）把标记摘掉时，下一帧就补回去。 */
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [ATTR],
    })

    /* 轮询兜底：极小概率漏掉的节点，800ms 内补上。 */
    const timer = window.setInterval(scan, 800)

    window[GLOBAL_KEY] = {
      version: VERSION,
      stop() {
        observer.disconnect()
        window.clearInterval(timer)
        if (raf) window.cancelAnimationFrame(raf)
      },
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true })
  } else {
    boot()
  }
}
